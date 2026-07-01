import React, { useState, useRef, useEffect } from "react";
import { Bot, Send, X, Sparkles, RefreshCw, MessageSquare, ArrowRight, Lock, Mic, MicOff, Camera, Image as ImageIcon, Check, Trash2, Pencil, Trophy, Coins, Coffee, ChefHat, Utensils, Droplets, Dumbbell } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getApiUrl, formatFoodName } from "../../utils";
import { db, isFirebaseConfigured } from "../../lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { getAiHeaders } from "../../services/storeConfigService";
import { tryFetchWithClientFallback, clientChatAssistant, clientAnalyzeMeal } from "../../services/clientAiFallback";

const TypingText: React.FC<{ text: string; onComplete?: () => void }> = ({ text, onComplete }) => {
  const [displayedText, setDisplayedText] = useState("");
  const [isDone, setIsDone] = useState(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (isDone) return;
    const cleanText = text.replace(/\*/g, "");
    let index = 0;
    const interval = setInterval(() => {
      if (index < cleanText.length) {
        setDisplayedText(cleanText.substring(0, index + 1));
        index++;
        window.dispatchEvent(new Event("chat-scroll-request"));
      } else {
        clearInterval(interval);
        setIsDone(true);
        if (onCompleteRef.current) onCompleteRef.current();
      }
    }, 15);
    return () => clearInterval(interval);
  }, [text, isDone]);

  if (isDone) {
    return <>{text.replace(/\*/g, "")}</>;
  }
  return <>{displayedText}</>;
};

function getGramsForUnit(unit: string, pendingFood: any): number {
  const normUnit = (unit || "").toLowerCase().trim();
  const foodUnit = (pendingFood.measure_unit || "").toLowerCase().trim();
  
  if (normUnit === "unidade" && (foodUnit === "unidade" || foodUnit.includes("unidade") || foodUnit.includes("filé") || foodUnit.includes("bife") || foodUnit.includes("posta") || foodUnit.includes("lata") || foodUnit.includes("pote") || foodUnit.includes("scoop") || foodUnit.includes("quadrado") || foodUnit.includes("espiga"))) {
    return pendingFood.grams_per_unit || 50;
  }
  
  if (normUnit === "fatia" && foodUnit.includes("fatia")) {
    const val = pendingFood.grams_per_unit || 25;
    if (val > 60 || val === 100) return 25;
    return val;
  }
  
  if ((normUnit === "colher de sopa") && (foodUnit.includes("colher") || foodUnit.includes("servir"))) {
    const val = pendingFood.grams_per_unit || 15;
    if (val > 35 || val === 100) return 15;
    return val;
  }
  
  if (normUnit === "concha" && foodUnit.includes("concha")) {
    return 50;
  }

  if (normUnit === "copo" && (foodUnit.includes("copo") || foodUnit.includes("xícara"))) {
    const val = pendingFood.grams_per_unit || 200;
    if (val > 400 || val === 100) return 200;
    return val;
  }

  switch (normUnit) {
    case "g":
    case "gramas":
    case "ml":
    case "mililitros":
      return 1;
    case "unidade":
      return pendingFood.grams_per_unit || 50;
    case "colher de sopa":
      return 15;
    case "fatia":
      return 25;
    case "copo":
      return 200;
    case "concha":
      return 50;
    default:
      return pendingFood.grams_per_unit || 100;
  }
}

const normalizePendingAction = (act: any): any => {
  if (act.type !== 'ADD_FOOD') return { ...act, checked: act.checked !== false };
  
  let unit = act.unit || 'unidade';
  
  // Normalize unit string to match select keys perfectly
  const norm = unit.toLowerCase().trim();
  if (norm === 'g' || norm === 'gr' || norm === 'grama' || norm === 'gramas') {
    unit = 'gramas';
  } else if (norm === 'ml' || norm === 'mililitros') {
    unit = 'mililitros';
  } else if (norm === 'unidade' || norm === 'unid' || norm === 'unidades') {
    unit = 'unidade';
  } else if (norm === 'fatia' || norm === 'fatias') {
    unit = 'fatia';
  } else if (norm === 'colher de sopa' || norm === 'colher' || norm === 'colher de arroz' || norm === 'colher de servir' || norm === 'colhar de arroz') {
    unit = 'colher de sopa';
  } else if (norm === 'copo' || norm === 'copos' || norm === 'xícara' || norm === 'xicara' || norm === 'xícaras' || norm === 'xicaras') {
    unit = 'copo';
  } else if (norm === 'concha' || norm === 'conchas') {
    unit = 'concha';
  } else {
    // Keep it as is if it matches or default to gramas if is large number (>5)
    if (act.amount > 5) {
      unit = 'gramas';
    } else {
      unit = 'unidade';
    }
  }

  const amount = act.amount !== undefined ? Number(act.amount) : 1;
  const grams_per_unit = act.grams_per_unit !== undefined ? Number(act.grams_per_unit) : 50;
  
  // Calculate total grams
  const standardGrams = getGramsForUnit(unit, { grams_per_unit, measure_unit: unit });
  const totalGrams = amount * standardGrams;
  const factor = totalGrams / 100;

  let calories_per_100 = act.calories_per_100;
  let protein_per_100 = act.protein_per_100;
  let carbs_per_100 = act.carbs_per_100;
  let fat_per_100 = act.fat_per_100;

  // Let's deduce per_100 from absolute totals if per_100 is not present
  if (calories_per_100 === undefined) {
    const actCals = act.calories !== undefined ? Number(act.calories) : 100;
    calories_per_100 = factor > 0 ? Math.round(actCals / factor) : actCals;
  }
  if (protein_per_100 === undefined) {
    const actProt = act.protein !== undefined ? Number(act.protein) : 5;
    protein_per_100 = factor > 0 ? Math.round(actProt / factor) : actProt;
  }
  if (carbs_per_100 === undefined) {
    const actCarbs = act.carbs !== undefined ? Number(act.carbs) : 10;
    carbs_per_100 = factor > 0 ? Math.round(actCarbs / factor) : actCarbs;
  }
  if (fat_per_100 === undefined) {
    const actFat = act.fat !== undefined ? Number(act.fat) : 3;
    fat_per_100 = factor > 0 ? Math.round(actFat / factor) : actFat;
  }

  // Store estimated final absolute ones as well
  const calFinal = Math.round(calories_per_100 * factor);
  const protFinal = Number((protein_per_100 * factor).toFixed(1));
  const carbsFinal = Number((carbs_per_100 * factor).toFixed(1));
  const fatFinal = Number((fat_per_100 * factor).toFixed(1));

  return {
    ...act,
    checked: act.checked !== false,
    amount,
    unit,
    grams_per_unit,
    calories_per_100,
    protein_per_100,
    carbs_per_100,
    fat_per_100,
    calories: calFinal,
    protein: protFinal,
    carbs: carbsFinal,
    fat: fatFinal,
    confidence_explanation: act.confidence_explanation || `Estimado com base em ${amount} ${unit === 'gramas' ? 'g' : unit === 'mililitros' ? 'ml' : unit}.`
  };
};

interface QuickAction {
  label: string;
  action: "link" | "challenge_complete" | "faq_reply";
  value?: any;
  id?: string;
  completed?: boolean;
}

interface Message {
  sender: "user" | "bot";
  text: string;
  timestamp: string;
  actionsEvaluated?: boolean;
  pendingActions?: any[];
  pendingCaloricsAdjustment?: { offset: number; applied: boolean };
  quickActions?: QuickAction[];
  isTypingEffect?: boolean;
  voceSabia?: string | null;
  outreachId?: string;
  outreachType?: string;
}

const getTodayWorkoutReminder = (activeRoutine: any, hasWorkout: boolean) => {
  const currentDayOfWeek = new Date().getDay(); // 0 = Sunday, 1 = Monday...
  const hour = new Date().getHours();

  if (!activeRoutine || !Array.isArray(activeRoutine.days) || activeRoutine.days.length === 0) {
    if (hour >= 12 && !hasWorkout) {
      return {
        id: "workout_setup_tip",
        title: "Lembrete de Treino 🏋️‍♂️💪",
        description: "Fera, que tal montar a sua ficha de treino personalizada hoje para manter o foco e ganhar músculos?",
        prompt: "Como posso montar meu primeiro treino?",
        messageText: "Olá, mestre! Sou seu Nutri-Assistant. 🤖💪\n\nQue tal montar a sua ficha de treino personalizada hoje para manter o foco e ganhar músculos?"
      };
    }
    return null;
  }
  
  const todayRoutineDay = activeRoutine.days.find((d: any) => d.day_of_week === currentDayOfWeek);
  
  if (todayRoutineDay) {
    const exerciseNames = Array.isArray(todayRoutineDay.exercises) 
      ? todayRoutineDay.exercises.slice(0, 3).map((e: any) => e.name).join(", ") 
      : "";
    const exerciseListStr = exerciseNames ? ` com exercícios como: ${exerciseNames}` : "";
    
    // Período da Tarde (Ex: 12:00 às 18:00)
    if (hour >= 12 && hour < 18) {
      if (!hasWorkout) {
        return {
          id: `workout_tarde_todo_${todayRoutineDay.day_of_week}`,
          title: `Dia de Treinar: ${todayRoutineDay.name} ⚡🔥`,
          description: `Olá! Hoje é dia de treinar. Que tal dar uma olhada no seu treino de hoje e se preparar?`,
          prompt: `Quero ver meu treino de hoje`,
          messageText: `Olá, mestre! Sou seu Nutri-Assistant. 🤖💪\n\nHoje é dia de treinar ${todayRoutineDay.name}${exerciseListStr}.\n\nOlá! Hoje é dia de treinar. Que tal dar uma olhada no seu treino de hoje e se preparar?`
        };
      } else {
        return {
          id: `workout_tarde_done_${todayRoutineDay.day_of_week}`,
          title: `Treino Concluído! 🏆🎉`,
          description: `Ótimo treino hoje! Lembre-se de registrar um lanche pós-treino nutritivo para ajudar na sua recuperação.`,
          prompt: `Quero registrar meu lanche da tarde`,
          messageText: `Olá, mestre! Sou seu Nutri-Assistant. 🤖💪\n\nÓtimo treino hoje! Lembre-se de registrar um lanche pós-treino nutritivo para ajudar na sua recuperação.`
        };
      }
    }

    // Período da Noite (Ex: 18:00 às 04:59)
    if (hour >= 18 || hour < 5) {
      if (!hasWorkout) {
        return {
          id: `workout_noite_todo_${todayRoutineDay.day_of_week}`,
          title: `Consistência é Tudo 🏋️‍♂️💪`,
          description: `Ainda dá tempo de realizar o treino de hoje! Vamos juntos manter a consistência?`,
          prompt: `Quero começar meu treino de hoje`,
          messageText: `Olá, mestre! Sou seu Nutri-Assistant. 🤖💪\n\nAinda dá tempo de realizar o treino de hoje! Vamos juntos manter a consistência?`
        };
      }
    }
    
    // Fallback original
    if (!hasWorkout) {
      return {
        id: `workout_${todayRoutineDay.day_of_week}_${todayRoutineDay.name.replace(/\s+/g, "_")}`,
        title: `Lembrete de Treino: ${todayRoutineDay.name} ⚡🔥`,
        description: `Fera, hoje é dia de ${todayRoutineDay.name}${exerciseListStr}. Vista a camisa, prepare sua garrafa d'água e mande ver no treino de hoje! Vamos registrar?`,
        prompt: `Quero ver meu treino de hoje`,
        messageText: `Olá, mestre! Sou seu Nutri-Assistant. 🤖💪\n\nPassando para te dar uma dica de treino importante!\n\nFera, hoje é dia de ${todayRoutineDay.name}${exerciseListStr}. Vista a camisa, prepare sua garrafa d'água e mande ver no treino de hoje! Vamos registrar?`
      };
    }
  } else {
    // Rest day reminder
    if (hour >= 12 && !hasWorkout) {
      return {
        id: "workout_rest_day",
        title: "Dia de Descanso Ativo 🤸‍♂️🧘‍♂️",
        description: "Hoje não há treino planejado em sua ficha. Lembre-se de que o descanso é fundamental para o crescimento muscular! Aproveite para se alongar, caminhar e manter a hidratação em dia.",
        prompt: "Quero fazer um alongamento hoje",
        messageText: "Olá, mestre! Sou seu Nutri-Assistant. 🤖💪\n\nHoje não há treino planejado em sua ficha. Lembre-se de que o descanso é fundamental para o crescimento muscular! Aproveite para se alongar, caminhar e manter a hidratação em dia."
      };
    }
  }
  return null;
};

