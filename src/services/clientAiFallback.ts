import { getCachedStoreConfig } from "./storeConfigService";
import { FALLBACK_FOODS } from "../utils";

export function isCommercialOrIndustrialized(name: string): boolean {
  if (!name) return false;
  const norm = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const brandKeywords = [
    "doritos", "club social", "toddynho", "sufresh", "coca", "fanta", "sprite", "gatorade", 
    "ruffles", "piraque", "bono", "passatempo", "bis", "oreo", "trakinas", "nestle", 
    "sadia", "perdigao", "seara", "danone", "yakult", "nescau", "bauducco", "activia", 
    "polenguinho", "pullman", "pringles", "mcdonald", "burger king", "subway", "nutella", 
    "hershey", "lacta", "garoto", "kitkat", "snickers", "m&m", "skol", "heineken", "red bull", 
    "monster", "toddy", "quaker", "barilla", "itambe", "tirolez", "molico", "redbull", 
    "vigor", "piracanjuba", "elege", "qualy", "claybom", "doriana", "hellmanns", "arisco", 
    "knorr", "maggi", "yoki", "quero", "fugini", "heinz", "pacoquita", "negresco", "chokito", 
    "prestigio", "sensacao", "talento", "serenata", "sonho de valsa", "ouro branco", 
    "ovomaltine", "caixinha", "lata", "garrafa", "pacote", "industrializado", "marca", 
    "mc Donald", "bk", "salsicha", "presunto", "margarina", "miojo", "nissin", "cup noodle",
    "gloria", "dolly", "guarana antarctica", "h2oh", "schweppes", "skinka", "ades", "del valle",
    "kapo", "tang", "clight", "frisco", "mid", "camp", "gatorade", "powerade", "monster energy",
    "tnt energy", "red bull", "heller", "corona", "budweiser", "stella artois", "eisenbahn",
    "amstel", "bohemia", "antarctica", "brahma", "itaipava", "cerpa", "devassa", "baden baden",
    "smirnoff", "absolut", "bacardi", "jose cuervo", "johnnie walker", "chivas", "jack daniels",
    "ballantines", "red label", "black label", "passaporte", "campari", "aperol", "martini",
    "cynar", "corote", "51", "velho barreiro", "pitu", "ypioca", "dr peanut", "naked nuts",
    "maizena", "cremogema", "mucilon", "neston", "farinha lactea", "sustagen", "pediasure",
    "ensure", "nutren", "whey", "creatina", "albumina", "hipercalorico", "bcaa", "glutamina",
    "pre treino", "termogenico", "pastilha", "chiclete", "goma de mascar", "trident", "mentos",
    "hallse", "fini", "haribo", "docile", "snack", "cheetos", "fandangos", "cebolitos",
    "baconzitos", "sensacoes", "stax", "tyrrells", "marilan", "mabel", "toddy", "negresco", 
    "passatempo", "nikito", "tortuguita", "lollo", "charge", "smash", "recheado", "recheada"
  ];
  return brandKeywords.some(keyword => norm.includes(keyword));
}

