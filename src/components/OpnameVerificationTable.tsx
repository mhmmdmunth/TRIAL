import React, { useState, useMemo } from 'react';
import { formatVolQtyDisplay } from '../utils/qtyFormat';
import {
  ClipboardCheck,
  Search,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  Filter,
  Printer,
  FileSpreadsheet,
  Users,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Edit3,
  Check,
  RotateCcw,
  SlidersHorizontal,
  FileText,
  Ship,
  Calendar,
  UserCheck,
  PlusCircle,
  ExternalLink,
  HelpCircle,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  ArrowDownToLine,
  Layers,
  FolderPlus,
  Save,
  X,
  Copy,
  Scale,
  Download
} from 'lucide-react';
import { WorkCategory, WorkItem, VesselSpec, ProjectSchedule, UserProfile, Signatures } from '../types';
import { TonnageCalculator } from '../utils/tonnageCalculator';
import { exportBapoPdf } from '../utils/pdfExport';
import {
  getNextItemSequenceNumber,
  cascadeDeleteWorkItem,
  cascadeDeleteWorkItems,
  resequenceCategoryItems,
} from '../utils/numberingUtils';
import { useSpreadsheetTable, OPNAME_COLUMNS } from '../hooks/useSpreadsheetTable';
import { SpreadsheetToolbar } from './SpreadsheetToolbar';
import { SpreadsheetContextMenu } from './SpreadsheetContextMenu';
import { SpreadsheetCell } from './SpreadsheetCell';

interface OpnameVerificationTableProps {
  categories: WorkCategory[];
  workItems: WorkItem[];
  vessel?: VesselSpec;
  schedule?: ProjectSchedule;
  currentUser?: UserProfile | null;
  signatures?: Signatures;
  onUpdateItem: (item: WorkItem) => void;
  onAddItem?: (item: Omit<WorkItem, 'id'>) => void;
  onDeleteItem?: (id: string) => void;
  onBulkDeleteItems?: (ids: string[]) => void;
  onBatchUpdateItems?: (items: WorkItem[]) => void;
  onClearAllItems?: () => void;
  onSyncFromRepairList?: (mode: 'replace' | 'merge_new') => void;
  onExportExcel?: () => void;
  onExportPdf?: () => void;
  onExportWord?: () => void;
}

const VENDOR_PRESETS = [
  'PT. Samudra Tehnik Mandiri (Blasting & Coating)',
  'CV. Bintang Bahari Perkasa (Hull & Steel Structure)',
  'Bengkel Bubut Makmur Jaya (Machining & Propeller)',
  'Subcont Piping & Valve Marine Specialist',
  'Subcont Electrical, Automation & Navigation',
  'Subcont Outfitting, Accommodation & Joiner',
  'Tim Internal Galangan (Yard In-House)',
];

const OPNAME_STATUSES: Array<{
  value: NonNullable<WorkItem['opnameStatus']>;
  label: string;
  badgeClass: string;
  icon: React.ReactNode;
}> = [
  {
    value: 'Belum Diperiksa',
    label: 'Belum Diperiksa',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200',
    icon: <Clock className="w-3 h-3 text-slate-500" />,
  },
  {
    value: 'Dalam Pemeriksaan',
    label: 'Dalam Pemeriksaan',
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-300 hover:bg-sky-100',
    icon: <Clock className="w-3 h-3 text-sky-600 animate-spin" />,
  },
  {
    value: 'Terverifikasi',
    label: 'Terverifikasi / Approved',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100',
    icon: <CheckCircle2 className="w-3 h-3 text-emerald-600" />,
  },
  {
    value: 'Revisi / Temuan',
    label: 'Revisi / Temuan',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100',
    icon: <AlertTriangle className="w-3 h-3 text-amber-600" />,
  },
  {
    value: 'Ditolak',
    label: 'Ditolak (Rejected)',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100',
    icon: <XCircle className="w-3 h-3 text-rose-600" />,
  },
];

// Helper: Check if an item has physical scope (QTY or WEIGHT > 0)
export const hasDirectWorkScope = (item: WorkItem): boolean => {
  const qty = typeof item.qty === 'string' ? parseFloat(item.qty) || 0 : (item.qty ?? 0);
  const weight = typeof item.weightKg === 'string' ? parseFloat(item.weightKg) || 0 : (item.weightKg ?? 0);
  return qty > 0 || weight > 0;
};

// Helper: Get all descendant items for a parent (matching by parentId or hierarchy number prefix)
export const getDescendants = (parent: WorkItem, allItems: WorkItem[]): WorkItem[] => {
  const result: WorkItem[] = [];
  const queue: string[] = [parent.id];
  const visited = new Set<string>([parent.id]);

  while (queue.length > 0) {
    const curId = queue.shift()!;
    allItems.forEach((w) => {
      if (visited.has(w.id)) return;
      const isDirectChild = w.parentId === curId;
      const isNumberChild = Boolean(
        parent.categoryId === w.categoryId &&
        parent.itemNo &&
        w.itemNo &&
        w.itemNo.startsWith(`${parent.itemNo}.`)
      );

      if (isDirectChild || isNumberChild) {
        visited.add(w.id);
        result.push(w);
        queue.push(w.id);
      }
    });
  }

  return result;
};

export interface ResolvedVendorInfo {
  directVendor: string;
  hasScope: boolean;
  isInherited: boolean;
  displayVendor: string;
  childVendors: string[];
  scopedChildCount: number;
  scopedChildWithVendorCount: number;
}

// Helper: Resolve vendor information considering hierarchy and QTY/WEIGHT
export const getResolvedVendorInfo = (item: WorkItem, allItems: WorkItem[]): ResolvedVendorInfo => {
  const directVendor = (item.subcontractor || item.assignedTo || '').trim();
  const hasScope = hasDirectWorkScope(item);

  if (hasScope) {
    return {
      directVendor,
      hasScope: true,
      isInherited: false,
      displayVendor: directVendor,
      childVendors: [],
      scopedChildCount: 0,
      scopedChildWithVendorCount: 0,
    };
  }

  // Not directly scoped: look at child components that have QTY/WEIGHT
  const descendants = getDescendants(item, allItems);
  const scopedChildren = descendants.filter(hasDirectWorkScope);
  const childVendorsSet = new Set<string>();
  let scopedChildWithVendorCount = 0;

  scopedChildren.forEach((child) => {
    const v = (child.subcontractor || child.assignedTo || '').trim();
    if (v) {
      childVendorsSet.add(v);
      scopedChildWithVendorCount++;
    }
  });

  const childVendors = Array.from(childVendorsSet);

  if (childVendors.length === 1) {
    return {
      directVendor,
      hasScope: false,
      isInherited: true,
      displayVendor: childVendors[0],
      childVendors,
      scopedChildCount: scopedChildren.length,
      scopedChildWithVendorCount,
    };
  } else if (childVendors.length > 1) {
    return {
      directVendor,
      hasScope: false,
      isInherited: true,
      displayVendor: childVendors.join(', '),
      childVendors,
      scopedChildCount: scopedChildren.length,
      scopedChildWithVendorCount,
    };
  } else {
    return {
      directVendor,
      hasScope: false,
      isInherited: false,
      displayVendor: directVendor,
      childVendors: [],
      scopedChildCount: scopedChildren.length,
      scopedChildWithVendorCount: 0,
    };
  }
};

