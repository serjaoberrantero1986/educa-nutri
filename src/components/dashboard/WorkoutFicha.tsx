import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sliders, 
  Dumbbell, 
  Sparkles, 
  Check, 
  User, 
  Activity, 
  Award, 
  Zap, 
  Ban, 
  HelpCircle,
  Play,
  RotateCcw,
  Pencil
} from "lucide-react";
import { Profile, UserData, UserWorkoutProfile, WorkoutRoutine } from "../../types";
import { WorkoutExerciseManagementModal } from "./WorkoutExerciseManagementModal";

interface WorkoutFichaProps {
  user: any;
  profile: Profile | null;
  userData: UserData;
  workoutProfile: UserWorkoutProfile | null;
  onSaveWorkoutProfile: (newProfile: UserWorkoutProfile) => Promise<void>;
  onGenerateWorkoutRoutine: (profile: UserWorkoutProfile) => Promise<void>;
  currentRoutine: WorkoutRoutine | null;
  onUpdateWorkoutRoutine?: (newRoutine: WorkoutRoutine) => Promise<void>;
}

export const WorkoutFicha: React.FC<WorkoutFichaProps> = ({
  user,
  profile,
  userData,
  workoutProfile,
  onSaveWorkoutProfile,
  onGenerateWorkoutRoutine,
  currentRoutine,
  onUpdateWorkoutRoutine
}) => {
  const [isEditExercisesOpen, setIsEditExercisesOpen] = useState(false);
  // States for inline training day name editing
  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [editingDayName, setEditingDayName] = useState<string>('');

  const getCustomMuscleGroups = () => {
    const saved = localStorage.getItem('sportnutri_custom_muscle_groups');
    if (saved) {
      try {
        return JSON.parse(saved) as { id: string; label: string }[];
      } catch (e) {
        console.error(e);
      }
    }
    return [
      { id: 'peito', label: 'Peito' },
      { id: 'costas', label: 'Costas' },
      { id: 'pernas', label: 'Pernas' },
      { id: 'biceps', label: 'Bíceps' },
      { id: 'triceps', label: 'Tríceps' },
      { id: 'ombros', label: 'Ombros' },
      { id: 'abdome', label: 'Abdômen' }
    ];
  };

  const handleSaveDayName = async (dayId: string, newName: string) => {
    if (!currentRoutine || !onUpdateWorkoutRoutine) return;
    const updatedDays = currentRoutine.days.map(d => 
      d.id === dayId ? { ...d, name: newName } : d
    );
    await onUpdateWorkoutRoutine({
      ...currentRoutine,
      days: updatedDays
    });
    setEditingDayId(null);
  };

  // Local states for core setup
  const [experience, setExperience] = useState<'beginner' | 'intermediate' | 'advanced'>(
    workoutProfile?.experience || 'beginner'
  );
  const [daysPerWeek, setDaysPerWeek] = useState<number>(
    workoutProfile?.daysPerWeek || 3
  );
  const [workoutDuration, setWorkoutDuration] = useState<number>(
    workoutProfile?.workoutDuration || 60
  );
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(
    workoutProfile?.equipment || ['pesos_livres']
  );
  const [selectedLimitations, setSelectedLimitations] = useState<string[]>(
    workoutProfile?.limitations || []
  );

  const [saving, setSaving] = useState(false);

  // Sub-equipments state for selection (matching the screenshot exactly)
  const [selectedSubFreeWeights, setSelectedSubFreeWeights] = useState<string[]>([
    "dumbbells", "kettlebells", "barbell", "ez_bar", "trap_bar", "bands", "weight_plates", "medicine_ball", "weighted_vest", "sandbag", "fat_gripz",
    "adj_bench", "flat_bench", "dec_bench", "rack_bench", "scott_bench", "roman_chair", "power_rack", "hip_thrust_bench",
    "leg_press", "smith_machine", "hack_squat", "chest_press_mach", "leg_extension", "leg_curl", "pec_deck", "abductor_mach", "calf_raise_mach", "shoulder_press_mach", "assisted_dip_chin",
    "crossover", "lat_pulldown", "low_row_cable", "triceps_rope", "cable_handle", "straight_bar_cable", "v_bar_cable", "ankle_strap", "double_d_handle",
    "pullup_bar", "parallel_bars", "gymnastic_rings", "pushup_bars", "ab_roller", "suspension_trainer", "yoga_mat", "plyo_box", "parallettes"
  ]);

  const equipmentsList = [
    { id: "pesos_livres", label: "Peso Livre / Halteres", desc: "Halteres, anilhas, barras e bancos", icon: Dumbbell },
    { id: "maquinas", label: "Máquinas Simples", desc: "Equipamentos guiados de academia", icon: Sliders },
    { id: "polias", label: "Polias e Cabos", desc: "Crossover e estações com polias", icon: Zap },
    { id: "calistenia", label: "Calistenia / Corpo", desc: "Apenas peso corporal e barras fixas", icon: Activity }
  ];

  const limitationsList = [
    { id: "joelhos", label: "Joelhos", desc: "Evitar pesos extremos em agachamento", icon: Ban },
    { id: "lombar", label: "Lombar", desc: "Evitar sobrecarga axial e compressão", icon: Ban },
    { id: "ombros", label: "Ombros Sensíveis", desc: "Evitar rotações perigosas em supinos", icon: Ban },
    { id: "pulsos", label: "Pulsos", desc: "Evitar pegadas pesadas e flexões de punho", icon: Ban }
  ];

  const toggleEquipment = (id: string) => {
    if (selectedEquipment.includes(id)) {
      if (selectedEquipment.length > 1) {
        setSelectedEquipment(selectedEquipment.filter(e => e !== id));
      }
    } else {
      setSelectedEquipment([...selectedEquipment, id]);
    }
  };

  const toggleSubFreeWeight = (id: string) => {
    if (selectedSubFreeWeights.includes(id)) {
      setSelectedSubFreeWeights(selectedSubFreeWeights.filter(e => e !== id));
    } else {
      setSelectedSubFreeWeights([...selectedSubFreeWeights, id]);
    }
  };

  const toggleLimitation = (id: string) => {
    if (selectedLimitations.includes(id)) {
      setSelectedLimitations(selectedLimitations.filter(l => l !== id));
    } else {
      setSelectedLimitations([...selectedLimitations, id]);
    }
  };

  const currentAutoSplit = (days: number) => {
    if (days <= 2) return 'Full Body A/B';
    if (days === 3) return 'ABC';
    if (days === 4) return 'ABCD';
    if (days === 5) return 'ABCDE';
    return 'Push/Pull/Legs 2x';
  };

  const handleSaveAndGenerate = async () => {
    setSaving(true);
    try {
      const generatedProfile: UserWorkoutProfile = {
        experience,
        daysPerWeek,
        workoutDuration,
        equipment: selectedEquipment,
        limitations: selectedLimitations,
        muscleFatigue: workoutProfile?.muscleFatigue || {
          peito: 0,
          costas: 0,
          pernas: 0,
          biceps: 0,
          triceps: 0,
          ombros: 0,
          abdome: 0
        },
        divisionType: currentAutoSplit(daysPerWeek)
      };

      await onSaveWorkoutProfile(generatedProfile);
      await onGenerateWorkoutRoutine(generatedProfile);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // High-fidelity equipment vectors dataset
  const renderEquipmentSvg = (iconType: string) => {
    if (iconType === "dumbbells") {
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto">
          <rect x="8" y="24" width="8" height="16" rx="2" fill="#475569" />
          <rect x="48" y="24" width="8" height="16" rx="2" fill="#475569" />
          <rect x="16" y="28" width="32" height="8" rx="1" fill="#94a3b8" />
          <circle cx="12" cy="32" r="12" fill="#334155" fillOpacity="0.8" />
          <circle cx="52" cy="32" r="12" fill="#334155" fillOpacity="0.8" />
        </svg>
      );
    }
    if (iconType === "kettlebells") {
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto">
          <circle cx="32" cy="40" r="16" fill="#334155" />
          <path d="M22 28 Q32 10 42 28" fill="none" stroke="#475569" strokeWidth="6" />
          <circle cx="32" cy="40" r="6" fill="#cbd5e1" />
        </svg>
      );
    }
    if (iconType === "barbell") {
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto">
          <line x1="4" y1="32" x2="60" y2="32" stroke="#94a3b8" strokeWidth="4" />
          <rect x="14" y="16" width="4" height="32" rx="1" fill="#334155" />
          <rect x="46" y="16" width="4" height="32" rx="1" fill="#334155" />
          <circle cx="16" cy="32" r="12" fill="#475569" />
          <circle cx="48" cy="32" r="12" fill="#475569" />
        </svg>
      );
    }
    if (iconType === "ez_bar") {
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto">
          <path d="M6 32 L18 26 L32 38 L46 26 L58 32" fill="none" stroke="#94a3b8" strokeWidth="4" />
          <circle cx="14" cy="28" r="10" fill="#334155" />
          <circle cx="50" cy="28" r="10" fill="#334155" />
        </svg>
      );
    }
    if (iconType === "trap_bar") {
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto">
          <path d="M20 18 L44 18 L52 32 L44 46 L20 46 L12 32 Z" fill="none" stroke="#94a3b8" strokeWidth="3" />
          <line x1="2" y1="32" x2="62" y2="32" stroke="#475569" strokeWidth="4" />
          <circle cx="10" cy="32" r="10" fill="#334155" />
          <circle cx="54" cy="32" r="10" fill="#334155" />
        </svg>
      );
    }
    if (iconType === "bands") {
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto">
          <ellipse cx="32" cy="32" rx="22" ry="10" fill="none" stroke="#eab308" strokeWidth="6" />
          <rect x="4" y="24" width="6" height="16" rx="2" fill="#1e293b" />
          <rect x="54" y="24" width="6" height="16" rx="2" fill="#1e293b" />
        </svg>
      );
    }
    if (iconType === "adj_bench") {
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto">
          <rect x="10" y="44" width="44" height="6" fill="#475569" />
          <line x1="20" y1="44" x2="36" y2="20" stroke="#334155" strokeWidth="5" />
          <line x1="44" y1="44" x2="44" y2="34" stroke="#334155" strokeWidth="5" />
          <rect x="22" y="16" width="30" height="6" transform="rotate(-30 22 16)" fill="#1e293b" rx="1" />
        </svg>
      );
    }
    if (iconType === "flat_bench") {
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto">
          <rect x="6" y="30" width="52" height="6" rx="1" fill="#1e293b" />
          <line x1="16" y1="36" x2="16" y2="52" stroke="#475569" strokeWidth="5" />
          <line x1="48" y1="36" x2="48" y2="52" stroke="#475569" strokeWidth="5" />
          <line x1="10" y1="52" x2="54" y2="52" stroke="#334155" strokeWidth="3" />
        </svg>
      );
    }
    if (iconType === "dec_bench") {
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto">
          <rect x="10" y="44" width="44" height="6" fill="#475569" />
          <line x1="24" y1="44" x2="18" y2="28" stroke="#334155" strokeWidth="5" />
          <line x1="44" y1="44" x2="44" y2="20" stroke="#334155" strokeWidth="5" />
          <rect x="14" y="24" width="36" height="6" transform="rotate(20 14 24)" fill="#1e293b" rx="1" />
        </svg>
      );
    }
    if (iconType === "rack_bench") {
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto">
          <line x1="20" y1="20" x2="20" y2="52" stroke="#475569" strokeWidth="4" />
          <line x1="44" y1="20" x2="44" y2="52" stroke="#475569" strokeWidth="4" />
          <line x1="8" y1="24" x2="56" y2="24" stroke="#94a3b8" strokeWidth="4" />
          <circle cx="12" cy="24" r="5" fill="#ef4444" />
          <circle cx="52" cy="24" r="5" fill="#ef4444" />
          <rect x="14" y="40" width="36" height="6" rx="1" fill="#1e293b" />
          <line x1="32" y1="46" x2="32" y2="52" stroke="#334155" strokeWidth="4" />
        </svg>
      );
    }
    if (iconType === "leg_press") {
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto">
          <line x1="8" y1="52" x2="56" y2="52" stroke="#475569" strokeWidth="4" />
          <line x1="16" y1="52" x2="48" y2="20" stroke="#334155" strokeWidth="4" strokeLinecap="round" />
          <rect x="36" y="12" width="16" height="16" rx="2" fill="#475569" />
          <line x1="32" y1="36" x2="44" y2="48" stroke="#94a3b8" strokeWidth="4" />
        </svg>
      );
    }
    if (iconType === "smith_machine") {
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto">
          <line x1="14" y1="12" x2="14" y2="52" stroke="#475569" strokeWidth="4" />
          <line x1="50" y1="12" x2="50" y2="52" stroke="#475569" strokeWidth="4" />
          <line x1="6" y1="32" x2="58" y2="32" stroke="#94a3b8" strokeWidth="4" />
          <rect x="10" y="26" width="8" height="12" fill="#334155" />
          <rect x="46" y="26" width="8" height="12" fill="#334155" />
          <line x1="6" y1="52" x2="58" y2="52" stroke="#475569" strokeWidth="2" />
        </svg>
      );
    }
    if (iconType === "hack_squat") {
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto">
          <line x1="10" y1="52" x2="54" y2="52" stroke="#475569" strokeWidth="4" />
          <line x1="18" y1="52" x2="44" y2="16" stroke="#334155" strokeWidth="4" />
          <rect x="28" y="22" width="14" height="16" rx="2" fill="#475569" transform="rotate(-30 28 22)" />
          <line x1="12" y1="16" x2="32" y2="16" stroke="#94a3b8" strokeWidth="3" />
        </svg>
      );
    }
    if (iconType === "chest_press_mach") {
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto">
          <rect x="24" y="20" width="16" height="32" rx="2" fill="#334155" />
          <line x1="12" y1="32" x2="52" y2="32" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" />
          <line x1="12" y1="32" x2="12" y2="44" stroke="#475569" strokeWidth="4" strokeLinecap="round" />
          <line x1="52" y1="32" x2="52" y2="44" stroke="#475569" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    }
    if (iconType === "leg_extension") {
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto">
          <rect x="16" y="32" width="20" height="20" fill="#334155" />
          <line x1="32" y1="32" x2="48" y2="48" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
          <circle cx="48" cy="48" r="6" fill="#475569" />
        </svg>
      );
    }
    if (iconType === "leg_curl") {
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto">
          <rect x="10" y="38" width="36" height="10" rx="1" fill="#334155" />
          <line x1="36" y1="38" x2="52" y2="22" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
          <circle cx="52" cy="22" r="6" fill="#475569" />
        </svg>
      );
    }
    if (iconType === "crossover") {
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto">
          <path d="M10 52 L10 16 A 12 12 0 0 1 54 16 L54 52" fill="none" stroke="#334155" strokeWidth="4" />
          <circle cx="16" cy="24" r="4" fill="#94a3b8" />
          <circle cx="48" cy="24" r="4" fill="#94a3b8" />
          <line x1="16" y1="24" x2="24" y2="36" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
          <line x1="48" y1="24" x2="40" y2="36" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    }
    if (iconType === "lat_pulldown") {
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto">
          <line x1="32" y1="12" x2="32" y2="52" stroke="#334155" strokeWidth="4" />
          <line x1="12" y1="18" x2="52" y2="18" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" />
          <line x1="32" y1="12" x2="16" y2="18" stroke="#475569" strokeWidth="3" />
          <line x1="32" y1="12" x2="48" y2="18" stroke="#475569" strokeWidth="3" />
        </svg>
      );
    }
    if (iconType === "low_row_cable") {
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto">
          <line x1="12" y1="48" x2="52" y2="48" stroke="#334155" strokeWidth="4" />
          <circle cx="44" cy="40" r="5" fill="#475569" />
          <line x1="16" y1="40" x2="39" y2="40" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    }
    if (iconType === "triceps_rope") {
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto">
          <path d="M32 12 Q32 28 24 44 M32 12 Q32 28 40 44" fill="none" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" />
          <circle cx="24" cy="44" r="5" fill="#334155" />
          <circle cx="40" cy="44" r="5" fill="#334155" />
        </svg>
      );
    }
    if (iconType === "cable_handle") {
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto">
          <rect x="20" y="36" width="24" height="6" rx="1" fill="#334155" />
          <path d="M32 12 L32 24 L24 36 M32 24 L40 36" fill="none" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    }
    if (iconType === "pullup_bar") {
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto">
          <line x1="8" y1="16" x2="56" y2="16" stroke="#334155" strokeWidth="5" strokeLinecap="round" />
          <line x1="16" y1="16" x2="16" y2="52" stroke="#475569" strokeWidth="4" />
          <line x1="48" y1="16" x2="48" y2="52" stroke="#475569" strokeWidth="4" />
        </svg>
      );
    }
    if (iconType === "parallel_bars") {
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto">
          <line x1="16" y1="28" x2="48" y2="28" stroke="#334155" strokeWidth="5" strokeLinecap="round" />
          <line x1="16" y1="28" x2="16" y2="52" stroke="#475569" strokeWidth="4" />
          <line x1="48" y1="28" x2="48" y2="52" stroke="#475569" strokeWidth="4" />
          <line x1="24" y1="34" x2="40" y2="34" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" strokeDasharray="4 2" />
        </svg>
      );
    }
    if (iconType === "gymnastic_rings") {
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto">
          <line x1="20" y1="10" x2="20" y2="32" stroke="#94a3b8" strokeWidth="3" />
          <line x1="44" y1="10" x2="44" y2="32" stroke="#94a3b8" strokeWidth="3" />
          <circle cx="20" cy="38" r="8" fill="none" stroke="#334155" strokeWidth="4" />
          <circle cx="44" cy="38" r="8" fill="none" stroke="#334155" strokeWidth="4" />
        </svg>
      );
    }
    if (iconType === "pushup_bars") {
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto">
          <path d="M12 44 L20 32 L44 32 L52 44" fill="none" stroke="#334155" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="24" y="28" width="16" height="5" fill="#94a3b8" rx="1" />
        </svg>
      );
    }
    if (iconType === "ab_roller") {
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto">
          <circle cx="32" cy="32" r="14" fill="#334155" />
          <circle cx="32" cy="32" r="8" fill="#e2e8f0" stroke="#475569" strokeWidth="2" />
          <line x1="8" y1="32" x2="56" y2="32" stroke="#94a3b8" strokeWidth="6" strokeLinecap="round" />
        </svg>
      );
    }
    if (iconType === "weight_plates") {
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto">
          <circle cx="32" cy="32" r="22" fill="#334155" />
          <circle cx="32" cy="32" r="16" fill="#475569" stroke="#1e293b" strokeWidth="2" />
          <circle cx="32" cy="32" r="6" fill="#cbd5e1" />
          <circle cx="32" cy="32" r="3" fill="#ffffff" />
        </svg>
      );
    }
    if (iconType === "medicine_ball") {
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto">
          <circle cx="32" cy="32" r="20" fill="#1e293b" />
          <path d="M12 32 A20 20 0 0 1 52 32" fill="none" stroke="#94a3b8" strokeWidth="3" strokeDasharray="4 2" />
          <line x1="12" y1="32" x2="52" y2="32" stroke="#475569" strokeWidth="4" />
          <circle cx="32" cy="32" r="4" fill="#ef4444" />
        </svg>
      );
    }
    if (iconType === "weighted_vest") {
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto">
          <path d="M18 14 C18 10, 46 10, 46 14 L42 48 L22 48 Z" fill="#334155" />
          <path d="M26 14 C26 22, 38 22, 38 14" fill="none" stroke="#1e293b" strokeWidth="4" />
          <rect x="24" y="24" width="6" height="8" rx="1" fill="#475569" />
          <rect x="34" y="24" width="6" height="8" rx="1" fill="#475569" />
          <rect x="24" y="36" width="6" height="8" rx="1" fill="#475569" />
          <rect x="34" y="36" width="6" height="8" rx="1" fill="#475569" />
          <line x1="20" y1="20" x2="44" y2="20" stroke="#94a3b8" strokeWidth="2" />
        </svg>
      );
    }
    if (iconType === "sandbag") {
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto">
          <rect x="14" y="24" width="36" height="16" rx="8" fill="#475569" stroke="#334155" strokeWidth="2" />
          <path d="M14 28 Q32 28 50 28" fill="none" stroke="#1e293b" strokeWidth="2" />
          <path d="M22 24 C22 18, 42 18, 42 24" fill="none" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    }
    if (iconType === "fat_gripz") {
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto">
          <rect x="18" y="20" width="28" height="24" rx="4" fill="#0ea5e9" />
          <line x1="18" y1="32" x2="46" y2="32" stroke="#0284c7" strokeWidth="2" />
          <circle cx="32" cy="32" r="3" fill="#ffffff" />
        </svg>
      );
    }
    if (iconType === "scott_bench") {
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto">
          <line x1="16" y1="50" x2="48" y2="50" stroke="#475569" strokeWidth="4" />
          <line x1="32" y1="50" x2="32" y2="26" stroke="#334155" strokeWidth="4" />
          <rect x="18" y="16" width="28" height="10" rx="2" fill="#1e293b" transform="rotate(-20 18 16)" />
          <rect x="14" y="32" width="16" height="6" fill="#475569" />
        </svg>
      );
    }
    if (iconType === "roman_chair") {
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto">
          <line x1="10" y1="52" x2="54" y2="52" stroke="#475569" strokeWidth="4" />
          <line x1="18" y1="52" x2="44" y2="18" stroke="#334155" strokeWidth="4" />
          <rect x="36" y="12" width="14" height="10" fill="#1e293b" transform="rotate(30 36 12)" rx="1" />
          <circle cx="24" cy="42" r="4" fill="#475569" />
        </svg>
      );
    }
    if (iconType === "power_rack") {
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto">
          <rect x="12" y="12" width="4" height="42" fill="#334155" />
          <rect x="48" y="12" width="4" height="42" fill="#334155" />
          <line x1="10" y1="14" x2="54" y2="14" stroke="#475569" strokeWidth="4" />
          <line x1="10" y1="52" x2="54" y2="52" stroke="#1e293b" strokeWidth="4" />
          <line x1="12" y1="30" x2="48" y2="30" stroke="#ef4444" strokeWidth="3" />
        </svg>
      );
    }
    if (iconType === "hip_thrust_bench") {
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto">
          <rect x="12" y="34" width="40" height="12" rx="3" fill="#1e293b" />
          <line x1="18" y1="46" x2="18" y2="56" stroke="#475569" strokeWidth="4" />
          <line x1="46" y1="46" x2="46" y2="56" stroke="#475569" strokeWidth="4" />
          <path d="M12 30 H52" stroke="#94a3b8" strokeWidth="3" />
        </svg>
      );
    }
    if (iconType === "pec_deck") {
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto">
          <rect x="22" y="12" width="20" height="42" fill="#334155" />
          <line x1="14" y1="24" x2="50" y2="24" stroke="#475569" strokeWidth="4" />
          <line x1="14" y1="24" x2="14" y2="40" stroke="#1e293b" strokeWidth="4" />
          <line x1="50" y1="24" x2="50" y2="40" stroke="#1e293b" strokeWidth="4" />
          <rect x="18" y="32" width="28" height="8" fill="#475569" />
        </svg>
      );
    }
    if (iconType === "abductor_mach") {
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto">
          <rect x="20" y="38" width="24" height="16" rx="2" fill="#334155" />
          <path d="M14 26 L22 38 M50 26 L42 38" stroke="#475569" strokeWidth="4" />
          <rect x="10" y="20" width="10" height="8" rx="1" fill="#1e293b" />
          <rect x="44" y="20" width="10" height="8" rx="1" fill="#1e293b" />
        </svg>
      );
    }
    if (iconType === "calf_raise_mach") {
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto">
          <line x1="12" y1="52" x2="52" y2="52" stroke="#475569" strokeWidth="4" />
          <line x1="20" y1="52" x2="20" y2="20" stroke="#334155" strokeWidth="4" />
          <rect x="14" y="20" width="24" height="8" rx="2" fill="#1e293b" />
          <line x1="32" y1="28" x2="44" y2="44" stroke="#94a3b8" strokeWidth="4" />
        </svg>
      );
    }
    if (iconType === "shoulder_press_mach") {
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto">
          <rect x="18" y="28" width="28" height="24" fill="#334155" rx="2" />
          <line x1="12" y1="20" x2="52" y2="20" stroke="#475569" strokeWidth="4" />
          <line x1="12" y1="20" x2="12" y2="34" stroke="#1e293b" strokeWidth="4" />
          <line x1="52" y1="20" x2="52" y2="34" stroke="#1e293b" strokeWidth="4" />
        </svg>
      );
    }
    if (iconType === "assisted_dip_chin") {
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto">
          <rect x="16" y="12" width="32" height="42" fill="none" stroke="#475569" strokeWidth="3" />
          <rect x="20" y="32" width="24" height="6" fill="#c084fc" />
          <line x1="10" y1="18" x2="54" y2="18" stroke="#334155" strokeWidth="4" />
        </svg>
      );
    }
    if (iconType === "straight_bar_cable") {
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto">
          <line x1="8" y1="32" x2="56" y2="32" stroke="#475569" strokeWidth="6" strokeLinecap="round" />
          <circle cx="32" cy="32" r="4" fill="#94a3b8" />
          <line x1="32" y1="32" x2="32" y2="12" stroke="#94a3b8" strokeWidth="2" strokeDasharray="2 2" />
        </svg>
      );
    }
    if (iconType === "v_bar_cable") {
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto">
          <path d="M22 20 L32 36 L42 20" fill="none" stroke="#475569" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="32" cy="36" r="3" fill="#ffffff" stroke="#1e293b" strokeWidth="2" />
        </svg>
      );
    }
    if (iconType === "ankle_strap") {
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto">
          <circle cx="32" cy="32" r="16" fill="none" stroke="#1e293b" strokeWidth="6" />
          <rect x="12" y="28" width="10" height="8" rx="1" fill="#475569" />
          <circle cx="32" cy="16" r="3" fill="#cbd5e1" />
        </svg>
      );
    }
    if (iconType === "double_d_handle") {
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto">
          <path d="M20 20 L20 44 L32 32 Z M44 20 L44 44 L32 32 Z" fill="#475569" />
          <rect x="28" y="28" width="8" height="8" fill="#1e293b" />
        </svg>
      );
    }
    if (iconType === "suspension_trainer") {
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto">
          <line x1="32" y1="10" x2="32" y2="24" stroke="#475569" strokeWidth="3" />
          <path d="M32 24 L16 48 M32 24 L48 48" stroke="#1e293b" strokeWidth="3" />
          <rect x="10" y="44" width="12" height="4" rx="1" fill="#eab308" />
          <rect x="42" y="44" width="12" height="4" rx="1" fill="#eab308" />
        </svg>
      );
    }
    if (iconType === "yoga_mat") {
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto">
          <rect x="10" y="32" width="44" height="14" rx="3" fill="#10b981" />
          <ellipse cx="50" cy="39" rx="4" ry="7" fill="#047857" />
        </svg>
      );
    }
    if (iconType === "plyo_box") {
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto">
          <polygon points="12,48 20,20 44,20 52,48" fill="#334155" />
          <polygon points="20,20 44,20 38,12 26,12" fill="#1e293b" />
          <rect x="28" y="28" width="8" height="4" fill="#ef4444" rx="1" />
        </svg>
      );
    }
    if (iconType === "parallettes") {
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto">
          <line x1="14" y1="28" x2="50" y2="28" stroke="#334155" strokeWidth="5" strokeLinecap="round" />
          <line x1="18" y1="28" x2="10" y2="48" stroke="#475569" strokeWidth="4" />
          <line x1="46" y1="28" x2="54" y2="48" stroke="#475569" strokeWidth="4" />
        </svg>
      );
    }
    
    // Bench press rack or default fallback
    return (
      <svg viewBox="0 0 64 64" className="w-12 h-12 mx-auto">
        <line x1="20" y1="20" x2="20" y2="52" stroke="#475569" strokeWidth="4" />
        <line x1="44" y1="20" x2="44" y2="52" stroke="#475569" strokeWidth="4" />
        <line x1="8" y1="24" x2="56" y2="24" stroke="#94a3b8" strokeWidth="4" />
        <circle cx="12" cy="24" r="5" fill="#ef4444" />
        <circle cx="52" cy="24" r="5" fill="#ef4444" />
        <rect x="14" y="40" width="36" height="6" rx="1" fill="#1e293b" />
        <line x1="32" y1="46" x2="32" y2="52" stroke="#334155" strokeWidth="4" />
      </svg>
    );
  };

  const listFreeWeights = [
    { id: "dumbbells", label: "Dumbbells", subDesc: "Haltere Convencional" },
    { id: "kettlebells", label: "Kettlebells", subDesc: "Peso de Bola Russo" },
    { id: "barbell", label: "Barbell", subDesc: "Barras Olímpicas e Longas" },
    { id: "ez_bar", label: "EZ bar", subDesc: "Barra Curvada W" },
    { id: "trap_bar", label: "Trap bar", subDesc: "Barra Hexagonal" },
    { id: "bands", label: "Resistance bands", subDesc: "Elásticos de Tensão" },
    { id: "weight_plates", label: "Anilhas Clínicas/Olímpicas", subDesc: "Anilhas de Ferro e Fracionadas" },
    { id: "medicine_ball", label: "Medicine Ball", subDesc: "Bola Pesada de Arremesso" },
    { id: "weighted_vest", label: "Weighted Vest", subDesc: "Colete de Peso Ajustável" },
    { id: "sandbag", label: "Sandbag", subDesc: "Saco de Areia Funcional" },
    { id: "fat_gripz", label: "Fat Gripz", subDesc: "Grip de Pegada Grossa" }
  ];

  const listBenches = [
    { id: "adj_bench", label: "Adjustable bench", subDesc: "Banco Regulável" },
    { id: "flat_bench", label: "Flat bench", subDesc: "Banco Reto" },
    { id: "dec_bench", label: "Decline bench", subDesc: "Banco Declinado" },
    { id: "rack_bench", label: "Bench press rack", subDesc: "Suporte com Barra" },
    { id: "scott_bench", label: "Scott Bench", subDesc: "Banco Scott de Bíceps" },
    { id: "roman_chair", label: "Roman Chair", subDesc: "Cadeira Romana Lombar" },
    { id: "power_rack", label: "Power Rack", subDesc: "Gaiola de Agachamento Livre" },
    { id: "hip_thrust_bench", label: "Hip Thrust Bench", subDesc: "Banco de Elevação Pélvica" }
  ];

  const listMachines = [
    { id: "leg_press", label: "Leg Press 45", subDesc: "Prensa de Pernas Angular" },
    { id: "smith_machine", label: "Smith Machine", subDesc: "Barra Guiada em Trilhos" },
    { id: "hack_squat", label: "Hack Squat", subDesc: "Agachamento Máquina" },
    { id: "chest_press_mach", label: "Chest Press", subDesc: "Supino Articulado" },
    { id: "leg_extension", label: "Leg Extension", subDesc: "Cadeira Extensora" },
    { id: "leg_curl", label: "Leg Curl", subDesc: "Mesa Flexora Guiada" },
    { id: "pec_deck", label: "Pec Deck Fly", subDesc: "Voador de Peitoral e Ombros" },
    { id: "abductor_mach", label: "Abductor / Adductor", subDesc: "Cadeira Abdutora e Adutora" },
    { id: "calf_raise_mach", label: "Calf Raise Machine", subDesc: "Gêmeos em Pé ou Sentado" },
    { id: "shoulder_press_mach", label: "Shoulder Press Mach", subDesc: "Desenvolvimento Máquina" },
    { id: "assisted_dip_chin", label: "Graviton Machine", subDesc: "Paralela e Barra Assistida" }
  ];

  const listPulleys = [
    { id: "crossover", label: "Crossover", subDesc: "Estação de Polias Dupla" },
    { id: "lat_pulldown", label: "Lat Pulldown", subDesc: "Puxador Costas de Polia" },
    { id: "low_row_cable", label: "Low Row Cable", subDesc: "Remada com Puxador Baixo" },
    { id: "triceps_rope", label: "Triceps Rope", subDesc: "Polia com Corda de Tríceps" },
    { id: "cable_handle", label: "Cable Handle", subDesc: "Estribo Puxada Unilateral" },
    { id: "straight_bar_cable", label: "Straight Bar Cable", subDesc: "Barra Reta de Polia" },
    { id: "v_bar_cable", label: "V-Bar Cable", subDesc: "Manopla Triângulo de Tríceps" },
    { id: "ankle_strap", label: "Ankle Strap Cable", subDesc: "Tornozeleira para Glúteos" },
    { id: "double_d_handle", label: "Double D Handle", subDesc: "Puxador Estribo Duplo D" }
  ];

  const listCalisthenics = [
    { id: "pullup_bar", label: "Pullup Bar", subDesc: "Barra Fixa de Parede" },
    { id: "parallel_bars", label: "Parallel Bars", subDesc: "Barras Paralelas Tríceps" },
    { id: "gymnastic_rings", label: "Gymnastic Rings", subDesc: "Argolas Suspensas" },
    { id: "pushup_bars", label: "Pushup Bars", subDesc: "Apoios Ergonômicos" },
    { id: "ab_roller", label: "Ab Roller", subDesc: "Roda Abdominal de Treino" },
    { id: "suspension_trainer", label: "Suspension Trainer", subDesc: "Fitas de Suspensão TRX" },
    { id: "yoga_mat", label: "Yoga Mat / Pad", subDesc: "Tapete de Treino e Colchonete" },
    { id: "plyo_box", label: "Plyo Jump Box", subDesc: "Caixa de Salto Pliométrica" },
    { id: "parallettes", label: "Mini Parallettes", subDesc: "Mini Paralelas Metálicas" }
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Intro Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Minha Ficha e Preferências de Treino
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          Para criar sua divisão de exercícios perfeita, precisamos configurar suas limitações físicas, equipamentos à disposição e seu nível de experiência. O algoritmo de divisão calcula os melhores grupos musculares para você treinar a cada dia.
        </p>
      </div>

      {/* Integration Data Display */}
      <div className="bg-slate-100/50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-200/45 dark:border-slate-800/45 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <User size={18} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-white">Perfil Físico Vinculado</h4>
            <p className="text-[11px] text-slate-400 font-medium">Dados aproveitados da sua avaliação física</p>
          </div>
        </div>

        <div className="flex gap-4 text-xs font-bold text-slate-700 dark:text-slate-300">
          <div className="text-center bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-700 shadow-xs">
            <span className="text-[10px] text-slate-400 block font-normal">Idade</span>
            {userData.age || profile?.user_data?.age || 25} anos
          </div>
          <div className="text-center bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-700 shadow-xs">
            <span className="text-[10px] text-slate-400 block font-normal">Objetivo</span>
            <span className="capitalize">{userData.goal === 'hypertrophy' ? 'Ganho Massa' : userData.goal === 'weightloss' ? 'Perder Peso' : 'Saúde'}</span>
          </div>
          <div className="text-center bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-700 shadow-xs">
            <span className="text-[10px] text-slate-400 block font-normal">Peso / Altura</span>
            {userData.weight || 75} kg / {userData.height || 175} cm
          </div>
        </div>
      </div>

      {/* Routine list display */}
      {currentRoutine && (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 mt-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-800 dark:text-white text-base">
              Sua Ficha Ativa ({currentRoutine.division})
            </h3>
            <button
              type="button"
              onClick={() => setIsEditExercisesOpen(true)}
              className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Sliders size={12} className="text-cyan-500" />
              Editar Ficha
            </button>
          </div>
          
          <div className="space-y-4">
            {currentRoutine.days.map((day) => (
              <div key={day.id} className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                {editingDayId === day.id ? (
                  <div className="flex flex-col gap-2 p-3.5 bg-cyan-50/40 dark:bg-cyan-950/20 rounded-2xl border border-cyan-100/50 dark:border-cyan-900/40">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={editingDayName}
                        onChange={(e) => setEditingDayName(e.target.value)}
                        className="w-full sm:flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-white focus:ring-1 focus:ring-cyan-500 outline-none"
                      />
                      <div className="flex gap-1.5 justify-end w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => handleSaveDayName(day.id, editingDayName)}
                          className="flex-1 sm:flex-none px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-600 border-0 text-white font-extrabold text-[10px] uppercase rounded-xl cursor-pointer transition-all shrink-0 text-center"
                        >
                          Salvar
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingDayId(null)}
                          className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 border-0 text-slate-600 dark:text-slate-350 font-extrabold text-[10px] uppercase rounded-xl cursor-pointer transition-all shrink-0 text-center"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-1 mt-1">
                      {getCustomMuscleGroups().map((group) => {
                        const allGroups = getCustomMuscleGroups();
                        const parseSelected = (nameStr: string) => {
                          const parts = nameStr.split(' - ');
                          if (parts.length < 2) return [];
                          const grpPart = parts[1];
                          const list = grpPart
                            .replace(/\s+e\s+/gi, ', ')
                            .split(',')
                            .map(s => s.trim().toLowerCase())
                            .filter(Boolean);
                          return allGroups.filter(g => list.includes(g.label.toLowerCase()));
                        };

                        const currentlySelected = parseSelected(editingDayName);
                        const isSelected = currentlySelected.some(g => g.id === group.id);
                        
                        return (
                          <button
                            key={group.id}
                            type="button"
                            onClick={() => {
                              const parts = editingDayName.split(' - ');
                              const prefix = parts[0] || 'Treino';
                              
                              let nextSelected = [...currentlySelected];
                              const exists = nextSelected.some(g => g.id === group.id);
                              if (exists) {
                                nextSelected = nextSelected.filter(g => g.id !== group.id);
                              } else {
                                nextSelected.push(group);
                              }
                              
                              const orderedSelected = allGroups.filter(g => 
                                nextSelected.some(cg => cg.id === g.id)
                              );
                              
                              if (orderedSelected.length > 0) {
                                const formattedLabels = orderedSelected.map(g => g.label);
                                let groupsStr = '';
                                if (formattedLabels.length === 1) {
                                  groupsStr = formattedLabels[0];
                                } else {
                                  groupsStr = formattedLabels.slice(0, -1).join(', ') + ' e ' + formattedLabels[formattedLabels.length - 1];
                                }
                                setEditingDayName(`${prefix} - ${groupsStr}`);
                              } else {
                                setEditingDayName(prefix);
                              }
                            }}
                            className={`text-[9.5px] px-2 py-1 font-bold rounded-full transition-all border cursor-pointer ${
                              isSelected
                                ? 'bg-cyan-100 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800'
                                : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800 hover:text-slate-700'
                            }`}
                          >
                            {group.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={() => {
                      setEditingDayId(day.id);
                      setEditingDayName(day.name);
                    }}
                    className="flex items-center justify-between gap-1.5 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-900/40 p-1.5 -m-1.5 rounded-xl transition-all"
                    title="Clique para alterar ou escolher grupos musculares"
                  >
                    <span className="text-xs font-black uppercase text-cyan-500 flex-1 leading-normal pr-2">{day.name}</span>
                    <span className="text-slate-400 hover:text-cyan-500 dark:text-slate-500 dark:hover:text-cyan-400 p-1 rounded-lg transition-colors flex items-center justify-center shrink-0">
                      <Pencil size={13} />
                    </span>
                  </div>
                )}
                <div className="space-y-2">
                  {day.exercises.map((pEx, idx) => (
                    <div key={pEx.id || idx} className="flex justify-between items-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <span>{pEx.exercise.nome}</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                        {pEx.series.length} séries • {pEx.series[0]?.reps || 12} repetições
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Dias de Treino e Duração */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Activity className="text-cyan-500" size={16} />
            Quantos dias na semana deseja treinar?
          </h3>
          
          <div className="flex flex-wrap gap-2">
            {[2, 3, 4, 5, 6].map((dayValue) => (
              <button
                key={dayValue}
                type="button"
                onClick={() => setDaysPerWeek(dayValue)}
                className={`py-3 px-6 rounded-2xl font-bold text-sm cursor-pointer border transition-all ${
                  daysPerWeek === dayValue 
                    ? "bg-cyan-500 text-white border-transparent shadow-md shadow-cyan-500/25" 
                    : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-100 dark:border-slate-800 hover:border-slate-200"
                }`}
              >
                {dayValue} Dias ({currentAutoSplit(dayValue)})
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Activity className="text-cyan-500" size={16} />
            Tempo máximo por treino (Minutos)
          </h3>
          <div className="flex gap-2">
            {[45, 60, 75, 90].map((durationValue) => (
              <button
                key={durationValue}
                type="button"
                onClick={() => setWorkoutDuration(durationValue)}
                className={`py-2 px-5 rounded-2xl font-bold text-xs cursor-pointer border transition-all ${
                  workoutDuration === durationValue 
                    ? "bg-cyan-500 text-white border-transparent" 
                    : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-100 dark:border-slate-800 hover:border-slate-200"
                }`}
              >
                {durationValue} minutos
              </button>
            ))}
          </div>
        </div>

        {/* Equipamentos */}
        <div className="space-y-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-800 dark:text-white">
              Equipamentos que tenho à disposição
            </h4>
            <p className="text-xs text-slate-400">Selecione os equipamentos gerais a que você possui acesso fácil.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {equipmentsList.map((eq) => {
              const IconComp = eq.icon;
              const isSelected = selectedEquipment.includes(eq.id);
              return (
                <button
                  key={eq.id}
                  type="button"
                  onClick={() => toggleEquipment(eq.id)}
                  className={`flex items-center gap-4 p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                    isSelected 
                      ? "bg-cyan-500/10 border-cyan-500 ring-1 ring-cyan-500/20" 
                      : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-200"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isSelected ? "bg-cyan-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                  }`}>
                    <IconComp size={16} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-white block">{eq.label}</span>
                    <span className="text-[10px] text-slate-400 block">{eq.desc}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Collapsible Expanded Sub-Equipment Panel for "Peso Livre / Halteres" */}
          <AnimatePresence>
            {selectedEquipment.includes("pesos_livres") && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="bg-slate-150/60 dark:bg-slate-900/60 rounded-3xl p-6 border border-slate-200/50 dark:border-slate-800 space-y-6 mt-2">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-black bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 px-2 py-0.5 rounded-md">
                      Sub-Equipamentos Específicos
                    </span>
                    <h5 className="text-sm font-black text-slate-800 dark:text-white">
                      Selecione suas Barras, Halteres e Bancos Livres
                    </h5>
                    <p className="text-xs text-slate-400 leading-normal">
                      A seleção de itens específicos nos ajuda a recomendar substitutos perfeitamente compatíveis com suas anilhas e suportes físicos.
                    </p>
                  </div>

                  {/* Section 1: Free weights */}
                  <div className="space-y-3">
                    <h6 className="text-xs font-black text-slate-400 uppercase tracking-wider">Free Weights (Pesos Livres)</h6>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {listFreeWeights.map((item) => {
                        const isSubSelected = selectedSubFreeWeights.includes(item.id);
                        return (
                          <div
                            key={item.id}
                            onClick={() => toggleSubFreeWeight(item.id)}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between items-center text-center min-h-[140px] select-none ${
                              isSubSelected
                                ? "bg-slate-100 dark:bg-slate-800 border-none shadow-md ring-2 ring-cyan-500/30"
                                : "bg-white/60 dark:bg-slate-900/30 border-slate-200/50 dark:border-slate-800/85 hover:border-slate-300"
                            }`}
                          >
                            {/* Blue badge checkmark */}
                            {isSubSelected && (
                              <div className="absolute top-2 right-2 w-4 h-4 bg-cyan-500 rounded-full flex items-center justify-center text-white text-[8px] font-bold">
                                <Check size={10} />
                              </div>
                            )}

                            {/* Render high-fidelity SVG illustration vector */}
                            <div className="w-12 h-12 flex items-center justify-center mt-2">
                              {renderEquipmentSvg(item.id)}
                            </div>

                            <div className="mt-2 text-center">
                              <span className="text-[11px] font-black text-slate-800 dark:text-white block leading-tight">
                                {item.label}
                              </span>
                              <span className="text-[8.5px] font-bold text-slate-400 block mt-0.5 leading-none">
                                {item.subDesc}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Section 2: Benches and racks */}
                  <div className="space-y-3 pt-2">
                    <h6 className="text-xs font-black text-slate-400 uppercase tracking-wider">Benches and Racks (Apoios e Bancos)</h6>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {listBenches.map((item) => {
                        const isSubSelected = selectedSubFreeWeights.includes(item.id);
                        return (
                          <div
                            key={item.id}
                            onClick={() => toggleSubFreeWeight(item.id)}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between items-center text-center min-h-[140px] select-none ${
                              isSubSelected
                                ? "bg-slate-100 dark:bg-slate-800 border-none shadow-md ring-2 ring-cyan-500/30"
                                : "bg-white/60 dark:bg-slate-900/30 border-slate-200/50 dark:border-slate-800/85 hover:border-slate-300"
                            }`}
                          >
                            {/* Blue checkmark */}
                            {isSubSelected && (
                              <div className="absolute top-2 right-2 w-4 h-4 bg-cyan-500 rounded-full flex items-center justify-center text-white text-[8px] font-bold">
                                <Check size={10} />
                              </div>
                            )}

                            {/* Render SVG */}
                            <div className="w-12 h-12 flex items-center justify-center mt-2">
                              {renderEquipmentSvg(item.id)}
                            </div>

                            <div className="mt-2 text-center">
                              <span className="text-[11px] font-black text-slate-800 dark:text-white block leading-tight">
                                {item.label}
                              </span>
                              <span className="text-[8.5px] font-bold text-slate-400 block mt-0.5 leading-none">
                                {item.subDesc}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Collapsible Expanded Sub-Equipment Panel for "Máquinas Simples" */}
          <AnimatePresence>
            {selectedEquipment.includes("maquinas") && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="bg-slate-150/60 dark:bg-slate-900/60 rounded-3xl p-6 border border-slate-200/50 dark:border-slate-800 space-y-6 mt-2">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-black bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 px-2 py-0.5 rounded-md">
                      Sub-Equipamentos Específicos
                    </span>
                    <h5 className="text-sm font-black text-slate-800 dark:text-white">
                      Selecione suas Máquinas Simples
                    </h5>
                    <p className="text-xs text-slate-400 leading-normal">
                      Defina quais aparelhos guiados de musculação você possui acesso na sua academia ou condomínio.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h6 className="text-xs font-black text-slate-400 uppercase tracking-wider">Máquinas Guiadas</h6>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {listMachines.map((item) => {
                        const isSubSelected = selectedSubFreeWeights.includes(item.id);
                        return (
                          <div
                            key={item.id}
                            onClick={() => toggleSubFreeWeight(item.id)}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between items-center text-center min-h-[140px] select-none ${
                              isSubSelected
                                ? "bg-slate-100 dark:bg-slate-800 border-none shadow-md ring-2 ring-cyan-500/30"
                                : "bg-white/60 dark:bg-slate-900/30 border-slate-200/50 dark:border-slate-800/85 hover:border-slate-300"
                            }`}
                          >
                            {isSubSelected && (
                              <div className="absolute top-2 right-2 w-4 h-4 bg-cyan-500 rounded-full flex items-center justify-center text-white text-[8px] font-bold">
                                <Check size={10} />
                              </div>
                            )}

                            <div className="w-12 h-12 flex items-center justify-center mt-2">
                              {renderEquipmentSvg(item.id)}
                            </div>

                            <div className="mt-2 text-center">
                              <span className="text-[11px] font-black text-slate-800 dark:text-white block leading-tight">
                                {item.label}
                              </span>
                              <span className="text-[8.5px] font-bold text-slate-400 block mt-0.5 leading-none">
                                {item.subDesc}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Collapsible Expanded Sub-Equipment Panel for "Polias e Cabos" */}
          <AnimatePresence>
            {selectedEquipment.includes("polias") && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="bg-slate-150/60 dark:bg-slate-900/60 rounded-3xl p-6 border border-slate-200/50 dark:border-slate-800 space-y-6 mt-2">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-black bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 px-2 py-0.5 rounded-md">
                      Sub-Equipamentos Específicos
                    </span>
                    <h5 className="text-sm font-black text-slate-800 dark:text-white">
                      Selecione suas Polias, Cabos e Acessórios
                    </h5>
                    <p className="text-xs text-slate-400 leading-normal">
                      Esta seleção ajuda a prescrever exercícios eficazes usando cabo com a variação correta de pegador.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h6 className="text-xs font-black text-slate-400 uppercase tracking-wider">Polias & Cabos</h6>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {listPulleys.map((item) => {
                        const isSubSelected = selectedSubFreeWeights.includes(item.id);
                        return (
                          <div
                            key={item.id}
                            onClick={() => toggleSubFreeWeight(item.id)}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between items-center text-center min-h-[140px] select-none ${
                              isSubSelected
                                ? "bg-slate-100 dark:bg-slate-800 border-none shadow-md ring-2 ring-cyan-500/30"
                                : "bg-white/60 dark:bg-slate-900/30 border-slate-200/50 dark:border-slate-800/85 hover:border-slate-300"
                            }`}
                          >
                            {isSubSelected && (
                              <div className="absolute top-2 right-2 w-4 h-4 bg-cyan-500 rounded-full flex items-center justify-center text-white text-[8px] font-bold">
                                <Check size={10} />
                              </div>
                            )}

                            <div className="w-12 h-12 flex items-center justify-center mt-2">
                              {renderEquipmentSvg(item.id)}
                            </div>

                            <div className="mt-2 text-center">
                              <span className="text-[11px] font-black text-slate-800 dark:text-white block leading-tight">
                                {item.label}
                              </span>
                              <span className="text-[8.5px] font-bold text-slate-400 block mt-0.5 leading-none">
                                {item.subDesc}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Collapsible Expanded Sub-Equipment Panel for "Calistenia / Corpo" */}
          <AnimatePresence>
            {selectedEquipment.includes("calistenia") && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="bg-slate-150/60 dark:bg-slate-900/60 rounded-3xl p-6 border border-slate-200/50 dark:border-slate-800 space-y-6 mt-2">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-black bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 px-2 py-0.5 rounded-md">
                      Sub-Equipamentos Específicos
                    </span>
                    <h5 className="text-sm font-black text-slate-800 dark:text-white">
                      Selecione seus Equipamentos de Calistenia
                    </h5>
                    <p className="text-xs text-slate-400 leading-normal">
                      Além do próprio peso do corpo, indique se possui suportes, barras fixas ou outros acessórios de apoio.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h6 className="text-xs font-black text-slate-400 uppercase tracking-wider">Acessórios de Calistenia & Peso Corporal</h6>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {listCalisthenics.map((item) => {
                        const isSubSelected = selectedSubFreeWeights.includes(item.id);
                        return (
                          <div
                            key={item.id}
                            onClick={() => toggleSubFreeWeight(item.id)}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between items-center text-center min-h-[140px] select-none ${
                              isSubSelected
                                ? "bg-slate-100 dark:bg-slate-800 border-none shadow-md ring-2 ring-cyan-500/30"
                                : "bg-white/60 dark:bg-slate-900/30 border-slate-200/50 dark:border-slate-800/85 hover:border-slate-300"
                            }`}
                          >
                            {isSubSelected && (
                              <div className="absolute top-2 right-2 w-4 h-4 bg-cyan-500 rounded-full flex items-center justify-center text-white text-[8px] font-bold">
                                <Check size={10} />
                              </div>
                            )}

                            <div className="w-12 h-12 flex items-center justify-center mt-2">
                              {renderEquipmentSvg(item.id)}
                            </div>

                            <div className="mt-2 text-center">
                              <span className="text-[11px] font-black text-slate-800 dark:text-white block leading-tight">
                                {item.label}
                              </span>
                              <span className="text-[8.5px] font-bold text-slate-400 block mt-0.5 leading-none">
                                {item.subDesc}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Limitações físicas */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1">
            Limitações ou dores articulares?
          </h4>
          <p className="text-xs text-slate-400">Inibiremos ou faremos substituição automática de exercícios de compressão extrema.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {limitationsList.map((lim) => {
              const isSelected = selectedLimitations.includes(lim.id);
              return (
                <button
                  key={lim.id}
                  type="button"
                  onClick={() => toggleLimitation(lim.id)}
                  className={`flex items-center gap-4 p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                    isSelected 
                      ? "bg-rose-500/10 border-rose-500" 
                      : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-200"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isSelected ? "bg-rose-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                  }`}>
                    <lim.icon size={16} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-white block">{lim.label}</span>
                    <span className="text-[10px] text-slate-400 block">{lim.desc}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit action */}
        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-slate-400 font-medium">
            Sua divisão inteligente calculada: <span className="font-extrabold text-cyan-500">{currentAutoSplit(daysPerWeek)}</span>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSaveAndGenerate}
            disabled={saving}
            className="bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white font-bold py-3.5 px-8 rounded-2xl text-xs sm:text-sm shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all border-0"
          >
            {saving ? (
              <span>Gerando Sua Divisão...</span>
            ) : (
              <>
                <Sparkles size={16} />
                Gerar Ficha de Treinos Inteligente
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* Workout Exercise management modal integration */}
      {currentRoutine && (
        <WorkoutExerciseManagementModal
          isOpen={isEditExercisesOpen}
          onClose={() => setIsEditExercisesOpen(false)}
          initialRoutine={currentRoutine}
          onSave={async (newRoutine) => {
            if (onUpdateWorkoutRoutine) {
              await onUpdateWorkoutRoutine(newRoutine);
            }
          }}
        />
      )}
    </div>
  );
};
