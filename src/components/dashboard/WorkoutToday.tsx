import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Play, 
  Pause, 
  Check, 
  Clock, 
  Dumbbell, 
  ChevronRight, 
  Plus, 
  RotateCcw,
  Sparkles,
  Info,
  Calendar,
  Smile,
  AlertTriangle,
  History,
  HelpCircle,
  X,
  Volume2,
  VolumeX
} from "lucide-react";
import { Profile, UserWorkoutProfile, WorkoutRoutine, PlannedExercise, ExerciseLog, UserData } from "../../types";
import { getMuscleGroupLabel } from "../../utils";

const playTimerSound = (type: 'beep') => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Explicitly resume context if suspended (crucial for browser security rules)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    if (type === 'beep') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(900, ctx.currentTime);
      
      // Amplified volume (6.0 for extreme audibility)
      gain.gain.setValueAtTime(6.0, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.18);
    }
  } catch (error) {
    console.error("Audio error:", error);
  }
};

interface WorkoutTodayProps {
  profile: Profile | null;
  workoutProfile: UserWorkoutProfile | null;
  userData: UserData | null;
  currentRoutine: WorkoutRoutine | null;
  onLogExercise: (log: Omit<ExerciseLog, 'id'>) => Promise<void>;
  exerciseHistory: ExerciseLog[];
  selectedDate?: Date;
}

