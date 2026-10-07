import { useVirtualizer } from "@tanstack/react-virtual";
import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Calendar,
  Users,
  CloudSun,
  TrendingUp,
  CheckCircle2,
  Activity,
  FileSpreadsheet,
  Info,
  RefreshCw,
  Search,
  Filter,
  Sparkles,
  Sliders,
  DollarSign,
  Clock,
  Zap,
  Layers,
  ChevronRight,
  ChevronDown,
  Edit3,
  Check,
  FolderTree,
  Box,
  Maximize2,
  Minimize2,
  Ship,
  Anchor,
  PieChart as PieChartIcon,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  Target,
  BarChart3,
  CheckSquare,
  ChevronsDownUp,
  ChevronsUpDown,
  Compass,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { WorkItem, WorkCategory, ProjectSchedule, VesselSpec } from '../types';
import { sqliteService } from '../services/sqliteService';
import { parseDateFlexible, formatDateToIso, formatDateToDisplay, formatDayName } from '../utils/dateUtils';
import { recalculateProjectHierarchyProgress } from '../utils/hierarchyProgressUtils';

interface PlanProgressModuleProps {
  vessel: VesselSpec;
  schedule: ProjectSchedule;
  categories: WorkCategory[];
  workItems: WorkItem[];
  onUpdateItems: (items: WorkItem[]) => void;
  onSaveToast?: (message: string) => void;
}

