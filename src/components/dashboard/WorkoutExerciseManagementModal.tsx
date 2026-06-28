import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Trash2, GripVertical, Sparkles } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { WorkoutRoutine, WorkoutRoutineDay, PlannedExercise } from '../../types';
import { getApiUrl } from '../../utils';
import { getAiHeaders } from '../../services/storeConfigService';
import { tryFetchWithClientFallback, clientGenerateExercise } from '../../services/clientAiFallback';

const DEFAULT_MUSCLE_GROUPS = [
  { id: 'peitoral', label: 'Peitoral' },
  { id: 'costas', label: 'Costas' },
  { id: 'ombros', label: 'Ombros' },
  { id: 'trapezio', label: 'Trapézio' },
  { id: 'posterior_ombros', label: 'Posterior de Ombros' },
  { id: 'biceps', label: 'Bíceps' },
  { id: 'triceps', label: 'Tríceps' },
  { id: 'abdomen', label: 'Abdômen' },
  { id: 'obliquos', label: 'Oblíquos' },
  { id: 'quadriceps', label: 'Quadríceps' },
  { id: 'posterior_coxas', label: 'Posterior de Coxas' },
  { id: 'gluteos', label: 'Glúteos' },
  { id: 'panturrilhas', label: 'Panturrilhas' },
  { id: 'antebracos', label: 'Antebraços' }
];

interface SortableExerciseItemProps {
  plannedEx: PlannedExercise;
  daysList: { id: string; name: string }[];
  currentDayId: string;
  muscleGroupsList: { id: string; label: string }[];
  onUpdateName: (id: string, name: string) => void;
  onUpdateMuscleGroup: (id: string, group: string) => void;
  onMoveToDay: (id: string, fromDayId: string, toDayId: string) => void;
  onDelete: (id: string) => void;
  onGenerateAI: (id: string) => Promise<void>;
}

