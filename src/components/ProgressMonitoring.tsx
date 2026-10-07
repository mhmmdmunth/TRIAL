import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Scale,
  DollarSign,
  Layers,
  CheckCircle2,
  AlertCircle,
  Activity,
  ChevronDown,
  ChevronRight,
  Filter,
  Search,
  Percent,
  Sliders,
  Sparkles,
  Calendar,
  RotateCcw,
  Check,
  Edit3
} from 'lucide-react';
import { WorkCategory, WorkItem, ProjectSchedule, VesselSpec } from '../types';
import { TonnageCalculator } from '../utils/tonnageCalculator';
import { ProgressInputModal } from './ProgressInputModal';
import { TabExportImportButton } from './TabExportImportButton';

interface ProgressMonitoringProps {
  categories: WorkCategory[];
  workItems: WorkItem[];
  schedule: ProjectSchedule;
  vessel: VesselSpec;
  onUpdateItem: (item: WorkItem) => void;
  onUpdateItemsBatch?: (items: WorkItem[]) => void;
  onNotify?: (msg: string) => void;
  onExportExcel?: () => void;
  onExportPdf?: () => void;
  onExportWord?: () => void;
  onOpenImportModal?: () => void;
  onDownloadTemplate?: () => void;
  onOpenFullModal?: (tab?: 'export' | 'import') => void;
}

