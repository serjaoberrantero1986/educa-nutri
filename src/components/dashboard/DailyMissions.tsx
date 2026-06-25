import React from 'react';
import { motion } from 'motion/react';
import { 
  Flame, 
  Trophy, 
  CheckCircle2, 
  Droplets, 
  Dumbbell, 
  Sparkles, 
  Coins, 
  Coffee, 
  Apple, 
  ChefHat, 
  Utensils 
} from 'lucide-react';
import { Profile, FoodLog, ExerciseLog } from '../../types';
import confetti from 'canvas-confetti';

interface DailyMissionsProps {
  profile: Profile | null;
  foodLogs: FoodLog[];
  waterAmount: number;
  waterGoal: number;
  exerciseHistory: ExerciseLog[];
  targetCalories: number;
  totalCalories: number;
  targetProtein: number;
  totalProtein: number;
  targetCarbs: number;
  totalCarbs: number;
  targetFat: number;
  totalFat: number;
  onClaimMission: (missionId: string, rewardXP: number) => Promise<void>;
}

// 1. Templates of missions
const mealTemplates = [
  { id: 'meal_cafe', title: 'Café da Manhã de Campeão', description: 'Registre seu café da manhã no diário de refeições hoje.', type: 'meal', meta: 'cafe', targetValue: 1, rewardXP: 15 },
  { id: 'meal_almoco', title: 'Almoço Nutritivo', description: 'Registre seu almoço completo no diário de refeições hoje.', type: 'meal', meta: 'almoco', targetValue: 1, rewardXP: 15 },
  { id: 'meal_jantar', title: 'Jantar Consistente', description: 'Registre seu jantar saudável no diário de refeições hoje.', type: 'meal', meta: 'jantar', targetValue: 1, rewardXP: 15 },
  { id: 'meal_lanche_tarde', title: 'Lanche Energético', description: 'Registre seu lanche da tarde no diário de refeições hoje.', type: 'meal', meta: 'lanche_tarde', targetValue: 1, rewardXP: 15 },
  { id: 'meal_ceia', title: 'Ceia Regenerativa', description: 'Registre sua ceia leve no diário de refeições hoje.', type: 'meal', meta: 'ceia', targetValue: 1, rewardXP: 15 },
];

const healthTemplates = [
  { id: 'health_water_goal', title: 'Hidratação Suprema', description: 'Bata 100% da sua meta diária de água hoje.', type: 'water', meta: 'water_goal', targetValue: 100, rewardXP: 15 },
  { id: 'health_water_vol', title: 'Foco na Água', description: 'Consuma pelo menos 2000ml de água hoje.', type: 'water', meta: 'water_ml', targetValue: 2000, rewardXP: 15 },
  { id: 'health_protein', title: 'Meta de Proteínas', description: 'Atinja pelo menos 90% da sua meta diária de proteínas hoje.', type: 'macro', meta: 'protein', targetValue: 90, rewardXP: 15 },
  { id: 'health_veg', title: 'Fibra & Vitalidade', description: 'Registre vegetais, saladas ou frutas em alguma refeição hoje.', type: 'meal', meta: 'vegetables', targetValue: 1, rewardXP: 15 },
];

const workoutTemplates = [
  { id: 'workout_log', title: 'Guerreiro de Ferro', description: 'Registre seu treino de hoje no diário de treinos.', type: 'workout', meta: 'workout_log', targetValue: 1, rewardXP: 20 },
  { id: 'workout_calories', title: 'Precisão Calórica', description: 'Consuma de 85% a 105% das suas calorias diárias de meta hoje.', type: 'macro', meta: 'calories', targetValue: 85, rewardXP: 20 },
  { id: 'workout_fat', title: 'Gorduras sob Controle', description: 'Mantenha o consumo de gorduras abaixo ou igual à sua meta diária.', type: 'macro', meta: 'fat_limit', targetValue: 100, rewardXP: 20 },
  { id: 'workout_carbs', title: 'Combustível de Carboidratos', description: 'Atinja pelo menos 80% da sua meta diária de carboidratos hoje.', type: 'macro', meta: 'carbs', targetValue: 80, rewardXP: 20 },
];

// Seed hash function from date string
const getDaySeed = (dateStr: string) => {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = dateStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
};