const getTodayMealReminder = (foodLogs: any[], hasWorkout: boolean) => {
  const hour = new Date().getHours();
  const mealsToday = (foodLogs || []).map(log => (log.meal_type || "").toLowerCase().trim());
  const hasAnyLog = foodLogs.length > 0;
  
  if (hour >= 5 && hour < 10) {
    const alreadyLogged = mealsToday.includes("café da manhã") || mealsToday.includes("cafe");
    if (!alreadyLogged) {
      if (!hasAnyLog) {
        return {
          id: "meal_cafe_morning",
          title: "Bom Dia! 🍳☕",
          description: "Bom dia! Que tal registrar seu café da manhã para começar o dia com o pé direito?",
          prompt: "Quero registrar meu café da manhã hoje",
          messageText: "Olá, mestre! Sou seu Nutri-Assistant. 🤖💪\n\nBom dia! Que tal registrar seu café da manhã para começar o dia com o pé direito?"
        };
      }
      return {
        id: "meal_cafe",
        title: "Lembrete: Café da Manhã 🍳☕",
        description: "Fera, já mandou para dentro o seu desjejum? Não esquece de registrar os ovos ou o pão para abastecer os músculos!",
        prompt: "Quero registrar meu café da manhã hoje",
        messageText: "Olá, mestre! Sou seu Nutri-Assistant. 🤖💪\n\nNotei que ainda não registrou seu café da manhã hoje no diário de refeições.\n\nFera, já mandou para dentro o seu desjejum? Não esquece de registrar os ovos ou o pão para abastecer os músculos!"
      };
    }
  } else if (hour >= 10 && hour < 12) {
    const alreadyLogged = mealsToday.includes("lanche da manhã") || mealsToday.includes("lanche_manha") || mealsToday.includes("lanche manha");
    if (!alreadyLogged) {
      return {
        id: "meal_lanche_manha",
        title: "Lembrete: Lanche da Manhã 🍎🥜",
        description: "Hora daquela fruta, shake ou porção de castanhas para manter o metabolismo a todo vapor!",
        prompt: "Quero registrar meu lanche da manhã",
        messageText: "Olá, mestre! Sou seu Nutri-Assistant. 🤖💪\n\nNotei que ainda não registrou seu lanche da manhã hoje no diário de refeições.\n\nHora daquela fruta, shake ou porção de castanhas para manter o metabolismo a todo vapor!"
      };
    }
  } else if (hour >= 12 && hour < 15) {
    const alreadyLogged = mealsToday.includes("almoço") || mealsToday.includes("almoco");
    if (!alreadyLogged) {
      return {
        id: "meal_almoco",
        title: "Lembrete: Almoço 🍲🍗",
        description: "Almoço caprichado na mesa? Registre seu arroz, feijão e aquela proteína pesada para o anabolismo!",
        prompt: "Quero registrar meu almoço de hoje",
        messageText: "Olá, mestre! Sou seu Nutri-Assistant. 🤖💪\n\nNotei que ainda não registrou seu almoço hoje no diário de refeições.\n\nAlmoço caprichado na mesa? Registre seu arroz, feijão e aquela proteína pesada para o anabolismo!"
      };
    }
  } else if (hour >= 15 && hour < 18) {
    const alreadyLogged = mealsToday.includes("lanche da tarde") || mealsToday.includes("lanche_tarde") || mealsToday.includes("lanche tarde");
    if (!alreadyLogged) {
      return {
        id: "meal_lanche_tarde",
        title: "Lembrete: Lanche da Tarde 🥪🥛",
        description: "Bateu aquela fome da tarde? Que tal uma aveia com leite ou um scoop de whey gelado?",
        prompt: "Quero registrar meu lanche da tarde",
        messageText: "Olá, mestre! Sou seu Nutri-Assistant. 🤖💪\n\nNotei que ainda não registrou seu lanche da tarde hoje no diário de refeições.\n\nBateu aquela fome da tarde? Que tal uma aveia com leite ou um scoop de whey gelado!"
      };
    }
  } else if (hour >= 18 && hour < 22) {
    const alreadyLogged = mealsToday.includes("jantar");
    if (!alreadyLogged) {
      return {
        id: "meal_jantar_noite",
        title: "Lembrete: Jantar 🥗🥩",
        description: "Lembre-se de registrar seu jantar para fechar o balanço de macros de hoje.",
        prompt: "Quero registrar meu jantar",
        messageText: "Olá, mestre! Sou seu Nutri-Assistant. 🤖💪\n\nLembre-se de registrar seu jantar para fechar o balanço de macros de hoje."
      };
    }
  } else {
    const alreadyLogged = mealsToday.includes("ceia");
    if (!alreadyLogged) {
      return {
        id: "meal_ceia",
        title: "Lembrete: Ceia 🥛💤",
        description: "Vai mandar aquela ceia leve antes de dormir (abacate, iogurte, whey)? Registre agora!",
        prompt: "Quero registrar minha ceia",
        messageText: "Olá, mestre! Sou seu Nutri-Assistant. 🤖💪\n\nNotei que ainda não registrou sua ceia hoje no diário de refeições.\n\nVai mandar aquela ceia leve antes de dormir (abacate, iogurte, whey)? Registre agora!"
      };
    }
  }
  return null;
};

const getTodayChallenge = () => {
  const day = new Date().getDay();
  const challenges = [
    {
      id: "challenge_squat",
      title: "Desafio de Pernas: Agachamento Livre 🏋️‍♂️",
      description: "Faça 3 séries de 15 repetições de agachamento livre corporal agora para estimular suas pernas e faturar +30 NC!",
      xpReward: 30,
    },
    {
      id: "challenge_water",
      title: "Desafio de Hidratação Rápida 💧",
      description: "Beba 2 copos grandes de água pura (500ml) agora mesmo para hidratar e lubrificar suas juntas, faturando +20 NC!",
      xpReward: 20,
    },
    {
      id: "challenge_stretching",
      title: "Desafio de Mobilidade Corporal 🤸‍♂️",
      description: "Alongue-se por 2 minutos (toque nos pés e estique os braços) para melhorar a flexibilidade e faturar +25 NC!",
      xpReward: 25,
    }
  ];
  return challenges[day % challenges.length];
};

const getTodayTip = () => {
  const day = new Date().getDay();
  const tips = [
    {
      id: "tip_oats",
      title: "Poder da Aveia 🥣",
      description: "A aveia em flocos possui carboidratos de baixo índice glicêmico e fibras solúveis (beta-glucana) que controlam o colesterol e dão saciedade duradoura!"
    },
    {
      id: "tip_water",
      title: "Metabolismo e Água 💧",
      description: "Beba água gelada! Seu corpo gasta energia para aquecê-la até a temperatura corporal, acelerando sutilmente seu metabolismo por termogênese."
    },
    {
      id: "tip_protein",
      title: "Importância da Proteína 🥩",
      description: "Consumir fontes de proteína de alto valor biológico nas refeições principais ajuda a preservar a massa muscular em fases de deficit calórico e potencializa a hipertrofia!"
    }
  ];
  return tips[day % tips.length];
};

interface NutriAssistantProps {
  user: any;
  profile: any;
  setProfile?: any;
  onExecuteActions: (actions: any[], addedVia?: string) => Promise<void>;
  setActiveTab: (tab: 'dashboard' | 'ranking' | 'profile' | 'weekly' | 'store' | 'admin' | 'evolution') => void;
  selectedMeal?: string | null;
  foodLogs?: any[];
  workoutProfile?: any;
  activeRoutine?: any;
  waterAmount?: number;
  waterGoal?: number;
  exerciseHistory?: any[];
  targetCalories?: number;
  totalCalories?: number;
  targetProtein?: number;
  totalProtein?: number;
  targetCarbs?: number;
  totalCarbs?: number;
  targetFat?: number;
  totalFat?: number;
}