export const WorkoutToday: React.FC<WorkoutTodayProps> = ({
  profile,
  workoutProfile,
  userData,
  currentRoutine,
  onLogExercise,
  exerciseHistory,
  selectedDate
}) => {
  const getLogDate = () => {
    if (!selectedDate) return new Date().toISOString();
    const now = new Date();
    const logDate = new Date(selectedDate);
    logDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    return logDate.toISOString();
  };

  const availableDays = currentRoutine?.days || [];
  const [selectedDayId, setSelectedDayId] = useState<string>(availableDays[0]?.id || "");
  const currentDay = availableDays.find(d => d.id === selectedDayId) || availableDays[0];

  const [activeExerciseIdx, setActiveExerciseIdx] = useState<number>(0);
  const activePlannedEx: PlannedExercise | undefined = currentDay?.exercises[activeExerciseIdx];

  const [loggedSets, setLoggedSets] = useState<{ carga: number; reps: number; completed: boolean }[]>([]);
  const [rpe, setRpe] = useState<number>(3); // 3: Difícil
  const [observations, setObservations] = useState<string>("");
  const [loggedToday, setLoggedToday] = useState<{ [exName: string]: boolean }>({});
  
  // Cardio state variables
  const [trainingMode, setTrainingMode] = useState<'strength' | 'cardio'>('strength');
  const [cardioActivity, setCardioActivity] = useState<string>('corrida_caminhada');
  const [cardioDuration, setCardioDuration] = useState<string>('');
  const [cardioDistance, setCardioDistance] = useState<string>('');
  const [cardioIntensity, setCardioIntensity] = useState<'low' | 'medium' | 'high'>('medium');
  const [cardioReps, setCardioReps] = useState<string>('');
  const [cardioNotes, setCardioNotes] = useState<string>('');
  const [cardioRpe, setCardioRpe] = useState<number>(3);
  const [isSavingCardio, setIsSavingCardio] = useState<boolean>(false);

  // Keeps the checked indicators synced with the completed exercises of today in exerciseHistory
  useEffect(() => {
    if (exerciseHistory) {
      const todayStr = new Date().toLocaleDateString("pt-BR");
      const logged: { [exName: string]: boolean } = {};
      
      exerciseHistory.forEach(log => {
        if (log.loggedAt && log.exercicio) {
          const logDateStr = new Date(log.loggedAt).toLocaleDateString("pt-BR");
          if (logDateStr === todayStr) {
            logged[log.exercicio] = true;
          }
        }
      });
      
      setLoggedToday(logged);
    }
  }, [exerciseHistory]);

  const [timerMaxSeconds, setTimerMaxSeconds] = useState<number>(60);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [isTimerSoundEnabled, setIsTimerSoundEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("workout_timer_sound_enabled");
    return saved !== null ? saved === "true" : true;
  });

  const toggleTimerSound = () => {
    setIsTimerSoundEnabled(prev => {
      const newVal = !prev;
      localStorage.setItem("workout_timer_sound_enabled", String(newVal));
      return newVal;
    });
  };

  // Tooltip details modal state
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);

  const [usingHistoryValue, setUsingHistoryValue] = useState<string | null>(null);

  // Fallback default sex
  const userSex = userData?.sex || "male";

  useEffect(() => {
    if (activePlannedEx) {
      const logs = exerciseHistory.filter(l => l.exercicio.toLowerCase() === activePlannedEx.exercise.nome.toLowerCase());
      const sorted = [...logs].sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime());
      const lastLog = sorted[0];

      let initial;
      if (lastLog && lastLog.series && lastLog.series.length > 0) {
        setUsingHistoryValue(new Date(lastLog.loggedAt).toLocaleDateString("pt-BR"));
        initial = lastLog.series.map(s => ({
          carga: s.carga || 0,
          reps: s.reps || 0,
          completed: false
        }));
      } else {
        setUsingHistoryValue(null);
        initial = activePlannedEx.series.map(s => ({
          carga: s.carga || 10,
          reps: s.reps || 12,
          completed: false
        }));
      }

      setLoggedSets(initial);
      setObservations("");
      setRpe(3);
      setIsHelpOpen(false); // Close tech tips when switching
    }
  }, [activeExerciseIdx, selectedDayId, currentRoutine, exerciseHistory, activePlannedEx]);

  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(s => {
          const nextSeconds = s - 1;
          if (isTimerSoundEnabled) {
            if (nextSeconds >= 0 && nextSeconds <= 4) {
              playTimerSound('beep');
            }
          }
          return nextSeconds;
        });
      }, 1000);
    } else if (timerSeconds === 0 && isTimerRunning) {
      setIsTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds, isTimerSoundEnabled]);

  const startRestTimer = (seconds: number) => {
    setTimerMaxSeconds(seconds);
    setTimerSeconds(seconds);
    setIsTimerRunning(true);
  };

  const stopRestTimer = () => {
    setIsTimerRunning(false);
    setTimerSeconds(0);
  };

  const getExerciseStats = (name: string) => {
    const logs = exerciseHistory.filter(l => l.exercicio.toLowerCase() === name.toLowerCase());
    if (logs.length === 0) return { lastWeight: 0, suggestion: "Iniciar com carga moderada de teste" };

    const sorted = [...logs].sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime());
    const lastLog = sorted[0];
    const highestWeight = Math.max(...lastLog.series.map(s => s.carga), 0);

    let progressSuggestion = "";
    if (lastLog.esforco <= 2) {
      progressSuggestion = "Subir +2kg a +5kg (Pois o último esforço foi fácil)";
    } else if (lastLog.esforco === 3) {
      progressSuggestion = "Manter carga ou subir +1kg (Esforço ideal)";
    } else if (lastLog.esforco === 4) {
      progressSuggestion = "Manter carga e focar estritamente na forma";
    } else {
      progressSuggestion = "Reduzir -2kg ou priorizar controle e amplitude";
    }

    return {
      lastWeight: highestWeight,
      suggestion: progressSuggestion
    };
  };

  // Human technical exercise execution tips dataset
  const getExerciseHelpTips = (name: string) => {
    const normalName = name.toLowerCase();
    if (normalName.includes("supino")) {
      return {
        correta: "Deite de costas e aduza as escápulas firmemente contra o banco. Desça a barra de forma controlada até aproximar do peito na linha do esterno (mamilos) mantendo o antebraço vertical sob a barra. Empurre explodindo sem colapsar os ombros.",
        erros: "Bater a barra com violência no peito para pegar impulso; cotovelos abertos demais a 90 graus (força excessivamente os rotadores); tirar os quadris do banco.",
        evitar: "Manter ângulo dos braços com o tronco em aproximadamente 75 graus, retrair escápulas ativamente e manter pés fixados firmemente no chão (leg drive)."
      };
    }
    if (normalName.includes("flexão") || normalName.includes("apoio")) {
      return {
        correta: "Mantenha as mãos ligeiramente mais abertas que a largura dos ombros, punhos sob cotovelos. Core totalmente contraído formando uma prancha reta. Desça até que o peito quase encoste no solo.",
        erros: "Deixar o quadril cair em direção ao chão (lombar hiperestendida); pescoço esticado forçadamente para baixo; cotovelos abertos na largura máxima.",
        evitar: "Aperte as nádegas e o abdome durante toda a execução para solidificar a musculatura central e proteger a região lombar."
      };
    }
    if (normalName.includes("rosca") || normalName.includes("martelo")) {
      return {
        correta: "Em pé ou sentado, segure os halteres mantendo os cotovelos travados nas laterais do abdome. Flexione os cotovelos contraindo bíceps e braquiorradial. Desça de forma cadenciada e controlada.",
        erros: "Mover os cotovelos para frente para encurtar a trajetória; balançar o tronco (roubar com impulso lombar); tensionar os ombros para cima.",
        evitar: "Incline o tronco levemente para a frente e certifique-se de que o bíceps esteja fazendo toda a força sem usar empurrões gravitacionais."
      };
    }
    if (normalName.includes("agachamento") || normalName.includes("leg press") || normalName.includes("afundo") || normalName.includes("extensora")) {
      return {
        correta: "Inicie o movimento dobrando os quadris para trás, como se estivesse sentando em um banco. Desça mantendo o tronco erguido e joelhos seguindo a linha do dedão do pé. Desça até pelo menos os quadris ficarem paralelos ao chão.",
        erros: "Desabar os joelhos para dentro ao subir (valgo dinâmico); tirar os calcanhares do solo; curvar excessivamente a coluna lombar (butt wink).",
        evitar: "Empurre o chão pelas solas inteiras dos pés, concentre o peso no meio das solas/calcanhares e force ativamente os joelhos para fora durante o agachar."
      };
    }
    if (normalName.includes("puxada") || normalName.includes("remada") || normalName.includes("pulldown") || normalName.includes("costas")) {
      return {
        correta: "Segure a barra ou polia, decline levemente o tronco para trás (no máximo 15 graus). Puxe guiando ativamente por meio dos cotovelos até a linha superior do peito, aduzindo as escápulas.",
        erros: "Iniciar o movimento puxando apenas com os braços; balanço violento do tronco; curvar os ombros para a frente na descida.",
        evitar: "Imagine puxar os cotovelos em direção aos bolsos das calças, ativando as dorsais intensamente antes de usar os antebraços."
      };
    }
    
    // Default fallback
    return {
      correta: "Mantenha a postura ereta, core ativado e desloque a carga em cadência uniforme: 1 a 2 segundos na fase concêntrica (energia imediata) e 2 a 3 segundos na fase excêntrica (resistência).",
      erros: "Uso desproporcional de balanço articular; amplitude parcial ineficiente; respiração bloqueada.",
      evitar: "Respirar regularmente: soltar o ar no pico da força (concêntrico) e puxar o ar ao reter o peso de volta (excêntrico)."
    };
  };

  const tips = activePlannedEx 
    ? (activePlannedEx.customTips || getExerciseHelpTips(activePlannedEx.exercise.nome)) 
    : null;

  // Visual dynamic anatomy SVG representing target muscle group in motion
  const renderExecutionAnimation = (name: string, exerciseObj?: any) => {
    if (exerciseObj?.gifUrl) {
      return (
        <div className="w-full h-full max-h-[300px] flex flex-col items-center justify-center overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-2">
          <img src={exerciseObj.gifUrl} alt={name} className="max-w-full max-h-[250px] object-contain rounded-xl" referrerPolicy="no-referrer" />
          <span className="text-[10px] font-bold text-slate-400 mt-2">Demonstração Animada do Exercício</span>
        </div>
      );
    }
    const isMale = userSex === "male";
    const normalName = name.toLowerCase();

    // Check which muscle is targeted
    const isPeito = normalName.includes("supino") || normalName.includes("flex") || normalName.includes("apoio") || normalName.includes("peito") || normalName.includes("crucifixo");
    const isCostas = normalName.includes("puxada") || normalName.includes("remada") || normalName.includes("pulldown") || normalName.includes("costas") || normalName.includes("terra");
    const isPernas = normalName.includes("agacha") || normalName.includes("leg press") || normalName.includes("afundo") || normalName.includes("extensora") || normalName.includes("flexora") || normalName.includes("pernas") || normalName.includes("panturrilha") || normalName.includes("stiff");
    const isBiceps = normalName.includes("rosca") || normalName.includes("martelo") || normalName.includes("biceps");
    const isTriceps = normalName.includes("triceps") || normalName.includes("coice") || normalName.includes("frances") || normalName.includes("paralela");
    const isOmbros = normalName.includes("desenvolvimento") || normalName.includes("elevacao") || normalName.includes("ombros") || normalName.includes("militar");
    const isAbdome = normalName.includes("abdominal") || normalName.includes("infra") || normalName.includes("prancha") || normalName.includes("abdome");

    // Unified responsive color palette matching WorkoutDashboard
    const skeletonColor = "fill-slate-100 dark:fill-slate-800 stroke-slate-200 dark:stroke-slate-700";
    const lineStroke = "stroke-slate-300 dark:stroke-slate-600";
    
    const getMuscleColor = (targeted: boolean) => {
      return targeted ? "#ef4444" : "rgba(148, 163, 184, 0.25)"; // slate-400 with opacity when unselected
    };

    const useBackView = isCostas || isTriceps;

    // Outer container elements and exercise weights overlays
    if (useBackView) {
      return (
        <svg viewBox="0 0 200 320" className="w-full h-full max-h-[300px] filter drop-shadow-xl select-none mx-auto p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl">
          {/* External exercise equipment background layers */}
          {isCostas && (
            <g>
              <line x1="100" y1="10" x2="100" y2="70" stroke="#94a3b8" strokeDasharray="2,2" opacity="0.5" />
              <motion.g animate={{ y: [-15, 12, -15] }} transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}>
                <path d="M40 50 Q100 44 160 50" fill="none" stroke="#475569" strokeWidth="3" />
                <circle cx="40" cy="50" r="2" fill="#1e293b" />
                <circle cx="160" cy="50" r="2" fill="#1e293b" />
              </motion.g>
            </g>
          )}

          {isTriceps && (
            <g>
              <motion.g animate={{ scaleY: [0.7, 1.2, 0.7] }} style={{ transformOrigin: "100px 30px" }} transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}>
                <line x1="100" y1="30" x2="100" y2="105" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3,3" />
                <path d="M96 105 L104 105" stroke="#475569" strokeWidth="3" />
              </motion.g>
            </g>
          )}

          {/* Model Back Head */}
          <path d="M100 22 C109 22 115 28 115 39 C115 49 108 56 100 56 C92 56 85 49 85 39 C85 28 91 22 100 22 Z" className={skeletonColor} strokeWidth="1.2" />
          <path d="M94 53 C94 62 95 64 93 67 L107 67 C105 64 106 62 106 53 Z" className={skeletonColor} strokeWidth="1.2" />

          {/* Torso Outline */}
          <path 
            d={isMale 
              ? "M72 67 C68 90 74 135 84 138 L116 138 C126 135 132 90 128 67 Z" 
              : "M76 67 C72 88 80 115 86 138 L114 138 C120 115 128 88 124 67 Z"
            } 
            className={skeletonColor} 
            strokeWidth="1.5" 
          />

          {/* Back Muscles (Lats / Trapezius) with pulse effect */}
          <path 
            d={isMale 
              ? "M80 68 Q100 78 120 68 C128 85 126 115 116 136 Q100 140 84 136 C74 115 72 85 80 68 Z" 
              : "M82 68 Q100 78 118 68 C124 85 122 115 114 136 Q100 140 86 136 C78 115 76 85 82 68 Z"
            } 
            fill={getMuscleColor(isCostas)} 
            className={`transition-all duration-300 ${isCostas ? "animate-pulse" : ""}`}
            stroke="rgba(0,0,0,0.12)"
            strokeWidth="1"
          />
          <line x1="100" y1="68" x2="100" y2="136" className={lineStroke} strokeWidth="1" strokeDasharray="3,3" />

          {/* Shoulders */}
          <path 
            d="M80 66 C65 67 67 85 82 86 Z" 
            fill={getMuscleColor(isOmbros)} 
            stroke="rgba(0,0,0,0.1)"
            strokeWidth="1"
          />
          <path 
            d="M120 66 C135 67 133 85 118 86 Z" 
            fill={getMuscleColor(isOmbros)} 
            stroke="rgba(0,0,0,0.1)"
            strokeWidth="1"
          />

          {/* Triceps (Behind Arms) with dynamic extension pull contraction */}
          <motion.g animate={isTriceps ? { scaleY: [0.9, 1.1, 0.9] } : {}} style={{ transformOrigin: "100px 65px" }} transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}>
            <path 
              d="M68 85 C54 94 58 114 68 115 Z" 
              fill={getMuscleColor(isTriceps)} 
              stroke="rgba(0,0,0,0.1)"
              strokeWidth="1"
            />
            <path 
              d="M132 85 C146 94 142 114 132 115 Z" 
              fill={getMuscleColor(isTriceps)} 
              stroke="rgba(0,0,0,0.1)"
              strokeWidth="1"
            />
          </motion.g>

          {/* Executing pull movement for Costas or Triceps load */}
          <motion.g animate={useBackView ? { y: [-10, 8, -10] } : {}} transition={{ repeat: Infinity, duration: useBackView ? 2.0 : 1.8, ease: "easeInOut" }}>
            <path d="M62 115 C54 125 50 145 56 155 C62 155 64 125 64 115 Z" className={skeletonColor} strokeWidth="1" />
            <path d="M138 115 C146 125 150 145 144 155 C138 155 136 125 136 115 Z" className={skeletonColor} strokeWidth="1" />
            <circle cx="56" cy="158" r="4.5" className={skeletonColor} />
            <circle cx="144" cy="158" r="4.5" className={skeletonColor} />
          </motion.g>

          {/* Glutes & Pelvis */}
          <path d="M84 138 L116 138 C122 150 118 165 114 165 L86 165 C82 165 78 150 84 138 Z" className={skeletonColor} strokeWidth="1.2" />
          <line x1="100" y1="138" x2="100" y2="165" className={lineStroke} strokeWidth="1" />

          {/* Back Thighs (Hamstrings) */}
          <path 
            d="M78 165 C68 185 64 215 78 238 C88 238 96 215 96 165 Z" 
            fill={getMuscleColor(isPernas)} 
            stroke="rgba(0,0,0,0.12)"
            strokeWidth="1"
          />
          <path 
            d="M122 165 C132 185 136 215 122 238 C112 238 104 215 104 165 Z" 
            fill={getMuscleColor(isPernas)} 
            stroke="rgba(0,0,0,0.12)"
            strokeWidth="1"
          />

          {/* Calves */}
          <circle cx="78" cy="242" r="5" className={skeletonColor} />
          <circle cx="122" cy="242" r="5" className={skeletonColor} />
          <path d="M76 245 C68 263 70 283 78 296 C84 296 86 283 84 245 Z" className={skeletonColor} strokeWidth="1" />
          <path d="M124 245 C132 263 130 283 122 296 C116 296 114 283 116 245 Z" className={skeletonColor} strokeWidth="1" />
          <path d="M74 296 L86 296 L90 305 L68 305 Z" className={skeletonColor} strokeWidth="1" />
          <path d="M126 296 L114 296 L110 305 L132 305 Z" className={skeletonColor} strokeWidth="1" />
        </svg>
      );
    }

    // Default view: FRONT (with custom reactive animations)
    return (
      <svg viewBox="0 0 200 320" className="w-full h-full max-h-[300px] filter drop-shadow-xl select-none mx-auto p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl">
        {/* Supino / chest press equipment overlays */}
        {isPeito && (
          <g>
            <rect x="75" y="65" width="50" height="90" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="3,3" opacity="0.4" />
            <motion.g animate={{ y: [-20, 15, -20] }} transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}>
              <line x1="25" y1="100" x2="175" y2="100" stroke="#475569" strokeWidth="3" />
              <rect x="15" y="92" width="10" height="16" fill="#1e293b" rx="2" />
              <rect x="175" y="92" width="10" height="16" fill="#1e293b" rx="2" />
            </motion.g>
          </g>
        )}

        {/* Squat bar workout background element */}
        {isPernas && (
          <g>
            <motion.g animate={{ y: [0, 18, 0] }} transition={{ repeat: Infinity, duration: 2.0, ease: "easeInOut" }}>
              <line x1="25" y1="62" x2="175" y2="62" stroke="#475569" strokeWidth="3" />
              <rect x="15" y="55" width="10" height="14" fill="#1e293b" rx="2" />
              <rect x="175" y="55" width="10" height="14" fill="#1e293b" rx="2" />
            </motion.g>
          </g>
        )}

        {/* Squat exercise / Pernas group translates whole body on feet pivot */}
        <motion.g 
          animate={isPernas ? { y: [0, 18, 0] } : isAbdome ? { scaleY: [1, 0.9, 1], y: [0, 8, 0] } : {}} 
          style={{ transformOrigin: "100px 242px" }} 
          transition={{ repeat: Infinity, duration: isPernas ? 2.0 : 1.8, ease: "easeInOut" }}
        >
          {/* Anatomical Model Front Head */}
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

          {/* Dynamic Chest (Peito) with pulsing tension colors */}
          <g className={`transition-all duration-300 ${isPeito ? "animate-pulse" : ""}`}>
            <path 
              d={isMale 
                ? "M100 70 L80 68 C74 76 74 94 100 98 Z" 
                : "M100 72 L82 70 C78 78 78 92 100 95 Z"
              } 
              fill={getMuscleColor(isPeito)} 
              stroke="rgba(0,0,0,0.12)"
              strokeWidth="1"
            />
            <path 
              d={isMale 
                ? "M100 70 L120 68 C126 76 126 94 100 98 Z" 
                : "M100 72 L118 70 C122 78 122 92 100 95 Z"
              } 
              fill={getMuscleColor(isPeito)} 
              stroke="rgba(0,0,0,0.12)"
              strokeWidth="1"
            />
          </g>

          {/* Dynamic Abs (Abdome) crunch scale contraction */}
          <path 
            d={isMale 
              ? "M82 100 L118 100 C121 115 116 135 114 138 L86 138 C84 135 79 115 82 100 Z" 
              : "M84 97 L116 97 C118 112 114 135 112 138 L88 138 C86 135 82 112 84 97 Z"
            } 
            fill={getMuscleColor(isAbdome)} 
            className={`transition-all duration-300 ${isAbdome ? "animate-pulse" : ""}`}
            stroke="rgba(0,0,0,0.12)"
            strokeWidth="1"
          />
          <line x1="100" y1="100" x2="100" y2="138" className={lineStroke} strokeWidth="0.8" strokeDasharray="2,2" />
          <line x1="88" y1="112" x2="112" y2="112" className={lineStroke} strokeWidth="0.8" strokeDasharray="2,2" />
          <line x1="88" y1="124" x2="112" y2="124" className={lineStroke} strokeWidth="0.8" strokeDasharray="2,2" />

          {/* Shoulders (Ombros) */}
          <g>
            <path 
              d="M80 66 C65 67 67 85 82 86 Z" 
              fill={getMuscleColor(isOmbros)} 
              stroke="rgba(0,0,0,0.1)"
              strokeWidth="1"
            />
            <path 
              d="M120 66 C135 67 133 85 118 86 Z" 
              fill={getMuscleColor(isOmbros)} 
              stroke="rgba(0,0,0,0.1)"
              strokeWidth="1"
            />
          </g>

          {/* Chest press (Peito) arm execution overlay */}
          {isPeito && (
            <motion.g animate={{ y: [-10, 8, -10] }} transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}>
              <path d="M68 85 C54 94 58 114 68 115 Z" fill={getMuscleColor(false)} stroke="rgba(0,0,0,0.1)" />
              <path d="M132 85 C146 94 142 114 132 115 Z" fill={getMuscleColor(false)} stroke="rgba(0,0,0,0.1)" />
              <path d="M62 115 C54 125 50 145 56 155 C62 155 64 125 64 115 Z" className={skeletonColor} />
              <path d="M138 115 C146 125 150 145 144 155 C138 155 136 125 136 115 Z" className={skeletonColor} />
              <circle cx="56" cy="158" r="4.5" className={skeletonColor} />
              <circle cx="144" cy="158" r="4.5" className={skeletonColor} />
            </motion.g>
          )}

          {/* Shoulder raise execution overlay */}
          {isOmbros && (
            <g>
              {/* Left arm raise */}
              <motion.g animate={{ rotate: [0, -50, 0] }} style={{ transformOrigin: "80px 66px" }} transition={{ repeat: Infinity, duration: 2.0, ease: "easeInOut" }}>
                <path d="M68 85 C54 94 58 114 68 115 Z" fill={getMuscleColor(isOmbros)} stroke="rgba(0,0,0,0.1)" />
                <path d="M62 115 C54 125 50 145 56 155 C62 155 64 125 64 115 Z" className={skeletonColor} />
                <circle cx="56" cy="158" r="4.5" className={skeletonColor} />
                <rect x="42" y="155" width="28" height="6" fill="#475569" rx="1" />
                <rect x="38" y="149" width="6" height="18" fill="#1e293b" rx="2" />
                <rect x="68" y="149" width="6" height="18" fill="#1e293b" rx="2" />
              </motion.g>
              {/* Right arm raise */}
              <motion.g animate={{ rotate: [0, 50, 0] }} style={{ transformOrigin: "120px 66px" }} transition={{ repeat: Infinity, duration: 2.0, ease: "easeInOut" }}>
                <path d="M132 85 C146 94 142 114 132 115 Z" fill={getMuscleColor(isOmbros)} stroke="rgba(0,0,0,0.1)" />
                <path d="M138 115 C146 125 150 145 144 155 C138 155 136 125 136 115 Z" className={skeletonColor} />
                <circle cx="144" cy="158" r="4.5" className={skeletonColor} />
                <rect x="130" y="155" width="28" height="6" fill="#475569" rx="1" />
                <rect x="126" y="149" width="6" height="18" fill="#1e293b" rx="2" />
                <rect x="156" y="149" width="6" height="18" fill="#1e293b" rx="2" />
              </motion.g>
            </g>
          )}

          {/* Biceps curls execution with dumbbells */}
          {isBiceps && (
            <g>
              {/* Left bicep and forearm curl */}
              <path d="M68 85 C54 94 58 114 68 115 Z" fill={getMuscleColor(isBiceps)} stroke="rgba(0,0,0,0.1)" />
              <motion.g animate={{ rotate: [0, -45, 0] }} style={{ transformOrigin: "64px 115px" }} transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}>
                <path d="M62 115 C54 125 50 145 56 155 C62 155 64 125 64 115 Z" className={skeletonColor} />
                <circle cx="56" cy="158" r="4.5" className={skeletonColor} />
                <rect x="42" y="155" width="28" height="6" fill="#475569" rx="1" />
                <rect x="38" y="149" width="6" height="18" fill="#1e293b" rx="2" />
                <rect x="68" y="149" width="6" height="18" fill="#1e293b" rx="2" />
              </motion.g>

              {/* Right bicep and forearm curl */}
              <path d="M132 85 C146 94 142 114 132 115 Z" fill={getMuscleColor(isBiceps)} stroke="rgba(0,0,0,0.1)" />
              <motion.g animate={{ rotate: [0, 45, 0] }} style={{ transformOrigin: "136px 115px" }} transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}>
                <path d="M138 115 C146 125 150 145 144 155 C138 155 136 125 136 115 Z" className={skeletonColor} />
                <circle cx="144" cy="158" r="4.5" className={skeletonColor} />
                <rect x="130" y="155" width="28" height="6" fill="#475569" rx="1" />
                <rect x="126" y="149" width="6" height="18" fill="#1e293b" rx="2" />
                <rect x="156" y="149" width="6" height="18" fill="#1e293b" rx="2" />
              </motion.g>
            </g>
          )}

          {/* Standard background static limbs when other exercises are executing */}
          {!isBiceps && !isOmbros && !isPeito && (
            <g>
              <path d="M68 85 C54 94 58 114 68 115 Z" fill={getMuscleColor(false)} stroke="rgba(0,0,0,0.1)" />
              <path d="M132 85 C146 94 142 114 132 115 Z" fill={getMuscleColor(false)} stroke="rgba(0,0,0,0.1)" />
              <path d="M62 115 C54 125 50 145 56 155 C62 155 64 125 64 115 Z" className={skeletonColor} />
              <path d="M138 115 C146 125 150 145 144 155 C138 155 136 125 136 115 Z" className={skeletonColor} />
              <circle cx="56" cy="158" r="4.5" className={skeletonColor} />
              <circle cx="144" cy="158" r="4.5" className={skeletonColor} />
            </g>
          )}

          {/* Hips & Pelvis */}
          <path d="M84 138 L116 138 C122 150 118 165 114 165 L86 165 C82 165 78 150 84 138 Z" className={skeletonColor} strokeWidth="1.2" />

          {/* Legs (Pernas - Quadriceps) with dynamic compression when squatting */}
          <path 
            d="M78 165 C68 185 64 215 78 238 C88 238 96 215 96 165 Z" 
            fill={getMuscleColor(isPernas)} 
            stroke="rgba(0,0,0,0.12)"
            strokeWidth="1"
          />
          <path 
            d="M122 165 C132 185 136 215 122 238 C112 238 104 215 104 165 Z" 
            fill={getMuscleColor(isPernas)} 
            stroke="rgba(0,0,0,0.12)"
            strokeWidth="1"
          />
        </motion.g>

        {/* Knees, Calves and Feet stay grounded for the squat animation */}
        <circle cx="78" cy="242" r="5" className={skeletonColor} />
        <circle cx="122" cy="242" r="5" className={skeletonColor} />
        <path d="M76 245 C68 263 70 283 78 296 C84 296 86 283 84 245 Z" className={skeletonColor} strokeWidth="1" />
        <path d="M124 245 C132 263 130 283 122 296 C116 296 114 283 116 245 Z" className={skeletonColor} strokeWidth="1" />
        <path d="M74 296 L86 296 L90 305 L68 305 Z" className={skeletonColor} strokeWidth="1" />
        <path d="M126 296 L114 296 L110 305 L132 305 Z" className={skeletonColor} strokeWidth="1" />
      </svg>
    );
  };

  const currentStats = activePlannedEx ? getExerciseStats(activePlannedEx.exercise.nome) : null;

  const handleToggleSetComplete = (idx: number) => {
    const updated = [...loggedSets];
    updated[idx].completed = !updated[idx].completed;
    setLoggedSets(updated);

    if (updated[idx].completed) {
      startRestTimer(60);
    }
  };

  const updateSetLoad = (idx: number, loadChange: number) => {
    const updated = [...loggedSets];
    updated[idx].carga = Math.max(0, updated[idx].carga + loadChange);
    setLoggedSets(updated);
  };

  const updateSetReps = (idx: number, repsChange: number) => {
    const updated = [...loggedSets];
    updated[idx].reps = Math.max(1, updated[idx].reps + repsChange);
    setLoggedSets(updated);
  };

  const handleSetLoadChange = (idx: number, val: string) => {
    const num = parseFloat(val);
    const updated = [...loggedSets];
    updated[idx].carga = isNaN(num) ? 0 : Math.max(0, num);
    setLoggedSets(updated);
  };

  const handleSetRepsChange = (idx: number, val: string) => {
    const num = parseInt(val, 10);
    const updated = [...loggedSets];
    updated[idx].reps = isNaN(num) ? 0 : Math.max(0, num);
    setLoggedSets(updated);
  };

  const handleFinishAndSaveLog = async () => {
    if (!activePlannedEx) return;

    const completedSets = loggedSets.filter(s => s.completed);
    const finalSets = completedSets.length > 0 ? completedSets : loggedSets;

    const payload: Omit<ExerciseLog, 'id'> = {
      user_id: profile?.id || "demo",
      exercicio: activePlannedEx.exercise.nome,
      loggedAt: getLogDate(),
      series: finalSets.map(s => ({ carga: s.carga, reps: s.reps })),
      esforco: rpe,
      observacoes: observations
    };

    await onLogExercise(payload);
    
    setLoggedToday(prev => ({
      ...prev,
      [activePlannedEx.exercise.nome]: true
    }));

    if (activeExerciseIdx < (currentDay?.exercises.length || 0) - 1) {
      setActiveExerciseIdx(activeExerciseIdx + 1);
    } else {
      startRestTimer(10);
    }
  };

  const calculateCardioCalories = (): {
    calories: number;
    speedKmh: number;
    pace: string;
    classification: string;
    met: number;
  } => {
    const weight = userData?.weight || 75;
    const dur = parseFloat(cardioDuration) || 0;
    const dist = parseFloat(cardioDistance) || 0;
    
    let met = 3.0;
    let speedKmh = 0;
    let pace = "";
    let classification = "Exercício Aeróbico";

    if (cardioActivity === "corrida_caminhada") {
      if (dur > 0 && dist > 0) {
        speedKmh = (dist / dur) * 60;
        const paceMin = dur / dist;
        const paceSec = Math.round((paceMin - Math.floor(paceMin)) * 60);
        pace = `${Math.floor(paceMin)}:${paceSec < 10 ? '0' : ''}${paceSec} min/km`;

        if (speedKmh <= 4.0) {
          met = 2.9;
          classification = "Caminhada Leve";
        } else if (speedKmh <= 6.0) {
          met = 3.8;
          classification = "Caminhada Moderada";
        } else if (speedKmh <= 8.0) {
          met = 5.0;
          classification = "Caminhada Rápida / Trote Leve";
        } else if (speedKmh <= 10.0) {
          met = 8.3;
          classification = "Corrida Leve (Trote)";
        } else if (speedKmh <= 12.0) {
          met = 10.0;
          classification = "Corrida Moderada";
        } else if (speedKmh <= 14.0) {
          met = 11.8;
          classification = "Corrida Rápida";
        } else {
          met = 14.5;
          classification = "Corrida Intensa / Sprint";
        }
      } else {
        met = 5.0;
        classification = "Corrida / Caminhada";
      }
    } else if (cardioActivity === "pular_corda") {
      if (cardioIntensity === "low") {
        met = 8.8;
        classification = "Pular Corda (Ritmo Leve)";
      } else if (cardioIntensity === "high") {
        met = 12.3;
        classification = "Pular Corda (Ritmo Intenso)";
      } else {
        met = 11.0;
        classification = "Pular Corda (Ritmo Moderado)";
      }
    } else if (cardioActivity === "polichinelo") {
      if (cardioIntensity === "low") {
        met = 5.0;
        classification = "Polichinelo (Ritmo Leve)";
      } else if (cardioIntensity === "high") {
        met = 8.0;
        classification = "Polichinelo (Ritmo Intenso)";
      } else {
        met = 6.5;
        classification = "Polichinelo (Ritmo Moderado)";
      }
    } else if (cardioActivity === "ciclismo") {
      if (dur > 0 && dist > 0) {
        speedKmh = (dist / dur) * 60;
        pace = `${speedKmh.toFixed(1)} km/h`;
        if (speedKmh <= 15) {
          met = 4.0;
          classification = "Ciclismo de Passeio (<15 km/h)";
        } else if (speedKmh <= 20) {
          met = 6.0;
          classification = "Ciclismo Moderado (15-20 km/h)";
        } else if (speedKmh <= 25) {
          met = 8.5;
          classification = "Ciclismo Rápido (20-25 km/h)";
        } else {
          met = 12.0;
          classification = "Ciclismo Muito Rápido / Spinning (>25 km/h)";
        }
      } else {
        if (cardioIntensity === "low") {
          met = 4.5;
          classification = "Ciclismo / Spinning (Leve)";
        } else if (cardioIntensity === "high") {
          met = 10.5;
          classification = "Ciclismo / Spinning (Intenso)";
        } else {
          met = 7.5;
          classification = "Ciclismo / Spinning (Moderado)";
        }
      }
    } else if (cardioActivity === "eliptico") {
      if (cardioIntensity === "low") {
        met = 4.5;
        classification = "Elíptico (Intensidade Baixa)";
      } else if (cardioIntensity === "high") {
        met = 8.0;
        classification = "Elíptico (Intensidade Alta)";
      } else {
        met = 6.0;
        classification = "Elíptico (Intensidade Moderada)";
      }
    } else if (cardioActivity === "danca") {
      if (cardioIntensity === "low") {
        met = 4.0;
        classification = "Dança / Zumba (Ritmo Leve)";
      } else if (cardioIntensity === "high") {
        met = 7.3;
        classification = "Dança / Zumba (Ritmo Intenso)";
      } else {
        met = 5.5;
        classification = "Dança / Zumba (Ritmo Moderado)";
      }
    }

    // Calories = MET * 3.5 * weight / 200 * duration_minutes
    const calories = Math.round((met * 3.5 * weight / 200) * dur);
    return { calories, speedKmh, pace, classification, met };
  };

  const handleSaveCardio = async () => {
    const dur = parseFloat(cardioDuration) || 0;
    if (dur <= 0) {
      alert("Por favor, preencha a duração do exercício aeróbico.");
      return;
    }

    setIsSavingCardio(true);
    try {
      const calcResult = calculateCardioCalories();
      let activityLabel = "Cardio";
      if (cardioActivity === "corrida_caminhada") activityLabel = "Corrida / Caminhada";
      else if (cardioActivity === "pular_corda") activityLabel = "Pular Corda";
      else if (cardioActivity === "polichinelo") activityLabel = "Polichinelos";
      else if (cardioActivity === "ciclismo") activityLabel = "Ciclismo";
      else if (cardioActivity === "eliptico") activityLabel = "Elíptico";
      else if (cardioActivity === "danca") activityLabel = "Dança / Aeróbica";

      const payload: Omit<ExerciseLog, 'id'> = {
        user_id: profile?.id || "demo",
        exercicio: `${activityLabel} (${calcResult.classification})`,
        loggedAt: getLogDate(),
        series: [],
        esforco: cardioRpe,
        observacoes: cardioNotes,
        type: 'cardio',
        duration_minutes: dur,
        distance_km: parseFloat(cardioDistance) || 0,
        intensity: cardioIntensity,
        calories_burned: calcResult.calories,
        pace: calcResult.pace || undefined,
        reps_count: parseInt(cardioReps, 10) || undefined
      };

      await onLogExercise(payload);

      // Clean inputs
      setCardioDuration('');
      setCardioDistance('');
      setCardioReps('');
      setCardioNotes('');
      setCardioRpe(3);
      
      alert("Treino aeróbico (Cardio) salvo com sucesso e adicionado ao seu gasto calórico de hoje! 🔥🚀");
    } catch (e) {
      console.error("Error saving cardio workout:", e);
      alert("Ocorreu um erro ao salvar o treino aeróbico.");
    } finally {
      setIsSavingCardio(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Selector toggle */}
      <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl gap-1 w-full max-w-sm mx-auto mb-2">
        <button
          type="button"
          onClick={() => setTrainingMode('strength')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black transition-all cursor-pointer border-0 ${
            trainingMode === 'strength'
              ? "bg-purple-600 text-white shadow-xs"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 bg-transparent"
          }`}
        >
          <Dumbbell size={14} />
          Treino de Força
        </button>
        <button
          type="button"
          onClick={() => setTrainingMode('cardio')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black transition-all cursor-pointer border-0 ${
            trainingMode === 'cardio'
              ? "bg-purple-600 text-white shadow-xs"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 bg-transparent"
          }`}
        >
          <span>🏃‍♂️</span>
          Cardio (Aeróbico)
        </button>
      </div>

      {trainingMode === 'strength' ? (
        availableDays.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 text-center space-y-4">
            <Dumbbell className="text-slate-300 mx-auto animate-bounce" size={48} />
            <h3 className="font-extrabold text-slate-800 dark:text-white">Nenhum treino gerado ainda!</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              Por favor, vá para a aba "Ficha", configure sua experiência e limitações físicas e gere seu treino personalizado primeiro.
            </p>
          </div>
        ) : (
          <>
            {/* Day Selector Navigation Tabs */}
            <div className="flex border-b border-slate-100 dark:border-slate-800 pb-1.5 overflow-x-auto gap-2">
              {availableDays.map((day) => {
                const isSelected = selectedDayId ? (day.id === selectedDayId) : (day.id === availableDays[0].id);
                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => {
                      setSelectedDayId(day.id);
                      setActiveExerciseIdx(0);
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer border ${
                      isSelected
                        ? "bg-cyan-500 text-white border-transparent shadow-sm"
                        : "bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 border-slate-100 dark:border-slate-800"
                    }`}
                  >
                    {day.name}
                  </button>
                );
              })}
            </div>

          {/* Active Training Session Panel */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Sidebar list of exercises */}
            <div className="md:col-span-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-4 space-y-3">
              <h4 className="text-xs font-black uppercase text-slate-400 px-2">Exercícios do Dia</h4>
              <div className="space-y-1">
                {currentDay?.exercises.map((pEx, idx) => {
                  const isActive = idx === activeExerciseIdx;
                  const isLogged = loggedToday[pEx.exercise.nome];
                  return (
                    <button
                      key={pEx.id}
                      type="button"
                      onClick={() => setActiveExerciseIdx(idx)}
                      className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all border cursor-pointer ${
                        isActive
                          ? "bg-cyan-500/10 border-cyan-400 text-cyan-600 dark:text-cyan-400 font-extrabold"
                          : "bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-bold text-slate-400 w-4">{idx + 1}</span>
                        <div>
                          <span className="text-xs block leading-tight">{pEx.exercise.nome}</span>
                          <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 block mt-0.5 animate-pulse">
                            {getMuscleGroupLabel(pEx.exercise.grupoPrincipal)}
                          </span>
                        </div>
                      </div>
                      {isLogged && (
                        <div className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center text-white text-[8px]">
                          <Check size={10} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active exercise interaction work space */}
            <div className="md:col-span-8 space-y-6">
              {activePlannedEx ? (
                <>
                  {/* Top Exercise Details and Real Human Anatomy representation */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 space-y-6">
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1.5">
                        <span className="inline-block bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 text-[10px] font-black uppercase px-2.5 py-1 rounded-full tracking-wider">
                          {getMuscleGroupLabel(activePlannedEx.exercise.grupoPrincipal)}
                        </span>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-black text-slate-800 dark:text-white leading-tight">
                            {activePlannedEx.exercise.nome}
                          </h3>
                          
                          {/* Modern help trigger button for correct execution */}
                          <button
                            type="button"
                            onClick={() => setIsHelpOpen(true)}
                            className="text-slate-400 hover:text-cyan-500 transition-colors p-1 border-0 bg-transparent cursor-pointer"
                            title="Guia de Execução"
                          >
                            <HelpCircle size={18} />
                          </button>
                        </div>
                        <p className="text-xs text-slate-400 capitalize">
                          Equipamento: {activePlannedEx.exercise.equipamento} • Tipo: {activePlannedEx.exercise.tipo}
                        </p>
                      </div>
                    </div>

                    {/* Vector Anatomical Simulator Box with pulse state and gender match */}
                    <div className="flex flex-col md:flex-row items-center border border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl gap-6">
                      <div className="w-full md:w-1/2 flex items-center justify-center p-2">
                        {renderExecutionAnimation(activePlannedEx.exercise.nome, activePlannedEx.exercise)}
                      </div>
                      
                      {/* Side details displaying targeted muscle list on simple metrics */}
                      <div className="w-full md:w-1/2 space-y-4">
                        <div className="space-y-1">
                          <h5 className="text-[11px] font-black uppercase text-slate-400">Ativação Muscular Alvo</h5>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            A estrutura anatômica em vermelho indica o grupo muscular em contração concêntrica mais ativado nesta série de exercícios.
                          </p>
                        </div>

                        {/* Click to open execution details card inside the stage */}
                        <button
                          type="button"
                          onClick={() => setIsHelpOpen(true)}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs text-slate-800 dark:text-slate-200 font-extrabold rounded-xl border-0 transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <HelpCircle size={14} className="text-cyan-500" />
                          Explorar Guia Executivo
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Modern execution details help popup dialog (Glassmorphism Modal) */}
                  <AnimatePresence>
                    {isHelpOpen && tips && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
                      >
                        <motion.div
                          initial={{ scale: 0.95, y: 15 }}
                          animate={{ scale: 1, y: 0 }}
                          exit={{ scale: 0.95, y: 15 }}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-lg w-full rounded-3xl p-6 shadow-2xl relative space-y-6"
                        >
                          <button
                            type="button"
                            onClick={() => setIsHelpOpen(false)}
                            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-50 dark:bg-slate-800 rounded-full border-0 cursor-pointer transition-colors"
                          >
                            <X size={16} />
                          </button>

                          <div className="space-y-1.5">
                            <span className="text-[9px] uppercase font-black tracking-wider bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 px-2 py-0.5 rounded-md">
                              Ficha Técnica de Exercício
                            </span>
                            <h4 className="text-lg font-black text-slate-900 dark:text-white">
                              Guia Técnico: {activePlannedEx.exercise.nome}
                            </h4>
                          </div>

                          <div className="space-y-4 max-h-[350px] overflow-y-auto text-xs pr-1">
                            {/* Correct technique card */}
                            <div className="bg-emerald-500/5 border border-emerald-500/20 p-3 rounded-2xl space-y-1.5">
                              <span className="font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                                <Check size={14} />
                                Forma Correta
                              </span>
                              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                                {tips.correta}
                              </p>
                            </div>

                            {/* Common errors card */}
                            <div className="bg-rose-500/5 border border-rose-500/20 p-3 rounded-2xl space-y-1.5">
                              <span className="font-extrabold text-rose-600 dark:text-rose-400 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                                <AlertTriangle size={14} />
                                Erros Mais Comuns
                              </span>
                              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                                {tips.erros}
                              </p>
                            </div>

                            {/* Injury prevention card */}
                            <div className="bg-cyan-500/5 border border-cyan-500/20 p-3 rounded-2xl space-y-1.5">
                              <span className="font-extrabold text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                                <Sparkles size={14} />
                                Como Prevenir
                              </span>
                              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                                {tips.evitar}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setIsHelpOpen(false)}
                            className="w-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white font-bold py-3 rounded-2xl text-xs cursor-pointer border-0 transition-all hover:bg-slate-200 dark:hover:bg-slate-700"
                          >
                            Entendi, Voltar ao Treino
                          </button>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Sheets logs tracker */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-4 sm:p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <h4 className="font-extrabold text-xs uppercase text-slate-400 tracking-wider">Registrar Minhas Séries</h4>
                      {usingHistoryValue && (
                        <div className="flex items-center gap-1.5 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100 dark:border-cyan-900 px-2.5 py-1 rounded-full text-[10px] font-black text-cyan-600 dark:text-cyan-400">
                          <History size={11} className="shrink-0" />
                          <span>Cargas e repetições com base no treino de {usingHistoryValue}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      {loggedSets.map((set, idx) => (
                        <div 
                          key={idx} 
                          className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-2xl border transition-all gap-3 ${
                            set.completed 
                              ? "bg-emerald-500/5 border-emerald-500/30" 
                              : "bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800"
                          }`}
                        >
                          <div className="flex items-center gap-3 w-full sm:w-auto">
                            <button
                              type="button"
                              onClick={() => handleToggleSetComplete(idx)}
                              className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
                                set.completed 
                                  ? "bg-emerald-500 border-transparent text-white" 
                                  : "border-slate-300 hover:border-cyan-500 bg-white dark:bg-slate-800"
                              }`}
                            >
                              {set.completed && <Check size={12} />}
                            </button>
                            <span className="text-xs font-black text-slate-700 dark:text-slate-300">Série {idx + 1}</span>
                          </div>

                          {/* Controls for weight and reps with text fields for typing directly as requested */}
                          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5 sm:gap-5 w-full sm:w-auto mt-1 sm:mt-0 pt-2 sm:pt-0 border-t border-slate-100 dark:border-slate-850 sm:border-0 text-slate-800 dark:text-white">
                            {/* Weight load */}
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 dark:text-slate-500">CARGA</span>
                              <button 
                                type="button" 
                                onClick={() => updateSetLoad(idx, -1)} 
                                className="w-8 h-8 rounded-xl flex items-center justify-center bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 text-sm font-bold cursor-pointer select-none transition-colors shadow-xs"
                              >
                                -
                              </button>
                              
                              <div className="flex items-center justify-center gap-1 bg-slate-100/50 dark:bg-slate-800/40 px-2 py-0.5 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus-within:border-cyan-500/50 focus-within:bg-white dark:focus-within:bg-slate-800 transition-all">
                                <input
                                  type="number"
                                  value={set.carga === 0 ? "" : set.carga}
                                  placeholder="0"
                                  onChange={(e) => handleSetLoadChange(idx, e.target.value)}
                                  onFocus={(e) => e.target.select()}
                                  className="w-10 bg-transparent text-center font-bold text-sm text-slate-800 dark:text-white outline-none border-0 p-0 focus:ring-0 focus:outline-none"
                                  style={{ appearance: "textfield", MozAppearance: "textfield" }}
                                />
                                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 select-none">kg</span>
                              </div>

                              <button 
                                type="button" 
                                onClick={() => updateSetLoad(idx, 1)} 
                                className="w-8 h-8 rounded-xl flex items-center justify-center bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 text-sm font-bold cursor-pointer select-none transition-colors shadow-xs"
                              >
                                +
                              </button>
                            </div>

                            {/* Repetitions */}
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 dark:text-slate-500">REPETIÇÕES</span>
                              <button 
                                type="button" 
                                onClick={() => updateSetReps(idx, -1)} 
                                className="w-8 h-8 rounded-xl flex items-center justify-center bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 text-sm font-bold cursor-pointer select-none transition-colors shadow-xs"
                              >
                                -
                              </button>

                              <div className="flex items-center justify-center bg-slate-100/50 dark:bg-slate-800/40 px-2 py-0.5 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus-within:border-cyan-500/50 focus-within:bg-white dark:focus-within:bg-slate-800 transition-all">
                                <input
                                  type="number"
                                  value={set.reps === 0 ? "" : set.reps}
                                  placeholder="0"
                                  onChange={(e) => handleSetRepsChange(idx, e.target.value)}
                                  onFocus={(e) => e.target.select()}
                                  className="w-8 bg-transparent text-center font-bold text-sm text-slate-800 dark:text-white outline-none border-0 p-0 focus:ring-0 focus:outline-none"
                                  style={{ appearance: "textfield", MozAppearance: "textfield" }}
                                />
                              </div>

                              <button 
                                type="button" 
                                onClick={() => updateSetReps(idx, 1)} 
                                className="w-8 h-8 rounded-xl flex items-center justify-center bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 text-sm font-bold cursor-pointer select-none transition-colors shadow-xs"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* RPE Selector 0 to 5 */}
                    <div className="space-y-2 pt-2">
                      <h5 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                        Qual foi seu esforço subjetivo nesta série?
                      </h5>
                      <div className="grid grid-cols-6 gap-1 md:gap-2">
                        {[
                          { val: 0, label: "0", desc: "Insignificante" },
                          { val: 1, label: "1", desc: "Fácil" },
                          { val: 2, label: "2", desc: "Moderado" },
                          { val: 3, label: "3", desc: "Difícil" },
                          { val: 4, label: "4", desc: "Extremo" },
                          { val: 5, label: "5", desc: "Falha" }
                        ].map((item) => (
                          <button
                            key={item.val}
                            type="button"
                            onClick={() => setRpe(item.val)}
                            className={`py-2 rounded-xl text-center cursor-pointer border transition-all ${
                              rpe === item.val
                                ? item.val <= 1
                                  ? "bg-emerald-500 border-transparent text-white shadow-sm shadow-emerald-500/20 font-bold"
                                  : item.val <= 3
                                    ? "bg-amber-500 border-transparent text-white shadow-sm shadow-amber-500/20 font-bold"
                                    : "bg-rose-500 border-transparent text-white shadow-sm shadow-rose-500/20 font-bold"
                                : item.val <= 1
                                  ? "bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-900"
                                  : item.val <= 3
                                    ? "bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-900"
                                    : "bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-900"
                            }`}
                          >
                            <span className={`text-xs font-black block ${rpe === item.val ? "text-white" : "text-slate-800 dark:text-slate-200"}`}>
                              {item.label}
                            </span>
                            <span className={`text-[7.5px] uppercase font-bold block mt-0.5 leading-none ${
                              rpe === item.val
                                ? item.val <= 1
                                  ? "text-emerald-50"
                                  : item.val <= 3
                                    ? "text-amber-50"
                                    : "text-rose-50"
                                : "text-slate-500 dark:text-slate-400"
                            }`}>
                              {item.desc}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Observations */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                        Observações do Exercício
                      </label>
                      <input
                        type="text"
                        value={observations}
                        onChange={(e) => setObservations(e.target.value)}
                        placeholder="Ex: Senti um leve desconforto no punho esquerdo."
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                      />
                    </div>

                    {/* Finish exercise button */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleFinishAndSaveLog}
                      className="w-full bg-cyan-500 hover:bg-cyan-600 border-0 text-white font-bold py-3.5 px-6 rounded-2xl text-xs sm:text-sm shadow-md shadow-cyan-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <Check size={16} />
                      Concluir e Salvar Exercício
                    </motion.button>
                  </div>
                </>
              ) : (
                <div className="text-center bg-white p-8 rounded-3xl border border-slate-100">
                  Sem exercícios selecionados.
                </div>
              )}
            </div>
          </div>
        </>
      )
    ) : (
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 max-w-2xl mx-auto shadow-xs">
        <div className="space-y-1">
          <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span>🏃‍♂️</span> Registrar Treino de Cardio / Aeróbico
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Insira os dados do seu exercício aeróbico. O sistema calcula a queima calórica exata baseada em regras de intensidade e MET.
          </p>
        </div>

        {/* Atividade Selector */}
        <div className="space-y-2">
          <label className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Escolha a Atividade</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { id: 'corrida_caminhada', label: 'Corrida / Caminhada', icon: '🏃‍♂️' },
              { id: 'pular_corda', label: 'Pular Corda', icon: '🪢' },
              { id: 'polichinelo', label: 'Polichinelos', icon: '🤸‍♂️' },
              { id: 'ciclismo', label: 'Ciclismo / Bike', icon: '🚴‍♂️' },
              { id: 'eliptico', label: 'Elíptico / Simulador', icon: '🚶‍♂️' },
              { id: 'danca', label: 'Dança / Zumba', icon: '💃' },
            ].map((act) => {
              const isSelected = cardioActivity === act.id;
              return (
                <button
                  key={act.id}
                  type="button"
                  onClick={() => {
                    setCardioActivity(act.id);
                    setCardioDistance('');
                    setCardioReps('');
                  }}
                  className={`flex items-center gap-2 p-3 rounded-2xl text-left border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-cyan-500/10 border-cyan-500 text-cyan-600 dark:text-cyan-400 font-extrabold"
                      : "bg-slate-50 dark:bg-slate-950 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <span className="text-xl">{act.icon}</span>
                  <span className="text-xs font-bold leading-tight">{act.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Duração Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Duração (Minutos)</label>
            <input
              type="number"
              placeholder="Ex: 20"
              value={cardioDuration}
              onChange={(e) => setCardioDuration(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-cyan-500 focus:outline-none dark:text-white"
            />
          </div>

          {/* Distância Input */}
          {(cardioActivity === 'corrida_caminhada' || cardioActivity === 'ciclismo') && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Distância Percorrida (km)</label>
              <input
                type="number"
                step="0.1"
                placeholder="Ex: 3.2"
                value={cardioDistance}
                onChange={(e) => setCardioDistance(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-cyan-500 focus:outline-none dark:text-white"
              />
            </div>
          )}

          {/* Repetições */}
          {(cardioActivity === 'pular_corda' || cardioActivity === 'polichinelo') && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Repetições (Opcional)</label>
              <input
                type="number"
                placeholder="Ex: 150"
                value={cardioReps}
                onChange={(e) => setCardioReps(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-cyan-500 focus:outline-none dark:text-white"
              />
            </div>
          )}

          {/* Ritmo / Intensidade */}
          {cardioActivity !== 'corrida_caminhada' && cardioActivity !== 'ciclismo' && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Intensidade / Ritmo</label>
              <div className="grid grid-cols-3 gap-1 bg-slate-50 dark:bg-slate-950 p-1 border border-slate-100 dark:border-slate-800 rounded-xl">
                {[
                  { id: 'low', label: 'Leve / Baixo' },
                  { id: 'medium', label: 'Moderado' },
                  { id: 'high', label: 'Intenso / Alto' },
                ].map((int) => (
                  <button
                    key={int.id}
                    type="button"
                    onClick={() => setCardioIntensity(int.id as any)}
                    className={`py-1.5 rounded-lg text-[10px] font-bold text-center border-0 cursor-pointer transition-all ${
                      cardioIntensity === int.id
                        ? "bg-cyan-500 text-white shadow-xs font-black"
                        : "bg-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    {int.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Real-time Calculations Box */}
        {parseFloat(cardioDuration) > 0 && (() => {
          const result = calculateCardioCalories();
          return (
            <div className="bg-gradient-to-r from-cyan-500/10 via-purple-500/5 to-transparent border border-cyan-500/20 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <span>🔥</span> Gasto Energético Estimado
                </span>
                <span className="text-lg font-black text-cyan-600 dark:text-cyan-400">{result.calories} kcal</span>
              </div>
              
              <div className="text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-200/50 dark:border-slate-800/50 pt-2 space-y-1">
                <p>
                  <strong className="text-slate-700 dark:text-slate-200">Tipo Identificado:</strong> {result.classification}
                </p>
                {result.speedKmh > 0 && (
                  <p>
                    <strong className="text-slate-700 dark:text-slate-200">Métricas:</strong> Velocidade Média de {result.speedKmh.toFixed(1)} km/h • Ritmo de {result.pace}
                  </p>
                )}
                <p className="text-[10px] italic text-slate-400 mt-1">
                  Calculado usando MET de {result.met.toFixed(1)} para seu peso de {userData?.weight || 75}kg.
                </p>
              </div>
            </div>
          );
        })()}

        {/* RPE Selector & Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Esforço RPE */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Nível de Esforço (RPE)</label>
            <select
              value={cardioRpe}
              onChange={(e) => setCardioRpe(parseInt(e.target.value, 10))}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-cyan-500 focus:outline-none dark:text-white"
            >
              <option value={1}>Muito Fácil</option>
              <option value={2}>Fácil / Confortável</option>
              <option value={3}>Médio / Ritmo Constante</option>
              <option value={4}>Difícil / Suando Bastante</option>
              <option value={5}>Intensidade Máxima / Limite</option>
            </select>
          </div>

          {/* Observações */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Observações / Como se sentiu</label>
            <input
              type="text"
              placeholder="Ex: Treino em jejum, vento forte contra"
              value={cardioNotes}
              onChange={(e) => setCardioNotes(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-cyan-500 focus:outline-none dark:text-white"
            />
          </div>
        </div>

        {/* Submit button */}
        <button
          type="button"
          disabled={isSavingCardio || !cardioDuration}
          onClick={handleSaveCardio}
          className={`w-full py-3.5 rounded-2xl text-xs font-black text-white shadow-lg transition-all cursor-pointer border-0 ${
            !cardioDuration
              ? "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none"
              : "bg-purple-cyan hover:opacity-90 shadow-cyan-500/10 active:scale-[0.98]"
          }`}
        >
          {isSavingCardio ? "Salvando..." : "Salvar Treino Aeróbico 🔥"}
        </button>
      </div>
    )}

      {/* Full-Screen Digital Bomb Timer Rest Overlay */}
      <AnimatePresence>
        {timerSeconds > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-slate-50/75 dark:bg-slate-950/75 backdrop-blur-xl select-none overflow-hidden"
          >
            {/* Top Left "Volume" Toggle Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleTimerSound}
              className="absolute top-6 left-6 p-4 rounded-full bg-slate-500/10 hover:bg-slate-500/20 text-slate-800 dark:bg-white/5 dark:hover:bg-white/15 dark:text-white border-0 transition-all cursor-pointer flex items-center justify-center shadow-lg"
              title={isTimerSoundEnabled ? "Desativar Sons" : "Ativar Sons"}
            >
              {isTimerSoundEnabled ? (
                <Volume2 size={28} strokeWidth={2.5} className="text-purple-500 animate-pulse" />
              ) : (
                <VolumeX size={28} strokeWidth={2.5} className="text-slate-400" />
              )}
            </motion.button>

            {/* Top Right "X" Dismiss Button - Elegant Glassmorphic Style */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={stopRestTimer}
              className="absolute top-6 right-6 p-4 rounded-full bg-slate-500/10 hover:bg-slate-500/20 text-slate-800 dark:bg-white/5 dark:hover:bg-white/15 dark:text-white border-0 transition-all cursor-pointer flex items-center justify-center shadow-lg hover:shadow-rose-500/10"
              title="Fechar Cronômetro"
            >
              <X size={28} strokeWidth={2.5} />
            </motion.button>

            {/* Glowing active indicator badge */}
            <div className="mb-4 flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 px-4 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span className="text-xs font-bold uppercase tracking-widest text-rose-500 dark:text-rose-400">DESCANSO ATIVO</span>
            </div>

            {/* Giant Premium Geometric Numerals with Dynamic Soft Glow and Pulse */}
            <div className="relative flex items-center justify-center my-4">
              {/* Outer soft glowing atmosphere */}
              <div className="absolute inset-[-100px] bg-rose-500/10 rounded-full blur-[120px] pointer-events-none" />
              
              <div className="relative font-sans font-black tracking-tighter text-[16.5rem] sm:text-[22rem] md:text-[27.5rem] leading-[0.95] select-none text-center select-none">
                <motion.span 
                  animate={{ scale: [0.98, 1, 0.98] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="relative block py-4 pr-8 pl-4 text-transparent bg-clip-text bg-gradient-to-b from-rose-400 via-rose-500 to-rose-600 drop-shadow-[0_4px_30px_rgba(244,63,94,0.45)] select-none cursor-pointer"
                >
                  {String(timerSeconds).padStart(2, "0")}
                </motion.span>
              </div>
            </div>

            {/* Bottom Support Prompt with beautiful spacing and design details */}
            <div className="text-center max-w-sm px-6 mt-4">
              <p className="text-base font-bold text-slate-800 dark:text-slate-100">
                Respire fundo e recupere suas forças
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-medium leading-relaxed">
                Hidrate-se! Assim que o cronômetro zerar, retorne à próxima série com intensidade total.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
