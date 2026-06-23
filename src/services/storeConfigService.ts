import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, isFirebaseConfigured, handleFirestoreError, OperationType, auth } from "../lib/firebase";
import { getApiUrl } from "../utils";

export interface StoreConfig {
  streak_freeze_cost: number;
  premium_pass_cost: number;
  assistant_pass_cost: number;
  whatsapp_pass_cost: number;
  recipes_pass_cost: number;
  shared_workouts_pass_cost?: number;
  monthly_premium_price: number;
  monthly_professional_price?: number;
  whatsapp_api_url?: string;
  whatsapp_api_key?: string;
  whatsapp_instance?: string;
  ai_provider?: string;
  ai_api_key?: string;
  ai_model?: string;
  food_search_mode?: 'apis' | 'web';
}

export const DEFAULT_STORE_CONFIG: StoreConfig = {
  streak_freeze_cost: 1000,
  premium_pass_cost: 1500,
  assistant_pass_cost: 2000,
  whatsapp_pass_cost: 2000,
  recipes_pass_cost: 1200,
  shared_workouts_pass_cost: 800,
  monthly_premium_price: 19.90,
  monthly_professional_price: 39.90,
  whatsapp_api_url: "https://api.sportnutri.com",
  whatsapp_api_key: "sportnutri_default_key",
  whatsapp_instance: "sportnutri_bot",
  ai_provider: "Google Gemini",
  ai_api_key: "",
  ai_model: "gemini-3.5-flash",
  food_search_mode: "web",
};

const CONFIG_PATH = "configs";
const CONFIG_DOC_ID = "store";

export function getCachedStoreConfig(): StoreConfig {
  try {
    const cached = localStorage.getItem("sportnutri_store_config");
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (err) {
    console.error("Error getting cached config:", err);
  }
  return DEFAULT_STORE_CONFIG;
}

export function getAiHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  try {
    const cached = localStorage.getItem("sportnutri_store_config");
    if (cached) {
      const config = JSON.parse(cached);
      if (config.ai_provider) {
        headers["x-ai-provider"] = config.ai_provider;
      }
      if (config.ai_api_key) {
        headers["x-ai-api-key"] = config.ai_api_key;
      }
      if (config.ai_model) {
        headers["x-ai-model"] = config.ai_model;
      }
    }
  } catch (err) {
    console.error("Error setting AI headers:", err);
  }
  return headers;
}

