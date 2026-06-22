import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getApiUrl } from '../../utils';
import { 
  Camera, 
  Eye, 
  EyeOff, 
  Check, 
  Loader2, 
  AlertTriangle, 
  User, 
  Settings, 
  Activity, 
  Flame, 
  Heart, 
  Scale, 
  Compass, 
  Info, 
  Sparkles,
  Phone,
  BookOpen,
  Trash2,
  Trophy,
  Award,
  Coins,
  Droplets,
  Dumbbell,
  Lock,
  Unlock,
  TrendingUp,
  Target,
  Snowflake
} from 'lucide-react';
import { Profile, UserData, ExerciseLog } from '../../types';
import { EXERCISES, getLocalDateString } from '../../utils';
import { doc, deleteDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db, auth, isFirebaseConfigured } from '../../lib/firebase';
import { deleteUser } from 'firebase/auth';
import confetti from 'canvas-confetti';

interface ProfileTabProps {
  profile: Profile | null;
  user: any;
  editForm: any;
  setEditForm: (form: any) => void;
  isEditingProfile: boolean;
  setIsEditingProfile: (val: boolean) => void;
  showPassword: boolean;
  setShowPassword: (val: boolean) => void;
  showConfirmPassword: boolean;
  setShowConfirmPassword: (val: boolean) => void;
  usernameStatus: 'available' | 'taken' | 'checking' | 'idle';
  saveStatus: 'idle' | 'loading' | 'success' | 'error';
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleSaveProfile: () => void;
  userData: UserData;
  onUpdateBiometrics: (newUserData: UserData) => Promise<void>;
  setActiveTab: (tab: any) => void;
  onLogout?: () => void;
  setProfile?: React.Dispatch<React.SetStateAction<Profile | null>>;
  exerciseHistory?: ExerciseLog[];
  waterAmount?: number;
  waterGoal?: number;
}

