import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Cropper from 'react-easy-crop';
import { 
  Plus, 
  Search, 
  Mic, 
  Camera, 
  Trophy, 
  Flame, 
  Calendar as CalendarIcon, 
  Droplets, 
  ChevronRight, 
  ChevronLeft,
  CheckCircle2, 
  TrendingUp,
  LayoutDashboard,
  User as UserIcon,
  LogOut,
  Utensils,
  Loader2,
  Settings,
  Edit2,
  Save,
  Clock,
  PieChart as PieChartIcon,
  Upload,
  Check,
  Trash2,
  Pause,
  Play,
  AlertTriangle,
  X,
  Eye,
  EyeOff,
  Send,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  Snowflake,
  Coins,
  ShoppingBag,
  ChefHat
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip,
  Legend
} from 'recharts';
import { db, auth, isFirebaseConfigured, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, getDocs, getDoc, doc, setDoc, deleteDoc, updateDoc, orderBy, limit } from 'firebase/firestore';
import { updatePassword, updateEmail } from 'firebase/auth';
import { Profile, FoodLog, WaterLog, DietPlan, Food, UserData, UserWorkoutProfile, WorkoutRoutine, ExerciseLog } from '../types';
import { analyzeFoodInput, moderateProfileImage } from '../services/aiService';
import confetti from 'canvas-confetti';
import { formatFoodName, calculateStreakFromLogs, getLocalDateString } from '../utils';


import { SummaryHeader } from './dashboard/SummaryHeader';
import { WaterTracker } from './dashboard/WaterTracker';
import { MealCard } from './dashboard/MealCard';
import { AddFoodModal } from './dashboard/AddFoodModal';
import { MealManagementModal } from './dashboard/MealManagementModal';
import { ProfileTab } from './dashboard/ProfileTab';
import { RankingTab } from './dashboard/RankingTab';
import { WeeklyPlanTab } from './dashboard/WeeklyPlanTab';
import { StoreTab } from './dashboard/StoreTab';
import { NutriAssistant } from './dashboard/NutriAssistant';
import { RecipesTab } from './dashboard/RecipesTab';
import AdminTab from './dashboard/AdminTab';
import { EvolutionTab } from './dashboard/EvolutionTab';
import { WorkoutDashboard } from './dashboard/WorkoutDashboard';
import { WorkoutFicha } from './dashboard/WorkoutFicha';
import { WorkoutToday } from './dashboard/WorkoutToday';
import { WorkoutHistory } from './dashboard/WorkoutHistory';
import { Shield, Dumbbell, Sliders } from 'lucide-react';
import { StoreConfig, getStoreConfig } from '../services/storeConfigService';

interface DashboardProps {
  user: any;
  dietPlan: DietPlan | null;
  profile: Profile | null;
  setProfile: React.Dispatch<React.SetStateAction<Profile | null>>;
  loadingProfile: boolean;
  onLogout: () => void;
  setStep: (step: number) => void;
  onRegenerate: () => void;
  onRegenerateFood: (day: string, mealIdx: number, foodIdx: number) => void;
  formatMeasure: (amountGrams: number, food: any) => string;
  activeTab: 'dashboard' | 'ranking' | 'profile' | 'weekly' | 'recipes' | 'store' | 'admin' | 'evolution' | 'workout_dashboard' | 'workout_ficha' | 'workout_today' | 'workout_history';
  setActiveTab: (tab: any) => void;
  userData: UserData;
  onUpdateBiometrics: (newUserData: UserData) => Promise<void>;
  onSaveCustomMeals?: (newMeals: any[]) => Promise<void>;
  onPrint?: () => void;
  appMode?: 'diet' | 'workout';
  setAppMode?: (mode: 'diet' | 'workout') => void;
}

const formatTime = (isoString: string) => {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return "";
  }
};

// Helper to determine the muscle group of a logged exercise using active routine lookup or fallback Portuguese/English keywords mapping
export const getMuscleGroupForExercise = (exerciseName: string, activeRoutine: WorkoutRoutine | null): string => {
  const exName = (exerciseName || "").toLowerCase().trim();
  if (!exName) return "abdome";

  // 1. Check in Active Routine first for precise matching
  if (activeRoutine && activeRoutine.days) {
    for (const day of activeRoutine.days) {
      if (day.exercises) {
        for (const pEx of day.exercises) {
          if (pEx.exercise?.nome && pEx.exercise.nome.toLowerCase().trim() === exName) {
            const gp = pEx.exercise.grupoPrincipal;
            if (gp) {
              const matched = gp.toLowerCase().trim();
              if (matched === "biceps" || matched === "bíceps") return "biceps";
              if (matched === "triceps" || matched === "tríceps") return "triceps";
              if (matched === "abdome" || matched === "abdômen" || matched === "abdomen" || matched === "abdominal") return "abdome";
              if (matched === "ombros" || matched === "ombro") return "ombros";
              return matched; // peito, costas, pernas
            }
          }
        }
      }
    }
  }

  // 2. Keyword fallback matching
  // Pernas / Lower Body (Rich, smart Portuguese-Brazilian gym terminology matching for Pernas/Legs, including Panturrilha, Stiff, Afundo, Hack etc.)
  const legKeywords = [
    "agachamento", "squat", "leg press", "legpress", "cadeira", "mesa", "extensora", "flexora", "panturrilha", "gêmeos", "gemeos", 
    "stiff", "búlgaro", "bulgaro", "afundo", "avanço", "avanco", "passada", "hack", "adutor", "abutor", "pélvica", "pelvica", 
    "glúteo", "gluteo", "-gluteo", "glute", "posterior de coxa", "quadríceps", "quadriceps", "quadril", "coxa", "panturrilhas", 
    "adutora", "abdutora", "elevação pélvica", "elevacao pelvica", "leg", "lunge", "hack machine", "gastrocnemio", "sóleo", "soleo"
  ];
  if (legKeywords.some(kw => exName.includes(kw))) {
    return "pernas";
  }

  // Peito / Chest
  const chestKeywords = [
    "supino", "flexão", "flexao", "apoio", "crossover", "cross-over", "peck deck", "voador", "crucifixo", "pullover", "chest", "fly"
  ];
  if (chestKeywords.some(kw => exName.includes(kw))) {
    return "peito";
  }

  // Costas / Back
  const backKeywords = [
    "puxada", "remada", "barra", "pulley costas", "levantamento terra", "terra", "pulldown", "pull-down", "crucifixo inverso", 
    "voador dorsal", "remada curva", "remada baixa", "lat machine", "row"
  ];
  if (backKeywords.some(kw => exName.includes(kw))) {
    return "costas";
  }

  // Biceps
  const bicepsKeywords = [
    "rosca", "biceps", "bíceps", "martelo", "concentrada", "scott"
  ];
  if (bicepsKeywords.some(kw => exName.includes(kw))) {
    return "biceps";
  }

  // Triceps
  const tricepsKeywords = [
    "pulley", "testa", "mergulho", "triceps", "tríceps", "francesa", "coice"
  ];
  if (tricepsKeywords.some(kw => exName.includes(kw))) {
    return "triceps";
  }

  // Ombros / Shoulders / Traps
  const shoulderKeywords = [
    "desenvolvimento", "elevação", "elevacao", "lateral", "frontal", "ombro", "deltoide", "deltoíde", "manguito", "trapézio", 
    "trapezio", "encolhimento"
  ];
  if (shoulderKeywords.some(kw => exName.includes(kw))) {
    return "ombros";
  }

  // Abdome / Core
  const absKeywords = [
    "abdominal", "abdome", "abdômen", "abdomen", "abd", "prancha", "infra", "supra", "oblíquo", "obliquo", "core",
    "canivete", "perdigueiro", "twist", "roda abdominal", "rodinha"
  ];
  if (absKeywords.some(kw => exName.includes(kw))) {
    return "abdome";
  }

  return "abdome"; // Default fallback
};

// Helper to recalculate fatigue from full history (decays dynamically over 60 hours based on elapsed rest and training Effort/RPE)
export const recalculateMuscleFatigue = (history: ExerciseLog[], activeRoutine: WorkoutRoutine | null) => {
  const computed = {
    peito: 0,
    costas: 0,
    pernas: 0,
    biceps: 0,
    triceps: 0,
    ombros: 0,
    abdome: 0
  };

  if (!history || history.length === 0) {
    return computed;
  }

  const nowTime = Date.now();

  history.forEach(log => {
    if (!log.loggedAt) return;
    const logTime = new Date(log.loggedAt).getTime();
    const hoursAgo = (nowTime - logTime) / (1000 * 60 * 60);

    // Ignore future or extremely old logs (> 60 hours representing complete rest & full recovery)
    if (hoursAgo < 0 || hoursAgo > 60) return;

    const muscleGroup = getMuscleGroupForExercise(log.exercicio, activeRoutine);
    if (!muscleGroup || !(muscleGroup in computed)) return;

    let fatigueContribution = 0;
    const effort = log.esforco || 3;

    if (hoursAgo <= 18) {
      // Acute post-workout fatigue (high resolution based on Effort/RPE)
      if (effort >= 4) fatigueContribution = 40;
      else if (effort === 3) fatigueContribution = 30;
      else fatigueContribution = 20;
    } else if (hoursAgo <= 36) {
      // Recovery phase (18 to 36 hours)
      if (effort >= 4) fatigueContribution = 25;
      else if (effort === 3) fatigueContribution = 15;
      else fatigueContribution = 10;
    } else {
      // Final recovery phase (36 to 60 hours)
      if (effort >= 4) fatigueContribution = 10;
      else if (effort === 3) fatigueContribution = 5;
      else fatigueContribution = 3;
    }

    computed[muscleGroup as keyof typeof computed] += fatigueContribution;
  });

  // Cap fatigue values at 100%
  for (const k of Object.keys(computed)) {
    const key = k as keyof typeof computed;
    computed[key] = Math.min(100, computed[key]);
  }

  return computed;
};

