import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChefHat,
  Clock,
  Flame,
  Award,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Search,
  CheckCircle,
  AlertTriangle,
  Lock,
  Utensils,
  BookOpen,
  Leaf,
  Sprout,
  Apple,
  Star
} from 'lucide-react';
import { Profile } from '../../types';
import { db, isFirebaseConfigured } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { getApiUrl } from '../../utils';
import { getAiHeaders } from '../../services/storeConfigService';
import { tryFetchWithClientFallback, clientGenerateRecipe } from '../../services/clientAiFallback';

interface RecipesTabProps {
  user: any;
  profile: Profile | null;
  setProfile: React.Dispatch<React.SetStateAction<Profile | null>>;
  storeConfig?: any;
}

interface RecipeResult {
  id?: string;
  title: string;
  difficulty: 'facil' | 'medio' | 'dificil';
  category: 'chicken' | 'meat' | 'salad' | 'shake' | 'pancakes' | 'fish' | 'dessert' | 'egg';
  prepTime: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: string[];
  instructions: string[];
  nutritionBenefits: string;
}

// Visual category mappings
const categoryCovers: Record<string, { gradient: string; emoji: string; url: string; label: string }> = {
  chicken: {
    gradient: 'from-orange-500 to-amber-600',
    emoji: '🍗',
    url: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&q=80&w=600',
    label: 'Frango Saudável'
  },
  meat: {
    gradient: 'from-rose-600 to-red-700',
    emoji: '🥩',
    url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=600',
    label: 'Carnes Nobres'
  },
  salad: {
    gradient: 'from-emerald-500 to-teal-600',
    emoji: '🥗',
    url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=600',
    label: 'Saladas Verdes & Bowls'
  },
  shake: {
    gradient: 'from-cyan-500 to-blue-600',
    emoji: '🥤',
    url: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&q=80&w=600',
    label: 'Shakes & Bebidas Proteicas'
  },
  pancakes: {
    gradient: 'from-amber-400 to-yellow-600',
    emoji: '🥞',
    url: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&q=80&w=600',
    label: 'Panquecas & Crepes'
  },
  fish: {
    gradient: 'from-indigo-500 to-blue-700',
    emoji: '🐟',
    url: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&q=80&w=600',
    label: 'Peixes & Frutos do Mar'
  },
  dessert: {
    gradient: 'from-pink-500 to-rose-600',
    emoji: '🧁',
    url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=600',
    label: 'Sobremesas Fit'
  },
  egg: {
    gradient: 'from-yellow-400 to-orange-500',
    emoji: '🍳',
    url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&q=80&w=600',
    label: 'Lanches Práticos'
  }
};

const loadingPhrases = [
  'Refinando o tempero virtual da IA...',
  'Filtrando macros e calorias exatas...',
  'Pesquisando combinações gourmet inéditas...',
  'Garantindo que você não repita pratos antigos...',
  'Escolhendo receitas fáceis de preparar...',
  'Finalizando o prato perfeito...'
];

