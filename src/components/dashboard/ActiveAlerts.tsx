import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bell, Trophy, Sparkles, Check, Flame, ArrowRight, Lightbulb, Dumbbell, Play } from "lucide-react";
import confetti from "canvas-confetti";

interface ActiveAlertsProps {
  profile: any;
  updateXP: (amount: number) => Promise<void>;
  foodLogs: any[];
  isCompact?: boolean;
  onTriggerPrompt?: (promptText: string) => void;
}

export const ActiveAlerts: React.FC<ActiveAlertsProps> = ({ 
  profile, 
  updateXP, 
  foodLogs,
  isCompact = false,
  onTriggerPrompt
}) => {
  const [completedList, setCompletedList] = useState<string[]>([]);

  useEffect(() => {
    // Load completed challenges for today from localStorage
    try {
      const today = new Date().toDateString();
      const stored = localStorage.getItem(`completed_challenges_${profile?.id || "guest"}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.date === today) {
          setCompletedList(parsed.challenges || []);
        }
      }
    } catch (e) {
      console.error("Error loading completed challenges:", e);
    }
  }, [profile?.id]);

  const handleCompleteChallenge = async (id: string, xpReward: number) => {
    if (completedList.includes(id)) return;

    // Trigger confetti
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.8 }
    });

    // Update localStorage
    const today = new Date().toDateString();
    const newList = [...completedList, id];
    setCompletedList(newList);
    try {
      localStorage.setItem(
        `completed_challenges_${profile?.id || "guest"}`,
        JSON.stringify({ date: today, challenges: newList })
      );
    } catch (e) {
      console.error(e);
    }

    // Award XP/NC
    await updateXP(xpReward);
  };

  const handleTriggerAssistant = (promptText: string) => {
    if (onTriggerPrompt) {
      onTriggerPrompt(promptText);
    } else {
      window.dispatchEvent(new CustomEvent("open-nutri-assistant", { detail: { prompt: promptText } }));
    }
  };

  // Determine current meal reminder based on hour of the day
  const getMealReminder = () => {
    const hour = new Date().getHours();
    
    // Check if food logs already have these meals to make it active/reactive!
    const mealsToday = foodLogs.map(log => (log.meal_type || "").toLowerCase().trim());
    
    if (hour >= 5 && hour < 10) {
      const alreadyLogged = mealsToday.includes("café da manhã") || mealsToday.includes("cafe");
      return {
        id: "meal_cafe",
        type: "meal",
        title: "Lembrete: Café da Manhã",
        description: alreadyLogged 
          ? "Excelente, fera! Vi que você já registrou seu Café da Manhã no diário. Continue focado no anabolismo! ☕🍳"
          : "Fera, já mandou para dentro o seu desjejum? Não esquece de registrar os ovos ou o pão para abastecer os músculos! 🍳☕",
        actionText: alreadyLogged ? "Ver Diário" : "Registrar Café da Manhã",
        prompt: "Quero registrar meu café da manhã hoje",
        logged: alreadyLogged,
        icon: "☕"
      };
    } else if (hour >= 10 && hour < 12) {
      const alreadyLogged = mealsToday.includes("lanche da manhã") || mealsToday.includes("lanche_manha");
      return {
        id: "meal_lanche_manha",
        type: "meal",
        title: "Lembrete: Lanche da Manhã",
        description: alreadyLogged
          ? "Sensacional! Lanche da manhã devidamente catalogado. O metabolismo agradece! 🍎💪"
          : "Hora daquela fruta, shake ou porção de castanhas para manter o metabolismo a todo vapor! 🍎🥜",
        actionText: alreadyLogged ? "Ver Diário" : "Registrar Lanche",
        prompt: "Quero registrar meu lanche da manhã",
        logged: alreadyLogged,
        icon: "🍎"
      };
    } else if (hour >= 12 && hour < 15) {
      const alreadyLogged = mealsToday.includes("almoço") || mealsToday.includes("almoco");
      return {
        id: "meal_almoco",
        type: "meal",
        title: "Lembrete: Almoço",
        description: alreadyLogged
          ? "Almoço na conta! Meta de proteínas do meio-dia garantida com sucesso. 🍗🍲"
          : "Almoço caprichado na mesa? Registre seu arroz, feijão e aquela proteína pesada para o anabolismo! 🍲🍗",
        actionText: alreadyLogged ? "Ver Diário" : "Registrar Almoço",
        prompt: "Quero registrar meu almoço de hoje",
        logged: alreadyLogged,
        icon: "🍲"
      };
    } else if (hour >= 15 && hour < 18) {
      const alreadyLogged = mealsToday.includes("lanche da tarde") || mealsToday.includes("lanche_tarde");
      return {
        id: "meal_lanche_tarde",
        type: "meal",
        title: "Lembrete: Lanche da Tarde",
        description: alreadyLogged
          ? "Lanche da tarde completado! Energia de reserva para o treino garantida! 🥪⚡"
          : "Bateu aquela fome da tarde? Que tal uma aveia com leite ou um scoop de whey gelado? 🥪🥛",
        actionText: alreadyLogged ? "Ver Diário" : "Registrar Lanche da Tarde",
        prompt: "Quero registrar meu lanche da tarde",
        logged: alreadyLogged,
        icon: "🥪"
      };
    } else if (hour >= 18 && hour < 22) {
      const alreadyLogged = mealsToday.includes("jantar");
      return {
        id: "meal_jantar",
        type: "meal",
        title: "Lembrete: Jantar",
        description: alreadyLogged
          ? "Jantar finalizado com maestria! Proteínas noturnas garantidas no diário. 🥗💪"
          : "Chegou a hora de abastecer o corpo para a recuperação noturna. Registre seu jantar saudável! 🥗🥩",
        actionText: alreadyLogged ? "Ver Diário" : "Registrar Jantar",
        prompt: "Quero registrar meu jantar",
        logged: alreadyLogged,
        icon: "🥗"
      };
    } else {
      const alreadyLogged = mealsToday.includes("ceia");
      return {
        id: "meal_ceia",
        type: "meal",
        title: "Lembrete: Ceia",
        description: alreadyLogged
          ? "Ceia registrada! Corpo preparado para a síntese proteica enquanto você dorme. 🥛💤"
          : "Vai mandar aquela ceia leve antes de dormir (abacate, iogurte, whey)? Registre agora! 🥛💤",
        actionText: alreadyLogged ? "Ver Diário" : "Registrar Ceia",
        prompt: "Quero registrar minha ceia",
        logged: alreadyLogged,
        icon: "🥛"
      };
    }
  };

  // Static list of engaging challenges, dynamic curiosities and tips
  const challenges = [
    {
      id: "challenge_squat",
      type: "challenge",
      title: "Desafio de Pernas: Agachamento Livre",
      description: "Faça 3 séries de 15 repetições de agachamento livre corporal agora para estimular suas pernas!",
      xpReward: 30,
      icon: "🏋️‍♂️",
      color: "from-amber-500 to-orange-600"
    },
    {
      id: "challenge_water",
      type: "challenge",
      title: "Desafio de Hidratação Rápida",
      description: "Beba 2 copos grandes de água pura (500ml) agora mesmo para hidratar e lubrificar suas juntas!",
      xpReward: 20,
      icon: "💧",
      color: "from-blue-500 to-indigo-600"
    },
    {
      id: "challenge_stretching",
      type: "challenge",
      title: "Desafio de Mobilidade Corporal",
      description: "Alongue-se por 2 minutos (toque nos pés e estique os braços) para melhorar a flexibilidade!",
      xpReward: 25,
      icon: "🤸‍♂️",
      color: "from-emerald-500 to-teal-600"
    }
  ];

  const tips = [
    {
      id: "tip_oats",
      type: "tip",
      title: "Poder da Aveia",
      description: "A aveia em flocos possui carboidratos de baixo índice glicêmico e fibras solúveis (beta-glucana) que controlam o colesterol e dão saciedade duradoura!",
      icon: "🥣",
      actionText: "Perguntar sobre Aveia",
      prompt: "Quantas calorias tem uma colher de aveia e quais seus benefícios?"
    },
    {
      id: "tip_water",
      type: "tip",
      title: "Metabolismo e Água",
      description: "Beba água gelada! Seu corpo gasta energia para aquecê-la até a temperatura corporal, acelerando sutilmente seu metabolismo por termogênese.",
      icon: "💧",
      actionText: "Perguntar sobre Hidratação",
      prompt: "Qual a importância da água na queima de gordura e ganho de massa?"
    },
    {
      id: "tip_photo",
      type: "tip",
      title: "Facilidade de Foto AI",
      description: "Sabia que pode enviar fotos do seu prato no chat? O Nutri-Assistant identifica os alimentos e calcula os macros para você!",
      icon: "📸",
      actionText: "Testar Foto AI",
      prompt: "Como funciona a análise por foto?"
    }
  ];

  // Rotate a dynamic tip based on the day of the week
  const getDynamicTip = () => {
    const day = new Date().getDay();
    return tips[day % tips.length];
  };

  const mealReminder = getMealReminder();
  const currentTip = getDynamicTip();

  if (isCompact) {
    return (
      <div className="space-y-4">
        {/* Compact Title/Header */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-xl">
              <Bell size={16} className="animate-bounce" />
            </div>
            <h4 className="font-sans font-bold text-sm text-slate-800 dark:text-slate-200">
              Coaching Diário Ativo
            </h4>
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30 px-2.5 py-0.5 rounded-full">
            {completedList.length} feito
          </span>
        </div>

        <div className="space-y-3">
          {/* 1. Meal Reminder Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/60 flex flex-col justify-between space-y-3 shadow-xs">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-lg">{mealReminder.icon}</span>
                <span className="text-xs font-bold text-slate-850 dark:text-slate-200">{mealReminder.title}</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {mealReminder.description}
              </p>
            </div>
            {!mealReminder.logged ? (
              <button
                onClick={() => handleTriggerAssistant(mealReminder.prompt)}
                className="mt-1 w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles size={13} /> {mealReminder.actionText} <ArrowRight size={12} />
              </button>
            ) : (
              <div className="mt-1 w-full py-2 bg-emerald-100 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-extrabold text-center flex items-center justify-center gap-1.5 border border-emerald-200/30">
                <Check size={14} className="stroke-[3]" /> Refeição Registrada!
              </div>
            )}
          </div>

          {/* 2. Exercise Challenge Card */}
          {(() => {
            const activeChallenge = challenges[new Date().getDay() % challenges.length];
            const isCompleted = completedList.includes(activeChallenge.id);

            return (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/60 flex flex-col justify-between space-y-3 shadow-xs">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{activeChallenge.icon}</span>
                    <span className="text-xs font-bold text-slate-850 dark:text-slate-200">{activeChallenge.title}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {activeChallenge.description}
                  </p>
                </div>
                {!isCompleted ? (
                  <button
                    onClick={() => handleCompleteChallenge(activeChallenge.id, activeChallenge.xpReward)}
                    className="mt-1 w-full py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:brightness-110 active:scale-95 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trophy size={13} /> Marcar como feito (+{activeChallenge.xpReward} NC)
                  </button>
                ) : (
                  <div className="mt-1 w-full py-2 bg-emerald-100 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-extrabold text-center flex items-center justify-center gap-1.5 border border-emerald-200/30">
                    <Check size={14} className="stroke-[3]" /> Desafio Concluído!
                  </div>
                )}
              </div>
            );
          })()}

          {/* 3. Curious Tip Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/60 flex flex-col justify-between space-y-3 shadow-xs">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-lg">{currentTip.icon}</span>
                <span className="text-xs font-bold text-slate-850 dark:text-slate-200">{currentTip.title}</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {currentTip.description}
              </p>
            </div>
            <button
              onClick={() => handleTriggerAssistant(currentTip.prompt)}
              className="mt-1 w-full py-2 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold border border-indigo-100 dark:border-indigo-900/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Lightbulb size={13} /> {currentTip.actionText} <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800/80 shadow-md space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-xl">
            <Bell size={18} className="animate-bounce" />
          </div>
          <h3 className="font-sans font-bold text-md text-slate-900 dark:text-white">
            Assistente Ativa: Alertas e Desafios
          </h3>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30 px-2.5 py-1 rounded-full">
          {completedList.length} Concluídos Hoje
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Meal Reminder Card */}
        <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/60 flex flex-col justify-between space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xl">{mealReminder.icon}</span>
              <span className="text-xs font-black text-slate-850 dark:text-slate-200">{mealReminder.title}</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {mealReminder.description}
            </p>
          </div>
          {!mealReminder.logged ? (
            <button
              onClick={() => handleTriggerAssistant(mealReminder.prompt)}
              className="mt-2 w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <Sparkles size={13} /> {mealReminder.actionText} <ArrowRight size={12} />
            </button>
          ) : (
            <div className="mt-2 w-full py-2 bg-emerald-100 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-extrabold text-center flex items-center justify-center gap-1.5 border border-emerald-200/30">
              <Check size={14} className="stroke-[3]" /> Refeição Registrada!
            </div>
          )}
        </div>

        {/* 2. Exercise Challenge Card */}
        {(() => {
          const activeChallenge = challenges[new Date().getDay() % challenges.length];
          const isCompleted = completedList.includes(activeChallenge.id);

          return (
            <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/60 flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{activeChallenge.icon}</span>
                  <span className="text-xs font-black text-slate-850 dark:text-slate-200">{activeChallenge.title}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {activeChallenge.description}
                </p>
              </div>
              {!isCompleted ? (
                <button
                  onClick={() => handleCompleteChallenge(activeChallenge.id, activeChallenge.xpReward)}
                  className="mt-2 w-full py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:brightness-110 active:scale-95 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trophy size={13} /> Já Fiz! (+{activeChallenge.xpReward} NC)
                </button>
              ) : (
                <div className="mt-2 w-full py-2 bg-emerald-100 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-extrabold text-center flex items-center justify-center gap-1.5 border border-emerald-200/30">
                  <Check size={14} className="stroke-[3]" /> Desafio Concluído!
                </div>
              )}
            </div>
          );
        })()}

        {/* 3. Curious Tip Card */}
        <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/60 flex flex-col justify-between space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xl">{currentTip.icon}</span>
              <span className="text-xs font-black text-slate-850 dark:text-slate-200">{currentTip.title}</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {currentTip.description}
            </p>
          </div>
          <button
            onClick={() => handleTriggerAssistant(currentTip.prompt)}
            className="mt-2 w-full py-2 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold border border-indigo-100 dark:border-indigo-900/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Lightbulb size={13} /> {currentTip.actionText} <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};
