import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Coins, 
  TrendingUp, 
  Activity, 
  Search, 
  Edit3, 
  Check, 
  X, 
  Crown, 
  MessageSquare, 
  Dumbbell, 
  Shield, 
  Loader2, 
  RefreshCw,
  Plus,
  Minus,
  AlertCircle,
  Trash2,
  RotateCcw,
  Snowflake,
  Sparkles,
  Bot,
  ChefHat,
  Image,
  Video,
  Eye,
  EyeOff,
  Sliders,
  ShoppingBag,
  Download,
  CreditCard
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid, 
  Legend 
} from 'recharts';
import { Profile } from '../../types';
import { db } from '../../lib/firebase';
import { getApiUrl } from '../../utils';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { StoreConfig, DEFAULT_STORE_CONFIG, saveStoreConfig } from '../../services/storeConfigService';

interface AdminTabProps {
  user: any;
  profile: Profile | null;
  setProfile: React.Dispatch<React.SetStateAction<Profile | null>>;
  storeConfig?: StoreConfig;
  onStoreConfigUpdated?: () => void;
}

interface AdminStats {
  totalUsers: number;
  premiumUsers: number;
  totalFoodsLogged: number;
  totalWaterLogged: number;
  saasSalesVolume: number;
  apiTokensUsed: number;
  activeAdminsCount: number;
  salesHistory: Array<{ name: string; vendas: number; volume: number }>;
  toolsUsage: Array<{ name: string; requisicoes: number }>;
  apiMonthlyCosts: Array<{ month: string; custo: number }>;
}

