import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, User, Chrome, ArrowRight, Loader2, AlertCircle, X } from 'lucide-react';
import { getApiUrl } from '../utils';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../lib/firebase';

interface AuthProps {
  onSuccess: () => void;
  onClose?: () => void;
}

const setCookie = (name: string, value: string, days: number) => {
  const expires = new Date(Date.now() + days * 1e3 * 60 * 60 * 24).toUTCString();
  document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + expires + '; path=/';
};

const getCookie = (name: string) => {
  return document.cookie.split('; ').reduce((r, v) => {
    const parts = v.split('=');
    const key = parts[0]?.trim();
    return key === name ? decodeURIComponent(parts[1] || '') : r;
  }, '');
};

const eraseCookie = (name: string) => {
  document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
};

export const Auth: React.FC<AuthProps> = ({ onSuccess, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    const cookieVal = getCookie('remember_me');
    return cookieVal !== 'false';
  });
  const [email, setEmail] = useState(() => {
    return getCookie('remembered_email') || '';
  });
  const [password, setPassword] = useState(() => {
    return getCookie('remembered_password') || '';
  });
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rememberMe) {
      setCookie('remember_me', 'true', 30);
      setCookie('remembered_email', email, 30);
      setCookie('remembered_password', password, 30);
    } else {
      setCookie('remember_me', 'false', 30);
      eraseCookie('remembered_email');
      eraseCookie('remembered_password');
    }
    
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (isSignUp) {
        const response = await fetch(getApiUrl('/api/auth/register'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, username })
        });
        
        const text = await response.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          throw new Error(`Erro do servidor (${response.status}): Servidor indisponível ou bloqueado por CORS.`);
        }
        
        if (!response.ok) {
          throw new Error(data.error || 'Erro ao cadastrar');
        }

        // Auto-login after registration
        localStorage.setItem('token', data.token);
        
        // Setup initial user profile preferences
        const mockProfileData = {
          xp: 150,
          streak: 1,
          league: 'Bronze',
          role: 'user',
          avatar_url: `https://i.pravatar.cc/150?u=${data.user.id}`
        };
        
        await fetch(getApiUrl(`/api/profiles/${data.user.id}`), {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(mockProfileData)
        });

        setSuccessMessage('Cadastro realizado com sucesso! Inicializando seu painel...');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        const response = await fetch(getApiUrl('/api/auth/login'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        
        const text = await response.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          throw new Error(`Erro do servidor (${response.status}): Servidor indisponível ou bloqueado por CORS.`);
        }
        
        if (!response.ok) {
          throw new Error(data.error || 'Erro ao fazer login');
        }

        localStorage.setItem('token', data.token);
        setSuccessMessage('Login realizado com sucesso! Redirecionando...');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'Erro de autenticação');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (googleLoading || loading) return;
    setGoogleLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (!isFirebaseConfigured) {
        // Fallback or simulated mode
        const demoEmail = "demo-google@example.com";
        const demoUid = "demo-google-uid";
        const demoName = "Usuário Google Demo";

        const response = await fetch(getApiUrl('/api/auth/google'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: demoEmail, uid: demoUid, username: demoName })
        });

        const text = await response.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          throw new Error(`Erro do servidor (${response.status}): Resposta inválida. Certifique-se de configurar a variável VITE_API_URL no Vercel.`);
        }

        if (!response.ok) {
          throw new Error(data.error || 'Erro ao processar login com Google');
        }

        localStorage.setItem('token', data.token);
        setSuccessMessage('Login simulador Google realizado com sucesso!');
        setTimeout(() => {
          onSuccess();
          window.location.reload();
        }, 1500);
        return;
      }

      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (!user) {
        throw new Error("Não foi possível obter dados do usuário do Google.");
      }

      // Sincroniza usuário com o backend SQLite
      const response = await fetch(getApiUrl('/api/auth/google'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          uid: user.uid,
          username: user.displayName || user.email?.split('@')[0] || 'Usuário Google'
        })
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Erro de sincronização (${response.status}): Servidor indisponível ou bloqueado por CORS. Por favor, configure a variável VITE_API_URL no Vercel apontando para o seu backend oficial.`);
      }

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao sincronizar login com o servidor');
      }

      localStorage.setItem('token', data.token);
      setSuccessMessage('Login com Google realizado com sucesso! Redirecionando...');
      setTimeout(() => {
        onSuccess();
        window.location.reload();
      }, 1500);

    } catch (err: any) {
      console.error('Google Auth error:', err);
      setError(err.message || 'Erro ao fazer login com o Google. Por favor, tente novamente.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 relative">
      {onClose && (
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
        >
          <X size={24} />
        </button>
      )}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          {isSignUp ? 'Criar Conta' : 'Bem-vindo de volta'}
        </h2>
        <p className="text-slate-500 dark:text-slate-400">
          {isSignUp ? 'Comece sua jornada fitness hoje' : 'Acesse sua conta para continuar'}
        </p>
      </div>

      <form onSubmit={handleAuth} className="space-y-4">
        {isSignUp && (
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase ml-1">Nome de Usuário</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-purple-500 transition-all dark:text-white"
                placeholder="ex: joao_fitness"
                required
              />
            </div>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-400 uppercase ml-1">E-mail</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-purple-500 transition-all dark:text-white"
              placeholder="seu@email.com"
              required
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-400 uppercase ml-1">Senha</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-purple-500 transition-all dark:text-white"
              placeholder="••••••••"
              required
            />
          </div>
        </div>

        <div className="flex items-center gap-2 py-1 select-none">
          <input
            id="remember-me"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500 accent-purple-600 bg-slate-50 dark:bg-slate-800 cursor-pointer"
          />
          <label htmlFor="remember-me" className="text-xs font-bold text-slate-500 dark:text-slate-400 cursor-pointer">
            Lembrar de mim
          </label>
        </div>

        {error && (
          <p className="text-red-500 text-sm text-center font-medium bg-red-50 dark:bg-red-950/20 p-3 rounded-xl border border-red-100 dark:border-red-900/30">{error}</p>
        )}

        {successMessage && (
          <p className="text-green-500 text-sm text-center font-medium bg-green-50 dark:bg-green-950/20 p-3 rounded-xl border border-green-100 dark:border-green-900/30">{successMessage}</p>
        )}

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={loading || googleLoading}
          className="w-full py-4 bg-purple-cyan text-white font-bold rounded-2xl shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <>
              {isSignUp ? 'Cadastrar' : 'Entrar'} <ArrowRight size={18} />
            </>
          )}
        </motion.button>
      </form>

      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-100 dark:border-slate-800"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white dark:bg-slate-900 px-4 text-slate-400 font-bold">Ou continue com</span>
        </div>
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        disabled={loading || googleLoading}
        onClick={handleGoogleLogin}
        className="w-full py-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-700 dark:text-white font-bold rounded-2xl flex items-center justify-center gap-3 shadow-sm disabled:opacity-50 cursor-pointer"
      >
        {googleLoading ? (
          <Loader2 className="animate-spin text-purple-600" size={20} />
        ) : (
          <>
            <Chrome size={20} className="text-red-500" /> Google
          </>
        )}
      </motion.button>

      <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
        {isSignUp ? 'Já tem uma conta?' : 'Não tem uma conta?'}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsSignUp(!isSignUp)}
          className="ml-2 text-purple-600 font-bold hover:underline"
        >
          {isSignUp ? 'Entrar' : 'Cadastrar-se'}
        </motion.button>
      </p>
    </div>
  );
};
