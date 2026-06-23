import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Activity, 
  User, 
  Target, 
  ChevronRight, 
  Utensils, 
  PieChart as PieChartIcon, 
  Scale, 
  Zap,
  RotateCcw,
  CheckCircle2,
  Info,
  Sun,
  Moon,
  RefreshCw,
  Printer,
  Download,
  Dumbbell,
  ArrowLeft,
  Sliders,
  Sparkles,
  Coffee,
  HelpCircle,
  Footprints,
  Flame,
  Trophy,
  Bike
} from "lucide-react";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend 
} from "recharts";
import { domToPng } from "modern-screenshot";
import { UserData, DietPlan, Food, Meal, Profile } from "./types";
import { generateDiet, FALLBACK_FOODS, getApiUrl, EXERCISES, formatFoodName, getLocalDateString, calculateNavyBodyFat } from "./utils";
import { auth, db, isFirebaseConfigured } from "./lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { Auth } from "./components/Auth";
import { Dashboard } from "./components/Dashboard";

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

const COLORS = ["#9333ea", "#06b6d4", "#f59e0b"];
const DAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

export default function App() {
  const [step, setStep] = useState(1);
  const [onboardingSubStep, setOnboardingSubStep] = useState(1);
  const [darkMode, setDarkMode] = useState(false);
  const [activeDay, setActiveDay] = useState("Segunda");
  const [session, setSession] = useState<any>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [userData, setUserData] = useState<UserData>({
    sex: "male",
    age: 30,
    weight: 80,
    height: 180,
    activityLevel: "moderate",
    goal: "hypertrophy",
    exerciseCategory: "force",
    exerciseType: "Musculação",
    frequency: 4,
    duration: 60,
    waist: 85,
    neck: 38,
    hip: 95,
    biceps: 35,
    peitoral: 100,
    coxas: 55,
    knowsBodyFat: false,
    customBodyFat: 15,
    targetBodyFatPreset: "fitness",
    journeySpeed: "moderate",
    dailySteps: 5000,
    stepsCategory: "Não sei (estimar em 5.000 passos)"
  });


  const [exerciseSearch, setExerciseSearch] = useState("");
  const [showExerciseDropdown, setShowExerciseDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowExerciseDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const [foods, setFoods] = useState<Food[]>([]);
  const [dietPlan, setDietPlan] = useState<DietPlan | null>(null);
  const lastSyncedDietPlanRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'ranking' | 'profile' | 'weekly' | 'recipes' | 'store' | 'admin' | 'evolution' | 'workout_dashboard' | 'workout_ficha' | 'workout_today' | 'workout_history'>('dashboard');
  const [appMode, setAppMode] = useState<'diet' | 'workout'>('diet');
  const printRef = useRef<HTMLDivElement>(null);

  const fetchProfile = async (user: any) => {
    setLoadingProfile(true);
    if (!isFirebaseConfigured) {
      const todayStr = getLocalDateString();
      const mockProfile: Profile = {
        id: user.uid || 'demo-uid',
        username: user.displayName || 'Usuário Demo',
        xp: 150,
        league: 'Bronze',
        streak: 3,
        avatar_url: 'https://i.pravatar.cc/150?u=demo',
        last_activity_date: todayStr,
        streak_freeze_active: false,
        premium_access_until: null
      };
      setProfile(mockProfile);
      setLoadingProfile(false);
      return;
    }
    try {
      const docRef = doc(db, 'profiles', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as Profile & { diet_plan?: DietPlan };
        
        let hasEmailUpdated = false;
        if (!data.email && user.email) {
          data.email = user.email;
          hasEmailUpdated = true;
        }

        // --- Process Streak with Streak Freeze & Daily Rewards ---
        const todayStr = getLocalDateString();
        let currentStreak = data.streak || 0;
        let finalCoins = data.xp || 0;
        
        // Properly load user's actual streak freeze and premium state
        let freezeActive = data.streak_freeze_active || false;
        let freezeActiveStateAfter = freezeActive;
        const lastActivity = data.last_activity_date || '';
        let showFreezeToast = false;
        let awardedStreakNC = 0;

        if (lastActivity && lastActivity !== todayStr) {
          const lastDate = new Date(lastActivity + 'T12:00:00'); // Ensure middle of day parsing to avoid TZ skews
          const todayDate = new Date(todayStr + 'T12:00:00');
          lastDate.setHours(0, 0, 0, 0);
          todayDate.setHours(0, 0, 0, 0);
          const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime());
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays === 1) {
            // Consecutive day logged in!
            currentStreak += 1;
            awardedStreakNC = currentStreak * 10;
            finalCoins += awardedStreakNC;
          } else if (diffDays > 1) {
            // Missed one or more days!
            if (freezeActive) {
              freezeActiveStateAfter = false; // consume streak freeze
              showFreezeToast = true;
              // Keep streak intact instead of resetting!
            } else {
              currentStreak = 1; // reset streak back to 1
            }
          }
        } else if (!lastActivity) {
          currentStreak = 1;
        }

        const updatedFields: Partial<Profile> & { email?: string } = {
          streak: currentStreak,
          last_activity_date: todayStr,
          streak_freeze_active: freezeActiveStateAfter,
          premium_access_until: data.premium_access_until || null,
          xp: finalCoins
        };
        if (hasEmailUpdated && user.email) {
          updatedFields.email = user.email;
        }

        const updatedProfile = {
          ...data,
          ...updatedFields
        };

        const updateNeeded = 
          data.streak !== currentStreak || 
          data.last_activity_date !== todayStr || 
          data.streak_freeze_active !== freezeActiveStateAfter || 
          (data.premium_access_until || null) !== (updatedFields.premium_access_until || null) || 
          data.xp !== finalCoins || 
          hasEmailUpdated;

        if (updateNeeded) {
          try {
            await updateDoc(docRef, updatedFields);
          } catch (updateErr) {
            console.warn("Failed to update profile to Firebase (offline), saving locally:", updateErr);
          }
        }

        localStorage.setItem(`profile_${user.uid}`, JSON.stringify(updatedProfile));
        setProfile(updatedProfile);

        if (showFreezeToast) {
          setTimeout(() => {
            alert("❄️ Seu Bloqueio de Sequência foi consumido e evitou que seu streak fosse zerado!");
          }, 800);
        } else if (awardedStreakNC > 0) {
          setTimeout(() => {
            alert(`🔥 Sequência de ${currentStreak} dias mantida! Você ganhou +${awardedStreakNC} NutriCoins! 🪙`);
          }, 800);
        }

        if (data.diet_plan) {
          lastSyncedDietPlanRef.current = JSON.stringify(data.diet_plan);
          setDietPlan(data.diet_plan);
        }
        if (data.user_data) {
          setUserData(data.user_data);
        }
      } else {
        const todayStr = getLocalDateString();
        const newProfile: Profile = {
          id: user.uid,
          username: user.displayName || user.email?.split('@')[0] || 'Novo Usuário',
          xp: 150,
          league: 'Bronze',
          streak: 1,
          avatar_url: user.photoURL || `https://i.pravatar.cc/150?u=${user.uid}`,
          last_activity_date: todayStr,
          streak_freeze_active: false,
          premium_access_until: null
        };
        try {
          await setDoc(docRef, newProfile);
        } catch (setErr) {
          console.warn("Failed to create profile on Firebase (offline), saving locally:", setErr);
        }
        localStorage.setItem(`profile_${user.uid}`, JSON.stringify(newProfile));
        setProfile(newProfile);
      }
    } catch (err: any) {
      const isOfflinePref = err instanceof Error && (err.message.toLowerCase().includes('offline') || err.message.toLowerCase().includes('unavailable') || !navigator.onLine);
      if (isOfflinePref) {
        console.warn('Firebase backend not reachable (offline/unavailable), utilizing local storage cache.');
      } else {
        console.error('Error fetching profile from Firebase, trying local storage:', err);
      }
      const cached = localStorage.getItem(`profile_${user.uid}`);
      if (cached) {
        try {
          const cachedProfile = JSON.parse(cached);
          setProfile(cachedProfile);
          if (cachedProfile.diet_plan) {
            lastSyncedDietPlanRef.current = JSON.stringify(cachedProfile.diet_plan);
            setDietPlan(cachedProfile.diet_plan);
          }
          if (cachedProfile.user_data) {
            setUserData(cachedProfile.user_data);
          }
          console.log('Successfully loaded profile from local storage cache.');
        } catch (parseErr) {
          console.error('Error parsing cached profile:', parseErr);
        }
      } else {
        // Build a fresh offline fallback profile
        const todayStr = getLocalDateString();
        const fallbackProfile: Profile = {
          id: user.uid,
          username: user.displayName || user.email?.split('@')[0] || 'Atleta',
          xp: 150,
          league: 'Bronze',
          streak: 1,
          avatar_url: user.photoURL || `https://i.pravatar.cc/150?u=${user.uid}`,
          last_activity_date: todayStr,
          streak_freeze_active: false,
          premium_access_until: null
        };
        localStorage.setItem(`profile_${user.uid}`, JSON.stringify(fallbackProfile));
        setProfile(fallbackProfile);
      }
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchProfile(session.user);
      setStep(4);
      setActiveTab('dashboard');
    } else {
      setProfile(null);
    }
  }, [session]);

  useEffect(() => {
    if (session?.user && dietPlan && isFirebaseConfigured) {
      const planStr = JSON.stringify(dietPlan);
      if (lastSyncedDietPlanRef.current === planStr) {
        return;
      }
      const syncDietPlan = async () => {
        try {
          const docRef = doc(db, 'profiles', session.user.uid);
          await updateDoc(docRef, { diet_plan: dietPlan });
          lastSyncedDietPlanRef.current = planStr;
        } catch (err) {
          console.error("Error syncing diet plan:", err);
        }
      };
      syncDietPlan();
    }
  }, [session, dietPlan]);

  useEffect(() => {
    const fetchFoods = async () => {
      try {
        const res = await fetch(getApiUrl("/api/foods"));
        if (!res.ok) throw new Error("Failed to fetch foods");
        const data = await res.json();
        if (data && data.length > 5) {
          setFoods(data);
        } else {
          console.warn("Database returned empty or minimal foods, using static fallback.");
          setFoods(FALLBACK_FOODS);
        }
      } catch (err) {
        console.error("Error fetching foods, using static fallback:", err);
        setFoods(FALLBACK_FOODS);
      }
    };

    fetchFoods();
  }, []);

  useEffect(() => {
    if (isFirebaseConfigured) {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
          setSession({ user: firebaseUser });
        } else {
          setSession(null);
        }
      });
      return () => unsubscribe();
    }
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleGenerate = async () => {
    setLoading(true);
    const activeFoodsList = (foods && foods.length > 5) ? foods : FALLBACK_FOODS;
    const plan = generateDiet(userData, activeFoodsList, profile?.custom_meals);
    
    if (session?.user) {
      const docRef = doc(db, 'profiles', session.user.uid);
      const updatedFields = {
        diet_plan: plan
      };
      
      try {
        if (isFirebaseConfigured) {
          await updateDoc(docRef, updatedFields);
        }
        
        lastSyncedDietPlanRef.current = JSON.stringify(plan);
        setDietPlan(plan);
        setProfile(prev => prev ? { ...prev, ...updatedFields } : null);
        const cached = localStorage.getItem(`profile_${session.user.uid}`);
        if (cached) {
          const cachedProfile = JSON.parse(cached);
          localStorage.setItem(`profile_${session.user.uid}`, JSON.stringify({ ...cachedProfile, ...updatedFields }));
        }
      } catch (err) {
        console.error("Failed to update regenerated diet online, saving locally:", err);
        lastSyncedDietPlanRef.current = JSON.stringify(plan);
        setDietPlan(plan);
      }
    } else {
      setDietPlan(plan);
      setStep(3);
    }
    setLoading(false);
  };

  const handleUpdateBiometrics = async (newUserData: UserData) => {
    setLoadingProfile(true);
    setUserData(newUserData);
    
    const activeFoodsList = (foods && foods.length > 5) ? foods : FALLBACK_FOODS;
    const plan = generateDiet(newUserData, activeFoodsList, profile?.custom_meals);
    lastSyncedDietPlanRef.current = JSON.stringify(plan);
    setDietPlan(plan);

    if (session?.user) {
      const docRef = doc(db, 'profiles', session.user.uid);
      const updatedFields = {
        user_data: newUserData,
        diet_plan: plan
      };
      
      try {
        if (isFirebaseConfigured) {
          await updateDoc(docRef, updatedFields);
        }
        
        setProfile(prev => prev ? { ...prev, ...updatedFields } : null);
        const cached = localStorage.getItem(`profile_${session.user.uid}`);
        if (cached) {
          const cachedProfile = JSON.parse(cached);
          localStorage.setItem(`profile_${session.user.uid}`, JSON.stringify({ ...cachedProfile, ...updatedFields }));
        }
      } catch (err) {
        console.error("Failed to update biometrics online, saving locally:", err);
      }
    } else {
      setProfile(prev => prev ? { ...prev, user_data: newUserData, diet_plan: plan } : null);
    }
    
    setLoadingProfile(false);
  };

  const handleSaveCustomMeals = async (newMeals: any[]) => {
    const activeFoodsList = (foods && foods.length > 5) ? foods : FALLBACK_FOODS;
    const plan = generateDiet(userData, activeFoodsList, newMeals);
    
    lastSyncedDietPlanRef.current = JSON.stringify(plan);
    setDietPlan(plan);
    setProfile(prev => prev ? { ...prev, custom_meals: newMeals, diet_plan: plan } : null);

    if (session?.user) {
      const cached = localStorage.getItem(`profile_${session.user.uid}`);
      if (cached) {
        try {
          const cachedProfile = JSON.parse(cached);
          localStorage.setItem(`profile_${session.user.uid}`, JSON.stringify({
            ...cachedProfile,
            custom_meals: newMeals,
            diet_plan: plan
          }));
        } catch (err) {
          console.error("Error caching updated profile:", err);
        }
      }
    }

    if (isFirebaseConfigured && session?.user) {
      try {
        const profileRef = doc(db, 'profiles', session.user.uid);
        await updateDoc(profileRef, { 
          custom_meals: newMeals,
          diet_plan: plan
        });
      } catch (err) {
        console.error('Error saving custom meals and diet plan online:', err);
      }
    }
  };

  const regenerateFood = (day: string, mealIdx: number, foodIdx: number) => {
    if (!dietPlan) return;
    
    const currentFood = dietPlan.weeklyPlan[day][mealIdx].foods[foodIdx].food;
    const activeFoodsList = (foods && foods.length > 5) ? foods : FALLBACK_FOODS;
    const categoryFoods = activeFoodsList.filter(f => f.category === currentFood.category && f.id !== currentFood.id);
    
    if (categoryFoods.length === 0) return;
    
    const newFood = categoryFoods[Math.floor(Math.random() * categoryFoods.length)];
    
    const newPlan = { ...dietPlan };
    newPlan.weeklyPlan[day][mealIdx].foods[foodIdx].food = newFood;
    
    // Recalculate meal totals
    const meal = newPlan.weeklyPlan[day][mealIdx];
    meal.totalCalories = meal.foods.reduce((sum, f) => sum + (f.food.calories * f.amount / 100), 0);
    meal.totalProtein = meal.foods.reduce((sum, f) => sum + (f.food.protein * f.amount / 100), 0);
    meal.totalCarbs = meal.foods.reduce((sum, f) => sum + (f.food.carbs * f.amount / 100), 0);
    meal.totalFat = meal.foods.reduce((sum, f) => sum + (f.food.fat * f.amount / 100), 0);
    
    setDietPlan(newPlan);
  };

  const handlePrint = async () => {
    if (!printRef.current) return;
    
    try {
      // Force light theme for export
      const isDark = document.documentElement.classList.contains('dark');
      if (isDark) document.documentElement.classList.remove('dark');
      
      const dataUrl = await domToPng(printRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
      });
      
      // Restore theme
      if (isDark) document.documentElement.classList.add('dark');
      
      const link = document.createElement('a');
      link.download = `SportNutri-Plano-Semanal.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Erro ao gerar imagem:", error);
      window.print();
    }
  };

  const formatMeasure = (amountGrams: number, food: Food) => {
    if (!food.grams_per_unit || food.grams_per_unit === 0) return `${amountGrams}g`;
    const units = amountGrams / food.grams_per_unit;
    const roundedUnits = Math.round(units * 2) / 2; // Round to nearest 0.5
    
    if (roundedUnits === 0) return `${amountGrams}g`;
    
    const unitStr = roundedUnits === 1 ? food.measure_unit : `${food.measure_unit}s`;
    // Handle specific pluralization if needed, but simple 's' works for most PT-BR measures in this context
    return `${roundedUnits} ${food.measure_unit}${roundedUnits > 1 ? 's' : ''}`;
  };

  const macroData = dietPlan ? [
    { name: "Proteína", value: dietPlan.macros.protein * 4 },
    { name: "Carboidrato", value: dietPlan.macros.carbs * 4 },
    { name: "Gordura", value: dietPlan.macros.fat * 9 },
  ] : [];

  const currentDayMeals = dietPlan?.weeklyPlan[activeDay] || [];
  const mealData = currentDayMeals.map(m => ({
    name: m.name,
    Proteínas: Math.round(m.totalProtein),
    Carboidratos: Math.round(m.totalCarbs),
    Gorduras: Math.round(m.totalFat)
  }));

  const MealMacroTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const protein = payload.find((p: any) => p.name === 'Proteínas')?.value || 0;
      const carbs = payload.find((p: any) => p.name === 'Carboidratos')?.value || 0;
      const fat = payload.find((p: any) => p.name === 'Gorduras')?.value || 0;
      const totalCals = Math.round(protein * 4 + carbs * 4 + fat * 9);
      
      return (
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs text-slate-800 dark:text-white shadow-2xl space-y-2">
          <p className="font-extrabold text-slate-500 dark:text-slate-300 uppercase tracking-widest text-[10px]">
            {payload[0].payload.name}
          </p>
          <div className="space-y-1.5 font-bold">
            <div className="flex items-center justify-between gap-6 text-purple-600 dark:text-purple-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500" /> Proteínas:
              </span>
              <span>{protein}g</span>
            </div>
            <div className="flex items-center justify-between gap-6 text-cyan-600 dark:text-cyan-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-500" /> Carboidratos:
              </span>
              <span>{carbs}g</span>
            </div>
            <div className="flex items-center justify-between gap-6 text-amber-600 dark:text-amber-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Gorduras:
              </span>
              <span>{fat}g</span>
            </div>
          </div>
          <div className="border-t border-slate-100 dark:border-slate-800 pt-2 mt-1.5 flex items-center justify-between text-cyan-600 dark:text-cyan-400 font-extrabold uppercase tracking-wide">
            <span>Calorias Totais:</span>
            <span>{totalCals} kcal</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-purple-100 transition-colors duration-300">
      {/* Header */}
      <header className="border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <button 
            type="button"
            onClick={() => {
              if (dietPlan) {
                if (session) {
                  setStep(4);
                } else {
                  setStep(3);
                }
              } else {
                setStep(1);
              }
            }}
            className="flex items-center gap-2 cursor-pointer hover:opacity-90 active:scale-95 transition-all text-left focus:outline-none"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-cyan-500 rounded-lg flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
              <Zap size={20} fill="currentColor" />
            </div>
            <span className="font-bold text-xl tracking-tight">SportNutri <span className="text-cyan-500">AI</span></span>
          </button>
          
          <div className="flex items-center gap-4">
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-purple-500 transition-all"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </motion.button>
            
            {!session ? (
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowAuth(true)}
                className="bg-purple-cyan text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-purple-500/20"
              >
                Entrar
              </motion.button>
            ) : (
              <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setAppMode('diet');
                    setStep(4);
                    if (activeTab.startsWith('workout_')) {
                      setActiveTab('dashboard');
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    step === 4 && appMode === 'diet'
                      ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
                      : "text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400"
                  }`}
                >
                  <Utensils size={15} />
                  <span>Refeições</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setAppMode('workout');
                    setStep(4);
                    if (!activeTab.startsWith('workout_') && activeTab !== 'profile' && activeTab !== 'admin' && activeTab !== 'store' && activeTab !== 'evolution') {
                      setActiveTab('workout_dashboard');
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    step === 4 && appMode === 'workout'
                      ? "bg-cyan-500 text-white shadow-md shadow-cyan-500/20"
                      : "text-slate-600 dark:text-slate-300 hover:text-cyan-500 dark:hover:text-cyan-400"
                  }`}
                >
                  <Dumbbell size={15} />
                  <span>Treino</span>
                </motion.button>
              </div>
            )}

            {dietPlan && step !== 4 && (
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setStep(1)}
                className="text-sm font-medium text-slate-500 hover:text-purple-600 flex items-center gap-1 transition-colors"
              >
                <RotateCcw size={14} />
                <span className="hidden sm:inline">Recomeçar</span>
              </motion.button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12">
        <AnimatePresence mode="wait">
          {showAuth && !session && (
            <motion.div
              key="auth"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-sm"
            >
              <div className="w-full max-w-md">
                <Auth 
                  onClose={() => setShowAuth(false)}
                  onSuccess={() => {
                    if (!isFirebaseConfigured) {
                      setSession({
                        user: {
                          uid: 'demo-user',
                          email: 'demo@example.com',
                          displayName: 'Usuário Demo'
                        }
                      });
                    }
                    setShowAuth(false);
                  }} 
                />
              </div>
            </motion.div>
          )}

          {step === 4 && session ? (
            <Dashboard 
              user={session.user} 
              dietPlan={dietPlan}
              profile={profile}
              setProfile={setProfile}
              loadingProfile={loadingProfile}
              onLogout={() => {
                auth.signOut();
                setDietPlan(null);
                lastSyncedDietPlanRef.current = null;
                setStep(1);
              }} 
              setStep={setStep}
              onRegenerate={handleGenerate}
              onRegenerateFood={regenerateFood}
              formatMeasure={formatMeasure}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              userData={userData}
              onUpdateBiometrics={handleUpdateBiometrics}
              onSaveCustomMeals={handleSaveCustomMeals}
              onPrint={handlePrint}
              appMode={appMode}
              setAppMode={setAppMode}
            />
          ) : step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="text-center space-y-4">
                <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  A dieta <span className="text-gradient">Inteligente</span>, <br />
                  <span className="italic font-light">sob medida para você.</span>
                </h1>
                <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-sm">
                  Utilizamos equações de nutrição esportiva de elite para calcular exatamente o que seu corpo precisa.
                </p>
              </div>

              <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl shadow-purple-500/5 border border-slate-100 dark:border-slate-800 space-y-8 divide-y divide-slate-100 dark:divide-slate-800">
                
                {/* SECTION 1: BASIC BIOMETRICS */}
                <div className="space-y-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-2">
                    <User size={16} /> Perfil Físico Básico
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs text-slate-500">Sexo Biológico</span>
                    <div className="flex p-1 bg-slate-50 dark:bg-slate-800 rounded-xl">
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={() => setUserData({...userData, sex: 'male'})}
                        className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${userData.sex === 'male' ? 'bg-white dark:bg-slate-700 shadow-sm text-purple-600 dark:text-cyan-400' : 'text-slate-400'}`}
                      >
                        Masculino
                      </motion.button>
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={() => setUserData({...userData, sex: 'female'})}
                        className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${userData.sex === 'female' ? 'bg-white dark:bg-slate-700 shadow-sm text-purple-600 dark:text-cyan-400' : 'text-slate-400'}`}
                      >
                        Feminino
                      </motion.button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <span className="text-xs text-slate-500">Idade</span>
                      <input 
                        type="text" 
                        inputMode="numeric"
                        value={userData.age || ''}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setUserData({...userData, age: val === '' ? 0 : Number(val)});
                        }}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500/20 transition-all dark:text-white"
                        placeholder="Anos"
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs text-slate-500">Peso (kg)</span>
                      <input 
                        type="text" 
                        inputMode="decimal"
                        value={userData.weight || ''}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9.]/g, '');
                          setUserData({...userData, weight: val === '' ? 0 : Number(val)});
                        }}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500/20 transition-all dark:text-white"
                        placeholder="kg"
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs text-slate-500">Altura (cm)</span>
                      <input 
                        type="text" 
                        inputMode="numeric"
                        value={userData.height || ''}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setUserData({...userData, height: val === '' ? 0 : Number(val)});
                        }}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500/20 transition-all dark:text-white"
                        placeholder="cm"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 2: BODY COMPOSITION */}
                <div className="pt-6 space-y-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-2">
                    <Sliders size={16} /> Composição Corporal
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-xs text-slate-600 dark:text-slate-300">Conhece seu percentual de gordura corporal?</span>
                    <button 
                      type="button"
                      onClick={() => setUserData({...userData, knowsBodyFat: !userData.knowsBodyFat})}
                      className={`text-xs px-3 py-1 rounded-full font-bold transition-all ${userData.knowsBodyFat ? 'bg-purple-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
                    >
                      {userData.knowsBodyFat ? 'SIM' : 'NÃO'}
                    </button>
                  </div>

                  {userData.knowsBodyFat ? (
                    <div className="space-y-1">
                      <label className="block text-xs text-slate-500 mb-1">Informe seu % de Gordura Corporal atual</label>
                      <div className="relative">
                        <input 
                          type="number" 
                          value={userData.customBodyFat || ''}
                          onChange={(e) => setUserData({...userData, customBodyFat: Number(e.target.value)})}
                          className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500/20 transition-all dark:text-white"
                          placeholder="Ex: 14.5"
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
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                          Selecione o modelo corporal mais próximo ao seu atual para refinar seu cálculo:
                        </p>
                        
                        <div className="grid grid-cols-3 gap-3">
                          {(() => {
                            const options = userData.sex === 'male' ? [
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
                              const isSelected = userData.visualBodyFat === opt.val;
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setUserData({...userData, visualBodyFat: opt.val})}
                                  className={`p-2 rounded-2xl border text-center transition-all ${
                                    isSelected 
                                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                                      : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-500 hover:border-slate-200 dark:hover:border-slate-700'
                                  }`}
                                >
                                  <SilhouetteSVG sex={userData.sex} index={idx} active={isSelected} />
                                  <div className="text-[11px] font-bold mt-1.5">{opt.range}</div>
                                </button>
                              );
                            });
                          })()}
                        </div>
                      </div>

                      <div className="space-y-3 pt-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <Activity size={14} className="text-purple-500" /> 2. Medidas de Circunferência (Fórmula da Marinha)
                        </label>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <span className="text-[11px] text-slate-400 dark:text-slate-500">Circunferência Cintura (cm)</span>
                            <input 
                              type="number" 
                              value={userData.waist || ''}
                              onChange={(e) => setUserData({...userData, waist: Number(e.target.value)})}
                              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500/20 transition-all dark:text-white"
                              placeholder="Cintura"
                            />
                          </div>
                          <div className="space-y-1">
                            <span className="text-[11px] text-slate-400 dark:text-slate-500">Circunferência Pescoço (cm)</span>
                            <input 
                              type="number" 
                              value={userData.neck || ''}
                              onChange={(e) => setUserData({...userData, neck: Number(e.target.value)})}
                              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500/20 transition-all dark:text-white"
                              placeholder="Pescoço"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <span className="text-[11px] text-slate-400 dark:text-slate-500">Circunferência Quadril (cm)</span>
                            <input 
                              type="number" 
                              value={userData.hip || ''}
                              onChange={(e) => setUserData({...userData, hip: Number(e.target.value)})}
                              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500/20 transition-all dark:text-white"
                              placeholder="Quadril"
                            />
                          </div>
                          <div className="space-y-1">
                            <span className="text-[11px] text-slate-400 dark:text-slate-500">Circunferência Bíceps (cm)</span>
                            <input 
                              type="number" 
                              value={userData.biceps || ''}
                              onChange={(e) => setUserData({...userData, biceps: Number(e.target.value)})}
                              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500/20 transition-all dark:text-white"
                              placeholder="Bíceps"
                            />
                          </div>
                          <div className="space-y-1">
                            <span className="text-[11px] text-slate-400 dark:text-slate-500">Circunferência Peitoral (cm)</span>
                            <input 
                              type="number" 
                              value={userData.peitoral || ''}
                              onChange={(e) => setUserData({...userData, peitoral: Number(e.target.value)})}
                              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500/20 transition-all dark:text-white"
                              placeholder="Peitoral"
                            />
                          </div>
                          <div className="space-y-1">
                            <span className="text-[11px] text-slate-400 dark:text-slate-500">Circunferência Coxas (cm)</span>
                            <input 
                              type="number" 
                              value={userData.coxas || ''}
                              onChange={(e) => setUserData({...userData, coxas: Number(e.target.value)})}
                              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500/20 transition-all dark:text-white"
                              placeholder="Coxas"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Live Dynamic estimated result readout */}
                      {(() => {
                        const navyBF = calculateNavyBodyFat(userData.sex, userData.height, userData.waist || 85, userData.neck || 38, userData.hip || 95);
                        const visualBF = userData.visualBodyFat;
                        let finalBF = navyBF;
                        if (visualBF) {
                          finalBF = Number(((navyBF + visualBF) / 2).toFixed(1));
                        }
                        return (
                          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex justify-between items-center text-xs text-slate-500 border border-slate-100 dark:border-slate-800">
                            <div>Estimativa de Gordura Corporal:</div>
                            <div className="font-bold text-emerald-500 text-sm">
                              {finalBF}%
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* SECTION 3: GOALS & TARGETS */}
                <div className="pt-6 space-y-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-2">
                    <Target size={16} /> Objetivos e Alvos Físicos
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs text-slate-500">Seu Objetivo Principal</span>
                    <div className="grid grid-cols-2 gap-2 p-1 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                      <button
                        type="button"
                        onClick={() => setUserData({...userData, goal: 'weightloss'})}
                        className={`py-2 px-3 text-xs font-bold rounded-xl transition-all ${userData.goal === 'weightloss' ? 'bg-white dark:bg-slate-700 shadow-sm text-purple-600 dark:text-white' : 'text-slate-400'}`}
                      >
                        Emagrecimento
                      </button>
                      <button
                        type="button"
                        onClick={() => setUserData({...userData, goal: 'hypertrophy'})}
                        className={`py-2 px-3 text-xs font-bold rounded-xl transition-all ${userData.goal === 'hypertrophy' ? 'bg-white dark:bg-slate-700 shadow-sm text-purple-600 dark:text-white' : 'text-slate-400'}`}
                      >
                        Hipertrofia
                      </button>
                      <button
                        type="button"
                        onClick={() => setUserData({...userData, goal: 'recomposition'})}
                        className={`py-2 px-3 text-xs font-bold rounded-xl transition-all ${userData.goal === 'recomposition' ? 'bg-white dark:bg-slate-700 shadow-sm text-purple-600 dark:text-white' : 'text-slate-400'}`}
                      >
                        Recompensar
                      </button>
                      <button
                        type="button"
                        onClick={() => setUserData({...userData, goal: 'maintenance'})}
                        className={`py-2 px-3 text-xs font-bold rounded-xl transition-all ${userData.goal === 'maintenance' ? 'bg-white dark:bg-slate-700 shadow-sm text-purple-600 dark:text-white' : 'text-slate-400'}`}
                      >
                        Manutenção
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs text-slate-500">Percentual de Gordura Alvo desejado</span>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: 'athletic', label: 'Atlético', bf: userData.sex === 'male' ? 11 : 17 },
                        { id: 'fitness', label: 'Fitness', bf: userData.sex === 'male' ? 10 : 21 },
                        { id: 'healthy', label: 'Saudável', bf: userData.sex === 'male' ? 17.5 : 26 },
                        { id: 'custom', label: 'Custom', bf: userData.targetBodyFat || 15 }
                      ].map(item => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setUserData({
                              ...userData,
                              targetBodyFatPreset: item.id as any,
                              targetBodyFat: item.bf
                            });
                          }}
                          className={`p-2.5 rounded-xl text-center text-xs font-bold border transition-all ${
                            userData.targetBodyFatPreset === item.id 
                              ? 'bg-purple-600 border-purple-600 text-white' 
                              : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-500'
                          }`}
                        >
                          <div>{item.label}</div>
                          <div className="text-[10px] opacity-75">{item.bf}%</div>
                        </button>
                      ))}
                    </div>

                    {userData.targetBodyFatPreset === 'custom' && (
                      <div className="pt-2">
                        <label className="text-[10px] text-slate-400 block mb-1">Informe seu BF Alvo personalizado (%)</label>
                        <input 
                          type="number"
                          value={userData.targetBodyFat || ''}
                          onChange={(e) => setUserData({...userData, targetBodyFat: Number(e.target.value)})}
                          className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500/20 transition-all dark:text-white"
                          placeholder="Ex: 12"
                        />
                      </div>
                    )}
                  </div>

                  {/* Sports nutritionist dynamic preview display */}
                  {(() => {
                    const calculatedBF = (() => {
                      if (userData.knowsBodyFat) return userData.customBodyFat || 15;
                      const navy = calculateNavyBodyFat(userData.sex, userData.height, userData.waist || 85, userData.neck || 38, userData.hip || 95);
                      const visual = userData.visualBodyFat;
                      if (visual) {
                        return Number(((navy + visual) / 2).toFixed(1));
                      }
                      return navy;
                    })();
                    const lbm = userData.weight * (1 - calculatedBF / 100);
                    let targetBF = userData.targetBodyFat || 15;
                    if (!userData.targetBodyFat) {
                      if (userData.sex === 'male') {
                        targetBF = userData.targetBodyFatPreset === 'athletic' ? 11 : (userData.targetBodyFatPreset === 'fitness' ? 10 : 17.5);
                      } else {
                        targetBF = userData.targetBodyFatPreset === 'athletic' ? 17 : (userData.targetBodyFatPreset === 'fitness' ? 21 : 26);
                      }
                    }
                    const estArrivalWeight = lbm / (1 - targetBF / 100);

                    return (
                      <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-2xl border border-purple-100/50 dark:border-purple-900/30 text-xs text-purple-700 dark:text-purple-300 space-y-1">
                        <div className="font-bold flex items-center gap-1"><Sparkles size={14} /> Metas Nutricionais Calculadas:</div>
                        <div>Estimativa de sua Massa Magra: {lbm.toFixed(1)} kg</div>
                        <div>Seu Peso de Chegada aproximado: {estArrivalWeight.toFixed(1)} kg baseando-se no percentual de gordura de {targetBF}%</div>
                      </div>
                    );
                  })()}
                </div>

                {/* SECTION 4: VELOCIDADE & ROTINA */}
                <div className="pt-6 space-y-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-2">
                    <Activity size={16} /> Velocidade da Jornada & Rotina de Treino
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs text-slate-500 block mb-1">Velocidade Desejada de Evolução</span>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'conservative', label: 'Conservadora' },
                        { id: 'moderate', label: 'Moderada' },
                        { id: 'aggressive', label: 'Agressiva' }
                      ].map(item => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setUserData({...userData, journeySpeed: item.id as any})}
                          className={`p-2.5 rounded-xl text-center text-xs font-bold border transition-all ${
                            userData.journeySpeed === item.id 
                              ? 'bg-purple-600 border-purple-600 text-white' 
                              : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-500'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Passos Diários Médios */}
                  <div className="space-y-1.5">
                    <span className="text-xs text-slate-500 block">Passos Diários Médios</span>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {[
                        { value: 3000, label: "Sedentário", desc: "< 4k passos/dia", icon: Coffee, cat: "Pouco ativo" },
                        { value: 5000, label: "Não sei", desc: "est. 5k passos/dia", icon: HelpCircle, cat: "Não sei (estimar em 5.000 passos)" },
                        { value: 6500, label: "Moderado", desc: "4k a 8k passos/dia", icon: Footprints, cat: "Leve atividade" },
                        { value: 10000, label: "Ativo", desc: "8k a 12k passos/dia", icon: Flame, cat: "Ativo" },
                        { value: 14000, label: "Muito ativo", desc: "> 12k passos/dia", icon: Trophy, cat: "Muito ativo" }
                      ].map((item) => {
                        const Icon = item.icon;
                        const isSelected = (userData.dailySteps || 5000) === item.value;
                        return (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => {
                              setUserData({
                                ...userData,
                                dailySteps: item.value,
                                stepsCategory: item.cat
                              });
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
                    <span className="text-xs text-slate-500 block">Categoria de Exercício</span>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {[
                        { id: "force", label: "Força", desc: "Musculação, CrossFit", icon: Dumbbell },
                        { id: "cardio_moderate", label: "Cardio Moderado", desc: "Bicicleta, Tênis", icon: Bike },
                        { id: "cardio_intense", label: "Cardio Intenso", desc: "Corrida, HIIT", icon: Flame },
                        { id: "mixed", label: "Esportes Mistos", desc: "Lutas, Futebol", icon: Activity }
                      ].map((item) => {
                        const Icon = item.icon;
                        const isSelected = userData.exerciseCategory === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setUserData({
                                ...userData,
                                exerciseCategory: item.id as any
                              });
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

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-xs text-slate-500">Frequência Semanal</span>
                      <input 
                        type="text" 
                        inputMode="numeric"
                        value={userData.frequency || ''}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setUserData({...userData, frequency: val === '' ? 0 : Number(val)});
                        }}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500/20 transition-all dark:text-white"
                        placeholder="Ex: 4"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-slate-500">Duração (méd. min)</span>
                      <input 
                        type="text" 
                        inputMode="numeric"
                        value={userData.duration || ''}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setUserData({...userData, duration: val === '' ? 0 : Number(val)});
                        }}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500/20 transition-all dark:text-white"
                        placeholder="Ex: 60"
                      />
                    </div>
                  </div>
                </div>

                {/* GENERATION ACTION BUTTON */}
                <div className="pt-6">
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleGenerate}
                    disabled={!userData.age || !userData.weight || !userData.height || loading}
                    className="w-full bg-purple-cyan text-white font-bold py-4 rounded-2xl shadow-lg shadow-purple-500/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>Gerar Meu Plano Nutricional Inteligente <ChevronRight size={18} /></>
                    )}
                  </motion.button>
                </div>

              </div>
            </motion.div>
          )}

          {step === 3 && dietPlan && (
            <motion.div
              key="step3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-12"
            >
              {/* Dashboard Summary */}
              <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <Scale size={18} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">IMC</span>
                  </div>
                  <div className="text-2xl font-bold">{dietPlan.bmi}</div>
                  <div className="text-xs font-medium text-cyan-500">{dietPlan.bmiCategory}</div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <Activity size={18} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">TMB</span>
                  </div>
                  <div className="text-2xl font-bold">{dietPlan.bmr} <span className="text-xs font-normal text-slate-400">kcal</span></div>
                  <div className="text-xs font-medium text-slate-500">Metabolismo Basal</div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <Zap size={18} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">TDEE</span>
                  </div>
                  <div className="text-2xl font-bold">{dietPlan.tdee} <span className="text-xs font-normal text-slate-400">kcal</span></div>
                  <div className="text-xs font-medium text-slate-500">Gasto Diário Total</div>
                </div>
                <div className="bg-purple-cyan p-6 rounded-3xl text-white shadow-lg shadow-purple-500/20 space-y-2">
                  <div className="flex items-center justify-between opacity-80">
                    <Target size={18} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Meta</span>
                  </div>
                  <div className="text-2xl font-bold">{dietPlan.targetCalories} <span className="text-xs font-normal opacity-80">kcal</span></div>
                  <div className="text-xs font-medium opacity-90">Ingestão Recomendada</div>
                </div>
              </section>

              {/* Charts */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <PieChartIcon size={16} /> Distribuição de Macros
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={macroData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {macroData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-50 dark:border-slate-800">
                    <div className="text-center">
                      <div className="text-xs text-slate-400 mb-1">Proteína</div>
                      <div className="font-bold text-purple-600 dark:text-purple-400">{dietPlan.macros.protein}g</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-slate-400 mb-1">Carbo</div>
                      <div className="font-bold text-cyan-600 dark:text-cyan-400">{dietPlan.macros.carbs}g</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-slate-400 mb-1">Gordura</div>
                      <div className="font-bold text-amber-600">{dietPlan.macros.fat}g</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                      <Activity size={16} /> Composição de Macros por Refeição ({activeDay})
                    </h3>
                    
                    <div className="flex items-center gap-4 text-[10px] sm:text-xs font-bold text-slate-400 dark:text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                        <span>Proteínas</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                        <span>Carboidratos</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <span>Gorduras</span>
                      </div>
                    </div>
                  </div>

                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={mealData}>
                        <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} interval={0} stroke={darkMode ? "#94a3b8" : "#64748b"} />
                        <YAxis hide />
                        <Tooltip cursor={{ fill: darkMode ? '#1e293b' : '#f8fafc' }} content={<MealMacroTooltip />} />
                        <Bar dataKey="Proteínas" stackId="meals_stack" fill="#9333ea" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="Carboidratos" stackId="meals_stack" fill="#06b6d4" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="Gorduras" stackId="meals_stack" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-[10px] text-slate-500 leading-relaxed">
                    <Info size={14} className="shrink-0" />
                    <span>A distribuição calórica é otimizada para manter seus níveis de energia estáveis durante todo o dia.</span>
                  </div>
                </div>
              </section>

              {/* Weekly Diet Plan */}
              <section className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div className="space-y-2">
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                      <Utensils className="text-purple-500" /> <span className="text-gradient">Seu Plano Semanal</span>
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Dietas diversificadas para cada dia da semana.</p>
                  </div>
                  
                  <div className="flex overflow-x-auto py-2 px-1 -my-2 gap-2 no-scrollbar">
                    {DAYS.map(day => (
                      <motion.button
                        key={day}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setActiveDay(day)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${activeDay === day ? 'bg-purple-cyan text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                      >
                        {day}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {currentDayMeals.map((meal, mIdx) => (
                    <motion.div 
                      key={`${activeDay}-${mIdx}`}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden group"
                    >
                      <div className="p-6 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                            <Utensils size={20} />
                          </div>
                          <h4 className="font-bold text-slate-700 dark:text-slate-200">{meal.name}</h4>
                        </div>
                        <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/20 px-3 py-1.5 rounded-full">
                          {Math.round(meal.totalCalories)} kcal
                        </span>
                      </div>
                      <div className="p-6 space-y-5">
                        {meal.foods.map((item, fIdx) => (
                          <div key={fIdx} className="flex items-center justify-between group/item">
                            <div className="flex items-center gap-4">
                              <motion.button 
                                whileHover={{ scale: 1.1, rotate: 180 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => regenerateFood(activeDay, mIdx, fIdx)}
                                className="w-8 h-8 rounded-full border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400 hover:text-purple-500 hover:border-purple-200 transition-all"
                                title="Regenerar Alimento"
                              >
                                <RefreshCw size={14} />
                              </motion.button>
                              <div>
                                <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{formatFoodName(item.food.name)}</div>
                                <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                                  {formatMeasure(item.amount, item.food)} ({item.amount}g) • {Math.round(item.food.calories * item.amount / 100)} kcal
                                </div>
                              </div>
                            </div>
                            <div className="text-[10px] font-mono text-slate-400 flex flex-col items-end">
                              <span>P: {Math.round(item.food.protein * item.amount / 100)}g</span>
                              <span>C: {Math.round(item.food.carbs * item.amount / 100)}g</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="px-6 py-4 bg-slate-50/30 dark:bg-slate-800/10 flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest border-t border-slate-50 dark:border-slate-800">
                        <span>Macros Totais</span>
                        <div className="flex gap-4">
                          <span className="text-purple-500">P: {Math.round(meal.totalProtein)}g</span>
                          <span className="text-cyan-500">C: {Math.round(meal.totalCarbs)}g</span>
                          <span className="text-amber-500">G: {Math.round(meal.totalFat)}g</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* Print Section CTA */}
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-transparent rounded-[3rem] p-12 text-center text-slate-900 dark:text-white space-y-8 relative overflow-hidden shadow-xl shadow-purple-500/5">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 dark:bg-purple-500/10 blur-[100px] rounded-full -mr-32 -mt-32" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/5 dark:bg-cyan-500/10 blur-[100px] rounded-full -ml-32 -mb-32" />
                
                <div className="relative z-10 space-y-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-cyan-500 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-purple-500/20 text-white">
                    <Printer size={40} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-3xl font-bold">Pronto para o Próximo Nível?</h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto text-lg">
                      Gere um guia visual elegante do seu plano semanal para levar com você ou colar na geladeira.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handlePrint}
                      className="w-full sm:w-auto bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold px-10 py-4 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2 shadow-xl border border-slate-200 dark:border-slate-700"
                    >
                      <Download size={20} /> Baixar Imagem Paisagem
                    </motion.button>
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowAuth(true)}
                      className="w-full sm:w-auto bg-purple-cyan text-white font-bold px-10 py-4 rounded-2xl shadow-lg shadow-purple-500/20 transition-all flex items-center justify-center gap-2 border-0 hover:opacity-95"
                    >
                      <User size={20} /> Entrar e Registrar Alimentação
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Hidden Print Template (Landscape) */}
      <div className="fixed left-[-9999px] top-0">
        <div 
          ref={printRef}
          className="w-[1200px] bg-white dark:bg-slate-950 p-12 space-y-8 font-sans"
          style={{ aspectRatio: '16/9' }}
        >
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center text-white">
                  <Dumbbell size={28} />
                </div>
                <h1 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white uppercase">SportNutri <span className="text-cyan-500">AI</span></h1>
              </div>
              <p className="text-slate-400 font-bold tracking-widest uppercase text-xs">Plano Alimentar Semanal de Alta Performance</p>
            </div>
            <div className="text-right space-y-1">
              <div className="text-sm font-bold text-slate-500 uppercase tracking-widest">Usuário: {userData.sex === 'male' ? 'Atleta' : 'Atleta'}</div>
              <div className="text-2xl font-black text-purple-600">{dietPlan?.targetCalories} KCAL / DIA</div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Objetivo: {userData.goal === 'hypertrophy' ? 'Hipertrofia' : 'Emagrecimento'}</div>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-4">
            {DAYS.map(day => (
              <div key={day} className="space-y-4">
                <div className="bg-slate-900 text-white py-2 px-3 rounded-xl text-center text-[10px] font-black uppercase tracking-widest">{day}</div>
                <div className="space-y-3">
                  {dietPlan?.weeklyPlan[day].map((meal, mIdx) => (
                    <div key={mIdx} className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                      <div className="text-[8px] font-black uppercase tracking-widest text-purple-500">{meal.name}</div>
                      <div className="space-y-1">
                        {meal.foods.map((f, fIdx) => (
                          <div key={fIdx} className="text-[9px] font-bold text-slate-700 dark:text-slate-300 leading-tight">
                            {formatMeasure(f.amount, f.food)} {formatFoodName(f.food.name)}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-8 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <div className="flex gap-8">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Proteína: {dietPlan?.macros.protein}g</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-cyan-500" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Carbo: {dietPlan?.macros.carbs}g</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gordura: {dietPlan?.macros.fat}g</span>
              </div>
            </div>
            <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">Gerado por SportNutri AI • {new Date().toLocaleDateString()}</div>
          </div>
          
          {/* Gym Art Overlay (Subtle) */}
          <div className="absolute bottom-12 right-12 opacity-[0.03] pointer-events-none">
            <Dumbbell size={400} />
          </div>
        </div>
      </div>

      <footer className="border-t border-slate-100 dark:border-slate-800 py-12 mt-12 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-4">
          <div className="flex items-center justify-center gap-2 opacity-50">
            <Zap size={16} fill="currentColor" className="text-purple-500" />
            <span className="font-bold tracking-tight dark:text-white">SportNutri AI</span>
          </div>
          <p className="text-xs text-slate-400">
            &copy; 2026 SportNutri AI. Sua jornada fitness começa aqui.
          </p>
        </div>
      </footer>
    </div>
  );
}
