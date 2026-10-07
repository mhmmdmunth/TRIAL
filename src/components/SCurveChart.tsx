import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Calendar,
  Activity,
  CheckCircle2,
  Info,
  Layers,
  Table as TableIcon
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import { WorkItem, ProjectSchedule } from '../types';
import { parseDateFlexible, formatDateToIso } from '../utils/dateUtils';

interface SCurveChartProps {
  workItems: WorkItem[];
  schedule: ProjectSchedule;
}

const CustomSCurveTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const plan = data['Rencana (%)'] || 0;
    const actual = data['Realisasi (%)'] || 0;
    const deviation = Math.round((actual - plan) * 10) / 10;
    const devColor = deviation >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold';
    const devSign = deviation >= 0 ? '+' : '';

    return (
      <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-lg border border-slate-700 text-xs space-y-1.5 min-w-[180px]">
        <div className="font-extrabold text-amber-400 border-b border-white/10 pb-1 flex items-center justify-between">
          <span>{data.dayLabel}</span>
          <span className="text-[9px] bg-amber-400 text-slate-900 px-1.5 py-0.2 rounded font-mono font-bold">DOCKING</span>
        </div>
        <div className="space-y-1 font-semibold text-[11px]">
          <div className="flex justify-between gap-4">
            <span className="text-slate-300">Target Rencana:</span>
            <span className="font-mono text-amber-300">{plan}%</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-300">Realisasi Progres:</span>
            <span className="font-mono text-cyan-400">{actual}%</span>
          </div>
          <div className="flex justify-between gap-4 border-t border-white/10 pt-1 mt-1">
            <span className="text-slate-200">Deviasi Jadwal:</span>
            <span className={`font-mono ${devColor}`}>{devSign}{deviation}%</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const SCurveChart: React.FC<SCurveChartProps> = ({ workItems, schedule }) => {
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [viewTable, setViewTable] = useState<boolean>(false);

  // Compute clean formatted dates based on Date of Project (Arrival to Sail Out) or Docking
  const computedDates = useMemo(() => {
    const list = [];
    const arrivalD = parseDateFlexible(schedule.arriveBgn);
    const dockingD = parseDateFlexible(schedule.dockingDate);
    const sailOutD = parseDateFlexible(schedule.sailOut);
    const finishD = parseDateFlexible(schedule.finishWork);
    const undockingD = parseDateFlexible(schedule.undockingDate);

    const start = arrivalD || dockingD || new Date('2026-09-03');
    const end = sailOutD || finishD || undockingD;

    let days = schedule.dockingDurationDays || 30;
    if (end && end >= start) {
      days = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    }

    for (let i = 1; i <= days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + (i - 1));
      
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      
      list.push({
        dayNum: i,
        dateStr: `${year}-${month}-${day}`,
        dayLabel: `Hari ${i}`,
      });
    }
    return list;
  }, [schedule.arriveBgn, schedule.dockingDate, schedule.sailOut, schedule.finishWork, schedule.undockingDate, schedule.dockingDurationDays]);

  // Calculate Cumulative S-Curve Data Points
  const sCurveData = useMemo(() => {
    const points = [];
    const validItems = workItems.filter(item => !item.isAreaHeader);
    const totalCost = validItems.reduce((acc, item) => acc + (item.totalPrice || 0), 0);
    const itemsCount = validItems.length || 1;
    const totalDays = computedDates.length || 1;

    computedDates.forEach((d, idx) => {
      // 1. Calculate Planned Cumulative %
      let plannedWeightSum = 0;
      
      validItems.forEach((item) => {
        const itemWeight = totalCost > 0 
          ? (item.totalPrice || 0) / totalCost 
          : 1 / itemsCount;

        let planPercent = 0;

        if (item.startDate && item.targetEndDate) {
          const startIdx = computedDates.findIndex(c => c.dateStr === item.startDate);
          const endIdx = computedDates.findIndex(c => c.dateStr === item.targetEndDate);

          if (startIdx >= 0 && endIdx >= startIdx) {
            if (idx >= endIdx) {
              planPercent = 100;
            } else if (idx >= startIdx) {
              const currentSpan = idx - startIdx + 1;
              const totalSpan = endIdx - startIdx + 1;
              planPercent = (currentSpan / totalSpan) * 100;
            }
          }
        } else {
          // Math-based smooth S-Curve fallback if no dates defined
          const t = idx / (totalDays - 1 || 1);
          const factor = 1 / (1 + Math.exp(-9 * (t - 0.5)));
          planPercent = factor * 100;
        }

        plannedWeightSum += (planPercent * itemWeight);
      });

      // 2. Calculate Actual Cumulative %
      let actualWeightSum = 0;

      validItems.forEach((item) => {
        const itemWeight = totalCost > 0 
          ? (item.totalPrice || 0) / totalCost 
          : 1 / itemsCount;

        let actPercent = 0;

        if (item.dailyLogs && Object.keys(item.dailyLogs).length > 0) {
          // If logs are found, get log for this day or closest past day
          if (item.dailyLogs[d.dateStr]) {
            actPercent = item.dailyLogs[d.dateStr].percentAchieved || 0;
          } else {
            const logs = Object.values(item.dailyLogs) as any[];
            const pastLogs = logs.sort((a, b) => a.dateStr.localeCompare(b.dateStr)).filter(l => l.dateStr <= d.dateStr);
            if (pastLogs.length > 0) {
              actPercent = pastLogs[pastLogs.length - 1].percentAchieved || 0;
            } else {
              actPercent = 0;
            }
          }
        } else {
          // Fallback based on item's total progress percent distributed from startDate to endDate
          const startIdx = item.startDate ? computedDates.findIndex(c => c.dateStr === item.startDate) : 0;
          const endIdx = item.targetEndDate ? computedDates.findIndex(c => c.dateStr === item.targetEndDate) : totalDays - 1;
          const globProg = item.progressPercent || 0;

          if (idx >= endIdx) {
            actPercent = globProg;
          } else if (idx >= startIdx) {
            const currentSpan = idx - startIdx + 1;
            const totalSpan = Math.max(1, endIdx - startIdx + 1);
            actPercent = (currentSpan / totalSpan) * globProg;
          } else {
            actPercent = 0;
          }
        }

        actualWeightSum += (actPercent * itemWeight);
      });

      points.push({
        dayNum: d.dayNum,
        dayLabel: `H-${d.dayNum}`,
        dateStr: d.dateStr,
        'Rencana (%)': Math.min(100, Math.round(plannedWeightSum * 10) / 10),
        'Realisasi (%)': Math.min(100, Math.round(actualWeightSum * 10) / 10),
      });
    });

    return points;
  }, [workItems, computedDates]);

  const finalProgress = useMemo(() => {
    if (sCurveData.length === 0) return { plan: 0, actual: 0 };
    const last = sCurveData[sCurveData.length - 1];
    return {
      plan: last['Rencana (%)'],
      actual: last['Realisasi (%)']
    };
  }, [sCurveData]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden mt-6">
      
      {/* Header toggle bar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-150 cursor-pointer hover:bg-slate-100/80 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600 border border-indigo-100">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h3 className="font-extrabold text-sm text-slate-800 tracking-tight flex items-center gap-2">
              S-Curve Kumulatif Proyek <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-bold">RECHARTS ENGINE</span>
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">Analisis real-time akumulasi progres rencana vs realisasi fisik</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-4 text-xs font-bold text-slate-600">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Rencana: {finalProgress.plan}%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" /> Progres: {finalProgress.actual}%
            </span>
          </div>
          {isOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-5 space-y-5">
          
          {/* Quick Informational Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200/60 flex items-center gap-3">
              <Calendar className="w-5 h-5 text-amber-600" />
              <div>
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Target Rencana S-Curve</span>
                <span className="text-sm font-black text-amber-950 font-mono">{finalProgress.plan}%</span>
              </div>
            </div>

            <div className="p-3.5 bg-indigo-50 rounded-xl border border-indigo-200/60 flex items-center gap-3">
              <Activity className="w-5 h-5 text-indigo-600" />
              <div>
                <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">Realisasi Fisik Aktual</span>
                <span className="text-sm font-black text-indigo-950 font-mono">{finalProgress.actual}%</span>
              </div>
            </div>

            <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200/60 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <div>
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Deviasi Akhir</span>
                <span className={`text-sm font-black font-mono ${finalProgress.actual - finalProgress.plan >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {(finalProgress.actual - finalProgress.plan).toFixed(1)}%
                </span>
              </div>
            </div>

          </div>

          {/* Recharts Area Chart Container */}
          <div className="h-72 w-full bg-slate-50 rounded-2xl border border-slate-200 p-3 sm:p-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sCurveData} margin={{ top: 10, right: 15, left: -25, bottom: 5 }}>
                <defs>
                  <linearGradient id="standalonePlanGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e9c46a" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#e9c46a" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="standaloneActGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00b4d8" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#00b4d8" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="#e2e8f0" strokeOpacity={0.7} />
                <XAxis dataKey="dayLabel" tick={{ fontSize: 9, fill: '#475569', fontWeight: 'bold' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#475569', fontWeight: 'bold' }} unit="%" />
                <Tooltip content={<CustomSCurveTooltip />} />
                <Legend verticalAlign="top" height={32} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                <Area name="Rencana (%)" type="monotone" dataKey="Rencana (%)" stroke="#e9c46a" strokeWidth={3} fillOpacity={1} fill="url(#standalonePlanGrad)" />
                <Area name="Realisasi (%)" type="monotone" dataKey="Realisasi (%)" stroke="#00b4d8" strokeWidth={3} fillOpacity={1} fill="url(#standaloneActGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Control Options */}
          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => setViewTable(!viewTable)}
              className="px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 transition-all cursor-pointer"
            >
              {viewTable ? '📊 Sembunyikan Tabel Data' : '📋 Tampilkan Tabel Data Harian'}
            </button>

            <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
              <Info className="w-3.5 h-3.5" /> Berdasarkan kalkulasi matematis bobot nilai perbaikan
            </span>
          </div>

          {/* Daily Table Preview */}
          {viewTable && (
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs max-h-48 overflow-y-auto scrollbar-thin">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[9px] border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="p-2.5 pl-4">Hari Ke-</th>
                    <th className="p-2.5">Tanggal</th>
                    <th className="p-2.5 text-right">Rencana (%)</th>
                    <th className="p-2.5 text-right">Realisasi (%)</th>
                    <th className="p-2.5 text-right pr-4">Deviasi (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 text-slate-600 font-medium font-mono text-[11px]">
                  {sCurveData.map((d) => {
                    const dev = d['Realisasi (%)'] - d['Rencana (%)'];
                    return (
                      <tr key={d.dayNum} className="hover:bg-slate-50">
                        <td className="p-2 pl-4 font-bold text-slate-900">{d.dayLabel}</td>
                        <td className="p-2 text-slate-500">{d.dateStr}</td>
                        <td className="p-2 text-right text-amber-600 font-bold">{d['Rencana (%)']}%</td>
                        <td className="p-2 text-right text-indigo-600 font-bold">{d['Realisasi (%)']}%</td>
                        <td className={`p-2 text-right pr-4 font-bold ${dev >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {dev >= 0 ? '+' : ''}{dev.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