export const Dashboard: React.FC<DashboardProps> = ({ 
  user, 
  dietPlan, 
  profile, 
  setProfile, 
  loadingProfile, 
  onLogout, 
  setStep,
  onRegenerate,
  onRegenerateFood,
  formatMeasure,
  activeTab,
  setActiveTab,
  userData,
  onUpdateBiometrics,
  onSaveCustomMeals,
  onPrint,
  appMode = 'diet',
  setAppMode
}) => {
  const normDashboardEmail = (user?.email || "").toLowerCase().trim();
  const isAdmin = normDashboardEmail === 'edsonricardosouza@gmail.com' || profile?.role === 'admin';
  const [activePlanDay, setActivePlanDay] = useState<string>(['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'][new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [streakTab, setStreakTab] = useState<'week' | 'month'>('week');
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(new Date());
  const [hoveredDayCalories, setHoveredDayCalories] = useState<number | null>(null);
  const [hoveredDayLabel, setHoveredDayLabel] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showStreakMenu, setShowStreakMenu] = useState(false);

  const getLogDateWithCurrentTime = () => {
    const now = new Date();
    const logDate = new Date(selectedDate);
    logDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    return logDate.toISOString();
  };

  // Workout States & Handlers
  const [workoutProfile, setWorkoutProfile] = useState<UserWorkoutProfile | null>(null);
  const [activeRoutine, setActiveRoutine] = useState<WorkoutRoutine | null>(null);
  const [exerciseHistory, setExerciseHistory] = useState<ExerciseLog[]>([]);

  const fetchWorkoutData = async () => {
    if (!user?.uid) return;

    if (!isFirebaseConfigured) {
      const storedProfile = localStorage.getItem(`workout_profile_${user.uid}`);
      let localProfile: UserWorkoutProfile | null = storedProfile ? JSON.parse(storedProfile) : null;
      
      const storedRoutine = localStorage.getItem(`workout_routine_${user.uid}`);
      const localRoutine: WorkoutRoutine | null = storedRoutine ? JSON.parse(storedRoutine) : null;
      if (localRoutine) {
        setActiveRoutine(localRoutine);
      }
      
      const storedHistory = localStorage.getItem(`workout_history_${user.uid}`);
      const localHistory: ExerciseLog[] = storedHistory ? JSON.parse(storedHistory) : [];
      setExerciseHistory(localHistory);

      if (localProfile) {
        const freshFatigue = recalculateMuscleFatigue(localHistory, localRoutine);
        localProfile.muscleFatigue = freshFatigue;
        setWorkoutProfile(localProfile);
        localStorage.setItem(`workout_profile_${user.uid}`, JSON.stringify(localProfile));
      }
      return;
    }

    const isOfflineError = (err: any): boolean => {
      const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
      return msg.includes('offline') || msg.includes('unavailable') || msg.includes('failed to get document') || !navigator.onLine;
    };

    let uwp: UserWorkoutProfile | null = null;
    try {
      const profRef = doc(db, 'workout_profiles', user.uid);
      const profSnap = await getDoc(profRef);
      if (profSnap.exists()) {
        uwp = profSnap.data() as UserWorkoutProfile;
      }
    } catch (err: any) {
      if (isOfflineError(err)) {
        console.warn("Firestore offline - carregando perfil de treino da cache local.");
      } else {
        console.error("Erro ao carregar perfil de treino no Firebase:", err);
        handleFirestoreError(err, OperationType.GET, `workout_profiles/${user.uid}`);
      }
    }
    if (!uwp) {
      const storedProfile = localStorage.getItem(`workout_profile_${user.uid}`);
      if (storedProfile) {
        uwp = JSON.parse(storedProfile);
      }
    }

    let r: WorkoutRoutine | null = null;
    try {
      const routineRef = doc(db, 'workout_routines', user.uid);
      const routineSnap = await getDoc(routineRef);
      if (routineSnap.exists()) {
        r = routineSnap.data() as WorkoutRoutine;
        setActiveRoutine(r);
        localStorage.setItem(`workout_routine_${user.uid}`, JSON.stringify(r));
      }
    } catch (err: any) {
      if (isOfflineError(err)) {
        console.warn("Firestore offline - carregando rotina de treino da cache local.");
      } else {
        console.error("Erro ao carregar rotina de treino no Firebase:", err);
        handleFirestoreError(err, OperationType.GET, `workout_routines/${user.uid}`);
      }
    }
    if (!r) {
      const storedRoutine = localStorage.getItem(`workout_routine_${user.uid}`);
      if (storedRoutine) {
        r = JSON.parse(storedRoutine);
        setActiveRoutine(r);
      }
    }

    let hist: ExerciseLog[] = [];
    try {
      const logsCol = collection(db, 'exercise_logs');
      const q = query(logsCol, where('user_id', '==', user.uid));
      const qSnap = await getDocs(q);
      qSnap.forEach((d) => {
        hist.push({ id: d.id, ...d.data() } as ExerciseLog);
      });
      setExerciseHistory(hist);
      localStorage.setItem(`workout_history_${user.uid}`, JSON.stringify(hist));
    } catch (err: any) {
      if (isOfflineError(err)) {
        console.warn("Firestore offline - carregando historico de exercicios da cache local.");
        const storedHistory = localStorage.getItem(`workout_history_${user.uid}`);
        if (storedHistory) {
          hist = JSON.parse(storedHistory);
          setExerciseHistory(hist);
        }
      } else {
        console.error("Erro ao carregar histórico de exercícios no Firebase:", err);
        handleFirestoreError(err, OperationType.LIST, 'exercise_logs');
        const storedHistory = localStorage.getItem(`workout_history_${user.uid}`);
        if (storedHistory) {
          hist = JSON.parse(storedHistory);
          setExerciseHistory(hist);
        }
      }
    }

    // Recalculate fatigue based on retrieved history with precision accuracy and persistence
    if (uwp) {
      const freshFatigue = recalculateMuscleFatigue(hist, r);
      uwp.muscleFatigue = freshFatigue;
      setWorkoutProfile(uwp);
      localStorage.setItem(`workout_profile_${user.uid}`, JSON.stringify(uwp));
      
      try {
        const profRef = doc(db, 'workout_profiles', user.uid);
        await setDoc(profRef, uwp);
      } catch (err: any) {
        if (isOfflineError(err)) {
          console.warn("Firestore offline - salvando perfil atualizado de fadiga apenas na cache local.");
        } else {
          console.error("Erro ao salvar perfil atualizado pós-recálculo de fadiga:", err);
        }
      }
    }
  };

  const handleSaveWorkoutProfile = async (newProfile: UserWorkoutProfile) => {
    if (!user?.uid) return;
    const freshFatigue = recalculateMuscleFatigue(exerciseHistory, activeRoutine);
    const updatedProfile = {
      ...newProfile,
      muscleFatigue: freshFatigue
    };
    setWorkoutProfile(updatedProfile);
    localStorage.setItem(`workout_profile_${user.uid}`, JSON.stringify(updatedProfile));
    if (isFirebaseConfigured) {
      try {
        const profRef = doc(db, 'workout_profiles', user.uid);
        await setDoc(profRef, updatedProfile);
      } catch (err) {
         console.error("Erro ao salvar perfil de treino no Firebase:", err);
         handleFirestoreError(err, OperationType.WRITE, `workout_profiles/${user.uid}`);
      }
    }
  };

  const handleGenerateWorkoutRoutine = async (prof: UserWorkoutProfile) => {
    if (!user?.uid) return;

    let customExs: any[] = [];
    if (isFirebaseConfigured) {
      try {
        const snap = await getDocs(collection(db, 'admin_exercises'));
        snap.forEach(docSnap => {
          const d = docSnap.data();
          customExs.push({
            nome: d.name,
            equipamento: d.equipment,
            grupoPrincipal: d.mainGroup,
            gruposSecundarios: d.secondaryGroups || [],
            nivel: d.level,
            tipo: d.type,
            gifUrl: d.gifUrl || ''
          });
        });
      } catch (err) {
        console.error("Erro ao carregar exercícios dinâmicos do admin:", err);
      }
    }

    const exercisesDb = {
      peito: [
        { nome: "Supino Reto com Barra", equipamento: "pesos_livres" as const, grupoPrincipal: "peito" as const, gruposSecundarios: ["triceps", "ombros"], nivel: "iniciante" as const, tipo: "composto" as const },
        { nome: "Supino Inclinado com Halteres", equipamento: "pesos_livres" as const, grupoPrincipal: "peito" as const, gruposSecundarios: ["triceps", "ombros"], nivel: "intermediario" as const, tipo: "composto" as const },
        { nome: "Crucifixo na Polia", equipamento: "polia" as const, grupoPrincipal: "peito" as const, gruposSecundarios: [], nivel: "intermediario" as const, tipo: "isolador" as const },
        { nome: "Flexão de Braços (Apoio)", equipamento: "calistenia" as const, grupoPrincipal: "peito" as const, gruposSecundarios: ["triceps", "ombros"], nivel: "iniciante" as const, tipo: "composto" as const },
        { nome: "Pec Deck (Voador)", equipamento: "maquina" as const, grupoPrincipal: "peito" as const, gruposSecundarios: [], nivel: "iniciante" as const, tipo: "isolador" as const },
        ...customExs.filter(e => e.grupoPrincipal === 'peito')
      ],
      costas: [
        { nome: "Puxada Alta na Polia", equipamento: "polia" as const, grupoPrincipal: "costas" as const, gruposSecundarios: ["biceps"], nivel: "iniciante" as const, tipo: "composto" as const },
        { nome: "Remada Curvada com Halteres", equipamento: "pesos_livres" as const, grupoPrincipal: "costas" as const, gruposSecundarios: ["biceps"], nivel: "intermediario" as const, tipo: "composto" as const },
        { nome: "Remada Baixa na Polia", equipamento: "polia" as const, grupoPrincipal: "costas" as const, gruposSecundarios: ["biceps"], nivel: "iniciante" as const, tipo: "composto" as const },
        { nome: "Barra Fixa (Pronada)", equipamento: "calistenia" as const, grupoPrincipal: "costas" as const, gruposSecundarios: ["biceps"], nivel: "avancado" as const, tipo: "composto" as const },
        { nome: "Remada Unilateral com Halter (Serrote)", equipamento: "pesos_livres" as const, grupoPrincipal: "costas" as const, gruposSecundarios: ["biceps"], nivel: "iniciante" as const, tipo: "composto" as const },
        ...customExs.filter(e => e.grupoPrincipal === 'costas')
      ],
      pernas: [
        { nome: "Agachamento Livre", equipamento: "pesos_livres" as const, grupoPrincipal: "pernas" as const, gruposSecundarios: ["lombar"], nivel: "intermediario" as const, tipo: "composto" as const },
        { nome: "Cadeira Extensora", equipamento: "maquina" as const, grupoPrincipal: "pernas" as const, gruposSecundarios: [], nivel: "iniciante" as const, tipo: "isolador" as const },
        { nome: "Mesa Flexora", equipamento: "maquina" as const, grupoPrincipal: "pernas" as const, gruposSecundarios: [], nivel: "iniciante" as const, tipo: "isolador" as const },
        { nome: "Leg Press 45 Graus", equipamento: "maquina" as const, grupoPrincipal: "pernas" as const, gruposSecundarios: [], nivel: "iniciante" as const, tipo: "composto" as const },
        { nome: "Agachamento Búlgaro", equipamento: "pesos_livres" as const, grupoPrincipal: "pernas" as const, gruposSecundarios: [], nivel: "avancado" as const, tipo: "composto" as const },
        ...customExs.filter(e => e.grupoPrincipal === 'pernas')
      ],
      biceps: [
        { nome: "Rosca Direta com Barra", equipamento: "pesos_livres" as const, grupoPrincipal: "biceps" as const, gruposSecundarios: [], nivel: "iniciante" as const, tipo: "isolador" as const },
        { nome: "Rosca Martelo com Halteres", equipamento: "pesos_livres" as const, grupoPrincipal: "biceps" as const, gruposSecundarios: [], nivel: "iniciante" as const, tipo: "isolador" as const },
        { nome: "Rosca Concentrada", equipamento: "pesos_livres" as const, grupoPrincipal: "biceps" as const, gruposSecundarios: [], nivel: "intermediario" as const, tipo: "isolador" as const },
        ...customExs.filter(e => e.grupoPrincipal === 'biceps')
      ],
      triceps: [
        { nome: "Tríceps Pulley (Corda)", equipamento: "polia" as const, grupoPrincipal: "triceps" as const, gruposSecundarios: [], nivel: "iniciante" as const, tipo: "isolador" as const },
        { nome: "Tríceps Testa com Halteres", equipamento: "pesos_livres" as const, grupoPrincipal: "triceps" as const, gruposSecundarios: [], nivel: "intermediario" as const, tipo: "isolador" as const },
        { nome: "Mergulho no Banco", equipamento: "calistenia" as const, grupoPrincipal: "triceps" as const, gruposSecundarios: [], nivel: "iniciante" as const, tipo: "composto" as const },
        ...customExs.filter(e => e.grupoPrincipal === 'triceps')
      ],
      ombros: [
        { nome: "Desenvolvimento com Halteres", equipamento: "pesos_livres" as const, grupoPrincipal: "ombros" as const, gruposSecundarios: ["triceps"], nivel: "iniciante" as const, tipo: "composto" as const },
        { nome: "Elevação Lateral", equipamento: "pesos_livres" as const, grupoPrincipal: "ombros" as const, gruposSecundarios: [], nivel: "iniciante" as const, tipo: "isolador" as const },
        { nome: "Elevação Frontal", equipamento: "pesos_livres" as const, grupoPrincipal: "ombros" as const, gruposSecundarios: [], nivel: "iniciante" as const, tipo: "isolador" as const },
        ...customExs.filter(e => e.grupoPrincipal === 'ombros')
      ],
      abdome: [
        { nome: "Abdominal Supra Solo", equipamento: "calistenia" as const, grupoPrincipal: "abdome" as const, gruposSecundarios: [], nivel: "iniciante" as const, tipo: "isolador" as const },
        { nome: "Abdominal Infra no Solo", equipamento: "calistenia" as const, grupoPrincipal: "abdome" as const, gruposSecundarios: [], nivel: "iniciante" as const, tipo: "isolador" as const },
        { nome: "Prancha Isométrica", equipamento: "calistenia" as const, grupoPrincipal: "abdome" as const, gruposSecundarios: [], nivel: "iniciante" as const, tipo: "isolador" as const },
        ...customExs.filter(e => e.grupoPrincipal === 'abdome')
      ]
    };

    const filterByEquipment = (exerciseList: any[]) => {
      return exerciseList.filter(ex => {
        if (prof.equipment.length === 0) return true;
        if (prof.equipment.includes("pesos_livres")) {
          if (ex.equipamento === "pesos_livres" || ex.equipamento === "halteres" || ex.equipamento === "barra") return true;
        }
        return prof.equipment.includes(ex.equipamento);
      });
    };

    const filterByLimitations = (exerciseList: any[]) => {
      return exerciseList.filter(ex => {
        if (prof.limitations.includes("joelhos") && ex.nome.toLowerCase().includes("agachamento")) return false;
        if (prof.limitations.includes("lombar") && ex.nome.toLowerCase().includes("curvada")) return false;
        if (prof.limitations.includes("ombros") && ex.nome.toLowerCase().includes("desenvolvimento")) return false;
        return true;
      });
    };

    const getExercisesForGroup = (group: keyof typeof exercisesDb, count: number): any[] => {
      const groupList = exercisesDb[group] || [];
      let filtered = filterByEquipment(groupList);
      filtered = filterByLimitations(filtered);
      if (filtered.length === 0) filtered = groupList;
      return filtered.slice(0, count);
    };

    const daysCount = prof.daysPerWeek;
    let routineDays: any[] = [];

    if (daysCount <= 2) {
      routineDays = [
        {
          id: "A",
          name: "Treino A - Full Body",
          exercises: [
            ...getExercisesForGroup("peito", 1),
            ...getExercisesForGroup("costas", 1),
            ...getExercisesForGroup("pernas", 1),
            ...getExercisesForGroup("ombros", 1),
            ...getExercisesForGroup("biceps", 1),
            ...getExercisesForGroup("abdome", 1)
          ]
        },
        {
          id: "B",
          name: "Treino B - Full Body",
          exercises: [
            ...getExercisesForGroup("peito", 1),
            ...getExercisesForGroup("costas", 1),
            ...getExercisesForGroup("pernas", 1),
            ...getExercisesForGroup("ombros", 1),
            ...getExercisesForGroup("triceps", 1),
            ...getExercisesForGroup("abdome", 1)
          ]
        }
      ];
    } else if (daysCount === 3) {
      routineDays = [
        {
          id: "A",
          name: "Treino A - Peito, Tríceps e Ombros",
          exercises: [
            ...getExercisesForGroup("peito", 2),
            ...getExercisesForGroup("ombros", 1),
            ...getExercisesForGroup("triceps", 2)
          ]
        },
        {
          id: "B",
          name: "Treino B - Costas, Bíceps e Abdômen",
          exercises: [
            ...getExercisesForGroup("costas", 2),
            ...getExercisesForGroup("biceps", 2),
            ...getExercisesForGroup("abdome", 1)
          ]
        },
        {
          id: "C",
          name: "Treino C - Pernas Completo",
          exercises: [
            ...getExercisesForGroup("pernas", 3),
            ...getExercisesForGroup("abdome", 1)
          ]
        }
      ];
    } else if (daysCount === 4) {
      routineDays = [
        {
          id: "A",
          name: "Treino A - Peito e Ombros",
          exercises: [
            ...getExercisesForGroup("peito", 3),
            ...getExercisesForGroup("ombros", 2)
          ]
        },
        {
          id: "B",
          name: "Treino B - Costas e Bíceps",
          exercises: [
            ...getExercisesForGroup("costas", 3),
            ...getExercisesForGroup("biceps", 2)
          ]
        },
        {
          id: "C",
          name: "Treino C - Pernas Completo",
          exercises: [
            ...getExercisesForGroup("pernas", 4)
          ]
        },
        {
          id: "D",
          name: "Treino D - Tríceps e Abdômen",
          exercises: [
            ...getExercisesForGroup("triceps", 3),
            ...getExercisesForGroup("abdome", 2)
          ]
        }
      ];
    } else if (daysCount === 5) {
      routineDays = [
        {
          id: "A",
          name: "Treino A - Peito",
          exercises: [
            ...getExercisesForGroup("peito", 4)
          ]
        },
        {
          id: "B",
          name: "Treino B - Costas",
          exercises: [
            ...getExercisesForGroup("costas", 4)
          ]
        },
        {
          id: "C",
          name: "Treino C - Pernas Completo",
          exercises: [
            ...getExercisesForGroup("pernas", 4)
          ]
        },
        {
          id: "D",
          name: "Treino D - Ombros e Abdômen",
          exercises: [
            ...getExercisesForGroup("ombros", 3),
            ...getExercisesForGroup("abdome", 2)
          ]
        },
        {
          id: "E",
          name: "Treino E - Bíceps e Tríceps",
          exercises: [
            ...getExercisesForGroup("biceps", 3),
            ...getExercisesForGroup("triceps", 3)
          ]
        }
      ];
    } else {
      routineDays = [
        {
          id: "A",
          name: "Treino A - Empurrar (Peito, Ombro, Tríceps)",
          exercises: [
            ...getExercisesForGroup("peito", 2),
            ...getExercisesForGroup("ombros", 1),
            ...getExercisesForGroup("triceps", 2)
          ]
        },
        {
          id: "B",
          name: "Treino B - Puxar (Costas, Bíceps, Abdômen)",
          exercises: [
            ...getExercisesForGroup("costas", 2),
            ...getExercisesForGroup("biceps", 2),
            ...getExercisesForGroup("abdome", 1)
          ]
        },
        {
          id: "C",
          name: "Treino C - Pernas Completo",
          exercises: [
            ...getExercisesForGroup("pernas", 3)
          ]
        }
      ];
    }

    const finalDays = routineDays.map(day => ({
      id: day.id,
      name: day.name,
      exercises: day.exercises.map((ex: any, exIdx: number) => ({
        id: `${day.id}_ex_${exIdx}`,
        exercise: ex,
        series: [
          { carga: 10, reps: 12 },
          { carga: 10, reps: 12 },
          { carga: 10, reps: 10 }
        ],
        reposoSem: 60,
        observacoes: ""
      }))
    }));

    const currentAutoSplit = (days: number) => {
      if (days <= 2) return 'Full Body A/B';
      if (days === 3) return 'ABC';
      if (days === 4) return 'ABCD';
      if (days === 5) return 'ABCDE';
      return 'Push/Pull/Legs 2x';
    };

    const newRoutine: WorkoutRoutine = {
      id: `${user.uid}_routine`,
      user_id: user.uid,
      createdAt: new Date().toISOString(),
      division: currentAutoSplit(daysCount),
      days: finalDays
    };

    setActiveRoutine(newRoutine);
    localStorage.setItem(`workout_routine_${user.uid}`, JSON.stringify(newRoutine));

    // Completely clear all manual exercise execution logs and history records for a fresh start
    setExerciseHistory([]);
    localStorage.removeItem(`workout_history_${user.uid}`);

    if (isFirebaseConfigured) {
      try {
        const routineRef = doc(db, 'workout_routines', user.uid);
        await setDoc(routineRef, newRoutine);

        // Delete all user's historical exercise execution logs in Firestore as well
        const q = query(collection(db, 'exercise_logs'), where('user_id', '==', user.uid));
        const snap = await getDocs(q);
        const batchPromises = snap.docs.map(d => deleteDoc(d.ref));
        await Promise.all(batchPromises);
      } catch (err) {
        console.error("Erro ao salvar rotina de treino ou limpar histórico no Firebase:", err);
        handleFirestoreError(err, OperationType.WRITE, `workout_routines/${user.uid}`);
      }
    }
  };

  const handleUpdateWorkoutRoutine = async (newRoutine: WorkoutRoutine) => {
    if (!user?.uid) return;
    setActiveRoutine(newRoutine);
    localStorage.setItem(`workout_routine_${user.uid}`, JSON.stringify(newRoutine));

    if (isFirebaseConfigured) {
      try {
        const routineRef = doc(db, 'workout_routines', user.uid);
        await setDoc(routineRef, newRoutine);
      } catch (err) {
        console.error("Erro ao salvar rotina de treino no Firebase:", err);
        handleFirestoreError(err, OperationType.WRITE, `workout_routines/${user.uid}`);
      }
    }
  };

  const handleLogExercise = async (logPayload: Omit<ExerciseLog, 'id'>) => {
    if (!user?.uid) return;

    const id = !isFirebaseConfigured 
      ? `log_${Date.now()}`
      : doc(collection(db, 'exercise_logs')).id;
    
    const fullLog: ExerciseLog = { id, ...logPayload };
    const updatedHistory = [fullLog, ...exerciseHistory];
    setExerciseHistory(updatedHistory);
    localStorage.setItem(`workout_history_${user.uid}`, JSON.stringify(updatedHistory));

    if (isFirebaseConfigured) {
      try {
        const logRef = doc(db, 'exercise_logs', id);
        await setDoc(logRef, logPayload);
      } catch (err) {
        console.error("Erro ao salvar log de exercício no Firebase:", err);
        handleFirestoreError(err, OperationType.WRITE, `exercise_logs/${id}`);
      }
    }

    if (workoutProfile) {
      const freshFatigue = recalculateMuscleFatigue(updatedHistory, activeRoutine);
      const updatedProfile: UserWorkoutProfile = {
        ...workoutProfile,
        muscleFatigue: freshFatigue
      };

      setWorkoutProfile(updatedProfile);
      localStorage.setItem(`workout_profile_${user.uid}`, JSON.stringify(updatedProfile));

      if (isFirebaseConfigured) {
        try {
          const profRef = doc(db, 'workout_profiles', user.uid);
          await setDoc(profRef, updatedProfile);
        } catch (err) {
          console.error("Erro ao atualizar fadiga no Firebase:", err);
          handleFirestoreError(err, OperationType.WRITE, `workout_profiles/${user.uid}`);
        }
      }
    }

    // Award NutriCoins / XP for completed workout exercise
    const todayStrStr = new Date().toISOString().split('T')[0];
    const logsToday = updatedHistory.filter(log => log.loggedAt && log.loggedAt.startsWith(todayStrStr));
    const uniqueExsToday = new Set(logsToday.map(l => l.exercicio.toLowerCase())).size;

    const logsBefore = exerciseHistory.filter(log => log.loggedAt && log.loggedAt.startsWith(todayStrStr));
    const uniqueExsBefore = new Set(logsBefore.map(l => l.exercicio.toLowerCase())).size;

    let rewardNC = 15;
    let completeBonus = false;

    if (uniqueExsBefore < 4 && uniqueExsToday === 4) {
      rewardNC += 50;
      completeBonus = true;
    }

    if (profile) {
      const finalXP = (profile.xp || 0) + rewardNC;
      const updatedProg = { ...profile, xp: finalXP };
      setProfile(updatedProg);
      if (isFirebaseConfigured) {
        try {
          const profileRef = doc(db, 'profiles', user.uid);
          await updateDoc(profileRef, { xp: finalXP });
        } catch (err) {
          console.error("Erro ao atualizar NC do treino:", err);
        }
      }
    }

    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.8 }
    });

    if (completeBonus) {
      alert(`Parabéns! Você completou um treino de 4 ou mais exercícios e conquistou +50 NutriCoins de bônus! (Total obtido: +${rewardNC} NC 🪙)`);
    } else {
      alert(`Exercício registrado com sucesso! Você ganhou +${rewardNC} NutriCoins! 🪙`);
    }
  };

  const handleDeleteWorkoutLog = async (id: string) => {
    if (!user?.uid) return;
    const updated = exerciseHistory.filter(l => l.id !== id);
    setExerciseHistory(updated);
    localStorage.setItem(`workout_history_${user.uid}`, JSON.stringify(updated));

    if (isFirebaseConfigured) {
      try {
        const logRef = doc(db, 'exercise_logs', id);
        await deleteDoc(logRef);
      } catch (err) {
        console.error("Erro ao deletar log no Firebase:", err);
        handleFirestoreError(err, OperationType.DELETE, `exercise_logs/${id}`);
      }
    }

    if (workoutProfile) {
      const freshFatigue = recalculateMuscleFatigue(updated, activeRoutine);
      const updatedProfile: UserWorkoutProfile = {
        ...workoutProfile,
        muscleFatigue: freshFatigue
      };

      setWorkoutProfile(updatedProfile);
      localStorage.setItem(`workout_profile_${user.uid}`, JSON.stringify(updatedProfile));

      if (isFirebaseConfigured) {
        try {
          const profRef = doc(db, 'workout_profiles', user.uid);
          await setDoc(profRef, updatedProfile);
        } catch (err) {
          console.error("Erro ao salvar perfil atualizado pós-deleção de log:", err);
        }
      }
    }
  };


  const getWeekDayDate = (dayNum: number) => {
    const today = new Date();
    const currentDayOfWeek = today.getDay(); // 0 is Sunday
    // Map standard weekday numbers (0-6) to Saturday-first relative indices (0-6)
    const getSatFirstIndex = (d: number) => (d === 6 ? 0 : d + 1);
    const todaySatFirstIndex = getSatFirstIndex(currentDayOfWeek);
    const targetSatFirstIndex = getSatFirstIndex(dayNum);
    const diff = targetSatFirstIndex - todaySatFirstIndex;
    const d = new Date(today);
    d.setDate(today.getDate() + diff);
    return d;
  };

  const getDayCalories = (date: Date) => {
    const dStart = new Date(date);
    dStart.setHours(0, 0, 0, 0);
    const realLogs = allFoodLogs.filter(log => {
      if (!log.logged_at) return false;
      const logDate = new Date(log.logged_at);
      logDate.setHours(0, 0, 0, 0);
      return logDate.getTime() === dStart.getTime();
    });
    return realLogs.reduce((acc, current) => acc + (current.calories || 0), 0);
  };
  const [waterAmount, setWaterAmount] = useState(0);
  const [waterGoal, setWaterGoal] = useState(2500);
  const [waterLogs, setWaterLogs] = useState<WaterLog[]>([]);
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([]);
  const [allFoodLogs, setAllFoodLogs] = useState<FoodLog[]>([]);
  const [ranking, setRanking] = useState<Profile[]>([]);
  const [showAddFood, setShowAddFood] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [expandedMeals, setExpandedMeals] = useState<Set<string>>(new Set());
  const [isEditingMeals, setIsEditingMeals] = useState(false);
  const [mealsTab, setMealsTab] = useState<'editar' | 'historico'>('editar');
  const [customMeals, setCustomMeals] = useState<{ id: string; name: string; icon: string }[]>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [showCropper, setShowCropper] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [image, setImage] = useState<string | null>(null);
  const [isCroppingFood, setIsCroppingFood] = useState(false);
  const [isModeratingImage, setIsModeratingImage] = useState(false);
  const [moderationWarning, setModerationWarning] = useState<{ isSafe: boolean; reason: string; category: string } | null>(null);
  const foodPhotoInputRef = useRef<HTMLInputElement>(null);

  const [editForm, setEditForm] = useState({
    username: '',
    email: '',
    confirmEmail: '',
    password: '',
    confirmPassword: '',
    avatar_url: '',
    full_name: '',
    cpf: '',
    whatsapp: ''
  });
  const [usernameStatus, setUsernameStatus] = useState<'available' | 'taken' | 'checking' | 'idle'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [storeConfig, setStoreConfig] = useState<StoreConfig | undefined>(undefined);

  const fetchStoreConfig = useCallback(async () => {
    try {
      const cfg = await getStoreConfig();
      setStoreConfig(cfg);
    } catch (e) {
      console.error('Error fetching store config:', e);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchStoreConfig();
    }
  }, [user, fetchStoreConfig]);

  const defaultMeals = [
    { id: 'cafe', name: 'Café da Manhã', icon: '☕' },
    { id: 'lanche_manha', name: 'Lanche da Manhã', icon: '🍎' },
    { id: 'almoco', name: 'Almoço', icon: '🍲' },
    { id: 'lanche_tarde', name: 'Lanche da Tarde', icon: '🥪' },
    { id: 'jantar', name: 'Jantar', icon: '🥗' },
    { id: 'ceia', name: 'Ceia', icon: '🥛' },
  ];

  const meals = customMeals.length > 0 ? customMeals : defaultMeals;

  useEffect(() => {
    if (profile?.custom_meals) {
      setCustomMeals(profile.custom_meals);
    }
  }, [profile]);

  useEffect(() => {
    if (!profile || !isFirebaseConfigured || allFoodLogs.length === 0) return;
    const realStreak = calculateStreakFromLogs(allFoodLogs);
    if (profile.streak !== realStreak) {
      const updateStreakDb = async () => {
        try {
          const profileRef = doc(db, 'profiles', user.uid);
          await updateDoc(profileRef, { streak: realStreak });
          setProfile(prev => prev ? { ...prev, streak: realStreak } : null);
          console.log(`Streak updated automatically from food logs: ${realStreak}`);
        } catch (err) {
          console.error("Failed to update custom streak:", err);
        }
      };
      updateStreakDb();
    }
  }, [allFoodLogs, profile?.streak, isFirebaseConfigured, user.uid, setProfile]);

  // Dynamic Daily Water Goal Calibration based on User weight (35ml of water per kg of bodyweight)
  useEffect(() => {
    const currentWeight = profile?.user_data?.weight || userData?.weight || 70;
    const computedGoal = Math.round(currentWeight * 35);
    setWaterGoal(computedGoal);
  }, [profile?.user_data?.weight, userData?.weight]);

  const updateXP = async (amount: number) => {
    if (!profile || !isFirebaseConfigured) return;
    try {
      const profileRef = doc(db, 'profiles', user.uid);
      await updateDoc(profileRef, { xp: (profile.xp || 0) + amount });
      setProfile(prev => prev ? { ...prev, xp: (prev.xp || 0) + amount } : null);
    } catch (err) {
      console.error('Error updating XP:', err);
    }
  };

  const handleSaveMeals = async (newMeals: any[]) => {
    setCustomMeals(newMeals);
    if (onSaveCustomMeals) {
      await onSaveCustomMeals(newMeals);
    } else if (isFirebaseConfigured) {
      try {
        const profileRef = doc(db, 'profiles', user.uid);
        await updateDoc(profileRef, { custom_meals: newMeals });
      } catch (err) {
        console.error('Error saving meals:', err);
      }
    }
  };

  const handleDeleteLog = async (id: string) => {
    if (!isFirebaseConfigured) {
      setFoodLogs(prev => prev.filter(log => log.id !== id));
      setAllFoodLogs(prev => prev.filter(log => log.id !== id));
      return;
    }

    try {
      const logRef = doc(db, 'food_logs', id);
      await deleteDoc(logRef);
      setFoodLogs(prev => {
        const next = prev.filter(log => log.id !== id);
        const today = getLocalDateString(selectedDate);
        localStorage.setItem(`food_logs_${user.uid}_${today}`, JSON.stringify(next));
        return next;
      });
      setAllFoodLogs(prev => {
        const next = prev.filter(log => log.id !== id);
        localStorage.setItem(`all_food_logs_${user.uid}`, JSON.stringify(next));
        return next;
      });
    } catch (err) {
      console.warn('Error deleting food log from Firebase (offline fallback applied):', err);
      setFoodLogs(prev => {
        const next = prev.filter(log => log.id !== id);
        const today = getLocalDateString(selectedDate);
        localStorage.setItem(`food_logs_${user.uid}_${today}`, JSON.stringify(next));
        return next;
      });
      setAllFoodLogs(prev => {
        const next = prev.filter(log => log.id !== id);
        localStorage.setItem(`all_food_logs_${user.uid}`, JSON.stringify(next));
        return next;
      });
    }
  };

  const toggleMealExpansion = (mealId: string) => {
    setExpandedMeals(prev => {
      const next = new Set(prev);
      if (next.has(mealId)) next.delete(mealId);
      else next.add(mealId);
      return next;
    });
  };

  useEffect(() => {
    if (!user?.uid) return;
    fetchLogs();
  }, [user, selectedDate]);

  useEffect(() => {
    if (!user?.uid) return;
    fetchRanking();
    fetchWorkoutData();
  }, [user]);

  useEffect(() => {
    if (appMode === 'workout') {
      if (!activeTab.startsWith('workout_') && activeTab !== 'profile' && activeTab !== 'admin' && activeTab !== 'store' && activeTab !== 'evolution' && activeTab !== 'ranking') {
        setActiveTab('workout_dashboard');
      }
    } else if (appMode === 'diet') {
      if (activeTab.startsWith('workout_')) {
        setActiveTab('dashboard');
      }
    }
  }, [appMode, activeTab, setActiveTab]);

  useEffect(() => {
    if (profile) {
      setEditForm({
        username: profile.username || '',
        email: user.email || '',
        confirmEmail: user.email || '',
        password: '',
        confirmPassword: '',
        avatar_url: profile.avatar_url || '',
        full_name: profile.full_name || '',
        cpf: profile.cpf || '',
        whatsapp: profile.whatsapp || ''
      });
    }
  }, [profile, user.email]);

  const fetchRanking = async () => {
    const userLeague = profile?.league || 'Bronze';
    const userXP = profile?.xp || 0;
    
    const generateBotsForLeague = (leagueName: string) => {
      return [];
    };

    if (!isFirebaseConfigured) {
      const bots = generateBotsForLeague(userLeague);
      setRanking([
        ...bots,
        { id: user.uid, username: profile?.username || 'Você', xp: userXP, league: userLeague, streak: profile?.streak || 0, avatar_url: profile?.avatar_url }
      ].sort((a, b) => b.xp - a.xp));
      return;
    }
    try {
      const profilesCol = collection(db, 'profiles');
      const q = query(profilesCol, where('league', '==', userLeague), orderBy('xp', 'desc'), limit(10));
      const querySnapshot = await getDocs(q);
      const data: Profile[] = [];
      querySnapshot.forEach((doc) => {
        data.push(doc.data() as Profile);
      });
      
      if (data.length < 10) {
        const bots = generateBotsForLeague(userLeague);
        const existingIds = new Set(data.map(p => p.id));
        const needed = 10 - data.length;
        let padded = 0;
        for (const bot of bots) {
          if (padded >= needed) break;
          if (!existingIds.has(bot.id) && bot.id !== user.uid) {
            data.push(bot as Profile);
            padded++;
          }
        }
      }
      
      if (!data.some(p => p.id === user.uid)) {
        data.push({
          id: user.uid,
          username: profile?.username || 'Você',
          xp: userXP,
          league: userLeague,
          streak: profile?.streak || 0,
          avatar_url: profile?.avatar_url
        } as Profile);
      }
      setRanking(data.sort((a, b) => b.xp - a.xp));
    } catch (err) {
      console.error('Error fetching ranking:', err);
      const bots = generateBotsForLeague(userLeague);
      setRanking([
        ...bots,
        { id: user.uid, username: profile?.username || 'Você', xp: userXP, league: userLeague, streak: profile?.streak || 0, avatar_url: profile?.avatar_url }
      ].sort((a, b) => b.xp - a.xp));
    }
  };

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<string | null> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return canvas.toDataURL('image/jpeg');
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImage(reader.result as string);
        setIsCroppingFood(false);
        setShowCropper(true);
      });
      reader.readAsDataURL(file);
    }
  };

  const onFoodFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImage(reader.result as string);
        setIsCroppingFood(true);
        setShowCropper(true);
      });
      reader.readAsDataURL(file);
    }
  };

  const handleCropSave = async () => {
    try {
      if (image && croppedAreaPixels) {
        const croppedImage = await getCroppedImg(image, croppedAreaPixels);
        if (croppedImage) {
          if (isCroppingFood) {
            setIsAnalyzing(true);
            // Simular análise de IA da foto
            setTimeout(() => {
              // setFoodInput("Refeição identificada via foto");
              setIsAnalyzing(false);
              setIsCroppingFood(false);
            }, 2000);
            setShowCropper(false);
            setImage(null);
          } else {
            setIsModeratingImage(true);
            setModerationWarning(null);
            
            // Chamar API de moderação de IA real no servidor
            const moderationResult = await moderateProfileImage(croppedImage);
            setIsModeratingImage(false);

            if (moderationResult && !moderationResult.isSafe) {
              setModerationWarning(moderationResult);
              // Não fechamos o cropper, mas mostramos o aviso para o usuário poder trocar/escolher outra
              return;
            } else {
              setEditForm(prev => ({ ...prev, avatar_url: croppedImage }));
              setShowCropper(false);
              setImage(null);
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
      setIsModeratingImage(false);
    }
  };

  useEffect(() => {
    const checkUsername = async () => {
      if (!editForm.username || editForm.username === profile?.username) {
        setUsernameStatus('idle');
        return;
      }

      if (editForm.username.length < 3) {
        setUsernameStatus('idle');
        return;
      }

      setUsernameStatus('checking');

      if (!isFirebaseConfigured) {
        setTimeout(() => {
          setUsernameStatus('available');
        }, 500);
        return;
      }

      try {
        const profilesCol = collection(db, 'profiles');
        const q = query(profilesCol, where('username', '==', editForm.username));
        const querySnapshot = await getDocs(q);
        setUsernameStatus(!querySnapshot.empty ? 'taken' : 'available');
      } catch (err) {
        console.error('Error checking username:', err);
        setUsernameStatus('idle');
      }
    };

    const debounce = setTimeout(checkUsername, 500);
    return () => clearTimeout(debounce);
  }, [editForm.username, profile?.username]);

  const normalizeMealType = (mealType: string): string => {
    const norm = (mealType || '').toLowerCase().trim();
    
    // 1. Check if it matches any custom or default meals active in the list first
    // This handles custom meals overriding standard entries correctly!
    if (meals && meals.length > 0) {
      const matchedCustom = meals.find(m => {
        const mName = m.name.toLowerCase();
        const mId = m.id.toLowerCase();
        return (
          norm === mId || 
          norm === mName ||
          mName.includes(norm) || 
          norm.includes(mName) || 
          mId.includes(norm)
        );
      });
      if (matchedCustom) {
        return matchedCustom.id;
      }
    }

    // 2. Fallbacks for standard names if not defined/matched in active list
    if (norm === 'cafe' || norm.includes('café') || norm.includes('cafe')) return 'cafe';
    if (norm === 'lanche_manha' || norm.includes('manhã') || norm.includes('manha')) return 'lanche_manha';
    if (norm === 'almoco' || norm.includes('almoço') || norm.includes('almoco') || norm.includes('almo')) return 'almoco';
    if (norm === 'lanche_tarde' || norm.includes('tarde')) return 'lanche_tarde';
    if (norm === 'jantar' || norm.includes('jantar') || norm.includes('jant')) return 'jantar';
    if (norm === 'ceia' || norm.includes('ceia')) return 'ceia';
    
    return norm || 'lanche_tarde';
  };

  const fetchLogs = async () => {
    if (!isFirebaseConfigured) {
      setFoodLogs([]);
      setAllFoodLogs([]);
      setWaterLogs([]);
      setWaterAmount(0);
      return;
    }
    // Fetch food and water logs for the selectedDate starting from local midnight
    const localTodayStr = getLocalDateString(selectedDate);
    const startOfLocalDay = new Date(selectedDate);
    startOfLocalDay.setHours(0, 0, 0, 0);
    const startOfLocalDayISO = startOfLocalDay.toISOString();

    const endOfLocalDay = new Date(selectedDate);
    endOfLocalDay.setHours(23, 59, 59, 999);
    const endOfLocalDayISO = endOfLocalDay.toISOString();

    try {
      const foodLogsCol = collection(db, 'food_logs');
      const qFood = query(
        foodLogsCol, 
        where('user_id', '==', user.uid), 
        where('logged_at', '>=', startOfLocalDayISO),
        where('logged_at', '<=', endOfLocalDayISO)
      );
      const foodSnap = await getDocs(qFood);
      const foodData: FoodLog[] = [];
      foodSnap.forEach((doc) => {
        const item = doc.data() as FoodLog;
        item.meal_type = normalizeMealType(item.meal_type);
        foodData.push(item);
      });
      setFoodLogs(foodData);
      localStorage.setItem(`food_logs_${user.uid}_${localTodayStr}`, JSON.stringify(foodData));

      // Fetch all food logs for current user to track real calendar streaks
      const qAllFood = query(foodLogsCol, where('user_id', '==', user.uid));
      const allFoodSnap = await getDocs(qAllFood);
      const allFoodData: FoodLog[] = [];
      allFoodSnap.forEach((doc) => {
        const item = doc.data() as FoodLog;
        item.meal_type = normalizeMealType(item.meal_type);
        allFoodData.push(item);
      });
      setAllFoodLogs(allFoodData);
      localStorage.setItem(`all_food_logs_${user.uid}`, JSON.stringify(allFoodData));

      const waterLogsCol = collection(db, 'water_logs');
      const qWater = query(
        waterLogsCol, 
        where('user_id', '==', user.uid), 
        where('logged_at', '>=', startOfLocalDayISO),
        where('logged_at', '<=', endOfLocalDayISO)
      );
      const waterSnap = await getDocs(qWater);
      let total = 0;
      const waterData: WaterLog[] = [];
      waterSnap.forEach((doc) => {
        const data = doc.data() as WaterLog;
        total += data.amount_ml;
        waterData.push(data);
      });
      waterData.sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime());
      setWaterLogs(waterData);
      setWaterAmount(total);
      localStorage.setItem(`water_logs_${user.uid}_${localTodayStr}`, JSON.stringify(waterData));
    } catch (err: any) {
      const isOfflineErr = err instanceof Error && (err.message.toLowerCase().includes('offline') || err.message.toLowerCase().includes('unavailable') || !navigator.onLine);
      if (isOfflineErr) {
        console.warn('Firebase backend not reachable (offline/unavailable), utilizing local storage backup for logs.');
      } else {
        console.error('Error fetching logs from Firebase, trying local storage fallback:', err);
      }
      const cachedFoods = localStorage.getItem(`food_logs_${user.uid}_${localTodayStr}`);
      const cachedAllFoods = localStorage.getItem(`all_food_logs_${user.uid}`);
      const cachedWater = localStorage.getItem(`water_logs_${user.uid}_${localTodayStr}`);
      if (cachedFoods) {
        try {
          const parsed = JSON.parse(cachedFoods).map((item: FoodLog) => {
            item.meal_type = normalizeMealType(item.meal_type);
            return item;
          });
          setFoodLogs(parsed);
        } catch (_) {}
      }
      if (cachedAllFoods) {
        try {
          const parsedAll = JSON.parse(cachedAllFoods).map((item: FoodLog) => {
            item.meal_type = normalizeMealType(item.meal_type);
            return item;
          });
          setAllFoodLogs(parsedAll);
        } catch (_) {}
      }
      if (cachedWater) {
        try {
          const parsedWater = JSON.parse(cachedWater);
          let total = 0;
          parsedWater.forEach((data: WaterLog) => {
            total += data.amount_ml;
          });
          setWaterLogs(parsedWater);
          setWaterAmount(total);
        } catch (_) {}
      }
    }
  };

  const handleAddWater = async (amount: number, addedVia?: string) => {
    const waterId = Math.random().toString(36).substring(2, 15);
    const newLog: WaterLog = {
      id: waterId,
      user_id: user.uid,
      amount_ml: amount,
      logged_at: getLogDateWithCurrentTime(),
      ...(addedVia ? { added_via: addedVia } : {})
    };

    const newAmount = waterAmount + amount;
    const today = getLocalDateString(selectedDate);

    // Confetti blast when the goal is reached
    if (newAmount >= waterGoal && waterAmount < waterGoal) {
      try {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
      } catch (e) {
        console.error("Confetti error:", e);
      }
    }

    if (!isFirebaseConfigured) {
      setWaterLogs(prev => [newLog, ...prev]);
      setWaterAmount(newAmount);
      return;
    }
    try {
      const waterRef = doc(db, 'water_logs', waterId);
      await setDoc(waterRef, newLog);
      setWaterLogs(prev => {
        const next = [newLog, ...prev];
        localStorage.setItem(`water_logs_${user.uid}_${today}`, JSON.stringify(next));
        return next;
      });
      setWaterAmount(newAmount);
    } catch (err) {
      console.warn('Error adding water to Firebase (using fallback):', err);
      setWaterLogs(prev => {
        const next = [newLog, ...prev];
        localStorage.setItem(`water_logs_${user.uid}_${today}`, JSON.stringify(next));
        return next;
      });
      setWaterAmount(newAmount);
    }
  };

  const handleDeleteWater = async (id: string) => {
    const logToDelete = waterLogs.find(log => log.id === id);
    if (!logToDelete) return;

    const newAmount = Math.max(0, waterAmount - logToDelete.amount_ml);
    const today = getLocalDateString(selectedDate);

    if (!isFirebaseConfigured) {
      setWaterLogs(prev => prev.filter(log => log.id !== id));
      setWaterAmount(newAmount);
      return;
    }

    try {
      const waterRef = doc(db, 'water_logs', id);
      await deleteDoc(waterRef);
      setWaterLogs(prev => {
        const next = prev.filter(log => log.id !== id);
        localStorage.setItem(`water_logs_${user.uid}_${today}`, JSON.stringify(next));
        return next;
      });
      setWaterAmount(newAmount);
    } catch (err) {
      console.warn('Error deleting water doc from Firebase (using fallback):', err);
      setWaterLogs(prev => {
        const next = prev.filter(log => log.id !== id);
        localStorage.setItem(`water_logs_${user.uid}_${today}`, JSON.stringify(next));
        return next;
      });
      setWaterAmount(newAmount);
    }
  };


  const handleSaveProfile = async () => {
    if (editForm.email !== editForm.confirmEmail) {
      alert('Os e-mails não coincidem!');
      return;
    }
    if (editForm.password && editForm.password !== editForm.confirmPassword) {
      alert('As senhas não coincidem!');
      return;
    }
    if (usernameStatus === 'taken') {
      alert('Este nome de usuário já está em uso!');
      return;
    }

    if (!isFirebaseConfigured) {
      setProfile(prev => prev ? { 
        ...prev, 
        username: editForm.username, 
        avatar_url: editForm.avatar_url,
        full_name: editForm.full_name,
        cpf: editForm.cpf,
        whatsapp: editForm.whatsapp
      } : null);
      setSaveStatus('success');
      setTimeout(() => {
        setIsEditingProfile(false);
        setSaveStatus('idle');
      }, 2000);
      return;
    }
    try {
      setSaveStatus('loading');
      
      // Update profile in Firestore
      const profileRef = doc(db, 'profiles', user.uid);
      await updateDoc(profileRef, { 
        username: editForm.username, 
        avatar_url: editForm.avatar_url,
        full_name: editForm.full_name,
        cpf: editForm.cpf,
        whatsapp: editForm.whatsapp
      });
      
      if (editForm.email !== user.email) {
        if (auth.currentUser) {
          await updateEmail(auth.currentUser, editForm.email);
        }
      }
      
      if (editForm.password) {
        if (auth.currentUser) {
          await updatePassword(auth.currentUser, editForm.password);
        }
      }

      setProfile(prev => prev ? { 
        ...prev, 
        username: editForm.username, 
        avatar_url: editForm.avatar_url,
        full_name: editForm.full_name,
        cpf: editForm.cpf,
        whatsapp: editForm.whatsapp
      } : null);
      setSaveStatus('success');
      setTimeout(() => {
        setIsEditingProfile(false);
        setSaveStatus('idle');
      }, 2000);
    } catch (err: any) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
      alert('Erro ao atualizar perfil: ' + err.message);
    }
  };
  const handleAddFood = async (input: string) => {
    if (!input || !selectedMeal) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeFoodInput(input);
      if (result && result.foods && result.foods.length > 0) {
        const newLogs: FoodLog[] = result.foods.map((food) => {
          const logId = Math.random().toString(36).substring(2, 15);
          
          let unitGrams = 100;
          const uLower = (food.unit || "").toLowerCase().trim();
          if (uLower === "gramas" || uLower === "mililitros") {
            unitGrams = 1;
          } else {
            unitGrams = food.grams_per_unit || 50;
          }

          const totalGrams = (food.amount || 1) * unitGrams;
          const amountFactor = totalGrams / 100;

          return {
            id: logId,
            user_id: user.uid,
            meal_type: selectedMeal,
            food_name: food.food_name,
            calories: Math.round(food.calories_per_100 * amountFactor),
            protein: Math.round(food.protein_per_100 * amountFactor),
            carbs: Math.round(food.carbs_per_100 * amountFactor),
            fat: Math.round(food.fat_per_100 * amountFactor),
            amount: food.amount || 1,
            unit: food.unit || 'gramas',
            logged_at: getLogDateWithCurrentTime()
          };
        });

        if (!isFirebaseConfigured) {
          setFoodLogs(prev => [...prev, ...newLogs]);
          setAllFoodLogs(prev => [...prev, ...newLogs]);
          setShowAddFood(false);
          return;
        }

        try {
          const promises = newLogs.map(async (newLog) => {
            const logRef = doc(db, 'food_logs', newLog.id);
            await setDoc(logRef, newLog);
          });
          await Promise.all(promises);

          setFoodLogs(prev => {
            const next = [...prev, ...newLogs];
            const today = getLocalDateString(selectedDate);
            localStorage.setItem(`food_logs_${user.uid}_${today}`, JSON.stringify(next));
            return next;
          });
          setAllFoodLogs(prev => {
            const next = [...prev, ...newLogs];
            localStorage.setItem(`all_food_logs_${user.uid}`, JSON.stringify(next));
            return next;
          });
          setShowAddFood(false);
        } catch (err) {
          console.warn('Error adding food to Firebase (offline fallback applied):', err);
          setFoodLogs(prev => {
            const next = [...prev, ...newLogs];
            const today = getLocalDateString(selectedDate);
            localStorage.setItem(`food_logs_${user.uid}_${today}`, JSON.stringify(next));
            return next;
          });
          setAllFoodLogs(prev => {
            const next = [...prev, ...newLogs];
            localStorage.setItem(`all_food_logs_${user.uid}`, JSON.stringify(next));
            return next;
          });
          setShowAddFood(false);
        }
      }
    } catch (err) {
      console.error('Error adding food:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const executeAssistantActions = async (actions: any[], addedVia?: string) => {
    if (!actions || actions.length === 0) return;
    
    const today = getLocalDateString(selectedDate);
    const newFoodLogs: FoodLog[] = [];
    
    for (const act of actions) {
      if (act.type === 'ADD_WATER' && act.amount_ml) {
        await handleAddWater(Number(act.amount_ml), addedVia || 'chat');
      } 
      else if (act.type === 'ADD_FOOD') {
        const logId = Math.random().toString(36).substring(2, 15);
        
        // Match meal name based on provided parameter and normalize to lowercase ID (e.g. 'almoco')
        const mealName = normalizeMealType(act.meal_type || 'Lanche da Tarde');
        
        const newLog: FoodLog = {
          id: logId,
          user_id: user.uid,
          meal_type: mealName,
          food_name: act.food_name || 'Alimento',
          calories: Number(act.calories) || 0,
          protein: Number(act.protein) || 0,
          carbs: Number(act.carbs) || 0,
          fat: Number(act.fat) || 0,
          amount: Number(act.amount) || 1,
          unit: act.unit || 'unidade',
          logged_at: getLogDateWithCurrentTime(),
          added_via: addedVia || 'chat'
        };
        
        newFoodLogs.push(newLog);
        
        if (isFirebaseConfigured) {
          try {
            await setDoc(doc(db, 'food_logs', logId), newLog);
          } catch (e) {
            console.error("Error setting doc directly in assistant execution:", e);
          }
        }
      } 
      else if (act.type === 'DELETE_FOOD' && act.food_name) {
        const normalizedTarget = act.food_name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        
        const currentLogs = [...foodLogs];
        const matchLogs = currentLogs.filter(log => {
          const lName = log.food_name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          const nameMatches = lName.includes(normalizedTarget);
          
          if (act.meal_type) {
            const mType = normalizeMealType(act.meal_type);
            const logType = normalizeMealType(log.meal_type);
            return nameMatches && (logType === mType);
          }
          
          return nameMatches;
        });
        
        if (matchLogs.length > 0) {
          for (const m of matchLogs) {
            if (isFirebaseConfigured) {
              try {
                await deleteDoc(doc(db, 'food_logs', m.id));
              } catch (e) {
                console.error("Error deleting doc in assistant execution:", e);
              }
            }
          }
          
          setFoodLogs(prev => {
            const next = prev.filter(p => !matchLogs.some(m => m.id === p.id));
            localStorage.setItem(`food_logs_${user.uid}_${today}`, JSON.stringify(next));
            return next;
          });
          setAllFoodLogs(prev => {
            const next = prev.filter(p => !matchLogs.some(m => m.id === p.id));
            localStorage.setItem(`all_food_logs_${user.uid}`, JSON.stringify(next));
            return next;
          });
        }
      }
    }
    
    if (newFoodLogs.length > 0) {
      setFoodLogs(prev => {
        const next = [...prev, ...newFoodLogs];
        localStorage.setItem(`food_logs_${user.uid}_${today}`, JSON.stringify(next));
        return next;
      });
      setAllFoodLogs(prev => {
        const next = [...prev, ...newFoodLogs];
        localStorage.setItem(`all_food_logs_${user.uid}`, JSON.stringify(next));
        return next;
      });
      
      updateXP(20 * newFoodLogs.length);
    }
  };

  const getRemainingDays = () => {
    const now = new Date();
    const day = now.getDay(); // 0 is Sunday, 6 is Saturday
    const remaining = 6 - day;
    if (remaining === 0) return "Termina hoje";
    if (remaining === 1) return "1 dia";
    return `${remaining} dias`;
  };

  const totalCalories = foodLogs.reduce((sum, log) => sum + log.calories, 0);
  const targetCalories = dietPlan?.targetCalories || 2500;

  const totalProtein = foodLogs.reduce((sum, log) => sum + log.protein, 0);
  const totalCarbs = foodLogs.reduce((sum, log) => sum + log.carbs, 0);
  const totalFat = foodLogs.reduce((sum, log) => sum + log.fat, 0);

  const targetProtein = dietPlan?.macros.protein || 150;
  const targetCarbs = dietPlan?.macros.carbs || 250;
  const targetFat = dietPlan?.macros.fat || 70;

  const checkAndRewardDailyGoals = useCallback(async () => {
    if (!profile) return;
    
    const todayStr = getLocalDateString();
    const rewarded = { ...(profile.rewarded_goals_today || {}) };
    
    if (rewarded.date !== todayStr) {
      rewarded.date = todayStr;
      rewarded.calories = false;
      rewarded.protein = false;
      rewarded.carbs = false;
      rewarded.fat = false;
      rewarded.water = false;
    }
    
    let ncToAward = 0;
    const newRewardedState = { ...rewarded };
    
    const hitsCal = Math.abs(totalCalories - targetCalories) <= 100 && totalCalories > 0;
    if (hitsCal && !rewarded.calories) {
      ncToAward += 30;
      newRewardedState.calories = true;
    }
    
    const hitsProt = totalProtein >= (targetProtein * 0.9) && totalProtein > 0;
    if (hitsProt && !rewarded.protein) {
      ncToAward += 25;
      newRewardedState.protein = true;
    }
    
    const hitsCarbs = Math.abs(totalCarbs - targetCarbs) <= (targetCarbs * 0.15) && totalCarbs > 0;
    if (hitsCarbs && !rewarded.carbs) {
      ncToAward += 15;
      newRewardedState.carbs = true;
    }
    
    const hitsFat = Math.abs(totalFat - targetFat) <= (targetFat * 0.15) && totalFat > 0;
    if (hitsFat && !rewarded.fat) {
      ncToAward += 15;
      newRewardedState.fat = true;
    }
    
    const hitsWater = waterAmount >= waterGoal && waterAmount > 0;
    if (hitsWater && !rewarded.water) {
      ncToAward += 15;
      newRewardedState.water = true;
    }
    
    if (ncToAward > 0) {
      const finalXP = (profile.xp || 0) + ncToAward;
      const updatedProfile = {
        ...profile,
        xp: finalXP,
        rewarded_goals_today: newRewardedState
      };
      
      if (isFirebaseConfigured) {
        try {
          const profileRef = doc(db, 'profiles', user.uid);
          await updateDoc(profileRef, {
            xp: finalXP,
            rewarded_goals_today: newRewardedState
          });
        } catch (err) {
          console.error("Error saving daily goal reward:", err);
        }
      }
      setProfile(updatedProfile);
      
      try {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.7 }
        });
      } catch (e) {}
      
      alert(`Sensacional! Você atingiu metas diárias e conquistou +${ncToAward} NutriCoins! 🪙`);
    }
  }, [profile, totalCalories, targetCalories, totalProtein, targetProtein, totalCarbs, targetCarbs, totalFat, targetFat, waterAmount, waterGoal, user.uid, setProfile]);

  useEffect(() => {
    if (profile && (foodLogs.length > 0 || waterAmount > 0)) {
      const timer = setTimeout(() => {
        checkAndRewardDailyGoals();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [foodLogs, waterAmount, checkAndRewardDailyGoals, profile]);

  const macroData = [
    { name: 'Proteína', value: totalProtein * 4 },
    { name: 'Carboidratos', value: totalCarbs * 4 },
    { name: 'Gorduras', value: totalFat * 9 },
  ];

  const COLORS = ['#9333ea', '#06b6d4', '#f59e0b'];

  if (loadingProfile && !profile) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      {/* Top Bar */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-40 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              onClick={() => setActiveTab('profile')}
              className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 overflow-hidden flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold border-2 border-white dark:border-slate-800 shadow-sm cursor-pointer hover:opacity-85 active:scale-95 transition-all"
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                profile?.username?.[0]?.toUpperCase() || 'U'
              )}
            </div>
            <div>
              <h2 className="text-sm font-bold dark:text-white">Olá, {profile?.username || 'Usuário'}</h2>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                  <Trophy size={10} /> {profile?.league || 'Bronze'}
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-purple-500 bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded-full">
                  <TrendingUp size={10} /> {profile?.xp || 0} NC
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setActiveTab('ranking')}
              className={`flex flex-col items-center gap-0.5 transition-all text-center ${
                activeTab === 'ranking' 
                  ? 'text-purple-600 dark:text-cyan-400' 
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
              title="Classificação / Ranking"
            >
              <Trophy size={22} className={activeTab === 'ranking' ? 'text-purple-600 dark:text-cyan-400' : 'text-amber-500'} />
              <span className="text-[9px] font-bold uppercase tracking-wider">Ranking</span>
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowStreakMenu(!showStreakMenu)}
              className={`flex items-center gap-1.5 font-bold px-3 py-1.5 rounded-full cursor-pointer transition-colors border ${
                showStreakMenu 
                  ? 'bg-orange-100/80 dark:bg-orange-950/40 text-orange-600 dark:text-orange-450 border-orange-200/50 dark:border-orange-900/40' 
                  : 'text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/20 border-transparent hover:border-orange-100/50 dark:hover:border-orange-950/40'
              }`}
            >
              <Flame size={20} className="fill-orange-500 animate-pulse" />
              <span>{profile?.streak || 0} {profile?.streak === 1 ? 'dia' : 'dias'}</span>
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onLogout} 
              className="p-2 text-slate-400 hover:text-red-500 transition-colors"
            >
              <LogOut size={20} />
            </motion.button>
          </div>
        </div>
      </header>

      {/* Streak Dropdown Menu */}
      <AnimatePresence>
        {showStreakMenu && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-md relative z-30"
          >
            {/* Hidden SVG Definitions for shirt-grad */}
            <svg width="0" height="0" className="absolute pointer-events-none">
              <defs>
                <linearGradient id="shirt-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#f97316" />
                </linearGradient>
              </defs>
            </svg>

            <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col items-center gap-6">
              {/* Segmented Control Selector */}
              <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-full w-full max-w-[280px] relative">
                <button
                  type="button"
                  onClick={() => setStreakTab('week')}
                  className={`flex-1 py-1.5 text-xs font-black rounded-full transition-all relative z-10 cursor-pointer ${
                    streakTab === 'week' 
                      ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-sm' 
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  Semana
                </button>
                <button
                  type="button"
                  onClick={() => setStreakTab('month')}
                  className={`flex-1 py-1.5 text-xs font-black rounded-full transition-all relative z-10 cursor-pointer ${
                    streakTab === 'month' 
                      ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-sm' 
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  Mês Completo
                </button>
              </div>

              {/* Weeks view / Months view inside a clean card */}
              <div className="w-full max-w-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-5 shadow-sm">
                {streakTab === 'week' ? (
                  <div className="flex justify-between items-center gap-2">
                    {(() => {
                      const todayIndex = new Date().getDay();
                      const daysData = [
                        { label: 'Sáb', dayNum: 6 },
                        { label: 'Dom', dayNum: 0 },
                        { label: 'Seg', dayNum: 1 },
                        { label: 'Ter', dayNum: 2 },
                        { label: 'Qua', dayNum: 3 },
                        { label: 'Qui', dayNum: 4 },
                        { label: 'Sex', dayNum: 5 }
                      ];

                      return daysData.map((day, idx) => {
                        const cellDate = getWeekDayDate(day.dayNum);
                        
                        // Check if it's the selected date
                        const isSelected = cellDate.getDate() === selectedDate.getDate() &&
                                           cellDate.getMonth() === selectedDate.getMonth() &&
                                           cellDate.getFullYear() === selectedDate.getFullYear();

                        // Check if it's today
                        const isToday = day.dayNum === todayIndex;
                        
                        let isCompleted = false;
                        let isFuture = false;

                        const todayRowIdx = daysData.findIndex(d => d.dayNum === todayIndex);
                        
                        if (idx > todayRowIdx) {
                          isFuture = true;
                        } else {
                          isCompleted = allFoodLogs.some(log => {
                            if (!log.logged_at) return false;
                            const logDate = new Date(log.logged_at);
                            logDate.setHours(0, 0, 0, 0);
                            const cellDateTime = new Date(cellDate);
                            cellDateTime.setHours(0, 0, 0, 0);
                            return logDate.getTime() === cellDateTime.getTime();
                          });
                        }

                        return (
                          <div 
                            key={idx} 
                            onClick={() => setSelectedDate(cellDate)}
                            className={`flex flex-col items-center gap-2 flex-1 cursor-pointer py-2 px-1 rounded-2xl transition-all ${
                              isSelected 
                                ? 'bg-orange-500/10 border border-orange-200/50' 
                                : 'border border-transparent hover:bg-slate-100/50 dark:hover:bg-slate-800/30'
                            }`}
                          >
                            <span className={`text-[10px] font-black tracking-wider uppercase ${
                              isSelected 
                                ? 'text-orange-500' 
                                : isToday 
                                  ? 'text-purple-600 dark:text-purple-400 font-extrabold' 
                                  : isFuture 
                                    ? 'text-slate-300 dark:text-slate-600' 
                                    : 'text-slate-500 dark:text-slate-400'
                            }`}>
                              {day.label}
                            </span>

                            {isCompleted ? (
                              <div className="w-9 h-9 relative flex items-center justify-center filter drop-shadow-md select-none">
                                <Utensils 
                                  size={34} 
                                  style={{ fill: 'url(#shirt-grad)', stroke: '#ffffff', strokeWidth: 1.5 }} 
                                />
                                <div className="absolute inset-0 flex items-center justify-center pt-1 pointer-events-none">
                                  <Check className="text-white fill-white stroke-[4]" size={10} />
                                </div>
                              </div>
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700/60">
                                <div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    {/* Month Selector header */}
                    <div className="flex justify-between items-center w-full mb-4 px-1">
                      <button
                        type="button"
                        onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1))}
                        className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span className="font-extrabold text-xs uppercase tracking-widest text-slate-800 dark:text-slate-200">
                        {["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"][calendarViewDate.getMonth()]} {calendarViewDate.getFullYear()}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1))}
                        className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>

                    {/* Calendar Grid Header */}
                    <div className="grid grid-cols-7 gap-1 w-full text-center border-b border-slate-200 dark:border-slate-800/80 pb-2 mb-2">
                      {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((lbl, i) => (
                        <span key={i} className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">
                          {lbl}
                        </span>
                      ))}
                    </div>

                    {/* Calendar Days */}
                    <div className="grid grid-cols-7 gap-y-2 gap-x-1 w-full">
                      {(() => {
                        const year = calendarViewDate.getFullYear();
                        const month = calendarViewDate.getMonth();
                        const firstDayOfMonth = new Date(year, month, 1).getDay();
                        const daysInMonth = new Date(year, month + 1, 0).getDate();
                        
                        const calendarDays = [];
                        for (let i = 0; i < firstDayOfMonth; i++) {
                          calendarDays.push(null);
                        }
                        for (let d = 1; d <= daysInMonth; d++) {
                          calendarDays.push(d);
                        }

                        return calendarDays.map((d, idx) => {
                          if (d === null) {
                            return <div key={`empty-${idx}`} className="w-8 h-8" />;
                          }
                          
                          const cellDate = new Date(year, month, d);
                          cellDate.setHours(0, 0, 0, 0);

                          const isSelected = cellDate.getDate() === selectedDate.getDate() &&
                                             cellDate.getMonth() === selectedDate.getMonth() &&
                                             cellDate.getFullYear() === selectedDate.getFullYear();

                          const isCompleted = allFoodLogs.some(log => {
                            if (!log.logged_at) return false;
                            const logDate = new Date(log.logged_at);
                            logDate.setHours(0, 0, 0, 0);
                            return logDate.getTime() === cellDate.getTime();
                          });

                          return (
                            <div 
                              key={`day-${d}`} 
                              onClick={() => setSelectedDate(cellDate)}
                              className={`flex items-center justify-center w-8 h-8 relative cursor-pointer rounded-full transition-all ${
                                isSelected 
                                  ? 'bg-orange-500 text-white shadow-sm font-black' 
                                  : isCompleted 
                                    ? 'bg-orange-100 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 hover:bg-orange-200' 
                                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350'
                              }`}
                            >
                              <span className="text-xs font-bold">{d}</span>
                              {isCompleted && !isSelected && (
                                <div className="absolute bottom-1 w-1 h-1 rounded-full bg-orange-500" />
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Active Selected Date Banner */}
        {(() => {
          const today = new Date();
          const isToday = selectedDate.getDate() === today.getDate() &&
                          selectedDate.getMonth() === today.getMonth() &&
                          selectedDate.getFullYear() === today.getFullYear();

          if (isToday) return null;

          return (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-250 rounded-2xl p-4 flex items-center justify-between shadow-sm"
            >
              <div className="flex items-center gap-2">
                <CalendarIcon size={18} className="text-amber-600 dark:text-amber-400" />
                <span className="text-sm font-medium">
                  Você está visualizando e editando o dia{" "}
                  <strong className="font-extrabold text-amber-700 dark:text-amber-300">
                    {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </strong>.
                </span>
              </div>
              <button
                onClick={() => setSelectedDate(new Date())}
                className="text-xs font-black bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
              >
                Voltar para Hoje
              </button>
            </motion.div>
          );
        })()}

        {activeTab === 'dashboard' && (
          <>
            <SummaryHeader 
              totalCalories={totalCalories}
              targetCalories={targetCalories}
              totalProtein={totalProtein}
              targetProtein={targetProtein}
              totalCarbs={totalCarbs}
              targetCarbs={targetCarbs}
              totalFat={totalFat}
              targetFat={targetFat}
              macroData={macroData}
              COLORS={COLORS}
            />

            <WaterTracker 
              waterAmount={waterAmount}
              waterGoal={waterGoal}
              setWaterGoal={setWaterGoal}
              handleAddWater={handleAddWater}
              waterLogs={waterLogs}
              onDeleteWater={handleDeleteWater}
            />

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold dark:text-white">Refeições</h3>
                <div className="flex gap-2">
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (mealsTab === 'editar') {
                        setIsEditingMeals(true);
                      } else {
                        setMealsTab('editar');
                      }
                    }}
                    className={`text-sm font-bold flex items-center gap-1 bg-purple-50 dark:bg-purple-900/20 px-3 py-1.5 rounded-xl border transition-all ${
                      mealsTab === 'editar' 
                        ? 'text-purple-600 border-purple-200 dark:border-purple-800/40 shadow-sm' 
                        : 'text-slate-650 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800'
                    }`}
                  >
                    <Edit2 size={16} /> Editar
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setMealsTab('historico')}
                    className={`text-sm font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all ${
                      mealsTab === 'historico' 
                        ? 'text-purple-600 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800/40 shadow-sm' 
                        : 'text-slate-650 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800'
                    }`}
                  >
                    <CalendarIcon size={16} /> Histórico
                  </motion.button>
                </div>
              </div>

              {mealsTab === 'editar' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                  {meals.map(meal => (
                    <MealCard 
                      key={meal.id}
                      meal={meal}
                      mealLogs={foodLogs.filter(log => log.meal_type === meal.id)}
                      isExpanded={expandedMeals.has(meal.id)}
                      onToggleExpand={toggleMealExpansion}
                      onAddFood={(id) => { setSelectedMeal(id); setShowAddFood(true); }}
                      onDeleteLog={handleDeleteLog}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[2.5rem] shadow-xl shadow-purple-500/5 border border-slate-100 dark:border-slate-800 space-y-4">
                  <div className="flex items-center gap-1.5 text-xs font-black text-slate-400 uppercase tracking-widest mb-1">
                    <Clock size={12} className="text-purple-500" />
                    <span>Registros de Hoje ({foodLogs.length})</span>
                  </div>

                  {foodLogs.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 font-medium text-xs">
                      Nenhuma refeição registrada hoje.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1 no-scrollbar">
                      {[...foodLogs]
                        .sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime())
                        .map((log) => (
                          <div 
                            key={log.id}
                            className="flex items-center justify-between py-2 px-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100/60 dark:border-slate-800/40 group hover:border-purple-200/50 dark:hover:border-purple-900/30 transition-all"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                              <div className="flex flex-col text-left">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{formatFoodName(log.food_name)}</span>
                                <span className="text-[9px] font-medium text-slate-400 flex items-center gap-0.5">
                                  <Clock size={9} /> {formatTime(log.logged_at)}
                                  <span className="text-slate-300 dark:text-slate-600 mx-0.5">•</span>
                                  <span>{log.amount} {log.unit || 'g'}</span>
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-black text-purple-600 dark:text-purple-400">
                                {log.calories} kcal
                              </span>
                              <button 
                                onClick={() => handleDeleteLog(log.id)}
                                className="text-slate-300 hover:text-red-500 transition-colors p-1"
                                title="Excluir Registro"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          </>
        )}

        {activeTab === 'ranking' && (
          <RankingTab 
            profile={profile}
            setProfile={setProfile}
            ranking={ranking}
            setRanking={setRanking}
            user={user}
            getRemainingDays={getRemainingDays}
          />
        )}

        {activeTab === 'weekly' && (
          <WeeklyPlanTab 
            dietPlan={dietPlan}
            activePlanDay={activePlanDay}
            setActivePlanDay={setActivePlanDay}
            setStep={setStep}
            onRegenerate={onRegenerate}
            onRegenerateFood={onRegenerateFood}
            formatMeasure={formatMeasure}
            onPrint={onPrint}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileTab 
            profile={profile}
            user={user}
            editForm={editForm}
            setEditForm={setEditForm}
            isEditingProfile={isEditingProfile}
            setIsEditingProfile={setIsEditingProfile}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            showConfirmPassword={showConfirmPassword}
            setShowConfirmPassword={setShowConfirmPassword}
            usernameStatus={usernameStatus}
            saveStatus={saveStatus}
            onFileChange={onFileChange}
            fileInputRef={fileInputRef}
            handleSaveProfile={handleSaveProfile}
            userData={userData}
            onUpdateBiometrics={onUpdateBiometrics}
            setActiveTab={setActiveTab}
            onLogout={onLogout}
            setProfile={setProfile}
            exerciseHistory={exerciseHistory}
            waterAmount={waterAmount}
            waterGoal={waterGoal}
          />
        )}

        {activeTab === 'store' && (
          <StoreTab 
            profile={profile}
            setProfile={setProfile}
            user={user}
            storeConfig={storeConfig}
          />
        )}

        {activeTab === 'recipes' && (
          <RecipesTab 
            user={user}
            profile={profile}
            setProfile={setProfile}
            storeConfig={storeConfig}
          />
        )}

        {activeTab === 'evolution' && (
          <EvolutionTab 
            user={user}
            profile={profile}
            setProfile={setProfile}
            userData={userData}
          />
        )}

        {activeTab === 'workout_dashboard' && (
          <WorkoutDashboard 
            profile={profile}
            workoutProfile={workoutProfile}
            userData={userData}
            onNavigateToTab={setActiveTab}
            exerciseHistory={exerciseHistory}
            onDeleteLog={handleDeleteWorkoutLog}
          />
        )}

        {activeTab === 'workout_ficha' && (
          <WorkoutFicha 
            user={user}
            profile={profile}
            userData={userData}
            workoutProfile={workoutProfile}
            onSaveWorkoutProfile={handleSaveWorkoutProfile}
            onGenerateWorkoutRoutine={handleGenerateWorkoutRoutine}
            currentRoutine={activeRoutine}
            onUpdateWorkoutRoutine={handleUpdateWorkoutRoutine}
          />
        )}

        {activeTab === 'workout_today' && (
          <WorkoutToday 
            profile={profile}
            workoutProfile={workoutProfile}
            userData={userData}
            currentRoutine={activeRoutine}
            onLogExercise={handleLogExercise}
            exerciseHistory={exerciseHistory}
          />
        )}

        {activeTab === 'workout_history' && (
          <WorkoutHistory 
            exerciseHistory={exerciseHistory}
            onDeleteLog={handleDeleteWorkoutLog}
          />
        )}

        {activeTab === 'admin' && isAdmin && (
          <AdminTab 
            user={user}
            profile={profile}
            setProfile={setProfile}
            storeConfig={storeConfig}
            onStoreConfigUpdated={fetchStoreConfig}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 px-4 py-3 z-50">
        <div className={`max-w-md mx-auto flex items-center justify-between ${isAdmin ? 'gap-2' : ''}`}>
          {appMode === 'workout' ? (
            <>
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setActiveTab('workout_dashboard')}
                className={`flex flex-col items-center gap-1 ${activeTab === 'workout_dashboard' ? 'text-cyan-500' : 'text-slate-400'}`}
              >
                <LayoutDashboard size={22} />
                <span className="text-[9px] font-bold uppercase">Início</span>
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setActiveTab('workout_today')}
                className={`flex flex-col items-center gap-1 ${activeTab === 'workout_today' ? 'text-cyan-500' : 'text-slate-400'}`}
              >
                <Dumbbell size={22} />
                <span className="text-[9px] font-bold uppercase">Treinar</span>
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setActiveTab('workout_ficha')}
                className={`flex flex-col items-center gap-1 ${activeTab === 'workout_ficha' ? 'text-cyan-500' : 'text-slate-400'}`}
              >
                <Sliders size={22} />
                <span className="text-[9px] font-bold uppercase">Ficha</span>
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setActiveTab('store')}
                className={`flex flex-col items-center gap-1 ${activeTab === 'store' ? 'text-cyan-500' : 'text-slate-400'}`}
              >
                <Coins size={22} />
                <span className="text-[9px] font-bold uppercase">Loja</span>
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setActiveTab('evolution')}
                className={`flex flex-col items-center gap-1 ${activeTab === 'evolution' ? 'text-cyan-500' : 'text-slate-400'}`}
              >
                <TrendingUp size={22} />
                <span className="text-[9px] font-bold uppercase">Evolução</span>
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setActiveTab('profile')}
                className={`flex flex-col items-center gap-1 ${activeTab === 'profile' ? 'text-cyan-500' : 'text-slate-400'}`}
              >
                <UserIcon size={22} />
                <span className="text-[9px] font-bold uppercase">Perfil</span>
              </motion.button>
            </>
          ) : (
            <>
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setActiveTab('dashboard')}
                className={`flex flex-col items-center gap-1 ${activeTab === 'dashboard' ? 'text-purple-600' : 'text-slate-400'}`}
              >
                <LayoutDashboard size={22} />
                <span className="text-[9px] font-bold uppercase">Início</span>
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setActiveTab('weekly')}
                className={`flex flex-col items-center gap-1 ${activeTab === 'weekly' ? 'text-purple-600' : 'text-slate-400'}`}
              >
                <CalendarIcon size={22} />
                <span className="text-[9px] font-bold uppercase">Plano</span>
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setActiveTab('recipes')}
                className={`flex flex-col items-center gap-1 ${activeTab === 'recipes' ? 'text-purple-600' : 'text-slate-400'}`}
              >
                <ChefHat size={22} />
                <span className="text-[9px] font-bold uppercase">Receitas</span>
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setActiveTab('store')}
                className={`flex flex-col items-center gap-1 ${activeTab === 'store' ? 'text-purple-600' : 'text-slate-400'}`}
              >
                <Coins size={22} />
                <span className="text-[9px] font-bold uppercase">Loja</span>
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setActiveTab('evolution')}
                className={`flex flex-col items-center gap-1 ${activeTab === 'evolution' ? 'text-purple-600' : 'text-slate-400'}`}
              >
                <TrendingUp size={22} />
                <span className="text-[9px] font-bold uppercase">Evolução</span>
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setActiveTab('profile')}
                className={`flex flex-col items-center gap-1 ${activeTab === 'profile' ? 'text-purple-600' : 'text-slate-400'}`}
              >
                <UserIcon size={22} />
                <span className="text-[9px] font-bold uppercase">Perfil</span>
              </motion.button>
            </>
          )}
          
          {isAdmin && (
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setActiveTab('admin')}
              className={`flex flex-col items-center gap-1 ${activeTab === 'admin' ? 'text-red-500' : 'text-slate-400'}`}
              id="admin-nav-button"
            >
              <Shield size={22} className={activeTab === 'admin' ? 'text-red-500' : 'text-slate-400'} />
              <span className="text-[9px] font-bold uppercase">Painel</span>
            </motion.button>
          )}
        </div>
      </nav>

      {/* Add Food Modal (AI Integration Placeholder) */}
      <AddFoodModal 
        isOpen={showAddFood}
        onClose={() => setShowAddFood(false)}
        mealId={selectedMeal || ''}
        mealName={meals.find(m => m.id === selectedMeal)?.name || ''}
        onAddFood={handleAddFood}
        isAnalyzing={isAnalyzing}
        updateXP={updateXP}
        fetchLogs={fetchLogs}
        user={user}
        profile={profile}
        setProfile={setProfile}
        setActiveTab={setActiveTab}
      />

      <MealManagementModal 
        isOpen={isEditingMeals}
        onClose={() => setIsEditingMeals(false)}
        initialMeals={meals}
        onSave={handleSaveMeals}
      />

      {/* Cropper Modal */}
      <AnimatePresence>
        {showCropper && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-4"
          >
            <div className="relative w-full max-w-lg aspect-square bg-slate-900 rounded-3xl overflow-hidden shadow-2xl">
              <Cropper
                image={image!}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
                cropShape="round"
                showGrid={false}
              />

              {isModeratingImage && (
                <div className="absolute inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-6 text-center space-y-4">
                  <Loader2 size={48} className="text-purple-500 animate-spin" />
                  <h3 className="text-lg font-bold text-white tracking-wide">Análise de Segurança de IA</h3>
                  <p className="text-sm text-slate-300 max-w-xs leading-relaxed">
                    Nossos filtros de inteligência artificial estão analisando sua foto de perfil para garantir que seja adequada para toda a comunidade.
                  </p>
                  <div className="text-xs bg-slate-800 text-purple-400 px-3 py-1.5 rounded-full font-bold uppercase tracking-wider animate-pulse">
                    Verificando Nudez, Drogas, Armas e Ofensas
                  </div>
                </div>
              )}

              {moderationWarning && (
                <div className="absolute inset-0 bg-slate-950/95 z-50 flex flex-col items-center justify-center p-6 text-center space-y-4 overflow-y-auto">
                  <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 shadow-lg shadow-red-500/10">
                    <AlertTriangle size={28} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-extrabold text-white uppercase tracking-wider">Foto Recusada pela IA</h3>
                    <div className="text-[10px] font-bold text-red-400 uppercase tracking-widest bg-red-950/40 border border-red-900/60 px-2.5 py-1 rounded-full inline-block">
                      Infração: {
                        moderationWarning.category === 'nudity' ? 'Nudez ou Teor Sexual' :
                        moderationWarning.category === 'violence' ? 'Violência ou Sangue' :
                        moderationWarning.category === 'drugs' ? 'Drogas ou Álcool' :
                        moderationWarning.category === 'crime_weapons' ? 'Crime ou Armas' :
                        moderationWarning.category === 'offensive_hate' ? 'Gesto Ofensivo / Símbolo de Ódio' :
                        'Conteúdo Impróprio'
                      }
                    </div>
                  </div>
                  
                  <p className="text-xs text-slate-300 max-w-xs leading-relaxed font-medium bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    {moderationWarning.reason}
                  </p>

                  <p className="text-[10px] text-slate-500 max-w-xs">
                    Para manter o app SpotNutri seguro e familiar, fotos que violam nossos termos são bloqueadas automaticamente.
                  </p>

                  <div className="pt-2 w-full max-w-xs flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setModerationWarning(null);
                      }}
                      className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md"
                    >
                      Escolher Outra
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCropper(false);
                        setImage(null);
                        setModerationWarning(null);
                      }}
                      className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer border border-slate-700"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="w-full max-w-lg mt-8 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase text-center block">Zoom</label>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  disabled={isModeratingImage}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500 disabled:opacity-50"
                />
              </div>

              <div className="flex gap-4">
                <motion.button
                  whileHover={{ scale: isModeratingImage ? 1 : 1.02 }}
                  whileTap={{ scale: isModeratingImage ? 1 : 0.98 }}
                  disabled={isModeratingImage}
                  onClick={() => {
                    setShowCropper(false);
                    setImage(null);
                    setModerationWarning(null);
                  }}
                  className="flex-1 py-4 bg-slate-800 text-white font-bold rounded-2xl border border-slate-700 disabled:opacity-50 cursor-pointer"
                >
                  Cancelar
                </motion.button>
                <motion.button
                  whileHover={{ scale: isModeratingImage ? 1 : 1.02 }}
                  whileTap={{ scale: isModeratingImage ? 1 : 0.98 }}
                  disabled={isModeratingImage}
                  onClick={handleCropSave}
                  className="flex-1 py-4 bg-purple-cyan text-white font-bold rounded-2xl shadow-lg disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isModeratingImage ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Analisando...</span>
                    </>
                  ) : (
                    <span>Confirmar</span>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}


      </AnimatePresence>

      <AnimatePresence>
        {hoveredDayCalories !== null && (
          <motion.div
            key="calorie-tooltip"
            initial={{ opacity: 0, scale: 0.85, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 10 }}
            transition={{ type: 'spring', stiffness: 500, damping: 28 }}
            style={{
              position: 'fixed',
              left: typeof window !== 'undefined' ? Math.min(mousePos.x + 12, window.innerWidth - 170) : mousePos.x + 12,
              top: typeof window !== 'undefined' ? Math.min(mousePos.y + 12, window.innerHeight - 70) : mousePos.y + 12,
            }}
            className="z-[9999] pointer-events-none bg-white/95 dark:bg-[#0f172a]/95 text-slate-800 dark:text-white py-2 px-3.5 rounded-xl shadow-xl border border-slate-200/80 dark:border-slate-700/50 flex flex-col font-sans backdrop-blur-md min-w-[140px] text-left"
          >
            <span className="text-[9px] font-black tracking-wider uppercase text-slate-500 dark:text-slate-400">
              {hoveredDayLabel}
            </span>
            <span className="text-xs font-black text-amber-600 dark:text-amber-400 mt-0.5 flex items-center gap-1">
              🔥 {hoveredDayCalories} kcal
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conversational Assistant AI Chatbot */}
      <NutriAssistant 
        user={user} 
        profile={profile} 
        setProfile={setProfile}
        onExecuteActions={executeAssistantActions}
        setActiveTab={setActiveTab}
        selectedMeal={selectedMeal}
      />
    </div>
  );
};
