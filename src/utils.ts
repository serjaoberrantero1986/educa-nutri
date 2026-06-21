import { UserData, DietPlan, Food, Meal } from "./types";

export const getApiUrl = (path: string): string => {
  const isCapacitor = typeof window !== "undefined" && ((window as any).Capacitor !== undefined || window.location.protocol === "capacitor:");
  
  const isExternalHost = typeof window !== "undefined" && 
    window.location.hostname !== "localhost" && 
    window.location.hostname !== "127.0.0.1" && 
    !window.location.hostname.endsWith(".run.app");

  if (isCapacitor || isExternalHost) {
    // For mobile or external hosts (like Vercel), target the absolute live full-stack backend address.
    const customApiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_APP_URL;
    if (customApiUrl) {
      const baseUrl = customApiUrl.endsWith('/') ? customApiUrl.slice(0, -1) : customApiUrl;
      return `${baseUrl}${path}`;
    }
    // Fallback to the active container address
    return `https://ais-pre-pcmdsmwuzuxfdscjzuiifh-60598086565.us-east1.run.app${path}`;
  }
  
  // For web environments (local development, preview containers), route relatively
  return path;
};

export const calculateBMI = (weight: number, height: number): { value: number; category: string } => {
  const heightInMeters = height / 100;
  const bmi = weight / (heightInMeters * heightInMeters);
  let category = "";

  if (bmi < 18.5) category = "Abaixo do peso";
  else if (bmi < 25) category = "Normal";
  else if (bmi < 30) category = "Sobrepeso";
  else category = "Obesidade";

  return { value: Number(bmi.toFixed(1)), category };
};

export const calculateBMR = (data: UserData): number => {
  const { sex, weight, height, age } = data;
  if (sex === "male") {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    return 10 * weight + 6.25 * height - 5 * age - 161;
  }
};

export const calculateNavyBodyFat = (
  sex: "male" | "female",
  height: number,
  waist: number,
  neck: number,
  hip?: number
): number => {
  const h = height || 170;
  const w = waist || 80;
  const n = neck || 37;
  const hp = hip || 90;

  if (sex === "male") {
    if (w <= n) return 15;
    try {
      const density = 1.0324 - 0.19077 * Math.log10(w - n) + 0.15456 * Math.log10(h);
      const bf = 495 / density - 450;
      return Math.max(3, Math.min(50, Number(bf.toFixed(1))));
    } catch {
      return 15;
    }
  } else {
    if (w + hp <= n) return 22;
    try {
      const density = 1.29579 - 0.35004 * Math.log10(w + hp - n) + 0.22100 * Math.log10(h);
      const bf = 495 / density - 450;
      return Math.max(8, Math.min(55, Number(bf.toFixed(1))));
    } catch {
      return 22;
    }
  }
};

export const calculateTDEE = (bmr: number, activityLevel: UserData["activityLevel"]): number => {
  const multipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    high: 1.725,
    athlete: 1.9,
  };
  return bmr * multipliers[activityLevel];
};

export const calculateTDEEEnhanced = (bmr: number, data: UserData): number => {
  let stepMult = 1.2;
  const steps = data.dailySteps || 5000;
  if (steps < 4000) stepMult = 1.15;
  else if (steps < 7500) stepMult = 1.25;
  else if (steps < 11000) stepMult = 1.4;
  else if (steps < 15000) stepMult = 1.55;
  else stepMult = 1.7;

  let energyRate = 5;
  const category = data.exerciseCategory || "force";
  if (category === "force") energyRate = 6;
  else if (category === "cardio_moderate") energyRate = 5;
  else if (category === "cardio_intense") energyRate = 9;
  else if (category === "mixed") energyRate = 7;

  const workoutBurnDaily = ((data.frequency || 0) * (data.duration || 0) * energyRate) / 7;
  return Math.round(bmr * stepMult + workoutBurnDaily);
};