export default function AdminTab({ 
  user, 
  profile, 
  setProfile,
  storeConfig,
  onStoreConfigUpdated
}: AdminTabProps) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'name' | 'cadastro' | 'ultimo_acesso'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [onlyPremium, setOnlyPremium] = useState(false);
  const [showTrashOnly, setShowTrashOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Store Pricing Config States with fallbacks
  const [streakFreezeCost, setStreakFreezeCost] = useState<number | string>(1000);
  const [premiumPassCost, setPremiumPassCost] = useState<number | string>(1500);
  const [assistantPassCost, setAssistantPassCost] = useState<number | string>(2000);
  const [whatsappPassCost, setWhatsappPassCost] = useState<number | string>(2000);
  const [recipesPassCost, setRecipesPassCost] = useState<number | string>(1200);
  const [sharedWorkoutsPassCost, setSharedWorkoutsPassCost] = useState<number | string>(800);
  const [monthlyPremiumPrice, setMonthlyPremiumPrice] = useState<number | string>(19.90);
  const [monthlyProfessionalPrice, setMonthlyProfessionalPrice] = useState<number | string>(39.90);
  const [whatsappApiUrl, setWhatsappApiUrl] = useState<string>('');
  const [whatsappApiKey, setWhatsappApiKey] = useState<string>('');
  const [whatsappInstance, setWhatsappInstance] = useState<string>('');
  
  // AI Config states
  const [aiProvider, setAiProvider] = useState<string>('Google Gemini');
  const [customAiProvider, setCustomAiProvider] = useState<string>('');
  const [aiApiKey, setAiApiKey] = useState<string>('');
  const [aiModel, setAiModel] = useState<string>('');
  const [savingAiConfig, setSavingAiConfig] = useState(false);
  const [aiConfigSuccessMessage, setAiConfigSuccessMessage] = useState<string | null>(null);
  
  // Visibility toggles for keys
  const [showWhatsappApiKey, setShowWhatsappApiKey] = useState(false);
  const [showAiApiKey, setShowAiApiKey] = useState(false);

  const [savingPriceConfigs, setSavingPriceConfigs] = useState(false);
  const [priceConfigSuccessMessage, setPriceConfigSuccessMessage] = useState<string | null>(null);
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [credentialsSuccessMessage, setCredentialsSuccessMessage] = useState<string | null>(null);

  // Search Mode Config States
  const [foodSearchMode, setFoodSearchMode] = useState<'apis' | 'web'>('web');
  const [savingSearchMode, setSavingSearchMode] = useState(false);
  const [searchModeSuccessMessage, setSearchModeSuccessMessage] = useState<string | null>(null);

  // Payment Gateway Config States
  const [activePaymentGateway, setActivePaymentGateway] = useState<string>('mercado_pago');
  const [paymentMode, setPaymentMode] = useState<'sandbox' | 'live'>('sandbox');
  const [mercadoPagoPublicKey, setMercadoPagoPublicKey] = useState<string>('');
  const [mercadoPagoAccessToken, setMercadoPagoAccessToken] = useState<string>('');
  const [stripePublishableKey, setStripePublishableKey] = useState<string>('');
  const [stripeSecretKey, setStripeSecretKey] = useState<string>('');
  const [paypalClientId, setPaypalClientId] = useState<string>('');
  const [paypalClientSecret, setPaypalClientSecret] = useState<string>('');
  const [savingPaymentConfig, setSavingPaymentConfig] = useState(false);
  const [paymentConfigSuccessMessage, setPaymentConfigSuccessMessage] = useState<string | null>(null);
  const [showMercadoPagoAccessToken, setShowMercadoPagoAccessToken] = useState(false);
  const [showStripeSecretKey, setShowStripeSecretKey] = useState(false);
  const [showPaypalClientSecret, setShowPaypalClientSecret] = useState(false);

  // Active sub-tab inside Admin Panel page
  const [activeAdminSubTab, setActiveAdminSubTab] = useState<'atletas' | 'vendas' | 'pricing' | 'connections' | 'gateways' | 'foods' | 'logs'>('atletas');

  // Diagnostics server logs states
  const [diagnosticsLogsList, setDiagnosticsLogsList] = useState<any[]>([]);
  const [diagnosticsFileLogsList, setDiagnosticsFileLogsList] = useState<string[]>([]);
  const [loadingDiagnosticsLogs, setLoadingDiagnosticsLogs] = useState(false);
  const [diagnosticsLogsError, setDiagnosticsLogsError] = useState<string | null>(null);
  const [diagnosticsLogsSuccessMessage, setDiagnosticsLogsSuccessMessage] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [diagnosticsLogsFilter, setDiagnosticsLogsFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  const [diagnosticsLogsSearchText, setDiagnosticsLogsSearchText] = useState('');

  const fetchSystemLogs = async () => {
    setLoadingDiagnosticsLogs(true);
    setDiagnosticsLogsError(null);
    try {
      const queryParams = `adminUserId=${encodeURIComponent(user.uid)}&adminEmail=${encodeURIComponent(user.email || '')}&userId=${encodeURIComponent(user.uid)}&email=${encodeURIComponent(user.email || '')}`;
      const response = await fetch(getApiUrl(`/api/admin/logs?${queryParams}`));
      if (response.ok) {
        const data = await response.json();
        if (data.success === false) {
          setDiagnosticsLogsError(data.error || "Erro ao carregar logs.");
        } else {
          setDiagnosticsLogsList(data.inMemoryLogs || []);
          setDiagnosticsFileLogsList(data.fileLogs || []);
        }
      } else {
        const textContent = await response.text().catch(() => "");
        let errorMsg = `Erro HTTP ${response.status} (${response.statusText || "status nulo"})`;
        try {
          const parsed = JSON.parse(textContent);
          if (parsed.error) {
            errorMsg = parsed.error;
          } else if (parsed.message) {
            errorMsg = parsed.message;
          }
        } catch (e) {
          if (textContent) {
            const snippet = textContent.trim();
            errorMsg += ": " + (snippet.length > 150 ? snippet.slice(0, 150) + "..." : snippet);
          }
        }
        setDiagnosticsLogsError(errorMsg);
      }
    } catch (err: any) {
      setDiagnosticsLogsError("Erro na requisição / de rede: " + (err.message || String(err)));
    } finally {
      setLoadingDiagnosticsLogs(false);
    }
  };

  const handleClearLogs = async () => {
    setShowClearConfirm(false);
    setDiagnosticsLogsError(null);
    setDiagnosticsLogsSuccessMessage(null);
    try {
      const response = await fetch(getApiUrl('/api/admin/logs/clear'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUserId: user.uid,
          adminEmail: user.email || '',
          userId: user.uid,
          email: user.email || ''
        })
      });
      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        if (data.success === false) {
          setDiagnosticsLogsError("Erro: " + (data.error || "Erro ao limpar logs."));
        } else {
          setDiagnosticsLogsList([]);
          setDiagnosticsFileLogsList([]);
          setDiagnosticsLogsSuccessMessage("Logs limpos com sucesso!");
          setTimeout(() => {
            setDiagnosticsLogsSuccessMessage(null);
          }, 4000);
        }
      } else {
        setDiagnosticsLogsError("Erro ao limpar logs.");
      }
    } catch (err: any) {
      setDiagnosticsLogsError("Erro ao limpar logs: " + err.message);
    }
  };

  const downloadLogsAsText = () => {
    try {
      let content = "=== SPORTNUTRI SYSTEM DIAGNOSTIC LOGS ===\n";
      content += `Gerado em: ${new Date().toLocaleString()}\n`;
      content += `Usuario Admin: ${user.email || 'N/A'} (${user.uid})\n`;
      content += "=========================================\n\n";

      content += "--- EVENTOS INTERCEPTADOS EM MEMORIA ---\n\n";
      if (diagnosticsLogsList.length === 0) {
        content += "Nenhum evento em memoria.\n";
      } else {
        diagnosticsLogsList.forEach(log => {
          content += `[${new Date(log.timestamp).toISOString()}] [${log.level.toUpperCase()}] ${log.message}\n`;
        });
      }

      if (diagnosticsFileLogsList.length > 0) {
        content += "\n--- LOGS PERSISTIDOS NO DISCO TEMPORARIO ---\n\n";
        diagnosticsFileLogsList.forEach(line => {
          content += `${line}\n`;
        });
      }

      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.id = "btn-download-logs-file"; // Unique HTML ID
      link.download = `sportnutri_diagnostico_logs_${new Date().toISOString().replace(/:/g, '-')}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert("Erro ao gerar arquivo de logs: " + e.message);
    }
  };

  // Administrating Custom / Calibrated Foods States
  const [foodsList, setFoodsList] = useState<any[]>([]);
  const [foodsSearch, setFoodsSearch] = useState('');
  const [loadingFoods, setLoadingFoods] = useState(false);
  const [selectedFood, setSelectedFood] = useState<any | null>(null);
  const [isFoodModalOpen, setIsFoodModalOpen] = useState(false);
  
  // Custom Food Form states
  const [foodNameInput, setFoodNameInput] = useState('');
  const [foodCategoryInput, setFoodCategoryInput] = useState('carboidrato');
  const [foodCaloriesInput, setFoodCaloriesInput] = useState<number | string>(0);
  const [foodProteinInput, setFoodProteinInput] = useState<number | string>(0);
  const [foodCarbsInput, setFoodCarbsInput] = useState<number | string>(0);
  const [foodFatInput, setFoodFatInput] = useState<number | string>(0);
  const [foodPortionInput, setFoodPortionInput] = useState('100g');
  const [foodMeasureUnitInput, setFoodMeasureUnitInput] = useState('g');
  const [foodGramsPerUnitInput, setFoodGramsPerUnitInput] = useState<number | string>(1);
  const [savingFood, setSavingFood] = useState(false);
  const [foodSuccessMessage, setFoodSuccessMessage] = useState<string | null>(null);

  const fetchAdminFoods = async (searchQuery: string = '') => {
    setLoadingFoods(true);
    try {
      const response = await fetch(getApiUrl(`/api/admin/foods?userId=${encodeURIComponent(user.uid)}&email=${encodeURIComponent(user.email || '')}&q=${encodeURIComponent(searchQuery)}`));
      if (response.ok) {
        const data = await response.json();
        setFoodsList(data.foods || []);
      }
    } catch (err) {
      console.error("Erro ao carregar lista de alimentos no admin:", err);
    } finally {
      setLoadingFoods(false);
    }
  };

  const handleFoodSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFoodsSearch(val);
  };

  const handleFoodSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAdminFoods(foodsSearch);
  };

  const handleOpenAddFoodModal = () => {
    setSelectedFood(null);
    setFoodNameInput('');
    setFoodCategoryInput('carboidrato');
    setFoodCaloriesInput(0);
    setFoodProteinInput(0);
    setFoodCarbsInput(0);
    setFoodFatInput(0);
    setFoodPortionInput('100g');
    setFoodMeasureUnitInput('g');
    setFoodGramsPerUnitInput(1);
    setFoodSuccessMessage(null);
    setIsFoodModalOpen(true);
  };

  const handleOpenEditFoodModal = (food: any) => {
    setSelectedFood(food);
    setFoodNameInput(food.name);
    setFoodCategoryInput(food.category || 'carboidrato');
    setFoodCaloriesInput(food.calories);
    setFoodProteinInput(food.protein);
    setFoodCarbsInput(food.carbs);
    setFoodFatInput(food.fat);
    setFoodPortionInput(food.portion || '100g');
    setFoodMeasureUnitInput(food.measure_unit || 'g');
    setFoodGramsPerUnitInput(food.grams_per_unit || 1);
    setFoodSuccessMessage(null);
    setIsFoodModalOpen(true);
  };

  const handleSaveFood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodNameInput.trim()) return;

    setSavingFood(true);
    setFoodSuccessMessage(null);

    const foodPayload = {
      name: foodNameInput.trim(),
      category: foodCategoryInput,
      calories: Number(foodCaloriesInput),
      protein: Number(foodProteinInput),
      carbs: Number(foodCarbsInput),
      fat: Number(foodFatInput),
      portion: foodPortionInput,
      measure_unit: foodMeasureUnitInput,
      grams_per_unit: Number(foodGramsPerUnitInput)
    };

    const isEdit = !!selectedFood;
    const url = getApiUrl(isEdit ? '/api/admin/foods/update' : '/api/admin/foods');

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUserId: user.uid,
          adminEmail: user.email || '',
          food: foodPayload
        })
      });

      if (response.ok) {
        setFoodSuccessMessage(isEdit ? 'Alimento atualizado perfeitamente!' : 'Alimento cadastrado e calibrado com sucesso!');
        setTimeout(() => {
          setIsFoodModalOpen(false);
          fetchAdminFoods(foodsSearch);
        }, 1200);
      } else {
        const errData = await response.json();
        console.error("Erro ao salvar alimento:", errData.error);
      }
    } catch (err) {
      console.error("Erro na requisição ao salvar alimento:", err);
    } finally {
      setSavingFood(false);
    }
  };

  const handleDeleteFood = async (foodName: string) => {
    const confirmed = window.confirm(`Deseja mesmo excluir o alimento "${foodName}"? Esta operação é definitiva.`);
    if (!confirmed) return;

    try {
      const response = await fetch(getApiUrl('/api/admin/foods/delete'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUserId: user.uid,
          adminEmail: user.email || '',
          name: foodName
        })
      });

      if (response.ok) {
        fetchAdminFoods(foodsSearch);
      }
    } catch (err) {
      console.error("Erro ao excluir alimento:", err);
    }
  };

  useEffect(() => {
    if (activeAdminSubTab === 'foods') {
      fetchAdminFoods(foodsSearch);
    } else if (activeAdminSubTab === 'logs') {
      fetchSystemLogs();
    }
  }, [activeAdminSubTab]);

  useEffect(() => {
    if (storeConfig) {
      setStreakFreezeCost(storeConfig.streak_freeze_cost);
      setPremiumPassCost(storeConfig.premium_pass_cost);
      setAssistantPassCost(storeConfig.assistant_pass_cost);
      setWhatsappPassCost(storeConfig.whatsapp_pass_cost);
      setRecipesPassCost(storeConfig.recipes_pass_cost);
      setSharedWorkoutsPassCost(storeConfig.shared_workouts_pass_cost || 800);
      setMonthlyPremiumPrice(storeConfig.monthly_premium_price);
      setMonthlyProfessionalPrice(storeConfig.monthly_professional_price || 39.90);
      setWhatsappApiUrl(storeConfig.whatsapp_api_url || '');
      setWhatsappApiKey(storeConfig.whatsapp_api_key || '');
      setWhatsappInstance(storeConfig.whatsapp_instance || '');
      
      const provider = storeConfig.ai_provider || 'Google Gemini';
      const standardProviders = [
        "Google Gemini",
        "OpenAI",
        "Anthropic Claude",
        "DeepSeek",
        "Groq (AI Grátis/Código Aberto)"
      ];
      if (standardProviders.includes(provider)) {
        setAiProvider(provider);
        setCustomAiProvider('');
      } else {
        setAiProvider('Outra');
        setCustomAiProvider(provider);
      }
      setAiApiKey(storeConfig.ai_api_key || '');
      setAiModel(storeConfig.ai_model || '');
      setFoodSearchMode(storeConfig.food_search_mode || 'web');
      setActivePaymentGateway(storeConfig.active_payment_gateway || 'mercado_pago');
      setPaymentMode(storeConfig.payment_mode || 'sandbox');
      setMercadoPagoPublicKey(storeConfig.mercado_pago_public_key || '');
      setMercadoPagoAccessToken(storeConfig.mercado_pago_access_token || '');
      setStripePublishableKey(storeConfig.stripe_publishable_key || '');
      setStripeSecretKey(storeConfig.stripe_secret_key || '');
      setPaypalClientId(storeConfig.paypal_client_id || '');
      setPaypalClientSecret(storeConfig.paypal_client_secret || '');
    }
  }, [storeConfig]);

  const handleSavePrices = async () => {
    setSavingPriceConfigs(true);
    setPriceConfigSuccessMessage(null);
    try {
      const finalProvider = aiProvider === 'Outra' ? customAiProvider.trim() : aiProvider;
      const updatedConfig: StoreConfig = {
        streak_freeze_cost: Math.max(0, parseInt(String(streakFreezeCost)) || 0),
        premium_pass_cost: Math.max(0, parseInt(String(premiumPassCost)) || 0),
        assistant_pass_cost: Math.max(0, parseInt(String(assistantPassCost)) || 0),
        whatsapp_pass_cost: Math.max(0, parseInt(String(whatsappPassCost)) || 0),
        recipes_pass_cost: Math.max(0, parseInt(String(recipesPassCost)) || 0),
        shared_workouts_pass_cost: Math.max(0, parseInt(String(sharedWorkoutsPassCost)) || 800),
        monthly_premium_price: Math.max(0, parseFloat(String(monthlyPremiumPrice)) || 0),
        monthly_professional_price: Math.max(0, parseFloat(String(monthlyProfessionalPrice)) || 0),
        whatsapp_api_url: whatsappApiUrl.trim(),
        whatsapp_api_key: whatsappApiKey.trim(),
        whatsapp_instance: whatsappInstance.trim(),
        ai_provider: finalProvider || 'Google Gemini',
        ai_api_key: aiApiKey.trim(),
        ai_model: aiModel.trim(),
        food_search_mode: foodSearchMode
      };
      await saveStoreConfig(updatedConfig);
      if (onStoreConfigUpdated) {
        onStoreConfigUpdated();
      }
      setPriceConfigSuccessMessage('Valores de compra salvos com sucesso!');
      setTimeout(() => setPriceConfigSuccessMessage(null), 4000);
    } catch (e) {
      console.error(e);
      alert('Falha ao salvar novas configurações de preço.');
    } finally {
      setSavingPriceConfigs(false);
    }
  };

  const handleSaveCredentials = async () => {
    setSavingCredentials(true);
    setCredentialsSuccessMessage(null);
    try {
      const finalProvider = aiProvider === 'Outra' ? customAiProvider.trim() : aiProvider;
      const updatedConfig: StoreConfig = {
        streak_freeze_cost: Math.max(0, parseInt(String(streakFreezeCost)) || 0),
        premium_pass_cost: Math.max(0, parseInt(String(premiumPassCost)) || 0),
        assistant_pass_cost: Math.max(0, parseInt(String(assistantPassCost)) || 0),
        whatsapp_pass_cost: Math.max(0, parseInt(String(whatsappPassCost)) || 0),
        recipes_pass_cost: Math.max(0, parseInt(String(recipesPassCost)) || 0),
        monthly_premium_price: Math.max(0, parseFloat(String(monthlyPremiumPrice)) || 0),
        whatsapp_api_url: whatsappApiUrl.trim(),
        whatsapp_api_key: whatsappApiKey.trim(),
        whatsapp_instance: whatsappInstance.trim(),
        ai_provider: finalProvider || 'Google Gemini',
        ai_api_key: aiApiKey.trim(),
        ai_model: aiModel.trim(),
        food_search_mode: foodSearchMode
      };
      await saveStoreConfig(updatedConfig);
      if (onStoreConfigUpdated) {
        onStoreConfigUpdated();
      }
      setCredentialsSuccessMessage('Credenciais de WhatsApp salvas com sucesso!');
      setTimeout(() => setCredentialsSuccessMessage(null), 4000);
    } catch (e) {
      console.error(e);
      alert('Falha ao salvar credenciais do WhatsApp.');
    } finally {
      setSavingCredentials(false);
    }
  };

  const handleSaveAiConfig = async () => {
    setSavingAiConfig(true);
    setAiConfigSuccessMessage(null);
    try {
      const finalProvider = aiProvider === 'Outra' ? customAiProvider.trim() : aiProvider;
      const updatedConfig: StoreConfig = {
        streak_freeze_cost: Math.max(0, parseInt(String(streakFreezeCost)) || 0),
        premium_pass_cost: Math.max(0, parseInt(String(premiumPassCost)) || 0),
        assistant_pass_cost: Math.max(0, parseInt(String(assistantPassCost)) || 0),
        whatsapp_pass_cost: Math.max(0, parseInt(String(whatsappPassCost)) || 0),
        recipes_pass_cost: Math.max(0, parseInt(String(recipesPassCost)) || 0),
        monthly_premium_price: Math.max(0, parseFloat(String(monthlyPremiumPrice)) || 0),
        whatsapp_api_url: whatsappApiUrl.trim(),
        whatsapp_api_key: whatsappApiKey.trim(),
        whatsapp_instance: whatsappInstance.trim(),
        ai_provider: finalProvider || 'Google Gemini',
        ai_api_key: aiApiKey.trim(),
        ai_model: aiModel.trim(),
        food_search_mode: foodSearchMode
      };
      await saveStoreConfig(updatedConfig);
      if (onStoreConfigUpdated) {
        onStoreConfigUpdated();
      }
      setAiConfigSuccessMessage('Configurações de inteligência artificial salvas com sucesso!');
      setTimeout(() => setAiConfigSuccessMessage(null), 4000);
    } catch (e) {
      console.error(e);
      alert('Falha ao salvar provedor de inteligência artificial.');
    } finally {
      setSavingAiConfig(false);
    }
  };

  const handleSaveSearchMode = async () => {
    setSavingSearchMode(true);
    setSearchModeSuccessMessage(null);
    try {
      const finalProvider = aiProvider === 'Outra' ? customAiProvider.trim() : aiProvider;
      const updatedConfig: StoreConfig = {
        streak_freeze_cost: Math.max(0, parseInt(String(streakFreezeCost)) || 0),
        premium_pass_cost: Math.max(0, parseInt(String(premiumPassCost)) || 0),
        assistant_pass_cost: Math.max(0, parseInt(String(assistantPassCost)) || 0),
        whatsapp_pass_cost: Math.max(0, parseInt(String(whatsappPassCost)) || 0),
        recipes_pass_cost: Math.max(0, parseInt(String(recipesPassCost)) || 0),
        monthly_premium_price: Math.max(0, parseFloat(String(monthlyPremiumPrice)) || 0),
        whatsapp_api_url: whatsappApiUrl.trim(),
        whatsapp_api_key: whatsappApiKey.trim(),
        whatsapp_instance: whatsappInstance.trim(),
        ai_provider: finalProvider || 'Google Gemini',
        ai_api_key: aiApiKey.trim(),
        ai_model: aiModel.trim(),
        food_search_mode: foodSearchMode
      };
      await saveStoreConfig(updatedConfig);
      if (onStoreConfigUpdated) {
        onStoreConfigUpdated();
      }
      setSearchModeSuccessMessage('Modo de pesquisa de alimentos salvo com sucesso!');
      setTimeout(() => setSearchModeSuccessMessage(null), 4000);
    } catch (e) {
      console.error(e);
      alert('Falha ao salvar modo de pesquisa de alimentos.');
    } finally {
      setSavingSearchMode(false);
    }
  };

  const handleSavePaymentConfig = async () => {
    setSavingPaymentConfig(true);
    setPaymentConfigSuccessMessage(null);
    try {
      const finalProvider = aiProvider === 'Outra' ? customAiProvider.trim() : aiProvider;
      const updatedConfig: StoreConfig = {
        streak_freeze_cost: Math.max(0, parseInt(String(streakFreezeCost)) || 0),
        premium_pass_cost: Math.max(0, parseInt(String(premiumPassCost)) || 0),
        assistant_pass_cost: Math.max(0, parseInt(String(assistantPassCost)) || 0),
        whatsapp_pass_cost: Math.max(0, parseInt(String(whatsappPassCost)) || 0),
        recipes_pass_cost: Math.max(0, parseInt(String(recipesPassCost)) || 0),
        shared_workouts_pass_cost: Math.max(0, parseInt(String(sharedWorkoutsPassCost)) || 800),
        monthly_premium_price: Math.max(0, parseFloat(String(monthlyPremiumPrice)) || 0),
        monthly_professional_price: Math.max(0, parseFloat(String(monthlyProfessionalPrice)) || 0),
        whatsapp_api_url: whatsappApiUrl.trim(),
        whatsapp_api_key: whatsappApiKey.trim(),
        whatsapp_instance: whatsappInstance.trim(),
        ai_provider: finalProvider || 'Google Gemini',
        ai_api_key: aiApiKey.trim(),
        ai_model: aiModel.trim(),
        food_search_mode: foodSearchMode,
        active_payment_gateway: activePaymentGateway,
        payment_mode: paymentMode,
        mercado_pago_public_key: mercadoPagoPublicKey.trim(),
        mercado_pago_access_token: mercadoPagoAccessToken.trim(),
        stripe_publishable_key: stripePublishableKey.trim(),
        stripe_secret_key: stripeSecretKey.trim(),
        paypal_client_id: paypalClientId.trim(),
        paypal_client_secret: paypalClientSecret.trim(),
      };
      await saveStoreConfig(updatedConfig);
      if (onStoreConfigUpdated) {
        onStoreConfigUpdated();
      }
      setPaymentConfigSuccessMessage('Configurações do gateway de pagamento salvas com sucesso!');
      setTimeout(() => setPaymentConfigSuccessMessage(null), 4000);
    } catch (e) {
      console.error(e);
      alert('Falha ao salvar configurações do gateway de pagamento.');
    } finally {
      setSavingPaymentConfig(false);
    }
  };
  
  // Edit mode state
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [editingCoins, setEditingCoins] = useState<number | string>(0);
  const [editingRole, setEditingRole] = useState<string>('user');
  const [isAdminSelected, setIsAdminSelected] = useState<boolean>(false);
  const [isProfessionalSelected, setIsProfessionalSelected] = useState<boolean>(false);
  const [editingPremium, setEditingPremium] = useState<string>('');
  const [editingWhatsapp, setEditingWhatsapp] = useState<string>('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editSuccess, setEditSuccess] = useState(false);

  // States for inline coins editing
  const [inlineEditingUserId, setInlineEditingUserId] = useState<string | null>(null);
  const [inlineCoinsValue, setInlineCoinsValue] = useState<number | string>(0);
  const isCancelledRef = useRef(false);

  // Custom confirmation dialog state
  const [confirmConfig, setConfirmConfig] = useState<{
    userId: string;
    action: 'trash' | 'restore' | 'delete';
    username: string;
  } | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  // Webhook Logs states
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsRefreshCounter, setLogsRefreshCounter] = useState(0);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const fetchWebhookLogs = async () => {
    if (!user) return;
    setLoadingLogs(true);
    try {
      const logsRef = collection(db, 'whatsapp_webhook_logs');
      const q = query(logsRef, orderBy('timestamp', 'desc'), limit(30));
      const querySnapshot = await getDocs(q);
      const logs: any[] = [];
      querySnapshot.forEach((docSnap) => {
        logs.push(docSnap.data());
      });
      setWebhookLogs(logs);
    } catch (e) {
      console.error("Erro ao buscar logs do webhook do WhatsApp:", e);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchWebhookLogs();
  }, [logsRefreshCounter]);

  const fetchData = async () => {
    if (!user) return;
    try {
      setLoading(true);

      // 1. Fetch user profiles directly from client-side Firestore
      const querySnapshot = await getDocs(collection(db, 'profiles'));
      const list: any[] = [];
      let premiumUsersCount = 0;
      let activeAdminsCount = 0;
      let realPaidSalesCount = 0;

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const now = Date.now();
        const isPremium = data.premium_access_until && (
          data.premium_access_until === 'unlimited' || 
          new Date(data.premium_access_until).getTime() > now
        );
        if (isPremium) {
          premiumUsersCount++;
        }
        if (data.paid_premium) {
          realPaidSalesCount++;
        }
        const dEmail = (data.email || "").toLowerCase().trim();
        if (data.role === 'admin' || dEmail === 'edsonricardosouza@gmail.com') {
          activeAdminsCount++;
        }

        list.push({
          id: docSnap.id,
          username: data.username || "Atleta Anônimo",
          email: data.email || "",
          whatsapp: data.whatsapp || "",
          xp: Number(data.xp || 0),
          streak: Number(data.streak || 0),
          role: data.role || "user",
          premium_access_until: data.premium_access_until || null,
          whatsapp_access_until: data.whatsapp_access_until || null,
          avatar_url: data.avatar_url || "",
          league: data.league || "Bronze",
          last_activity_date: data.last_activity_date || "",
          created_at: data.created_at || data.createdAt || "",
          is_deleted: !!data.is_deleted,
          paid_premium: !!data.paid_premium
        });
      });

      setUsers(list);

      // 2. Fetch real food and water logs size to display 100% real metrics
      const foodLogsSnapshot = await getDocs(collection(db, 'food_logs'));
      const waterLogsSnapshot = await getDocs(collection(db, 'water_logs'));
      const realFoodsLogged = foodLogsSnapshot.size;
      const realWaterLogged = waterLogsSnapshot.size;

      const saasSalesVolume = realPaidSalesCount * 19.90;
      const apiTokensUsed = (realFoodsLogged * 1150) + (realWaterLogged * 100);

      const aiTokenRateBRL = 0.00012; 

      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const last6Months: Array<{ month: string, yearNum: number, monthNum: number, custo: number }> = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const y = d.getFullYear() % 100;
        const mLabel = `${monthNames[d.getMonth()]}/${y}`;
        last6Months.push({
          month: mLabel,
          yearNum: d.getFullYear(),
          monthNum: d.getMonth(),
          custo: 0
        });
      }

      // Group and calculate AI costs dynamically of fetched logs
      foodLogsSnapshot.forEach(docSnap => {
        const data = docSnap.data();
        const dateStr = data.logged_at || data.created_at || data.date;
        if (dateStr) {
          const date = new Date(dateStr);
          const y = date.getFullYear();
          const m = date.getMonth();
          const bucket = last6Months.find(b => b.yearNum === y && b.monthNum === m);
          if (bucket) {
            bucket.custo += 1150 * aiTokenRateBRL;
          }
        }
      });

      waterLogsSnapshot.forEach(docSnap => {
        const data = docSnap.data();
        const dateStr = data.logged_at || data.created_at || data.date;
        if (dateStr) {
          const date = new Date(dateStr);
          const y = date.getFullYear();
          const m = date.getMonth();
          const bucket = last6Months.find(b => b.yearNum === y && b.monthNum === m);
          if (bucket) {
            bucket.custo += 100 * aiTokenRateBRL;
          }
        }
      });

      const apiMonthlyCosts = last6Months.map(b => ({
        month: b.month,
        custo: Number(b.custo.toFixed(2))
      }));

      const salesHistory = [
        { name: "Seg", vendas: 0, volume: 0 },
        { name: "Ter", vendas: 0, volume: 0 },
        { name: "Qua", vendas: 0, volume: 0 },
        { name: "Qui", vendas: 0, volume: 0 },
        { name: "Sex", vendas: 0, volume: 0 },
        { name: "Sáb", vendas: 0, volume: 0 },
        { name: "Dom", vendas: 0, volume: 0 }
      ];

      list.forEach(u => {
        if (u.paid_premium) {
          const regDate = u.created_at ? new Date(u.created_at) : new Date();
          const dayIndex = regDate.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
          const mapIndex = dayIndex === 0 ? 6 : dayIndex - 1;
          if (salesHistory[mapIndex]) {
            salesHistory[mapIndex].vendas += 1;
            salesHistory[mapIndex].volume = Number((salesHistory[mapIndex].volume + 19.90).toFixed(2));
          }
        }
      });

      let chatRequests = 0;
      let photoRequests = 0;
      let audioRequests = 0;
      let botRequests = 0;

      foodLogsSnapshot.forEach(docSnap => {
        const data = docSnap.data();
        const via = data.added_via || 'chat';
        if (via === 'audio') {
          audioRequests++;
        } else if (via === 'photo') {
          photoRequests++;
        } else if (via === 'bot' || via === 'whatsapp') {
          botRequests++;
        } else {
          chatRequests++;
        }
      });

      waterLogsSnapshot.forEach(docSnap => {
        const data = docSnap.data();
        const via = data.added_via || 'bot';
        if (via === 'audio') {
          audioRequests++;
        } else if (via === 'photo') {
          photoRequests++;
        } else if (via === 'chat') {
          chatRequests++;
        } else {
          botRequests++;
        }
      });

      setStats({
        totalUsers: list.length,
        premiumUsers: premiumUsersCount,
        totalFoodsLogged: realFoodsLogged,
        totalWaterLogged: realWaterLogged,
        saasSalesVolume: Number(saasSalesVolume.toFixed(2)),
        apiTokensUsed,
        activeAdminsCount,
        salesHistory,
        toolsUsage: [
          { name: "Chat", requisicoes: chatRequests },
          { name: "Foto", requisicoes: photoRequests },
          { name: "Áudio", requisicoes: audioRequests },
          { name: "Bot", requisicoes: botRequests }
        ],
        apiMonthlyCosts
      });

    } catch (err) {
      console.error("Admin data fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  };

  // Inline coins quick updates
  const handleInlineCoinsSave = async (userId: string, val: number | string) => {
    if (val === "" || val === null || val === undefined) {
      alert("Por favor, preencha o saldo de NutriCoins.");
      setInlineEditingUserId(null);
      return;
    }
    const xpVal = Number(val);
    if (isNaN(xpVal) || xpVal < 0) {
      alert("Por favor, preencha o saldo de NutriCoins com um valor válido maior ou igual a zero.");
      setInlineEditingUserId(null);
      return;
    }
    try {
      const docRef = doc(db, 'profiles', userId);
      await updateDoc(docRef, { xp: xpVal });

      setUsers(prev => prev.map(u => u.id === userId ? { ...u, xp: xpVal } : u));
      if (userId === user.uid && profile) {
        setProfile({ ...profile, xp: xpVal });
      }
    } catch (err) {
      console.error('Error saving coins directly from table cell:', err);
    } finally {
      setInlineEditingUserId(null);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Open modal/panel to edit a target profile
  const openEditUser = (target: any) => {
    setSelectedUser(target);
    setEditingCoins(target.xp || 0);
    setEditingRole(target.role || 'user');
    setIsAdminSelected(target.role === 'admin');
    setIsProfessionalSelected(target.role === 'professional' || (target.role === 'admin' && target.is_professional !== false));
    setEditingPremium(target.premium_access_until || '');
    setEditingWhatsapp(target.whatsapp_access_until || '');
    setEditSuccess(false);
  };

  const saveUserUpdates = async () => {
    if (!selectedUser) return;

    if (editingCoins === "" || editingCoins === undefined || editingCoins === null) {
      alert("Por favor, preencha o saldo de NutriCoins.");
      return;
    }
    const coinsNum = Number(editingCoins);
    if (isNaN(coinsNum) || coinsNum < 0) {
      alert("Por favor, preencha o saldo de NutriCoins com um valor válido maior ou igual a zero.");
      return;
    }

    setSavingEdit(true);
    try {
      const docRef = doc(db, 'profiles', selectedUser.id);
      const updates = {
        xp: Number(editingCoins),
        role: editingRole,
        is_professional: isProfessionalSelected,
        premium_access_until: editingPremium || null,
        whatsapp_access_until: editingWhatsapp || null
      };

      await updateDoc(docRef, updates);

      setEditSuccess(true);
      
      // Update local array
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? {
        ...u,
        xp: Number(editingCoins),
        role: editingRole,
        is_professional: isProfessionalSelected,
        premium_access_until: editingPremium || null,
        whatsapp_access_until: editingWhatsapp || null
      } : u));

      // If the admin edited themselves, reflect instantly!
      if (selectedUser.id === user.uid && profile) {
        setProfile({
          ...profile,
          xp: Number(editingCoins),
          role: editingRole,
          is_professional: isProfessionalSelected,
          premium_access_until: editingPremium || null,
          whatsapp_access_until: editingWhatsapp || null
        });
      }

      setTimeout(() => {
        setSelectedUser(null);
        setEditSuccess(false);
      }, 1000);

    } catch (err: any) {
      alert(err.message || 'Erro ao salvar alterações');
    } finally {
      setSavingEdit(false);
    }
  };

  const quickActionChangeXP = async (targetId: string, amount: number) => {
    const targetUser = users.find(u => u.id === targetId);
    if (!targetUser) return;
    const newXP = Math.max(0, (targetUser.xp || 0) + amount);
    
    try {
      const docRef = doc(db, 'profiles', targetId);
      await updateDoc(docRef, { xp: newXP });

      setUsers(prev => prev.map(u => u.id === targetId ? { ...u, xp: newXP } : u));
      if (targetId === user.uid && profile) {
        setProfile({ ...profile, xp: newXP });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const forceSelfUnrestricted = async () => {
    try {
      const docRef = doc(db, 'profiles', user.uid);
      const updates = {
        xp: 10000,
        premium_access_until: 'unlimited',
        whatsapp_access_until: 'unlimited',
        role: 'admin'
      };

      await updateDoc(docRef, updates);

      // Refresh local cache and profile
      if (profile) {
        setProfile({
          ...profile,
          xp: 10000,
          premium_access_until: 'unlimited',
          whatsapp_access_until: 'unlimited',
          role: 'admin'
        });
      }
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSoftDelete = (userId: string) => {
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;
    setConfirmConfig({ userId, action: 'trash', username: targetUser.username });
  };

  const handleRestoreUser = (userId: string) => {
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;
    setConfirmConfig({ userId, action: 'restore', username: targetUser.username });
  };

  const handlePermanentDelete = (userId: string) => {
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;
    setConfirmConfig({ userId, action: 'delete', username: targetUser.username });
  };

  const handleConfirmAction = async () => {
    if (!confirmConfig) return;
    const { userId, action } = confirmConfig;
    setConfirmConfig(null);

    if (action === 'trash') {
      try {
        const docRef = doc(db, 'profiles', userId);
        await updateDoc(docRef, { is_deleted: true });
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_deleted: true } : u));
        if (selectedUser?.id === userId) {
          setSelectedUser(null);
        }
      } catch (err: any) {
        console.error("Error trashing user:", err);
        setErrorToast(err.message || 'Erro ao enviar usuário para a lixeira');
      }
    } else if (action === 'restore') {
      try {
        const docRef = doc(db, 'profiles', userId);
        await updateDoc(docRef, { is_deleted: false });
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_deleted: false } : u));
        if (selectedUser?.id === userId) {
          setSelectedUser(prev => prev ? { ...prev, is_deleted: false } : null);
        }
      } catch (err: any) {
        console.error("Error restoring user:", err);
        setErrorToast(err.message || 'Erro ao restaurar atleta');
      }
    } else if (action === 'delete') {
      try {
        const docRef = doc(db, 'profiles', userId);
        await deleteDoc(docRef);

        try {
          const foodQuery = query(collection(db, 'food_logs'), where('user_id', '==', userId));
          const foodSnap = await getDocs(foodQuery);
          const foodPromises = foodSnap.docs.map(d => deleteDoc(doc(db, 'food_logs', d.id)));
          await Promise.all(foodPromises);
        } catch (foodErr) {
          console.error("Error cleaning up user food logs:", foodErr);
        }

        try {
          const waterQuery = query(collection(db, 'water_logs'), where('user_id', '==', userId));
          const waterSnap = await getDocs(waterQuery);
          const waterPromises = waterSnap.docs.map(d => deleteDoc(doc(db, 'water_logs', d.id)));
          await Promise.all(waterPromises);
        } catch (waterErr) {
          console.error("Error cleaning up user water logs:", waterErr);
        }

        setUsers(prev => prev.filter(u => u.id !== userId));
        if (selectedUser?.id === userId) {
          setSelectedUser(null);
        }
      } catch (err: any) {
        console.error("Error deleting permanently:", err);
        setErrorToast(err.message || 'Erro ao excluir permanentemente');
      }
    }
  };

  // Filter and Sort users
  const filteredUsers = users
    .filter(u => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = (
        (u.username || '').toLowerCase().includes(term) ||
        (u.email || '').toLowerCase().includes(term) ||
        (u.whatsapp || '').includes(term)
      );
      if (!matchesSearch) return false;

      if (showTrashOnly) {
        if (!u.is_deleted) return false;
      } else {
        if (u.is_deleted) return false;
      }

      if (onlyPremium) {
        if (!u.premium_access_until) return false;
        if (u.premium_access_until !== 'unlimited') {
          const isPast = new Date(u.premium_access_until).getTime() < Date.now();
          if (isPast) return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      let comparison = 0;

      if (sortField === 'cadastro') {
        const valA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const valB = b.created_at ? new Date(b.created_at).getTime() : 0;
        comparison = valA - valB;
      } else if (sortField === 'ultimo_acesso') {
        const valA = a.last_activity_date ? new Date(a.last_activity_date).getTime() : 0;
        const valB = b.last_activity_date ? new Date(b.last_activity_date).getTime() : 0;
        comparison = valA - valB;
      } else {
        const nameA = (a.username || '').toLowerCase();
        const nameB = (b.username || '').toLowerCase();
        comparison = nameA.localeCompare(nameB);
      }

      if (comparison === 0) {
        const nameA = (a.username || '').toLowerCase();
        const nameB = (b.username || '').toLowerCase();
        comparison = nameA.localeCompare(nameB);
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

  const getPremiumLabel = (until: string | null) => {
    if (!until) return <span className="text-xs text-slate-400">Inativo</span>;
    if (until === 'unlimited') return <span className="text-xs text-purple-500 font-bold flex items-center gap-1"><Crown size={12} /> Ilimitado</span>;
    const isPast = new Date(until).getTime() < Date.now();
    if (isPast) return <span className="text-xs text-rose-400 line-through">Expirado</span>;
    return <span className="text-xs text-cyan-500 font-medium">Ativo até {new Date(until).toLocaleDateString()}</span>;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
        <p className="text-slate-500 dark:text-slate-400 font-medium">Carregando painel de administração...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Admin Title header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <Shield className="text-red-500 animate-pulse" /> <span className="text-gradient">Painel Administrativo</span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Gerenciamento global de usuários, vendas, uso de IA e canais do SportNutri.
          </p>
        </div>
      </div>

      {/* Top Banner Alert Info */}
      <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 p-4 rounded-3xl flex gap-3 text-red-700 dark:text-red-400 text-xs">
        <AlertCircle size={18} className="shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Acesso Total de Administrador:</span> Registrado sob a conta mestre <code className="font-mono bg-white/50 px-1.5 py-0.5 rounded font-black">{user.email}</code>. Você pode ativar livremente o plano Premium anual ou ilimitado para qualquer usuário, conceder passes de áudio no WhatsApp (Evolution API) e calibrar NutriCoins para testes em tempo real.
        </div>
      </div>

      {/* Modern Sub-Tab Navigation Bar */}
      <div className="flex border-b border-slate-155 dark:border-slate-800/80 gap-2 overflow-x-auto pb-1 select-none scrollbar-hide">
        <button
          onClick={() => setActiveAdminSubTab('atletas')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs transition-all border-0 cursor-pointer shrink-0 ${
            activeAdminSubTab === 'atletas'
              ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-md shadow-purple-500/10'
              : 'bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 hover:text-slate-600'
          }`}
        >
          <Users size={14} />
          Atletas
        </button>

        <button
          onClick={() => setActiveAdminSubTab('vendas')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs transition-all border-0 cursor-pointer shrink-0 ${
            activeAdminSubTab === 'vendas'
              ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-md shadow-emerald-500/10'
              : 'bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 hover:text-slate-600'
          }`}
        >
          <TrendingUp size={14} />
          Vendas
        </button>

        <button
          onClick={() => setActiveAdminSubTab('pricing')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs transition-all border-0 cursor-pointer shrink-0 ${
            activeAdminSubTab === 'pricing'
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-white shadow-md shadow-emerald-500/10'
              : 'bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 hover:text-slate-600'
          }`}
        >
          <ShoppingBag size={14} />
          Preços
        </button>

        <button
          onClick={() => setActiveAdminSubTab('connections')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs transition-all border-0 cursor-pointer shrink-0 ${
            activeAdminSubTab === 'connections'
              ? 'bg-gradient-to-r from-cyan-500 to-cyan-400 text-white shadow-md shadow-cyan-500/10'
              : 'bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 hover:text-slate-600'
          }`}
        >
          <Activity size={14} />
          Conexões
        </button>

        <button
          onClick={() => setActiveAdminSubTab('gateways')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs transition-all border-0 cursor-pointer shrink-0 ${
            activeAdminSubTab === 'gateways'
              ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md shadow-blue-500/10'
              : 'bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 hover:text-slate-600'
          }`}
        >
          <CreditCard size={14} />
          Gateways
        </button>

        <button
          onClick={() => setActiveAdminSubTab('foods')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs transition-all border-0 cursor-pointer shrink-0 ${
            activeAdminSubTab === 'foods'
              ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-white shadow-md shadow-amber-500/10'
              : 'bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 hover:text-slate-600'
          }`}
        >
          <ChefHat size={14} />
          Tabela
        </button>

        <button
          onClick={() => setActiveAdminSubTab('logs')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs transition-all border-0 cursor-pointer shrink-0 ${
            activeAdminSubTab === 'logs'
              ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-md shadow-red-500/10'
              : 'bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 hover:text-slate-600'
          }`}
        >
          <Sliders size={14} />
          Logs
        </button>
      </div>

      {activeAdminSubTab === 'pricing' && (
        <>
          {/* Dynamic Store Pricing Admin Editor Panel */}
          <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 dark:border-slate-800 pb-4 gap-2">
          <div className="space-y-1">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShoppingBag size={18} className="text-amber-500" /> Configuração de Preços da Loja
            </h3>
            <p className="text-xs text-slate-400">Altere o valor em NutriCoins (NC) e dinheiro real dos produtos da loja em tempo real.</p>
          </div>
        </div>



        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Streak Freeze (Bloqueio de Sequência) */}
          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-3">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Snowflake size={16} className="text-sky-500" />
              <span className="text-xs font-bold truncate">Bloqueio de Sequência</span>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Valor em NutriCoins</label>
              <div className="relative">
                <input 
                  type="number"
                  value={streakFreezeCost}
                  onChange={e => setStreakFreezeCost(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 pr-10 focus:ring-2 focus:ring-amber-500/50"
                  min="0"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">NC</span>
              </div>
            </div>
          </div>

          {/* Premium Pass (Passe 24h Premium) */}
          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-3">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Sparkles size={16} className="text-amber-500" />
              <span className="text-xs font-bold truncate">Passe 24h Premium</span>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Valor em NutriCoins</label>
              <div className="relative">
                <input 
                  type="number"
                  value={premiumPassCost}
                  onChange={e => setPremiumPassCost(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 pr-10 focus:ring-2 focus:ring-amber-500/50"
                  min="0"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">NC</span>
              </div>
            </div>
          </div>

          {/* Nutri Assistant AI Pass */}
          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-3">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Bot size={16} className="text-purple-500" />
              <span className="text-xs font-bold truncate">Passe 24h Assistant AI</span>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Valor em NutriCoins</label>
              <div className="relative">
                <input 
                  type="number"
                  value={assistantPassCost}
                  onChange={e => setAssistantPassCost(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 pr-10 focus:ring-2 focus:ring-amber-500/50"
                  min="0"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">NC</span>
              </div>
            </div>
          </div>

          {/* WhatsApp AI Bot Pass */}
          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-3">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <MessageSquare size={16} className="text-emerald-500" />
              <span className="text-xs font-bold truncate">Passe 24h WhatsApp Bot</span>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Valor em NutriCoins</label>
              <div className="relative">
                <input 
                  type="number"
                  value={whatsappPassCost}
                  onChange={e => setWhatsappPassCost(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 pr-10 focus:ring-2 focus:ring-amber-500/50"
                  min="0"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">NC</span>
              </div>
            </div>
          </div>

          {/* Gerador de Receitas Saudáveis com IA */}
          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-3">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <ChefHat size={16} className="text-orange-500" />
              <span className="text-xs font-bold truncate">Gerador de Receitas Saudáveis com IA</span>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Valor em NutriCoins</label>
              <div className="relative">
                <input 
                  type="number"
                  value={recipesPassCost}
                  onChange={e => setRecipesPassCost(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 pr-10 focus:ring-2 focus:ring-amber-500/50"
                  min="0"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">NC</span>
              </div>
            </div>
          </div>

          {/* Passe 24h Biblioteca de Treinos Compartilhados */}
          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-3">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Dumbbell size={16} className="text-cyan-500" />
              <span className="text-xs font-bold truncate">Passe 24h Treinos Compartilhados</span>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Valor em NutriCoins</label>
              <div className="relative">
                <input 
                  type="number"
                  value={sharedWorkoutsPassCost}
                  onChange={e => setSharedWorkoutsPassCost(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 pr-10 focus:ring-2 focus:ring-amber-500/50"
                  min="0"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">NC</span>
              </div>
            </div>
          </div>

          {/* Plano Premium Ilimitado Mensal (Real Money) */}
          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-3">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Coins size={16} className="text-rose-500" />
              <span className="text-xs font-bold truncate">Plano Premium</span>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Mensalidade em R$</label>
              <div className="relative">
                <input 
                  type="number"
                  step="0.01"
                  value={monthlyPremiumPrice}
                  onChange={e => setMonthlyPremiumPrice(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 pr-10 focus:ring-2 focus:ring-amber-500/50"
                  min="0"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">BRL</span>
              </div>
            </div>
          </div>

          {/* Plano Profissional Mensal (Real Money) */}
          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-3">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Crown size={16} className="text-cyan-500" />
              <span className="text-xs font-bold truncate">Plano Profissional</span>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Mensalidade em R$</label>
              <div className="relative">
                <input 
                  type="number"
                  step="0.01"
                  value={monthlyProfessionalPrice}
                  onChange={e => setMonthlyProfessionalPrice(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 pr-10 focus:ring-2 focus:ring-amber-500/50"
                  min="0"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">BRL</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSavePrices}
            disabled={savingPriceConfigs}
            className={`px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md transition-all duration-300 disabled:opacity-55 ${
              priceConfigSuccessMessage 
                ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-emerald-500/10" 
                : "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-amber-500/10"
            }`}
          >
            {savingPriceConfigs ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Salvando...
              </>
            ) : priceConfigSuccessMessage ? (
              <>
                <Check size={14} /> Alterações Salvas!
              </>
            ) : (
              <>
                <Check size={14} /> Salvar Alterações de Preço
              </>
            )}
          </motion.button>
        </div>
      </section>
        </>
      )}

      {activeAdminSubTab === 'connections' && (
        <>
          {/* WhatsApp Webhook Diagnostics Panel */}
          <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 dark:border-slate-800 pb-4 gap-2">
          <div className="space-y-1">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Bot size={18} className="text-purple-500" /> Diagnóstico de Webhook WhatsApp (Evolution API)
            </h3>
            <p className="text-xs text-slate-500">
              Monitore a chegada de requisições enviadas ao webhook da Evolution API em tempo real.
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setLogsRefreshCounter(p => p + 1)}
            disabled={loadingLogs}
            className="px-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5"
          >
            {loadingLogs ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Atualizar Webhooks
          </motion.button>
        </div>

        {/* Dynamic Webhook URL Card */}
        <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="space-y-1">
            <p className="font-bold text-slate-700 dark:text-slate-300">Sua URL do Webhook do WhatsApp:</p>
            <p className="text-[11px] text-slate-500">Configure este endereço na Evolution API para enviar as mensagens de volta para o aplicativo.</p>
            <div className="font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl text-emerald-600 dark:text-emerald-400 font-bold select-all break-all inline-block mt-1">
              {window.location.origin}/api/webhook/whatsapp
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              navigator.clipboard.writeText(window.location.origin + "/api/webhook/whatsapp");
              setCopiedWebhook(true);
              setTimeout(() => setCopiedWebhook(false), 2000);
            }}
            className="px-4 py-3 self-start md:self-center bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copiedWebhook ? "Copiado!" : "Copiar Link"}
          </motion.button>
        </div>

        <div className="space-y-3">
          {webhookLogs.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 dark:bg-slate-900/45 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Nenhum evento de webhook registrado no banco de dados ainda.
              </p>
              <p className="text-[11px] text-slate-400 mt-2 max-w-lg mx-auto">
                Para que logs apareçam, configure o webhook na Evolution API apontando para o seu APP_URL ou preview URL e envie uma mensagem de teste no seu WhatsApp! Veja as instruções de como configurar abaixo.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-96 overflow-y-auto pr-1">
              {webhookLogs.map((log, idx) => {
                const dateStr = log.timestamp ? new Date(log.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A';
                const dateFull = log.timestamp ? new Date(log.timestamp).toLocaleDateString('pt-BR') : '';
                
                let badgeColor = "bg-slate-100 text-slate-700";
                let badgeText = log.status || "PULADO";
                
                if (log.status === "success") {
                  badgeColor = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100/30";
                  badgeText = `🟢 Sucesso (${log.responseType || 'refeição'})`;
                } else if (log.status === "user_not_found") {
                  badgeColor = "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 border border-red-100/30";
                  badgeText = "🔴 Usuário Não Cadastrado";
                } else if (log.status === "unauthorized") {
                  badgeColor = "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-100/30";
                  badgeText = "🟡 Sem VIP ou Passe";
                } else if (log.status === "prompted_for_text") {
                  badgeColor = "bg-sky-50 text-sky-700 dark:bg-sky-950/20 dark:text-sky-400 border border-sky-100/30";
                  badgeText = "🔵 Mensagem Vazia/Formato Incompatível";
                } else if (log.status === "error") {
                  badgeColor = "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 border border-red-100/30 font-bold";
                  badgeText = "🔴 Erro (IA / Conexão)";
                }

                return (
                  <div key={log.id || idx} className="py-4 space-y-2 first:pt-0 last:pb-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-500 bg-slate-150 dark:bg-slate-800 px-2 py-0.5 rounded">
                          {dateStr}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {dateFull}
                        </span>
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Tel: {log.phone}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>
                        {badgeText}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-2 border-l-2 border-slate-100 dark:border-slate-800 text-xs">
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Entrada Recebida</p>
                        <p className="text-slate-800 dark:text-slate-300 break-words line-clamp-3">
                          {log.receivedText || (log.hasImage ? "📷 [Imagem enviada pelo prato]" : "Sem conteúdo legível")}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Resposta / Erro</p>
                        {log.error ? (
                          <p className="text-red-600 dark:text-red-400 font-mono text-[11px] break-words">
                            Detalhes: {log.error}
                          </p>
                        ) : (
                          <p className="text-slate-600 dark:text-slate-400 break-words line-clamp-3">
                            {log.responseMessage || "Nenhuma resposta de texto enviada de volta."}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* WhatsApp Evolution API Credentials */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-6 space-y-4">
          <div className="space-y-1">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5 px-0.5">
              <MessageSquare size={14} className="text-emerald-500" /> Credenciais de Integração WhatsApp (Evolution API)
            </h4>
            <p className="text-[11px] text-slate-400">
              Essas informações alimentam os endpoints de conversação, leitura de imagens via IA do prato e lembretes diários.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">URL do Servidor Evolution</label>
              <input 
                type="text"
                value={whatsappApiUrl}
                onChange={e => setWhatsappApiUrl(e.target.value)}
                placeholder="Ex e.g.: https://evolution.educapro.site"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Nome da Instância WhatsApp</label>
              <input 
                type="text"
                value={whatsappInstance}
                onChange={e => setWhatsappInstance(e.target.value)}
                placeholder="Ex e.g.: sport-nutri"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Chave API Global (apikey)</label>
              <div className="relative">
                <input 
                  type={showWhatsappApiKey ? "text" : "password"}
                  value={whatsappApiKey}
                  onChange={e => setWhatsappApiKey(e.target.value)}
                  placeholder="Chave secreta obtida na Evolution API"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-3 pr-10 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500/50"
                />
                <button
                  type="button"
                  onClick={() => setShowWhatsappApiKey(!showWhatsappApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  {showWhatsappApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-2 gap-2">
            <div>
              {credentialsSuccessMessage && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/20 px-3 py-1.5 rounded-xl border border-emerald-100/20 block">
                  {credentialsSuccessMessage}
                </span>
              )}
            </div>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSaveCredentials}
              disabled={savingCredentials}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10 disabled:opacity-55"
            >
              {savingCredentials ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Salvando...
                </>
              ) : (
                <>
                  <Check size={14} /> Salvar Credenciais
                </>
              )}
            </motion.button>
          </div>
        </div>

        {/* AI Provider Config Box */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-6 space-y-4">
          <div className="space-y-1">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5 px-0.5">
              <Sparkles size={14} className="text-indigo-500" /> Provedor de Inteligência Artificial
            </h4>
            <p className="text-[11px] text-slate-400">
              Escolha a empresa de IA e modelo para processar áudio, imagens ou texto nas receitas, assistente e WhatsApp.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Provedor / Empresa de IA</label>
              <select 
                value={aiProvider}
                onChange={e => {
                  const val = e.target.value;
                  setAiProvider(val);
                  // Auto-suggest default model for standard providers
                  if (val === "Google Gemini") setAiModel("gemini-3.5-flash");
                  else if (val === "OpenAI") setAiModel("gpt-4o");
                  else if (val === "Anthropic Claude") setAiModel("claude-3-5-sonnet");
                  else if (val === "DeepSeek") setAiModel("deepseek-chat");
                  else if (val === "Groq (AI Grátis/Código Aberto)") setAiModel("llama3-70b-8192");
                }}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="Google Gemini">Google Gemini</option>
                <option value="OpenAI">OpenAI (ChatGPT)</option>
                <option value="Anthropic Claude">Anthropic Claude</option>
                <option value="DeepSeek">DeepSeek AI</option>
                <option value="Groq (AI Grátis/Código Aberto)">Groq (AI Grátis/Código Aberto)</option>
                <option value="Outra">Outra (Digitar Nome...)</option>
              </select>
            </div>

            {aiProvider === 'Outra' && (
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Nome do Provedor Personalizado</label>
                <input 
                  type="text"
                  value={customAiProvider}
                  onChange={e => setCustomAiProvider(e.target.value)}
                  placeholder="Ex: Mistral AI, Cohere, xAI"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Modelo de IA</label>
              <input 
                type="text"
                value={aiModel}
                onChange={e => setAiModel(e.target.value)}
                placeholder="Ex: gemini-3.5-flash ou gpt-4o"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/50"
              />
              
              {/* Badge Suggestions */}
              <div className="flex flex-wrap gap-1 mt-1">
                {aiProvider === 'Google Gemini' && (
                  ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.1-pro-preview'].map(m => (
                    <button 
                      key={m} 
                      type="button" 
                      onClick={() => setAiModel(m)}
                      className={`text-[9px] px-1.5 py-0.5 rounded-md font-mono ${aiModel === m ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'}`}
                    >
                      {m}
                    </button>
                  ))
                )}
                {aiProvider === 'OpenAI' && (
                  ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'].map(m => (
                    <button 
                      key={m} 
                      type="button" 
                      onClick={() => setAiModel(m)}
                      className={`text-[9px] px-1.5 py-0.5 rounded-md font-mono ${aiModel === m ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'}`}
                    >
                      {m}
                    </button>
                  ))
                )}
                {aiProvider === 'Anthropic Claude' && (
                  ['claude-3-5-sonnet', 'claude-3-haiku'].map(m => (
                    <button 
                      key={m} 
                      type="button" 
                      onClick={() => setAiModel(m)}
                      className={`text-[9px] px-1.5 py-0.5 rounded-md font-mono ${aiModel === m ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'}`}
                    >
                      {m}
                    </button>
                  ))
                )}
                {aiProvider === 'DeepSeek' && (
                  ['deepseek-chat', 'deepseek-coder'].map(m => (
                    <button 
                      key={m} 
                      type="button" 
                      onClick={() => setAiModel(m)}
                      className={`text-[9px] px-1.5 py-0.5 rounded-md font-mono ${aiModel === m ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'}`}
                    >
                      {m}
                    </button>
                  ))
                )}
                {aiProvider === 'Groq (AI Grátis/Código Aberto)' && (
                  ['llama3-70b-8192', 'llama3-8b-8192', 'mixtral-8x7b-32768'].map(m => (
                    <button 
                      key={m} 
                      type="button" 
                      onClick={() => setAiModel(m)}
                      className={`text-[9px] px-1.5 py-0.5 rounded-md font-mono ${aiModel === m ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'}`}
                    >
                      {m}
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Chave API Secreta (API Key)</label>
              <div className="relative">
                <input 
                  type={showAiApiKey ? "text" : "password"}
                  value={aiApiKey}
                  onChange={e => setAiApiKey(e.target.value)}
                  placeholder="Cole aqui a chave secreta da API desta inteligência"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-3 pr-10 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/50"
                />
                <button
                  type="button"
                  onClick={() => setShowAiApiKey(!showAiApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  {showAiApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-2 gap-2">
            <div>
              {aiConfigSuccessMessage && (
                <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/20 px-3 py-1.5 rounded-xl border border-indigo-100/20 block">
                  {aiConfigSuccessMessage}
                </span>
              )}
            </div>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSaveAiConfig}
              disabled={savingAiConfig}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/10 disabled:opacity-55"
            >
              {savingAiConfig ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Salvando...
                </>
              ) : (
                <>
                  <Check size={14} /> Salvar Provedor IA
                </>
              )}
            </motion.button>
          </div>
        </div>

        {/* Nutri Search Mode Switch Config Box */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-6 space-y-4">
          <div className="space-y-1">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5 px-0.5">
              <Sparkles size={14} className="text-violet-500" /> Modo de Pesquisa de Alimentos
            </h4>
            <p className="text-[11px] text-slate-400">
              Decida se deseja que as calibrações de nutrientes busquem somente por APIs oficiais integradas (FatSecret / OFF) ou totalmente online via pesquisa Web dinâmica.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-3xl border border-slate-150 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1 max-w-xl">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Seleção de Provedor de Busca Nutricional:
              </p>
              <p className="text-[11px] text-slate-500">
                APIs utiliza bancos oficiais de alta precisão (como FatSecret e códigos de barras). Web realiza buscas em tempo real em todas as bases indexadas na internet de forma abrangente.
              </p>
            </div>

            <div className="flex bg-slate-200 dark:bg-slate-800 p-1.5 rounded-2xl gap-1 shrink-0 relative">
              <button
                type="button"
                id="search-mode-apis-btn"
                onClick={() => setFoodSearchMode('apis')}
                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  foodSearchMode === 'apis'
                    ? 'bg-gradient-to-r from-violet-500 to-violet-600 text-white shadow-sm font-extrabold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                APIs
              </button>
              
              <button
                type="button"
                id="search-mode-web-btn"
                onClick={() => setFoodSearchMode('web')}
                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  foodSearchMode === 'web'
                    ? 'bg-gradient-to-r from-violet-500 to-violet-600 text-white shadow-sm font-extrabold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Web
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-2 gap-2">
            <div>
              {searchModeSuccessMessage && (
                <span className="text-xs text-violet-600 dark:text-violet-400 font-bold bg-violet-50 dark:bg-violet-950/20 px-3 py-1.5 rounded-xl border border-violet-100/20 block">
                  {searchModeSuccessMessage}
                </span>
              )}
            </div>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              id="save-search-mode-btn"
              onClick={handleSaveSearchMode}
              disabled={savingSearchMode}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-violet-500 to-violet-600 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-violet-500/10 disabled:opacity-55"
            >
              {savingSearchMode ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Salvando...
                </>
              ) : (
                <>
                  <Check size={14} /> Salvar Modo de Busca
                </>
              )}
            </motion.button>
          </div>
        </div>
      </section>
        </>
      )}

      {activeAdminSubTab === 'gateways' && (
        <>
          {/* Payment Gateways Panel */}
          <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 dark:border-slate-800 pb-4 gap-2">
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CreditCard size={18} className="text-blue-500" /> Configuração de Gateways de Pagamento
                </h3>
                <p className="text-xs text-slate-500">
                  Gerencie as credenciais e selecione o gateway de pagamento ativo para processamento de assinaturas e compras na loja.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Gateway Selection Card */}
              <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-3xl border border-slate-150 dark:border-slate-800/80 space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Gateway Ativo</h4>
                
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Gateway para Web/Desktop</label>
                    <select
                      id="active-payment-gateway-select"
                      value={activePaymentGateway}
                      onChange={(e) => setActivePaymentGateway(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/50 outline-none"
                    >
                      <option value="mercado_pago">Mercado Pago</option>
                      <option value="stripe">Stripe (Cartão de Crédito e Pix)</option>
                      <option value="paypal">PayPal</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Modo de Operação</label>
                    <select
                      id="payment-mode-select"
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value as 'sandbox' | 'live')}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/50 outline-none"
                    >
                      <option value="sandbox">Sandbox (Ambiente de Testes / Simulação)</option>
                      <option value="live">Produção (Live - Dinheiro Real)</option>
                    </select>
                  </div>
                </div>

                <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/20 rounded-2xl text-[11px] text-blue-600 dark:text-blue-400 leading-relaxed">
                  Para pagamentos no aplicativo Android (Mobile), o sistema detectará automaticamente o Google Play Billing para conformidade com a loja de aplicativos. O gateway selecionado se aplica ao ambiente web e desktop.
                </div>
              </div>

              {/* General Settings Summary */}
              <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-3xl border border-slate-150 dark:border-slate-800/80 flex flex-col justify-between">
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Instruções de Integração</h4>
                  <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2 leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 font-bold">•</span>
                      <span>Ao utilizar o modo Sandbox, o sistema simula aprovações automáticas instantâneas para fins de desenvolvimento rápido.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 font-bold">•</span>
                      <span>No modo Produção, você deve fornecer chaves reais do respectivo provedor para processar transações legítimas dos usuários.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 font-bold">•</span>
                      <span>Chaves secretas e tokens de acesso são mantidos em cache seguro no servidor, ocultos do cliente e transmitidos de forma criptografada.</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    {paymentConfigSuccessMessage && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/20 px-3 py-1.5 rounded-xl border border-emerald-100/20 block">
                        {paymentConfigSuccessMessage}
                      </span>
                    )}
                  </div>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    id="save-payment-config-btn"
                    onClick={handleSavePaymentConfig}
                    disabled={savingPaymentConfig}
                    className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/10 disabled:opacity-55 w-full sm:w-auto cursor-pointer"
                  >
                    {savingPaymentConfig ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Salvando...
                      </>
                    ) : (
                      <>
                        <Check size={14} /> Salvar Configurações
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Gateways Credentials Forms */}
            <div className="space-y-6">
              <h4 className="text-sm font-black text-slate-800 dark:text-slate-200">Configurações Específicas dos Gateways</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Mercado Pago */}
                <div className={`p-5 rounded-3xl border transition-all duration-300 space-y-4 ${
                  activePaymentGateway === 'mercado_pago'
                    ? 'bg-blue-50/10 border-blue-200 dark:border-blue-900/30'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-150 dark:border-slate-800/80 opacity-75'
                }`}>
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#009ee3]" /> Mercado Pago
                    </h5>
                    {activePaymentGateway === 'mercado_pago' && (
                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-500 bg-blue-100/20 px-2 py-0.5 rounded-full">Ativo</span>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Public Key</label>
                      <input
                        type="text"
                        value={mercadoPagoPublicKey}
                        onChange={(e) => setMercadoPagoPublicKey(e.target.value)}
                        placeholder="APP_USR-..."
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500/50"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Access Token</label>
                      <div className="relative">
                        <input
                          type={showMercadoPagoAccessToken ? "text" : "password"}
                          value={mercadoPagoAccessToken}
                          onChange={(e) => setMercadoPagoAccessToken(e.target.value)}
                          placeholder="APP_USR-..."
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-700 dark:text-slate-300 pr-10 focus:ring-2 focus:ring-blue-500/50"
                        />
                        <button
                          type="button"
                          onClick={() => setShowMercadoPagoAccessToken(!showMercadoPagoAccessToken)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer border-none bg-transparent p-0"
                        >
                          {showMercadoPagoAccessToken ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stripe */}
                <div className={`p-5 rounded-3xl border transition-all duration-300 space-y-4 ${
                  activePaymentGateway === 'stripe'
                    ? 'bg-blue-50/10 border-blue-200 dark:border-blue-900/30'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-150 dark:border-slate-800/80 opacity-75'
                }`}>
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#635bff]" /> Stripe
                    </h5>
                    {activePaymentGateway === 'stripe' && (
                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-500 bg-blue-100/20 px-2 py-0.5 rounded-full">Ativo</span>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Publishable Key</label>
                      <input
                        type="text"
                        value={stripePublishableKey}
                        onChange={(e) => setStripePublishableKey(e.target.value)}
                        placeholder="pk_test_..."
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500/50"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Secret Key</label>
                      <div className="relative">
                        <input
                          type={showStripeSecretKey ? "text" : "password"}
                          value={stripeSecretKey}
                          onChange={(e) => setStripeSecretKey(e.target.value)}
                          placeholder="sk_test_..."
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-700 dark:text-slate-300 pr-10 focus:ring-2 focus:ring-blue-500/50"
                        />
                        <button
                          type="button"
                          onClick={() => setShowStripeSecretKey(!showStripeSecretKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer border-none bg-transparent p-0"
                        >
                          {showStripeSecretKey ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* PayPal */}
                <div className={`p-5 rounded-3xl border transition-all duration-300 space-y-4 ${
                  activePaymentGateway === 'paypal'
                    ? 'bg-blue-50/10 border-blue-200 dark:border-blue-900/30'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-150 dark:border-slate-800/80 opacity-75'
                }`}>
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#003087]" /> PayPal
                    </h5>
                    {activePaymentGateway === 'paypal' && (
                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-500 bg-blue-100/20 px-2 py-0.5 rounded-full">Ativo</span>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Client ID</label>
                      <input
                        type="text"
                        value={paypalClientId}
                        onChange={(e) => setPaypalClientId(e.target.value)}
                        placeholder="Ad_..."
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500/50"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Client Secret</label>
                      <div className="relative">
                        <input
                          type={showPaypalClientSecret ? "text" : "password"}
                          value={paypalClientSecret}
                          onChange={(e) => setPaypalClientSecret(e.target.value)}
                          placeholder="EL_..."
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-700 dark:text-slate-300 pr-10 focus:ring-2 focus:ring-blue-500/50"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPaypalClientSecret(!showPaypalClientSecret)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer border-none bg-transparent p-0"
                        >
                          {showPaypalClientSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </section>
        </>
      )}

      {activeAdminSubTab === 'foods' && (
        <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-50 dark:border-slate-800 pb-5">
            <div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                <ChefHat className="text-amber-500" />
                Catálogo de Alimentos (Tabela)
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Gerencie todos os alimentos do aplicativo (TACO, calibrações de IA e alimentos customizados).
              </p>
            </div>
            
            <button
              onClick={handleOpenAddFoodModal}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs cursor-pointer border-0 shadow-md shadow-amber-500/10 transition-all shrink-0"
            >
              <Plus size={14} />
              Novo Alimento
            </button>
          </div>

          <form onSubmit={handleFoodSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={foodsSearch}
                onChange={handleFoodSearchChange}
                placeholder="Pesquisar alimento por nome... (Ex: Pastel, Whey, Ovo)"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border-0 rounded-2xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30 font-medium transition-all"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-extrabold text-xs rounded-2xl cursor-pointer border-0 transition-all shrink-0"
            >
              Buscar
            </button>
          </form>

          {loadingFoods ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="animate-spin text-amber-500" size={32} />
              <p className="text-xs text-slate-400 font-medium">Buscando tabela de alimentos atualizada...</p>
            </div>
          ) : foodsList.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl">
              <Bot size={40} className="text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-400">Nenhum alimento cadastrado ou encontrado.</p>
              <p className="text-xs text-slate-300 mt-1">Clique em 'Novo Alimento' para registrar e calibrar um novo prato no banco de dados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 uppercase font-black tracking-wider">
                    <th className="px-5 py-4">Nome</th>
                    <th className="px-4 py-4">Categoria</th>
                    <th className="px-4 py-4 text-center">Calorias</th>
                    <th className="px-4 py-4 text-center">Proteína</th>
                    <th className="px-4 py-4 text-center">Carboidratos</th>
                    <th className="px-4 py-4 text-center">Gorduras</th>
                    <th className="px-4 py-4">Porção / Unidade</th>
                    <th className="px-5 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-slate-600 dark:text-slate-300">
                  {foodsList.map((f: any, idx: number) => {
                    const categoryColors: Record<string, string> = {
                      proteina: 'bg-red-50 text-red-500 dark:bg-red-950/20 dark:text-red-400',
                      carboidrato: 'bg-amber-50 text-amber-500 dark:bg-amber-950/20 dark:text-amber-400',
                      fruta: 'bg-emerald-50 text-emerald-500 dark:bg-emerald-950/20 dark:text-emerald-400',
                      vegetal: 'bg-teal-50 text-teal-500 dark:bg-teal-950/20 dark:text-teal-400',
                      gordura: 'bg-orange-50 text-orange-500 dark:bg-orange-950/20 dark:text-orange-400',
                      laticinio: 'bg-blue-50 text-blue-500 dark:bg-blue-950/20 dark:text-blue-400'
                    };
                    const catTheme = categoryColors[f.category] || 'bg-slate-50 text-slate-500 dark:bg-slate-950/20 dark:text-slate-400';

                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/30 transition-all font-medium">
                        <td className="px-5 py-4 text-slate-800 dark:text-slate-100 font-extrabold pr-2">
                          {f.name}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase ${catTheme}`}>
                            {f.category}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center font-bold text-slate-800 dark:text-slate-200">
                          {f.calories} kcal
                        </td>
                        <td className="px-4 py-4 text-center text-red-500 font-bold">
                          {f.protein}g
                        </td>
                        <td className="px-4 py-4 text-center text-amber-500 font-bold">
                          {f.carbs}g
                        </td>
                        <td className="px-4 py-4 text-center text-orange-500 font-bold">
                           {f.fat}g
                        </td>
                        <td className="px-4 py-4 text-slate-500 dark:text-slate-400">
                          {f.portion} ({f.grams_per_unit}{f.measure_unit})
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleOpenEditFoodModal(f)}
                              className="p-2 border-0 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-xl cursor-pointer transition-all"
                              title="Editar Alimento"
                            >
                              <Edit3 size={12} />
                            </button>
                            <button
                              onClick={() => handleDeleteFood(f.name)}
                              className="p-2 border-0 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950 text-red-500 dark:text-red-400 rounded-xl cursor-pointer transition-all"
                              title="Excluir Alimento"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {activeAdminSubTab === 'logs' && (
        <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-50 dark:border-slate-800 pb-5">
            <div className="space-y-1 max-w-full lg:max-w-[70%]">
              <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                <Sliders className="text-red-500" />
                Logs de Diagnóstico do Servidor
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Acompanhe o comportamento das requisições, diagnósticos da Inteligência Artificial (Gemini), bancos de dados e APIs em tempo real.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 mt-2 lg:mt-0 w-full lg:w-auto justify-start lg:justify-end">
              <button
                onClick={fetchSystemLogs}
                disabled={loadingDiagnosticsLogs}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 font-extrabold text-xs cursor-pointer border-0 transition-all shrink-0"
              >
                <RefreshCw size={12} className={loadingDiagnosticsLogs ? 'animate-spin' : ''} />
                Atualizar Logs
              </button>

              {showClearConfirm ? (
                <div className="flex items-center gap-1.5 bg-red-100/60 dark:bg-red-950/40 p-1 rounded-2xl border border-red-200 dark:border-red-900/50 animate-in fade-in-50 duration-200 shrink-0">
                  <span className="text-[10px] text-red-700 dark:text-red-400 font-extrabold px-1.5 uppercase tracking-wide">Limpar tudo?</span>
                  <button
                    onClick={handleClearLogs}
                    className="px-2.5 py-1 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-[10px] cursor-pointer border-0 transition-all uppercase"
                  >
                    Sim
                  </button>
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="px-2.5 py-1 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 font-extrabold text-[10px] cursor-pointer border-0 transition-all uppercase"
                  >
                    Não
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950 text-red-600 dark:text-red-400 font-extrabold text-xs cursor-pointer border-0 transition-all shrink-0"
                >
                  <Trash2 size={12} />
                  Limpar Logs
                </button>
              )}
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl">
            <div className="flex flex-wrap gap-1.5">
              {(['all', 'info', 'warn', 'error'] as const).map((lvl) => {
                const count = lvl === 'all' 
                  ? diagnosticsLogsList.length 
                  : diagnosticsLogsList.filter(l => l.level === lvl).length;
                return (
                  <button
                    key={lvl}
                    onClick={() => setDiagnosticsLogsFilter(lvl)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border-0 cursor-pointer transition-all ${
                      diagnosticsLogsFilter === lvl
                        ? lvl === 'error'
                          ? 'bg-red-500 text-white'
                          : lvl === 'warn'
                          ? 'bg-amber-500 text-white'
                          : lvl === 'info'
                          ? 'bg-blue-500 text-white'
                          : 'bg-purple-600 text-white'
                        : 'bg-slate-150 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {lvl.toUpperCase()} ({count})
                  </button>
                );
              })}
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Filtrar termo..."
                value={diagnosticsLogsSearchText}
                onChange={(e) => setDiagnosticsLogsSearchText(e.target.value)}
                className="pl-9 pr-4 py-2 text-xs w-full sm:w-64 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-purple-500 text-slate-700 dark:text-slate-300"
              />
            </div>
          </div>

          {diagnosticsLogsError && (
            <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-2xl text-xs text-red-600 dark:text-red-400 font-medium font-bold">
              {diagnosticsLogsError}
            </div>
          )}

          {diagnosticsLogsSuccessMessage && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl text-xs text-emerald-600 dark:text-emerald-400 font-medium font-bold">
              {diagnosticsLogsSuccessMessage}
            </div>
          )}

          {loadingDiagnosticsLogs ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
              <Loader2 className="animate-spin text-purple-600" size={32} />
              <span className="text-xs font-bold">Carregando logs do servidor...</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
                <div className="bg-slate-50 dark:bg-slate-900/60 px-4 py-3 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-405 tracking-wider">
                  ÚLTIMOS EVENTOS EM MEMÓRIA (NODE BUFFER)
                </div>
                
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[400px] overflow-y-auto font-mono text-[11px] leading-relaxed">
                  {(() => {
                    const filtered = diagnosticsLogsList.filter(l => {
                      const matchesLvl = diagnosticsLogsFilter === 'all' || l.level === diagnosticsLogsFilter;
                      const matchesTxt = !diagnosticsLogsSearchText || l.message.toLowerCase().includes(diagnosticsLogsSearchText.toLowerCase());
                      return matchesLvl && matchesTxt;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                          Nenhum log encontrado para os filtros selecionados.
                        </div>
                      );
                    }

                    return filtered.map((log) => {
                      let tagColor = "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400";
                      if (log.level === "warn") tagColor = "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400";
                      if (log.level === "error") tagColor = "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400";

                      return (
                        <div key={log.id} className="p-3 hover:bg-slate-50/50 dark:hover:bg-slate-900/35 transition-all flex gap-3 items-start">
                          <span className="text-slate-400 dark:text-slate-500 tracking-normal shrink-0">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                          <span className={`px-1.5 py-0.5 text-[9px] font-extrabold rounded shrink-0 ${tagColor}`}>
                            {log.level.toUpperCase()}
                          </span>
                          <span className="text-slate-700 dark:text-slate-300 break-all select-text font-medium whitespace-pre-wrap">
                            {log.message}
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Serverless persistent file logs */}
              {diagnosticsFileLogsList.length > 0 && (
                <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden mt-6">
                  <div className="bg-slate-50 dark:bg-slate-900/60 px-4 py-3 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-400 tracking-wider font-bold">
                    LOGS PERSISTIDOS NO DISCO TEMPORÁRIO
                  </div>
                  <div className="p-4 bg-slate-950 text-emerald-400 dark:text-emerald-400/90 font-mono text-[10px] max-h-[300px] overflow-y-auto leading-relaxed select-text space-y-1">
                    {diagnosticsFileLogsList
                      .filter(line => !diagnosticsLogsSearchText || line.toLowerCase().includes(diagnosticsLogsSearchText.toLowerCase()))
                      .map((line, idx) => (
                        <div key={idx} className="whitespace-pre-wrap">{line}</div>
                      ))}
                  </div>
                </div>
              )}
              
              {/* Salvar Arquivo .txt Button */}
              <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  id="btn-salvar-logs-txt"
                  onClick={downloadLogsAsText}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 active:scale-95 text-white font-black text-xs cursor-pointer border-0 shadow-md shadow-emerald-500/10 transition-all"
                >
                  <Download size={14} />
                  Salvar Arquivo .txt
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {activeAdminSubTab === 'vendas' && (
        <div className="space-y-6 animate-fade-in">
          {stats && (
            <>
          {/* Bento-grid counters stats */}
          <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <Users size={18} className="text-purple-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Usuários</span>
              </div>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-[10px] text-slate-400 font-medium">Registrados no Firestore</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <Crown size={18} className="text-amber-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Premium Ativos</span>
              </div>
              <div className="text-2xl font-bold text-amber-500">{stats.premiumUsers}</div>
              <p className="text-[10px] text-slate-400 font-medium">{Math.round((stats.premiumUsers / (stats.totalUsers || 1)) * 100)}% de taxa de conversão</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <TrendingUp size={18} className="text-emerald-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Vendas SAAS</span>
              </div>
              <div className="text-2xl font-bold text-emerald-500">R$ {stats.saasSalesVolume}</div>
              <p className="text-[10px] text-slate-400 font-medium">Faturamento Estimado</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <Activity size={18} className="text-cyan-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Tokens API Estimados</span>
              </div>
              <div className="text-2xl font-bold text-gradient">{stats.apiTokensUsed}</div>
              <p className="text-[10px] text-slate-400 font-medium">Modelos do Gemini API</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <Coins size={18} className="text-pink-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Custo IA Est. (R$)</span>
              </div>
              <div className="text-2xl font-bold text-pink-500">R$ {Number((stats.apiTokensUsed * 0.00012).toFixed(2))}</div>
              <p className="text-[10px] text-slate-400 font-medium">Consumo Financeiro IA</p>
            </div>
          </section>

          {/* Interactive Charts Section */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <TrendingUp size={16} /> Faturamento SAAS Semanal (Assinaturas MP)
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.salesHistory} style={{ outline: 'none' }}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} interval={0} />
                    <YAxis fontSize={10} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="volume" stroke="#10b981" fillOpacity={1} fill="url(#colorSales)" name="Faturamento (R$)" style={{ outline: 'none' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Activity size={16} /> Uso das Ferramentas Inteligentes (Requisições diárias)
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.toolsUsage} style={{ outline: 'none' }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} interval={0} />
                    <YAxis fontSize={10} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="requisicoes" fill="#a855f7" radius={[4, 4, 0, 0]} name="Acessos" style={{ outline: 'none' }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Coins size={16} className="text-pink-500" /> Investimento Mensal IA (R$ Custo Gemini)
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.apiMonthlyCosts} style={{ outline: 'none' }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" fontSize={10} axisLine={false} tickLine={false} interval={0} />
                    <YAxis fontSize={10} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(value) => [`R$ ${value}`, "Custo API"]} />
                    <Bar dataKey="custo" fill="#ec4899" radius={[4, 4, 0, 0]} name="Custo API" style={{ outline: 'none' }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
            </>
          )}
        </div>
      )}

      {activeAdminSubTab === 'atletas' && (
        /* User administration list */
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users size={18} className="text-purple-500" /> Registro Completo de Atletas
            </h3>
            <p className="text-xs text-slate-400">Selecione um usuário para editar seus NutriCoins, alterar permissões, privilégios e excluir.</p>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Buscar Usuário"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-2xl text-xs focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Sort and Filter Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2 pt-2 pb-1 text-[11px] sm:text-xs">
          <span className="text-slate-400 font-semibold mr-1">Odernar:</span>
          
          {/* A-Z Sort button */}
          <button
            onClick={() => {
              if (sortField === 'name') {
                setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
              } else {
                setSortField('name');
                setSortDirection('asc');
              }
            }}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all duration-200 flex items-center gap-1 border ${
              sortField === 'name' 
                ? 'bg-purple-100 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/50 text-purple-700 dark:text-purple-300 shadow-sm font-semibold' 
                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-150 dark:border-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            <span>A-Z</span>
            {sortField === 'name' && (sortDirection === 'asc' ? ' (Crescente ▲)' : ' (Decrescente ▼)')}
          </button>

          {/* Data de Cadastro Sort button */}
          <button
            onClick={() => {
              if (sortField === 'cadastro') {
                setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
              } else {
                setSortField('cadastro');
                setSortDirection('asc');
              }
            }}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all duration-200 flex items-center gap-1 border ${
              sortField === 'cadastro' 
                ? 'bg-purple-100 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/50 text-purple-700 dark:text-purple-300 shadow-sm font-semibold' 
                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-150 dark:border-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            <span>Data</span>
            {sortField === 'cadastro' && (sortDirection === 'asc' ? ' (Crescente ▲)' : ' (Decrescente ▼)')}
          </button>

          {/* Último Acesso Sort button */}
          <button
            onClick={() => {
              if (sortField === 'ultimo_acesso') {
                setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
              } else {
                setSortField('ultimo_acesso');
                setSortDirection('desc');
              }
            }}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all duration-200 flex items-center gap-1 border ${
              sortField === 'ultimo_acesso' 
                ? 'bg-purple-100 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/50 text-purple-700 dark:text-purple-300 shadow-sm font-semibold' 
                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-150 dark:border-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            <span>Acesso</span>
            {sortField === 'ultimo_acesso' && (sortDirection === 'asc' ? ' (Crescente ▲)' : ' (Decrescente ▼)')}
          </button>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block"></div>

          {/* Exibir Somente Premium checkbox/button */}
          <button
            onClick={() => setOnlyPremium(prev => !prev)}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all duration-200 flex items-center gap-1 border ${
              onlyPremium 
                ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50 text-amber-600 dark:text-amber-400 shadow-sm font-bold/80' 
                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-150 dark:border-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            <Crown size={12} className={onlyPremium ? "text-amber-500 animate-bounce" : ""} />
            <span>Premium</span>
          </button>

          {/* Lixeira filter button */}
          <button
            onClick={() => setShowTrashOnly(prev => !prev)}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all duration-200 flex items-center gap-1 border ${
              showTrashOnly 
                ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-450 shadow-sm font-bold' 
                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-150 dark:border-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            <Trash2 size={12} className={showTrashOnly ? "text-rose-500 animate-bounce" : "text-slate-400"} />
            <span>Lixeira ({users.filter(u => u.is_deleted).length})</span>
          </button>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto select-none no-scrollbar">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                <th className="pb-3 font-bold">USUÁRIO</th>
                <th className="pb-3 font-bold">WHATSAPP</th>
                <th className="pb-3 font-bold text-center">PRIVILÉGIO</th>
                <th className="pb-3 font-bold text-center">NC</th>
                <th className="pb-3 font-bold text-center">SEQUÊNCIA</th>
                <th className="pb-3 font-bold">PREMIUM</th>
                <th className="pb-3 font-bold text-right">EDITAR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                  <td className="py-4 flex items-center gap-3">
                    <img 
                      src={u.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${u.username}`} 
                      className="w-8 h-8 rounded-xl object-cover border border-slate-100 dark:border-slate-800"
                      onError={(e)=>{ (e.target as any).src='https://api.dicebear.com/7.x/pixel-art/svg?seed=atleta'; }}
                    />
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                        {u.username}
                        {u.role === 'admin' && <Shield size={12} className="text-red-500" />}
                        {u.role === 'professional' && <Shield size={12} className="text-cyan-500" />}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {u.email || (u.username?.includes("@") ? u.username : "Sem e-mail")}
                      </div>
                    </div>
                  </td>
                  <td className="py-4">
                    <span className="font-mono text-slate-600 dark:text-slate-300">{u.whatsapp || 'Não configurado'}</span>
                  </td>
                  <td className="py-4 text-center">
                    <span className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase ${
                      u.role === 'admin' 
                        ? 'bg-red-50 dark:bg-red-950/20 text-red-600' 
                        : u.role === 'professional'
                        ? 'bg-cyan-50 dark:bg-cyan-950/20 text-cyan-600'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}>
                      {u.role === 'professional' ? 'Profissional' : u.role === 'admin' ? 'Admin' : 'Usuário'}
                    </span>
                  </td>
                   <td className="py-4 text-center">
                    {inlineEditingUserId === u.id ? (
                      <div className="flex items-center justify-center gap-1 focus-within:outline-none" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="number"
                          step="any"
                          value={inlineCoinsValue === "" ? "" : inlineCoinsValue}
                          onChange={e => {
                            const val = e.target.value;
                            if (val === "") {
                              setInlineCoinsValue("");
                            } else {
                              const num = parseFloat(val);
                              setInlineCoinsValue(isNaN(num) ? "" : num);
                            }
                          }}
                          onBlur={() => {
                            if (!isCancelledRef.current) {
                              handleInlineCoinsSave(u.id, inlineCoinsValue);
                            }
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                            } else if (e.key === 'Escape') {
                              isCancelledRef.current = true;
                              setInlineEditingUserId(null);
                            }
                          }}
                          className="w-20 text-center font-bold text-amber-500 border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg py-1 px-1 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <span
                        onClick={() => {
                          isCancelledRef.current = false;
                          setInlineEditingUserId(u.id);
                          setInlineCoinsValue(u.xp || 0);
                        }}
                        className="font-bold text-amber-500 hover:scale-105 active:scale-95 transition-transform cursor-pointer px-2 py-1 rounded hover:bg-amber-50 dark:hover:bg-amber-950/20 inline-block text-center"
                        title="Clique para edição rápida de moedas"
                      >
                        🪙 {u.xp || 0}
                      </span>
                    )}
                  </td>
                  <td className="py-4 text-center font-bold">
                    🔥 {u.streak || 0} dias
                  </td>
                  <td className="py-4">
                    {getPremiumLabel(u.premium_access_until)}
                  </td>
                  <td className="py-4 text-right">
                    <div className="flex justify-end gap-1.5">
                      {showTrashOnly ? (
                        <>
                          <button 
                            onClick={() => handleRestoreUser(u.id)}
                            className="p-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                            title="Restaurar Atleta"
                          >
                            <RotateCcw size={12} />
                          </button>
                          <button 
                            onClick={() => handlePermanentDelete(u.id)}
                            className="p-1.5 rounded-lg border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/25"
                            title="Excluir Permanentemente"
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => openEditUser(u)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Editar completo"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button 
                            onClick={() => handleSoftDelete(u.id)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:border-red-300 hover:text-red-550 hover:bg-red-50 dark:hover:bg-red-950/20"
                            title="Excluir (Enviar para Lixeira)"
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    Nenhum atleta encontrado correspondente à sua busca.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Slide-over or Modal edit component */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-end bg-black/50 backdrop-blur-sm animate-fade-in">
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-md h-full bg-white dark:bg-slate-900 p-8 shadow-2xl overflow-y-auto flex flex-col justify-between"
            >
              <div className="space-y-6">
                <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
                  <h4 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Shield size={18} className="text-purple-500" /> Ações do Administrador
                  </h4>
                  <button 
                    onClick={() => setSelectedUser(null)}
                    className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl">
                  <img 
                    src={selectedUser.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${selectedUser.username}`} 
                    className="w-12 h-12 rounded-2xl"
                  />
                  <div>
                    <h5 className="font-extrabold text-slate-800 dark:text-white">{selectedUser.username}</h5>
                    <p className="text-[10px] text-slate-400">{selectedUser.email}</p>
                    <div className="text-[10px] font-mono text-cyan-500 uppercase mt-0.5">{selectedUser.id}</div>
                  </div>
                </div>

                {/* Edit Form */}
                <div className="space-y-4">
                  {/* NutriCoins Input */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Saldo NutriCoins (NC)</label>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setEditingCoins(prev => Math.max(0, (Number(prev) || 0) - 500))}
                        className="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200"
                      >
                        -500
                      </button>
                      <input 
                        type="number"
                        step="any"
                        value={editingCoins === "" ? "" : editingCoins}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === "") {
                            setEditingCoins("");
                          } else {
                            const num = parseFloat(val);
                            setEditingCoins(isNaN(num) ? "" : num);
                          }
                        }}
                        className="w-full text-center font-bold text-amber-500 border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl py-2 focus:ring-2 focus:ring-purple-500"
                      />
                      <button 
                        onClick={() => setEditingCoins(prev => (Number(prev) || 0) + 500)}
                        className="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200"
                      >
                        +500
                      </button>
                    </div>
                  </div>

                  {/* Role selection */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Níveis de Privilégio</label>
                    <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAdminSelected(false);
                          setIsProfessionalSelected(false);
                          setEditingRole('user');
                        }}
                        className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border-0 ${
                          (!isAdminSelected && !isProfessionalSelected)
                            ? "bg-purple-600 text-white shadow-md shadow-purple-600/25"
                            : "bg-transparent text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white"
                        }`}
                      >
                        Usuário
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const nextProf = !isProfessionalSelected;
                          setIsProfessionalSelected(nextProf);
                          if (nextProf) {
                            setEditingRole(isAdminSelected ? 'admin' : 'professional');
                          } else {
                            setEditingRole(isAdminSelected ? 'admin' : 'user');
                          }
                        }}
                        className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border-0 ${
                          isProfessionalSelected
                            ? "bg-purple-600 text-white shadow-md shadow-purple-600/25"
                            : "bg-transparent text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white"
                        }`}
                      >
                        Profissional
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const nextAdmin = !isAdminSelected;
                          setIsAdminSelected(nextAdmin);
                          if (nextAdmin) {
                            setEditingRole('admin');
                          } else {
                            setEditingRole(isProfessionalSelected ? 'professional' : 'user');
                          }
                        }}
                        className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border-0 ${
                          isAdminSelected
                            ? "bg-purple-600 text-white shadow-md shadow-purple-600/25"
                            : "bg-transparent text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white"
                        }`}
                      >
                        Administrador
                      </button>
                    </div>
                  </div>

                  {/* Premium Date */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Expiração do Premium</label>
                    <div className="flex flex-col gap-2">
                      <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                        <button
                          type="button"
                          onClick={() => setEditingPremium('')}
                          className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border-0 ${
                            !editingPremium
                              ? "bg-purple-600 text-white shadow-md shadow-purple-600/25"
                              : "bg-transparent text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white"
                          }`}
                        >
                          Inativo
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingPremium('unlimited')}
                          className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border-0 ${
                            editingPremium === 'unlimited'
                              ? "bg-purple-600 text-white shadow-md shadow-purple-600/25"
                              : "bg-transparent text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white"
                          }`}
                        >
                          Ilimitado
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingPremium(new Date(Date.now() + 86400000).toISOString())}
                          className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border-0 ${
                            (editingPremium && editingPremium !== 'unlimited' && ((new Date(editingPremium).getTime() - Date.now()) / 3600000 <= 36))
                              ? "bg-purple-600 text-white shadow-md shadow-purple-600/25"
                              : "bg-transparent text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white"
                          }`}
                        >
                          Passe 24h
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingPremium(new Date(Date.now() + 2592000000).toISOString())}
                          className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border-0 ${
                            (editingPremium && editingPremium !== 'unlimited' && ((new Date(editingPremium).getTime() - Date.now()) / 3600000 > 36))
                              ? "bg-purple-600 text-white shadow-md shadow-purple-600/25"
                              : "bg-transparent text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white"
                          }`}
                        >
                          Plano Mensal
                        </button>
                      </div>
                      {editingPremium && editingPremium !== 'unlimited' && (
                        <input 
                          type="datetime-local" 
                          value={editingPremium.substring(0, 16)} 
                          onChange={e => setEditingPremium(new Date(e.target.value).toISOString())}
                          className="border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl py-2 px-3 text-xs" 
                        />
                      )}
                    </div>
                  </div>


                </div>
              </div>

              {/* Botões do Slide-Over */}
              <div className="space-y-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={saveUserUpdates}
                  disabled={savingEdit}
                  className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 hover:opacity-90 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {savingEdit ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : editSuccess ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    "Confirmar Alterações"
                  )}
                </button>
                {!selectedUser.is_deleted ? (
                  <button
                    type="button"
                    onClick={() => handleSoftDelete(selectedUser.id)}
                    className="w-full bg-rose-50 hover:bg-rose-105 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-450 font-bold py-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 cursor-pointer border border-rose-100 dark:border-rose-900/30 transition-colors"
                  >
                    <Trash2 size={13} /> Excluir
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleRestoreUser(selectedUser.id)}
                      className="w-1/2 bg-emerald-50 hover:bg-emerald-105 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold py-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 cursor-pointer border border-emerald-100 dark:border-emerald-900/30 transition-colors"
                    >
                      <RotateCcw size={13} /> Restaurar
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePermanentDelete(selectedUser.id)}
                      className="w-1/2 bg-red-50 hover:bg-red-105 dark:bg-red-950/20 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 font-bold py-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 cursor-pointer border border-red-100 dark:border-red-900/30 transition-colors"
                    >
                      <Trash2 size={13} /> Excluir Permanente
                    </button>
                  </div>
                )}
                <button
                  onClick={() => setSelectedUser(null)}
                  className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 font-bold py-3 rounded-2xl text-xs cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Custom Confirmation Dialog */}
        {confirmConfig && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-6 shadow-2xl max-w-sm w-full space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                {confirmConfig.action === 'restore' ? (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-full">
                    <RotateCcw size={20} />
                  </div>
                ) : (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-full">
                    <Trash2 size={20} />
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    {confirmConfig.action === 'trash' && "Enviar para Lixeira?"}
                    {confirmConfig.action === 'restore' && "Restaurar Atleta?"}
                    {confirmConfig.action === 'delete' && "EXCLUIR PERMANENTEMENTE?"}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-mono">Confirmação de Segurança</p>
                </div>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pt-1">
                {confirmConfig.action === 'trash' && (
                  <>Deseja mover o atleta <span className="font-extrabold text-slate-800 dark:text-white">{confirmConfig.username}</span> para a lixeira? Ele continuará salvo e poderá ser restaurado a qualquer momento.</>
                )}
                {confirmConfig.action === 'restore' && (
                  <>Deseja restaurar o cadastro do atleta <span className="font-extrabold text-slate-800 dark:text-white">{confirmConfig.username}</span> para o status ativo?</>
                )}
                {confirmConfig.action === 'delete' && (
                  <>Atenção extrema: tem certeza que deseja <span className="font-extrabold text-rose-600 dark:text-rose-400">EXCLUIR PERMANENTEMENTE</span> o atleta <span className="font-extrabold text-slate-800 dark:text-white">{confirmConfig.username}</span>? Toda a conta do usuário e histórico serão apagados definitivamente do banco de dados.</>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmConfig(null)}
                  className="w-1/2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 font-bold py-3 rounded-2xl text-xs cursor-pointer transition-all active:scale-98"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAction}
                  className={`w-1/2 font-bold py-3 rounded-2xl text-xs cursor-pointer text-white shadow-sm hover:opacity-95 transition-all active:scale-98 ${
                    confirmConfig.action === 'restore' 
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-500/10' 
                      : 'bg-gradient-to-r from-rose-500 to-red-600 shadow-rose-500/10'
                  }`}
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Custom Foods Add/Edit Modal */}
        {isFoodModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative space-y-6"
            >
              <button
                type="button"
                onClick={() => setIsFoodModalOpen(false)}
                className="absolute right-4 top-4 p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 rounded-2xl border-0 cursor-pointer transition-all"
              >
                <X size={16} />
              </button>

              <div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <ChefHat className="text-amber-500" />
                  {selectedFood ? 'Editar Alimento' : 'Adicionar Novo Alimento'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Seus alimentos personalizados são sincronizados instantaneamente para garantir calibrações perfeitas com a inteligência artificial.
                </p>
              </div>

              {foodSuccessMessage ? (
                <div className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 p-4 rounded-2xl flex items-center gap-3 text-xs font-bold ring-1 ring-emerald-500/10">
                  <Check size={16} className="text-emerald-500 animate-bounce" />
                  {foodSuccessMessage}
                </div>
              ) : (
                <form onSubmit={handleSaveFood} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider">Nome do Alimento</label>
                    <input
                      type="text"
                      required
                      value={foodNameInput}
                      onChange={(e) => setFoodNameInput(e.target.value)}
                      placeholder="Ex: Mini Pastel de Frango"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border-0 rounded-2xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30 font-medium transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider">Categoria</label>
                      <select
                        value={foodCategoryInput}
                        onChange={(e) => setFoodCategoryInput(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border-0 rounded-2xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30 font-medium transition-all cursor-pointer"
                      >
                        <option value="proteina">Proteína</option>
                        <option value="carboidrato">Carboidrato</option>
                        <option value="fruta">Fruta</option>
                        <option value="vegetal">Vegetal</option>
                        <option value="gordura">Gordura</option>
                        <option value="laticinio">Laticínio</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider">Calorias (100g ou ref)</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={foodCaloriesInput}
                        onChange={(e) => setFoodCaloriesInput(e.target.value)}
                        placeholder="kcal"
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border-0 rounded-2xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30 font-medium transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider">Proteína (g)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        required
                        value={foodProteinInput}
                        onChange={(e) => setFoodProteinInput(e.target.value)}
                        placeholder="g"
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border-0 rounded-2xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30 font-medium transition-all"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider">Carboidratos (g)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        required
                        value={foodCarbsInput}
                        onChange={(e) => setFoodCarbsInput(e.target.value)}
                        placeholder="g"
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border-0 rounded-2xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30 font-medium transition-all"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider">Gorduras (g)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        required
                        value={foodFatInput}
                        onChange={(e) => setFoodFatInput(e.target.value)}
                        placeholder="g"
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border-0 rounded-2xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30 font-medium transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider">Unid. Medida</label>
                      <input
                        type="text"
                        required
                        value={foodMeasureUnitInput}
                        onChange={(e) => setFoodMeasureUnitInput(e.target.value)}
                        placeholder="Ex: fatia ou g"
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border-0 rounded-2xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30 font-medium transition-all"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider">Peso / Unidade (g)</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={foodGramsPerUnitInput}
                        onChange={(e) => setFoodGramsPerUnitInput(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border-0 rounded-2xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30 font-medium transition-all"
                      />
                    </div>

                    <div className="space-y-1 flex flex-col justify-end">
                      <div className="h-9 flex items-center justify-center p-2 rounded-2xl bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase text-center tracking-wider font-extrabold">
                        Tabela Pronta
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsFoodModalOpen(false)}
                      className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-450 font-extrabold text-xs rounded-2xl cursor-pointer border-0 transition-all text-center"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={savingFood}
                      className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-extrabold text-xs rounded-2xl cursor-pointer border-0 shadow-md shadow-amber-500/10 transition-all text-center flex items-center justify-center gap-2 font-extrabold"
                    >
                      {savingFood && <Loader2 className="animate-spin" size={14} />}
                      {selectedFood ? 'Salvar Alterações' : 'Cadastrar Alimento'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}

        {/* Custom Error Toast */}
        {errorToast && (
          <div className="fixed bottom-6 right-6 z-[130] max-w-sm animate-fade-in">
            <div className="flex items-center gap-3 bg-rose-600 text-white rounded-2xl p-4 shadow-xl border border-rose-500">
              <AlertCircle size={20} className="shrink-0" />
              <div className="flex-1 text-xs font-bold leading-normal">{errorToast}</div>
              <button 
                onClick={() => setErrorToast(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-white cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
