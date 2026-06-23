import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Droplets, Edit2, Save, Trash2, Trophy, Clock, Check, X } from 'lucide-react';
import { WaterLog } from '../../types';

interface WaterTrackerProps {
  waterAmount: number;
  waterGoal: number;
  setWaterGoal: (goal: number) => void;
  handleAddWater: (amount: number) => void;
  waterLogs?: WaterLog[];
  onDeleteWater?: (id: string) => void;
}

const formatTime = (isoString: string) => {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return "";
  }
};

export const WaterTracker: React.FC<WaterTrackerProps> = ({
  waterAmount,
  waterGoal,
  setWaterGoal,
  handleAddWater,
  waterLogs = [],
  onDeleteWater
}) => {
  const [isEditingWaterGoal, setIsEditingWaterGoal] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [tiltAngle, setTiltAngle] = useState(0);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleOrientation = (event: DeviceOrientationEvent) => {
    if (event.gamma !== null) {
      let angle = event.gamma;
      // Clamp values so that tilt is natural and elegant
      if (angle > 18) angle = 18;
      if (angle < -18) angle = -18;
      setTiltAngle(-angle);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('deviceorientation', handleOrientation);
      return () => {
        window.removeEventListener('deviceorientation', handleOrientation);
      };
    }
  }, []);

  const requestGyroPermission = () => {
    if (
      typeof window !== 'undefined' &&
      typeof (DeviceOrientationEvent as any).requestPermission === 'function'
    ) {
      (DeviceOrientationEvent as any)
        .requestPermission()
        .then((permissionState: string) => {
          if (permissionState === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation);
          }
        })
        .catch((err: any) => console.log("Gyroscope permission state error:", err));
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const pct = x / width;
    const angle = -(pct - 0.5) * 16; // soft desktop cursor tilt response of -8 to +8 degrees
    setTiltAngle(angle);
  };

  const handleMouseLeave = () => {
    setTiltAngle(0);
  };

  const onAddWater = (amount: number) => {
    handleAddWater(amount);
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 1000);
  };

  const progress = Math.min(100, (waterAmount / waterGoal) * 100);
  const isGoalReached = waterAmount >= waterGoal;

  return (
    <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-[2.5rem] shadow-xl shadow-purple-500/5 border border-slate-100 dark:border-slate-800 space-y-4">
      
      {/* Top row with Title and Edit button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Droplets size={20} className="text-cyan-500" />
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Água</h3>
        </div>
        <motion.button 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsEditingWaterGoal(!isEditingWaterGoal)} 
          className="text-slate-400 hover:text-purple-500 transition-colors"
        >
          <Edit2 size={16} />
        </motion.button>
      </div>

      {/* Main visualization: Bottle / Trophy side by side with details */}
      <div className="flex flex-col sm:flex-row items-center justify-around gap-4 py-0">
        
        {/* Visual representation: Bottle / Trophy */}
        <div className="relative py-0 my-0">
          {isGoalReached ? (
            <motion.div 
              initial={{ scale: 0.8, rotate: -10 }}
              animate={{ scale: [1, 1.1, 1], rotate: 0 }}
              transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
              className="flex flex-col items-center py-0"
            >
              {/* Gold Trophy SVG - Increased size by 75% and cropped top/bottom empty padding */}
              <svg width="264" height="264" viewBox="0 23 60 60" className="overflow-visible drop-shadow-[0_0_20px_rgba(234,179,8,0.73)]">
                <defs>
                  <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fef08a" />
                    <stop offset="40%" stopColor="#eab308" />
                    <stop offset="100%" stopColor="#ca8a04" />
                  </linearGradient>
                </defs>
                {/* Crown / cup */}
                <path d="M15,25 L45,25 L41,55 C39,63 21,63 19,55 Z" fill="url(#gold)" />
                {/* Star center */}
                <path d="M30,32 L32,37 L37,37 L33,40 L35,45 L30,42 L25,45 L27,40 L23,37 L28,37 Z" fill="#ffffff" opacity="0.9" />
                {/* Handles */}
                <path d="M15,30 C3,30 3,45 15,45" fill="none" stroke="url(#gold)" strokeWidth="3" strokeLinecap="round" />
                <path d="M45,30 C57,30 57,45 45,45" fill="none" stroke="url(#gold)" strokeWidth="3" strokeLinecap="round" />
                {/* Neck/Stem */}
                <rect x="26" y="55" width="8" height="15" fill="url(#gold)" />
                {/* Base */}
                <ellipse cx="30" cy="72" rx="16" ry="5" fill="url(#gold)" />
                <rect x="18" y="74" width="24" height="7" rx="2" fill="#854d0e" />
              </svg>
              <span className="text-[10px] font-black text-yellow-600 dark:text-yellow-400 mt-0 uppercase tracking-widest bg-yellow-100 dark:bg-yellow-900/30 px-3 py-1 rounded-full flex items-center gap-1">
                <Trophy size={11} /> META BATIDA!
              </span>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center py-0">
              <motion.div 
                animate={isAnimating ? { scale: [1, 1.08, 1] } : {}}
                className="relative w-52 h-[344px] flex items-center justify-center py-0 cursor-pointer"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onClick={requestGyroPermission}
              >
                {/* Dynamically scaled down by 20% (width 192, height 344) and styled with micro-interactive tilts */}
                <svg width="192" height="344" viewBox="11 0 28 50" className="overflow-visible select-none drop-shadow-md text-slate-300 dark:text-slate-600 transition-transform duration-300">
                  <defs>
                    {/* Clipping mask using the authentic water bottle contour path from requested URL */}
                    <clipPath id="water-bottle-clip">
                      <path d="M22 0C20.355469 0 19 1.355469 19 3L19 6C19 6.523438 19.183594 7.058594 19.5625 7.4375C19.84375 7.71875 20.203125 7.898438 20.59375 7.96875C20.445313 8.085938 20.261719 8.175781 20.03125 8.21875L20 8.21875C15.457031 9.214844 12 13.222656 12 18.09375L12 21C12 22.257813 12.890625 23.152344 14 23.59375L14 36.40625C12.890625 36.847656 12 37.742188 12 39L12 45C12 47.746094 14.253906 50 17 50L33 50C35.746094 50 38 47.746094 38 45L38 39C38 37.742188 37.109375 36.847656 36 36.40625L36 23.59375C37.109375 23.152344 38 22.257813 38 21L38 18.09375C38 13.222656 34.542969 9.214844 30 8.21875L29.96875 8.21875C29.738281 8.175781 29.554688 8.085938 29.40625 7.96875C29.796875 7.898438 30.15625 7.71875 30.4375 7.4375C30.816406 7.058594 31 6.523438 31 6L31 3C31 1.355469 29.644531 0 28 0 Z" />
                    </clipPath>
                    {/* Soft glowing cyan blue water gradient */}
                    <linearGradient id="water-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.85" />
                      <stop offset="100%" stopColor="#0284c7" stopOpacity="0.95" />
                    </linearGradient>
                  </defs>

                  {/* Empty backing inside the bottle */}
                  <path 
                    d="M22 0C20.355469 0 19 1.355469 19 3L19 6C19 6.523438 19.183594 7.058594 19.5625 7.4375C19.84375 7.71875 20.203125 7.898438 20.59375 7.96875C20.445313 8.085938 20.261719 8.175781 20.03125 8.21875L20 8.21875C15.457031 9.214844 12 13.222656 12 18.09375L12 21C12 22.257813 12.890625 23.152344 14 23.59375L14 36.40625C12.890625 36.847656 12 37.742188 12 39L12 45C12 47.746094 14.253906 50 17 50L33 50C35.746094 50 38 47.746094 38 45L38 39C38 37.742188 37.109375 36.847656 36 36.40625L36 23.59375C37.109375 23.152344 38 22.257813 38 21L38 18.09375C38 13.222656 34.542969 9.214844 30 8.21875L29.96875 8.21875C29.738281 8.175781 29.554688 8.085938 29.40625 7.96875C29.796875 7.898438 30.15625 7.71875 30.4375 7.4375C30.816406 7.058594 31 6.523438 31 6L31 3C31 1.355469 29.644531 0 28 0 Z" 
                    fill="currentColor" 
                    fillOpacity="0.08" 
                  />

                  {/* Water level filler using the clipping shape + tilt motion */}
                  <g clipPath="url(#water-bottle-clip)">
                    <motion.g
                      animate={{ rotate: tiltAngle }}
                      style={{ transformOrigin: "25px 30px" }}
                      transition={{ type: "spring", stiffness: 100, damping: 18 }}
                    >
                      <motion.rect 
                        initial={{ y: 50, height: 0 }}
                        animate={{ 
                          y: 50 - (progress / 100) * 44, 
                          height: (progress / 100) * 44 
                        }}
                        transition={{ type: "spring", stiffness: 80, damping: 13 }}
                        width="50" 
                        fill="url(#water-grad)"
                      />
                      
                      {/* Floating top wave */}
                      {progress > 0 && progress < 100 && (
                        <motion.path
                          animate={{ x: [-5, 5, -5] }}
                          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                          d={`M -5,${50 - (progress / 100) * 44} Q 12.5,${50 - (progress / 100) * 44 - 1.5} 25,${50 - (progress / 100) * 44} T 55,${50 - (progress / 100) * 44}`}
                          fill="none"
                          stroke="#e0f2fe"
                          strokeWidth="1"
                          opacity="0.8"
                        />
                      )}
                    </motion.g>
                  </g>

                  {/* Complete bottle detail path (ridges, cap, label shape) drawn perfectly on top */}
                  <path 
                    d="M22 0C20.355469 0 19 1.355469 19 3L19 6C19 6.523438 19.183594 7.058594 19.5625 7.4375C19.84375 7.71875 20.203125 7.898438 20.59375 7.96875C20.445313 8.085938 20.261719 8.175781 20.03125 8.21875L20 8.21875C15.457031 9.214844 12 13.222656 12 18.09375L12 21C12 22.257813 12.890625 23.152344 14 23.59375L14 36.40625C12.890625 36.847656 12 37.742188 12 39L12 45C12 47.746094 14.253906 50 17 50L33 50C35.746094 50 38 47.746094 38 45L38 39C38 37.742188 37.109375 36.847656 36 36.40625L36 23.59375C37.109375 23.152344 38 22.257813 38 21L38 18.09375C38 13.222656 34.542969 9.214844 30 8.21875L29.96875 8.21875C29.738281 8.175781 29.554688 8.085938 29.40625 7.96875C29.796875 7.898438 30.15625 7.71875 30.4375 7.4375C30.816406 7.058594 31 6.523438 31 6L31 3C31 1.355469 29.644531 0 28 0 Z M 22 2L28 2C28.554688 2 29 2.445313 29 3L29 6L21 6L21 3C21 2.445313 21.445313 2 22 2 Z M 22.65625 8L27.34375 8C27.707031 9.046875 28.445313 9.929688 29.59375 10.15625L29.59375 10.1875C29.601563 10.1875 29.617188 10.1875 29.625 10.1875C33.269531 11 36 14.175781 36 18.09375L36 21C36 21.554688 35.554688 22 35 22L18 22L18 24L34 24L34 36L18 36L18 38L35 38C35.554688 38 36 38.445313 36 39L36 45C36 46.65625 34.65625 48 33 48L17 48C15.34375 48 14 46.65625 14 45L14 39C14 38.445313 14.445313 38 15 38L16 38L16 22L15 22C14.445313 22 14 21.554688 14 21L14 18.09375C14 14.175781 16.730469 11 20.375 10.1875C20.390625 10.183594 20.390625 10.160156 20.40625 10.15625C21.554688 9.929688 22.292969 9.046875 22.65625 8Z" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="1.2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                  />
                </svg>

              </motion.div>
              <div className="flex flex-col items-center mt-1 space-y-1">
                <span className="text-xs font-black text-white bg-cyan-500/90 dark:bg-cyan-600/90 px-2.5 py-0.5 rounded-full shadow-sm select-none">
                  {Math.round(progress)}%
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {waterAmount} / {waterGoal} ml
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Text and input details */}
        <div className="text-center sm:text-left space-y-3 flex-1 max-w-xs">
          <div className="space-y-1">
            <h4 className="text-3xl font-black text-slate-900 dark:text-white">
              {waterAmount} <span className="text-sm font-bold text-slate-400 uppercase">ml</span>
            </h4>
            
            {isEditingWaterGoal ? (
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="text-xs text-slate-400 font-bold whitespace-nowrap">Nova meta:</span>
                <input 
                  type="number" 
                  value={waterGoal}
                  onChange={(e) => setWaterGoal(Number(e.target.value))}
                  className="w-20 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1 text-center text-xs font-bold dark:text-white"
                />
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsEditingWaterGoal(false)} 
                  className="text-green-500 bg-green-50 dark:bg-green-900/20 p-1 rounded-lg"
                >
                  <Save size={14} />
                </motion.button>
              </div>
            ) : (
              <div className="text-xs text-slate-400 font-medium">
                Meta do dia: <span className="font-extrabold text-cyan-500">{waterGoal} ml</span>
              </div>
            )}
          </div>

          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${isGoalReached ? 'bg-gradient-to-r from-amber-400 to-yellow-500' : 'bg-cyan-500'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 leading-snug">
            {isGoalReached 
              ? "Parabéns! Você alcançou a sua meta diária!" 
              : `Faltam ${Math.max(0, waterGoal - waterAmount)}ml para o objetivo diário.`}
          </p>
        </div>
      </div>

      {/* Addition buttons: +200ml, +500ml, +1000ml */}
      <div className="flex gap-2.5">
        {[200, 500, 1000].map(amount => (
          <motion.button 
            key={amount}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onAddWater(amount)}
            className="flex-1 py-3 bg-cyan-50 dark:bg-cyan-900/10 text-cyan-600 dark:text-cyan-400 rounded-2xl font-black text-xs hover:bg-cyan-100/70 dark:hover:bg-cyan-900/20 transition-all border border-cyan-100/50 dark:border-cyan-900/40"
          >
            +{amount}ml
          </motion.button>
        ))}
      </div>

      {/* Water logs history list below */}
      {waterLogs.length > 0 && (
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
            <Clock size={12} />
            <span>Inserções de Hoje ({waterLogs.length})</span>
          </div>

          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 no-scrollbar">
            <AnimatePresence initial={false}>
              {waterLogs.map((log) => (
                <motion.div 
                  key={log.id}
                  initial={{ opacity: 0, height: 0, y: -5 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: 5 }}
                  className="flex items-center justify-between py-2 px-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100/60 dark:border-slate-800/40 group hover:border-cyan-200/50 dark:hover:border-cyan-900/30 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Água Adicionada</span>
                      <span className="text-[9px] font-medium text-slate-400 flex items-center gap-0.5">
                        <Clock size={9} /> {formatTime(log.logged_at)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-cyan-600 dark:text-cyan-400">
                      +{log.amount_ml} ml
                    </span>
                    {onDeleteWater && (
                      <div className="flex items-center">
                        {confirmDeleteId === log.id ? (
                          <div className="flex items-center gap-1 bg-rose-500/10 border border-rose-200/20 px-2 py-0.5 rounded-xl">
                            <span className="text-[9px] font-black uppercase text-rose-500 mr-1">Excluir?</span>
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteWater(log.id);
                                setConfirmDeleteId(null);
                              }}
                              className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 p-1 rounded-lg border-0 bg-transparent cursor-pointer transition-all animate-pulse"
                              title="Confirmar exclusão"
                            >
                              <Check size={11} className="stroke-[3]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-slate-400 hover:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 p-1 rounded-lg border-0 bg-transparent cursor-pointer transition-all"
                              title="Cancelar"
                            >
                              <X size={11} className="stroke-[3]" />
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setConfirmDeleteId(log.id)}
                            className="text-slate-300 hover:text-red-500 transition-colors p-1 cursor-pointer"
                            title="Excluir Registro"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

    </div>
  );
};