export const calculateMacros = (weight: number, goal: UserData["goal"], targetCalories: number) => {
  let proteinPerKg = 2.0;
  if (goal === "weightloss" || goal === "recomposition") {
    proteinPerKg = 2.2;
  }
  let fatPerKg = 0.8;

  const proteinGrams = proteinPerKg * weight;
  const fatGrams = fatPerKg * weight;

  const proteinCalories = proteinGrams * 4;
  const fatCalories = fatGrams * 9;

  const remainingCalories = targetCalories - (proteinCalories + fatCalories);
  const carbsGrams = Math.max(20, remainingCalories / 4);

  return {
    protein: Math.round(proteinGrams),
    fat: Math.round(fatGrams),
    carbs: Math.round(carbsGrams),
  };
};

export const FALLBACK_FOODS: Food[] = [
  // Proteins
  { id: 101, name: "Frango Grelhado", category: "proteina", calories: 165, protein: 31, carbs: 0, fat: 3.6, portion: "100g", measure_unit: "filé médio", grams_per_unit: 100 },
  { id: 102, name: "Ovo Cozido", category: "proteina", calories: 70, protein: 6, carbs: 0.6, fat: 5, portion: "1 unidade", measure_unit: "unidade", grams_per_unit: 50 },
  { id: 103, name: "Carne Bovina (Patinho)", category: "proteina", calories: 250, protein: 26, carbs: 0, fat: 15, portion: "100g", measure_unit: "bife médio", grams_per_unit: 100 },
  { id: 104, name: "Tilápia Grelhada", category: "proteina", calories: 129, protein: 26, carbs: 0, fat: 2.7, portion: "100g", measure_unit: "filé", grams_per_unit: 100 },
  { id: 105, name: "Atum em Conserva", category: "proteina", calories: 132, protein: 29, carbs: 0, fat: 1, portion: "100g", measure_unit: "lata", grams_per_unit: 120 },
  { id: 106, name: "Whey Protein", category: "proteina", calories: 120, protein: 24, carbs: 3, fat: 1.5, portion: "30g", measure_unit: "scoop", grams_per_unit: 30 },
  { id: 107, name: "Iogurte Grego", category: "proteina", calories: 110, protein: 7, carbs: 15, fat: 2.5, portion: "100g", measure_unit: "pote", grams_per_unit: 100 },
  
  // Carbs
  { id: 201, name: "Arroz Branco Cozido", category: "carboidrato", calories: 130, protein: 2.7, carbs: 28, fat: 0.3, portion: "100g", measure_unit: "colher de servir", grams_per_unit: 25 },
  { id: 202, name: "Arroz Integral Cozido", category: "carboidrato", calories: 111, protein: 2.6, carbs: 23, fat: 0.9, portion: "100g", measure_unit: "colher de servir", grams_per_unit: 25 },
  { id: 203, name: "Batata Inglesa Cozida", category: "carboidrato", calories: 77, protein: 2, carbs: 17, fat: 0.1, portion: "100g", measure_unit: "unidade média", grams_per_unit: 100 },
  { id: 204, name: "Batata Doce Cozida", category: "carboidrato", calories: 86, protein: 1.6, carbs: 20, fat: 0.1, portion: "100g", measure_unit: "unidade média", grams_per_unit: 100 },
  { id: 205, name: "Aveia em Flocos", category: "carboidrato", calories: 389, protein: 17, carbs: 66, fat: 7, portion: "100g", measure_unit: "colher de sopa", grams_per_unit: 15 },
  { id: 206, name: "Macarrão Cozido", category: "carboidrato", calories: 158, protein: 5.8, carbs: 31, fat: 0.9, portion: "100g", measure_unit: "pegador", grams_per_unit: 40 },
  { id: 207, name: "Pão Integral", category: "carboidrato", calories: 247, protein: 13, carbs: 41, fat: 3.4, portion: "100g", measure_unit: "fatia", grams_per_unit: 25 },

  // Fruits
  { id: 301, name: "Banana Prata", category: "fruta", calories: 96, protein: 1.3, carbs: 23, fat: 0.3, portion: "100g", measure_unit: "unidade", grams_per_unit: 65 },
  { id: 302, name: "Maçã Fuji", category: "fruta", calories: 52, protein: 0.3, carbs: 14, fat: 0.2, portion: "100g", measure_unit: "unidade", grams_per_unit: 130 },
  { id: 303, name: "Mamão Papaia", category: "fruta", calories: 43, protein: 0.5, carbs: 11, fat: 0.3, portion: "100g", measure_unit: "fatia média", grams_per_unit: 100 },
  { id: 304, name: "Morango", category: "fruta", calories: 32, protein: 0.7, carbs: 7.7, fat: 0.3, portion: "100g", measure_unit: "unidade", grams_per_unit: 15 },

  // Vegetables
  { id: 401, name: "Brócolis Cozido", category: "vegetal", calories: 35, protein: 2.4, carbs: 7.2, fat: 0.4, portion: "100g", measure_unit: "ramo", grams_per_unit: 20 },
  { id: 402, name: "Cenoura Crua", category: "vegetal", calories: 41, protein: 0.9, carbs: 10, fat: 0.2, portion: "100g", measure_unit: "unidade média", grams_per_unit: 120 },
  { id: 403, name: "Alface Crespa", category: "vegetal", calories: 15, protein: 1.4, carbs: 2.9, fat: 0.2, portion: "100g", measure_unit: "folha", grams_per_unit: 10 },
  { id: 404, name: "Espinafre Cozido", category: "vegetal", calories: 23, protein: 3, carbs: 3.6, fat: 0.3, portion: "100g", measure_unit: "colher de sopa", grams_per_unit: 20 }
];

