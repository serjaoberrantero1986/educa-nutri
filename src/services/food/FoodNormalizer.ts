import { Food } from "../../types";

export interface ExtendedFoodFields {
  source: string;
  source_id: string;
  barcode?: string;
  brand?: string;
  normalized_name: string;
  calories_per_100: number;
  protein_per_100: number;
  carbs_per_100: number;
  fat_per_100: number;
  fiber_per_100?: number;
  sodium_per_100?: number;
  sugar_per_100?: number;
  serving_description?: string;
  serving_weight_g?: number;
  unit_type: "g" | "ml" | "unit";
  country?: string;
  confidence_score: number;
  verified_by_logic: boolean;
  source_url?: string;
  last_checked_at?: string;
  created_at?: string;
  updated_at?: string;
}

export type FullNormalizedFood = Food & ExtendedFoodFields;

/**
 * Removes accents and special characters from a string, lowercases it, and trims whitespace.
 */
export function normalizeString(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalizes category based on macros.
 */
export function determineCategoryFromMacros(
  name: string,
  protein: number,
  carbs: number,
  fat: number
): "proteina" | "carboidrato" | "fruta" | "vegetal" | "gordura" | "laticinio" {
  const lowerName = name.toLowerCase();
  
  if (lowerName.includes("leite") || lowerName.includes("queijo") || lowerName.includes("iogurte") || lowerName.includes("latic") || lowerName.includes("grego")) {
    return "laticinio";
  }
  if (lowerName.includes("banana") || lowerName.includes("maca") || lowerName.includes("morango") || lowerName.includes("laranja") || lowerName.includes("abacaxi") || lowerName.includes("fruta") || lowerName.includes("uva")) {
    return "fruta";
  }
  if (lowerName.includes("alface") || lowerName.includes("tomate") || lowerName.includes("cenoura") || lowerName.includes("brocolis") || lowerName.includes("vegetal") || lowerName.includes("legume") || lowerName.includes("salada") || lowerName.includes("vagem")) {
    return "vegetal";
  }
  if (lowerName.includes("azeite") || lowerName.includes("oleo") || lowerName.includes("manteiga") || lowerName.includes("castanha") || lowerName.includes("nuts") || lowerName.includes("amendoim") || lowerName.includes("pasta de amendoim") || lowerName.includes("gordura") || lowerName.includes("semente")) {
    return "gordura";
  }

  // Fallback to highest macro density
  if (protein > carbs && protein > fat) {
    return "proteina";
  }
  if (fat > protein && fat > carbs) {
    return "gordura";
  }
  return "carboidrato";
}

/**
 * Normalizes raw food data from any source into a standard per-100g/ml food representation.
 */
export function normalizeFood(raw: any, source: string): FullNormalizedFood {
  const id = raw.id || raw.code || raw.food_id || Math.random().toString(36).substring(2, 15);
  const name = (raw.name || raw.product_name_pt || raw.product_name || raw.food_name || "Alimento Desconhecido").trim();
  const normalized_name = normalizeString(name);
  const brand = (raw.brand || raw.brand_name || raw.brands || "").trim() || undefined;
  const barcode = (raw.barcode || raw.code || "").trim() || undefined;

  let unit_type: "g" | "ml" | "unit" = "g";
  const nameLower = name.toLowerCase();
  if (nameLower.includes("leite") || nameLower.includes("suco") || nameLower.includes("refrigerante") || nameLower.includes("agua") || nameLower.includes("cha") || nameLower.includes("ml") || nameLower.includes("bebida")) {
    unit_type = "ml";
  }

  // Extract serving details
  let rawServingSize = 100; // default 100g
  let serving_description = raw.serving_description || raw.portion || "100g";

  if (raw.serving_weight_g) {
    rawServingSize = parseFloat(raw.serving_weight_g);
  } else if (typeof raw.portion === "string") {
    const match = raw.portion.match(/(\d+(?:\.\d+)?)\s*(g|ml)/i);
    if (match) {
      rawServingSize = parseFloat(match[1]);
    }
  } else if (raw.serving_size) {
    const match = String(raw.serving_size).match(/(\d+(?:\.\d+)?)\s*(g|ml)/i);
    if (match) {
      rawServingSize = parseFloat(match[1]);
    }
  }

  if (rawServingSize <= 0) rawServingSize = 100;

  // Raw macro/calorie inputs (per serving or raw input)
  let rawCalories = parseFloat(raw.calories ?? raw.calories_per_100 ?? raw.energy_kcal ?? 0);
  let rawProtein = parseFloat(raw.protein ?? raw.protein_per_100 ?? raw.proteins ?? 0);
  let rawCarbs = parseFloat(raw.carbs ?? raw.carbs_per_100 ?? raw.carbohydrates ?? 0);
  let rawFat = parseFloat(raw.fat ?? raw.fat_per_100 ?? 0);

  // If the source does not already represent per 100g/100ml, convert it
  // Most APIs (like FatSecret) return per-serving. Open Food Facts usually returns per 100g.
  const isAlreadyPer100 = raw.is_already_per_100 || source === "open_food_facts" || String(raw.portion).toLowerCase().includes("100g") || String(raw.portion).toLowerCase().includes("100ml");

  let calories_per_100 = rawCalories;
  let protein_per_100 = rawProtein;
  let carbs_per_100 = rawCarbs;
  let fat_per_100 = rawFat;

  if (!isAlreadyPer100 && rawServingSize !== 100) {
    const factor = 100 / rawServingSize;
    calories_per_100 = Math.round(rawCalories * factor);
    protein_per_100 = parseFloat((rawProtein * factor).toFixed(2));
    carbs_per_100 = parseFloat((rawCarbs * factor).toFixed(2));
    fat_per_100 = parseFloat((rawFat * factor).toFixed(2));
  }

  // Fiber, Sodium, Sugar
  const fiber_per_100 = parseFloat(raw.fiber ?? raw.fiber_per_100 ?? 0) || undefined;
  const sodium_per_100 = parseFloat(raw.sodium ?? raw.sodium_per_100 ?? 0) || undefined;
  const sugar_per_100 = parseFloat(raw.sugar ?? raw.sugar_per_100 ?? 0) || undefined;

  // Determine standard portion unit (e.g. fatia, colher de sopa, unidade)
  let measure_unit = (raw.measure_unit || raw.unit || "g").trim();
  let grams_per_unit = parseFloat(raw.grams_per_unit || raw.serving_weight_g || 1);

  if (measure_unit === "g" || measure_unit === "ml") {
    // Try to guess a typical measure unit based on name
    if (nameLower.includes("pao") || nameLower.includes("fatia") || nameLower.includes("queijo") || nameLower.includes("presunto")) {
      measure_unit = "fatia";
      grams_per_unit = grams_per_unit > 1 ? grams_per_unit : 25;
    } else if (nameLower.includes("ovo") || nameLower.includes("unidade") || nameLower.includes("banana")) {
      measure_unit = "unidade";
      grams_per_unit = grams_per_unit > 1 ? grams_per_unit : 50;
    } else if (nameLower.includes("colher") || nameLower.includes("arroz") || nameLower.includes("feijao") || nameLower.includes("aveia")) {
      measure_unit = "colher de sopa";
      grams_per_unit = grams_per_unit > 1 ? grams_per_unit : 15;
    } else {
      measure_unit = unit_type === "ml" ? "ml" : "g";
      grams_per_unit = 1;
    }
  }

  const category = determineCategoryFromMacros(name, protein_per_100, carbs_per_100, fat_per_100);

  const confidence_score = parseFloat(raw.confidence_score || 0.8);
  const verified_by_logic = !!raw.verified_by_logic;

  const country = raw.country || (source === "open_food_facts" ? "Brasil" : undefined);
  const source_url = raw.source_url || undefined;
  const now = new Date().toISOString();

  return {
    id,
    name: brand ? `${name} (${brand})` : name,
    category,
    // Keep compatible fields (representing values per 100g)
    calories: Math.round(calories_per_100),
    protein: protein_per_100,
    carbs: carbs_per_100,
    fat: fat_per_100,
    portion: unit_type === "ml" ? "100ml" : "100g",
    measure_unit,
    grams_per_unit,
    // New fields
    source,
    source_id: String(raw.source_id || id),
    barcode,
    brand,
    normalized_name,
    calories_per_100: Math.round(calories_per_100),
    protein_per_100,
    carbs_per_100,
    fat_per_100,
    fiber_per_100,
    sodium_per_100,
    sugar_per_100,
    serving_description,
    serving_weight_g: grams_per_unit,
    unit_type,
    country,
    confidence_score,
    verified_by_logic,
    source_url,
    last_checked_at: raw.last_checked_at || now,
    created_at: raw.created_at || now,
    updated_at: raw.updated_at || now,
  };
}
