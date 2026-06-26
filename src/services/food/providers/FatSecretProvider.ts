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

export class FatSecretProvider {
  private token: string | null = null;
  private tokenExpiry = 0;

  private async getToken(): Promise<string | null> {
    const clientId = process.env.FATSECRET_CLIENT_ID;
    const clientSecret = process.env.FATSECRET_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return null;
    }

    if (this.token && Date.now() < this.tokenExpiry - 10000) {
      return this.token;
    }

    try {
      const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
      const response = await fetchWithTimeout("https://oauth.fatsecret.com/connect/token", {
        method: "POST",
        headers: {
          "Authorization": `Basic ${authHeader}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "SportNutri - WebApp - Version 1.1 - edsonricardosouza@gmail.com"
        },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          scope: "basic"
        }).toString()
      }, 2000);

      if (response.ok) {
        const data = await response.json();
        if (data && data.access_token) {
          this.token = data.access_token;
          const expiresIn = data.expires_in || 3600;
          this.tokenExpiry = Date.now() + (expiresIn * 1000);
          return this.token;
        }
      }
    } catch (err: any) {
      console.warn("[FatSecretProvider] Failed to fetch OAuth token:", err.message || err);
    }
    return null;
  }

  /**
   * Search by Barcode using FatSecret.
   */
  async searchByBarcode(barcode: string): Promise<FullNormalizedFood | null> {
    try {
      const token = await this.getToken();
      if (!token) return null;

      // 1. Find the Food ID for the barcode
      const findRes = await fetchWithTimeout("https://platform.fatsecret.com/rest/server.api", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "SportNutri - WebApp - Version 1.1 - edsonricardosouza@gmail.com"
        },
        body: new URLSearchParams({
          method: "food.find_id_for_barcode",
          barcode: barcode,
          format: "json"
        }).toString()
      }, 2000);

      if (findRes.ok) {
        const data = await findRes.json();
        if (data && data.food_id && data.food_id.value) {
          const foodId = data.food_id.value;
          return await this.fetchFoodDetails(foodId, barcode);
        }
      }
    } catch (err: any) {
      console.warn(`[FatSecretProvider] Error during barcode search for ${barcode}:`, err.message || err);
    }
    return null;
  }

  /**
   * Search by term using FatSecret.
   */
  async searchByTerm(term: string): Promise<FullNormalizedFood[]> {
    try {
      const token = await this.getToken();
      if (!token) return [];

      const response = await fetchWithTimeout("https://platform.fatsecret.com/rest/server.api", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "SportNutri - WebApp - Version 1.1 - edsonricardosouza@gmail.com"
        },
        body: new URLSearchParams({
          method: "foods.search.v2",
          search_expression: term,
          format: "json",
          max_results: "15"
        }).toString()
      }, 2500);

      if (response.ok) {
        const data = await response.json();
        let foodsList: any[] = [];
        if (data && data.foods_search && data.foods_search.results && data.foods_search.results.food) {
          const rawFood = data.foods_search.results.food;
          foodsList = Array.isArray(rawFood) ? rawFood : [rawFood];
        } else if (data && data.foods && data.foods.food) {
          const rawFood = data.foods.food;
          foodsList = Array.isArray(rawFood) ? rawFood : [rawFood];
        }

        const results: FullNormalizedFood[] = [];
        for (const item of foodsList) {
          const name = item.food_name || "Alimento FatSecret";
          const brand = item.brand_name || "";
          const desc = item.food_description || "";

          // Extract macros from string: "Per 100g - Calories: 120kcal | Fat: 2.00g | Carbs: 15.00g | Protein: 10.00g"
          const caloriesMatch = desc.match(/Calories:\s*(\d+(?:\.\d+)?)\s*kcal/i);
          const calories = caloriesMatch ? Math.round(parseFloat(caloriesMatch[1])) : 0;

          const fatMatch = desc.match(/Fat:\s*(\d+(?:\.\d+)?)\s*g/i);
          const fat = fatMatch ? parseFloat(fatMatch[1]) : 0;

          const carbsMatch = desc.match(/Carbs:\s*(\d+(?:\.\d+)?)\s*g/i);
          const carbs = carbsMatch ? parseFloat(carbsMatch[1]) : 0;

          const proteinMatch = desc.match(/Protein:\s*(\d+(?:\.\d+)?)\s*g/i);
          const protein = proteinMatch ? parseFloat(proteinMatch[1]) : 0;

          const portionMatch = desc.match(/Per\s*([^-\|]+)/i);
          const portion = portionMatch ? portionMatch[1].trim() : "100g";

          // Parse portion size
          let portionWeight = 100;
          if (portion.toLowerCase().includes("100g") || portion.toLowerCase().includes("100ml")) {
            portionWeight = 100;
          } else {
            const matchGrams = portion.match(/(\d+(?:\.\d+)?)\s*(g|ml)/i);
            if (matchGrams) {
              portionWeight = parseFloat(matchGrams[1]);
            }
          }

          const rawFoodData = {
            id: item.food_id,
            name,
            brand_name: brand,
            calories,
            protein,
            carbs,
            fat,
            portion,
            serving_weight_g: portionWeight,
            is_already_per_100: portion.toLowerCase().includes("100g") || portion.toLowerCase().includes("100ml")
          };

          results.push(normalizeFood(rawFoodData, "fat_secret"));
        }
        return results;
      }
    } catch (err: any) {
      console.warn(`[FatSecretProvider] Error during term search for ${term}:`, err.message || err);
    }
    return [];
  }

  private async fetchFoodDetails(foodId: string, barcode?: string): Promise<FullNormalizedFood | null> {
    try {
      const token = await this.getToken();
      if (!token) return null;

      const foodGetRes = await fetchWithTimeout("https://platform.fatsecret.com/rest/server.api", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "SportNutri - WebApp - Version 1.1 - edsonricardosouza@gmail.com"
        },
        body: new URLSearchParams({
          method: "food.get.v2",
          food_id: foodId,
          format: "json"
        }).toString()
      }, 2000);

      if (foodGetRes.ok) {
        const foodGetData = await foodGetRes.json();
        if (foodGetData && foodGetData.food) {
          const f = foodGetData.food;
          const name = f.food_name || "Alimento Desconhecido";
          const brand = f.brand_name || "";

          let serving: any = null;
          if (f.servings && f.servings.serving) {
            const s = f.servings.serving;
            serving = Array.isArray(s) ? s[0] : s;
          }

          const calories = serving ? Math.round(parseFloat(serving.calories || 0)) : 0;
          const protein = serving ? parseFloat(serving.protein || 0) : 0;
          const carbs = serving ? parseFloat(serving.carbohydrate || 0) : 0;
          const fat = serving ? parseFloat(serving.fat || 0) : 0;
          const fiber = serving ? parseFloat(serving.fiber || 0) : 0;
          const sodium = serving ? parseFloat(serving.sodium || 0) : 0;
          const sugar = serving ? parseFloat(serving.sugar || 0) : 0;
          const portion = serving ? (serving.serving_description || "100g") : "100g";
          const metric_serving_amount = serving ? parseFloat(serving.metric_serving_amount || 100) : 100;

          const rawFoodData = {
            id: f.food_id,
            name,
            brand_name: brand,
            barcode,
            calories,
            protein,
            carbs,
            fat,
            fiber,
            sodium,
            sugar,
            portion,
            serving_weight_g: metric_serving_amount,
            is_already_per_100: portion.toLowerCase().includes("100g") || portion.toLowerCase().includes("100ml")
          };

          return normalizeFood(rawFoodData, "fat_secret");
        }
      }
    } catch (e: any) {
      console.warn(`[FatSecretProvider] Failed to fetch food details for ID ${foodId}:`, e.message || e);
    }
    return null;
  }
}
