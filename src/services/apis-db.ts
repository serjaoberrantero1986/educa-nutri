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
    // 1. Query server API (local SQLite database + robust Open Food Facts / FatSecret proxying & simulation)
    const serverResults = await fetch(getApiUrl(`/api/foods?q=${encodeURIComponent(foodInput)}`))
      .then(async r => r.ok ? (await r.json() as Food[]) : [])
      .catch(() => [] as Food[]);

    // 2. Direct client-side fetch to Open Food Facts in parallel!
    // This runs directly in the user's browser, bypassing Cloud Run egress firewalls.
    let clientResults: Food[] = [];
    try {
      const clientUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(foodInput)}&json=true&page_size=15&cc=br&lc=pt`;
      const clientResponse = await fetch(clientUrl, {
        headers: {
          "Accept": "application/json"
        }
      });
      if (clientResponse.ok) {
        const offData = await clientResponse.json();
        if (offData && offData.products && Array.isArray(offData.products)) {
          clientResults = offData.products.map((p: any) => {
            const name = p.product_name_pt || p.product_name || p.product_name_en;
            if (!name) return null;
            
            const protein = parseFloat(p.nutriments?.proteins_100g ?? 0) || 0;
            const carbs = parseFloat(p.nutriments?.carbohydrates_100g ?? 0) || 0;
            const fat = parseFloat(p.nutriments?.fat_100g ?? 0) || 0;
            const calories = Math.round(p.nutriments?.["energy-kcal_100g"] || (p.nutriments?.["energy_100g"] ? p.nutriments["energy_100g"] / 4.184 : 0)) || 0;
            
            // Determine category dynamically
            let category: "proteina" | "carboidrato" | "fruta" | "vegetal" | "gordura" | "laticinio" = "carboidrato";
            const checkName = name.toLowerCase();
            if (protein > carbs && protein > fat) {
              category = "proteina";
            } else if (fat > protein && fat > carbs) {
              category = "gordura";
            } else if (checkName.includes("banana") || checkName.includes("maça") || checkName.includes("morango") || checkName.includes("uva") || checkName.includes("fruta")) {
              category = "fruta";
            } else if (checkName.includes("alface") || checkName.includes("tomate") || checkName.includes("cenoura") || checkName.includes("vegetal")) {
              category = "vegetal";
            } else if (checkName.includes("leite") || checkName.includes("queijo") || checkName.includes("iogurte")) {
              category = "laticinio";
            }
            
            return {
              id: p.code || String(Math.floor(Math.random() * 10000000)),
              name: `${name} (OFF-Web)`,
              category,
              calories,
              protein,
              carbs,
              fat,
              portion: p.serving_size || "100g",
              measure_unit: "g",
              grams_per_unit: 1
            } as Food;
          }).filter((item: any): item is Food => item !== null);
        }
      }
    } catch (clientErr) {
      console.log("Client-side Open Food Facts direct search failed, using server/fallback results.", clientErr);
    }

    // Merge results and deduplicate by name (ignore case/extra spaces)
    const seenNames = new Set<string>();
    const mergedResults: Food[] = [];

    // Prioritize browser-retrieved real-time results first, then server database results
    const combined = [...clientResults, ...serverResults];

    combined.forEach(item => {
      const lowerName = item.name.toLowerCase().trim();
      if (!seenNames.has(lowerName)) {
        seenNames.add(lowerName);
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
