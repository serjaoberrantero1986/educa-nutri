import { Food } from "../../types";
import { FullNormalizedFood, normalizeFood, normalizeString } from "./FoodNormalizer";
import { validateAndRateFood } from "./FoodValidationService";
import { OpenFoodFactsProvider } from "./providers/OpenFoodFactsProvider";
import { FatSecretProvider } from "./providers/FatSecretProvider";
import { WebNutritionProvider } from "./providers/WebNutritionProvider";

export interface SearchOptions {
  limit?: number;
  enableWebFallback?: boolean;
}

export class FoodSearchService {
  private offProvider: OpenFoodFactsProvider;
  private fsProvider: FatSecretProvider;
  private webProvider: WebNutritionProvider;

  constructor(
    private db: any, // SQLite database instance
    private firestore: any, // Firestore instance
    aiSearcherCallback: (query: string) => Promise<any[]>
  ) {
    this.offProvider = new OpenFoodFactsProvider();
    this.fsProvider = new FatSecretProvider();
    this.webProvider = new WebNutritionProvider(aiSearcherCallback);
  }

  /**
   * Search for food by Barcode.
   */
  async searchBarcode(barcode: string): Promise<FullNormalizedFood | null> {
    const trimmedBarcode = barcode.trim();
    if (!/^\d{8,14}$/.test(trimmedBarcode)) {
      return null;
    }

    console.log(`[FoodSearchService] Searching barcode: ${trimmedBarcode}`);

    // 1. Try local SQLite DB
    try {
      const local = this.db.prepare("SELECT * FROM foods WHERE barcode = ?").get(trimmedBarcode);
      if (local) {
        console.log(`[FoodSearchService] Barcode ${trimmedBarcode} found in local SQLite database.`);
        return normalizeFood(local, "local");
      }
    } catch (e) {
      console.warn("[FoodSearchService] Error querying SQLite by barcode:", e);
    }

    // 2. Try Open Food Facts
    const offFood = await this.offProvider.searchByBarcode(trimmedBarcode);
    if (offFood) {
      const validation = validateAndRateFood(offFood);
      if (validation.isValid) {
        offFood.confidence_score = validation.confidenceScore;
        await this.cacheFood(offFood);
        return offFood;
      }
    }

    // 3. Try FatSecret
    const fsFood = await this.fsProvider.searchByBarcode(trimmedBarcode);
    if (fsFood) {
      const validation = validateAndRateFood(fsFood);
      if (validation.isValid) {
        fsFood.confidence_score = validation.confidenceScore;
        await this.cacheFood(fsFood);
        return fsFood;
      }
    }

    return null;
  }

