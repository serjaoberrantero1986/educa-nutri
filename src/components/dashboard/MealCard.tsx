import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, ChevronDown, ChevronUp, Trash2, Check, X } from 'lucide-react';
import { FoodLog } from '../../types';
import { formatFoodName } from '../../utils';

interface MealCardProps {
  meal: { id: string; name: string; icon: string };
  mealLogs: FoodLog[];
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onAddFood: (mealId: string) => void;
  onDeleteLog: (id: string) => void;
}

export const MealCard: React.FC<MealCardProps> = ({
  meal,
  mealLogs,
  isExpanded,
  onToggleExpand,
  onAddFood,
  onDeleteLog
}) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const mealCals = mealLogs.reduce((sum, log) => sum + log.calories, 0);

  return (
    <motion.div 
      layout
      className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden"
    >
      <div 
        className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        onClick={() => onToggleExpand(meal.id)}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-2xl shadow-inner">
            {meal.icon}
          </div>
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white">{meal.name}</h4>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {mealLogs.length} {mealLogs.length === 1 ? 'item registrado' : 'itens registrados'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right mr-2">
            <div className="text-sm font-black text-purple-600 dark:text-purple-400">{Math.round(mealCals)} kcal</div>
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              onAddFood(meal.id);
            }}
            className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <Plus size={18} />
          </motion.button>
          <div className="text-slate-300">
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-50 dark:border-slate-800"
          >
            <div className="p-5 space-y-4">
              {mealLogs.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-4 italic">Nenhum alimento registrado nesta refeição.</p>
              ) : (
                <div className="space-y-3">
                  {mealLogs.map(log => (
                    <div key={log.id} className="flex items-center justify-between text-sm">
                      <div className="flex flex-col">
                        <span className="font-bold dark:text-white">{formatFoodName(log.food_name)}</span>
                        <span className="text-[10px] text-slate-400">{log.amount}{log.unit === 'gramas' ? 'g' : ` ${log.unit}`}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-black text-slate-700 dark:text-slate-300">{log.calories} kcal</div>
                          <div className="text-[10px] text-slate-400">P: {log.protein}g • C: {log.carbs}g • G: {log.fat}g</div>
                        </div>
                        {confirmDeleteId === log.id ? (
                          <div 
                            className="flex items-center gap-1 bg-rose-500/10 border border-rose-200/20 px-2 py-0.5 rounded-xl shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="text-[9px] font-black uppercase text-rose-500 mr-1 select-none">Excluir?</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteLog(log.id);
                                setConfirmDeleteId(null);
                              }}
                              className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 p-1 rounded-lg border-0 bg-transparent cursor-pointer transition-all animate-pulse"
                              title="Confirmar exclusão"
                            >
                              <Check size={11} className="stroke-[3]" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDeleteId(null);
                              }}
                              className="text-slate-400 hover:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 p-1 rounded-lg border-0 bg-transparent cursor-pointer transition-all"
                              title="Cancelar"
                            >
                              <X size={11} className="stroke-[3]" />
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteId(log.id);
                            }}
                            className="text-slate-300 hover:text-red-500 transition-colors p-1 cursor-pointer animate-fade-in"
                            title="Excluir Registro"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
