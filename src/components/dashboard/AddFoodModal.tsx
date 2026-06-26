import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, Mic, Camera, Trash2, Send, Pause, Play, Loader2, Check, Plus, Coins, Sparkles, ArrowRight, Pencil } from 'lucide-react';
import { Food, Profile } from '../../types';
import { db, isFirebaseConfigured, handleFirestoreError, OperationType } from '../../lib/firebase';
import { collection, doc, setDoc, updateDoc } from 'firebase/firestore';
import { analyzeFoodInput } from '../../services/aiService';
import { searchFoodsApi } from '../../services/apis-db';
import { FALLBACK_FOODS, getApiUrl, formatFoodName } from '../../utils';

interface AddFoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  mealName: string;
  mealId: string;
  onAddFood: (input: string) => void;
  isAnalyzing: boolean;
  updateXP: (amount: number) => void;
  fetchLogs: () => void;
  user: any;
  profile: Profile | null;
  setProfile: React.Dispatch<React.SetStateAction<Profile | null>>;
  setActiveTab: (tab: any) => void;
}

const SoundwaveVisualizer = ({ isPaused }: { isPaused: boolean }) => {
  return (
    <div className="flex items-center gap-1.5 justify-center h-10 my-3">
      {[...Array(9)].map((_, i) => (
        <motion.div
          key={i}
          animate={isPaused ? { height: 6 } : {
            height: [10, i % 2 === 0 ? 34 : 22, 10],
          }}
          transition={isPaused ? {} : {
            duration: 0.5 + (i % 3) * 0.1,
            repeat: Infinity,
            repeatType: "reverse",
            delay: i * 0.05,
            ease: "easeInOut"
          }}
          className="w-1.5 bg-gradient-to-t from-purple-500 via-fuchsia-500 to-pink-500 rounded-full"
        />
      ))}
    </div>
  );
};

const units = ["gramas", "unidade", "colher de sopa", "fatia", "copo", "mililitros", "colher de arroz", "concha"];

function mapToStandardUnit(unitStr: string): string {
  const u = (unitStr || '').toLowerCase().trim();
  if (u.includes('grama')) return 'gramas';
  if (u.includes('ml') || u.includes('mililitro')) return 'mililitros';
  if (u.includes('fatia')) return 'fatia';
  if (u.includes('sopa')) return 'colher de sopa';
  if (u.includes('servir') || u.includes('arroz')) return 'colher de arroz';
  if (u.includes('concha')) return 'concha';
  if (u.includes('copo') || u.includes('xícara')) return 'copo';
  if (u.includes('unidade') || u.includes('filé') || u.includes('bife') || u.includes('posta') || u.includes('lata') || u.includes('pote') || u.includes('scoop') || u.includes('quadrado') || u.includes('espiga')) {
    return 'unidade';
  }
  return 'gramas';
}

function getGramsForUnit(unit: string, pendingFood: any): number {
  const normUnit = (unit || "").toLowerCase().trim();
  const foodUnit = (pendingFood.measure_unit || "").toLowerCase().trim();
  
  if (normUnit === "unidade" && (foodUnit === "unidade" || foodUnit.includes("unidade") || foodUnit.includes("filé") || foodUnit.includes("bife") || foodUnit.includes("posta") || foodUnit.includes("lata") || foodUnit.includes("pote") || foodUnit.includes("scoop") || foodUnit.includes("quadrado") || foodUnit.includes("espiga"))) {
    return pendingFood.grams_per_unit || 50;
  }
  
  if (normUnit === "fatia" && foodUnit.includes("fatia")) {
    return pendingFood.grams_per_unit || 25;
  }
  
  if ((normUnit === "colher de sopa" || normUnit === "colher de arroz") && (foodUnit.includes("colher") || foodUnit.includes("servir"))) {
    return pendingFood.grams_per_unit || 15;
  }
  
  if (normUnit === "concha" && foodUnit.includes("concha")) {
    return pendingFood.grams_per_unit || 100;
  }

  if (normUnit === "copo" && (foodUnit.includes("copo") || foodUnit.includes("xícara"))) {
    return pendingFood.grams_per_unit || 200;
  }

  switch (normUnit) {
    case "gramas":
    case "mililitros":
      return 1;
    case "unidade":
      return pendingFood.grams_per_unit || 50;
    case "colher de sopa":
      return 15;
    case "fatia":
      return 25;
    case "copo":
      return 200;
    case "colher de arroz":
      return 25;
    case "concha":
      return 100;
    default:
      return pendingFood.grams_per_unit || 100;
  }
}

function getBasePortionWeight(pendingFood: any): number {
  const portionStr = (pendingFood.portion || "100g").toLowerCase().trim();
  if (portionStr.includes("100g") || portionStr.includes("100ml")) {
    return 100;
  }
  const matchGrams = portionStr.match(/(\d+)\s*(g|ml)/);
  if (matchGrams) {
    return parseFloat(matchGrams[1]);
  }
  if (portionStr.includes("unidade") || portionStr.includes("filé") || portionStr.includes("bife") || portionStr.includes("fatia") || portionStr.includes("scoop")) {
    return pendingFood.grams_per_unit || 100;
  }
  return 100;
}