  /**
   * Main text-based Food search.
   */
  async search(query: string, options: SearchOptions = {}): Promise<FullNormalizedFood[]> {
    const limit = options.limit || 30;
    const enableWebFallback = options.enableWebFallback !== false;

    const originalQuery = query.trim();
    const normalizedQuery = normalizeString(originalQuery);

    if (normalizedQuery.length < 2) {
      return [];
    }

    console.log(`[FoodSearchService] Query: "${originalQuery}" (Normalized: "${normalizedQuery}")`);

    // 1. Search locally in SQLite first
    let localResults: FullNormalizedFood[] = [];
    try {
      // Fetch all local foods
      const allFoods = this.db.prepare("SELECT * FROM foods").all() as any[];
      localResults = allFoods
        .map(f => {
          // If the column doesn't exist yet, we default it
          const normalizedName = f.normalized_name || normalizeString(f.name);
          return normalizeFood({ ...f, normalized_name: normalizedName }, f.source || "local");
        })
        .filter(f => {
          // Match by name or barcode
          return (
            f.normalized_name.includes(normalizedQuery) ||
            (f.barcode && f.barcode.includes(originalQuery)) ||
            (f.brand && normalizeString(f.brand).includes(normalizedQuery))
          );
        });

      console.log(`[FoodSearchService] Found ${localResults.length} matches in local database.`);
    } catch (err: any) {
      console.warn("[FoodSearchService] SQLite query failed, continuing:", err.message || err);
    }

    // If we have plenty of matches in local DB, return them ordered by relevance
    if (localResults.length >= 8) {
      return this.rankAndDeduplicate(localResults, normalizedQuery).slice(0, limit);
    }

    // 2. Fetch from external APIs as automatic fallback
    const externalResults: FullNormalizedFood[] = [];

    // Run Open Food Facts and FatSecret in parallel
    try {
      const [offFoods, fsFoods] = await Promise.all([
        this.offProvider.searchByTerm(originalQuery).catch(() => []),
        this.fsProvider.searchByTerm(originalQuery).catch(() => [])
      ]);

      externalResults.push(...offFoods, ...fsFoods);
      console.log(`[FoodSearchService] External APIs returned ${offFoods.length} (OFF) and ${fsFoods.length} (FatSecret) foods.`);
    } catch (e: any) {
      console.warn("[FoodSearchService] Parallel external API search failed, continuing:", e.message || e);
    }

    // Validate and score external results
    const validatedExternal: FullNormalizedFood[] = [];
    for (const food of externalResults) {
      const validation = validateAndRateFood(food);
      if (validation.isValid) {
        food.confidence_score = validation.confidenceScore;
        validatedExternal.push(food);
        // Cache this food automatically in background
        this.cacheFood(food).catch(err => console.warn("[FoodSearchService] Auto-cache failed:", err));
      } else {
        console.log(`[FoodSearchService] Validation filtered out "${food.name}": ${validation.reason}`);
      }
    }

    let combined = [...localResults, ...validatedExternal];

    // 3. Last fallback: Web/IA search grounding if results are still very poor
    const deduplicatedCombined = this.rankAndDeduplicate(combined, normalizedQuery);
    if (deduplicatedCombined.length < 3 && enableWebFallback) {
      console.log(`[FoodSearchService] Low result count (${deduplicatedCombined.length}). Running WebNutrition fallback...`);
      const webFoods = await this.webProvider.searchByTerm(originalQuery);
      
      const validatedWeb: FullNormalizedFood[] = [];
      for (const food of webFoods) {
        const validation = validateAndRateFood(food);
        if (validation.isValid) {
          food.confidence_score = validation.confidenceScore;
          validatedWeb.push(food);
          // Cache this web food as well
          this.cacheFood(food).catch(err => console.warn("[FoodSearchService] Web auto-cache failed:", err));
        }
      }

      combined.push(...validatedWeb);
    }

    // Final deduplication, ranking, and limit sizing
    const finalResults = this.rankAndDeduplicate(combined, normalizedQuery);
    return finalResults.slice(0, limit);
  }

