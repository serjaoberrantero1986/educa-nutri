import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Trophy, ShieldAlert, ArrowUpCircle, ArrowDownCircle, Sparkles, Award, Star, Lock, CheckCircle, RefreshCcw, HelpCircle, Flame, Loader2 } from 'lucide-react';
import { Profile } from '../../types';
import { db, isFirebaseConfigured } from '../../lib/firebase';
import { doc, updateDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import confetti from 'canvas-confetti';

interface RankingTabProps {
  profile: Profile | null;
  setProfile: React.Dispatch<React.SetStateAction<Profile | null>>;
  ranking: Profile[];
  setRanking: React.Dispatch<React.SetStateAction<Profile[]>>;
  user: any;
  getRemainingDays: () => string;
}

const LEAGUE_FLOW: ('Bronze' | 'Prata' | 'Ouro' | 'Safira' | 'Diamante')[] = [
  'Bronze', 'Prata', 'Ouro', 'Safira', 'Diamante'
];

const LEAGUES_DETAILS = [
  {
    id: 'Bronze',
    name: 'Bronze',
    badge: '🥉',
    color: 'from-amber-600 to-amber-800',
    borderColor: 'border-amber-600/30',
    iconColor: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
    xpNeeded: '0 NC',
    perk: 'Sua jornada começa aqui! Multiplicador de NC base x1.0.',
    desc: 'O ponto de partida para estabelecer a rotina diária de alimentação e hidratação. Foco na consistência básica e no registro saudável de cada refeição.',
  },
  {
    id: 'Prata',
    name: 'Prata',
    badge: '🥈',
    color: 'from-slate-400 to-slate-500',
    borderColor: 'border-slate-400/30',
    iconColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-350',
    xpNeeded: '250 NC',
    perk: 'Multiplicador de NC x1.1 nas tarefas cotidianas.',
    desc: 'Foco intermediário. Seus hábitos diários começam a render ótimos resultados metabólicos e a constância se torna uma grande aliada.',
  },
  {
    id: 'Ouro',
    name: 'Ouro',
    badge: '🥇',
    color: 'from-yellow-400 to-amber-500',
    borderColor: 'border-yellow-400/35',
    iconColor: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-950/30 dark:text-yellow-400',
    xpNeeded: '450 NC',
    perk: 'Multiplicador de NC x1.2 + desconto de 5% em todos os itens da Loja.',
    desc: 'Entendimento profund sobre macronutrientes. Seu planejamento alimentar está se tornando automático e incrivelmente organizado.',
  },
  {
    id: 'Safira',
    name: 'Safira',
    badge: '💎',
    color: 'from-cyan-400 to-indigo-600',
    borderColor: 'border-cyan-400/30',
    iconColor: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-950/30 dark:text-cyan-400',
    xpNeeded: '750 NC',
    perk: 'Multiplicador de NC x1.3 + desconto de 15% na Loja.',
    desc: 'Liga de Elite absoluta. Reservada para atletas fiéis que demonstram dedicação incansável, autocontrole alimentar e alta disciplina de hidratação.',
  },
  {
    id: 'Diamante',
    name: 'Diamante',
    badge: '👑',
    color: 'from-purple-500 to-indigo-600',
    borderColor: 'border-purple-500/30',
    iconColor: 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400',
    xpNeeded: '1200+ NC',
    perk: 'Multiplicador de NC x1.5 + desconto de 25% na Loja + Título Exclusivo.',
    desc: 'O topo definitivo da jornada saudável. Sua autodisciplina serve de inspiração para toda a comunidade. Nível profissional extremo de consistência.',
  }
];

export const RankingTab: React.FC<RankingTabProps> = ({
  profile,
  setProfile,
  ranking,
  setRanking,
  user,
  getRemainingDays
}) => {
  const [selectedRoadmapLeague, setSelectedRoadmapLeague] = useState<string>(profile?.league || 'Bronze');

  const currentLeagueIndex = LEAGUE_FLOW.indexOf(profile?.league || 'Bronze');

  const getTrophyStyle = (pos: number) => {
    if (pos === 1) return { text: '🏆', color: 'text-yellow-500 hover:scale-110 duration-200' };
    if (pos === 2) return { text: '🥈', color: 'text-slate-400 hover:scale-110 duration-200' };
    if (pos === 3) return { text: '🥉', color: 'text-amber-700 hover:scale-110 duration-200' };
    return null;
  };

  return (
    <section className="space-y-6 select-none leading-none">
      {/* Header and Countdown */}
      <div className="text-center space-y-3">
        <h2 className="text-3xl font-black text-slate-900 dark:text-white flex items-center justify-center gap-2">
          Liga <span className="bg-gradient-to-r from-purple-600 to-indigo-600 text-transparent bg-clip-text font-black">{profile?.league || 'Bronze'}</span>
        </h2>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <div className="flex items-center gap-1.5 text-amber-500 font-extrabold text-xs uppercase bg-amber-50 dark:bg-amber-950/25 px-4 py-2 rounded-full border border-amber-100 dark:border-amber-950/30">
            <Clock size={14} />
            <span>{getRemainingDays()} restantes</span>
          </div>
        </div>
      </div>

      {/* Scoreboard List */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        {ranking.map((player, pos) => {
          const isMe = player.id === user.uid;
          const trophy = getTrophyStyle(pos + 1);
          
          // Row background highlights depending on division tier zones
          let zoneClass = 'border-slate-100 dark:border-slate-800/80';
          if (pos < 3) {
            zoneClass = 'bg-emerald-50/10 dark:bg-emerald-950/5 border-emerald-100/40 dark:border-emerald-950/30';
          } else if (pos >= 7 && (profile?.league || 'Bronze') !== 'Bronze') {
            zoneClass = 'bg-rose-50/10 dark:bg-rose-950/5 border-rose-100/40 dark:border-rose-950/30';
          }

          return (
            <div 
              key={player.id} 
              className={`flex items-center justify-between p-5 border-b transition-all ${zoneClass} ${
                isMe ? 'bg-purple-50/40 dark:bg-purple-900/10 border-purple-200/80 dark:border-purple-800/50 scale-[1.01] shadow-sm relative z-10' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Ranking Position Badge */}
                <div className="w-8 flex items-center justify-center font-extrabold text-sm">
                  {trophy ? (
                    <span className={`text-xl ${trophy.color}`} title={`${pos + 1}º Lugar`}>
                      {trophy.text}
                    </span>
                  ) : (
                    <span className={`${pos >= 7 && (profile?.league || 'Bronze') !== 'Bronze' ? 'text-rose-500' : pos < 3 ? 'text-emerald-500' : 'text-slate-400'} font-black font-sans`}>
                      {pos + 1}
                    </span>
                  )}
                </div>

                {/* Avatar Display */}
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center font-bold border-2 border-white dark:border-slate-800 shadow-sm shrink-0">
                  {player.avatar_url ? (
                    <img src={player.avatar_url} alt={player.username} className="w-full h-full object-cover animate-none" referrerPolicy="no-referrer" />
                  ) : (
                    player.username?.[0]?.toUpperCase() || 'U'
                  )}
                </div>

                <div className="flex flex-col gap-1 items-start text-left">
                  <span className="font-extrabold text-slate-800 dark:text-white flex items-center gap-1.5 text-sm">
                    {player.username} {isMe && <span className="text-[9px] bg-purple-600 text-white font-extrabold rounded-full px-2 py-0.5">Você</span>}
                  </span>
                  
                  {/* Performance Indicators */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold flex items-center gap-0.5">
                      🔥 {player.streak || 0}d
                    </span>
                    <span className="text-slate-300 dark:text-slate-700 font-bold text-[10px]">•</span>
                    {pos < 3 ? (
                      <span className="text-[9px] text-emerald-500 dark:text-emerald-400 font-black uppercase tracking-wider flex items-center gap-0.5">
                        ▲ Promoção
                      </span>
                    ) : pos >= 7 && (profile?.league || 'Bronze') !== 'Bronze' ? (
                      <span className="text-[9px] text-rose-500 dark:text-rose-455 font-black uppercase tracking-wider flex items-center gap-0.5">
                        ▼ Rebaixamento
                      </span>
                    ) : (
                      <span className="text-[9px] text-blue-500 dark:text-blue-400 font-black uppercase tracking-wider flex items-center gap-0.5">
                        Permanência
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Point Totals */}
              <div className="flex items-center gap-2">
                <span className="font-mono font-extrabold text-sm text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-3 py-1.5 rounded-xl whitespace-nowrap">
                  {player.xp} NC
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Visual representation of all Divisions (Caminho das Ligas) */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 md:p-8 shadow-xl border border-slate-100 dark:border-slate-800 space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 border-b border-dashed border-slate-100 dark:border-slate-850/80 pb-4">
          <div className="text-left">
            <h3 className="font-black text-slate-900 dark:text-white text-lg flex items-center gap-1.5 leading-none">
              <Sparkles className="text-purple-500 animate-pulse shrink-0" size={18} /> Caminho das Ligas
            </h3>
            <p className="text-xs text-slate-400 font-bold mt-1 leading-normal">Toque ou clique em cada liga para explorar seus bônus energéticos e descontos exclusivas.</p>
          </div>
          <span className="text-[10px] bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-extrabold uppercase tracking-widest px-3 py-1.5 rounded-full border border-purple-100 dark:border-purple-900/40 select-none whitespace-nowrap">
            Sua Liga: <span className="font-black text-slate-800 dark:text-slate-100">{profile?.league || 'Bronze'}</span>
          </span>
        </div>

        {/* Roadmap Timeline */}
        <div className="relative">
          {/* Background line combining steps */}
          <div className="absolute top-[28px] left-[10%] right-[10%] h-1 bg-slate-100 dark:bg-slate-800 pointer-events-none hidden md:block">
            {/* Dynamic line indicating user's current progress through the 5 divisions */}
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 transition-all duration-700"
              style={{ width: `${(currentLeagueIndex / 4) * 100}%` }}
            />
          </div>

          <div className="flex overflow-x-auto pt-3 pb-4 gap-3 md:gap-0 md:grid md:grid-cols-5 no-scrollbar select-none">
            {LEAGUES_DETAILS.map((league) => {
              const isCurrent = league.id === profile?.league;
              const isUnlocked = LEAGUE_FLOW.indexOf(league.id as any) <= currentLeagueIndex;
              const isSelected = selectedRoadmapLeague === league.id;

              return (
                <button
                  key={league.id}
                  type="button"
                  onClick={() => setSelectedRoadmapLeague(league.id)}
                  className="flex-1 shrink-0 w-32 md:w-auto flex flex-col items-center text-center space-y-2.5 relative group focus:outline-none cursor-pointer"
                >
                  {/* Step Circle with Badge */}
                  <div className="relative flex items-center justify-center pt-[5px]">
                    <motion.div
                      whileHover={{ scale: 1.12 }}
                      whileTap={{ scale: 0.94 }}
                      className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all duration-300 relative z-20 ${
                        isCurrent 
                          ? 'bg-gradient-to-br from-purple-500 to-indigo-500 text-white shadow-lg ring-4 ring-purple-500/20 dark:ring-purple-500/10'
                          : isUnlocked
                          ? 'bg-purple-100 dark:bg-purple-900/25 text-purple-500 border-2 border-purple-300 dark:border-purple-800'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600 border border-slate-250 dark:border-slate-700'
                      } ${isSelected ? 'ring-4 ring-purple-500/30 dark:ring-purple-400/25' : ''}`}
                    >
                      <span>{league.badge}</span>

                      {/* Check icon or Lock icon helper overlay */}
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center border border-slate-150 dark:border-slate-800 shadow-xs">
                        {isUnlocked ? (
                          <CheckCircle className="text-emerald-500" size={12} />
                        ) : (
                          <Lock className="text-slate-400 dark:text-slate-500" size={10} />
                        )}
                      </span>
                    </motion.div>
                    
                    {/* Glowing pulse indicator for current active league */}
                    {isCurrent && (
                      <span className="absolute w-16 h-16 rounded-full bg-purple-500/10 dark:bg-purple-500/5 animate-ping pointer-events-none" />
                    )}
                  </div>

                  <div className="space-y-0.5">
                    <span className={`text-xs font-black block group-hover:text-purple-500 dark:group-hover:text-cyan-400 transition-colors ${isSelected ? 'text-purple-600 dark:text-cyan-400' : 'text-slate-700 dark:text-slate-300'}`}>
                      {league.name}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                      {league.xpNeeded}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Roadmap Item Detail Pane */}
        <AnimatePresence mode="wait">
          {selectedRoadmapLeague && (
            <motion.div
              key={selectedRoadmapLeague}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-5 rounded-3xl border text-left space-y-3.5 transition-all bg-gradient-to-br ${
                LEAGUES_DETAILS.find(l => l.id === selectedRoadmapLeague)?.id === profile?.league
                  ? 'from-purple-50/10 via-purple-50/5 to-transparent border-purple-105 dark:border-purple-900/35 bg-purple-50/5'
                  : 'from-slate-50/30 via-slate-50/10 to-transparent border-slate-100 dark:border-slate-800/80 dark:bg-slate-900/30'
              }`}
            >
              {(() => {
                const leagueData = LEAGUES_DETAILS.find(l => l.id === selectedRoadmapLeague);
                if (!leagueData) return null;
                const isUserLeague = leagueData.id === profile?.league;
                const isUnlocked = LEAGUE_FLOW.indexOf(leagueData.id as any) <= currentLeagueIndex;

                return (
                  <>
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className={`p-2 rounded-xl text-base ${leagueData.iconColor}`}>
                          {leagueData.badge}
                        </span>
                        <div>
                          <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
                            Liga {leagueData.name} {isUserLeague && "⭐ (Sua Liga)"}
                          </h4>
                          <p className="text-[10px] text-slate-400 font-bold">
                            Requisito: {leagueData.xpNeeded} acumulados
                          </p>
                        </div>
                      </div>

                      <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md ${
                        isUserLeague
                          ? 'bg-purple-100 dark:bg-purple-950/45 text-purple-600 dark:text-purple-400'
                          : isUnlocked
                          ? 'bg-emerald-100 dark:bg-emerald-950/45 text-emerald-600 dark:text-emerald-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      }`}>
                        {isUserLeague ? 'Ativa' : isUnlocked ? 'Desbloqueada' : 'Bloqueada'}
                      </span>
                    </div>

                    <div className="space-y-3 font-sans">
                      <div className="space-y-1">
                        <span className="text-[9px] font-black uppercase text-slate-450 dark:text-slate-500 tracking-wider block">Benefícios e Recompensas:</span>
                        <div className="text-xs font-extrabold text-purple-600 dark:text-cyan-400 flex items-center gap-1.5">
                          🎁 {leagueData.perk}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[9px] font-black uppercase text-slate-455 dark:text-slate-500 tracking-wider block">Sobre a Divisão:</span>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-bold">
                          {leagueData.desc}
                        </p>
                      </div>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>



      {/* Promotion/Demotion Rules Explanation Panels */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl p-4 flex items-center gap-3">
          <ArrowUpCircle className="text-emerald-500 shrink-0" size={24} />
          <div className="text-left">
            <h4 className="text-xs font-black text-emerald-800 dark:text-emerald-400 uppercase">Zona de Promoção (Top 3)</h4>
            <p className="text-[10px] text-emerald-605 dark:text-emerald-500 mt-0.5 font-bold leading-normal">Sobem para a próxima liga com bônus extra de NutriCoins.</p>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-3">
          <Award className="text-blue-500 shrink-0" size={24} />
          <div className="text-left">
            <h4 className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase">Zona Segura (4⁰ a 7⁰)</h4>
            <p className="text-[10px] text-blue-500 dark:text-blue-450 mt-0.5 font-bold leading-normal">Mantêm suas posições e continuam disputando a liga atual.</p>
          </div>
        </div>

        <div className="bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/40 rounded-2xl p-4 flex items-center gap-3">
          <ArrowDownCircle className="text-rose-500 shrink-0" size={24} />
          <div className="text-left">
            <h4 className="text-xs font-black text-rose-800 dark:text-rose-400 uppercase">Rebaixamento (Últimos 3)</h4>
            <p className="text-[10px] text-rose-640 dark:text-rose-500 mt-0.5 font-bold leading-normal">Caem para a liga anterior (Não se aplica na Liga Bronze).</p>
          </div>
        </div>
      </div>

    </section>
  );
};