const SortableExerciseItem: React.FC<SortableExerciseItemProps> = ({
  plannedEx,
  daysList,
  currentDayId,
  muscleGroupsList,
  onUpdateName,
  onUpdateMuscleGroup,
  onMoveToDay,
  onDelete,
  onGenerateAI
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: plannedEx.id });
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 10,
  };

  const handleAiGenerate = async () => {
    setErrorMsg('');
    if (!currentDayId) {
      setErrorMsg('Por favor, selecione Treino/Dia.');
      return;
    }
    if (!plannedEx.exercise.grupoPrincipal) {
      setErrorMsg('Por favor, selecione Grupo Muscular.');
      return;
    }
    setIsGenerating(true);
    try {
      await onGenerateAI(plannedEx.id);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Falha na IA');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={`flex flex-col gap-3 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 transition-all ${
        isDragging ? 'shadow-xl ring-2 ring-cyan-500/50 bg-white dark:bg-slate-900 border-cyan-400' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Reordering Grip */}
        <button 
          {...attributes} 
          {...listeners} 
          type="button"
          className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 cursor-grab active:cursor-grabbing p-1 touch-none shrink-0"
        >
          <GripVertical size={20} />
        </button>

        {/* Inline editable name with AI trigger */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <input 
            type="text"
            value={plannedEx.exercise.nome}
            onChange={(e) => onUpdateName(plannedEx.id, e.target.value)}
            className="w-full bg-transparent border-none p-0 text-sm font-black text-slate-800 dark:text-white focus:ring-0 outline-none"
            placeholder="Nome do Exercício"
          />
          <button
            type="button"
            onClick={handleAiGenerate}
            disabled={isGenerating}
            title="Sugerir exercício com IA"
            className="text-cyan-500 hover:text-cyan-600 disabled:opacity-50 transition-all p-1.5 shrink-0 flex items-center justify-center rounded-xl bg-cyan-50/50 hover:bg-cyan-100/50 dark:bg-cyan-950/20 dark:hover:bg-cyan-900/30 cursor-pointer border-0"
          >
            {isGenerating ? (
              <span className="w-3.5 h-3.5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Sparkles size={14} />
            )}
          </button>
        </div>

        {/* Delete button */}
        <button 
          type="button"
          onClick={() => onDelete(plannedEx.id)}
          className="text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 transition-colors p-1 shrink-0"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {errorMsg && (
        <span className="text-[10px] font-medium text-red-500 dark:text-red-400 leading-none px-1">
          {errorMsg}
        </span>
      )}

      {/* Selectors for moving day & muscle category */}
      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
        {/* Move to other day */}
        <div className="space-y-1">
          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Treino / Dia</label>
          <select 
            value={currentDayId}
            onChange={(e) => onMoveToDay(plannedEx.id, currentDayId, e.target.value)}
            className="w-full bg-slate-100 dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-350 focus:ring-1 focus:ring-cyan-500 focus:bg-white outline-none"
          >
            <option value="">Selecione o Treino...</option>
            {daysList.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        {/* Change muscle category */}
        <div className="space-y-1">
          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Grupo Muscular</label>
          <select 
            value={plannedEx.exercise.grupoPrincipal || ''}
            onChange={(e) => onUpdateMuscleGroup(plannedEx.id, e.target.value)}
            className="w-full bg-slate-100 dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-350 focus:ring-1 focus:ring-cyan-500 focus:bg-white outline-none"
          >
            <option value="">Selecione o Grupo...</option>
            {muscleGroupsList.map(g => (
              <option key={g.id} value={g.id}>{g.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

interface WorkoutExerciseManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRoutine: WorkoutRoutine;
  onSave: (updatedRoutine: WorkoutRoutine) => Promise<void>;
}

export const WorkoutExerciseManagementModal: React.FC<WorkoutExerciseManagementModalProps> = ({
  isOpen,
  onClose,
  initialRoutine,
  onSave
}) => {
  // Local full structure copy
  const [localDays, setLocalDays] = useState<WorkoutRoutineDay[]>([]);
  // Which day is currently active to drag-and-drop / view in detail
  const [activeDayId, setActiveDayId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // Dynamic Muscle Groups State
  const [muscleGroups, setMuscleGroups] = useState<{ id: string; label: string }[]>(() => {
    const saved = localStorage.getItem('sportnutri_custom_muscle_groups');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_MUSCLE_GROUPS;
  });

  // UI States for Muscle Group Manager
  const [showMuscleGroupManager, setShowMuscleGroupManager] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');

  useEffect(() => {
    localStorage.setItem('sportnutri_custom_muscle_groups', JSON.stringify(muscleGroups));
  }, [muscleGroups]);

  const handleAddOrUpdateGroup = () => {
    if (!newGroupName.trim()) return;

    if (editingGroupId) {
      // Update existing
      setMuscleGroups(prev =>
        prev.map(g => (g.id === editingGroupId ? { ...g, label: newGroupName.trim() } : g))
      );
      setEditingGroupId(null);
    } else {
      // Add new
      const newId = 'mg_' + Math.random().toString(36).substr(2, 9);
      setMuscleGroups(prev => [...prev, { id: newId, label: newGroupName.trim() }]);
    }
    setNewGroupName('');
  };

  const handleDeleteGroup = (id: string) => {
    setMuscleGroups(prev => prev.filter(g => g.id !== id));
    if (editingGroupId === id) {
      setEditingGroupId(null);
      setNewGroupName('');
    }
  };

  useEffect(() => {
    if (initialRoutine && initialRoutine.days && initialRoutine.days.length > 0) {
      setLocalDays(JSON.parse(JSON.stringify(initialRoutine.days)));
      setActiveDayId(initialRoutine.days[0].id);
    }
  }, [initialRoutine, isOpen]);

  const activeDay = localDays.find(d => d.id === activeDayId);
  const activeExercises = activeDay ? activeDay.exercises : [];

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

  // Handle local exercises drag and drop within the active day
  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setLocalDays(prevDays => 
        prevDays.map(day => {
          if (day.id === activeDayId) {
            const oldIndex = day.exercises.findIndex(e => e.id === active.id);
            const newIndex = day.exercises.findIndex(e => e.id === over.id);
            return {
              ...day,
              exercises: arrayMove(day.exercises, oldIndex, newIndex)
            };
          }
          return day;
          })
        );
      }
    };
  
    // 1. Update Name inline
    const updateName = (id: string, newNome: string) => {
      setLocalDays(prevDays => 
        prevDays.map(day => ({
          ...day,
          exercises: day.exercises.map(ex => 
            ex.id === id ? { ...ex, exercise: { ...ex.exercise, nome: newNome } } : ex
          )
        }))
      );
    };
  
    // 2. Update Muscle Group
    const updateMuscleGroup = (id: string, group: string) => {
      setLocalDays(prevDays => 
        prevDays.map(day => ({
          ...day,
          exercises: day.exercises.map(ex => 
            ex.id === id ? { ...ex, exercise: { ...ex.exercise, grupoPrincipal: group } } : ex
          )
        }))
      );
    };

  // 3. Move to another day (e.g. from A to B)
  const moveToDay = (id: string, fromDayId: string, toDayId: string) => {
    let exerciseToMove: PlannedExercise | null = null;
    
    // Find and isolate exercise
    localDays.forEach(day => {
      if (day.id === fromDayId) {
        const found = day.exercises.find(e => e.id === id);
        if (found) {
          exerciseToMove = JSON.parse(JSON.stringify(found));
        }
      }
    });

    if (!exerciseToMove) return;

    setLocalDays(prevDays => 
      prevDays.map(day => {
        // Remove from original day
        if (day.id === fromDayId) {
          return {
            ...day,
            exercises: day.exercises.filter(ex => ex.id !== id)
          };
        }
        // Insert into target day
        if (day.id === toDayId) {
          return {
            ...day,
            exercises: [...day.exercises, exerciseToMove!]
          };
        }
        return day;
      })
    );
  };

  // 4. Delete physically from routine
  const deleteExercise = (id: string) => {
    setLocalDays(prevDays => 
      prevDays.map(day => ({
        ...day,
        exercises: day.exercises.filter(ex => ex.id !== id)
      }))
    );
  };

  // 5. Append new customized exercise to current active day list
  const addNewCustomExercise = () => {
    const randomId = 'pl_ex_' + Math.random().toString(36).substr(2, 9);
    const newEx: PlannedExercise = {
      id: randomId,
      exercise: {
        nome: 'Novo Exercício',
        grupoPrincipal: '' as any, // Require user choice or validation first!
        gruposSecundarios: [],
        equipamento: 'pesos_livres',
        nivel: 'iniciante',
        tipo: 'composto'
      },
      series: [
        { carga: 10, reps: 12 },
        { carga: 10, reps: 12 },
        { carga: 10, reps: 12 }
      ],
      reposoSem: 60,
      observacoes: 'Inserido manualmente'
    };

    setLocalDays(prevDays => 
      prevDays.map(day => {
        if (day.id === activeDayId) {
          return {
            ...day,
            exercises: [...day.exercises, newEx]
          };
        }
        return day;
      })
    );
  };

  // Generate Exercise Details via server-side Gemini API
  const generateExerciseAI = async (id: string) => {
    let targetEx: PlannedExercise | null = null;
    let targetDayId = '';
    
    localDays.forEach(day => {
      const found = day.exercises.find(e => e.id === id);
      if (found) {
        targetEx = found;
        targetDayId = day.id;
      }
    });

    if (!targetEx) {
      throw new Error("Exercício não localizado.");
    }

    const { grupoPrincipal } = (targetEx as PlannedExercise).exercise;
    if (!grupoPrincipal) {
      throw new Error("Selecione o Grupo Muscular primeiro.");
    }

    const dayName = localDays.find(d => d.id === targetDayId)?.name || '';
    if (!targetDayId) {
      throw new Error("Selecione o Treino/Dia primeiro.");
    }

    const currentTypedName = (targetEx as PlannedExercise).exercise.nome || '';
    const activeDayObj = localDays.find(d => d.id === targetDayId);
    const existingExercisesNames = activeDayObj
      ? activeDayObj.exercises
          .filter(e => e.id !== id && e.exercise.nome && e.exercise.nome !== 'Novo Exercício')
          .map(e => e.exercise.nome)
      : [];

    const fallbackFn = async () => {
      return await clientGenerateExercise({
        grupoPrincipal,
        activeDayName: dayName,
        existingExercises: existingExercisesNames,
        typedName: currentTypedName !== 'Novo Exercício' ? currentTypedName : ''
      });
    };

    const data = await tryFetchWithClientFallback<any>(
      getApiUrl('/api/ai/generate-exercise'),
      {
        method: 'POST',
        headers: getAiHeaders(),
        body: JSON.stringify({
          grupoPrincipal,
          activeDayName: dayName,
          existingExercises: existingExercisesNames,
          typedName: currentTypedName !== 'Novo Exercício' ? currentTypedName : ''
        })
      },
      fallbackFn
    );
    if (!data || !data.nome) {
      throw new Error('Retorno inválido do processador de IA.');
    }

    setLocalDays(prevDays => 
      prevDays.map(day => {
        if (day.id === targetDayId) {
          return {
            ...day,
            exercises: day.exercises.map(ex => {
              if (ex.id === id) {
                return {
                  ...ex,
                  exercise: {
                    ...ex.exercise,
                    nome: data.nome,
                    grupoPrincipal: data.grupoPrincipal || grupoPrincipal,
                    equipamento: data.equipamento || 'pesos_livres',
                    nivel: data.nivel || 'iniciante',
                    tipo: data.tipo || 'composto'
                  },
                  customTips: data.tips,
                  observacoes: 'Gerado com Nutri-AI ✨'
                };
              }
              return ex;
            })
          };
        }
        return day;
      })
    );
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const updatedRoutine: WorkoutRoutine = {
        ...initialRoutine,
        days: localDays
      };
      await onSave(updatedRoutine);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const daysSelectOptions = localDays.map(d => ({ id: d.id, name: d.name }));

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] p-6 sm:p-8 shadow-2xl relative flex flex-col max-h-[90vh]"
          >
            {/* Close Button */}
            <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300">
              <X size={24} />
            </button>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-1">Gerenciar Exercícios</h2>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <p className="text-xs text-slate-400 dark:text-slate-500">Configure nomes, ordens e mude treinos ou categorias.</p>
              <button
                type="button"
                onClick={() => setShowMuscleGroupManager(true)}
                className="text-[10.5px] font-black uppercase tracking-wider text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-150 dark:border-cyan-900/60 hover:bg-cyan-100/50 hover:text-cyan-700 dark:hover:bg-cyan-950/65 px-3.5 py-1.5 rounded-full transition-all text-center self-start sm:self-center cursor-pointer shadow-sm"
              >
                ⚙️ Grupos Musculares
              </button>
            </div>

            {/* Horizontal Tabs to Select Workout Day */}
            <div className="flex gap-1.5 overflow-x-auto pb-3 mb-4 w-full no-scrollbar">
              {localDays.map(day => (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => setActiveDayId(day.id)}
                  className={`flex-1 flex items-center justify-center pt-3 pb-3.5 px-3 sm:px-5 text-xs font-black uppercase tracking-wider rounded-xl transition-all whitespace-nowrap shrink-0 border leading-normal min-w-[95px] sm:min-w-[125px] ${
                    activeDayId === day.id 
                      ? 'bg-cyan-500 border-cyan-500 text-white shadow-md shadow-cyan-300/30' 
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-500 border-slate-100 dark:border-slate-800'
                  }`}
                >
                  {day.name.split(' - ')[0]}
                </button>
              ))}
            </div>

            {/* Main scrollable exercises list */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3 no-scrollbar min-h-0 py-1">
              {activeExercises.length === 0 ? (
                <div className="py-12 border-2 border-dashed border-slate-150 dark:border-slate-800/80 rounded-[2rem] flex flex-col items-center justify-center text-slate-400">
                  <span className="text-3xl mb-2">🏋️‍♂️</span>
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Nenhum exercício neste treino</span>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Clique para inserir um novo exercício personalizado abaixo.</p>
                </div>
              ) : (
                <DndContext 
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext 
                    items={activeExercises.map(e => e.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {activeExercises.map(plannedEx => (
                      <SortableExerciseItem 
                        key={plannedEx.id} 
                        plannedEx={plannedEx} 
                        daysList={daysSelectOptions}
                        currentDayId={activeDayId}
                        muscleGroupsList={muscleGroups}
                        onUpdateName={updateName}
                        onUpdateMuscleGroup={updateMuscleGroup}
                        onMoveToDay={moveToDay}
                        onDelete={deleteExercise} 
                        onGenerateAI={generateExerciseAI}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}
            </div>

            {/* Bottom action zone */}
            <div className="mt-5 space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800/60 font-sans">
              <button 
                onClick={addNewCustomExercise}
                className="w-full py-3.5 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-500 dark:text-slate-400 font-bold flex items-center justify-center gap-2 hover:border-cyan-400 hover:text-cyan-500 transition-all text-xs"
              >
                <Plus size={18} /> Adicionar Exercício Manual
              </button>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={onClose}
                  className="py-3.5 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 text-slate-600 dark:text-slate-350 font-bold rounded-2xl text-xs transition-all border-0"
                >
                  Cancelar
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={saving}
                  onClick={handleSaveAll}
                  className="py-3.5 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white font-bold rounded-2xl shadow-lg shadow-cyan-300/20 text-xs border-0"
                >
                  {saving ? 'Gravando...' : 'Salvar Alterações'}
                </motion.button>
              </div>
            </div>

            {/* Muscle Group Manager Panel Overlay */}
            <AnimatePresence>
              {showMuscleGroupManager && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 15 }}
                  className="absolute inset-0 bg-white dark:bg-slate-900 z-50 rounded-[2.5rem] p-6 sm:p-8 flex flex-col"
                >
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">Grupos Musculares</h3>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">Crie, edite ou exclua os grupos musculares para seus treinos.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowMuscleGroupManager(false);
                        setEditingGroupId(null);
                        setNewGroupName('');
                      }}
                      className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-350 p-1.5 bg-transparent border-0 cursor-pointer"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Add / Edit Form */}
                  <div className="flex gap-2 mb-4 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <input
                      type="text"
                      placeholder="Nome do grupo (ex: Posterior de Ombros)"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      className="flex-1 min-w-0 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-white focus:ring-1 focus:ring-cyan-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddOrUpdateGroup}
                      className="bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all border-0 shrink-0 cursor-pointer"
                      disabled={!newGroupName.trim()}
                    >
                      {editingGroupId ? 'Salvar' : 'Adicionar'}
                    </button>
                    {editingGroupId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingGroupId(null);
                          setNewGroupName('');
                        }}
                        className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs px-3 py-2 rounded-xl transition-all border-0 shrink-0 cursor-pointer"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>

                  {/* List of Muscle Groups */}
                  <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 pr-1 min-h-0">
                    {muscleGroups.map(group => (
                      <div
                        key={group.id}
                        className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950/45 rounded-2xl border border-slate-100 dark:border-slate-900/60 transition-all hover:bg-slate-100/50 dark:hover:bg-slate-900/40"
                      >
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {group.label}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingGroupId(group.id);
                              setNewGroupName(group.label);
                            }}
                            className="text-[11px] font-bold text-cyan-500 hover:text-cyan-600 bg-transparent border-0 cursor-pointer"
                          >
                            Editar
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => handleDeleteGroup(group.id)}
                            className="text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 p-1 bg-transparent border-0 cursor-pointer transition-colors"
                            title="Excluir grupo muscular"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setShowMuscleGroupManager(false);
                        setEditingGroupId(null);
                        setNewGroupName('');
                      }}
                      className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-2xl text-xs transition-colors border-0 cursor-pointer"
                    >
                      Voltar para Exercícios
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
