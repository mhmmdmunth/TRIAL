import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  CloudSun,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  Save,
  TrendingUp,
  Info,
  ChevronRight,
  Filter,
  Activity,
  Award,
  Trash2,
  Plus,
  Edit,
  Flag,
  RotateCcw,
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
} from 'recharts';
import { WorkItem, WorkCategory, ProjectSchedule, VesselSpec } from '../types';

interface DailyTrackerModuleProps {
  vessel: VesselSpec;
  schedule: ProjectSchedule;
  categories: WorkCategory[];
  workItems: WorkItem[];
  onUpdateItems: (items: WorkItem[]) => void;
  onSaveToast?: (message: string) => void;
}

const WEATHER_OPTIONS = [
  { value: 'Cerah', label: '☀️ Cerah (Optimal)', color: 'text-amber-500 bg-amber-50 border-amber-200' },
  { value: 'Berawan', label: '☁️ Berawan', color: 'text-slate-500 bg-slate-50 border-slate-200' },
  { value: 'Hujan Ringan', label: '🌧️ Hujan Ringan (Kendala Pengecatan)', color: 'text-blue-500 bg-blue-50 border-blue-200' },
  { value: 'Hujan Lebat', label: '⛈️ Hujan Lebat (Stop Hotwork)', color: 'text-red-500 bg-red-50 border-red-200' },
  { value: 'Gelombang Tinggi', label: '🌊 Gelombang Tinggi', color: 'text-indigo-500 bg-indigo-50 border-indigo-200' },
];