export const NutriAssistant: React.FC<NutriAssistantProps> = ({ 
  user, 
  profile, 
  setProfile,
  onExecuteActions, 
  setActiveTab,
  selectedMeal = null,
  foodLogs = [],
  workoutProfile = null,
  activeRoutine = null,
  waterAmount = 0,
  waterGoal = 2000,
  exerciseHistory = [],
  targetCalories = 2500,
  totalCalories = 0,
  targetProtein = 150,
  totalProtein = 0,
  targetCarbs = 250,
  totalCarbs = 0,
  targetFat = 70,
  totalFat = 0
}) => {
  const isPremiumActive = profile?.premium_access_until 
    ? (profile.premium_access_until === 'unlimited' || new Date(profile.premium_access_until).getTime() > Date.now())
    : false;

  const isAssistantActive = isPremiumActive || 
    (profile?.nutri_assistant_active === true) || 
    (typeof profile?.nutri_assistant_active === 'string' && new Date(profile.nutri_assistant_active).getTime() > Date.now());

  const [isOpen, setIsOpen] = useState(false);
  const [assistantSubTab, setAssistantSubTab] = useState<'conversa' | 'missoes'>('conversa');
  const defaultMeals = [
    { id: 'cafe', name: 'Café da Manhã', icon: '☕' },
    { id: 'lanche_manha', name: 'Lanche da Manhã', icon: '🍎' },
    { id: 'almoco', name: 'Almoço', icon: '🍲' },
    { id: 'lanche_tarde', name: 'Lanche da Tarde', icon: '🥪' },
    { id: 'jantar', name: 'Jantar', icon: '🥗' },
    { id: 'ceia', name: 'Ceia', icon: '🥛' }
  ];
  const userMeals = (profile?.custom_meals && profile.custom_meals.length > 0) ? profile.custom_meals : defaultMeals;
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "bot",
      text: `Olá, mestre! Sou seu Nutri-Assistant AI! 🤖💪\n\nEstou aqui para agilizar seu dia. Pode conversar comigo livremente para gerenciar suas refeições e hidratação. Por exemplo:\n\n"Adicionei 1 maçã e 5 castanhas no meu lanche da tarde"\n"Registra 500ml de água"\n"Remova o ovo cozido do meu almoço"\n\nO que vamos registrar hoje?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);

  // Load conversation history for today
  useEffect(() => {
    const today = new Date().toDateString();
    const userId = profile?.id || "guest";
    try {
      const stored = localStorage.getItem("nutri_messages_today_" + userId);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.date === today && Array.isArray(parsed.messages) && parsed.messages.length > 0) {
          // Clean isTypingEffect on reload so they don't replay typing animation
          const cleanMessages = parsed.messages.map((m: any) => ({
            ...m,
            isTypingEffect: false
          }));
          setMessages(cleanMessages);
          setIsHistoryLoaded(true);
          return;
        }
      }
    } catch (e) {
      console.error("Error loading chat history from localStorage", e);
    }

    // Default message if no storage exists for today
    setMessages([
      {
        sender: "bot",
        text: `Olá, mestre! Sou seu Nutri-Assistant AI! 🤖💪\n\nEstou aqui para agilizar seu dia. Pode conversar comigo livremente para gerenciar suas refeições e hidratação. Por exemplo:\n\n"Adicionei 1 maçã e 5 castanhas no meu lanche da tarde"\n"Registra 500ml de água"\n"Remova o ovo cozido do meu almoço"\n\nO que vamos registrar hoje?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setIsHistoryLoaded(true);
  }, [profile?.id]);

  // Save conversation history for today
  useEffect(() => {
    if (!isHistoryLoaded) return;
    const today = new Date().toDateString();
    const userId = profile?.id || "guest";
    if (messages.length > 0) {
      try {
        const dataToStore = {
          date: today,
          messages: messages.map(m => ({
            ...m,
            isTypingEffect: false // Save all as statically loaded for next time
          }))
        };
        localStorage.setItem("nutri_messages_today_" + userId, JSON.stringify(dataToStore));
      } catch (e) {
        console.error("Error saving chat history to localStorage", e);
      }
    }
  }, [messages, isHistoryLoaded, profile?.id]);

  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);
  const [hasNewOutreachNotification, setHasNewOutreachNotification] = useState(false);
  const [pendingOutreach, setPendingOutreach] = useState<Message | null>(null);

  const handleExecuteQuickAction = async (msgIdx: number, actionIdx: number, action: any) => {
    if (action.action === "link") {
      setActiveTab(action.value);
      setIsOpen(false);
    } else if (action.action === "faq_reply") {
      handleSendMessage(action.value);
    } else if (action.action === "challenge_complete") {
      const challengeId = action.value.id;
      const xpReward = action.value.xp;
      
      const today = new Date().toDateString();
      let completedChallenges: string[] = [];
      try {
        const stored = localStorage.getItem(`completed_challenges_${profile?.id || "guest"}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.date === today) completedChallenges = parsed.challenges || [];
        }
      } catch (e) { console.error(e); }
      
      if (!completedChallenges.includes(challengeId)) {
        completedChallenges.push(challengeId);
        try {
          localStorage.setItem(
            `completed_challenges_${profile?.id || "guest"}`,
            JSON.stringify({ date: today, challenges: completedChallenges })
          );
        } catch (e) { console.error(e); }
        
        await handleUpdateXP(xpReward);
        
        setMessages(prev => prev.map((m, idx) => {
          if (idx === msgIdx && m.quickActions) {
            return {
              ...m,
              quickActions: m.quickActions.map((act, aIdx) => 
                aIdx === actionIdx ? { ...act, completed: true } : act
              )
            };
          }
          return m;
        }));
      }
    }
  };

  const handleUpdateXP = async (amount: number) => {
    if (!profile?.id) return;
    try {
      const finalXP = (profile.xp || 0) + amount;
      const updatedProfile = { ...profile, xp: finalXP };
      setProfile(updatedProfile);
      
      if (isFirebaseConfigured) {
        const profileRef = doc(db, 'profiles', profile.id);
        await updateDoc(profileRef, { xp: finalXP });
      }
    } catch (e) {
      console.error("Error updating XP inside assistant:", e);
    }
  };
  
  // Audio state
  const [isRecording, setIsRecording] = useState(false);
  const [spokenText, setSpokenText] = useState("");
  const [audioError, setAudioError] = useState<string | null>(null);
  const [lastQueryMethod, setLastQueryMethod] = useState<'chat' | 'audio' | 'photo'>('chat');
  const recognitionRef = useRef<any>(null);

  // Photo state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [photoOptionOpen, setPhotoOptionOpen] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Phase 3: Weekly Dynamic TDEE Caloric Self-Correcting Intelligence
  useEffect(() => {
    if (!profile?.weight_history || profile.weight_history.length < 5) return;
    
    // Sort chronological
    const sorted = [...profile.weight_history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const firstWeight = sorted[0].weight;
    const lastWeight = sorted[sorted.length - 1].weight;
    const delta = lastWeight - firstWeight;
    
    if (Math.abs(delta) > 0.3) {
      let recommendationText = "";
      let caloriesOffset = 0;
      
      const goal = profile.user_data?.goal || 'weightloss';
      if (goal === 'weightloss' && delta >= -0.1) {
        recommendationText = "Olá, mestre! Realizei uma análise inteligente do seu peso recente. Detectei uma desaceleração no seu ritmo de queima de gordura corporal. Sugiro calibrarmos sua meta hoje em -150 kcal diárias para restabelecer o deficit ideal.";
        caloriesOffset = -150;
      } else if (goal === 'hypertrophy' && delta <= 0.1) {
        recommendationText = "Olá, mestre! Notei uma estagnação no seu ganho de peso e hipertrofia. Sugiro calibrarmos sua meta hoje em +150 kcal diárias para impulsionar a síntese proteica e ganho de massa magra.";
        caloriesOffset = 150;
      }

      if (recommendationText && caloriesOffset !== 0) {
        setMessages(prev => {
          if (prev.some(m => m.text.includes("desaceleração no seu ritmo") || m.text.includes("estagnação no seu ganho"))) return prev;
          return [
            ...prev,
            {
              sender: "bot",
              text: recommendationText,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              pendingCaloricsAdjustment: { offset: caloriesOffset, applied: false }
            }
          ];
        });
      }
    }
  }, [profile?.weight_history]);

  const handleApplyCaloricAdjustment = async (offset: number, messageIndex: number) => {
    if (!profile) return;
    
    const plan = profile.diet_plan;
    if (!plan) return;

    const currentCalorieTarget = plan.dailyTargets?.calories || 2000;
    const newCalorieTarget = currentCalorieTarget + offset;
    const ratio = newCalorieTarget / currentCalorieTarget;
    
    const updatedWeeklyPlan = { ...plan.weeklyPlan };
    
    for (const day of Object.keys(updatedWeeklyPlan)) {
      updatedWeeklyPlan[day] = updatedWeeklyPlan[day].map((meal: any) => {
        const adjustedCalories = Math.round(meal.totalCalories * ratio);
        const adjustedFoods = meal.foods.map((food: any) => ({
          ...food,
          amountGrams: Math.round(food.amountGrams * ratio)
        }));
        return {
          ...meal,
          totalCalories: adjustedCalories,
          foods: adjustedFoods
        };
      });
    }

    const updatedDietPlan = {
      ...plan,
      dailyTargets: {
        ...plan.dailyTargets,
        calories: newCalorieTarget,
        protein: Math.round((plan.dailyTargets.protein || 150) * ratio),
        carbs: Math.round((plan.dailyTargets.carbs || 200) * ratio),
        fat: Math.round((plan.dailyTargets.fat || 65) * ratio)
      },
      weeklyPlan: updatedWeeklyPlan
    };

    const updatedProfileFields = {
      diet_plan: updatedDietPlan
    };

    try {
      if (user && isFirebaseConfigured) {
        const ref = doc(db, 'profiles', user.uid);
        await updateDoc(ref, updatedProfileFields);
      }
      if (setProfile) {
        setProfile((prev: any) => prev ? { ...prev, ...updatedProfileFields } : null);
      }
      
      setMessages(prev => prev.map((m, idx) => {
        if (idx !== messageIndex) return m;
        return {
          ...m,
          text: m.text + "\n\nAjuste aplicado com sucesso! Suas refeições semanais foram calibradas sutilmente.",
          pendingCaloricsAdjustment: m.pendingCaloricsAdjustment ? { ...m.pendingCaloricsAdjustment, applied: true } : undefined
        };
      }));
    } catch (err) {
      console.error("Erro ao aplicar calibration:", err);
    }
  };

  const handleUpdatePendingAction = (msgIndex: number, actIndex: number, updatedFields: Partial<any>) => {
    setMessages(prev => prev.map((m, idx) => {
      if (idx !== msgIndex) return m;
      const hasActions = m.pendingActions ? [...m.pendingActions] : [];
      if (hasActions[actIndex]) {
        const existing = hasActions[actIndex];
        const merged = { ...existing, ...updatedFields };
        
        if (merged.type === 'ADD_FOOD') {
          const unitGrams = getGramsForUnit(merged.unit, { grams_per_unit: merged.grams_per_unit || 50, measure_unit: merged.unit });
          const totalGrams = (merged.amount || 0) * unitGrams;
          const factor = totalGrams / 100;
          
          merged.calories = Math.round((merged.calories_per_100 || 0) * factor);
          merged.protein = Number(((merged.protein_per_100 || 0) * factor).toFixed(1));
          merged.carbs = Number(((merged.carbs_per_100 || 0) * factor).toFixed(1));
          merged.fat = Number(((merged.fat_per_100 || 0) * factor).toFixed(1));
        }
        
        hasActions[actIndex] = merged;
      }
      return { ...m, pendingActions: hasActions };
    }));
  };

  const handleDeletePendingAction = (msgIndex: number, actIndex: number) => {
    setMessages(prev => prev.map((m, idx) => {
      if (idx !== msgIndex) return m;
      const filtered = m.pendingActions ? m.pendingActions.filter((_, aIdx) => aIdx !== actIndex) : [];
      return { ...m, pendingActions: filtered };
    }));
  };

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  useEffect(() => {
    const handleScrollRequest = () => {
      if (chatEndRef.current) {
        chatEndRef.current.scrollIntoView({ behavior: "auto" });
      }
    };
    window.addEventListener("chat-scroll-request", handleScrollRequest);
    return () => {
      window.removeEventListener("chat-scroll-request", handleScrollRequest);
    };
  }, []);

  // Audio recording handlers
  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Seu navegador não suporta reconhecimento de voz.");
      return;
    }
    
    setIsRecording(true);
    setSpokenText("");
    setAudioError(null);

    try {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'pt-BR';
      
      rec.onresult = (event: any) => {
        let text = "";
        for (let i = 0; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript.trim();
          if (!transcript) continue;
          
          if (text === "") {
            text = transcript;
          } else {
            const cleanText = text.replace(/\s+/g, "").toLowerCase();
            const cleanTranscript = transcript.replace(/\s+/g, "").toLowerCase();
            
            if (cleanTranscript.startsWith(cleanText)) {
              text = transcript;
            } else if (cleanText.includes(cleanTranscript)) {
              // Já está contido, não faz nada
            } else {
              text += " " + transcript;
            }
          }
        }
        
        const combined = text.trim();
        if (combined) {
          setSpokenText(combined);
          setInputMessage(combined);
        }
      };

      rec.onerror = (e: any) => {
        console.error("Speech recognition error:", e);
        if (e.error === 'not-allowed') {
          setAudioError("Microfone bloqueado.");
        }
      };

      rec.start();
      recognitionRef.current = rec;
    } catch (err) {
      console.error("Speech recognition start error:", err);
    }
  };

  const stopListening = (shouldSend = false) => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error(err);
      }
      recognitionRef.current = null;
    }
    setIsRecording(false);
    
    if (shouldSend && spokenText.trim()) {
      handleSendMessage(spokenText.trim(), 'audio');
    }
    setSpokenText("");
  };

  // Image analysis handlers
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoOptionOpen(false);
    setLastQueryMethod('photo');
    
    const userMessageTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: Message = {
      sender: "user",
      text: `📸 Enviando foto para análise de macros: ${file.name}...`,
      timestamp: userMessageTime
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64Data = (reader.result as string).split(',')[1];
        
        const fallbackFn = async () => {
          return await clientAnalyzeMeal({
            image: base64Data,
            mimeType: file.type
          });
        };

        const data = await tryFetchWithClientFallback<{ foods: any[] }>(
          getApiUrl("/api/ai/analyze-meal"),
          {
            method: "POST",
            headers: getAiHeaders(),
            body: JSON.stringify({
              image: base64Data,
              mimeType: file.type
            })
          },
          fallbackFn
        );
        
        if (data.foods && data.foods.length > 0) {
          const hour = new Date().getHours();
          let mealType = "Lanche da Tarde";
          if (hour >= 5 && hour < 10) mealType = "Café da Manhã";
          else if (hour >= 10 && hour < 12) mealType = "Lanche da Manhã";
          else if (hour >= 12 && hour < 15) mealType = "Almoço";
          else if (hour >= 15 && hour < 18.5) mealType = "Lanche da Tarde";
          else if (hour >= 18.5 && hour < 22) mealType = "Jantar";
          else mealType = "Ceia";

          const botMessageTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          let summary = `Parceiro, analisei sua foto e fiz a estimativa de macros para sua refeição no ${mealType}:\n\n`;
          let totalCals = 0;
          let totalProt = 0;
          let totalCarbs = 0;
          let totalFat = 0;

          const actions = data.foods.map((food: any, idx: number) => {
            const grams = food.amount * food.grams_per_unit;
            const calories = Math.round((food.calories_per_100 / 100) * grams);
            const protein = Number(((food.protein_per_100 / 100) * grams).toFixed(1));
            const carbs = Number(((food.carbs_per_100 / 100) * grams).toFixed(1));
            const fat = Number(((food.fat_per_100 / 100) * grams).toFixed(1));

            totalCals += calories;
            totalProt += protein;
            totalCarbs += carbs;
            totalFat += fat;

            summary += `• ${food.food_name}: ${food.amount} ${food.unit} (~${grams}g) -> ${calories} kcal\n`;

            return normalizePendingAction({
              id: `img-meal-${Date.now()}-${idx}`,
              type: "ADD_FOOD",
              meal_type: food.meal_type || mealType,
              food_name: food.food_name,
              amount: food.amount,
              unit: food.unit,
              grams_per_unit: food.grams_per_unit || 50,
              calories_per_100: food.calories_per_100,
              protein_per_100: food.protein_per_100,
              carbs_per_100: food.carbs_per_100,
              fat_per_100: food.fat_per_100,
              confidence_explanation: food.confidence_explanation || `Estimativa nutricional de IA.`
            });
          });

          summary += `\nTotal estimado: 🔥 ${totalCals} kcal | 🍗 ${totalProt.toFixed(1)}g Prot | 🥣 ${totalCarbs.toFixed(1)}g Carb | 🥑 ${totalFat.toFixed(1)}g Gord`;
          summary += `\n\nDeseja adicionar estes itens no seu diário de hoje automaticamente?`;

          const botImageMsg: Message = {
            sender: "bot",
            text: summary.replace(/\*/g, ""),
            timestamp: botMessageTime,
            pendingActions: actions,
            actionsEvaluated: false
          };

          setMessages(prev => [...prev, botImageMsg]);
        } else {
          setMessages(prev => [
            ...prev,
            {
              sender: "bot",
              text: "Não consegui identificar nenhum alimento legível nessa foto, mestre! Tente enviar outra foto ou ditar pela busca livre. 📸",
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]);
        }
      } catch (err) {
        console.error(err);
        setMessages(prev => [
          ...prev,
          {
            sender: "bot",
            text: "Ocorreu um erro ao processar a inteligência de foto, mestre! Pode tentar mais uma vez.",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSendMessage = async (textToSend: string, method: 'chat' | 'audio' = 'chat') => {
    if (!textToSend.trim() || isLoading) return;
    setLastQueryMethod(method);

    const userMessageTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: Message = {
      sender: "user",
      text: textToSend,
      timestamp: userMessageTime
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage("");
    setIsLoading(true);

    try {
      // Build history for context (keep last 6 messages)
      const chatHistory = messages
        .slice(-6)
        .map(m => ({ sender: m.sender, text: m.text }));

      const fallbackFn = async () => {
        return await clientChatAssistant({
          message: textToSend,
          history: chatHistory,
          profile,
          selectedMealId: selectedMeal,
          foodLogs: foodLogs,
          workoutProfile,
          activeRoutine,
          waterAmount,
          waterGoal
        });
      };

      const data = await tryFetchWithClientFallback<{ response: string; actions: any[]; quickActions?: any[]; voceSabia?: string | null }>(
        getApiUrl("/api/ai/chat-assistant"),
        {
          method: "POST",
          headers: getAiHeaders(),
          body: JSON.stringify({
            message: textToSend,
            history: chatHistory,
            profile: profile,
            selectedMealId: selectedMeal,
            foodLogs: foodLogs,
            workoutProfile,
            activeRoutine,
            waterAmount,
            waterGoal
          })
        },
        fallbackFn
      );
      
      const botMessageTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const botMsg: Message = {
        sender: "bot",
        text: (data.response || "Compreendido, mestre!").replace(/\*/g, ""),
        timestamp: botMessageTime,
        pendingActions: data.actions && data.actions.length > 0 ? data.actions.map(normalizePendingAction) : undefined,
        quickActions: data.quickActions && data.quickActions.length > 0 ? data.quickActions : undefined,
        voceSabia: data.voceSabia || undefined,
        actionsEvaluated: false,
        isTypingEffect: true
      };

      setMessages(prev => [...prev, botMsg]);

    } catch (err) {
      console.error("Assistant Error:", err);
      const botMessageTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages(prev => [
        ...prev,
        {
          sender: "bot",
          text: "Ops, campeão! Tive uma pequena oscilação no meu servidor de IA agora, mas não desista! Pode tentar de novo ou registrar diretamente pelas abas de refeições do diário. 🚀",
          timestamp: botMessageTime,
          isTypingEffect: true
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessageRef = useRef(handleSendMessage);
  useEffect(() => {
    handleSendMessageRef.current = handleSendMessage;
  });

  // Proactive chatbot outreach check on load/logs update
  useEffect(() => {
    const today = new Date().toDateString();
    const userId = profile?.id || "guest";
    
    // Avoid spamming: do not show more than one proactive outreach per day
    const lastOutreachDate = localStorage.getItem("last_outreach_shown_date_" + userId);
    if (lastOutreachDate === today) {
      return;
    }
    
    // Load shown reminder IDs for today to avoid repeating the exact same one
    let shownReminderIds: string[] = [];
    try {
      const stored = localStorage.getItem("shown_reminders_today_" + userId);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.date === today) {
          shownReminderIds = parsed.ids || [];
        }
      }
    } catch (e) {
      console.error("Error parsing shown reminders", e);
    }
    
    if (!pendingOutreach) {
      const todayStr = new Date().toISOString().split('T')[0];
      const hasWorkout = (exerciseHistory || []).some(log => {
        if (!log.loggedAt) return false;
        const logDateStr = log.loggedAt.split('T')[0];
        return logDateStr === todayStr;
      });

      // Get the current meal reminder candidate based on time of day
      const mealReminder = getTodayMealReminder(foodLogs, hasWorkout);
      // Get the current workout reminder candidate based on time of day / active routine
      const workoutReminder = getTodayWorkoutReminder(activeRoutine, hasWorkout);
      
      const lastType = localStorage.getItem("last_outreach_type_" + userId) || "meal";
      
      let selectedReminder: any = null;
      let selectedType: "meal" | "workout" | null = null;
      
      // Determine which one to show, interleaving them!
      if (lastType === "meal") {
        // Try workout first, then meal
        if (workoutReminder && !shownReminderIds.includes(workoutReminder.id)) {
          selectedReminder = workoutReminder;
          selectedType = "workout";
        } else if (mealReminder && !shownReminderIds.includes(mealReminder.id)) {
          selectedReminder = mealReminder;
          selectedType = "meal";
        }
      } else {
        // Try meal first, then workout
        if (mealReminder && !shownReminderIds.includes(mealReminder.id)) {
          selectedReminder = mealReminder;
          selectedType = "meal";
        } else if (workoutReminder && !shownReminderIds.includes(workoutReminder.id)) {
          selectedReminder = workoutReminder;
          selectedType = "workout";
        }
      }
      
      if (selectedReminder) {
        const outreachMsg: Message = {
          sender: "bot",
          text: (selectedReminder.messageText || (selectedType === "meal" 
            ? `Olá, mestre! Sou seu Nutri-Assistant. 🤖💪\n\nNotei que ainda não registrou seu ${selectedReminder.title.replace(/Lembrete: /g, "")} hoje no diário de refeições.\n\n${selectedReminder.description}\n\nVamos registrar agora?`
            : `Olá, mestre! Sou seu Nutri-Assistant. 🤖💪\n\nPassando para te dar uma dica de treino importante!\n\n${selectedReminder.description}\n\nQuer começar ou visualizar seu treino agora?`)).replace(/\*/g, ""),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          quickActions: selectedType === "meal" 
            ? [
                { label: "🍲 Registrar Refeição", action: "link", value: "dashboard" },
                { label: "📖 Consultar FAQ", action: "faq_reply", value: "Quais são as perguntas frequentes do app?" }
              ]
            : [
                { label: "🏋️‍♂️ Ver Treino de Hoje", action: "link", value: "workout_dashboard" },
                { label: "🏆 Ver Ranking", action: "link", value: "ranking" }
              ],
          outreachId: selectedReminder.id,
          outreachType: selectedType || undefined
        };
        setPendingOutreach(outreachMsg);
        setHasNewOutreachNotification(true);
        return;
      }
      
      // 2. Try Daily Challenge (if no meal or workout reminder is pending)
      const challenge = getTodayChallenge();
      let completedChallenges: string[] = [];
      try {
        const stored = localStorage.getItem(`completed_challenges_${userId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.date === today) completedChallenges = parsed.challenges || [];
        }
      } catch (e) { console.error(e); }
      
      const isChallengeCompleted = completedChallenges.includes(challenge.id);
      const challengeOutreachId = "challenge_" + challenge.id;
      if (!isChallengeCompleted && !shownReminderIds.includes(challengeOutreachId)) {
        const isWaterChallenge = challenge.id === "challenge_water";
        const outreachMsg: Message = {
          sender: "bot",
          text: `Fala campeão! Trago o desafio de hoje para turbinar sua rotina e faturar umas NutriCoins extras! ⚡🏆\n\n${challenge.title}\n\n${challenge.description}\n\nAceita o desafio?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          quickActions: isWaterChallenge
            ? [
                { label: "🏆 Ver Ranking", action: "link", value: "ranking" }
              ]
            : [
                { label: "🏋️‍♂️ Ir para Treino de Hoje", action: "link", value: "workout_today" },
                { label: "🏆 Ver Ranking", action: "link", value: "ranking" }
              ],
          pendingActions: isWaterChallenge
            ? [
                {
                  type: "ADD_WATER",
                  amount_ml: 500,
                  amount: 500,
                  checked: true
                }
              ]
            : undefined,
          outreachId: challengeOutreachId,
          outreachType: "challenge"
        };
        setPendingOutreach(outreachMsg);
        setHasNewOutreachNotification(true);
        return;
      }
      
      // 3. Fallback to Nutrition Tip
      const tip = getTodayTip();
      const tipOutreachId = "tip_" + tip.id;
      if (!shownReminderIds.includes(tipOutreachId)) {
        const outreachMsg: Message = {
          sender: "bot",
          text: `Fala, fera! Passando para te dar uma dica nutricional de ouro para o seu dia! 💡🍍\n\n${tip.title}\n\n${tip.description}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          quickActions: [
            { label: "🥣 Dicas de Dieta", action: "faq_reply", value: "Me dê dicas para manter a dieta" },
            { label: "🛒 Ir para Loja", action: "link", value: "store" }
          ],
          outreachId: tipOutreachId,
          outreachType: "tip"
        };
        setPendingOutreach(outreachMsg);
        setHasNewOutreachNotification(true);
      }
    }
  }, [profile?.id, foodLogs, pendingOutreach, activeRoutine, exerciseHistory]);

  // Handle human-like typing simulation when drawer is opened with a pending outreach
  useEffect(() => {
    if (isOpen && pendingOutreach) {
      setIsAssistantTyping(true);
      setHasNewOutreachNotification(false);
      const timer = setTimeout(() => {
        setMessages(prev => [...prev, { ...pendingOutreach, isTypingEffect: true }]);
        
        const today = new Date().toDateString();
        const userId = profile?.id || "guest";
        
        // Save to localStorage that we showed this reminder!
        if (pendingOutreach.outreachId) {
          try {
            const stored = localStorage.getItem("shown_reminders_today_" + userId);
            let shownIds: string[] = [];
            if (stored) {
              const parsed = JSON.parse(stored);
              if (parsed.date === today) shownIds = parsed.ids || [];
            }
            if (!shownIds.includes(pendingOutreach.outreachId)) {
              shownIds.push(pendingOutreach.outreachId);
            }
            localStorage.setItem("shown_reminders_today_" + userId, JSON.stringify({ date: today, ids: shownIds }));
          } catch (e) { console.error(e); }
        }
        
        if (pendingOutreach.outreachType) {
          localStorage.setItem("last_outreach_type_" + userId, pendingOutreach.outreachType);
        }
        
        localStorage.setItem("last_outreach_shown_date_" + userId, today);
        setPendingOutreach(null);
        setIsAssistantTyping(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, pendingOutreach, profile?.id]);

  useEffect(() => {
    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent;
      setIsOpen(true);
      if (customEvent.detail?.prompt) {
        setTimeout(() => {
          handleSendMessageRef.current(customEvent.detail.prompt);
        }, 150);
      }
    };
    window.addEventListener("open-nutri-assistant", handleOpen);
    return () => {
      window.removeEventListener("open-nutri-assistant", handleOpen);
    };
  }, []);

  const handleClearChat = () => {
    setMessages([
      {
        sender: "bot",
        text: `Chat reiniciado, parceiro! O que quer atualizar no seu diário hoje? Pode ditar seu lanche ou registrar hidratação. 💧🍎`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isTypingEffect: true
      }
    ]);
  };

  const dailyMissions = React.useMemo(() => {
    const getTodayStr = () => {
      const local = new Date();
      const offset = local.getTimezoneOffset();
      const localDate = new Date(local.getTime() - offset * 60 * 1000);
      return localDate.toISOString().split('T')[0];
    };

    const getDaySeed = (dateStr: string) => {
      let hash = 0;
      for (let i = 0; i < dateStr.length; i++) {
        hash = dateStr.charCodeAt(i) + ((hash << 5) - hash);
      }
      return Math.abs(hash);
    };

    const todayStr = getTodayStr();
    const seed = getDaySeed(todayStr);

    const mealTemplates = [
      { id: 'meal_cafe', title: 'Café da Manhã de Campeão', description: 'Registre seu café da manhã no diário de refeições hoje.', type: 'meal', meta: 'cafe', targetValue: 1, rewardXP: 15, icon: '☕' },
      { id: 'meal_almoco', title: 'Almoço Nutritivo', description: 'Registre seu almoço completo no diário de refeições hoje.', type: 'meal', meta: 'almoco', targetValue: 1, rewardXP: 15, icon: '🍛' },
      { id: 'meal_jantar', title: 'Jantar Consistente', description: 'Registre seu jantar saudável no diário de refeições hoje.', type: 'meal', meta: 'jantar', targetValue: 1, rewardXP: 15, icon: '🥗' },
      { id: 'meal_lanche_tarde', title: 'Lanche Energético', description: 'Registre seu lanche da tarde no diário de refeições hoje.', type: 'meal', meta: 'lanche_tarde', targetValue: 1, rewardXP: 15, icon: '🥪' },
      { id: 'meal_ceia', title: 'Ceia Regenerativa', description: 'Registre sua ceia leve no diário de refeições hoje.', type: 'meal', meta: 'ceia', targetValue: 1, rewardXP: 15, icon: '🥛' },
    ];

    const healthTemplates = [
      { id: 'health_water_goal', title: 'Hidratação Suprema', description: 'Bata 100% da sua meta diária de água hoje.', type: 'water', meta: 'water_goal', targetValue: 100, rewardXP: 15, icon: '💧' },
      { id: 'health_water_vol', title: 'Foco na Água', description: 'Consuma pelo menos 2000ml de água hoje.', type: 'water', meta: 'water_ml', targetValue: 2000, rewardXP: 15, icon: '🥤' },
      { id: 'health_protein', title: 'Meta de Proteínas', description: 'Atinja pelo menos 90% da sua meta diária de proteínas hoje.', type: 'macro', meta: 'protein', targetValue: 90, rewardXP: 15, icon: '🥚' },
      { id: 'health_veg', title: 'Fibra & Vitalidade', description: 'Registre vegetais, saladas ou frutas em alguma refeição hoje.', type: 'meal', meta: 'vegetables', targetValue: 1, rewardXP: 15, icon: '🥗' },
    ];

    const workoutTemplates = [
      { id: 'workout_log', title: 'Guerreiro de Ferro', description: 'Registre seu treino de hoje no diário de treinos.', type: 'workout', meta: 'workout_log', targetValue: 1, rewardXP: 20, icon: '💪' },
      { id: 'workout_calories', title: 'Precisão Calórica', description: 'Consuma de 85% a 105% das suas calorias diárias de meta hoje.', type: 'macro', meta: 'calories', targetValue: 85, rewardXP: 20, icon: '⚡' },
      { id: 'workout_fat', title: 'Gorduras sob Controle', description: 'Mantenha o consumo de gorduras abaixo ou igual à sua meta diária.', type: 'macro', meta: 'fat_limit', targetValue: 100, rewardXP: 20, icon: '🐟' },
      { id: 'workout_carbs', title: 'Combustível de Carboidratos', description: 'Atinja pelo menos 80% da sua meta diária de carboidratos hoje.', type: 'macro', meta: 'carbs', targetValue: 80, rewardXP: 20, icon: '🍠' },
    ];

    const dailyMealTemplate = mealTemplates[seed % mealTemplates.length];
    const dailyHealthTemplate = healthTemplates[(seed + 1) % healthTemplates.length];
    const dailyWorkoutTemplate = workoutTemplates[(seed + 2) % workoutTemplates.length];

    const currentMissions = [dailyMealTemplate, dailyHealthTemplate, dailyWorkoutTemplate];

    return currentMissions.map(m => {
      let currentValue = 0;
      let completed = false;

      if (m.type === 'meal') {
        if (m.meta === 'vegetables') {
          const keywords = [
            'salada', 'alface', 'tomate', 'cenoura', 'brócolis', 'brocolis', 'vegetal', 'legume', 
            'couve', 'rúcula', 'espinafre', 'folhas', 'abobrinha', 'berinjela', 'repolho', 
            'chuchu', 'vagem', 'fruta', 'banana', 'maçã', 'maca', 'morango', 'mamão', 'mamao', 
            'abacaxi', 'uva', 'laranja', 'limão', 'limao', 'melancia', 'melão', 'melao'
          ];
          const hasVeg = foodLogs.some(log => 
            keywords.some(kw => (log.food_name || '').toLowerCase().includes(kw))
          );
          currentValue = hasVeg ? 1 : 0;
          completed = hasVeg;
        } else {
          const hasMeal = foodLogs.some(log => log.meal_type === m.meta);
          currentValue = hasMeal ? 1 : 0;
          completed = hasMeal;
        }
      } else if (m.type === 'water') {
        if (m.meta === 'water_goal') {
          const pct = waterGoal > 0 ? Math.round((waterAmount / waterGoal) * 100) : 0;
          currentValue = pct;
          completed = pct >= 100;
        } else if (m.meta === 'water_ml') {
          currentValue = waterAmount;
          completed = waterAmount >= m.targetValue;
        }
      } else if (m.type === 'macro') {
        if (m.meta === 'protein') {
          const pct = (targetProtein || 150) > 0 ? Math.round(((totalProtein || 0) / (targetProtein || 150)) * 100) : 0;
          currentValue = pct;
          completed = pct >= m.targetValue;
        } else if (m.meta === 'carbs') {
          const pct = (targetCarbs || 250) > 0 ? Math.round(((totalCarbs || 0) / (targetCarbs || 250)) * 100) : 0;
          currentValue = pct;
          completed = pct >= m.targetValue;
        } else if (m.meta === 'calories') {
          const pct = (targetCalories || 2500) > 0 ? Math.round(((totalCalories || 0) / (targetCalories || 2500)) * 100) : 0;
          currentValue = pct;
          completed = pct >= 85 && pct <= 105;
        } else if (m.meta === 'fat_limit') {
          currentValue = totalFat || 0;
          completed = (totalCalories || 0) > 0 && (totalFat || 0) <= (targetFat || 70);
        }
      } else if (m.type === 'workout') {
        const hasWorkout = (exerciseHistory || []).some(log => {
          if (!log.loggedAt) return false;
          const logDateStr = log.loggedAt.split('T')[0];
          return logDateStr === todayStr;
        });
        currentValue = hasWorkout ? 1 : 0;
        completed = hasWorkout;
      }

      return {
        ...m,
        currentValue,
        completed
      };
    });
  }, [
    foodLogs,
    waterAmount,
    waterGoal,
    exerciseHistory,
    targetCalories,
    totalCalories,
    targetProtein,
    totalProtein,
    targetCarbs,
    totalCarbs,
    targetFat,
    totalFat
  ]);

  const hasAlertNotification = React.useMemo(() => {
    return hasNewOutreachNotification || messages.some(m => 
      (m.pendingCaloricsAdjustment && !m.pendingCaloricsAdjustment.applied) || 
      (m.pendingActions && m.pendingActions.length > 0 && !m.actionsEvaluated)
    );
  }, [hasNewOutreachNotification, messages]);

  return (
    <>
      {/* Floating chatbot bubble button */}
      <div className="fixed bottom-24 right-4 z-40 md:bottom-28 md:right-8">
        <motion.button
          id="nutri-assistant-toggle"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className="relative flex items-center justify-center p-4 bg-gradient-to-tr from-purple-600 to-indigo-600 dark:from-purple-500 dark:to-indigo-500 text-white rounded-full shadow-2xl hover:brightness-110 active:brightness-95 transition-all outline-none focus:ring-4 focus:ring-purple-300"
        >
          <Bot size={28} className={hasAlertNotification ? "animate-pulse text-green-300" : ""} />
          {hasAlertNotification && (
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500 border border-white"></span>
            </span>
          )}
        </motion.button>
      </div>

      {/* Floating Chat Sheet Drawer overlay */}
      <AnimatePresence>
        {isOpen && (
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex justify-end transition-all"
            onClick={() => setIsOpen(false)}
          >
            {/* Modal/Drawer Container */}
            <motion.div
              initial={{ opacity: 0, x: 350 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 350 }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md h-full bg-slate-50 dark:bg-slate-950 flex flex-col shadow-2xl relative border-l border-slate-100 dark:border-slate-800"
            >
              {/* Header */}
              <div className="p-4 bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-900/90 dark:to-indigo-900/90 text-white flex items-center justify-between shadow-md">
                <div className="flex items-center gap-3">
                  <div className="relative p-2 bg-white/10 rounded-xl">
                    <Bot size={24} />
                    <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-green-400 border-2 border-purple-600"></span>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm tracking-wide">Nutri-Assistant</h3>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-purple-200">AI Coach Ativo</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Conditionalized Content Based on Unlock Status */}
              {!isAssistantActive ? (
                /* Gorgeous Locked Screen State */
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6 overflow-y-auto">
                  <div className="w-20 h-20 bg-purple-100 dark:bg-purple-950/40 rounded-3xl flex items-center justify-center text-purple-600 dark:text-purple-400 relative shrink-0">
                    <Bot size={40} className="animate-pulse" />
                    <span className="absolute -bottom-1 -right-1 bg-amber-500 text-white p-1.5 rounded-full border-2 border-slate-50 dark:border-slate-950 flex items-center justify-center shadow-lg">
                      <Lock size={12} />
                    </span>
                  </div>

                  <div className="space-y-2 max-w-xs shrink-0">
                    <h4 className="text-lg font-black text-slate-900 dark:text-white">Assistente AI Bloqueado</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Converse livremente com o Nutri-Assistant para ditar e cadastrar suas refeições por texto amigável de forma 100% automatizada!
                    </p>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 text-left space-y-3 w-full shadow-xs shrink-0">
                    <div className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider">Formas de Desbloqueio:</div>
                    
                    <div className="p-3 bg-purple-500/5 dark:bg-purple-450/5 rounded-2xl flex items-start gap-2.5">
                      <span className="text-lg leading-none">🪙</span>
                      <div>
                        <div className="text-xs font-black text-slate-800 dark:text-slate-200">Passe 24h Nutri Assistant AI</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">Acesso total ao chatbot inteligente por 24h consecutivas por 2.000 NC.</div>
                      </div>
                    </div>

                    <div className="p-3 bg-amber-500/5 dark:bg-amber-45/5 rounded-2xl flex items-start gap-2.5">
                      <span className="text-lg leading-none">💫</span>
                      <div>
                        <div className="text-xs font-black text-slate-800 dark:text-slate-200">Plano Premium Ilimitado</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">Combo completo de voz, foto + Nutri-Assistant AI por R$ 19,90/mês.</div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setIsOpen(false);
                      setActiveTab('store');
                    }}
                    className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-105 active:scale-95 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-purple-600/20 cursor-pointer shrink-0"
                  >
                    Ir para o painel de compras
                  </button>
                </div>
              ) : (
                <>
                  {/* Sub-Tabs Selector inside NutriAssistant */}
                  <div className="flex border-b border-slate-150 dark:border-slate-800/85 bg-white dark:bg-slate-900 px-4 py-2 gap-2 shadow-xs shrink-0">
                    <button
                      onClick={() => setAssistantSubTab('conversa')}
                      className={`flex-1 py-1.5 text-center rounded-xl text-xs font-bold transition-all ${
                        assistantSubTab === 'conversa'
                          ? 'bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 font-extrabold'
                          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      Conversa
                    </button>
                    <button
                      onClick={() => setAssistantSubTab('missoes')}
                      className={`flex-1 py-1.5 text-center rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        assistantSubTab === 'missoes'
                          ? 'bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 font-extrabold'
                          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <Trophy size={13} className={assistantSubTab === 'missoes' ? 'text-purple-500' : 'text-slate-400'} />
                      Missões de Hoje
                    </button>
                  </div>

                  {assistantSubTab === 'missoes' ? (
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950">
                      {/* Overall Progress Panel */}
                      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-3xl shadow-sm text-center space-y-2">
                        <div className="flex items-center justify-center gap-2">
                          <Trophy size={18} className="text-amber-500 animate-pulse" />
                          <span className="text-sm font-black text-slate-800 dark:text-slate-100">Progresso do Desafio</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Complete os desafios para garantir o melhor desempenho nos treinos e dieta!
                        </p>
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase px-1 pt-1">
                          <span>Desafios Concluídos</span>
                          <span>{dailyMissions.filter(m => m.completed).length} / 3</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
                            style={{ width: `${(dailyMissions.filter(m => m.completed).length / 3) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Missions Cards List */}
                      <div className="space-y-3">
                        {dailyMissions.map((m) => {
                          let progressPct = 0;
                          if (m.type === 'meal' || m.type === 'workout') {
                            progressPct = m.completed ? 100 : 0;
                          } else if (m.type === 'water') {
                            progressPct = Math.min(100, Math.round((m.currentValue / m.targetValue) * 100));
                          } else if (m.type === 'macro') {
                            if (m.meta === 'fat_limit') {
                              progressPct = m.completed ? 100 : 0;
                            } else {
                              progressPct = Math.min(100, Math.round((m.currentValue / m.targetValue) * 100));
                            }
                          }

                          return (
                            <div
                              key={m.id}
                              className={`p-4 rounded-3xl border transition-all flex flex-col justify-between ${
                                m.completed
                                  ? 'bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/20 shadow-xs'
                                  : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/60'
                              }`}
                            >
                              <div className="space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xl">{m.icon}</span>
                                    <span className={`text-xs font-black ${m.completed ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-800 dark:text-slate-100'}`}>
                                      {m.title}
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-black text-amber-500 flex items-center gap-0.5 shrink-0">
                                    <Coins size={11} /> +{m.rewardXP} NC
                                  </span>
                                </div>

                                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                                  {m.description}
                                </p>

                                {/* Progress visualizer */}
                                <div className="space-y-1.5 pt-1">
                                  <div className="flex items-center justify-between text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase">
                                    <span>Progresso</span>
                                    <span>
                                      {m.type === 'meal' || m.type === 'workout' ? (
                                        m.completed ? 'Concluído' : 'Pendente'
                                      ) : m.meta === 'fat_limit' ? (
                                        m.completed ? 'Dentro do Limite' : totalCalories === 0 ? 'Sem Registro' : 'Estourou Limite'
                                      ) : m.meta === 'calories' ? (
                                        `${m.currentValue}% da meta`
                                      ) : (
                                        `${Math.round(m.currentValue)} / ${m.targetValue}${m.meta === 'water_ml' ? 'ml' : m.type === 'macro' ? '%' : ''}`
                                      )}
                                    </span>
                                  </div>
                                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full transition-all duration-500 ${
                                        m.completed ? 'bg-emerald-500' : 'bg-purple-500'
                                      }`}
                                      style={{ width: `${progressPct}%` }}
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="mt-3.5 flex items-center gap-2">
                                {m.completed ? (
                                  <div className="w-full py-1.5 bg-emerald-500/10 text-emerald-500 rounded-xl text-[10px] font-black text-center flex items-center justify-center gap-1 select-none">
                                    <Check size={11} className="stroke-[3]" /> Missão Cumprida!
                                  </div>
                                ) : (
                                  <div className="w-full py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-450 dark:text-slate-500 rounded-xl text-[10px] font-black text-center select-none border border-transparent">
                                    Pendente no Diário
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Informative Footer */}
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center leading-normal max-w-xs mx-auto py-2">
                        O Nutri-Assistant atualiza seu progresso automaticamente ao varrer seu diário de refeições, água ou treinos. Não é necessário resgatar manualmente!
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Chat Message Lists Area */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-2.5 max-w-[85%] ${msg.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                      >
                        {msg.sender === "bot" && (
                          <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                            <Bot size={18} />
                          </div>
                        )}
                        <div className="space-y-1 w-full">
                          <div
                            className={`p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                              msg.sender === "user"
                                ? "bg-purple-600 text-white rounded-tr-none"
                                : "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-100 dark:border-slate-800/40"
                            }`}
                          >
                            {msg.text ? (
                              msg.isTypingEffect && msg.sender === "bot" ? (
                                <TypingText 
                                  text={msg.text} 
                                  onComplete={() => {
                                    setMessages(prev => {
                                      const next = [...prev];
                                      if (next[index] && next[index].isTypingEffect) {
                                        next[index] = { ...next[index], isTypingEffect: false };
                                      }
                                      return next;
                                    });
                                  }}
                                />
                              ) : (
                                msg.text.replace(/\*/g, "")
                              )
                            ) : (
                              ""
                            )}

                            {msg.sender === "bot" && msg.voceSabia && (
                              <div className="mt-3 p-3 rounded-xl bg-amber-50/75 dark:bg-amber-950/20 border border-amber-200/40 dark:border-amber-900/30 text-xs text-amber-900 dark:text-amber-300">
                                <div className="font-extrabold flex items-center gap-1 mb-1 text-[11px] uppercase tracking-wider text-amber-800 dark:text-amber-400">
                                  <span>💡 Você Sabia?</span>
                                </div>
                                <p className="leading-relaxed font-medium">
                                  {msg.voceSabia.replace(/Você sabia\?\s*💡/gi, "").trim()}
                                </p>
                              </div>
                            )}

                            {msg.quickActions && msg.quickActions.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                                {msg.quickActions.map((action, actionIdx) => {
                                  const isCompleted = action.completed;
                                  return (
                                    <button
                                      key={actionIdx}
                                      type="button"
                                      disabled={isCompleted}
                                      onClick={() => handleExecuteQuickAction(index, actionIdx, action)}
                                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shadow-xs ${
                                        isCompleted
                                          ? "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 cursor-default"
                                          : "bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/30 dark:hover:bg-purple-900/40 text-purple-600 dark:text-purple-400 active:scale-95 cursor-pointer"
                                      }`}
                                    >
                                      {isCompleted && <Check size={12} />}
                                      {action.label}
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {msg.pendingCaloricsAdjustment && (
                              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                                <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Ajuste de Meta Inteligente</span>
                                <button
                                  type="button"
                                  disabled={msg.pendingCaloricsAdjustment.applied}
                                  onClick={() => handleApplyCaloricAdjustment(msg.pendingCaloricsAdjustment!.offset, index)}
                                  className={`w-full py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                                    msg.pendingCaloricsAdjustment.applied
                                      ? 'bg-emerald-500 text-white cursor-default'
                                      : 'bg-purple-600 hover:bg-purple-700 text-white active:scale-95'
                                  }`}
                                >
                                  {msg.pendingCaloricsAdjustment.applied ? (
                                    <>
                                      <Check size={14} /> Ajuste Aplicado
                                    </>
                                  ) : (
                                    <>
                                      Aplicar Calibração de {msg.pendingCaloricsAdjustment.offset > 0 ? `+${msg.pendingCaloricsAdjustment.offset}` : msg.pendingCaloricsAdjustment.offset} kcal/dia
                                    </>
                                  )}
                                </button>
                              </div>
                            )}

                            {/* Pending macros actions from text, voice, or photo analysis */}
                            {msg.pendingActions && msg.pendingActions.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-slate-150/50 dark:border-slate-800/60 space-y-3">
                                <div className="text-[11px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest flex items-center gap-1.5">
                                  <Sparkles size={12} className="text-purple-500 animate-pulse shrink-0" /> 
                                  Conferir e Confirmar Lançamento:
                                </div>
                                
                                <div className="space-y-3">
                                  {msg.pendingActions.map((act, actIdx) => {
                                    if (act.type === "ADD_WATER") {
                                      const ml = act.amount_ml || act.amount || 250;
                                      const isChecked = act.checked !== false;
                                      return (
                                        <div 
                                          key={actIdx} 
                                          className={`p-3 rounded-2xl border transition-all text-xs flex items-center justify-between gap-3 ${
                                            isChecked 
                                              ? 'bg-blue-50/50 dark:bg-blue-950/15 border-blue-200/50 dark:border-blue-900/40' 
                                              : 'bg-slate-50/40 dark:bg-slate-900/20 border-slate-200/30 dark:border-slate-800/20 opacity-60'
                                          }`}
                                        >
                                          <div className="flex items-center gap-2.5 min-w-0">
                                            <input
                                              type="checkbox"
                                              checked={isChecked}
                                              onChange={(e) => handleUpdatePendingAction(index, actIdx, { checked: e.target.checked })}
                                              className="rounded text-blue-600 focus:ring-blue-500 h-4.5 w-4.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer"
                                            />
                                            <span className="text-lg leading-none shrink-0">💧</span>
                                            <div className="min-w-0">
                                              <span className="font-extrabold text-slate-800 dark:text-slate-200 block truncate">
                                                Água
                                              </span>
                                              <span className="text-[9px] text-slate-400 dark:text-slate-500 block">
                                                Diário de Hidratação
                  </span>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2 shrink-0">
                                            <div className="flex items-center bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-850 px-1.5 py-1">
                                              <input
                                                type="number"
                                                value={ml}
                                                onChange={(e) => {
                                                  const val = Math.max(0, parseInt(e.target.value) || 0);
                                                  handleUpdatePendingAction(index, actIdx, { amount_ml: val, amount: val });
                                                }}
                                                className="w-12 text-center font-black text-xs text-blue-600 dark:text-blue-400 bg-transparent border-none p-0 outline-none focus:ring-0"
                                              />
                                              <span className="text-[9px] font-bold text-slate-400 pl-0.5">ml</span>
                                            </div>
                                            <button
                                              onClick={() => handleDeletePendingAction(index, actIdx)}
                                              className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                                            >
                                              <Trash2 size={14} />
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    } else if (act.type === "ADD_FOOD") {
                                      const isChecked = act.checked !== false;
                                      const currentUnit = act.unit || "unidade";
                                      const currentAmount = act.amount !== undefined ? act.amount : 1;
                                      const isEditing = act.isEditing || false;

                                      const unitGrams = getGramsForUnit(currentUnit, { grams_per_unit: act.grams_per_unit || 50, measure_unit: currentUnit });
                                      const amtNum = parseFloat(String(currentAmount)) || 0;
                                       const totalGrams = amtNum * unitGrams;
                                      const factor = totalGrams / 100;
                                      const currentCalories = Math.round((act.calories_per_100 || 100) * factor);

                                      const availableUnits = ['unidade', 'fatia', 'colher de sopa', 'copo', 'concha', 'gramas', 'mililitros'];

                                      return (
                                        <div 
                                          key={actIdx} 
                                          className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-755 space-y-3"
                                        >
                                          <div className="flex items-start gap-2 justify-between">
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                              <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={(e) => handleUpdatePendingAction(index, actIdx, { checked: e.target.checked })}
                                                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300 dark:border-slate-600 dark:bg-slate-705 cursor-pointer accent-purple-600 font-bold shrink-0"
                                              />
                                              {isEditing ? (
                                                <div className="flex flex-col gap-1.5 w-full">
                                                  <input 
                                                    type="text"
                                                    value={act.food_name || act.name || ""}
                                                    onChange={(e) => handleUpdatePendingAction(index, actIdx, { food_name: e.target.value })}
                                                    className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500 min-w-0"
                                                    autoFocus
                                                  />
                                                </div>
                                              ) : (
                                                <div className="flex items-center justify-between gap-1.5 flex-1 min-w-0">
                                                  <span className={`text-xs font-extrabold text-slate-800 dark:text-slate-200 truncate ${!isChecked ? 'line-through text-slate-400' : ''}`}>
                                                    {formatFoodName(act.food_name || act.name || "Alimento")}
                                                  </span>
                                                  <div className="flex items-center gap-0.5 shrink-0">
                                                    {isChecked && (
                                                      <button 
                                                        type="button"
                                                        onClick={() => {
                                                          handleUpdatePendingAction(index, actIdx, { isEditing: true });
                                                        }}
                                                        className="p-1 text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 rounded hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                                                        title="Editar Alimento"
                                                      >
                                                        <Pencil size={11} className="stroke-[2.5]" />
                                                      </button>
                                                    )}
                                                    <button 
                                                      type="button"
                                                      onClick={() => handleDeletePendingAction(index, actIdx)}
                                                      className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                                                      title="Excluir item"
                                                    >
                                                      <Trash2 size={11} className="stroke-[2.5]" />
                                                    </button>
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                            {!isEditing && (
                                              <span className="text-[11px] font-black text-purple-600 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded-lg whitespace-nowrap">
                                                {currentCalories} kcal
                                              </span>
                                            )}
                                            {isEditing && (
                                              <button 
                                                type="button"
                                                onClick={() => handleUpdatePendingAction(index, actIdx, { isEditing: false })}
                                                className="p-1 px-2 text-[10px] bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-lg text-slate-500 dark:text-slate-300 font-bold shrink-0 self-center"
                                              >
                                                Ok
                                              </button>
                                            )}
                                          </div>

                                          {isChecked && (
                                            <div className="space-y-2">
                                              <div className="grid grid-cols-2 gap-2">
                                                <div className="space-y-0.5">
                                                  <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Quant.</label>
                                                  <input 
                                                    type="number"
                                                    step="any"
                                                    value={currentAmount === "" ? "" : currentAmount}
                                                    onChange={(e) => {
                                                      const inputVal = e.target.value;
                                                      if (inputVal === "") {
                                                        handleUpdatePendingAction(index, actIdx, { amount: "" });
                                                      } else {
                                                        const val = parseFloat(inputVal);
                                                        handleUpdatePendingAction(index, actIdx, { amount: isNaN(val) ? "" : val });
                                                      }
                                                    }}
                                                    className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-lg p-1.5 text-xs font-bold dark:text-white"
                                                  />
                                                </div>
                                                <div className="space-y-0.5" style={{ minWidth: '100px' }}>
                                                  <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Unidade</label>
                                                  <select 
                                                    value={currentUnit}
                                                    onChange={(e) => {
                                                      const newUnit = e.target.value;
                                                      const oldUnit = currentUnit;
                                                      let newAmount = currentAmount;
                                                      
                                                      const isContinuous = (u: string) => u === 'gramas' || u === 'mililitros';
                                                      
                                                      if (isContinuous(oldUnit) && !isContinuous(newUnit)) {
                                                        newAmount = 1;
                                                      } else if (!isContinuous(oldUnit) && isContinuous(newUnit)) {
                                                        const standardGrams = getGramsForUnit(oldUnit, { grams_per_unit: act.grams_per_unit || 50, measure_unit: oldUnit });
                                                        newAmount = Math.round(standardGrams * currentAmount) || 100;
                                                      }
                                                      
                                                      handleUpdatePendingAction(index, actIdx, { unit: newUnit, amount: newAmount });
                                                    }}
                                                    className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-lg p-1.5 text-xs font-extrabold dark:text-white cursor-pointer"
                                                  >
                                                    {availableUnits.map(u => <option key={u} value={u}>{u}</option>)}
                                                  </select>
                                                </div>
                                              </div>

                                              <div className="space-y-0.5">
                                                <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Refeição de Destino</label>
                                                <select 
                                                  value={act.meal_type || ''}
                                                  onChange={(e) => {
                                                    handleUpdatePendingAction(index, actIdx, { meal_type: e.target.value });
                                                  }}
                                                  className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-lg p-2 text-xs font-extrabold dark:text-white cursor-pointer"
                                                >
                                                  {userMeals.map((m: any) => (
                                                    <option key={m.id} value={m.name}>
                                                      {m.icon} {m.name}
                                                    </option>
                                                  ))}
                                                </select>
                                              </div>

                                              <div className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed italic bg-slate-50 dark:bg-slate-900/60 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                                                💡 {(act.confidence_explanation || `Estimativa nutricional de IA baseada em ${currentAmount} ${currentUnit}.`).replace(/\*/g, "")}
                                              </div>

                                              <div className="grid grid-cols-3 gap-1 text-[10px] text-center pt-1">
                                                <div className="bg-red-50/50 dark:bg-red-950/10 p-1.5 rounded-lg">
                                                  <div className="text-slate-400 dark:text-slate-500 font-medium">Proteína</div>
                                                  <div className="font-extrabold text-red-600 dark:text-red-400">
                                                    {Math.round((act.protein_per_100 || 0) * factor)}g
                                                  </div>
                                                </div>
                                                <div className="bg-amber-50/50 dark:bg-amber-950/10 p-1.5 rounded-lg">
                                                  <div className="text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap">Carboidrato</div>
                                                  <div className="font-extrabold text-amber-600 dark:text-amber-400">
                                                    {Math.round((act.carbs_per_100 || 0) * factor)}g
                                                  </div>
                                                </div>
                                                <div className="bg-blue-50/50 dark:bg-blue-950/10 p-1.5 rounded-lg">
                                                  <div className="text-slate-400 dark:text-slate-500 font-medium">Gordura</div>
                                                  <div className="font-extrabold text-blue-600 dark:text-blue-400">
                                                    {Math.round((act.fat_per_100 || 0) * factor)}g
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    } else if (act.type === "DELETE_FOOD") {
                                      return (
                                        <div key={actIdx} className="flex items-center justify-between p-3 rounded-2xl bg-red-50/40 dark:bg-red-950/10 border border-red-150/30 dark:border-red-900/20 text-xs">
                                          <div className="flex items-center gap-2.5 min-w-0">
                                            <span className="text-base leading-none shrink-0">🗑️</span>
                                            <div className="min-w-0">
                                              <span className="font-extrabold text-slate-800 dark:text-slate-200 block truncate">
                                                Remover Alimento
                                              </span>
                                              <span className="text-[10px] text-red-600 dark:text-red-400 block truncate max-w-[140px] font-semibold">
                                                {act.food_name}
                                              </span>
                                            </div>
                                          </div>
                                          <button
                                            onClick={() => handleDeletePendingAction(index, actIdx)}
                                            className="p-1 px-2.5 bg-red-100 dark:bg-red-950/35 hover:bg-red-200 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 font-extrabold uppercase rounded-lg text-[9px] tracking-wider transition-colors"
                                            title="Ignorar remoção"
                                          >
                                            Ignorar
                                          </button>
                                        </div>
                                      );
                                    }
                                    return null;
                                  })}
                                </div>

                                {msg.actionsEvaluated ? (
                                  <div className="flex items-center gap-1.5 text-[11px] text-green-600 dark:text-green-400 font-bold bg-green-50/80 dark:bg-green-950/20 p-2.5 rounded-2xl border border-green-200/40">
                                    <Check size={14} className="text-green-500 shrink-0" /> Lançamento realizado com sucesso!
                                  </div>
                                ) : (
                                  <div className="flex gap-2 pt-1">
                                    <button
                                      onClick={async () => {
                                        try {
                                          if (msg.pendingActions) {
                                            const activeActions = msg.pendingActions.filter(a => a.checked !== false);
                                            
                                            const hasInvalidFoodAmount = activeActions.some(a => {
                                              if (a.type === "ADD_FOOD") {
                                                const amtNum = parseFloat(String(a.amount));
                                                return isNaN(amtNum) || amtNum <= 0;
                                              }
                                              return false;
                                            });

                                            if (hasInvalidFoodAmount) {
                                              alert("Por favor, preencha a quantidade de todos os alimentos selecionados com um valor maior que zero.");
                                              return;
                                            }

                                            if (activeActions.length > 0) {
                                              await onExecuteActions(activeActions, lastQueryMethod);
                                              try {
                                                const today = new Date().toDateString();
                                                const challenge = getTodayChallenge();
                                                if (challenge.id === "challenge_water" && activeActions.some(a => a.type === "ADD_WATER")) {
                                                  const userId = profile?.id || "guest";
                                                  let completedChallenges: string[] = [];
                                                  const stored = localStorage.getItem(`completed_challenges_${userId}`);
                                                  if (stored) {
                                                    const parsed = JSON.parse(stored);
                                                    if (parsed.date === today) completedChallenges = parsed.challenges || [];
                                                  }
                                                  if (!completedChallenges.includes(challenge.id)) {
                                                    completedChallenges.push(challenge.id);
                                                    localStorage.setItem(
                                                      `completed_challenges_${userId}`,
                                                      JSON.stringify({ date: today, challenges: completedChallenges })
                                                    );
                                                    await handleUpdateXP(challenge.xpReward);
                                                    alert(`Desafio de Hidratação Completo! Você ganhou +${challenge.xpReward} NC adicionais de bônus! 💧🪙`);
                                                  }
                                                }
                                              } catch (challengeError) {
                                                console.error("Error completing challenge_water on confirm:", challengeError);
                                              }
                                            }
                                            setMessages(prev => prev.map((m, idx) => idx === index ? { ...m, actionsEvaluated: true } : m));
                                            setTimeout(() => {
                                              setIsOpen(false);
                                              setActiveTab('dashboard');
                                            }, 1800);
                                          }
                                        } catch (err) {
                                          console.error("Error executing pending actions:", err);
                                        }
                                      }}
                                      className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 active:scale-95 text-white font-black py-3 rounded-2xl text-[11px] uppercase tracking-widest text-center cursor-pointer flex items-center justify-center gap-1.5 transition-all shadow-md shadow-purple-600/10"
                                    >
                                      <Check size={14} /> {msg.pendingActions && msg.pendingActions.filter(a => a.checked !== false).every(a => a.type === "DELETE_FOOD" || a.type === "REMOVE_FOOD") ? "Excluir Alimentos" : "Adicionar Alimentos"}
                                    </button>
                                    <button
                                      onClick={() => {
                                        setMessages(prev => prev.map((m, idx) => idx === index ? { ...m, pendingActions: undefined } : m));
                                      }}
                                      className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-500 dark:text-slate-400 font-black px-4 py-3 rounded-2xl text-[11px] uppercase tracking-widest cursor-pointer transition-colors"
                                    >
                                      Ignorar
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <span className={`text-[10px] text-slate-400 dark:text-slate-500 block ${msg.sender === "user" ? "text-right" : "text-left"}`}>
                            {msg.timestamp}
                          </span>
                        </div>
                      </motion.div>
                    ))}

                    {isAssistantTyping && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex gap-2.5 max-w-[80%] mr-auto"
                      >
                        <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                          <Bot size={18} />
                        </div>
                        <div className="space-y-1">
                          <div className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/40 rounded-2xl rounded-tl-none flex items-center gap-1.5 shadow-sm">
                            <span className="text-xs text-slate-400 font-medium mr-1">Nutri-Assistant está digitando</span>
                            <div className="flex gap-1 items-center">
                              <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                              <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                              <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {isLoading && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex gap-2.5 max-w-[80%]"
                      >
                        <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 animate-spin">
                          <RefreshCw size={18} />
                        </div>
                        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl rounded-tl-none text-slate-400 text-sm flex items-center gap-2">
                          <span>Analisando solicitação...</span>
                        </div>
                      </motion.div>
                    )}
                    
                    <div ref={chatEndRef} />
                  </div>

                  {/* Informative Missions Checklist under Chat */}
                  <div className="p-3 px-4 bg-slate-100/50 dark:bg-slate-900/50 border-t border-b border-slate-100 dark:border-slate-900/40">
                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block mb-2.5 tracking-wide flex items-center gap-1">
                      <Trophy size={11} className="text-purple-500" /> Missões de Hoje
                    </span>
                    <div className="space-y-2">
                      {dailyMissions.map((m) => (
                        <div
                          key={m.id}
                          className={`flex items-start gap-2.5 p-2 bg-white dark:bg-slate-950 border rounded-xl transition-all ${
                            m.completed
                              ? "border-emerald-100 dark:border-emerald-900/20 bg-emerald-50/10 dark:bg-emerald-950/5 opacity-80"
                              : "border-slate-100 dark:border-slate-850 bg-white dark:bg-slate-950"
                          }`}
                        >
                          {/* Checkbox */}
                          <div className="mt-0.5 shrink-0">
                            {m.completed ? (
                              <div className="h-4.5 w-4.5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[9px]">
                                ✓
                              </div>
                            ) : (
                              <div className="h-4.5 w-4.5 rounded-full border-2 border-slate-200 dark:border-slate-800 bg-transparent" />
                            )}
                          </div>
                          {/* Title & Description */}
                          <div className="flex-1">
                            <span
                              className={`text-xs font-bold block ${
                                m.completed
                                  ? "text-slate-400 dark:text-slate-500 line-through"
                                  : "text-slate-700 dark:text-slate-200"
                              }`}
                            >
                              {m.icon} {m.title}
                            </span>
                            <span className="text-[10px] text-slate-450 dark:text-slate-400 leading-normal block">
                              {m.description}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Audio Status Block */}
                  {isRecording && (
                    <div className="px-4 py-2.5 bg-red-500/5 border-t border-red-500/10 flex items-center justify-between text-xs text-red-500 font-bold">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-red-500 animate-ping"></span>
                        <span className="truncate max-w-[200px]">{spokenText ? `"${spokenText}"` : "Transcrevendo fala..."}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => stopListening(true)}
                        className="bg-red-500 hover:bg-red-655 text-white px-2.5 py-1 rounded-lg font-bold text-[10px] cursor-pointer"
                      >
                        Enviar Áudio
                      </button>
                    </div>
                  )}

                  {/* Input Form Box */}
                  <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (inputMessage.trim()) handleSendMessage(inputMessage);
                      }}
                      className="flex items-center gap-1.5"
                    >
                      {/* Hidden image file uploaders */}
                      <input 
                        type="file" 
                        accept="image/*" 
                        ref={fileInputRef} 
                        onChange={handleImageFileChange} 
                        className="hidden" 
                      />
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment" 
                        ref={cameraInputRef} 
                        onChange={handleImageFileChange} 
                        className="hidden" 
                      />

                      {/* Photo Button */}
                      <button
                        type="button"
                        onClick={() => setPhotoOptionOpen(true)}
                        className="p-2.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-350 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/20 cursor-pointer active:scale-95 transition-all outline-none"
                        title="Enviar Foto Refeição"
                      >
                        <Camera size={18} />
                      </button>

                      {/* Voice Mic Button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (isRecording) {
                            stopListening(false);
                          } else {
                            startListening();
                          }
                        }}
                        className={`p-2.5 rounded-full cursor-pointer active:scale-95 transition-all outline-none ${
                          isRecording 
                            ? "bg-red-500 text-white animate-pulse" 
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-350 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/20"
                        }`}
                        title="Ditar Refeição por Voz"
                      >
                        {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
                      </button>

                      <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        disabled={isLoading}
                        placeholder={isRecording ? "Ouvindo... Fale sua refeição!" : "Ex: Adiciona 400ml de água"}
                        className="flex-1 bg-slate-100 dark:bg-slate-950 px-4 py-2.5 rounded-full text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 border-0 focus:bg-white dark:focus:bg-slate-950 transition outline-none"
                      />
                      <button
                        type="submit"
                        disabled={!inputMessage.trim() || isLoading}
                        className={`p-2.5 rounded-full text-white transition shadow-sm ${
                          inputMessage.trim() && !isLoading
                            ? "bg-purple-600 hover:bg-purple-700 active:scale-95 cursor-pointer"
                            : "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                        }`}
                      >
                        <Send size={18} />
                      </button>
                    </form>
                  </div>

                  {/* Photo Option menu popup inside Drawer container */}
                  <AnimatePresence>
                    {photoOptionOpen && (
                      <div 
                        className="absolute inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 rounded-3xl"
                        onClick={() => setPhotoOptionOpen(false)}
                      >
                        <motion.div 
                          initial={{ scale: 0.95, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.95, opacity: 0 }}
                          className="bg-white dark:bg-slate-900 w-11/12 max-w-xs rounded-[2rem] p-6 shadow-2xl border border-slate-100 dark:border-slate-800 text-center space-y-4"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div>
                            <h3 className="text-md font-black text-slate-900 dark:text-white">Análise por Foto AI</h3>
                            <p className="text-[11px] text-slate-400 mt-1">Carregue ou fotografe seu prato de comida</p>
                          </div>

                          <div className="grid grid-cols-1 gap-2">
                            <button 
                              type="button"
                              onClick={() => {
                                cameraInputRef.current?.click();
                                setPhotoOptionOpen(false);
                              }}
                              className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/20 text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold transition-all text-left text-xs cursor-pointer"
                            >
                              <span className="p-1.5 bg-white dark:bg-slate-700 rounded-xl shadow-sm text-purple-500">
                                <Camera size={16} />
                              </span>
                              Tirar Foto com a Câmera
                            </button>

                            <button 
                              type="button"
                              onClick={() => {
                                fileInputRef.current?.click();
                                setPhotoOptionOpen(false);
                              }}
                              className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/20 text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold transition-all text-left text-xs cursor-pointer"
                            >
                              <span className="p-1.5 bg-white dark:bg-slate-700 rounded-xl shadow-sm text-purple-500">
                                <ImageIcon size={16} />
                              </span>
                              Escolher da Galeria
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => setPhotoOptionOpen(false)}
                            className="w-full text-xs font-bold text-slate-400 hover:text-slate-650 cursor-pointer pt-1"
                          >
                            Voltar
                          </button>
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>
                    </>
                  )}
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