export const generateDiet = (data: UserData, foods: Food[], customMeals?: { id: string; name: string; icon: string }[]): DietPlan => {
  const bmiInfo = calculateBMI(data.weight, data.height);
  const bmr = calculateBMR(data);
  const tdee = calculateTDEEEnhanced(bmr, data);

  let adjustment = 0;
  if (data.goal === "weightloss") {
    const speed = data.journeySpeed || "moderate";
    if (speed === "conservative") {
      adjustment = -Math.round((data.weight * 0.0025 * 7700) / 7);
    } else if (speed === "aggressive") {
      adjustment = -Math.round((data.weight * 0.0075 * 7700) / 7);
    } else {
      adjustment = -Math.round((data.weight * 0.005 * 7700) / 7);
    }
    adjustment = Math.max(-1000, Math.min(-200, adjustment));
  } else if (data.goal === "hypertrophy") {
    const speed = data.journeySpeed || "moderate";
    if (speed === "conservative") adjustment = 150;
    else if (speed === "aggressive") adjustment = 500;
    else adjustment = 300;
  } else if (data.goal === "recomposition") {
    adjustment = -150;
  } else if (data.goal === "maintenance") {
    adjustment = 0;
  }

  const targetCalories = Math.max(1200, tdee + adjustment);
  const macros = calculateMacros(data.weight, data.goal, targetCalories);

  // Calculate body fat if not known using US Navy and Visual Assessment combined for higher precision
  const knowsBF = data.knowsBodyFat || false;
  const customBF = data.customBodyFat || 15;
  const navyBF = calculateNavyBodyFat(data.sex, data.height, data.waist || 85, data.neck || 38, data.hip || 95);
  const visualBF = data.visualBodyFat;
  
  let bodyFat = knowsBF ? customBF : navyBF;
  if (!knowsBF && visualBF) {
    bodyFat = Number(((navyBF + visualBF) / 2).toFixed(1));
  }
  const lbm = data.weight * (1 - bodyFat / 100);

  // Derive target body fat and goal weight
  let targetBF = data.targetBodyFat || 15;
  if (!data.targetBodyFat) {
    if (data.sex === "male") {
      if (data.targetBodyFatPreset === "athletic") targetBF = 11;
      else if (data.targetBodyFatPreset === "fitness") targetBF = 10;
      else targetBF = 17.5;
    } else {
      if (data.targetBodyFatPreset === "athletic") targetBF = 17;
      else if (data.targetBodyFatPreset === "fitness") targetBF = 21;
      else targetBF = 26;
    }
  }

  const goalWeight = Number((lbm / (1 - targetBF / 100)).toFixed(1));

  const days = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
  const weeklyPlan: { [day: string]: Meal[] } = {};

  const mealDefinitions = (customMeals && customMeals.length > 0) ? customMeals.map(m => ({
    name: m.name,
    percentage: 1 / customMeals.length // Distribute equally if custom
  })) : [
    { name: "Café da Manhã", percentage: 0.2 },
    { name: "Lanche da Manhã", percentage: 0.1 },
    { name: "Almoço", percentage: 0.3 },
    { name: "Lanche da Tarde", percentage: 0.15 },
    { name: "Jantar", percentage: 0.15 },
    { name: "Ceia", percentage: 0.1 },
  ];

  // Use fallback foods if the input foods is empty or missing key categories
  const activeFoods = (foods && foods.length > 5) ? foods : FALLBACK_FOODS;

  // Track global history of chosen foods to introduce rotation and variety across days (Option B)
  const recentlyUsedProteins: string[] = [];
  const recentlyUsedCarbs: string[] = [];
  const MAX_RECALL = 3;

  days.forEach(day => {
    // Keep track of what we used *today* to avoid repeating the exact same foods (Option B)
    const usedProteinNamesThisDay = new Set<string>();
    const usedCarbNamesThisDay = new Set<string>();

    weeklyPlan[day] = mealDefinitions.map((def) => {
      const mealProtein = macros.protein * def.percentage;
      const mealCarbs = macros.carbs * def.percentage;

      const mealFoods: { food: Food; amount: number }[] = [];

      const allProteins = activeFoods.filter(f => f.category === "proteina");
      const allCarbs = activeFoods.filter(f => f.category === "carboidrato");
      const fruits = activeFoods.filter(f => f.category === "fruta");
      const veggies = activeFoods.filter(f => f.category === "vegetal");

      const mealNameLower = def.name.toLowerCase();
      const isBreakfastOrSnack = mealNameLower.includes("café") || 
                                 mealNameLower.includes("cafe") || 
                                 mealNameLower.includes("lanche") || 
                                 mealNameLower.includes("ceia") || 
                                 mealNameLower.includes("snack") || 
                                 mealNameLower.includes("pre-treino") || 
                                 mealNameLower.includes("pós-treino") ||
                                 mealNameLower.includes("pos-treino");
                                 
      const isLunchOrDinner = mealNameLower.includes("almoço") || 
                              mealNameLower.includes("almoco") || 
                              mealNameLower.includes("jantar") || 
                              mealNameLower.includes("janta");

      // 1. SMART PROTEIN FILTERING (Option A)
      let suitableProteins = allProteins;

      if (isBreakfastOrSnack) {
        // Exclude heavy lunch/dinner main proteins for breakfast/snacks (e.g. bacalhau, beef steak, salmon, tilapia)
        suitableProteins = allProteins.filter(f => {
          const name = f.name.toLowerCase();
          return !name.includes("bacalhau") && 
                 !name.includes("tilápia") && 
                 !name.includes("tilapia") && 
                 !name.includes("peixe") && 
                 !name.includes("salmão") && 
                 !name.includes("salmao") && 
                 !name.includes("carne") && 
                 !name.includes("patinho") && 
                 !name.includes("bife") && 
                 !name.includes("lombo") &&
                 !name.includes("suíno") &&
                 !name.includes("porco");
        });
        
        // If we filtered out everything, restore all
        if (suitableProteins.length === 0) suitableProteins = allProteins;
      } else if (isLunchOrDinner) {
        // For Lunch/Dinner, prefer solid meals (meat, chicken, fish) over whey/yogurt/milk
        const solidProteins = allProteins.filter(f => {
          const name = f.name.toLowerCase();
          return !name.includes("whey") && 
                 !name.includes("iogurte") && 
                 !name.includes("leite") && 
                 !name.includes("nestlé") &&
                 !name.includes("danone");
        });
        if (solidProteins.length > 0) {
          suitableProteins = solidProteins;
        }
      }

      // VARIATION CONSTRAINT (Option B) - Exclude same-day repeats and recently used proteins
      let filteredProteins = suitableProteins.filter(f => !usedProteinNamesThisDay.has(f.name) && !recentlyUsedProteins.includes(f.name));
      if (filteredProteins.length === 0) {
        // Fallback: relax recently used across days
        filteredProteins = suitableProteins.filter(f => !usedProteinNamesThisDay.has(f.name));
      }
      if (filteredProteins.length === 0) {
        // Fallback: allow repetitions if no choice
        filteredProteins = suitableProteins;
      }

      // Select protein
      const selectedProtein = filteredProteins[Math.floor(Math.random() * filteredProteins.length)];
      if (selectedProtein) {
        const amount = (mealProtein * 0.7) / (selectedProtein.protein / 100);
        mealFoods.push({ food: selectedProtein, amount: Math.max(15, Math.round(amount)) });
        
        usedProteinNamesThisDay.add(selectedProtein.name);
        recentlyUsedProteins.push(selectedProtein.name);
        if (recentlyUsedProteins.length > MAX_RECALL) {
          recentlyUsedProteins.shift();
        }
      }

      // 2. SMART CARB FILTERING (Option A)
      let suitableCarbs = allCarbs;

      if (isBreakfastOrSnack) {
        // Prefer light carbs for breakfast/snacks like oats, whole bread, fruits, wrap
        const lightCarbs = allCarbs.filter(f => {
          const name = f.name.toLowerCase();
          return !name.includes("arroz") && 
                 !name.includes("feijão") && 
                 !name.includes("feijao") && 
                 !name.includes("macarrão") && 
                 !name.includes("macarrao") && 
                 !name.includes("lasanha") &&
                 !name.includes("nhoque") &&
                 !name.includes("purê") &&
                 !name.includes("pure");
        });
        if (lightCarbs.length > 0) {
          suitableCarbs = lightCarbs;
        }
      } else if (isLunchOrDinner) {
        // Prefer solid carbs for major meals (rice, beans, potatoes, pasta, cassava) over cereal flakes, toast, sweet treats
        const heavyCarbs = allCarbs.filter(f => {
          const name = f.name.toLowerCase();
          return !name.includes("aveia") && 
                 !name.includes("granola") && 
                 !name.includes("iogurte") &&
                 !name.includes("cereal");
        });
        if (heavyCarbs.length > 0) {
          suitableCarbs = heavyCarbs;
        }
      }

      // VARIATION CONSTRAINT (Option B) - Exclude same-day repeats and recently used carbs
      let filteredCarbs = suitableCarbs.filter(f => !usedCarbNamesThisDay.has(f.name) && !recentlyUsedCarbs.includes(f.name));
      if (filteredCarbs.length === 0) {
        // Fallback: relax recently used across days
        filteredCarbs = suitableCarbs.filter(f => !usedCarbNamesThisDay.has(f.name));
      }
      if (filteredCarbs.length === 0) {
        // Fallback: allow repetitions if no choice
        filteredCarbs = suitableCarbs;
      }

      // Select Carb
      const selectedCarb = filteredCarbs[Math.floor(Math.random() * filteredCarbs.length)];
      if (selectedCarb) {
        const amount = (mealCarbs * 0.7) / (selectedCarb.carbs / 100);
        mealFoods.push({ food: selectedCarb, amount: Math.max(15, Math.round(amount)) });

        usedCarbNamesThisDay.add(selectedCarb.name);
        recentlyUsedCarbs.push(selectedCarb.name);
        if (recentlyUsedCarbs.length > MAX_RECALL) {
          recentlyUsedCarbs.shift();
        }
      }

      if (isLunchOrDinner) {
        const v = veggies[Math.floor(Math.random() * veggies.length)];
        if (v) mealFoods.push({ food: v, amount: 100 });
      } else if (isBreakfastOrSnack) {
        const f = fruits[Math.floor(Math.random() * fruits.length)];
        if (f) mealFoods.push({ food: f, amount: 100 });
      }

      return {
        name: def.name,
        percentage: def.percentage,
        foods: mealFoods,
        totalCalories: mealFoods.reduce((sum, f) => sum + (f.food.calories * f.amount / 100), 0),
        totalProtein: mealFoods.reduce((sum, f) => sum + (f.food.protein * f.amount / 100), 0),
        totalCarbs: mealFoods.reduce((sum, f) => sum + (f.food.carbs * f.amount / 100), 0),
        totalFat: mealFoods.reduce((sum, f) => sum + (f.food.fat * f.amount / 100), 0),
      };
    });
  });

  return {
    bmi: bmiInfo.value,
    bmiCategory: bmiInfo.category,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    targetCalories: Math.round(targetCalories),
    macros,
    weeklyPlan,
  };
};

