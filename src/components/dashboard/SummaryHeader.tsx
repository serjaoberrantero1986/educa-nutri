import React from 'react';
import { motion } from 'motion/react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface SummaryHeaderProps {
  totalCalories: number;
  targetCalories: number;
  totalProtein: number;
  targetProtein: number;
  totalCarbs: number;
  targetCarbs: number;
  totalFat: number;
  targetFat: number;
  macroData: any[];
  COLORS: string[];
}

export const SummaryHeader: React.FC<SummaryHeaderProps> = ({
  totalCalories,
  targetCalories,
  totalProtein,
  targetProtein,
  totalCarbs,
  targetCarbs,
  totalFat,
  targetFat,
  macroData,
  COLORS
}) => {
  // Safe calculation to avoid NaN inside pie labels
  const totalMacrosValue = macroData.reduce((acc, curr) => acc + (curr.value || 0), 0);

  const remainingCalories = Math.max(0, Math.round(targetCalories - totalCalories));
  const remainingPercent = targetCalories > 0 ? Math.round((remainingCalories / targetCalories) * 100) : 0;

  const render3DLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value, name }: any) => {
    const RADIAN = Math.PI / 180;
    // Position labels slightly outside of the outerRadius for spacing, but safe from wrapping/cutting off
    const radius = outerRadius * 1.05;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    const percentage = totalMacrosValue > 0 ? Math.round((value / totalMacrosValue) * 100) : 0;
    if (percentage === 0) return null;

    let shortLabel = "Prot";
    let color = "#a855f7"; // text color to match theme
    if (name.toLowerCase().includes("carb")) {
      shortLabel = "Carb";
      color = "#06b6d4";
    } else if (name.toLowerCase().includes("gord")) {
      shortLabel = "Gord";
      color = "#f59e0b";
    }

    const isRight = x > cx;
    const xPos = isRight ? x : Math.max(x, 34);

    return (
      <text
        x={xPos}
        y={y}
        fill={color}
        textAnchor={isRight ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-[10px] font-extrabold tracking-wider select-none dark:brightness-110"
      >
        {shortLabel}: {percentage}%
      </text>
    );
  };

  const GRADIENT_IDS = ['url(#grad-protein)', 'url(#grad-carbs)', 'url(#grad-fat)'];

  return (
    <section className="w-full">
      <div className="w-full bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[2.5rem] shadow-xl shadow-purple-500/5 border border-slate-100 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row items-center justify-around gap-8 py-2">
          
          {/* Gráfico de Pizza 3D modernizado */}
          <div className="relative w-64 h-64 flex items-center justify-center shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <defs>
                  {/* Modern pseudo-3D gradients */}
                  <linearGradient id="grad-protein" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#d8b4fe" />
                    <stop offset="45%" stopColor="#a855f7" />
                    <stop offset="100%" stopColor="#7e22ce" />
                  </linearGradient>
                  <linearGradient id="grad-carbs" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#a5f3fc" />
                    <stop offset="45%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#0e7490" />
                  </linearGradient>
                  <linearGradient id="grad-fat" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#fef08a" />
                    <stop offset="45%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#b45309" />
                  </linearGradient>
                  {/* Subtle 3D shadow for visual elevation */}
                  <filter id="pie-3d-shadow" x="-10%" y="-10%" width="120%" height="120%">
                    <feDropShadow dx="1" dy="2.5" stdDeviation="2" floodColor="#000000" floodOpacity="0.22" />
                  </filter>
                </defs>
                <Pie
                  data={macroData}
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                  label={render3DLabel}
                  labelLine={false}
                >
                  {macroData.map((entry: any, index: number) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={GRADIENT_IDS[index % GRADIENT_IDS.length]} 
                      filter="url(#pie-3d-shadow)"
                      className="outline-none"
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Concentric Modern 3D Dial Hole */}
            <div className="absolute w-[86px] h-[86px] rounded-full bg-slate-50 dark:bg-slate-800 shadow-[inset_1.5px_2px_4px_rgba(0,0,0,0.15),_0.75px_1px_1.5px_rgba(255,255,255,0.7)] flex flex-col items-center justify-center select-none pointer-events-none border border-slate-100/30 dark:border-slate-700/30">
              <span className="text-[9px] font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Macros</span>
              <span className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest mt-0.5">Kcal %</span>
            </div>
          </div>

          {/* Resumo Nutricional */}
          <div className="text-center sm:text-left space-y-4 flex-1 max-w-sm w-full">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Resumo de Hoje</h3>
            <div className="flex items-baseline justify-center sm:justify-start gap-2">
              <span className="text-5xl font-black text-slate-900 dark:text-white">{Math.round(totalCalories)}</span>
              <span className="text-slate-400 font-bold">/ {targetCalories} kcal</span>
            </div>
            <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((totalCalories / targetCalories) * 100, 100)}%` }}
                className={`h-full ${totalCalories > targetCalories ? 'bg-red-500' : 'bg-purple-cyan'}`}
              />
            </div>
            <div className="grid grid-cols-3 gap-4 pt-2">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                  <span className="text-purple-500">Prot</span>
                  <span className="text-slate-400">{Math.round(totalProtein)}/{targetProtein}g</span>
                </div>
                <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${totalProtein > targetProtein ? 'bg-red-500' : 'bg-purple-500'}`}
                    style={{ width: `${Math.min((totalProtein / targetProtein) * 100, 100)}%` }}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                  <span className="text-cyan-500">Carb</span>
                  <span className="text-slate-400">{Math.round(totalCarbs)}/{targetCarbs}g</span>
                </div>
                <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${totalCarbs > targetCarbs ? 'bg-red-500' : 'bg-cyan-500'}`}
                    style={{ width: `${Math.min((totalCarbs / targetCarbs) * 100, 100)}%` }}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                  <span className="text-amber-500">Gord</span>
                  <span className="text-slate-400">{Math.round(totalFat)}/{targetFat}g</span>
                </div>
                <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${totalFat > targetFat ? 'bg-red-500' : 'bg-amber-500'}`}
                    style={{ width: `${Math.min((totalFat / targetFat) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
            
            <div className="text-center sm:text-left pt-2">
              <span className="text-slate-400 font-bold text-sm">Faltam: {remainingCalories} kcal ({remainingPercent}%)</span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
