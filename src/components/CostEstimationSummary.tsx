import React, { useState, useMemo, useEffect } from 'react';
import { formatVolQtyDisplay } from '../utils/qtyFormat';
import {
  FileSpreadsheet,
  TrendingUp,
  Anchor,
  Wrench,
  Paintbrush,
  DollarSign,
  Printer,
  Calculator,
  Edit3,
  Search,
  Sliders,
  ChevronDown,
  ChevronRight,
  X,
  Maximize2,
  Minimize2,
  Filter,
  Plus,
  Trash2,
  Layers,
  FolderPlus,
  Box,
  CheckCircle2,
  Edit2,
  Save,
  RotateCcw
} from 'lucide-react';
import { WorkCategory, WorkItem, VesselSpec } from '../types';
import { TonnageCalculator, MaterialTypeDefinition } from '../utils/tonnageCalculator';
import { TabExportImportButton } from './TabExportImportButton';
import { MaterialCalculatorModal, CalculatedMaterialResult } from './MaterialCalculatorModal';
import { getNextItemSequenceNumber } from '../utils/numberingUtils';

interface DepartmentGroup {
  id: string;
  label: string;
  categoryCodes: string[];
}

const DEPARTMENTS: DepartmentGroup[] = [
  { id: 'all', label: 'Semua Departemen (I - XII)', categoryCodes: [] },
  { id: 'dock-general', label: 'Dok & Fasilitas Umum (I, II)', categoryCodes: ['I', 'II'] },
  { id: 'paint-cleaning', label: 'Pengecatan, Blasting & Tangki (III, IV, V)', categoryCodes: ['III', 'IV', 'V'] },
  { id: 'hull-outfitting', label: 'Lambung, Baja & Outfitting (VI, VII)', categoryCodes: ['VI', 'VII'] },
  { id: 'machinery-piping', label: 'Pipa & Pemesinan Kapal (VIII, IX)', categoryCodes: ['VIII', 'IX'] },
  { id: 'electrical-interior', label: 'Listrik & Akomodasi (X, XI)', categoryCodes: ['X', 'XI'] },
  { id: 'others-dept', label: 'Lain-lain / Others (XII)', categoryCodes: ['XII'] },
];

interface CostEstimationSummaryProps {
  categories: WorkCategory[];
  workItems: WorkItem[];
  vessel: VesselSpec;
  onOpenPdfModal: () => void;
  onExportExcel?: () => void;
  onExportWord?: () => void;
  onOpenImportModal?: () => void;
  onDownloadTemplate?: () => void;
  onOpenFullModal?: (tab?: 'export' | 'import') => void;
  onAddItem?: (item: Omit<WorkItem, 'id'>) => void;
  onUpdateItem?: (updatedItem: WorkItem) => void;
  onDeleteItem?: (id: string) => void;
  onBulkDeleteItems?: (ids: string[]) => void;
  onUpdateItemsBatch?: (updatedItems: WorkItem[]) => void;
  onNavigateToMaterialEstimation?: () => void;
}

