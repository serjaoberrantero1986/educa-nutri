import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Trash2, Save, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { isFirebaseConfigured } from '../../lib/firebase';

interface Meal {
  id: string;
  name: string;
  icon: string;
}

const MEAL_ICONS = [
  '🍽️', '🍳', '🥣', '🥗', '🍎', '🍌', '🥪', '🥩', '🍗', '🐟', 
  '🍚', '🍝', '🍕', '🍔', '🥑', '🍷', '☕', '🥤', '🍼', '🍰', 
  '🍪', '🔋', '⚡', '🍇', '🍉', '🍊', '🍋', '🍍', '🥭', '🍒', 
  '🍓', '🥝', '🍅', '🥥', '🥦', '🌽', '🥕', '🥔', '🥖', '🧀'
];

interface SortableMealItemProps {
  meal: Meal;
  onUpdate: (id: string, name: string) => void;
  onUpdateIcon: (id: string, icon: string) => void;
  onDelete: (id: string) => void;
}

const SortableMealItem: React.FC<SortableMealItemProps> = ({ meal, onUpdate, onUpdateIcon, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: meal.id });
  const [showIconPicker, setShowIconPicker] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 10,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={`flex flex-col gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 transition-all ${isDragging ? 'shadow-lg ring-2 ring-purple-500/50' : ''}`}
    >
      <div className="flex items-center gap-3">
        {/* Grip Handle for Reordering */}
        <button 
          {...attributes} 
          {...listeners} 
          type="button"
          className="text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing p-1 touch-none shrink-0"
        >
          <GripVertical size={20} />
        </button>

        {/* Clickable Icon Selector */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setShowIconPicker(!showIconPicker)}
            className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-100 dark:border-purple-900/30 flex items-center justify-center text-xl transition-all hover:scale-105 active:scale-95"
            title="Escolher Ícone"
          >
            {meal.icon}
          </button>
        </div>

        <input 
          type="text"
          value={meal.name}
          onChange={(e) => onUpdate(meal.id, e.target.value)}
          className="flex-1 min-w-0 bg-transparent border-none p-0 text-sm font-bold dark:text-white focus:ring-0 outline-none"
        />

        <button 
          type="button"
          onClick={() => onDelete(meal.id)}
          className="text-slate-300 hover:text-red-500 transition-colors p-1 shrink-0"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Popover Emoji Grid Picker */}
      <AnimatePresence>
        {showIconPicker && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden bg-white dark:bg-slate-900 rounded-xl border border-slate-150 dark:border-slate-850 p-2 mt-1 z-30"
          >
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase mb-1.5 px-1 flex justify-between items-center">
              <span>Selecione um ícone</span>
              <button 
                type="button"
                onClick={() => setShowIconPicker(false)}
                className="text-purple-500 hover:text-purple-700 font-extrabold"
              >
                fechar
              </button>
            </div>
            <div className="grid grid-cols-8 gap-1.5 overflow-y-auto max-h-36 no-scrollbar">
              {MEAL_ICONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    onUpdateIcon(meal.id, emoji);
                    setShowIconPicker(false);
                  }}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-all ${meal.icon === emoji ? 'bg-purple-100 dark:bg-purple-900/40 scale-110 ring-1 ring-purple-400' : ''}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface MealManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMeals: Meal[];
  onSave: (meals: Meal[]) => void;
}

export const MealManagementModal: React.FC<MealManagementModalProps> = ({
  isOpen,
  onClose,
  initialMeals,
  onSave
}) => {
  const [meals, setMeals] = useState<Meal[]>(initialMeals);

  useEffect(() => {
    setMeals(initialMeals);
  }, [initialMeals]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      }
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setMeals((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const addMeal = () => {
    const newMeal = { id: Math.random().toString(), name: 'Nova Refeição', icon: '🍽️' };
    setMeals([...meals, newMeal]);
  };

  const updateMeal = (id: string, name: string) => {
    setMeals(meals.map(m => m.id === id ? { ...m, name } : m));
  };

  const updateMealIcon = (id: string, icon: string) => {
    setMeals(meals.map(m => m.id === id ? { ...m, icon } : m));
  };

  const deleteMeal = (id: string) => {
    setMeals(meals.filter(m => m.id !== id));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-6 sm:p-8 shadow-2xl relative"
          >
            <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600">
              <X size={24} />
            </button>

            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Gerenciar Refeições</h2>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext 
                  items={meals.map(m => m.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {meals.map(meal => (
                    <SortableMealItem 
                      key={meal.id} 
                      meal={meal} 
                      onUpdate={updateMeal} 
                      onUpdateIcon={updateMealIcon}
                      onDelete={deleteMeal} 
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>

            <div className="mt-6 space-y-3">
              <button 
                onClick={addMeal}
                className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 font-bold flex items-center justify-center gap-2 hover:border-purple-300 hover:text-purple-500 transition-all"
              >
                <Plus size={20} /> Adicionar Refeição
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  onSave(meals);
                  onClose();
                }}
                className="w-full py-4 bg-purple-cyan text-white font-bold rounded-2xl shadow-lg"
              >
                Salvar Configurações
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