export async function getStoreConfig(): Promise<StoreConfig> {
  // 1. Try Firestore client-side first (fully authenticated as Admin, always works and is persistent)
  if (isFirebaseConfigured) {
    try {
      const docRef = doc(db, CONFIG_PATH, CONFIG_DOC_ID);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const cfg: StoreConfig = {
          streak_freeze_cost: typeof data.streak_freeze_cost === "number" ? data.streak_freeze_cost : DEFAULT_STORE_CONFIG.streak_freeze_cost,
          premium_pass_cost: typeof data.premium_pass_cost === "number" ? data.premium_pass_cost : DEFAULT_STORE_CONFIG.premium_pass_cost,
          assistant_pass_cost: typeof data.assistant_pass_cost === "number" ? data.assistant_pass_cost : DEFAULT_STORE_CONFIG.assistant_pass_cost,
          whatsapp_pass_cost: typeof data.whatsapp_pass_cost === "number" ? data.whatsapp_pass_cost : DEFAULT_STORE_CONFIG.whatsapp_pass_cost,
          recipes_pass_cost: typeof data.recipes_pass_cost === "number" ? data.recipes_pass_cost : DEFAULT_STORE_CONFIG.recipes_pass_cost,
          shared_workouts_pass_cost: typeof data.shared_workouts_pass_cost === "number" ? data.shared_workouts_pass_cost : DEFAULT_STORE_CONFIG.shared_workouts_pass_cost,
          monthly_premium_price: typeof data.monthly_premium_price === "number" ? data.monthly_premium_price : DEFAULT_STORE_CONFIG.monthly_premium_price,
          monthly_professional_price: typeof data.monthly_professional_price === "number" ? data.monthly_professional_price : DEFAULT_STORE_CONFIG.monthly_professional_price,
          whatsapp_api_url: data.whatsapp_api_url || DEFAULT_STORE_CONFIG.whatsapp_api_url,
          whatsapp_api_key: data.whatsapp_api_key || DEFAULT_STORE_CONFIG.whatsapp_api_key,
          whatsapp_instance: data.whatsapp_instance || DEFAULT_STORE_CONFIG.whatsapp_instance,
          ai_provider: data.ai_provider || DEFAULT_STORE_CONFIG.ai_provider,
          ai_api_key: data.ai_api_key || DEFAULT_STORE_CONFIG.ai_api_key,
          ai_model: data.ai_model || DEFAULT_STORE_CONFIG.ai_model,
          food_search_mode: data.food_search_mode || DEFAULT_STORE_CONFIG.food_search_mode || "web",
        };
        try {
          localStorage.setItem("sportnutri_store_config", JSON.stringify(cfg));
        } catch (_) {}

        // Silently sync with backend to update environment memory variables for administrative logs and fallbacks
        const currentUser = auth.currentUser;
        const normUserEmail = (currentUser?.email || "").toLowerCase().trim();
        if (currentUser && normUserEmail === "edsonricardosouza@gmail.com") {
          fetch(getApiUrl("/api/admin/config"), {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              userId: currentUser.uid,
              email: currentUser.email,
              config: cfg
            })
          }).catch(() => {});
        }

        return cfg;
      }
    } catch (error) {
      console.warn("Could not load store config from Firestore first:", error);
    }
  }

  // 2. Fallback to API endpoint
  try {
    const currentUser = auth.currentUser;
    const userId = currentUser?.uid || "";
    const email = currentUser?.email || "";
    
    const response = await fetch(getApiUrl(`/api/admin/config?userId=${encodeURIComponent(userId)}&email=${encodeURIComponent(email)}`));
    if (response.ok) {
      const data = await response.json();
      const cfg: StoreConfig = {
        streak_freeze_cost: Number(data.streak_freeze_cost ?? DEFAULT_STORE_CONFIG.streak_freeze_cost),
        premium_pass_cost: Number(data.premium_pass_cost ?? DEFAULT_STORE_CONFIG.premium_pass_cost),
        assistant_pass_cost: Number(data.assistant_pass_cost ?? DEFAULT_STORE_CONFIG.assistant_pass_cost),
        whatsapp_pass_cost: Number(data.whatsapp_pass_cost ?? DEFAULT_STORE_CONFIG.whatsapp_pass_cost),
        recipes_pass_cost: Number(data.recipes_pass_cost ?? DEFAULT_STORE_CONFIG.recipes_pass_cost),
        shared_workouts_pass_cost: Number(data.shared_workouts_pass_cost ?? DEFAULT_STORE_CONFIG.shared_workouts_pass_cost),
        monthly_premium_price: Number(data.monthly_premium_price ?? DEFAULT_STORE_CONFIG.monthly_premium_price),
        monthly_professional_price: Number(data.monthly_professional_price ?? DEFAULT_STORE_CONFIG.monthly_professional_price),
        whatsapp_api_url: data.whatsapp_api_url || DEFAULT_STORE_CONFIG.whatsapp_api_url,
        whatsapp_api_key: data.whatsapp_api_key || DEFAULT_STORE_CONFIG.whatsapp_api_key,
        whatsapp_instance: data.whatsapp_instance || DEFAULT_STORE_CONFIG.whatsapp_instance,
        ai_provider: data.ai_provider || DEFAULT_STORE_CONFIG.ai_provider,
        ai_api_key: data.ai_api_key || DEFAULT_STORE_CONFIG.ai_api_key,
        ai_model: data.ai_model || DEFAULT_STORE_CONFIG.ai_model,
        food_search_mode: data.food_search_mode || DEFAULT_STORE_CONFIG.food_search_mode || "web",
      };
      try {
        localStorage.setItem("sportnutri_store_config", JSON.stringify(cfg));
      } catch (_) {}
      return cfg;
    }
  } catch (err) {
    console.warn("Could not load store config from backend API:", err);
  }

  return getCachedStoreConfig();
}

export async function saveStoreConfig(config: StoreConfig): Promise<void> {
  const currentUser = auth.currentUser;
  const userId = currentUser?.uid || "";
  const email = currentUser?.email || "";

  // 1. Save locally
  try {
    localStorage.setItem("sportnutri_store_config", JSON.stringify(config));
  } catch (_) {}

  // 2. Save directly to Firestore via client SDK (always authenticated as Admin)
  if (isFirebaseConfigured) {
    const path = `${CONFIG_PATH}/${CONFIG_DOC_ID}`;
    try {
      const docRef = doc(db, CONFIG_PATH, CONFIG_DOC_ID);
      await setDoc(docRef, config);
      console.log("Config saved to Firestore successfully!");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  // 3. Sync with backend endpoint
  try {
    const response = await fetch(getApiUrl("/api/admin/config"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId,
        email,
        config
      })
    });
    if (!response.ok) {
      throw new Error(`HTTP Error saving config: ${response.status}`);
    }
  } catch (err) {
    console.warn("Could not sync config with backend:", err);
  }
}