  /**
   * Multi-criteria deduplication and ranking algorithm.
   */
  private rankAndDeduplicate(foods: FullNormalizedFood[], queryNorm: string): FullNormalizedFood[] {
    const seenBarcodes = new Set<string>();
    const seenKeys = new Set<string>();
    const uniqueFoods: FullNormalizedFood[] = [];

    // Sort by source trustworthiness first for prioritised deduplication
    const sortedForDeduplication = [...foods].sort((a, b) => {
      const srcWeightA = a.source === "local" ? 10 : (a.source === "fat_secret" ? 8 : (a.source === "open_food_facts" ? 6 : 2));
      const srcWeightB = b.source === "local" ? 10 : (b.source === "fat_secret" ? 8 : (b.source === "open_food_facts" ? 6 : 2));
      return srcWeightB - srcWeightA;
    });

    for (const food of sortedForDeduplication) {
      // Deduplicate by barcode if present
      if (food.barcode) {
        if (seenBarcodes.has(food.barcode)) continue;
        seenBarcodes.add(food.barcode);
      }

      // Deduplicate by name + brand key
      const brandKey = normalizeString(food.brand || "generic");
      const nameKey = food.normalized_name;
      const dedupeKey = `${nameKey}_${brandKey}`;

      if (seenKeys.has(dedupeKey)) continue;
      seenKeys.add(dedupeKey);

      uniqueFoods.push(food);
    }

    // Now rank/sort the unique foods
    return uniqueFoods.sort((a, b) => {
      // 1. Exact match with search term (normalized)
      const exactA = a.normalized_name === queryNorm ? 1 : 0;
      const exactB = b.normalized_name === queryNorm ? 1 : 0;
      if (exactA !== exactB) return exactB - exactA;

      // 2. Starts with search term
      const startsA = a.normalized_name.startsWith(queryNorm) ? 1 : 0;
      const startsB = b.normalized_name.startsWith(queryNorm) ? 1 : 0;
      if (startsA !== startsB) return startsB - startsA;

      // 3. Checked / local catalog priority
      const sourcePriorityA = a.source === "local" ? 3 : (a.source === "fat_secret" ? 2 : 1);
      const sourcePriorityB = b.source === "local" ? 3 : (b.source === "fat_secret" ? 2 : 1);
      if (sourcePriorityA !== sourcePriorityB) return sourcePriorityB - sourcePriorityA;

      // 4. Confidence Score
      const scoreDiff = b.confidence_score - a.confidence_score;
      if (Math.abs(scoreDiff) > 0.05) {
        return scoreDiff;
      }

      // 5. Shortest name (more generic names first)
      return a.name.length - b.name.length;
    });
  }

  /**
   * Caches a food item to both the local SQLite database and Firestore for persistent durability.
   */
  private async cacheFood(food: FullNormalizedFood): Promise<void> {
    const cleanName = food.name.trim();

    // 1. Save/Update SQLite
    try {
      // Check if it already exists
      const existing = this.db.prepare("SELECT id FROM foods WHERE LOWER(name) = ? OR (barcode IS NOT NULL AND barcode = ?)")
        .get(cleanName.toLowerCase(), food.barcode || "___NONEXISTENT___") as any;

      if (!existing) {
        const stmt = this.db.prepare(`
          INSERT INTO foods (
            name, category, calories, protein, carbs, fat, portion, measure_unit, grams_per_unit,
            barcode, brand, source, source_id, normalized_name, confidence_score, verified_by_logic
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
          cleanName,
          food.category,
          food.calories,
          food.protein,
          food.carbs,
          food.fat,
          food.portion,
          food.measure_unit,
          food.grams_per_unit,
          food.barcode || null,
          food.brand || null,
          food.source,
          food.source_id,
          food.normalized_name,
          food.confidence_score,
          food.verified_by_logic ? 1 : 0
        );
        console.log(`[FoodSearchService Cache] Saved "${cleanName}" to SQLite.`);
      }
    } catch (sqliteErr: any) {
      console.warn(`[FoodSearchService Cache] SQLite save failed for "${cleanName}":`, sqliteErr.message || sqliteErr);
    }

    // 2. Save to Firestore for permanent durability
    if (this.firestore) {
      try {
        const docId = food.barcode || `cache_${Math.random().toString(36).substring(2, 15)}`;
        await this.firestore.collection("foods").doc(docId).set({
          id: docId,
          name: cleanName,
          category: food.category,
          calories: food.calories,
          protein: food.protein,
          carbs: food.carbs,
          fat: food.fat,
          portion: food.portion,
          measure_unit: food.measure_unit,
          grams_per_unit: food.grams_per_unit,
          barcode: food.barcode || null,
          brand: food.brand || null,
          source: food.source,
          source_id: food.source_id,
          normalized_name: food.normalized_name,
          confidence_score: food.confidence_score,
          verified_by_logic: food.verified_by_logic,
          last_checked_at: new Date().toISOString()
        });
        console.log(`[FoodSearchService Cache] Saved "${cleanName}" to Firestore.`);
      } catch (firestoreErr: any) {
        console.warn(`[FoodSearchService Cache] Firestore save failed for "${cleanName}":`, firestoreErr.message || firestoreErr);
      }
    }
  }
}