function getDeterministicGramsForFoodAndUnit(foodName: string, unit: string, fallbackGrams: number): number {
  const normFood = (foodName || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const normUnit = (unit || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  if (normUnit === "gramas" || normUnit === "g" || normUnit === "mililitros" || normUnit === "ml") {
    return 1;
  }

  // 1. Cooked Rice (Arroz Branco Cozido, Arroz Integral Cozido, etc.)
  if (normFood.includes("arroz")) {
    if (normUnit === "concha") return 100; // 2 conchas = 200g (about 260 kcal)
    if (normUnit === "colher de arroz" || normUnit === "colher de servir" || normUnit === "colhar de arroz") return 25;
    if (normUnit === "colher de sopa") return 15;
    if (normUnit === "copo" || normUnit === "xicara") return 150;
    if (normUnit === "unidade") return 25;
  }

  // 2. Cooked Beans (Feijão Carioca Cozido, Feijão Preto Cozido, etc.)
  if (normFood.includes("feijao")) {
    if (normUnit === "concha") return 100;
    if (normUnit === "colher de sopa") return 15;
    if (normUnit === "copo" || normUnit === "xicara") return 150;
    if (normUnit === "unidade") return 100;
  }

  // 3. Eggs
  if (normFood.includes("ovo")) {
    if (normUnit === "unidade") return 50;
    if (normUnit === "colher de sopa") return 50;
  }

  // 4. Frango / Meats / Beef / Tilápia / Filé / Peixe / Salmão
  if (normFood.includes("frango") || normFood.includes("patinho") || normFood.includes("carne beef") || normFood.includes("carne bovina") || normFood.includes("tilapia") || normFood.includes("file") || normFood.includes("carne") || normFood.includes("peixe") || normFood.includes("salmao")) {
    if (normUnit === "unidade" || normUnit === "file" || normUnit === "bife" || normUnit === "posta") return 100;
    if (normUnit === "colher de sopa") return 25;
    if (normUnit === "fatia") return 30;
    if (normUnit === "concha") return 120;
  }

  // 5. Cold cuts / Frios (Mortadela, Presunto, Peito de peru, Salame, etc.)
  if (normFood.includes("mortadela") || normFood.includes("presunto") || normFood.includes("peito de peru") || normFood.includes("salame") || normFood.includes("bacon") || normFood.includes("frios")) {
    if (normUnit === "fatia") return 15; // standard thin slice is 15g (2 fatias = 30g)
    if (normUnit === "unidade") return 15;
    if (normUnit === "colher de sopa") return 15;
  }

  // 6. Cheese / Queijos (Queijo Muçarela, Queijo Prato, Queijo Minas, etc.)
  if (normFood.includes("queijo") || normFood.includes("mucarela") || normFood.includes("prato") || normFood.includes("gorgonzola") || normFood.includes("parmesao") || normFood.includes("provolone") || normFood.includes("cheddar") || normFood.includes("ricota") || normFood.includes("minas")) {
    if (normUnit === "fatia") return 30;
    if (normUnit === "unidade") return 30;
    if (normUnit === "colher de sopa") return 20;
  }

  // 7. Pão Francês / Pão de Sal
  if (normFood.includes("pao frances") || normFood.includes("pao de sal")) {
    if (normUnit === "unidade") return 50;
  }

  // 8. Pão Integral / Pão de Forma / Pão Sírio / Pão de Centeio
  if (normFood.includes("pao integral") || normFood.includes("pao de forma") || normFood.includes("pao sirio") || normFood.includes("pao de centeio") || normFood.includes("bisnaga") || normFood.includes("torrada")) {
    if (normUnit === "fatia" || normUnit === "unidade") return 25;
    if (normUnit === "colher de sopa") return 15;
  }

  // 9. Fruits (Banana, Maçã, Mamão, Morango, etc.)
  if (normFood.includes("banana")) {
    if (normUnit === "unidade") return 65;
  }
  if (normFood.includes("maca")) {
    if (normUnit === "unidade") return 130;
  }
  if (normFood.includes("mamao") || normFood.includes("melancia") || normFood.includes("melao") || normFood.includes("abacaxi")) {
    if (normUnit === "fatia" || normUnit === "unidade") return 100;
  }
  if (normFood.includes("morango") || normFood.includes("uva") || normFood.includes("cereja") || normFood.includes("amora")) {
    if (normUnit === "unidade") return 15;
  }

  // 10. Batata Inglesa, Batata Doce, Mandioca, Inhame
  if (normFood.includes("batata") || normFood.includes("mandioca") || normFood.includes("inhame") || normFood.includes("aipim") || normFood.includes("macaxeira")) {
    if (normUnit === "unidade" || normUnit === "pedaco") return 100;
    if (normUnit === "fatia") return 20;
    if (normUnit === "colher de sopa") return 30;
  }

  // 11. Whey Protein / Powder Supplements
  if (normFood.includes("whey") || normFood.includes("creatina") || normFood.includes("suplemento") || normFood.includes("glutamina") || normFood.includes("colageno") || normFood.includes("protein")) {
    if (normUnit === "scoop" || normUnit === "unidade" || normUnit === "dose") return 30;
    if (normUnit === "colher de sopa") return 15;
    if (normUnit === "colher de cha") return 5;
  }

  // 12. Dairy creams / Requeijão, Cottage, Requeijão cremoso, Cream cheese, Iogurte, Leite de vaca
  if (normFood.includes("requeijao") || normFood.includes("cottage") || normFood.includes("cream cheese") || normFood.includes("creme de leite") || normFood.includes("manteiga") || normFood.includes("margarina") || normFood.includes("requeijao cremoso")) {
    if (normUnit === "colher de sopa") return 20;
    if (normUnit === "colher de cha") return 5;
    if (normUnit === "unidade" || normUnit === "pote") return 200;
    if (normUnit === "fatia") return 15;
  }
  if (normFood.includes("iogurte")) {
    if (normUnit === "unidade" || normUnit === "pote" || normUnit === "copo") return 170;
    if (normUnit === "colher de sopa") return 20;
  }
  if (normFood.includes("leite") || normFood.includes("suco") || normFood.includes("refrigerante") || normFood.includes("agua") || normFood.includes("cha") || normFood.includes("bebida")) {
    if (normUnit === "copo" || normUnit === "xicara" || normUnit === "caneca" || normUnit === "unidade") return 200;
    if (normUnit === "colher de sopa") return 15;
  }

  // 13. Bakery & Savory items (Pastel, Coxinha, Empada, Pão de Queijo, etc.)
  if (normFood.includes("pastel") || normFood.includes("coxinha") || normFood.includes("empada") || normFood.includes("esfiha") || normFood.includes("folhado") || normFood.includes("salgado")) {
    if (normUnit === "unidade") {
      if (normFood.includes("mini")) return 30;
      return 80;
    }
  }
  if (normFood.includes("pao de queijo")) {
    if (normUnit === "unidade") return 30;
  }

  // General default conversions
  if (normUnit === "colher de sopa") return 15;
  if (normUnit === "fatia") return 25;
  if (normUnit === "copo" || normUnit === "xicara") return 200;
  if (normUnit === "colher de arroz") return 25;
  if (normUnit === "concha") return 100;
  if (normUnit === "unidade") {
    if (fallbackGrams && fallbackGrams > 0 && fallbackGrams !== 100 && fallbackGrams !== 50) {
      return fallbackGrams;
    }
    return 50;
  }

  return fallbackGrams || 100;
}

export function enrichFoodWithExactCaloriesAndMacrosClient(item: any): any {
  const name = item.food_name || item.name || "";
  if (!name) return item;

  try {
    const cleanTerm = name.split("(")[0].trim().toLowerCase();
    if (cleanTerm.length < 2) return item;

    const termNormalized = cleanTerm.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // Search in FALLBACK_FOODS with structured scoring to prevent fuzzy prefix mismatches (e.g., maca matching macarrao instead of maca fuji)
    const scoredMatches = FALLBACK_FOODS.map((f: any) => {
      const fallbackName = f.name.toLowerCase().trim();
      const fallbackNom = fallbackName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      
      let score = 0;
      
      // Exact match (absolute priority, matching terms normalized)
      if (fallbackNom === termNormalized || fallbackName === cleanTerm) {
        score += 10000;
      }
      
      // Word boundary exact containment (e.g. term = "maca", match = "maçã fuji" -> exact word "maçã" matches!)
      const localWords = fallbackNom.split(/[\s,()\-]+/);
      const termWords = termNormalized.split(/[\s,()\-]+/);
      
      const containsExactWord = localWords.some(w => termWords.includes(w) || w === termNormalized);
      if (containsExactWord) {
        score += 5000;
      }

      // First word match (e.g. term = "maca fuji", match = "maçã" -> first words match!)
      if (localWords.length > 0 && termWords.length > 0 && localWords[0] === termWords[0]) {
        score += 3000;
      }

      // Starts with match (prefix matching)
      if (fallbackNom.startsWith(termNormalized) || fallbackName.startsWith(cleanTerm)) {
        score += 1000;
      }

      // If matches as sub-string but not as full word boundary (e.g. "maca" inside "macarrao")
      if (fallbackNom.includes(termNormalized) && !containsExactWord) {
        score += 10;
      } else if (fallbackNom.includes(termNormalized)) {
        score += 100;
      }

      // Distinguishing word negative constraints to prevent highly generic words mismatching specific ones
      if (fallbackNom.includes("doce") && !termNormalized.includes("doce")) {
        score -= 8000;
      }
      if ((fallbackNom.includes("moida") || fallbackNom.includes("moido")) && !termNormalized.includes("moida") && !termNormalized.includes("moido")) {
        score -= 8000;
      }
      if (fallbackNom.includes("integral") && !termNormalized.includes("integral")) {
        score -= 6000;
      }
      if ((fallbackNom.includes("porco") || fallbackNom.includes("suino") || fallbackNom.includes("suina")) && 
          !termNormalized.includes("porco") && !termNormalized.includes("suino") && !termNormalized.includes("suina") && !termNormalized.includes("lombo")) {
        score -= 8000;
      }

      // Length difference penalty (closer lengths are better indicators of proximity)
      const lengthDiff = Math.abs(fallbackNom.length - termNormalized.length);
      score -= lengthDiff * 5;

      return { food: f, score };
    }).filter(item => item.score > 0);

    const helperNormalizeUnit = (u: string): string => {
      const norm = (u || "").toLowerCase().trim();
      if (norm === "g" || norm === "gr" || norm === "grama" || norm === "gramas") return "gramas";
      if (norm === "ml" || norm === "mls" || norm === "mililitro" || norm === "mililitros" || norm === "ml.") return "mililitros";
      if (norm === "fatia" || norm === "fatias") return "fatia";
      if (norm === "colher de sopa" || norm === "colher" || norm === "colheres" || norm === "colher sopa" || norm === "colher de cha" || norm === "colher de sobremesa") return "colher de sopa";
      if (norm === "copo" || norm === "copos" || norm === "xicara" || norm === "xícara" || norm === "xicaras" || norm === "xícaras" || norm === "caneca" || norm === "canecas" || norm === "jarra" || norm === "garrafa" || norm === "vidro") return "copo";
      if (norm === "colher de arroz" || norm === "colher arroz" || norm === "colher de servir" || norm === "colher servir") return "colher de arroz";
      if (norm === "concha" || norm === "conchas" || norm === "concha média" || norm === "concha de feijão") return "concha";
      if (norm === "unidade" || norm === "unidades" || norm === "un" || norm === "unid" || norm === "unids" || norm === "u") return "unidade";
      return "unidade";
    };

    // Sort descending by score
    scoredMatches.sort((a, b) => b.score - a.score);
    const bestMatchWrap = scoredMatches.length > 0 ? scoredMatches[0] : null;

    if (bestMatchWrap) {
      const matchedFood = bestMatchWrap.food;
      const isBrandFood = isCommercialOrIndustrialized(cleanTerm);
      
      // If it is an industrialized commercial brand, only overwrite if we have an EXACT match in reference catalog (score >= 10000)
      // Or if score is weak (< 9500), preserve dynamic values to calculate custom things on-the-fly
      if ((isBrandFood && bestMatchWrap.score < 10000) || bestMatchWrap.score < 9500) {
        console.log(`[Client-AI-Enrichment] Skipping fuzzy catalog overwrite for branded/fuzzy food "${name}" (score ${bestMatchWrap.score}) to preserve premium on-the-fly AI calculation.`);
        return item;
      }

      console.log(`[Client-AI-Enrichment] Matched AI food "${name}" with client reference "${matchedFood.name}" (${matchedFood.calories} kcal)`);
      
      const originalUnit = helperNormalizeUnit(item.unit || "");
      let finalUnit = originalUnit;
      let finalGramsPerUnit;

      if (["gramas", "mililitros", "unidade", "colher de sopa", "fatia", "copo", "colher de arroz", "concha"].includes(originalUnit)) {
        finalUnit = originalUnit;
        if (originalUnit === "unidade" && matchedFood.grams_per_unit) {
          finalGramsPerUnit = matchedFood.grams_per_unit;
        } else {
          finalGramsPerUnit = getDeterministicGramsForFoodAndUnit(matchedFood.name, originalUnit, matchedFood.grams_per_unit || Number(item.grams_per_unit || 100));
        }
      } else {
        finalUnit = helperNormalizeUnit(matchedFood.measure_unit) || "unidade";
        finalGramsPerUnit = getDeterministicGramsForFoodAndUnit(matchedFood.name, finalUnit, matchedFood.grams_per_unit || 100);
      }

      return {
        ...item,
        food_name: matchedFood.name.split("(")[0].trim(),
        calories_per_100: matchedFood.calories,
        protein_per_100: matchedFood.protein,
        carbs_per_100: matchedFood.carbs,
        fat_per_100: matchedFood.fat,
        grams_per_unit: finalGramsPerUnit,
        unit: finalUnit,
        confidence_explanation: `Estimativa calibrada perfeitamente com a tabela de referência do aplicativo (${matchedFood.name}).`
      };
    }
  } catch (err) {
    console.warn("Error calibrating food client-side:", err);
  }

  return item;
}

// Check if we are on an external host (e.g., sportnutri.vercel.app)
export const isExternalHost = typeof window !== "undefined" && 
  window.location.hostname !== "localhost" && 
  window.location.hostname !== "127.0.0.1" && 
  !window.location.hostname.endsWith(".run.app");

export function stripAsterisks(text: string): string {
  if (!text) return "";
  return text.replace(/\*/g, "");
}

export function cleanJsonBlock(text: string): string {
  let clean = text.trim();
  if (clean.startsWith("```")) {
    clean = clean.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
  }
  // Try to find the first '{' and last '}'
  const firstCurly = clean.indexOf("{");
  const lastCurly = clean.lastIndexOf("}");
  if (firstCurly !== -1 && lastCurly !== -1 && lastCurly > firstCurly) {
    clean = clean.substring(firstCurly, lastCurly + 1);
  }
  return clean;
}

export async function callDirectClientAI(
  systemPrompt: string,
  userPrompt: string,
  image?: string,
  mimeType?: string
): Promise<string> {
  const config = getCachedStoreConfig();
  const provider = config?.ai_provider || "Google Gemini";
  const apiKey = config?.ai_api_key || "";
  let model = config?.ai_model || "gemini-3.5-flash";

  if (!apiKey) {
    throw new Error("Chave de API de Inteligência Artificial não configurada.");
  }

  if (provider === "Google Gemini" || provider.toLowerCase().includes("gemini")) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const parts: any[] = [{ text: userPrompt }];
    if (image && mimeType) {
      let cleanImg = image;
      if (image.startsWith("data:")) {
        const partsBase64 = image.split(",");
        if (partsBase64.length > 1) {
          cleanImg = partsBase64[1];
        }
      }
      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: cleanImg
        }
      });
    }

    const payload: any = {
      contents: [
        {
          role: "user",
          parts: parts
        }
      ],
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2
      },
      tools: [{ googleSearch: {} }]
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini Client Direct Error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return stripAsterisks(text);
  } else {
    let baseUrl = "https://api.openai.com/v1/chat/completions";
    let targetModel = model;
    
    if (provider.toLowerCase().includes("deepseek")) {
      baseUrl = "https://api.deepseek.com/chat/completions";
      if (targetModel === "gemini-3.5-flash") targetModel = "deepseek-chat";
    } else if (provider.toLowerCase().includes("groq")) {
      baseUrl = "https://api.groq.com/openai/v1/chat/completions";
      if (targetModel === "gemini-3.5-flash") targetModel = "llama3-70b-8192";
    } else if (provider.toLowerCase().includes("openai")) {
      if (targetModel === "gemini-3.5-flash") targetModel = "gpt-4o-mini";
    }

    const messages: any[] = [
      { role: "system", content: systemPrompt }
    ];

    if (image && mimeType) {
      let cleanImg = image;
      if (!image.startsWith("data:")) {
        cleanImg = `data:${mimeType};base64,${image}`;
      }
      messages.push({
        role: "user",
        content: [
          { type: "text", text: userPrompt },
          {
            type: "image_url",
            image_url: {
              url: cleanImg
            }
          }
        ]
      });
    } else {
      messages.push({ role: "user", content: userPrompt });
    }

    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: targetModel,
        messages: messages,
        temperature: 0.2,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`${provider} Client Direct Error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    let text = data?.choices?.[0]?.message?.content || "";
    return stripAsterisks(text);
  }
}

// 1. Direct Client Chat Assistant
export async function clientChatAssistant(options: {
  message: string;
  history: any[];
  profile: any;
  selectedMealId: string | null;
  foodLogs?: any[];
  workoutProfile?: any;
  activeRoutine?: any;
  waterAmount?: number;
  waterGoal?: number;
}): Promise<any> {
  const { 
    message, 
    history, 
    profile, 
    selectedMealId, 
    foodLogs = [], 
    workoutProfile, 
    activeRoutine, 
    waterAmount = 0, 
    waterGoal = 2000 
  } = options;
  const username = profile?.username || "atleta";
  const sex = profile?.user_data?.sex;
  
  let genderInfo = "Gênero não especificado ou neutro. Trate o usuário de forma variada e divertida usando termos esportivos unissex/gerais como: fera, monstro, lenda, mestre, máquina, etc. Evite fixar em apenas um apelido repetitivo.";
  if (sex === "female") {
    genderInfo = "Usuária do gênero feminino (ela). Trate-a com apelidos femininos variados e empolgados, como: campeã, musa, monstra, guerreira, parceira, lenda, gigante, atleta. Nunca use 'campeão' ou formas apenas masculinas de tratamento.";
  } else if (sex === "male") {
    genderInfo = "Usuário do gênero masculino (ele). Trate-o com apelidos masculinos variados e empolgados, como: campeão, monstro, gigante, guerreiro, parceiro, mestre, fera, lenda, máquina.";
  }

  const defaultMeals = [
    { id: 'cafe', name: 'Café da Manhã', icon: '☕' },
    { id: 'lanche_manha', name: 'Lanche da Manhã', icon: '🍎' },
    { id: 'almoco', name: 'Almoço', icon: '🍲' },
    { id: 'lanche_tarde', name: 'Lanche da Tarde', icon: '🥪' },
    { id: 'jantar', name: 'Jantar', icon: '🥗' },
    { id: 'ceia', name: 'Ceia', icon: '🥛' }
  ];
  const userMeals = (profile?.custom_meals && profile.custom_meals.length > 0) ? profile.custom_meals : defaultMeals;
  const currentSelectedMealObj = userMeals.find((m: any) => m.id === selectedMealId);
  let selectedMealPrompt = "O usuário atualmente não selecionou previamente nenhuma refeição específica na tela.";
  if (currentSelectedMealObj) {
    selectedMealPrompt = `O usuário atualmente SELECIONOU ou está visualizando a refeição "${currentSelectedMealObj.name || currentSelectedMealObj.id}". Se o usuário pedir para adicionar um alimento e NÃO houver menção a outra refeição no texto para aquele alimento, coloque-o nesta refeição por padrão. Caso contrário, se o usuário associar explicitamente o alimento a outra refeição no texto, coloque-o na respectiva refeição mencionada!`;
  }

  let consumedSummary = "Nenhum alimento registrado ainda hoje.";
  let totalCalsConsumed = 0;
  let totalProtConsumed = 0;
  let totalCarbsConsumed = 0;
  let totalFatConsumed = 0;

  if (Array.isArray(foodLogs) && foodLogs.length > 0) {
    totalCalsConsumed = Math.round(foodLogs.reduce((sum: number, log: any) => sum + (log.calories || 0), 0));
    totalProtConsumed = Math.round(foodLogs.reduce((sum: number, log: any) => sum + (log.protein || 0), 0));
    totalCarbsConsumed = Math.round(foodLogs.reduce((sum: number, log: any) => sum + (log.carbs || 0), 0));
    totalFatConsumed = Math.round(foodLogs.reduce((sum: number, log: any) => sum + (log.fat || 0), 0));

    consumedSummary = foodLogs.map((log: any) => `  - ${log.name || log.food_name}: ${log.calories} kcal (P: ${log.protein}g, C: ${log.carbs}g, G: ${log.fat}g) [Na refeição: ${log.meal_type || 'Geral'}]`).join("\n");
  }

  const targetCalories = profile?.diet_plan?.targetCalories || profile?.diet_plan?.dailyTargets?.calories || 2000;
  const targetProtein = profile?.diet_plan?.macros?.protein || profile?.diet_plan?.dailyTargets?.protein || 150;
  const targetCarbs = profile?.diet_plan?.macros?.carbs || profile?.diet_plan?.dailyTargets?.carbs || 200;
  const targetFat = profile?.diet_plan?.macros?.fat || profile?.diet_plan?.dailyTargets?.fat || 60;

  const remainingCalories = Math.max(0, targetCalories - totalCalsConsumed);
  const remainingProtein = Math.max(0, targetProtein - totalProtConsumed);
  const remainingCarbs = Math.max(0, targetCarbs - totalCarbsConsumed);
  const remainingFat = Math.max(0, targetFat - totalFatConsumed);

  // User Biometrics & Health Goals
  const age = profile?.user_data?.age || "";
  const weight = profile?.user_data?.weight || "";
  const height = profile?.user_data?.height || "";
  const goalMap: any = {
    hypertrophy: "Hipertrofia Muscular",
    weightloss: "Perda de Peso / Emagrecimento",
    recomposition: "Recomposição Corporal",
    maintenance: "Manutenção de Peso"
  };
  const userGoal = goalMap[profile?.user_data?.goal] || "Não especificado";
  const activityMap: any = {
    sedentary: "Sedentário",
    light: "Atividade Leve",
    moderate: "Atividade Moderada",
    high: "Atividade Intensa / Muito Ativo",
    athlete: "Atleta"
  };
  const userActivity = activityMap[profile?.user_data?.activityLevel] || "Não especificado";
  const medicalCond = profile?.user_data?.medicalConditions || "Nenhuma relatada";
  const dietRestr = (profile?.user_data?.dietRestrictions && profile.user_data.dietRestrictions.length > 0)
    ? profile.user_data.dietRestrictions.join(", ")
    : "Nenhuma restrição alimentar";

  // Water Info
  const waterGoalText = `${waterAmount}ml de água puros ingeridos hoje (Meta diária de hidratação: ${waterGoal}ml)`;

  // Workout Profile Context
  let workoutProfileContext = "Nenhum perfil de treino registrado ou configurado ainda.";
  if (workoutProfile) {
    const expMap: any = { beginner: "Iniciante", intermediate: "Intermediário", advanced: "Avançado" };
    const exp = expMap[workoutProfile.experience] || "Não especificado";
    workoutProfileContext = `
  • Nível de Experiência: ${exp}
  • Dias de Treino por Semana: ${workoutProfile.daysPerWeek || 0} dias
  • Duração Média do Treino: ${workoutProfile.workoutDuration || 0} minutos
  • Equipamentos Disponíveis: ${(workoutProfile.equipment || []).join(", ") || "Nenhum selecionado"}
  • Limitações/Restrições Físicas: ${(workoutProfile.limitations || []).join(", ") || "Nenhuma cadastrada"}
  • Divisão de Treino: ${workoutProfile.divisionType || "Não especificada"}
`;
  }

  // Active Workout Routine / Sheet (Ficha de Treino) Context
  let workoutRoutineContext = "O usuário atualmente não possui uma ficha de treino gerada ou ativa no sistema.";
  if (activeRoutine && Array.isArray(activeRoutine.days) && activeRoutine.days.length > 0) {
    workoutRoutineContext = `Ficha de Treino Ativa (Divisão ${activeRoutine.division || "Personalizada"}):`;
    activeRoutine.days.forEach((day: any) => {
      workoutRoutineContext += `\n- ${day.name || `Dia ${day.id}`}:`;
      if (Array.isArray(day.exercises) && day.exercises.length > 0) {
        day.exercises.forEach((ex: any) => {
          const seriesText = (ex.series || []).map((s: any) => `${s.carga}kg x ${s.reps} reps`).join(", ");
          workoutRoutineContext += `\n  • ${ex.exercise?.nome || ex.exercise?.name || "Exercício"}: ${seriesText || "Séries livres"}${ex.observacoes ? ` (Obs: ${ex.observacoes})` : ""}`;
        });
      } else {
        workoutRoutineContext += "\n  • Sem exercícios listados para este dia.";
      }
    });
  }

  const systemPrompt = `Você é o Nutri-Assistant, um assistente virtual ultra-inteligente, super animado e de conversa extremamente descontraída integrado ao 'SportNutri', um aplicativo de nutrição focado em alta performance desportiva.
O usuário quer registrar, remover ou alterar o consumo dietético dele por meio de conversa livre ou fazer perguntas sobre suas metas, alimentos e treinos.
Cada mensagem pode pedir para adicionar um ou mais alimentos, registrar consumo de água, remover itens registrados, tirar dúvidas nutricionais, indicar treinos ou fazer cálculos dinâmicos com base em quanto resta para ele bater a meta do dia!

CRÍTICO: Você NUNCA deve usar asteriscos (* ou **) na propriedade "response"! Nenhuma palavra ou frase deve ter asteriscos. NUNCA envie texto em negrito formatado com asteriscos. Use formatação em texto simples e limpo, sem markdown visual de ênfase. Se precisar listar coisas, use quebras de linha simples ou marcadores simples como "•" ou "-". Se desobedecer isso e emitir um único asterisco na resposta, o sistema de chat falhará.

CONTEXTO DO USUÁRIO ATUAL:
- Nome/Username: ${username}
- Gênero/Tratamento adequado: ${genderInfo}
- Biometria e Características Físicas:
  • Idade: ${age ? `${age} anos` : "Não especificada"}
  • Peso atual: ${weight ? `${weight} kg` : "Não especificado"}
  • Altura: ${height ? `${height} cm` : "Não especificada"}
  • Objetivo principal: ${userGoal}
  • Nível de Atividade Diária: ${userActivity}
  • Condições médicas: ${medicalCond}
  • Restrições alimentares: ${dietRestr}

- Hidratação de Hoje:
  • ${waterGoalText}

- Perfil de Treino Físico do Usuário:
${workoutProfileContext}

- Ficha de Treino e Exercícios Específicos Atuais do Usuário (Use isso para responder dúvidas sobre qual treino fazer, ficha de exercícios, etc.):
${workoutRoutineContext}

- Registro de Alimentos Consumidos HOJE até o momento:
${consumedSummary}
- Macronutrientes e Calorias Totais Consumidas Hoje: ${totalCalsConsumed} kcal (P: ${totalProtConsumed}g, C: ${totalCarbsConsumed}g, G: ${totalFatConsumed}g)
- Metas Diárias Totais Recomendadas do Usuário: ${targetCalories} kcal (P: ${targetProtein}g, C: ${targetCarbs}g, G: ${targetFat}g)
- Calorias e Macros RESTANTES para Bater a Meta de Hoje: ${remainingCalories} kcal (P: ${remainingProtein}g, C: ${remainingCarbs}g, G: ${remainingFat}g)

Se o usuário perguntar quanto falta para bater a meta, ou o que ele pode comer para atingir as calorias/macros restantes (por exemplo, "quantas colheres de aveia com leite eu deveria ingerir para atingir minha meta de calorias restantes?"), use os dados fornecidos acima (Calorias/Macros RESTANTES) para realizar cálculos dinâmicos extremamente precisos e didáticos, informando a quantidade e a porção sugerida (ex: 1 colher de aveia tem aprox. 50 kcal e 100ml de leite integral tem 60 kcal, então ele precisaria de X colheres e Y ml). Seja ultra-preciso, direto e amigável!

Se o usuário perguntar "Qual treino devo fazer hoje?" ou solicitar detalhes sobre sua ficha, você DEVE analisar a "Ficha de Treino e Exercícios Específicos Atuais do Usuário" descrita acima. Indique exatamente quais exercícios e séries pertencem àquela rotina de treino atual (ex: "Dia A - Peito e Tríceps", com os respectivos exercícios e cargas cadastrados), sem dar respostas genéricas de inventar novos exercícios aleatórios. Diga exatamente o que está na ficha dele!

- Refeição Selecionada na Tela (Contexto Físico): ${selectedMealPrompt}
- Refeições Disponíveis do Usuário (Sempre mapeie meal_type para um de seus nomes atualizados abaixo):
${userMeals.map((m: any) => `  - ID "${m.id}" -> nome atualizado: "${m.name}"`).join("\n")}

DIRETRIZ DE TEMPO VERBAL CRÍTICO (TEMPO PRESENTE/FUTURO PARA REVISÃO):
Quando o usuário pede para registrar alimentos (added_foods) ou água (added_waters) ou exclusões (deleted_foods), estes registros NÃO são salvos imediatamente. Eles são exibidos na tela como cartões ou caixas de seleção pendentes, aguardando que o usuário revise os valores e clique em um botão físico de confirmar o lançamento.
Portanto, as frases da sua propriedade "response" NUNCA devem usar verbos no passado dizendo que você já realizou o cadastro ou que já está lançado (ex: evite "Feito! Adicionei o seu arroz...", "Já salvei no diário", "Alimento cadastrado").
Você DEVE falar no presente ou futuro, dizendo que você PREPAROU as estimativas, ANALISOU o pedido, ou MONTOU as sugestões para o usuário revisar e confirmar nos cartões exibidos na lista logo abaixo!
Exemplos corretos:
- "Montei as estimativas do seu prato, monstro! Confere aqui embaixo e clica pra confirmar!"
- "Deixei a estimativa da sua refeição na agulha! Dá uma olhada nos cards abaixo e confirma."
- "Organizei os mililitros pra você, campeã! Dá aquele clique no botão abaixo pra confirmar sua dose de água."

DIRETRIZ DE HUMOR E DUPLO SENTIDO (FIT-PIADAS):
- Seja muito engraçado, motivador, espirituoso e brincalhão! Formule trocadilhos inovadores e piadas de duplo sentido sempre que possível com o tema da musculação brasileira e de comida/macros (por exemplo, brincadeiras divertidas de duplo sentido sobre tamanho da porção/banana, mastigar ovos cozidos, o peso da batata doce, treinos intensos, 'mandar pra dentro', 'engolir seco', dar aquela endurecida nos músculos com proteína, bater metas, lubrificar as juntas com água, etc.).
- Sempre varie os apelidos do usuário! Nunca fique repetindo infinitamente o mesmo termo (como 'campeão'). Utilize os apelidos compatíveis com o gênero do usuário descritos no contexto atual.
- Utilize emojis variados e divertidos (como 💪, 🍎, 🍗, 🥛, 💧, 🥣, 🥚, 🍌, ⚡, 😜, 🔥) para deixar a resposta ultra rica e expressiva.

Você deve responder rigorosamente no formato JSON com as seguintes propriedades:
1. "response" (string): Uma mensagem calorosa, super engraçada (com trocadilhos/duplo sentido saudáveis sobre fitness) em Português do Brasil de acordo com as instruções acima. IMPORTANTE: ZERO ASTERISCOS, ZERO DE VERBO NO PASSADO SOBRE LANÇAR alimentos.
2. "added_foods" (array_de_objetos): Alimentos e bebidas nutritivas / com calorias a serem exibidos para confirmação. Cada objeto da lista DEVE possuir obrigatoriamente as seguintes chaves com valores estimados realistas e precisos (baseados nas bases nutricionais como TACO):
   - "meal_type" (string): O nome da refeição (ex: "Café da Manhã", "Almoço", "Lanche da Tarde", "Jantar", "Ceia").
   - "food_name" (string): Nome legível do alimento em português (ex: "Ovo Cozido", "Arroz Branco", "Pão Francês", "Leite de Vaca", "Suco de Laranja").
   - "amount" (number): Quantidade numérica consumida (ex: 1, 2, 1.5, 120).
   - "unit" (string): Uma das unidades válidas: "gramas", "mililitros", "unidade", "colher de sopa", "fatia", "copo", "colher de arroz", "concha".
   - "grams_per_unit" (number): Peso estimado em gramas de uma unidade da medida indicada (ex: 50 para ovo cozido, 15 para fatia, 50 para pão francês, 1 para mililitros).
   - "calories_per_100" (number): Densidade calórica estimada a cada 100g ou 100ml de alimento/bebida (ex: 140 para ovo cozido, 130 para arroz, 250 para hambúrguer).
   - "protein_per_100" (number): Gramas de proteína a cada 100g ou 100ml.
   - "carbs_per_100" (number): Gramas de carboidrato a cada 100g ou 100ml.
   - "fat_per_100" (number): Gramas de gordura a cada 100g ou 100ml.
   - "confidence_explanation" (string): Explicação curta sobre a estimativa.
3. "added_waters" (array_de_objetos): Porções de água pura com a chave "amount_ml" (number) indicando mililitros. ATENÇÃO: NUNCA coloque leite, café, sucos, shakes ou whey protein neste array; todas as bebidas com calorias ou macronutrientes devem obrigatoriamente ser colocadas no array "added_foods" como alimento.
4. "deleted_foods" (array_de_objetos): Pedidos de exclusão com a chave "food_name" (string).
5. "quick_actions" (array_de_objetos): Atalhos de navegação rápidos ou comandos. Cada objeto deve ter: "label" (texto curto com emoji ex: '💪 Ver Ficha'), "action" ('link' ou 'faq_reply'), e "value" (nome de aba como 'workout_ficha', 'workout_today', 'workout_dashboard', 'dashboard', 'profile' ou frase de comando para 'faq_reply'). Máximo de 3.
6. "voce_sabia" (string): Uma curiosidade científica curta e interessante sobre saúde ou esporte começando com 'Você sabia? 💡'. NÃO USE ASTERISCOS. Retorne vazio '' se não for oportuno.

Instruções para cálculo de macros/alimentos adicionados:
- DISTINÇÃO ENTRE ÁGUA E BEBIDAS NUTRITIVAS:
  - ÁGUA PURA: Deve ser adicionada EXCLUSIVAMENTE ao array "added_waters".
  - OUTRAS BEBIDAS (LEITE, SUCOS, CAFÉ, SHAKES, REFRIGERANTES, WHEY): Devem ir obrigatoriamente no array "added_foods", pois são alimentos com calorias e macronutrientes.
- REQUISITO CRÍTICO DE ESTIMATIVA INTELIGENTE E AUTOMÁTICA (NÃO FAÇA PERGUNTAS DESNECESSÁRIAS):
  Você NUNCA deve fazer perguntas repetitivas ou burocráticas sobre peso em gramas das fatias, mililitros de copos/xícaras ou detalhes exaustivos de modo de preparação (como ovo frito vs cozido vs mexido; pão branco vs integral, etc.). Para isso que o sistema possui inteligência integrada: adote sempre porções padrão saudáveis brasileiras, tome a decisão e monte as estimativas imediatamente! Se o preparo não for dito, assuma a versão mais comum/saudável correspondente (ex: cozido ou grelhado).
  - Exemplos de padrões brasileiros:
    - Ovos: 1 unidade = 50g (Ovo Cozido: ~70 kcal, 6g P, 0.5g C, 5g G; Ovo Frito/Mexido: ~90 kcal, 6g P, 0.5g C, 7g G).
    - Pão de Forma / Integral: 1 fatia = 25g (~62 kcal, 2.5g P, 11g C, 0.8g G).
    - Pão Francês: 1 unidade = 50g (~135 kcal, 4.5g P, 28g C, 1g G).
    - Presunto/Apresuntado/Queijo: 1 fatia = 15g a 20g (ex: presunto/apresuntado a ~20 kcal cada fatia, queijo prato/mussarela a ~60 kcal cada fatia, queijo branco/minas a ~50 kcal cada fatia de 30g).
    - Café com Leite: 1 xícara = 200ml a 240ml (Integral com açúcar: ~120 kcal, 6g P, 14g C, 5g G; Desnatado sem açúcar: ~70 kcal).
- QUANTIDADE E UNIDADE CORRETA (RECONHEÇA A UNIDADE DIGITALIZADA):
  O campo "amount" DEVE refletir perfeitamente a quantidade numérica dita ou implícita pelo usuário, e o campo "unit" DEVE ser exatamente a unidade de medida digitada/mencionada pelo usuário (como "concha", "unidade", "gramas", "mililitros", "fatia", "colher de sopa", "copo", "colher de arroz"). NUNCA substitua ou altere a unidade digitada pelo usuário por conveniência (ex: se o usuário diz que comeu "1 concha", use unit: "concha" e amount: 1; se ele dita "1 colher de arroz", use unit: "colher de arroz" e amount: 1; se diz "1 fatia", use unit: "fatia", etc.). Configure o campo grams_per_unit de acordo com o peso de referência correspondente a essa unidade específica.
- REGISTRE APENAS QUANDO SOLICITADO:
  Você DEVE apenas cadastrar/adicionar alimentos e preencher o array "added_foods" quando o usuário ordenar ou pedir explicitamente para registrar, salvar ou declarar o consumo real ("comi", "adicione", "lance no diário", "bebi", "consumi"). Se o usuário estiver tirando dúvidas teóricas, fazendo suposições, pedindo receitas ou perguntando quantos macros tem uma comida sem relatar consumo ("quanto de proteína tem na carne de panela?"), você NÃO DEVE preencher o array "added_foods"! Apenas responda a dúvida na propriedade "response".
- SE NENHUM REGISTRO DE ÁGUA FOI SOLICITADO pelo usuário na mensagem atual, o array "added_waters" DEVE ser retornado obrigatoriamente vazio: []. NUNCA adicione ou sugira água de forma fictícia, presumida ou automática se o usuário não pediu especificamente para registrar consumo de água ou se o usuário pediu apenas comida! Se o usuário comeu apresuntado, pão, frango, etc., "added_waters" deve ser [].
- DETERMINAÇÃO DA REFEIÇÃO PARA CADA ALIMENTO INDIVIDUAL (MUITO CRÍTICO):
  - Analise cada alimento individual contido na mensagem separadamente.
  - Se o usuário especificou em qual refeição consumiu determinado alimento (ex: no café da manhã comi pão, no almoço arroz com feijão, de lanche da tarde whey, de jantar frango), você DEVE obrigatoriamente atribuir o 'meal_type' correto e correspondente de forma totalmente INDEPENDENTE para cada alimento criado na lista 'added_foods'! Jamais junte ou classifique alimentos de refeições distintas sob uma mesma refeição.
  - Para alimentos onde o usuário NÃO disser a refeição:
    - Se houver uma refeição sendo visualizada ou selecionada na tela (indicada no parâmetro "Refeição Selecionada na Tela" acima), use-a para esses alimentos sem refeição especificada.
    - Senão, use a hora atual ou o senso lógico de nutrição para deduzir a melhor refeição para cada item (ex: das 05h às 10h -> Café da Manhã; das 10h às 12h -> Lanche da Manhã; das 12h às 15h -> Almoço; das 15h às 18h30 -> Lanche da Tarde; das 18h30 às 22h -> Jantar; das 22h às 05h -> Ceia).
- Se o usuário pedir para remover um alimento (ex: "exclui meu arroz do almoço" ou "deleta o ovo de hoje"), preencha o campo "deleted_foods" with { "food_name": "arroz" }.

Retorne SOMENTE o JSON estruturado completo em Português do Brasil. Sem usar asteriscos em nenhuma resposta ou texto descritivo.`;

  const chatHistoryParts = history ? history.map((h: any) => {
    return `${h.sender === "user" ? "Usuário" : "Assistente"}: ${h.text}`;
  }).join("\n") : "";

  const userEntry = `${chatHistoryParts}\nUsuário: ${message}`;
  
  const rawResponse = await callDirectClientAI(systemPrompt, userEntry);
  const cleanJson = cleanJsonBlock(rawResponse);
  const parsed = JSON.parse(cleanJson || '{"response":"","added_foods":[],"added_waters":[],"deleted_foods":[]}');

  const actions: any[] = [];
  if (parsed.added_foods && Array.isArray(parsed.added_foods)) {
    for (const f of parsed.added_foods) {
      const enriched = enrichFoodWithExactCaloriesAndMacrosClient(f);
      actions.push({
        type: "ADD_FOOD",
        ...enriched
      });
    }
  }
  if (parsed.added_waters && Array.isArray(parsed.added_waters)) {
    for (const w of parsed.added_waters) {
      actions.push({
        type: "ADD_WATER",
        ...w
      });
    }
  }
  if (parsed.deleted_foods && Array.isArray(parsed.deleted_foods)) {
    for (const d of parsed.deleted_foods) {
      actions.push({
        type: "DELETE_FOOD",
        ...d
      });
    }
  }

  return {
    response: stripAsterisks(parsed.response || ""),
    actions: actions,
    quickActions: parsed.quick_actions || [],
    voceSabia: parsed.voce_sabia || null
  };
}

// 2. Direct Client Analyze Meal
export async function clientAnalyzeMeal(options: {
  text?: string;
  image?: string;
  mimeType?: string;
}): Promise<any> {
  const { text, image, mimeType } = options;

  const systemPrompt = `Você é um analista nutricional de IA avançado para o aplicativo SportNutri.
Analise a refeição fornecida pelo usuário (seja por áudio transcrito em texto ou através de uma imagem/foto).
O usuário pode ter comido vários alimentos de uma vez só.

Identifique CADA elemento da refeição separadamente. Para cada elemento individual, estime com precisão os valores com base no peso real ou de referência da tabela TACO, gerando valores realistas para o tamanho da porção descrita.

Retorne um objeto JSON contendo uma lista sob a chave "foods". Para cada alimento, preencha:
- food_name: nome amigável em português do alimento (ex: "Tapioca", "Presunto Cozido", "Queijo de Minas")
- amount: número correspondente à quantidade (ex: se o usuário comeu "3 tapiocas", amount é 3)
- unit: a unidade de medida correspondente, que deve ser estritamente uma destas opções válidas em português e minúsculas: "gramas", "mililitros", "unidade", "colher de sopa", "fatia", "copo", "colher de arroz", "concha"
- grams_per_unit: o peso estimado real em gramas de UMA unidade da medida escolhida para esse alimento específico
- calories_per_100: calorias de uma porção de referência de 100g ou 100ml deste alimento
- protein_per_100: gramas de proteína em 100g ou 100ml deste alimento
- carbs_per_100: gramas de carboidrato em 100g ou 100ml deste alimento
- fat_per_100: gramas de gordura em 100g ou 100ml deste alimento
- confidence_explanation: uma explicação curta e direta em português sobre a estimativa
- meal_type: "Café da Manhã", "Lanche da Manhã", "Almoço", "Lanche da Tarde", "Jantar", "Ceia".

Certifique-se de que se houver múltiplos alimentos, você crie itens separados. Todo o output deve ser em Português do Brasil. Sem usar asteriscos em nenhuma resposta ou texto descritivo.`;

  const userPrompt = text ? `Entrada do usuário: ${text}` : "Identifique os alimentos desta imagem.";
  const rawResponse = await callDirectClientAI(systemPrompt, userPrompt, image, mimeType);
  const cleanJson = cleanJsonBlock(rawResponse);
  const result = JSON.parse(cleanJson || '{"foods":[]}');
  if (result && result.foods && Array.isArray(result.foods)) {
    result.foods = result.foods.map((f: any) => {
      const enrichedItem = enrichFoodWithExactCaloriesAndMacrosClient(f);
      const finalUnit = enrichedItem.unit || f.unit || "unidade";
      const finalName = enrichedItem.food_name || f.food_name || f.name || "";
      const exactMathGrams = getDeterministicGramsForFoodAndUnit(finalName, finalUnit, Number(enrichedItem.grams_per_unit || f.grams_per_unit || 100));
      return {
        ...enrichedItem,
        grams_per_unit: exactMathGrams
      };
    });
  }
  return result;
}

// 3. Direct Client Generate Exercise
export async function clientGenerateExercise(options: {
  grupoPrincipal: string;
  activeDayName?: string;
  existingExercises?: string[];
  typedName?: string;
}): Promise<any> {
  const { grupoPrincipal, activeDayName, existingExercises, typedName } = options;

  const systemPrompt = `Você é um especialista em cinesiologia, musculação de alta performance e biomecânica desportiva para a plataforma SportNutri.
Sua tarefa é sugerir ou aperfeiçoar um EXCELENTE exercício físico personalizado para ser adicionado à rotina do usuário, com base nas informações recebidas.

Se o campo "typedName" for fornecido e contiver um nome de exercício ou fragmento, você deve priorizar totalmente a busca e o preenchimento de todas as informações corretas relativas a esse exercício específico.

Você deve responder rigorosamente no formato JSON com as seguintes chaves:
{
  "nome": "Nome do Exercício em Português",
  "equipamento": "pesos_livres", // "pesos_livres" | "polia" | Maquina" | "calistenia" | "halteres" | "barra"
  "nivel": "intermediario", // "iniciante" | "intermediario" | "avancado"
  "tipo": "composto", // "composto" | "isolador"
  "tips": {
    "correta": "Instruções passo a passo detalhadas para a execução correta, focando na postura, respiração e biomecânica.",
    "erros": "Principais erros comuns cometidos pelos praticantes neste exercício.",
    "evitar": "Dicas cinesiológicas essenciais de segurança para evitar lesões musculares ou articulares."
  }
}

REGRAS CRÍTICAS:
1. O exercício deve pertencer estritamente ao grupo muscular solicitado: "${grupoPrincipal}".
2. O exercício sugerido deve ser compatível com o dia de treino: "${activeDayName || ''}".
3. O exercício sugerido NÃO deve ser nenhum dos seguintes que já existem no dia atual: ${JSON.stringify(existingExercises || [])}.
4. CRÍTICO: NÃO USE ASTERISCOS (* ou **) em nenhuma parte do texto gerado sob qualquer circunstância!
`;

  const userPrompt = `Gere um exercício para o grupo muscular "${grupoPrincipal}", no treino de foco "${activeDayName || ''}".${typedName ? ` O usuário escreveu "${typedName}" como nome de busca base; encontre e preencha o registro para este exercício específico.` : ''}`;
  
  const rawResponse = await callDirectClientAI(systemPrompt, userPrompt);
  const cleanJson = cleanJsonBlock(rawResponse);
  const parsed = JSON.parse(cleanJson || "{}");
  
  // Clean potential asterisks from properties
  const cleanObj = (obj: any): any => {
    if (typeof obj === "string") return stripAsterisks(obj);
    if (Array.isArray(obj)) return obj.map(cleanObj);
    if (obj !== null && typeof obj === "object") {
      const resObj: any = {};
      for (const k of Object.keys(obj)) {
        resObj[k] = cleanObj(obj[k]);
      }
      return resObj;
    }
    return obj;
  };
  return cleanObj(parsed);
}

// 4. Direct Client Generate Recipes
export async function clientGenerateRecipe(options: {
  difficulty?: string;
  ingredients?: string;
  goal?: string;
  dietPreference?: string;
  excludeTitles?: string[];
}): Promise<any> {
  const { difficulty = "medium", ingredients = "", goal = "health", dietPreference = "any", excludeTitles = [] } = options;

  const goalWord = goal === "hipertrofia" ? "Ganho de Massa Muscular (Hipertrofia)" : 
                   goal === "emagrecimento" ? "Emagrecimento ou Perda de Gordura" : 
                   goal === "definicao" ? "Definição Muscular" : "Saúde & Bem-estar";

  const dietWord = dietPreference === "vegetarian" ? "Vegetariana" :
                   dietPreference === "vegan" ? "Vegana" :
                   dietPreference === "low_carb" ? "Low Carb" :
                   dietPreference === "ketogenic" ? "Cetogênica" : "Qualquer preferência";

  const difficultyWord = difficulty === "easy" ? "Fácil (rápido, poucos utensílios, menos de 15 minutos)" :
                         difficulty === "hard" ? "Difícil (mais elaborado, técnicas culinárias avançadas, tempo maior)" :
                         "Médio (preparo padrão equilibrado, de 15 a 30 minutos)";

  let ingredientsPrompt = "Use alimentos saudáveis variados padrão do aplicativo.";
  if (ingredients && ingredients.trim()) {
    ingredientsPrompt = `Você DEVE priorizar ou tentar incluir preferencialmente estes ingredientes informados pelo usuário: ${ingredients}.`;
  }

  let excludePrompt = "Nenhuma restrição de repetição.";
  if (Array.isArray(excludeTitles) && excludeTitles.length > 0) {
    excludePrompt = `Você é terminantemente PROIBIDO de gerar qualquer receita com títulos parecidos ou iguais a estes: ${excludeTitles.slice(0, 15).join(", ")}.`;
  }

  const systemPrompt = `Você é um Chef Nutricionista de alta performance esportiva integrado ao SportNutri.
O seu objetivo é criar UMA receita fitness espetacular, muito saborosa e saudável.

CRÍTICO: Você NUNCA deve usar asteriscos (* ou **) na sua resposta! Nenhuma palavra ou frase deve ter asteriscos. NUNCA envie texto em negrito formatado com asteriscos. Se desobedecer isso, o sistema de parser falhará.

Você deve classificar a receita em uma das seguintes categorias literais (retorne EXATAMENTE este nome no campo "category"):
- "chicken"
- "meat"
- "salad"
- "shake"
- "pancakes"
- "fish"
- "dessert"
- "egg"

Você deve retornar obrigatoriamente um JSON estruturado com o seguinte formato:
{
  "title": "Nome criativo e saboroso da receita",
  "difficulty": "facil" ou "medio" ou "dificil",
  "category": "uma das categorias literais listadas acima",
  "prepTime": "Tempo de preparo estipulado, exemplo: '20 min'",
  "calories": calorias totais do prato (apenas número inteiro),
  "protein": proteínas totais (apenas número inteiro em gramas),
  "carbs": carboidratos totais (apenas número inteiro em gramas),
  "fat": gorduras totais (apenas número inteiro em gramas),
  "ingredients": [
    "Ingrediente 1",
    "Ingrediente 2"
  ],
  "instructions": [
    "Passo 1 do preparo",
    "Passo 2"
  ],
  "nutritionBenefits": "Explicação curta inspiradora de como essa receita ajuda o usuário."
}
`;

  const userPrompt = `Crie uma receita fitness espetacular baseada nos seguintes parâmetros:
- Dificuldade: ${difficultyWord}
- Objetivo: ${goalWord}
- Dieta: ${dietWord}
- Ingredientes base: ${ingredientsPrompt}
- Excluir receitas com títulos: ${excludePrompt}`;

  const rawResponse = await callDirectClientAI(systemPrompt, userPrompt);
  const cleanJson = cleanJsonBlock(rawResponse);
  const parsed = JSON.parse(cleanJson || "{}");
  
  const cleanObj = (obj: any): any => {
    if (typeof obj === "string") return stripAsterisks(obj);
    if (Array.isArray(obj)) return obj.map(cleanObj);
    if (obj !== null && typeof obj === "object") {
      const resObj: any = {};
      for (const k of Object.keys(obj)) {
        resObj[k] = cleanObj(obj[k]);
      }
      return resObj;
    }
    return obj;
  };
  return cleanObj(parsed);
}

// 5. Direct Client Moderate Image
export async function clientModerateImage(imageDataUrl: string): Promise<any> {
  let mimeType = 'image/jpeg';
  let data = imageDataUrl;
  if (imageDataUrl.startsWith('data:')) {
    const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      mimeType = match[1];
      data = match[2];
    }
  }

  const systemPrompt = `Você é um Moderador de Conteúdo de IA especialista e ultra rigoroso para o aplicativo SportNutri.
Analise a imagem de perfil enviada pelo usuário. O objetivo é garantir que a imagem seja segura e apropriada para o público geral.
Traga ressafe como true se for saudável (fotos de silhueta, de rosto, com roupa esportiva comum, pratos saudáveis etc.), e false se contiver conteúdo impróprio/agressivo.

Sua resposta DEVE ser um objeto JSON contendo:
- isSafe (boolean): true ou false
- reason (string): Justificativa curta e educada em português do Brasil
- category (string): 'safe', 'nudity', 'violence', 'drugs', 'offensive_hate', ou 'other_inappropriate'`;

  const userPrompt = "Modere a imagem enviada pelo usuário.";
  const rawResponse = await callDirectClientAI(systemPrompt, userPrompt, data, mimeType);
  const cleanJson = cleanJsonBlock(rawResponse);
  return JSON.parse(cleanJson || '{"isSafe":true,"reason":"Aprovada","category":"safe"}');
}

// Global Try with Client Fallback Utility
export async function tryFetchWithClientFallback<T>(
  apiUrl: string,
  fetchOptions: RequestInit,
  clientFallbackFn: () => Promise<T>
): Promise<T> {
  const config = getCachedStoreConfig();
  const hasLocalKey = !!config?.ai_api_key;

  // Attempt the request to the live multi-database backend first, allowing access to custom calibrations, SQLite, and Firestore sync.
  try {
    const response = await fetch(apiUrl, fetchOptions);
    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    console.warn(`[AI Fallback] API request to ${apiUrl} failed. Bypassing to client fallback...`, err);
    if (hasLocalKey) {
      try {
        console.log(`[AI Fallback] Attempting direct client-side execution fallback...`);
        return await clientFallbackFn();
      } catch (fallbackErr) {
        console.error("[AI Fallback] Direct client fallback also failed:", fallbackErr);
      }
    }
    throw err;
  }
}
