import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  Trash2, 
  Calendar, 
  Check, 
  ChevronRight, 
  Activity, 
  Sparkles, 
  Info,
  Sliders,
  Sparkle,
  ArrowLeft,
  Target,
  User,
  Scale,
  Coffee,
  HelpCircle,
  Footprints,
  Flame,
  Trophy,
  Bike,
  Dumbbell
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip as RechartsTooltip, 
  CartesianGrid, 
  LineChart, 
  Line, 
  Legend 
} from 'recharts';
import { doc, updateDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../lib/firebase';
import { Profile, UserData, WeightHistoryEntry, MeasurementHistoryEntry, PhotoHistoryEntry } from '../../types';
import { calculateNavyBodyFat, generateDiet } from '../../utils';

function cleanUndefined(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefined(item)).filter(x => x !== undefined);
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val !== undefined) {
        cleaned[key] = cleanUndefined(val);
      }
    }
    return cleaned;
  }
  return obj;
}

const SilhouetteSVG: React.FC<{ sex: 'male' | 'female'; index: number; active: boolean }> = ({ sex, index, active }) => {
  const strokeColor = active ? '#10b981' : '#64748b';
  const fillColor = active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.05)';
  
  if (sex === 'male') {
    const waistW = 20 + index * 6; 
    const chestW = 55 + index * 2; 
    const abLineOpacity = Math.max(0, 1 - index * 0.25);
    
    return (
      <svg viewBox="0 0 120 120" className="w-full h-24 mx-auto transition-all duration-300">
        <path d="M50 20 L50 30 M70 20 L70 30" stroke={strokeColor} strokeWidth="2.5" />
        <path 
          d={`M35 34 C 38 34, 45 34, 50 34 
              C ${60 - chestW/2} 38, ${60 - chestW/2} 55, ${60 - waistW/2} 75
              C ${60 - waistW/2} 90, ${60 - waistW/2} 100, 45 105
              L 75 105
              C ${60 + waistW/2} 100, ${60 + waistW/2} 90, ${60 + waistW/2} 75
              C ${60 + chestW/2} 55, ${60 + chestW/2} 38, 70 34
              C 75 34, 82 34, 85 34
              Z`} 
          fill={fillColor} 
          stroke={strokeColor} 
          strokeWidth="2" 
          strokeLinejoin="round" 
        />
        {index < 5 && (
          <g opacity={abLineOpacity} stroke={strokeColor} strokeWidth="1.5" fill="none">
            <path d="M42 48 C 50 49, 58 49, 60 52 C 62 49, 70 49, 78 48" />
            <path d="M60 52 L60 95" />
            <path d="M48 62 C 55 61, 65 61, 72 62" />
            {index < 3 && <path d="M48 72 C 55 71, 65 71, 72 72" />}
            {index < 2 && <path d="M48 82 C 55 81, 65 81, 72 82" />}
          </g>
        )}
        {index >= 5 && (
          <g stroke={strokeColor} strokeWidth="1.5" fill="none" opacity={(index - 4) * 0.2}>
            <path d={`M${60 - waistW/3} 70 C 60 75, 60 75, ${60 + waistW/3} 70`} strokeWidth="1"/>
            <path d={`M${60 - waistW/4} 85 C 60 90, 60 90, ${60 + waistW/4} 85`} strokeWidth="1"/>
          </g>
        )}
      </svg>
    );
  } else {
    const waistW = 20 + index * 5; 
    const hipW = 45 + index * 6;  
    const chestW = 42 + index * 3;
    const bodyCurveOpacity = Math.max(0, 1 - index * 0.22);
    
    return (
      <svg viewBox="0 0 120 120" className="w-full h-24 mx-auto transition-all duration-300">
        <path d="M52 20 L52 30 M68 20 L68 30" stroke={strokeColor} strokeWidth="2" />
        <path 
          d={`M38 34 C 42 34, 45 34, 52 34
              C 50 42, 50 46, ${60 - chestW/2} 50
              C ${60 - chestW/2} 55, ${60 - waistW/2} 65, ${60 - waistW/2} 75
              C ${60 - waistW/2} 85, ${60 - hipW/2} 95, ${60 - hipW/2} 105
              L ${60 + hipW/2} 105
              C ${60 + hipW/2} 95, ${60 + waistW/2} 85, ${60 + waistW/2} 75
              C ${60 + waistW/2} 65, ${60 + chestW/2} 55, 70 50
              C 70 46, 70 42, 68 34
              Z`} 
          fill={fillColor} 
          stroke={strokeColor} 
          strokeWidth="2" 
          strokeLinejoin="round" 
        />
        <g stroke={strokeColor} strokeWidth="1" fill="none">
          <path d="M44 38 C 50 41, 55 41, 60 41" />
          <path d="M76 38 C 70 41, 65 41, 60 31" />
          {index < 4 && (
            <path d={`M43 56 C 53 58, 67 58, 77 56`} opacity={bodyCurveOpacity} strokeWidth="1"/>
          )}
        </g>
      </svg>
    );
  }
};

interface EvolutionTabProps {
  user: any;
  profile: Profile | null;
  setProfile: React.Dispatch<React.SetStateAction<Profile | null>>;
  userData: UserData;
}

