import { Food } from "../types";
import { FALLBACK_FOODS, getApiUrl } from "../utils";

/**
 * Searches food across multiple data streams by calling our centralized backend orchestrator endpoint.
 */
export async function searchFoodsApi(foodInput: string): Promise<Food[]> {
  if (!foodInput || foodInput.length < 2) {
    return [];
  }

  try {
    const url = getApiUrl(`/api/foods?q=${encodeURIComponent(foodInput)}`);
    const res = await fetch(url);
    if (res.ok) {
      return await res.json() as Food[];
    }
    return [];
  } catch (err) {
    console.error('Erro ao buscar alimentos no backend, tentando localmente:', err);
    const normTerm = foodInput.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return FALLBACK_FOODS.filter(f => {
      const normName = (f.name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return normName.includes(normTerm);
    });
  }
}
