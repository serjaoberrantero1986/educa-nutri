import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Flame, 
  Dumbbell, 
  Sparkles, 
  ChevronRight, 
  TrendingUp, 
  Calendar, 
  Info,
  RotateCcw,
  RotateCw,
  User,
  Search,
  Lock,
  Unlock,
  Globe,
  Award,
  Shield,
  Heart,
  BookOpen,
  Users,
  Download,
  CheckCircle2,
  Crown,
  Coins,
  Pencil,
  Trash2,
  Check,
  X,
  Play
} from "lucide-react";
import { Profile, UserWorkoutProfile, UserData, ExerciseLog, WorkoutRoutine } from "../../types";
import { WorkoutHistory } from "./WorkoutHistory";
import { collection, query, where, getDocs, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "../../lib/firebase";

// High-quality expert-made shared workouts to display out of the box or as fallbacks
const presetRoutines: WorkoutRoutine[] = [];

interface WorkoutDashboardProps {
  profile: Profile | null;
  workoutProfile: UserWorkoutProfile | null;
  userData: UserData | null;
  onNavigateToTab: (tab: string) => void;
  exerciseHistory?: ExerciseLog[];
  onDeleteLog?: (id: string) => Promise<void>;
  selectedDate?: Date;
  currentRoutine?: WorkoutRoutine | null;
  onUpdateWorkoutRoutine?: (newRoutine: WorkoutRoutine) => Promise<void>;
  onUpdateProfile?: (updated: Profile) => void;
}

type AngleView = "front" | "side_left" | "back" | "side_right";

export const WorkoutDashboard: React.FC<WorkoutDashboardProps> = ({
  profile,
  workoutProfile,
  userData,
  onNavigateToTab,
  exerciseHistory = [],
  onDeleteLog,
  selectedDate,
  currentRoutine,
  onUpdateWorkoutRoutine,
  onUpdateProfile
}) => {
  const [subTab, setSubTab] = useState<"biometrics" | "library">("biometrics");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [loadingLibrary, setLoadingLibrary] = useState<boolean>(false);
  const [sharedRoutines, setSharedRoutines] = useState<WorkoutRoutine[]>([]);
  const [activatingPass, setActivatingPass] = useState<boolean>(false);
  const [ownRoutines, setOwnRoutines] = useState<WorkoutRoutine[]>([]);
  const [loadingOwn, setLoadingOwn] = useState<boolean>(false);
  const [deletingRoutineId, setDeletingRoutineId] = useState<string | null>(null);
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [editingRoutineTitle, setEditingRoutineTitle] = useState<string>("");
  const [savedRoutineId, setSavedRoutineId] = useState<string | null>(null);

  const [librarySortField, setLibrarySortField] = useState<'division' | 'createdAt'>('createdAt');
  const [librarySortDirection, setLibrarySortDirection] = useState<'asc' | 'desc'>('desc');
  const [libraryCurrentPage, setLibraryCurrentPage] = useState<number>(1);

  // Reset page when search, level filter or sort changes
  useEffect(() => {
    setLibraryCurrentPage(1);
  }, [searchTerm, filterLevel, librarySortField, librarySortDirection]);

  // Check if access is active
  const isPremiumActive = profile?.premium_access_until 
    ? (profile.premium_access_until === 'unlimited' || new Date(profile.premium_access_until).getTime() > Date.now())
    : false;

  const isSharedWorkoutsActive = profile?.shared_workouts_pass_until
    ? (new Date(profile.shared_workouts_pass_until).getTime() > Date.now())
    : false;

  const isProfessional = profile?.role === 'professional' || profile?.role === 'admin';

  const hasLibraryAccess = isProfessional || isPremiumActive || isSharedWorkoutsActive;

  // Load public shared workouts from firestore if firebase is configured
  useEffect(() => {
    const fetchSharedWorkouts = async () => {
      if (!hasLibraryAccess) return;
      setLoadingLibrary(true);
      try {
        if (isFirebaseConfigured) {
          const q = query(collection(db, 'workout_routines'), where('isPrivate', '==', false));
          const querySnapshot = await getDocs(q);
          const routinesFromFirestore: WorkoutRoutine[] = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data() as WorkoutRoutine;
            // Prevent duplicate preset loading if we store them in DB as well
            if (!data.id.startsWith("preset_")) {
              const role = (data.creatorRole || "").toLowerCase();
              const isProfOrAdmin = role === 'profissional' || role === 'professional' || role === 'administrador' || role === 'admin';
              if (isProfOrAdmin) {
                routinesFromFirestore.push(data);
              }
            }
          });
          setSharedRoutines(routinesFromFirestore);
        }
      } catch (err) {
        console.error("Erro ao carregar treinos públicos:", err);
      } finally {
        setLoadingLibrary(false);
      }
    };

    fetchSharedWorkouts();
  }, [subTab, hasLibraryAccess]);

  // Load professional's own created workouts from firestore if firebase is configured
  useEffect(() => {
    const fetchOwnRoutines = async () => {
      if (!profile?.id) return;
      setLoadingOwn(true);
      try {
        if (isFirebaseConfigured) {
          const qOwn = collection(db, 'workout_routines');
          const querySnapshot = await getDocs(qOwn);
          const routines: WorkoutRoutine[] = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data() as WorkoutRoutine;
            // Filter out system presets if any
            if (!data.id.startsWith("preset_")) {
              if (data.user_id === profile.id) {
                routines.push(data);
              }
            }
          });
          setOwnRoutines(routines);
        }
      } catch (err) {
        console.error("Erro ao carregar treinos:", err);
      } finally {
        setLoadingOwn(false);
      }
    };

    fetchOwnRoutines();
  }, [subTab, profile?.id, profile?.role]);

  const handleSaveOwnRoutineTitle = async (routineId: string) => {
    if (!editingRoutineTitle || editingRoutineTitle.trim() === "") return;

    try {
      if (isFirebaseConfigured) {
        const routineRef = doc(db, 'workout_routines', routineId);
        await updateDoc(routineRef, {
          division: editingRoutineTitle.trim()
        });

        // Update local states
        setOwnRoutines(prev => prev.map(r => r.id === routineId ? { ...r, division: editingRoutineTitle.trim() } : r));
        setSharedRoutines(prev => prev.map(r => r.id === routineId ? { ...r, division: editingRoutineTitle.trim() } : r));
        
        // Show the green saved state
        setSavedRoutineId(routineId);
        setEditingRoutineId(null);
        setTimeout(() => {
          setSavedRoutineId(null);
        }, 1500);
      }
    } catch (err) {
      console.error("Erro ao atualizar título do treino:", err);
    }
  };

  const handleDeleteOwnRoutine = async (routineId: string) => {
    try {
      if (isFirebaseConfigured) {
        const routineRef = doc(db, 'workout_routines', routineId);
        await deleteDoc(routineRef);

        // Update local states
        setOwnRoutines(prev => prev.filter(r => r.id !== routineId));
        setSharedRoutines(prev => prev.filter(r => r.id !== routineId));
        alert("Treino excluído com sucesso!");
      }
    } catch (err) {
      console.error("Erro ao excluir treino:", err);
      alert("Ocorreu um erro ao excluir o treino.");
    } finally {
      setDeletingRoutineId(null);
    }
  };

  const handleBuyLibraryPass = async () => {
    if (!profile || !onUpdateProfile) return;
    const cost = 800;
    if ((profile.xp || 0) < cost) {
      alert('Seu saldo de NutriCoins é insuficiente!');
      return;
    }

    setActivatingPass(true);
    try {
      const finalCoins = (profile.xp || 0) - cost;
      const twentyFourHoursFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const updatedProfile = {
        ...profile,
        xp: finalCoins,
        shared_workouts_pass_until: twentyFourHoursFromNow
      };

      if (isFirebaseConfigured) {
        const profileRef = doc(db, 'profiles', profile.id);
        await updateDoc(profileRef, {
          xp: finalCoins,
          shared_workouts_pass_until: twentyFourHoursFromNow
        });
      }
      onUpdateProfile(updatedProfile);
      alert('Passe 24h Treinos Compartilhados ativado com sucesso! 🏋️‍♂️💪 Agora você pode navegar, visualizar e importar todos os treinos da Biblioteca Pública!');
    } catch (err) {
      console.error(err);
    } finally {
      setActivatingPass(false);
    }
  };

  const handleCloneRoutine = async (routine: WorkoutRoutine) => {
    if (!profile) return;

    if (onUpdateWorkoutRoutine) {
      try {
        // Clone and adjust ids/user_id for local active routine
        const cloned: WorkoutRoutine = {
          ...routine,
          id: profile.id, // Doc id in workout_routines is the user.uid
          user_id: profile.id,
          createdAt: new Date().toISOString(),
          isPrivate: true, // Imported copy is private to user by default
          downloads: (routine.downloads || 0) + 1
        };

        await onUpdateWorkoutRoutine(cloned);

        // Increment downloads in Firestore if possible
        if (isFirebaseConfigured && !routine.id.startsWith("preset_")) {
          try {
            const routineRef = doc(db, 'workout_routines', routine.id);
            await updateDoc(routineRef, {
              downloads: (routine.downloads || 0) + 1
            });
            // Update local state so that the downloads count increments instantly in the UI
            setSharedRoutines(prev => prev.map(r => r.id === routine.id ? { ...r, downloads: (r.downloads || 0) + 1 } : r));
            setOwnRoutines(prev => prev.map(r => r.id === routine.id ? { ...r, downloads: (r.downloads || 0) + 1 } : r));
          } catch (e) {
            console.error("Could not increment downloads:", e);
          }
        }

        const isOwn = routine.user_id === profile.id;
        const successMessage = isOwn 
          ? `Treino "${routine.division}" ativado com sucesso! Redirecionando para sua Ficha Ativa.`
          : `Treino de "${routine.creatorName}" importado e ativado com sucesso! Redirecionando para sua Ficha Ativa.`;

        alert(successMessage);
        // Navigate to the Ficha tab to see the updated routine immediately
        onNavigateToTab("workout_ficha");
      } catch (err) {
        console.error("Erro ao importar treino:", err);
        alert("Ocorreu um erro ao importar este treino. Tente novamente.");
      }
    }
  };

  // Fatigue score mapping
  const fatigue = workoutProfile?.muscleFatigue || {
    peitoral: 0,
    costas: 0,
    ombros: 0,
    trapezio: 0,
    posterior_ombros: 0,
    biceps: 0,
    triceps: 0,
    abdomen: 0,
    obliquos: 0,
    quadriceps: 0,
    posterior_coxas: 0,
    gluteos: 0,
    panturrilhas: 0,
    antebracos: 0
  };

  // Determine user's gender/sex, default to male if undefined
  const defaultSex = userData?.sex || "male";
  const [selectedGender, setSelectedGender] = useState<"male" | "female">(defaultSex);

  // Active rotation angle/view state (continuous drag rotation)
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [angleAtStart, setAngleAtStart] = useState(0);

  const getActiveViewFromAngle = (angle: number): AngleView => {
    // 0 to 45 or 315 to 360 -> front
    // 45 to 135 -> side_left
    // 135 to 225 -> back
    // 225 to 315 -> side_right
    if (angle >= 45 && angle < 135) return "side_left";
    if (angle >= 135 && angle < 225) return "back";
    if (angle >= 225 && angle < 315) return "side_right";
    return "front";
  };

  const activeView = getActiveViewFromAngle(rotationAngle);

  const handleDragStart = (clientX: number) => {
    setIsDragging(true);
    setDragStartX(clientX);
    setAngleAtStart(rotationAngle);
  };

  const handleDragMove = (clientX: number) => {
    if (!isDragging) return;
    const deltaX = clientX - dragStartX;
    const angleDelta = (deltaX / 1.2) % 360; 
    let newAngle = (angleAtStart - angleDelta) % 360;
    if (newAngle < 0) newAngle += 360;
    setRotationAngle(newAngle);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    handleDragStart(e.clientX);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    handleDragMove(e.clientX);
  };

  const onMouseUpOrLeave = () => {
    handleDragEnd();
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      handleDragStart(e.touches[0].clientX);
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      handleDragMove(e.touches[0].clientX);
    }
  };

  const onTouchEnd = () => {
    handleDragEnd();
  };

  // Maps fatigue percentage smoothly from Emerald Green -> Yellow -> Red
  const getAnatomicalColor = (fatigueValue: number) => {
    // 0 fatigue = HSL 140 (Emerald green)
    // 100 fatigue = HSL 0 (Crimson red)
    const hue = Math.max(0, 140 - (fatigueValue * 1.4));
    return `hsl(${hue}, 85%, 45%)`;
  };

  const getRecoveryLabel = (fatigueValue: number) => {
    if (fatigueValue === 0) return "100% Recuperado";
    if (fatigueValue < 30) return "Altamente Recuperado";
    if (fatigueValue < 70) return "Recuperação Média";
    return "Fadigado / Descanso";
  };

  const getRecoveryColorClass = (fatigueValue: number) => {
    if (fatigueValue === 0) return "bg-emerald-500";
    if (fatigueValue < 30) return "bg-teal-500";
    if (fatigueValue < 70) return "bg-amber-500";
    return "bg-rose-500";
  };

  const getRecoveryTextColorClass = (fatigueValue: number) => {
    if (fatigueValue === 0) return "text-emerald-500 dark:text-emerald-400";
    if (fatigueValue < 30) return "text-teal-500 dark:text-teal-400";
    if (fatigueValue < 70) return "text-amber-500 dark:text-amber-400";
    return "text-rose-500 dark:text-rose-400";
  };

  // Helper to get angle description
  const getViewName = (view: AngleView) => {
    if (view === "front") return "Frente (0°)";
    if (view === "side_left") return "Perfil Esquerdo (90°)";
    if (view === "back") return "Costas (180°)";
    return "Perfil Direito (270°)";
  };

  // Render highly aesthetic anatomical SVGs based on Gender and Active Rotation angle
  const renderAnatomicalVector = () => {
    const isMale = selectedGender === "male";
    
    // Base colors for default body skeleton in light / dark modes
    const skeletonColor = "fill-slate-100 dark:fill-slate-800 stroke-slate-200 dark:stroke-slate-700";
    const lineStroke = "stroke-slate-300 dark:stroke-slate-600";
    
    // Dynamic styles for muscle parts mapped from the 14 granular groups
    const peitoColor = getAnatomicalColor(fatigue.peitoral ?? 0);
    const costasColor = getAnatomicalColor(fatigue.costas ?? 0);
    const pernasColor = getAnatomicalColor(Math.max(fatigue.quadriceps ?? 0, fatigue.posterior_coxas ?? 0, fatigue.gluteos ?? 0, fatigue.panturrilhas ?? 0));
    const bicepsColor = getAnatomicalColor(fatigue.biceps ?? 0);
    const tricepsColor = getAnatomicalColor(fatigue.triceps ?? 0);
    const ombrosColor = getAnatomicalColor(Math.max(fatigue.ombros ?? 0, fatigue.trapezio ?? 0, fatigue.posterior_ombros ?? 0));
    const abdomeColor = getAnatomicalColor(Math.max(fatigue.abdomen ?? 0, fatigue.obliquos ?? 0));

    if (activeView === "front") {
      return (
        <svg viewBox="0 0 200 320" className="w-full h-full max-h-[350px] filter drop-shadow-xl select-none mx-auto">
          {/* Head & Neck */}
          <path d="M100 22 C109 22 115 28 115 39 C115 49 108 56 100 56 C92 56 85 49 85 39 C85 28 91 22 100 22 Z" className={skeletonColor} strokeWidth="1.2" />
          <path d="M94 53 C94 62 95 64 93 67 L107 67 C105 64 106 62 106 53 Z" className={skeletonColor} strokeWidth="1.2" />
          
          {/* Base Torso Outline */}
          <path 
            d={isMale 
              ? "M72 67 C68 90 74 135 84 138 L116 138 C126 135 132 90 128 67 Z" 
              : "M76 67 C72 88 80 115 86 138 L114 138 C120 115 128 88 124 67 Z"
            } 
            className={skeletonColor} 
            strokeWidth="1.5" 
          />

          {/* Dynamic Chest (Peito) */}
          <g className="transition-all duration-500 opacity-85">
            <path 
              d={isMale 
                ? "M100 70 L80 68 C74 76 74 94 100 98 Z" 
                : "M100 72 L82 70 C78 78 78 92 100 95 Z"
              } 
              fill={peitoColor} 
              stroke="rgba(0,0,0,0.12)"
              strokeWidth="1"
            />
            <path 
              d={isMale 
                ? "M100 70 L120 68 C126 76 126 94 100 98 Z" 
                : "M100 72 L118 70 C122 78 122 92 100 95 Z"
              } 
              fill={peitoColor} 
              stroke="rgba(0,0,0,0.12)"
              strokeWidth="1"
            />
          </g>

          {/* Dynamic Abs (Abdome) */}
          <path 
            d={isMale 
              ? "M82 100 L118 100 C121 115 116 135 114 138 L86 138 C84 135 79 115 82 100 Z" 
              : "M84 97 L116 97 C118 112 114 135 112 138 L88 138 C86 135 82 112 84 97 Z"
            } 
            fill={abdomeColor} 
            className="transition-all duration-500 fill-current opacity-85"
            stroke="rgba(0,0,0,0.12)"
            strokeWidth="1"
          />
          {/* Abs pack partitions */}
          <line x1="100" y1="100" x2="100" y2="138" className={lineStroke} strokeWidth="0.8" strokeDasharray="2,2" />
          <line x1="88" y1="112" x2="112" y2="112" className={lineStroke} strokeWidth="0.8" strokeDasharray="2,2" />
          <line x1="88" y1="124" x2="112" y2="124" className={lineStroke} strokeWidth="0.8" strokeDasharray="2,2" />

          {/* Shoulders (Ombros) */}
          <path 
            d="M80 66 C65 67 67 85 82 86 Z" 
            fill={ombrosColor} 
            className="transition-all duration-500 fill-current opacity-85"
            stroke="rgba(0,0,0,0.1)"
            strokeWidth="1"
          />
          <path 
            d="M120 66 C135 67 133 85 118 86 Z" 
            fill={ombrosColor} 
            className="transition-all duration-500 fill-current opacity-85"
            stroke="rgba(0,0,0,0.1)"
            strokeWidth="1"
          />

          {/* Biceps */}
          <path 
            d="M68 85 C54 94 58 114 68 115 Z" 
            fill={bicepsColor} 
            className="transition-all duration-500 fill-current opacity-85"
            stroke="rgba(0,0,0,0.1)"
            strokeWidth="1"
          />
          <path 
            d="M132 85 C146 94 142 114 132 115 Z" 
            fill={bicepsColor} 
            className="transition-all duration-500 fill-current opacity-85"
            stroke="rgba(0,0,0,0.1)"
            strokeWidth="1"
          />

          {/* Forearms & Hands */}
          <path d="M62 115 C54 125 50 145 56 155 C62 155 64 125 64 115 Z" className={skeletonColor} strokeWidth="1" />
          <path d="M138 115 C146 125 150 145 144 155 C138 155 136 125 136 115 Z" className={skeletonColor} strokeWidth="1" />
          <circle cx="56" cy="158" r="4.5" className={skeletonColor} />
          <circle cx="144" cy="158" r="4.5" className={skeletonColor} />

          {/* Hips & Pelvis */}
          <path d="M84 138 L116 138 C122 150 118 165 114 165 L86 165 C82 165 78 150 84 138 Z" className={skeletonColor} strokeWidth="1.2" />

          {/* Legs (Pernas - Quadriceps) */}
          <path 
            d="M78 165 C68 185 64 215 78 238 C88 238 96 215 96 165 Z" 
            fill={pernasColor} 
            className="transition-all duration-500 fill-current opacity-85"
            stroke="rgba(0,0,0,0.12)"
            strokeWidth="1"
          />
          <path 
            d="M122 165 C132 185 136 215 122 238 C112 238 104 215 104 165 Z" 
            fill={pernasColor} 
            className="transition-all duration-500 fill-current opacity-85"
            stroke="rgba(0,0,0,0.12)"
            strokeWidth="1"
          />

          {/* Knees & Calves & Feet */}
          <circle cx="78" cy="242" r="5" className={skeletonColor} />
          <circle cx="122" cy="242" r="5" className={skeletonColor} />
          <path d="M76 245 C68 263 70 283 78 296 C84 296 86 283 84 245 Z" className={skeletonColor} strokeWidth="1" />
          <path d="M124 245 C132 263 130 283 122 296 C116 296 114 283 116 245 Z" className={skeletonColor} strokeWidth="1" />
          {/* Feet */}
          <path d="M74 296 L86 296 L90 305 L68 305 Z" className={skeletonColor} strokeWidth="1" />
          <path d="M126 296 L114 296 L110 305 L132 305 Z" className={skeletonColor} strokeWidth="1" />
        </svg>
      );
    }

    if (activeView === "back") {
      return (
        <svg viewBox="0 0 200 320" className="w-full h-full max-h-[350px] filter drop-shadow-xl select-none mx-auto">
          {/* Back of Head */}
          <path d="M100 22 C109 22 115 28 115 39 C115 49 108 56 100 56 C92 56 85 49 85 39 C85 28 91 22 100 22 Z" className={skeletonColor} strokeWidth="1.2" />
          <path d="M94 53 C94 62 95 64 93 67 L107 67 C105 64 106 62 106 53 Z" className={skeletonColor} strokeWidth="1.2" />
          
          {/* Base Torso Outline */}
          <path 
            d={isMale 
              ? "M72 67 C68 90 74 135 84 138 L116 138 C126 135 132 90 128 67 Z" 
              : "M76 67 C72 88 80 115 86 138 L114 138 C120 115 128 88 124 67 Z"
            } 
            className={skeletonColor} 
            strokeWidth="1.5" 
          />

          {/* Dynamic Costas (Back Traps/Lats) */}
          <path 
            d={isMale 
              ? "M80 68 Q100 78 120 68 C128 85 126 115 116 136 Q100 140 84 136 C74 115 72 85 80 68 Z" 
              : "M82 68 Q100 78 118 68 C124 85 122 115 114 136 Q100 140 86 136 C78 115 76 85 82 68 Z"
            } 
            fill={costasColor} 
            className="transition-all duration-500 fill-current opacity-85"
            stroke="rgba(0,0,0,0.12)"
            strokeWidth="1"
          />
          {/* Spine indicator */}
          <line x1="100" y1="68" x2="100" y2="136" className={lineStroke} strokeWidth="1" strokeDasharray="3,3" />

          {/* Shoulders (Ombros) */}
          <path 
            d="M80 66 C65 67 67 85 82 86 Z" 
            fill={ombrosColor} 
            className="transition-all duration-500 fill-current opacity-85"
            stroke="rgba(0,0,0,0.1)"
            strokeWidth="1"
          />
          <path 
            d="M120 66 C135 67 133 85 118 86 Z" 
            fill={ombrosColor} 
            className="transition-all duration-500 fill-current opacity-85"
            stroke="rgba(0,0,0,0.1)"
            strokeWidth="1"
          />

          {/* Triceps (Arms posterior) */}
          <path 
            d="M68 85 C54 94 58 114 68 115 Z" 
            fill={tricepsColor} 
            className="transition-all duration-500 fill-current opacity-85"
            stroke="rgba(0,0,0,0.1)"
            strokeWidth="1"
          />
          <path 
            d="M132 85 C146 94 142 114 132 115 Z" 
            fill={tricepsColor} 
            className="transition-all duration-500 fill-current opacity-85"
            stroke="rgba(0,0,0,0.1)"
            strokeWidth="1"
          />

          {/* Forearms static */}
          <path d="M62 115 C54 125 50 145 56 155 C62 155 64 125 64 115 Z" className={skeletonColor} strokeWidth="1" />
          <path d="M138 115 C146 125 150 145 144 155 C138 155 136 125 136 115 Z" className={skeletonColor} strokeWidth="1" />
          <circle cx="56" cy="158" r="4.5" className={skeletonColor} />
          <circle cx="144" cy="158" r="4.5" className={skeletonColor} />

          {/* Glutes & Hips */}
          <path d="M84 138 L116 138 C122 150 118 165 114 165 L86 165 C82 165 78 150 84 138 Z" className={skeletonColor} strokeWidth="1.2" />
          <line x1="100" y1="138" x2="100" y2="165" className={lineStroke} strokeWidth="1" />

          {/* Legs (Pernas - Posterior/Hamstrings) */}
          <path 
            d="M78 165 C68 185 64 215 78 238 C88 238 96 215 96 165 Z" 
            fill={pernasColor} 
            className="transition-all duration-500 fill-current opacity-85"
            stroke="rgba(0,0,0,0.12)"
            strokeWidth="1"
          />
          <path 
            d="M122 165 C132 185 136 215 122 238 C112 238 104 215 104 165 Z" 
            fill={pernasColor} 
            className="transition-all duration-500 fill-current opacity-85"
            stroke="rgba(0,0,0,0.12)"
            strokeWidth="1"
          />

          {/* Calf Muscles */}
          <circle cx="78" cy="242" r="5" className={skeletonColor} />
          <circle cx="122" cy="242" r="5" className={skeletonColor} />
          <path d="M76 245 C68 263 70 283 78 296 C84 296 86 283 84 245 Z" className={skeletonColor} strokeWidth="1" />
          <path d="M124 245 C132 263 130 283 122 296 C116 296 114 283 116 245 Z" className={skeletonColor} strokeWidth="1" />
          {/* Feet */}
          <path d="M74 296 L86 296 L90 305 L68 305 Z" className={skeletonColor} strokeWidth="1" />
          <path d="M126 296 L114 296 L110 305 L132 305 Z" className={skeletonColor} strokeWidth="1" />
        </svg>
      );
    }

    // Side views (Left profile/Right profile)
    return (
      <svg viewBox="0 0 200 320" className="w-full h-full max-h-[350px] filter drop-shadow-xl select-none mx-auto">
        {/* Profile Head */}
        <path d="M100 22 C109 22 113 28 111 39 C111 49 105 56 94 54 Z" className={skeletonColor} strokeWidth="1.2" />
        <path d="M96 53 L96 66 L104 66 L104 53 Z" className={skeletonColor} strokeWidth="1.2" />

        {/* Profile Torso */}
        <path 
          d={isMale 
            ? "M84 66 C80 90 85 135 96 138 C108 138 122 110 114 66 Z" 
            : "M88 66 C84 90 89 125 96 138 C104 138 118 110 110 66 Z"
          } 
          className={skeletonColor} 
          strokeWidth="1.5" 
        />

        {/* Dynamic Lateral Shoulder */}
        <path 
          d="M92 66 C105 66 104 86 94 86 C84 86 85 66 92 66 Z" 
          fill={ombrosColor} 
          className="transition-all duration-500 fill-current opacity-85"
          stroke="rgba(0,0,0,0.1)"
          strokeWidth="1"
        />

        {/* Biceps & Triceps Lateral Profile splitting */}
        <path 
          d="M100 85 L105 115 L98 115 L93 85 Z" 
          fill={bicepsColor} 
          className="transition-all duration-500 fill-current opacity-85"
          stroke="rgba(0,0,0,0.1)"
          strokeWidth="1"
        />
        <path 
          d="M88 85 L95 115 L88 115 L83 85 Z" 
          fill={tricepsColor} 
          className="transition-all duration-500 fill-current opacity-85"
          stroke="rgba(0,0,0,0.1)"
          strokeWidth="1"
        />

        {/* Forearm side */}
        <path d="M92 115 C88 125 84 145 90 155 C96 155 98 125 98 115 Z" className={skeletonColor} strokeWidth="1" />
        <circle cx="90" cy="158" r="4.5" className={skeletonColor} />

        {/* Side Abs area */}
        <path 
          d="M98 100 Q106 120 98 136 M90 100 L94 136" 
          fill="none" 
          className={lineStroke} 
          strokeWidth="1" 
          strokeDasharray="2,2" 
        />

        {/* Dynamic Side Thigh / Glute (Pernas) */}
        <path 
          d="M84 138 Q112 138 106 235 L86 235 Q74 180 84 138 Z" 
          fill={pernasColor} 
          className="transition-all duration-500 fill-current opacity-85"
          stroke="rgba(0,0,0,0.12)"
          strokeWidth="1"
        />

        {/* Knee & Calf side */}
        <circle cx="96" cy="242" r="5" className={skeletonColor} />
        <path d="M96 245 C90 263 92 283 96 296 C102 296 104 283 104 245 Z" className={skeletonColor} strokeWidth="1" />
        <path d="M86 296 L100 296 L104 305 L82 305 Z" className={skeletonColor} strokeWidth="1" />
      </svg>
    );
  };

  return (
    <div className="space-y-6">
      {/* Subtab Selector */}
      <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl w-full max-w-md mx-auto border border-slate-200/40 dark:border-slate-800/80">
        <button
          type="button"
          onClick={() => setSubTab("biometrics")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border-0 ${
            subTab === "biometrics"
              ? "bg-cyan-500 text-white shadow-md shadow-cyan-500/25"
              : "bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
          }`}
        >
          <Dumbbell size={14} />
          Biometria
        </button>
        <button
          type="button"
          onClick={() => setSubTab("library")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border-0 ${
            subTab === "library"
              ? "bg-cyan-500 text-white shadow-md shadow-cyan-500/25"
              : "bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
          }`}
        >
          <Users size={14} />
          Biblioteca
        </button>
      </div>

      {subTab === "biometrics" ? (
        <>
          {/* Brand-New Interactive 3D Muscular Fatigue Stage (Theme Compliant!) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 text-slate-800 dark:text-white shadow-xl relative overflow-hidden">
            {/* Design Accents */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
              {/* Controls & Descriptions Panel */}
              <div className="lg:col-span-5 space-y-6">
                <div className="space-y-2">
                  <span className="inline-flex items-center gap-1.5 bg-cyan-50 dark:bg-cyan-500/15 border border-cyan-100 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400 text-[10px] font-black uppercase px-2.5 py-1 rounded-full tracking-wider leading-none">
                    <Flame size={12} className="animate-pulse" />
                    Mapeamento Biométrico
                  </span>
                  <h2 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                    Estresse & Fadiga Muscular
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Visualização interativa da regeneração de fibras no modelo anatômico. Arraste horizontalmente (mouse ou toque) para girar o modelo em 360 graus e verificar o repouso.
                  </p>
                </div>

                {/* Gender Toggle Manual Override */}
                <div className="bg-slate-50 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-850 flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-bold pl-3">Corpo Base</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setSelectedGender("male")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border-0 ${
                        selectedGender === "male"
                          ? "bg-cyan-500 text-white shadow-md shadow-cyan-500/25"
                          : "bg-transparent text-slate-400 hover:text-slate-800 dark:hover:text-white"
                      }`}
                    >
                      Masculino
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedGender("female")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border-0 ${
                        selectedGender === "female"
                          ? "bg-cyan-500 text-white shadow-md shadow-cyan-500/25"
                          : "bg-transparent text-slate-400 hover:text-slate-800 dark:hover:text-white"
                      }`}
                    >
                      Feminino
                    </button>
                  </div>
                </div>
              </div>

              {/* Interactive Rotational 3D Stage */}
              <div className="lg:col-span-7 flex flex-col items-center justify-center relative">
                {/* Spinning Canvas Circle Base */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-[280px] h-[280px] rounded-full border border-dashed border-slate-200 dark:border-slate-800/70 animate-[spin_40s_linear_infinite]" />
                  <div className="w-[210px] h-[210px] rounded-full border border-slate-200/50 absolute" />
                </div>

                {/* Actual Vector Stage with Transitions */}
                <div 
                  onMouseDown={onMouseDown}
                  onMouseMove={onMouseMove}
                  onMouseUp={onMouseUpOrLeave}
                  onMouseLeave={onMouseUpOrLeave}
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                  className="relative z-10 w-full flex items-center justify-center min-h-[360px] cursor-grab active:cursor-grabbing select-none"
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`${selectedGender}_${activeView}`}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="w-full max-w-[220px]"
                    >
                      {renderAnatomicalVector()}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Heat Gradient Bar Key */}
                <div className="flex items-center justify-between w-full max-w-xs mt-4 text-[10px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60">
                  <span className="font-bold">Regenerado (0%)</span>
                  <div className="h-2 w-28 rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500" />
                  <span className="font-bold">Fadigado (100%)</span>
                </div>

                {/* Move Action Button right below */}
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onNavigateToTab("workout_today")}
                  className="w-full max-w-xs bg-cyan-500 hover:bg-cyan-600 text-white font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/15 cursor-pointer text-xs border-0 uppercase tracking-wider mt-6"
                >
                  <Dumbbell size={16} />
                  Iniciar Treino do Dia
                </motion.button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Muscle Score Card List */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm sm:text-base">
                  <Sparkles className="text-purple-500 animate-pulse" size={18} />
                  Lista de Regeneração por Grupo
                </h3>
                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold px-2 py-1 rounded-lg uppercase">
                  Atualizado em Tempo Real
                </span>
              </div>

              <div className="space-y-4">
                {[
                  { key: "peitoral", label: "peitoral" },
                  { key: "costas", label: "costas" },
                  { key: "ombros", label: "ombros" },
                  { key: "trapezio", label: "trapézio" },
                  { key: "posterior_ombros", label: "posterior de ombros" },
                  { key: "biceps", label: "bíceps" },
                  { key: "triceps", label: "tríceps" },
                  { key: "abdomen", label: "abdômen" },
                  { key: "obliquos", label: "oblíquos" },
                  { key: "quadriceps", label: "quadríceps" },
                  { key: "posterior_coxas", label: "posterior de coxas" },
                  { key: "gluteos", label: "glúteos" },
                  { key: "panturrilhas", label: "panturrilhas" },
                  { key: "antebracos", label: "antebraços" }
                ].map(({ key, label }) => {
                  const value = fatigue[key as keyof typeof fatigue] ?? 0;
                  return (
                    <div key={key} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-700 dark:text-slate-300">
                          {label}
                        </span>
                        <span className={getRecoveryTextColorClass(value)}>
                          {getRecoveryLabel(value)} ({100 - value}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${100 - value}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className={`h-full rounded-full ${getRecoveryColorClass(value)}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-start gap-2 text-xs bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <Info size={14} className="text-cyan-500 shrink-0 mt-0.5" />
                <p className="leading-relaxed text-[11px]">
                  O nível de fadiga aumenta quando você registra e conclui exercícios. O SportNutri decrementa de forma inteligente a fadiga diariamente de acordo com o seu tempo de descanso e nutrição ingerida.
                </p>
              </div>
            </div>

            {/* Right side containers: Quick Info & Daily Stats */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 space-y-4">
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Calendar className="text-cyan-500" size={18} />
                  Meu Planejamento de Ficha de Treino
                </h3>

                {workoutProfile ? (
                  <div className="space-y-4 text-sm mt-2">
                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-xl">
                      <span className="text-slate-500 text-xs">Divisão de Treinos</span>
                      <span className="font-bold text-slate-800 dark:text-white text-xs">
                        {workoutProfile.divisionType || "Full Body A/B"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-xl">
                      <span className="text-slate-500 text-xs">Frequência Semanal</span>
                      <span className="font-bold text-slate-800 dark:text-white text-xs">
                        {workoutProfile.daysPerWeek === 1 ? "1 dia" : `${workoutProfile.daysPerWeek} dias`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-xl">
                      <span className="text-slate-500 text-xs">Tempo Limite Sugerido</span>
                      <span className="font-bold text-slate-800 dark:text-white text-xs">
                        {workoutProfile.workoutDuration} min/treino
                      </span>
                    </div>

                    <motion.button
                      whileHover={{ x: 4 }}
                      onClick={() => onNavigateToTab("workout_ficha")}
                      className="w-full flex items-center justify-between text-xs font-bold text-cyan-500 hover:text-cyan-600 dark:hover:text-cyan-400 p-2 border-0 bg-transparent cursor-pointer"
                    >
                      Ver Ficha Completa
                      <ChevronRight size={14} />
                    </motion.button>
                  </div>
                ) : (
                  <div className="space-y-4 py-4 text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                      Você ainda não possui uma ficha de treino gerada por IA.
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onNavigateToTab("workout_ficha")}
                      className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold py-2.5 rounded-xl text-xs cursor-pointer border-0"
                    >
                      Configurar Meu Perfil e Gerar
                    </motion.button>
                  </div>
                )}
              </div>

              {/* Quick Stats Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 space-y-4">
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <TrendingUp className="text-emerald-500" size={18} />
                  Ganhos de NutriCoins
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400">NutriCoins de Treino</span>
                    <p className="text-lg font-black text-cyan-500 mt-1">
                      +{(() => {
                        let total = 0;
                        const logsPerDay: { [dateStr: string]: number } = {};
                        exerciseHistory.forEach(log => {
                          total += 15;
                          if (log.loggedAt) {
                            const dStr = log.loggedAt.split('T')[0];
                            logsPerDay[dStr] = (logsPerDay[dStr] || 0) + 1;
                          }
                        });
                        Object.values(logsPerDay).forEach(count => {
                          if (count >= 4) {
                            total += 50;
                          }
                        });
                        return total;
                      })()} NC
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Treinos Concluídos</span>
                    <p className="text-lg font-black text-emerald-500 mt-1">
                      {Array.from(new Set(exerciseHistory.map(log => log.loggedAt ? log.loggedAt.split('T')[0] : '').filter(Boolean))).length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800/80 my-8 pt-8">
            <WorkoutHistory exerciseHistory={exerciseHistory} onDeleteLog={onDeleteLog} selectedDate={selectedDate} />
          </div>
        </>
      ) : (
        /* Biblioteca Pública de Treinos Tab */
        <div className="space-y-6">
          {!hasLibraryAccess ? (
            /* Bloqueio / Paywall para quem nao tem acesso */
            <div className="bg-gradient-to-r from-cyan-600 via-blue-600 to-cyan-700 rounded-3xl p-6 text-white shadow-xl space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 bg-yellow-400/20 backdrop-blur-sm text-yellow-300 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase border border-yellow-400/30 w-fit">
                    <Lock size={10} /> Biblioteca de Treinos Compartilhados
                  </div>
                  <h3 className="text-xl font-black">Navegue e Importe Treinos de Profissionais & Atletas!</h3>
                </div>
                <Crown size={32} className="text-yellow-300 animate-pulse" />
              </div>

              <p className="text-xs text-cyan-100 leading-relaxed">
                Desbloqueie o acesso à biblioteca pública de fichas de treino. Importe instantaneamente com apenas um clique treinos estruturados por personal trainers, fisiculturistas e atletas parceiros de acordo com a quantidade de dias e distribuição muscular ideal.
              </p>

              <div className="bg-cyan-950/20 p-4 rounded-2xl border border-cyan-500/30 space-y-2">
                <h4 className="text-xs font-black uppercase text-yellow-300 tracking-wider">Como funciona o acesso?</h4>
                <p className="text-[11px] text-cyan-150 leading-relaxed">
                  Professores, Personal Trainers e Atletas com o Plano Profissional Mensal publicam seus treinos personalizados de forma pública. Qualquer usuário do SportNutri pode obter acesso completo por 24 horas usando suas moedas NutriCoins!
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-cyan-500/40 pt-5">
                <div className="text-center sm:text-left">
                  <span className="text-xs text-cyan-200">Adquirir passe 24 horas na hora:</span>
                  <p className="text-lg font-black text-yellow-300">800 NC (NutriCoins)</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    disabled={activatingPass || (profile?.xp || 0) < 800}
                    onClick={handleBuyLibraryPass}
                    className={`px-5 py-3 text-xs font-black rounded-xl uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer border-0 shadow-lg ${
                      (profile?.xp || 0) < 800
                        ? "bg-cyan-850 text-cyan-400 cursor-not-allowed"
                        : "bg-yellow-400 hover:bg-yellow-300 text-slate-900 hover:brightness-105"
                    }`}
                  >
                    {activatingPass ? "Ativando..." : "Ativar Passe (24h)"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigateToTab("store")}
                    className="px-5 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-black rounded-xl uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    Ver Planos na Loja
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Acesso Concedido - Mostra a Biblioteca Completa */
            (() => {
              const combined = [...presetRoutines, ...ownRoutines, ...sharedRoutines];
              const unique = combined
                .filter((routine) => !profile || routine.id !== profile.id)
                .filter((routine, index, self) =>
                  self.findIndex((r) => r.id === routine.id) === index
                );

              const filtered = unique.filter((routine) => {
                const matchesSearch = 
                  routine.division.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  (routine.creatorName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                  routine.days.some(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()));
                
                if (filterLevel === "all") return matchesSearch;
                
                const getRoutineLevel = (r: WorkoutRoutine): 'iniciante' | 'intermediario' | 'avancado' => {
                  if (r.level) return r.level;
                  let hasIntermediate = false;
                  let hasAdvanced = false;
                  for (const day of r.days) {
                    for (const ex of day.exercises) {
                      const exLevel = ex.exercise?.nivel;
                      if (exLevel === 'avancado') {
                        hasAdvanced = true;
                      } else if (exLevel === 'intermediario') {
                        hasIntermediate = true;
                      }
                    }
                  }
                  if (hasAdvanced) return 'avancado';
                  if (hasIntermediate) return 'intermediario';
                  return 'iniciante';
                };

                const matchesLevel = getRoutineLevel(routine) === filterLevel;
                return matchesSearch && matchesLevel;
              });

              const sorted = [...filtered].sort((a, b) => {
                if (librarySortField === 'division') {
                  const nameA = (a.division || '').trim().toLowerCase();
                  const nameB = (b.division || '').trim().toLowerCase();
                  return librarySortDirection === 'asc' 
                    ? nameA.localeCompare(nameB) 
                    : nameB.localeCompare(nameA);
                } else {
                  const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                  const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                  return librarySortDirection === 'asc' 
                    ? dateA - dateB 
                    : dateB - dateA;
                }
              });

              const itemsPerPage = 10;
              const totalPages = Math.ceil(sorted.length / itemsPerPage);
              const paginated = sorted.slice(
                (libraryCurrentPage - 1) * itemsPerPage,
                libraryCurrentPage * itemsPerPage
              );

              return (
                <div className="space-y-6">
                  <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-500 tracking-wider bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-1 rounded-full border border-emerald-150">
                          <Unlock size={10} /> Acesso Ativo
                        </span>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1">Biblioteca Pública de Treinos</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          Navegue por treinos completos criados por profissionais e clique para importar diretamente para a sua ficha!
                        </p>
                      </div>
                    </div>

                    {/* Search and filter bar */}
                    <div className="space-y-4 pt-2">
                      <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          type="text"
                          placeholder="Buscar por divisao muscular (ex: ABC, Peito, Pernas)..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-700 dark:text-white focus:ring-1 focus:ring-cyan-500 outline-none"
                        />
                      </div>

                      {/* Filter and Sorting Buttons Row */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
                        {/* Level Filters */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setFilterLevel("all")}
                            className={`px-3 py-1.5 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all cursor-pointer border ${
                              filterLevel === "all"
                                ? 'bg-cyan-500 hover:bg-cyan-600 text-white border-transparent shadow-sm'
                                : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 border-slate-150 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            Todos os Níveis
                          </button>
                          <button
                            type="button"
                            onClick={() => setFilterLevel("iniciante")}
                            className={`px-3 py-1.5 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all cursor-pointer border ${
                              filterLevel === "iniciante"
                                ? 'bg-cyan-500 hover:bg-cyan-600 text-white border-transparent shadow-sm'
                                : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 border-slate-150 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            Iniciante
                          </button>
                          <button
                            type="button"
                            onClick={() => setFilterLevel("intermediario")}
                            className={`px-3 py-1.5 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all cursor-pointer border ${
                              filterLevel === "intermediario"
                                ? 'bg-cyan-500 hover:bg-cyan-600 text-white border-transparent shadow-sm'
                                : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 border-slate-150 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            Intermediário
                          </button>
                          <button
                            type="button"
                            onClick={() => setFilterLevel("avancado")}
                            className={`px-3 py-1.5 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all cursor-pointer border ${
                              filterLevel === "avancado"
                                ? 'bg-cyan-500 hover:bg-cyan-600 text-white border-transparent shadow-sm'
                                : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 border-slate-150 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            Avançado
                          </button>
                        </div>

                        {/* Sorting Buttons */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                          <span className="text-slate-400 dark:text-slate-500 font-semibold mr-0.5">Ordenar:</span>
                          
                          <button
                            type="button"
                            onClick={() => {
                              if (librarySortField === 'division') {
                                setLibrarySortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                              } else {
                                setLibrarySortField('division');
                                setLibrarySortDirection('asc');
                              }
                            }}
                            className={`px-3 py-1.5 rounded-xl font-medium transition-all duration-200 flex items-center gap-1 border cursor-pointer ${
                              librarySortField === 'division'
                                ? 'bg-purple-100 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/50 text-purple-700 dark:text-purple-300 shadow-sm font-semibold'
                                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-150 dark:border-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                            }`}
                          >
                            <span>A-Z</span>
                            {librarySortField === 'division' && (librarySortDirection === 'asc' ? ' (Crescente ▲)' : ' (Decrescente ▼)')}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (librarySortField === 'createdAt') {
                                setLibrarySortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                              } else {
                                setLibrarySortField('createdAt');
                                setLibrarySortDirection('desc');
                              }
                            }}
                            className={`px-3 py-1.5 rounded-xl font-medium transition-all duration-200 flex items-center gap-1 border cursor-pointer ${
                              librarySortField === 'createdAt'
                                ? 'bg-purple-100 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/50 text-purple-700 dark:text-purple-300 shadow-sm font-semibold'
                                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-150 dark:border-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                            }`}
                          >
                            <span>Data</span>
                            {librarySortField === 'createdAt' && (librarySortDirection === 'asc' ? ' (Crescente ▲)' : ' (Decrescente ▼)')}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Grid of Workouts */}
                  {loadingLibrary ? (
                    <div className="text-center py-12 text-slate-500">Carregando treinos...</div>
                  ) : paginated.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 font-medium bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6">
                      Nenhum treino encontrado nesta categoria ou busca.
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {paginated.map((routine) => {
                          const muscles = Array.from(new Set(
                            routine.days.flatMap(d => 
                              d.exercises.flatMap(e => [
                                e.exercise.grupoPrincipal, 
                                ...(e.exercise.gruposSecundarios || [])
                              ])
                            )
                          )).filter(Boolean);

                          const formatMuscle = (m: string) => {
                            if (m === 'mg_nsztg4yei' || m.toLowerCase() === 'mg_nsztg4yei') {
                              return 'Posterior de Ombros';
                            }
                            const map: { [key: string]: string } = {
                              peito: "Peitoral", peitoral: "Peitoral", costas: "Costas", ombros: "Ombros",
                              trapezio: "Trapézio", posterior_ombros: "Posterior de Ombros",
                              biceps: "Bíceps", triceps: "Tríceps", abdomen: "Abdômen", abdome: "Abdômen",
                              obliquos: "Oblíquos", quadriceps: "Quadríceps", pernas: "Quadríceps",
                              posterior_coxas: "Posterior de Coxas", gluteos: "Glúteos",
                              panturrilhas: "Panturrilhas", antebracos: "Antebraços",
                              lombar: "Lombar", abdome_lombar: "Abdômen/Lombar"
                            };
                            
                            // Check if we can map custom muscle group IDs from localStorage
                            const customMusclesRaw = localStorage.getItem('sportnutri_custom_muscle_groups');
                            if (customMusclesRaw) {
                              try {
                                const parsed = JSON.parse(customMusclesRaw) as { id: string; label: string }[];
                                const customMatch = parsed.find(item => item.id === m);
                                if (customMatch) return customMatch.label;
                              } catch (e) {
                                console.error("Erro ao ler grupos musculares customizados:", e);
                              }
                            }
                            
                            return map[m] || m;
                          };

                          const totalExercises = routine.days.reduce((acc, d) => acc + d.exercises.length, 0);
                          const isOwnCard = profile && (routine.user_id === profile.id || (profile.role === 'admin' && !routine.id.startsWith("preset_")));
                          const isActive = routine.id === profile?.id || routine.id === currentRoutine?.id;

                          return (
                            <div 
                              key={routine.id}
                              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
                            >
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center flex-wrap gap-1.5 shrink-0">
                                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-cyan-600 bg-cyan-50 dark:bg-cyan-950/20 px-2 py-0.5 rounded-md border border-cyan-100/30">
                                      {routine.daysCount || routine.days.length} dias ({routine.days.map(d => d.id).join(", ")})
                                    </span>
                                    {routine.level && (
                                      <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-amber-600 bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded-md border border-amber-100/30">
                                        {routine.level === 'iniciante' ? 'Iniciante' : routine.level === 'intermediario' ? 'Intermediário' : 'Avançado'}
                                      </span>
                                    )}
                                    {isOwnCard && (
                                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                                        routine.isPrivate 
                                          ? "text-slate-500 bg-slate-50 dark:bg-slate-950/20 border-slate-200/50" 
                                          : "text-purple-600 bg-purple-50 dark:bg-purple-950/20 border-purple-100/30"
                                      }`}>
                                        {routine.isPrivate ? "Privado" : "Público"}
                                      </span>
                                    )}
                                  </div>
                                  
                                  <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                                    <Download size={10} /> {routine.downloads || 0} importações
                                  </span>
                                </div>

                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    {editingRoutineId === routine.id ? (
                                      <div className="flex items-center gap-1.5 w-full">
                                        <input
                                          type="text"
                                          value={editingRoutineTitle}
                                          onChange={(e) => setEditingRoutineTitle(e.target.value)}
                                          autoFocus
                                          onFocus={(e) => e.target.select()}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              handleSaveOwnRoutineTitle(routine.id);
                                            } else if (e.key === 'Escape') {
                                              setEditingRoutineId(null);
                                            }
                                          }}
                                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-white focus:ring-1 focus:ring-purple-500 focus:outline-none"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => handleSaveOwnRoutineTitle(routine.id)}
                                          className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0 border-0 bg-transparent"
                                          title="Salvar"
                                        >
                                          <Check size={14} className="stroke-[3]" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setEditingRoutineId(null)}
                                          className="p-1.5 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-950/20 rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0 border-0 bg-transparent"
                                          title="Cancelar"
                                        >
                                          <X size={14} className="stroke-[3]" />
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                          <h4 className={`text-sm font-black transition-colors duration-200 ${
                                            savedRoutineId === routine.id 
                                              ? "text-emerald-500 dark:text-emerald-400 font-black scale-102" 
                                              : "text-slate-900 dark:text-white"
                                          }`}>
                                            {routine.division}
                                          </h4>
                                          {savedRoutineId === routine.id && (
                                            <div className="flex items-center gap-1 text-emerald-500 dark:text-emerald-400 font-bold text-[10px] shrink-0 animate-pulse">
                                              <Check size={12} className="stroke-[3.5] text-emerald-500" />
                                              <span className="uppercase tracking-wider font-black">Salvo!</span>
                                            </div>
                                          )}
                                        </div>
                                        
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-bold">
                                          <div className="w-6 h-6 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center shrink-0 overflow-hidden border border-slate-200/50 dark:border-slate-800/80">
                                            {routine.creatorAvatarUrl ? (
                                              <img 
                                                src={routine.creatorAvatarUrl} 
                                                alt={routine.creatorName || "Criador"} 
                                                className="w-full h-full object-cover"
                                                referrerPolicy="no-referrer"
                                              />
                                            ) : (
                                              <User size={11} className="text-slate-500" />
                                            )}
                                          </div>
                                          <span className="text-[11px] truncate">{routine.creatorName || "Profissional Parceiro"}</span>
                                          <span className="bg-yellow-400/20 text-yellow-500 dark:text-yellow-400 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase border border-yellow-400/30">
                                            {routine.creatorRole || "Profissional"}
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {isOwnCard && editingRoutineId !== routine.id && (
                                    <div className="flex items-center gap-1 shrink-0 ml-2">
                                      {deletingRoutineId === routine.id ? (
                                        <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-950/25 border border-red-100 dark:border-red-900/30 px-2.5 py-1 rounded-full animate-in fade-in zoom-in-95 duration-150">
                                          <span className="text-[9px] font-black uppercase tracking-wider text-red-600 dark:text-red-400">
                                            EXCLUIR?
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteOwnRoutine(routine.id)}
                                            className="text-red-600 dark:text-red-400 hover:scale-110 active:scale-95 transition-all cursor-pointer p-0.5 flex items-center justify-center border-0 bg-transparent"
                                            title="Confirmar"
                                          >
                                            <Check size={12} className="stroke-[3]" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setDeletingRoutineId(null)}
                                            className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 hover:scale-110 active:scale-95 transition-all cursor-pointer p-0.5 flex items-center justify-center border-0 bg-transparent"
                                            title="Cancelar"
                                          >
                                            <X size={12} className="stroke-[3]" />
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-1">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditingRoutineId(routine.id);
                                              setEditingRoutineTitle(routine.division);
                                            }}
                                            className="p-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-150 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0"
                                            title="Editar Título"
                                          >
                                            <Pencil size={12} className="stroke-[2.5]" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setDeletingRoutineId(routine.id)}
                                            className="p-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0"
                                            title="Excluir"
                                          >
                                            <Trash2 size={12} className="stroke-[2.5]" />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>

                                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                                  Distribuicao muscular: {muscles.map(formatMuscle).join(", ") || "Geral"}
                                </p>

                                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl space-y-2">
                                  <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Resumo do Cronograma:</span>
                                  <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1 font-semibold leading-relaxed">
                                    {routine.days.map(d => (
                                      <div key={d.id} className="flex justify-between">
                                        <span>Treino {d.id}: {d.name}</span>
                                        <span className="text-[9px] text-slate-400">{d.exercises.length} exs</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              <div className="border-t border-slate-50 dark:border-slate-800/80 pt-4 flex items-center justify-between">
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">{totalExercises} exercicios no total</span>
                                {isActive ? (
                                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 rounded-xl border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-1 select-none shrink-0 font-extrabold">
                                    <Check size={12} className="stroke-[3.5]" />
                                    Ativo
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleCloneRoutine(routine)}
                                    className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-105 active:scale-95 text-white text-xs font-black rounded-xl uppercase tracking-wider cursor-pointer border-0 shadow-lg shadow-cyan-500/10 flex items-center gap-1"
                                  >
                                    <Download size={12} /> Importar Treino
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Pagination Controls */}
                      {totalPages > 1 && (
                        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-4">
                          <button
                            type="button"
                            onClick={() => setLibraryCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={libraryCurrentPage === 1}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-600 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          >
                            Anterior
                          </button>
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setLibraryCurrentPage(p)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
                                libraryCurrentPage === p
                                  ? 'bg-purple-600 border-transparent text-white shadow-sm'
                                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                              }`}
                            >
                              {p}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => setLibraryCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={libraryCurrentPage === totalPages}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-600 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          >
                            Próximo
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()
          )}
        </div>
      )}
    </div>
  );
};
