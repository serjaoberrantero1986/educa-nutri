import { normalizeFood, FullNormalizedFood } from "../FoodNormalizer";

export class WebNutritionProvider {
  /**
   * Accepts a dynamic search callback that executes within the server's AI context.
   */
  constructor(private aiSearcher: (query: string) => Promise<any[]>) {}

  /**
   * Search by Term using the Search Grounding AI caller.
   */
  async searchByTerm(term: string): Promise<FullNormalizedFood[]> {
    try {
      console.log(`[WebNutritionProvider] Triggering dynamic AI search grounding fallback for "${term}"...`);
      const results = await this.aiSearcher(term);
      
      if (!results || !Array.isArray(results)) {
        return [];
      }

      return results.map((item: any) => {
        // Prepare raw representation for normalizer
        const rawFood = {
          id: item.id || `ai-${Math.random().toString(36).substring(2, 11)}`,
          name: item.name || item.food_name || "Alimento Estimado",
          category: item.category,
          calories: item.calories || item.calories_per_100 || 0,
          protein: item.protein || item.protein_per_100 || 0,
          carbs: item.carbs || item.carbs_per_100 || 0,
          fat: item.fat || item.fat_per_100 || 0,
          portion: item.portion || "100g",
          measure_unit: item.measure_unit || "g",
          grams_per_unit: item.grams_per_unit || 1,
          is_already_per_100: true // The AI prompt specifically converts and returns per 100g
        };

        return normalizeFood(rawFood, "web");
      });
    } catch (err: any) {
      console.warn(`[WebNutritionProvider] Error searching by term for ${term}:`, err.message || err);
      return [];
    }
  }
}
