import React, { useState } from 'react';
import { auth, db, isFirebaseConfigured } from '../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Mail, Lock, User, Chrome, ArrowRight, Loader2, AlertCircle, X } from 'lucide-react';

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
    
    if (!isFirebaseConfigured) {
      // In demo mode, just succeed
      onSuccess();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        // Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Initialize user profile in Firestore
        const profileRef = doc(db, 'profiles', user.uid);
        await setDoc(profileRef, {
          id: user.uid,
          username: username || email.split('@')[0],
          email: email,
          xp: 150, // Initial starter XP, matching previous session's profile state
          streak: 1,
          league: 'Bronze',
          role: 'user',
          premium_access_until: null,
          whatsapp_access_until: null,
          avatar_url: `https://i.pravatar.cc/150?u=${user.uid}`,
          created_at: new Date().toISOString()
        });

        alert('Cadastro realizado com sucesso!');
        onSuccess();
      } else {
        // Sign in with Firebase Auth
        await signInWithEmailAndPassword(auth, email, password);
        onSuccess();
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let message = err.message;
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        message = 'E-mail ou senha inválidos';
      } else if (err.code === 'auth/email-already-in-use') {
        message = 'Usuário já cadastrado com este e-mail';
      } else if (err.code === 'auth/weak-password') {
        message = 'A senha deve ter pelo menos 6 caracteres';
      } else if (err.code === 'auth/invalid-email') {
        message = 'Formato de e-mail inválido';
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!isFirebaseConfigured) {
      onSuccess();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      // Use signInWithPopup as instructed by SKILL.md
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;

      // Check if profile exists already, if not create it
      const profileRef = doc(db, 'profiles', user.uid);
      const profileSnap = await getDoc(profileRef);

      if (!profileSnap.exists()) {
        await setDoc(profileRef, {
          id: user.uid,
          username: user.displayName || email.split('@')[0] || 'User',
          email: user.email || '',
          xp: 150,
          streak: 1,
          league: 'Bronze',
          role: 'user',
          premium_access_until: null,
          whatsapp_access_until: null,
          avatar_url: user.photoURL || `https://i.pravatar.cc/150?u=${user.uid}`,
          created_at: new Date().toISOString()
        });
      }

      onSuccess();
    } catch (err: any) {
      console.error('Google login error:', err);
      setError(err.message || 'Erro ao realizar login com o Google.');
    } finally {
      setLoading(false);
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
        
        {!isFirebaseConfigured && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-3 text-amber-700 dark:text-amber-400 text-xs font-medium text-left">
            <AlertCircle size={16} className="shrink-0" />
            <span>Modo de Demonstração: O banco de dados Firebase não está configurado. Você pode entrar com qualquer e-mail/senha.</span>
          </div>
        )}
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
          <p className="text-red-500 text-sm text-center font-medium">{error}</p>
        )}

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-purple-cyan text-white font-bold rounded-2xl shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
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
        onClick={handleGoogleLogin}
        className="w-full py-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-700 dark:text-white font-bold rounded-2xl flex items-center justify-center gap-3 shadow-sm"
      >
        <Chrome size={20} className="text-red-500" /> Google
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