export const EvolutionTab: React.FC<EvolutionTabProps> = ({
  user,
  profile,
  setProfile,
  userData
}) => {
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  // Local state for forms
  const [logWeight, setLogWeight] = useState<string>(userData.weight?.toString() || '');
  const [logWaist, setLogWaist] = useState<string>(userData.waist?.toString() || '85');
  const [logNeck, setLogNeck] = useState<string>(userData.neck?.toString() || '38');
  const [logHip, setLogHip] = useState<string>(userData.hip?.toString() || '95');
  const [logBiceps, setLogBiceps] = useState<string>(userData.biceps?.toString() || '35');
  const [logPeitoral, setLogPeitoral] = useState<string>(userData.peitoral?.toString() || '100');
  const [logCoxas, setLogCoxas] = useState<string>(userData.coxas?.toString() || '55');
  const [logDate, setLogDate] = useState<string>(() => {
    const d = new Date();
    const tzOffset = d.getTimezoneOffset() * 60000;
    return (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 10);
  });
  const [knowsBF, setKnowsBF] = useState<boolean>(userData.knowsBodyFat || false);
  const [customBF, setCustomBF] = useState<string>(userData.customBodyFat?.toString() || '15');
  const [visualBF, setVisualBF] = useState<number | undefined>(userData.visualBodyFat);

  const [localSex, setLocalSex] = useState<"male" | "female">(userData.sex || 'male');
  const [localAge, setLocalAge] = useState<number>(userData.age || 25);
  const [localHeight, setLocalHeight] = useState<number>(userData.height || 170);
  const [localGoal, setLocalGoal] = useState<"hypertrophy" | "weightloss" | "recomposition" | "maintenance">(userData.goal || 'hypertrophy');
  const [localJourneySpeed, setLocalJourneySpeed] = useState<"conservative" | "moderate" | "aggressive">(userData.journeySpeed || 'moderate');
  const [localActivityLevel, setLocalActivityLevel] = useState<"sedentary" | "light" | "moderate" | "high" | "athlete">(userData.activityLevel || 'moderate');
  const [localFrequency, setLocalFrequency] = useState<number>(userData.frequency || 3);
  const [localDuration, setLocalDuration] = useState<number>(userData.duration || 60);
  const [localExerciseCategory, setLocalExerciseCategory] = useState<"force" | "cardio_moderate" | "cardio_intense" | "mixed">(userData.exerciseCategory || 'force');
  const [localTargetBF, setLocalTargetBF] = useState<number>(userData.targetBodyFat || (userData.sex === 'male' ? 12 : 20));
  const [localTargetBFPreset, setLocalTargetBFPreset] = useState<'athletic' | 'fitness' | 'healthy' | 'custom'>(userData.targetBodyFatPreset || 'healthy');
  const [localDailySteps, setLocalDailySteps] = useState<number>(userData.dailySteps || 5000);
  const [localStepsCategory, setLocalStepsCategory] = useState<string>(userData.stepsCategory || 'Não sei (estimar em 5.000 passos)');

  const [saving, setSaving] = useState(false);
  const [showSavedSuccess, setShowSavedSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Synchronize local state with profile/userData when it updates
  React.useEffect(() => {
    const activeData = profile?.user_data || userData;
    if (activeData) {
      setLogWeight(activeData.weight?.toString() || '');
      setLogWaist(activeData.waist?.toString() || '85');
      setLogNeck(activeData.neck?.toString() || '38');
      setLogHip(activeData.hip?.toString() || '95');
      setLogBiceps(activeData.biceps?.toString() || '35');
      setLogPeitoral(activeData.peitoral?.toString() || '100');
      setLogCoxas(activeData.coxas?.toString() || '55');
      setKnowsBF(activeData.knowsBodyFat || false);
      setCustomBF(activeData.customBodyFat?.toString() || '15');
      setVisualBF(activeData.visualBodyFat);
      setLocalSex(activeData.sex || 'male');
      setLocalAge(activeData.age || 25);
      setLocalHeight(activeData.height || 170);
      setLocalGoal(activeData.goal || 'hypertrophy');
      setLocalJourneySpeed(activeData.journeySpeed || 'moderate');
      setLocalActivityLevel(activeData.activityLevel || 'moderate');
      setLocalFrequency(activeData.frequency || 3);
      setLocalDuration(activeData.duration || 60);
      setLocalExerciseCategory(activeData.exerciseCategory || 'force');
      setLocalTargetBF(activeData.targetBodyFat || (activeData.sex === 'male' ? 12 : 20));
      setLocalTargetBFPreset(activeData.targetBodyFatPreset || 'healthy');
      setLocalDailySteps(activeData.dailySteps || 5000);
      setLocalStepsCategory(activeData.stepsCategory || 'Não sei (estimar em 5.000 passos)');
    }
  }, [profile?.user_data]);

  // Extract entries safe fallbacks
  const weightHistory = useMemo((): WeightHistoryEntry[] => {
    return profile?.weight_history || [];
  }, [profile]);

  const measurementHistory = useMemo((): MeasurementHistoryEntry[] => {
    return profile?.measurement_history || [];
  }, [profile]);

  // Calculate 7-day moving averages for charts
  const processedWeightData = useMemo(() => {
    if (weightHistory.length === 0) {
      const todayStr = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
      return [{
        date: todayStr,
        peso: userData.weight,
        mediaMovel: userData.weight,
        rawDate: new Date().toISOString()
      }];
    }

    const sorted = [...weightHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return sorted.map((entry, idx) => {
      const subset = sorted.slice(Math.max(0, idx - 6), idx + 1);
      const sum = subset.reduce((acc, curr) => acc + curr.weight, 0);
      const average = Number((sum / subset.length).toFixed(1));

      const parsedDate = new Date(entry.date + 'T12:00:00');
      const label = parsedDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });

      return {
        date: label,
        peso: entry.weight,
        mediaMovel: average,
        rawDate: entry.date
      };
    });
  }, [weightHistory, userData.weight]);

  // Composition data history
  const processedCompositionData = useMemo(() => {
    if (measurementHistory.length === 0) {
      const todayStr = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
      const currentCalculatedBF = calculateNavyBodyFat(userData.sex, userData.height, userData.waist || 85, userData.neck || 38, userData.hip || 95);
      const defaultLBM = Number((userData.weight * (1 - currentCalculatedBF / 100)).toFixed(1));
      return [{
        date: todayStr,
        gordura: currentCalculatedBF,
        massaMagra: defaultLBM
      }];
    }

    const sorted = [...measurementHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    return sorted.map(mEntry => {
      const parsedDate = new Date(mEntry.date + 'T12:00:00');
      const label = parsedDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });

      let matchWeight = userData.weight;
      const sortedWeightsDesc = [...weightHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const exactMatch = sortedWeightsDesc.find(w => w.date === mEntry.date);
      if (exactMatch) {
        matchWeight = exactMatch.weight;
      } else {
        const olderMatch = sortedWeightsDesc.find(w => new Date(w.date).getTime() <= new Date(mEntry.date).getTime());
        if (olderMatch) {
          matchWeight = olderMatch.weight;
        }
      }

      const calculatedBF = mEntry.bodyFat || calculateNavyBodyFat(userData.sex, userData.height, mEntry.waist, mEntry.neck, mEntry.hip);
      const lbm = Number((matchWeight * (1 - calculatedBF / 100)).toFixed(1));

      return {
        date: label,
        gordura: calculatedBF,
        massaMagra: lbm
      };
    });
  }, [measurementHistory, weightHistory, userData]);

  // Measurements history for hypertrophy tracking
  const processedMeasurementsData = useMemo(() => {
    if (measurementHistory.length === 0) {
      const todayStr = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
      return [{
        date: todayStr,
        waist: userData.waist || 85,
        hip: userData.hip || 95,
        biceps: userData.biceps || 35,
        peitoral: userData.peitoral || 100,
        coxas: userData.coxas || 55
      }];
    }

    const sorted = [...measurementHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return sorted.map(mEntry => {
      const parsedDate = new Date(mEntry.date + 'T12:00:00');
      const label = parsedDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });

      return {
        date: label,
        waist: mEntry.waist || userData.waist || 85,
        hip: mEntry.hip || userData.hip || 95,
        biceps: mEntry.biceps || userData.biceps || 35,
        peitoral: mEntry.peitoral || userData.peitoral || 100,
        coxas: mEntry.coxas || userData.coxas || 55
      };
    });
  }, [measurementHistory, userData]);

  const currentEstimatedBF = useMemo(() => {
    if (knowsBF) return Number(customBF) || 15;
    const navyBF = calculateNavyBodyFat(localSex, localHeight, Number(logWaist) || 85, Number(logNeck) || 38, Number(logHip) || 95);
    if (visualBF) {
      return Number(((navyBF + visualBF) / 2).toFixed(1));
    }
    return navyBF;
  }, [knowsBF, customBF, localSex, localHeight, logWaist, logNeck, logHip, visualBF]);

  const currentLBM = useMemo(() => {
    const activeWeight = Number(logWeight) || userData.weight;
    return Number((activeWeight * (1 - currentEstimatedBF / 100)).toFixed(1));
  }, [logWeight, currentEstimatedBF, userData.weight]);

  const handleSaveTodayMetrics = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setShowSavedSuccess(false);
    const activeDate = logDate || new Date().toISOString().split('T')[0];
    const weightNum = Number(logWeight);
    const waistNum = Number(logWaist);
    const neckNum = Number(logNeck);
    const hipNum = Number(logHip) || undefined;
    const bicepsNum = Number(logBiceps) || undefined;
    const peitoralNum = Number(logPeitoral) || undefined;
    const coxasNum = Number(logCoxas) || undefined;
    
    if (isNaN(weightNum) || weightNum <= 10) {
      setErrorMsg('Por favor, informe um peso corporal válido.');
      return;
    }

    setSaving(true);

    const newWeightEntry: WeightHistoryEntry = {
      date: activeDate,
      weight: weightNum
    };

    const newMeasurementEntry: MeasurementHistoryEntry = {
      date: activeDate,
      waist: waistNum,
      neck: neckNum,
      hip: hipNum,
      biceps: bicepsNum,
      peitoral: peitoralNum,
      coxas: coxasNum,
      bodyFat: currentEstimatedBF
    };

    const filteredWeights = weightHistory.filter(w => w.date !== activeDate);
    const updatedWeightHistory = [...filteredWeights, newWeightEntry];

    const filteredMeasurements = measurementHistory.filter(m => m.date !== activeDate);
    const updatedMeasurementHistory = [...filteredMeasurements, newMeasurementEntry];

    const sortedWeights = [...updatedWeightHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const latestWeightEntry = sortedWeights[sortedWeights.length - 1];

    const sortedMeasurements = [...updatedMeasurementHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const latestMeasurementEntry = sortedMeasurements[sortedMeasurements.length - 1];

    const activeWeightForUserData = latestWeightEntry ? latestWeightEntry.weight : weightNum;
    const activeWaistForUserData = latestMeasurementEntry ? latestMeasurementEntry.waist : waistNum;
    const activeNeckForUserData = latestMeasurementEntry ? latestMeasurementEntry.neck : neckNum;
    const activeHipForUserData = latestMeasurementEntry ? latestMeasurementEntry.hip : hipNum;
    const activeBicepsForUserData = latestMeasurementEntry ? latestMeasurementEntry.biceps : bicepsNum;
    const activePeitoralForUserData = latestMeasurementEntry ? latestMeasurementEntry.peitoral : peitoralNum;
    const activeCoxasForUserData = latestMeasurementEntry ? latestMeasurementEntry.coxas : coxasNum;

    const updatedUserData: UserData = {
      ...userData,
      sex: localSex,
      age: localAge,
      height: localHeight,
      goal: localGoal,
      journeySpeed: localJourneySpeed,
      activityLevel: localActivityLevel,
      frequency: localFrequency,
      duration: localDuration,
      exerciseCategory: localExerciseCategory,
      targetBodyFat: localTargetBF,
      targetBodyFatPreset: localTargetBFPreset,
      dailySteps: localDailySteps,
      stepsCategory: localStepsCategory,
      weight: activeWeightForUserData,
      waist: activeWaistForUserData,
      neck: activeNeckForUserData,
      hip: activeHipForUserData,
      biceps: activeBicepsForUserData,
      peitoral: activePeitoralForUserData,
      coxas: activeCoxasForUserData,
      knowsBodyFat: knowsBF,
      customBodyFat: knowsBF ? Number(customBF) : undefined,
      visualBodyFat: knowsBF ? undefined : visualBF,
    };

    const recalculatedPlan = generateDiet(updatedUserData, [], profile?.custom_meals);

    const updatedProfile: Partial<Profile> = {
      user_data: updatedUserData,
      weight_history: updatedWeightHistory,
      measurement_history: updatedMeasurementHistory,
      diet_plan: recalculatedPlan || undefined
    };

    const sanitizedProfile = cleanUndefined(updatedProfile);

    try {
      if (user && isFirebaseConfigured) {
        const ref = doc(db, 'profiles', user.uid);
        await updateDoc(ref, sanitizedProfile);
      }

      setProfile(prev => prev ? { ...prev, ...sanitizedProfile } : null);

      if (user) {
        localStorage.setItem(`profile_${user.uid}`, JSON.stringify({
          ...(profile || {}),
          ...sanitizedProfile
        }));
      }

      setSuccessMsg('Registro de evolução atualizado com sucesso! Seu plano calórico foi atualizado automaticamente.');
      setShowSavedSuccess(true);
      setTimeout(() => setSuccessMsg(''), 6000);
      setTimeout(() => setShowSavedSuccess(false), 4000);
    } catch (err) {
      console.error('Falha ao salvar medições:', err);
      setErrorMsg('Sua sessão salvou localmente devido a um atraso de conexão de rede.');
      setProfile(prev => prev ? { ...prev, ...sanitizedProfile } : null);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveWeightLog = async (dateStr: string) => {
    const updatedWeightHistory = weightHistory.filter(w => w.date !== dateStr);
    const updatedProfile: Partial<Profile> = {
      weight_history: updatedWeightHistory
    };

    try {
      if (user && isFirebaseConfigured) {
        const ref = doc(db, 'profiles', user.uid);
        await updateDoc(ref, updatedProfile);
      }
      setProfile(prev => prev ? { ...prev, ...updatedProfile } : null);
    } catch (err) {
      console.error('Falha ao apagar registro:', err);
    }
  };

  return (
    <section className="space-y-8 pb-20">
      {/* Header Dashboard with dynamic status */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white p-8 rounded-[2.5rem] relative overflow-hidden shadow-xs">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/5 dark:bg-purple-500/10 blur-[120px] rounded-full -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/5 dark:bg-cyan-500/10 blur-[120px] rounded-full -ml-32 -mb-32" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-2 text-slate-950 dark:text-white">
              <TrendingUp className="text-purple-600 dark:text-purple-400" /> Painel de Evolução Corporal
            </h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-xl text-sm leading-relaxed">
              Otimize seus resultados acompanhando as variáveis chave de sua composição física. O peso médio de 7 dias atenua retenções calóricas e hídricas passageiras.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 items-center justify-end">
            <div className="bg-white dark:bg-white/5 backdrop-blur-md rounded-2xl p-4 text-center border border-slate-100 dark:border-slate-800/40 min-w-[100px] shadow-xs dark:shadow-none">
              <div className="text-[10px] font-bold tracking-widest text-slate-404 dark:text-slate-500 uppercase">PESO ATUAL</div>
              <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">{profile?.user_data?.weight || userData.weight || '-'} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">kg</span></div>
            </div>
            <div className="bg-white dark:bg-white/5 backdrop-blur-md rounded-2xl p-4 text-center border border-slate-100 dark:border-slate-800/40 min-w-[100px] shadow-xs dark:shadow-none">
              <div className="text-[10px] font-bold tracking-widest text-slate-404 dark:text-slate-500 uppercase">CINTURA</div>
              <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{profile?.user_data?.waist || userData.waist || '-'} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">cm</span></div>
            </div>
            <div className="bg-white dark:bg-white/5 backdrop-blur-md rounded-2xl p-4 text-center border border-slate-100 dark:border-slate-800/40 min-w-[100px] shadow-xs dark:shadow-none">
              <div className="text-[10px] font-bold tracking-widest text-slate-404 dark:text-slate-500 uppercase">PESCOÇO</div>
              <div className="text-2xl font-black text-blue-650 dark:text-blue-404 mt-1">{profile?.user_data?.neck || userData.neck || '-'} <span className="text-xs font-normal text-slate-500 dark:text-slate-404">cm</span></div>
            </div>
            {(profile?.user_data?.sex || userData.sex) === 'female' && (
              <div className="bg-white dark:bg-white/5 backdrop-blur-md rounded-2xl p-4 text-center border border-slate-100 dark:border-slate-800/40 min-w-[100px] shadow-xs dark:shadow-none">
                <div className="text-[10px] font-bold tracking-widest text-slate-404 dark:text-slate-500 uppercase">QUADRIL</div>
                <div className="text-2xl font-black text-rose-500 dark:text-rose-404 mt-1">{profile?.user_data?.hip || userData.hip || '-'} <span className="text-xs font-normal text-slate-500 dark:text-slate-404 font-bold">cm</span></div>
              </div>
            )}
            <div className="bg-white dark:bg-white/5 backdrop-blur-md rounded-2xl p-4 text-center border border-slate-100 dark:border-slate-800/40 min-w-[100px] shadow-xs dark:shadow-none">
              <div className="text-[10px] font-bold tracking-widest text-slate-404 dark:text-slate-500 uppercase">GORDURA ATUAL</div>
              <div className="text-2xl font-black text-cyan-600 dark:text-cyan-404 mt-1">{currentEstimatedBF}%</div>
            </div>
          </div>
        </div>
      </div>

      {successMsg && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/50 p-4 rounded-2xl flex items-center gap-3"
        >
          <Sparkle className="text-emerald-600 dark:text-emerald-400 shrink-0" size={20} />
          <span className="text-sm font-bold">{successMsg}</span>
        </motion.div>
      )}

      {errorMsg && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border border-rose-100 dark:border-rose-900/50 p-4 rounded-2xl flex items-center gap-3"
        >
          <Info className="text-rose-600 dark:text-rose-400 shrink-0" size={20} />
          <span className="text-sm font-bold">{errorMsg}</span>
        </motion.div>
      )}

      {/* Main Grid: Form on left, Visualizer charts on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Log Today Metrics Card */}
        <div className="lg:col-span-12 xl:col-span-12 lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-8 divide-y divide-slate-100 dark:divide-slate-800">
            
            {/* Header / Date Selection */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">REGISTRO ATUAL</span>
                <span className="text-xs text-purple-600 dark:text-purple-400 font-bold flex items-center gap-1">
                  <Calendar size={14} /> Histórico de Evolução
                </span>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Data do Registro das Medidas</label>
                <input 
                  type="date"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-3 text-xs font-extrabold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-purple-500/20 transition-all cursor-pointer"
                />
              </div>
            </div>

            {/* SECTION 1: BASIC BIOMETRICS */}
            <div className="pt-6 space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-2">
                <User size={16} /> Perfil Físico Básico
              </div>

              {/* Biological Sex Button Group */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Gênero Biológico</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-750/50">
                  <button
                    type="button"
                    onClick={() => setLocalSex('male')}
                    className={`py-2.5 text-xs font-bold rounded-xl transition-all border-none cursor-pointer ${
                      localSex === 'male' 
                        ? 'bg-white dark:bg-slate-700 shadow-sm text-purple-600 dark:text-cyan-400 font-black' 
                        : 'text-slate-400 hover:text-slate-500'
                    }`}
                  >
                    Masculino
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocalSex('female')}
                    className={`py-2.5 text-xs font-bold rounded-xl transition-all border-none cursor-pointer ${
                      localSex === 'female' 
                        ? 'bg-white dark:bg-slate-700 shadow-sm text-purple-600 dark:text-cyan-400 font-black' 
                        : 'text-slate-400 hover:text-slate-500'
                    }`}
                  >
                    Feminino
                  </button>
                </div>
              </div>

              {/* Age, Height, Weight inputs */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Idade (Anos)</span>
                  <input 
                    type="number" 
                    value={localAge || ''}
                    onChange={(e) => setLocalAge(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500/20 transition-all dark:text-white"
                    placeholder="Anos"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Altura (cm)</span>
                  <input 
                    type="number" 
                    value={localHeight || ''}
                    onChange={(e) => setLocalHeight(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500/20 transition-all dark:text-white"
                    placeholder="cm"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Peso (kg)</span>
                  <input 
                    type="number" 
                    step="0.1"
                    value={logWeight || ''}
                    onChange={(e) => setLogWeight(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500/20 transition-all dark:text-white font-bold"
                    placeholder="kg"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2: BODY COMPOSITION */}
            <div className="pt-6 space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-2">
                <Scale size={16} /> Composição Corporal
              </div>

              {/* Knows Body Fat Switch */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm">
                <span className="text-xs text-slate-600 dark:text-slate-350 font-bold">Conhece seu percentual de gordura corporal?</span>
                <button 
                  type="button"
                  onClick={() => setKnowsBF(!knowsBF)}
                  className={`text-[10px] tracking-wider px-3.5 py-1.5 rounded-xl font-black transition-all border-none cursor-pointer ${
                    knowsBF 
                      ? 'bg-purple-600 text-white shadow-xs' 
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {knowsBF ? 'SIM' : 'NÃO'}
                </button>
              </div>

              {knowsBF ? (
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Percentual de Gordura Conhecido (%)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      step="0.5"
                      value={customBF}
                      onChange={(e) => setCustomBF(e.target.value)}
                      placeholder="Ex: 14.5"
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500/20 transition-all dark:text-white"
                    />
                    <span className="absolute right-4 top-3 text-sm text-slate-400 font-bold">%</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders size={14} className="text-teal-500" /> 1. Avaliação Visual (Selecione sua Silhueta)
                    </label>
                    <p className="text-[11px] text-slate-404 dark:text-slate-500">
                      Selecione o modelo corporal mais próximo ao seu atual para refinar seu cálculo:
                    </p>
                    
                    <div className="grid grid-cols-3 gap-3">
                      {(() => {
                        const options = localSex === 'male' ? [
                          { range: '3-4%', val: 3.5 },
                          { range: '5-7%', val: 6 },
                          { range: '8-12%', val: 10 },
                          { range: '13-17%', val: 15 },
                          { range: '18-23%', val: 20.5 },
                          { range: '24-29%', val: 26.5 },
                          { range: '30-34%', val: 32 },
                          { range: '35-39%', val: 37 },
                          { range: '40% +', val: 43 }
                        ] : [
                          { range: '10-12%', val: 11 },
                          { range: '13-15%', val: 14 },
                          { range: '16-19%', val: 17.5 },
                          { range: '20-24%', val: 22 },
                          { range: '25-29%', val: 27 },
                          { range: '30-34%', val: 32 },
                          { range: '35-39%', val: 37 },
                          { range: '40-44%', val: 42 },
                          { range: '45% +', val: 48 }
                        ];

                        return options.map((opt, idx) => {
                          const isSelected = visualBF === opt.val;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setVisualBF(opt.val)}
                              className={`p-2 rounded-2xl border text-center transition-all cursor-pointer ${
                                isSelected 
                                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                                  : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-500 hover:border-slate-202 dark:hover:border-slate-700'
                              }`}
                            >
                              <SilhouetteSVG sex={localSex} index={idx} active={isSelected} />
                              <div className="text-[11px] font-bold mt-1.5">{opt.range}</div>
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders size={14} className="text-purple-500" /> 2. Medidas de Circunferência (Fórmula da Marinha)
                    </label>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-404 dark:text-slate-500">Circunferência Cintura (cm)</span>
                        <input 
                          type="number" 
                          value={logWaist}
                          onChange={(e) => setLogWaist(e.target.value)}
                          className="w-full bg-slate-55 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500/20 transition-all dark:text-white"
                          placeholder="Cintura"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-404 dark:text-slate-500">Circunferência Pescoço (cm)</span>
                        <input 
                          type="number" 
                          value={logNeck}
                          onChange={(e) => setLogNeck(e.target.value)}
                          className="w-full bg-slate-55 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500/20 transition-all dark:text-white"
                          placeholder="Pescoço"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-404 dark:text-slate-500">Circunferência Quadril (cm)</span>
                        <input 
                          type="number" 
                          value={logHip}
                          onChange={(e) => setLogHip(e.target.value)}
                          className="w-full bg-slate-55 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500/20 transition-all dark:text-white"
                          placeholder="Quadril"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-404 dark:text-slate-500">Circunferência Bíceps (cm)</span>
                        <input 
                          type="number" 
                          value={logBiceps}
                          onChange={(e) => setLogBiceps(e.target.value)}
                          className="w-full bg-slate-55 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500/20 transition-all dark:text-white"
                          placeholder="Bíceps"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-404 dark:text-slate-500">Circunferência Peitoral (cm)</span>
                        <input 
                          type="number" 
                          value={logPeitoral}
                          onChange={(e) => setLogPeitoral(e.target.value)}
                          className="w-full bg-slate-55 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500/20 transition-all dark:text-white"
                          placeholder="Peitoral"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-404 dark:text-slate-500">Circunferência Coxas (cm)</span>
                        <input 
                          type="number" 
                          value={logCoxas}
                          onChange={(e) => setLogCoxas(e.target.value)}
                          className="w-full bg-slate-55 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500/20 transition-all dark:text-white"
                          placeholder="Coxas"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Real-time calculated body fat preview */}
              <div className="bg-slate-55 dark:bg-slate-800/40 p-4 rounded-2xl flex justify-between items-center border border-slate-100 dark:border-slate-800/85">
                <div className="space-y-0.5">
                  <div className="text-[10px] text-slate-404 font-bold uppercase tracking-wide">Estimativa de Gordura Corporal</div>
                  <div className="text-xs text-slate-500 font-bold">Massa Magra: <span className="text-purple-600 dark:text-purple-400 font-black">{currentLBM} kg</span></div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold tracking-widest text-slate-404 uppercase">Gordura Corporal</div>
                  <div className="text-2xl font-black text-cyan-500">{currentEstimatedBF}%</div>
                </div>
              </div>
            </div>

            {/* SECTION 3: GOALS & TARGETS */}
            <div className="pt-6 space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-2">
                <Target size={16} /> Objetivos e Alvos Físicos
              </div>

              {/* Main Objective */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Seu Objetivo Principal</span>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-750/50">
                  {[
                    { id: 'weightloss', label: 'Emagrecimento' },
                    { id: 'hypertrophy', label: 'Hipertrofia' },
                    { id: 'recomposition', label: 'Recompensar' },
                    { id: 'maintenance', label: 'Manutenção' }
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setLocalGoal(item.id as any)}
                      className={`py-2.5 px-3 rounded-xl text-center text-xs font-bold border-none cursor-pointer transition-all ${
                        localGoal === item.id 
                          ? 'bg-white dark:bg-slate-700 shadow-sm text-purple-600 dark:text-cyan-400 font-black' 
                          : 'text-slate-400 hover:text-slate-505'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Body Fat Option Buttons */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Percentual de Gordura Alvo desejado</span>
                <div className="grid grid-cols-4 gap-1.5">
                  {(localSex === 'male' ? [
                    { id: 'athletic', label: 'Atlético', bf: 11 },
                    { id: 'fitness', label: 'Fitness', bf: 10 },
                    { id: 'healthy', label: 'Saudável', bf: 17.5 },
                    { id: 'custom', label: 'Custom', bf: localTargetBF || 15 }
                  ] : [
                    { id: 'athletic', label: 'Atlético', bf: 17 },
                    { id: 'fitness', label: 'Fitness', bf: 21 },
                    { id: 'healthy', label: 'Saudável', bf: 26 },
                    { id: 'custom', label: 'Custom', bf: localTargetBF || 15 }
                  ]).map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setLocalTargetBFPreset(item.id as any);
                        setLocalTargetBF(item.bf);
                      }}
                      className={`p-2 rounded-xl text-center text-xs font-bold transition-all border-none cursor-pointer ${
                        localTargetBFPreset === item.id 
                          ? 'bg-purple-600 text-white font-extrabold shadow-xs' 
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-500'
                      }`}
                    >
                      <div className="text-[11px] truncate leading-tight font-extrabold">{item.label}</div>
                      <div className="text-[9px] opacity-80 mt-0.5">{item.bf}%</div>
                    </button>
                  ))}
                </div>

                {localTargetBFPreset === 'custom' && (
                  <div className="pt-1">
                    <label className="text-[10px] text-slate-404 block mb-1">Informe seu % de BF Alvo personalizado</label>
                    <input 
                      type="number"
                      value={localTargetBF || ''}
                      onChange={(e) => setLocalTargetBF(Number(e.target.value))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-xs focus:ring-2 focus:ring-purple-500/20 transition-all dark:text-white"
                      placeholder="Ex: 12"
                    />
                  </div>
                )}
              </div>

              {/* Sports nutritionist dynamic calculations display card */}
              {(() => {
                const calculatedBF = currentEstimatedBF;
                const lbm = currentLBM;
                let targetBF = localTargetBF || 15;
                const estArrivalWeight = lbm / (1 - targetBF / 100);

                return (
                  <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-2xl border border-purple-100/50 dark:border-purple-900/30 text-[11px] text-purple-700 dark:text-purple-300 space-y-1">
                    <div className="font-bold flex items-center gap-1 mb-1"><Sparkles size={13} className="text-purple-500" /> Metas Nutricionais Calculadas:</div>
                    <div>Estimativa de sua Massa Magra: <span className="font-bold">{lbm.toFixed(1)} kg</span></div>
                    <div>Seu Peso de Chegada aproximado: <span className="font-bold">{estArrivalWeight.toFixed(1)} kg</span> baseando-se no percentual de gordura de <span className="font-bold">{targetBF}%</span></div>
                  </div>
                );
              })()}
            </div>

            {/* SECTION 4: ROTINA & VELOCIDADE */}
            <div className="pt-6 space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-2">
                <Activity size={16} /> Velocidade da Jornada & Rotina de Treino
              </div>

              {/* Journey Speed presets */}
              <div className="space-y-1 bg-transparent block">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Velocidade Desejada de Evolução</span>
                <div className="grid grid-cols-3 gap-2 p-1 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-755/50">
                  {[
                    { id: 'conservative', label: 'Conservadora' },
                    { id: 'moderate', label: 'Moderada' },
                    { id: 'aggressive', label: 'Agressiva' }
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setLocalJourneySpeed(item.id as any)}
                      className={`py-2.5 px-1.5 rounded-xl text-center text-xs font-bold border-none cursor-pointer transition-all ${
                        localJourneySpeed === item.id 
                          ? 'bg-purple-600 text-white font-extrabold shadow-xs' 
                          : 'text-slate-400 hover:text-slate-500'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Passos Diários Médios */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-404 uppercase tracking-wider block">Passos Diários Médios</span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { value: 3000, label: "Sedentário", desc: "< 4k passos/dia", icon: Coffee, cat: "Pouco ativo" },
                    { value: 5000, label: "Não sei", desc: "est. 5k passos/dia", icon: HelpCircle, cat: "Não sei (estimar em 5.000 passos)" },
                    { value: 6500, label: "Moderado", desc: "4k a 8k passos/dia", icon: Footprints, cat: "Leve atividade" },
                    { value: 10000, label: "Ativo", desc: "8k a 12k passos/dia", icon: Flame, cat: "Ativo" },
                    { value: 14000, label: "Muito ativo", desc: "> 12k passos/dia", icon: Trophy, cat: "Muito ativo" }
                  ].map((item) => {
                    const Icon = item.icon;
                    const isSelected = (localDailySteps || 5000) === item.value;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => {
                          setLocalDailySteps(item.value);
                          setLocalStepsCategory(item.cat);
                        }}
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all text-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? "bg-purple-600 border-purple-600 text-white shadow-xs font-black"
                            : "bg-slate-50 dark:bg-slate-800/60 border-transparent text-slate-500 hover:border-slate-200 dark:hover:border-slate-700"
                        }`}
                      >
                        <Icon size={18} className={isSelected ? "text-white" : "text-purple-650 dark:text-purple-400"} />
                        <div className="font-bold text-[11px] leading-tight">{item.label}</div>
                        <div className="text-[9px] opacity-80">{item.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Categoria de Exercício */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-404 uppercase tracking-wider block">Categoria de Exercício</span>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { id: "force", label: "Força", desc: "Musculação, CrossFit", icon: Dumbbell },
                    { id: "cardio_moderate", label: "Cardio Moderado", desc: "Bicicleta, Tênis", icon: Bike },
                    { id: "cardio_intense", label: "Cardio Intenso", desc: "Corrida, HIIT", icon: Flame },
                    { id: "mixed", label: "Esportes Mistos", desc: "Lutas, Futebol", icon: Activity }
                  ].map((item) => {
                    const Icon = item.icon;
                    const isSelected = localExerciseCategory === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setLocalExerciseCategory(item.id as any);
                        }}
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all text-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? "bg-purple-600 border-purple-600 text-white shadow-xs font-black"
                            : "bg-slate-50 dark:bg-slate-800/60 border-transparent text-slate-500 hover:border-slate-200 dark:hover:border-slate-700"
                        }`}
                      >
                        <Icon size={18} className={isSelected ? "text-white" : "text-purple-650 dark:text-purple-404"} />
                        <div className="font-bold text-[11px] leading-tight">{item.label}</div>
                        <div className="text-[9px] opacity-80">{item.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Workout configuration */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-404 uppercase tracking-wider block">Frequência Semanal</span>
                  <input 
                    type="number"
                    value={localFrequency}
                    onChange={(e) => setLocalFrequency(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-xs focus:ring-2 focus:ring-purple-500/20 transition-all dark:text-white"
                    placeholder="Ex: 3"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-404 uppercase tracking-wider block">Duração (méd. min)</span>
                  <input 
                    type="number"
                    value={localDuration}
                    onChange={(e) => setLocalDuration(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-xs focus:ring-2 focus:ring-purple-500/20 transition-all dark:text-white"
                    placeholder="Ex: 60"
                  />
                </div>
              </div>
            </div>

            {/* ERROR AND GENERATION BUTTON FOR RECALCULATING */}
            <div className="pt-6">
              {errorMsg && (
                <div className="bg-rose-50 dark:bg-rose-950/20 text-rose-850 dark:text-rose-300 border border-rose-100 dark:border-rose-900/40 p-3 rounded-xl text-xs font-bold flex items-center gap-2 mb-1">
                  <span className="shrink-0">⚠️</span>
                  <span>{errorMsg}</span>
                </div>
              )}

              <motion.button
                type="button"
                whileHover={showSavedSuccess ? {} : { scale: 1.02 }}
                whileTap={showSavedSuccess ? {} : { scale: 0.98 }}
                onClick={showSavedSuccess ? undefined : handleSaveTodayMetrics}
                disabled={saving || !localAge || !logWeight || !localHeight}
                className={`w-full font-bold py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 border-none cursor-pointer ${
                  showSavedSuccess
                    ? "bg-emerald-500 hover:bg-emerald-500 text-white cursor-default"
                    : "bg-purple-cyan text-white shadow-purple-500/20 disabled:opacity-50 font-black"
                }`}
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : showSavedSuccess ? (
                  <>Atualizado com Sucesso <Check size={20} className="stroke-[3]" /></>
                ) : (
                  <>Salvar e Reajustar Meu Plano Nutricional <Check size={16} /></>
                )}
              </motion.button>
            </div>

          </div>
        </div>

        {/* Charts & Interactive Visualizations */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
                  <Activity className="text-purple-600" size={18} /> Curva de Peso Diária
                </h3>
                <p className="text-xs text-slate-400">Acompanhamento diário do peso corporal real com tendência de média móvel.</p>
              </div>
            </div>
 
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={processedWeightData}>
                  <defs>
                    <linearGradient id="colorPeso" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9333ea" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#9333ea" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorMedia" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.05}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#1e293b" : "#f1f5f9"} />
                  <XAxis dataKey="date" fontSize={10} axisLine={false} tickLine={false} stroke={isDark ? "#94a3b8" : "#64748b"} />
                  <YAxis fontSize={10} domain={['dataMin - 3', 'dataMax + 3']} axisLine={false} tickLine={false} stroke={isDark ? "#94a3b8" : "#64748b"} />
                  <RechartsTooltip contentStyle={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                  <Legend verticalAlign="top" height={36} iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700 }} />
                  <Area type="monotone" name="Peso Diário (kg)" dataKey="peso" stroke="#9333ea" strokeWidth={3.5} fillOpacity={1} fill="url(#colorPeso)" />
                  <Area type="monotone" name="Média Móvel (d)" dataKey="mediaMovel" stroke="#06b6d4" strokeWidth={1.5} strokeDasharray="4 4" fillOpacity={1} fill="url(#colorMedia)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
              <TrendingUp className="text-cyan-600" size={18} /> Composição de Tecidos (Massa Magra vs. Gordura)
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={processedCompositionData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#1e293b" : "#f1f5f9"} />
                  <XAxis dataKey="date" fontSize={10} axisLine={false} tickLine={false} stroke={isDark ? "#94a3b8" : "#64748b"} />
                  <YAxis fontSize={10} axisLine={false} tickLine={false} stroke={isDark ? "#94a3b8" : "#64748b"} />
                  <RechartsTooltip contentStyle={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', borderRadius: '12px', border: 'none' }} />
                  <Legend verticalAlign="top" height={36} iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700 }} />
                  <Line type="monotone" name="Massa Magra (kg)" dataKey="massaMagra" stroke="#a855f7" strokeWidth={2.5} activeDot={{ r: 8 }} />
                  <Line type="monotone" name="Gordura Corporal (%)" dataKey="gordura" stroke="#f43f5e" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
              <TrendingUp className="text-purple-600" size={18} /> Evolução de Circunferências (Bíceps, Peitoral, Coxas, Quadril e Cintura)
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={processedMeasurementsData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#1e293b" : "#f1f5f9"} />
                  <XAxis dataKey="date" fontSize={10} axisLine={false} tickLine={false} stroke={isDark ? "#94a3b8" : "#64748b"} />
                  <YAxis fontSize={10} axisLine={false} tickLine={false} stroke={isDark ? "#94a3b8" : "#64748b"} />
                  <RechartsTooltip contentStyle={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', borderRadius: '12px', border: 'none' }} />
                  <Legend verticalAlign="top" height={36} iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700 }} />
                  <Line type="monotone" name="Bíceps (cm)" dataKey="biceps" stroke="#10b981" strokeWidth={2.5} activeDot={{ r: 8 }} />
                  <Line type="monotone" name="Peitoral (cm)" dataKey="peitoral" stroke="#3b82f6" strokeWidth={2} />
                  <Line type="monotone" name="Coxas (cm)" dataKey="coxas" stroke="#f59e0b" strokeWidth={2} />
                  <Line type="monotone" name="Quadril (cm)" dataKey="hip" stroke="#ec4899" strokeWidth={2} />
                  <Line type="monotone" name="Cintura (cm)" dataKey="waist" stroke="#6366f1" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Historically recorded items section */}
      <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
        <h3 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
          <Calendar className="text-purple-600" size={18} /> Histórico de Registros Corporais
        </h3>

        {weightHistory.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-400">Nenhum registro histórico de peso encontrado. Salve acima para iniciar seu registro.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Peso</th>
                  <th className="py-3 px-4">Circunferências</th>
                  <th className="py-3 px-4">% Gordura Est.</th>
                  <th className="py-3 px-4">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40 text-xs dark:text-slate-350">
                {[...weightHistory]
                  .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((entry, idx) => {
                    const matchedMeasure = measurementHistory.find(m => m.date === entry.date);
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                        <td className="py-3 px-4 font-mono font-medium">{entry.date}</td>
                        <td className="py-3 px-4 font-bold">{entry.weight} kg</td>
                        <td className="py-3 px-4 text-slate-400">
                          {matchedMeasure ? `Cintura: ${matchedMeasure.waist || '--'}cm | Pescoço: ${matchedMeasure.neck || '--'}cm | Quadril: ${matchedMeasure.hip || '--'}cm | Bíceps: ${matchedMeasure.biceps || '--'}cm | Peitoral: ${matchedMeasure.peitoral || '--'}cm | Coxas: ${matchedMeasure.coxas || '--'}cm` : 'Sem circunferências'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-cyan-500">
                            {matchedMeasure?.bodyFat || calculateNavyBodyFat(userData.sex, userData.height, matchedMeasure?.waist || 85, matchedMeasure?.neck || 38, matchedMeasure?.hip || 95)}%
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <button 
                            onClick={() => handleRemoveWeightLog(entry.date)}
                            className="p-1 px-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 text-rose-600 rounded-lg transition-all"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};
