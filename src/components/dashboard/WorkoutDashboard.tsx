import React, { useState } from "react";
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
  User
} from "lucide-react";
import { Profile, UserWorkoutProfile, UserData, ExerciseLog } from "../../types";
import { WorkoutHistory } from "./WorkoutHistory";

interface WorkoutDashboardProps {
  profile: Profile | null;
  workoutProfile: UserWorkoutProfile | null;
  userData: UserData | null;
  onNavigateToTab: (tab: string) => void;
  exerciseHistory?: ExerciseLog[];
  onDeleteLog?: (id: string) => Promise<void>;
}

type AngleView = "front" | "side_left" | "back" | "side_right";

export const WorkoutDashboard: React.FC<WorkoutDashboardProps> = ({
  profile,
  workoutProfile,
  userData,
  onNavigateToTab,
  exerciseHistory = [],
  onDeleteLog
}) => {
  // Fatigue score mapping
  const fatigue = workoutProfile?.muscleFatigue || {
    peito: 0,
    costas: 0,
    pernas: 0,
    biceps: 0,
    triceps: 0,
    ombros: 0,
    abdome: 0
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
    
    // Dynamic styles for muscle parts
    const peitoColor = getAnatomicalColor(fatigue.peito);
    const costasColor = getAnatomicalColor(fatigue.costas);
    const pernasColor = getAnatomicalColor(fatigue.pernas);
    const bicepsColor = getAnatomicalColor(fatigue.biceps);
    const tricepsColor = getAnatomicalColor(fatigue.triceps);
    const ombrosColor = getAnatomicalColor(fatigue.ombros);
    const abdomeColor = getAnatomicalColor(fatigue.abdome);

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
        {/* Muscle Score Card List (GRÁFICO ABAIXO QUE DEVERÁ SER MANTIDO) */}
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
            {Object.entries(fatigue).map(([muscle, value]) => (
              <div key={muscle} className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="capitalize text-slate-700 dark:text-slate-300">
                    {muscle === "ombros" ? "Ombros / Trapézio" : muscle === "peito" ? "Peito / Anterior" : muscle === "costas" ? "Costas / Posturas" : muscle === "pernas" ? "Pernas / Quadríceps" : muscle}
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
            ))}
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
        <WorkoutHistory exerciseHistory={exerciseHistory} onDeleteLog={onDeleteLog} />
      </div>
    </div>
  );
};
