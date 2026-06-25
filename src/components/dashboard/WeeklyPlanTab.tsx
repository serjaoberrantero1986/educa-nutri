import React from 'react';
import { motion } from 'motion/react';
import { Utensils, RefreshCw, Info, Activity, Download } from 'lucide-react';
import { DietPlan } from '../../types';
import { formatFoodName } from '../../utils';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';


interface WeeklyPlanTabProps {
  dietPlan: DietPlan | null;
  activePlanDay: string;
  setActivePlanDay: (day: string) => void;
  setStep: (step: number) => void;
  onRegenerate: () => void;
  onRegenerateFood: (day: string, mealIdx: number, foodIdx: number) => void;
  formatMeasure: (amountGrams: number, food: any) => string;
  onPrint?: () => void;
}

const DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

export const WeeklyPlanTab: React.FC<WeeklyPlanTabProps> = ({
  dietPlan,
  activePlanDay,
  setActivePlanDay,
  setStep,
  onRegenerate,
  onRegenerateFood,
  formatMeasure,
  onPrint
}) => {
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const currentDayMeals = dietPlan?.weeklyPlan?.[activePlanDay] || [];
  const mealData = currentDayMeals.map(m => ({
    name: m.name,
    Proteínas: Math.round(m.totalProtein),
    Carboidratos: Math.round(m.totalCarbs),
    Gorduras: Math.round(m.totalFat)
  }));

  const MealMacroTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const protein = payload.find((p: any) => p.name === 'Proteínas')?.value || 0;
      const carbs = payload.find((p: any) => p.name === 'Carboidratos')?.value || 0;
      const fat = payload.find((p: any) => p.name === 'Gorduras')?.value || 0;
      const totalCals = Math.round(protein * 4 + carbs * 4 + fat * 9);
      
      return (
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs text-slate-800 dark:text-white shadow-2xl space-y-2">
          <p className="font-extrabold text-slate-500 dark:text-slate-300 uppercase tracking-widest text-[10px]">
            {payload[0].payload.name}
          </p>
          <div className="space-y-1.5 font-bold">
            <div className="flex items-center justify-between gap-6 text-purple-600 dark:text-purple-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500" /> Proteínas:
              </span>
              <span>{protein}g</span>
            </div>
            <div className="flex items-center justify-between gap-6 text-cyan-600 dark:text-cyan-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-500" /> Carboidratos:
              </span>
              <span>{carbs}g</span>
            </div>
            <div className="flex items-center justify-between gap-6 text-amber-600 dark:text-amber-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Gorduras:
              </span>
              <span>{fat}g</span>
            </div>
          </div>
          <div className="border-t border-slate-100 dark:border-slate-800 pt-2 mt-1.5 flex items-center justify-between text-cyan-600 dark:text-cyan-400 font-extrabold uppercase tracking-wide">
            <span>Calorias Totais:</span>
            <span>{totalCals} kcal</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <section className="space-y-8">
      {dietPlan && (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-2">
              <Activity size={16} /> Composição de Macros por Refeição ({activePlanDay})
            </h3>
            
            <div className="flex items-center gap-4 text-xs font-bold text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                <span>Proteínas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                <span>Carboidratos</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Gorduras</span>
              </div>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mealData}>
                <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} interval={0} stroke={isDark ? "#94a3b8" : "#64748b"} />
                <YAxis hide />
                <Tooltip cursor={{ fill: isDark ? '#1e293b' : '#f8fafc' }} content={<MealMacroTooltip />} />
                <Bar dataKey="Proteínas" stackId="meals_stack" fill="#9333ea" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Carboidratos" stackId="meals_stack" fill="#06b6d4" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Gorduras" stackId="meals_stack" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-100 dark:border-slate-800/50">
            <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-[10px] text-slate-500 leading-relaxed flex-1 w-full">
              <Info size={14} className="shrink-0" />
              <span>A distribuição calórica é otimizada para manter seus níveis de energia estáveis durante todo o dia.</span>
            </div>
            {onPrint && (
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onPrint}
                className="w-full sm:w-auto bg-purple-cyan text-white text-xs font-bold px-6 py-3 rounded-xl shadow-lg shadow-purple-500/20 transition-all flex items-center justify-center gap-2 shrink-0 h-full inline-flex cursor-pointer"
              >
                <Download size={16} /> Baixar Imagem Paisagem
              </motion.button>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3 dark:text-white">
            <Utensils className="text-purple-500" /> <span className="text-gradient font-black">Seu Plano Semanal</span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Dietas diversificadas para cada dia da semana.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex overflow-x-auto py-2 px-1 -my-2 gap-2 no-scrollbar">
            {DAYS.map(day => (
              <motion.button
                key={day}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActivePlanDay(day)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activePlanDay === day 
                    ? 'bg-purple-cyan text-white shadow-md' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {day}
              </motion.button>
            ))}
          </div>

          <motion.button
            whileHover={{ scale: 1.1, rotate: 180 }}
            whileTap={{ scale: 0.9 }}
            onClick={onRegenerate}
            className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-purple-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shrink-0"
            title="Regerar Dieta Completa"
          >
            <RefreshCw size={18} />
          </motion.button>
        </div>
      </div>
      
      {dietPlan ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(dietPlan?.weeklyPlan?.[activePlanDay] || []).map((meal, mIdx) => (
              <motion.div 
                key={`${activePlanDay}-${mIdx}`}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden group"
              >
                <div className="p-6 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                      <Utensils size={20} />
                    </div>
                    <h4 className="font-bold text-slate-700 dark:text-slate-200">{meal.name}</h4>
                  </div>
                  <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/20 px-3 py-1.5 rounded-full">
                    {Math.round(meal.totalCalories)} kcal
                  </span>
                </div>
                <div className="p-6 space-y-5">
                  {(meal.foods || []).map((item, fIdx) => (
                    <div key={fIdx} className="flex items-center justify-between group/item">
                      <div className="flex items-center gap-4">
                        <motion.button 
                          whileHover={{ scale: 1.1, rotate: 180 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => onRegenerateFood(activePlanDay, mIdx, fIdx)}
                          className="w-8 h-8 rounded-full border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400 hover:text-purple-500 hover:border-purple-200 transition-all"
                          title="Alternar Alimento"
                        >
                          <RefreshCw size={14} />
                        </motion.button>
                        <div>
                          <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{item.food ? formatFoodName(item.food.name) : "Alimento desconhecido"}</div>
                          <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                            {item.food && formatMeasure(item.amount, item.food) ? `${formatMeasure(item.amount, item.food)} (${item.amount}g)` : `${item.amount}g`} • {item.food ? Math.round(item.food.calories * item.amount / 100) : 0} kcal
                          </div>
                        </div>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 flex flex-col items-end">
                        <span>P: {item.food ? Math.round(item.food.protein * item.amount / 100) : 0}g</span>
                        <span>C: {item.food ? Math.round(item.food.carbs * item.amount / 100) : 0}g</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-6 py-4 bg-slate-50/30 dark:bg-slate-800/10 flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest border-t border-slate-50 dark:border-slate-800">
                  <span>Macros Totais</span>
                  <div className="flex gap-4">
                    <span className="text-purple-500">P: {Math.round(meal.totalProtein)}g</span>
                    <span className="text-cyan-500">C: {Math.round(meal.totalCarbs)}g</span>
                    <span className="text-amber-500">G: {Math.round(meal.totalFat)}g</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 text-center">
          <Utensils size={48} className="mx-auto text-purple-500 mb-4" />
          <p className="text-slate-500 mb-6 font-medium">Você ainda não gerou um plano. Vá para o Gerador de Dieta para começar.</p>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setStep(1)} 
            className="px-8 py-3 bg-purple-cyan text-white font-bold rounded-2xl shadow-lg"
          >
            Ver Gerador de Dieta
          </motion.button>
        </div>
      )}
    </section>
  );
};