export const AddFoodModal: React.FC<AddFoodModalProps> = ({
  isOpen,
  onClose,
  mealName,
  mealId,
  onAddFood,
  isAnalyzing,
  updateXP,
  fetchLogs,
  user,
  profile,
  setProfile,
  setActiveTab
}) => {
  const [foodInput, setFoodInput] = useState('');
  const [activeMealId, setActiveMealId] = useState<string>(mealId || '');

  const getSuggestedMealIdByTime = (): string => {
    const now = new Date();
    const hour = now.getHours();
    const minutes = now.getMinutes();
    const totalMinutes = hour * 60 + minutes;

    // Das 05:00 às 10:00: Café da Manhã
    if (totalMinutes >= 300 && totalMinutes < 600) return 'cafe';
    // Das 10:00 às 12:00: Lanche da Manhã
    if (totalMinutes >= 600 && totalMinutes < 720) return 'lanche_manha';
    // Das 12:00 às 14:30: Almoço
    if (totalMinutes >= 720 && totalMinutes < 870) return 'almoco';
    // Das 14:30 às 18:00: Lanche da Tarde
    if (totalMinutes >= 870 && totalMinutes < 1080) return 'lanche_tarde';
    // Das 18:00 às 21:30: Jantar
    if (totalMinutes >= 1080 && totalMinutes < 1290) return 'jantar';
    // Das 21:30 às 04:59: Ceia
    return 'ceia';
  };

  useEffect(() => {
    if (isOpen) {
      if (mealId) {
        setActiveMealId(mealId);
      } else {
        const suggested = getSuggestedMealIdByTime();
        setActiveMealId(suggested);
      }
    }
  }, [isOpen, mealId]);
  const [searchResults, setSearchResults] = useState<Food[]>([]);
  const [pendingFood, setPendingFood] = useState<{ 
    name: string; 
    amount: number | string; 
    unit?: string; 
    calories?: number; 
    protein?: number; 
    carbs?: number; 
    fat?: number;
    grams_per_unit?: number;
    measure_unit?: string;
    portion?: string;
  } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [registrationMethod, setRegistrationMethod] = useState<'chat' | 'audio' | 'photo'>('chat');
  const [isSearching, setIsSearching] = useState(false);
  const [isAnalyzingLocal, setIsAnalyzingLocal] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Analisando sua refeição...');
  const [audioSuccess, setAudioSuccess] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [editingFoodId, setEditingFoodId] = useState<string | null>(null);
  const [bulkEditSearchQuery, setBulkEditSearchQuery] = useState('');
  const [bulkEditSearchResults, setBulkEditSearchResults] = useState<Food[]>([]);
  const [isSearchingBulkEdit, setIsSearchingBulkEdit] = useState(false);

  useEffect(() => {
    if (!bulkEditSearchQuery || bulkEditSearchQuery.length < 2) {
      setBulkEditSearchResults([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setIsSearchingBulkEdit(true);
      try {
        const results = await searchFoodsApi(bulkEditSearchQuery);
        setBulkEditSearchResults(results);
      } catch (err) {
        console.error("Error bulk editing search:", err);
      } finally {
        setIsSearchingBulkEdit(false);
      }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [bulkEditSearchQuery]);

  const handleSelectNewFoodForBulk = (foodId: string, selected: Food) => {
    setBulkFoods(prev => prev.map(f => {
      if (f.id === foodId) {
        return {
          ...f,
          name: typeof selected.name === 'string' && selected.name.endsWith(' (OFF-Web)') 
            ? selected.name.replace(' (OFF-Web)', '') 
            : selected.name,
          calories_per_100: selected.calories,
          protein_per_100: selected.protein,
          carbs_per_100: selected.carbs,
          fat_per_100: selected.fat,
          grams_per_unit: selected.grams_per_unit || 100,
          unit: selected.measure_unit || f.unit,
          confidence_explanation: `Ajustado manualmente para "${selected.name}".`
        };
      }
      return f;
    }));
    setEditingFoodId(null);
    setBulkEditSearchQuery('');
    setBulkEditSearchResults([]);
  };
  const [photoOptionOpen, setPhotoOptionOpen] = useState(false);
  const [spokenText, setSpokenText] = useState('');
  const [showPremiumPrompt, setShowPremiumPrompt] = useState(false);
  const [buyingPass, setBuyingPass] = useState(false);
  const [recentFoods, setRecentFoods] = useState<string[]>([]);
  const [bulkFoods, setBulkFoods] = useState<{
    id: string;
    name: string;
    amount: number | string;
    unit: string;
    grams_per_unit: number;
    calories_per_100: number;
    protein_per_100: number;
    carbs_per_100: number;
    fat_per_100: number;
    confidence_explanation: string;
    checked: boolean;
  }[]>([]);

  const checkPremiumAccess = (actionFn: () => void) => {
    const active = profile?.premium_access_until 
      ? (profile.premium_access_until === 'unlimited' || new Date(profile.premium_access_until).getTime() > Date.now())
      : false;
    
    if (active) {
      actionFn();
    } else {
      setShowPremiumPrompt(true);
    }
  };

  const handleBuyPassInline = async () => {
    if (!profile) return;
    if ((profile?.xp || 0) < 100) {
      alert('Seu saldo de NutriCoins é insuficiente! Você pode acumular batendo suas metas ou assinar o Premium Ilimitado na Loja.');
      return;
    }
    setBuyingPass(true);
    try {
      const finalCoins = (profile.xp || 0) - 100;
      const passUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const updated = {
        ...profile,
        xp: finalCoins,
        premium_access_until: passUntil
      };
      if (isFirebaseConfigured) {
        await updateDoc(doc(db, 'profiles', user.uid), {
          xp: finalCoins,
          premium_access_until: passUntil
        });
      }
      setProfile(updated);
      setShowPremiumPrompt(false);
      alert('Passe de 24h ativado com sucesso! 🌟');
    } catch (e) {
      console.error(e);
    } finally {
      setBuyingPass(false);
    }
  };

  const spokenTextRef = useRef('');
  const isRecordingRef = useRef(false);
  const isPausedRef = useRef(false);

  useEffect(() => {
    spokenTextRef.current = spokenText;
  }, [spokenText]);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  const recognitionRef = useRef<any>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const loadRecentFoods = () => {
    const userId = user?.uid || 'guest';
    const cachedTypedKey = `recent_typed_foods_${userId}`;
    const allLogsKey = `all_food_logs_${userId}`;
    
    let typedList: string[] = [];
    try {
      const stored = localStorage.getItem(cachedTypedKey);
      if (stored) {
        typedList = JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Error reading typed foods cache:", e);
    }

    let allLogsList: string[] = [];
    try {
      const stored = localStorage.getItem(allLogsKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const sorted = [...parsed].sort((a, b) => {
            const dateA = a.logged_at ? new Date(a.logged_at).getTime() : 0;
            const dateB = b.logged_at ? new Date(b.logged_at).getTime() : 0;
            return dateB - dateA;
          });
          allLogsList = sorted.map(log => log.food_name).filter(Boolean);
        }
      }
    } catch (e) {
      console.warn("Error reading all food logs cache:", e);
    }

    const defaults = [
      'Arroz Branco', 'Frango Grelhado', 'Ovo Cozido', 'Banana', 
      'Whey Protein', 'Aveia em Flocos', 'Feijão Carioca', 'Filé de Tilápia', 
      'Maçã', 'Pão Integral', 'Queijo Minas', 'Leite Integral', 
      'Iogurte Natural', 'Pasta de Amendoim', 'Batata Doce'
    ];

    const combined: string[] = [];
    const seen = new Set<string>();

    const addUnique = (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const key = trimmed.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        combined.push(trimmed);
      }
    };

    typedList.forEach(addUnique);
    allLogsList.forEach(addUnique);
    defaults.forEach(addUnique);

    setRecentFoods(combined.slice(0, 15));
  };

  const saveRecentTypedFood = (foodName: string) => {
    const userId = user?.uid || 'guest';
    const cachedTypedKey = `recent_typed_foods_${userId}`;
    let typedList: string[] = [];
    try {
      const stored = localStorage.getItem(cachedTypedKey);
      if (stored) {
        typedList = JSON.parse(stored);
      }
    } catch (e) {}
    
    typedList = typedList.filter(name => name.trim().toLowerCase() !== foodName.trim().toLowerCase());
    typedList.unshift(foodName.trim());
    typedList = typedList.slice(0, 30);
    
    try {
      localStorage.setItem(cachedTypedKey, JSON.stringify(typedList));
    } catch (e) {}
  };

  useEffect(() => {
    if (isOpen) {
      loadRecentFoods();
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (!isOpen) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
        recognitionRef.current = null;
      }
      setIsRecording(false);
      setIsPaused(false);
      setFoodInput('');
      setSearchResults([]);
      setPendingFood(null);
      setSpokenText('');
      setPhotoOptionOpen(false);
      setBulkFoods([]);
    }
  }, [isOpen]);

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Seu navegador não suporta reconhecimento de voz.");
      return;
    }
    
    setIsRecording(true);
    setIsPaused(false);
    setSpokenText('');
    setAudioError(null);
    setAudioSuccess(false);

    try {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'pt-BR';
      
      rec.onresult = (event: any) => {
        let text = "";
        for (let i = 0; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript.trim();
          if (!transcript) continue;
          
          if (text === "") {
            text = transcript;
          } else {
            const cleanText = text.replace(/\s+/g, "").toLowerCase();
            const cleanTranscript = transcript.replace(/\s+/g, "").toLowerCase();
            
            if (cleanTranscript.startsWith(cleanText)) {
              text = transcript;
            } else if (cleanText.includes(cleanTranscript)) {
              // Já está contido, não faz nada
            } else {
              text += " " + transcript;
            }
          }
        }
        
        const combined = text.trim();
        if (combined) {
          setSpokenText(combined);
        }
      };

      rec.onerror = (e: any) => {
        console.error("Speech recognition error:", e);
        let errorMsg = "Nenhum áudio foi detectado.";
        if (e.error === 'not-allowed') {
          errorMsg = "Permissão para usar o microfone foi recusada. Verifique as configurações de privacidade do seu navegador.";
        } else if (e.error === 'no-speech') {
          errorMsg = "Nenhum áudio foi detectado. Fale com clareza e próximo ao microfone.";
        } else if (e.error === 'network') {
          errorMsg = "Erro de conexão de rede durante o processamento da voz.";
        }
        
        setAudioError(errorMsg);
        setIsRecording(false);
        setIsPaused(false);
        recognitionRef.current = null;
      };

      rec.onend = () => {
        if (isRecordingRef.current && !isPausedRef.current) {
          const text = spokenTextRef.current.trim();
          setIsRecording(false);
          setIsPaused(false);
          recognitionRef.current = null;
          if (text) {
            setAudioSuccess(true);
            setLoadingMessage(`Processando áudio: "${text}"...`);
            setTimeout(() => {
              setAudioSuccess(false);
              handleManualAdd(text, 'audio');
            }, 1200);
          } else {
            setAudioError("Nenhum áudio foi detectado ou processado. Fale com clareza e próximo de seu microfone.");
          }
        }
      };

      rec.start();
      recognitionRef.current = rec;
    } catch (err) {
      console.error("Speech recognition start failed:", err);
    }
  };

  const togglePauseListening = () => {
    if (!recognitionRef.current) return;
    if (isPaused) {
      // Resume
      try {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'pt-BR';
        const previousText = spokenText;
        
        rec.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';
          for (let i = 0; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }
          const combined = finalTranscript + interimTranscript;
          if (combined.trim()) {
            setSpokenText(previousText ? previousText + " " + combined.trim() : combined.trim());
          }
        };

        rec.onerror = (e: any) => {
          console.error("Speech recognition error during resume:", e);
          let errorMsg = "Nenhum áudio foi detectado.";
          if (e.error === 'not-allowed') {
            errorMsg = "Permissão para usar o microfone foi recusada.";
          } else if (e.error === 'no-speech') {
            errorMsg = "Nenhum áudio foi detectado. Fale com clareza.";
          }
          setAudioError(errorMsg);
          setIsRecording(false);
          setIsPaused(false);
          recognitionRef.current = null;
        };

        rec.onend = () => {
          if (isRecordingRef.current && !isPausedRef.current) {
            const text = spokenTextRef.current.trim();
            setIsRecording(false);
            setIsPaused(false);
            recognitionRef.current = null;
            if (text) {
              setAudioSuccess(true);
              setLoadingMessage(`Processando áudio: "${text}"...`);
              setTimeout(() => {
                setAudioSuccess(false);
                handleManualAdd(text, 'audio');
              }, 1200);
            } else {
              setAudioError("Nenhum áudio foi detectado ou processado.");
            }
          }
        };

        rec.start();
        recognitionRef.current = rec;
        setIsPaused(false);
      } catch (err) {
        console.error(err);
      }
    } else {
      // Pause
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error(err);
      }
      setIsPaused(true);
    }
  };

  const stopListening = (shouldAdd: boolean) => {
    const text = spokenTextRef.current.trim();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error(err);
      }
      recognitionRef.current = null;
    }
    setIsRecording(false);
    setIsPaused(false);
    
    if (shouldAdd) {
      if (text) {
        setAudioSuccess(true);
        setLoadingMessage(`Processando áudio: "${text}"...`);
        setTimeout(() => {
          setAudioSuccess(false);
          handleManualAdd(text, 'audio');
        }, 1200);
      } else {
        setAudioError("Não conseguimos captar nenhuma fala. Tente falar claramente e mais próximo ao microfone.");
      }
    } else {
      setSpokenText('');
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoOptionOpen(false);
    setRegistrationMethod('photo');
    setLoadingMessage('Buscando alimento na foto... Estimando porções e nutrientes...');
    setIsAnalyzingLocal(true);

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64Data = (reader.result as string).split(',')[1];
        const result = await analyzeFoodInput({
          data: base64Data,
          mimeType: file.type
        });
        
        if (result && result.foods && result.foods.length > 0) {
          const mapped = result.foods.map((food, i) => ({
            id: String(i) + '-' + Math.random().toString(36).substring(2, 5),
            name: food.food_name,
            amount: food.amount,
            unit: mapToStandardUnit(food.unit),
            grams_per_unit: food.grams_per_unit,
            calories_per_100: food.calories_per_100,
            protein_per_100: food.protein_per_100,
            carbs_per_100: food.carbs_per_100,
            fat_per_100: food.fat_per_100,
            confidence_explanation: food.confidence_explanation,
            checked: true
          }));
          setBulkFoods(mapped);
          setPendingFood(null);
        } else {
          alert("Alimentos não identificados com nitidez na foto. Tente tirar a foto com mais luz e de perto.");
        }
      } catch (err) {
        console.error("Error analyzing image:", err);
      } finally {
        setIsAnalyzingLocal(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  useEffect(() => {
    const searchFoods = async () => {
      if (!foodInput || foodInput.length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const data = await searchFoodsApi(foodInput);
        setSearchResults(data);
      } catch (err) {
        console.error('Erro ao buscar alimentos, tentando localmente:', err);
        const normTerm = foodInput.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const fallbackResults = FALLBACK_FOODS.filter(f => {
          const normName = (f.name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          return normName.includes(normTerm);
        });
        setSearchResults(fallbackResults);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchFoods, 300);
    return () => clearTimeout(debounce);
  }, [foodInput]);

  const handleSelectFood = (food: Food) => {
    const standardUnit = mapToStandardUnit(food.measure_unit);
    const defaultAmount = (standardUnit === 'gramas' || standardUnit === 'mililitros') ? 100 : 1;
    setPendingFood({ 
      name: food.name, 
      amount: defaultAmount,
      unit: standardUnit,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      grams_per_unit: food.grams_per_unit,
      measure_unit: food.measure_unit,
      portion: food.portion
    });
    setSearchResults([]);
    setFoodInput('');
  };

  const handleManualAdd = async (input: string, method: 'chat' | 'audio' | 'photo' = 'chat') => {
    if (!input) return;
    setRegistrationMethod(method);

    // Check if user has active premium or active 24h pass
    const active = profile?.premium_access_until 
      ? (profile.premium_access_until === 'unlimited' || new Date(profile.premium_access_until).getTime() > Date.now())
      : false;

    if (!active) {
      setShowPremiumPrompt(true);
      return;
    }

    setLoadingMessage(prev => prev.startsWith('Processando áudio') ? prev : `Analisando "${input}"...`);
    setIsAnalyzingLocal(true);
    try {
      // Analyze and populate bulk review items to allow editing multiple logged items at once
      const result = await analyzeFoodInput(input);
      if (result && result.foods && result.foods.length > 0) {
        const mapped = result.foods.map((food, i) => ({
          id: String(i) + '-' + Math.random().toString(36).substring(2, 5),
          name: food.food_name,
          amount: food.amount,
          unit: mapToStandardUnit(food.unit),
          grams_per_unit: food.grams_per_unit,
          calories_per_100: food.calories_per_100,
          protein_per_100: food.protein_per_100,
          carbs_per_100: food.carbs_per_100,
          fat_per_100: food.fat_per_100,
          confidence_explanation: food.confidence_explanation,
          checked: true
        }));
        setBulkFoods(mapped);
        setPendingFood(null);
        setFoodInput('');
        setSearchResults([]);
      } else {
        alert("Não conseguimos compreender a descrição. Tente descrever os alimentos de forma clara.");
      }
    } catch (err) {
      console.error('Error analyzing food:', err);
    } finally {
      setIsAnalyzingLocal(false);
    }
  };

  const handleConfirmAdd = async () => {
    if (!pendingFood) return;
    
    const amtNum = parseFloat(String(pendingFood.amount));
    if (isNaN(amtNum) || amtNum <= 0) {
      alert("Por favor, preencha a quantidade com um valor maior que zero.");
      return;
    }
    
    // Save to local typed registry
    saveRecentTypedFood(pendingFood.name);
    
    const unitGrams = getGramsForUnit(pendingFood.unit || "gramas", pendingFood);
    const totalGrams = amtNum * unitGrams;
    const baseWeight = getBasePortionWeight(pendingFood);
    const amountFactor = totalGrams / baseWeight;

    const newLog = {
      user_id: user.uid,
      meal_type: activeMealId,
      food_name: pendingFood.name,
      calories: Math.round((pendingFood.calories || 0) * amountFactor),
      protein: Math.round((pendingFood.protein || 0) * amountFactor),
      carbs: Math.round((pendingFood.carbs || 0) * amountFactor),
      fat: Math.round((pendingFood.fat || 0) * amountFactor),
      amount: pendingFood.amount,
      unit: pendingFood.unit || 'gramas',
      logged_at: new Date().toISOString(),
      added_via: registrationMethod
    };

    if (!isFirebaseConfigured) {
      // Handle local state if needed
    } else {
      try {
        const logId = Math.random().toString(36).substring(2, 15);
        const newLogFull = { id: logId, ...newLog };
        const docRef = doc(db, 'food_logs', logId);
        await setDoc(docRef, newLogFull);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `food_logs`);
      }
    }
    
    fetchLogs();
    updateXP(20);
    onClose();
  };

  const handleConfirmAddBulk = async () => {
    const checkedWithInvalidAmount = bulkFoods.some(f => {
      if (f.checked) {
        const amtNum = parseFloat(String(f.amount));
        return isNaN(amtNum) || amtNum <= 0;
      }
      return false;
    });

    if (checkedWithInvalidAmount) {
      alert("Por favor, preencha a quantidade de todos os alimentos selecionados com um valor maior que zero.");
      return;
    }

    const checkedFoods = bulkFoods.filter(f => f.checked && parseFloat(String(f.amount)) > 0);
    if (checkedFoods.length === 0) return;

    const newLogs = checkedFoods.map(food => {
      const amtVal = parseFloat(String(food.amount)) || 0;
      const unitGrams = getGramsForUnit(food.unit, { grams_per_unit: food.grams_per_unit, measure_unit: food.unit });
      const totalGrams = amtVal * unitGrams;
      const amountFactor = totalGrams / 100; // calories_per_100 is per 100g/ml

      return {
        user_id: user.uid,
        meal_type: activeMealId,
        food_name: food.name,
        calories: Math.round(food.calories_per_100 * amountFactor),
        protein: Math.round(food.protein_per_100 * amountFactor),
        carbs: Math.round(food.carbs_per_100 * amountFactor),
        fat: Math.round(food.fat_per_100 * amountFactor),
        amount: amtVal,
        unit: food.unit,
        logged_at: new Date().toISOString(),
        added_via: registrationMethod
      };
    });

    if (isFirebaseConfigured) {
      try {
        const promises = newLogs.map(async log => {
          const logId = Math.random().toString(36).substring(2, 15);
          const docRef = doc(db, 'food_logs', logId);
          await setDoc(docRef, { id: logId, ...log });
        });
        await Promise.all(promises);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `food_logs`);
      }
    }

    // Save recent logged food names
    checkedFoods.forEach(food => saveRecentTypedFood(food.name));

    fetchLogs();
    updateXP(20 * checkedFoods.length);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden"
          >
            <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X size={24} />
            </button>

            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Adicionar Alimento</h2>

            {/* Meal Selector Pills */}
            <div className="mb-6">
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-wider">
                Refeição de Destino
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'cafe', name: 'Café', icon: '🍳' },
                  { id: 'lanche_manha', name: 'Lanche Manhã', icon: '🍎' },
                  { id: 'almoco', name: 'Almoço', icon: '🍲' },
                  { id: 'lanche_tarde', name: 'Lanche Tarde', icon: '🥪' },
                  { id: 'jantar', name: 'Jantar', icon: '🥗' },
                  { id: 'ceia', name: 'Ceia', icon: '🥛' }
                ].map((m) => {
                  const isSuggested = m.id === getSuggestedMealIdByTime();
                  const isSelected = m.id === activeMealId;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setActiveMealId(m.id)}
                      className={`relative flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        isSelected
                          ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <span>{m.icon}</span>
                      <span>{m.name}</span>
                      {isSuggested && (
                        <span className={`text-[8px] px-1 py-0.2 rounded ${
                          isSelected 
                            ? 'bg-purple-800 text-purple-100' 
                            : 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-extrabold border border-amber-200/30'
                        }`}>
                          Sugerido
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-6">
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Search size={20} />
                </div>
                <input 
                  type="text"
                  placeholder="Busque um alimento ou digite o que comeu..."
                  value={foodInput}
                  onChange={(e) => setFoodInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleManualAdd(foodInput);
                    }
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 pl-12 pr-12 text-sm focus:ring-2 focus:ring-purple-500 transition-all dark:text-white"
                />
                <button 
                  onClick={() => handleManualAdd(foodInput)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-500 hover:text-purple-600"
                >
                  <Send size={20} />
                </button>

                <AnimatePresence>
                  {(searchResults.length > 0 || (foodInput.length >= 2 && !isSearching)) && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 z-10 max-h-64 overflow-y-auto"
                    >
                      {searchResults.length > 0 ? (
                        searchResults.map(food => (
                          <button
                            key={food.id}
                            onClick={() => handleSelectFood(food)}
                            className="w-full p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center justify-between border-b border-slate-50 dark:border-slate-700 last:border-0"
                          >
                            <div>
                              <div className="font-bold dark:text-white">{formatFoodName(food.name)}</div>
                              <div className="text-xs text-slate-400">{food.calories} kcal / 100g</div>
                            </div>
                            <Plus size={16} className="text-purple-500" />
                          </button>
                        ))
                      ) : foodInput.length >= 2 && !isSearching && (
                        <div className="p-4 text-center text-sm text-slate-500 italic">
                          nenhum alimento encontrado
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {bulkFoods.length > 0 ? (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-purple-50/50 dark:bg-purple-950/10 p-5 rounded-3xl space-y-4 border border-purple-100/50 dark:border-purple-900/30 max-h-[380px] overflow-y-auto no-scrollbar"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-purple-900 dark:text-purple-100 text-sm flex items-center gap-1.5">
                      <Sparkles size={16} className="text-amber-500 animate-pulse" /> Recompondo Refeição (IA)
                    </h4>
                    <button 
                      onClick={() => setBulkFoods([])} 
                      className="text-purple-400 hover:text-purple-650 dark:hover:text-purple-300 text-xs font-bold"
                    >
                      Limpar
                    </button>
                  </div>

                  <div className="space-y-3">
                    {bulkFoods.map((food, idx) => {
                      const amtVal = parseFloat(String(food.amount)) || 0;
                      const unitGrams = getGramsForUnit(food.unit, { grams_per_unit: food.grams_per_unit, measure_unit: food.unit });
                      const totalGrams = amtVal * unitGrams;
                      const factor = totalGrams / 100;
                      const currentCalories = Math.round(food.calories_per_100 * factor);

                      return (
                        <div key={food.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-750 space-y-3">
                          <div className="flex items-start gap-2 justify-between">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <input 
                                type="checkbox"
                                checked={food.checked}
                                onChange={(e) => {
                                  setBulkFoods(prev => prev.map(f => f.id === food.id ? {...f, checked: e.target.checked} : f));
                                }}
                                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300 dark:border-slate-600 dark:bg-slate-705 cursor-pointer accent-purple-600 font-bold shrink-0"
                              />
                              {editingFoodId === food.id ? (
                                <div className="flex flex-col gap-1.5 w-full mt-1">
                                  <div className="flex gap-1 items-center">
                                    <input 
                                      type="text"
                                      value={bulkEditSearchQuery}
                                      onChange={(e) => setBulkEditSearchQuery(e.target.value)}
                                      placeholder="Buscar correspondência..."
                                      className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500 min-w-0"
                                      autoFocus
                                    />
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        setEditingFoodId(null);
                                        setBulkEditSearchQuery('');
                                        setBulkEditSearchResults([]);
                                      }}
                                      className="p-1 px-2 text-[10px] bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-lg text-slate-500 dark:text-slate-300 font-bold shrink-0"
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                  
                                  {/* Dropdown de Resultados de Busca Inline */}
                                  <div className="max-h-32 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl mt-1 shadow-lg divide-y divide-slate-50 dark:divide-slate-850 z-10">
                                    {isSearchingBulkEdit ? (
                                      <div className="p-2 text-center text-[10px] text-slate-400 font-medium flex items-center justify-center gap-1">
                                        <Loader2 size={12} className="animate-spin text-purple-500" /> Buscando...
                                      </div>
                                    ) : bulkEditSearchResults.length > 0 ? (
                                      bulkEditSearchResults.map(resFood => (
                                        <button
                                          key={resFood.id}
                                          type="button"
                                          onClick={() => handleSelectNewFoodForBulk(food.id, resFood)}
                                          className="w-full text-left p-2 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors flex items-center justify-between gap-2"
                                        >
                                          <div className="text-[11px] font-bold truncate pr-1 text-slate-700 dark:text-slate-200">
                                            {formatFoodName(resFood.name)}
                                          </div>
                                          <div className="text-[10px] text-purple-600 dark:text-purple-400 shrink-0 font-extrabold whitespace-nowrap">
                                            {resFood.calories} kcal/100g
                                          </div>
                                        </button>
                                      ))
                                    ) : bulkEditSearchQuery.length >= 2 ? (
                                      <div className="p-2 text-center text-[10px] text-slate-400 font-medium">
                                        Nenhum alimento encontrado.
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between gap-1.5 flex-1 min-w-0">
                                  <span className={`text-xs font-extrabold text-slate-800 dark:text-slate-200 truncate ${!food.checked ? 'line-through text-slate-400' : ''}`}>
                                    {formatFoodName(food.name)}
                                  </span>
                                  <div className="flex items-center gap-0.5 shrink-0">
                                    {food.checked && (
                                      <button 
                                        type="button"
                                        onClick={() => {
                                          setEditingFoodId(food.id);
                                          setBulkEditSearchQuery(food.name);
                                        }}
                                        className="p-1 text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 rounded hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                                        title="Editar Alimento"
                                      >
                                        <Pencil size={11} className="stroke-[2.5]" />
                                      </button>
                                    )}
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        setBulkFoods(prev => prev.filter(f => f.id !== food.id));
                                      }}
                                      className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                                      title="Excluir item"
                                    >
                                      <Trash2 size={11} className="stroke-[2.5]" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                            {editingFoodId !== food.id && (
                              <span className="text-[11px] font-black text-purple-600 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded-lg whitespace-nowrap">
                                {currentCalories} kcal
                              </span>
                            )}
                          </div>

                          {food.checked && (
                            <div className="space-y-2">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-0.5">
                                  <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Quant.</label>
                                  <input 
                                    type="number"
                                    step="any"
                                    value={food.amount === "" ? "" : food.amount}
                                    onChange={(e) => {
                                      const inputVal = e.target.value;
                                      if (inputVal === "") {
                                        setBulkFoods(prev => prev.map(f => f.id === food.id ? {...f, amount: ""} : f));
                                      } else {
                                        const val = parseFloat(inputVal);
                                        setBulkFoods(prev => prev.map(f => f.id === food.id ? {...f, amount: isNaN(val) ? "" : val} : f));
                                      }
                                    }}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-lg p-1.5 text-xs font-bold dark:text-white"
                                  />
                                </div>
                                <div className="space-y-0.5" style={{ minWidth: '100px' }}>
                                  <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Unidade</label>
                                  <select 
                                    value={food.unit}
                                    onChange={(e) => {
                                      const newUnit = e.target.value;
                                      const oldUnit = food.unit;
                                      let newAmount = food.amount;
                                      
                                      const isContinuous = (u: string) => u === 'gramas' || u === 'mililitros';
                                      
                                      if (isContinuous(oldUnit) && !isContinuous(newUnit)) {
                                        newAmount = 1;
                                      } else if (!isContinuous(oldUnit) && isContinuous(newUnit)) {
                                        const standardGrams = getGramsForUnit(oldUnit, { grams_per_unit: food.grams_per_unit, measure_unit: oldUnit });
                                        const amtF = parseFloat(String(food.amount)) || 1;
                                        newAmount = Math.round(standardGrams * amtF) || 100;
                                      }
                                      
                                      setBulkFoods(prev => prev.map(f => f.id === food.id ? {...f, unit: newUnit, amount: newAmount} : f));
                                    }}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-lg p-1.5 text-xs font-extrabold dark:text-white"
                                  >
                                    {units.map(u => <option key={u} value={u}>{u}</option>)}
                                  </select>
                                </div>
                              </div>

                              <div className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed italic bg-slate-50 dark:bg-slate-900/60 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                                💡 {food.confidence_explanation}
                              </div>

                              <div className="grid grid-cols-3 gap-1 text-[10px] text-center pt-1">
                                <div className="bg-red-50/50 dark:bg-red-950/10 p-1.5 rounded-lg">
                                  <div className="text-slate-400 dark:text-slate-500 font-medium">Proteína</div>
                                  <div className="font-extrabold text-red-600 dark:text-red-400">
                                    {Math.round(food.protein_per_100 * factor)}g
                                  </div>
                                </div>
                                <div className="bg-amber-50/50 dark:bg-amber-950/10 p-1.5 rounded-lg">
                                  <div className="text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap">Carboidrato</div>
                                  <div className="font-extrabold text-amber-600 dark:text-amber-400">
                                    {Math.round(food.carbs_per_100 * factor)}g
                                  </div>
                                </div>
                                <div className="bg-blue-50/50 dark:bg-blue-950/10 p-1.5 rounded-lg">
                                  <div className="text-slate-400 dark:text-slate-500 font-medium">Gordura</div>
                                  <div className="font-extrabold text-blue-600 dark:text-blue-400">
                                    {Math.round(food.fat_per_100 * factor)}g
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleConfirmAddBulk}
                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-extrabold rounded-2xl shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 text-sm"
                  >
                    <Check size={20} /> Registrar Tudo ({bulkFoods.filter(f => f.checked).length} itens)
                  </motion.button>
                </motion.div>
              ) : pendingFood ? (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-3xl space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-purple-900 dark:text-purple-100">{pendingFood.name}</h4>
                    <button onClick={() => setPendingFood(null)} className="text-purple-400 hover:text-purple-600">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Quantidade</label>
                      <input 
                        type="number"
                        step="any"
                        value={pendingFood.amount === "" ? "" : pendingFood.amount}
                        onChange={(e) => {
                          const inputVal = e.target.value;
                          if (inputVal === "") {
                            setPendingFood({...pendingFood, amount: ""});
                          } else {
                            const val = parseFloat(inputVal);
                            setPendingFood({...pendingFood, amount: isNaN(val) ? "" : val});
                          }
                        }}
                        className="w-full bg-white dark:bg-slate-800 border-none rounded-xl p-3 text-sm font-bold dark:text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Unidade</label>
                      <select 
                        value={pendingFood.unit}
                        onChange={(e) => {
                          const newUnit = e.target.value;
                          const oldUnit = pendingFood.unit || 'gramas';
                          let newAmount = pendingFood.amount;
                          
                          const isContinuous = (u: string) => u === 'gramas' || u === 'mililitros';
                          
                          if (isContinuous(oldUnit) && !isContinuous(newUnit)) {
                            newAmount = 1;
                          } else if (!isContinuous(oldUnit) && isContinuous(newUnit)) {
                            const standardGrams = getGramsForUnit(oldUnit, pendingFood);
                            const amtP = parseFloat(String(pendingFood.amount)) || 1;
                            newAmount = Math.round(standardGrams * amtP) || 100;
                          }
                          
                          setPendingFood({
                            ...pendingFood,
                            unit: newUnit,
                            amount: newAmount
                          });
                        }}
                        className="w-full bg-white dark:bg-slate-800 border-none rounded-xl p-3 text-sm font-bold dark:text-white appearance-none"
                      >
                        {units.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Detailed Portion Info Section */}
                  {(() => {
                    const amtP = parseFloat(String(pendingFood.amount)) || 0;
                    const unitGrams = getGramsForUnit(pendingFood.unit || "gramas", pendingFood);
                    const totalGrams = amtP * unitGrams;
                    const isLiquid = pendingFood.measure_unit === "ml" || pendingFood.unit === "mililitros";
                    const unitSymbol = isLiquid ? "ml" : "g";
                    
                    return (
                      <div className="bg-white/80 dark:bg-slate-800/80 p-3.5 rounded-2xl border border-purple-100/30 text-[11px] space-y-1.5 text-slate-500 dark:text-slate-400">
                        <div className="flex justify-between">
                          <span>Base nutricional de referência:</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">100{unitSymbol}</span>
                        </div>
                        {pendingFood.unit !== "gramas" && pendingFood.unit !== "mililitros" && (
                          <div className="flex justify-between">
                            <span>Peso de 1 {pendingFood.unit}:</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              {unitGrams}{unitSymbol}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between border-t border-slate-100 dark:border-slate-800/60 pt-1.5 font-semibold">
                          <span>Total calculado:</span>
                          <span className="font-extrabold text-purple-700 dark:text-purple-400">
                            {amtP} {pendingFood.unit} ({totalGrams.toFixed(0)}{unitSymbol})
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Real-time nutrients computation */}
                  {(() => {
                    const amtP = parseFloat(String(pendingFood.amount)) || 0;
                    const unitGrams = getGramsForUnit(pendingFood.unit || "gramas", pendingFood);
                    const totalGrams = amtP * unitGrams;
                    const baseWeight = getBasePortionWeight(pendingFood);
                    const factor = totalGrams / baseWeight;

                    return (
                      <div className="grid grid-cols-4 gap-2 bg-purple-100/40 dark:bg-slate-800/40 p-4 rounded-2xl text-center">
                        <div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">Calorias</div>
                          <div className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                            {Math.round((pendingFood.calories || 0) * factor)} kcal
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-red-500">Proteínas</div>
                          <div className="text-xs font-extrabold text-red-600 dark:text-red-400">
                            {Math.round((pendingFood.protein || 0) * factor)}g
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-amber-500">Carbos</div>
                          <div className="text-xs font-extrabold text-amber-600 dark:text-amber-400">
                            {Math.round((pendingFood.carbs || 0) * factor)}g
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-blue-500">Gorduras</div>
                          <div className="text-xs font-extrabold text-blue-600 dark:text-blue-400">
                            {Math.round((pendingFood.fat || 0) * factor)}g
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleConfirmAdd}
                    className="w-full py-4 bg-purple-cyan text-white font-bold rounded-2xl shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
                  >
                    <Check size={20} /> Confirmar Adição
                  </motion.button>
                </motion.div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {/* Hidden inputs for Camera and Gallery */}
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment" 
                    ref={cameraInputRef} 
                    onChange={handleImageChange} 
                    className="hidden" 
                  />
                  <input 
                    type="file" 
                    accept="image/*" 
                    ref={galleryInputRef} 
                    onChange={handleImageChange} 
                    className="hidden" 
                  />

                  <motion.div 
                    whileHover={!isRecording ? { scale: 1.05 } : {}}
                    whileTap={!isRecording ? { scale: 0.95 } : {}}
                    onClick={() => !isRecording && checkPremiumAccess(() => startListening())}
                    className={`flex flex-col items-center justify-center gap-3 p-6 rounded-3xl border-2 border-dashed transition-all relative ${isRecording ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40 text-red-500 w-full col-span-2' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-purple-300 hover:text-purple-500 cursor-pointer'}`}
                  >
                    {isRecording ? (
                      <div className="flex flex-col items-center gap-2 w-full">
                        <div className="flex items-center gap-2">
                          <motion.div 
                            animate={isPaused ? {} : { scale: [1, 1.2, 1] }}
                            transition={{ repeat: Infinity, duration: 1 }}
                            className="w-3 h-3 bg-red-500 rounded-full animate-pulse"
                          />
                          <span className="font-bold text-sm text-slate-700 dark:text-slate-300">{isPaused ? 'Pausado' : 'Gravando...'}</span>
                        </div>
                        
                        <SoundwaveVisualizer isPaused={isPaused} />

                        {spokenText && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 max-h-12 overflow-y-auto text-center px-1 italic w-full font-medium">
                            "{spokenText}"
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); togglePauseListening(); }}
                            className="p-2.5 bg-white dark:bg-slate-700 rounded-full shadow-md text-slate-600 dark:text-slate-200 hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                          >
                            {isPaused ? <Play size={16} /> : <Pause size={16} />}
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); stopListening(false); }}
                            className="p-2.5 bg-white dark:bg-slate-700 rounded-full shadow-md text-red-500 hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                          >
                            <Trash2 size={16} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); stopListening(true); }}
                            className="p-2.5 bg-purple-500 rounded-full shadow-md text-white hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                          >
                            <Send size={16} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Mic size={32} />
                        <span className="text-xs font-bold uppercase tracking-wider">Gravar Áudio</span>
                      </>
                    )}
                  </motion.div>

                  <motion.button 
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => checkPremiumAccess(() => setPhotoOptionOpen(true))}
                    className="flex flex-col items-center justify-center gap-3 p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 hover:border-purple-300 hover:text-purple-500 transition-all cursor-pointer"
                  >
                    <Camera size={32} />
                    <span className="text-xs font-bold uppercase tracking-wider">Foto</span>
                  </motion.button>
                </div>
              )}

              <div id="modal-missions-container" className="space-y-3 bg-purple-50/20 dark:bg-purple-950/10 p-4 rounded-3xl border border-purple-50 dark:border-purple-950/20">
                <div className="flex items-center gap-1.5 text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest mb-1">
                  <Sparkles size={12} className="animate-pulse" />
                  <span>Missões Diárias de Hoje</span>
                </div>
                <div className="space-y-2">
                  {(() => {
                    const getDaySeed = (dateStr: string) => {
                      let hash = 0;
                      for (let i = 0; i < dateStr.length; i++) {
                        hash = dateStr.charCodeAt(i) + ((hash << 5) - hash);
                      }
                      return Math.abs(hash);
                    };

                    const mealTemplates = [
                      { id: 'meal_cafe', title: 'Café da Manhã de Campeão', rewardXP: 15 },
                      { id: 'meal_almoco', title: 'Almoço Nutritivo', rewardXP: 15 },
                      { id: 'meal_jantar', title: 'Jantar Consistente', rewardXP: 15 },
                      { id: 'meal_lanche_tarde', title: 'Lanche Energético', rewardXP: 15 },
                      { id: 'meal_ceia', title: 'Ceia Regenerativa', rewardXP: 15 },
                    ];

                    const healthTemplates = [
                      { id: 'health_water_goal', title: 'Hidratação Suprema', rewardXP: 15 },
                      { id: 'health_water_vol', title: 'Foco na Água', rewardXP: 15 },
                      { id: 'health_protein', title: 'Meta de Proteínas', rewardXP: 15 },
                      { id: 'health_veg', title: 'Fibra & Vitalidade', rewardXP: 15 },
                    ];

                    const workoutTemplates = [
                      { id: 'workout_log', title: 'Guerreiro de Ferro', rewardXP: 20 },
                      { id: 'workout_calories', title: 'Precisão Calórica', rewardXP: 20 },
                      { id: 'workout_fat', title: 'Gorduras sob Controle', rewardXP: 20 },
                      { id: 'workout_carbs', title: 'Combustível de Carboidratos', rewardXP: 20 },
                    ];

                    const local = new Date();
                    const offset = local.getTimezoneOffset();
                    const localDate = new Date(local.getTime() - offset * 60 * 1000);
                    const todayStr = localDate.toISOString().split('T')[0];
                    const seed = getDaySeed(todayStr);

                    const dailyMeal = mealTemplates[seed % mealTemplates.length];
                    const dailyHealth = healthTemplates[(seed + 1) % healthTemplates.length];
                    const dailyWorkout = workoutTemplates[(seed + 2) % workoutTemplates.length];

                    const claimedIds = profile?.daily_missions_today?.date === todayStr
                      ? (profile.daily_missions_today as any).claimed_ids || []
                      : [];

                    return [dailyMeal, dailyHealth, dailyWorkout].map((m) => {
                      const isClaimed = claimedIds.includes(m.id);
                      return (
                        <div 
                          key={m.id} 
                          id={`modal-mission-item-${m.id}`}
                          className="flex items-center justify-between py-1.5 px-2.5 bg-white dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800/40"
                        >
                          <div className="flex items-center gap-2">
                            {isClaimed ? (
                              <Check className="text-emerald-500" size={14} />
                            ) : (
                              <div className="w-3.5 h-3.5 rounded-full border border-slate-350 dark:border-slate-600" />
                            )}
                            <span className={`text-[11px] font-bold ${isClaimed ? 'text-slate-400 dark:text-slate-500 line-through font-medium' : 'text-slate-700 dark:text-slate-300'}`}>
                              {m.title}
                            </span>
                          </div>
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            isClaimed 
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-555' 
                              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                          }`}>
                            +{m.rewardXP} NC
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>

            {(isAnalyzing || isAnalyzingLocal) && (
              <div className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20 rounded-[2.5rem] overflow-hidden">
                <Loader2 size={48} className="text-purple-500 animate-spin mb-4" />
                <p className="font-extrabold text-slate-900 dark:text-white text-base leading-snug px-4">
                  {loadingMessage.startsWith("Processando áudio") ? "Processando Áudio" : (isAnalyzing ? "Analisando nutrientes da refeição..." : loadingMessage)}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 max-w-xs animate-pulse">
                  Nossa inteligência artificial está processando as informações...
                </p>
              </div>
            )}

            {audioSuccess && (
              <div className="absolute inset-0 bg-purple-50/98 dark:bg-purple-950/98 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20 rounded-[2.5rem] overflow-hidden">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-white dark:bg-slate-800 p-6 rounded-full shadow-lg border border-purple-100 dark:border-purple-900/10 flex items-center justify-center mb-4 text-emerald-500 dark:text-emerald-400"
                >
                  <Check size={48} className="stroke-[3]" />
                </motion.div>
                <h4 className="font-extrabold text-lg text-purple-900 dark:text-purple-150">Áudio Captado!</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 px-5 max-w-xs">
                  Sua fala foi gravada com sucesso e está sendo enviada para análise...
                </p>
              </div>
            )}

            {audioError && (
              <div className="absolute inset-0 bg-red-50/98 dark:bg-red-950/98 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20 rounded-[2.5rem] overflow-hidden">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-white dark:bg-slate-800 p-5 rounded-full shadow-lg border border-red-100 dark:border-red-900/15 flex items-center justify-center mb-4 text-red-500"
                >
                  <X size={44} className="stroke-[3]" />
                </motion.div>
                <h4 className="font-extrabold text-base text-red-900 dark:text-red-300">Falha na Captação</h4>
                <p className="text-xs text-red-600/80 dark:text-red-400 mt-2 px-5 max-w-xs font-semibold leading-relaxed">
                  {audioError}
                </p>
                <button
                  type="button"
                  onClick={() => setAudioError(null)}
                  className="mt-6 px-6 py-2.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 font-bold text-xs rounded-full hover:bg-red-200 hover:dark:bg-red-900/60 active:scale-95 transition-all cursor-pointer"
                >
                  Tentar Novamente
                </button>
              </div>
            )}

            <AnimatePresence>
              {photoOptionOpen && (
                <div className="absolute inset-0 z-30 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4">
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-white dark:bg-slate-900 w-11/12 max-w-sm rounded-[2rem] p-6 shadow-2xl border border-slate-100 dark:border-slate-800 text-center space-y-6"
                  >
                    <div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white">Adicionar por Foto</h3>
                      <p className="text-xs text-slate-400 mt-1">Selecione o método de envio da foto</p>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <button 
                        type="button"
                        onClick={() => { cameraInputRef.current?.click(); }}
                        className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/20 text-slate-700 dark:text-slate-350 hover:text-purple-600 dark:hover:text-purple-400 border border-slate-150 dark:border-slate-700 rounded-2xl font-bold transition-all text-left text-sm cursor-pointer"
                      >
                        <span className="p-2 bg-white dark:bg-slate-700 rounded-xl shadow-sm text-purple-500">
                          <Camera size={18} />
                        </span>
                        Tirar Foto
                      </button>

                      <button 
                        type="button"
                        onClick={() => { galleryInputRef.current?.click(); }}
                        className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/20 text-slate-700 dark:text-slate-350 hover:text-purple-600 dark:hover:text-purple-400 border border-slate-150 dark:border-slate-700 rounded-2xl font-bold transition-all text-left text-sm cursor-pointer"
                      >
                        <span className="p-2 bg-white dark:bg-slate-700 rounded-xl shadow-sm text-purple-500">
                          <Camera size={18} />
                        </span>
                        Buscar na Galeria
                      </button>
                    </div>

                    <button 
                      type="button"
                      onClick={() => setPhotoOptionOpen(false)}
                      className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 font-bold rounded-2xl text-xs uppercase tracking-widest transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Premium instant buy popup overlay */}
            <AnimatePresence>
              {showPremiumPrompt && (
                <div className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-white dark:bg-slate-900 w-11/12 max-w-sm rounded-[2.5rem] p-6 shadow-2xl border border-slate-100 dark:border-slate-800 text-center space-y-5"
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <span className="p-3 bg-purple-50 dark:bg-purple-950/20 text-purple-600 rounded-2xl">
                        <Sparkles size={28} className="text-amber-500" />
                      </span>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">Requisito Premium</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 px-2 leading-relaxed">
                        O registro por voz ou foto requer recursos inteligentes em nuvem. Use suas moedas ou desbloqueie acesso permanente!
                      </p>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 flex justify-between items-center text-left">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-black">Seu Saldo</span>
                        <div className="text-base font-black text-slate-800 dark:text-white">🪙 {profile?.xp || 0} NC</div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-black">Custo Passe 24h</span>
                        <div className="text-base font-black text-purple-600">100 NC</div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2.5 pt-2">
                      <button 
                        type="button"
                        disabled={buyingPass}
                        onClick={handleBuyPassInline}
                        className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs uppercase tracking-widest rounded-2xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {buyingPass ? 'Ativando Passe...' : 'Ativar Passe 24h (100 NC)'}
                      </button>
                      
                      <button 
                        type="button"
                        onClick={() => {
                          setShowPremiumPrompt(false);
                          onClose();
                          setActiveTab('store');
                        }}
                        className="w-full py-4 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs uppercase tracking-widest rounded-2xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        Ir para a Loja de Premium 🛒
                      </button>

                      <button 
                        type="button"
                        onClick={() => setShowPremiumPrompt(false)}
                        className="w-full py-3 text-slate-500 hover:text-slate-700 dark:hover:text-slate-350 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Cancelar e voltar
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