export const EXERCISES: Record<string, string[]> = {
  "Cardio": [
    "Corrida (Running)",
    "Corrida em Esteira (Treadmill Running)",
    "Trail Running",
    "Sprint",
    "Caminhada (Walking)",
    "Caminhada em Esteira",
    "Power Walking",
    "Marcha Atlética",
    "Escada (Stair Climbing)",
    "Step Aeróbico",
    "Elíptico (Elliptical Trainer)",
    "Pular Corda (Jump Rope)",
    "Dance Fitness",
    "Zumba",
    "Aeróbica"
  ],
  "Ciclismo": [
    "Ciclismo de Estrada",
    "Mountain Bike",
    "Ciclismo Indoor (Spinning)",
    "Gravel Bike",
    "Ciclismo Urbano (Commuting)",
    "Ciclismo de Endurance",
    "BMX",
    "Ciclismo de Pista",
    "Handbike",
    "E-Bike Ride"
  ],
  "Montanha e Trilhas": [
    "Hiking",
    "Trekking",
    "Caminhada em Trilhas",
    "Montanhismo (Mountaineering)",
    "Trail Hiking",
    "Nordic Walking",
    "Backpacking",
    "Expedição em Montanha"
  ],
  "Água": [
    "Natação em Piscina",
    "Natação em Águas Abertas",
    "Rowing (Remo)",
    "Remo Indoor",
    "Canoagem",
    "Caiaque (Kayaking)",
    "Stand Up Paddle",
    "Surf",
    "Bodyboard",
    "Windsurf",
    "Kitesurf",
    "Hidroginástica"
  ],
  "Força e Musculação": [
    "Musculação (Weight Training)",
    "Bodybuilding",
    "Treino com Halteres",
    "Treino com Barra (Barbell Training)",
    "Treino em Máquinas",
    "Powerlifting",
    "Levantamento Olímpico (Olympic Weightlifting)",
    "Strongman Training"
  ],
  "Treino Funcional": [
    "Treino Funcional",
    "Cross Training",
    "CrossFit",
    "HIIT (High Intensity Interval Training)",
    "Circuit Training",
    "Bootcamp",
    "Treino Metabólico"
  ],
  "Calistenia": [
    "Calistenia (Calisthenics)",
    "Street Workout",
    "Treino com Peso Corporal (Bodyweight Training)",
    "Barra Fixa",
    "Paralelas",
    "Treino de Core"
  ],
  "Mobilidade e Bem-Estar": [
    "Yoga",
    "Pilates",
    "Alongamento (Stretching)",
    "Mobilidade Articular",
    "Tai Chi",
    "Respiração e Relaxamento"
  ],
  "Esportes Coletivos": [
    "Futebol (Soccer)",
    "Futsal",
    "Basquete (Basketball)",
    "Vôlei (Volleyball)",
    "Handebol",
    "Rugby",
    "Futebol Americano"
  ],
  "Esportes de Raquete": [
    "Tênis (Tennis)",
    "Tênis de Mesa (Table Tennis)",
    "Badminton",
    "Squash",
    "Padel"
  ],
  "Artes Marciais e Lutas": [
    "Boxe (Boxing)",
    "Muay Thai",
    "Jiu-Jitsu",
    "Judô (Judo)",
    "Karatê",
    "Taekwondo",
    "MMA (Mixed Martial Arts)",
    "Kickboxing"
  ],
  "Esportes de Inverno": [
    "Ski Alpino",
    "Cross Country Ski",
    "Snowboard",
    "Snowshoeing",
    "Patinação no Gelo"
  ],
  "Outdoor e Aventura": [
    "Escalada (Rock Climbing)",
    "Escalada Indoor",
    "Boulder",
    "Slackline",
    "Skate",
    "Longboard",
    "Patins (Inline Skating)",
    "Roller Skating",
    "Parapente (Paragliding)"
  ]
};