export const RecipesTab: React.FC<RecipesTabProps> = ({
  user,
  profile,
  setProfile,
  storeConfig
}) => {
  const isPremiumActive = profile?.premium_access_until
    ? (profile.premium_access_until === 'unlimited' || new Date(profile.premium_access_until).getTime() > Date.now())
    : false;

  const isRecipesActive = isPremiumActive ||
    (profile?.recipes_access_until === 'unlimited') ||
    (typeof profile?.recipes_access_until === 'string' && new Date(profile.recipes_access_until).getTime() > Date.now());

  // Auto clean-up of recipe history from previous days
  useEffect(() => {
    if (!profile || !profile.recipe_generations || profile.recipe_generations.length === 0) return;

    const today = new Date();
    const todayDay = today.getDate();
    const todayMonth = today.getMonth();
    const todayYear = today.getFullYear();

    const currentGenerations = profile.recipe_generations;
    const filteredGenerations = currentGenerations.filter((recipe: any) => {
      let recipeDate: Date | null = null;
      if (recipe.createdAt) {
        recipeDate = new Date(recipe.createdAt);
      } else {
        const match = recipe.id?.match(/recipe_(?:fallback_)?(\d+)/);
        if (match && match[1]) {
          recipeDate = new Date(parseInt(match[1], 10));
        }
      }

      if (!recipeDate) return true; // Keep if we can't determine

      const isToday = recipeDate.getDate() === todayDay &&
                      recipeDate.getMonth() === todayMonth &&
                      recipeDate.getFullYear() === todayYear;
      return isToday;
    });

    if (filteredGenerations.length !== currentGenerations.length) {
      const updatedProfile = {
        ...profile,
        recipe_generations: filteredGenerations
      };
      
      if (isFirebaseConfigured && user) {
        const profileRef = doc(db, 'profiles', user.uid);
        updateDoc(profileRef, {
          recipe_generations: filteredGenerations
        }).catch(err => console.error("Error auto-cleaning old recipes:", err));
      }
      setProfile(updatedProfile);
    }
  }, [profile, user, setProfile]);

  // Navigation states
  const [activeSubTab, setActiveSubTab] = useState<'generator' | 'favorites'>('generator');
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null);

  // Input states
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [goal, setGoal] = useState<'hipertrofia' | 'emagrecimento' | 'definicao' | 'health'>('health');
  const [dietPreference, setDietPreference] = useState<'any' | 'vegetarian' | 'vegan' | 'low_carb' | 'ketogenic'>('any');
  const [ingredients, setIngredients] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [loadingPhraseIndex, setLoadingPhraseIndex] = useState(0);
  const [buyingPass, setBuyingPass] = useState(false);

  // Checked state for individual ingredients (nested per recipe ID to stay separate!)
  const [checkedRecipeIngredients, setCheckedRecipeIngredients] = useState<Record<string, Record<number, boolean>>>({});

  const handleIngredientsTick = (recipeId: string, idx: number) => {
    setCheckedRecipeIngredients(prev => ({
      ...prev,
      [recipeId]: {
        ...(prev[recipeId] || {}),
        [idx]: !(prev[recipeId]?.[idx])
      }
    }));
  };

  const startLoadingPhraseCycle = () => {
    setLoadingPhraseIndex(0);
    const interval = setInterval(() => {
      setLoadingPhraseIndex(prev => (prev + 1) % loadingPhrases.length);
    }, 2500);
    return interval;
  };

  // Get current daily counter
  const todayStr = new Date().toISOString().split('T')[0];
  const dailyTracker = profile?.recipes_generated_today && profile.recipes_generated_today.date === todayStr
    ? profile.recipes_generated_today
    : { date: todayStr, count: 0 };

  // Buy recipes pass
  const handleBuy24hPass = async () => {
    if (!profile) return;
    const cost = storeConfig?.recipes_pass_cost || 1200;
    if ((profile.xp || 0) < cost) {
      alert('Seu saldo de NutriCoins é insuficiente!');
      return;
    }

    setBuyingPass(true);
    try {
      const finalCoins = (profile.xp || 0) - cost;
      const twentyFourHoursFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const updatedProfile = {
        ...profile,
        xp: finalCoins,
        recipes_access_until: twentyFourHoursFromNow
      };

      if (isFirebaseConfigured && user) {
        const profileRef = doc(db, 'profiles', user.uid);
        await updateDoc(profileRef, {
          xp: finalCoins,
          recipes_access_until: twentyFourHoursFromNow
        });
      }
      setProfile(updatedProfile);
      alert('Passe de Receitas Inteligentes 24h ativado com sucesso! Aproveite.');
    } catch (err) {
      console.error(err);
      alert('Algo deu errado. Tente de novo.');
    } finally {
      setBuyingPass(false);
    }
  };

  // Toggle favorite state
  const handleToggleFavorite = async (e: React.MouseEvent, recipe: RecipeResult) => {
    e.stopPropagation(); // Avoid expanding/collapsing the card when starring
    if (!profile) return;

    const currentFavorites = profile.recipe_favorites || [];
    const isAlreadyFav = currentFavorites.some(fav => fav.title.trim().toLowerCase() === recipe.title.trim().toLowerCase());

    let updatedFavorites;
    if (isAlreadyFav) {
      updatedFavorites = currentFavorites.filter(fav => fav.title.trim().toLowerCase() !== recipe.title.trim().toLowerCase());
    } else {
      updatedFavorites = [recipe, ...currentFavorites];
    }

    const updatedProfile = {
      ...profile,
      recipe_favorites: updatedFavorites
    };

    if (isFirebaseConfigured && user) {
      try {
        const profileRef = doc(db, 'profiles', user.uid);
        await updateDoc(profileRef, {
          recipe_favorites: updatedFavorites
        });
      } catch (err) {
        console.error("Erro ao favoritar receita:", err);
      }
    }
    setProfile(updatedProfile);
  };

  const checkIsFavorite = (recipe: RecipeResult) => {
    const favorites = profile?.recipe_favorites || [];
    return favorites.some(fav => fav.title.trim().toLowerCase() === recipe.title.trim().toLowerCase());
  };

  // Action: generate recipe
  const handleGenerateRecipe = async () => {
    if (!isRecipesActive) return;

    if (dailyTracker.count >= 5) {
      alert('Você atingiu o limite de 5 receitas geradas hoje! Favorite suas preferidas para mantê-las em segurança.');
      return;
    }

    setLoading(true);
    const intervalId = startLoadingPhraseCycle();

    try {
      const existingList = profile?.recipe_generations || [];
      const excludeTitles = existingList.map(r => r.title);

      const fallbackFn = async () => {
        return await clientGenerateRecipe({
          difficulty,
          ingredients,
          goal,
          dietPreference,
          excludeTitles
        });
      };

      const data = await tryFetchWithClientFallback<RecipeResult>(
        getApiUrl('/api/ai/recipes'),
        {
          method: 'POST',
          headers: getAiHeaders(),
          body: JSON.stringify({
            difficulty,
            ingredients,
            goal,
            dietPreference,
            excludeTitles
          })
        },
        fallbackFn
      );
      
      // Strict rule of stripping asterisks programmatically from the UI
      if (data) {
        if (data.title) data.title = data.title.replace(/\*/g, '');
        if (data.nutritionBenefits) data.nutritionBenefits = data.nutritionBenefits.replace(/\*/g, '');
        if (data.ingredients) {
          data.ingredients = data.ingredients.map(i => i.replace(/\*/g, ''));
        }
        if (data.instructions) {
          data.instructions = data.instructions.map(i => i.replace(/\*/g, ''));
        }
      }

      const newId = `recipe_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const recipeWithId: RecipeResult = {
        ...data,
        id: newId,
        createdAt: new Date().toISOString()
      } as any;

      const updatedGenerations = [recipeWithId, ...existingList];
      const updatedTracker = { date: todayStr, count: dailyTracker.count + 1 };

      const updatedProfile = {
        ...profile,
        recipe_generations: updatedGenerations,
        recipes_generated_today: updatedTracker
      };

      if (isFirebaseConfigured && user) {
        const profileRef = doc(db, 'profiles', user.uid);
        await updateDoc(profileRef, {
          recipe_generations: updatedGenerations,
          recipes_generated_today: updatedTracker
        });
      }
      setProfile(updatedProfile);
      setExpandedRecipeId(newId);
    } catch (err) {
      console.error("Erro ao gerar com IA:", err);
      
      // Live failure robust fallback
      const fallbackData: RecipeResult = {
        title: "Crepioca Especial Proteica do Chef",
        difficulty: "facil",
        category: "pancakes",
        prepTime: "12 min",
        calories: 340,
        protein: 26,
        carbs: 22,
        fat: 14,
        ingredients: [
          "2 ovos de granja inteiros",
          "2 colheres de sopa de goma de mandioca (tapioca)",
          "50g de cottage ou ricota fresca",
          "Tempero verde fresco picado, pitada de sal marinho"
        ],
        instructions: [
          "Bata os ovos vigorosamente junto com a goma de tapioca e a pitada de sal mineral.",
          "Esquente uma frigideira antiaderente rasa com um pingo de azeite e deite a mistura.",
          "Espere firmar, vire a crepioca e coloque o cottage com o tempero verde por cima.",
          "Dobre e sirva bem quente."
        ],
        nutritionBenefits: "Muito fácil, rápida e com gorduras limpas que auxiliam no bom funcionamento de eixos metabólicos esportivos."
      };

      const newId = `recipe_fallback_${Date.now()}`;
      const recipeWithId = { ...fallbackData, id: newId, createdAt: new Date().toISOString() };

      const existingCombined = profile?.recipe_generations || [];
      const updatedGenerations = [recipeWithId, ...existingCombined];
      const updatedTracker = { date: todayStr, count: dailyTracker.count + 1 };

      const updatedProfile = {
        ...profile,
        recipe_generations: updatedGenerations,
        recipes_generated_today: updatedTracker
      };

      if (isFirebaseConfigured && user) {
        const profileRef = doc(db, 'profiles', user.uid);
        await updateDoc(profileRef, {
          recipe_generations: updatedGenerations,
          recipes_generated_today: updatedTracker
        });
      }
      setProfile(updatedProfile);
      setExpandedRecipeId(newId);
    } finally {
      clearInterval(intervalId);
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!profile) return;
    if (!window.confirm("Deseja mesmo limpar as receitas anteriores da lista? (Suas favoritas marcadas com estrela continuarão salvas)")) {
      return;
    }
    const updatedProfile = {
      ...profile,
      recipe_generations: []
    };
    if (isFirebaseConfigured && user) {
      const profileRef = doc(db, 'profiles', user.uid);
      await updateDoc(profileRef, {
        recipe_generations: []
      });
    }
    setProfile(updatedProfile);
  };

  const displayList = activeSubTab === 'generator'
    ? (profile?.recipe_generations || [])
    : (profile?.recipe_favorites || []);

  return (
    <div className="space-y-6">
      {/* Header and Sub Tabs Navigation */}
      <div className="text-center space-y-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white flex items-center justify-center gap-2">
            Chef Inteligente <span className="text-orange-500 dark:text-orange-400">Receitas IA</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Crie receitas deliciosas, saudáveis e sob medida para sua fome, despensa e metas diárias!
          </p>
        </div>

        {/* Dynamic sub tab switcher */}
        {isRecipesActive && (
          <div className="flex justify-center">
            <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl w-full max-w-sm border border-slate-200/40 dark:border-slate-700/40">
              <button
                onClick={() => {
                  setActiveSubTab('generator');
                  setExpandedRecipeId(null);
                }}
                className={`py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeSubTab === 'generator'
                    ? 'bg-white dark:bg-slate-900 text-orange-500 dark:text-orange-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white_90'
                }`}
              >
                <ChefHat size={14} /> Explorar Criador
              </button>
              <button
                onClick={() => {
                  setActiveSubTab('favorites');
                  setExpandedRecipeId(null);
                }}
                className={`py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeSubTab === 'favorites'
                    ? 'bg-white dark:bg-slate-900 text-orange-500 dark:text-orange-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Star size={14} className="fill-current text-amber-500" /> Meus Favoritos ({profile?.recipe_favorites?.length || 0})
              </button>
            </div>
          </div>
        )}
      </div>

      {!isRecipesActive ? (
        // LOCK SCREEN
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8 text-center space-y-6 shadow-xl relative overflow-hidden max-w-2xl mx-auto"
        >
          <div className="absolute -right-12 -top-12 w-48 h-48 bg-orange-400/10 dark:bg-orange-400/5 rounded-full blur-3xl" />
          <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-3xl" />

          <div className="w-20 h-20 bg-orange-50 dark:bg-orange-950/20 rounded-3xl flex items-center justify-center mx-auto text-orange-500 text-3xl shadow-lg shadow-orange-100 dark:shadow-none animate-bounce">
            <ChefHat size={42} />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-extrabold text-slate-800 dark:text-white flex items-center justify-center gap-2">
              <Lock size={18} className="text-orange-500" /> Seção Exclusiva Bloqueada
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
              Descubra combinações deliciosas, prontas para bater seus macros, com fotos estimulantes, ingredientes personalizados e níveis de complexidade.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left max-w-md mx-auto py-2">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl flex items-start gap-3">
              <Sparkles size={16} className="text-orange-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black text-slate-800 dark:text-slate-200">Geração por IA de Ponta</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">Monta passos adequados ao seu preparo.</p>
              </div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl flex items-start gap-3">
              <Clock size={16} className="text-orange-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black text-slate-800 dark:text-slate-200">Níveis de Dificuldade</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">Gera opções super fáceis ou pratos gourmet.</p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-6 flex flex-col items-center space-y-4">
            <div className="text-xs font-bold text-slate-400 dark:text-slate-500">
              Desbloqueie agora mesmo e acabe com a mesmice na cozinha!
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleBuy24hPass}
                disabled={buyingPass || (profile?.xp || 0) < (storeConfig?.recipes_pass_cost || 1200)}
                className="px-6 py-3.5 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-black text-xs rounded-2xl shadow-lg hover:brightness-105 active:scale-95 disabled:opacity-55 flex items-center justify-center gap-1.5 uppercase tracking-wide cursor-pointer"
              >
                {buyingPass ? 'Ativando...' : `Passe 24h por 🪙 ${storeConfig?.recipes_pass_cost || 1200} NC`}
              </motion.button>
              
              <div className="flex items-center text-xs text-slate-400 dark:text-slate-500">
                ou incluso no plano Premium Mensal
              </div>
            </div>
            
            <div className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
              Seu Saldo: 🪙 {profile?.xp || 0} NC
            </div>
          </div>
        </motion.div>
      ) : (
        // ACTIVE FEATURE BODY
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Controls Panel (Hidden in Favorites page unless generator is active) */}
          <div className={`${activeSubTab === 'favorites' ? 'lg:col-span-12' : 'lg:col-span-4'} bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-6 shadow-sm space-y-6 transition-all`}>
            {activeSubTab === 'generator' ? (
              <>
                <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800/60 pb-3">
                  <h3 className="text-sm font-extrabold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <ChefHat size={18} className="text-orange-500" /> Preferências do Chef
                  </h3>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black text-orange-500">LIMITE DIÁRIO</span>
                    <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">{dailyTracker.count}/5 criadas hoje</span>
                  </div>
                </div>

                {/* Daily limit tracker status progress bar */}
                <div className="space-y-1">
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        dailyTracker.count >= 5 ? 'bg-rose-500' : 'bg-gradient-to-r from-orange-500 to-amber-600'
                      }`}
                      style={{ width: `${Math.min((dailyTracker.count / 5) * 100, 100)}%` }}
                    />
                  </div>
                  {dailyTracker.count >= 5 && (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-rose-500">
                      <AlertTriangle size={12} /> Limite diário alcançado. Volte amanhã!
                    </div>
                  )}
                </div>

                {/* Difficulty switch */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Nível de Dificuldade</label>
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-100/50 dark:border-slate-700/50">
                    {(['easy', 'medium', 'hard'] as const).map(level => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setDifficulty(level)}
                        className={`py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                          difficulty === level
                            ? 'bg-orange-500 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                        }`}
                      >
                        {level === 'easy' ? 'Fácil' : level === 'medium' ? 'Médio' : 'Gourmet'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Diet preference */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Preferência Dietética</label>
                  <div className="space-y-1.5">
                    {([
                      { id: 'any', label: 'Qualquer uma', detail: 'Sem restrição alimentar', icon: Utensils, color: 'text-slate-500 dark:text-slate-400' },
                      { id: 'vegetarian', label: 'Vegetariana', detail: 'Sem carne (Ovo-lacto)', icon: Leaf, color: 'text-emerald-500' },
                      { id: 'vegan', label: 'Vegana', detail: '100% à base de plantas', icon: Sprout, color: 'text-green-500' },
                      { id: 'low_carb', label: 'Low-Carb', detail: 'Baixo carboidrato', icon: Apple, color: 'text-amber-500' },
                      { id: 'ketogenic', label: 'Cetogênica', detail: 'Hiper lipídica', icon: Flame, color: 'text-rose-500' }
                    ] as const).map(item => {
                      const IconComponent = item.icon;
                      return (
                        <div
                          key={item.id}
                          onClick={() => setDietPreference(item.id)}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                            dietPreference === item.id
                              ? 'bg-orange-50/50 dark:bg-orange-950/20 border-orange-400 dark:border-orange-500/40 text-orange-950 dark:text-orange-200 shadow-sm'
                              : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-xl bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-center shrink-0 ${item.color}`}>
                            <IconComponent size={16} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-black">{item.label}</span>
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">{item.detail}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Muscle/Weight goals */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Objetivo do Prato</label>
                  <div className="space-y-1.5">
                    {([
                      { id: 'health', label: 'Saúde & Bem-estar', detail: 'Foco em equilíbrio detalhado' },
                      { id: 'hipertrofia', label: 'Massa Muscular', detail: 'Rico em proteínas e carbos limpos' },
                      { id: 'emagrecimento', label: 'Perda de Peso', detail: 'Pouca gordura, alto volume nutritivo' },
                      { id: 'definicao', label: 'Definição Suprema', detail: 'Hiper proteico e baixo sódio' }
                    ] as const).map(item => (
                      <div
                        key={item.id}
                        onClick={() => setGoal(item.id)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col ${
                          goal === item.id
                            ? 'bg-orange-50/50 dark:bg-orange-950/20 border-orange-400 dark:border-orange-500/40 text-orange-950 dark:text-orange-200 shadow-sm'
                            : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                        }`}
                      >
                        <span className="text-xs font-black">{item.label}</span>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">{item.detail}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Custom Pantry Ingredients */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Ingredientes da Geladeira</label>
                    <span className="text-[9px] font-bold text-slate-400">Opcional</span>
                  </div>
                  <textarea
                    value={ingredients}
                    onChange={e => setIngredients(e.target.value)}
                    placeholder="Exemplo: frango, ovos, abobrinha, chia..."
                    className="w-full shrink-0 h-20 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-2xl p-3 text-xs text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none font-medium"
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleGenerateRecipe}
                  disabled={loading || dailyTracker.count >= 5}
                  className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-black text-xs rounded-2xl shadow-lg hover:brightness-105 active:scale-95 disabled:opacity-55 flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer font-sans"
                >
                  {loading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" /> Gerando Receita...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} className="animate-pulse" /> Gerar Nova Receita
                    </>
                  )}
                </motion.button>
              </>
            ) : (
              <div className="text-center p-4">
                <p className="text-sm font-black text-slate-800 dark:text-white">⭐ Suas Receitas de Coração</p>
                <p className="text-xs text-slate-400 mt-1">Guarde tudo o que você mais gosta de preparar para acessar com toda facilidade e rapidez em qualquer lugar!</p>
              </div>
            )}
          </div>

          {/* Recipes Dynamic Output (Always right side, full-width if in favorites) */}
          <div className={`${activeSubTab === 'favorites' ? 'lg:col-span-12' : 'lg:col-span-8'} space-y-6`}>
            
            <AnimatePresence mode="wait">
              {loading && activeSubTab === 'generator' && (
                // LOADING SCREEN
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-12 text-center flex flex-col items-center justify-center space-y-6 min-h-[480px] shadow-sm relative overflow-hidden"
                >
                  <div className="absolute right-1/4 top-1/4 w-32 h-32 bg-orange-400/20 rounded-full blur-3xl animate-pulse" />
                  <div className="absolute left-1/4 bottom-1/4 w-32 h-32 bg-yellow-400/25 rounded-full blur-3xl animate-pulse" />

                  <div className="relative w-24 h-24 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-[6px] border-orange-500/10 border-t-orange-500 animate-spin" />
                    <ChefHat size={40} className="text-orange-500 animate-bounce" />
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-base font-black text-slate-800 dark:text-white animate-pulse">
                      {loadingPhrases[loadingPhraseIndex]}
                    </p>
                    <p className="text-xs text-slate-400">
                      O Chef Inteligente está misturando os macros para criar algo totalmente inovador para você.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* LIST VIEWS */}
              {!loading && (
                <motion.div
                  key={activeSubTab + "_" + displayList.length}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {/* Clean header actions for generator tab list */}
                  {displayList.length > 0 && activeSubTab === 'generator' && (
                    <div className="flex justify-between items-center px-2">
                      <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                        Histórico do dia ({displayList.length})
                      </span>
                      <button
                        onClick={handleClearHistory}
                        className="text-xs font-bold text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                      >
                        Limpar Histórico
                      </button>
                    </div>
                  )}

                  {/* Empty States */}
                  {displayList.length === 0 && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-12 text-center flex flex-col items-center justify-center space-y-4 min-h-[360px] shadow-sm text-slate-400">
                      <div className="w-16 h-16 bg-orange-50 dark:bg-orange-950/20 text-orange-500 rounded-full flex items-center justify-center">
                        {activeSubTab === 'generator' ? <ChefHat size={32} /> : <Star size={32} />}
                      </div>
                      <div className="space-y-1">
                        <p className="text-base font-black text-slate-850 dark:text-white">
                          {activeSubTab === 'generator' ? 'Nenhuma receita gerada hoje' : 'Você ainda não favoritou nenhuma receita'}
                        </p>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto">
                          {activeSubTab === 'generator'
                            ? 'Escolha as opções do cardápio ao lado e peça para que a IA gere uma sugestão espetacular sob medida para você!'
                            : 'Toque na estrela dourada de qualquer receita que gerar para tê-la salva instantaneamente no seu perfil.'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Multi-generation Recipe Bento Grid */}
                  {displayList.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {displayList.map((recipe, index) => {
                        const isExpanded = expandedRecipeId === recipe.id;
                        const isFavorite = checkIsFavorite(recipe);
                        
                        return (
                          <div
                            key={recipe.id || index}
                            className={`bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] overflow-hidden shadow-sm transition-all duration-300 md:col-span-2`}
                          >
                            
                            {/* Card Hero Banner (Clickable to collapse or expand) */}
                            <div
                              onClick={() => {
                                if (recipe.id) {
                                  setExpandedRecipeId(isExpanded ? null : recipe.id);
                                }
                              }}
                              className="relative h-44 md:h-52 w-full overflow-hidden cursor-pointer select-none"
                            >
                              <img
                                src={categoryCovers[recipe.category]?.url || categoryCovers.chicken.url}
                                alt={recipe.title}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
                              
                              {/* Floating pill badges on cover */}
                              <div className="absolute top-4 left-4 flex gap-2">
                                <span className="text-[10px] uppercase font-black tracking-widest px-2.5 py-1.5 bg-black/50 backdrop-blur-md rounded-full text-white border border-white/10">
                                  {categoryCovers[recipe.category]?.emoji} {categoryCovers[recipe.category]?.label || 'Chef Fit'}
                                </span>
                                <span className="text-[10px] uppercase font-black tracking-widest px-2.5 py-1.5 bg-black/50 backdrop-blur-md rounded-full text-white border border-white/10 flex items-center gap-1">
                                  <Clock size={10} /> {recipe.prepTime}
                                </span>
                              </div>

                              {/* Star icon with micro-interactions */}
                              <div className="absolute top-4 right-4 z-10">
                                <motion.button
                                  whileHover={{ scale: 1.15 }}
                                  whileTap={{ scale: 0.85 }}
                                  onClick={(e) => handleToggleFavorite(e, recipe)}
                                  className="w-10 h-10 bg-black/55 backdrop-blur-md rounded-full border border-white/20 flex items-center justify-center text-white cursor-pointer hover:bg-black/75 transition-all"
                                >
                                  <Star
                                    size={18}
                                    className={`${isFavorite ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
                                  />
                                </motion.button>
                              </div>

                              {/* Difficulty indication */}
                              <div className="absolute bottom-4 right-4">
                                <span className="text-[9px] uppercase font-black tracking-widest px-2.5 py-1 bg-orange-500 backdrop-blur-md rounded-full text-white">
                                  {recipe.difficulty === 'facil' ? 'Fácil' : recipe.difficulty === 'medio' ? 'Médio' : 'Gourmet'}
                                </span>
                              </div>

                              {/* Overlay titles */}
                              <div className="absolute bottom-4 left-5 right-12 space-y-0.5 text-white">
                                <h3 className="text-lg md:text-xl font-black tracking-tight leading-tight line-clamp-1">{recipe.title}</h3>
                                <p className="text-[10px] text-orange-200">
                                  Toque para {isExpanded ? 'recolher receita' : 'ver modo de preparo completo'}
                                </p>
                              </div>
                            </div>

                            {/* Macros Bento Panel (Always visible for quick glance) */}
                            <div className="grid grid-cols-4 gap-1.5 bg-slate-50 dark:bg-slate-800/30 p-3 border-b border-slate-50 dark:border-slate-800">
                              <div className="text-center py-1.5 px-1 rounded-xl bg-white dark:bg-slate-900 shadow-sm">
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Calorias</p>
                                <p className="text-[11px] md:text-xs font-black text-slate-800 dark:text-white mt-0.5">{recipe.calories} kcal</p>
                              </div>
                              <div className="text-center py-1.5 px-1 rounded-xl bg-white dark:bg-slate-900 shadow-sm border-b-2 border-purple-500">
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider text-purple-500">Proteínas</p>
                                <p className="text-[11px] md:text-xs font-black text-purple-600 dark:text-purple-400 mt-0.5">{recipe.protein}g</p>
                              </div>
                              <div className="text-center py-1.5 px-1 rounded-xl bg-white dark:bg-slate-900 shadow-sm border-b-2 border-cyan-500">
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider text-cyan-500">Carbos</p>
                                <p className="text-[11px] md:text-xs font-black text-cyan-600 dark:text-cyan-400 mt-0.5">{recipe.carbs}g</p>
                              </div>
                              <div className="text-center py-1.5 px-1 rounded-xl bg-white dark:bg-slate-900 shadow-sm border-b-2 border-amber-500">
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider text-amber-500">Gorduras</p>
                                <p className="text-[11px] md:text-xs font-black text-amber-600 dark:text-amber-400 mt-0.5">{recipe.fat}g</p>
                              </div>
                            </div>

                            {/* Collapsible details drawer */}
                            <AnimatePresence initial={false}>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden transition-all duration-300"
                                >
                                  <div className="p-5 md:p-6 space-y-5 border-t border-slate-50 dark:border-slate-800">
                                    
                                    {/* 1. Ingredients list */}
                                    <div className="space-y-2">
                                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1">
                                        <Utensils size={12} className="text-orange-500" /> Ingredientes Necessários
                                      </h4>
                                      <p className="text-[10px] text-slate-400">Marque o que já separou:</p>
                                      
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
                                        {recipe.ingredients.map((ing, idx) => {
                                          const isChecked = checkedRecipeIngredients[recipe.id || '']?.[idx] || false;
                                          return (
                                            <div
                                              key={idx}
                                              onClick={() => recipe.id && handleIngredientsTick(recipe.id, idx)}
                                              className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2 text-left ${
                                                isChecked
                                                  ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 line-through text-slate-400'
                                                  : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-orange-100'
                                              }`}
                                            >
                                              <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 border ${
                                                isChecked
                                                  ? 'bg-orange-500 border-orange-500 text-white'
                                                  : 'border-slate-300'
                                              }`}>
                                                {isChecked && <CheckCircle size={8} />}
                                              </span>
                                              <span className="text-[11px] font-semibold leading-tight">{ing}</span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>

                                    {/* 2. Style preparation steps */}
                                    <div className="space-y-3 pt-3 border-t border-slate-50 dark:border-slate-800">
                                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1">
                                        <BookOpen size={12} className="text-orange-500" /> Modo de Preparo Inteligente
                                      </h4>

                                      <div className="space-y-2">
                                        {recipe.instructions.map((step, idx) => (
                                          <div key={idx} className="flex gap-3 p-2 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 rounded-xl transition-all text-left">
                                            <span className="w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                                              {idx + 1}
                                            </span>
                                            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">
                                              {step}
                                            </p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    {/* 3. Nutrition advantages */}
                                    {recipe.nutritionBenefits && (
                                      <div className="bg-orange-50/50 dark:bg-orange-950/15 border border-orange-200/40 dark:border-orange-850/30 rounded-2xl p-4 mt-3 space-y-1 text-left">
                                        <h4 className="text-[9px] font-black text-orange-700 dark:text-orange-400 uppercase tracking-wider flex items-center gap-1">
                                          <Award size={12} className="animate-pulse" /> Dica de Performance do Chef
                                        </h4>
                                        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">
                                          {recipe.nutritionBenefits}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      )}
    </div>
  );
};