const DDI_OPTIONS = [
  { code: '+93', country: 'Afeganistão', flag: '🇦🇫' },
  { code: '+27', country: 'África do Sul', flag: '🇿🇦' },
  { code: '+355', country: 'Albânia', flag: '🇦🇱' },
  { code: '+49', country: 'Alemanha', flag: '🇩🇪' },
  { code: '+376', country: 'Andorra', flag: '🇦🇩' },
  { code: '+244', country: 'Angola', flag: '🇦🇴' },
  { code: '+1', country: 'Anguila', flag: '🇦🇮' },
  { code: '+1-268', country: 'Antígua e Barbuda', flag: '🇦🇬' },
  { code: '+966', country: 'Arábia Saudita', flag: '🇸🇦' },
  { code: '+213', country: 'Argélia', flag: '🇩🇿' },
  { code: '+54', country: 'Argentina', flag: '🇦🇷' },
  { code: '+374', country: 'Armênia', flag: '🇦🇲' },
  { code: '+297', country: 'Aruba', flag: '🇦🇼' },
  { code: '+61', country: 'Austrália', flag: '🇦🇺' },
  { code: '+43', country: 'Áustria', flag: '🇦🇹' },
  { code: '+994', country: 'Azerbaijão', flag: '🇦🇿' },
  { code: '+1-242', country: 'Bahamas', flag: '🇧🇸' },
  { code: '+880', country: 'Bangladesh', flag: '🇧🇩' },
  { code: '+1-246', country: 'Barbados', flag: '🇧🇧' },
  { code: '+973', country: 'Bahrein', flag: '🇧🇭' },
  { code: '+32', country: 'Bélgica', flag: '🇧🇪' },
  { code: '+501', country: 'Belize', flag: '🇧🇿' },
  { code: '+229', country: 'Benin', flag: '🇧🇯' },
  { code: '+1-441', country: 'Bermudas', flag: '🇧🇲' },
  { code: '+375', country: 'Bielorrússia', flag: '🇧🇾' },
  { code: '+591', country: 'Bolívia', flag: '🇧🇴' },
  { code: '+387', country: 'Bósnia e Herzegovina', flag: '🇧🇦' },
  { code: '+267', country: 'Botsuana', flag: '🇧🇼' },
  { code: '+55', country: 'Brasil', flag: '🇧🇷' },
  { code: '+673', country: 'Brunei', flag: '🇧🇳' },
  { code: '+359', country: 'Bulgária', flag: '🇧🇬' },
  { code: '+226', country: 'Burkina Faso', flag: '🇧🇫' },
  { code: '+257', country: 'Burundi', flag: '🇧🇮' },
  { code: '+975', country: 'Butão', flag: '🇧🇹' },
  { code: '+238', country: 'Cabo Verde', flag: '🇨🇻' },
  { code: '+237', country: 'Camarões', flag: '🇨🇲' },
  { code: '+855', country: 'Camboja', flag: '🇰🇭' },
  { code: '+1', country: 'Canadá', flag: '🇨🇦' },
  { code: '+974', country: 'Catar', flag: '🇶🇦' },
  { code: '+7', country: 'Cazaquistão', flag: '🇰🇿' },
  { code: '+235', country: 'Chade', flag: '🇹🇩' },
  { code: '+56', country: 'Chile', flag: '🇨🇱' },
  { code: '+86', country: 'China', flag: '🇨🇳' },
  { code: '+357', country: 'Chipre', flag: '🇨🇾' },
  { code: '+57', country: 'Colômbia', flag: '🇨🇴' },
  { code: '+269', country: 'Comores', flag: '🇰🇲' },
  { code: '+242', country: 'Congo-Brazzaville', flag: '🇨🇬' },
  { code: '+243', country: 'Congo-Kinshasa', flag: '🇨🇩' },
  { code: '+850', country: 'Coreia do Norte', flag: '🇰🇵' },
  { code: '+82', country: 'Coreia do Sul', flag: '🇰🇷' },
  { code: '+225', country: 'Costa do Marfim', flag: '🇨🇮' },
  { code: '+506', country: 'Costa Rica', flag: '🇨🇷' },
  { code: '+385', country: 'Croácia', flag: '🇭🇷' },
  { code: '+53', country: 'Cuba', flag: '🇨🇺' },
  { code: '+45', country: 'Dinamarca', flag: '🇩🇰' },
  { code: '+253', country: 'Djibuti', flag: '🇩🇯' },
  { code: '+1-767', country: 'Dominica', flag: '🇩🇲' },
  { code: '+20', country: 'Egito', flag: '🇪🇬' },
  { code: '+503', country: 'El Salvador', flag: '🇸🇻' },
  { code: '+971', country: 'Emirados Árabes Unidos', flag: '🇦🇪' },
  { code: '+593', country: 'Equador', flag: '🇪🇨' },
  { code: '+291', country: 'Eritreia', flag: '🇪🇷' },
  { code: '+421', country: 'Eslováquia', flag: '🇸🇰' },
  { code: '+386', country: 'Eslovênia', flag: '🇸🇮' },
  { code: '+34', country: 'Espanha', flag: '🇪🇸' },
  { code: '+1', country: 'Estados Unidos', flag: '🇺🇸' },
  { code: '+372', country: 'Estônia', flag: '🇪🇪' },
  { code: '+268', country: 'Eswatini', flag: '🇸🇿' },
  { code: '+251', country: 'Etiópia', flag: '🇪🇹' },
  { code: '+679', country: 'Fiji', flag: '🇫🇯' },
  { code: '+63', country: 'Filipinas', flag: '🇵🇭' },
  { code: '+358', country: 'Finlândia', flag: '🇫🇮' },
  { code: '+33', country: 'França', flag: '🇫🇷' },
  { code: '+241', country: 'Gabão', flag: '🇬🇦' },
  { code: '+220', country: 'Gâmbia', flag: '🇬🇲' },
  { code: '+995', country: 'Geórgia', flag: '🇬🇪' },
  { code: '+233', country: 'Gana', flag: '🇬🇭' },
  { code: '+350', country: 'Gibraltar', flag: '🇬🇮' },
  { code: '+30', country: 'Grécia', flag: '🇬🇷' },
  { code: '+1-473', country: 'Granada', flag: '🇬🇩' },
  { code: '+502', country: 'Guatemala', flag: '🇬🇹' },
  { code: '+592', country: 'Guiana', flag: '🇬🇾' },
  { code: '+224', country: 'Guiné', flag: '🇬🇳' },
  { code: '+240', country: 'Guiné Equatorial', flag: '🇬🇶' },
  { code: '+245', country: 'Guiné-Bissau', flag: '🇬🇼' },
  { code: '+509', country: 'Haiti', flag: '🇭🇹' },
  { code: '+504', country: 'Honduras', flag: '🇭🇳' },
  { code: '+852', country: 'Hong Kong', flag: '🇭🇰' },
  { code: '+36', country: 'Hungria', flag: '🇭🇺' },
  { code: '+967', country: 'Iêmen', flag: '🇾🇪' },
  { code: '+672', country: 'Ilha Norfolk', flag: '🇳🇫' },
  { code: '+682', country: 'Ilhas Cook', flag: '🇨🇰' },
  { code: '+692', country: 'Ilhas Marshall', flag: '🇲🇭' },
  { code: '+677', country: 'Ilhas Salomão', flag: '🇸🇧' },
  { code: '+91', country: 'Índia', flag: '🇮🇳' },
  { code: '+62', country: 'Indonésia', flag: '🇮🇩' },
  { code: '+964', country: 'Iraque', flag: '🇮🇶' },
  { code: '+98', country: 'Irã', flag: '🇮🇷' },
  { code: '+353', country: 'Irlanda', flag: '🇮🇪' },
  { code: '+354', country: 'Islândia', flag: '🇮🇸' },
  { code: '+972', country: 'Israel', flag: '🇮🇱' },
  { code: '+39', country: 'Itália', flag: '🇮🇹' },
  { code: '+1-876', country: 'Jamaica', flag: '🇯🇲' },
  { code: '+81', country: 'Japão', flag: '🇯🇵' },
  { code: '+962', country: 'Jordânia', flag: '🇯🇴' },
  { code: '+254', country: 'Quênia', flag: '🇰🇪' },
  { code: '+965', country: 'Kuwait', flag: '🇰🇼' },
  { code: '+856', country: 'Laos', flag: '🇱🇦' },
  { code: '+266', country: 'Lesoto', flag: '🇱🇸' },
  { code: '+371', country: 'Letônia', flag: '🇱🇻' },
  { code: '+961', country: 'Líbano', flag: '🇱🇧' },
  { code: '+231', country: 'Libéria', flag: '🇱🇷' },
  { code: '+218', country: 'Líbia', flag: '🇱🇾' },
  { code: '+423', country: 'Liechtenstein', flag: '🇱🇮' },
  { code: '+370', country: 'Lituânia', flag: '🇱🇹' },
  { code: '+352', country: 'Luxemburgo', flag: '🇱🇺' },
  { code: '+853', country: 'Macau', flag: '🇲🇴' },
  { code: '+389', country: 'Macedônia do Norte', flag: '🇲🇰' },
  { code: '+261', country: 'Madagascar', flag: '🇲🇬' },
  { code: '+60', country: 'Malásia', flag: '🇲🇾' },
  { code: '+265', country: 'Malaui', flag: '🇲🇼' },
  { code: '+960', country: 'Maldivas', flag: '🇲🇻' },
  { code: '+223', country: 'Mali', flag: '🇲🇱' },
  { code: '+356', country: 'Malta', flag: '🇲🇹' },
  { code: '+212', country: 'Marrocos', flag: '🇲🇦' },
  { code: '+230', country: 'Maurício', flag: '🇲🇺' },
  { code: '+222', country: 'Mauritânia', flag: '🇲🇷' },
  { code: '+52', country: 'México', flag: '🇲🇽' },
  { code: '+95', country: 'Mianmar', flag: '🇲🇲' },
  { code: '+691', country: 'Micronésia', flag: '🇫🇲' },
  { code: '+373', country: 'Moldávia', flag: '🇲🇩' },
  { code: '+377', country: 'Mônaco', flag: '🇲🇨' },
  { code: '+976', country: 'Mongólia', flag: '🇲🇳' },
  { code: '+382', country: 'Montenegro', flag: '🇲🇪' },
  { code: '+258', country: 'Moçambique', flag: '🇲🇿' },
  { code: '+264', country: 'Namíbia', flag: '🇳🇦' },
  { code: '+674', country: 'Nauru', flag: '🇳🇷' },
  { code: '+977', country: 'Nepal', flag: '🇳🇵' },
  { code: '+505', country: 'Nicarágua', flag: '🇳🇮' },
  { code: '+227', country: 'Níger', flag: '🇳🇪' },
  { code: '+234', country: 'Nigéria', flag: '🇳🇬' },
  { code: '+47', country: 'Noruega', flag: '🇳🇴' },
  { code: '+64', country: 'Nova Zelândia', flag: '🇳🇿' },
  { code: '+968', country: 'Omã', flag: '🇴🇲' },
  { code: '+31', country: 'Países Baixos', flag: '🇳🇱' },
  { code: '+92', country: 'Paquistão', flag: '🇵🇰' },
  { code: '+680', country: 'Palau', flag: '🇵🇼' },
  { code: '+507', country: 'Panamá', flag: '🇵🇦' },
  { code: '+675', country: 'Papua Nova Guiné', flag: '🇵🇬' },
  { code: '+595', country: 'Paraguai', flag: '🇵🇾' },
  { code: '+51', country: 'Peru', flag: '🇵🇪' },
  { code: '+48', country: 'Polônia', flag: '🇵🇱' },
  { code: '+351', country: 'Portugal', flag: '🇵🇹' },
  { code: '+1-787', country: 'Porto Rico', flag: '🇵🇷' },
  { code: '+44', country: 'Reino Unido', flag: '🇬🇧' },
  { code: '+236', country: 'República Centro-Africana', flag: '🇨🇫' },
  { code: '+420', country: 'República Checa', flag: '🇨🇿' },
  { code: '+1-809', country: 'República Dominicana', flag: '🇩🇴' },
  { code: '+40', country: 'Romênia', flag: '🇷🇴' },
  { code: '+250', country: 'Ruanda', flag: '🇷🇼' },
  { code: '+7', country: 'Rússia', flag: '🇷🇺' },
  { code: '+685', country: 'Samoa', flag: '🇼🇸' },
  { code: '+378', country: 'San Marino', flag: '🇸🇲' },
  { code: '+1-758', country: 'Santa Lúcia', flag: '🇱🇨' },
  { code: '+1-784', country: 'São Vicente e Granadinas', flag: '🇻🇨' },
  { code: '+239', country: 'São Tomé e Príncipe', flag: '🇸🇹' },
  { code: '+221', country: 'Senegal', flag: '🇸🇳' },
  { code: '+248', country: 'Seychelles', flag: '🇸🇨' },
  { code: '+232', country: 'Serra Leoa', flag: '🇸🇱' },
  { code: '+381', country: 'Sérvia', flag: '🇷🇸' },
  { code: '+65', country: 'Singapura', flag: '🇸🇬' },
  { code: '+963', country: 'Síria', flag: '🇸🇾' },
  { code: '+252', country: 'Somália', flag: '🇸🇴' },
  { code: '+94', country: 'Sri Lanka', flag: '🇱🇰' },
  { code: '+249', country: 'Sudão', flag: '🇸🇩' },
  { code: '+211', country: 'Sudão do Sul', flag: '🇸🇸' },
  { code: '+46', country: 'Suécia', flag: '🇸🇪' },
  { code: '+41', country: 'Suíça', flag: '🇨🇭' },
  { code: '+597', country: 'Suriname', flag: '🇸🇷' },
  { code: '+992', country: 'Tajiquistão', flag: '🇹🇯' },
  { code: '+66', country: 'Tailândia', flag: '🇹🇭' },
  { code: '+886', country: 'Taiwan', flag: '🇹🇼' },
  { code: '+255', country: 'Tanzânia', flag: '🇹🇿' },
  { code: '+670', country: 'Timor-Leste', flag: '🇹🇱' },
  { code: '+228', country: 'Togo', flag: '🇹🇬' },
  { code: '+676', country: 'Tonga', flag: '🇹🇴' },
  { code: '+1-868', country: 'Trinidad e Tobago', flag: '🇹🇹' },
  { code: '+216', country: 'Tunísia', flag: '🇹🇳' },
  { code: '+90', country: 'Turquia', flag: '🇹🇷' },
  { code: '+993', country: 'Turquemenistão', flag: '🇹🇲' },
  { code: '+688', country: 'Tuvalu', flag: '🇹🇻' },
  { code: '+380', country: 'Ucrânia', flag: '🇺🇦' },
  { code: '+256', country: 'Uganda', flag: '🇺🇬' },
  { code: '+598', country: 'Uruguai', flag: '🇺🇾' },
  { code: '+998', country: 'Uzbequistão', flag: '🇺🇿' },
  { code: '+678', country: 'Vanuatu', flag: '🇻🇺' },
  { code: '+379', country: 'Vaticano', flag: '🇻🇦' },
  { code: '+58', country: 'Venezuela', flag: '🇻🇪' },
  { code: '+84', country: 'Vietnã', flag: '🇻🇳' },
  { code: '+260', country: 'Zâmbia', flag: '🇿🇲' },
  { code: '+263', country: 'Zimbábue', flag: '🇿🇼' }
];

