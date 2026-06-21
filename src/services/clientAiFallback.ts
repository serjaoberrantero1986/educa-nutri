import { getCachedStoreConfig } from "./storeConfigService";
import { FALLBACK_FOODS } from "../utils";

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

      // Length difference penalty (closer lengths are better indicators of proximity)
      const lengthDiff = Math.abs(fallbackNom.length - termNormalized.length);
      score -= lengthDiff * 5;

      return { food: f, score };
    }).filter(item => item.score > 0);

    // Sort descending by score
    scoredMatches.sort((a, b) => b.score - a.score);
    const matchedFood = scoredMatches.length > 0 ? scoredMatches[0].food : null;

    if (matchedFood) {
      console.log(`[Client-AI-Enrichment] Matched AI food "${name}" with client reference "${matchedFood.name}" (${matchedFood.calories} kcal)`);
      return {
        ...item,
        food_name: matchedFood.name.split("(")[0].trim(),
        calories_per_100: matchedFood.calories,
        protein_per_100: matchedFood.protein,
        carbs_per_100: matchedFood.carbs,
        fat_per_100: matchedFood.fat,
        grams_per_unit: matchedFood.grams_per_unit || item.grams_per_unit || 100,
        unit: matchedFood.measure_unit || item.unit || "unidade",
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
}): Promise<any> {
  const { message, history, profile, selectedMealId } = options;
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

  const systemPrompt = `Você é o Nutri-Assistant, um assistente virtual ultra-inteligente, super animado e de conversa extremamente descontraída integrado ao 'SportNutri', um aplicativo de nutrição focado em alta performance desportiva.
O usuário quer registrar, remover ou alterar o consumo dietético dele por meio de conversa livre.
Cada mensagem pode pedir para adicionar um ou mais alimentos, registrar consumo de água, remover itens registrados, etc.

CRÍTICO: Você NUNCA deve usar asteriscos (* ou **) na propriedade "response"! Nenhuma palavra ou frase deve ter asteriscos. NUNCA envie texto em negrito formatado com asteriscos. Use formatação em texto simples e limpo, sem markdown visual de ênfase. Se precisar listar coisas, use quebras de linha simples ou marcadores simples como "•" ou "-". Se desobedecer isso e emitir um único asterisco na resposta, o sistema de chat falhará.

CONTEXTO DO USUÁRIO ATUAL:
- Nome/Username: ${username}
- Gênero/Tratamento adequado: ${genderInfo}
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
2. "added_foods" (array_de_objetos): Alimentos a serem exibidos para confirmação. Cada objeto da lista DEVE possuir obrigatoriamente as seguintes chaves com valores estimados realistas e precisos (baseados nas bases nutricionais como TACO):
   - "meal_type" (string): O nome da refeição (ex: "Café da Manhã", "Almoço", "Lanche da Tarde", "Jantar", "Ceia").
   - "food_name" (string): Nome legível do alimento em português (ex: "Ovo Cozido", "Arroz Branco", "Pão Francês").
   - "amount" (number): Quantidade numérica consumida (ex: 1, 2, 1.5, 120).
   - "unit" (string): Uma das unidades válidas: "gramas", "mililitros", "unidade", "colher de sopa", "fatia", "copo", "colher de arroz", "concha".
   - "grams_per_unit" (number): Peso estimado em gramas de uma unidade da medida indicada (ex: 50 para ovo cozido, 15 para fatia, 50 para pão francês).
   - "calories_per_100" (number): Densidade calórica estimada a cada 100g de alimento (ex: 140 para ovo cozido, 130 para arroz, 250 para hambúrguer).
   - "protein_per_100" (number): Gramas de proteína a cada 100g de alimento.
   - "carbs_per_100" (number): Gramas de carboidrato a cada 100g de alimento.
   - "fat_per_100" (number): Gramas de gordura a cada 100g de alimento.
   - "confidence_explanation" (string): Explicação curta sobre a estimativa.
3. "added_waters" (array_de_objetos): Porções de água com a chave "amount_ml" (number) indicando mililitros.
4. "deleted_foods" (array_de_objetos): Pedidos de exclusão com a chave "food_name" (string).

Instruções para cálculo de macros/alimentos adicionados:
- REQUISITO CRÍTICO DE ESTIMATIVA INTELIGENTE E AUTOMÁTICA (NÃO FAÇA PERGUNTAS DESNECESSÁRIAS):
  Você NUNCA deve fazer perguntas repetitivas ou burocráticas sobre peso em gramas das fatias, mililitros de copos/xícaras ou detalhes exaustivos de modo de preparação (como ovo frito vs cozido vs mexido; pão branco vs integral, etc.). Para isso que o sistema possui inteligência integrada: adote sempre porções padrão saudáveis brasileiras, tome a decisão e monte as estimativas imediatamente! Se o preparo não for dito, assuma a versão mais comum/saudável correspondente (ex: cozido ou grelhado).
  - Exemplos de padrões brasileiros:
    - Ovos: 1 unidade = 50g (Ovo Cozido: ~70 kcal, 6g P, 0.5g C, 5g G; Ovo Frito/Mexido: ~90 kcal, 6g P, 0.5g C, 7g G).
    - Pão de Forma / Integral: 1 fatia = 25g (~62 kcal, 2.5g P, 11g C, 0.8g G).
    - Pão Francês: 1 unidade = 50g (~135 kcal, 4.5g P, 28g C, 1g G).
    - Presunto/Apresuntado/Queijo: 1 fatia = 15g a 20g (ex: presunto/apresuntado a ~20 kcal cada fatia, queijo prato/mussarela a ~60 kcal cada fatia, queijo branco/minas a ~50 kcal cada fatia de 30g).
    - Café com Leite: 1 xícara = 200ml a 240ml (Integral com açúcar: ~120 kcal, 6g P, 14g C, 5g G; Desnatado sem açúcar: ~70 kcal).
- QUANTIDADE E UNIDADE CORRETA:
  O campo "amount" DEVE refletir perfeitamente a quantidade dita ou implícita pelo usuário para cada alimento individualmente (ex: se o usuário diz que comeu "4 fatias", registre amount: 4, unit: "fatia", grams_per_unit: 25. Se disser que bebeu "1 xícara", registre amount: 1, unit: "copo" ou "xícara", grams_per_unit: 240. Se expressar em gramas ou ml diretos como "comi 150g", coloque amount: 150, unit: "gramas", grams_per_unit: 1. NUNCA resuma fatias ou unidades múltiplas colocando amount: 1 e unit: "unidade" de 1g, pois isso quebra o box de revisão do usuário!).
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
    actions: actions
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
    result.foods = result.foods.map((f: any) => enrichFoodWithExactCaloriesAndMacrosClient(f));
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