export const OpnameVerificationTable: React.FC<OpnameVerificationTableProps> = ({
  categories,
  workItems,
  vessel,
  schedule,
  currentUser,
  signatures,
  onUpdateItem,
  onAddItem,
  onDeleteItem,
  onBulkDeleteItems,
  onBatchUpdateItems,
  onClearAllItems,
  onSyncFromRepairList,
}) => {
  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedVendor, setSelectedVendor] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Spreadsheet Engine for Opname
  const spreadsheet = useSpreadsheetTable({
    items: workItems,
    columns: OPNAME_COLUMNS,
    onUpdateItem,
    onAddItem,
    onDeleteItem,
  });

  // Collapse state for categories and parent items
  const [collapsedCats, setCollapsedCats] = useState<Record<string, boolean>>({});
  const [collapsedItems, setCollapsedItems] = useState<Record<string, boolean>>({});

  // Selection for bulk actions
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  // Inline row editing state
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<WorkItem | null>(null);

  // Context Menu State (right click)
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    item: WorkItem;
  } | null>(null);

  // Add Item Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [targetCategoryForAdd, setTargetCategoryForAdd] = useState<string>('');
  const [addItemLevel, setAddItemLevel] = useState<1 | 2 | 3>(3);
  const [addItemParentId, setAddItemParentId] = useState<string | undefined>(undefined);
  const [addItemNo, setAddItemNo] = useState('');
  const [addDescription, setAddDescription] = useState('');
  const [addType, setAddType] = useState('');
  const [addD1, setAddD1] = useState('');
  const [addD2, setAddD2] = useState('');
  const [addD3, setAddD3] = useState('');
  const [addDLen, setAddDLen] = useState('');
  const [addD4, setAddD4] = useState('');
  const [addQty, setAddQty] = useState('1');
  const [addUnit, setAddUnit] = useState('kg');
  const [addWeightKg, setAddWeightKg] = useState('0');
  const [addUnitPrice, setAddUnitPrice] = useState('0');
  const [addSubcontractor, setAddSubcontractor] = useState('');
  const [addOpnameQty, setAddOpnameQty] = useState('');
  const [addOpnameStatus, setAddOpnameStatus] = useState<NonNullable<WorkItem['opnameStatus']>>('Belum Diperiksa');
  const [addNotes, setAddNotes] = useState('');

  // Editing vendor state
  const [editingVendorItemId, setEditingVendorItemId] = useState<string | null>(null);
  const [vendorInputValue, setVendorInputValue] = useState<string>('');

  // Bulk Vendor Modal State
  const [isBulkVendorModalOpen, setIsBulkVendorModalOpen] = useState(false);
  const [bulkVendorName, setBulkVendorName] = useState('');

  // BAPO Print / Official Report Modal State & Filters
  const [isBapoModalOpen, setIsBapoModalOpen] = useState(false);
  const [bapoSelectedVendor, setBapoSelectedVendor] = useState<string>('all');
  const [bapoStatusFilter, setBapoStatusFilter] = useState<'all' | 'verified_only' | 'pending_only'>('all');
  const [bapoCategoryFilter, setBapoCategoryFilter] = useState<string>('all');
  const [bapoViewMode, setBapoViewMode] = useState<'full' | 'compact'>('full');

  const openBapoModal = (initialVendor?: string) => {
    const vendorToUse = initialVendor !== undefined ? initialVendor : selectedVendor !== 'all' ? selectedVendor : 'all';
    const statusToUse = selectedStatus === 'Terverifikasi' ? 'verified_only' : selectedStatus === 'Belum Diperiksa' ? 'pending_only' : 'all';
    setBapoSelectedVendor(vendorToUse);
    setBapoStatusFilter(statusToUse);
    setBapoCategoryFilter(selectedCategory);
    setBapoViewMode('full');
    setIsBapoModalOpen(true);
  };

  // Detail Audit Modal for single item
  const [detailItem, setDetailItem] = useState<WorkItem | null>(null);

  // Distinct list of vendors currently assigned in workItems
  const existingVendors = useMemo(() => {
    const set = new Set<string>();
    workItems.forEach((w) => {
      const v = (w.subcontractor || w.assignedTo || '').trim();
      if (v) set.add(v);
    });
    return Array.from(set).sort();
  }, [workItems]);

  // Filtered work items
  const filteredWorkItems = useMemo(() => {
    return workItems.filter((item) => {
      // Category filter
      if (selectedCategory !== 'all') {
        const cat = categories.find((c) => c.id === selectedCategory || c.code === selectedCategory);
        if (cat) {
          const match = item.categoryId === cat.id || item.categoryId === cat.code;
          if (!match) return false;
        }
      }

      // Vendor filter with resolved child support
      const resolved = getResolvedVendorInfo(item, workItems);
      const effectiveVendor = resolved.displayVendor || (item.subcontractor || item.assignedTo || '').trim();

      if (selectedVendor === 'unassigned') {
        if (effectiveVendor !== '') return false;
      } else if (selectedVendor !== 'all') {
        const matchDirect = (item.subcontractor || item.assignedTo || '').trim().toLowerCase() === selectedVendor.toLowerCase();
        const matchChild = resolved.childVendors.some((cv) => cv.toLowerCase() === selectedVendor.toLowerCase());
        const matchEffective = effectiveVendor.toLowerCase() === selectedVendor.toLowerCase();
        if (!matchDirect && !matchChild && !matchEffective) {
          return false;
        }
      }

      // Status filter
      const currentStatus = item.opnameStatus || 'Belum Diperiksa';
      if (selectedStatus !== 'all' && currentStatus !== selectedStatus) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const noMatch = (item.itemNo || '').toLowerCase().includes(q);
        const descMatch = (item.description || '').toLowerCase().includes(q);
        const vendorMatch = effectiveVendor.toLowerCase().includes(q);
        const notesMatch = (item.opnameNotes || item.remark || item.notes || '').toLowerCase().includes(q);
        const inspectorMatch = (item.opnameInspector || '').toLowerCase().includes(q);
        if (!noMatch && !descMatch && !vendorMatch && !notesMatch && !inspectorMatch) {
          return false;
        }
      }

      return true;
    });
  }, [workItems, categories, selectedCategory, selectedVendor, selectedStatus, searchQuery]);

  // Executive summary statistics
  const stats = useMemo(() => {
    const total = workItems.length;
    let verifiedCount = 0;
    let pendingCount = 0;
    let reworkCount = 0;
    let withVendorCount = 0;
    let totalDirectScoped = 0;

    workItems.forEach((w) => {
      const status = w.opnameStatus || 'Belum Diperiksa';
      if (status === 'Terverifikasi') verifiedCount++;
      else if (status === 'Revisi / Temuan' || status === 'Ditolak') reworkCount++;
      else pendingCount++;

      if (hasDirectWorkScope(w)) {
        totalDirectScoped++;
        if ((w.subcontractor || w.assignedTo || '').trim()) {
          withVendorCount++;
        }
      }
    });

    const verifiedPercent = total > 0 ? Math.round((verifiedCount / total) * 100) : 0;
    return {
      total,
      totalDirectScoped,
      verifiedCount,
      pendingCount,
      reworkCount,
      withVendorCount,
      verifiedPercent,
      vendorCount: existingVendors.length,
    };
  }, [workItems, existingVendors]);

  // Filtered work items specific to BAPO report
  const bapoFilteredWorkItems = useMemo(() => {
    return workItems.filter((item) => {
      // Category filter for BAPO
      if (bapoCategoryFilter !== 'all') {
        const cat = categories.find((c) => c.id === bapoCategoryFilter || c.code === bapoCategoryFilter);
        if (cat) {
          const match = item.categoryId === cat.id || item.categoryId === cat.code;
          if (!match) return false;
        }
      }

      // Vendor filter for BAPO
      const resolved = getResolvedVendorInfo(item, workItems);
      const directVendor = (item.subcontractor || item.assignedTo || '').trim();
      const effectiveVendor = resolved.displayVendor || directVendor;

      if (bapoSelectedVendor === 'unassigned') {
        if (effectiveVendor !== '') return false;
      } else if (bapoSelectedVendor !== 'all') {
        const target = bapoSelectedVendor.toLowerCase();
        const matchDirect = directVendor.toLowerCase() === target;
        const matchChild = resolved.childVendors.some((cv) => cv.toLowerCase() === target);
        const matchEffective = effectiveVendor.toLowerCase() === target;
        if (!matchDirect && !matchChild && !matchEffective) {
          return false;
        }
      }

      // Status filter for BAPO
      const currentStatus = item.opnameStatus || 'Belum Diperiksa';
      if (bapoStatusFilter === 'verified_only') {
        if (currentStatus !== 'Terverifikasi' && (item.opnamePercent || 0) < 100) return false;
      } else if (bapoStatusFilter === 'pending_only') {
        if (currentStatus === 'Terverifikasi' || (item.opnamePercent || 0) >= 100) return false;
      }

      return true;
    });
  }, [workItems, categories, bapoCategoryFilter, bapoSelectedVendor, bapoStatusFilter]);

  // Statistics for the BAPO sheet
  const bapoStats = useMemo(() => {
    const totalItems = bapoFilteredWorkItems.length;
    let totalContractQty = 0;
    let totalOpnameQty = 0;
    let verifiedItemsCount = 0;
    let totalPercentSum = 0;
    let totalWeightKg = 0;

    bapoFilteredWorkItems.forEach((w) => {
      const isVerified = w.opnameStatus === 'Terverifikasi' || (w.opnamePercent || 0) >= 100;
      if (isVerified) verifiedItemsCount++;
      totalContractQty += Number(w.qty) || 0;
      totalOpnameQty += Number(w.opnameQty !== undefined && w.opnameQty !== null ? w.opnameQty : w.qty || 0);
      totalPercentSum += Number(w.opnamePercent || (isVerified ? 100 : 0));
      totalWeightKg += Number(w.weightKg) || 0;
    });

    const averageProgress = totalItems > 0 ? Math.round(totalPercentSum / totalItems) : 0;
    const verifiedPercent = totalItems > 0 ? Math.round((verifiedItemsCount / totalItems) * 100) : 0;

    return {
      totalItems,
      totalContractQty,
      totalOpnameQty,
      verifiedItemsCount,
      averageProgress,
      verifiedPercent,
      totalWeightKg,
    };
  }, [bapoFilteredWorkItems]);

  // Handlers for individual item verification & vendor update
  const handleVendorSave = (item: WorkItem, newVendor: string, forceCascade = false) => {
    const trimmed = newVendor.trim();
    const hasScope = hasDirectWorkScope(item);

    const updatedMain: WorkItem = {
      ...item,
      subcontractor: trimmed || undefined,
      assignedTo: trimmed || undefined,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser ? `${currentUser.name} (${currentUser.role})` : 'Auditor Opname',
    };

    // If item has NO direct scope (Area/Sub-system header) OR forceCascade is chosen:
    // Automatically apply vendor to all child components that HAVE direct QTY & WEIGHT!
    if (!hasScope || forceCascade) {
      const descendants = getDescendants(item, workItems);
      const scopedChildren = descendants.filter(hasDirectWorkScope);

      if (scopedChildren.length > 0) {
        const childrenToUpdate = scopedChildren.map((c) => ({
          ...c,
          subcontractor: trimmed || undefined,
          assignedTo: trimmed || undefined,
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser ? `${currentUser.name} (${currentUser.role})` : 'Auditor Opname',
        }));

        if (onBatchUpdateItems) {
          onBatchUpdateItems([updatedMain, ...childrenToUpdate]);
        } else {
          onUpdateItem(updatedMain);
          childrenToUpdate.forEach((c) => onUpdateItem(c));
        }
      } else {
        onUpdateItem(updatedMain);
      }
    } else {
      onUpdateItem(updatedMain);
    }

    setEditingVendorItemId(null);
  };

  const handleQuickVerify = (item: WorkItem) => {
    const verifiedQty = item.opnameQty !== undefined && item.opnameQty !== null ? item.opnameQty : item.qty;
    const updated: WorkItem = {
      ...item,
      opnameStatus: 'Terverifikasi',
      opnameQty: verifiedQty,
      opnamePercent: 100,
      opnameDate: item.opnameDate || new Date().toISOString().split('T')[0],
      opnameInspector: item.opnameInspector || (currentUser ? currentUser.name : 'QC Inspector'),
      isCompleted: true,
      progressPercent: 100,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser ? `${currentUser.name} (${currentUser.role})` : 'QC Inspector',
    };
    onUpdateItem(updated);
  };

  const handleStatusChange = (item: WorkItem, newStatus: NonNullable<WorkItem['opnameStatus']>) => {
    const verifiedQty =
      newStatus === 'Terverifikasi'
        ? item.opnameQty !== undefined && item.opnameQty !== null
          ? item.opnameQty
          : item.qty
        : item.opnameQty;

    const opPercent =
      newStatus === 'Terverifikasi'
        ? 100
        : item.qty > 0 && verifiedQty !== undefined
        ? Math.round((verifiedQty / item.qty) * 100)
        : item.opnamePercent || 0;

    const updated: WorkItem = {
      ...item,
      opnameStatus: newStatus,
      opnameQty: verifiedQty,
      opnamePercent: opPercent,
      opnameDate: item.opnameDate || new Date().toISOString().split('T')[0],
      opnameInspector: item.opnameInspector || (currentUser ? currentUser.name : 'Auditor QC'),
      isCompleted: newStatus === 'Terverifikasi' ? true : item.isCompleted,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser ? `${currentUser.name} (${currentUser.role})` : 'Auditor QC',
    };
    onUpdateItem(updated);
  };

  const handleOpnameQtyChange = (item: WorkItem, newQty: number) => {
    const validQty = isNaN(newQty) ? 0 : newQty;
    const calcPercent = item.qty > 0 ? Math.min(100, Math.round((validQty / item.qty) * 100)) : 0;
    const status: WorkItem['opnameStatus'] =
      calcPercent >= 100 ? 'Terverifikasi' : calcPercent > 0 ? 'Dalam Pemeriksaan' : item.opnameStatus || 'Belum Diperiksa';

    const updated: WorkItem = {
      ...item,
      opnameQty: validQty,
      opnamePercent: calcPercent,
      opnameStatus: status,
      opnameDate: item.opnameDate || new Date().toISOString().split('T')[0],
      opnameInspector: item.opnameInspector || (currentUser ? currentUser.name : 'Auditor QC'),
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser ? `${currentUser.name} (${currentUser.role})` : 'Auditor QC',
    };
    onUpdateItem(updated);
  };

  const handleMatchContractQty = (item: WorkItem) => {
    handleOpnameQtyChange(item, item.qty);
  };

  const handleOpnameNotesChange = (item: WorkItem, notes: string) => {
    const updated: WorkItem = {
      ...item,
      opnameNotes: notes,
      updatedAt: new Date().toISOString(),
    };
    onUpdateItem(updated);
  };

  // Bulk actions
  const handleToggleSelectAll = () => {
    if (selectedItemIds.size === filteredWorkItems.length) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(filteredWorkItems.map((w) => w.id)));
    }
  };

  const handleToggleSelectItem = (id: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkApplyVendor = () => {
    if (!bulkVendorName.trim() || selectedItemIds.size === 0) return;
    const trimmed = bulkVendorName.trim();
    const itemsMap = new Map<string, WorkItem>();

    workItems.forEach((w) => {
      if (selectedItemIds.has(w.id)) {
        itemsMap.set(w.id, {
          ...w,
          subcontractor: trimmed,
          assignedTo: trimmed,
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser ? `${currentUser.name} (${currentUser.role})` : 'Auditor Opname',
        });

        // If selected item is a header without direct scope, also cascade to all descendant items with Qty & Weight
        if (!hasDirectWorkScope(w)) {
          const scopedChildren = getDescendants(w, workItems).filter(hasDirectWorkScope);
          scopedChildren.forEach((child) => {
            itemsMap.set(child.id, {
              ...child,
              subcontractor: trimmed,
              assignedTo: trimmed,
              updatedAt: new Date().toISOString(),
              updatedBy: currentUser ? `${currentUser.name} (${currentUser.role})` : 'Auditor Opname',
            });
          });
        }
      }
    });

    const itemsToUpdate = Array.from(itemsMap.values());

    if (onBatchUpdateItems) {
      onBatchUpdateItems(itemsToUpdate);
    } else {
      itemsToUpdate.forEach((w) => onUpdateItem(w));
    }

    setIsBulkVendorModalOpen(false);
    setBulkVendorName('');
    setSelectedItemIds(new Set());
  };

  const handleBulkVerifySelected = () => {
    if (selectedItemIds.size === 0) return;
    const nowStr = new Date().toISOString().split('T')[0];
    const inspector = currentUser ? currentUser.name : 'QC Inspector Galangan';

    const itemsToUpdate = workItems
      .filter((w) => selectedItemIds.has(w.id))
      .map((w) => ({
        ...w,
        opnameStatus: 'Terverifikasi' as const,
        opnameQty: w.opnameQty !== undefined && w.opnameQty !== null ? w.opnameQty : w.qty,
        opnamePercent: 100,
        opnameDate: w.opnameDate || nowStr,
        opnameInspector: w.opnameInspector || inspector,
        isCompleted: true,
        progressPercent: 100,
        updatedAt: new Date().toISOString(),
        updatedBy: inspector,
      }));

    if (onBatchUpdateItems) {
      onBatchUpdateItems(itemsToUpdate);
    } else {
      itemsToUpdate.forEach((w) => onUpdateItem(w));
    }
    setSelectedItemIds(new Set());
  };

  // ================= INLINE EDITING & ROW ACTIONS =================
  const openInlineEdit = (item: WorkItem) => {
    if (inlineEditingId && editFormData && inlineEditingId !== item.id) {
      onUpdateItem(editFormData);
    }
    setInlineEditingId(item.id);
    setEditFormData({ ...item });
  };

  const cancelInlineEdit = () => {
    setInlineEditingId(null);
    setEditFormData(null);
  };

  const saveInlineEdit = () => {
    if (editFormData) {
      const hasScope = hasDirectWorkScope(editFormData);
      const trimmedVendor = (editFormData.subcontractor || editFormData.assignedTo || '').trim();

      const updatedMain: WorkItem = {
        ...editFormData,
        subcontractor: trimmedVendor || undefined,
        assignedTo: trimmedVendor || undefined,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser ? `${currentUser.name} (${currentUser.role})` : 'Auditor Opname',
      };

      if (!hasScope && trimmedVendor) {
        const descendants = getDescendants(editFormData, workItems);
        const scopedChildren = descendants.filter(hasDirectWorkScope);
        if (scopedChildren.length > 0) {
          const childrenToUpdate = scopedChildren.map((c) => ({
            ...c,
            subcontractor: trimmedVendor || undefined,
            assignedTo: trimmedVendor || undefined,
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser ? `${currentUser.name} (${currentUser.role})` : 'Auditor Opname',
          }));

          if (onBatchUpdateItems) {
            onBatchUpdateItems([updatedMain, ...childrenToUpdate]);
          } else {
            onUpdateItem(updatedMain);
            childrenToUpdate.forEach((c) => onUpdateItem(c));
          }
        } else {
          onUpdateItem(updatedMain);
        }
      } else {
        onUpdateItem(updatedMain);
      }
    }
    setInlineEditingId(null);
    setEditFormData(null);
  };

  const handleEditFormChange = (field: keyof WorkItem, value: any) => {
    if (!editFormData) return;
    let newData: WorkItem = { ...editFormData, [field]: value };

    // Auto-calculate weight and total price when dimensions, qty, or price changes
    if (['d1', 'd2', 'd3', 'dLen', 'd4', 'type', 'qty', 'unitPrice', 'unit'].includes(field as string)) {
      const calcRes = TonnageCalculator.calculateItemTonnageAndPrice({
        typeCode: newData.type,
        d1: newData.d1,
        d2: newData.d2,
        d3: newData.d3,
        dLen: newData.dLen,
        d4: newData.d4,
        qty: typeof newData.qty === 'string' ? parseFloat(newData.qty) || 0 : newData.qty,
        unit: newData.unit,
        unitPrice: typeof newData.unitPrice === 'string' ? parseFloat(newData.unitPrice) || 0 : newData.unitPrice,
      });

      if (calcRes.weightKg > 0) {
        newData.weightKg = calcRes.weightKg;
      }
      newData.totalPrice = calcRes.totalPrice;
    }

    // If opnameQty changes, recalculate opnamePercent and sync opnameStatus
    if (field === 'opnameQty') {
      const parsedQty = parseFloat(value) || 0;
      newData.opnameQty = parsedQty;
      const pct = newData.qty > 0 ? Math.min(100, Math.round((parsedQty / newData.qty) * 100)) : 0;
      newData.opnamePercent = pct;
      if (pct >= 100) {
        newData.opnameStatus = 'Terverifikasi';
        newData.isCompleted = true;
      } else if (pct > 0) {
        newData.opnameStatus = 'Dalam Pemeriksaan';
      }
    }

    if (field === 'subcontractor') {
      newData.assignedTo = value;
    }

    setEditFormData(newData);
  };

  // Insert row below target item
  const insertRowBelow = (targetItem: WorkItem) => {
    let newLevel = targetItem.itemLevel || 3;
    let newParentId = targetItem.parentId;

    if (targetItem.itemLevel === 1 || targetItem.isAreaHeader) {
      newLevel = 2;
      newParentId = targetItem.id;
    }

    const nextSeq = getNextItemSequenceNumber(workItems, targetItem.categoryId, newLevel as 1 | 2 | 3, newParentId);
    const newItemId = `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newItem: WorkItem = {
      id: newItemId,
      projectId: targetItem.projectId || 'proj-f049',
      categoryId: targetItem.categoryId,
      itemNo: nextSeq,
      description: '',
      type: '',
      qty: 1,
      unit: 'ls',
      weightKg: 0,
      unitPrice: 0,
      totalPrice: 0,
      notes: '',
      remark: '',
      subcontractor: targetItem.subcontractor,
      assignedTo: targetItem.assignedTo,
      opnameStatus: 'Belum Diperiksa',
      opnameQty: 0,
      opnamePercent: 0,
      parentId: newParentId,
      itemLevel: newLevel as 1 | 2 | 3,
      isAreaHeader: newLevel === 1,
      isCompleted: false,
      updatedAt: new Date().toISOString(),
    };

    if (onAddItem) {
      onAddItem(newItem);
    } else if (onBatchUpdateItems) {
      const targetIdx = workItems.findIndex((w) => w.id === targetItem.id);
      const updatedList = [
        ...workItems.slice(0, targetIdx + 1),
        newItem,
        ...workItems.slice(targetIdx + 1),
      ];
      const resequenced = resequenceCategoryItems(updatedList, targetItem.categoryId);
      onBatchUpdateItems(resequenced);
    }

    setTimeout(() => {
      setInlineEditingId(newItem.id);
      setEditFormData(newItem);
    }, 50);
  };

  // Duplicate an item
  const duplicateItem = (item: WorkItem) => {
    const nextSeq = getNextItemSequenceNumber(workItems, item.categoryId, (item.itemLevel || 3) as 1 | 2 | 3, item.parentId);
    const duplicated: WorkItem = {
      ...item,
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      itemNo: nextSeq,
      description: `${item.description} (Copy)`,
      opnameStatus: 'Belum Diperiksa',
      opnameQty: 0,
      opnamePercent: 0,
      isCompleted: false,
      updatedAt: new Date().toISOString(),
    };

    if (onAddItem) {
      onAddItem(duplicated);
    } else if (onBatchUpdateItems) {
      onBatchUpdateItems([...workItems, duplicated]);
    }
  };

  // Change Item Hierarchy Level
  const changeItemLevel = (item: WorkItem, newLevel: 1 | 2 | 3) => {
    const updated: WorkItem = {
      ...item,
      itemLevel: newLevel,
      isAreaHeader: newLevel === 1,
      parentId: newLevel === 1 ? undefined : item.parentId,
      updatedAt: new Date().toISOString(),
    };
    onUpdateItem(updated);
  };

  // Delete single item with cascade check
  const handleDeleteItem = (item: WorkItem) => {
    if (inlineEditingId === item.id) {
      cancelInlineEdit();
    }
    if (onDeleteItem) {
      onDeleteItem(item.id);
      return;
    }
    const { deletedIds, updatedItems } = cascadeDeleteWorkItem(workItems, item.id);
    if (onBulkDeleteItems && deletedIds.length > 1) {
      onBulkDeleteItems(deletedIds);
    } else if (onBatchUpdateItems) {
      onBatchUpdateItems(updatedItems);
    }
  };

  // Bulk delete selected items
  const handleBulkDeleteSelected = () => {
    if (selectedItemIds.size === 0) return;
    const ids: string[] = Array.from(selectedItemIds);
    if (onBulkDeleteItems) {
      onBulkDeleteItems(ids);
      setSelectedItemIds(new Set());
      return;
    }
    if (onDeleteItem && ids.length === 1) {
      onDeleteItem(ids[0]);
      setSelectedItemIds(new Set());
      return;
    }
    const { updatedItems } = cascadeDeleteWorkItems(workItems, ids);
    if (onBatchUpdateItems) {
      onBatchUpdateItems(updatedItems);
    }
    setSelectedItemIds(new Set());
  };

  // Open modal to add a new item
  const openAddModal = (categoryId?: string, parentItem?: WorkItem) => {
    const catId = categoryId || categories?.[0]?.id || 'cat-1';
    setTargetCategoryForAdd(catId);

    if (parentItem) {
      const pLevel = parentItem.itemLevel || (parentItem.isAreaHeader ? 1 : 3);
      const childLevel = pLevel === 1 ? 2 : 3;
      setAddItemLevel(childLevel as 1 | 2 | 3);
      setAddItemParentId(parentItem.id);
      const seq = getNextItemSequenceNumber(workItems, catId, childLevel as 1 | 2 | 3, parentItem.id);
      setAddItemNo(seq);
      setAddSubcontractor(parentItem.subcontractor || '');
    } else {
      setAddItemLevel(3);
      setAddItemParentId(undefined);
      const seq = getNextItemSequenceNumber(workItems, catId, 3);
      setAddItemNo(seq);
      setAddSubcontractor('');
    }

    setAddDescription('');
    setAddType('');
    setAddD1('');
    setAddD2('');
    setAddD3('');
    setAddDLen('');
    setAddD4('');
    setAddQty('1');
    setAddUnit('kg');
    setAddWeightKg('0');
    setAddUnitPrice('0');
    setAddOpnameQty('');
    setAddOpnameStatus('Belum Diperiksa');
    setAddNotes('');
    setIsAddModalOpen(true);
  };

  const handleSaveNewItem = () => {
    if (!addDescription.trim() && !addItemNo.trim()) {
      alert('Mohon masukkan Nomor atau Uraian Pekerjaan');
      return;
    }

    const numQty = parseFloat(addQty) || 1;
    const numPrice = parseFloat(addUnitPrice) || 0;
    const numWeight = parseFloat(addWeightKg) || 0;
    const numOpnameQty = addOpnameQty !== '' ? parseFloat(addOpnameQty) : undefined;
    const opPercent = numOpnameQty !== undefined && numQty > 0 ? Math.min(100, Math.round((numOpnameQty / numQty) * 100)) : 0;

    const newItemData: Omit<WorkItem, 'id'> = {
      projectId: 'proj-f049',
      categoryId: targetCategoryForAdd,
      itemNo: addItemNo || getNextItemSequenceNumber(workItems, targetCategoryForAdd, addItemLevel, addItemParentId),
      description: addDescription,
      type: addType,
      d1: addD1,
      d2: addD2,
      d3: addD3,
      dLen: addDLen,
      d4: addD4,
      qty: numQty,
      unit: addUnit,
      weightKg: numWeight,
      unitPrice: numPrice,
      totalPrice: numPrice * (numWeight > 0 && addUnit === 'kg' ? numWeight : numQty),
      notes: addNotes,
      subcontractor: addSubcontractor.trim() || undefined,
      assignedTo: addSubcontractor.trim() || undefined,
      opnameQty: numOpnameQty,
      opnamePercent: opPercent,
      opnameStatus: addOpnameStatus,
      parentId: addItemParentId,
      itemLevel: addItemLevel,
      isAreaHeader: addItemLevel === 1,
      isCompleted: addOpnameStatus === 'Terverifikasi',
      updatedAt: new Date().toISOString(),
    };

    if (onAddItem) {
      onAddItem(newItemData);
    }

    setIsAddModalOpen(false);
  };

  // Export Opname Table to CSV
  const handleExportOpnameCsv = () => {
    const headers = [
      'No',
      'Kategori',
      'Item Pekerjaan',
      'Vendor / Subkontraktor',
      'Volume Kontrak',
      'Satuan',
      'Volume Opname Lapangan',
      'Deviasi / Selisih',
      'Realisasi (%)',
      'Status Audit / Opname',
      'Tanggal Opname',
      'Auditor / QC Inspector',
      'Catatan Audit & Kualitas',
    ];

    const rows = filteredWorkItems.map((item) => {
      const cat = categories.find((c) => c.id === item.categoryId || c.code === item.categoryId);
      const catTitle = cat ? `${cat.code}. ${cat.name}` : item.categoryId;
      const resVendor = getResolvedVendorInfo(item, workItems);
      const vendor = resVendor.displayVendor || resVendor.directVendor || item.subcontractor || item.assignedTo || '-';
      const opQty = item.opnameQty !== undefined && item.opnameQty !== null ? item.opnameQty : '-';
      const diff =
        item.opnameQty !== undefined && item.opnameQty !== null ? (item.opnameQty - item.qty).toFixed(2) : '-';
      const pct = item.opnamePercent !== undefined ? `${item.opnamePercent}%` : '-';
      const status = item.opnameStatus || 'Belum Diperiksa';
      const date = item.opnameDate || '-';
      const inspector = item.opnameInspector || '-';
      const notes = (item.opnameNotes || item.remark || '').replace(/"/g, '""');

      return [
        `"${item.itemNo}"`,
        `"${catTitle}"`,
        `"${item.description.replace(/"/g, '""')}"`,
        `"${vendor.replace(/"/g, '""')}"`,
        item.qty,
        `"${item.unit}"`,
        opQty,
        diff,
        `"${pct}"`,
        `"${status}"`,
        `"${date}"`,
        `"${inspector.replace(/"/g, '""')}"`,
        `"${notes}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `Rekap_Opname_Subcont_${(vessel?.name || 'Kapal').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportBapoCsv = () => {
    const headers = [
      'No. Urut',
      'No. Item',
      'Kategori Pekerjaan',
      'WORK ITEMS / URAIAN PEKERJAAN',
      'Keterangan',
      'Type',
      'D1',
      'D2',
      'D3',
      'Panjang (mm)',
      'D4',
      'Volume Kontrak (Qty)',
      'Satuan',
      'Berat/Tonase Kontrak (kg)',
      'Volume Opname Lapangan',
      'Deviasi / Selisih',
      'Remark',
      'VENDOR / SUBCONT',
      '% Opname (Realisasi)',
      'Status Audit',
      'Tanggal Opname',
      'Auditor / QC Inspector',
      'Catatan & Temuan QC'
    ];

    const rows = bapoFilteredWorkItems.map((item, idx) => {
      const cat = categories.find((c) => c.id === item.categoryId || c.code === item.categoryId);
      const catTitle = cat ? `${cat.code}. ${cat.name}` : item.categoryId;
      const resVendor = getResolvedVendorInfo(item, workItems);
      const vendor = resVendor.displayVendor || resVendor.directVendor || item.subcontractor || item.assignedTo || '-';
      const opQty = item.opnameQty !== undefined && item.opnameQty !== null ? item.opnameQty : item.qty;
      const diff =
        item.opnameQty !== undefined && item.opnameQty !== null ? (item.opnameQty - item.qty).toFixed(2) : '0.00';
      const pct = item.opnamePercent !== undefined ? `${item.opnamePercent}%` : item.opnameStatus === 'Terverifikasi' ? '100%' : '0%';
      const status = item.opnameStatus || 'Belum Diperiksa';
      const date = item.opnameDate || '-';
      const inspector = item.opnameInspector || '-';
      const notes = (item.opnameNotes || '').replace(/"/g, '""');
      const itemNotes = (item.notes || '').replace(/"/g, '""');
      const itemRemark = (item.remark || '').replace(/"/g, '""');

      return [
        idx + 1,
        `"${item.itemNo}"`,
        `"${catTitle}"`,
        `"${item.description.replace(/"/g, '""')}"`,
        `"${itemNotes}"`,
        `"${item.type || '-'}"`,
        `"${item.d1 || '-'}"`,
        `"${item.d2 || '-'}"`,
        `"${item.d3 || '-'}"`,
        `"${item.dLen || '-'}"`,
        `"${item.d4 || '-'}"`,
        item.qty,
        `"${item.unit}"`,
        item.weightKg ? item.weightKg.toFixed(2) : '0.00',
        opQty,
        diff,
        `"${itemRemark}"`,
        `"${vendor.replace(/"/g, '""')}"`,
        `"${pct}"`,
        `"${status}"`,
        `"${date}"`,
        `"${inspector.replace(/"/g, '""')}"`,
        `"${notes}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const vendorSuffix = bapoSelectedVendor !== 'all' ? `_${bapoSelectedVendor.replace(/\s+/g, '_')}` : '_Semua_Vendor';
    link.setAttribute(
      'download',
      `BAPO_Dokumen_${(vessel?.name || 'Kapal').replace(/\s+/g, '_')}${vendorSuffix}_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [isBapoGenerating, setIsBapoGenerating] = useState(false);

  const handleDownloadBapoPdf = async () => {
    setIsBapoGenerating(true);
    try {
      const effectiveSignatures: Signatures = signatures || {
        preparedByName: currentUser?.name || 'Muhammad Munthaha',
        preparedByTitle: 'Staff PPC & Estimator Galangan',
        reviewedByName: 'Project Manager Galangan',
        reviewedByTitle: 'Pimpro Galangan',
        verifiedByName: vessel?.companyOwner || 'Owner Superintendent',
        verifiedByTitle: 'Owner Representative / Surveyor',
      };

      await exportBapoPdf({
        vessel: vessel || {
          id: 'vessel-1',
          name: 'TB. ADARO 2026',
          dimension: '23.97 x 7.26 x 3.00 Meter',
          vesselType: 'Tug Boat',
          dockingType: 'Docking Repair',
          companyOwner: 'PT. ADARO LOGISTICS',
          projectNo: 'PRJ-2026-001',
          classification: 'BKI',
          kindOfSurvey: 'Intermediate Survey',
        },
        schedule: schedule || {
          id: 'sched-1',
          vesselId: 'vessel-1',
          arriveBgn: '-',
          startContract: '-',
          arrivalMeeting: '-',
          dockingDate: '07 Sep 2026',
          undockingDate: '01 Okt 2026',
          finishWork: '02 Okt 2026',
          sailOut: '05 Okt 2026',
          dockingPosition: '#5',
          dockingDurationDays: 25,
          status: 'Under Docking',
        },
        categories,
        workItems,
        selectedVendor: bapoSelectedVendor,
        statusFilter: bapoStatusFilter,
        categoryFilter: bapoCategoryFilter,
        viewMode: bapoViewMode,
        signatures: effectiveSignatures,
        currentUser: currentUser ? { name: currentUser.name, role: currentUser.role } : undefined,
      });
    } catch (err) {
      console.error('Failed to generate BAPO PDF:', err);
      alert('Gagal mengunduh dokumen PDF BAPO. Silakan coba lagi.');
    } finally {
      setIsBapoGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Banner & Executive Statistics Cards */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-3.5 sm:p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Opname &amp; Verifikasi Pekerjaan Lapangan
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Joint Inspection &amp; Subcont Audit
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Audit volume fisik, pantau nama vendor/subkontraktor pelaksana, dan terbitkan Berita Acara Pemeriksaan Opname (BAPO).
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onAddItem && (
              <button
                onClick={() => openAddModal()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer min-h-[34px]"
                title="Tambah item pekerjaan baru ke Repair List & Opname"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Tambah Pekerjaan</span>
              </button>
            )}

            <button
              onClick={() => openBapoModal()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#03442C] hover:bg-[#07593D] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer min-h-[34px]"
              title={`Pratinjau & Cetak Lembar Berita Acara Pemeriksaan Opname (BAPO)${selectedVendor !== 'all' ? ` - Terfilter Vendor: ${selectedVendor}` : ''}`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak BAPO</span>
              {selectedVendor !== 'all' && (
                <span className="ml-0.5 px-1.5 py-0.5 text-[10px] bg-emerald-800 text-emerald-100 rounded-md font-medium border border-emerald-600/50 truncate max-w-[130px]">
                  {selectedVendor === 'unassigned' ? 'Belum Ditentukan' : selectedVendor}
                </span>
              )}
            </button>

            <button
              onClick={handleExportOpnameCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer min-h-[34px]"
              title="Unduh Rekap Opname & Subcont dalam format CSV / Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export Opname</span>
            </button>

            {onSyncFromRepairList && (
              <button
                onClick={() => onSyncFromRepairList('merge_new')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 hover:text-sky-900 border border-sky-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer min-h-[34px]"
                title="Tarik item pekerjaan baru dari Repair List ke Opname (Data Repair List tetap terpisah dan aman)"
              >
                <RotateCcw className="w-3.5 h-3.5 text-sky-600" />
                <span>Tarik dari Repair List</span>
              </button>
            )}
          </div>
        </div>

        {/* 5 Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-3">
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-2.5">
            <div className="text-[11px] font-medium text-slate-500">Total Item Opname</div>
            <div className="text-lg font-bold text-slate-900 mt-0.5">{stats.total}</div>
            <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
              <span>{workItems.filter((w) => w.isAreaHeader).length} Area Pekerjaan</span>
            </div>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-2.5">
            <div className="text-[11px] font-medium text-emerald-800 flex items-center justify-between">
              <span>Terverifikasi</span>
              <span className="font-bold">{stats.verifiedPercent}%</span>
            </div>
            <div className="text-lg font-bold text-emerald-900 mt-0.5">{stats.verifiedCount} Item</div>
            <div className="w-full bg-emerald-200/60 rounded-full h-1.5 mt-1 overflow-hidden">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${stats.verifiedPercent}%` }}
              />
            </div>
          </div>

          <div className="bg-sky-50/70 border border-sky-200/80 rounded-xl p-2.5">
            <div className="text-[11px] font-medium text-sky-800">Butuh Verifikasi</div>
            <div className="text-lg font-bold text-sky-900 mt-0.5">{stats.pendingCount} Item</div>
            <div className="text-[10px] text-sky-700 mt-0.5">Pending audit / pengecekan</div>
          </div>

          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-2.5">
            <div className="text-[11px] font-medium text-amber-800">Revisi / Temuan</div>
            <div className="text-lg font-bold text-amber-900 mt-0.5">{stats.reworkCount} Item</div>
            <div className="text-[10px] text-amber-700 mt-0.5">Perlu tindak lanjut / defect</div>
          </div>

          <div className="bg-purple-50/70 border border-purple-200/80 rounded-xl p-2.5 col-span-2 sm:col-span-1">
            <div className="text-[11px] font-medium text-purple-800 flex items-center justify-between">
              <span>Vendor / Subcont</span>
              <Building2 className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <div className="text-lg font-bold text-purple-900 mt-0.5">{stats.vendorCount} Rekanan</div>
            <div className="text-[10px] text-purple-700 mt-0.5">{stats.withVendorCount} item teralokasi</div>
          </div>
        </div>

        {/* Quick Vendor Filter Pills */}
        {existingVendors.length > 0 && (
          <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-slate-100 overflow-x-auto scrollbar-none text-xs">
            <span className="text-[11px] text-slate-500 font-medium shrink-0 flex items-center gap-1">
              <Users className="w-3 h-3 text-slate-400" />
              Filter Vendor:
            </span>
            <button
              onClick={() => setSelectedVendor('all')}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-medium shrink-0 transition-colors cursor-pointer ${
                selectedVendor === 'all'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Semua ({workItems.length})
            </button>
            <button
              onClick={() => setSelectedVendor('unassigned')}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-medium shrink-0 transition-colors cursor-pointer ${
                selectedVendor === 'unassigned'
                  ? 'bg-amber-600 text-white font-bold'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
              }`}
            >
              Belum Ditentukan ({workItems.length - stats.withVendorCount})
            </button>
            {existingVendors.map((v) => {
              const count = workItems.filter(
                (w) => (w.subcontractor || w.assignedTo || '').trim().toLowerCase() === v.toLowerCase()
              ).length;
              const isSelected = selectedVendor.toLowerCase() === v.toLowerCase();
              return (
                <button
                  key={v}
                  onClick={() => setSelectedVendor(isSelected ? 'all' : v)}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-medium shrink-0 transition-colors cursor-pointer border ${
                    isSelected
                      ? 'bg-emerald-700 text-white font-bold border-emerald-800'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <span className="truncate max-w-[180px] inline-block align-bottom">{v}</span>
                  <span className="ml-1 text-[10px] opacity-75 font-mono">({count})</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Search, Filter & Bulk Actions Bar */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          {/* Left: Search & Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari item, vendor, catatan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 min-h-[34px]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  &times;
                </button>
              )}
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 min-h-[34px] max-w-[180px]"
            >
              <option value="all">Semua Kategori (I - XII)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code}. {c.name}
                </option>
              ))}
            </select>

            {/* Vendor Filter Dropdown */}
            <select
              value={selectedVendor}
              onChange={(e) => setSelectedVendor(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 min-h-[34px] max-w-[180px]"
            >
              <option value="all">Semua Vendor / Subcont</option>
              <option value="unassigned">-- Belum Ditentukan --</option>
              {existingVendors.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 min-h-[34px]"
            >
              <option value="all">Semua Status Opname</option>
              {OPNAME_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Right: Expand / Collapse & Count */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                const allCollapsed = Object.keys(collapsedCats).length > 0;
                if (allCollapsed) {
                  setCollapsedCats({});
                } else {
                  const c: Record<string, boolean> = {};
                  categories.forEach((cat) => {
                    c[cat.id] = true;
                  });
                  setCollapsedCats(c);
                }
              }}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors min-h-[34px] cursor-pointer"
            >
              {Object.keys(collapsedCats).length > 0 ? 'Buka Semua Kategori' : 'Tutup Semua Kategori'}
            </button>

            <span className="text-xs text-slate-500 font-mono">
              Menampilkan <span className="font-bold text-slate-800">{filteredWorkItems.length}</span> item
            </span>
          </div>
        </div>

        {/* Bulk Action Strip when items are selected */}
        {selectedItemIds.size > 0 && (
          <div className="mt-2.5 pt-2.5 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 bg-emerald-50/70 p-2 rounded-lg border border-emerald-200">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-950">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              <span>{selectedItemIds.size} item dipilih untuk aksi massal:</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsBulkVendorModalOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-md text-xs font-semibold shadow-2xs cursor-pointer"
              >
                <Building2 className="w-3.5 h-3.5 text-purple-600" />
                <span>Tetapkan Vendor Massal</span>
              </button>

              <button
                onClick={handleBulkVerifySelected}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md text-xs font-semibold shadow-2xs cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                <span>Verifikasi 100% Massal</span>
              </button>

              {(onBulkDeleteItems || onDeleteItem) && (
                <button
                  onClick={handleBulkDeleteSelected}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-semibold shadow-2xs cursor-pointer"
                  title="Hapus seluruh item terpilih"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Terpilih ({selectedItemIds.size})</span>
                </button>
              )}

              <button
                onClick={() => setSelectedItemIds(new Set())}
                className="px-2 py-1 text-slate-500 hover:text-slate-800 text-xs"
              >
                Batal Pilihan
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Empty State Guidance */}
      {workItems.length === 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center text-emerald-900 shadow-2xs">
          <ClipboardCheck className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
          <h3 className="font-bold text-sm">Repair List Belum Memiliki Item Pekerjaan</h3>
          <p className="text-xs text-emerald-700 max-w-md mx-auto mt-1">
            Untuk melakukan verifikasi audit dan memasukkan nama vendor/subkontraktor, silakan tambahkan item pekerjaan terlebih dahulu di tab <strong>Repair List</strong> atau gunakan fitur Impor Excel.
          </p>
        </div>
      )}

      {/* 4. Opname & Subcont Audit Table */}
      {workItems.length > 0 && (
        <div className="space-y-2">
          <SpreadsheetToolbar
            activeCell={spreadsheet.activeCell}
            items={workItems}
            onCut={spreadsheet.cutActiveCell}
            onCopy={spreadsheet.copyActiveCell}
            onPaste={spreadsheet.pasteActiveCell}
            onClearCell={spreadsheet.clearActiveCell}
            onDeleteRow={(id) => onDeleteItem && onDeleteItem(id)}
            toastMessage={spreadsheet.toastMessage}
          />

          <div
            tabIndex={0}
            onKeyDown={spreadsheet.handleKeyDown}
            className="bg-white rounded-xl border-2 border-[#03442C]/40 shadow-sm overflow-hidden outline-hidden focus:ring-1 focus:ring-emerald-500"
          >
          {/* Mobile Horizontal Scroll Hint */}
          <div className="block lg:hidden px-3 py-1 bg-emerald-50/90 border-b border-emerald-200 text-[11px] text-emerald-800 flex items-center justify-between">
            <span className="inline-flex items-center gap-1 font-medium">
              <span>&larr;</span>
              <span>Geser horizontal untuk kolom Vendor, Status &amp; Auditor</span>
              <span>&rarr;</span>
            </span>
            <span className="font-mono text-[10px] text-emerald-600 font-semibold">Touch-Scroll</span>
          </div>

          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-xs border-collapse border border-slate-300">
              <thead>
                <tr className="bg-[#03442C] text-white font-bold uppercase text-[10px] tracking-wider align-middle border-b-2 border-emerald-950">
                  <th className="py-2.5 px-2 w-9 text-center border-r border-emerald-800/60">
                    <button
                      onClick={handleToggleSelectAll}
                      title="Pilih / Batalkan Semua"
                      className="cursor-pointer inline-flex items-center justify-center text-white hover:text-emerald-200"
                    >
                      {selectedItemIds.size === filteredWorkItems.length && filteredWorkItems.length > 0 ? (
                        <CheckSquare className="w-3.5 h-3.5 text-emerald-300" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-slate-300" />
                      )}
                    </button>
                  </th>
                  <th className="py-2.5 px-2 w-14 text-center border-r border-emerald-800/60 font-mono">No</th>
                  <th className="py-2.5 px-3 min-w-[280px] w-full border-r border-emerald-800/60">
                    WORK ITEMS / SKEMA STRUKTUR HIERARKI
                  </th>
                  <th className="py-2.5 px-3 min-w-[150px] w-44 border-r border-emerald-800/60">Keterangan</th>
                  <th className="py-2.5 px-2 w-20 text-center border-r border-emerald-800/60 font-mono">Type</th>
                  <th className="py-2.5 px-2 w-14 text-center border-r border-emerald-800/60 font-mono" title="Dimensi 1 (Panjang/Diameter mm)">D1</th>
                  <th className="py-2.5 px-2 w-14 text-center border-r border-emerald-800/60 font-mono" title="Dimensi 2 (Lebar/Sayap mm)">D2</th>
                  <th className="py-2.5 px-2 w-14 text-center border-r border-emerald-800/60 font-mono" title="Dimensi 3 (Tebal mm)">D3</th>
                  <th className="py-2.5 px-2 w-16 text-center bg-[#07593D] text-amber-300 border-x-2 border-amber-400/70 font-mono font-extrabold shadow-inner" title="Ukuran panjang siku, pipa, h-beam, round bar, flat bar & square bar (mm)">Panjang</th>
                  <th className="py-2.5 px-2 w-14 text-center border-r border-emerald-800/60 font-mono" title="Dimensi 4 (Pengali/Pcs)">D4</th>
                  <th className="py-2.5 px-2 w-20 text-right border-r border-emerald-800/60 font-mono" title="Volume / Kuantitas">Qty</th>
                  <th className="py-2.5 px-2 w-20 text-center border-r border-emerald-800/60 font-mono" title="Satuan (Unit)">Satuan</th>
                  <th className="py-2.5 px-3 min-w-[130px] w-36 text-left border-r border-emerald-800/60 font-mono" title="Catatan / Status / Remark">Remark</th>
                  <th className="py-2.5 px-3 min-w-[160px] border-r border-emerald-800/60 bg-[#07593D] text-amber-200">
                    <div className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-amber-300" />
                      <span>VENDOR / SUBCONT</span>
                    </div>
                  </th>
                  <th className="py-2.5 px-2 w-16 text-center border-r border-emerald-800/60 font-mono" title="Realisasi Fisik (%)">
                    % OPNAME
                  </th>
                  <th className="py-2.5 px-2 w-32 text-center border-r border-emerald-800/60">STATUS AUDIT</th>
                  <th className="py-2.5 px-2 w-28 text-center border-r border-emerald-800/60 font-mono">TANGGAL &amp; QC</th>
                  <th className="py-2.5 px-3 min-w-[160px] border-r border-emerald-800/60">CATATAN &amp; TEMUAN QC</th>
                  <th className="py-2.5 px-2 w-24 text-center">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {categories.map((cat) => {
                  const catItems = filteredWorkItems.filter(
                    (item) => item.categoryId === cat.id || item.categoryId === cat.code
                  );
                  const isCollapsed = Boolean(collapsedCats[cat.id]);

                  // If category has no items after filtering, skip or show if no filter
                  if (catItems.length === 0 && (searchQuery || selectedVendor !== 'all' || selectedStatus !== 'all')) {
                    return null;
                  }

                  const catTotalItems = workItems.filter(
                    (item) => item.categoryId === cat.id || item.categoryId === cat.code
                  );
                  const catVerifiedCount = catTotalItems.filter((w) => w.opnameStatus === 'Terverifikasi').length;

                  return (
                    <React.Fragment key={cat.id}>
                      {/* CATEGORY SECTION HEADER ROW */}
                      <tr className="bg-[#03442C]/10 hover:bg-[#03442C]/15 transition-colors border-t-2 border-b-2 border-[#03442C]/30">
                        <td colSpan={20} className="py-2 px-3">
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() =>
                                setCollapsedCats((prev) => ({
                                  ...prev,
                                  [cat.id]: !prev[cat.id],
                                }))
                              }
                              className="flex items-center gap-2 text-left font-bold text-xs text-[#03442C] tracking-wide cursor-pointer select-none"
                            >
                              {isCollapsed ? (
                                <ChevronRight className="w-4 h-4 text-[#03442C]" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-[#03442C]" />
                              )}
                              <span>
                                KATEGORI {cat.code}. {cat.name}
                              </span>
                              <span className="text-[11px] font-normal text-slate-600 ml-1">
                                ({catItems.length} item{catItems.length !== catTotalItems.length ? ` dari total ${catTotalItems.length}` : ''})
                              </span>
                            </button>

                            <div className="flex items-center gap-3 text-[11px]">
                              {onAddItem && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openAddModal(cat.id);
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-[11px] shadow-2xs transition-colors cursor-pointer"
                                  title={`Tambah item pekerjaan baru ke Kategori ${cat.code}`}
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>+ Tambah Item</span>
                                </button>
                              )}
                              <span className="font-mono text-emerald-800 font-semibold">
                                Terverifikasi: {catVerifiedCount} / {catTotalItems.length}
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* Items in this Category */}
                      {!isCollapsed &&
                        catItems.map((item) => {
                          const isSelected = selectedItemIds.has(item.id);
                          const isArea = Boolean(item.isAreaHeader || item.itemLevel === 1);
                          const currentVendor = (item.subcontractor || item.assignedTo || '').trim();
                          const resolvedVendor = getResolvedVendorInfo(item, workItems);
                          const status = item.opnameStatus || 'Belum Diperiksa';
                          const statusConfig =
                            OPNAME_STATUSES.find((s) => s.value === status) || OPNAME_STATUSES[0];
                          const opnameQtyVal =
                            item.opnameQty !== undefined && item.opnameQty !== null ? item.opnameQty : item.qty;
                          const opPercent =
                            item.opnamePercent !== undefined
                              ? item.opnamePercent
                              : status === 'Terverifikasi'
                              ? 100
                              : item.qty > 0 && item.opnameQty !== undefined
                              ? Math.round((item.opnameQty / item.qty) * 100)
                              : 0;

                          const diff = (opnameQtyVal - item.qty);
                          const isEditing = inlineEditingId === item.id && Boolean(editFormData);

                          // ================= INLINE EDITING ROW =================
                          if (isEditing && editFormData) {
                            const editDiff = (editFormData.opnameQty ?? 0) - editFormData.qty;
                            const activeLabels = TonnageCalculator.getDimensionLabels(editFormData.type || '');
                            return (
                              <tr
                                key={item.id}
                                className="bg-amber-50/80 border-y-2 border-amber-400 text-xs shadow-inner"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                    e.preventDefault();
                                    saveInlineEdit();
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    cancelInlineEdit();
                                  }
                                }}
                              >
                                {/* 1. Checkbox / Mode indicator */}
                                <td className="py-2 px-1 text-center border-r border-amber-200">
                                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" title="Sedang Diedit" />
                                </td>

                                {/* 2. No */}
                                <td className="py-1 px-1 border-r border-amber-200 text-center">
                                  <input
                                    type="text"
                                    value={editFormData.itemNo}
                                    onChange={(e) => handleEditFormChange('itemNo', e.target.value)}
                                    className="w-full text-center font-mono font-bold text-xs px-1 py-1 bg-white border border-amber-300 rounded focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
                                    title="Nomor Urut Pekerjaan"
                                  />
                                </td>

                                {/* 3. Description */}
                                <td className="py-1 px-2 border-r border-amber-200 min-w-[280px]">
                                  <textarea
                                    rows={2}
                                    value={editFormData.description}
                                    onChange={(e) => handleEditFormChange('description', e.target.value)}
                                    placeholder="Uraian item pekerjaan..."
                                    className="w-full px-2 py-1 text-xs font-semibold bg-white border border-amber-300 rounded focus:ring-1 focus:ring-amber-500 focus:outline-hidden resize-none"
                                  />
                                </td>

                                {/* 4. Keterangan (Notes) */}
                                <td className="py-1 px-1.5 border-r border-amber-200 min-w-[140px]">
                                  <input
                                    type="text"
                                    value={editFormData.notes || ''}
                                    onChange={(e) => handleEditFormChange('notes', e.target.value)}
                                    placeholder="Keterangan..."
                                    className="w-full text-xs px-2 py-1 bg-white border border-amber-300 rounded"
                                  />
                                </td>

                                {/* 5. Type */}
                                <td className="py-1 px-1 border-r border-amber-200 w-20">
                                  <input
                                    type="text"
                                    placeholder="Tipe..."
                                    value={editFormData.type || ''}
                                    onChange={(e) => handleEditFormChange('type', e.target.value)}
                                    className="w-full text-center text-xs px-1 py-1 bg-white border border-amber-300 rounded font-bold font-mono uppercase"
                                    title="Tipe Material (PLT, PP, FB, EA, dll)"
                                  />
                                </td>

                                {/* 6. D1 */}
                                <td className="py-1 px-1 border-r border-amber-200 w-14">
                                  <input
                                    type="text"
                                    placeholder={activeLabels.placeholder1}
                                    value={editFormData.d1 || ''}
                                    onChange={(e) => handleEditFormChange('d1', e.target.value)}
                                    title={activeLabels.d1}
                                    className="w-full text-center font-mono text-xs px-1 py-1 bg-white border border-amber-300 rounded font-bold"
                                  />
                                </td>

                                {/* 7. D2 */}
                                <td className="py-1 px-1 border-r border-amber-200 w-14">
                                  <input
                                    type="text"
                                    placeholder={activeLabels.placeholder2}
                                    value={editFormData.d2 || ''}
                                    onChange={(e) => handleEditFormChange('d2', e.target.value)}
                                    title={activeLabels.d2}
                                    className="w-full text-center font-mono text-xs px-1 py-1 bg-white border border-amber-300 rounded font-bold"
                                  />
                                </td>

                                {/* 8. D3 */}
                                <td className="py-1 px-1 border-r border-amber-200 w-14">
                                  <input
                                    type="text"
                                    placeholder={activeLabels.placeholder3}
                                    value={editFormData.d3 || ''}
                                    onChange={(e) => handleEditFormChange('d3', e.target.value)}
                                    title={activeLabels.d3}
                                    className="w-full text-center font-mono text-xs px-1 py-1 bg-white border border-amber-300 rounded font-bold"
                                    disabled={activeLabels.placeholder3 === '-'}
                                  />
                                </td>

                                {/* 9. Panjang */}
                                <td className="py-1 px-1 border-r border-amber-200 w-16">
                                  <input
                                    type="text"
                                    placeholder={activeLabels.placeholderLen}
                                    value={editFormData.dLen || ''}
                                    onChange={(e) => handleEditFormChange('dLen', e.target.value)}
                                    title={activeLabels.dLen}
                                    className="w-full text-center font-mono text-xs px-1 py-1 bg-amber-50 border border-amber-300 rounded font-bold text-amber-900"
                                  />
                                </td>

                                {/* 10. D4 */}
                                <td className="py-1 px-1 border-r border-amber-200 w-14">
                                  <input
                                    type="text"
                                    placeholder={activeLabels.placeholder4}
                                    value={editFormData.d4 || ''}
                                    onChange={(e) => handleEditFormChange('d4', e.target.value)}
                                    title={activeLabels.d4}
                                    className="w-full text-center font-mono text-xs px-1 py-1 bg-white border border-amber-300 rounded font-bold"
                                  />
                                </td>

                                {/* 11. Vol / Qty */}
                                <td className="py-1 px-1 border-r border-amber-200 text-right w-20">
                                  <input
                                    type="number"
                                    step="any"
                                    value={editFormData.qty}
                                    onChange={(e) => handleEditFormChange('qty', parseFloat(e.target.value) || 0)}
                                    placeholder="Qty"
                                    className="w-full px-1 py-1 text-xs font-mono font-bold text-right bg-white border border-amber-300 rounded focus:outline-hidden"
                                  />
                                </td>

                                {/* Satuan */}
                                <td className="py-1 px-1 border-r border-amber-200 text-center w-20">
                                  <input
                                    type="text"
                                    value={editFormData.unit}
                                    onChange={(e) => handleEditFormChange('unit', e.target.value)}
                                    placeholder="Satuan"
                                    className="w-full px-1 py-1 text-[11px] font-mono text-center bg-white border border-slate-300 rounded"
                                  />
                                </td>

                                {/* 12. Remark */}
                                <td className="py-1 px-1.5 border-r border-amber-200 min-w-[130px] w-36">
                                  <input
                                    type="text"
                                    value={editFormData.remark || ''}
                                    onChange={(e) => handleEditFormChange('remark', e.target.value)}
                                    placeholder="Remark..."
                                    className="w-full text-xs px-2 py-1 bg-white border border-amber-300 rounded font-mono"
                                  />
                                </td>

                                {/* 13. Vendor / Subcont */}
                                <td className="py-1 px-2 border-r border-amber-200 min-w-[160px]">
                                  <div className="space-y-1">
                                    <input
                                      type="text"
                                      list={`vendor-presets-list-${item.id}`}
                                      value={editFormData.subcontractor || ''}
                                      onChange={(e) => handleEditFormChange('subcontractor', e.target.value)}
                                      placeholder="Nama Vendor / Subcont..."
                                      className="w-full px-2 py-1 text-xs font-semibold bg-white border border-amber-300 rounded focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
                                    />
                                    <datalist id={`vendor-presets-list-${item.id}`}>
                                      {VENDOR_PRESETS.map((vp) => (
                                        <option key={vp} value={vp} />
                                      ))}
                                      {existingVendors.map((ev) => (
                                        <option key={ev} value={ev} />
                                      ))}
                                    </datalist>
                                    {hasDirectWorkScope(editFormData) ? (
                                      <div className="text-[10px] text-amber-800 font-medium">
                                        *Terisi QTY &amp; WEIGHT: Wajib dialokasikan vendor
                                      </div>
                                    ) : (
                                      <div className="text-[10px] text-purple-700 font-medium">
                                        *Menyimpan vendor di sini otomatis diterapkan ke seluruh komponen di bawahnya
                                      </div>
                                    )}
                                  </div>
                                </td>

                                {/* 14. % Realisasi */}
                                <td className="py-1 px-1 text-center border-r border-amber-200 w-16">
                                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 font-mono">
                                    {editFormData.opnamePercent || 0}%
                                  </span>
                                </td>

                                {/* 16. Status Audit */}
                                <td className="py-1 px-1.5 border-r border-amber-200 w-32">
                                  <select
                                    value={editFormData.opnameStatus || 'Belum Diperiksa'}
                                    onChange={(e) => handleEditFormChange('opnameStatus', e.target.value as NonNullable<WorkItem['opnameStatus']>)}
                                    className="w-full text-[11px] font-semibold py-1 px-1 rounded-lg border border-amber-300 bg-white focus:outline-hidden cursor-pointer"
                                  >
                                    {OPNAME_STATUSES.map((st) => (
                                      <option key={st.value} value={st.value}>
                                        {st.label}
                                      </option>
                                    ))}
                                  </select>
                                </td>

                                {/* 17. Tanggal & QC Inspector */}
                                <td className="py-1 px-1.5 border-r border-amber-200 w-28">
                                  <div className="space-y-0.5">
                                    <input
                                      type="date"
                                      value={editFormData.opnameDate || ''}
                                      onChange={(e) => handleEditFormChange('opnameDate', e.target.value)}
                                      className="w-full text-[10px] font-mono px-1 py-0.5 bg-white border border-amber-300 rounded"
                                    />
                                    <input
                                      type="text"
                                      placeholder="Auditor..."
                                      value={editFormData.opnameInspector || ''}
                                      onChange={(e) => handleEditFormChange('opnameInspector', e.target.value)}
                                      className="w-full text-[10px] px-1 py-0.5 bg-white border border-amber-300 rounded"
                                    />
                                  </div>
                                </td>

                                {/* 18. Catatan QC */}
                                <td className="py-1 px-2 border-r border-amber-200 min-w-[160px]">
                                  <textarea
                                    rows={2}
                                    value={editFormData.opnameNotes || ''}
                                    onChange={(e) => handleEditFormChange('opnameNotes', e.target.value)}
                                    placeholder="Catatan hasil audit / temuan lapangan..."
                                    className="w-full text-[11px] px-2 py-1 bg-white border border-amber-300 rounded resize-none"
                                  />
                                </td>

                                {/* 19. Actions */}
                                <td className="py-2 px-1 text-center w-24">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={saveInlineEdit}
                                      className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-xs cursor-pointer"
                                      title="Simpan Perubahan (Ctrl+Enter)"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={cancelInlineEdit}
                                      className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md text-xs cursor-pointer"
                                      title="Batalkan (Esc)"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          }

                          // ================= NORMAL DISPLAY ROW =================
                          return (
                            <tr
                              key={item.id}
                              onDoubleClick={() => openInlineEdit(item)}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                setContextMenu({ x: e.clientX, y: e.clientY, item });
                              }}
                              className={`transition-colors text-xs select-none ${
                                isSelected
                                  ? 'bg-emerald-50/70'
                                  : isArea
                                  ? 'bg-slate-50/90 font-semibold'
                                  : 'hover:bg-slate-50/80 cursor-pointer'
                              }`}
                              title="Klik 2x untuk edit baris ini"
                            >
                              {/* 1. Checkbox */}
                              <td className="py-2 px-2 text-center border-r border-slate-200">
                                <button
                                  onClick={() => handleToggleSelectItem(item.id)}
                                  className="cursor-pointer inline-flex items-center justify-center text-slate-400 hover:text-emerald-700"
                                >
                                  {isSelected ? (
                                    <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Square className="w-3.5 h-3.5 text-slate-300" />
                                  )}
                                </button>
                              </td>

                              {/* 2. No */}
                              <SpreadsheetCell
                                itemId={item.id}
                                field="itemNo"
                                value={item.itemNo}
                                activeCell={spreadsheet.activeCell}
                                editingCell={spreadsheet.editingCell}
                                editValue={spreadsheet.editValue}
                                align="center"
                                className="font-mono text-slate-700 border-r border-slate-200"
                                onSelectCell={spreadsheet.setActiveCell}
                                onStartEdit={spreadsheet.startEditing}
                                onEditChange={spreadsheet.setEditValue}
                                onSaveEdit={spreadsheet.saveEditing}
                                onCancelEdit={spreadsheet.cancelEditing}
                                onContextMenu={(e, iId, f) => {
                                  e.preventDefault();
                                  spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item, field: f });
                                }}
                              />

                              {/* 3. Description & Structure */}
                              <SpreadsheetCell
                                itemId={item.id}
                                field="description"
                                value={item.description}
                                inputType="textarea"
                                activeCell={spreadsheet.activeCell}
                                editingCell={spreadsheet.editingCell}
                                editValue={spreadsheet.editValue}
                                align="left"
                                className="border-r border-slate-200 min-w-[280px]"
                                onSelectCell={spreadsheet.setActiveCell}
                                onStartEdit={spreadsheet.startEditing}
                                onEditChange={spreadsheet.setEditValue}
                                onSaveEdit={spreadsheet.saveEditing}
                                onCancelEdit={spreadsheet.cancelEditing}
                                onContextMenu={(e, iId, f) => {
                                  e.preventDefault();
                                  spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item, field: f });
                                }}
                                displayFormatter={(val) => (
                                  <div className={`flex flex-col gap-0.5 ${item.itemLevel === 2 ? 'pl-3' : item.itemLevel === 3 ? 'pl-6' : ''}`}>
                                    <span className={`text-slate-900 ${isArea ? 'font-bold text-slate-950' : item.itemLevel === 2 ? 'font-semibold text-slate-900' : 'font-normal'}`}>
                                      {val}
                                    </span>
                                    {item.updatedBy && (
                                      <span className="text-[9px] text-slate-400 font-mono">
                                        by {item.updatedBy.split(' ')[0]}
                                      </span>
                                    )}
                                  </div>
                                )}
                              />

                              {/* 4. Keterangan */}
                              <SpreadsheetCell
                                itemId={item.id}
                                field="notes"
                                value={item.notes}
                                activeCell={spreadsheet.activeCell}
                                editingCell={spreadsheet.editingCell}
                                editValue={spreadsheet.editValue}
                                align="left"
                                className="text-slate-600 text-[11px] font-normal min-w-[150px] w-44 border-r border-slate-200"
                                onSelectCell={spreadsheet.setActiveCell}
                                onStartEdit={spreadsheet.startEditing}
                                onEditChange={spreadsheet.setEditValue}
                                onSaveEdit={spreadsheet.saveEditing}
                                onCancelEdit={spreadsheet.cancelEditing}
                                onContextMenu={(e, iId, f) => {
                                  e.preventDefault();
                                  spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item, field: f });
                                }}
                              />

                              {/* 5. Type */}
                              <SpreadsheetCell
                                itemId={item.id}
                                field="type"
                                value={item.type && item.type !== '0' ? item.type : ''}
                                activeCell={spreadsheet.activeCell}
                                editingCell={spreadsheet.editingCell}
                                editValue={spreadsheet.editValue}
                                align="center"
                                className="font-mono text-xs border-r border-slate-200 text-slate-800 font-bold uppercase w-20"
                                onSelectCell={spreadsheet.setActiveCell}
                                onStartEdit={spreadsheet.startEditing}
                                onEditChange={spreadsheet.setEditValue}
                                onSaveEdit={spreadsheet.saveEditing}
                                onCancelEdit={spreadsheet.cancelEditing}
                                onContextMenu={(e, iId, f) => {
                                  e.preventDefault();
                                  spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item, field: f });
                                }}
                              />

                              {/* 6. D1 */}
                              <SpreadsheetCell
                                itemId={item.id}
                                field="d1"
                                value={item.d1 && item.d1 !== '0' ? item.d1 : ''}
                                activeCell={spreadsheet.activeCell}
                                editingCell={spreadsheet.editingCell}
                                editValue={spreadsheet.editValue}
                                align="center"
                                className="font-mono text-xs border-r border-slate-200 text-slate-800 font-bold w-14"
                                onSelectCell={spreadsheet.setActiveCell}
                                onStartEdit={spreadsheet.startEditing}
                                onEditChange={spreadsheet.setEditValue}
                                onSaveEdit={spreadsheet.saveEditing}
                                onCancelEdit={spreadsheet.cancelEditing}
                                onContextMenu={(e, iId, f) => {
                                  e.preventDefault();
                                  spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item, field: f });
                                }}
                              />

                              {/* 7. D2 */}
                              <SpreadsheetCell
                                itemId={item.id}
                                field="d2"
                                value={item.d2 && item.d2 !== '0' ? item.d2 : ''}
                                activeCell={spreadsheet.activeCell}
                                editingCell={spreadsheet.editingCell}
                                editValue={spreadsheet.editValue}
                                align="center"
                                className="font-mono text-xs border-r border-slate-200 text-slate-800 font-bold w-14"
                                onSelectCell={spreadsheet.setActiveCell}
                                onStartEdit={spreadsheet.startEditing}
                                onEditChange={spreadsheet.setEditValue}
                                onSaveEdit={spreadsheet.saveEditing}
                                onCancelEdit={spreadsheet.cancelEditing}
                                onContextMenu={(e, iId, f) => {
                                  e.preventDefault();
                                  spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item, field: f });
                                }}
                              />

                              {/* 8. D3 */}
                              <SpreadsheetCell
                                itemId={item.id}
                                field="d3"
                                value={item.d3 && item.d3 !== '0' ? item.d3 : ''}
                                activeCell={spreadsheet.activeCell}
                                editingCell={spreadsheet.editingCell}
                                editValue={spreadsheet.editValue}
                                align="center"
                                className="font-mono text-xs border-r border-slate-200 text-slate-800 font-bold w-14"
                                onSelectCell={spreadsheet.setActiveCell}
                                onStartEdit={spreadsheet.startEditing}
                                onEditChange={spreadsheet.setEditValue}
                                onSaveEdit={spreadsheet.saveEditing}
                                onCancelEdit={spreadsheet.cancelEditing}
                                onContextMenu={(e, iId, f) => {
                                  e.preventDefault();
                                  spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item, field: f });
                                }}
                              />

                              {/* 9. Panjang */}
                              <SpreadsheetCell
                                itemId={item.id}
                                field="dLen"
                                value={item.dLen && item.dLen !== '0' ? item.dLen : ''}
                                activeCell={spreadsheet.activeCell}
                                editingCell={spreadsheet.editingCell}
                                editValue={spreadsheet.editValue}
                                align="center"
                                className="font-mono text-xs border-x-2 border-amber-300/70 bg-amber-50/50 text-amber-900 font-bold w-16"
                                onSelectCell={spreadsheet.setActiveCell}
                                onStartEdit={spreadsheet.startEditing}
                                onEditChange={spreadsheet.setEditValue}
                                onSaveEdit={spreadsheet.saveEditing}
                                onCancelEdit={spreadsheet.cancelEditing}
                                onContextMenu={(e, iId, f) => {
                                  e.preventDefault();
                                  spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item, field: f });
                                }}
                              />

                              {/* 10. D4 */}
                              <SpreadsheetCell
                                itemId={item.id}
                                field="d4"
                                value={item.d4 && item.d4 !== '0' ? item.d4 : ''}
                                activeCell={spreadsheet.activeCell}
                                editingCell={spreadsheet.editingCell}
                                editValue={spreadsheet.editValue}
                                align="center"
                                className="font-mono text-xs border-r border-slate-200 text-slate-800 font-bold w-14"
                                onSelectCell={spreadsheet.setActiveCell}
                                onStartEdit={spreadsheet.startEditing}
                                onEditChange={spreadsheet.setEditValue}
                                onSaveEdit={spreadsheet.saveEditing}
                                onCancelEdit={spreadsheet.cancelEditing}
                                onContextMenu={(e, iId, f) => {
                                  e.preventDefault();
                                  spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item, field: f });
                                }}
                              />

                              {/* 11. Vol / Qty */}
                              <SpreadsheetCell
                                itemId={item.id}
                                field="qty"
                                value={item.qty}
                                inputType="number"
                                activeCell={spreadsheet.activeCell}
                                editingCell={spreadsheet.editingCell}
                                editValue={spreadsheet.editValue}
                                align="right"
                                className="border-r border-slate-200 w-20 font-bold font-mono text-xs"
                                onSelectCell={spreadsheet.setActiveCell}
                                onStartEdit={spreadsheet.startEditing}
                                onEditChange={spreadsheet.setEditValue}
                                onSaveEdit={spreadsheet.saveEditing}
                                onCancelEdit={spreadsheet.cancelEditing}
                                onContextMenu={(e, iId, f) => {
                                  e.preventDefault();
                                  spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item, field: f });
                                }}
                                displayFormatter={(val) => {
                                  if (val === undefined || val === null || (val as any) === '' || val === 0) return '-';
                                  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
                                  if (isNaN(num) || num === 0) return '-';
                                  return num.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                }}
                              />

                              {/* Satuan */}
                              <SpreadsheetCell
                                itemId={item.id}
                                field="unit"
                                value={item.unit}
                                activeCell={spreadsheet.activeCell}
                                editingCell={spreadsheet.editingCell}
                                editValue={spreadsheet.editValue}
                                align="center"
                                className="border-r border-slate-200 w-20 font-mono text-xs font-bold text-slate-600 bg-slate-50/40"
                                onSelectCell={spreadsheet.setActiveCell}
                                onStartEdit={spreadsheet.startEditing}
                                onEditChange={spreadsheet.setEditValue}
                                onSaveEdit={spreadsheet.saveEditing}
                                onCancelEdit={spreadsheet.cancelEditing}
                                onContextMenu={(e, iId, f) => {
                                  e.preventDefault();
                                  spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item, field: f });
                                }}
                                displayFormatter={(val) => val || '-'}
                              />

                              {/* 12. Remark */}
                              <SpreadsheetCell
                                itemId={item.id}
                                field="remark"
                                value={item.remark}
                                activeCell={spreadsheet.activeCell}
                                editingCell={spreadsheet.editingCell}
                                editValue={spreadsheet.editValue}
                                align="left"
                                className="text-slate-600 text-[11px] font-normal min-w-[130px] w-36 border-r border-slate-200"
                                onSelectCell={spreadsheet.setActiveCell}
                                onStartEdit={spreadsheet.startEditing}
                                onEditChange={spreadsheet.setEditValue}
                                onSaveEdit={spreadsheet.saveEditing}
                                onCancelEdit={spreadsheet.cancelEditing}
                                onContextMenu={(e, iId, f) => {
                                  e.preventDefault();
                                  spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item, field: f });
                                }}
                              />

                              {/* 13. VENDOR / SUBCONT */}
                              <td className="py-1.5 px-2.5 border-r border-slate-200 bg-amber-50/20 min-w-[170px]">
                                {editingVendorItemId === item.id ? (
                                  <div className="space-y-1.5 p-2 bg-white border border-purple-300 rounded-lg shadow-md min-w-[220px]">
                                    <div className="text-[10px] font-bold text-slate-700 flex items-center gap-1">
                                      <Building2 className="w-3 h-3 text-purple-600 shrink-0" />
                                      <span>Alokasi Vendor / Subcont</span>
                                    </div>

                                    <input
                                      type="text"
                                      autoFocus
                                      value={vendorInputValue}
                                      onChange={(e) => setVendorInputValue(e.target.value)}
                                      placeholder="Nama Vendor / Subkontraktor..."
                                      className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:outline-hidden focus:ring-1 focus:ring-purple-500 font-medium"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleVendorSave(item, vendorInputValue, !resolvedVendor.hasScope);
                                        } else if (e.key === 'Escape') {
                                          setEditingVendorItemId(null);
                                        }
                                      }}
                                    />

                                    {/* Scope Guidance Info */}
                                    <div className="text-[10px] leading-tight text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-200">
                                      {resolvedVendor.hasScope ? (
                                        <span className="text-amber-800 font-medium">
                                          • Item berbobot fisik (Qty: {item.qty} {item.unit || ''} / Berat: {item.weightKg || 0} kg). Vendor langsung disimpan pada baris ini.
                                        </span>
                                      ) : (
                                        <span className="text-purple-800 font-medium">
                                          • Area / Sub-system Header. Menyimpan vendor di sini otomatis mengalokasikan ke {resolvedVendor.scopedChildCount} komponen berbobot di bawahnya.
                                        </span>
                                      )}
                                    </div>

                                    {/* Preset recommendations */}
                                    <div className="max-h-24 overflow-y-auto divide-y divide-slate-100 text-[11px]">
                                      <div className="text-[10px] font-bold text-slate-400 uppercase py-0.5">
                                        Pilih Cepat Rekanan:
                                      </div>
                                      {VENDOR_PRESETS.map((vp) => (
                                        <button
                                          key={vp}
                                          type="button"
                                          onClick={() => setVendorInputValue(vp)}
                                          className="w-full text-left py-1 px-1.5 hover:bg-purple-50 text-slate-700 hover:text-purple-900 rounded truncate block cursor-pointer"
                                        >
                                          {vp}
                                        </button>
                                      ))}
                                    </div>

                                    <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-100">
                                      {resolvedVendor.hasScope && (
                                        <button
                                          type="button"
                                          onClick={() => handleVendorSave(item, vendorInputValue, true)}
                                          className="text-[10px] text-purple-700 hover:underline font-medium"
                                          title="Terapkan juga ke semua komponen di bawah hirarki ini"
                                        >
                                          + Ke Semua Sub-Item
                                        </button>
                                      )}
                                      <div className="flex items-center gap-1 ml-auto">
                                        <button
                                          type="button"
                                          onClick={() => setEditingVendorItemId(null)}
                                          className="px-2 py-0.5 text-xs text-slate-500 hover:text-slate-700"
                                        >
                                          Batal
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleVendorSave(item, vendorInputValue, !resolvedVendor.hasScope)}
                                          className="px-2 py-0.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-semibold"
                                        >
                                          {!resolvedVendor.hasScope ? 'Terapkan ke Komponen' : 'Simpan'}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between gap-1 group">
                                    {/* 1. If this item has direct QTY & WEIGHT */}
                                    {resolvedVendor.hasScope ? (
                                      resolvedVendor.directVendor ? (
                                        <span
                                          onClick={() => {
                                            setEditingVendorItemId(item.id);
                                            setVendorInputValue(resolvedVendor.directVendor);
                                          }}
                                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 transition-colors cursor-pointer truncate max-w-[200px]"
                                          title={`Vendor: ${resolvedVendor.directVendor} (Klik untuk edit)`}
                                        >
                                          <Building2 className="w-3 h-3 text-purple-600 shrink-0" />
                                          <span className="truncate">{resolvedVendor.directVendor}</span>
                                        </span>
                                      ) : (
                                        <button
                                          onClick={() => {
                                            setEditingVendorItemId(item.id);
                                            setVendorInputValue('');
                                          }}
                                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-dashed border-amber-300 hover:border-amber-400 transition-colors cursor-pointer"
                                          title="Wajib diisi: Item ini memiliki QTY & WEIGHT"
                                        >
                                          <PlusCircle className="w-3 h-3 text-amber-600" />
                                          <span>+ Isi Vendor</span>
                                        </button>
                                      )
                                    ) : (
                                      /* 2. If this item is Area / Sub-system Header (no direct Qty/Weight) */
                                      resolvedVendor.childVendors.length === 1 ? (
                                        <div className="flex items-center gap-1 flex-wrap">
                                          <span
                                            onClick={() => {
                                              setEditingVendorItemId(item.id);
                                              setVendorInputValue(resolvedVendor.displayVendor);
                                            }}
                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 transition-colors cursor-pointer truncate max-w-[170px]"
                                            title={`Menyesuaikan dari ${resolvedVendor.scopedChildWithVendorCount} komponen: ${resolvedVendor.displayVendor}`}
                                          >
                                            <Building2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                            <span className="truncate">{resolvedVendor.displayVendor}</span>
                                          </span>
                                          <span
                                            className="px-1.5 py-0.2 text-[9px] font-bold bg-emerald-100 text-emerald-800 rounded border border-emerald-200 shrink-0"
                                            title="Vendor otomatis menyesuaikan dari seluruh komponen berbobot di bawahnya"
                                          >
                                            Menyesuaikan ({resolvedVendor.scopedChildWithVendorCount}/{resolvedVendor.scopedChildCount})
                                          </span>
                                        </div>
                                      ) : resolvedVendor.childVendors.length > 1 ? (
                                        <div className="flex items-center gap-1 flex-wrap">
                                          <span
                                            onClick={() => {
                                              setEditingVendorItemId(item.id);
                                              setVendorInputValue('');
                                            }}
                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-300 transition-colors cursor-pointer truncate max-w-[170px]"
                                            title={`Vendor campuran pada komponen: ${resolvedVendor.childVendors.join(', ')}`}
                                          >
                                            <Users className="w-3 h-3 text-indigo-600 shrink-0" />
                                            <span className="truncate">{resolvedVendor.childVendors.length} Vendor Komponen</span>
                                          </span>
                                          <span
                                            className="px-1.5 py-0.2 text-[9px] font-bold bg-indigo-100 text-indigo-800 rounded border border-indigo-200 shrink-0"
                                            title={`Komponen memiliki vendor berbeda: ${resolvedVendor.childVendors.join(', ')}`}
                                          >
                                            Campuran ({resolvedVendor.scopedChildWithVendorCount}/{resolvedVendor.scopedChildCount})
                                          </span>
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => {
                                            setEditingVendorItemId(item.id);
                                            setVendorInputValue(resolvedVendor.directVendor || '');
                                          }}
                                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium text-slate-500 hover:text-purple-700 hover:bg-purple-50 border border-dashed border-slate-300 hover:border-purple-300 transition-colors cursor-pointer"
                                          title="Terapkan nama vendor ke seluruh komponen berbobot di bawah level ini"
                                        >
                                          <PlusCircle className="w-3 h-3 text-slate-400" />
                                          <span>+ Alokasi ke Komponen ({resolvedVendor.scopedChildCount})</span>
                                        </button>
                                      )
                                    )}

                                    <button
                                      onClick={() => {
                                        setEditingVendorItemId(item.id);
                                        setVendorInputValue(resolvedVendor.displayVendor || resolvedVendor.directVendor || '');
                                      }}
                                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-purple-600 p-1 transition-opacity cursor-pointer ml-auto"
                                      title="Edit Vendor"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </td>

                              {/* 14. % Realisasi Opname */}
                              <td className="py-2 px-2 text-center font-mono border-r border-slate-200 w-16">
                                <span
                                  className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    opPercent >= 100
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : opPercent > 0
                                      ? 'bg-sky-100 text-sky-800'
                                      : 'bg-slate-100 text-slate-500'
                                  }`}
                                >
                                  {opPercent}%
                                </span>
                              </td>

                              {/* 16. Status Audit Dropdown / Pill */}
                              <td className="py-1.5 px-2 text-center border-r border-slate-200 w-32">
                                <select
                                  value={status}
                                  onChange={(e) =>
                                    handleStatusChange(item, e.target.value as NonNullable<WorkItem['opnameStatus']>)
                                  }
                                  className={`w-full text-[11px] font-semibold py-1 px-1.5 rounded-lg border focus:outline-hidden cursor-pointer transition-colors ${statusConfig.badgeClass}`}
                                >
                                  {OPNAME_STATUSES.map((st) => (
                                    <option key={st.value} value={st.value}>
                                      {st.label}
                                    </option>
                                  ))}
                                </select>
                              </td>

                              {/* 17. Tanggal Opname & QC Inspector */}
                              <td className="py-1.5 px-2 text-center border-r border-slate-200 w-28">
                                <div className="space-y-0.5">
                                  <input
                                    type="date"
                                    value={item.opnameDate || ''}
                                    onChange={(e) =>
                                      onUpdateItem({
                                        ...item,
                                        opnameDate: e.target.value,
                                        updatedAt: new Date().toISOString(),
                                      })
                                    }
                                    className="w-full text-[10px] font-mono px-1 py-0.5 bg-slate-50 border border-slate-200 rounded text-slate-700"
                                  />
                                  <input
                                    type="text"
                                    placeholder="Nama Auditor..."
                                    value={item.opnameInspector || ''}
                                    onChange={(e) =>
                                      onUpdateItem({
                                        ...item,
                                        opnameInspector: e.target.value,
                                        updatedAt: new Date().toISOString(),
                                      })
                                    }
                                    className="w-full text-[10px] px-1 py-0.5 bg-slate-50 border border-slate-200 rounded text-slate-700 truncate"
                                    title="Nama Auditor / QC Inspector Verifikator"
                                  />
                                </div>
                              </td>

                              {/* 18. Catatan & Temuan QC */}
                              <td className="py-1.5 px-2.5 border-r border-slate-200 min-w-[160px]">
                                <textarea
                                  rows={1}
                                  value={item.opnameNotes || ''}
                                  placeholder="Catatan hasil audit / temuan lapangan..."
                                  onChange={(e) => handleOpnameNotesChange(item, e.target.value)}
                                  className="w-full text-[11px] px-2 py-1 bg-white border border-slate-200 rounded text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 resize-none min-h-[30px]"
                                />
                              </td>

                              {/* 19. Row Action Buttons: OK, Edit, Sisipkan, Hapus */}
                              <td className="py-1 px-1.5 text-center w-24">
                                <div className="flex items-center justify-center gap-1">
                                  {status !== 'Terverifikasi' ? (
                                    <button
                                      type="button"
                                      onClick={() => handleQuickVerify(item)}
                                      className="inline-flex items-center gap-0.5 px-1.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-semibold transition-colors cursor-pointer shadow-2xs"
                                      title="Verifikasi 100% (Setujui hasil opname)"
                                    >
                                      <Check className="w-3 h-3" />
                                      <span>OK</span>
                                    </button>
                                  ) : (
                                    <span
                                      className="inline-flex items-center text-emerald-600 p-0.5"
                                      title="Pekerjaan telah terverifikasi"
                                    >
                                      <CheckCircle2 className="w-4 h-4" />
                                    </span>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => openInlineEdit(item)}
                                    className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                                    title="Edit Baris Ini (Klik 2x)"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => insertRowBelow(item)}
                                    className="p-1 text-slate-500 hover:text-sky-700 hover:bg-sky-50 rounded transition-colors cursor-pointer"
                                    title="Sisipkan Baris di Bawah"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>

                                  {(onDeleteItem || onBulkDeleteItems) && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteItem(item)}
                                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                      title="Hapus Baris Ini"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right-click Context Menu for Opname Table */}
        {spreadsheet.contextMenu && (
          <SpreadsheetContextMenu
            x={spreadsheet.contextMenu.x}
            y={spreadsheet.contextMenu.y}
            item={spreadsheet.contextMenu.item}
            field={spreadsheet.contextMenu.field}
            onClose={() => spreadsheet.setContextMenu(null)}
            onCut={spreadsheet.cutActiveCell}
            onCopy={spreadsheet.copyActiveCell}
            onPaste={spreadsheet.pasteActiveCell}
            onClearCell={spreadsheet.clearActiveCell}
            onInsertRowAbove={(target) => insertRowBelow(target)}
            onInsertRowBelow={(target) => insertRowBelow(target)}
            onDeleteRow={(id) => onDeleteItem && onDeleteItem(id)}
            onEditRow={(target) => openInlineEdit(target)}
          />
        )}
      </div>
      )}

      {/* 5. Modal: Tetapkan Vendor Massal */}
      {isBulkVendorModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-4 sm:p-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-600" />
                <h3 className="text-base font-bold text-slate-900">Tetapkan Nama Vendor Massal</h3>
              </div>
              <button
                onClick={() => setIsBulkVendorModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                &times;
              </button>
            </div>

            <div className="py-4 space-y-3">
              <p className="text-xs text-slate-600">
                Pilih atau masukkan nama Vendor / Subkontraktor untuk diterapkan ke{' '}
                <span className="font-bold text-slate-900">{selectedItemIds.size} item pekerjaan</span> yang dipilih:
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Vendor / Subkontraktor
                </label>
                <input
                  type="text"
                  value={bulkVendorName}
                  onChange={(e) => setBulkVendorName(e.target.value)}
                  placeholder="Contoh: PT. Samudra Tehnik Mandiri..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <div className="text-[11px] font-semibold text-slate-500 mb-1.5">
                  Atau pilih dari rekanan terdaftar:
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                  {VENDOR_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setBulkVendorName(p)}
                      className="px-2 py-1 rounded-md text-[11px] bg-slate-100 hover:bg-purple-100 hover:text-purple-900 text-slate-700 border border-slate-200 transition-colors text-left"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsBulkVendorModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleBulkApplyVendor}
                disabled={!bulkVendorName.trim()}
                className="px-4 py-1.5 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                Terapkan ke {selectedItemIds.size} Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal: Cetak Berita Acara Pemeriksaan Opname (BAPO) Terfilter Vendor */}
      {isBapoModalOpen && (
        <div
          id="bapo-modal-overlay"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
        >
          {/* Embedded Print CSS for pristine A4 Landscape document export */}
          <style>{`
            @media print {
              @page {
                size: A4 landscape;
                margin: 8mm;
              }
              body * {
                visibility: hidden !important;
              }
              #bapo-modal-overlay, #bapo-modal-overlay * {
                visibility: visible !important;
              }
              #bapo-modal-overlay {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                height: auto !important;
                background: white !important;
                padding: 0 !important;
                margin: 0 !important;
                overflow: visible !important;
              }
              #bapo-modal-card {
                border: none !important;
                box-shadow: none !important;
                max-width: 100% !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                border-radius: 0 !important;
                background: white !important;
              }
              .bapo-screen-only {
                display: none !important;
              }
              #bapo-print-sheet {
                width: 100% !important;
                padding: 0 !important;
                margin: 0 !important;
                box-shadow: none !important;
                border: none !important;
              }
            }
          `}</style>

          <div
            id="bapo-modal-card"
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col my-auto"
          >
            {/* Modal Top Bar (Screen Only) */}
            <div className="p-3.5 sm:p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50 rounded-t-2xl bapo-screen-only">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm sm:text-base text-slate-900">
                      Berita Acara Pemeriksaan Opname (BAPO)
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Dokumen Resmi Audit
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Verifikasi fisik, deviasi volume lapangan, dan pengesahan bersama vendor / subkontraktor pelaksana.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadBapoPdf}
                  disabled={isBapoGenerating}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                  title="Unduh dokumen BAPO resmi dalam format PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isBapoGenerating ? 'Memproses PDF...' : 'Unduh PDF BAPO'}</span>
                </button>
                <button
                  onClick={handleExportBapoCsv}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                  title="Unduh BAPO yang sedang terfilter dalam format CSV"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#03442C] hover:bg-[#07593D] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                  title="Cetak lembar BAPO resmi ke printer atau simpan sebagai PDF"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak / Print</span>
                </button>
                <button
                  onClick={() => setIsBapoModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                  title="Tutup Modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filter Toolbar Inside Modal (Screen Only) */}
            <div className="p-3 bg-slate-100/80 border-b border-slate-200 space-y-2.5 bapo-screen-only">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                {/* Vendor Dropdown Selector */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-purple-600" />
                    Pilih Rekanan / Vendor:
                  </span>
                  <select
                    value={bapoSelectedVendor}
                    onChange={(e) => setBapoSelectedVendor(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 min-w-[200px]"
                  >
                    <option value="all">Semua Rekanan / Subkontraktor ({workItems.length} item)</option>
                    <option value="unassigned">-- Belum Ditentukan (Internal / Galangan) --</option>
                    {existingVendors.map((v) => {
                      const count = workItems.filter((w) => {
                        const res = getResolvedVendorInfo(w, workItems);
                        return (
                          (w.subcontractor || w.assignedTo || '').trim().toLowerCase() === v.toLowerCase() ||
                          res.displayVendor?.toLowerCase() === v.toLowerCase() ||
                          res.childVendors.some((cv) => cv.toLowerCase() === v.toLowerCase())
                        );
                      }).length;
                      return (
                        <option key={v} value={v}>
                          {v} ({count} item pekerjaan)
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Status, Category, & View Mode Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-slate-600">Status:</span>
                  <select
                    value={bapoStatusFilter}
                    onChange={(e) => setBapoStatusFilter(e.target.value as any)}
                    className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="all">Semua Status Opname</option>
                    <option value="verified_only">Hanya Terverifikasi (100%)</option>
                    <option value="pending_only">Belum Verifikasi / Pending</option>
                  </select>

                  <select
                    value={bapoCategoryFilter}
                    onChange={(e) => setBapoCategoryFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-emerald-500 max-w-[170px]"
                  >
                    <option value="all">Semua Kategori (I - XII)</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code}. {c.name}
                      </option>
                    ))}
                  </select>

                  {/* View Mode Toggle: Full (Opname Table Aligned) vs Compact */}
                  <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setBapoViewMode('full')}
                      className={`px-2 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                        bapoViewMode === 'full'
                          ? 'bg-emerald-700 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                      title="Format Lengkap Persis Tabel Opname & Subcont (Termasuk Dimensi D1-D4, Panjang, Tonase, dll)"
                    >
                      Format Lengkap
                    </button>
                    <button
                      type="button"
                      onClick={() => setBapoViewMode('compact')}
                      className={`px-2 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                        bapoViewMode === 'compact'
                          ? 'bg-emerald-700 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                      title="Format Ringkas Eksekutif"
                    >
                      Format Ringkas
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Vendor Chips for Fast 1-Click Switching */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-1">
                <button
                  onClick={() => setBapoSelectedVendor('all')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium shrink-0 transition-colors cursor-pointer ${
                    bapoSelectedVendor === 'all'
                      ? 'bg-slate-900 text-white font-bold'
                      : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-300'
                  }`}
                >
                  Semua ({workItems.length})
                </button>
                <button
                  onClick={() => setBapoSelectedVendor('unassigned')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium shrink-0 transition-colors cursor-pointer ${
                    bapoSelectedVendor === 'unassigned'
                      ? 'bg-amber-700 text-white font-bold'
                      : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300'
                  }`}
                >
                  Belum Ditentukan
                </button>
                {existingVendors.map((v) => {
                  const isSelected = bapoSelectedVendor.toLowerCase() === v.toLowerCase();
                  const count = workItems.filter((w) => {
                    const res = getResolvedVendorInfo(w, workItems);
                    return (
                      (w.subcontractor || w.assignedTo || '').trim().toLowerCase() === v.toLowerCase() ||
                      res.displayVendor?.toLowerCase() === v.toLowerCase() ||
                      res.childVendors.some((cv) => cv.toLowerCase() === v.toLowerCase())
                    );
                  }).length;
                  return (
                    <button
                      key={v}
                      onClick={() => setBapoSelectedVendor(isSelected ? 'all' : v)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium shrink-0 transition-colors cursor-pointer border ${
                        isSelected
                          ? 'bg-emerald-700 text-white font-bold border-emerald-800'
                          : 'bg-white hover:bg-slate-200 text-slate-700 border-slate-300'
                      }`}
                    >
                      <span>{v}</span>
                      <span className="ml-1 text-[10px] opacity-80 font-mono font-bold">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Body: Printable BAPO Document */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs font-sans text-slate-900 print:p-0">
              <div id="bapo-print-sheet" className="space-y-4">
                {/* Official Shipyard & Project Info Header */}
                <div className="border-b-2 border-slate-900 pb-3">
                  <div className="text-center space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      DOKUMEN RESMI AUDIT BERSAMA &bull; JOINT INSPECTION REPORT
                    </div>
                    <h2 className="text-base sm:text-lg font-extrabold tracking-wider uppercase text-slate-950">
                      BERITA ACARA PEMERIKSAAN OPNAME (BAPO)
                    </h2>
                    <p className="text-xs font-semibold text-slate-700">
                      VERIFIKASI FISIK &amp; KEMAJUAN VOLUME PEKERJAAN REPARASI KAPAL
                    </p>
                    <p className="text-[11px] font-mono text-slate-500">
                      NO. DOKUMEN:{' '}
                      <span className="font-bold text-slate-800">
                        BAPO/{vessel?.projectNo || 'PRJ'}/
                        {bapoSelectedVendor !== 'all' && bapoSelectedVendor !== 'unassigned'
                          ? bapoSelectedVendor.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase().slice(0, 12)
                          : 'ALL'}
                        /{new Date().getFullYear()}
                      </span>
                    </p>
                  </div>

                  {/* Vessel & Project Meta */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-[11px] bg-slate-50 p-3 rounded-lg border border-slate-300 font-mono">
                    <div>
                      <span className="text-slate-500 block text-[10px]">NAMA KAPAL:</span>
                      <span className="font-bold text-slate-900 text-xs">
                        {vessel?.name || ''} {vessel?.vesselType ? `(${vessel.vesselType})` : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">NO. PROYEK:</span>
                      <span className="font-bold text-slate-900 text-xs">
                        {vessel?.projectNo || ''} {schedule?.dockingPosition ? `/ Dock ${schedule.dockingPosition}` : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">TANGGAL CETAK &amp; AUDIT:</span>
                      <span className="font-bold text-slate-900 text-xs">
                        {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  {/* Highlighted Vendor & Audit Scope Box */}
                  <div
                    className={`mt-2.5 p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
                      bapoSelectedVendor !== 'all' && bapoSelectedVendor !== 'unassigned'
                        ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                        : bapoSelectedVendor === 'unassigned'
                        ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                        : 'bg-slate-100/90 border-slate-300 text-slate-900'
                    }`}
                  >
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">
                        PELAKSANA / VENDOR / SUBKONTRAKTOR:
                      </span>
                      <div className="text-sm font-extrabold flex items-center gap-1.5 mt-0.5">
                        <Building2 className="w-4 h-4 text-emerald-700" />
                        <span>
                          {bapoSelectedVendor === 'all'
                            ? 'SEMUA VENDOR / SUBKONTRAKTOR TERDAFTAR'
                            : bapoSelectedVendor === 'unassigned'
                            ? 'BELUM DITENTUKAN (INTERNAL GALANGAN)'
                            : bapoSelectedVendor}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-right font-mono text-[11px] shrink-0">
                      <div className="bg-white/90 px-2.5 py-1 rounded border border-slate-200">
                        <span className="text-slate-500 text-[10px] block">TOTAL ITEM</span>
                        <span className="font-bold text-slate-900">{bapoStats.totalItems} Pekerjaan</span>
                      </div>
                      <div className="bg-white/90 px-2.5 py-1 rounded border border-slate-200">
                        <span className="text-slate-500 text-[10px] block">TERVERIFIKASI</span>
                        <span className="font-bold text-emerald-700">
                          {bapoStats.verifiedItemsCount} ({bapoStats.verifiedPercent}%)
                        </span>
                      </div>
                      <div className="bg-white/90 px-2.5 py-1 rounded border border-slate-200">
                        <span className="text-slate-500 text-[10px] block">TOTAL TONASE</span>
                        <span className="font-bold text-amber-800">
                          {bapoStats.totalWeightKg > 0
                            ? `${bapoStats.totalWeightKg.toFixed(2)} kg (${(bapoStats.totalWeightKg / 1000).toFixed(2)} Ton)`
                            : '-'}
                        </span>
                      </div>
                      <div className="bg-white/90 px-2.5 py-1 rounded border border-slate-200">
                        <span className="text-slate-500 text-[10px] block">RATA-RATA PROGRES</span>
                        <span className="font-bold text-sky-800">{bapoStats.averageProgress}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Table of Audited Works - Aligned with Opname & Subcont Table */}
                <div className="border-2 border-[#03442C]/40 rounded-lg overflow-hidden shadow-xs">
                  {bapoViewMode === 'full' ? (
                    /* ================= FULL TABLE ALIGNED WITH OPNAME & SUBCONT ================= */
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[11px] border-collapse border border-slate-300">
                        <thead>
                          <tr className="bg-[#03442C] text-white font-bold uppercase text-[9px] sm:text-[10px] tracking-wider align-middle border-b-2 border-emerald-950">
                            <th className="py-2.5 px-2 w-14 text-center border-r border-emerald-800/60 font-mono">No</th>
                            <th className="py-2.5 px-3 min-w-[240px] border-r border-emerald-800/60">
                              WORK ITEMS / SKEMA STRUKTUR HIERARKI
                            </th>
                            <th className="py-2.5 px-2.5 min-w-[120px] w-32 border-r border-emerald-800/60">Keterangan</th>
                            <th className="py-2.5 px-1.5 w-16 text-center border-r border-emerald-800/60 font-mono">Type</th>
                            <th className="py-2.5 px-1.5 w-12 text-center border-r border-emerald-800/60 font-mono" title="Dimensi 1 (Panjang/Diameter mm)">D1</th>
                            <th className="py-2.5 px-1.5 w-12 text-center border-r border-emerald-800/60 font-mono" title="Dimensi 2 (Lebar/Sayap mm)">D2</th>
                            <th className="py-2.5 px-1.5 w-12 text-center border-r border-emerald-800/60 font-mono" title="Dimensi 3 (Tebal mm)">D3</th>
                            <th className="py-2.5 px-1.5 w-16 text-center bg-[#07593D] text-amber-300 border-x-2 border-amber-400/70 font-mono font-extrabold" title="Ukuran panjang siku, pipa, h-beam, round bar, flat bar & square bar (mm)">Panjang</th>
                            <th className="py-2.5 px-1.5 w-12 text-center border-r border-emerald-800/60 font-mono" title="Dimensi 4 (Pengali/Pcs)">D4</th>
                            <th className="py-2.5 px-2 w-16 text-right border-r border-emerald-800/60 font-mono" title="Volume / Kuantitas">Vol / Qty</th>
                            <th className="py-2.5 px-1.5 w-14 text-center border-r border-emerald-800/60 font-mono" title="Satuan">Satuan</th>
                            <th className="py-2.5 px-2 w-20 text-right border-r border-emerald-800/60 font-mono text-amber-300" title="Tonase (kg)">Tonase (kg)</th>
                            <th className="py-2.5 px-2.5 min-w-[100px] w-28 text-left border-r border-emerald-800/60 font-mono">Remark</th>
                            <th className="py-2.5 px-2 w-28 text-center border-r border-emerald-800/60">STATUS AUDIT</th>
                            <th className="py-2.5 px-2 w-24 text-center border-r border-emerald-800/60 font-mono">TANGGAL &amp; QC</th>
                            <th className="py-2.5 px-2.5 min-w-[140px]">CATATAN &amp; TEMUAN QC</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {bapoFilteredWorkItems.length === 0 ? (
                            <tr>
                              <td colSpan={16} className="py-8 text-center text-slate-500 italic">
                                Tidak ada item pekerjaan yang sesuai dengan filter vendor / status BAPO terpilih.
                              </td>
                            </tr>
                          ) : (
                            categories.map((cat) => {
                              const catItems = bapoFilteredWorkItems.filter(
                                (item) => item.categoryId === cat.id || item.categoryId === cat.code
                              );
                              if (catItems.length === 0) return null;

                              return (
                                <React.Fragment key={cat.id}>
                                  {/* Category Header Row (like main table) */}
                                  <tr className="bg-[#03442C]/10 text-[#03442C] font-bold border-t-2 border-b-2 border-[#03442C]/30 text-xs">
                                    <td colSpan={16} className="py-2 px-3">
                                      <div className="flex items-center justify-between">
                                        <span className="tracking-wide uppercase">
                                          KATEGORI {cat.code}. {cat.name}
                                        </span>
                                        <span className="text-[11px] font-normal text-slate-600 font-mono">
                                          ({catItems.length} item pekerjaan)
                                        </span>
                                      </div>
                                    </td>
                                  </tr>

                                  {/* Category Item Rows */}
                                  {catItems.map((w) => {
                                    const resVendor = getResolvedVendorInfo(w, workItems);
                                    const vendorName =
                                      resVendor.displayVendor || resVendor.directVendor || w.subcontractor || w.assignedTo || '-';
                                    const opQty = w.opnameQty !== undefined && w.opnameQty !== null ? w.opnameQty : w.qty;
                                    const diff =
                                      w.opnameQty !== undefined && w.opnameQty !== null ? (w.opnameQty - w.qty) : 0;
                                    const isArea = w.isAreaHeader || !hasDirectWorkScope(w);
                                    const opPercent =
                                      w.opnamePercent !== undefined
                                        ? w.opnamePercent
                                        : w.opnameStatus === 'Terverifikasi'
                                        ? 100
                                        : w.qty > 0 && w.opnameQty !== undefined
                                        ? Math.round((w.opnameQty / w.qty) * 100)
                                        : 0;

                                    return (
                                      <tr
                                        key={w.id}
                                        className={`transition-colors text-[11px] ${
                                          isArea ? 'bg-slate-50 font-semibold' : 'hover:bg-slate-50'
                                        }`}
                                      >
                                        {/* 1. No */}
                                        <td className="py-2 px-2 text-center font-mono text-slate-700 border-r border-slate-200">
                                          {w.itemNo}
                                        </td>

                                        {/* 2. WORK ITEMS / Hierarchical Description */}
                                        <td className="py-2 px-3 border-r border-slate-200 min-w-[240px]">
                                          <div
                                            className={`flex flex-col gap-0.5 ${
                                              w.itemLevel === 2 ? 'pl-3' : w.itemLevel === 3 ? 'pl-6' : ''
                                            }`}
                                          >
                                            <span
                                              className={`text-slate-900 ${
                                                isArea
                                                  ? 'font-bold text-slate-950'
                                                  : w.itemLevel === 2
                                                  ? 'font-semibold text-slate-900'
                                                  : 'font-normal'
                                              }`}
                                            >
                                              {w.description}
                                            </span>
                                          </div>
                                        </td>

                                         {/* 3. Keterangan */}
                                        <td className="py-2 px-2.5 border-r border-slate-200 text-slate-700 min-w-[120px] w-32">
                                          {w.notes || ''}
                                        </td>

                                        {/* 4. Type */}
                                        <td className="py-2 px-1 text-center font-mono border-r border-slate-200 text-slate-800 font-bold uppercase w-16">
                                          {w.type && w.type !== '0' ? w.type : ''}
                                        </td>

                                        {/* 5. D1 */}
                                        <td className="py-2 px-1 text-center font-mono border-r border-slate-200 text-slate-800 font-bold w-12">
                                          {w.d1 && w.d1 !== '0' ? w.d1 : ''}
                                        </td>

                                        {/* 6. D2 */}
                                        <td className="py-2 px-1 text-center font-mono border-r border-slate-200 text-slate-800 font-bold w-12">
                                          {w.d2 && w.d2 !== '0' ? w.d2 : ''}
                                        </td>

                                        {/* 7. D3 */}
                                        <td className="py-2 px-1 text-center font-mono border-r border-slate-200 text-slate-800 font-bold w-12">
                                          {w.d3 && w.d3 !== '0' ? w.d3 : ''}
                                        </td>

                                        {/* 8. Panjang */}
                                        <td className="py-2 px-1 text-center font-mono border-x-2 border-amber-300/70 bg-amber-50/60 text-amber-900 font-bold w-16">
                                          {w.dLen && w.dLen !== '0' ? w.dLen : ''}
                                        </td>

                                        {/* 9. D4 */}
                                        <td className="py-2 px-1 text-center font-mono border-r border-slate-200 text-slate-800 font-bold w-12">
                                          {w.d4 && w.d4 !== '0' ? w.d4 : ''}
                                        </td>

                                        {/* 10. Vol / Qty */}
                                        <td className="py-2 px-2 text-right border-r border-slate-200 w-16 font-mono text-slate-800 font-semibold">
                                          {w.qty !== undefined && w.qty !== null && w.qty > 0 ? (Number.isInteger(w.qty) ? w.qty : w.qty.toFixed(2)) : '-'}
                                        </td>

                                        {/* 11. Satuan */}
                                        <td className="py-2 px-1 text-center border-r border-slate-200 w-14 font-mono text-[11px] font-bold text-slate-600">
                                          {w.unit || '-'}
                                        </td>

                                        {/* 12. Tonase (kg) */}
                                        <td className="py-2 px-2 text-right border-r border-slate-200 w-20 font-mono text-amber-800 font-bold">
                                          {w.weightKg && w.weightKg > 0 ? w.weightKg.toFixed(2) : '-'}
                                        </td>

                                        {/* 12. Remark */}
                                        <td className="py-2 px-2.5 text-left border-r border-slate-200 font-mono text-slate-700 min-w-[100px] w-28">
                                          {w.remark || ''}
                                        </td>

                                        {/* 13. STATUS AUDIT */}
                                        <td className="py-2 px-1.5 text-center border-r border-slate-200 w-28">
                                          <span
                                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                              w.opnameStatus === 'Terverifikasi'
                                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                                : w.opnameStatus === 'Revisi / Temuan'
                                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                                : w.opnameStatus === 'Ditolak'
                                                ? 'bg-red-100 text-red-800 border border-red-300'
                                                : 'bg-slate-100 text-slate-700 border border-slate-300'
                                            }`}
                                          >
                                            {w.opnameStatus || 'Belum Diperiksa'}
                                          </span>
                                        </td>

                                         {/* 14. TANGGAL & QC */}
                                        <td className="py-2 px-1.5 text-center border-r border-slate-200 w-24 font-mono text-[10px]">
                                          {w.opnameDate ? (
                                            <div>
                                              <div className="text-slate-700 font-semibold">{w.opnameDate}</div>
                                              {w.opnameInspector && (
                                                <div className="text-slate-500 truncate" title={w.opnameInspector}>
                                                  {w.opnameInspector}
                                                </div>
                                              )}
                                            </div>
                                          ) : (
                                            ''
                                          )}
                                        </td>

                                        {/* 15. CATATAN & TEMUAN QC */}
                                        <td className="py-2 px-2.5 text-slate-700 text-[10px] min-w-[140px]">
                                          {w.opnameNotes || w.remark || ''}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </React.Fragment>
                              );
                            })
                          )}
                        </tbody>
                        {bapoFilteredWorkItems.length > 0 && (
                          <tfoot>
                            <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900 text-[11px]">
                              <td colSpan={9} className="py-2.5 px-3 text-right border-r border-slate-300 font-sans">
                                REKAPITULASI TOTAL / RATA-RATA:
                              </td>
                              <td className="py-2.5 px-2 text-right font-mono border-r border-slate-300">
                                {bapoStats.totalContractQty.toLocaleString('id-ID')}
                              </td>
                              <td className="py-2.5 px-1 text-center font-mono border-r border-slate-300 text-slate-400">
                                -
                              </td>
                              <td className="py-2.5 px-2 text-right font-mono border-r border-slate-300 font-bold text-amber-800">
                                {bapoStats.totalWeightKg > 0 ? bapoStats.totalWeightKg.toFixed(2) : '-'}
                              </td>
                              <td className="py-2.5 px-2.5 border-r border-slate-300" />
                              <td className="py-2.5 px-1.5 text-center border-r border-slate-300 text-[10px] text-emerald-800">
                                {bapoStats.verifiedItemsCount}/{bapoStats.totalItems} Selesai
                              </td>
                              <td colSpan={2} className="py-2.5 px-3 text-[10px] text-slate-600 font-normal">
                                Dokumen terverifikasi fisik di lapangan bersama Rekanan &amp; QC Inspector
                              </td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  ) : (
                    /* ================= COMPACT EXECUTIVE TABLE ================= */
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[11px] border-collapse">
                        <thead>
                          <tr className="bg-slate-100 font-bold border-b border-slate-300 text-slate-800">
                            <th className="py-2 px-1.5 border-r border-slate-300 w-8 text-center font-mono">No</th>
                            <th className="py-2 px-2 border-r border-slate-300 w-20 font-mono text-center">No. Item</th>
                            <th className="py-2 px-3 border-r border-slate-300">Uraian Item Pekerjaan</th>
                            <th className="py-2 px-2 border-r border-slate-300 w-32">Kategori</th>
                            <th className="py-2 px-2 border-r border-slate-300 w-16 text-right font-mono">Vol / Qty</th>
                            <th className="py-2 px-1.5 border-r border-slate-300 w-14 text-center font-mono">Satuan</th>
                            <th className="py-2 px-2 border-r border-slate-300 w-20 text-right font-mono text-amber-800">Tonase (kg)</th>
                            <th className="py-2 px-2 border-r border-slate-300 w-16 text-right">Selisih</th>
                            <th className="py-2 px-2 border-r border-slate-300 w-24 text-center">Status</th>
                            <th className="py-2 px-3">Catatan Verifikasi &amp; QC</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {bapoFilteredWorkItems.length === 0 ? (
                            <tr>
                              <td colSpan={10} className="py-8 text-center text-slate-500 italic">
                                Tidak ada item pekerjaan yang sesuai dengan filter vendor / status BAPO terpilih.
                              </td>
                            </tr>
                          ) : (
                            bapoFilteredWorkItems.map((w, idx) => {
                              const resVendor = getResolvedVendorInfo(w, workItems);
                              const cat = categories.find((c) => c.id === w.categoryId || c.code === w.categoryId);
                              const catCode = cat ? `${cat.code}` : w.categoryId || '-';
                              const opQty = w.opnameQty !== undefined && w.opnameQty !== null ? w.opnameQty : w.qty;
                              const diff =
                                w.opnameQty !== undefined && w.opnameQty !== null
                                  ? (w.opnameQty - w.qty).toFixed(2)
                                  : '0.00';
                              const isVerified = w.opnameStatus === 'Terverifikasi' || (w.opnamePercent || 0) >= 100;

                              return (
                                <tr
                                  key={w.id}
                                  className={`hover:bg-slate-50 ${w.isAreaHeader ? 'bg-slate-50/70 font-semibold' : ''}`}
                                >
                                  <td className="py-1.5 px-1.5 text-center font-mono border-r border-slate-200 text-slate-500">
                                    {idx + 1}
                                  </td>
                                  <td className="py-1.5 px-2 text-center font-mono border-r border-slate-200 text-slate-700">
                                    {w.itemNo}
                                  </td>
                                  <td className="py-1.5 px-3 border-r border-slate-200 font-medium">
                                    <span className={w.isAreaHeader ? 'text-slate-900 font-bold' : 'text-slate-800'}>
                                      {w.description}
                                    </span>
                                  </td>
                                  <td className="py-1.5 px-2 border-r border-slate-200 text-[10px] text-slate-600 truncate max-w-[100px]">
                                    {catCode}
                                  </td>
                                  <td className="py-1.5 px-2 text-right font-mono border-r border-slate-200 text-slate-700">
                                    {w.qty !== undefined && w.qty !== null ? w.qty : '-'}
                                  </td>
                                  <td className="py-1.5 px-1.5 text-center font-mono border-r border-slate-200 text-slate-600 text-[11px] font-bold">
                                    {w.unit || '-'}
                                  </td>
                                  <td className="py-1.5 px-2 text-right font-mono border-r border-slate-200 text-amber-800 font-bold text-[11px]">
                                    {w.weightKg && w.weightKg > 0 ? w.weightKg.toFixed(2) : '-'}
                                  </td>
                                  <td
                                    className={`py-1.5 px-2 text-right font-mono border-r border-slate-200 text-[10px] ${
                                      Number(diff) < 0
                                        ? 'text-red-700 font-bold'
                                        : Number(diff) > 0
                                        ? 'text-amber-700 font-bold'
                                        : 'text-slate-400'
                                    }`}
                                  >
                                    {Number(diff) > 0 ? `+${diff}` : diff}
                                  </td>
                                  <td className="py-1.5 px-2 text-center border-r border-slate-200">
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold inline-block ${
                                        w.opnameStatus === 'Terverifikasi'
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : w.opnameStatus === 'Revisi / Temuan'
                                          ? 'bg-amber-100 text-amber-800'
                                          : w.opnameStatus === 'Ditolak'
                                          ? 'bg-red-100 text-red-800'
                                          : 'bg-slate-100 text-slate-700'
                                      }`}
                                    >
                                      {w.opnameStatus || 'Belum Diperiksa'}
                                    </span>
                                  </td>
                                  <td className="py-1.5 px-3 text-slate-600 text-[10px]">{w.opnameNotes || w.remark || '-'}</td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                        {bapoFilteredWorkItems.length > 0 && (
                          <tfoot>
                            <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
                              <td colSpan={4} className="py-2 px-3 text-right border-r border-slate-300 font-sans">
                                REKAPITULASI TOTAL / RATA-RATA:
                              </td>
                              <td className="py-2 px-2 text-right font-mono border-r border-slate-300">
                                {bapoStats.totalContractQty.toLocaleString('id-ID')}
                              </td>
                              <td className="py-2 px-2 text-right font-mono border-r border-slate-300 text-[10px]">
                                {(bapoStats.totalOpnameQty - bapoStats.totalContractQty).toFixed(2)}
                              </td>
                              <td className="py-2 px-2 text-center border-r border-slate-300 text-[10px] text-emerald-800">
                                {bapoStats.verifiedItemsCount}/{bapoStats.totalItems} Selesai
                              </td>
                              <td className="py-2 px-3 text-[10px] text-slate-600 font-normal">
                                Dokumen terverifikasi fisik di lapangan
                              </td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  )}
                </div>

                {/* Official Signatures Block: 4 Parties (Subcont, QC, PM, Owner) */}
                <div className="pt-4 page-break-inside-avoid">
                  <div className="text-center font-bold text-xs mb-3 text-slate-900 uppercase tracking-wider">
                    DIPERIKSA, DIVERIFIKASI, &amp; DISETUJUI BERSAMA DALAM JOINT AUDIT OPNAME:
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
                    {/* 1. Subcontractor */}
                    <div className="border border-slate-300 p-2.5 rounded-lg bg-white">
                      <div className="text-[10px] font-semibold text-slate-500 uppercase">Pelaksana Pekerjaan</div>
                      <div className="font-bold text-slate-900 mt-0.5 truncate">
                        {bapoSelectedVendor !== 'all' && bapoSelectedVendor !== 'unassigned'
                          ? bapoSelectedVendor
                          : 'Vendor / Subkontraktor'}
                      </div>
                      <div className="h-16 flex items-center justify-center text-slate-300 italic text-[10px]">
                        (Tanda Tangan &amp; Cap)
                      </div>
                      <div className="border-t border-slate-300 pt-1 font-mono text-[11px] truncate">
                        (&nbsp;
                        {bapoSelectedVendor !== 'all' && bapoSelectedVendor !== 'unassigned'
                          ? bapoSelectedVendor
                          : '.......................................'}
                        &nbsp;)
                      </div>
                    </div>

                    {/* 2. QC Inspector Galangan */}
                    <div className="border border-slate-300 p-2.5 rounded-lg bg-white">
                      <div className="text-[10px] font-semibold text-slate-500 uppercase">Verifikator Mutu</div>
                      <div className="font-bold text-slate-900 mt-0.5">QC Inspector Galangan</div>
                      <div className="h-16 flex items-center justify-center text-slate-300 italic text-[10px]">
                        (Tanda Tangan &amp; Cap)
                      </div>
                      <div className="border-t border-slate-300 pt-1 font-mono text-[11px] truncate">
                        (&nbsp;{currentUser?.name || 'QC Inspector Galangan'}&nbsp;)
                      </div>
                    </div>

                    {/* 3. Project Manager Galangan */}
                    <div className="border border-slate-300 p-2.5 rounded-lg bg-white">
                      <div className="text-[10px] font-semibold text-slate-500 uppercase">Pimpinan Proyek</div>
                      <div className="font-bold text-slate-900 mt-0.5">Project Manager Galangan</div>
                      <div className="h-16 flex items-center justify-center text-slate-300 italic text-[10px]">
                        (Tanda Tangan &amp; Cap)
                      </div>
                      <div className="border-t border-slate-300 pt-1 font-mono text-[11px]">
                        (&nbsp;Project Manager Galangan&nbsp;)
                      </div>
                    </div>

                    {/* 4. Owner Surveyor / Superintendent */}
                    <div className="border border-slate-300 p-2.5 rounded-lg bg-white">
                      <div className="text-[10px] font-semibold text-slate-500 uppercase">Pemilik Kapal (Owner)</div>
                      <div className="font-bold text-slate-900 mt-0.5 truncate">
                        {vessel?.companyOwner || 'Owner Superintendent'}
                      </div>
                      <div className="h-16 flex items-center justify-center text-slate-300 italic text-[10px]">
                        (Tanda Tangan &amp; Cap)
                      </div>
                      <div className="border-t border-slate-300 pt-1 font-mono text-[11px]">
                        (&nbsp;Owner Superintendent&nbsp;)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer (Screen Only) */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 rounded-b-2xl bapo-screen-only">
              <div className="text-xs text-slate-500 font-mono">
                Menampilkan <span className="font-bold text-slate-800">{bapoFilteredWorkItems.length}</span> item dalam
                lingkup BAPO
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBapoModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={handleDownloadBapoPdf}
                  disabled={isBapoGenerating}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isBapoGenerating ? 'Membuat PDF...' : 'Unduh PDF BAPO'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#03442C] hover:bg-[#07593D] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Dokumen BAPO</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Context Menu on Right Click */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu(null);
            }}
          />
          <div
            className="fixed z-50 bg-white border border-slate-200 rounded-xl shadow-xl py-1 w-56 text-xs text-slate-800 animate-in fade-in zoom-in-95 duration-100"
            style={{
              top: Math.min(contextMenu.y, window.innerHeight - 320),
              left: Math.min(contextMenu.x, window.innerWidth - 240),
            }}
          >
            <div className="px-3 py-1.5 border-b border-slate-100 font-semibold text-slate-500 text-[10px] uppercase truncate">
              {contextMenu.item.itemNo} &bull; {contextMenu.item.description}
            </div>

            <button
              onClick={() => {
                openInlineEdit(contextMenu.item);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2 cursor-pointer text-slate-800"
            >
              <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Edit Baris Ini (Inline)</span>
            </button>

            <button
              onClick={() => {
                handleQuickVerify(contextMenu.item);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2 cursor-pointer text-emerald-800 font-medium"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Verifikasi 100% (Selesai)</span>
            </button>

            <button
              onClick={() => {
                setEditingVendorItemId(contextMenu.item.id);
                setVendorInputValue(contextMenu.item.subcontractor || '');
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2 cursor-pointer text-purple-800"
            >
              <Building2 className="w-3.5 h-3.5 text-purple-600" />
              <span>Input / Ganti Vendor</span>
            </button>

            <div className="my-1 border-t border-slate-100" />

            <button
              onClick={() => {
                insertRowBelow(contextMenu.item);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2 cursor-pointer text-slate-800"
            >
              <Plus className="w-3.5 h-3.5 text-sky-600" />
              <span>Sisipkan Baris di Bawah</span>
            </button>

            <button
              onClick={() => {
                duplicateItem(contextMenu.item);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2 cursor-pointer text-slate-800"
            >
              <Copy className="w-3.5 h-3.5 text-slate-600" />
              <span>Duplikasi Baris</span>
            </button>

            <div className="my-1 border-t border-slate-100" />

            <div className="px-3 py-1 text-[10px] text-slate-400 font-medium">Ubah Hirarki:</div>

            <button
              onClick={() => {
                changeItemLevel(contextMenu.item, 1);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1 hover:bg-slate-100 flex items-center gap-2 cursor-pointer text-slate-700 pl-5"
            >
              <span>Jadikan Area (Level 1)</span>
            </button>

            <button
              onClick={() => {
                changeItemLevel(contextMenu.item, 2);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1 hover:bg-slate-100 flex items-center gap-2 cursor-pointer text-slate-700 pl-5"
            >
              <span>Jadikan Sub-Item (Level 2)</span>
            </button>

            <button
              onClick={() => {
                changeItemLevel(contextMenu.item, 3);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1 hover:bg-slate-100 flex items-center gap-2 cursor-pointer text-slate-700 pl-5"
            >
              <span>Jadikan Komponen (Level 3)</span>
            </button>

            {(onDeleteItem || onBulkDeleteItems) && (
              <>
                <div className="my-1 border-t border-slate-100" />
                <button
                  onClick={() => {
                    handleDeleteItem(contextMenu.item);
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-red-50 flex items-center gap-2 cursor-pointer text-red-600 font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Baris Ini</span>
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* 7. Modal: Tambah Item Pekerjaan & Opname */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-4 sm:p-5 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Tambah Item Pekerjaan &amp; Opname</h3>
                  <p className="text-xs text-slate-500">Item baru akan langsung tersinkron ke Repair List dan Opname Verifikasi</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs max-h-[72vh] overflow-y-auto pr-1">
              {/* Category & Level selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Kategori Pekerjaan:</label>
                  <select
                    value={targetCategoryForAdd}
                    onChange={(e) => {
                      setTargetCategoryForAdd(e.target.value);
                      const seq = getNextItemSequenceNumber(workItems, e.target.value, addItemLevel, addItemParentId);
                      setAddItemNo(seq);
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code}. {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Tingkat Struktur:</label>
                  <select
                    value={addItemLevel}
                    onChange={(e) => {
                      const lvl = parseInt(e.target.value) as 1 | 2 | 3;
                      setAddItemLevel(lvl);
                      const seq = getNextItemSequenceNumber(workItems, targetCategoryForAdd, lvl, addItemParentId);
                      setAddItemNo(seq);
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    <option value={1}>Area Header (Level 1)</option>
                    <option value={2}>Sub-Item / Sub-Sistem (Level 2)</option>
                    <option value={3}>Komponen / Item Pekerjaan (Level 3)</option>
                  </select>
                </div>
              </div>

              {/* Item No & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-slate-600 font-medium mb-1">Nomor Urut:</label>
                  <input
                    type="text"
                    value={addItemNo}
                    onChange={(e) => setAddItemNo(e.target.value)}
                    placeholder="Contoh: 1.1"
                    className="w-full font-mono font-bold px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-900 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-slate-600 font-medium mb-1">Uraian / Deskripsi Pekerjaan: *</label>
                  <input
                    type="text"
                    value={addDescription}
                    onChange={(e) => setAddDescription(e.target.value)}
                    placeholder="Uraian pekerjaan perbaikan / penggantian..."
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Dimensions & Material Type */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="font-semibold text-slate-700 flex items-center justify-between">
                  <span>Spesifikasi Material &amp; Dimensi:</span>
                  {parseFloat(addWeightKg) > 0 && (
                    <span className="text-emerald-800 font-mono text-[11px] font-bold">
                      Berat Kalkulasi: {parseFloat(addWeightKg).toFixed(2)} kg
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                  <div className="col-span-2">
                    <label className="block text-[10px] text-slate-500 mb-0.5">Tipe Material</label>
                    <input
                      type="text"
                      value={addType}
                      placeholder="PLT, PP, FB, EA..."
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setAddType(val);
                        const calc = TonnageCalculator.calculateItemTonnageAndPrice({
                          typeCode: val,
                          d1: addD1,
                          d2: addD2,
                          d3: addD3,
                          dLen: addDLen,
                          d4: addD4,
                          qty: parseFloat(addQty) || 1,
                          unit: addUnit,
                          unitPrice: parseFloat(addUnitPrice) || 0,
                        });
                        if (calc.weightKg > 0) setAddWeightKg(String(calc.weightKg.toFixed(2)));
                      }}
                      className="w-full font-mono uppercase px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">P / Dia (d1)</label>
                    <input
                      type="text"
                      value={addD1}
                      placeholder="mm"
                      onChange={(e) => {
                        setAddD1(e.target.value);
                        const calc = TonnageCalculator.calculateItemTonnageAndPrice({
                          typeCode: addType,
                          d1: e.target.value,
                          d2: addD2,
                          d3: addD3,
                          dLen: addDLen,
                          d4: addD4,
                          qty: parseFloat(addQty) || 1,
                          unit: addUnit,
                          unitPrice: parseFloat(addUnitPrice) || 0,
                        });
                        if (calc.weightKg > 0) setAddWeightKg(String(calc.weightKg.toFixed(2)));
                      }}
                      className="w-full font-mono px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">L / Sch (d2)</label>
                    <input
                      type="text"
                      value={addD2}
                      placeholder="mm"
                      onChange={(e) => {
                        setAddD2(e.target.value);
                        const calc = TonnageCalculator.calculateItemTonnageAndPrice({
                          typeCode: addType,
                          d1: addD1,
                          d2: e.target.value,
                          d3: addD3,
                          dLen: addDLen,
                          d4: addD4,
                          qty: parseFloat(addQty) || 1,
                          unit: addUnit,
                          unitPrice: parseFloat(addUnitPrice) || 0,
                        });
                        if (calc.weightKg > 0) setAddWeightKg(String(calc.weightKg.toFixed(2)));
                      }}
                      className="w-full font-mono px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">T / Thk (d3)</label>
                    <input
                      type="text"
                      value={addD3}
                      placeholder="mm"
                      onChange={(e) => {
                        setAddD3(e.target.value);
                        const calc = TonnageCalculator.calculateItemTonnageAndPrice({
                          typeCode: addType,
                          d1: addD1,
                          d2: addD2,
                          d3: e.target.value,
                          dLen: addDLen,
                          d4: addD4,
                          qty: parseFloat(addQty) || 1,
                          unit: addUnit,
                          unitPrice: parseFloat(addUnitPrice) || 0,
                        });
                        if (calc.weightKg > 0) setAddWeightKg(String(calc.weightKg.toFixed(2)));
                      }}
                      className="w-full font-mono px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Panjang (dLen)</label>
                    <input
                      type="text"
                      value={addDLen}
                      placeholder="mm"
                      onChange={(e) => {
                        setAddDLen(e.target.value);
                        const calc = TonnageCalculator.calculateItemTonnageAndPrice({
                          typeCode: addType,
                          d1: addD1,
                          d2: addD2,
                          d3: addD3,
                          dLen: e.target.value,
                          d4: addD4,
                          qty: parseFloat(addQty) || 1,
                          unit: addUnit,
                          unitPrice: parseFloat(addUnitPrice) || 0,
                        });
                        if (calc.weightKg > 0) setAddWeightKg(String(calc.weightKg.toFixed(2)));
                      }}
                      className="w-full font-mono px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Vendor / Subcontractor */}
              <div className="p-3 bg-purple-50/60 border border-purple-200 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 font-semibold text-purple-950">
                  <Building2 className="w-4 h-4 text-purple-700" />
                  <span>Pelaksana / Vendor Subkontraktor:</span>
                </div>
                <input
                  type="text"
                  list="add-vendor-presets-list"
                  value={addSubcontractor}
                  onChange={(e) => setAddSubcontractor(e.target.value)}
                  placeholder="Ketik atau pilih nama vendor rekanan..."
                  className="w-full px-2.5 py-1.5 border border-purple-300 rounded-lg text-slate-800 bg-white font-semibold focus:ring-1 focus:ring-purple-500 focus:outline-hidden"
                />
                <datalist id="add-vendor-presets-list">
                  {VENDOR_PRESETS.map((vp) => (
                    <option key={vp} value={vp} />
                  ))}
                  {existingVendors.map((ev) => (
                    <option key={ev} value={ev} />
                  ))}
                </datalist>
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-purple-700 font-semibold">Pilih Cepat:</span>
                  {VENDOR_PRESETS.slice(0, 4).map((vp) => (
                    <button
                      key={vp}
                      type="button"
                      onClick={() => setAddSubcontractor(vp)}
                      className="px-2 py-0.5 text-[10px] bg-white border border-purple-200 hover:bg-purple-100 text-purple-800 rounded-md cursor-pointer transition-colors"
                    >
                      {vp}
                    </button>
                  ))}
                </div>
              </div>

              {/* Volume Kontrak & Harga Satuan */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Vol Kontrak:</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={addQty}
                    onChange={(e) => setAddQty(e.target.value)}
                    className="w-full font-mono font-bold px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-900 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Satuan Unit:</label>
                  <input
                    type="text"
                    value={addUnit}
                    onChange={(e) => setAddUnit(e.target.value)}
                    placeholder="kg / mtr / ls / pcs"
                    className="w-full font-mono px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-900 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Harga Satuan (Rp):</label>
                  <input
                    type="number"
                    step="1000"
                    min="0"
                    value={addUnitPrice}
                    onChange={(e) => setAddUnitPrice(e.target.value)}
                    className="w-full font-mono px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-900 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Berat Total (kg):</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={addWeightKg}
                    onChange={(e) => setAddWeightKg(e.target.value)}
                    className="w-full font-mono px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-900 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Status Opname Awal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl">
                <div>
                  <label className="block text-emerald-900 font-medium mb-1">Status Opname Awal:</label>
                  <select
                    value={addOpnameStatus}
                    onChange={(e) => setAddOpnameStatus(e.target.value as NonNullable<WorkItem['opnameStatus']>)}
                    className="w-full px-2.5 py-1.5 border border-emerald-300 rounded-lg bg-white font-semibold text-emerald-950 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
                  >
                    {OPNAME_STATUSES.map((st) => (
                      <option key={st.value} value={st.value}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-emerald-900 font-medium mb-1">Volume Realisasi Lapangan:</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={addOpnameQty}
                      placeholder={addQty || '0'}
                      onChange={(e) => setAddOpnameQty(e.target.value)}
                      className="w-full font-mono font-bold px-2.5 py-1.5 border border-emerald-300 rounded-lg bg-white text-slate-900 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setAddOpnameQty(addQty)}
                      className="px-2 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-mono font-bold cursor-pointer shrink-0"
                      title="Set sama dengan volume kontrak (100%)"
                    >
                      = 100%
                    </button>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-slate-600 font-medium mb-1">Catatan / Temuan Lapangan:</label>
                <textarea
                  rows={2}
                  value={addNotes}
                  onChange={(e) => setAddNotes(e.target.value)}
                  placeholder="Catatan tambahan teknis atau arahan audit..."
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden resize-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveNewItem}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Simpan Item Pekerjaan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