export const DailyTrackerModule: React.FC<DailyTrackerModuleProps> = ({
  vessel,
  schedule,
  categories,
  workItems,
  onUpdateItems,
  onSaveToast,
}) => {
  const durationDays = schedule.dockingDurationDays || 30;
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [activeSubTab, setActiveSubTab] = useState<'progress' | 'gantt' | 'milestones'>('gantt');

  // Milestone Interface
  interface ProjectMilestone {
    id: string;
    name: string;
    targetDay: number;
    status: 'Pending' | 'Achieved' | 'Delayed';
    achievedDay?: number;
    notes?: string;
  }

  // Milestone State Management
  const [milestones, setMilestones] = useState<ProjectMilestone[]>(() => {
    const saved = localStorage.getItem(`shipyard_milestones_${vessel.id || 'proj-f049'}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn('Error parsing milestones, fallback to default', e);
      }
    }
    return [
      { id: 'ms-1', name: 'Kemasukan Dok (Docking / Impounding)', targetDay: 2, status: 'Pending' },
      { id: 'ms-2', name: 'Pembersihan Lambung (HP Washing / Blasting)', targetDay: 6, status: 'Pending' },
      { id: 'ms-3', name: 'Pekerjaan Pelat Lambung (Hull Plating Hotwork)', targetDay: 15, status: 'Pending' },
      { id: 'ms-4', name: 'Pengecatan Lambung (Hull Blasting & Painting)', targetDay: 20, status: 'Pending' },
      { id: 'ms-5', name: 'Pemeriksaan Kemudi & Propeller (Rudder & Propeller Inspection)', targetDay: 23, status: 'Pending' },
      { id: 'ms-6', name: 'Penurunan Dok (Undocking / Flooding)', targetDay: 26, status: 'Pending' },
      { id: 'ms-7', name: 'Uji Coba Laut & Delivery (Sea Trial & Delivery)', targetDay: 30, status: 'Pending' },
    ];
  });

  const saveMilestones = (updatedList: ProjectMilestone[]) => {
    setMilestones(updatedList);
    localStorage.setItem(`shipyard_milestones_${vessel.id || 'proj-f049'}`, JSON.stringify(updatedList));
  };

  // Milestone Form States
  const [newMsName, setNewMsName] = useState('');
  const [newMsDay, setNewMsDay] = useState<number>(5);
  const [newMsNotes, setNewMsNotes] = useState('');
  const [editingMsId, setEditingMsId] = useState<string | null>(null);
  const [editMsName, setEditMsName] = useState('');
  const [editMsDay, setEditMsDay] = useState<number>(5);
  const [editMsNotes, setEditMsNotes] = useState('');

  // Milestone Actions
  const handleAddMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsName.trim()) return;

    const newMs: ProjectMilestone = {
      id: `ms-${Date.now()}`,
      name: newMsName,
      targetDay: newMsDay,
      status: 'Pending',
      notes: newMsNotes,
    };

    const list = [...milestones, newMs].sort((a,b) => a.targetDay - b.targetDay);
    saveMilestones(list);
    setNewMsName('');
    setNewMsNotes('');
    if (onSaveToast) onSaveToast(`Milestone "${newMsName}" berhasil ditambahkan.`);
  };

  const handleDeleteMilestone = (id: string) => {
    const list = milestones.filter(m => m.id !== id);
    saveMilestones(list);
    if (onSaveToast) onSaveToast('Milestone berhasil dihapus.');
  };

  const handleStartEditMilestone = (ms: ProjectMilestone) => {
    setEditingMsId(ms.id);
    setEditMsName(ms.name);
    setEditMsDay(ms.targetDay);
    setEditMsNotes(ms.notes || '');
  };

  const handleSaveEditMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMsName.trim()) return;

    const list = milestones.map(m => {
      if (m.id === editingMsId) {
        return {
          ...m,
          name: editMsName,
          targetDay: editMsDay,
          notes: editMsNotes,
        };
      }
      return m;
    }).sort((a,b) => a.targetDay - b.targetDay);

    saveMilestones(list);
    setEditingMsId(null);
    if (onSaveToast) onSaveToast('Milestone berhasil diperbarui.');
  };

  const handleToggleMilestoneAchieved = (id: string, currentStatus: string) => {
    const list = milestones.map(m => {
      if (m.id === id) {
        const isAchieved = currentStatus === 'Achieved';
        return {
          ...m,
          status: (isAchieved ? 'Pending' : 'Achieved') as 'Pending' | 'Achieved',
          achievedDay: isAchieved ? undefined : selectedDay,
        };
      }
      return m;
    });
    saveMilestones(list);
    if (onSaveToast) onSaveToast('Status pencapaian milestone berhasil diperbarui.');
  };

  const handleResetMilestonesToDefault = () => {
    if (window.confirm('Apakah Anda yakin ingin menyetel ulang semua target milestone?')) {
      const defaults: ProjectMilestone[] = [
        { id: 'ms-1', name: 'Kemasukan Dok (Docking / Impounding)', targetDay: 2, status: 'Pending' },
        { id: 'ms-2', name: 'Pembersihan Lambung (HP Washing / Blasting)', targetDay: 6, status: 'Pending' },
        { id: 'ms-3', name: 'Pekerjaan Pelat Lambung (Hull Plating Hotwork)', targetDay: 15, status: 'Pending' },
        { id: 'ms-4', name: 'Pengecatan Lambung (Hull Blasting & Painting)', targetDay: 20, status: 'Pending' },
        { id: 'ms-5', name: 'Pemeriksaan Kemudi & Propeller (Rudder & Propeller Inspection)', targetDay: 23, status: 'Pending' },
        { id: 'ms-6', name: 'Penurunan Dok (Undocking / Flooding)', targetDay: 26, status: 'Pending' },
        { id: 'ms-7', name: 'Uji Coba Laut & Delivery (Sea Trial & Delivery)', targetDay: 30, status: 'Pending' },
      ];
      saveMilestones(defaults);
      if (onSaveToast) onSaveToast('Target milestone berhasil di-reset ke standar.');
    }
  };

  // MS Project scheduling and baseline helpers
  const getDayIndex = (dateString: string | undefined): number => {
    if (!dateString) return 1;
    const idx = computedDates.findIndex(d => d.dateStr === dateString);
    return idx >= 0 ? idx + 1 : 1;
  };

  const getDateStringForDay = (dayNum: number): string => {
    const d = computedDates[dayNum - 1] || computedDates[0];
    return d ? d.dateStr : '';
  };

  const handleAutoGenerateBaseline = () => {
    if (window.confirm('Apakah Anda ingin mengisi otomatis tanggal mulai & selesai rencana (baseline) WBS Waktu berdasarkan standar urutan pekerjaan galangan kapal?')) {
      const updated = workItems.map(item => {
        if (item.isAreaHeader) return item;

        // Determine logical day range based on category code or first digit
        let startD = 1;
        let endD = 5;

        const catCode = item.categoryId.toUpperCase();
        if (catCode.includes('I') || catCode.includes('DOCK')) {
          startD = 1; endD = 3;
        } else if (catCode.includes('II') || catCode.includes('CLEAN') || catCode.includes('BLAST')) {
          startD = 4; endD = 8;
        } else if (catCode.includes('III') || catCode.includes('ANODE')) {
          startD = 7; endD = 10;
        } else if (catCode.includes('IV') || catCode.includes('STEEL') || catCode.includes('PELAT')) {
          startD = 8; endD = 18;
        } else if (catCode.includes('V') || catCode.includes('STERN') || catCode.includes('PROP')) {
          startD = 12; endD = 20;
        } else if (catCode.includes('VI') || catCode.includes('OUTBOARD')) {
          startD = 14; endD = 22;
        } else if (catCode.includes('VII') || catCode.includes('PIPE') || catCode.includes('PIPA')) {
          startD = 10; endD = 22;
        } else if (catCode.includes('VIII') || catCode.includes('MACH') || catCode.includes('MESIN')) {
          startD = 12; endD = 25;
        } else if (catCode.includes('IX') || catCode.includes('ELEC') || catCode.includes('LISTRIK')) {
          startD = 15; endD = 26;
        } else if (catCode.includes('X') || catCode.includes('PAINT') || catCode.includes('CAT')) {
          startD = 18; endD = 28;
        } else {
          startD = 25; endD = 30;
        }

        // bound to durationDays
        startD = Math.min(durationDays, startD);
        endD = Math.min(durationDays, Math.max(startD + 1, endD));

        const sd = getDateStringForDay(startD);
        const ed = getDateStringForDay(endD);

        // Auto-calculate logical planPercent based on selectedDay
        let planPct = 0;
        if (selectedDay >= endD) planPct = 100;
        else if (selectedDay >= startD) {
          planPct = Math.round(((selectedDay - startD + 1) / (endD - startD + 1)) * 100);
        }

        return {
          ...item,
          startDate: sd,
          targetEndDate: ed,
          planPercent: planPct,
          weightFactor: item.weightFactor || Math.round((1 / workItems.length) * 100),
        };
      });

      onUpdateItems(updated);
      if (onSaveToast) onSaveToast('Baseline timeline berhasil di-generate secara otomatis.');
    }
  };

  const handleUpdateTaskSchedule = (itemId: string, field: 'startDate' | 'targetEndDate' | 'planPercent' | 'progressPercent', value: any) => {
    const updated = workItems.map(item => {
      if (item.id !== itemId) return item;

      const updatedItem = { ...item };
      if (field === 'startDate') updatedItem.startDate = value;
      if (field === 'targetEndDate') updatedItem.targetEndDate = value;
      if (field === 'planPercent') updatedItem.planPercent = parseInt(value) || 0;
      if (field === 'progressPercent') {
        const numVal = parseInt(value) || 0;
        updatedItem.progressPercent = numVal;
        updatedItem.isCompleted = numVal === 100;
        
        // Save to active day's dailyLog too!
        const itemLogs = { ...(item.dailyLogs || {}) };
        itemLogs[activeDayInfo.dateStr] = {
          dateStr: activeDayInfo.dateStr,
          percentAchieved: numVal,
          weather: currentDayMeta.weather,
          manpower: currentDayMeta.manpower,
        };
        updatedItem.dailyLogs = itemLogs;
      }

      return updatedItem;
    });

    onUpdateItems(updated);
  };

  // Convert docking start date to a Date object to compute specific dates for each day
  const computedDates = useMemo(() => {
    const list = [];
    let start = new Date();
    
    // Parse start docking date, e.g. "2026-09-07" or natural Indonesian dates
    const dateStr = schedule.dockingDate;
    if (dateStr) {
      const parsed = Date.parse(dateStr);
      if (!isNaN(parsed)) {
        start = new Date(parsed);
      } else {
        const parts = dateStr.split(' ');
        if (parts.length >= 3) {
          const dayNum = parseInt(parts[1]) || 7;
          const yearNum = parseInt(parts[3]) || 2026;
          start = new Date(yearNum, 8, dayNum); // Sept
        }
      }
    }

    for (let i = 1; i <= durationDays; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + (i - 1));
      
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      
      const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' };
      const formatted = d.toLocaleDateString('id-ID', options);

      list.push({
        dayNum: i,
        dateStr: dateString,
        formatted,
        label: `Hari ${i}`,
      });
    }
    return list;
  }, [schedule.dockingDate, durationDays]);

  const activeDayInfo = useMemo(() => {
    return computedDates[selectedDay - 1] || computedDates[0];
  }, [computedDates, selectedDay]);

  // Aggregate daily global parameter records for S-Curve and Day Info
  // Stored in workItems as metadata inside item.dailyLogs
  const projectDailyMeta = useMemo(() => {
    const meta: Record<string, { weather: string; manpower: number; generalNotes: string }> = {};
    
    computedDates.forEach((d) => {
      // Find any item log for this date to extract weather/manpower
      let foundWeather = 'Cerah';
      let foundManpower = 15;
      let foundNotes = '';

      for (const item of workItems) {
        if (item.dailyLogs && item.dailyLogs[d.dateStr]) {
          const log = item.dailyLogs[d.dateStr] as any;
          if (log.weather) foundWeather = log.weather;
          if (log.manpower) foundManpower = log.manpower;
          if (log.notes) foundNotes = log.notes;
          break;
        }
      }

      meta[d.dateStr] = {
        weather: foundWeather,
        manpower: foundManpower,
        generalNotes: foundNotes,
      };
    });

    return meta;
  }, [workItems, computedDates]);

  const currentDayMeta = useMemo(() => {
    return projectDailyMeta[activeDayInfo.dateStr] || { weather: 'Cerah', manpower: 15, generalNotes: '' };
  }, [projectDailyMeta, activeDayInfo]);

  // Generate actual S-Curve data points purely based on the historical logs entered so far
  const realSCurveData = useMemo(() => {
    const points = [];
    const totalCost = workItems.reduce((acc, item) => acc + (item.totalPrice || 0), 0) || 1;

    computedDates.forEach((d, idx) => {
      const t = (idx) / (durationDays - 1 || 1);
      
      // 1. Plan % calculation (S-curve shape)
      const planVal = Math.round((Math.sin(t * Math.PI - Math.PI / 2) + 1) * 50);

      // 2. Realized % based on the cumulative achieved progress at this date
      let totalWeightedActual = 0;

      workItems.forEach((item) => {
        let percent = 0;
        if (item.dailyLogs && item.dailyLogs[d.dateStr]) {
          percent = (item.dailyLogs[d.dateStr] as any).percentAchieved || 0;
        } else {
          const logs = Object.values(item.dailyLogs || {}) as any[];
          const pastLogs = logs.sort((a,b) => a.dateStr.localeCompare(b.dateStr)).filter((l) => l.dateStr <= d.dateStr);
          if (pastLogs.length > 0) {
            percent = pastLogs[pastLogs.length - 1].percentAchieved || 0;
          } else {
            percent = 0;
          }
        }
        
        const itemWeight = (item.totalPrice || 0) / totalCost;
        totalWeightedActual += percent * itemWeight;
      });

      const isPastOrToday = d.dayNum <= selectedDay;
      
      points.push({
        dayLabel: `H-${d.dayNum}`,
        dateLabel: d.formatted,
        'Rencana (%)': planVal,
        'Realisasi (%)': isPastOrToday ? Math.round(totalWeightedActual * 100) / 100 : undefined,
        manpower: projectDailyMeta[d.dateStr]?.manpower || 0,
      });
    });

    return points;
  }, [computedDates, workItems, durationDays, selectedDay, projectDailyMeta]);

  // Handle updates to specific day attributes (weather, manpower, technical notes)
  const handleUpdateDayMeta = (field: 'weather' | 'manpower' | 'notes', val: any) => {
    const dateStr = activeDayInfo.dateStr;
    const updatedItems = workItems.map((item) => {
      const itemLogs = { ...(item.dailyLogs || {}) };
      const currentLog = itemLogs[dateStr] || {
        dateStr,
        percentAchieved: item.progressPercent || 0,
      };

      if (field === 'weather') currentLog.weather = val;
      if (field === 'manpower') currentLog.manpower = parseInt(val) || 0;
      if (field === 'notes') currentLog.notes = val;

      itemLogs[dateStr] = currentLog;
      return {
        ...item,
        dailyLogs: itemLogs,
      };
    });

    onUpdateItems(updatedItems);
    if (onSaveToast) onSaveToast(`Parameter Hari {selectedDay} berhasil diperbarui.`);
  };

  const handleUpdateItemProgressForDay = (itemId: string, percentVal: number) => {
    const boundedPercent = Math.min(100, Math.max(0, percentVal));
    const dateStr = activeDayInfo.dateStr;

    const updatedItems = workItems.map((item) => {
      if (item.id !== itemId) return item;

      const itemLogs = { ...(item.dailyLogs || {}) };
      const currentLog = itemLogs[dateStr] || {
        dateStr,
        percentAchieved: boundedPercent,
        weather: currentDayMeta.weather,
        manpower: currentDayMeta.manpower,
      };

      currentLog.percentAchieved = boundedPercent;
      currentLog.status = 'Normal';
      itemLogs[dateStr] = currentLog;

      return {
        ...item,
        progressPercent: boundedPercent,
        isCompleted: boundedPercent === 100,
        dailyLogs: itemLogs,
        updatedAt: new Date().toISOString(),
      };
    });

    onUpdateItems(updatedItems);
  };

  const filteredItems = useMemo(() => {
    return workItems.filter((item) => {
      if (item.isAreaHeader) return false;
      const matchSearch =
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.itemNo || '').includes(searchQuery);
      const matchCat = selectedCat === 'all' || item.categoryId === selectedCat;
      return matchSearch && matchCat;
    });
  }, [workItems, searchQuery, selectedCat]);

  return (
    <div className="space-y-4">
      {/* Top Welcome Title & Brief Description */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-900 to-emerald-700 text-white flex items-center justify-center shadow-md">
              <Activity className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Plan vs Actual &amp; S-Curve
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Pengelolaan progres fisik harian, pencatatan cuaca, serta diagram batang Gantt / WBS terstruktur ala Excel &amp; MS Project.
              </p>
            </div>
          </div>
          
          <div className="bg-emerald-50 text-emerald-950 font-bold px-3 py-1.5 rounded-xl border border-emerald-200/80 text-xs flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-700" />
            <span>Docking Schedule: {schedule.dockingDate || 'Hari 1'} s.d. {schedule.finishWork || 'Hari Akhir'}</span>
          </div>
        </div>

        {/* Dynamic Navigation Calendar Panel */}
        <div className="pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-700" />
              Pilih Hari Evaluasi (Durasi {durationDays} Hari)
            </span>
            <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {activeDayInfo.formatted}
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {computedDates.map((d) => {
              const isSelected = selectedDay === d.dayNum;
              const hasLogs = workItems.some(
                (item) => item.dailyLogs && item.dailyLogs[d.dateStr] && (item.dailyLogs[d.dateStr] as any).percentAchieved > 0
              );
              
              return (
                <button
                  key={d.dayNum}
                  onClick={() => setSelectedDay(d.dayNum)}
                  className={`flex flex-col items-center justify-center min-w-[70px] h-16 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 border-slate-950 text-white font-bold shadow-md ring-2 ring-emerald-400'
                      : hasLogs
                      ? 'bg-emerald-50/70 hover:bg-emerald-100/70 border-emerald-300 text-emerald-950 font-semibold'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <span className="text-[10px] text-slate-400 font-bold block">Day</span>
                  <span className="text-lg font-black font-mono leading-none">{d.dayNum}</span>
                  {hasLogs && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main split dashboard grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Left Column: Day Parameter Editor & Real S-Curve Card */}
        <div className="lg:col-span-1 space-y-4">
          {/* Day Parameter Editor Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                <CloudSun className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">Parameter Hari {selectedDay}</h3>
            </div>

            {/* Weather Selector */}
            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-slate-600 block">Kondisi Cuaca Lapangan</label>
              <div className="grid grid-cols-1 gap-1">
                {WEATHER_OPTIONS.map((opt) => {
                  const isChosen = currentDayMeta.weather === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => handleUpdateDayMeta('weather', opt.value)}
                      className={`text-left px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center justify-between ${
                        isChosen
                          ? 'bg-slate-900 text-white border-slate-900 font-bold shadow-xs'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {isChosen && <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.2 rounded font-bold uppercase">Active</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Manpower Deployed Input */}
            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-slate-600 block flex items-center gap-1.5">
                <Users className="w-4 h-4 text-slate-400" />
                Jumlah Tenaga Kerja (Manpower)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={currentDayMeta.manpower || ''}
                  onChange={(e) => handleUpdateDayMeta('manpower', e.target.value)}
                  placeholder="Jumlah buruh / welder"
                  className="w-full font-mono font-bold text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
                <span className="text-slate-500 font-semibold shrink-0">Org / Welder</span>
              </div>
            </div>

            {/* Daily Technical Remark Notes */}
            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-slate-600 block">Catatan Kejadian / Kendala Teknis</label>
              <textarea
                rows={3}
                value={currentDayMeta.generalNotes || ''}
                onChange={(e) => handleUpdateDayMeta('notes', e.target.value)}
                placeholder="Tulis hambatan, misal: Listrik padam, cat lambat kering karena mendung, dll."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500 resize-none"
              />
            </div>
          </div>

          {/* S-Curve Plotter */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">Kurva S Progres Kumulatif</h3>
            </div>

            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={realSCurveData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="dayLabel" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} unit="%" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '10px', color: '#fff', fontSize: '11px' }}
                  />
                  <Legend verticalAlign="top" wrapperStyle={{ fontSize: '10px' }} />
                  <Area type="monotone" dataKey="Rencana (%)" stroke="#10b981" strokeWidth={2} fillOpacity={0.05} fill="#10b981" />
                  <Area type="monotone" dataKey="Realisasi (%)" stroke="#0ea5e9" strokeWidth={2.5} fillOpacity={0.1} fill="#0ea5e9" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Visual Timeline of Target Milestones */}
            <div className="pt-3 border-t border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Timeline Milestone Terdekat</span>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                {milestones.slice(0, 4).map((ms) => {
                  const isDelayed = selectedDay > ms.targetDay && ms.status === 'Pending';
                  const isAchieved = ms.status === 'Achieved';
                  
                  return (
                    <div key={ms.id} className="flex items-start gap-2 text-[11px] leading-tight">
                      <div className="mt-1 shrink-0">
                        {isAchieved ? (
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        ) : isDelayed ? (
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                        ) : (
                          <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`font-bold block truncate ${isAchieved ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                            {ms.name}
                          </span>
                          <span className="font-mono font-bold text-slate-500 shrink-0 ml-1">H-{ms.targetDay}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {isAchieved ? (
                            <span className="text-emerald-700 font-semibold">Tercapai pada Hari {ms.achievedDay}</span>
                          ) : isDelayed ? (
                            <span className="text-red-600 font-semibold">⚠️ Terlambat (Target Hari {ms.targetDay})</span>
                          ) : (
                            <span>Belum tercapai</span>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Work Items Daily Progress Manager OR Milestones Management */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-4">
          {/* Sub Tab Navigation inside the module with premium design */}
          <div className="flex border-b border-slate-100 pb-1 gap-2 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveSubTab('progress')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'progress'
                  ? 'border-emerald-600 text-emerald-950 font-extrabold'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Activity className="w-4 h-4 text-emerald-700" />
              <span>Input Capaian Progres Harian</span>
            </button>
            
            <button
              onClick={() => setActiveSubTab('gantt')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'gantt'
                  ? 'border-emerald-600 text-emerald-950 font-extrabold'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Calendar className="w-4 h-4 text-emerald-700" />
              <span>Microsoft Project (WBS &amp; Gantt)</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold font-mono">
                WBS
              </span>
            </button>

            <button
              onClick={() => setActiveSubTab('milestones')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'milestones'
                  ? 'border-emerald-600 text-emerald-950 font-extrabold'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Award className="w-4 h-4 text-amber-600" />
              <span>Target &amp; Milestone Proyek</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold font-mono">
                {milestones.filter(m => m.status === 'Achieved').length}/{milestones.length}
              </span>
            </button>
          </div>

          {activeSubTab === 'progress' ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-50 pb-2">
                <div>
                  <h4 className="font-bold text-xs text-slate-800">Uraian Pekerjaan &amp; Fisik Kapal</h4>
                  <p className="text-[11px] text-slate-400">Tentukan persentase penyelesaian (%) pada Hari {selectedDay}</p>
                </div>
              </div>

              {/* Search and category filters */}
              <div className="flex flex-col sm:flex-row gap-2">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari uraian pekerjaan atau item..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Category select filter */}
                <select
                  value={selectedCat}
                  onChange={(e) => setSelectedCat(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="all">Semua Kategori</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id || cat.code}>
                      {cat.code}. {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Work Item Grid List */}
              <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1 scrollbar-thin text-xs">
                {filteredItems.length === 0 ? (
                  <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <Filter className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">Tidak ada pekerjaan yang cocok</p>
                    <p className="text-slate-500 mt-1">Gunakan kata kunci pencarian atau filter yang berbeda.</p>
                  </div>
                ) : (
                  filteredItems.map((item) => {
                    const loggedProgress = item.dailyLogs && item.dailyLogs[activeDayInfo.dateStr] 
                      ? (item.dailyLogs[activeDayInfo.dateStr] as any).percentAchieved 
                      : item.progressPercent || 0;

                    const isCompleted = loggedProgress === 100;

                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-xl border transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                          isCompleted 
                            ? 'bg-emerald-50/50 border-emerald-200/80 hover:bg-emerald-50' 
                            : 'bg-slate-50/50 border-slate-200/80 hover:bg-slate-50'
                        }`}
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-slate-200/70 text-slate-800 font-mono text-[10px] font-bold">
                              {item.itemNo}
                            </span>
                            <span className="font-bold text-slate-800 truncate block text-xs" title={item.description}>
                              {item.description}
                            </span>
                          </div>
                          
                          {item.notes && (
                            <p className="text-[11px] text-slate-500 italic truncate max-w-[400px]">
                              {item.notes}
                            </p>
                          )}

                          <div className="flex items-center gap-2 text-[10px] text-slate-500">
                            <span className="font-semibold text-slate-600">Volume: {item.qty} {item.unit}</span>
                            <span>·</span>
                            <span className="font-semibold text-emerald-800">Tipe: {item.type || 'MISC'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="5"
                              value={loggedProgress}
                              onChange={(e) => handleUpdateItemProgressForDay(item.id, parseInt(e.target.value))}
                              className="w-24 sm:w-32 accent-emerald-600 cursor-pointer"
                            />
                            <div className="w-12 text-right">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={loggedProgress}
                                onChange={(e) => handleUpdateItemProgressForDay(item.id, parseInt(e.target.value) || 0)}
                                className="w-11 font-mono font-bold text-center bg-white border border-slate-200 rounded px-1 py-0.5"
                              />
                              <span className="font-bold font-mono text-slate-600 ml-0.5">%</span>
                            </div>
                          </div>

                          <div>
                            {isCompleted ? (
                              <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800" title="Pekerjaan Selesai">
                                <CheckCircle2 className="w-4 h-4" />
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400" title="Masih Berjalan">
                                <Activity className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : activeSubTab === 'gantt' ? (
            // GANTT CHART & WBS TAB (MS PROJECT STYLE!)
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-2">
                <div>
                  <h4 className="font-extrabold text-xs text-slate-800">Microsoft Project Interactive WBS Workspace</h4>
                  <p className="text-[11px] text-slate-400">Pengelolaan durasi, tanggal mulai/selesai, bobot rencana, dan visualisasi bar progres fisik harian.</p>
                </div>
                
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={handleAutoGenerateBaseline}
                    className="px-2.5 py-1 text-[11px] bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Auto-Generate Baseline</span>
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Ingin menyinkronkan seluruh persentase progres aktual ke rencana harian saat ini?')) {
                        const updated = workItems.map(item => ({
                          ...item,
                          progressPercent: item.planPercent || 0,
                          isCompleted: item.planPercent === 100,
                        }));
                        onUpdateItems(updated);
                        if (onSaveToast) onSaveToast('Progres fisik aktual disinkronkan ke rencana.');
                      }
                    }}
                    className="px-2.5 py-1 text-[11px] bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-lg border border-slate-300 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Sinkron Progres</span>
                  </button>
                </div>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 text-[10px] font-semibold text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-2 bg-slate-300 rounded" />
                  <span>Rencana (Baseline)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-2 bg-emerald-500 rounded" />
                  <span>Capaian Aktual (%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-2 bg-red-500 rounded" />
                  <span>Terlambat (Delay)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-amber-500 font-bold">♦</span>
                  <span>Target Milestone</span>
                </div>
              </div>

              {/* Task Grid Spreadsheet & Gantt timeline panel */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                <div className="overflow-x-auto scrollbar-thin">
                  <div className="min-w-[850px] divide-y divide-slate-100">
                    
                    {/* Headers */}
                    <div className="grid grid-cols-12 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2.5 px-3">
                      <div className="col-span-1">WBS</div>
                      <div className="col-span-3">Uraian Pekerjaan (Task Name)</div>
                      <div className="col-span-1 text-center">Durasi</div>
                      <div className="col-span-1.5 text-center">Mulai</div>
                      <div className="col-span-1.5 text-center">Selesai</div>
                      <div className="col-span-1 text-center">Rencana %</div>
                      <div className="col-span-1 text-center">Realisasi %</div>
                      <div className="col-span-2 text-center">Visual Gantt Chart (30 Hari)</div>
                    </div>

                    {/* Task rows */}
                    <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
                      {workItems.filter(item => !item.isAreaHeader).length === 0 ? (
                        <div className="text-center py-12 text-slate-500 text-xs font-semibold">
                          Tidak ada daftar pekerjaan. Tambahkan pekerjaan utama di Repair List terlebih dahulu.
                        </div>
                      ) : (
                        workItems.filter(item => !item.isAreaHeader).map((item) => {
                          const startDay = getDayIndex(item.startDate);
                          const endDay = getDayIndex(item.targetEndDate);
                          const duration = Math.max(1, endDay - startDay + 1);

                          // Visual layout calculations for Gantt bars (Day 1 to 30)
                          const leftPct = ((startDay - 1) / durationDays) * 100;
                          const widthPct = (duration / durationDays) * 100;
                          
                          // Actual progress bar calculation
                          const actualProgress = item.progressPercent || 0;
                          const actualWidthPct = widthPct * (actualProgress / 100);
                          
                          // Check if delayed
                          const isOverdue = selectedDay > endDay && actualProgress < 100;

                          return (
                            <div key={item.id} className="grid grid-cols-12 items-center text-xs py-2 px-3 hover:bg-slate-50 transition-colors">
                              
                              {/* WBS */}
                              <div className="col-span-1 font-mono font-bold text-slate-400">{item.itemNo}</div>
                              
                              {/* Task Name */}
                              <div className="col-span-3 font-semibold text-slate-700 truncate pr-2" title={item.description}>
                                {item.description}
                              </div>
                              
                              {/* Duration Days */}
                              <div className="col-span-1 text-center font-bold text-slate-500">{duration} Hari</div>
                              
                              {/* Start Date picker */}
                              <div className="col-span-1.5 px-1">
                                <input
                                  type="date"
                                  value={item.startDate || ''}
                                  onChange={(e) => handleUpdateTaskSchedule(item.id, 'startDate', e.target.value)}
                                  className="w-full text-[11px] font-mono border border-slate-200 rounded px-1 py-0.5 bg-slate-50 focus:bg-white text-center"
                                />
                              </div>

                              {/* End Date picker */}
                              <div className="col-span-1.5 px-1">
                                <input
                                  type="date"
                                  value={item.targetEndDate || ''}
                                  onChange={(e) => handleUpdateTaskSchedule(item.id, 'targetEndDate', e.target.value)}
                                  className="w-full text-[11px] font-mono border border-slate-200 rounded px-1 py-0.5 bg-slate-50 focus:bg-white text-center"
                                />
                              </div>

                              {/* Plan % input */}
                              <div className="col-span-1 text-center px-1">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={item.planPercent || 0}
                                  onChange={(e) => handleUpdateTaskSchedule(item.id, 'planPercent', e.target.value)}
                                  className="w-full font-mono text-center border border-slate-200 rounded py-0.5"
                                />
                              </div>

                              {/* Actual % input */}
                              <div className="col-span-1 text-center px-1">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={item.progressPercent || 0}
                                  onChange={(e) => handleUpdateTaskSchedule(item.id, 'progressPercent', e.target.value)}
                                  className="w-full font-mono font-bold text-sky-700 text-center border border-slate-200 rounded py-0.5"
                                />
                              </div>

                              {/* GANTT TIMELINE BAR */}
                              <div className="col-span-2 relative h-6 bg-slate-100 rounded border border-slate-200/50 overflow-hidden">
                                {/* Selected day gridline indicator */}
                                <div 
                                  className="absolute top-0 bottom-0 w-0.5 bg-sky-400 opacity-60 z-20"
                                  style={{ left: `${((selectedDay - 1) / durationDays) * 100}%` }}
                                  title={`Hari Evaluasi Terpilih (Hari ${selectedDay})`}
                                />

                                {/* Baseline Plan Bar (Gray) */}
                                <div
                                  className={`absolute top-1 h-3.5 rounded-sm transition-all ${
                                    isOverdue ? 'bg-red-200 border border-red-300' : 'bg-slate-300/80 border border-slate-400/40'
                                  }`}
                                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                                  title={`Rencana: Hari ${startDay} s.d. ${endDay}`}
                                />

                                {/* Actual Progress Overlay Bar (Sky Blue or Overdue Red) */}
                                {actualProgress > 0 && (
                                  <div
                                    className={`absolute top-1 h-3.5 rounded-sm transition-all ${
                                      isOverdue ? 'bg-red-600' : 'bg-emerald-600'
                                    }`}
                                    style={{ left: `${leftPct}%`, width: `${actualWidthPct}%` }}
                                    title={`Realisasi: ${actualProgress}%`}
                                  />
                                )}

                                {/* Milestone Diamond Markers Overlay */}
                                {milestones.map((ms) => {
                                  const msDay = ms.targetDay;
                                  const msLeft = ((msDay - 1) / durationDays) * 100;
                                  return (
                                    <div
                                      key={ms.id}
                                      className="absolute top-1/2 -translate-y-1/2 text-amber-500 font-extrabold text-[13px] z-10 cursor-pointer hover:scale-125 transition-transform"
                                      style={{ left: `${msLeft}%` }}
                                      title={`Milestone: ${ms.name} (Hari ${ms.targetDay})`}
                                    >
                                      ♦
                                    </div>
                                  );
                                })}
                              </div>

                            </div>
                          );
                        })
                      )}
                    </div>

                  </div>
                </div>
              </div>
            </div>
          ) : (
            // MILESTONES TAB
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-2">
                <div>
                  <h4 className="font-bold text-xs text-slate-800">Kelola Target &amp; Milestone Kunci</h4>
                  <p className="text-[11px] text-slate-400">Tentukan target serah terima, impounding, sandar, dan inspeksi utama.</p>
                </div>
                <button
                  onClick={handleResetMilestonesToDefault}
                  className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg border border-slate-300 transition-colors cursor-pointer inline-flex items-center gap-1 shrink-0 text-slate-800"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Sesuai Standar</span>
                </button>
              </div>

              {/* Add Milestone Inline Form */}
              <form onSubmit={handleAddMilestone} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tambah Target Milestone Baru</span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600 block">Nama Milestone / Kegiatan Utama</label>
                    <input
                      type="text"
                      placeholder="Contoh: Blasting Lambung Selesai"
                      value={newMsName}
                      onChange={(e) => setNewMsName(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600 block">Target Hari Docking (Day-N)</label>
                    <input
                      type="number"
                      min="1"
                      max={durationDays}
                      value={newMsDay}
                      onChange={(e) => setNewMsDay(parseInt(e.target.value) || 1)}
                      className="w-full text-xs font-mono font-bold border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1 flex flex-col justify-end">
                    <label className="font-bold text-slate-600 block">Catatan / Kriteria Sukses</label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        placeholder="Contoh: Kriteria ketebalan cat"
                        value={newMsNotes}
                        onChange={(e) => setNewMsNotes(e.target.value)}
                        className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                      />
                      <button
                        type="submit"
                        className="px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </form>

              {/* Milestones Listing */}
              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin">
                {milestones.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-500">
                    <Flag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-xs text-slate-700">Belum ada target milestone</p>
                    <p className="text-[11px] mt-1">Gunakan formulir di atas atau reset ke standar.</p>
                  </div>
                ) : (
                  milestones.map((ms) => {
                    const isEditing = editingMsId === ms.id;
                    const isDelayed = selectedDay > ms.targetDay && ms.status === 'Pending';
                    const isAchieved = ms.status === 'Achieved';

                    return (
                      <div
                        key={ms.id}
                        className={`p-3 rounded-xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isAchieved
                            ? 'bg-emerald-50/40 border-emerald-200/60'
                            : isDelayed
                            ? 'bg-red-50/40 border-red-200/60 animate-pulse'
                            : 'bg-white border-slate-200/80 hover:bg-slate-50'
                        }`}
                      >
                        {isEditing ? (
                          <form
                            onSubmit={handleSaveEditMilestone}
                            className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs"
                          >
                            <input
                              type="text"
                              value={editMsName}
                              onChange={(e) => setEditMsName(e.target.value)}
                              className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white"
                            />
                            <input
                              type="number"
                              value={editMsDay}
                              onChange={(e) => setEditMsDay(parseInt(e.target.value) || 1)}
                              className="text-xs font-mono border border-slate-200 rounded-lg px-2 py-1 bg-white"
                            />
                            <div className="flex gap-1">
                              <input
                                type="text"
                                value={editMsNotes}
                                onChange={(e) => setEditMsNotes(e.target.value)}
                                className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white"
                              />
                              <button
                                type="submit"
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs cursor-pointer"
                              >
                                Simpan
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingMsId(null)}
                                className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-xs cursor-pointer"
                              >
                                Batal
                              </button>
                            </div>
                          </form>
                        ) : (
                          <>
                            <div className="min-w-0 flex-1 space-y-1 text-xs">
                              <div className="flex flex-wrap items-center gap-2">
                                <Flag className={`w-3.5 h-3.5 ${isAchieved ? 'text-emerald-600' : 'text-slate-400'}`} />
                                <span className={`font-bold block text-sm ${isAchieved ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                                  {ms.name}
                                </span>
                                <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.2 rounded border border-slate-200">
                                  Target: Hari {ms.targetDay}
                                </span>
                              </div>
                              {ms.notes && <p className="text-[11px] text-slate-500">{ms.notes}</p>}
                              
                              <div className="text-[10px] flex items-center gap-2 mt-1">
                                {isAchieved ? (
                                  <span className="text-emerald-700 font-bold bg-emerald-100/60 px-2 py-0.2 rounded border border-emerald-200/50">
                                    ✓ Tercapai pada Hari {ms.achievedDay}
                                  </span>
                                ) : isDelayed ? (
                                  <span className="text-red-700 font-bold bg-red-100/60 px-2 py-0.2 rounded border border-red-200/50">
                                    ⚠️ Terlambat {selectedDay - ms.targetDay} hari
                                  </span>
                                ) : (
                                  <span className="text-slate-500 font-medium">
                                    Menunggu Hari {ms.targetDay} (Deviasi: 0 hari)
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Milestone Actions Buttons */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleToggleMilestoneAchieved(ms.id, ms.status)}
                                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-colors cursor-pointer inline-flex items-center gap-1 ${
                                  isAchieved
                                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700'
                                }`}
                              >
                                <span>{isAchieved ? 'Batal' : 'Set Selesai'}</span>
                              </button>
                              <button
                                onClick={() => handleStartEditMilestone(ms)}
                                className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
                                title="Edit Milestone"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteMilestone(ms.id)}
                                className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                                title="Hapus Milestone"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