export const CostEstimationSummary: React.FC<CostEstimationSummaryProps> = ({
  categories,
  workItems,
  vessel,
  onOpenPdfModal,
  onExportExcel,
  onExportWord,
  onOpenImportModal,
  onDownloadTemplate,
  onOpenFullModal,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onBulkDeleteItems,
  onUpdateItemsBatch,
  onNavigateToMaterialEstimation,
}) => {
  const [viewMode, setViewMode] = useState<'summary' | 'detailed'>('detailed');
  const [overheadPercent, setOverheadPercent] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(`shipyard_overhead_percent_${vessel.id || 'default'}`);
      if (saved) return parseFloat(saved);
    } catch (e) {
      console.warn(e);
    }
    return 5;
  });
  const [ppnPercent, setPpnPercent] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(`shipyard_ppn_percent_${vessel.id || 'default'}`);
      if (saved) return parseFloat(saved);
    } catch (e) {
      console.warn(e);
    }
    return 11;
  });

  useEffect(() => {
    try {
      localStorage.setItem(`shipyard_overhead_percent_${vessel.id || 'default'}`, String(overheadPercent));
    } catch (e) {
      console.warn(e);
    }
  }, [overheadPercent, vessel.id]);

  useEffect(() => {
    try {
      localStorage.setItem(`shipyard_ppn_percent_${vessel.id || 'default'}`, String(ppnPercent));
    } catch (e) {
      console.warn(e);
    }
  }, [ppnPercent, vessel.id]);

  // Department & Category & Area Filter states matching RepairListTable
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedAreaId, setSelectedAreaId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Row selection state for bulk operations
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  // Calculator modal state
  const [calcModalItem, setCalcModalItem] = useState<WorkItem | null>(null);

  // Bulk rate adjustment modal state
  const [isBulkMarkupModalOpen, setIsBulkMarkupModalOpen] = useState<boolean>(false);
  const [bulkCategoryTarget, setBulkCategoryTarget] = useState<string>('all');
  const [bulkMarkupPercent, setBulkMarkupPercent] = useState<number>(10);

  // Expanded categories & areas & sub-systems state
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});

  // Inline editing state
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<WorkItem | null>(null);

  // Add Item Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [targetCategoryForAdd, setTargetCategoryForAdd] = useState<string>('');
  const [itemLevel, setItemLevel] = useState<1 | 2 | 3>(1);
  const [parentId, setParentId] = useState<string>('');
  const [itemNo, setItemNo] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [type, setType] = useState<string>('');
  const [d1, setD1] = useState<string>('');
  const [d2, setD2] = useState<string>('');
  const [d3, setD3] = useState<string>('');
  const [dLen, setDLen] = useState<string>('');
  const [d4, setD4] = useState<string>('');
  const [qtyStr, setQtyStr] = useState<string>('');
  const [unit, setUnit] = useState<string>('');
  const [weightStr, setWeightStr] = useState<string>('');
  const [priceStr, setPriceStr] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [remark, setRemark] = useState<string>('');

  const toggleNodeCollapse = (id: string) => {
    setCollapsedNodes((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandAll = () => setCollapsedNodes({});
  const collapseAll = () => {
    const next: Record<string, boolean> = {};
    categories.forEach((c) => {
      next[c.id] = true;
    });
    workItems.forEach((item) => {
      if (item.itemLevel === 1 || item.isAreaHeader || item.itemLevel === 2) {
        next[item.id] = true;
      }
    });
    setCollapsedNodes(next);
  };

  const toggleSelectItem = (id: string) => {
    const next = new Set(selectedItemIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedItemIds(next);
  };

  const toggleSelectAllInCategory = (categoryId: string, catItems: WorkItem[]) => {
    const next = new Set(selectedItemIds);
    const catItemIds = catItems.map((i) => i.id);
    const allSelected = catItemIds.every((id) => next.has(id));

    if (allSelected) {
      catItemIds.forEach((id) => next.delete(id));
    } else {
      catItemIds.forEach((id) => next.add(id));
    }
    setSelectedItemIds(next);
  };

  const handleBulkDelete = () => {
    if (onBulkDeleteItems && selectedItemIds.size > 0) {
      if (confirm(`Apakah Anda yakin ingin menghapus ${selectedItemIds.size} item RAB terpilih?`)) {
        onBulkDeleteItems(Array.from(selectedItemIds));
        setSelectedItemIds(new Set());
      }
    }
  };

  // Helper price basis getter
  const getItemPriceBasis = (item: WorkItem): 'qty' | 'weight' => {
    if (item.priceBasis) return item.priceBasis;
    if (item.unit === 'kg' && (item.weightKg || 0) > 0) return 'weight';
    return 'qty';
  };

  // Helper calculation for item total price
  const calculateItemPrice = (
    item: WorkItem,
    newUnitPrice?: number,
    newPriceBasis?: 'qty' | 'weight'
  ) => {
    const price = newUnitPrice !== undefined ? newUnitPrice : item.unitPrice || 0;
    const basis =
      newPriceBasis !== undefined ? newPriceBasis : getItemPriceBasis(item);

    const unitLower = String(item.unit || '').trim().toLowerCase();
    const isMeterUnit = unitLower === 'm' || unitLower === 'meter';
    let effectiveQty = item.qty || 0;

    if (isMeterUnit) {
      const dLenNum = parseFloat(String(item.dLen || '0')) || 0;
      const d1Num = parseFloat(String(item.d1 || '0')) || 0;
      const lenMmForCalc = dLenNum > 0 ? dLenNum : d1Num;
      const rawD4 = parseFloat(String(item.d4 || '0'));
      const d4Val = !isNaN(rawD4) && rawD4 > 0 ? rawD4 : 1;
      effectiveQty = Math.round(((lenMmForCalc / 1000) * d4Val) * 1000) / 1000;
    } else {
      const d4Str = String(item.d4 ?? '').trim();
      if (d4Str !== '') {
        const parsedD4 = parseFloat(d4Str);
        if (!isNaN(parsedD4)) {
          effectiveQty = parsedD4;
        }
      }
    }

    let weight = item.weightKg || 0;
    if (weight <= 0 && (item.type || item.d1 || item.d2 || item.d3 || item.dLen || item.d4)) {
      const calcRes = TonnageCalculator.calculateItemTonnageAndPrice({
        typeCode: item.type,
        d1: item.d1,
        d2: item.d2,
        d3: item.d3,
        dLen: item.dLen,
        d4: item.d4,
        qty: effectiveQty || item.qty || 1,
        unit: item.unit || 'kg',
        unitPrice: price,
        priceBasis: basis,
      });
      if (calcRes.weightKg > 0) {
        weight = calcRes.weightKg;
      }
    }

    const factor = basis === 'weight' ? (weight > 0 ? weight : effectiveQty) : effectiveQty;
    return Math.round(factor * price);
  };

  // Tree Node Classification logic matching RepairListTable exactly
  const getLevelOfItem = (item: WorkItem, categoryItems: WorkItem[]): 1 | 2 | 3 => {
    if (item.itemLevel === 1 || item.isAreaHeader) return 1;
    if (item.itemLevel === 2) return 2;
    if (item.itemLevel === 3) return 3;

    if (item.parentId) {
      const p = categoryItems.find((i) => i.id === item.parentId);
      if (p) {
        const pLvl = getLevelOfItem(p, categoryItems);
        return pLvl === 1 ? 2 : 3;
      }
    }

    const parts = item.itemNo.trim().split('.');
    if (parts.length === 1 && (!item.type || item.type === '')) return 1;
    if (parts.length === 2) return 2;
    if (parts.length >= 3) return 3;
    return 3;
  };

  const getCategoryTreeNodes = (categoryItems: WorkItem[]) => {
    const areas: WorkItem[] = [];
    const subSystems: WorkItem[] = [];
    const components: WorkItem[] = [];

    categoryItems.forEach((item) => {
      const lvl = getLevelOfItem(item, categoryItems);
      if (lvl === 1) areas.push(item);
      else if (lvl === 2) subSystems.push(item);
      else components.push(item);
    });

    return { areas, subSystems, components };
  };

  // Helper renderers for separate Vol / Qty and Satuan cells matching RepairListTable
  const renderAreaQtyWeightCell = (area: WorkItem, areaChildItems: WorkItem[], areaTotalWeight: number) => {
    const isMeter = area.unit && (area.unit.toLowerCase() === 'm' || area.unit.toLowerCase() === 'meter');
    const dLenVal = parseFloat(area.dLen || area.d1 || '0') || 0;
    const displayQty = isMeter && dLenVal > 0 ? ((dLenVal * (area.qty || 1)) / 1000) : area.qty;
    const formattedQty = displayQty && displayQty > 0
      ? (typeof displayQty === 'number' ? displayQty.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : displayQty)
      : (area.qty ? Number(area.qty).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-');

    return (
      <>
        <td className="py-2 px-2 text-right border-r border-slate-200 font-mono text-xs font-bold text-slate-800 w-20">
          {formattedQty}
        </td>
        <td className="py-2 px-2 text-center border-r border-slate-200 font-mono text-xs font-bold text-slate-600 bg-slate-50/40 w-20">
          {area.unit || '-'}
        </td>
      </>
    );
  };

  const renderSubQtyWeightCell = (subSystem: WorkItem, subComponents: WorkItem[], subTotalWeight: number) => {
    const isMeter = subSystem.unit && (subSystem.unit.toLowerCase() === 'm' || subSystem.unit.toLowerCase() === 'meter');
    const dLenVal = parseFloat(subSystem.dLen || subSystem.d1 || '0') || 0;
    const displayQty = isMeter && dLenVal > 0 ? ((dLenVal * (subSystem.qty || 1)) / 1000) : subSystem.qty;
    const formattedQty = displayQty && displayQty > 0
      ? (typeof displayQty === 'number' ? displayQty.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : displayQty)
      : (subSystem.qty ? Number(subSystem.qty).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-');

    return (
      <>
        <td className="py-1.5 px-2 text-right border-r border-slate-200 font-mono text-xs font-bold text-slate-800 w-20">
          {formattedQty}
        </td>
        <td className="py-1.5 px-2 text-center border-r border-slate-200 font-mono text-xs font-bold text-slate-600 bg-slate-50/40 w-20">
          {subSystem.unit || '-'}
        </td>
      </>
    );
  };

  const renderComponentQtyWeightCell = (item: WorkItem) => {
    const isMeter = item.unit && (item.unit.toLowerCase() === 'm' || item.unit.toLowerCase() === 'meter');
    const dLenVal = parseFloat(item.dLen || item.d1 || '0') || 0;
    const displayQty = isMeter && dLenVal > 0 ? ((dLenVal * (item.qty || 1)) / 1000) : item.qty;
    const formattedQty = displayQty && displayQty > 0
      ? (typeof displayQty === 'number' ? displayQty.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : displayQty)
      : (item.qty ? Number(item.qty).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-');

    return (
      <>
        <td className="py-1.5 px-2 text-right border-r border-slate-100 font-mono text-xs font-bold text-slate-800 w-20">
          {formattedQty}
        </td>
        <td className="py-1.5 px-2 text-center border-r border-slate-100 font-mono text-xs font-bold text-slate-600 bg-slate-50/40 w-20">
          {item.unit || '-'}
        </td>
      </>
    );
  };

  // Department Categories filtering
  const departmentCategories = useMemo(() => {
    if (selectedDepartment === 'all') return categories;
    const dept = DEPARTMENTS.find((d) => d.id === selectedDepartment);
    if (!dept || dept.categoryCodes.length === 0) return categories;
    return categories.filter((c) => dept.categoryCodes.includes(c.code));
  }, [categories, selectedDepartment]);

  // Active Categories
  const activeCategories = useMemo(() => {
    if (selectedCategoryFilter !== 'all') {
      return categories.filter((c) => c.id === selectedCategoryFilter);
    }
    return departmentCategories;
  }, [categories, selectedCategoryFilter, departmentCategories]);

  // Available Level 1 areas
  const availableAreas = useMemo(() => {
    return workItems.filter((item) => {
      const isArea = item.itemLevel === 1 || item.isAreaHeader || (!item.itemNo.includes('.') && (!item.parentId || item.parentId === ''));
      if (!isArea) return false;
      if (selectedCategoryFilter !== 'all') {
        return item.categoryId === selectedCategoryFilter;
      }
      if (selectedDepartment !== 'all') {
        const dept = DEPARTMENTS.find((d) => d.id === selectedDepartment);
        if (dept && dept.categoryCodes.length > 0) {
          const cat = categories.find((c) => c.id === item.categoryId);
          return cat ? dept.categoryCodes.includes(cat.code) : true;
        }
      }
      return true;
    });
  }, [workItems, selectedCategoryFilter, selectedDepartment, categories]);

  // Category breakdown summary calculation
  const categoryBreakdown = categories.map((cat) => {
    const items = workItems.filter((i) => i.categoryId === cat.id);
    const tonnage = items.reduce((sum, item) => sum + (item.weightKg || 0), 0);
    const subtotal = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    return {
      category: cat,
      itemsCount: items.length,
      tonnage,
      subtotal,
    };
  });

  const baseCostTotal = categoryBreakdown.reduce((sum, c) => sum + c.subtotal, 0);
  const totalTonnage = categoryBreakdown.reduce((sum, c) => sum + c.tonnage, 0);

  const overheadCost = (baseCostTotal * overheadPercent) / 100;
  const costBeforeTax = baseCostTotal + overheadCost;
  const ppnTaxCost = (costBeforeTax * ppnPercent) / 100;
  const grandTotalCost = costBeforeTax + ppnTaxCost;

  // Discipline highlights
  const steelworkCost =
    categoryBreakdown.find((c) => c.category.code === 'VII')?.subtotal || 0;
  const blastingPaintCost =
    (categoryBreakdown.find((c) => c.category.code === 'III')?.subtotal || 0) +
    (categoryBreakdown.find((c) => c.category.code === 'IV')?.subtotal || 0);
  const mechanicalCost =
    categoryBreakdown.find((c) => c.category.code === 'IX')?.subtotal || 0;

  // Handle inline price update
  const handlePriceChange = (item: WorkItem, newUnitPrice: number) => {
    if (!onUpdateItem) return;
    const updatedTotalPrice = calculateItemPrice(item, newUnitPrice);
    onUpdateItem({
      ...item,
      unitPrice: newUnitPrice,
      totalPrice: updatedTotalPrice,
    });
  };

  // Handle price basis change (QTY vs WEIGHT)
  const handlePriceBasisChange = (item: WorkItem, newBasis: 'qty' | 'weight') => {
    if (!onUpdateItem) return;

    let effectiveWeight = item.weightKg || 0;
    if (newBasis === 'weight' && effectiveWeight <= 0 && (item.type || item.d1 || item.d2 || item.d3 || item.dLen || item.d4)) {
      const calcRes = TonnageCalculator.calculateItemTonnageAndPrice({
        typeCode: item.type,
        d1: item.d1,
        d2: item.d2,
        d3: item.d3,
        dLen: item.dLen,
        d4: item.d4,
        qty: item.qty || 1,
        unit: item.unit || 'kg',
        unitPrice: item.unitPrice,
        priceBasis: 'weight',
      });
      if (calcRes.weightKg > 0) {
        effectiveWeight = calcRes.weightKg;
      }
    }

    const updatedTotalPrice = calculateItemPrice(item, undefined, newBasis);
    onUpdateItem({
      ...item,
      priceBasis: newBasis,
      weightKg: effectiveWeight > 0 ? effectiveWeight : item.weightKg,
      totalPrice: updatedTotalPrice,
    });
  };

  // Helper component for price cell with basis switcher (Qty vs Weight)
  const renderPriceCell = (item: WorkItem, inputStyleClass: string) => {
    const currentBasis = getItemPriceBasis(item);
    const qtyVal = item.qty || 1;
    const weightVal = item.weightKg || 0;

    return (
      <div className="flex flex-col items-end gap-1">
        <input
          type="number"
          step="500"
          value={item.unitPrice || ''}
          onChange={(e) =>
            handlePriceChange(item, parseFloat(e.target.value) || 0)
          }
          placeholder="0"
          className={inputStyleClass}
        />
        <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded border border-slate-200 text-[10px] shrink-0">
          <button
            type="button"
            onClick={() => handlePriceBasisChange(item, 'qty')}
            className={`px-1.5 py-0.2 rounded font-semibold cursor-pointer transition-all ${
              currentBasis === 'qty'
                ? 'bg-emerald-700 text-white shadow-2xs font-bold'
                : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
            title={`Hitung Tarif x Qty (${qtyVal} ${item.unit || 'ls'})`}
          >
            / {item.unit || 'Qty'}
          </button>
          <button
            type="button"
            onClick={() => handlePriceBasisChange(item, 'weight')}
            className={`px-1.5 py-0.2 rounded font-semibold cursor-pointer transition-all ${
              currentBasis === 'weight'
                ? 'bg-amber-600 text-white shadow-2xs font-bold'
                : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
            title={`Hitung Tarif x Tonase (${weightVal.toFixed(2)} kg)`}
          >
            / Kg
          </button>
        </div>
      </div>
    );
  };

  // Inline editing helpers
  const startInlineEdit = (item: WorkItem) => {
    setInlineEditingId(item.id);
    setEditFormData({ ...item });
  };

  const cancelInlineEdit = () => {
    setInlineEditingId(null);
    setEditFormData(null);
  };

  const saveInlineEdit = () => {
    if (editFormData && onUpdateItem) {
      onUpdateItem(editFormData);
    }
    setInlineEditingId(null);
    setEditFormData(null);
  };

  const handleEditFormChange = (field: keyof WorkItem, rawValue: any) => {
    if (!editFormData) return;
    const value = (rawValue && typeof rawValue === 'object' && 'target' in rawValue) ? rawValue.target.value : rawValue;
    setEditFormData((prev) => {
      if (!prev) return null;
      let next = { ...prev, [field]: value };

      // Prevent negative tonnage/weight
      if (field === 'weightKg') {
        const numValue = typeof value === 'string' ? parseFloat(value) : (typeof value === 'number' ? value : NaN);
        if (!isNaN(numValue) && numValue < 0) {
          return prev;
        }
      }

      // Auto material type lookup if type is changed manually
      if (field === 'type' && typeof value === 'string' && value.trim()) {
        const matched = TonnageCalculator.getMaterialType(value);
        if (matched) {
          next.unitPrice = matched.defaultUnitPrice;
          next.unit = matched.defaultUnit || 'kg';
          if ((!next.description || next.description.startsWith('Work item ') || next.description.startsWith('Baru')) && matched.descriptionHint) {
            next.description = matched.descriptionHint;
          }
        }
      }

      // Rule for QTY: jika unit terisi 'm' atau 'meter' (case insensitive), QTY = (dLen / 1000) * d4
      const unitLower = String(next.unit || '').trim().toLowerCase();
      const isMeterUnit = unitLower === 'm' || unitLower === 'meter';

      if (isMeterUnit) {
        const dLenMm = parseFloat(String(next.dLen || '0')) || 0;
        const rawD4 = parseFloat(String(next.d4 || '0'));
        const d4Val = !isNaN(rawD4) && rawD4 > 0 ? rawD4 : 1;
        const qtyInMeters = (dLenMm / 1000) * d4Val;
        next.qty = Math.round(qtyInMeters * 1000) / 1000;
      } else {
        // Rule: Jika D4 terisi angka maka QTY otomatis sama dengan D4. Jika D4 blank, QTY bebas diedit.
        const currentD4Str = String(field === 'd4' ? value : (next.d4 ?? '')).trim();
        if (currentD4Str !== '') {
          const parsedD4 = parseFloat(currentD4Str);
          if (!isNaN(parsedD4)) {
            next.qty = parsedD4;
          }
        }
      }

      if (['d1', 'd2', 'd3', 'dLen', 'd4', 'type', 'qty', 'unitPrice', 'unit', 'priceBasis'].includes(field as string)) {
        const calcRes = TonnageCalculator.calculateItemTonnageAndPrice({
          typeCode: next.type,
          d1: next.d1,
          d2: next.d2,
          d3: next.d3,
          dLen: next.dLen,
          d4: next.d4,
          qty: next.qty,
          unit: next.unit,
          unitPrice: next.unitPrice,
          priceBasis: next.priceBasis,
        });

        if (calcRes.weightKg > 0) {
          next.weightKg = calcRes.weightKg;
        }
        next.totalPrice = calcRes.totalPrice;
      } else {
        next.totalPrice = calculateItemPrice(next);
      }

      return next;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveInlineEdit();
    } else if (e.key === 'Escape') {
      cancelInlineEdit();
    }
  };

  const renderInlineEditRow = (
    item: WorkItem,
    bgClass: string = 'bg-amber-50/90 border-t-2 border-amber-400 border-l-4 border-l-amber-600 font-bold shadow-xs'
  ) => {
    if (!editFormData) return null;
    const activeLabels = TonnageCalculator.getDimensionLabels(editFormData.type || '');
    const currentSubtotal = calculateItemPrice(editFormData);
    const isCustomRab = !!item.isCustomRabItem;
    const lockedTitle = "Disinkronkan dari Repair List (edit spesifikasi via tab Repair List)";

    return (
      <tr className={`${bgClass} transition-colors`}>
        <td className="py-2 px-2 text-center border-r border-amber-200"></td>
        <td className="py-2 px-1 text-center min-w-[70px]">
          <input
            type="text"
            value={editFormData.itemNo}
            onChange={(e) => handleEditFormChange('itemNo', e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isCustomRab}
            title={isCustomRab ? "Nomor Urut (Dapat diedit)" : lockedTitle}
            className={`w-full text-center text-xs px-1 py-1 rounded font-mono font-extrabold ${
              isCustomRab
                ? 'bg-white border border-amber-400 focus:outline-hidden'
                : 'bg-slate-100 border border-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          />
        </td>
        <td className="py-2 px-2">
          <div className="space-y-1">
            <input
              type="text"
              value={editFormData.description}
              onChange={(e) => handleEditFormChange('description', e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!isCustomRab}
              title={isCustomRab ? "Deskripsi Pekerjaan" : lockedTitle}
              className={`w-full text-xs px-2 py-1 rounded font-bold ${
                isCustomRab
                  ? 'bg-white border border-slate-300 focus:outline-hidden'
                  : 'bg-slate-100 border border-slate-300 text-slate-600 cursor-not-allowed'
              }`}
              placeholder="Deskripsi Pekerjaan / Area / Komponen"
            />
            {!isCustomRab ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-200/80 px-1.5 py-0.5 rounded font-mono">
                🔒 Synced Repair List (Read-Only)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] text-amber-800 bg-amber-200/80 px-1.5 py-0.5 rounded font-mono font-bold">
                ➕ Tambahan Item RAB
              </span>
            )}
          </div>
        </td>
        <td className="py-2 px-1 min-w-[150px] w-44">
          <input
            type="text"
            value={editFormData.notes || ''}
            onChange={(e) => handleEditFormChange('notes', e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isCustomRab}
            title={isCustomRab ? "Keterangan" : lockedTitle}
            className={`w-full text-xs px-1.5 py-1 rounded font-normal ${
              isCustomRab
                ? 'bg-white border border-slate-300'
                : 'bg-slate-100 border border-slate-300 text-slate-500 cursor-not-allowed'
            }`}
            placeholder="Keterangan"
          />
        </td>
        <td className="py-2 px-1 text-center w-20">
          <input
            type="text"
            value={editFormData.type || ''}
            onChange={(e) => handleEditFormChange('type', e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            disabled={!isCustomRab}
            title={isCustomRab ? "Tipe Material" : lockedTitle}
            placeholder="Tipe..."
            className={`w-full text-center text-xs px-1 py-1 rounded font-mono font-bold uppercase ${
              isCustomRab
                ? 'bg-white border border-emerald-300'
                : 'bg-slate-100 border border-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          />
        </td>
        <td className="py-2 px-0.5 text-center w-12">
          <input
            type="text"
            value={editFormData.d1 || ''}
            onChange={(e) => handleEditFormChange('d1', e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isCustomRab}
            placeholder={activeLabels.placeholder1}
            title={isCustomRab ? activeLabels.d1 : lockedTitle}
            className={`w-full text-center font-mono text-xs px-0.5 py-1 rounded font-bold ${
              isCustomRab
                ? 'bg-white border border-slate-300'
                : 'bg-slate-100 border border-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          />
        </td>
        <td className="py-2 px-0.5 text-center w-12">
          <input
            type="text"
            value={editFormData.d2 || ''}
            onChange={(e) => handleEditFormChange('d2', e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isCustomRab}
            placeholder={activeLabels.placeholder2}
            title={isCustomRab ? activeLabels.d2 : lockedTitle}
            className={`w-full text-center font-mono text-xs px-0.5 py-1 rounded font-bold ${
              isCustomRab
                ? 'bg-white border border-slate-300'
                : 'bg-slate-100 border border-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          />
        </td>
        <td className="py-2 px-0.5 text-center w-12">
          <input
            type="text"
            value={editFormData.d3 || ''}
            onChange={(e) => handleEditFormChange('d3', e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isCustomRab || activeLabels.placeholder3 === '-'}
            placeholder={activeLabels.placeholder3}
            title={isCustomRab ? activeLabels.d3 : lockedTitle}
            className={`w-full text-center font-mono text-xs px-0.5 py-1 rounded font-bold ${
              isCustomRab
                ? 'bg-white border border-slate-300'
                : 'bg-slate-100 border border-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          />
        </td>
        <td className="py-2 px-0.5 text-center w-14">
          <input
            type="text"
            value={editFormData.dLen || ''}
            onChange={(e) => handleEditFormChange('dLen', e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isCustomRab}
            placeholder={activeLabels.placeholderLen}
            title={isCustomRab ? activeLabels.dLen : lockedTitle}
            className={`w-full text-center font-mono text-xs px-0.5 py-1 rounded font-bold ${
              isCustomRab
                ? 'bg-amber-50 border border-amber-300 text-amber-900'
                : 'bg-slate-100 border border-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          />
        </td>
        <td className="py-2 px-0.5 text-center w-12">
          <input
            type="text"
            value={editFormData.d4 || ''}
            onChange={(e) => handleEditFormChange('d4', e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isCustomRab}
            placeholder={activeLabels.placeholder4}
            title={isCustomRab ? activeLabels.d4 : lockedTitle}
            className={`w-full text-center font-mono text-xs px-0.5 py-1 rounded font-bold ${
              isCustomRab
                ? 'bg-white border border-slate-300'
                : 'bg-slate-100 border border-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          />
        </td>
        <td className="py-2 px-1 text-right w-20">
          <input
            type="number"
            step="any"
            value={editFormData.qty || ''}
            onChange={(e) => handleEditFormChange('qty', parseFloat(e.target.value) || 0)}
            onKeyDown={handleKeyDown}
            disabled={!isCustomRab}
            title={isCustomRab ? "Qty" : lockedTitle}
            placeholder="Qty"
            className={`w-full text-right font-mono text-xs px-1 py-1 rounded font-bold ${
              isCustomRab
                ? 'bg-white border border-slate-300'
                : 'bg-slate-100 border border-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          />
        </td>
        <td className="py-2 px-1 text-center w-20">
          <input
            type="text"
            value={editFormData.unit || ''}
            onChange={(e) => handleEditFormChange('unit', e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isCustomRab}
            title={isCustomRab ? "Satuan" : lockedTitle}
            placeholder="Satuan"
            className={`w-full text-center font-mono text-xs px-1 py-1 rounded font-bold ${
              isCustomRab
                ? 'bg-white border border-slate-300'
                : 'bg-slate-100 border border-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          />
        </td>
        <td className="py-2 px-1 text-left min-w-[130px] w-36">
          <input
            type="text"
            value={editFormData.remark || ''}
            onChange={(e) => handleEditFormChange('remark', e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isCustomRab}
            title={isCustomRab ? "Remark" : lockedTitle}
            placeholder="Remark"
            className={`w-full text-xs px-1.5 py-1 rounded font-normal ${
              isCustomRab
                ? 'bg-white border border-slate-300'
                : 'bg-slate-100 border border-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          />
        </td>
        <td className="py-2 px-1 text-right w-24">
          <input
            type="number"
            step="0.01"
            value={editFormData.weightKg || ''}
            onChange={(e) => handleEditFormChange('weightKg', parseFloat(e.target.value) || 0)}
            onKeyDown={handleKeyDown}
            disabled={!isCustomRab}
            title={isCustomRab ? "Berat Kg" : lockedTitle}
            placeholder="Tonase"
            className={`w-full text-right font-mono font-bold text-xs px-1 py-1 rounded ${
              isCustomRab
                ? 'bg-white border border-amber-300 text-amber-800'
                : 'bg-slate-100 border border-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          />
        </td>
        <td className="py-2 px-1 text-right w-32">
          <input
            type="number"
            step="500"
            value={editFormData.unitPrice || ''}
            onChange={(e) => handleEditFormChange('unitPrice', parseFloat(e.target.value) || 0)}
            onKeyDown={handleKeyDown}
            placeholder="0"
            title="Tarif Satuan Pekerjaan (Dapat diedit)"
            className="w-full text-right font-mono text-xs px-1.5 py-1 bg-white border border-emerald-400 rounded focus:ring-1 focus:ring-emerald-500 font-bold"
          />
        </td>
        <td className="py-2 px-1 text-center">
          <button
            type="button"
            onClick={() => setCalcModalItem(editFormData)}
            className="p-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded shadow-2xs transition-colors cursor-pointer"
            title="Kalkulator Dimensi Material"
          >
            <Calculator className="w-3.5 h-3.5" />
          </button>
        </td>
        <td className="py-2 px-2 text-right font-mono font-extrabold text-emerald-950 text-xs whitespace-nowrap">
          <div className="flex items-center justify-end gap-2">
            <span>{TonnageCalculator.formatRupiah(currentSubtotal)}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={saveInlineEdit}
                className="p-1 bg-emerald-600 text-white hover:bg-emerald-700 rounded shadow-2xs cursor-pointer"
                title="Simpan Perubahan Inline"
              >
                <Save className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={cancelInlineEdit}
                className="p-1 bg-slate-300 text-slate-700 hover:bg-slate-400 rounded shadow-2xs cursor-pointer"
                title="Batal"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </td>
      </tr>
    );
  };

  // Open add modal for level
  const openAddModalForLevel = (
    catId: string = categories?.[0]?.id || '',
    level: 1 | 2 | 3 = 1,
    parentItem?: WorkItem
  ) => {
    setTargetCategoryForAdd(catId);
    setItemLevel(level);
    const pId = parentItem ? parentItem.id : '';
    setParentId(pId);
    setItemNo(getNextItemSequenceNumber(workItems, catId, level, pId));
    setDescription('');
    setType('');
    setD1('');
    setD2('');
    setD3('');
    setDLen('');
    setD4('');
    setQtyStr('');
    setUnit('ls');
    setWeightStr('');
    setPriceStr('');
    setNotes('');
    setRemark('');
    setIsAddModalOpen(true);
  };

  // Handle Save Add Modal
  const handleSaveAddModal = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!onAddItem) return;
    if (!targetCategoryForAdd) {
      alert('Silakan pilih Kategori Galangan terlebih dahulu.');
      return;
    }
    if (!description.trim()) {
      alert('Silakan isi Deskripsi Pekerjaan / Nama Area.');
      return;
    }

    let qty = qtyStr === '' ? 1 : parseFloat(qtyStr) || 1;
    let weightKg = weightStr === '' ? 0 : parseFloat(weightStr) || 0;
    const unitPrice = priceStr === '' ? 0 : parseFloat(priceStr) || 0;

    const unitLower = (unit || 'ls').trim().toLowerCase();
    const isMeterUnit = unitLower === 'm' || unitLower === 'meter';

    if (isMeterUnit) {
      const dLenMm = parseFloat(dLen) || 0;
      const rawD4 = parseFloat(d4);
      const d4Val = !isNaN(rawD4) && rawD4 > 0 ? rawD4 : 1;
      qty = Math.round(((dLenMm / 1000) * d4Val) * 1000) / 1000;
    } else if (d4.trim() !== '') {
      const parsedD4 = parseFloat(d4.trim());
      if (!isNaN(parsedD4)) {
        qty = parsedD4;
      }
    }

    if ((weightKg === 0 || type || d1 || d2 || d3 || dLen || d4) && type.trim()) {
      const calcRes = TonnageCalculator.calculateItemTonnageAndPrice({
        typeCode: type,
        d1,
        d2,
        d3,
        dLen,
        d4,
        qty,
        unit: unit || 'kg',
        unitPrice,
      });
      if (calcRes.weightKg > 0) {
        weightKg = calcRes.weightKg;
      }
    }

    const isWeightBased = unitLower === 'kg' && weightKg > 0;
    const factor = isWeightBased ? weightKg : qty;
    const totalPrice = Math.round(factor * unitPrice);

    const finalItemNo = itemNo.trim() || getNextItemSequenceNumber(workItems, targetCategoryForAdd, itemLevel, parentId);

    onAddItem({
      projectId: vessel.id || 'proj-f049',
      categoryId: targetCategoryForAdd,
      itemNo: finalItemNo,
      description: description.trim(),
      type: type.trim(),
      d1: d1.trim(),
      d2: d2.trim(),
      d3: d3.trim(),
      dLen: dLen.trim(),
      d4: d4.trim(),
      qty,
      unit: unit || 'ls',
      weightKg,
      unitPrice,
      totalPrice,
      notes: notes.trim(),
      remark: remark.trim(),
      parentId: parentId || undefined,
      itemLevel,
      isAreaHeader: itemLevel === 1,
      isCompleted: false,
      isCustomRabItem: true,
    });

    setIsAddModalOpen(false);
  };

  // Handle Bulk Markup Application
  const handleApplyBulkMarkup = () => {
    if (!onUpdateItemsBatch) return;
    const factor = 1 + bulkMarkupPercent / 100;

    const itemsToUpdate = workItems.filter((item) => {
      if (bulkCategoryTarget === 'all') return true;
      return item.categoryId === bulkCategoryTarget;
    });

    const updatedItems = itemsToUpdate.map((item) => {
      const newUnitPrice = Math.round((item.unitPrice || 0) * factor);
      const newTotalPrice = calculateItemPrice(item, newUnitPrice);
      return {
        ...item,
        unitPrice: newUnitPrice,
        totalPrice: newTotalPrice,
      };
    });

    onUpdateItemsBatch(updatedItems);
    setIsBulkMarkupModalOpen(false);
  };

  // Handle calculator result application
  const handleApplyCalculatorResult = (result: CalculatedMaterialResult) => {
    if (!calcModalItem || !onUpdateItem) return;

    const newUnitPrice = result.unitPrice || calcModalItem.unitPrice || 0;
    const newWeight = result.weightKg > 0 ? result.weightKg : calcModalItem.weightKg || 0;
    const newUnit = result.unit || calcModalItem.unit || 'kg';
    const newQty = result.qty || calcModalItem.qty || 1;

    const isWeightBased = newUnit === 'kg' && newWeight > 0;
    const factor = isWeightBased ? newWeight : newQty;
    const newTotalPrice = Math.round(factor * newUnitPrice);

    const updatedItem: WorkItem = {
      ...calcModalItem,
      weightKg: newWeight,
      qty: newQty,
      unit: newUnit,
      d1: result.d1 !== undefined ? result.d1 : calcModalItem.d1,
      d2: result.d2 !== undefined ? result.d2 : calcModalItem.d2,
      d3: result.d3 !== undefined ? result.d3 : calcModalItem.d3,
      dLen: result.dLen !== undefined ? result.dLen : calcModalItem.dLen,
      d4: result.d4 !== undefined ? result.d4 : calcModalItem.d4,
      type: result.typeCode !== undefined ? result.typeCode : calcModalItem.type,
      unitPrice: newUnitPrice,
      totalPrice: newTotalPrice,
    };

    if (inlineEditingId === calcModalItem.id && editFormData) {
      setEditFormData(updatedItem);
    }

    onUpdateItem(updatedItem);
    setCalcModalItem(null);
  };

  // Search & filter helper
  const matchesSearchAndFilter = (item: WorkItem) => {
    if (selectedAreaId !== 'all') {
      const targetArea = workItems.find((w) => w.id === selectedAreaId);
      const isAreaDirect = item.id === selectedAreaId;
      const isDescendant = item.parentId === selectedAreaId;
      const isUnderItemNo = targetArea ? item.itemNo === targetArea.itemNo || item.itemNo.startsWith(`${targetArea.itemNo}.`) : false;
      if (!isAreaDirect && !isDescendant && !isUnderItemNo) return false;
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.description.toLowerCase().includes(q) ||
      item.itemNo.toLowerCase().includes(q) ||
      (item.remark && item.remark.toLowerCase().includes(q)) ||
      (item.type && item.type.toLowerCase().includes(q))
    );
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                Rencana Anggaran Biaya (RAB) &amp; Estimasi Biaya Galangan
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Kapal: <span className="font-semibold text-slate-800">{vessel.name}</span> ({vessel.companyOwner}) &bull; Estimasi Sistem Tarif Terpusat
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Switcher */}
          <div className="inline-flex p-1 bg-slate-100 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('detailed')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'detailed'
                  ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Rincian Tarif &amp; Subtotal RAB</span>
            </button>
            <button
              onClick={() => setViewMode('summary')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'summary'
                  ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Rekapitulasi Commercial</span>
            </button>
          </div>

          <TabExportImportButton
            tabName="cost-estimation"
            onExportExcel={onExportExcel}
            onExportPdf={onOpenPdfModal}
            onExportWord={onExportWord}
            onOpenImportModal={onOpenImportModal}
            onDownloadTemplate={onDownloadTemplate}
            onOpenFullModal={onOpenFullModal}
          />

          <button
            onClick={onOpenPdfModal}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors shrink-0 min-h-[34px] cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak RAB PDF</span>
          </button>
        </div>
      </div>

      {/* Material Estimation Quick Bridge Banner */}
      {onNavigateToMaterialEstimation && (
        <div className="bg-linear-to-r from-emerald-950 via-slate-900 to-slate-900 text-white rounded-xl p-3 sm:p-4 shadow-sm border border-emerald-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-400/30 shrink-0">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs sm:text-sm font-bold text-white">
                  Estimasi Kebutuhan Material Proyek (Bill of Materials)
                </h4>
                <span className="px-2 py-0.5 bg-emerald-500/30 text-emerald-300 text-[10px] font-bold rounded-full border border-emerald-400/40">
                  Terintegrasi Repair List
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Kalkulasi otomatis kebutuhan pelat baja BKI, profil, pipa ASTM, kawat las LB-52, copper slag, cat, dan zinc anode berdasarkan uraian pekerjaan di repair list.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onNavigateToMaterialEstimation}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <Box className="w-4 h-4 text-emerald-200" />
            <span>Lihat Estimasi Material (BOM) &rarr;</span>
          </button>
        </div>
      )}

      {/* Highlights Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <Anchor className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-amber-900 block">VII. Steelwork (Baja)</span>
            <span className="text-sm font-bold text-amber-800">
              {TonnageCalculator.formatRupiah(steelworkCost)}
            </span>
            <span className="text-[10px] text-amber-700 block">
              Tonase Total: {TonnageCalculator.formatWeight(totalTonnage)}
            </span>
          </div>
        </div>

        <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
            <Paintbrush className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-blue-900 block">III &amp; IV. Blasting &amp; Cat</span>
            <span className="text-sm font-bold text-blue-800">
              {TonnageCalculator.formatRupiah(blastingPaintCost)}
            </span>
            <span className="text-[10px] text-blue-700 block">Hull, Topside, Deck &amp; Tank</span>
          </div>
        </div>

        <div className="bg-purple-50/80 border border-purple-200 rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center shrink-0">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-purple-900 block">IX. Mechanical Work</span>
            <span className="text-sm font-bold text-purple-800">
              {TonnageCalculator.formatRupiah(mechanicalCost)}
            </span>
            <span className="text-[10px] text-purple-700 block">Kemudi, Propeller, Poros Shaft</span>
          </div>
        </div>

        <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-emerald-900 block">Grand Total Estimasi RAB</span>
            <span className="text-sm font-black text-emerald-800 font-mono">
              {TonnageCalculator.formatRupiah(grandTotalCost)}
            </span>
            <span className="text-[10px] text-emerald-700 block">Inc. Overhead &amp; PPN 11%</span>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: DETAILED ITEMIZED COSTING TABLE (MIRRORING REPAIR LIST TREE EXACTLY) */}
      {viewMode === 'detailed' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-3 p-4">
          {/* Department Filter Tabs Matching RepairListTable */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1.5 scrollbar-thin border-b border-slate-200">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-emerald-600" />
              <span>Dept:</span>
            </span>
            {DEPARTMENTS.map((dept) => {
              const isActive = selectedDepartment === dept.id;
              return (
                <button
                  key={dept.id}
                  onClick={() => {
                    setSelectedDepartment(dept.id);
                    setSelectedCategoryFilter('all');
                    setSelectedAreaId('all');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-800 text-white shadow-xs font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  {dept.label}
                </button>
              );
            })}
          </div>

          {/* Table Toolbar Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari scope, area, komponen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg w-52 focus:w-64 transition-all focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <select
                value={selectedCategoryFilter}
                onChange={(e) => {
                  setSelectedCategoryFilter(e.target.value);
                  setSelectedAreaId('all');
                }}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden font-medium text-slate-700"
              >
                <option value="all">Semua Kategori ({activeCategories.length})</option>
                {departmentCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code}. {c.name}
                  </option>
                ))}
              </select>

              {availableAreas.length > 0 && (
                <select
                  value={selectedAreaId}
                  onChange={(e) => setSelectedAreaId(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-emerald-300 bg-emerald-50 text-emerald-900 rounded-lg focus:outline-hidden font-bold"
                >
                  <option value="all">Semua Area Utama ({availableAreas.length})</option>
                  {availableAreas.map((area) => (
                    <option key={area.id} value={area.id}>
                      Area {area.itemNo}: {area.description}
                    </option>
                  ))}
                </select>
              )}

              <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                <button
                  onClick={expandAll}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded flex items-center gap-1 cursor-pointer"
                  title="Buka Semua Folder Area & Sub-System"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>Expand All</span>
                </button>
                <button
                  onClick={collapseAll}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded flex items-center gap-1 cursor-pointer"
                  title="Tutup Semua Folder Area & Sub-System"
                >
                  <Minimize2 className="w-3 h-3" />
                  <span>Collapse All</span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {onAddItem && (
                <button
                  onClick={() => openAddModalForLevel(categories?.[0]?.id, 1)}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Item RAB</span>
                </button>
              )}

              {selectedItemIds.size > 0 && onBulkDeleteItems && (
                <button
                  onClick={handleBulkDelete}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer animate-pulse"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Terpilih ({selectedItemIds.size})</span>
                </button>
              )}

              <button
                onClick={() => setIsBulkMarkupModalOpen(true)}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Sesuaikan tarif massal (+% atau -%) per kategori atau semua item"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Penyesuaian Tarif Massal (% Markup)</span>
              </button>
            </div>
          </div>

          {/* Informational Sync Banner */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-xs text-emerald-950 flex items-start sm:items-center gap-2.5 shadow-2xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5 sm:mt-0" />
            <div className="flex-1 leading-relaxed">
              <span className="font-extrabold text-emerald-950">
                Data Spesifikasi Terintegrasi Repair List:
              </span>{' '}
              Kolom <span className="font-semibold text-emerald-900 underline">No, Work Items, Keterangan, Type, D1–D4, dan Qty &amp; Weight</span> merepresentasikan data langsung dari Repair List (readonly). Edit spesifikasi fisik dapat dilakukan dari tab <span className="font-bold underline">Repair List</span>, kecuali untuk <span className="font-extrabold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">Tambahan Item RAB</span>.
            </div>
          </div>

          {/* Detailed Interactive Table */}
          <div className="overflow-x-auto scrollbar-thin rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#03442C] text-white font-bold uppercase text-[10px] tracking-wider align-middle border-b-2 border-emerald-950">
                  <th className="py-2.5 px-2 w-9 text-center border-r border-emerald-800/60" title="Pilih / Check">
                    <input
                      type="checkbox"
                      checked={
                        workItems.length > 0 &&
                        workItems.every((i) => selectedItemIds.has(i.id))
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItemIds(new Set(workItems.map((i) => i.id)));
                        } else {
                          setSelectedItemIds(new Set());
                        }
                      }}
                      className="rounded border-slate-400 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-2.5 px-2 w-14 text-center border-r border-emerald-800/60 font-mono">No</th>
                  <th className="py-2.5 px-3 min-w-[280px] w-full border-r border-emerald-800/60">WORK ITEMS / SKEMA STRUKTUR HIERARKI</th>
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
                  <th className="py-2.5 px-3 w-36 text-right bg-emerald-900 text-emerald-200 border-r border-emerald-800/60 font-mono">
                    TARIF SATUAN (RP)
                  </th>
                  <th className="py-2.5 px-2 w-12 text-center border-r border-emerald-800/60" title="Kalkulator Dimensi">CALC</th>
                  <th className="py-2.5 px-3 w-36 text-right bg-emerald-950 text-amber-300 font-mono">
                    SUBTOTAL BIAYA (RP)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeCategories.map((category) => {
                  const categoryItems = workItems.filter((i) => i.categoryId === category.id);
                  if (categoryItems.length === 0 && searchQuery.trim()) return null;

                  const tree = getCategoryTreeNodes(categoryItems);
                  const isCatCollapsed = !!collapsedNodes[category.id];

                  // Category Totals
                  const categoryTonnage = categoryItems.reduce((sum, item) => sum + (item.weightKg || 0), 0);
                  const categorySubtotal = categoryItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);

                  return (
                    <React.Fragment key={category.id}>
                      {/* LEVEL 0: CATEGORY HEADER ROW */}
                      <tr className="bg-emerald-800 text-white font-bold text-xs sticky top-0 z-10">
                        <td className="py-2.5 px-2 text-center border-r border-emerald-700">
                          <input
                            type="checkbox"
                            checked={
                              categoryItems.length > 0 &&
                              categoryItems.every((i) => selectedItemIds.has(i.id))
                            }
                            onChange={() => toggleSelectAllInCategory(category.id, categoryItems)}
                            className="rounded border-slate-400 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                        </td>
                        <td colSpan={15} className="py-2.5 px-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => toggleNodeCollapse(category.id)}
                                className="p-0.5 hover:text-emerald-200 transition-colors cursor-pointer shrink-0"
                              >
                                {isCatCollapsed ? (
                                  <ChevronRight className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </button>
                              <span className="tracking-wide font-extrabold">
                                {category.code}. {category.name.toUpperCase()}
                              </span>
                              <span className="text-[11px] font-normal text-emerald-200 ml-1">
                                ({categoryItems.length} item)
                              </span>
                            </div>

                            <div className="flex items-center gap-4">
                              {categoryTonnage > 0 && (
                                <span className="bg-emerald-950/60 px-2 py-0.5 rounded text-amber-300 font-semibold text-[11px] font-mono">
                                  Tonase: {categoryTonnage.toFixed(2)} kg ({(categoryTonnage / 1000).toFixed(3)} Ton)
                                </span>
                              )}
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-normal text-emerald-200 font-mono">Subtotal Kategori:</span>
                                <span className="font-mono font-black text-amber-300 text-xs">
                                  {TonnageCalculator.formatRupiah(categorySubtotal)}
                                </span>
                              </div>
                              {onAddItem && (
                                <button
                                  onClick={() => openAddModalForLevel(category.id, 1)}
                                  className="ml-2 px-2 py-0.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                  title="Tambah Area Utama Baru di Kategori ini"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Area</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* CATEGORY CONTENTS */}
                      {!isCatCollapsed && (
                        <>
                          {/* LEVEL 1: AREAS */}
                          {tree.areas.map((area) => {
                            const areaSubSystems = tree.subSystems.filter(
                              (s) => s.parentId === area.id || s.itemNo.startsWith(`${area.itemNo}.`)
                            );
                            const areaComponents = tree.components.filter(
                              (c) =>
                                c.parentId === area.id ||
                                (c.itemNo.startsWith(`${area.itemNo}.`) &&
                                  !areaSubSystems.some(
                                    (s) => c.parentId === s.id || c.itemNo.startsWith(`${s.itemNo}.`)
                                  ))
                            );

                            // All descendants for area calculation
                            const allAreaDescendants = [
                              area,
                              ...areaSubSystems,
                              ...areaComponents,
                              ...tree.components.filter((c) =>
                                areaSubSystems.some(
                                  (s) => c.parentId === s.id || c.itemNo.startsWith(`${s.itemNo}.`)
                                )
                              ),
                            ];

                            if (!allAreaDescendants.some((d) => matchesSearchAndFilter(d))) {
                              return null;
                            }

                            const areaTotalWeight = allAreaDescendants.reduce(
                              (sum, item) => sum + (item.weightKg || 0),
                              0
                            );
                            const areaTotalCost = allAreaDescendants.reduce(
                              (sum, item) => sum + (item.totalPrice || 0),
                              0
                            );
                            const isAreaCollapsed = !!collapsedNodes[area.id];
                            const hasChildren = areaSubSystems.length > 0 || areaComponents.length > 0;
                            const isSelected = selectedItemIds.has(area.id);

                            if (inlineEditingId === area.id && editFormData) {
                              return (
                                <React.Fragment key={`area-edit-${area.id}`}>
                                  {renderInlineEditRow(area, 'bg-amber-100/90 border-t-2 border-amber-400')}
                                </React.Fragment>
                              );
                            }

                            return (
                              <React.Fragment key={`area-${area.id}`}>
                                {/* AREA HEADER ROW (LEVEL 1) */}
                                <tr
                                  onDoubleClick={() => startInlineEdit(area)}
                                  className={`border-t-2 border-slate-300 font-bold text-xs transition-colors ${
                                    isSelected ? 'bg-amber-100/90' : 'bg-slate-100/90 hover:bg-slate-200/80'
                                  }`}
                                >
                                  <td className="py-2 px-2 text-center border-r border-slate-200">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleSelectItem(area.id)}
                                      className="rounded border-slate-400 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                    />
                                  </td>
                                  <td className="py-2 px-2 text-center text-slate-800 font-extrabold text-xs border-r border-slate-200 font-mono">
                                    {area.itemNo}
                                  </td>
                                  <td className="py-2 px-3 border-r border-slate-200">
                                    <div className="flex items-center gap-2">
                                      {hasChildren ? (
                                        <button
                                          onClick={() => toggleNodeCollapse(area.id)}
                                          className="p-0.5 rounded text-slate-600 hover:bg-slate-300 shrink-0 cursor-pointer"
                                        >
                                          {isAreaCollapsed ? (
                                            <ChevronRight className="w-4 h-4" />
                                          ) : (
                                            <ChevronDown className="w-4 h-4" />
                                          )}
                                        </button>
                                      ) : (
                                        <div className="w-4 h-4 shrink-0" />
                                      )}
                                      <span className="font-extrabold text-slate-900 text-xs tracking-wide">
                                        {area.description}
                                      </span>
                                      {area.isCustomRabItem && (
                                        <span className="ml-1.5 inline-flex items-center text-[9px] font-extrabold px-1.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded shrink-0">
                                          + Tambahan RAB
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-2 px-3 text-slate-600 text-[11px] font-normal min-w-[150px] w-44 border-r border-slate-200">
                                    {area.notes || ''}
                                  </td>
                                  <td className="py-2 px-1 text-center font-mono text-slate-600 text-[11px] border-r border-slate-200">
                                    {(area.type && area.type !== '0') ? area.type : ''}
                                  </td>
                                  <td className="py-2 px-1 text-center font-mono text-slate-600 text-[11px] border-r border-slate-200">
                                    {(area.d1 && area.d1 !== '0') ? area.d1 : ''}
                                  </td>
                                  <td className="py-2 px-1 text-center font-mono text-slate-600 text-[11px] border-r border-slate-200">
                                    {(area.d2 && area.d2 !== '0') ? area.d2 : ''}
                                  </td>
                                  <td className="py-2 px-1 text-center font-mono text-slate-600 text-[11px] border-r border-slate-200">
                                    {(area.d3 && area.d3 !== '0') ? area.d3 : ''}
                                  </td>
                                  <td className="py-2 px-1 text-center font-mono text-amber-900 font-bold bg-amber-50/50 text-[11px] border-x-2 border-amber-300/70">
                                    {(area.dLen && area.dLen !== '0') ? area.dLen : ''}
                                  </td>
                                  <td className="py-2 px-1 text-center font-mono text-slate-600 text-[11px] border-r border-slate-200">
                                    {(area.d4 && area.d4 !== '0') ? area.d4 : ''}
                                  </td>
                                  {renderAreaQtyWeightCell(area, allAreaDescendants, areaTotalWeight)}
                                  <td className="py-2 px-3 text-slate-600 text-[11px] min-w-[130px] w-36 border-r border-slate-200">
                                    {area.remark || ''}
                                  </td>
                                  <td className="py-2 px-2 text-right border-r border-slate-200 bg-emerald-50/30">
                                    {renderPriceCell(
                                      area,
                                      'w-full text-right font-mono text-xs px-2 py-1 bg-white border border-emerald-300 rounded focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 font-bold'
                                    )}
                                  </td>
                                  <td className="py-2 px-2 text-center border-r border-slate-200">
                                    <button
                                      onClick={() => setCalcModalItem(area)}
                                      className="p-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded shadow-2xs transition-colors cursor-pointer"
                                      title="Kalkulator Material Area"
                                    >
                                      <Calculator className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono font-black text-emerald-950 text-xs whitespace-nowrap bg-emerald-100/30">
                                    {TonnageCalculator.formatRupiah(areaTotalCost)}
                                  </td>
                                </tr>

                                {/* LEVEL 2: SUBSYSTEMS & COMPONENTS UNDER AREA */}
                                {!isAreaCollapsed && (
                                  <>
                                    {areaSubSystems.map((subSystem) => {
                                      const subComponents = tree.components.filter(
                                        (c) =>
                                          c.parentId === subSystem.id ||
                                          c.itemNo.startsWith(`${subSystem.itemNo}.`)
                                      );

                                      const allSubDescendants = [subSystem, ...subComponents];

                                      if (!allSubDescendants.some((d) => matchesSearchAndFilter(d))) {
                                        return null;
                                      }

                                      const subTotalWeight = allSubDescendants.reduce(
                                        (sum, item) => sum + (item.weightKg || 0),
                                        0
                                      );
                                      const subTotalCost = allSubDescendants.reduce(
                                        (sum, item) => sum + (item.totalPrice || 0),
                                        0
                                      );
                                      const isSubCollapsed = !!collapsedNodes[subSystem.id];
                                      const hasSubChildren = subComponents.length > 0;
                                      const isSubSelected = selectedItemIds.has(subSystem.id);

                                      if (inlineEditingId === subSystem.id && editFormData) {
                                        return (
                                          <React.Fragment key={`sub-edit-${subSystem.id}`}>
                                            {renderInlineEditRow(subSystem, 'bg-amber-100/90 border-t border-amber-300')}
                                          </React.Fragment>
                                        );
                                      }

                                      return (
                                        <React.Fragment key={`sub-${subSystem.id}`}>
                                          {/* SUBSYSTEM HEADER ROW (LEVEL 2) */}
                                          <tr
                                            onDoubleClick={() => startInlineEdit(subSystem)}
                                            className={`border-t border-emerald-200 transition-colors font-semibold ${
                                              isSubSelected ? 'bg-amber-100/90' : 'bg-emerald-50/80 hover:bg-emerald-100/60'
                                            }`}
                                          >
                                            <td className="py-1.5 px-2 text-center border-r border-slate-200">
                                              <input
                                                type="checkbox"
                                                checked={isSubSelected}
                                                onChange={() => toggleSelectItem(subSystem.id)}
                                                className="rounded border-slate-400 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                              />
                                            </td>
                                            <td className="py-1.5 px-2 text-center font-bold text-emerald-900 text-xs border-r border-slate-200 font-mono">
                                              {subSystem.itemNo}
                                            </td>
                                            <td className="py-1.5 px-3 pl-4 border-r border-slate-200">
                                              <div className="flex items-center gap-2">
                                                {hasSubChildren ? (
                                                  <button
                                                    onClick={() => toggleNodeCollapse(subSystem.id)}
                                                    className="p-0.5 rounded text-emerald-700 hover:bg-emerald-200 shrink-0 cursor-pointer"
                                                  >
                                                    {isSubCollapsed ? (
                                                      <ChevronRight className="w-3.5 h-3.5" />
                                                    ) : (
                                                      <ChevronDown className="w-3.5 h-3.5" />
                                                    )}
                                                  </button>
                                                ) : (
                                                  <div className="w-4 h-4 shrink-0" />
                                                )}
                                                <span className="font-bold text-slate-800 text-xs">
                                                  {subSystem.description}
                                                </span>
                                                {subSystem.isCustomRabItem && (
                                                  <span className="ml-1.5 inline-flex items-center text-[9px] font-extrabold px-1.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded shrink-0">
                                                    + Tambahan RAB
                                                  </span>
                                                )}
                                              </div>
                                            </td>
                                            <td className="py-1.5 px-2 text-slate-600 font-mono text-[11px] italic min-w-[120px] border-r border-slate-200">
                                              {subSystem.notes || subSystem.remark || ''}
                                            </td>
                                            <td className="py-1.5 px-1 text-center font-mono text-slate-600 text-[11px] border-r border-slate-200">
                                              {(subSystem.type && subSystem.type !== '0') ? subSystem.type : ''}
                                            </td>
                                            <td className="py-1.5 px-1 text-center font-mono text-slate-600 text-[11px] border-r border-slate-200">
                                              {(subSystem.d1 && subSystem.d1 !== '0') ? subSystem.d1 : ''}
                                            </td>
                                            <td className="py-1.5 px-1 text-center font-mono text-slate-600 text-[11px] border-r border-slate-200">
                                              {(subSystem.d2 && subSystem.d2 !== '0') ? subSystem.d2 : ''}
                                            </td>
                                            <td className="py-1.5 px-1 text-center font-mono text-slate-600 text-[11px] border-r border-slate-200">
                                              {(subSystem.d3 && subSystem.d3 !== '0') ? subSystem.d3 : ''}
                                            </td>
                                            <td className="py-1.5 px-1 text-center font-mono text-amber-900 font-bold bg-amber-50/50 text-[11px] border-x-2 border-amber-300/70">
                                              {(subSystem.dLen && subSystem.dLen !== '0') ? subSystem.dLen : ''}
                                            </td>
                                            <td className="py-1.5 px-1 text-center font-mono text-slate-600 text-[11px] border-r border-slate-200">
                                              {(subSystem.d4 && subSystem.d4 !== '0') ? subSystem.d4 : ''}
                                            </td>
                                            {renderSubQtyWeightCell(subSystem, subComponents, subTotalWeight)}
                                            <td className="py-1.5 px-2 text-right border-r border-slate-200 bg-emerald-50/30">
                                              {renderPriceCell(
                                                subSystem,
                                                'w-full text-right font-mono text-xs px-2 py-1 bg-white border border-emerald-300 rounded focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 font-semibold'
                                              )}
                                            </td>
                                            <td className="py-1.5 px-2 text-center border-r border-slate-200">
                                              <button
                                                onClick={() => setCalcModalItem(subSystem)}
                                                className="p-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 rounded shadow-2xs transition-colors cursor-pointer"
                                                title="Kalkulator Material Sub-System"
                                              >
                                                <Calculator className="w-3.5 h-3.5" />
                                              </button>
                                            </td>
                                            <td className="py-1.5 px-3 text-right font-mono font-bold text-emerald-900 text-xs whitespace-nowrap bg-emerald-100/30">
                                              {TonnageCalculator.formatRupiah(subTotalCost)}
                                            </td>
                                          </tr>

                                          {/* LEVEL 3: COMPONENTS UNDER SUBSYSTEM */}
                                          {!isSubCollapsed &&
                                            subComponents.map((item) => {
                                              if (!matchesSearchAndFilter(item)) return null;
                                              const isCompSelected = selectedItemIds.has(item.id);

                                              if (inlineEditingId === item.id && editFormData) {
                                                return (
                                                  <React.Fragment key={`comp-edit-${item.id}`}>
                                                    {renderInlineEditRow(item, 'bg-amber-50/90 border-t border-amber-200')}
                                                  </React.Fragment>
                                                );
                                              }

                                              return (
                                                <tr
                                                  key={`comp-${item.id}`}
                                                  onDoubleClick={() => startInlineEdit(item)}
                                                  className={`transition-colors border-t border-slate-100 ${
                                                    isCompSelected ? 'bg-amber-100/90' : 'bg-white hover:bg-slate-50'
                                                  }`}
                                                >
                                                  <td className="py-1.5 px-2 text-center border-r border-slate-100">
                                                    <input
                                                      type="checkbox"
                                                      checked={isCompSelected}
                                                      onChange={() => toggleSelectItem(item.id)}
                                                      className="rounded border-slate-400 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                                    />
                                                  </td>
                                                  <td className="py-1.5 px-2 text-center font-mono text-slate-500 text-[11px] border-r border-slate-100">
                                                    {item.itemNo}
                                                  </td>
                                                  <td className="py-1.5 px-3 pl-6 border-r border-slate-100">
                                                    <div className="flex items-center gap-1.5">
                                                      <span className="font-normal text-slate-800 text-xs">
                                                        {item.description}
                                                      </span>
                                                      {item.isCustomRabItem && (
                                                        <span className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded shrink-0">
                                                          + Tambahan RAB
                                                        </span>
                                                      )}
                                                    </div>
                                                  </td>
                                                  <td className="py-1.5 px-2 text-slate-500 text-[11px] italic min-w-[120px] border-r border-slate-100">
                                                    {item.notes || item.remark || ''}
                                                  </td>
                                                  <td className="py-1.5 px-1 text-center font-mono text-slate-700 text-[11px] border-r border-slate-100">
                                                    {(item.type && item.type !== '0') ? item.type : ''}
                                                  </td>
                                                  <td className="py-1.5 px-1 text-center font-mono text-slate-600 text-[11px] border-r border-slate-100">
                                                    {(item.d1 && item.d1 !== '0') ? item.d1 : ''}
                                                  </td>
                                                  <td className="py-1.5 px-1 text-center font-mono text-slate-600 text-[11px] border-r border-slate-100">
                                                    {(item.d2 && item.d2 !== '0') ? item.d2 : ''}
                                                  </td>
                                                  <td className="py-1.5 px-1 text-center font-mono text-slate-600 text-[11px] border-r border-slate-100">
                                                    {(item.d3 && item.d3 !== '0') ? item.d3 : ''}
                                                  </td>
                                                  <td className="py-1.5 px-1 text-center font-mono text-amber-900 font-bold bg-amber-50/50 text-[11px] border-x-2 border-amber-300/70">
                                                    {(item.dLen && item.dLen !== '0') ? item.dLen : ''}
                                                  </td>
                                                  <td className="py-1.5 px-1 text-center font-mono text-slate-600 text-[11px] border-r border-slate-100">
                                                    {(item.d4 && item.d4 !== '0') ? item.d4 : ''}
                                                  </td>
                                                  {renderComponentQtyWeightCell(item)}
                                                  <td className="py-1.5 px-2 text-right border-r border-slate-100 bg-emerald-50/20">
                                                    {renderPriceCell(
                                                      item,
                                                      'w-full text-right font-mono text-xs px-2 py-0.5 bg-white border border-slate-300 rounded focus:border-emerald-600'
                                                    )}
                                                  </td>
                                                  <td className="py-1.5 px-2 text-center border-r border-slate-100">
                                                    <button
                                                      onClick={() => setCalcModalItem(item)}
                                                      className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                                                      title="Kalkulator Material Component"
                                                    >
                                                      <Calculator className="w-3.5 h-3.5" />
                                                    </button>
                                                  </td>
                                                  <td className="py-1.5 px-3 text-right font-mono font-semibold text-emerald-800 text-xs whitespace-nowrap">
                                                    {TonnageCalculator.formatRupiah(item.totalPrice || 0)}
                                                  </td>
                                                </tr>
                                              );
                                            })}
                                        </React.Fragment>
                                      );
                                    })}

                                    {/* COMPONENTS DIRECTLY UNDER AREA (STANDALONE LEVEL 3) */}
                                    {areaComponents.map((item) => {
                                      if (!matchesSearchAndFilter(item)) return null;
                                      const isCompSelected = selectedItemIds.has(item.id);

                                      if (inlineEditingId === item.id && editFormData) {
                                        return (
                                          <React.Fragment key={`area-comp-edit-${item.id}`}>
                                            {renderInlineEditRow(item, 'bg-amber-50/90 border-t border-amber-200')}
                                          </React.Fragment>
                                        );
                                      }

                                      return (
                                        <tr
                                          key={`area-comp-${item.id}`}
                                          onDoubleClick={() => startInlineEdit(item)}
                                          className={`transition-colors border-t border-slate-100 ${
                                            isCompSelected ? 'bg-amber-100/90' : 'bg-white hover:bg-slate-50'
                                          }`}
                                        >
                                          <td className="py-1.5 px-2 text-center border-r border-slate-100">
                                            <input
                                              type="checkbox"
                                              checked={isCompSelected}
                                              onChange={() => toggleSelectItem(item.id)}
                                              className="rounded border-slate-400 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                            />
                                          </td>
                                          <td className="py-1.5 px-2 text-center font-mono text-slate-500 text-[11px] border-r border-slate-100">
                                            {item.itemNo}
                                          </td>
                                          <td className="py-1.5 px-3 pl-6 border-r border-slate-100">
                                            <span className="font-normal text-slate-800 text-xs">
                                              {item.description}
                                            </span>
                                          </td>
                                          <td className="py-1.5 px-2 text-slate-500 text-[11px] italic min-w-[120px] border-r border-slate-100">
                                            {item.notes || item.remark || ''}
                                          </td>
                                          <td className="py-1.5 px-1 text-center font-mono text-slate-700 text-[11px] border-r border-slate-100">
                                            {(item.type && item.type !== '0') ? item.type : ''}
                                          </td>
                                          <td className="py-1.5 px-1 text-center font-mono text-slate-600 text-[11px] border-r border-slate-100">
                                            {(item.d1 && item.d1 !== '0') ? item.d1 : ''}
                                          </td>
                                          <td className="py-1.5 px-1 text-center font-mono text-slate-600 text-[11px] border-r border-slate-100">
                                            {(item.d2 && item.d2 !== '0') ? item.d2 : ''}
                                          </td>
                                          <td className="py-1.5 px-1 text-center font-mono text-slate-600 text-[11px] border-r border-slate-100">
                                            {(item.d3 && item.d3 !== '0') ? item.d3 : ''}
                                          </td>
                                          <td className="py-1.5 px-1 text-center font-mono text-amber-900 font-bold bg-amber-50/50 text-[11px] border-x-2 border-amber-300/70">
                                            {(item.dLen && item.dLen !== '0') ? item.dLen : ''}
                                          </td>
                                          <td className="py-1.5 px-1 text-center font-mono text-slate-600 text-[11px] border-r border-slate-100">
                                            {(item.d4 && item.d4 !== '0') ? item.d4 : ''}
                                          </td>
                                          {renderComponentQtyWeightCell(item)}
                                          <td className="py-1.5 px-2 text-right border-r border-slate-100 bg-emerald-50/20">
                                            {renderPriceCell(
                                              item,
                                              'w-full text-right font-mono text-xs px-2 py-0.5 bg-white border border-slate-300 rounded focus:border-emerald-600'
                                            )}
                                          </td>
                                          <td className="py-1.5 px-2 text-center border-r border-slate-100">
                                            <button
                                              onClick={() => setCalcModalItem(item)}
                                              className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                                              title="Kalkulator Material Component"
                                            >
                                              <Calculator className="w-3.5 h-3.5" />
                                            </button>
                                          </td>
                                          <td className="py-1.5 px-3 text-right font-mono font-semibold text-emerald-800 text-xs whitespace-nowrap">
                                            {TonnageCalculator.formatRupiah(item.totalPrice || 0)}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom Commercial RAB Parameters & Interactive Financial Breakdown */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mt-4 space-y-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-3 border-b border-slate-200">
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <span className="text-xs text-slate-500 font-medium block">Overhead &amp; Jasa Galangan:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="range"
                      min="0"
                      max="30"
                      step="1"
                      value={overheadPercent}
                      onChange={(e) => setOverheadPercent(parseFloat(e.target.value) || 0)}
                      className="w-24 accent-emerald-600 cursor-pointer"
                    />
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={overheadPercent}
                        onChange={(e) => setOverheadPercent(parseFloat(e.target.value) || 0)}
                        className="w-12 text-center text-xs font-bold font-mono px-1 py-0.5 bg-white border border-slate-300 rounded"
                      />
                      <span className="text-xs text-slate-700 font-bold">%</span>
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-slate-500 font-medium block">Pajak Pertambahan Nilai (PPN):</span>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="range"
                      min="0"
                      max="20"
                      step="1"
                      value={ppnPercent}
                      onChange={(e) => setPpnPercent(parseFloat(e.target.value) || 0)}
                      className="w-24 accent-emerald-600 cursor-pointer"
                    />
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="30"
                        value={ppnPercent}
                        onChange={(e) => setPpnPercent(parseFloat(e.target.value) || 0)}
                        className="w-12 text-center text-xs font-bold font-mono px-1 py-0.5 bg-white border border-slate-300 rounded"
                      />
                      <span className="text-xs text-slate-700 font-bold">%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-slate-500 block font-medium">Nilai Dasar Pekerjaan (P1 - P11):</span>
                <span className="text-base font-black font-mono text-slate-900">
                  {TonnageCalculator.formatRupiah(baseCostTotal)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[11px]">1. Base Direct Material &amp; Work:</span>
                <span className="font-mono font-bold text-slate-800 text-sm">
                  {TonnageCalculator.formatRupiah(baseCostTotal)}
                </span>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[11px]">2. Overhead ({overheadPercent}%):</span>
                <span className="font-mono font-bold text-slate-800 text-sm">
                  {TonnageCalculator.formatRupiah(overheadCost)}
                </span>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[11px]">3. PPN Pajak ({ppnPercent}%):</span>
                <span className="font-mono font-bold text-slate-800 text-sm">
                  {TonnageCalculator.formatRupiah(ppnTaxCost)}
                </span>
              </div>

              <div className="bg-emerald-900 text-white p-3 rounded-lg border border-emerald-950 flex flex-col justify-between shadow-xs">
                <span className="text-emerald-200 font-bold text-[10px] uppercase">
                  4. Grand Total RAB Kapal:
                </span>
                <span className="font-mono font-black text-amber-300 text-base">
                  {TonnageCalculator.formatRupiah(grandTotalCost)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: REKAPITULASI SUMMARY TABLE & SETTINGS */}
      {viewMode === 'summary' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Category Breakdown Table (2 cols) */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 font-bold text-xs text-slate-800 flex flex-wrap items-center justify-between gap-1">
              <span>Rekapitulasi Biaya per Kategori Pekerjaan Galangan (P1 - P11)</span>
              <span className="text-[11px] text-slate-500 font-normal">
                Standar Tarif Terpusat
              </span>
            </div>

            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 text-[11px] uppercase border-b border-slate-200">
                    <th className="py-2.5 px-3">Kategori</th>
                    <th className="py-2.5 px-3 text-center">Jml Item</th>
                    <th className="py-2.5 px-3 text-right">Tonase (kg)</th>
                    <th className="py-2.5 px-3 text-right">Subtotal Biaya (IDR)</th>
                    <th className="py-2.5 px-3 text-right">Porsi (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categoryBreakdown.map((row) => {
                    const sharePercent =
                      baseCostTotal > 0 ? (row.subtotal / baseCostTotal) * 100 : 0;
                    return (
                      <tr key={row.category.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-medium text-slate-900">
                          <span className="font-bold text-emerald-700 mr-2">
                            {row.category.code}.
                          </span>
                          {row.category.name}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-500">
                          {row.itemsCount}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-amber-800">
                          {row.tonnage > 0 ? `${row.tonnage.toFixed(2)} kg` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800">
                          {TonnageCalculator.formatRupiah(row.subtotal)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-500">
                          {sharePercent.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-slate-100/80 font-bold text-slate-900">
                    <td className="py-2.5 px-3">Total Biaya Dasar (Base Cost)</td>
                    <td className="py-2.5 px-3 text-center">{workItems.length}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-amber-900">
                      {TonnageCalculator.formatWeight(totalTonnage)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                      {TonnageCalculator.formatRupiah(baseCostTotal)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold">100.0%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Commercial Parameters Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-4">
            <div className="border-b border-slate-200 pb-2">
              <h3 className="font-bold text-sm text-slate-900">Parameter Komersial RAB</h3>
              <p className="text-xs text-slate-500 mt-0.5">Atur margin overhead &amp; PPN pajak untuk penawaran resmi</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Persentase Overhead Galangan (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={overheadPercent}
                  onChange={(e) => setOverheadPercent(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs font-bold font-mono px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Pajak PPN (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={ppnPercent}
                  onChange={(e) => setPpnPercent(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs font-bold font-mono px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 space-y-1.5 text-xs font-mono">
                <div className="flex justify-between text-slate-600">
                  <span>Base Cost:</span>
                  <span>{TonnageCalculator.formatRupiah(baseCostTotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Overhead ({overheadPercent}%):</span>
                  <span>{TonnageCalculator.formatRupiah(overheadCost)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Sebelum Pajak:</span>
                  <span>{TonnageCalculator.formatRupiah(costBeforeTax)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>PPN ({ppnPercent}%):</span>
                  <span>{TonnageCalculator.formatRupiah(ppnTaxCost)}</span>
                </div>
                <div className="pt-2 border-t border-emerald-300 flex justify-between font-bold text-emerald-950 text-sm">
                  <span>Grand Total:</span>
                  <span className="text-amber-800">{TonnageCalculator.formatRupiah(grandTotalCost)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calculator Modal */}
      {calcModalItem && (
        <MaterialCalculatorModal
          isOpen={Boolean(calcModalItem)}
          onClose={() => setCalcModalItem(null)}
          onApply={handleApplyCalculatorResult}
          initialMaterialType={calcModalItem.type}
          initialD1={calcModalItem.d1 ? parseFloat(calcModalItem.d1) : undefined}
          initialD2={calcModalItem.d2 ? parseFloat(calcModalItem.d2) : undefined}
          initialD3={calcModalItem.d3 ? parseFloat(calcModalItem.d3) : undefined}
          initialDLen={calcModalItem.dLen ? parseFloat(calcModalItem.dLen) : undefined}
          initialD4={calcModalItem.d4 ? parseFloat(calcModalItem.d4) : undefined}
          initialQty={calcModalItem.qty}
          initialUnitPrice={calcModalItem.unitPrice}
          itemDescription={calcModalItem.description}
        />
      )}

      {/* Bulk Markup Modal */}
      {isBulkMarkupModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="p-4 bg-amber-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-amber-200" />
                <h3 className="font-bold text-sm">Penyesuaian Tarif Massal (% Markup)</h3>
              </div>
              <button
                onClick={() => setIsBulkMarkupModalOpen(false)}
                className="p-1 text-white/80 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Target Kategori Pekerjaan</label>
                <select
                  value={bulkCategoryTarget}
                  onChange={(e) => setBulkCategoryTarget(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:outline-hidden font-medium"
                >
                  <option value="all">Semua Kategori Pekerjaan (P1 - P11)</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code}. {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Persentase Kenaikan / Penurunan Tarif (%)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={bulkMarkupPercent}
                    onChange={(e) => setBulkMarkupPercent(parseFloat(e.target.value) || 0)}
                    className="w-full text-sm font-mono font-bold p-2 border border-slate-300 rounded-lg focus:outline-hidden"
                    placeholder="misal: 10 atau -5"
                  />
                  <span className="text-sm font-bold text-slate-700">%</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Masukkan nilai positif (misal 10) untuk menaikkan tarif, atau negatif (misal -5) untuk diskon/penurunan.
                </p>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  onClick={() => setIsBulkMarkupModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleApplyBulkMarkup}
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-lg cursor-pointer shadow-xs"
                >
                  Terapkan Penyesuaian Tarif
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="p-4 bg-emerald-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-200" />
                <h3 className="font-bold text-sm">Tambah Item Pekerjaan RAB Baru</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-white/80 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAddModal} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kategori Galangan</label>
                  <select
                    value={targetCategoryForAdd}
                    onChange={(e) => {
                      setTargetCategoryForAdd(e.target.value);
                      setItemNo(getNextItemSequenceNumber(workItems, e.target.value, itemLevel, parentId));
                    }}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg font-medium"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code}. {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tingkat Struktur</label>
                  <select
                    value={itemLevel}
                    onChange={(e) => {
                      const lvl = Number(e.target.value) as 1 | 2 | 3;
                      setItemLevel(lvl);
                      setItemNo(getNextItemSequenceNumber(workItems, targetCategoryForAdd, lvl, parentId));
                    }}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg font-medium"
                  >
                    <option value={1}>1. Area Header / Kompartemen Utama</option>
                    <option value={2}>2. Sub-Sistem / Lokasi Spesifik</option>
                    <option value={3}>3. Detail Komponen Pekerjaan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nomor Urut</label>
                  <input
                    type="text"
                    value={itemNo}
                    onChange={(e) => setItemNo(e.target.value)}
                    className="w-full font-mono font-bold p-2 border border-slate-300 rounded-lg"
                    placeholder="1.1.1"
                  />
                </div>

                <div className="col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">Nama Area / Deskripsi Pekerjaan</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-medium"
                    placeholder="misal: Pemotongan & Penggantian Plat Lambung"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Volume Qty</label>
                  <input
                    type="number"
                    step="0.01"
                    value={qtyStr}
                    onChange={(e) => setQtyStr(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                    placeholder="1"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Satuan Unit</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                    placeholder="ls / m2 / kg"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tarif Satuan (Rp)</label>
                  <input
                    type="number"
                    step="500"
                    value={priceStr}
                    onChange={(e) => setPriceStr(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold text-emerald-900"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer shadow-xs"
                >
                  Simpan Item RAB
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