export const ProgressMonitoring: React.FC<ProgressMonitoringProps> = ({
  categories,
  workItems,
  schedule,
  vessel,
  onUpdateItem,
  onUpdateItemsBatch,
  onNotify,
  onExportExcel,
  onExportPdf,
  onExportWord,
  onOpenImportModal,
  onDownloadTemplate,
  onOpenFullModal,
}) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [expandedAreas, setExpandedAreas] = useState<Record<string, boolean>>({});
  const [filterType, setFilterType] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal State for Progress Input
  const [activeModalItem, setActiveModalItem] = useState<WorkItem | null>(null);
  const [modalChildCount, setModalChildCount] = useState<number>(0);

  // Collapse/Expand state helper
  const toggleArea = (areaId: string) => {
    setExpandedAreas((prev) => ({ ...prev, [areaId]: !prev[areaId] }));
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    workItems.forEach((w) => {
      next[w.id] = true;
    });
    setExpandedAreas(next);
  };

  const collapseAll = () => {
    setExpandedAreas({});
  };

  // Helper: Determine item level types (Level 1 = Area, Level 2 = Sub-system, Level 3 = Component)
  const isAreaHeader = (item: WorkItem) => {
    return item.isAreaHeader || item.itemLevel === 1 || (!item.itemNo.includes('.') && item.parentId === undefined);
  };

  const isSubsystem = (item: WorkItem) => {
    if (item.itemLevel === 2) return true;
    const parts = item.itemNo.split('.');
    return parts.length === 2 && !isAreaHeader(item);
  };

  const isLeafItem = (item: WorkItem) => {
    if (item.itemLevel === 3) return true;
    const parts = item.itemNo.split('.');
    return parts.length > 2 && !isAreaHeader(item) && !isSubsystem(item);
  };

  // Get children helper
  const getSubsystemsForArea = (areaId: string) => {
    return workItems.filter((item) => item.parentId === areaId && isSubsystem(item));
  };

  const getLeafsForSubsystem = (subsystemId: string) => {
    return workItems.filter((item) => item.parentId === subsystemId && isLeafItem(item));
  };

  // Helper to get normalized progress percentage of any item
  const getItemProgressPercent = (item: WorkItem): number => {
    if (item.progressPercent !== undefined) {
      return Math.min(100, Math.max(0, item.progressPercent));
    }
    return item.isCompleted ? 100 : 0;
  };

  // Recursive or aggregate progress percentage for Area or Sub-system
  const calculateNodeProgress = (item: WorkItem): number => {
    if (isLeafItem(item)) {
      return getItemProgressPercent(item);
    }

    if (isSubsystem(item)) {
      const children = getLeafsForSubsystem(item.id);
      if (children.length === 0) {
        return getItemProgressPercent(item);
      }
      const totalWeight = children.reduce((sum, c) => sum + (c.totalPrice || 1), 0);
      const doneWeight = children.reduce((sum, c) => sum + (c.totalPrice || 1) * (getItemProgressPercent(c) / 100), 0);
      return totalWeight > 0 ? Math.round((doneWeight / totalWeight) * 100) : 0;
    }

    if (isAreaHeader(item)) {
      const subs = getSubsystemsForArea(item.id);
      if (subs.length === 0) {
        return getItemProgressPercent(item);
      }
      const totalWeight = subs.reduce((sum, s) => {
        const leaves = getLeafsForSubsystem(s.id);
        const subCost = leaves.length > 0 ? leaves.reduce((lsum, l) => lsum + (l.totalPrice || 0), 0) : (s.totalPrice || 1);
        return sum + (subCost || 1);
      }, 0);

      const doneWeight = subs.reduce((sum, s) => {
        const subProgress = calculateNodeProgress(s);
        const leaves = getLeafsForSubsystem(s.id);
        const subCost = leaves.length > 0 ? leaves.reduce((lsum, l) => lsum + (l.totalPrice || 0), 0) : (s.totalPrice || 1);
        return sum + (subCost || 1) * (subProgress / 100);
      }, 0);

      return totalWeight > 0 ? Math.round((doneWeight / totalWeight) * 100) : 0;
    }

    return getItemProgressPercent(item);
  };

  // --- CORE METRICS CALCULATIONS ---
  const metrics = useMemo(() => {
    // 1. Task Progress (Calculated using weighted percentage of actionable items)
    const leaves = workItems.filter((item) => isLeafItem(item) || (!isAreaHeader(item) && !isSubsystem(item)));
    const totalLeaves = leaves.length > 0 ? leaves.length : workItems.length;
    
    const sumPercent = (leaves.length > 0 ? leaves : workItems).reduce(
      (sum, item) => sum + getItemProgressPercent(item),
      0
    );
    const taskProgressPercent = totalLeaves > 0 ? Math.round(sumPercent / totalLeaves) : 0;
    const completedLeaves = (leaves.length > 0 ? leaves : workItems).filter(
      (item) => getItemProgressPercent(item) >= 100
    ).length;

    // 2. Physical Tonnage Progress (Tonnage baja kg realisasi)
    const totalTonnageKg = workItems.reduce((sum, item) => sum + (item.weightKg || 0), 0);
    const completedTonnageKg = workItems.reduce((sum, item) => {
      const pct = getItemProgressPercent(item);
      if (isLeafItem(item)) {
        return sum + ((item.weightKg || 0) * pct) / 100;
      } else if (isSubsystem(item)) {
        const subLeaves = getLeafsForSubsystem(item.id);
        if (subLeaves.length === 0) {
          return sum + ((item.weightKg || 0) * pct) / 100;
        }
      } else if (isAreaHeader(item)) {
        const subs = getSubsystemsForArea(item.id);
        if (subs.length === 0) {
          return sum + ((item.weightKg || 0) * pct) / 100;
        }
      }
      return sum;
    }, 0);

    const tonnageProgressPercent = totalTonnageKg > 0
      ? Math.round((completedTonnageKg / totalTonnageKg) * 100)
      : taskProgressPercent;

    // 3. Cost Weight Progress (Bobot RAB)
    const totalProjectCost = workItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    const completedProjectCost = workItems.reduce((sum, item) => {
      const pct = getItemProgressPercent(item);
      if (isLeafItem(item)) {
        return sum + ((item.totalPrice || 0) * pct) / 100;
      } else if (isSubsystem(item)) {
        const subLeaves = getLeafsForSubsystem(item.id);
        if (subLeaves.length === 0) {
          return sum + ((item.totalPrice || 0) * pct) / 100;
        }
      } else if (isAreaHeader(item)) {
        const subs = getSubsystemsForArea(item.id);
        if (subs.length === 0) {
          return sum + ((item.totalPrice || 0) * pct) / 100;
        }
      }
      return sum;
    }, 0);

    const costProgressPercent = totalProjectCost > 0
      ? Math.round((completedProjectCost / totalProjectCost) * 100)
      : taskProgressPercent;

    return {
      totalLeaves,
      completedLeaves,
      taskProgressPercent,
      totalTonnageKg,
      completedTonnageKg,
      tonnageProgressPercent,
      totalProjectCost,
      completedProjectCost,
      costProgressPercent,
    };
  }, [workItems]);

  // --- S-CURVE SIMULATION DATA GENERATOR ---
  const sCurveData = useMemo(() => {
    const duration = schedule.dockingDurationDays || 25;
    const items = [];

    const k = 0.23;
    const t0 = duration / 2;

    const getPlannedProgress = (day: number) => {
      if (day === 0) return 0;
      if (day === duration) return 100;
      const planned = 100 / (1 + Math.exp(-k * (day - t0)));
      const pMin = 100 / (1 + Math.exp(k * t0));
      const pMax = 100 / (1 + Math.exp(-k * (duration - t0)));
      const normPlanned = ((planned - pMin) / (pMax - pMin)) * 100;
      return Math.min(100, Math.max(0, Math.round(normPlanned)));
    };

    const actualCurrentProgress = metrics.costProgressPercent;
    let elapsedDays = Math.round((actualCurrentProgress / 100) * duration);
    if (elapsedDays === 0 && actualCurrentProgress > 0) elapsedDays = 1;
    elapsedDays = Math.min(duration, Math.max(0, elapsedDays));

    for (let day = 0; day <= duration; day += Math.max(1, Math.round(duration / 10))) {
      const plannedVal = getPlannedProgress(day);
      let actualVal: number | null = null;

      if (day <= elapsedDays) {
        if (day === 0) {
          actualVal = 0;
        } else if (day === elapsedDays) {
          actualVal = actualCurrentProgress;
        } else {
          const pct = day / elapsedDays;
          const noise = Math.sin(pct * Math.PI) * 4;
          actualVal = Math.min(actualCurrentProgress, Math.max(0, Math.round(pct * actualCurrentProgress + noise)));
        }
      }

      items.push({
        day: `Hari ${day}`,
        planned: plannedVal,
        actual: actualVal,
      });
    }

    if (items[items.length - 1].day !== `Hari ${duration}`) {
      const plannedVal = getPlannedProgress(duration);
      items.push({
        day: `Hari ${duration}`,
        planned: plannedVal,
        actual: elapsedDays >= duration ? actualCurrentProgress : null,
      });
    }

    return {
      points: items,
      elapsedDays,
      duration,
    };
  }, [schedule, metrics]);

  // Open Progress Input Modal
  const handleOpenProgressModal = (item: WorkItem) => {
    let childCount = 0;
    if (isAreaHeader(item)) {
      const subs = getSubsystemsForArea(item.id);
      childCount = subs.reduce((count, s) => count + 1 + getLeafsForSubsystem(s.id).length, 0);
    } else if (isSubsystem(item)) {
      childCount = getLeafsForSubsystem(item.id).length;
    }

    setActiveModalItem(item);
    setModalChildCount(childCount);
  };

  // Save Progress from Modal
  const handleSaveProgressModal = (updatedItem: WorkItem, cascadeToChildren?: boolean) => {
    const pct = updatedItem.progressPercent || 0;
    const isComp = pct >= 100;

    if (cascadeToChildren) {
      const itemsToUpdate: WorkItem[] = [updatedItem];

      if (isAreaHeader(updatedItem)) {
        const subs = getSubsystemsForArea(updatedItem.id);
        subs.forEach((sub) => {
          const subQty = ((pct / 100) * (sub.qty || 1));
          itemsToUpdate.push({
            ...sub,
            progressPercent: pct,
            progressQty: Number(subQty.toFixed(2)),
            progressDate: updatedItem.progressDate,
            isCompleted: isComp,
          });

          const leaves = getLeafsForSubsystem(sub.id);
          leaves.forEach((leaf) => {
            const leafQty = ((pct / 100) * (leaf.qty || 1));
            itemsToUpdate.push({
              ...leaf,
              progressPercent: pct,
              progressQty: Number(leafQty.toFixed(2)),
              progressDate: updatedItem.progressDate,
              isCompleted: isComp,
            });
          });
        });
      } else if (isSubsystem(updatedItem)) {
        const leaves = getLeafsForSubsystem(updatedItem.id);
        leaves.forEach((leaf) => {
          const leafQty = ((pct / 100) * (leaf.qty || 1));
          itemsToUpdate.push({
            ...leaf,
            progressPercent: pct,
            progressQty: Number(leafQty.toFixed(2)),
            progressDate: updatedItem.progressDate,
            isCompleted: isComp,
          });
        });
      }

      if (onUpdateItemsBatch) {
        onUpdateItemsBatch(itemsToUpdate);
      } else {
        itemsToUpdate.forEach((it) => onUpdateItem(it));
      }
    } else {
      onUpdateItem(updatedItem);
    }

    if (onNotify) {
      onNotify(`Progres pekerjaan "${updatedItem.itemNo}" diperbarui menjadi ${pct}%.`);
    }
  };

  // Inline Quick Progress Update (Presets or Slider)
  const handleInlineQuickProgress = (item: WorkItem, newPct: number) => {
    const clampedPct = Math.min(100, Math.max(0, newPct));
    const calculatedQty = Number(((clampedPct / 100) * (item.qty || 1)).toFixed(2));
    const isCompleted = clampedPct >= 100;

    const updatedItem: WorkItem = {
      ...item,
      progressPercent: clampedPct,
      progressQty: calculatedQty,
      isCompleted: isCompleted,
    };

    if (isSubsystem(item)) {
      const leaves = getLeafsForSubsystem(item.id);
      if (leaves.length > 0) {
        const batch: WorkItem[] = [updatedItem];
        leaves.forEach((l) => {
          const lQty = Number(((clampedPct / 100) * (l.qty || 1)).toFixed(2));
          batch.push({
            ...l,
            progressPercent: clampedPct,
            progressQty: lQty,
            isCompleted: isCompleted,
          });
        });
        if (onUpdateItemsBatch) {
          onUpdateItemsBatch(batch);
        } else {
          batch.forEach((it) => onUpdateItem(it));
        }
      } else {
        onUpdateItem(updatedItem);
      }
    } else if (isAreaHeader(item)) {
      const subs = getSubsystemsForArea(item.id);
      const batch: WorkItem[] = [updatedItem];
      subs.forEach((s) => {
        const sQty = Number(((clampedPct / 100) * (s.qty || 1)).toFixed(2));
        batch.push({
          ...s,
          progressPercent: clampedPct,
          progressQty: sQty,
          isCompleted: isCompleted,
        });
        const leaves = getLeafsForSubsystem(s.id);
        leaves.forEach((l) => {
          const lQty = Number(((clampedPct / 100) * (l.qty || 1)).toFixed(2));
          batch.push({
            ...l,
            progressPercent: clampedPct,
            progressQty: lQty,
            isCompleted: isCompleted,
          });
        });
      });
      if (onUpdateItemsBatch) {
        onUpdateItemsBatch(batch);
      } else {
        batch.forEach((it) => onUpdateItem(it));
      }
    } else {
      onUpdateItem(updatedItem);
    }

    if (onNotify) {
      onNotify(`Progres "${item.itemNo}" diset ke ${clampedPct}%.`);
    }
  };

  // Toggle complete / incomplete (0% vs 100%)
  const handleToggleItemStatus = (item: WorkItem) => {
    const currentPct = getItemProgressPercent(item);
    const newPct = currentPct >= 100 ? 0 : 100;
    handleInlineQuickProgress(item, newPct);
  };

  // --- FILTERS & HIERARCHY TREE COMPOSER ---
  const filteredTree = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    const targetCats = selectedCategoryId === 'all'
      ? categories
      : categories.filter((c) => c.id === selectedCategoryId);

    return targetCats.map((cat) => {
      const areasInCat = workItems.filter(
        (item) => item.categoryId === cat.id && isAreaHeader(item)
      );

      const areaNodes = areasInCat.map((area) => {
        const subsystems = getSubsystemsForArea(area.id);

        const subsystemNodes = subsystems.map((sub) => {
          const leaves = getLeafsForSubsystem(sub.id);

          const subProgress = calculateNodeProgress(sub);
          const subTonnageTotal = leaves.reduce((sum, leaf) => sum + (leaf.weightKg || 0), 0) + (sub.weightKg || 0);
          const subTonnageDone = (subTonnageTotal * subProgress) / 100;

          const subCostTotal = leaves.reduce((sum, leaf) => sum + (leaf.totalPrice || 0), 0) + (sub.totalPrice || 0);
          const subCostDone = (subCostTotal * subProgress) / 100;

          const subLeavesTotal = leaves.length;
          const subLeavesDone = leaves.filter((leaf) => getItemProgressPercent(leaf) >= 100).length;

          const totalProjectCostVal = metrics.totalProjectCost || 1;
          const totalProjectTonnageVal = metrics.totalTonnageKg || 1;

          const costWeightInProject = (subCostTotal / totalProjectCostVal) * 100;
          const tonnageWeightInProject = (subTonnageTotal / totalProjectTonnageVal) * 100;

          return {
            sub,
            leaves,
            subProgress,
            subTonnageTotal,
            subTonnageDone,
            subCostTotal,
            subCostDone,
            subLeavesTotal,
            subLeavesDone,
            costWeightInProject,
            tonnageWeightInProject,
            isCompleted: subProgress >= 100,
          };
        });

        // Filter subsystems based on query & status filter
        const filteredSubs = subsystemNodes.filter((node) => {
          const matchesQuery = !query ||
            node.sub.itemNo.toLowerCase().includes(query) ||
            node.sub.description.toLowerCase().includes(query) ||
            node.leaves.some((l) => l.itemNo.toLowerCase().includes(query) || l.description.toLowerCase().includes(query));

          if (!matchesQuery) return false;

          if (filterType === 'completed') return node.subProgress >= 100;
          if (filterType === 'pending') return node.subProgress === 0;
          if (filterType === 'in_progress') return node.subProgress > 0 && node.subProgress < 100;
          return true;
        });

        const areaProgress = calculateNodeProgress(area);
        const areaTonnageTotal = filteredSubs.reduce((sum, node) => sum + node.subTonnageTotal, 0);
        const areaTonnageDone = (areaTonnageTotal * areaProgress) / 100;
        const areaCostTotal = filteredSubs.reduce((sum, node) => sum + node.subCostTotal, 0);
        const areaCostDone = (areaCostTotal * areaProgress) / 100;
        const areaLeavesTotal = filteredSubs.reduce((sum, node) => sum + node.subLeavesTotal, 0);
        const areaLeavesDone = filteredSubs.reduce((sum, node) => sum + node.subLeavesDone, 0);

        const areaMatchesQuery = !query ||
          area.itemNo.toLowerCase().includes(query) ||
          area.description.toLowerCase().includes(query) ||
          filteredSubs.length > 0;

        return {
          area,
          subsystems: filteredSubs,
          areaProgress,
          areaTonnageTotal,
          areaTonnageDone,
          areaCostTotal,
          areaCostDone,
          areaLeavesTotal,
          areaLeavesDone,
          isCompleted: areaProgress >= 100,
          matchesQuery: areaMatchesQuery,
        };
      }).filter((areaNode) => areaNode.matchesQuery && (areaNode.subsystems.length > 0 || filterType === 'all'));

      return {
        category: cat,
        areas: areaNodes,
      };
    }).filter((catNode) => catNode.areas.length > 0);
  }, [categories, workItems, selectedCategoryId, filterType, searchQuery, metrics]);

  // Color helper for progress badges
  const getProgressColorClass = (pct: number) => {
    if (pct >= 100) return 'bg-emerald-600 text-white';
    if (pct >= 70) return 'bg-blue-600 text-white';
    if (pct >= 30) return 'bg-amber-500 text-white';
    if (pct > 0) return 'bg-orange-500 text-white';
    return 'bg-slate-200 text-slate-700';
  };

  const getProgressBarColor = (pct: number) => {
    if (pct >= 100) return 'bg-emerald-500';
    if (pct >= 70) return 'bg-blue-500';
    if (pct >= 30) return 'bg-amber-500';
    if (pct > 0) return 'bg-orange-500';
    return 'bg-slate-300';
  };

  return (
    <div className="space-y-5">
      {/* 1. TOP METRICS DASHBOARD CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Card 1: Task Progress */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex items-center gap-2 text-slate-500 font-medium">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span className="text-xs uppercase tracking-wider">Progress Pekerjaan (Task)</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {metrics.taskProgressPercent}%
            </div>
            <p className="text-xs text-slate-500">
              Selesai Penuh: <strong>{metrics.completedLeaves}</strong> dari <strong>{metrics.totalLeaves}</strong> item
            </p>
          </div>
          {/* Circular Progress Ring */}
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-100"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-emerald-600"
                strokeWidth="3.5"
                strokeDasharray={`${metrics.taskProgressPercent}, 100`}
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-800">
              {metrics.taskProgressPercent}%
            </div>
          </div>
        </div>

        {/* Card 2: Physical Tonnage Progress */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex items-center gap-2 text-slate-500 font-medium">
              <Scale className="w-4 h-4 text-amber-600" />
              <span className="text-xs uppercase tracking-wider">Progress Fisik (Tonase Baja)</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {metrics.tonnageProgressPercent}%
            </div>
            <p className="text-xs text-slate-500">
              Realisasi: <strong>{TonnageCalculator.formatWeight(metrics.completedTonnageKg)}</strong> / <strong>{TonnageCalculator.formatWeight(metrics.totalTonnageKg)}</strong>
            </p>
          </div>
          {/* Circular Progress Ring */}
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-100"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-amber-500"
                strokeWidth="3.5"
                strokeDasharray={`${metrics.tonnageProgressPercent}, 100`}
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-800">
              {metrics.tonnageProgressPercent}%
            </div>
          </div>
        </div>

        {/* Card 3: RAB / Bobot Biaya Progress */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between sm:col-span-2 lg:col-span-1">
          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex items-center gap-2 text-slate-500 font-medium">
              <DollarSign className="w-4 h-4 text-blue-600" />
              <span className="text-xs uppercase tracking-wider">Progress Finansial &amp; Bobot RAB</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {metrics.costProgressPercent}%
            </div>
            <p className="text-xs text-slate-500">
              Realisasi: <strong>{TonnageCalculator.formatRupiah(metrics.completedProjectCost)}</strong> / <strong>{TonnageCalculator.formatRupiah(metrics.totalProjectCost)}</strong>
            </p>
          </div>
          {/* Circular Progress Ring */}
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-100"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-blue-600"
                strokeWidth="3.5"
                strokeDasharray={`${metrics.costProgressPercent}, 100`}
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-800">
              {metrics.costProgressPercent}%
            </div>
          </div>
        </div>
      </div>

      {/* 2. S-CURVE PROJECT TIMELINE GRAPH */}
      <div className="bg-slate-900 text-slate-100 p-4 sm:p-5 md:p-6 rounded-xl border border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-bold tracking-tight">Kurva-S Progres Proyek Docking ({vessel.name})</h2>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Visualisasi perbandingan antara rencana kumulatif bobot biaya (Planned) dengan capaian riil di lapangan (Actual) sepanjang <strong>{sCurveData.duration} hari</strong> masa kontrak docking.
            </p>
          </div>
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 border-t-2 border-dashed border-emerald-400 inline-block"></span>
              <span className="text-slate-300 font-medium">Rencana (Planned S-Curve)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-blue-500 border-t-2 border-blue-500 inline-block"></span>
              <span className="text-slate-300 font-medium">Riil (Actual Progress)</span>
            </div>
          </div>
        </div>

        {/* The SVG S-Curve Chart */}
        <div className="relative w-full h-56 sm:h-64 md:h-72 bg-slate-950/40 rounded-lg p-2 border border-slate-800/60 overflow-hidden">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 1000 240">
            {/* Gridlines */}
            {[0, 25, 50, 75, 100].map((val, idx) => {
              const y = 210 - (val / 100) * 180;
              return (
                <g key={`grid-${idx}`}>
                  <line x1="60" y1={y} x2="960" y2={y} stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
                  <text x="35" y={y + 4} fill="#64748b" className="text-[10px] font-mono text-right" textAnchor="end">
                    {val}%
                  </text>
                </g>
              );
            })}

            {/* Timelines (X-Axis labels) */}
            {sCurveData.points.map((p, idx) => {
              const x = 60 + (idx / (sCurveData.points.length - 1)) * 900;
              return (
                <g key={`x-lbl-${idx}`}>
                  <line x1={x} y1="30" x2={x} y2="210" stroke="#1e293b" strokeWidth="1" strokeDasharray="2 2" />
                  <text x={x} y="226" fill="#64748b" className="text-[10px] font-medium" textAnchor="middle">
                    {p.day}
                  </text>
                </g>
              );
            })}

            {/* Planned S-Curve Path (Green dashes) */}
            <path
              d={sCurveData.points.reduce((path, p, idx) => {
                const x = 60 + (idx / (sCurveData.points.length - 1)) * 900;
                const y = 210 - (p.planned / 100) * 180;
                return `${path} ${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
              }, '')}
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeDasharray="4 4"
            />

            {/* Actual S-Curve Path (Blue solid line) */}
            <path
              d={sCurveData.points.reduce((path, p, idx) => {
                if (p.actual === null) return path;
                const x = 60 + (idx / (sCurveData.points.length - 1)) * 900;
                const y = 210 - (p.actual / 100) * 180;
                return `${path} ${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
              }, '')}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="3.5"
            />

            {/* Actual Path Points / Nodes */}
            {sCurveData.points.map((p, idx) => {
              if (p.actual === null) return null;
              const x = 60 + (idx / (sCurveData.points.length - 1)) * 900;
              const y = 210 - (p.actual / 100) * 180;
              return (
                <g key={`act-pt-${idx}`}>
                  <circle cx={x} cy={y} r="5" fill="#3b82f6" stroke="#ffffff" strokeWidth="1.5" />
                  {idx === sCurveData.points.length - 1 || idx === Math.round(sCurveData.points.length / 2) ? (
                    <text x={x} y={y - 10} fill="#ffffff" className="text-[10px] font-bold font-mono" textAnchor="middle">
                      {p.actual}% Riil
                    </text>
                  ) : null}
                </g>
              );
            })}

            {/* Planned Node Markers */}
            {sCurveData.points.map((p, idx) => {
              if (idx === sCurveData.points.length - 1) {
                const x = 60 + (idx / (sCurveData.points.length - 1)) * 900;
                const y = 210 - (p.planned / 100) * 180;
                return (
                  <g key={`plan-pt-${idx}`}>
                    <circle cx={x} cy={y} r="4" fill="#10b981" />
                    <text x={x} y={y - 10} fill="#10b981" className="text-[10px] font-bold font-mono" textAnchor="middle">
                      100% Target
                    </text>
                  </g>
                );
              }
              return null;
            })}
          </svg>
        </div>

        {/* Progress Alert Indicator */}
        <div className="flex items-center gap-2.5 p-3.5 bg-slate-800/40 rounded-lg border border-slate-800 text-xs">
          <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="flex-1">
            {metrics.costProgressPercent >= (sCurveData.points[Math.min(sCurveData.elapsedDays, sCurveData.points.length - 1)]?.planned || 0) ? (
              <span className="text-emerald-400 font-semibold">
                Proyek Berjalan Sesuai / Lebih Cepat dari Rencana (On Track / Ahead).
              </span>
            ) : (
              <span className="text-amber-400 font-semibold">
                Proyek Berjalan Lebih Lambat dari Target (Behind Schedule).
              </span>
            )}
            <span className="text-slate-400"> Realisasi kumulatif saat ini: <strong>{metrics.costProgressPercent}%</strong> (Target kumulatif hari ini: {sCurveData.points[Math.min(sCurveData.elapsedDays, sCurveData.points.length - 1)]?.planned || 0}%).</span>
          </div>
        </div>
      </div>

      {/* 3. TOOLBAR & PROGRESS MANAGEMENT CONTROLS */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Filter Headers */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          {/* Search bar */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nomor item, deskripsi, atau area..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                &times;
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Category Filter dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 text-[11px] font-semibold">Kategori:</span>
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-hidden font-bold"
              >
                <option value="all">Semua Kategori (I - XI)</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    Kategori {cat.code} - {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status filter tabs */}
            <div className="bg-slate-200 p-0.5 rounded-lg flex items-center gap-0.5 text-[11px]">
              <button
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  filterType === 'all'
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setFilterType('pending')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  filterType === 'pending'
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                0%
              </button>
              <button
                onClick={() => setFilterType('in_progress')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  filterType === 'in_progress'
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                1 - 99%
              </button>
              <button
                onClick={() => setFilterType('completed')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  filterType === 'completed'
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                100% Selesai
              </button>
            </div>

            {/* Export & Import Tools for Progress & Kurva S */}
            <TabExportImportButton
              tabName="progress-tracking"
              onExportExcel={onExportExcel}
              onExportPdf={onExportPdf}
              onExportWord={onExportWord}
              onOpenImportModal={onOpenImportModal}
              onDownloadTemplate={onDownloadTemplate}
              onOpenFullModal={onOpenFullModal}
            />

            {/* Expand / Collapse All */}
            <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
              <button
                onClick={expandAll}
                className="px-2 py-1 bg-white border border-slate-200 rounded text-[11px] font-medium text-slate-600 hover:bg-slate-50"
              >
                Buka Semua
              </button>
              <button
                onClick={collapseAll}
                className="px-2 py-1 bg-white border border-slate-200 rounded text-[11px] font-medium text-slate-600 hover:bg-slate-50"
              >
                Tutup Semua
              </button>
            </div>
          </div>
        </div>

        {/* Tree Checklist Content */}
        <div className="p-4 space-y-6">
          {filteredTree.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <AlertCircle className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-medium text-slate-500">
                Tidak ada item progress ditemukan pada filter atau pencarian ini.
              </p>
            </div>
          ) : (
            filteredTree.map((catNode) => (
              <div key={catNode.category.id} className="space-y-4">
                {/* Category Heading Banner */}
                <div className="bg-emerald-50 border-l-4 border-emerald-600 px-3 py-2 rounded-r flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                    Kategori {catNode.category.code}: {catNode.category.name}
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                    {catNode.areas.length} Kelompok Pekerjaan
                  </span>
                </div>

                {/* Areas List */}
                <div className="space-y-3.5 pl-1 sm:pl-2">
                  {catNode.areas.map((areaNode) => {
                    const areaId = areaNode.area.id;
                    const isExpanded = expandedAreas[areaId] !== false;
                    const area = areaNode.area;
                    const areaPct = areaNode.areaProgress;

                    return (
                      <div
                        key={area.id}
                        className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs"
                      >
                        {/* Area Node Header */}
                        <div
                          className={`p-3 sm:p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
                            areaNode.isCompleted
                              ? 'bg-slate-50/80 border-b border-slate-200'
                              : 'bg-white hover:bg-slate-50/50 border-b border-slate-200'
                          }`}
                          onClick={() => toggleArea(areaId)}
                        >
                          {/* Title & Info */}
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            <span className="text-slate-400 shrink-0">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </span>
                            <span className="font-mono text-xs font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded shrink-0">
                              {area.itemNo}
                            </span>
                            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 leading-tight truncate">
                              {area.description}
                            </h3>
                          </div>

                          {/* Quick Metrics & Actions */}
                          <div
                            className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* Visual Progress Bar */}
                            <div className="flex items-center gap-2">
                              <div className="w-20 sm:w-24 bg-slate-200 h-2 rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-300 ${getProgressBarColor(areaPct)}`}
                                  style={{ width: `${areaPct}%` }}
                                ></div>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${getProgressColorClass(
                                  areaPct
                                )}`}
                              >
                                {areaPct}%
                              </span>
                            </div>

                            {/* Button: Input Progres Area Modal */}
                            <button
                              onClick={() => handleOpenProgressModal(area)}
                              className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-md text-[11px] font-bold text-slate-700 transition-colors shadow-2xs"
                              title="Buka dialog input detail progres untuk Area ini"
                            >
                              <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Input Progres</span>
                            </button>

                            {/* Toggle Selesai Button */}
                            <button
                              onClick={() => handleToggleItemStatus(area)}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-bold text-[10px] uppercase tracking-wider transition-all border ${
                                areaNode.isCompleted
                                  ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700'
                                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{areaNode.isCompleted ? '100% Selesai' : 'Tandai Selesai'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Subsystems List under Area (Child nodes) */}
                        {isExpanded && (
                          <div className="p-3 divide-y divide-slate-100 bg-slate-50/30">
                            {areaNode.subsystems.map((subNode) => {
                              const sub = subNode.sub;
                              const hasLeaves = subNode.subLeavesTotal > 0;
                              const subPct = subNode.subProgress;

                              return (
                                <div key={sub.id} className="py-3 first:pt-1 last:pb-1">
                                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pl-2 sm:pl-4">
                                    {/* Left: Item information */}
                                    <div className="space-y-1 flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-slate-400 font-mono text-[10px]">├──</span>
                                        <span className="font-mono text-[11px] font-bold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                          {sub.itemNo}
                                        </span>
                                        <span className="text-xs font-bold text-slate-800">
                                          {sub.description}
                                        </span>
                                        {sub.type && (
                                          <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 text-[9px] font-mono font-bold uppercase">
                                            {sub.type}
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500 pl-4">
                                        <span>
                                          Target: <strong>{sub.qty} {sub.unit}</strong>
                                          {sub.weightKg && sub.weightKg > 0 ? ` (${TonnageCalculator.formatWeight(sub.weightKg)})` : ''}
                                        </span>
                                        <span>&bull;</span>
                                        <span>
                                          Bobot Biaya: <strong>{subNode.costWeightInProject.toFixed(2)}%</strong> ({TonnageCalculator.formatRupiah(subNode.subCostTotal)})
                                        </span>
                                        {sub.progressNotes && (
                                          <>
                                            <span>&bull;</span>
                                            <span className="text-emerald-700 font-medium italic">
                                              Catatan: {sub.progressNotes}
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </div>

                                    {/* Right: Interactive Dual-Input Controls */}
                                    <div className="flex flex-wrap items-center gap-2.5 justify-end shrink-0 pl-4 lg:pl-0">
                                      {/* Quick Percentage Chips */}
                                      <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200">
                                        {[0, 25, 50, 75, 100].map((p) => (
                                          <button
                                            key={p}
                                            type="button"
                                            onClick={() => handleInlineQuickProgress(sub, p)}
                                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${
                                              subPct === p
                                                ? 'bg-emerald-600 text-white'
                                                : 'text-slate-600 hover:bg-slate-100'
                                            }`}
                                            title={`Set langsung ke ${p}%`}
                                          >
                                            {p}%
                                          </button>
                                        ))}
                                      </div>

                                      {/* Inline Percentage Badge / Progress bar */}
                                      <div className="flex items-center gap-1.5">
                                        <div className="w-16 bg-slate-200 h-2 rounded-full overflow-hidden">
                                          <div
                                            className={`h-full transition-all duration-300 ${getProgressBarColor(
                                              subPct
                                            )}`}
                                            style={{ width: `${subPct}%` }}
                                          ></div>
                                        </div>
                                        <span
                                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-black ${getProgressColorClass(
                                            subPct
                                          )}`}
                                        >
                                          {subPct}%
                                        </span>
                                      </div>

                                      {/* Button: Input Progres Modal */}
                                      <button
                                        onClick={() => handleOpenProgressModal(sub)}
                                        className="p-1 px-2 bg-white hover:bg-slate-100 border border-slate-300 rounded flex items-center gap-1 text-[10px] font-bold text-slate-700 transition-colors shadow-2xs"
                                        title="Buka dialog input angka volume atau persentase lengkap"
                                      >
                                        <Edit3 className="w-3 h-3 text-blue-600" />
                                        <span>Input Progres</span>
                                      </button>
                                    </div>
                                  </div>

                                  {/* Component detail items list (Level 3) */}
                                  {hasLeaves && (
                                    <div className="mt-2.5 pl-6 sm:pl-10 space-y-1 divide-y divide-slate-100 bg-white/70 p-2.5 rounded-lg border border-slate-100">
                                      {subNode.leaves.map((leaf) => {
                                        const leafPct = getItemProgressPercent(leaf);
                                        return (
                                          <div
                                            key={leaf.id}
                                            className="py-1.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-700"
                                          >
                                            <div className="flex items-center gap-2">
                                              <span className="text-slate-300 font-mono text-[9px]">└──</span>
                                              <span className="font-mono text-[10px] font-bold text-slate-500">
                                                {leaf.itemNo}
                                              </span>
                                              <span className="font-medium text-[11px]">
                                                {leaf.description}
                                              </span>
                                              {leaf.weightKg && leaf.weightKg > 0 ? (
                                                <span className="text-[9px] font-mono text-amber-800 bg-amber-50 px-1 py-0.2 rounded">
                                                  {TonnageCalculator.formatWeight(leaf.weightKg)}
                                                </span>
                                              ) : null}
                                            </div>

                                            {/* Leaf Quick Controls */}
                                            <div className="flex items-center gap-2 justify-end pl-4 sm:pl-0">
                                              <div className="flex items-center gap-1 text-[10px] font-mono">
                                                <button
                                                  type="button"
                                                  onClick={() => handleInlineQuickProgress(leaf, 0)}
                                                  className={`px-1 rounded ${leafPct === 0 ? 'bg-slate-700 text-white font-bold' : 'text-slate-500 hover:bg-slate-100'}`}
                                                >
                                                  0%
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => handleInlineQuickProgress(leaf, 50)}
                                                  className={`px-1 rounded ${leafPct === 50 ? 'bg-amber-600 text-white font-bold' : 'text-slate-500 hover:bg-slate-100'}`}
                                                >
                                                  50%
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => handleInlineQuickProgress(leaf, 100)}
                                                  className={`px-1 rounded ${leafPct === 100 ? 'bg-emerald-600 text-white font-bold' : 'text-slate-500 hover:bg-slate-100'}`}
                                                >
                                                  100%
                                                </button>
                                              </div>

                                              <button
                                                onClick={() => handleOpenProgressModal(leaf)}
                                                className="p-0.5 px-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[9px] font-bold text-slate-600"
                                              >
                                                {leafPct}%
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Dedicated Modal for Progress Input (Percentage or Volume / Number) */}
      <ProgressInputModal
        isOpen={activeModalItem !== null}
        onClose={() => setActiveModalItem(null)}
        item={activeModalItem}
        childItemsCount={modalChildCount}
        onSaveProgress={handleSaveProgressModal}
      />
    </div>
  );
};
