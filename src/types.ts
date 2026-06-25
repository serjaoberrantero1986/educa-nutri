import { Type } from "@google/genai";

export interface UserData {
  sex: "male" | "female";
  age: number;
  weight: number;
  height: number;
  activityLevel: "sedentary" | "light" | "moderate" | "high" | "athlete";
  goal: "hypertrophy" | "weightloss" | "recomposition" | "maintenance";
  exerciseCategory: "force" | "cardio_moderate" | "cardio_intense" | "mixed";
  exerciseType: string;
  frequency: number;
  duration: number;
  waist?: number;
  neck?: number;
  hip?: number;
  biceps?: number;
  peitoral?: number;
  coxas?: number;
  knowsBodyFat?: boolean;
  customBodyFat?: number;
  visualBodyFat?: number;
  targetBodyFatPreset?: "athletic" | "fitness" | "healthy" | "custom";
  targetBodyFat?: number;
  journeySpeed?: "conservative" | "moderate" | "aggressive";
  dailySteps?: number;
  stepsCategory?: string;
  hasMedicalCondition?: boolean;
  medicalConditions?: string;
  dietRestrictions?: string[];
  useOnlyIMC?: boolean;
}

export interface Food {
  id: number | string;
  name: string;
  category: "proteina" | "carboidrato" | "fruta" | "vegetal" | "gordura" | "laticinio";
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  portion: string;
  measure_unit: string;
  grams_per_unit: number;
}

export interface Meal {
  name: string;
  percentage: number;
  foods: { food: Food; amount: number }[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

export interface DietPlan {
  bmi: number;
  bmiCategory: string;
  bmr: number;
  tdee: number;
  targetCalories: number;
  macros: {
    protein: number;
    carbs: number;
    fat: number;
  };
  weeklyPlan: {
    [day: string]: Meal[];
  };
}

export interface WeightHistoryEntry {
  date: string;
  weight: number;
}

export interface MeasurementHistoryEntry {
  date: string;
  waist: number;
  neck: number;
  hip?: number;
  biceps?: number;
  peitoral?: number;
  coxas?: number;
  bodyFat?: number;
}

export interface PhotoHistoryEntry {
  date: string;
  frontPhoto?: string;
  sidePhoto?: string;
  backPhoto?: string;
  frontSilhouette?: string;
  sideSilhouette?: string;
  backSilhouette?: string;
}

export interface Profile {
  id: string;
  username: string;
  email?: string | null;
  full_name?: string;
  avatar_url?: string;
  cpf?: string;
  whatsapp?: string;
  user_data?: UserData;
  xp: number;
  streak: number;
  last_activity_date?: string;
  league: 'Bronze' | 'Prata' | 'Ouro' | 'Safira' | 'Diamante';
  custom_meals?: { id: string; name: string; icon: string }[];
  streak_freeze_active?: boolean;
  nutri_assistant_active?: boolean | string | null;
  premium_access_until?: string | null;
  whatsapp_access_until?: string | null;
  recipes_access_until?: string | null;
  shared_workouts_pass_until?: string | null;
  professional_access_until?: string | null;
  paid_premium?: boolean;
  paid_professional?: boolean;
  role?: string | null;
  is_professional?: boolean;
  rewarded_goals_today?: {
    calories?: boolean;
    protein?: boolean;
    carbs?: boolean;
    fat?: boolean;
    water?: boolean;
    date?: string;
  };
  rewarded_exercises_today?: {
    date?: string;
    exercises?: string[];
    bonus_claimed?: boolean;
  };
  weight_history?: WeightHistoryEntry[];
  measurement_history?: MeasurementHistoryEntry[];
  photo_history?: PhotoHistoryEntry[];
  diet_plan?: DietPlan;
  claimed_achievements?: string[];
  recipe_favorites?: any[];
  recipe_generations?: any[];
  recipes_generated_today?: { date: string; count: number };
  ai_diet_generated?: boolean;
  daily_missions_today?: DailyMissionsToday;
}

export interface DailyMission {
  id: string;
  type: 'meal' | 'macro' | 'water' | 'workout';
  title: string;
  description: string;
  rewardXP: number;
  targetValue: number;
  currentValue: number;
  completed: boolean;
  claimed: boolean;
  meta?: any;
}

export interface DailyMissionsToday {
  date: string;
  claimed_ids: string[];
}

export interface FoodLog {
  id: string;
  user_id: string;
  meal_type: string;
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  amount: number;
  unit: string;
  logged_at: string;
  added_via?: string;
}

export interface WaterLog {
  id: string;
  user_id: string;
  amount_ml: number;
  logged_at: string;
  added_via?: string;
}

// Workout System Types
export type WorkoutExperience = 'beginner' | 'intermediate' | 'advanced';
export type WorkoutGoal = 'hypertrophy' | 'weightloss' | 'strength' | 'endurance';

export interface UserWorkoutProfile {
  experience: WorkoutExperience;
  daysPerWeek: number;
  workoutDuration: number; // in minutes
  equipment: string[]; // ['pesos_livres', 'maquinas', 'calistenia', 'polias']
  limitations: string[];
  muscleFatigue: {
    peito: number;
    costas: number;
    pernas: number;
    biceps: number;
    triceps: number;
    ombros: number;
    abdome: number;
  };
  divisionType?: 'Full Body A/B' | 'ABC' | 'ABCD' | 'ABCDE' | 'Push/Pull/Legs 2x' | 'Personalizado';
}

export interface WorkoutExercise {
  nome: string;
  grupoPrincipal: string;
  gruposSecundarios: string[];
  equipamento: 'pesos_livres' | 'maquina' | 'calistenia' | 'polia' | 'halteres' | 'barra';
  nivel: 'iniciante' | 'intermediario' | 'avancado';
  tipo: 'composto' | 'isolador';
  gifUrl?: string; // Short repetition infinite visual instruction
  icon?: string;
}

export interface PlannedExercise {
  id: string;
  exercise: WorkoutExercise;
  series: {
    carga: number;
    reps: number;
  }[];
  reposoSem: number; // rest in seconds, standard 60-90
  observacoes?: string;
  customTips?: {
    correta: string;
    erros: string;
    evitar: string;
  };
}

export interface WorkoutRoutineDay {
  id: string; // e.g. "A", "B", "C"
  name: string; // e.g. "Treino A - Peito e Tríceps"
  exercises: PlannedExercise[];
}

export interface WorkoutRoutine {
  id: string;
  user_id: string;
  createdAt: string;
  division: string; // 'ABC', 'ABCD', etc.
  days: WorkoutRoutineDay[];
  isPrivate?: boolean; // Default true. Professional/Admin users can toggle this.
  creatorName?: string; // Author's username.
  creatorRole?: string; // Author's role.
  creatorAvatarUrl?: string | null; // Author's profile photo.
  downloads?: number; // Number of times cloned.
  daysCount?: number; // How many days of training (3 days a,b,c or 4 days a,b,c,d, etc.)
  level?: 'iniciante' | 'intermediario' | 'avancado';
}

export interface WorkoutSetRecord {
  carga: number;
  reps: number;
}

export interface ExerciseLog {
  id: string;
  user_id: string;
  exercicio: string;
  loggedAt: string;
  series: { carga: number; reps: number }[];
  esforco: number; // 0 to 5
  observacoes?: string;
  type?: 'strength' | 'cardio';
  duration_minutes?: number;
  distance_km?: number;
  intensity?: 'low' | 'medium' | 'high';
  calories_burned?: number;
  pace?: string;
  reps_count?: number;
}