export const PlanProgressModule: React.FC<PlanProgressModuleProps> = ({
  vessel,
  schedule,
  categories,
  workItems,
  onUpdateItems,
  onSaveToast,
}) => {
  const [viewMode, setViewTab] = useState<'gantt' | 'chart' | 'summary'>('gantt');
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'uncompleted' | 'in_progress' | 'completed' | 'weighted_only'>('all');
  const [isTableFullscreen, setIsTableFullscreen] = useState<boolean>(false);
  const [showMilestonePipeline, setShowMilestonePipeline] = useState<boolean>(false);
  const [ganttStyle, setGanttStyle] = useState<'matrix' | 'visual'>('matrix');
  const [timelineWindowMode, setTimelineWindowMode] = useState<'15' | '30' | '45' | 'all'>('30');
  const [isConfiguratorExpanded, setIsConfiguratorExpanded] = useState<boolean>(false);
  const [timelineStartIndex, setTimelineStartIndex] = useState<number>(0);

  // Helper to extract ISO date from schedule fields (Indonesian text or ISO string)
  const getScheduleIso = (dateStr?: string | null, fallbackIso: string = '2026-09-03'): string => {
    if (!dateStr || dateStr === '-') return fallbackIso;
    const d = parseDateFlexible(dateStr);
    return d ? formatDateToIso(d) : fallbackIso;
  };

  // Calendar Scope: 'project' (Arrival -> Sail Out) or 'docking' (Docking -> Undocking)
  const [calendarScope, setCalendarScope] = useState<'project' | 'docking'>('project');

  // Key Project Lifecycle Dates (Date of Project)
  const [arrivalDate, setArrivalDate] = useState<string>(() => {
    return getScheduleIso(schedule.arriveBgn, getScheduleIso(schedule.dockingDate, '2026-09-03'));
  });
  const [startContractDate, setStartContractDate] = useState<string>(() => {
    return getScheduleIso(schedule.startContract, getScheduleIso(schedule.arriveBgn, '2026-09-04'));
  });
  const [dockingDate, setDockingDate] = useState<string>(() => {
    return getScheduleIso(schedule.dockingDate, '2026-09-07');
  });
  const [undockingDate, setUndockingDate] = useState<string>(() => {
    return getScheduleIso(schedule.undockingDate, '2026-10-01');
  });
  const [finishWorkDate, setFinishWorkDate] = useState<string>(() => {
    return getScheduleIso(schedule.finishWork, '2026-10-02');
  });
  const [sailOutDate, setSailOutDate] = useState<string>(() => {
    return getScheduleIso(schedule.sailOut, getScheduleIso(schedule.finishWork, '2026-10-05'));
  });

  // Effective project start date & end date based on active calendar scope
  const projectStartDate = useMemo(() => {
    if (calendarScope === 'docking') {
      return dockingDate || '2026-09-07';
    }
    return arrivalDate || startContractDate || dockingDate || '2026-09-03';
  }, [calendarScope, arrivalDate, startContractDate, dockingDate]);

  const projectEndDate = useMemo(() => {
    if (calendarScope === 'docking') {
      return undockingDate || '2026-10-01';
    }
    return sailOutDate || finishWorkDate || undockingDate || '2026-10-05';
  }, [calendarScope, sailOutDate, finishWorkDate, undockingDate]);

  // Compute duration in days between start and end
  const computedDurationDays = useMemo(() => {
    const start = parseDateFlexible(projectStartDate);
    const end = parseDateFlexible(projectEndDate);
    if (start && end && end >= start) {
      const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return Math.max(1, diff);
    }
    return schedule.dockingDurationDays || 33;
  }, [projectStartDate, projectEndDate, schedule.dockingDurationDays]);

  const [totalDurationDays, setTotalDurationDays] = useState<number>(computedDurationDays);
  const [durationInput, setDurationInput] = useState<string>(String(computedDurationDays));

  // Sync duration whenever start/end changes
  useEffect(() => {
    setTotalDurationDays(computedDurationDays);
    setDurationInput(String(computedDurationDays));
  }, [computedDurationDays]);

  // Sync state if schedule prop changes
  useEffect(() => {
    if (schedule) {
      if (schedule.arriveBgn) setArrivalDate(getScheduleIso(schedule.arriveBgn, '2026-09-03'));
      if (schedule.startContract) setStartContractDate(getScheduleIso(schedule.startContract, '2026-09-04'));
      if (schedule.dockingDate) setDockingDate(getScheduleIso(schedule.dockingDate, '2026-09-07'));
      if (schedule.undockingDate) setUndockingDate(getScheduleIso(schedule.undockingDate, '2026-10-01'));
      if (schedule.finishWork) setFinishWorkDate(getScheduleIso(schedule.finishWork, '2026-10-02'));
      if (schedule.sailOut) setSailOutDate(getScheduleIso(schedule.sailOut, '2026-10-05'));
    }
  }, [schedule]);

  // Update Arrival Date (Date of Project Start)
  const handleUpdateArrivalDate = (newArrivalIso: string) => {
    setArrivalDate(newArrivalIso);
    const d = parseDateFlexible(newArrivalIso);
    const displayStr = d ? `${formatDayName(d)}, ${formatDateToDisplay(d)}` : newArrivalIso;
    try {
      sqliteService.updateProjectSchedule({
        ...schedule,
        arriveBgn: displayStr,
      });
      if (onSaveToast) onSaveToast('Tanggal Arrival berhasil diperbarui');
    } catch (e) {
      console.error(e);
    }
  };

  // Update Start Work / Start Contract Date
  const handleUpdateStartContractDate = (newStartIso: string) => {
    setStartContractDate(newStartIso);
    const d = parseDateFlexible(newStartIso);
    const displayStr = d ? `${formatDayName(d)}, ${formatDateToDisplay(d)}` : newStartIso;
    try {
      sqliteService.updateProjectSchedule({
        ...schedule,
        startContract: displayStr,
      });
      if (onSaveToast) onSaveToast('Tanggal Start Work / Kontrak berhasil diperbarui');
    } catch (e) {
      console.error(e);
    }
  };

  // Update Docking Date
  const handleUpdateDockingDate = (newDockingIso: string) => {
    setDockingDate(newDockingIso);
    const d = parseDateFlexible(newDockingIso);
    const displayStr = d ? `${formatDayName(d)}, ${formatDateToDisplay(d)}` : newDockingIso;
    try {
      sqliteService.updateProjectSchedule({
        ...schedule,
        dockingDate: displayStr,
      });
      if (onSaveToast) onSaveToast('Tanggal Docking berhasil diperbarui');
    } catch (e) {
      console.error(e);
    }
  };

  // Update Undocking Date
  const handleUpdateUndockingDate = (newUndockingIso: string) => {
    setUndockingDate(newUndockingIso);
    const d = parseDateFlexible(newUndockingIso);
    const displayStr = d ? `${formatDayName(d)}, ${formatDateToDisplay(d)}` : newUndockingIso;
    try {
      sqliteService.updateProjectSchedule({
        ...schedule,
        undockingDate: displayStr,
      });
      if (onSaveToast) onSaveToast('Tanggal Undocking berhasil diperbarui');
    } catch (e) {
      console.error(e);
    }
  };

  // Update Finish Work Date
  const handleUpdateFinishWorkDate = (newFinishIso: string) => {
    setFinishWorkDate(newFinishIso);
    const d = parseDateFlexible(newFinishIso);
    const displayStr = d ? `${formatDayName(d)}, ${formatDateToDisplay(d)}` : newFinishIso;
    try {
      sqliteService.updateProjectSchedule({
        ...schedule,
        finishWork: displayStr,
      });
      if (onSaveToast) onSaveToast('Tanggal Finish Work berhasil diperbarui');
    } catch (e) {
      console.error(e);
    }
  };

  // Update Sail Out Date (Date of Project Finish)
  const handleUpdateSailOutDate = (newSailOutIso: string) => {
    setSailOutDate(newSailOutIso);
    const d = parseDateFlexible(newSailOutIso);
    const displayStr = d ? `${formatDayName(d)}, ${formatDateToDisplay(d)}` : newSailOutIso;
    try {
      sqliteService.updateProjectSchedule({
        ...schedule,
        sailOut: displayStr,
      });
      if (onSaveToast) onSaveToast('Tanggal Sail Out berhasil diperbarui');
    } catch (e) {
      console.error(e);
    }
  };

  // Update Duration in days freely
  const handleUpdateDurationDays = (newDays: number) => {
    const validDays = Math.max(1, newDays || 1);
    setTotalDurationDays(validDays);
    setDurationInput(String(validDays));

    const start = parseDateFlexible(projectStartDate) || new Date('2026-09-03');
    const newEnd = new Date(start);
    newEnd.setDate(start.getDate() + validDays - 1);
    const newEndIso = formatDateToIso(newEnd);
    const newEndDisplay = `${formatDayName(newEnd)}, ${formatDateToDisplay(newEnd)}`;

    if (calendarScope === 'docking') {
      setUndockingDate(newEndIso);
      try {
        sqliteService.updateProjectSchedule({
          ...schedule,
          dockingDurationDays: validDays,
          undockingDate: newEndDisplay,
        });
      } catch (e) {
        console.error(e);
      }
    } else {
      setSailOutDate(newEndIso);
      try {
        sqliteService.updateProjectSchedule({
          ...schedule,
          sailOut: newEndDisplay,
        });
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Cell editing state for Plan and Actual
  const [editingCell, setEditingCell] = useState<{
    itemId: string;
    dateStr: string;
    rowType: 'plan' | 'actual';
  } | null>(null);
  const [cellInputValue, setCellInputValue] = useState<string>('');

  // Custom overridden Plan values (itemId -> dateStr -> planPercent)
  const [overriddenPlans, setOverriddenPlans] = useState<Record<string, Record<string, number>>>(() => {
    const initial: Record<string, Record<string, number>> = {};
    workItems.forEach(item => {
      if (item.planLogs && Object.keys(item.planLogs).length > 0) {
        initial[item.id] = { ...item.planLogs };
      }
    });
    return initial;
  });

  useEffect(() => {
    const synced: Record<string, Record<string, number>> = {};
    workItems.forEach((item) => {
      if (item.planLogs && Object.keys(item.planLogs).length > 0) {
        synced[item.id] = { ...item.planLogs };
      }
    });
    setOverriddenPlans(synced);
  }, [workItems]);

  // Collapsed node state (Area IDs and Sub-System IDs that are explicitly collapsed)
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(new Set());

  const toggleNodeExpand = (nodeId: string) => {
    setCollapsedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  // Item price & WF editing state
  const [editingPriceItemId, setEditingPriceItemId] = useState<string | null>(null);
  const [priceInputValue, setPriceInputValue] = useState<string>('');
  const [editingWfItemId, setEditingWfItemId] = useState<string | null>(null);
  const [wfInputValue, setWfInputValue] = useState<string>('');

  // Auto Plan Modal state
  const [isAutoPlanModalOpen, setIsAutoPlanModalOpen] = useState<boolean>(false);
  const [autoPlanStrategy, setAutoPlanStrategy] = useState<'smart' | 'balanced' | 'aggressive'>('smart');

  // Dynamic timeline dates array
  const timelineDates = useMemo(() => {
    const list = [];
    let start = new Date(projectStartDate);
    if (isNaN(start.getTime())) {
      start = new Date('2025-11-10');
    }

    for (let i = 0; i < totalDurationDays; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const dayNum = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${dayNum}`;

      const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
      const dayName = dayNames[d.getDay()];

      let weekLabel = undefined;
      if (i === 0 || d.getDay() === 1) {
        const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
        weekLabel = d.toLocaleDateString('id-ID', options);
      }

      list.push({
        index: i,
        dayNumber: d.getDate(),
        dayName,
        dateStr,
        weekLabel,
      });
    }
    return list;
  }, [projectStartDate, totalDurationDays]);

  // Group dates by week with precise colSpan calculation to keep table column widths aligned and compact
  const timelineWeeks = useMemo(() => {
    const weeks: { weekLabel: string; colSpan: number }[] = [];
    let currentWeek: { weekLabel: string; colSpan: number } | null = null;

    timelineDates.forEach((d, idx) => {
      // Start a new week on the first day (idx === 0) or on every Monday (dayName === 'M' or d.weekLabel defined)
      if (idx === 0 || d.weekLabel || !currentWeek) {
        if (currentWeek) {
          weeks.push(currentWeek);
        }
        const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
        const labelDate = new Date(d.dateStr);
        const formatted = isNaN(labelDate.getTime()) ? d.dateStr : labelDate.toLocaleDateString('id-ID', options);
        currentWeek = {
          weekLabel: `W${weeks.length + 1} (${formatted})`,
          colSpan: 1,
        };
      } else {
        currentWeek.colSpan += 1;
      }
    });

    if (currentWeek) {
      weeks.push(currentWeek);
    }
    return weeks;
  }, [timelineDates]);

  const visibleTimelineDates = useMemo(() => {
    if (timelineWindowMode === 'all') return timelineDates;
    const size = parseInt(timelineWindowMode, 10);
    return timelineDates.slice(timelineStartIndex, timelineStartIndex + size);
  }, [timelineDates, timelineWindowMode, timelineStartIndex]);

  const visibleTimelineWeeks = useMemo(() => {
    const weeks: { weekLabel: string; colSpan: number }[] = [];
    let currentWeek: { weekLabel: string; colSpan: number } | null = null;

    visibleTimelineDates.forEach((d, idx) => {
      if (idx === 0 || d.weekLabel || !currentWeek) {
        if (currentWeek) {
          weeks.push(currentWeek);
        }
        const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
        const labelDate = new Date(d.dateStr);
        const formatted = isNaN(labelDate.getTime()) ? d.dateStr : labelDate.toLocaleDateString('id-ID', options);
        currentWeek = {
          weekLabel: `W${weeks.length + 1} (${formatted})`,
          colSpan: 1,
        };
      } else {
        currentWeek.colSpan += 1;
      }
    });

    if (currentWeek) {
      weeks.push(currentWeek);
    }
    return weeks;
  }, [visibleTimelineDates]);

  // ----------------------------------------------------------------------
  // HIERARCHY HELPER FUNCTIONS
  // ----------------------------------------------------------------------
  
  // Helper to determine item level (1 = Area, 2 = Sub-System, 3 = Component)
  const getItemLevel = (item: WorkItem, categoryItems: WorkItem[]): 1 | 2 | 3 => {
    if (item.itemLevel === 1 || item.isAreaHeader) return 1;
    if (item.itemLevel === 2) return 2;
    if (item.itemLevel === 3) return 3;

    if (item.parentId) {
      const p = categoryItems.find((i) => i.id === item.parentId);
      if (p) {
        const pLvl = getItemLevel(p, categoryItems);
        return pLvl === 1 ? 2 : 3;
      }
    }

    const parts = (item.itemNo || '').trim().split('.');
    if (parts.length === 1 && (!item.type || item.type === '')) return 1;
    if (parts.length === 2) return 2;
    return 3;
  };

  // Check if an item has children in the workItems list strictly within the SAME category
  const itemHasChildren = (item: WorkItem) => {
    return workItems.some(
      (c) =>
        c.id !== item.id &&
        c.categoryId === item.categoryId &&
        (c.parentId === item.id || (c.itemNo && item.itemNo && c.itemNo.startsWith(`${item.itemNo}.`)))
    );
  };

  // Valid leaf component work items (items that hold direct cost & physical progress)
  const validWorkItems = useMemo(() => {
    return workItems.filter((i) => !itemHasChildren(i));
  }, [workItems]);

  // Global total cost of active leaf repair items
  const globalTotalCost = useMemo(() => {
    return validWorkItems.reduce((acc, item) => acc + (item.totalPrice || 0), 0);
  }, [validWorkItems]);

  // Helper: Get all unique descendant leaf components of any Area or Sub-System strictly within the SAME category
  const getDescendantComponents = (nodeItem: WorkItem): WorkItem[] => {
    // 1. Find all descendants belonging to this node in the SAME category only (never cross categories)
    const allDescendants = workItems.filter((item) => {
      if (item.id === nodeItem.id) return false;
      if (nodeItem.categoryId && item.categoryId && item.categoryId !== nodeItem.categoryId) return false;
      if (item.parentId === nodeItem.id) return true;
      if (nodeItem.itemNo && item.itemNo && item.itemNo.startsWith(`${nodeItem.itemNo}.`)) return true;
      return false;
    });

    if (allDescendants.length === 0) {
      return [nodeItem];
    }

    // 2. Filter to ONLY unique leaf items within the SAME category (items that have NO children under them)
    const seenIds = new Set<string>();
    const leaves: WorkItem[] = [];

    allDescendants.forEach((item) => {
      if (seenIds.has(item.id)) return;
      if (!itemHasChildren(item)) {
        seenIds.add(item.id);
        leaves.push(item);
      }
    });

    if (leaves.length === 0) {
      return [nodeItem];
    }

    return leaves;
  };

  // Helper to check if a unit is a weight/tonnage unit (kg, ton, etc.)
  const isWeightUnit = (unitStr?: string): boolean => {
    if (!unitStr) return false;
    const u = unitStr.trim().toLowerCase();
    return ['kg', 'kgs', 'ton', 'tonne', 'tonase', 'g', 'gram', 'gr', 'kilogram', 'kilograms'].includes(u);
  };

  // Helper: Compute accumulated / subtotal Volume, Unit, Harga, Total Biaya, and WF (%)
  const computeNodeMetrics = (nodeItem: WorkItem, childItems?: WorkItem[]) => {
    const hasStructureBelow = itemHasChildren(nodeItem);
    const leaves = getDescendantComponents(nodeItem);
    const effectiveItems =
      leaves.length > 0
        ? leaves
        : childItems && childItems.length > 0
        ? childItems.filter((c) => !itemHasChildren(c))
        : [nodeItem];

    // Total cost (Accumulated or Sub-total, no double counting)
    const totalCost = effectiveItems.reduce((acc, c) => acc + (c.totalPrice || 0), 0) || (nodeItem.totalPrice || 0);

    // Weight & Volume calculation:
    // If has structure below: ONLY show weight summation if items are weight-based.
    // If non-weight (pcs, ls, lot, set, etc.), volume & unit are NOT shown ('-').
    let displayQty: number | null = null;
    let displayUnit = '-';

    if (!hasStructureBelow) {
      // Standalone single item without sub-structure: show direct qty & unit
      displayQty = Number(nodeItem.qty) || 0;
      displayUnit = nodeItem.unit || '-';
    } else {
      // Has structure below: check if weight is present among leaf items
      const totalWeightKg = effectiveItems.reduce((acc, c) => acc + (c.weightKg || 0), 0);
      const weightLeaves = effectiveItems.filter((c) => isWeightUnit(c.unit) || (c.weightKg && c.weightKg > 0));

      if (totalWeightKg > 0) {
        displayQty = totalWeightKg;
        displayUnit = 'kg';
      } else if (weightLeaves.length > 0 && weightLeaves.length === effectiveItems.length) {
        const sumQty = weightLeaves.reduce((acc, c) => acc + (Number(c.qty) || 0), 0);
        displayQty = sumQty;
        displayUnit = weightLeaves[0].unit || 'kg';
      } else {
        // Non-weight items (pcs, ls, lot, unit, etc.) -> DO NOT SHOW on Area / Sub-system
        displayQty = null;
        displayUnit = '-';
      }
    }

    // Unit price logic:
    // If has structure below: DO NOT show unit price (show null -> '-'), only show Total Biaya!
    // If NO structure below: show unitPrice!
    const displayUnitPrice = hasStructureBelow ? null : (nodeItem.unitPrice || 0);

    // Weight factor (%)
    const wf = globalTotalCost > 0 ? ((totalCost / globalTotalCost) * 100).toFixed(2) : '0.00';

    return {
      hasStructureBelow,
      totalCost,
      displayQty,
      displayUnit,
      displayUnitPrice,
      wf,
    };
  };

  // Group work items by Category
  const groupedWorkItems = useMemo(() => {
    const map = new Map<string, { category: WorkCategory; items: WorkItem[] }>();

    categories.forEach((cat) => {
      map.set(cat.id || cat.code, { category: cat, items: [] });
    });

    workItems.forEach((item) => {
      const catKey = item.categoryId || 'uncategorized';
      if (map.has(catKey)) {
        map.get(catKey)!.items.push(item);
      } else {
        const fallbackCat: WorkCategory = {
          id: 'uncategorized',
          code: 'MISC',
          name: 'Pekerjaan Lainnya',
          sortOrder: 99,
        };
        if (!map.has('uncategorized')) {
          map.set('uncategorized', { category: fallbackCat, items: [] });
        }
        map.get('uncategorized')!.items.push(item);
      }
    });

    return Array.from(map.values()).filter((g) => g.items.length > 0);
  }, [categories, workItems]);

  // Filtered grouped work items based on search, selected category, and filterStatus
  const filteredGroupedWorkItems = useMemo(() => {
    return groupedWorkItems
      .map((group) => {
        if (selectedCat !== 'all' && group.category.id !== selectedCat && group.category.code !== selectedCat) {
          return null;
        }

        const filteredItems = group.items.filter((item) => {
          // 1. Search Query Filter
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const matchesQuery = item.description.toLowerCase().includes(q) || item.itemNo.toLowerCase().includes(q);
            if (!matchesQuery) return false;
          }

          // 2. Status Filter
          if (filterStatus === 'uncompleted') {
            return (item.progressPercent || 0) < 100;
          } else if (filterStatus === 'in_progress') {
            return (item.progressPercent || 0) > 0 && (item.progressPercent || 0) < 100;
          } else if (filterStatus === 'completed') {
            return (item.progressPercent || 0) >= 100;
          } else if (filterStatus === 'weighted_only') {
            return (item.totalPrice || 0) > 0;
          }

          return true;
        });

        if (filteredItems.length === 0) return null;
        return { ...group, items: filteredItems };
      })
      .filter(Boolean) as { category: WorkCategory; items: WorkItem[] }[];
  }, [groupedWorkItems, selectedCat, searchQuery, filterStatus]);

  // ----------------------------------------------------------------------
  // COMPUTE DAILY PROGRESS PER COMPONENT ITEM (Plan & Actual)
  // ----------------------------------------------------------------------
  const itemDailyProgressMap = useMemo(() => {
    const planMap = new Map<string, Record<string, number>>();
    const actualMap = new Map<string, Record<string, number>>();

    validWorkItems.forEach((item) => {
      const itemPlans: Record<string, number> = {};
      const itemActuals: Record<string, number> = {};

      let lastPlanVal = 0;
      let lastActualVal = 0;

      timelineDates.forEach((d, dayIdx) => {
        // 1. PLAN CALCULATION
        let planVal = 0;
        const customPlan = overriddenPlans[item.id]?.[d.dateStr] ?? item.planLogs?.[d.dateStr];

        if (customPlan !== undefined) {
          planVal = customPlan;
        } else if (item.startDate && item.targetEndDate) {
          const startIdx = timelineDates.findIndex((t) => t.dateStr === item.startDate);
          const endIdx = timelineDates.findIndex((t) => t.dateStr === item.targetEndDate);

          if (startIdx >= 0 && endIdx >= startIdx) {
            if (dayIdx >= endIdx) {
              planVal = 100;
            } else if (dayIdx >= startIdx) {
              const dur = endIdx - startIdx + 1;
              const elapsed = dayIdx - startIdx + 1;
              const t = elapsed / dur;
              planVal = Math.round((1 / (1 + Math.exp(-6 * (t - 0.5)))) * 100);
            }
          }
        }

        if (customPlan === undefined && planVal < lastPlanVal) {
          planVal = lastPlanVal;
        }
        lastPlanVal = planVal;
        itemPlans[d.dateStr] = planVal;

        // 2. ACTUAL CALCULATION (Cumulative Carry-Forward Monotonic Log)
        let actualVal = 0;
        const directLog = item.dailyLogs?.[d.dateStr];
        if (directLog !== undefined && directLog.percentAchieved !== undefined) {
          actualVal = Number(directLog.percentAchieved) || 0;
          lastActualVal = actualVal;
        } else if (actualVal < lastActualVal) {
          actualVal = lastActualVal;
        } else {
          lastActualVal = actualVal;
        }
        itemActuals[d.dateStr] = actualVal;
      });

      planMap.set(item.id, itemPlans);
      actualMap.set(item.id, itemActuals);
    });

    return { planMap, actualMap };
  }, [validWorkItems, timelineDates, totalDurationDays, overriddenPlans]);

  // ----------------------------------------------------------------------
  // COMPUTE CUMULATIVE PROJECT PLAN & ACTUAL (Sum of Weighted Items)
  // ----------------------------------------------------------------------
  const dailyCumulativeProgress = useMemo(() => {
    const plans: number[] = [];
    const actuals: number[] = [];

    timelineDates.forEach((d) => {
      let dailyPlanWeightedSum = 0;
      let dailyActualWeightedSum = 0;

      validWorkItems.forEach((item) => {
        const itemPrice = item.totalPrice || 0;
        const weight = globalTotalCost > 0 ? itemPrice / globalTotalCost : 1 / Math.max(1, validWorkItems.length);

        const pVal = itemDailyProgressMap.planMap.get(item.id)?.[d.dateStr] || 0;
        const aVal = itemDailyProgressMap.actualMap.get(item.id)?.[d.dateStr] || 0;

        dailyPlanWeightedSum += pVal * weight;
        dailyActualWeightedSum += aVal * weight;
      });

      plans.push(Math.min(100, Math.round(dailyPlanWeightedSum * 10) / 10));
      actuals.push(Math.min(100, Math.round(dailyActualWeightedSum * 10) / 10));
    });

    return { plans, actuals };
  }, [timelineDates, validWorkItems, globalTotalCost, itemDailyProgressMap]);

  // Recharts S-curve data points
  const sCurveChartData = useMemo(() => {
    return timelineDates.map((d, idx) => {
      const planVal = dailyCumulativeProgress.plans[idx] || 0;
      const actualVal = dailyCumulativeProgress.actuals[idx] || 0;

      return {
        dayNum: idx + 1,
        dayLabel: `H-${idx + 1} (${d.dayNumber})`,
        dateStr: d.dateStr,
        'Rencana (%)': planVal,
        'Realisasi (%)': actualVal,
      };
    });
  }, [timelineDates, dailyCumulativeProgress]);

  // Executive KPI summary calculations
  const executiveMetrics = useMemo(() => {
    const todayIso = formatDateToIso(new Date());
    const todayIdx = timelineDates.findIndex((d) => d.dateStr === todayIso);
    
    // If today is within schedule, use today's plan & actual, else use latest or final
    let currentPlan = 0;
    let currentActual = 0;
    
    if (todayIdx >= 0) {
      currentPlan = dailyCumulativeProgress.plans[todayIdx] || 0;
      currentActual = dailyCumulativeProgress.actuals[todayIdx] || 0;
    } else {
      currentPlan = dailyCumulativeProgress.plans[dailyCumulativeProgress.plans.length - 1] || 0;
      currentActual = dailyCumulativeProgress.actuals[dailyCumulativeProgress.actuals.length - 1] || 0;
    }

    // Also get the maximum recorded actual progress across the project
    const maxActual = Math.max(...dailyCumulativeProgress.actuals, 0);
    const effectiveActual = Math.max(currentActual, maxActual);
    const deviation = Math.round((effectiveActual - currentPlan) * 10) / 10;

    // Item status breakdown
    const itemsTotal = validWorkItems.length;
    const itemsCompleted = validWorkItems.filter((i) => (i.progressPercent || 0) >= 100).length;
    const itemsInProgress = validWorkItems.filter((i) => (i.progressPercent || 0) > 0 && (i.progressPercent || 0) < 100).length;
    const itemsPending = validWorkItems.filter((i) => (i.progressPercent || 0) === 0).length;

    // Monetary value completed
    const completedCost = validWorkItems.reduce((acc, i) => {
      const progress = (i.progressPercent || 0) / 100;
      return acc + (i.totalPrice || 0) * progress;
    }, 0);

    // Days elapsed & remaining
    const startObj = parseDateFlexible(projectStartDate);
    const endObj = parseDateFlexible(projectEndDate);
    const now = new Date();
    let daysElapsed = 0;
    if (startObj && now >= startObj) {
      daysElapsed = Math.min(totalDurationDays, Math.round((now.getTime() - startObj.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    }
    const daysRemaining = Math.max(0, totalDurationDays - daysElapsed);

    // Active project lifecycle phase name
    let activePhase = 'Pra-Arrival (Persiapan)';
    if (todayIso < arrivalDate) {
      activePhase = 'Menuju Galangan (Pre-Arrival)';
    } else if (todayIso < dockingDate) {
      activePhase = 'Persiapan & Labuh (Arrival - Docking)';
    } else if (todayIso <= undockingDate) {
      activePhase = '⚓ Periode Naik Dok (Docking)';
    } else if (todayIso <= finishWorkDate) {
      activePhase = 'Finishing & Sea Trial (Undocking - Finish)';
    } else if (todayIso <= sailOutDate) {
      activePhase = 'Kesiapan Berlayar (Sail Out)';
    } else {
      activePhase = 'Proyek Selesai (Post-Sail Out)';
    }

    return {
      currentPlan,
      currentActual: effectiveActual,
      deviation,
      itemsTotal,
      itemsCompleted,
      itemsInProgress,
      itemsPending,
      completedCost,
      daysElapsed,
      daysRemaining,
      activePhase,
      todayIdx,
    };
  }, [timelineDates, dailyCumulativeProgress, validWorkItems, projectStartDate, projectEndDate, totalDurationDays, arrivalDate, dockingDate, undockingDate, finishWorkDate, sailOutDate]);

  // Weekly performance breakdown table data for S-Curve Analytics
  const weeklyBreakdown = useMemo(() => {
    let dayCursor = 0;
    return timelineWeeks.map((w, wIdx) => {
      const startIdx = dayCursor;
      const endIdx = Math.min(timelineDates.length - 1, dayCursor + w.colSpan - 1);
      dayCursor += w.colSpan;

      const startDateStr = timelineDates[startIdx]?.dateStr || '';
      const endDateStr = timelineDates[endIdx]?.dateStr || '';

      const startPlan = startIdx > 0 ? dailyCumulativeProgress.plans[startIdx - 1] : 0;
      const endPlan = dailyCumulativeProgress.plans[endIdx] || 0;
      const weekPlanInc = Math.max(0, Math.round((endPlan - startPlan) * 10) / 10);

      const startActual = startIdx > 0 ? dailyCumulativeProgress.actuals[startIdx - 1] : 0;
      const endActual = dailyCumulativeProgress.actuals[endIdx] || 0;
      const weekActualInc = Math.max(0, Math.round((endActual - startActual) * 10) / 10);

      const cumulativeDeviation = Math.round((endActual - endPlan) * 10) / 10;
      
      let status: 'ahead' | 'on_track' | 'behind' = 'on_track';
      if (cumulativeDeviation > 1) status = 'ahead';
      else if (cumulativeDeviation < -1) status = 'behind';

      return {
        weekLabel: w.weekLabel || `Minggu ${wIdx + 1}`,
        colSpan: w.colSpan,
        startDateStr,
        endDateStr,
        startIdx,
        endIdx,
        endPlan,
        endActual,
        weekPlanInc,
        weekActualInc,
        cumulativeDeviation,
        status,
      };
    });
  }, [timelineWeeks, timelineDates, dailyCumulativeProgress]);

  // Category breakdown for summary view
  const categoryBreakdown = useMemo(() => {
    return categories.map((cat) => {
      const catItems = validWorkItems.filter((i) => i.categoryId === cat.id || i.categoryId === cat.code);
      const totalCost = catItems.reduce((acc, i) => acc + (i.totalPrice || 0), 0);
      const wf = globalTotalCost > 0 ? ((totalCost / globalTotalCost) * 100).toFixed(2) : '0.00';
      
      const completedCount = catItems.filter((i) => (i.progressPercent || 0) >= 100).length;
      const inProgressCount = catItems.filter((i) => (i.progressPercent || 0) > 0 && (i.progressPercent || 0) < 100).length;
      
      let avgActual = 0;
      if (totalCost > 0) {
        avgActual = catItems.reduce((acc, i) => acc + ((i.progressPercent || 0) * (i.totalPrice || 0)), 0) / totalCost;
      } else if (catItems.length > 0) {
        avgActual = catItems.reduce((acc, i) => acc + (i.progressPercent || 0), 0) / catItems.length;
      }

      return {
        category: cat,
        itemsCount: catItems.length,
        totalCost,
        wf,
        completedCount,
        inProgressCount,
        avgActual: Math.round(avgActual * 10) / 10,
      };
    }).filter((c) => c.itemsCount > 0);
  }, [categories, validWorkItems, globalTotalCost]);

  // Toggle expand / collapse all nodes
  const handleToggleAllNodes = () => {
    const allExpandableIds: string[] = [];
    workItems.forEach((item) => {
      if (item.isAreaHeader || itemHasChildren(item)) {
        allExpandableIds.push(item.id);
      }
    });

    if (collapsedNodeIds.size > 0) {
      // If some/all collapsed, expand all
      setCollapsedNodeIds(new Set());
    } else {
      // Collapse all
      setCollapsedNodeIds(new Set(allExpandableIds));
    }
  };

  // Helper: Compute weighted average progress for any Node (Area or Sub-System) on a given date
  const getNodeDailyProgress = (nodeItem: WorkItem, dateStr: string, type: 'plan' | 'actual') => {
    const children = getDescendantComponents(nodeItem);
    if (children.length === 0) {
      return type === 'plan'
        ? itemDailyProgressMap.planMap.get(nodeItem.id)?.[dateStr] || 0
        : itemDailyProgressMap.actualMap.get(nodeItem.id)?.[dateStr] || 0;
    }

    const totalNodeCost = children.reduce((acc, c) => acc + (c.totalPrice || 0), 0);
    let weightedSum = 0;

    children.forEach((c) => {
      const val =
        type === 'plan'
          ? itemDailyProgressMap.planMap.get(c.id)?.[dateStr] || 0
          : itemDailyProgressMap.actualMap.get(c.id)?.[dateStr] || 0;

      const w = totalNodeCost > 0 ? (c.totalPrice || 0) / totalNodeCost : 1 / children.length;
      weightedSum += val * w;
    });

    return Math.min(100, Math.round(weightedSum * 10) / 10);
  };

  // Helper: Compute weighted average progress for Category Header on a given date
  const getCategoryDailyProgress = (catId: string, dateStr: string, type: 'plan' | 'actual') => {
    const catItems = validWorkItems.filter((i) => i.categoryId === catId);
    if (catItems.length === 0) return 0;

    const totalCatCost = catItems.reduce((acc, c) => acc + (c.totalPrice || 0), 0);
    let weightedSum = 0;

    catItems.forEach((c) => {
      const val =
        type === 'plan'
          ? itemDailyProgressMap.planMap.get(c.id)?.[dateStr] || 0
          : itemDailyProgressMap.actualMap.get(c.id)?.[dateStr] || 0;

      const w = totalCatCost > 0 ? (c.totalPrice || 0) / totalCatCost : 1 / catItems.length;
      weightedSum += val * w;
    });

    return Math.min(100, Math.round(weightedSum * 10) / 10);
  };

  // ----------------------------------------------------------------------
  // BI-DIRECTIONAL ROLL-DOWN & SAVE HANDLER FOR NODE / ITEM
  // ----------------------------------------------------------------------
  const handleSaveCell = (targetItem: WorkItem, dateStr: string, rowType: 'plan' | 'actual') => {
    const children = getDescendantComponents(targetItem);
    const affectedItemIds = Array.from(new Set([targetItem.id, ...children.map((c) => c.id)]));

    if (cellInputValue.trim() === '') {
      if (rowType === 'plan') {
        setOverriddenPlans((prev) => {
          const updated = { ...prev };
          affectedItemIds.forEach((id) => {
            if (updated[id]) {
              const itemP = { ...updated[id] };
              delete itemP[dateStr];
              updated[id] = itemP;
            }
          });
          return updated;
        });

        const updatedWorkItems = workItems.map((item) => {
          if (!affectedItemIds.includes(item.id)) return item;
          const pLogs = { ...(item.planLogs || {}) };
          delete pLogs[dateStr];
          return {
            ...item,
            planLogs: pLogs,
          };
        });
        onUpdateItems(recalculateProjectHierarchyProgress(updatedWorkItems));

        if (onSaveToast) onSaveToast(`Target PLAN "${targetItem.description}" tgl ${dateStr} direset ke kurva otomatis.`);
      } else {
        const updatedWorkItems = workItems.map((item) => {
          if (!affectedItemIds.includes(item.id)) return item;
          const logs = { ...(item.dailyLogs || {}) };
          delete logs[dateStr];
          const logVals = Object.values(logs).map((l: any) => l.percentAchieved || 0);
          const maxLogProgress = logVals.length > 0 ? Math.max(...logVals) : 0;
          return {
            ...item,
            dailyLogs: logs,
            progressPercent: maxLogProgress,
            isCompleted: maxLogProgress === 100,
          };
        });
        onUpdateItems(recalculateProjectHierarchyProgress(updatedWorkItems));
        if (onSaveToast) onSaveToast(`Realisasi ACTUAL "${targetItem.description}" tgl ${dateStr} direset.`);
      }
      setEditingCell(null);
      return;
    }

    const val = parseFloat(cellInputValue);
    if (isNaN(val)) {
      setEditingCell(null);
      return;
    }

    const clamped = Math.min(100, Math.max(0, val));

    if (rowType === 'plan') {
      setOverriddenPlans((prev) => {
        const updated = { ...prev };
        affectedItemIds.forEach((id) => {
          updated[id] = {
            ...(updated[id] || {}),
            [dateStr]: clamped,
          };
        });
        return updated;
      });

      const updatedWorkItems = workItems.map((item) => {
        if (!affectedItemIds.includes(item.id)) return item;
        const pLogs = { ...(item.planLogs || {}) };
        pLogs[dateStr] = clamped;
        return {
          ...item,
          planLogs: pLogs,
        };
      });
      onUpdateItems(recalculateProjectHierarchyProgress(updatedWorkItems));

      if (onSaveToast) {
        onSaveToast(`Target PLAN "${targetItem.description}" tgl ${dateStr} ditetapkan ${clamped}% (Tersubstitusi ke seluruh sub-sistem & komponen turunan)!`);
      }
    } else {
      const updatedWorkItems = workItems.map((item) => {
        if (!affectedItemIds.includes(item.id)) return item;

        const logs = { ...(item.dailyLogs || {}) };
        logs[dateStr] = {
          dateStr,
          percentAchieved: clamped,
        };

        const logVals = Object.values(logs).map((l: any) => l.percentAchieved || 0);
        const maxLogProgress = logVals.length > 0 ? Math.max(...logVals) : clamped;

        return {
          ...item,
          dailyLogs: logs,
          progressPercent: maxLogProgress,
          isCompleted: maxLogProgress === 100,
        };
      });

      onUpdateItems(recalculateProjectHierarchyProgress(updatedWorkItems));
      if (onSaveToast) {
        onSaveToast(`Realisasi ACTUAL "${targetItem.description}" tgl ${dateStr} diterapkan ${clamped}% (Tersubstitusi ke seluruh sub-sistem & komponen turunan)!`);
      }
    }

    setEditingCell(null);
  };

  // Roll-down for Category Header
  const handleSaveCategoryCell = (catId: string, catName: string, dateStr: string, rowType: 'plan' | 'actual') => {
    const catItems = validWorkItems.filter((i) => i.categoryId === catId);
    const affectedItemIds = catItems.map((c) => c.id);

    if (cellInputValue.trim() === '') {
      if (rowType === 'plan') {
        setOverriddenPlans((prev) => {
          const updated = { ...prev };
          affectedItemIds.forEach((id) => {
            if (updated[id]) {
              const itemP = { ...updated[id] };
              delete itemP[dateStr];
              updated[id] = itemP;
            }
          });
          return updated;
        });

        const updatedWorkItems = workItems.map((item) => {
          if (!affectedItemIds.includes(item.id)) return item;
          const pLogs = { ...(item.planLogs || {}) };
          delete pLogs[dateStr];
          return {
            ...item,
            planLogs: pLogs,
          };
        });
        onUpdateItems(recalculateProjectHierarchyProgress(updatedWorkItems));

        if (onSaveToast) onSaveToast(`Target PLAN Kategori "${catName}" tgl ${dateStr} direset.`);
      } else {
        const updatedWorkItems = workItems.map((item) => {
          if (!affectedItemIds.includes(item.id)) return item;
          const logs = { ...(item.dailyLogs || {}) };
          delete logs[dateStr];
          const logVals = Object.values(logs).map((l: any) => l.percentAchieved || 0);
          const maxLogProgress = logVals.length > 0 ? Math.max(...logVals) : 0;
          return {
            ...item,
            dailyLogs: logs,
            progressPercent: maxLogProgress,
            isCompleted: maxLogProgress === 100,
          };
        });
        onUpdateItems(recalculateProjectHierarchyProgress(updatedWorkItems));
        if (onSaveToast) onSaveToast(`Realisasi ACTUAL Kategori "${catName}" tgl ${dateStr} direset.`);
      }
      setEditingCell(null);
      return;
    }

    const val = parseFloat(cellInputValue);
    if (isNaN(val)) {
      setEditingCell(null);
      return;
    }

    const clamped = Math.min(100, Math.max(0, val));

    if (rowType === 'plan') {
      setOverriddenPlans((prev) => {
        const updated = { ...prev };
        affectedItemIds.forEach((id) => {
          updated[id] = {
            ...(updated[id] || {}),
            [dateStr]: clamped,
          };
        });
        return updated;
      });

      const updatedWorkItems = workItems.map((item) => {
        if (!affectedItemIds.includes(item.id)) return item;
        const pLogs = { ...(item.planLogs || {}) };
        pLogs[dateStr] = clamped;
        return {
          ...item,
          planLogs: pLogs,
        };
      });
      onUpdateItems(recalculateProjectHierarchyProgress(updatedWorkItems));

      if (onSaveToast) onSaveToast(`Target PLAN Kategori "${catName}" tgl ${dateStr} ditetapkan ${clamped}%!`);
    } else {
      const updatedWorkItems = workItems.map((item) => {
        if (!affectedItemIds.includes(item.id)) return item;

        const logs = { ...(item.dailyLogs || {}) };
        logs[dateStr] = {
          dateStr,
          percentAchieved: clamped,
        };

        const logVals = Object.values(logs).map((l: any) => l.percentAchieved || 0);
        const maxLogProgress = logVals.length > 0 ? Math.max(...logVals) : clamped;

        return {
          ...item,
          dailyLogs: logs,
          progressPercent: maxLogProgress,
          isCompleted: maxLogProgress === 100,
        };
      });

      onUpdateItems(recalculateProjectHierarchyProgress(updatedWorkItems));
      if (onSaveToast) onSaveToast(`Realisasi ACTUAL Kategori "${catName}" tgl ${dateStr} diterapkan ${clamped}%!`);
    }

    setEditingCell(null);
  };

  // ----------------------------------------------------------------------
  // WF (%) EDITING & PROPORTIONAL DISTRIBUTED ADJUSTMENT HANDLER
  // ----------------------------------------------------------------------
  const handleSaveWf = (targetItem: WorkItem, newWfVal: number) => {
    if (isNaN(newWfVal) || newWfVal < 0) {
      setEditingWfItemId(null);
      return;
    }

    const clampedWf = Math.min(100, Math.max(0, newWfVal));
    const descendants = getDescendantComponents(targetItem);

    if (descendants.length === 0) {
      setEditingWfItemId(null);
      return;
    }

    const targetNodeTotalCost = (clampedWf / 100) * (globalTotalCost > 0 ? globalTotalCost : 1000000);
    const currentSubTotalCost = descendants.reduce((acc, c) => acc + (c.totalPrice || 0), 0);
    const affectedIds = new Set(descendants.map((c) => c.id));

    const updatedWorkItems = workItems.map((item) => {
      if (!affectedIds.has(item.id)) return item;

      let newPrice = 0;
      if (descendants.length === 1) {
        newPrice = Math.round(targetNodeTotalCost);
      } else if (currentSubTotalCost > 0) {
        newPrice = Math.round(((item.totalPrice || 0) / currentSubTotalCost) * targetNodeTotalCost);
      } else {
        newPrice = Math.round(targetNodeTotalCost / descendants.length);
      }

      const newUnitPrice = item.qty > 0 ? Math.round(newPrice / item.qty) : newPrice;

      return {
        ...item,
        totalPrice: newPrice,
        unitPrice: newUnitPrice,
        weightFactor: clampedWf,
      };
    });

    onUpdateItems(updatedWorkItems);
    setEditingWfItemId(null);

    if (onSaveToast) {
      onSaveToast(`Bobot WF (%) "${targetItem.description}" disesuaikan menjadi ${clampedWf.toFixed(2)}%!`);
    }
  };

  // ----------------------------------------------------------------------
  // AUTOMATIC SMART PLAN GENERATOR ALGORITHM (Set Plan Otomatis)
  // ----------------------------------------------------------------------
  const handleExecuteAutoSmartPlan = () => {
    if (validWorkItems.length === 0) {
      alert('Tidak ada pekerjaan perbaikan dalam Repair List.');
      return;
    }

    setOverriddenPlans({});

    const updatedItems = workItems.map((item) => {
      if (item.isAreaHeader || item.itemLevel === 1) return item;

      const catCode = (item.categoryCode || item.categoryId || '').toUpperCase();
      const desc = item.description.toLowerCase();

      let phaseStartOffset = 0.1;
      let phaseEndOffset = 0.5;

      if (catCode.includes('A') || desc.includes('docking') || desc.includes('persiapan')) {
        if (desc.includes('pre-docking') || desc.includes('slip up')) {
          phaseStartOffset = 0.02;
          phaseEndOffset = 0.15;
        } else if (desc.includes('undocking') || desc.includes('slip down')) {
          phaseStartOffset = 0.88;
          phaseEndOffset = 0.98;
        } else {
          phaseStartOffset = 0.05;
          phaseEndOffset = 0.3;
        }
      } else if (catCode.includes('F') || desc.includes('pelat') || desc.includes('steelwork')) {
        phaseStartOffset = 0.15;
        phaseEndOffset = 0.75;
      } else if (desc.includes('cat') || desc.includes('blasting') || desc.includes('painting')) {
        phaseStartOffset = 0.4;
        phaseEndOffset = 0.85;
      } else if (desc.includes('machinery') || desc.includes('propeller') || desc.includes('rudder')) {
        phaseStartOffset = 0.2;
        phaseEndOffset = 0.7;
      } else {
        phaseStartOffset = 0.25;
        phaseEndOffset = 0.8;
      }

      const totalDays = Math.max(7, totalDurationDays);
      let startDayIdx = Math.floor(phaseStartOffset * totalDays);
      let endDayIdx = Math.ceil(phaseEndOffset * totalDays);

      if (endDayIdx <= startDayIdx) endDayIdx = startDayIdx + 3;
      if (endDayIdx >= totalDays) endDayIdx = totalDays - 1;

      const startDateObj = new Date(projectStartDate);
      startDateObj.setDate(startDateObj.getDate() + startDayIdx);

      const endDateObj = new Date(projectStartDate);
      endDateObj.setDate(endDateObj.getDate() + endDayIdx);

      const formatDateStr = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      return {
        ...item,
        startDate: formatDateStr(startDateObj),
        targetEndDate: formatDateStr(endDateObj),
      };
    });

    onUpdateItems(updatedItems);
    setIsAutoPlanModalOpen(false);
    if (onSaveToast) {
      onSaveToast('✨ Rencana & jadwal linimasa otomatis berhasil dihitung berdasarkan bobot, urutan & tingkat kesulitan!');
    }
  };

  // Update Item Date Pickers (Plan & Actual Dates)
  const handleUpdateItemDates = (
    itemId: string,
    field: 'startDate' | 'targetEndDate' | 'actualStartDate' | 'actualEndDate',
    newDateStr: string
  ) => {
    const updated = workItems.map((item) => {
      if (item.id !== itemId) return item;
      return {
        ...item,
        [field]: newDateStr,
      };
    });
    onUpdateItems(updated);
  };

  const handleUpdateMultipleItemDates = (
    itemIds: string[],
    field: 'startDate' | 'targetEndDate' | 'actualStartDate' | 'actualEndDate',
    newDateStr: string
  ) => {
    const idSet = new Set(itemIds);
    const updated = workItems.map((item) => {
      if (!idSet.has(item.id)) return item;
      return {
        ...item,
        [field]: newDateStr,
      };
    });
    onUpdateItems(updated);
  };

  // Custom Tooltip for Recharts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const plan = data['Rencana (%)'] || 0;
      const actual = data['Realisasi (%)'] || 0;
      const dev = Math.round((actual - plan) * 10) / 10;

      return (
        <div className="bg-[#0b2545] text-white p-3.5 rounded-xl shadow-lg border border-amber-400/40 text-[11px] space-y-2 min-w-[170px]">
          <div className="font-extrabold text-amber-300 border-b border-white/10 pb-1.5 flex items-center justify-between">
            <span>{data.dayLabel}</span>
            <span className="text-[10px] bg-amber-400 text-[#0b2545] px-1.5 py-0.2 rounded font-mono font-black">REPAIR LIST</span>
          </div>
          <div className="space-y-1 font-semibold">
            <div className="flex justify-between gap-4">
              <span className="text-slate-300">Target Rencana:</span>
              <span className="font-mono text-[#e9c46a]">{plan}%</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-300">Realisasi Fisik:</span>
              <span className="font-mono text-[#00b4d8]">{actual}%</span>
            </div>
            <div className="flex justify-between gap-4 border-t border-white/10 pt-1.5 mt-1">
              <span className="text-slate-200">Deviasi Progres:</span>
              <span className={`font-mono ${dev >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {dev >= 0 ? `+${dev}` : dev}%
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  
  // Interface for Table Row Pair (PLAN row + ACTUAL row)
  interface FlatRowPair {
    id: string;
    kind: 'category' | 'area' | 'subsystem' | 'component';
    category?: WorkCategory;
    categoryItems?: WorkItem[];
    area?: WorkItem;
    subSystem?: WorkItem;
    comp?: WorkItem;
    groupTotalCost?: number;
    groupWf?: string;
    areaSubSystems?: WorkItem[];
    areaComponents?: WorkItem[];
    subComponents?: WorkItem[];
    descendantLeaves?: WorkItem[];
    subLeaves?: WorkItem[];
    isAreaExpanded?: boolean;
    isSubExpanded?: boolean;
  }

  // Build flattened pair items for table virtualization
  const flatRowPairs = useMemo<FlatRowPair[]>(() => {
    const pairs: FlatRowPair[] = [];

    filteredGroupedWorkItems.forEach((group) => {
      const categoryItems = group.items;

      const areas: WorkItem[] = [];
      const subSystems: WorkItem[] = [];
      const components: WorkItem[] = [];

      categoryItems.forEach((item) => {
        const lvl = getItemLevel(item, categoryItems);
        if (lvl === 1) areas.push(item);
        else if (lvl === 2) subSystems.push(item);
        else components.push(item);
      });

      const standaloneSubSystems = subSystems.filter(
        (s) => !areas.some((a) => s.parentId === a.id || (s.itemNo && a.itemNo && s.itemNo.startsWith(`${a.itemNo}.`)))
      );

      const standaloneComponents = components.filter(
        (c) =>
          !areas.some((a) => c.parentId === a.id || (c.itemNo && a.itemNo && c.itemNo.startsWith(`${a.itemNo}.`))) &&
          !subSystems.some((s) => c.parentId === s.id || (c.itemNo && s.itemNo && c.itemNo.startsWith(`${s.itemNo}.`)))
      );

      const catItems = validWorkItems.filter((i) => i.categoryId === group.category.id);
      const groupTotalCost = catItems.reduce((acc, item) => acc + (item.totalPrice || 0), 0);
      const groupWf = globalTotalCost > 0 ? ((groupTotalCost / globalTotalCost) * 100).toFixed(1) : '0';

      // Category Header Pair
      pairs.push({
        id: `cat-${group.category.id || group.category.code}`,
        kind: 'category',
        category: group.category,
        categoryItems,
        groupTotalCost,
        groupWf,
      });

      // Areas
      areas.forEach((area) => {
        const areaSubSystems = subSystems.filter(
          (s) => s.parentId === area.id || (s.itemNo && area.itemNo && s.itemNo.startsWith(`${area.itemNo}.`))
        );

        const areaComponents = components.filter(
          (c) =>
            (c.parentId === area.id || (c.itemNo && area.itemNo && c.itemNo.startsWith(`${area.itemNo}.`))) &&
            !areaSubSystems.some((s) => c.parentId === s.id || (c.itemNo && s.itemNo && c.itemNo.startsWith(`${s.itemNo}.`)))
        );

        const descendantLeaves = getDescendantComponents(area);
        const isAreaExpanded = !collapsedNodeIds.has(area.id);

        pairs.push({
          id: `area-${area.id}`,
          kind: 'area',
          area,
          areaSubSystems,
          areaComponents,
          descendantLeaves,
          isAreaExpanded,
        });

        if (isAreaExpanded) {
          areaSubSystems.forEach((subSystem) => {
            const subComponents = components.filter(
              (c) => c.parentId === subSystem.id || (c.itemNo && subSystem.itemNo && c.itemNo.startsWith(`${subSystem.itemNo}.`))
            );
            const isSubExpanded = !collapsedNodeIds.has(subSystem.id);
            const subLeaves = getDescendantComponents(subSystem);

            pairs.push({
              id: `sub-${subSystem.id}`,
              kind: 'subsystem',
              subSystem,
              subComponents,
              subLeaves,
              isSubExpanded,
            });

            if (isSubExpanded) {
              subComponents.forEach((comp) => {
                pairs.push({
                  id: `comp-${comp.id}`,
                  kind: 'component',
                  comp,
                });
              });
            }
          });

          areaComponents.forEach((comp) => {
            pairs.push({
              id: `comp-${comp.id}`,
              kind: 'component',
              comp,
            });
          });
        }
      });

      // Standalone SubSystems
      standaloneSubSystems.forEach((subSystem) => {
        const subComponents = components.filter(
          (c) => c.parentId === subSystem.id || (c.itemNo && subSystem.itemNo && c.itemNo.startsWith(`${subSystem.itemNo}.`))
        );
        const isSubExpanded = !collapsedNodeIds.has(subSystem.id);
        const subLeaves = getDescendantComponents(subSystem);

        pairs.push({
          id: `sub-${subSystem.id}`,
          kind: 'subsystem',
          subSystem,
          subComponents,
          subLeaves,
          isSubExpanded,
        });

        if (isSubExpanded) {
          subComponents.forEach((comp) => {
            pairs.push({
              id: `comp-${comp.id}`,
              kind: 'component',
              comp,
            });
          });
        }
      });

      // Standalone Components
      standaloneComponents.forEach((comp) => {
        pairs.push({
          id: `comp-${comp.id}`,
          kind: 'component',
          comp,
        });
      });
    });

    return pairs;
  }, [filteredGroupedWorkItems, validWorkItems, globalTotalCost, collapsedNodeIds]);

  // Virtualization hook for table row pairs
  const rowVirtualizer = useVirtualizer({
    count: flatRowPairs.length,
    getScrollElement: () => tableScrollRef.current,
    estimateSize: () => 64, // 2 rows per pair (~64px)
    overscan: 10,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? rowVirtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end
      : 0;

  // Helper to render horizontal Gantt pill bar within active date ranges
  const renderVisualGanttCell = (
    startDate?: string | null,
    endDate?: string | null,
    currentDate?: string,
    type: 'plan' | 'actual' = 'plan',
    percent: number = 0,
    itemLevel: number = 3
  ) => {
    if (!startDate || !endDate || !currentDate) {
      return <div className="h-4" />;
    }

    const isWithinRange = currentDate >= startDate && currentDate <= endDate;
    if (!isWithinRange) {
      return <div className="h-4" />;
    }

    const isStart = currentDate === startDate;
    const isEnd = currentDate === endDate;

    // Distinct visual gradients based on status & type
    let bgClass = type === 'plan'
      ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 text-amber-950 border-amber-300 shadow-xs'
      : 'bg-gradient-to-r from-cyan-500 via-sky-500 to-cyan-500 text-white border-cyan-300 shadow-xs';

    if (percent >= 100 && type === 'actual') {
      bgClass = 'bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 text-white border-emerald-300 shadow-xs';
    }

    return (
      <div className="relative h-4 w-full">
        {/* Hierarchical WBS Parent-to-Subtask dependency line */}
        {isStart && (
          <>
            {itemLevel === 1 ? (
              /* Top-level Parent Task Start Flag */
              <div 
                className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-xs rotate-45 z-30 pointer-events-none bg-rose-500 border border-white shadow-xs animate-pulse"
                title="Root Parent Area Task Start"
              />
            ) : itemLevel === 2 ? (
              /* Sub-system (Level 2 Sub-task) Dependency Line to Parent Area */
              <>
                <div 
                  className={`absolute -top-[14px] left-[7px] w-[2px] h-[14px] border-l-2 border-dashed z-20 pointer-events-none border-emerald-500/80`}
                />
                <div 
                  className="absolute -top-[14px] left-[4px] w-2 h-2 rounded-full z-30 pointer-events-none bg-emerald-500 border border-white shadow-xs"
                  title="Sub-system dependent on Parent Area"
                />
              </>
            ) : (
              /* Component (Level 3 Sub-task) Dependency Line to Parent Sub-system */
              <>
                <div 
                  className={`absolute -top-[14px] left-[7px] w-[1px] h-[14px] border-l border-dotted z-20 pointer-events-none border-indigo-500/80`}
                />
                <div 
                  className="absolute -top-[14px] left-[5px] w-1.5 h-1.5 rounded-full z-30 pointer-events-none bg-indigo-500"
                  title="Component sub-task dependent on Sub-system"
                />
              </>
            )}
          </>
        )}

        {/* Main Gantt Bar */}
        <div
          className={`h-4 border-t border-b flex items-center justify-center font-mono text-[8.5px] sm:text-[9.5px] font-black tracking-tight leading-none transition-all hover:scale-105 hover:brightness-110 ${bgClass} ${isStart ? 'rounded-l-md border-l' : ''} ${isEnd ? 'rounded-r-md border-r' : ''}`}
          title={`${type === 'plan' ? 'Target Rencana' : 'Realisasi Aktual'} (${startDate} s.d ${endDate}) ${percent > 0 ? `: ${percent}%` : ''}`}
        >
          {percent > 0 ? `${percent}%` : ''}
        </div>
      </div>
    );
  };

  // Helper renderer for virtualized row pair
  const renderRowPair = (pair: FlatRowPair) => {
    if (pair.kind === 'category' && pair.category) {
      const group = { category: pair.category, items: pair.categoryItems || [] };
      const groupTotalCost = pair.groupTotalCost || 0;
      const groupWf = pair.groupWf || '0';

      return (
        <React.Fragment key={pair.id}>
          {/* CATEGORY HEADER BAND */}
          <tr className="bg-[#0b2545] text-white font-black uppercase divide-x divide-slate-700 text-xs">
            <td className="sticky left-0 z-20 bg-[#0b2545] px-1 py-1 text-center text-amber-400 min-w-[32px] w-[32px]">
              {group.category.code}
            </td>
            <td className="sticky left-[32px] z-20 bg-[#0b2545] px-2 py-1 text-left font-bold truncate min-w-[350px] w-[350px] max-w-[350px]" colSpan={4}>
              {group.category.name}
            </td>
            <td className="sticky left-[382px] z-20 bg-[#0b2545] px-1 py-1 text-right font-mono font-bold text-amber-300 min-w-[76px] w-[76px] text-[10.5px]">
              Rp {groupTotalCost.toLocaleString('id-ID')}
            </td>
            <td className="sticky left-[458px] z-20 bg-[#0b2545] px-1 py-1 text-center font-mono text-amber-300 min-w-[42px] w-[42px] text-[10.5px]">
              {groupWf}%
            </td>
            <td className="sticky left-[500px] z-20 bg-[#0b2545] px-1 py-1 text-center font-bold text-amber-400 min-w-[172px] w-[172px]" colSpan={2}>
              TARGET PLAN (ROLL-DOWN)
            </td>
            <td className="sticky left-[672px] z-20 bg-[#0b2545] text-amber-400 font-bold text-[9.5px] text-center border-r-2 border-slate-700 shadow-[3px_0_5px_-1px_rgba(0,0,0,0.15)] px-0.5 py-0.5 min-w-[34px] w-[34px]">
              PLAN
            </td>
            {visibleTimelineDates.map((d, dayIdx) => {
              const catPlanVal = getCategoryDailyProgress(group.category.id, d.dateStr, 'plan');
              if (ganttStyle === 'visual') {
                return (
                  <td key={dayIdx} className="w-[32px] min-w-[32px] max-w-[32px] px-0.5 text-center py-1 bg-slate-900/10">
                    {catPlanVal > 0 && (
                      <div className="h-4 bg-[#ffb703]/80 border-t border-b border-[#e9c46a] rounded-sm flex items-center justify-center font-black text-[9px] text-slate-950">
                        {catPlanVal}%
                      </div>
                    )}
                  </td>
                );
              }
              const isEditingCatPlan = editingCell?.itemId === group.category.id && editingCell?.dateStr === d.dateStr && editingCell?.rowType === 'plan';

              return (
                <td
                  key={dayIdx}
                  onClick={() => {
                    if (!isEditingCatPlan) {
                      setEditingCell({ itemId: group.category.id, dateStr: d.dateStr, rowType: 'plan' });
                      setCellInputValue(catPlanVal > 0 ? String(catPlanVal) : '');
                    }
                  }}
                  className={`w-[32px] min-w-[32px] max-w-[32px] px-0.5 text-center py-1 text-[10.5px] font-mono font-bold cursor-pointer transition-all ${
                    catPlanVal > 0 ? 'bg-amber-400 text-slate-950 hover:bg-amber-300' : 'hover:bg-amber-100/30'
                  }`}
                  title={`Klik untuk tetapkan target PLAN Kategori "${group.category.name}" (Roll-Down)`}
                >
                  {isEditingCatPlan ? (
                    <input
                      type="number"
                      min="0"
                      max="100"
                      autoFocus
                      onFocus={(e) => e.target.select()}
                      value={cellInputValue}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setCellInputValue(e.target.value)}
                      onBlur={() => handleSaveCategoryCell(group.category.id, group.category.name, d.dateStr, 'plan')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                        if (e.key === 'Escape') setEditingCell(null);
                      }}
                      className="w-full text-center bg-white text-slate-900 rounded font-bold border border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  ) : (
                    catPlanVal > 0 ? `${catPlanVal}%` : ''
                  )}
                </td>
              );
            })}
          </tr>

          {/* CATEGORY ACTUAL ROW */}
          <tr className="bg-[#134074] text-white font-black uppercase divide-x divide-slate-700 text-xs border-b-2 border-slate-900">
            <td className="sticky left-0 z-20 bg-[#134074] px-1 py-1 text-center text-cyan-300 min-w-[32px] w-[32px]">
              {group.category.code}
            </td>
            <td className="sticky left-[32px] z-20 bg-[#134074] px-2 py-1 text-left font-bold truncate min-w-[350px] w-[350px] max-w-[350px]" colSpan={4}>
              REALISASI ACTUAL {group.category.name}
            </td>
            <td className="sticky left-[382px] z-20 bg-[#134074] px-1 py-1 text-right font-mono font-bold text-cyan-300 min-w-[76px] w-[76px] text-[10.5px]">
              Rp {groupTotalCost.toLocaleString('id-ID')}
            </td>
            <td className="sticky left-[458px] z-20 bg-[#134074] px-1 py-1 text-center font-mono text-cyan-300 min-w-[42px] w-[42px] text-[10.5px]">
              {groupWf}%
            </td>
            <td className="sticky left-[500px] z-20 bg-[#134074] px-1 py-1 text-center font-bold text-cyan-300 min-w-[172px] w-[172px]" colSpan={2}>
              REALISASI ACTUAL (ROLL-DOWN)
            </td>
            <td className="sticky left-[672px] z-20 bg-[#134074] text-cyan-300 font-bold text-[9.5px] text-center border-r-2 border-slate-700 shadow-[3px_0_5px_-1px_rgba(0,0,0,0.15)] px-0.5 py-0.5 min-w-[34px] w-[34px]">
              ACTUAL
            </td>
            {visibleTimelineDates.map((d, dayIdx) => {
              const catActualVal = getCategoryDailyProgress(group.category.id, d.dateStr, 'actual');
              if (ganttStyle === 'visual') {
                return (
                  <td key={dayIdx} className="w-[32px] min-w-[32px] max-w-[32px] px-0.5 text-center py-1 bg-slate-900/20">
                    {catActualVal > 0 && (
                      <div className="h-4 bg-[#00b4d8]/80 border-t border-b border-cyan-400 rounded-sm flex items-center justify-center font-black text-[9px] text-white">
                        {catActualVal}%
                      </div>
                    )}
                  </td>
                );
              }
              const isEditingCatActual = editingCell?.itemId === group.category.id && editingCell?.dateStr === d.dateStr && editingCell?.rowType === 'actual';

              return (
                <td
                  key={dayIdx}
                  onClick={() => {
                    if (!isEditingCatActual) {
                      setEditingCell({ itemId: group.category.id, dateStr: d.dateStr, rowType: 'actual' });
                      setCellInputValue(catActualVal > 0 ? String(catActualVal) : '');
                    }
                  }}
                  className={`w-[32px] min-w-[32px] max-w-[32px] px-0.5 text-center py-1 text-[10.5px] font-mono font-bold cursor-pointer transition-all ${
                    catActualVal >= 100
                      ? 'bg-emerald-500 text-white font-black shadow-xs'
                      : catActualVal > 0
                      ? 'bg-cyan-400 text-white font-bold hover:bg-cyan-500'
                      : 'hover:bg-cyan-100/30 text-slate-300'
                  }`}
                  title={`Klik untuk tetapkan realisasi ACTUAL Kategori "${group.category.name}" (Roll-Down)`}
                >
                  {isEditingCatActual ? (
                    <input
                      type="number"
                      min="0"
                      max="100"
                      autoFocus
                      onFocus={(e) => e.target.select()}
                      value={cellInputValue}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setCellInputValue(e.target.value)}
                      onBlur={() => handleSaveCategoryCell(group.category.id, group.category.name, d.dateStr, 'actual')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                        if (e.key === 'Escape') setEditingCell(null);
                      }}
                      className="w-full text-center bg-white text-slate-900 rounded font-bold border border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  ) : (
                    catActualVal > 0 ? `${catActualVal}%` : ''
                  )}
                </td>
              );
            })}
          </tr>
        </React.Fragment>
      );
    }

    if (pair.kind === 'area' && pair.area) {
      const area = pair.area;
      const areaSubSystems = pair.areaSubSystems || [];
      const areaComponents = pair.areaComponents || [];
      const descendantLeaves = pair.descendantLeaves || [];
      const isAreaExpanded = Boolean(pair.isAreaExpanded);

      const nodeTotalCost = descendantLeaves.reduce((acc, c) => acc + (c.totalPrice || 0), 0);
      const nodeMetrics = computeNodeMetrics(area);
      const nodeDisplayQty = nodeMetrics.displayQty;
      const nodeDisplayUnit = nodeMetrics.displayUnit;
      const nodeDisplayPrice = nodeMetrics.displayUnitPrice;
      const nodeWf = nodeMetrics.wf;

      let nodeStart = area.startDate || '';
      let nodeEnd = area.targetEndDate || '';
      if (!nodeStart && descendantLeaves.length > 0) {
        const starts = descendantLeaves.map((c) => c.startDate).filter(Boolean) as string[];
        if (starts.length > 0) nodeStart = starts.sort()[0];
      }
      if (!nodeEnd && descendantLeaves.length > 0) {
        const ends = descendantLeaves.map((c) => c.targetEndDate).filter(Boolean) as string[];
        if (ends.length > 0) nodeEnd = ends.sort().reverse()[0];
      }

      let nodeActualStart = area.actualStartDate || '';
      let nodeActualEnd = area.actualEndDate || '';
      if (!nodeActualStart && descendantLeaves.length > 0) {
        const starts = descendantLeaves.map((c) => c.actualStartDate).filter(Boolean) as string[];
        if (starts.length > 0) nodeActualStart = starts.sort()[0];
      }
      if (!nodeActualEnd && descendantLeaves.length > 0) {
        const ends = descendantLeaves.map((c) => c.actualEndDate).filter(Boolean) as string[];
        if (ends.length > 0) nodeActualEnd = ends.sort().reverse()[0];
      }

      const totalDescendants = areaSubSystems.length + areaComponents.length;

      return (
        <React.Fragment key={pair.id}>
          {/* AREA PLAN ROW */}
          <tr className="bg-slate-200 border-slate-300 hover:bg-slate-300 transition-colors divide-x divide-slate-300 text-slate-900 font-extrabold border-t border-b text-xs">
            <td className="sticky left-0 z-10 bg-slate-200 text-center px-1 py-1 font-bold text-slate-900 font-mono min-w-[32px] w-[32px]" rowSpan={2}>
              {area.itemNo}
            </td>
            <td className="sticky left-[32px] z-10 bg-slate-200 pl-2 pr-1 py-1 font-extrabold text-[#0b2545] truncate min-w-[210px] max-w-[210px] w-[210px]" title={area.description} rowSpan={2}>
              <div className="flex items-center gap-1">
                {totalDescendants > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleNodeExpand(area.id);
                    }}
                    className="p-0.5 rounded hover:bg-slate-300 text-slate-800 cursor-pointer shrink-0"
                    title={isAreaExpanded ? "Sembunyikan Sub-Sistem/Komponen" : "Tampilkan Sub-Sistem/Komponen"}
                  >
                    {isAreaExpanded ? <ChevronDown className="w-4 h-4 text-amber-800" /> : <ChevronRight className="w-4 h-4 text-slate-700" />}
                  </button>
                )}
                <span className="font-extrabold text-[#0b2545] text-xs truncate">
                  📂 {area.description}
                </span>
                {totalDescendants > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 bg-slate-300 text-slate-800 border border-slate-400 rounded-full text-[9px] font-mono font-black shrink-0">
                    {areaSubSystems.length > 0 ? `${areaSubSystems.length}S` : `${areaComponents.length}I`}
                  </span>
                )}
              </div>
            </td>
            <td className="sticky left-[242px] z-10 bg-slate-200 text-center px-1 py-1 font-mono font-bold text-slate-800 min-w-[40px] w-[40px] text-[11px]" rowSpan={2} title="Penjumlahan berat terakumulasi Area">
              {nodeDisplayQty !== null && nodeDisplayQty > 0 ? (nodeDisplayQty % 1 === 0 ? nodeDisplayQty : nodeDisplayQty.toLocaleString('id-ID', { maximumFractionDigits: 2 })) : '-'}
            </td>
            <td className="sticky left-[282px] z-10 bg-slate-200 text-center px-1 py-1 font-mono text-[10.5px] font-bold text-slate-700 min-w-[32px] w-[32px]" rowSpan={2}>
              {nodeDisplayUnit}
            </td>
            <td className="sticky left-[314px] z-10 bg-slate-200 text-right px-1 py-1 font-mono font-bold text-slate-700 text-[10px] min-w-[68px] w-[68px]" rowSpan={2}>
              {nodeDisplayPrice !== null && nodeDisplayPrice > 0 ? nodeDisplayPrice.toLocaleString('id-ID') : '-'}
            </td>
            <td className="sticky left-[382px] z-10 bg-slate-200 text-right px-1 py-1 font-mono font-black text-[#0b2545] text-[10.5px] min-w-[76px] w-[76px]" rowSpan={2} title="Total biaya terakumulasi Area">
              Rp {nodeTotalCost.toLocaleString('id-ID')}
            </td>
            <td
              className="sticky left-[458px] z-10 bg-slate-200 text-center px-1 py-1 font-mono font-black text-amber-900 cursor-pointer hover:bg-amber-200 transition-colors min-w-[42px] w-[42px] text-[11px]"
              rowSpan={2}
              onClick={(e) => {
                e.stopPropagation();
                setEditingWfItemId(area.id);
                setWfInputValue(nodeWf);
              }}
              title="Klik untuk edit Bobot WF (%) Area ini"
            >
              {editingWfItemId === area.id ? (
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  autoFocus
                  onFocus={(e) => e.target.select()}
                  value={wfInputValue}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setWfInputValue(e.target.value)}
                  onBlur={() => handleSaveWf(area, parseFloat(wfInputValue))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveWf(area, parseFloat(wfInputValue));
                    if (e.key === 'Escape') setEditingWfItemId(null);
                  }}
                  className="w-11 text-[10px] text-center bg-white text-slate-900 rounded font-bold border border-amber-600 focus:outline-none"
                />
              ) : (
                `${nodeWf}%`
              )}
            </td>

            {/* Area Plan Date Pickers */}
            <td className="sticky left-[500px] z-10 bg-[#fffbeb] text-center px-1 py-1 min-w-[86px] w-[86px]">
              <input
                type="date"
                value={nodeStart}
                title="Tanggal Mulai Rencana Area (Otomatis menerapkan ke seluruh turunan)"
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  if (descendantLeaves.length > 0) {
                    handleUpdateMultipleItemDates(descendantLeaves.map((c) => c.id), 'startDate', e.target.value);
                  } else {
                    handleUpdateItemDates(area.id, 'startDate', e.target.value);
                  }
                }}
                className="w-[82px] text-[10px] font-mono font-bold bg-white border border-amber-300 rounded px-1 py-0.5 text-center cursor-pointer focus:ring-1 focus:ring-amber-500"
              />
            </td>

            <td className="sticky left-[586px] z-10 bg-[#fffbeb] text-center px-1 py-1 min-w-[86px] w-[86px]">
              <input
                type="date"
                value={nodeEnd}
                title="Tanggal Selesai Rencana Area (Otomatis menerapkan ke seluruh turunan)"
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  if (descendantLeaves.length > 0) {
                    handleUpdateMultipleItemDates(descendantLeaves.map((c) => c.id), 'targetEndDate', e.target.value);
                  } else {
                    handleUpdateItemDates(area.id, 'targetEndDate', e.target.value);
                  }
                }}
                className="w-[82px] text-[10px] font-mono font-bold bg-white border border-amber-300 rounded px-1 py-0.5 text-center cursor-pointer focus:ring-1 focus:ring-amber-500"
              />
            </td>

            <td className="sticky left-[672px] z-10 bg-amber-300 text-amber-950 font-black text-[9.5px] text-center border-r-2 border-amber-600 shadow-[3px_0_5px_-1px_rgba(0,0,0,0.12)] px-0.5 py-0.5 min-w-[34px] w-[34px]">
              PLAN
            </td>

            {/* AREA PLAN CELLS */}
            {visibleTimelineDates.map((d, dayIdx) => {
              const nodePlanVal = getNodeDailyProgress(area, d.dateStr, 'plan');
              if (ganttStyle === 'visual') {
                return (
                  <td key={dayIdx} className="w-[32px] min-w-[32px] max-w-[32px] px-0.5 py-0.5 bg-slate-200/50">
                    {renderVisualGanttCell(nodeStart, nodeEnd, d.dateStr, 'plan', nodePlanVal, 1)}
                  </td>
                );
              }
              const isEditingNodePlan = editingCell?.itemId === area.id && editingCell?.dateStr === d.dateStr && editingCell?.rowType === 'plan';

              return (
                <td
                  key={dayIdx}
                  onClick={() => {
                    if (!isEditingNodePlan) {
                      setEditingCell({ itemId: area.id, dateStr: d.dateStr, rowType: 'plan' });
                      setCellInputValue(nodePlanVal > 0 ? String(nodePlanVal) : '');
                    }
                  }}
                  className={`w-[32px] min-w-[32px] max-w-[32px] px-0.5 text-center py-1 text-[10.5px] font-mono font-bold cursor-pointer transition-all ${
                    nodePlanVal >= 100
                      ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                      : nodePlanVal > 0
                      ? 'bg-[#ffb703] text-slate-950 shadow-xs hover:bg-amber-300'
                      : 'hover:bg-amber-100/60 text-slate-300'
                  }`}
                  title={`Klik untuk tetapkan target PLAN "${area.description}" (Roll-Down)`}
                >
                  {isEditingNodePlan ? (
                    <input
                      type="number"
                      min="0"
                      max="100"
                      autoFocus
                      onFocus={(e) => e.target.select()}
                      value={cellInputValue}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setCellInputValue(e.target.value)}
                      onBlur={() => handleSaveCell(area, d.dateStr, 'plan')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                        if (e.key === 'Escape') setEditingCell(null);
                      }}
                      className="w-full text-center bg-white text-slate-900 rounded font-bold border border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  ) : (
                    nodePlanVal > 0 ? `${nodePlanVal}%` : ''
                  )}
                </td>
              );
            })}
          </tr>

          {/* AREA ACTUAL ROW */}
          <tr className="bg-slate-100 hover:bg-cyan-100/30 transition-colors divide-x divide-slate-200 text-slate-800 font-extrabold text-xs border-b-2 border-slate-400">
            {/* Area Actual Date Pickers */}
            <td className="sticky left-[500px] z-10 bg-[#ecfeff] text-center px-1 py-1 min-w-[86px] w-[86px]">
              <input
                type="date"
                value={nodeActualStart}
                title="Tanggal Mulai Realisasi Area"
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  if (descendantLeaves.length > 0) {
                    handleUpdateMultipleItemDates(descendantLeaves.map((c) => c.id), 'actualStartDate', e.target.value);
                  } else {
                    handleUpdateItemDates(area.id, 'actualStartDate', e.target.value);
                  }
                }}
                className="w-[82px] text-[10px] font-mono font-bold bg-white border border-cyan-300 rounded px-1 py-0.5 text-center cursor-pointer focus:ring-1 focus:ring-cyan-500"
              />
            </td>

            <td className="sticky left-[586px] z-10 bg-[#ecfeff] text-center px-1 py-1 min-w-[86px] w-[86px]">
              <input
                type="date"
                value={nodeActualEnd}
                title="Tanggal Selesai Realisasi Area"
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  if (descendantLeaves.length > 0) {
                    handleUpdateMultipleItemDates(descendantLeaves.map((c) => c.id), 'actualEndDate', e.target.value);
                  } else {
                    handleUpdateItemDates(area.id, 'actualEndDate', e.target.value);
                  }
                }}
                className="w-[82px] text-[10px] font-mono font-bold bg-white border border-cyan-300 rounded px-1 py-0.5 text-center cursor-pointer focus:ring-1 focus:ring-cyan-500"
              />
            </td>

            <td className="sticky left-[672px] z-10 bg-cyan-200 text-cyan-950 font-bold text-[9.5px] text-center border-r-2 border-cyan-600 shadow-[3px_0_5px_-1px_rgba(0,0,0,0.12)] px-0.5 py-0.5 min-w-[34px] w-[34px]">
              ACTUAL
            </td>

            {/* AREA ACTUAL CELLS */}
            {visibleTimelineDates.map((d, dayIdx) => {
              const nodeActualVal = getNodeDailyProgress(area, d.dateStr, 'actual');
              if (ganttStyle === 'visual') {
                return (
                  <td key={dayIdx} className="w-[32px] min-w-[32px] max-w-[32px] px-0.5 py-0.5 bg-slate-100/50">
                    {renderVisualGanttCell(nodeActualStart, nodeActualEnd, d.dateStr, 'actual', nodeActualVal, 1)}
                  </td>
                );
              }
              const isEditingNodeActual = editingCell?.itemId === area.id && editingCell?.dateStr === d.dateStr && editingCell?.rowType === 'actual';

              return (
                <td
                  key={dayIdx}
                  onClick={() => {
                    if (!isEditingNodeActual) {
                      setEditingCell({ itemId: area.id, dateStr: d.dateStr, rowType: 'actual' });
                      setCellInputValue(nodeActualVal > 0 ? String(nodeActualVal) : '');
                    }
                  }}
                  className={`w-[32px] min-w-[32px] max-w-[32px] px-0.5 text-center py-1 text-[10.5px] font-mono font-bold cursor-pointer transition-all ${
                    nodeActualVal >= 100
                      ? 'bg-emerald-500 text-white font-black shadow-xs'
                      : nodeActualVal > 0
                      ? 'bg-[#00b4d8] text-white shadow-xs hover:bg-cyan-500'
                      : 'hover:bg-cyan-200 hover:text-cyan-900 text-slate-300'
                  }`}
                  title={`Klik untuk isi/edit realisasi ACTUAL "${area.description}" (tgl ${d.dateStr})`}
                >
                  {isEditingNodeActual ? (
                    <input
                      type="number"
                      min="0"
                      max="100"
                      autoFocus
                      onFocus={(e) => e.target.select()}
                      value={cellInputValue}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setCellInputValue(e.target.value)}
                      onBlur={() => handleSaveCell(area, d.dateStr, 'actual')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                        if (e.key === 'Escape') setEditingCell(null);
                      }}
                      className="w-full text-center bg-white text-slate-900 rounded font-bold border-2 border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  ) : (
                    nodeActualVal > 0 ? `${nodeActualVal}%` : ''
                  )}
                </td>
              );
            })}
          </tr>
        </React.Fragment>
      );
    }

    if (pair.kind === 'subsystem' && pair.subSystem) {
      const subSystem = pair.subSystem;
      const subComponents = pair.subComponents || [];
      const subLeaves = pair.subLeaves || [];
      const isSubExpanded = Boolean(pair.isSubExpanded);

      const subMetrics = computeNodeMetrics(subSystem);
      const subDisplayQty = subMetrics.displayQty;
      const subDisplayUnit = subMetrics.displayUnit;
      const subDisplayPrice = subMetrics.displayUnitPrice;
      const subTotalCost = subMetrics.totalCost;
      const subWf = subMetrics.wf;

      let subStart = subSystem.startDate || '';
      let subEnd = subSystem.targetEndDate || '';
      if (!subStart && subLeaves.length > 0) {
        const starts = subLeaves.map((c) => c.startDate).filter(Boolean) as string[];
        if (starts.length > 0) subStart = starts.sort()[0];
      }
      if (!subEnd && subLeaves.length > 0) {
        const ends = subLeaves.map((c) => c.targetEndDate).filter(Boolean) as string[];
        if (ends.length > 0) subEnd = ends.sort().reverse()[0];
      }

      let subActualStart = subSystem.actualStartDate || '';
      let subActualEnd = subSystem.actualEndDate || '';
      if (!subActualStart && subLeaves.length > 0) {
        const starts = subLeaves.map((c) => c.actualStartDate).filter(Boolean) as string[];
        if (starts.length > 0) subActualStart = starts.sort()[0];
      }
      if (!subActualEnd && subLeaves.length > 0) {
        const ends = subLeaves.map((c) => c.actualEndDate).filter(Boolean) as string[];
        if (ends.length > 0) subActualEnd = ends.sort().reverse()[0];
      }

      return (
        <React.Fragment key={pair.id}>
          {/* SUB-SYSTEM PLAN ROW */}
          <tr className="bg-[#ecfdf5] border-emerald-200 hover:bg-amber-100 transition-colors divide-x divide-slate-300 text-slate-800 font-bold border-t border-b text-xs">
            <td className="sticky left-0 z-10 bg-[#ecfdf5] text-center px-1 py-1 font-bold text-emerald-950 font-mono min-w-[32px] w-[32px]" rowSpan={2}>
              {subSystem.itemNo}
            </td>
            <td className="sticky left-[32px] z-10 bg-[#ecfdf5] pl-3 pr-1 py-1 font-bold text-[#0b2545] truncate min-w-[210px] max-w-[210px] w-[210px]" title={subSystem.description} rowSpan={2}>
              <div className="flex items-center gap-1">
                {subComponents.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleNodeExpand(subSystem.id);
                    }}
                    className="p-0.5 rounded hover:bg-emerald-200 text-emerald-800 cursor-pointer shrink-0"
                    title={isSubExpanded ? "Sembunyikan Komponen" : "Tampilkan Komponen"}
                  >
                    {isSubExpanded ? <ChevronDown className="w-4 h-4 text-amber-700" /> : <ChevronRight className="w-4 h-4 text-slate-600" />}
                  </button>
                )}
                <span className="font-bold text-[#0b2545] text-xs truncate">
                  ⚙️ {subSystem.description}
                </span>
                {subComponents.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-full text-[9px] font-mono font-bold shrink-0">
                    {subComponents.length}
                  </span>
                )}
              </div>
            </td>
            <td className="sticky left-[242px] z-10 bg-[#ecfdf5] text-center px-1 py-1 font-mono font-bold text-emerald-950 min-w-[40px] w-[40px] text-[11px]" rowSpan={2} title="Penjumlahan berat komponen">
              {subDisplayQty !== null && subDisplayQty > 0 ? (subDisplayQty % 1 === 0 ? subDisplayQty : subDisplayQty.toLocaleString('id-ID', { maximumFractionDigits: 2 })) : '-'}
            </td>
            <td className="sticky left-[282px] z-10 bg-[#ecfdf5] text-center px-1 py-1 font-mono text-[10.5px] font-bold text-emerald-800 min-w-[32px] w-[32px]" rowSpan={2}>
              {subDisplayUnit}
            </td>
            <td className="sticky left-[314px] z-10 bg-[#ecfdf5] text-right px-1 py-1 font-mono font-bold text-emerald-900 text-[10px] min-w-[68px] w-[68px]" rowSpan={2}>
              {subDisplayPrice !== null && subDisplayPrice > 0 ? subDisplayPrice.toLocaleString('id-ID') : '-'}
            </td>
            <td className="sticky left-[382px] z-10 bg-[#ecfdf5] text-right px-1 py-1 font-mono font-bold text-[#0b2545] text-[10.5px] min-w-[76px] w-[76px]" rowSpan={2} title="Sub-total biaya komponen">
              Rp {subTotalCost.toLocaleString('id-ID')}
            </td>
            <td
              className="sticky left-[458px] z-10 bg-[#ecfdf5] text-center px-1 py-1 font-mono font-bold text-amber-800 cursor-pointer hover:bg-emerald-100 transition-colors min-w-[42px] w-[42px] text-[11px]"
              rowSpan={2}
              onClick={(e) => {
                e.stopPropagation();
                setEditingWfItemId(subSystem.id);
                setWfInputValue(subWf);
              }}
              title="Klik untuk edit Bobot WF (%) Sub-Sistem ini"
            >
              {editingWfItemId === subSystem.id ? (
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  autoFocus
                  onFocus={(e) => e.target.select()}
                  value={wfInputValue}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setWfInputValue(e.target.value)}
                  onBlur={() => handleSaveWf(subSystem, parseFloat(wfInputValue))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveWf(subSystem, parseFloat(wfInputValue));
                    if (e.key === 'Escape') setEditingWfItemId(null);
                  }}
                  className="w-11 text-[10px] text-center bg-white text-slate-900 rounded font-bold border border-amber-600 focus:outline-none"
                />
              ) : (
                `${subWf}%`
              )}
            </td>

            {/* Sub-System Plan Date Pickers */}
            <td className="sticky left-[500px] z-10 bg-[#fffbeb] text-center px-1 py-1 min-w-[86px] w-[86px]">
              <input
                type="date"
                value={subStart}
                title="Tanggal Mulai Rencana Sub-Sistem"
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  if (subLeaves.length > 0) {
                    handleUpdateMultipleItemDates(subLeaves.map((c) => c.id), 'startDate', e.target.value);
                  } else {
                    handleUpdateItemDates(subSystem.id, 'startDate', e.target.value);
                  }
                }}
                className="w-[82px] text-[10px] font-mono font-bold bg-white border border-amber-300 rounded px-1 py-0.5 text-center cursor-pointer focus:ring-1 focus:ring-amber-500"
              />
            </td>

            <td className="sticky left-[586px] z-10 bg-[#fffbeb] text-center px-1 py-1 min-w-[86px] w-[86px]">
              <input
                type="date"
                value={subEnd}
                title="Tanggal Selesai Rencana Sub-Sistem"
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  if (subLeaves.length > 0) {
                    handleUpdateMultipleItemDates(subLeaves.map((c) => c.id), 'targetEndDate', e.target.value);
                  } else {
                    handleUpdateItemDates(subSystem.id, 'targetEndDate', e.target.value);
                  }
                }}
                className="w-[82px] text-[10px] font-mono font-bold bg-white border border-amber-300 rounded px-1 py-0.5 text-center cursor-pointer focus:ring-1 focus:ring-amber-500"
              />
            </td>

            <td className="sticky left-[672px] z-10 bg-amber-200 text-amber-950 font-bold text-[9.5px] text-center border-r-2 border-amber-500 shadow-[3px_0_5px_-1px_rgba(0,0,0,0.12)] px-0.5 py-0.5 min-w-[34px] w-[34px]">
              PLAN
            </td>

            {/* SUB-SYSTEM PLAN CELLS */}
            {visibleTimelineDates.map((d, dayIdx) => {
              const subPlanVal = getNodeDailyProgress(subSystem, d.dateStr, 'plan');
              if (ganttStyle === 'visual') {
                return (
                  <td key={dayIdx} className="w-[32px] min-w-[32px] max-w-[32px] px-0.5 py-0.5 bg-[#ecfdf5]">
                    {renderVisualGanttCell(subStart, subEnd, d.dateStr, 'plan', subPlanVal, 2)}
                  </td>
                );
              }
              const isEditingSubPlan = editingCell?.itemId === subSystem.id && editingCell?.dateStr === d.dateStr && editingCell?.rowType === 'plan';

              return (
                <td
                  key={dayIdx}
                  onClick={() => {
                    if (!isEditingSubPlan) {
                      setEditingCell({ itemId: subSystem.id, dateStr: d.dateStr, rowType: 'plan' });
                      setCellInputValue(subPlanVal > 0 ? String(subPlanVal) : '');
                    }
                  }}
                  className={`w-[32px] min-w-[32px] max-w-[32px] px-0.5 text-center py-1 text-[10.5px] font-mono font-bold cursor-pointer transition-all ${
                    subPlanVal >= 100
                      ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                      : subPlanVal > 0
                      ? 'bg-[#ffb703] text-slate-950 hover:bg-amber-300 shadow-xs'
                      : 'hover:bg-amber-100/60 text-slate-300'
                  }`}
                  title={`Klik untuk tetapkan target PLAN Sub-System "${subSystem.description}" (Roll-Down)`}
                >
                  {isEditingSubPlan ? (
                    <input
                      type="number"
                      min="0"
                      max="100"
                      autoFocus
                      onFocus={(e) => e.target.select()}
                      value={cellInputValue}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setCellInputValue(e.target.value)}
                      onBlur={() => handleSaveCell(subSystem, d.dateStr, 'plan')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                        if (e.key === 'Escape') setEditingCell(null);
                      }}
                      className="w-full text-center bg-white text-slate-900 rounded font-bold border border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  ) : (
                    subPlanVal > 0 ? `${subPlanVal}%` : ''
                  )}
                </td>
              );
            })}
          </tr>

          {/* SUB-SYSTEM ACTUAL ROW */}
          <tr className="bg-white hover:bg-cyan-50 transition-colors divide-x divide-slate-200 text-slate-700 text-xs border-b border-slate-300">
            {/* Sub-System Actual Date Pickers */}
            <td className="sticky left-[500px] z-10 bg-[#ecfeff] text-center px-1 py-1 min-w-[86px] w-[86px]">
              <input
                type="date"
                value={subActualStart}
                title="Tanggal Mulai Realisasi Sub-Sistem"
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  if (subLeaves.length > 0) {
                    handleUpdateMultipleItemDates(subLeaves.map((c) => c.id), 'actualStartDate', e.target.value);
                  } else {
                    handleUpdateItemDates(subSystem.id, 'actualStartDate', e.target.value);
                  }
                }}
                className="w-[82px] text-[10px] font-mono font-bold bg-white border border-cyan-300 rounded px-1 py-0.5 text-center cursor-pointer focus:ring-1 focus:ring-cyan-500"
              />
            </td>

            <td className="sticky left-[586px] z-10 bg-[#ecfeff] text-center px-1 py-1 min-w-[86px] w-[86px]">
              <input
                type="date"
                value={subActualEnd}
                title="Tanggal Selesai Realisasi Sub-Sistem"
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  if (subLeaves.length > 0) {
                    handleUpdateMultipleItemDates(subLeaves.map((c) => c.id), 'actualEndDate', e.target.value);
                  } else {
                    handleUpdateItemDates(subSystem.id, 'actualEndDate', e.target.value);
                  }
                }}
                className="w-[82px] text-[10px] font-mono font-bold bg-white border border-cyan-300 rounded px-1 py-0.5 text-center cursor-pointer focus:ring-1 focus:ring-cyan-500"
              />
            </td>

            <td className="sticky left-[672px] z-10 bg-cyan-200 text-cyan-950 font-bold text-[9.5px] text-center border-r-2 border-cyan-600 shadow-[3px_0_5px_-1px_rgba(0,0,0,0.12)] px-0.5 py-0.5 min-w-[34px] w-[34px]">
              ACTUAL
            </td>

            {/* SUB-SYSTEM ACTUAL CELLS */}
            {visibleTimelineDates.map((d, dayIdx) => {
              const subActualVal = getNodeDailyProgress(subSystem, d.dateStr, 'actual');
              if (ganttStyle === 'visual') {
                return (
                  <td key={dayIdx} className="w-[32px] min-w-[32px] max-w-[32px] px-0.5 py-0.5 bg-white">
                    {renderVisualGanttCell(subActualStart, subActualEnd, d.dateStr, 'actual', subActualVal, 2)}
                  </td>
                );
              }
              const isEditingSubActual = editingCell?.itemId === subSystem.id && editingCell?.dateStr === d.dateStr && editingCell?.rowType === 'actual';

              return (
                <td
                  key={dayIdx}
                  onClick={() => {
                    if (!isEditingSubActual) {
                      setEditingCell({ itemId: subSystem.id, dateStr: d.dateStr, rowType: 'actual' });
                      setCellInputValue(subActualVal > 0 ? String(subActualVal) : '');
                    }
                  }}
                  className={`w-[32px] min-w-[32px] max-w-[32px] px-0.5 text-center py-1 text-[10.5px] font-mono font-bold cursor-pointer transition-all ${
                    subActualVal >= 100
                      ? 'bg-emerald-500 text-white font-black shadow-xs'
                      : subActualVal > 0
                      ? 'bg-[#00b4d8] text-white hover:bg-cyan-500 shadow-xs'
                      : 'hover:bg-cyan-100 hover:text-cyan-800 text-slate-300'
                  }`}
                  title={`Klik untuk tetapkan realisasi ACTUAL Sub-System "${subSystem.description}" (Roll-Down)`}
                >
                  {isEditingSubActual ? (
                    <input
                      type="number"
                      min="0"
                      max="100"
                      autoFocus
                      onFocus={(e) => e.target.select()}
                      value={cellInputValue}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setCellInputValue(e.target.value)}
                      onBlur={() => handleSaveCell(subSystem, d.dateStr, 'actual')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                        if (e.key === 'Escape') setEditingCell(null);
                      }}
                      className="w-full text-center bg-white text-slate-900 rounded font-bold border border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  ) : (
                    subActualVal > 0 ? `${subActualVal}%` : ''
                  )}
                </td>
              );
            })}
          </tr>
        </React.Fragment>
      );
    }

    if (pair.kind === 'component' && pair.comp) {
      const comp = pair.comp;
      const compWf = globalTotalCost > 0 ? (((comp.totalPrice || 0) / globalTotalCost) * 100).toFixed(2) : '0.00';

      return (
        <React.Fragment key={pair.id}>
          {/* COMPONENT PLAN ROW */}
          <tr className="bg-white hover:bg-amber-50/50 transition-colors divide-x divide-slate-200 text-slate-700 text-xs border-b border-slate-100">
            <td className="sticky left-0 z-10 bg-white text-center px-1 py-0.5 font-mono text-slate-500 min-w-[32px] w-[32px]" rowSpan={2}>
              {comp.itemNo}
            </td>

            <td className="sticky left-[32px] z-10 bg-white pl-4 pr-1 py-0.5 font-medium text-slate-800 truncate min-w-[210px] max-w-[210px] w-[210px]" title={comp.description} rowSpan={2}>
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-slate-400 font-mono text-[10px]">└</span>
                <span className="truncate text-xs font-semibold text-slate-800">{comp.description}</span>
              </div>
            </td>

            <td className="sticky left-[242px] z-10 bg-white text-center px-1 py-0.5 font-mono min-w-[40px] w-[40px] text-[11px]" rowSpan={2}>{comp.qty}</td>
            <td className="sticky left-[282px] z-10 bg-white text-center px-1 py-0.5 text-slate-400 min-w-[32px] w-[32px]" rowSpan={2}>{comp.unit}</td>

            <td className="sticky left-[314px] z-10 bg-white text-right px-1 py-0.5 font-mono text-slate-500 text-[10px] min-w-[68px] w-[68px]" rowSpan={2}>
              {(comp.unitPrice || 0).toLocaleString('id-ID')}
            </td>

            <td className="sticky left-[382px] z-10 bg-white text-right px-1 py-0.5 font-mono font-semibold text-slate-700 text-[10.5px] min-w-[76px] w-[76px]" rowSpan={2}>
              {(comp.totalPrice || 0).toLocaleString('id-ID')}
            </td>

            <td
              className="sticky left-[458px] z-10 bg-white text-center px-1 py-0.5 font-mono text-amber-700 font-bold cursor-pointer hover:bg-amber-100 transition-colors min-w-[42px] w-[42px] text-[11px]"
              rowSpan={2}
              onClick={(e) => {
                e.stopPropagation();
                setEditingWfItemId(comp.id);
                setWfInputValue(compWf);
              }}
              title="Klik untuk edit Bobot WF (%) komponen ini"
            >
              {editingWfItemId === comp.id ? (
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  autoFocus
                  onFocus={(e) => e.target.select()}
                  value={wfInputValue}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setWfInputValue(e.target.value)}
                  onBlur={() => handleSaveWf(comp, parseFloat(wfInputValue))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveWf(comp, parseFloat(wfInputValue));
                    if (e.key === 'Escape') setEditingWfItemId(null);
                  }}
                  className="w-11 text-[10px] text-center bg-white text-slate-900 rounded font-bold border border-amber-600 focus:outline-none"
                />
              ) : (
                `${compWf}%`
              )}
            </td>

            {/* Direct Component Plan Date Pickers */}
            <td className="sticky left-[500px] z-10 bg-[#fffbeb] text-center px-1 py-0.5 min-w-[86px] w-[86px]">
              <input
                type="date"
                value={comp.startDate || ''}
                title="Tanggal Mulai Rencana"
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => handleUpdateItemDates(comp.id, 'startDate', e.target.value)}
                className="w-[82px] text-[10px] font-mono bg-white border border-amber-300 rounded px-1 py-0.5 text-center focus:ring-1 focus:ring-amber-500"
              />
            </td>

            <td className="sticky left-[586px] z-10 bg-[#fffbeb] text-center px-1 py-0.5 min-w-[86px] w-[86px]">
              <input
                type="date"
                value={comp.targetEndDate || ''}
                title="Tanggal Selesai Rencana"
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => handleUpdateItemDates(comp.id, 'targetEndDate', e.target.value)}
                className="w-[82px] text-[10px] font-mono bg-white border border-amber-300 rounded px-1 py-0.5 text-center focus:ring-1 focus:ring-amber-500"
              />
            </td>

            <td className="sticky left-[672px] z-10 bg-[#fffbeb] text-amber-800 text-[9.5px] text-center border-r-2 border-amber-300 shadow-[3px_0_5px_-1px_rgba(0,0,0,0.1)] px-0.5 py-0.5 font-mono min-w-[34px] w-[34px] font-bold">
              P
            </td>

            {visibleTimelineDates.map((d, dayIdx) => {
              const cPlan = itemDailyProgressMap.planMap.get(comp.id)?.[d.dateStr] || 0;
              if (ganttStyle === 'visual') {
                return (
                  <td key={dayIdx} className="w-[32px] min-w-[32px] max-w-[32px] px-0.5 py-0.5 bg-white">
                    {renderVisualGanttCell(comp.startDate, comp.targetEndDate, d.dateStr, 'plan', cPlan, 3)}
                  </td>
                );
              }
              const isEditingCPlan = editingCell?.itemId === comp.id && editingCell?.dateStr === d.dateStr && editingCell?.rowType === 'plan';

              return (
                <td
                  key={dayIdx}
                  onClick={() => {
                    if (!isEditingCPlan) {
                      setEditingCell({ itemId: comp.id, dateStr: d.dateStr, rowType: 'plan' });
                      setCellInputValue(cPlan > 0 ? String(cPlan) : '');
                    }
                  }}
                  className={`w-[32px] min-w-[32px] max-w-[32px] px-0.5 text-center py-1 text-[10px] font-mono cursor-pointer transition-all ${
                    cPlan >= 100
                      ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                      : cPlan > 0
                      ? 'bg-amber-300 text-slate-950 font-bold shadow-xs'
                      : 'hover:bg-amber-100/60 text-slate-300'
                  }`}
                >
                  {isEditingCPlan ? (
                    <input
                      type="number"
                      min="0"
                      max="100"
                      autoFocus
                      onFocus={(e) => e.target.select()}
                      value={cellInputValue}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setCellInputValue(e.target.value)}
                      onBlur={() => handleSaveCell(comp, d.dateStr, 'plan')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                        if (e.key === 'Escape') setEditingCell(null);
                      }}
                      className="w-full text-center bg-white border border-amber-500 text-[10px]"
                    />
                  ) : (
                    cPlan > 0 ? `${cPlan}%` : ''
                  )}
                </td>
              );
            })}
          </tr>

          {/* COMPONENT ACTUAL ROW */}
          <tr className="bg-white hover:bg-cyan-50/50 transition-colors divide-x divide-slate-200 text-slate-600 text-xs border-b border-slate-200">
            {/* Direct Component Actual Date Pickers */}
            <td className="sticky left-[500px] z-10 bg-[#ecfeff] text-center px-1 py-0.5 min-w-[86px] w-[86px]">
              <input
                type="date"
                value={comp.actualStartDate || ''}
                title="Tanggal Mulai Realisasi"
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => handleUpdateItemDates(comp.id, 'actualStartDate', e.target.value)}
                className="w-[82px] text-[10px] font-mono bg-white border border-cyan-300 rounded px-1 py-0.5 text-center cursor-pointer focus:ring-1 focus:ring-cyan-500"
              />
            </td>

            <td className="sticky left-[586px] z-10 bg-[#ecfeff] text-center px-1 py-0.5 min-w-[86px] w-[86px]">
              <input
                type="date"
                value={comp.actualEndDate || ''}
                title="Tanggal Selesai Realisasi"
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => handleUpdateItemDates(comp.id, 'actualEndDate', e.target.value)}
                className="w-[82px] text-[10px] font-mono bg-white border border-cyan-300 rounded px-1 py-0.5 text-center cursor-pointer focus:ring-1 focus:ring-cyan-500"
              />
            </td>

            <td className="sticky left-[672px] z-10 bg-[#ecfeff] text-cyan-800 text-[9.5px] text-center border-r-2 border-cyan-300 shadow-[3px_0_5px_-1px_rgba(0,0,0,0.1)] px-0.5 py-0.5 font-mono min-w-[34px] w-[34px] font-bold">
              A
            </td>

            {visibleTimelineDates.map((d, dayIdx) => {
              const cActual = itemDailyProgressMap.actualMap.get(comp.id)?.[d.dateStr] || 0;
              if (ganttStyle === 'visual') {
                return (
                  <td key={dayIdx} className="w-[32px] min-w-[32px] max-w-[32px] px-0.5 py-0.5 bg-white">
                    {renderVisualGanttCell(comp.actualStartDate, comp.actualEndDate, d.dateStr, 'actual', cActual, 3)}
                  </td>
                );
              }
              const isEditingCActual = editingCell?.itemId === comp.id && editingCell?.dateStr === d.dateStr && editingCell?.rowType === 'actual';

              return (
                <td
                  key={dayIdx}
                  onClick={() => {
                    if (!isEditingCActual) {
                      setEditingCell({ itemId: comp.id, dateStr: d.dateStr, rowType: 'actual' });
                      setCellInputValue(cActual > 0 ? String(cActual) : '');
                    }
                  }}
                  className={`w-[32px] min-w-[32px] max-w-[32px] px-0.5 text-center py-1 text-[10px] font-mono cursor-pointer transition-all ${
                    cActual >= 100
                      ? 'bg-emerald-500 text-white font-black shadow-xs'
                      : cActual > 0
                      ? 'bg-cyan-400 text-white font-bold shadow-xs'
                      : 'hover:bg-cyan-100/60 text-slate-300'
                  }`}
                  title={`Klik untuk isi/edit realisasi ACTUAL "${comp.description}" (tgl ${d.dateStr})`}
                >
                  {isEditingCActual ? (
                    <input
                      type="number"
                      min="0"
                      max="100"
                      autoFocus
                      onFocus={(e) => e.target.select()}
                      value={cellInputValue}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setCellInputValue(e.target.value)}
                      onBlur={() => handleSaveCell(comp, d.dateStr, 'actual')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                        if (e.key === 'Escape') setEditingCell(null);
                      }}
                      className="w-full text-center bg-white text-slate-900 rounded font-bold border border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  ) : (
                    cActual > 0 ? `${cActual}%` : ''
                  )}
                </td>
              );
            })}
          </tr>
        </React.Fragment>
      );
    }

    return null;
  };


  return (
    <div className="space-y-4">
      
      {/* Top Banner & Executive Control Center */}
      <div className="bg-[#0b2545] text-white rounded-2xl border-b-4 border-amber-400 p-5 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-amber-400 text-slate-950 text-[10px] uppercase font-black px-2 py-0.5 rounded tracking-wider shadow-xs">
                SHIPYARD PLAN VS PROGRESS MATRIX &amp; S-CURVE
              </span>
              <span className="text-slate-300 text-xs font-semibold hidden sm:inline">| {vessel.name || 'Kapal'} ({vessel.type || 'Vessel'})</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              📊 <span className="text-amber-400">Plan vs Realisasi Fisik</span> &amp; Diagram Kurva S
            </h2>
            <p className="text-xs text-slate-200 font-medium max-w-3xl">
              Monitoring bobot teknis (WF %), target linimasa, dan kurva S kumulatif berbasis struktur hierarkis Area, Sub-Sistem, &amp; Rincian Komponen.
            </p>
          </div>

          {/* Action Buttons & View Mode Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsAutoPlanModalOpen(true)}
              className="px-3.5 py-2 text-xs font-black bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 rounded-xl shadow-md border border-amber-300 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
              title="Otomatisasi kalkulasi kurva rencana berdasarkan urutan docking & bobot"
            >
              <Sparkles className="w-4 h-4 fill-slate-950" /> Auto Smart Plan
            </button>

            {/* Segmented View Switcher */}
            <div className="flex items-center bg-[#134074] border border-amber-400/30 p-1 rounded-xl gap-1">
              <button
                onClick={() => setViewTab('gantt')}
                className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'gantt' ? 'bg-amber-400 text-slate-950 shadow-sm' : 'text-slate-200 hover:text-white'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Matriks Linimasa
              </button>

              <button
                onClick={() => setViewTab('chart')}
                className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'chart' ? 'bg-amber-400 text-slate-950 shadow-sm' : 'text-slate-200 hover:text-white'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" /> Kurva S Realtime
              </button>

              <button
                onClick={() => setViewTab('summary')}
                className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'summary' ? 'bg-amber-400 text-slate-950 shadow-sm' : 'text-slate-200 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" /> Rekapitulasi WBS
              </button>
            </div>
          </div>
        </div>

        {/* 4 Executive KPI Performance Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Card 1: Plan vs Actual Cumulative */}
          <div className="p-3 bg-slate-900/80 border border-slate-700/80 rounded-xl space-y-1.5 relative overflow-hidden backdrop-blur-xs shadow-2xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="font-extrabold uppercase text-[10px] tracking-wider text-slate-300 flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-amber-400" /> Progres Fisik Proyek
              </span>
              <span className={`px-1.5 py-0.2 rounded font-mono font-bold text-[10px] ${
                executiveMetrics.deviation >= 0 ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' : 'bg-rose-950 text-rose-300 border border-rose-500/40'
              }`}>
                {executiveMetrics.deviation >= 0 ? `+${executiveMetrics.deviation}% Ahead` : `${executiveMetrics.deviation}% Behind`}
              </span>
            </div>
            
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">Realisasi (Actual)</span>
                <span className="text-2xl font-mono font-black text-cyan-400">{executiveMetrics.currentActual}%</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-semibold">Target (Plan)</span>
                <span className="text-xl font-mono font-bold text-amber-400">{executiveMetrics.currentPlan}%</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
                <div className="bg-[#00b4d8] h-full transition-all duration-500" style={{ width: `${Math.min(100, executiveMetrics.currentActual)}%` }} />
              </div>
              <div className="flex justify-between text-[9.5px] font-mono text-slate-400">
                <span>0%</span>
                <span>Deviasi: {executiveMetrics.deviation > 0 ? `+${executiveMetrics.deviation}` : executiveMetrics.deviation}%</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          {/* Card 2: Project Milestone & Active Phase */}
          <div className="p-3 bg-slate-900/80 border border-slate-700/80 rounded-xl space-y-1.5 relative overflow-hidden backdrop-blur-xs shadow-2xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="font-extrabold uppercase text-[10px] tracking-wider text-slate-300 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-400" /> Linimasa &amp; Fase
              </span>
              <span className="text-[10px] font-mono text-amber-300 font-bold bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-500/30">
                {totalDurationDays} Hari Total
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 block font-semibold">Fase Aktif Saat Ini</span>
              <span className="text-sm font-bold text-white truncate block">{executiveMetrics.activePhase}</span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px] font-mono">
              <span className="text-slate-400">Berjalan: <strong className="text-slate-200">{executiveMetrics.daysElapsed}h</strong></span>
              <span className="text-slate-400">Sisa: <strong className="text-amber-300">{executiveMetrics.daysRemaining}h</strong></span>
            </div>
          </div>

          {/* Card 3: Monetary / Financial Progress */}
          <div className="p-3 bg-slate-900/80 border border-slate-700/80 rounded-xl space-y-1.5 relative overflow-hidden backdrop-blur-xs shadow-2xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="font-extrabold uppercase text-[10px] tracking-wider text-slate-300 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Nilai Kontrak Repair
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-500/30">
                100% WF
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 block font-semibold">Total Biaya BOQ</span>
              <span className="text-base sm:text-lg font-mono font-black text-amber-300 truncate block">
                Rp {globalTotalCost.toLocaleString('id-ID')}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10.5px]">
              <span className="text-slate-400">Terserap Fisik:</span>
              <span className="font-mono font-bold text-cyan-300 truncate">
                Rp {Math.round(executiveMetrics.completedCost).toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          {/* Card 4: Repair Items Scope Breakdown */}
          <div className="p-3 bg-slate-900/80 border border-slate-700/80 rounded-xl space-y-1.5 relative overflow-hidden backdrop-blur-xs shadow-2xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="font-extrabold uppercase text-[10px] tracking-wider text-slate-300 flex items-center gap-1">
                <CheckSquare className="w-3.5 h-3.5 text-sky-400" /> Status Item BOQ
              </span>
              <span className="text-[10px] font-mono text-sky-300 font-bold bg-sky-950/60 px-1.5 py-0.2 rounded border border-sky-500/30">
                {executiveMetrics.itemsTotal} Item
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1 text-center">
              <div className="bg-slate-800/80 p-1.5 rounded-lg border border-slate-700">
                <span className="text-[9px] text-emerald-400 font-bold block uppercase">Selesai</span>
                <span className="text-sm font-mono font-black text-white">{executiveMetrics.itemsCompleted}</span>
              </div>
              <div className="bg-slate-800/80 p-1.5 rounded-lg border border-slate-700">
                <span className="text-[9px] text-cyan-400 font-bold block uppercase">Proses</span>
                <span className="text-sm font-mono font-black text-white">{executiveMetrics.itemsInProgress}</span>
              </div>
              <div className="bg-slate-800/80 p-1.5 rounded-lg border border-slate-700">
                <span className="text-[9px] text-slate-400 font-bold block uppercase">Belum</span>
                <span className="text-sm font-mono font-black text-white">{executiveMetrics.itemsPending}</span>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 text-center font-semibold pt-0.5">
              Tingkat Penyelesaian: <strong className="text-amber-300 font-mono">{executiveMetrics.itemsTotal > 0 ? Math.round((executiveMetrics.itemsCompleted / executiveMetrics.itemsTotal) * 100) : 0}%</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Global Project Timeline Configurator */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3.5 text-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-slate-100 pb-3 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-[#0b2545] text-amber-400 rounded-xl shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 uppercase tracking-wider">
                  KONFIGURATOR KALENDER PROYEK (DATE OF PROJECT)
                </h3>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-md font-mono text-[10px] font-bold">
                  {calendarScope === 'project' ? 'Arrival → Sail Out' : 'Docking Period'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Sesuaikan tanggal kedatangan (Arrival) hingga kapal berlayar keluar (Sail Out) atau fokus periode docking.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Scope Switcher */}
            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setCalendarScope('project')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  calendarScope === 'project'
                    ? 'bg-[#0b2545] text-amber-300 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Ship className="w-3.5 h-3.5" />
                <span>Seluruh Proyek (Arrival - Sail Out)</span>
              </button>
              <button
                type="button"
                onClick={() => setCalendarScope('docking')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  calendarScope === 'docking'
                    ? 'bg-[#0b2545] text-amber-300 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Anchor className="w-3.5 h-3.5" />
                <span>Periode Docking</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowMilestonePipeline(!showMilestonePipeline)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-extrabold rounded-xl border border-slate-200 text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Tampilkan atau sembunyikan diagram alur milestone visual"
            >
              <span>{showMilestonePipeline ? '🙈 Sembunyikan Alur Milestone' : '👁️ Visual Alur Milestone'}</span>
            </button>

            <div className="text-[11px] font-bold text-slate-600 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl">
              Total Biaya: <span className="font-mono text-amber-700 font-extrabold">Rp {globalTotalCost.toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>

        {/* 6 Key Project Lifecycle Dates Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* 1. Arrival */}
          <div className="space-y-1 p-2.5 bg-indigo-50/70 border border-indigo-200 rounded-xl shadow-2xs hover:border-indigo-400 transition-colors">
            <div className="flex items-center justify-between">
              <label className="text-[9.5px] font-extrabold text-indigo-950 uppercase flex items-center gap-1 truncate">
                <span>🚢 1. Arrival</span>
              </label>
              <span className="text-[8px] font-bold text-indigo-700 bg-indigo-100 px-1 py-0.2 rounded border border-indigo-200">Awal</span>
            </div>
            <input
              type="date"
              value={arrivalDate}
              onChange={(e) => handleUpdateArrivalDate(e.target.value)}
              className="w-full px-2 py-1 bg-white border border-indigo-200 rounded-lg font-mono font-bold text-indigo-950 focus:ring-1 focus:ring-indigo-500 text-[11px]"
              title="Tanggal Kedatangan Kapal di Galangan"
            />
          </div>

          {/* 2. Start Work / Contract */}
          <div className="space-y-1 p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl shadow-2xs hover:border-blue-400 transition-colors">
            <div className="flex items-center justify-between">
              <label className="text-[9.5px] font-extrabold text-blue-950 uppercase flex items-center gap-1 truncate">
                <span>📝 2. Start Work</span>
              </label>
              <span className="text-[8px] font-bold text-blue-700 bg-blue-100 px-1 py-0.2 rounded border border-blue-200">Kontrak</span>
            </div>
            <input
              type="date"
              value={startContractDate}
              onChange={(e) => handleUpdateStartContractDate(e.target.value)}
              className="w-full px-2 py-1 bg-white border border-blue-200 rounded-lg font-mono font-bold text-blue-950 focus:ring-1 focus:ring-blue-500 text-[11px]"
              title="Tanggal Mulai Pekerjaan / Kontrak"
            />
          </div>

          {/* 3. Docking */}
          <div className="space-y-1 p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl shadow-2xs hover:border-emerald-400 transition-colors">
            <div className="flex items-center justify-between">
              <label className="text-[9.5px] font-extrabold text-emerald-950 uppercase flex items-center gap-1 truncate">
                <span>⚓ 3. Docking</span>
              </label>
              <span className="text-[8px] font-bold text-emerald-700 bg-emerald-100 px-1 py-0.2 rounded border border-emerald-200">Naik Dok</span>
            </div>
            <input
              type="date"
              value={dockingDate}
              onChange={(e) => handleUpdateDockingDate(e.target.value)}
              className="w-full px-2 py-1 bg-white border border-emerald-200 rounded-lg font-mono font-bold text-emerald-950 focus:ring-1 focus:ring-emerald-500 text-[11px]"
              title="Tanggal Kapal Naik ke Atas Dok"
            />
          </div>

          {/* 4. Undocking */}
          <div className="space-y-1 p-2.5 bg-sky-50/70 border border-sky-200 rounded-xl shadow-2xs hover:border-sky-400 transition-colors">
            <div className="flex items-center justify-between">
              <label className="text-[9.5px] font-extrabold text-sky-950 uppercase flex items-center gap-1 truncate">
                <span>🌊 4. Undocking</span>
              </label>
              <span className="text-[8px] font-bold text-sky-700 bg-sky-100 px-1 py-0.2 rounded border border-sky-200">Turun Dok</span>
            </div>
            <input
              type="date"
              value={undockingDate}
              min={dockingDate}
              onChange={(e) => handleUpdateUndockingDate(e.target.value)}
              className="w-full px-2 py-1 bg-white border border-sky-200 rounded-lg font-mono font-bold text-sky-950 focus:ring-1 focus:ring-sky-500 text-[11px]"
              title="Tanggal Kapal Turun dari Dok"
            />
          </div>

          {/* 5. Finish Work */}
          <div className="space-y-1 p-2.5 bg-teal-50/70 border border-teal-200 rounded-xl shadow-2xs hover:border-teal-400 transition-colors">
            <div className="flex items-center justify-between">
              <label className="text-[9.5px] font-extrabold text-teal-950 uppercase flex items-center gap-1 truncate">
                <span>🏁 5. Finish Work</span>
              </label>
              <span className="text-[8px] font-bold text-teal-700 bg-teal-100 px-1 py-0.2 rounded border border-teal-200">Selesai</span>
            </div>
            <input
              type="date"
              value={finishWorkDate}
              min={startContractDate}
              onChange={(e) => handleUpdateFinishWorkDate(e.target.value)}
              className="w-full px-2 py-1 bg-white border border-teal-200 rounded-lg font-mono font-bold text-teal-950 focus:ring-1 focus:ring-teal-500 text-[11px]"
              title="Tanggal Seluruh Pekerjaan Reparasi Selesai"
            />
          </div>

          {/* 6. Sail Out */}
          <div className="space-y-1 p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl shadow-2xs hover:border-amber-400 transition-colors">
            <div className="flex items-center justify-between">
              <label className="text-[9.5px] font-extrabold text-amber-950 uppercase flex items-center gap-1 truncate">
                <span>⛵ 6. Sail Out</span>
              </label>
              <span className="text-[8px] font-bold text-amber-800 bg-amber-100 px-1 py-0.2 rounded border border-amber-200">Berlayar</span>
            </div>
            <input
              type="date"
              value={sailOutDate}
              min={arrivalDate}
              onChange={(e) => handleUpdateSailOutDate(e.target.value)}
              className="w-full px-2 py-1 bg-white border border-amber-300 rounded-lg font-mono font-bold text-amber-950 focus:ring-1 focus:ring-amber-500 text-[11px]"
              title="Tanggal Kapal Berlayar Keluar dari Galangan"
            />
          </div>
        </div>

        {/* Milestone Visual Pipeline Track */}
        {showMilestonePipeline && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 transition-all">
            <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-600 uppercase">
              <span>Alur Milestone Proyek</span>
              <span className="font-mono text-slate-500">{projectStartDate} → {projectEndDate} ({totalDurationDays} Hari)</span>
            </div>

            <div className="relative flex items-center justify-between gap-1 pt-1">
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-slate-200 rounded-full z-0" />
              
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-[9px] flex items-center justify-center shadow-xs">ARR</div>
                <span className="text-[9px] font-bold text-indigo-900 mt-1">Arrival</span>
                <span className="text-[8px] font-mono text-slate-500">{arrivalDate}</span>
              </div>

              <div className="relative z-10 flex flex-col items-center">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-[9px] flex items-center justify-center shadow-xs">STRT</div>
                <span className="text-[9px] font-bold text-blue-900 mt-1">Start Work</span>
                <span className="text-[8px] font-mono text-slate-500">{startContractDate}</span>
              </div>

              <div className="relative z-10 flex flex-col items-center">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-[9px] flex items-center justify-center shadow-xs">DOCK</div>
                <span className="text-[9px] font-bold text-emerald-900 mt-1">Docking</span>
                <span className="text-[8px] font-mono text-slate-500">{dockingDate}</span>
              </div>

              <div className="relative z-10 flex flex-col items-center">
                <div className="w-6 h-6 rounded-full bg-sky-600 text-white font-bold text-[9px] flex items-center justify-center shadow-xs">UNDK</div>
                <span className="text-[9px] font-bold text-sky-900 mt-1">Undocking</span>
                <span className="text-[8px] font-mono text-slate-500">{undockingDate}</span>
              </div>

              <div className="relative z-10 flex flex-col items-center">
                <div className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold text-[9px] flex items-center justify-center shadow-xs">FIN</div>
                <span className="text-[9px] font-bold text-teal-900 mt-1">Finish Work</span>
                <span className="text-[8px] font-mono text-slate-500">{finishWorkDate}</span>
              </div>

              <div className="relative z-10 flex flex-col items-center">
                <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black text-[9px] flex items-center justify-center shadow-xs">SAIL</div>
                <span className="text-[9px] font-bold text-amber-900 mt-1">Sail Out</span>
                <span className="text-[8px] font-mono text-slate-500">{sailOutDate}</span>
              </div>
            </div>
          </div>
        )}

        {/* Second Row: Duration Controls & Category Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center pt-1 border-t border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-extrabold text-slate-600 uppercase block">
                {calendarScope === 'project' ? 'Durasi Proyek (Arrival - Sail Out)' : 'Durasi Naik Dok (Docking Days)'}
              </label>
              <span className="text-[10px] text-amber-700 font-bold">Fleksibel</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleUpdateDurationDays(Math.max(1, totalDurationDays - 1))}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold rounded-lg transition-colors cursor-pointer text-xs"
                title="Kurangi 1 Hari"
              >
                -1
              </button>
              <input
                type="number"
                min="1"
                max="999"
                value={durationInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setDurationInput(val);
                  const parsed = parseInt(val, 10);
                  if (!isNaN(parsed) && parsed > 0) {
                    handleUpdateDurationDays(parsed);
                  }
                }}
                onBlur={() => {
                  const parsed = parseInt(durationInput, 10);
                  if (isNaN(parsed) || parsed < 1) {
                    setDurationInput(String(totalDurationDays));
                  }
                }}
                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-center text-slate-800 focus:bg-white focus:ring-1 focus:ring-[#0b2545]"
                placeholder="Hari"
              />
              <button
                type="button"
                onClick={() => handleUpdateDurationDays(totalDurationDays + 1)}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold rounded-lg transition-colors cursor-pointer text-xs"
                title="Tambah 1 Hari"
              >
                +1
              </button>
              <span className="font-bold text-slate-600 shrink-0 text-xs">Hari</span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-600 uppercase block">Filter Kategori Pekerjaan</label>
            <select
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white text-xs"
            >
              <option value="all">Semua Kategori ({validWorkItems.length} items berbobot)</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id || cat.code}>
                  {cat.code}. {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase block">Rentang Tanggal Aktif</label>
            <div className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl font-mono text-[11px] font-extrabold text-slate-700 flex items-center justify-between">
              <span>{projectStartDate}</span>
              <span className="text-slate-400">→</span>
              <span>{projectEndDate}</span>
            </div>
          </div>
        </div>

        {/* Quick preset chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
          <span className="text-[10px] font-bold text-slate-400 mr-1">Preset Cepat Durasi:</span>
          {[7, 10, 14, 21, 25, 28, 30, 33, 35, 40, 45, 60, 90, 120].map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => handleUpdateDurationDays(days)}
              className={`px-2 py-0.5 rounded-md font-mono text-[10.5px] font-bold transition-all cursor-pointer ${
                totalDurationDays === days
                  ? 'bg-[#0b2545] text-amber-300 shadow-xs ring-1 ring-amber-400'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {days}h
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area based on View Mode */}
      {viewMode === 'chart' ? (
        /* ------------------------------------------------------------- */
        /* VIEW 1: ENHANCED REALTIME S-CURVE & DEVIATION ANALYTICS */
        /* ------------------------------------------------------------- */
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-900 rounded-xl">
                  <TrendingUp className="w-5 h-5 text-[#0b2545]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-[#0b2545]">DIAGRAM KURVA S REALTIME (BOQ REPAIR LIST)</h3>
                  <p className="text-[11px] text-slate-500 font-semibold">
                    Kalkulasi kumulatif terbobot progres rencana vs aktual dengan penanda milestone proyek.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono font-bold">
                <span className="flex items-center gap-1.5 text-amber-700">
                  <span className="w-3 h-3 rounded-full bg-[#e9c46a] inline-block border border-amber-500" />
                  Target Plan: <strong>{executiveMetrics.currentPlan}%</strong>
                </span>
                <span className="flex items-center gap-1.5 text-cyan-700">
                  <span className="w-3 h-3 rounded-full bg-[#00b4d8] inline-block border border-cyan-600" />
                  Realisasi Actual: <strong>{executiveMetrics.currentActual}%</strong>
                </span>
              </div>
            </div>

            {/* S-Curve Recharts Container */}
            <div className="h-80 sm:h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sCurveChartData} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="planGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e9c46a" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#e9c46a" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00b4d8" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#00b4d8" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="#e2e8f0" strokeOpacity={0.7} />
                  <XAxis dataKey="dayLabel" tick={{ fontSize: 9, fill: '#475569', fontWeight: 'bold' }} interval={Math.max(1, Math.floor(totalDurationDays / 12))} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#475569', fontWeight: 'bold' }} unit="%" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                  
                  {/* Milestone Vertical Reference Lines */}
                  {dockingDate && (
                    <ReferenceLine 
                      x={sCurveChartData.find(d => d.dateStr === dockingDate)?.dayLabel} 
                      stroke="#059669" 
                      strokeDasharray="4 4" 
                      label={{ value: '⚓ Docking', fill: '#059669', fontSize: 10, fontWeight: 'bold', position: 'insideTopLeft' }} 
                    />
                  )}
                  {undockingDate && (
                    <ReferenceLine 
                      x={sCurveChartData.find(d => d.dateStr === undockingDate)?.dayLabel} 
                      stroke="#0284c7" 
                      strokeDasharray="4 4" 
                      label={{ value: '🌊 Undocking', fill: '#0284c7', fontSize: 10, fontWeight: 'bold', position: 'insideTopLeft' }} 
                    />
                  )}
                  {sailOutDate && (
                    <ReferenceLine 
                      x={sCurveChartData.find(d => d.dateStr === sailOutDate)?.dayLabel} 
                      stroke="#d97706" 
                      strokeDasharray="4 4" 
                      label={{ value: '⛵ Sail Out', fill: '#d97706', fontSize: 10, fontWeight: 'bold', position: 'insideTopLeft' }} 
                    />
                  )}

                  <Area name="Cummulative Progress Plan (%)" type="monotone" dataKey="Rencana (%)" stroke="#e9c46a" strokeWidth={3.5} fillOpacity={1} fill="url(#planGradient)" />
                  <Area name="Cummulative Progress Actual (%)" type="monotone" dataKey="Realisasi (%)" stroke="#00b4d8" strokeWidth={3.5} fillOpacity={1} fill="url(#actualGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Weekly Performance Table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <h4 className="font-extrabold text-xs text-[#0b2545] uppercase tracking-wider">
                  Evaluasi Kinerja Mingguan (Weekly Performance &amp; Schedule Variance)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Rincian peningkatan bobot mingguan (incremental) dan deviasi kumulatif terhadap target kontrak.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#0b2545] text-white font-extrabold text-[11px]">
                  <tr>
                    <th className="px-3 py-2">Minggu / Periode</th>
                    <th className="px-3 py-2">Rentang Tanggal</th>
                    <th className="px-3 py-2 text-right">Target Rencana (Kumulatif)</th>
                    <th className="px-3 py-2 text-right">Realisasi Fisik (Kumulatif)</th>
                    <th className="px-3 py-2 text-right">Bobot Mingguan (Plan)</th>
                    <th className="px-3 py-2 text-right">Bobot Mingguan (Actual)</th>
                    <th className="px-3 py-2 text-center">Deviasi (+/-)</th>
                    <th className="px-3 py-2 text-center">Status Evaluasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {weeklyBreakdown.map((wb, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3 py-2 font-bold text-slate-900 font-sans">{wb.weekLabel}</td>
                      <td className="px-3 py-2 text-slate-600">{wb.startDateStr} → {wb.endDateStr}</td>
                      <td className="px-3 py-2 text-right font-bold text-amber-700">{wb.endPlan}%</td>
                      <td className="px-3 py-2 text-right font-bold text-cyan-700">{wb.endActual}%</td>
                      <td className="px-3 py-2 text-right text-slate-600">+{wb.weekPlanInc}%</td>
                      <td className="px-3 py-2 text-right text-slate-800 font-bold">+{wb.weekActualInc}%</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded font-bold ${
                          wb.cumulativeDeviation >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {wb.cumulativeDeviation >= 0 ? `+${wb.cumulativeDeviation}` : wb.cumulativeDeviation}%
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center font-sans">
                        {wb.status === 'ahead' && (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md font-bold text-[10px]">
                            ⚡ Lebih Cepat (Ahead)
                          </span>
                        )}
                        {wb.status === 'on_track' && (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md font-bold text-[10px]">
                            ✓ Sesuai Jadwal (On Track)
                          </span>
                        )}
                        {wb.status === 'behind' && (
                          <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-md font-bold text-[10px]">
                            ⚠️ Terlambat (Delay)
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : viewMode === 'summary' ? (
        /* ------------------------------------------------------------- */
        /* VIEW 2: CATEGORY BREAKDOWN & WBS RECAPITULATION */
        /* ------------------------------------------------------------- */
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
            <div>
              <h3 className="font-extrabold text-sm text-[#0b2545] uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-500" />
                Rekapitulasi Kategori Pekerjaan &amp; Distribusi Bobot BOQ
              </h3>
              <p className="text-[11px] text-slate-500">
                Ringkasan alokasi biaya, bobot weight factor (WF %), dan tingkat pencapaian per kategori repair list.
              </p>
            </div>
            <div className="text-xs font-mono font-bold text-slate-700">
              Total {categoryBreakdown.length} Kategori Aktif
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {categoryBreakdown.map((cb) => (
              <div key={cb.category.id} className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-3 hover:border-slate-300 transition-colors shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-[#0b2545] text-amber-300 rounded font-mono font-black text-xs">
                      {cb.category.code}
                    </span>
                    <h4 className="font-bold text-xs text-slate-900 truncate" title={cb.category.name}>
                      {cb.category.name}
                    </h4>
                  </div>
                  <span className="font-mono text-xs font-extrabold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-300">
                    {cb.wf}% WF
                  </span>
                </div>

                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-slate-600">
                    <span className="font-sans">Total Biaya BOQ:</span>
                    <strong className="text-slate-900">Rp {cb.totalCost.toLocaleString('id-ID')}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span className="font-sans">Jumlah Item Repair:</span>
                    <span>{cb.itemsCount} Items ({cb.completedCount} Selesai)</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span className="font-sans">Realisasi Fisik:</span>
                    <strong className="text-cyan-700">{cb.avgActual}%</strong>
                  </div>
                </div>

                <div className="space-y-1 pt-1">
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-[#00b4d8] h-full transition-all" style={{ width: `${Math.min(100, cb.avgActual)}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 font-sans">
                    <span>{cb.completedCount}/{cb.itemsCount} Item 100%</span>
                    <span>{cb.avgActual}% Selesai</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* ------------------------------------------------------------- */
        /* VIEW 3: GANTT SPREADSHEET MATRIX TABLE (Dense & Sticky) */
        /* ------------------------------------------------------------- */
        <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-0 ${
          isTableFullscreen ? 'fixed inset-0 z-50 p-4 bg-slate-900/95 backdrop-blur-md flex flex-col h-screen w-screen overflow-hidden' : ''
        }`}>
          
          {/* Enhanced Controls Bar */}
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-col lg:flex-row items-center justify-between gap-3 text-xs">
            
            {/* Search & Filter Status Chips */}
            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs w-full sm:w-60 focus-within:ring-1 focus-within:ring-[#0b2545]">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Cari no item atau uraian pekerjaan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs focus:outline-none bg-transparent"
                />
              </div>

              {/* Gantt Style Switcher */}
              <div className="flex items-center bg-slate-200/70 p-0.5 rounded-lg text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setGanttStyle('matrix')}
                  className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                    ganttStyle === 'matrix' ? 'bg-white text-slate-900 shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🔢 Matriks %
                </button>
                <button
                  type="button"
                  onClick={() => setGanttStyle('visual')}
                  className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                    ganttStyle === 'visual' ? 'bg-white text-slate-900 shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  📊 Visual Gantt
                </button>
              </div>

              {/* Sliding Timeline Controls Window */}
              <div className="flex items-center gap-2 bg-slate-100 p-1 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider pl-1.5 hidden sm:inline">Timeline View:</span>
                <select
                  value={timelineWindowMode}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    setTimelineWindowMode(val);
                    setTimelineStartIndex(0);
                  }}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:outline-none"
                  title="Pilih porsi hari yang ingin ditampilkan agar scroll ringan"
                >
                  <option value="15">15 Hari</option>
                  <option value="30">30 Hari</option>
                  <option value="45">45 Hari</option>
                  <option value="all">Semua ({timelineDates.length} Hari)</option>
                </select>

                {timelineWindowMode !== 'all' && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={timelineStartIndex === 0}
                      onClick={() => setTimelineStartIndex(prev => Math.max(0, prev - 7))}
                      className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-xs"
                      title="Geser Mundur 7 Hari"
                    >
                      ← 7h
                    </button>
                    <input
                      type="range"
                      min="0"
                      max={Math.max(0, timelineDates.length - parseInt(timelineWindowMode, 10))}
                      value={timelineStartIndex}
                      onChange={(e) => setTimelineStartIndex(parseInt(e.target.value, 10))}
                      className="w-16 sm:w-24 accent-[#0b2545] cursor-pointer"
                      title="Geser Rentang Tanggal Matriks"
                    />
                    <button
                      type="button"
                      disabled={timelineStartIndex >= timelineDates.length - parseInt(timelineWindowMode, 10)}
                      onClick={() => setTimelineStartIndex(prev => Math.min(timelineDates.length - parseInt(timelineWindowMode, 10), prev + 7))}
                      className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-xs"
                      title="Geser Maju 7 Hari"
                    >
                      7h →
                    </button>
                    <span className="font-mono text-[10px] text-slate-500 pl-1 shrink-0 hidden md:inline">
                      ({visibleTimelineDates[0]?.dateStr || ''} s/d {visibleTimelineDates[visibleTimelineDates.length - 1]?.dateStr || ''})
                    </span>
                  </div>
                )}
              </div>

              {/* Status Filter Chips */}
              <div className="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-lg text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setFilterStatus('all')}
                  className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                    filterStatus === 'all' ? 'bg-white text-slate-900 shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Semua ({validWorkItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('weighted_only')}
                  className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                    filterStatus === 'weighted_only' ? 'bg-white text-slate-900 shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Berbobot WF &gt; 0
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('uncompleted')}
                  className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                    filterStatus === 'uncompleted' ? 'bg-white text-slate-900 shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Belum Selesai
                </button>
              </div>
            </div>

            {/* Quick Helper Tools: Expand/Collapse All & Fullscreen */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleToggleAllNodes}
                className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-700 font-bold transition-colors flex items-center gap-1 cursor-pointer text-xs"
                title="Buka atau tutup seluruh hierarki Area & Sub-sistem"
              >
                {collapsedNodeIds.size > 0 ? <ChevronsUpDown className="w-3.5 h-3.5 text-slate-600" /> : <ChevronsDownUp className="w-3.5 h-3.5 text-slate-600" />}
                <span>{collapsedNodeIds.size > 0 ? 'Buka Semua Area' : 'Sembunyikan Semua Area'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsTableFullscreen(!isTableFullscreen)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-700 font-bold transition-colors flex items-center gap-1 cursor-pointer text-xs"
                title={isTableFullscreen ? "Kembalikan Ukuran Normal" : "Lebarkan Tampilan Matriks"}
              >
                {isTableFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-slate-600" /> : <Maximize2 className="w-3.5 h-3.5 text-slate-600" />}
                <span>{isTableFullscreen ? 'Normal' : 'Fullscreen'}</span>
              </button>

              <div className="hidden xl:flex items-center gap-2.5 text-[10.5px] font-bold text-slate-700 pl-2 border-l border-slate-300">
                <span className="flex items-center gap-1 bg-amber-100 text-amber-950 px-1.5 py-0.5 rounded border border-amber-300">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#f59e0b] border border-amber-600 inline-block" /> PLAN (Target)
                </span>
                <span className="flex items-center gap-1 bg-cyan-100 text-cyan-950 px-1.5 py-0.5 rounded border border-cyan-300">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#0284c7] border border-cyan-600 inline-block" /> ACTUAL (Realisasi)
                </span>
                <span className="flex items-center gap-1 bg-emerald-100 text-emerald-950 px-1.5 py-0.5 rounded border border-emerald-300">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 border border-emerald-600 inline-block" /> 100% Selesai
                </span>
              </div>
            </div>
          </div>

          {/* Full Width Matrix Table */}
          <div ref={tableScrollRef} className={`overflow-x-auto overflow-y-auto transform-gpu will-change-scroll ${isTableFullscreen ? 'flex-1 h-full min-h-0 max-h-none shadow-2xl' : 'max-h-[640px]'} scrollbar-thin border border-slate-300 rounded-lg shadow-xs bg-white`}>
            <table className="w-full min-w-full text-[11px] font-mono border-collapse select-none table-fixed">
              <colgroup>
                {/* 10 Sticky Info Columns */}
                <col className="w-[32px]" style={{ width: 32, minWidth: 32 }} />
                <col className="w-[210px]" style={{ width: 210, minWidth: 210 }} />
                <col className="w-[40px]" style={{ width: 40, minWidth: 40 }} />
                <col className="w-[32px]" style={{ width: 32, minWidth: 32 }} />
                <col className="w-[68px]" style={{ width: 68, minWidth: 68 }} />
                <col className="w-[76px]" style={{ width: 76, minWidth: 76 }} />
                <col className="w-[42px]" style={{ width: 42, minWidth: 42 }} />
                <col className="w-[86px]" style={{ width: 86, minWidth: 86 }} />
                <col className="w-[86px]" style={{ width: 86, minWidth: 86 }} />
                <col className="w-[34px]" style={{ width: 34, minWidth: 34 }} />
                {/* Dynamic Timeline Date Columns */}
                {visibleTimelineDates.map((_, i) => (
                  <col key={i} className="w-[32px]" style={{ width: 32, minWidth: 32 }} />
                ))}
              </colgroup>
              <thead className="sticky top-0 z-30 bg-[#0b2545] shadow-sm">
                {/* Weeks Row */}
                <tr className="bg-[#0b2545] text-white font-extrabold divide-x divide-slate-700 text-xs">
                  <th className="sticky top-0 left-0 z-40 bg-[#0b2545] px-1 py-1 text-center min-w-[32px] w-[32px]" rowSpan={3}>No.</th>
                  <th className="sticky top-0 left-[32px] z-40 bg-[#0b2545] px-2 py-1 text-left min-w-[210px] max-w-[210px] w-[210px]" rowSpan={3}>Task List (Repair Item)</th>
                  <th className="sticky top-0 left-[242px] z-40 bg-[#0b2545] px-1 py-1 text-center min-w-[40px] w-[40px]" rowSpan={3}>Vol</th>
                  <th className="sticky top-0 left-[282px] z-40 bg-[#0b2545] px-1 py-1 text-center min-w-[32px] w-[32px]" rowSpan={3}>Unit</th>
                  <th className="sticky top-0 left-[314px] z-40 bg-[#0b2545] px-1 py-1 text-right min-w-[68px] w-[68px]" rowSpan={3}>Harga (Rp)</th>
                  <th className="sticky top-0 left-[382px] z-40 bg-[#0b2545] px-1 py-1 text-right min-w-[76px] w-[76px]" rowSpan={3}>Total Biaya</th>
                  <th className="sticky top-0 left-[458px] z-40 bg-[#0b2545] px-1 py-1 text-center min-w-[42px] w-[42px]" rowSpan={3}>WF (%)</th>
                  <th className="sticky top-0 left-[500px] z-40 bg-[#0b2545] px-1 py-1 text-center min-w-[86px] w-[86px]" rowSpan={3}>Mulai (Start)</th>
                  <th className="sticky top-0 left-[586px] z-40 bg-[#0b2545] px-1 py-1 text-center min-w-[86px] w-[86px]" rowSpan={3}>Selesai (Finish)</th>
                  <th className="sticky top-0 left-[672px] z-40 bg-[#0b2545] px-1 py-1 text-center min-w-[34px] w-[34px] border-r-2 border-amber-400" rowSpan={3}>Tipe</th>

                  {/* Weeks Headers */}
                  {visibleTimelineWeeks.map((w, i) => (
                    <th
                      key={i}
                      colSpan={w.colSpan}
                      className="px-1 py-1 bg-[#134074] text-center border-b border-slate-700 font-bold text-amber-300 text-xs tracking-tight"
                    >
                      {w.weekLabel}
                    </th>
                  ))}
                </tr>

                {/* Day Numbers Header */}
                <tr className="bg-[#0b2545] text-slate-200 font-bold divide-x divide-slate-700 text-center">
                  {visibleTimelineDates.map((d, i) => {
                    const milestone = (d.dateStr === arrivalDate)
                      ? { badge: 'ARR', bg: 'bg-indigo-600 text-white', title: 'Kedatangan Kapal (Arrival)' }
                      : (d.dateStr === startContractDate)
                      ? { badge: 'STRT', bg: 'bg-blue-600 text-white', title: 'Mulai Kontrak / Start Work' }
                      : (d.dateStr === dockingDate)
                      ? { badge: 'DOCK', bg: 'bg-emerald-600 text-white', title: 'Naik Dok (Docking)' }
                      : (d.dateStr === undockingDate)
                      ? { badge: 'UNDK', bg: 'bg-sky-600 text-white', title: 'Turun Dok (Undocking)' }
                      : (d.dateStr === finishWorkDate)
                      ? { badge: 'FIN', bg: 'bg-teal-600 text-white', title: 'Selesai Pekerjaan (Finish Work)' }
                      : (d.dateStr === sailOutDate)
                      ? { badge: 'SAIL', bg: 'bg-amber-400 text-slate-950 font-black', title: 'Keberangkatan Kapal (Sail Out)' }
                      : null;

                    return (
                      <th
                        key={i}
                        className={`w-[32px] min-w-[32px] max-w-[32px] px-0.5 py-0.5 font-mono text-xs transition-colors ${
                          milestone ? milestone.bg : ''
                        }`}
                        title={milestone ? `${milestone.title} (${d.dateStr})` : `Hari ke-${i + 1} (${d.dateStr})`}
                      >
                        <div>{d.dayNumber}</div>
                        {milestone ? (
                          <span className="block text-[7px] uppercase font-black tracking-tighter leading-none">
                            {milestone.badge}
                          </span>
                        ) : null}
                      </th>
                    );
                  })}
                </tr>

                {/* Day Names Header */}
                <tr className="bg-[#0b2545] text-slate-300 font-semibold divide-x divide-slate-700 text-center border-b-2 border-slate-600">
                  {visibleTimelineDates.map((d, i) => {
                    const isMilestone =
                      d.dateStr === arrivalDate ||
                      d.dateStr === startContractDate ||
                      d.dateStr === dockingDate ||
                      d.dateStr === undockingDate ||
                      d.dateStr === finishWorkDate ||
                      d.dateStr === sailOutDate;
                    return (
                      <th key={i} className={`w-[32px] min-w-[32px] max-w-[32px] px-0.5 py-0.5 text-[10px] ${isMilestone ? 'font-black text-amber-300' : ''}`}>
                        {d.dayName}
                      </th>
                    );
                  })}
                </tr>

                {/* CUMULATIVE PROGRESS PLAN ROW (*) */}
                <tr className="bg-[#ffb703] text-slate-950 font-black divide-x divide-amber-500 border-b border-amber-500 text-xs">
                  <td className="sticky left-0 z-40 bg-[#ffb703] text-center px-1 py-1 font-bold min-w-[32px] w-[32px]">*</td>
                  <td className="sticky left-[32px] z-40 bg-[#ffb703] px-2 py-1 font-extrabold min-w-[674px] w-[674px] max-w-[674px] border-r-2 border-amber-600 shadow-[3px_0_5px_-1px_rgba(0,0,0,0.15)]" colSpan={9}>
                    * Cummulative Progress Plan (Target Proyek)
                  </td>
                  {visibleTimelineDates.map((d, i) => {
                    const val = dailyCumulativeProgress.plans[d.index];
                    return (
                      <td key={i} className="w-[32px] min-w-[32px] max-w-[32px] px-0.5 text-center font-mono py-1 text-[10.5px] bg-[#ffd166] text-slate-950 font-black">
                        {val > 0 ? `${val}%` : '0%'}
                      </td>
                    );
                  })}
                </tr>

                {/* CUMULATIVE PROGRESS ACTUAL ROW (**) */}
                <tr className="bg-[#00b4d8] text-slate-950 font-black divide-x divide-cyan-600 border-b-2 border-slate-800 text-xs">
                  <td className="sticky left-0 z-40 bg-[#00b4d8] text-center px-1 py-1 font-bold min-w-[32px] w-[32px]">**</td>
                  <td className="sticky left-[32px] z-40 bg-[#00b4d8] px-2 py-1 font-extrabold min-w-[674px] w-[674px] max-w-[674px] border-r-2 border-cyan-700 shadow-[3px_0_5px_-1px_rgba(0,0,0,0.15)]" colSpan={9}>
                    ** Cummulative Progress Actual (Realisasi Proyek)
                  </td>
                  {visibleTimelineDates.map((d, i) => {
                    const val = dailyCumulativeProgress.actuals[d.index];
                    return (
                      <td key={i} className="w-[32px] min-w-[32px] max-w-[32px] px-0.5 text-center font-mono py-1 text-[10.5px] bg-[#90e0ef] text-slate-950 font-black">
                        {val > 0 ? `${val}%` : '0%'}
                      </td>
                    );
                  })}
                </tr>
              </thead>

              {/* Table Body */}
                            {/* Table Body - Virtualized rendering */}
              <tbody className="divide-y divide-slate-200">
                {paddingTop > 0 && (
                  <tr>
                    <td colSpan={10 + visibleTimelineDates.length} style={{ height: `${paddingTop}px` }} />
                  </tr>
                )}
                {virtualItems.map((virtualRow) => {
                  const pair = flatRowPairs[virtualRow.index];
                  return (
                    <React.Fragment key={pair.id}>
                      {renderRowPair(pair)}
                    </React.Fragment>
                  );
                })}
                {paddingBottom > 0 && (
                  <tr>
                    <td colSpan={10 + visibleTimelineDates.length} style={{ height: `${paddingBottom}px` }} />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Auto Plan Generator Confirmation Modal */}
      {isAutoPlanModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 border border-amber-300 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">Auto Generate Smart Schedule &amp; Plan</h3>
                <p className="text-xs text-slate-500">Hitung target linimasa otomatis seluruh pekerjaan repair list.</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <p className="leading-relaxed font-medium">
                Sistem akan secara cerdas mengatur tanggal mulai, target selesai, serta kurva target harian seluruh <span className="font-bold text-[#0b2545]">{validWorkItems.length} pekerjaan perbaikan</span> berdasarkan urutan sekuensial docking, bobot teknis, dan durasi proyek ({totalDurationDays} hari).
              </p>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 space-y-1">
                <span className="font-bold block">💡 Fitur Otomatisasi:</span>
                <ul className="list-disc list-inside space-y-0.5 text-amber-800">
                  <li>Perhitungan sekuensial seimbang (Docking → Steelwork → Blasting/Painting → Undocking).</li>
                  <li>Distribusi kurva S otomatis per komponen &amp; sub-sistem.</li>
                  <li>Mengatur tanggal mulai &amp; target selesai secara presisi.</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAutoPlanModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleExecuteAutoSmartPlan}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-xl font-extrabold text-xs shadow-md border border-amber-500 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-slate-950" /> Jalankan Auto Smart Plan
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
