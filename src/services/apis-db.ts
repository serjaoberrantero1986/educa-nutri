import { Food } from "../types";
import { FALLBACK_FOODS, getApiUrl } from "../utils";

/**
 * Searches food across multiple data streams:
 * 1. Queries the server-side API (local SQLite database proxying/simulating).
 * 2. Directly fetches from Open Food Facts via browser HTTP request in parallel.
 * 3. Merges and deduplicates results.
 * 4. Falls back to static offline list if everything else returned empty.
 *
 * This isolated component prevents network issues in backend virtualizations
 * from blocking front-end user experience.
 */
export async function searchFoodsApi(foodInput: string): Promise<Food[]> {
  if (!foodInput || foodInput.length < 2) {
    return [];
  }

  try {
    // Query server API (local SQLite database + robust Open Food Facts / FatSecret proxying)
    const serverResults = await fetch(getApiUrl(`/api/foods?q=${encodeURIComponent(foodInput)}`))
      .then(async r => r.ok ? (await r.json() as Food[]) : [])
      .catch(() => [] as Food[]);

    // Merge results and deduplicate by name (ignore case/extra spaces)
    const seenNames = new Set<string>();
    const mergedResults: Food[] = [];

    serverResults.forEach(item => {
      let cleanName = item.name.toLowerCase().trim();
      // Remove any trailing source markers to deduplicate matches
      cleanName = cleanName.replace(/\s*\((off-web|off|fatsecret|cód\.\s*barras|catálogo)\)\s*$/i, '');
      if (!seenNames.has(cleanName)) {
        seenNames.add(cleanName);
        mergedResults.push(item);
      }
    });

    let data = mergedResults;

    // Fallback to static offline list if everything else returned empty
    if (data.length === 0) {
      const normTerm = foodInput.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      data = FALLBACK_FOODS.filter(f => {
        const normName = (f.name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return normName.includes(normTerm);
      });
    }

    return data;
  } catch (err) {
    console.error('Erro ao buscar alimentos, tentando localmente:', err);
    const normTerm = foodInput.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return FALLBACK_FOODS.filter(f => {
      const normName = (f.name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return normName.includes(normTerm);
    });
  }
}
