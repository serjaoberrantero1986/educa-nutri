import React, { useState } from "react";
import { motion } from "motion/react";
import { 
  History, 
  TrendingUp, 
  Calendar, 
  Trash2, 
  Check, 
  ChevronRight, 
  Info, 
  Award,
  Search,
  Filter,
  X
} from "lucide-react";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from "recharts";
import { ExerciseLog } from "../../types";

interface WorkoutHistoryProps {
  exerciseHistory: ExerciseLog[];
  onDeleteLog?: (id: string) => Promise<void>;
  selectedDate?: Date;
}

export const WorkoutHistory: React.FC<WorkoutHistoryProps> = ({
  exerciseHistory = [],
  onDeleteLog,
  selectedDate
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedExForChart, setSelectedExForChart] = useState<string>("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Get unique exercise names that have logs for search drop or filter selection
  const uniqueExerciseNames = Array.from(
    new Set(exerciseHistory.map(l => l.exercicio))
  );

  // Set default selected exercise for chart if not set
  if (!selectedExForChart && uniqueExerciseNames.length > 0) {
    setSelectedExForChart(uniqueExerciseNames[0]);
  }

  // Filter basic list by search term and selectedDate
  const filteredLogs = exerciseHistory.filter(log => {
    const matchesSearch = log.exercicio.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (selectedDate) {
      if (!log.loggedAt) return false;
      const logDate = new Date(log.loggedAt);
      const isSameDay = logDate.getDate() === selectedDate.getDate() &&
                        logDate.getMonth() === selectedDate.getMonth() &&
                        logDate.getFullYear() === selectedDate.getFullYear();
      return matchesSearch && isSameDay;
    }
    
    return matchesSearch;
  }).sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime());

  // Format datastream for recharts for the chosen chart exercise
  const chartData = exerciseHistory
    .filter(l => l.exercicio.toLowerCase() === selectedExForChart.toLowerCase())
    .sort((a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime())
    .map(log => {
      const isCardio = log.type === 'cardio';
      // If cardio, plot either calories_burned or duration_minutes. Otherwise, max carga.
      const mainVal = isCardio 
        ? (log.calories_burned || log.duration_minutes || 0)
        : Math.max(...log.series.map(s => s.carga), 0);
      try {
        const formattedDate = new Date(log.loggedAt).toLocaleDateString([], { day: '2-digit', month: '2-digit' });
        return {
          date: formattedDate,
          carga: mainVal,
          esforco: log.esforco,
          isCardio
        };
      } catch (e) {
        return { date: '??', carga: mainVal, esforco: log.esforco, isCardio };
      }
    });

  const getRpeLabel = (val: number) => {
    switch (val) {
      case 0: return "Muito Fácil";
      case 1: return "Fácil";
      case 2: return "Médio/Ideal";
      case 3: return "Difícil";
      case 4: return "Insuportável";
      case 5: return "Falha Total";
      default: return `Esforço ${val}`;
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Intro Header */}
      <div className="space-y-1.5">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <History className="text-cyan-500" size={24} />
          Evolução de Cargas & Histórico
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Acompanhe os gráficos de evolução das suas marcas pessoais e veja o histórico de todas as repetições realizadas.
        </p>
      </div>

      {exerciseHistory.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 text-center space-y-3">
          <TrendingUp className="text-slate-300 mx-auto" size={40} />
          <h3 className="font-extrabold text-slate-800 dark:text-white">Seu Histórico está Vazio!</h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
            Após você treinar e salvar suas primeiras séries no menu "Treinar", os seus gráficos de sobrecarga progressiva aparecerão aqui.
          </p>
        </div>
      ) : (
        <>
          {/* Chart Section */}
          {chartData.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <TrendingUp className="text-cyan-400" size={18} />
                    Gráfico de Progressão
                  </h3>
                  <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">Evolução</p>
                </div>

                {/* Filter for choosing exercise */}
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl gap-1 overflow-x-auto max-w-full sm:max-w-md">
                  {uniqueExerciseNames.map((exName) => (
                    <button
                      key={exName}
                      type="button"
                      onClick={() => setSelectedExForChart(exName)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer border-0 ${
                        selectedExForChart.toLowerCase() === exName.toLowerCase()
                          ? "bg-cyan-500 text-white shadow-xs"
                          : "bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                    >
                      {exName}
                    </button>
                  ))}
                </div>
              </div>

              {chartData.length < 2 ? (
                <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  É necessário registrar pelo menos 2 registros deste exercício para gerar uma curva de progressão de carga histórica.
                </div>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#0f172a', 
                          border: 'none', 
                          borderRadius: '16px', 
                          color: '#fff',
                          fontSize: '11px' 
                        }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="carga" 
                        name={chartData[0]?.isCardio ? "Energia (kcal) / Tempo (min)" : "Carga (kg)"}
                        stroke="#06b6d4" 
                        strokeWidth={3} 
                        dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                        activeDot={{ r: 6 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Detailed logs history feed list */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Calendar className="text-purple-500" size={18} />
                Histórico Geral de Sessões
              </h3>

              {/* Simple Search bar */}
              <div className="relative">
                <Search size={14} className="text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Pesquisar exercício..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl pl-9 pr-4 py-1.5 text-xs focus:ring-1 focus:ring-cyan-500 focus:outline-none w-full sm:w-48"
                />
              </div>
            </div>

            <div className="space-y-4">
              {filteredLogs.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-950/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  Nenhum treino registrado para este dia.
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <div 
                    key={log.id} 
                    className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3 relative group"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-black text-slate-800 dark:text-white leading-tight truncate">
                          {log.exercicio}
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Registrado em: {new Date(log.loggedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                      </div>

                      {onDeleteLog && (
                        <div className="shrink-0 flex items-center">
                          {confirmDeleteId === log.id ? (
                            <div className="flex items-center gap-1 bg-rose-500/10 border border-rose-200/20 px-2 py-1 rounded-xl">
                              <span className="text-[9px] font-black uppercase text-rose-500 mr-1">Excluir?</span>
                              <button
                                type="button"
                                onClick={async () => {
                                  await onDeleteLog(log.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 p-1 rounded-lg border-0 bg-transparent cursor-pointer transition-all"
                                title="Confirmar exclusão"
                              >
                                <Check size={12} className="stroke-[3]" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="text-slate-400 hover:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 p-1 rounded-lg border-0 bg-transparent cursor-pointer transition-all"
                                title="Cancelar"
                              >
                                <X size={12} className="stroke-[3]" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(log.id)}
                              className="text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 p-1.5 rounded-lg border border-transparent hover:border-slate-100 dark:hover:border-slate-800 bg-transparent cursor-pointer transition-all"
                              title="Excluir treino"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {log.type === 'cardio' ? (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-100 dark:border-cyan-800/40 px-2.5 py-1 rounded-lg text-[10px] font-bold text-cyan-600 dark:text-cyan-400">
                          🏃‍♂️ Cardio • {log.duration_minutes} min
                        </span>
                        {log.distance_km ? (
                          <span className="bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-800/40 px-2.5 py-1 rounded-lg text-[10px] font-bold text-purple-600 dark:text-purple-400">
                            📍 {log.distance_km} km
                          </span>
                        ) : null}
                        {log.calories_burned ? (
                          <span className="bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-800/40 px-2.5 py-1 rounded-lg text-[10px] font-bold text-rose-600 dark:text-rose-400">
                            🔥 {log.calories_burned} kcal
                          </span>
                        ) : null}
                        {log.pace && (
                          <span className="bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-850 px-2.5 py-1 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300">
                            ⚡ Ritmo: {log.pace}
                          </span>
                        )}
                        {log.reps_count && (
                          <span className="bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-850 px-2.5 py-1 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300">
                            🔄 {log.reps_count} repetições
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {log.series.map((seriesRecord, sIdx) => (
                          <span 
                            key={sIdx} 
                            className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 px-2.5 py-1 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300"
                          >
                            Série {sIdx+1}: <span className="font-mono text-cyan-600 dark:text-cyan-400">{seriesRecord.carga}kg</span> • {seriesRecord.reps} repetições
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 pt-1 border-t border-slate-100/50 dark:border-slate-800/50">
                      <span>Subjetivo: <span className="text-cyan-500">{getRpeLabel(log.esforco)}</span></span>
                      {log.observacoes && (
                        <span className="truncate">Obs: <span className="italic text-slate-400 font-normal">{log.observacoes}</span></span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
