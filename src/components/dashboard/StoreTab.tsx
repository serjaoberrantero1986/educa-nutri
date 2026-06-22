import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Coins, 
  Flame, 
  Snowflake, 
  Mic, 
  Camera, 
  CreditCard, 
  Sparkles, 
  Check, 
  AlertCircle, 
  ArrowRight,
  User,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Clock,
  Loader2,
  Bot,
  MessageSquare,
  ChefHat
} from 'lucide-react';
import { Profile } from '../../types';
import { db, isFirebaseConfigured } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { createPaymentApi, getPaymentStatusApi, paymentService } from '../../services/paymentService';
import { StoreConfig, DEFAULT_STORE_CONFIG } from '../../services/storeConfigService';

interface StoreTabProps {
  profile: Profile | null;
  setProfile: React.Dispatch<React.SetStateAction<Profile | null>>;
  user: any;
  storeConfig?: StoreConfig;
}

export const StoreTab: React.FC<StoreTabProps> = ({
  profile,
  setProfile,
  user,
  storeConfig
}) => {
  const config = storeConfig || DEFAULT_STORE_CONFIG;

  const [loadingItem, setLoadingItem] = useState<string | null>(null);
  const [paymentModal, setPaymentModal] = useState<'pix' | 'card' | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  // Active payment state for server-side integration
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [activePaymentResponse, setActivePaymentResponse] = useState<any | null>(null);
  const [pollingIntervalId, setPollingIntervalId] = useState<any>(null);

  // Check if premium is active
  const isPremiumActive = profile?.premium_access_until 
    ? (profile.premium_access_until === 'unlimited' || new Date(profile.premium_access_until).getTime() > Date.now())
    : false;

  const isAssistantActive = isPremiumActive || 
    (profile?.nutri_assistant_active === true) || 
    (typeof profile?.nutri_assistant_active === 'string' && new Date(profile.nutri_assistant_active).getTime() > Date.now());

  const isWhatsappActive = isPremiumActive || 
    (profile?.whatsapp_access_until === 'unlimited') || 
    (typeof profile?.whatsapp_access_until === 'string' && new Date(profile.whatsapp_access_until).getTime() > Date.now());

  const isRecipesActive = isPremiumActive || 
    (profile?.recipes_access_until === 'unlimited') || 
    (typeof profile?.recipes_access_until === 'string' && new Date(profile.recipes_access_until).getTime() > Date.now());

  const getPremiumTimeLeft = () => {
    if (!profile?.premium_access_until) return '';
    if (profile.premium_access_until === 'unlimited') return 'Acesso Ilimitado';
    const diff = new Date(profile.premium_access_until).getTime() - Date.now();
    if (diff <= 0) return '';
    const hours = Math.ceil(diff / (1000 * 60 * 60));
    return `${hours}h restantes`;
  };

  const getRecipesTimeLeft = () => {
    if (isPremiumActive || profile?.recipes_access_until === 'unlimited') return 'Acesso Ilimitado';
    if (!profile?.recipes_access_until) return '';
    const diff = new Date(profile.recipes_access_until).getTime() - Date.now();
    if (diff <= 0) return '';
    const hours = Math.ceil(diff / (1000 * 60 * 60));
    return `${hours}h restantes`;
  };

  const getAssistantTimeLeft = () => {
    if (isPremiumActive || profile?.nutri_assistant_active === true) return 'Acesso Ilimitado';
    if (!profile?.nutri_assistant_active) return '';
    const diff = new Date(profile.nutri_assistant_active).getTime() - Date.now();
    if (diff <= 0) return '';
    const hours = Math.ceil(diff / (1000 * 60 * 60));
    return `${hours}h restantes`;
  };

  const getWhatsappTimeLeft = () => {
    if (isPremiumActive || profile?.whatsapp_access_until === 'unlimited') return 'Acesso Ilimitado';
    if (!profile?.whatsapp_access_until) return '';
    const diff = new Date(profile.whatsapp_access_until).getTime() - Date.now();
    if (diff <= 0) return '';
    const hours = Math.ceil(diff / (1000 * 60 * 60));
    return `${hours}h restantes`;
  };

  const handleBuyStreakFreeze = async () => {
    if (!profile) return;
    if ((profile.xp || 0) < config.streak_freeze_cost) {
      alert('Seu saldo de NutriCoins é insuficiente!');
      return;
    }
    if (profile.streak_freeze_active) {
      alert('Você já possui um Bloqueio de Sequência ativo!');
      return;
    }

    setLoadingItem('freeze');
    try {
      const finalCoins = (profile.xp || 0) - config.streak_freeze_cost;
      const updatedProfile = {
        ...profile,
        xp: finalCoins,
        streak_freeze_active: true
      };

      if (isFirebaseConfigured) {
        const profileRef = doc(db, 'profiles', user.uid);
        await updateDoc(profileRef, {
          xp: finalCoins,
          streak_freeze_active: true
        });
      }
      setProfile(updatedProfile);
      alert('Bloqueio de Sequência ativado com sucesso! ❄️ Sua sequência agora está protegida caso você esqueça de registrar um dia.');
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingItem(null);
    }
  };

  const handleBuy24hPass = async () => {
    if (!profile) return;
    if ((profile.xp || 0) < config.premium_pass_cost) {
      alert('Seu saldo de NutriCoins é insuficiente!');
      return;
    }

    setLoadingItem('pass24h');
    try {
      const finalCoins = (profile.xp || 0) - config.premium_pass_cost;
      const twentyFourHoursFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      
      const updatedProfile = {
        ...profile,
        xp: finalCoins,
        premium_access_until: twentyFourHoursFromNow
      };

      if (isFirebaseConfigured) {
        const profileRef = doc(db, 'profiles', user.uid);
        await updateDoc(profileRef, {
          xp: finalCoins,
          premium_access_until: twentyFourHoursFromNow
        });
      }
      setProfile(updatedProfile);
      alert('Passe de 24h Premium ativado! 🌟 Agora você pode usar os recursos de foto e gravação de voz livremente pelas próximas 24 horas.');
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingItem(null);
    }
  };

  const handleBuyNutriAssistant = async () => {
    if (!profile) return;
    if ((profile.xp || 0) < config.assistant_pass_cost) {
      alert('Seu saldo de NutriCoins é insuficiente!');
      return;
    }
    if (isAssistantActive) {
      alert('Você já possui o Nutri-Assistant AI ativo no momento!');
      return;
    }

    setLoadingItem('nutri_assistant');
    try {
      const finalCoins = (profile.xp || 0) - config.assistant_pass_cost;
      const twentyFourHoursFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const updatedProfile = {
        ...profile,
        xp: finalCoins,
        nutri_assistant_active: twentyFourHoursFromNow
      };

      if (isFirebaseConfigured) {
        const profileRef = doc(db, 'profiles', user.uid);
        await updateDoc(profileRef, {
          xp: finalCoins,
          nutri_assistant_active: twentyFourHoursFromNow
        });
      }
      setProfile(updatedProfile);
      alert('Passe 24h Nutri Assistant AI adquirido com sucesso! 🤖💪 Agora o chatbot conversacional está desbloqueado para você pelas próximas 24 horas para criar, atualizar ou excluir registros com facilidade.');
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingItem(null);
    }
  };

  const handleBuyWhatsappPass = async () => {
    if (!profile) return;
    if ((profile.xp || 0) < config.whatsapp_pass_cost) {
      alert('Seu saldo de NutriCoins é insuficiente!');
      return;
    }
    if (isWhatsappActive) {
      alert('Você já possui a integração do WhatsApp ativa no momento!');
      return;
    }

    setLoadingItem('whatsapp_pass');
    try {
      const finalCoins = (profile.xp || 0) - config.whatsapp_pass_cost;
      const twentyFourHoursFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const updatedProfile = {
        ...profile,
        xp: finalCoins,
        whatsapp_access_until: twentyFourHoursFromNow
      };

      if (isFirebaseConfigured) {
        const profileRef = doc(db, 'profiles', user.uid);
        await updateDoc(profileRef, {
          xp: finalCoins,
          whatsapp_access_until: twentyFourHoursFromNow
        });
      }
      setProfile(updatedProfile);
      alert('Passe 24h WhatsApp AI Bot ativado com sucesso! 💬📲 Agora você pode interagir diretamente com o seu assistente pessoal no WhatsApp pelas próximas 24 horas para registrar, auditar e gerenciar sua dieta via chat de forma 100% humanizada!');
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingItem(null);
    }
  };

  const handleBuyRecipesPass = async () => {
    if (!profile) return;
    if ((profile.xp || 0) < config.recipes_pass_cost) {
      alert('Seu saldo de NutriCoins é insuficiente!');
      return;
    }
    if (isRecipesActive) {
      alert('Você já possui o acesso às Receitas Inteligentes ativo no momento!');
      return;
    }

    setLoadingItem('recipes_pass');
    try {
      const finalCoins = (profile.xp || 0) - config.recipes_pass_cost;
      const twentyFourHoursFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const updatedProfile = {
        ...profile,
        xp: finalCoins,
        recipes_access_until: twentyFourHoursFromNow
      };

      if (isFirebaseConfigured) {
        const profileRef = doc(db, 'profiles', user.uid);
        await updateDoc(profileRef, {
          xp: finalCoins,
          recipes_access_until: twentyFourHoursFromNow
        });
      }
      setProfile(updatedProfile);
      alert('Passe 24h Receitas Inteligentes ativado com sucesso! 🍳🧑‍🍳 Agora você tem acesso ilimitado ao gerador de receitas saudáveis com Inteligência Artificial pelas próximas 24 horas!');
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingItem(null);
    }
  };

  const handleCloseModal = () => {
    setPaymentModal(null);
    setPaymentError(null);
    setActivePaymentResponse(null);
    setIsCreatingPayment(false);
    if (pollingIntervalId) {
      clearInterval(pollingIntervalId);
      setPollingIntervalId(null);
    }
  };

  const handleInitiatePayment = async (method: 'pix' | 'card') => {
    if (!profile || !user) return;
    
    setPaymentError(null);
    setIsCreatingPayment(true);
    setPaymentModal(method);
    setActivePaymentResponse(null);
    setCopiedKey(false);
    
    if (pollingIntervalId) {
      clearInterval(pollingIntervalId);
      setPollingIntervalId(null);
    }

    try {
      const rawName = profile.username || 'Usuário';
      const nameParts = rawName.trim().split(' ');
      const firstName = nameParts[0] || 'Nome';
      const lastName = nameParts.slice(1).join(' ') || 'Sobrenome';

      const payload = {
        amount: config.monthly_premium_price,
        description: 'Acesso Mensal Premium - SportNutri',
        email: user.email || 'usuario@sportnutri.com',
        firstName,
        lastName,
        paymentMethod: method,
        token: method === 'card' ? 'card_token_sandbox' : undefined
      };

      const isAndroidApp = typeof window !== "undefined" && 
        (window as any).Capacitor && 
        (window as any).Capacitor.getPlatform() === "android";

      let result;
      if (isAndroidApp) {
        console.log('[StoreTab] Executing local Google Play billing flow...');
        result = await paymentService.createPayment({
          amount: config.monthly_premium_price,
          description: 'Acesso Mensal Premium - SportNutri',
          email: user.email || 'usuario@sportnutri.com',
          firstName,
          lastName,
          paymentMethod: 'card'
        });
      } else {
        console.log('[StoreTab] Calling web Mercado Pago back-end API...');
        result = await createPaymentApi(payload);
      }
      
      if (result.errorMessage || result.status === 'rejected') {
        setPaymentError(result.errorMessage || 'Falha ao processar a criação do pagamento.');
        return;
      }

      setActivePaymentResponse(result);

      if (isAndroidApp) {
        if (result.status === 'approved' || result.statusDetail === 'sandbox_approved') {
          await handleCompletePremiumPurchase();
        }
      } else if (method === 'pix' && result.id) {
        const interval = setInterval(async () => {
          try {
            const statusCheck = await getPaymentStatusApi(result.id);
            if (statusCheck.status === 'approved') {
              clearInterval(interval);
              setPollingIntervalId(null);
              await handleCompletePremiumPurchase();
            }
          } catch (pollingErr) {
            console.log('Error verifying background payment status:', pollingErr);
          }
        }, 4000);
        setPollingIntervalId(interval);
      }
    } catch (err: any) {
      console.error('Error initiating payment session:', err);
      setPaymentError(err.message || 'Falha ao conectar com o servidor para criar pagamento.');
    } finally {
      setIsCreatingPayment(false);
    }
  };

  const handleCompletePremiumPurchase = async () => {
    if (!profile) return;
    try {
      setPaymentSuccess(true);
      
      const updatedProfile = {
        ...profile,
        premium_access_until: 'unlimited',
        paid_premium: true
      };

      if (isFirebaseConfigured) {
        const profileRef = doc(db, 'profiles', user.uid);
        await updateDoc(profileRef, {
          premium_access_until: 'unlimited',
          paid_premium: true
        });
      }
      setProfile(updatedProfile);
      
      setTimeout(() => {
        handleCloseModal();
        setPaymentSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error finalising premium subscription:', err);
    }
  };

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black text-slate-900 dark:text-white flex items-center justify-center gap-2">
          Loja <span className="text-purple-600 dark:text-purple-400">NutriCoins</span>
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
          Utilize suas moedas conquistadas com disciplina para desbloquear benefícios e recursos extras!
        </p>
      </div>

      {/* Coins Wallet Card */}
      <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden flex items-center justify-between">
        <div className="absolute right-0 top-0 translate-y-1 translate-x-2 text-white/10 select-none">
          <Coins size={150} />
        </div>
        <div className="relative z-10 space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-100">Seu Saldo Atual</span>
          <div className="text-4xl font-extrabold flex items-center gap-2">
            🪙 {profile?.xp || 0} <span className="text-lg font-black tracking-widest text-amber-100">NC</span>
          </div>
          {profile?.streak && profile.streak > 0 ? (
            <p className="text-xs text-slate-800 bg-slate-100/90 px-3 py-1 rounded-full inline-block font-black mt-1 shadow-sm">
              🎉 Sequência de {profile.streak} {profile.streak === 1 ? 'dia' : 'dias'} ativa!
            </p>
          ) : null}
        </div>
        <div className="relative z-10 flex flex-col items-end text-right space-y-2">
          {profile?.streak_freeze_active && (
            <div className="flex items-center gap-1.5 bg-blue-500/30 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full font-black border border-blue-400/30">
              <Snowflake size={12} className="animate-pulse" /> Bloqueio Ativo
            </div>
          )}
          {isPremiumActive && (
            <div className="flex items-center gap-1.5 bg-purple-500/30 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full font-black border border-purple-400/30">
              <Sparkles size={12} className="text-amber-300" /> {getPremiumTimeLeft()}
            </div>
          )}
          {isRecipesActive && !isPremiumActive && (
            <div className="flex items-center gap-1.5 bg-yellow-500/30 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full font-black border border-yellow-400/30">
              <ChefHat size={12} className="text-amber-300" /> Receitas Ativas
            </div>
          )}
        </div>
      </div>

      {/* Section: Itens da Loja */}
      <div className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 px-1">Seus Benefícios com NutriCoins</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Bloqueio de Sequência */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-sky-50 dark:bg-sky-950/20 rounded-2xl flex items-center justify-center text-sky-500 shrink-0">
                <Snowflake size={24} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  Bloqueio de Sequência 
                  {profile?.streak_freeze_active && <span className="text-[9px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 px-1.5 py-0.5 rounded-md">Adquirido</span>}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Evita que sua sequência de dias acumulados (streak) seja reiniciada se você esquecer de registrar suas refeições por um dia inteiro.
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-800/80 pt-4">
              <span className="font-extrabold text-sm text-slate-700 dark:text-slate-300">🪙 {config.streak_freeze_cost} NC</span>
              <button
                disabled={profile?.streak_freeze_active || (profile?.xp || 0) < config.streak_freeze_cost || loadingItem !== null}
                onClick={handleBuyStreakFreeze}
                className={`px-4 py-2 text-xs font-black rounded-xl transition-all uppercase tracking-wider ${
                  profile?.streak_freeze_active 
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                    : (profile?.xp || 0) < config.streak_freeze_cost
                      ? 'bg-slate-50 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-sky-500 to-sky-600 text-white hover:brightness-105 active:scale-95'
                }`}
              >
                {loadingItem === 'freeze' ? 'Comprando...' : 'Adquirir'}
              </button>
            </div>
          </div>

          {/* Passe Premium 24h */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-purple-50 dark:bg-purple-950/20 rounded-2xl flex items-center justify-center text-purple-600 shrink-0">
                <Sparkles size={24} className="text-amber-500" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  Passe 24h Premium (Voz, Foto & Busca Livre)
                  {isPremiumActive && <span className="text-[9px] bg-purple-100 dark:bg-purple-900/30 text-purple-600 px-1.5 py-0.5 rounded-md">Ativo</span>}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Desbloqueie a digitação por áudio, envio de fotos por IA, e a **Busca Livre Inteligente** por 24 horas consecutivas para agilizar seus logs de dieta.
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-800/80 pt-4">
              <span className="font-extrabold text-sm text-slate-700 dark:text-slate-300">🪙 {config.premium_pass_cost} NC</span>
              <button
                disabled={(profile?.xp || 0) < config.premium_pass_cost || loadingItem !== null || profile?.premium_access_until === 'unlimited'}
                onClick={handleBuy24hPass}
                className={`px-4 py-2 text-xs font-black rounded-xl transition-all uppercase tracking-wider ${
                  profile?.premium_access_until === 'unlimited'
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                    : (profile?.xp || 0) < config.premium_pass_cost
                      ? 'bg-slate-50 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:brightness-105 active:scale-95'
                }`}
              >
                {loadingItem === 'pass24h' ? 'Ativando...' : 'Ativar'}
              </button>
            </div>
          </div>

          {/* Passe 24h Nutri Assistant AI */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/20 rounded-2xl flex items-center justify-center text-indigo-600 shrink-0">
                <Bot size={24} className="text-purple-600 dark:text-purple-400" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  Passe 24h Nutri Assistant AI
                  {isAssistantActive && <span className="text-[9px] bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 px-1.5 py-0.5 rounded-md">Ativo {getAssistantTimeLeft() ? `(${getAssistantTimeLeft()})` : ''}</span>}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Desbloqueie o assistente virtual autônomo por 24 horas consecutivas. Registre alimentos complexos, edite macros e organize seu consumo diário via chat amigável.
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-800/80 pt-4">
              <span className="font-extrabold text-sm text-slate-700 dark:text-slate-300">🪙 {config.assistant_pass_cost} NC</span>
              <button
                disabled={isPremiumActive || isAssistantActive || (profile?.xp || 0) < config.assistant_pass_cost || loadingItem !== null}
                onClick={handleBuyNutriAssistant}
                className={`px-4 py-2 text-xs font-black rounded-xl transition-all uppercase tracking-wider ${
                  (isPremiumActive || isAssistantActive)
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                    : (profile?.xp || 0) < config.assistant_pass_cost
                      ? 'bg-slate-50 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:brightness-105 active:scale-95'
                }`}
              >
                {loadingItem === 'nutri_assistant' ? 'Comprando...' : (isPremiumActive || isAssistantActive) ? 'Adquirido' : 'Adquirir'}
              </button>
            </div>
          </div>

          {/* Passe 24h WhatsApp AI Bot */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0">
                <MessageSquare size={24} className="text-emerald-500" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  Passe 24h WhatsApp AI Bot
                  {isWhatsappActive && <span className="text-[9px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 px-1.5 py-0.5 rounded-md">Ativo {getWhatsappTimeLeft() ? `(${getWhatsappTimeLeft()})` : ''}</span>}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Conecte seu WhatsApp pessoal ao assistente de IA humanizado. Envie mensagens, grave áudios longos de refeições ou mande fotos do prato para registrar diretamente no app!
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-800/80 pt-4">
              <span className="font-extrabold text-sm text-slate-700 dark:text-slate-300">🪙 {config.whatsapp_pass_cost} NC</span>
              <button
                disabled={isPremiumActive || isWhatsappActive || (profile?.xp || 0) < config.whatsapp_pass_cost || loadingItem !== null}
                onClick={handleBuyWhatsappPass}
                className={`px-4 py-2 text-xs font-black rounded-xl transition-all uppercase tracking-wider ${
                  (isPremiumActive || isWhatsappActive)
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                    : (profile?.xp || 0) < config.whatsapp_pass_cost
                      ? 'bg-slate-50 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:brightness-105 active:scale-95'
                }`}
              >
                {loadingItem === 'whatsapp_pass' ? 'Ativando...' : (isPremiumActive || isWhatsappActive) ? 'Ativo' : 'Adquirir'}
              </button>
            </div>
          </div>

          {/* Passe 24h Receitas Saudáveis com IA */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-orange-50 dark:bg-orange-950/20 rounded-2xl flex items-center justify-center text-orange-650 shrink-0">
                <ChefHat size={24} className="text-orange-500" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  Passe 24h Receitas Saudáveis com IA
                  {isRecipesActive && <span className="text-[9px] bg-orange-100 dark:bg-orange-950/30 text-orange-600 px-1.5 py-0.5 rounded-md">Ativo {getRecipesTimeLeft() ? `(${getRecipesTimeLeft()})` : ''}</span>}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Desbloqueie o gerador inteligente de Receitas Saudáveis por 24 horas consecutivas. Crie receitas com fotos, ingredientes saudáveis personalizados e níveis de dificuldade!
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-800/80 pt-4">
              <span className="font-extrabold text-sm text-slate-700 dark:text-slate-300">🪙 {config.recipes_pass_cost} NC</span>
              <button
                disabled={isPremiumActive || isRecipesActive || (profile?.xp || 0) < config.recipes_pass_cost || loadingItem !== null}
                onClick={handleBuyRecipesPass}
                className={`px-4 py-2 text-xs font-black rounded-xl transition-all uppercase tracking-wider ${
                  (isPremiumActive || isRecipesActive)
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                    : (profile?.xp || 0) < config.recipes_pass_cost
                      ? 'bg-slate-50 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-orange-500 to-amber-600 text-white hover:brightness-105 active:scale-95'
                }`}
              >
                {loadingItem === 'recipes_pass' ? 'Ativando...' : (isPremiumActive || isRecipesActive) ? 'Ativo' : 'Adquirir'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Premium Subscription banner with Real Money */}
      <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 rounded-3xl p-6 text-white shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 bg-yellow-400/20 backdrop-blur-sm text-yellow-300 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase border border-yellow-400/30 w-fit">
              <Sparkles size={10} /> Plano Premium Ilimitado
            </div>
            <h3 className="text-xl font-black">Combinação Completa: Receitas Inteligentes, Voz, Foto, WhatsApp & Mais!</h3>
          </div>
          <Sparkles size={36} className="text-yellow-400 shrink-0" />
        </div>
        
         <p className="text-xs text-purple-100 leading-relaxed">
          Sem anúncios, sem limites de moedas NutriCoins, acesso total à câmera, upload de fotos, comando de voz inteligente, busca livre por IA, integração e chat via WhatsApp AI Bot, gerador de Receitas Saudáveis com IA e desbloqueio total do Nutri-Assistant AI. Registre e prepare tudo com Inteligência Artificial!
        </p>

        <ul className="text-xs space-y-2 text-purple-100 font-medium">
          <li className="flex items-start gap-2">
            <CheckCircle2 size={14} className="text-cyan-400 shrink-0 mt-0.5" /> <span>Gerador de Receitas Saudáveis com IA Incluso (Visual instigante, fotos e níveis de preparo)</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={14} className="text-cyan-400 shrink-0 mt-0.5" /> <span>Integração Ilimitada com WhatsApp AI Bot (Mensagens, Áudios & Fotos de prato)</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={14} className="text-cyan-400 shrink-0 mt-0.5" /> <span>Nutri-Assistant AI Incluso (Chat de conversa livre ultra-inteligente)</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={14} className="text-cyan-400 shrink-0 mt-0.5" /> <span>Busca Livre com Inteligência Artificial para estimativa de macros</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={14} className="text-cyan-400 shrink-0 mt-0.5" /> <span>Cadastro fotográfico ilimitado por IA</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={14} className="text-cyan-400 shrink-0 mt-0.5" /> <span>Registro inteligente por ditado de voz livre amigável</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={14} className="text-cyan-400 shrink-0 mt-0.5" /> <span>Multiplicador permanente de NutriCoins diários (+15%)</span>
          </li>
        </ul>

        <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-purple-500/50 gap-4">
          <div>
            <div className="text-xs text-purple-200">Assinatura mensal por apenas:</div>
            <div className="text-2xl font-black text-yellow-300">R$ {config.monthly_premium_price.toFixed(2).replace('.', ',')} <span className="text-xs font-semibold text-purple-200">MENSAL</span></div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            {typeof window !== "undefined" && (window as any).Capacitor && (window as any).Capacitor.getPlatform() === "android" ? (
              <button 
                disabled={isCreatingPayment}
                onClick={() => handleInitiatePayment('card')}
                className="w-full sm:w-auto px-6 py-3 bg-black hover:bg-slate-950 text-white text-xs font-black rounded-xl transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer border border-slate-800 shadow-lg shadow-black/30 disabled:opacity-55"
              >
                <Sparkles size={14} className="text-yellow-400 animate-pulse" /> Pagar com Google Play / G Pay
              </button>
            ) : (
              <>
                <button 
                  disabled={isCreatingPayment}
                  onClick={() => handleInitiatePayment('pix')}
                  className="flex-1 sm:flex-none px-4 py-3 bg-teal-500 hover:bg-teal-400 text-white text-xs font-black rounded-xl transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-teal-500/20 disabled:opacity-55"
                >
                  PIX Instantâneo
                </button>
                <button 
                  disabled={isCreatingPayment}
                  onClick={() => handleInitiatePayment('card')}
                  className="flex-1 sm:flex-none px-4 py-3 bg-white hover:bg-slate-100 text-purple-600 text-xs font-black rounded-xl transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-white/10 disabled:opacity-55"
                >
                  <CreditCard size={14} /> Cartão de Crédito
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Payment Modals */}
      <AnimatePresence>
        {paymentModal !== null && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl border border-slate-100 dark:border-slate-800 text-center relative overflow-hidden"
            >
              <button 
                onClick={handleCloseModal}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                id="close-payment-modal-btn"
              >
                ✕
              </button>

              {paymentSuccess ? (
                <div className="py-10 space-y-4 flex flex-col items-center">
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1] }} 
                    transition={{ duration: 0.5, repeat: 1 }}
                    className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/20 rounded-full flex items-center justify-center text-emerald-500"
                    id="payment-success-badge"
                  >
                    <ShieldCheck size={40} />
                  </motion.div>
                  <div>
                    <h4 className="text-lg font-black text-slate-950 dark:text-white">Pagamento Aprovado!</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Sua conta foi promovida para Premium Ilimitado!</p>
                  </div>
                </div>
              ) : isCreatingPayment ? (
                <div className="py-12 space-y-4 flex flex-col items-center">
                  <Loader2 className="w-12 h-12 text-purple-600 animate-spin" />
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">Integrando Mercado Pago</h4>
                    <p className="text-xs text-slate-400 mt-1">Buscando dados de faturamento seguros...</p>
                  </div>
                </div>
              ) : paymentError ? (
                <div className="py-8 space-y-4">
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-950/20 rounded-full mx-auto flex items-center justify-center text-red-500">
                    <AlertCircle size={28} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">Erro no Faturamento</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 px-4 leading-relaxed bg-slate-50 dark:bg-slate-800/50 py-2 rounded-xl border border-slate-100 dark:border-slate-800 font-mono text-left max-h-32 overflow-y-auto">
                      {paymentError}
                    </p>
                  </div>
                  <button 
                    onClick={handleCloseModal}
                    className="px-6 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-black rounded-xl transition-all"
                  >
                    Tentar Novamente
                  </button>
                </div>
              ) : paymentModal === 'pix' ? (
                <div className="space-y-5">
                  <div className="flex flex-col items-center">
                    <span className="p-3 bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 rounded-2xl mb-2">
                      <Sparkles size={24} />
                    </span>
                    <h3 className="font-black text-slate-900 dark:text-white">Pagamento via PIX</h3>
                    <p className="text-xs text-slate-400 px-3">Escaneie o QR Code abaixo com o aplicativo do seu banco</p>
                  </div>

                  {/* QR Code Canvas */}
                  <div className="w-48 h-48 bg-white dark:bg-white rounded-3xl mx-auto flex items-center justify-center border border-slate-200 dark:border-slate-700 p-2 shadow-inner">
                    {activePaymentResponse?.qrCodeCopyPaste ? (
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=7c3aed&data=${encodeURIComponent(activePaymentResponse.qrCodeCopyPaste)}`}
                        alt="Pix QR Code"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-xs text-slate-400">QR Code indisponível</div>
                    )}
                  </div>

                  {/* Copia e Cola box */}
                  {activePaymentResponse?.qrCodeCopyPaste && (
                    <div className="space-y-1.5 text-left">
                      <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Código Pix Copia e Cola</span>
                      <div className="flex bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-150 dark:border-slate-700 overflow-hidden pr-1 items-center">
                        <input 
                          type="text" 
                          readOnly 
                          value={activePaymentResponse.qrCodeCopyPaste}
                          className="w-full px-3 py-2 text-[10px] font-mono text-slate-600 dark:text-slate-300 bg-transparent border-none outline-none select-all"
                        />
                        <button
                          onClick={() => {
                            if (activePaymentResponse?.qrCodeCopyPaste) {
                              navigator.clipboard.writeText(activePaymentResponse.qrCodeCopyPaste);
                              setCopiedKey(true);
                              setTimeout(() => setCopiedKey(false), 2500);
                            }
                          }}
                          className="p-1 px-3 bg-purple-cyan text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shrink-0 transition-all hover:opacity-95 cursor-pointer"
                        >
                          {copiedKey ? <Check size={11} /> : <Copy size={11} />}
                          {copiedKey ? "Copiado!" : "Copiar"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Live Status Indicator */}
                  <div className="flex items-center justify-center gap-1.5 py-2.5 text-[11px] text-purple-600 dark:text-purple-400 font-bold bg-purple-500/5 dark:bg-purple-400/5 border border-purple-500/10 dark:border-purple-400/10 rounded-xl">
                    <span className="w-2 h-2 bg-purple-500 rounded-full animate-ping shrink-0" />
                    <span>Verificando transferência automaticamente...</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 text-left">
                  <div className="text-center">
                    <h3 className="font-black text-slate-900 dark:text-white text-lg">Cartão de Crédito</h3>
                    <p className="text-xs text-slate-400">Coloque seus dados com total segurança.</p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Nome no Cartão</label>
                      <input 
                        type="text" 
                        value={cardName}
                        onChange={e => setCardName(e.target.value)}
                        placeholder="JOÃO DA SILVA"
                        className="w-full px-4 py-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white focus:outline-purple-500"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Número do Cartão</label>
                      <input 
                        type="text" 
                        value={cardNumber}
                        onChange={e => setCardNumber(e.target.value.replace(/\D/g, '').substring(0, 16))}
                        placeholder="0000 0000 0000 0000"
                        className="w-full px-4 py-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white focus:outline-purple-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Validade</label>
                        <input 
                          type="text" 
                          value={cardExpiry}
                          onChange={e => setCardExpiry(e.target.value)}
                          placeholder="MM/AA"
                          className="w-full px-4 py-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white focus:outline-purple-500"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">CVV</label>
                        <input 
                          type="password" 
                          value={cardCvv}
                          onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').substring(0, 3))}
                          placeholder="123"
                          className="w-full px-4 py-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white focus:outline-purple-500"
                        />
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={handleCompletePremiumPurchase}
                    className="w-full py-4 mt-2 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-1.5 cursor-pointer text-center border-none"
                    id="submit-card-payment-btn"
                  >
                    Efetuar Pagamento
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};