export const ProfileTab: React.FC<ProfileTabProps> = ({
  profile,
  user,
  editForm,
  setEditForm,
  isEditingProfile,
  setIsEditingProfile,
  showPassword,
  setShowPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  usernameStatus,
  saveStatus,
  onFileChange,
  fileInputRef,
  handleSaveProfile,
  userData,
  onUpdateBiometrics,
  setActiveTab,
  onLogout,
  setProfile,
  exerciseHistory = [],
  waterAmount = 0,
  waterGoal = 2500
}) => {
  const [profileSubTab, setProfileSubTab] = useState<'edit' | 'achievements' | 'diet'>('edit');
  const [localBio, setLocalBio] = useState<UserData>({ ...userData });
  const [updatingDiet, setUpdatingDiet] = useState(false);
  const [dietSuccess, setDietSuccess] = useState(false);

  // States for account deletion
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      if (auth.currentUser) {
        const userId = auth.currentUser.uid;

        // 1. Delete food logs from API
        try {
          await fetch(getApiUrl(`/api/food_logs/user/${userId}`), { method: 'DELETE' });
        } catch (e) {
          console.error("Erro ao apagar registros de refeição:", e);
        }

        // 2. Delete water logs from API
        try {
          await fetch(getApiUrl(`/api/water_logs/user/${userId}`), { method: 'DELETE' });
        } catch (e) {
          console.error("Erro ao apagar registros de água:", e);
        }

        // 3. Delete Profile from API
        try {
          await fetch(getApiUrl(`/api/profiles/${userId}`), { method: 'DELETE' });
        } catch (e) {
          console.error("Erro ao apagar perfil na API:", e);
        }

        // 4. Delete Auth user from Firebase Authentication
        try {
          await deleteUser(auth.currentUser);
        } catch (e: any) {
          console.error("Erro no deleteUser da Auth:", e);
          if (e.code === 'auth/requires-recent-login') {
            alert("Para sua segurança, esta ação requer um login recente. Por favor, saia e entre novamente antes de excluir a conta.");
            setIsDeleting(false);
            setShowDeleteConfirm(false);
            return;
          }
        }
      }

      // Clean local storage
      if (user?.uid) {
        localStorage.removeItem(`profile_${user.uid}`);
        localStorage.removeItem(`all_food_logs_${user.uid}`);
        const today = getLocalDateString();
        localStorage.removeItem(`food_logs_${user.uid}_${today}`);
        localStorage.removeItem(`water_logs_${user.uid}_${today}`);
      }

      alert("Sua conta foi excluída permanentemente com sucesso.");

      // Logout and reset app state
      if (onLogout) {
        onLogout();
      } else {
        auth.signOut();
        window.location.reload();
      }
    } catch (err: any) {
      console.error("Erro geral na exclusão:", err);
      alert("Houve um erro ao processar a exclusão total da conta.");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // States for exercise search dropdown
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [showExerciseDropdown, setShowExerciseDropdown] = useState(false);
  const exerciseDropdownRef = useRef<HTMLDivElement>(null);

  // States for custom country code dropdown
  const [showDdiDropdown, setShowDdiDropdown] = useState(false);
  const [ddiSearch, setDdiSearch] = useState('');
  const ddiDropdownRef = useRef<HTMLDivElement>(null);

  // State for confirm recalculation popup
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exerciseDropdownRef.current && !exerciseDropdownRef.current.contains(event.target as Node)) {
        setShowExerciseDropdown(false);
      }
      if (ddiDropdownRef.current && !ddiDropdownRef.current.contains(event.target as Node)) {
        setShowDdiDropdown(false);
        setDdiSearch('');
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // States for formatting WhatsApp beautifully
  const [ddi, setDdi] = useState(() => {
    const sortedOptions = [...DDI_OPTIONS].sort((a, b) => b.code.length - a.code.length);
    const matched = sortedOptions.find(opt => editForm.whatsapp?.startsWith(opt.code));
    return matched ? matched.code : '+55';
  });

  const [phone, setPhone] = useState(() => {
    const sortedOptions = [...DDI_OPTIONS].sort((a, b) => b.code.length - a.code.length);
    const matched = sortedOptions.find(opt => editForm.whatsapp?.startsWith(opt.code));
    if (matched && editForm.whatsapp) {
      return editForm.whatsapp.slice(matched.code.length);
    }
    return editForm.whatsapp || '';
  });

  // Sync state with parent change
  useEffect(() => {
    if (userData) {
      setLocalBio({ ...userData });
    }
  }, [userData]);

  const passwordMatch = editForm.password === editForm.confirmPassword;
  const passwordStrength = editForm.password.length >= 8 && 
    /[A-Z]/.test(editForm.password) && 
    /[a-z]/.test(editForm.password) && 
    /[0-9]/.test(editForm.password) && 
    /[^A-Za-z0-9]/.test(editForm.password);

  const formatCPF = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  };

  const handleCPFInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setEditForm({ ...editForm, cpf: formatted });
  };

  const isCPFValid = editForm.cpf ? editForm.cpf.replace(/\D/g, '').length === 11 : false;
  const isPhoneValid = phone.replace(/\D/g, '').length >= 8 && phone.replace(/\D/g, '').length <= 15;
  const isFullNameValid = editForm.full_name?.trim().split(' ').length >= 2 && editForm.full_name?.trim().length >= 5;

  const handlePhoneInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    // Allow digits, spaces, parentheses, hyphens
    const cleanPhone = rawVal.replace(/[^0-9\s()-]/g, '');
    setPhone(cleanPhone);
    setEditForm({ ...editForm, whatsapp: ddi + cleanPhone });
  };

  const handleDdiSelectChange = (newDdi: string) => {
    setDdi(newDdi);
    setEditForm({ ...editForm, whatsapp: newDdi + phone });
  };

  // Re-calculate live metrics
  const bmi = localBio.weight && localBio.height ? Number((localBio.weight / Math.pow(localBio.height / 100, 2)).toFixed(1)) : 0;
  let bmiCategory = '';
  if (bmi < 18.5) bmiCategory = 'Abaixo do peso';
  else if (bmi < 25) bmiCategory = 'Peso normal';
  else if (bmi < 30) bmiCategory = 'Sobrepeso';
  else bmiCategory = 'Obesidade';

  const bmr = (() => {
    const { sex, weight, height, age } = localBio;
    if (!weight || !height || !age) return 0;
    if (sex === 'male') {
      return Math.round(88.36 + (13.4 * weight) + (4.8 * height) - (5.78 * age));
    } else {
      return Math.round(447.593 + (9.247 * weight) + (3.098 * height) - (4.33 * age));
    }
  })();

  const handleSaveBiometrics = async () => {
    setUpdatingDiet(true);
    setDietSuccess(false);
    try {
      await onUpdateBiometrics(localBio);
      setDietSuccess(true);
      setTimeout(() => setDietSuccess(false), 5000);
      setShowConfirmModal(false);
      setActiveTab('dashboard');
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingDiet(false);
    }
  };

  // Dynamic achievements calculation matching real user activity
  const achievementsList = [
    {
      id: 'streak_7',
      title: 'Consistência de Aço',
      description: 'Mantenha uma sequência de 7 dias ou mais de atividades saudável.',
      icon: <Flame size={20} className="text-orange-500" />,
      rewardXP: 100,
      progress: profile?.streak || 0,
      target: 7,
      isUnlocked: (profile?.streak || 0) >= 7,
      isClaimed: (profile?.claimed_achievements || []).includes('streak_7')
    },
    {
      id: 'water_3l',
      title: 'Super-Hidratação',
      description: 'Registre bebedouro de 3.000ml de água ou mais em um único dia.',
      icon: <Droplets size={20} className="text-cyan-500" />,
      rewardXP: 150,
      progress: waterAmount,
      target: 3000,
      isUnlocked: waterAmount >= 3000,
      isClaimed: (profile?.claimed_achievements || []).includes('water_3l')
    },
    {
      id: 'workouts_5',
      title: 'Monstro dos Treinos',
      description: 'Registre a execução de 5 séries ou treinos de exercícios no seu painel.',
      icon: <Dumbbell size={20} className="text-purple-500" />,
      rewardXP: 200,
      progress: exerciseHistory.length,
      target: 5,
      isUnlocked: exerciseHistory.length >= 5,
      isClaimed: (profile?.claimed_achievements || []).includes('workouts_5')
    },
    {
      id: 'macro_balance',
      title: 'Alquimia de Sucesso',
      description: 'Crie um plano alimentar personalizado refinado pela inteligência artificial.',
      icon: <Target size={20} className="text-pink-500" />,
      rewardXP: 120,
      progress: profile?.diet_plan ? 1 : 0,
      target: 1,
      isUnlocked: !!profile?.diet_plan,
      isClaimed: (profile?.claimed_achievements || []).includes('macro_balance')
    },
    {
      id: 'weight_history_3',
      title: 'Controle de Peso',
      description: 'Registre 3 ou mais medições de peso corporal no histórico de evolução.',
      icon: <Scale size={20} className="text-emerald-500" />,
      rewardXP: 80,
      progress: profile?.weight_history?.length || 0,
      target: 3,
      isUnlocked: (profile?.weight_history?.length || 0) >= 3,
      isClaimed: (profile?.claimed_achievements || []).includes('weight_history_3')
    },
    {
      id: 'silver_league',
      title: 'Desafiador de Ligas',
      description: 'Conquiste vaga e ascensão para a Liga Prata ou superior.',
      icon: <Trophy size={20} className="text-amber-500" />,
      rewardXP: 250,
      progress: profile?.league && profile.league !== 'Bronze' ? 1 : 0,
      target: 1,
      isUnlocked: profile?.league && profile.league !== 'Bronze',
      isClaimed: (profile?.claimed_achievements || []).includes('silver_league')
    },
    {
      id: 'streak_freeze',
      title: 'Escudo Protetor',
      description: 'Adquira e ative o Bloqueio de Sequência protetora na aba Loja.',
      icon: <Snowflake size={20} className="text-sky-500" />,
      rewardXP: 150,
      progress: profile?.streak_freeze_active ? 1 : 0,
      target: 1,
      isUnlocked: !!profile?.streak_freeze_active,
      isClaimed: (profile?.claimed_achievements || []).includes('streak_freeze')
    }
  ];

  const handleClaim = async (badgeId: string, rewardXP: number) => {
    if (!profile) return;
    const currentClaimed = profile.claimed_achievements || [];
    if (currentClaimed.includes(badgeId)) return;

    const updatedClaimed = [...currentClaimed, badgeId];
    const updatedXP = (profile.xp || 0) + rewardXP;

    const updatedProfile: Profile = {
      ...profile,
      claimed_achievements: updatedClaimed,
      xp: updatedXP
    };

    try {
      try {
        await fetch(getApiUrl(`/api/profiles/${profile.id}`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            claimed_achievements: updatedClaimed,
            xp: updatedXP
          })
        });
      } catch (e) {
        console.error("Erro API badge update", e);
      }

      // Save locally
      localStorage.setItem(`profile_${profile.id}`, JSON.stringify(updatedProfile));

      // Update state
      if (setProfile) {
        setProfile(updatedProfile);
      }

      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });

      alert(`Parabéns! Recompensa resgatada: +${rewardXP} NutriCoins adicionados com sucesso!`);
    } catch (err) {
      console.error("Erro ao resgatar conquista:", err);
      alert("Ocorreu um erro ao resgatar sua recompensa. Tente novamente.");
    }
  };

  // Live values calculator for biological subtab
  const liveBmr = (() => {
    const { sex, weight, height, age } = localBio;
    if (!weight || !height || !age) return 0;
    if (sex === 'male') {
      return Math.round(88.36 + (13.4 * weight) + (4.8 * height) - (5.78 * age));
    } else {
      return Math.round(447.593 + (9.247 * weight) + (3.098 * height) - (4.33 * age));
    }
  })();

  const liveTdee = (() => {
    const bmrValue = liveBmr;
    if (!bmrValue) return 0;
    const factorMap = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      high: 1.725,
      athlete: 1.9
    };
    const factor = factorMap[localBio.activityLevel || 'moderate'] || 1.2;
    return Math.round(bmrValue * factor);
  })();

  const liveTargetCalories = (() => {
    const tdeeValue = liveTdee;
    if (!tdeeValue) return 0;
    const goal = localBio.goal;
    if (goal === 'hypertrophy') return Math.round(tdeeValue * 1.1); // +10% surplus
    if (goal === 'weightloss') return Math.round(tdeeValue * 0.8); // -20% deficit
    if (goal === 'recomposition') return Math.round(tdeeValue * 0.9); // -10% slight deficit
    return tdeeValue; // maintenance
  })();

  const liveMacros = (() => {
    const cal = liveTargetCalories;
    if (!cal) return { protein: 0, carbs: 0, fat: 0 };
    const goal = localBio.goal;
    const weight = localBio.weight || 70;

    let pGrams = 0;
    let fGrams = 0;
    let cGrams = 0;

    if (goal === 'hypertrophy') {
      pGrams = Math.round(2.2 * weight);
      fGrams = Math.round(1.0 * weight);
    } else if (goal === 'weightloss') {
      pGrams = Math.round(2.3 * weight);
      fGrams = Math.round(0.8 * weight);
    } else if (goal === 'recomposition') {
      pGrams = Math.round(2.2 * weight);
      fGrams = Math.round(0.9 * weight);
    } else {
      pGrams = Math.round(2.0 * weight);
      fGrams = Math.round(1.0 * weight);
    }

    const pCal = pGrams * 4;
    const fCal = fGrams * 9;
    const remainingCal = Math.max(0, cal - (pCal + fCal));
    cGrams = Math.round(remainingCal / 4);

    return { protein: pGrams, carbs: cGrams, fat: fGrams };
  })();

  const isProfileSubmitDisabled = 
    saveStatus === 'loading' || 
    (editForm.password && (!passwordMatch || !passwordStrength)) || 
    usernameStatus === 'taken' ||
    !isCPFValid ||
    !isPhoneValid ||
    !isFullNameValid;

  return (
    <section className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black text-slate-900 dark:text-white">Seu Perfil</h2>
        <p className="text-slate-500">Personalize suas informações de perfil</p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key="editTab"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800/80 space-y-8"
        >
            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full bg-purple-100 dark:bg-purple-900/30 overflow-hidden flex items-center justify-center text-purple-600 dark:text-purple-400 text-4xl font-black border-4 border-white dark:border-slate-800 shadow-lg">
                  {editForm.avatar_url ? (
                    <img src={editForm.avatar_url} alt={profile?.username} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    profile?.username?.[0]?.toUpperCase()
                  )}
                </div>
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-2 bg-white dark:bg-slate-800 rounded-full shadow-md text-purple-500 border border-slate-100 dark:border-slate-700 hover:scale-110 transition-transform cursor-pointer"
                >
                  <Camera size={16} />
                </motion.button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={onFileChange} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold dark:text-white capitalize">{profile?.username}</h3>
                <p className="text-slate-400 text-sm">{user.email}</p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Nome Completo (Required) */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    Nome Completo <span className="text-red-500">*</span>
                  </label>
                  {isFullNameValid && <span className="text-[10px] text-green-500 font-bold flex items-center gap-0.5"><Check size={10} /> Válido</span>}
                </div>
                <input 
                  type="text" 
                  required
                  placeholder="Seu Nome Completo"
                  value={editForm.full_name || ''}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm font-bold dark:text-white focus:ring-2 focus:ring-purple-500 transition-all border border-transparent dark:border-slate-800"
                />
                {!isFullNameValid && editForm.full_name && (
                  <p className="text-[10px] text-red-400 font-bold">Por favor, insira o nome completo (pelo menos nome e sobrenome).</p>
                )}
              </div>

              {/* CPF (Required) */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    CPF <span className="text-red-500">*</span>
                  </label>
                  {isCPFValid && <span className="text-[10px] text-green-500 font-bold flex items-center gap-0.5"><Check size={10} /> Válido</span>}
                </div>
                <input 
                  type="text" 
                  required
                  placeholder="000.000.000-00"
                  value={editForm.cpf || ''}
                  onChange={handleCPFInputChange}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm font-bold dark:text-white focus:ring-2 focus:ring-purple-500 transition-all border border-transparent dark:border-slate-800"
                />
                {!isCPFValid && editForm.cpf && (
                  <p className="text-[10px] text-red-400 font-bold">O CPF deve possuir exatamente 11 dígitos numéricos.</p>
                )}
              </div>

              {/* WhatsApp (Required & Character Validate) */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    WhatsApp <span className="text-red-500">*</span>
                  </label>
                  {isPhoneValid && <span className="text-[10px] text-green-500 font-bold flex items-center gap-0.5"><Check size={10} /> Válido</span>}
                </div>

                <div className="flex gap-2 w-full">
                  {/* Custom Country Code Dropdown */}
                  <div className="relative shrink-0" ref={ddiDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setShowDdiDropdown(!showDdiDropdown)}
                      className="bg-slate-50 dark:bg-slate-800 rounded-2xl px-4 py-4 text-sm font-bold dark:text-white border border-transparent dark:border-slate-800 flex items-center gap-2 cursor-pointer focus:ring-2 focus:ring-purple-500 h-[54px] min-w-[100px] justify-between whitespace-nowrap"
                    >
                      <span className="flex items-center gap-1.5 select-none">
                        <span className="text-base">
                          {DDI_OPTIONS.find(opt => opt.code === ddi)?.flag || '🇧🇷'}
                        </span>
                        <span>{ddi}</span>
                      </span>
                      <span className="text-[10px] text-slate-400 select-none">▼</span>
                    </button>

                    <AnimatePresence>
                      {showDdiDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute z-[60] left-0 mt-2 w-72 max-h-72 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl shadow-2xl p-2 no-scrollbar flex flex-col gap-2"
                        >
                          <input
                            type="text"
                            placeholder="Buscar país..."
                            value={ddiSearch}
                            onChange={(e) => setDdiSearch(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 font-bold dark:text-white sticky top-0 z-10"
                            onClick={(e) => e.stopPropagation()}
                          />

                          <div className="space-y-1 overflow-y-auto max-h-[200px]">
                            {DDI_OPTIONS.filter(opt => 
                              opt.country.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(ddiSearch.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')) ||
                              opt.code.includes(ddiSearch)
                            ).map((opt) => (
                              <button
                                key={`${opt.country}-${opt.code}`}
                                type="button"
                                onClick={() => {
                                  handleDdiSelectChange(opt.code);
                                  setShowDdiDropdown(false);
                                  setDdiSearch('');
                                }}
                                className={`w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between dark:text-slate-200 ${
                                  ddi === opt.code ? 'bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-cyan-400 font-bold' : ''
                                  }`}
                              >
                                <span className="flex items-center gap-2 max-w-[180px]">
                                  <span className="text-base select-none shrink-0">{opt.flag}</span>
                                  <span className="truncate">{opt.country}</span>
                                </span>
                                <span className="text-xs text-slate-400 font-mono shrink-0">{opt.code}</span>
                              </button>
                            ))}
                            {DDI_OPTIONS.filter(opt => 
                              opt.country.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(ddiSearch.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')) ||
                              opt.code.includes(ddiSearch)
                            ).length === 0 && (
                              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-bold text-center py-4">Nenhum país encontrado</p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Input Phone */}
                  <input 
                    type="tel" 
                    required
                    placeholder="(00) 00000-0000"
                    value={phone}
                    onChange={handlePhoneInputChange}
                    className="flex-1 min-w-0 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm font-bold dark:text-white focus:ring-2 focus:ring-purple-500 transition-all border border-transparent dark:border-slate-800"
                  />
                </div>
                {!isPhoneValid && phone && (
                  <p className="text-[10px] text-red-400 font-bold">Incorreto. Caracteres permitidos: apenas números, espaços, hífens e parênteses (8+ dígitos).</p>
                )}
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800/80 my-2 pt-4"></div>

              {/* Legacy Profile Information */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nome de Usuário</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm font-bold dark:text-white focus:ring-2 focus:ring-purple-500 transition-all border border-transparent dark:border-slate-800"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {usernameStatus === 'checking' && <Loader2 size={16} className="animate-spin text-purple-500" />}
                    {usernameStatus === 'available' && <Check size={16} className="text-green-500" />}
                    {usernameStatus === 'taken' && <AlertTriangle size={16} className="text-red-500" />}
                  </div>
                </div>
                {usernameStatus === 'taken' && <p className="text-[10px] text-red-500 font-bold">Este nome de usuário já está em uso.</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">E-mail</label>
                  <input 
                    type="email" 
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm font-bold dark:text-white focus:ring-2 focus:ring-purple-500 transition-all border border-transparent dark:border-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Confirmar E-mail</label>
                  <input 
                    type="email" 
                    value={editForm.confirmEmail}
                    onChange={(e) => setEditForm({ ...editForm, confirmEmail: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm font-bold dark:text-white focus:ring-2 focus:ring-purple-500 transition-all border border-transparent dark:border-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nova Senha</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={editForm.password}
                      onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm font-bold dark:text-white focus:ring-2 focus:ring-purple-500 transition-all border border-transparent dark:border-slate-800"
                    />
                    <button 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-purple-500 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {editForm.password && !passwordStrength && (
                    <p className="text-[10px] text-amber-500 font-bold">A senha deve ter 8+ caracteres, maiúsculas, minúsculas, números e símbolos.</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Confirmar Senha</label>
                  <div className="relative">
                    <input 
                      type={showConfirmPassword ? "text" : "password"} 
                      value={editForm.confirmPassword}
                      onChange={(e) => setEditForm({ ...editForm, confirmPassword: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm font-bold dark:text-white focus:ring-2 focus:ring-purple-500 transition-all border border-transparent dark:border-slate-800"
                    />
                    <button 
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-purple-500 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {editForm.confirmPassword && !passwordMatch && (
                    <p className="text-[10px] text-red-500 font-bold">As senhas não coincidem.</p>
                  )}
                </div>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleSaveProfile}
              disabled={isProfileSubmitDisabled}
              className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-wider text-white shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isProfileSubmitDisabled ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed opacity-60' :
                saveStatus === 'success' ? 'bg-green-500' : 
                saveStatus === 'error' ? 'bg-red-500' : 
                'bg-purple-cyan'
              }`}
            >
              {saveStatus === 'loading' ? <Loader2 className="animate-spin" /> : 
               saveStatus === 'success' ? <Check /> : 
               saveStatus === 'error' ? 'Tentar Novamente' : 
               'Salvar Alterações'}
            </motion.button>

            {/* Account Deletion Section (Danger Zone) */}
            <div className="border-t border-slate-100 dark:border-slate-800/80 mt-6 pt-6 text-center space-y-3">
              <h4 className="text-sm font-bold text-red-500 dark:text-red-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
                <AlertTriangle size={16} /> Zona de Perigo
              </h4>
              <p className="text-xs text-slate-400 dark:text-slate-500 max-w-md mx-auto">
                Ao excluir sua conta, todos os seus dados de refeições, ingestão de água, conquistas e perfil serão apagados permanentemente para sempre de nossa base de dados.
              </p>
              <div>
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="py-3 px-6 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200/50 dark:border-red-900/40 rounded-xl font-bold text-xs uppercase tracking-wider transition-all inline-flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 size={14} /> Excluir Minha Conta Permanentemente
                </motion.button>
              </div>
            </div>
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-6 overflow-hidden"
            >
              <div className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center text-red-600 dark:text-red-400">
                  <AlertTriangle size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Excluir Conta Permanentemente</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Tem certeza absoluta que deseja excluir sua conta? Esta ação é irreversível e apagará todos os seus registros de refeições, consumo de água, pontos de XP e sua assinatura ou preferências no banco de dados.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="flex-1 py-3 bg-red-600 text-white hover:bg-red-700 font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Excluindo...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} />
                      <span>Sim, Excluir</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};