export const DailyMissions: React.FC<DailyMissionsProps> = ({
  profile,
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
  totalFat,
  onClaimMission,
}) => {
  // Get current date string in local time (YYYY-MM-DD)
  const getTodayStr = () => {
    const local = new Date();
    const offset = local.getTimezoneOffset();
    const localDate = new Date(local.getTime() - offset * 60 * 1000);
    return localDate.toISOString().split('T')[0];
  };

  const todayStr = getTodayStr();
  const seed = getDaySeed(todayStr);

  // Pick deterministic templates for today
  const dailyMealTemplate = mealTemplates[seed % mealTemplates.length];
  const dailyHealthTemplate = healthTemplates[(seed + 1) % healthTemplates.length];
  const dailyWorkoutTemplate = workoutTemplates[(seed + 2) % workoutTemplates.length];

  const currentMissions = [dailyMealTemplate, dailyHealthTemplate, dailyWorkoutTemplate];
  const claimedIds = profile?.daily_missions_today?.date === todayStr 
    ? (profile.daily_missions_today as any).claimed_ids || [] 
    : [];

  // Evaluate current value & completed state dynamically for each template
  const evaluateMission = (m: typeof dailyMealTemplate) => {
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
        // Match specific meal ID
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
        const pct = targetProtein > 0 ? Math.round((totalProtein / targetProtein) * 100) : 0;
        currentValue = pct;
        completed = pct >= m.targetValue;
      } else if (m.meta === 'carbs') {
        const pct = targetCarbs > 0 ? Math.round((totalCarbs / targetCarbs) * 100) : 0;
        currentValue = pct;
        completed = pct >= m.targetValue;
      } else if (m.meta === 'calories') {
        const pct = targetCalories > 0 ? Math.round((totalCalories / targetCalories) * 100) : 0;
        currentValue = pct;
        completed = pct >= 85 && pct <= 105;
      } else if (m.meta === 'fat_limit') {
        currentValue = totalFat;
        completed = totalCalories > 0 && totalFat <= targetFat;
      }
    } else if (m.type === 'workout') {
      // Check if exercise log exists for today
      const hasWorkout = exerciseHistory.some(log => {
        if (!log.loggedAt) return false;
        const logDateStr = log.loggedAt.split('T')[0];
        return logDateStr === todayStr;
      });
      currentValue = hasWorkout ? 1 : 0;
      completed = hasWorkout;
    }

    return { currentValue, completed };
  };

  const handleClaimClick = async (missionId: string, rewardXP: number) => {
    // Trigger confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    await onClaimMission(missionId, rewardXP);
  };

  const getIconForMission = (type: string, meta: string) => {
    if (type === 'meal') {
      if (meta === 'cafe') return <Coffee className="text-amber-500" size={18} />;
      if (meta === 'almoco') return <ChefHat className="text-cyan-500" size={18} />;
      return <Utensils className="text-purple-500" size={18} />;
    }
    if (type === 'water') return <Droplets className="text-blue-500" size={18} />;
    if (type === 'workout') return <Dumbbell className="text-emerald-500" size={18} />;
    return <Sparkles className="text-amber-500" size={18} />;
  };

  const totalCompleted = currentMissions.filter(m => evaluateMission(m).completed).length;

  return (
    <section id="daily-missions-section" className="w-full bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[2.5rem] shadow-xl shadow-purple-500/5 border border-slate-100 dark:border-slate-800 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-2xl">
            <Trophy size={20} className="animate-pulse" />
          </div>
          <div>
            <h3 className="font-sans font-bold text-lg text-slate-800 dark:text-slate-100 leading-none mb-1">
              Missões Diárias
            </h3>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Desafios diários de nutrição e hábitos
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30 px-3 py-1 rounded-full border border-purple-100 dark:border-purple-900/20">
            {totalCompleted} / 3 Feito
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {currentMissions.map((m, idx) => {
          const { currentValue, completed } = evaluateMission(m);
          const isClaimed = claimedIds.includes(m.id);

          // Calculate progress percentage
          let progressPct = 0;
          if (m.type === 'meal' || m.type === 'workout') {
            progressPct = completed ? 100 : 0;
          } else if (m.type === 'water') {
            progressPct = Math.min(100, Math.round((currentValue / m.targetValue) * 100));
          } else if (m.type === 'macro') {
            if (m.meta === 'fat_limit') {
              progressPct = completed ? 100 : 0;
            } else {
              progressPct = Math.min(100, Math.round((currentValue / m.targetValue) * 100));
            }
          }

          return (
            <div 
              key={m.id} 
              id={`mission-card-${m.id}`}
              className={`flex flex-col justify-between p-5 rounded-3xl border transition-all ${
                isClaimed
                  ? 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-800/60 opacity-70'
                  : completed
                    ? 'bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/20 shadow-xs'
                    : 'bg-slate-50/30 dark:bg-slate-800/10 border-slate-100 dark:border-slate-800/40 hover:border-slate-200 dark:hover:border-slate-700/60'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-white dark:bg-slate-800 rounded-xl shadow-xs">
                      {getIconForMission(m.type, m.meta)}
                    </div>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200 line-clamp-1">{m.title}</span>
                  </div>
                  <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 flex items-center gap-0.5 whitespace-nowrap">
                    <Coins size={12} /> {m.rewardXP} NC
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
                        completed ? 'Concluído' : 'Pendente'
                      ) : m.meta === 'fat_limit' ? (
                        completed ? 'Dentro do Limite' : totalCalories === 0 ? 'Sem Registro' : 'Estourou Limite'
                      ) : m.meta === 'calories' ? (
                        `${currentValue}% da meta`
                      ) : (
                        `${Math.round(currentValue)} / ${m.targetValue}${m.meta === 'water_ml' ? 'ml' : m.type === 'macro' ? '%' : ''}`
                      )}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        completed ? 'bg-emerald-500' : 'bg-purple-500'
                      }`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-1">
                {isClaimed ? (
                  <div className="w-full py-2 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-xl text-xs font-extrabold text-center flex items-center justify-center gap-1.5 border border-transparent select-none">
                    <CheckCircle2 size={13} /> Resgatado
                  </div>
                ) : completed ? (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleClaimClick(m.id, m.rewardXP)}
                    className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black shadow-sm shadow-emerald-500/10 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trophy size={13} /> Resgatar +{m.rewardXP} NC
                  </motion.button>
                ) : (
                  <div className="w-full py-2 bg-slate-100/50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-600 rounded-xl text-xs font-extrabold text-center border border-transparent select-none">
                    Falta pouco!
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
