import { FullNormalizedFood } from "./FoodNormalizer";

export interface ValidationResult {
  isValid: boolean;
  confidenceScore: number;
  reason: string;
}

/**
 * Validates a normalized food's macro and micro nutrients and calculates a confidence score.
 */
export function validateAndRateFood(food: FullNormalizedFood): ValidationResult {
  const { calories, protein, carbs, fat, source } = food;

  // 1. Critical checks - Fail fast
  if (calories < 0 || calories > 900) {
    return { isValid: false, confidenceScore: 0, reason: "Calorias fora do intervalo realista (0 a 900 kcal por 100g)" };
  }
  if (protein < 0 || carbs < 0 || fat < 0) {
    return { isValid: false, confidenceScore: 0, reason: "Nutrientes macronutrientes não podem ser negativos" };
  }

  const sumOfMacros = protein + carbs + fat;
  if (sumOfMacros > 100) {
    return { isValid: false, confidenceScore: 0, reason: "Soma de macronutrientes excede 100g por 100g de porção" };
  }

  // 2. Base confidence score based on source reliability
  let score = 0.8;
  let reason = "Fonte confiável de API nutricional.";

  if (source === "local" || source === "taco" || source === "tbca") {
    score = 1.0;
    reason = "Base canônica oficial verificada.";
    return { isValid: true, confidenceScore: score, reason };
  } else if (source === "open_food_facts") {
    score = 0.85;
    reason = "Produto de base colaborativa Open Food Facts.";
  } else if (source === "fat_secret") {
    score = 0.9;
    reason = "Produto verificado FatSecret.";
  } else if (source === "web" || source === "ai") {
    score = 0.5;
    reason = "Valores estimados por IA ou pesquisa web. Use com cautela.";
  }

  // 3. Coherency checks: Compare declared calories to calculated calories using Atwater system (4-4-9)
  // calculated = protein * 4 + carbs * 4 + fat * 9
  const calculatedCalories = (protein * 4) + (carbs * 4) + (fat * 9);
  
  if (sumOfMacros > 0) {
    const diff = Math.abs(calories - calculatedCalories);
    
    // If discrepancy is very large, degrade confidence significantly
    if (diff > 150) {
      score -= 0.35;
      reason += ` Divergência significativa entre calorias informadas (${calories} kcal) e estimadas (${Math.round(calculatedCalories)} kcal).`;
    } else if (diff > 80) {
      score -= 0.15;
      reason += ` Pequena inconsistência calórica.`;
    } else {
      score += 0.05; // Slightly reward highly coherent declarations
    }
  }

  // Bound score between 0 and 1
  score = Math.max(0, Math.min(1, score));

  // If score is too low, filter it out (confidence_score < 0.3)
  const isValid = score >= 0.3;

  return {
    isValid,
    confidenceScore: parseFloat(score.toFixed(2)),
    reason: isValid ? reason : `Rejeitado por baixa confiança (${reason})`
  };
}
