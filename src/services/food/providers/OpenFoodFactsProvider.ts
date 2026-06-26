import { normalizeFood, FullNormalizedFood } from "../FoodNormalizer";

async function fetchWithTimeout(url: string, options: any = {}, timeoutMs = 1500): Promise<any> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(id);
  }
}

export class OpenFoodFactsProvider {
  private userAgent = "SportNutri - WebApp - Version 1.1 - edsonricardosouza@gmail.com";

  /**
   * Search by Barcode.
   */
  async searchByBarcode(barcode: string): Promise<FullNormalizedFood | null> {
    try {
      const urls = [
        `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
        `https://br.openfoodfacts.org/api/v2/product/${barcode}.json`
      ];

      for (const url of urls) {
        try {
          const res = await fetchWithTimeout(url, {
            headers: {
              "User-Agent": this.userAgent,
              "Accept": "application/json"
            }
          }, 1500);

          if (res.ok) {
            const data = await res.json();
            if (data && data.status === 1 && data.product) {
              const p = data.product;
              
              // Map to food
              const rawFood = {
                id: p.code || barcode,
                name: p.product_name_pt || p.product_name || p.product_name_en || "Alimento Desconhecido",
                brands: p.brands || p.brand_name || "",
                barcode: p.code || barcode,
                portion: p.serving_size || "100g",
                serving_weight_g: p.serving_quantity || 100,
                energy_kcal: p.nutriments?.["energy-kcal_100g"] || (p.nutriments?.["energy_100g"] ? p.nutriments["energy_100g"] / 4.184 : 0),
                proteins: p.nutriments?.proteins_100g || 0,
                carbohydrates: p.nutriments?.carbohydrates_100g || 0,
                fat: p.nutriments?.fat_100g || 0,
                fiber: p.nutriments?.fiber_100g || 0,
                sodium: p.nutriments?.sodium_100g || 0,
                sugar: p.nutriments?.sugars_100g || 0,
                country: "Brasil"
              };

              return normalizeFood(rawFood, "open_food_facts");
            }
          }
        } catch (e) {
          // Continue to next URL fallback
        }
      }
    } catch (err: any) {
      console.warn(`[OpenFoodFactsProvider] Error during barcode search for ${barcode}:`, err.message || err);
    }
    return null;
  }

  /**
   * Search by Term.
   */
  async searchByTerm(term: string): Promise<FullNormalizedFood[]> {
    try {
      const encoded = encodeURIComponent(term);
      const urls = [
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encoded}&json=true&page_size=15&cc=br&lc=pt`,
        `https://br.openfoodfacts.org/cgi/search.pl?search_terms=${encoded}&json=true&page_size=15`
      ];

      for (const url of urls) {
        try {
          const res = await fetchWithTimeout(url, {
            headers: {
              "User-Agent": this.userAgent,
              "Accept": "application/json"
            }
          }, 1500);

          if (res.ok) {
            const data = await res.json();
            if (data && data.products && Array.isArray(data.products)) {
              return data.products
                .map((p: any) => {
                  const name = p.product_name_pt || p.product_name || p.product_name_en;
                  if (!name) return null;

                  const rawFood = {
                    id: p.code || String(Math.floor(Math.random() * 10000000)),
                    name,
                    brands: p.brands || p.brand_name || "",
                    barcode: p.code || "",
                    portion: p.serving_size || "100g",
                    serving_weight_g: p.serving_quantity || 100,
                    energy_kcal: p.nutriments?.["energy-kcal_100g"] || (p.nutriments?.["energy_100g"] ? p.nutriments["energy_100g"] / 4.184 : 0),
                    proteins: p.nutriments?.proteins_100g || 0,
                    carbohydrates: p.nutriments?.carbohydrates_100g || 0,
                    fat: p.nutriments?.fat_100g || 0,
                    fiber: p.nutriments?.fiber_100g || 0,
                    sodium: p.nutriments?.sodium_100g || 0,
                    sugar: p.nutriments?.sugars_100g || 0,
                    country: "Brasil"
                  };

                  return normalizeFood(rawFood, "open_food_facts");
                })
                .filter((item: any): item is FullNormalizedFood => item !== null);
            }
          }
        } catch (e) {
          // Continue to next URL fallback
        }
      }
    } catch (err: any) {
      console.warn(`[OpenFoodFactsProvider] Error during term search for ${term}:`, err.message || err);
    }
    return [];
  }
}