export function formatFoodName(name: string): string {
  if (!name) return "";
  let clean = name
    .replace(/\s*\(OFF-Web\)\s*/gi, "")
    .replace(/\s*\(OFF\)\s*/gi, "")
    .trim();
  if (!clean) return "";
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

export function calculateStreakFromLogs(logs: { logged_at: string }[]): number {
  if (!logs || logs.length === 0) return 0;
  
  const uniqueDates = Array.from(
    new Set(
      logs.map(log => {
        if (!log.logged_at) return '';
        const d = new Date(log.logged_at);
        if (isNaN(d.getTime())) return '';
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }).filter(Boolean)
    )
  ).sort();

  if (uniqueDates.length === 0) return 0;

  const today = new Date();
  const getFormattedDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const todayStr = getFormattedDate(today);

  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = getFormattedDate(yesterday);

  const hasLogToday = uniqueDates.includes(todayStr);
  const hasLogYesterday = uniqueDates.includes(yesterdayStr);

  if (!hasLogToday && !hasLogYesterday) {
    return 0;
  }

  let currentRef = hasLogToday ? today : yesterday;
  let streak = 0;

  while (true) {
    const checkStr = getFormattedDate(currentRef);
    if (uniqueDates.includes(checkStr)) {
      streak++;
      currentRef.setDate(currentRef.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

export const getLocalDateString = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function getMuscleGroupLabel(group: string, customGroups?: { id: string; label: string }[]): string {
  if (!group) return '';
  const defaults: Record<string, string> = {
    peito: 'Peito',
    costas: 'Costas',
    pernas: 'Pernas',
    biceps: 'Bíceps',
    triceps: 'Tríceps',
    ombros: 'Ombros',
    abdome: 'Abdômen'
  };
  
  if (defaults[group.toLowerCase()]) {
    return defaults[group.toLowerCase()];
  }
  
  // If it matches a custom group ID let's find it
  if (customGroups) {
    const found = customGroups.find(cg => cg.id === group || cg.label.toLowerCase() === group.toLowerCase());
    if (found) return found.label;
  }
  
  // Also load from localStorage just in case we don't have customGroups passed in
  try {
    const saved = localStorage.getItem('sportnutri_custom_muscle_groups');
    if (saved) {
      const parsed = JSON.parse(saved) as { id: string; label: string }[];
      const found = parsed.find(cg => cg.id === group || cg.label.toLowerCase() === group.toLowerCase());
      if (found) return found.label;
    }
  } catch (e) {
    console.error(e);
  }

  // Fallback to capitalizing the raw group string if it doesn't match and isn't empty
  return group.charAt(0).toUpperCase() + group.slice(1);
}
