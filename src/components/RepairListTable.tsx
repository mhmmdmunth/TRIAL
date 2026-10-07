import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  GripVertical,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Search,
  Scale,
  Sparkles,
  ChevronDown,
  ChevronRight,
  X,
  Save,
  Layers,
  FolderPlus,
  Box,
  CornerDownRight,
  Calculator,
  Filter,
  RotateCcw,
  Copy,
  Scissors,
  ClipboardPaste,
  ArrowUp,
  ArrowDown,
  ArrowDownToLine,
  ListOrdered,
  History,
  RefreshCw,
  FileSpreadsheet,
  Upload,
  Download,
} from 'lucide-react';
import { WorkCategory, WorkItem, VesselSpec, ProjectSchedule } from '../types';
import { exportShipyardExcel, exportTemplate } from '../utils/excelExport';
import { RepairListExcelImportModal } from './RepairListExcelImportModal';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TonnageCalculator, MaterialTypeDefinition } from '../utils/tonnageCalculator';
import { MaterialCalculatorModal, CalculatedMaterialResult } from './MaterialCalculatorModal';
import { MaterialTypeSelector } from './MaterialTypeSelector';
import { AuditLogModal } from './AuditLogModal';
import { generateTsvTemplateString } from '../utils/fileImport';
import { sqliteService } from '../services/sqliteService';
import {
  resequenceCategoryItems,
  resequenceAllWorkItems,
  getNextItemSequenceNumber,
  cascadeDeleteWorkItem,
  cascadeDeleteWorkItems,
  getDescendantIds,
} from '../utils/numberingUtils';
import { useSpreadsheetTable, REPAIR_COLUMNS } from '../hooks/useSpreadsheetTable';
import { SpreadsheetToolbar } from './SpreadsheetToolbar';
import { SpreadsheetContextMenu } from './SpreadsheetContextMenu';
import { SpreadsheetCell } from './SpreadsheetCell';
import { ShortcutsModal } from './ShortcutsModal';

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

interface RepairListTableProps {
  categories: WorkCategory[];
  workItems: WorkItem[];
  projectId?: string;
  vessel?: VesselSpec;
  schedule?: ProjectSchedule;
  onAddItem: (item: Omit<WorkItem, 'id'>) => void;
  onUpdateItem: (item: WorkItem) => void;
  onDeleteItem: (id: string) => void;
  onBulkDeleteItems?: (ids: string[]) => void;
  onClearAllItems?: () => void;
  onBatchSaveWorkItems?: (items: WorkItem[]) => void;
  onExportExcel?: () => void;
  onImportWorkItems?: (
    newItems: WorkItem[],
    mode: 'replace' | 'append',
    extra?: {
      vesselSpec?: Partial<VesselSpec>;
      projectSchedule?: Partial<ProjectSchedule>;
      vesselPhotoUrl?: string;
    }
  ) => void;
  onNotify?: (msg: string) => void;
}

export const RepairListTable: React.FC<RepairListTableProps> = ({
  categories,
  workItems,
  projectId = 'proj-f049',
  vessel,
  schedule,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onBulkDeleteItems,
  onClearAllItems,
  onBatchSaveWorkItems,
  onExportExcel,
  onImportWorkItems,
  onNotify,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedAreaId, setSelectedAreaId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const sortableItemIds = useMemo(() => {
    return workItems.map((i) => i.id);
  }, [workItems]);

  const handleDndKitDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const sourceId = String(active.id);
    const targetId = String(over.id);

    const draggedItem = workItems.find((i) => i.id === sourceId);
    const targetItem = workItems.find((i) => i.id === targetId);

    if (!draggedItem || !targetItem) return;

    const categoryId = draggedItem.categoryId || targetItem.categoryId;
    const catItems = workItems.filter((i) => i.categoryId === categoryId);

    const sourceIdx = catItems.findIndex((i) => i.id === sourceId);
    const targetIdx = catItems.findIndex((i) => i.id === targetId);

    if (sourceIdx === -1 || targetIdx === -1) return;

    const descendantIds = getDescendantIds(catItems, sourceId);
    const groupToMove = catItems.filter((i) => i.id === sourceId || descendantIds.has(i.id));
    const remainingCatItems = catItems.filter((i) => i.id !== sourceId && !descendantIds.has(i.id));

    let insertIndex = remainingCatItems.findIndex((i) => i.id === targetId);
    if (insertIndex === -1) insertIndex = remainingCatItems.length;
    
    // Position below/after the target item
    insertIndex = insertIndex + 1;

    const reorderedCatItems = [
      ...remainingCatItems.slice(0, insertIndex),
      ...groupToMove,
      ...remainingCatItems.slice(insertIndex),
    ];

    let consumed = false;
    const updatedList = workItems.flatMap((i) => {
      if (i.categoryId === categoryId) {
        if (!consumed) {
          consumed = true;
          return reorderedCatItems;
        }
        return [];
      }
      return [i];
    });

    const finalRenumberedList = resequenceCategoryItems(updatedList, categoryId);

    if (onBatchSaveWorkItems) {
      onBatchSaveWorkItems(finalRenumberedList);
    } else {
      sqliteService.importWorkItems(finalRenumberedList, 'replace');
    }

    spreadsheet.showToast(`Prioritas "${draggedItem.description}" berhasil disesuaikan.`);
  };
  const [collapsedCats, setCollapsedCats] = useState<Record<string, boolean>>({});
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});

  // Toast notification state for mutual exclusion of Qty & D4
  const [switchToast, setSwitchToast] = useState<{ message: string; type: 'qty' | 'd4' } | null>(null);

  const triggerSwitchToast = (message: string, type: 'qty' | 'd4') => {
    setSwitchToast({ message, type });
  };

  useEffect(() => {
    if (switchToast) {
      const timer = setTimeout(() => {
        setSwitchToast(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [switchToast]);

  // Spreadsheet Engine
  const spreadsheet = useSpreadsheetTable({
    items: workItems,
    columns: REPAIR_COLUMNS,
    onUpdateItem,
    onAddItem,
    onDeleteItem,
    onFieldSwitchToast: triggerSwitchToast,
  });

  // Drag and Drop Reordering State
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'above' | 'below' | null>(null);

  const handleDragStart = (e: React.DragEvent, item: WorkItem) => {
    e.dataTransfer.setData('text/plain', item.id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedItemId(item.id);
  };

  const handleDragOver = (e: React.DragEvent, item: WorkItem) => {
    if (!draggedItemId || draggedItemId === item.id) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const targetRect = e.currentTarget.getBoundingClientRect();
    const hoverY = e.clientY - targetRect.top;
    const isAbove = hoverY < targetRect.height / 2;

    setDragOverItemId(item.id);
    setDropPosition(isAbove ? 'above' : 'below');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverItemId(null);
      setDropPosition(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedItemId(null);
    setDragOverItemId(null);
    setDropPosition(null);
  };

  const handleDrop = (e: React.DragEvent, targetItem: WorkItem) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain') || draggedItemId;
    if (!sourceId || sourceId === targetItem.id) {
      handleDragEnd();
      return;
    }

    const draggedItem = workItems.find((i) => i.id === sourceId);
    if (!draggedItem) {
      handleDragEnd();
      return;
    }

    const categoryId = draggedItem.categoryId || targetItem.categoryId;
    const catItems = workItems.filter((i) => i.categoryId === categoryId);

    const sourceIdx = catItems.findIndex((i) => i.id === sourceId);
    const targetIdx = catItems.findIndex((i) => i.id === targetItem.id);

    if (sourceIdx === -1 || targetIdx === -1) {
      handleDragEnd();
      return;
    }

    // Find all descendant IDs of the dragged item (if it's an Area or Sub-system)
    const descendantIds = getDescendantIds(catItems, sourceId);
    const groupToMove = catItems.filter((i) => i.id === sourceId || descendantIds.has(i.id));
    const remainingCatItems = catItems.filter((i) => i.id !== sourceId && !descendantIds.has(i.id));

    let insertIndex = remainingCatItems.findIndex((i) => i.id === targetItem.id);
    if (insertIndex === -1) insertIndex = remainingCatItems.length;
    if (dropPosition === 'below') {
      insertIndex = insertIndex + 1;
    }

    const reorderedCatItems = [
      ...remainingCatItems.slice(0, insertIndex),
      ...groupToMove,
      ...remainingCatItems.slice(insertIndex),
    ];

    let consumed = false;
    const updatedList = workItems.flatMap((i) => {
      if (i.categoryId === categoryId) {
        if (!consumed) {
          consumed = true;
          return reorderedCatItems;
        }
        return [];
      }
      return [i];
    });

    const finalRenumberedList = resequenceCategoryItems(updatedList, categoryId);

    if (onBatchSaveWorkItems) {
      onBatchSaveWorkItems(finalRenumberedList);
    } else {
      sqliteService.importWorkItems(finalRenumberedList, 'replace');
    }

    handleDragEnd();
    spreadsheet.showToast(`Posisi "${draggedItem.description}" berhasil dipindahkan.`);
  };

  // Selection state
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  // Modal States
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isExcelImportModalOpen, setIsExcelImportModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);
  const [auditTargetWorkItemId, setAuditTargetWorkItemId] = useState<string | undefined>(undefined);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 1-Click Copy table to clipboard in TSV (Excel-compatible) format
  const handleCopyTableTsv = () => {
    try {
      const itemsToCopy = selectedCategory !== 'all' 
        ? workItems.filter(i => i.categoryId === selectedCategory)
        : workItems;
      const tsv = generateTsvTemplateString(categories, itemsToCopy);
      navigator.clipboard.writeText(tsv);
      spreadsheet.showToast(`Tabel ${selectedCategory !== 'all' ? 'kategori terpilih' : 'repair list'} (${itemsToCopy.length} baris) berhasil disalin ke clipboard! Siap diedit di Excel.`);
    } catch {
      spreadsheet.showToast('Gagal menyalin tabel ke clipboard.');
    }
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInputOrTextArea = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      );
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // 1. F1 or Shift + ? -> Toggle Shortcuts Cheat Sheet Modal (always available)
      if (e.key === 'F1' || (e.shiftKey && e.key === '?')) {
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
        return;
      }

      // 2. Escape inside search bar or active shortcuts modal
      if (e.key === 'Escape' && isShortcutsModalOpen) {
        setIsShortcutsModalOpen(false);
        return;
      }

      // 3. Ctrl + S / Cmd + S -> Manual Save
      if (isCtrlOrCmd && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (onBatchSaveWorkItems) {
          onBatchSaveWorkItems(workItems);
        } else {
          sqliteService.importWorkItems(workItems, 'replace');
        }
        spreadsheet.showToast('Data proyek berhasil disimpan ke database SQLite');
        return;
      }

      // If user is currently typing in an input field/modal, don't trigger remaining navigation shortcuts
      if (isInputOrTextArea) {
        return;
      }

      // 5. Ctrl + N / Cmd + N -> Open Add New Item Modal
      if (isCtrlOrCmd && e.key.toLowerCase() === 'n' && !e.shiftKey) {
        e.preventDefault();
        setIsAddModalOpen(true);
        return;
      }

      // 6. Ctrl + F / Cmd + F -> Focus Search Bar
      if (isCtrlOrCmd && e.key.toLowerCase() === 'f' && !e.shiftKey) {
        e.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select();
        }
        return;
      }

      // 7. Arrow keys navigation across spreadsheet cells
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (!spreadsheet.activeCell) return;
        e.preventDefault();
        if (e.key === 'ArrowUp') spreadsheet.moveActiveCell(-1, 0, false);
        else if (e.key === 'ArrowDown') spreadsheet.moveActiveCell(1, 0, false);
        else if (e.key === 'ArrowLeft') spreadsheet.moveActiveCell(0, -1, false);
        else if (e.key === 'ArrowRight') spreadsheet.moveActiveCell(0, 1, false);
        return;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [
    workItems,
    selectedCategory,
    categories,
    isShortcutsModalOpen,
    onBatchSaveWorkItems,
    spreadsheet,
  ]);

  // Open Audit Trail Modal
  const openAuditModal = (workItemId?: string) => {
    setAuditTargetWorkItemId(workItemId);
    setIsAuditModalOpen(true);
  };

  // Helper to expand selection to include child items (sub-systems & components)
  const getExpandedItemSelection = (selectedIds: Set<string>): WorkItem[] => {
    const resultIds = new Set<string>();

    selectedIds.forEach((id) => {
      resultIds.add(id);
      workItems.forEach((child) => {
        if (child.parentId === id) {
          resultIds.add(child.id);
          workItems.forEach((gChild) => {
            if (gChild.parentId === child.id) {
              resultIds.add(gChild.id);
            }
          });
        }
      });
    });

    return workItems.filter((i) => resultIds.has(i.id));
  };

  // Helper to resequence itemNo for all items inside a category
  const resequenceAllCategoryItems = (
    allItems: WorkItem[],
    targetCatId: string
  ): WorkItem[] => {
    return resequenceCategoryItems(allItems, targetCatId);
  };

  // Paste execution logic




  // Inline Editing state
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<WorkItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const editFormDataRef = React.useRef<WorkItem | null>(null);

  useEffect(() => {
    editFormDataRef.current = editFormData;
  }, [editFormData]);

  const onUpdateItemRef = React.useRef(onUpdateItem);
  useEffect(() => {
    onUpdateItemRef.current = onUpdateItem;
  }, [onUpdateItem]);

  // Auto-Save Effect (400ms debounce for live real-time auto-saving)
  useEffect(() => {
    if (!editFormData || !inlineEditingId) return;

    const timer = setTimeout(() => {
      setIsSaving(true);
      onUpdateItemRef.current(editFormData);
      
      // Delay turning off the saving status slightly so the user sees "Saved" confirmation
      const statusTimer = setTimeout(() => {
        setIsSaving(false);
      }, 350);

      return () => clearTimeout(statusTimer);
    }, 400); // 400ms debounce

    return () => clearTimeout(timer);
  }, [editFormData, inlineEditingId]);

  // Add Modal state
  const [targetCategoryForAdd, setTargetCategoryForAdd] = useState<string>('');
  const [isMaterialCalcOpen, setIsMaterialCalcOpen] = useState(false);
  const [addedBatchCount, setAddedBatchCount] = useState(0);
  const [lastAddedToast, setLastAddedToast] = useState('');
  const descInputRef = React.useRef<HTMLInputElement>(null);

  // Handle Keyboard Escape shortcut inside RepairListTable
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        if (isMaterialCalcOpen) {
          setIsMaterialCalcOpen(false);
        } else if (isAddModalOpen) {
          setIsAddModalOpen(false);
        } else if (inlineEditingId) {
          setInlineEditingId(null);
          setEditFormData(null);
        } else if (selectedItemIds.size > 0) {
          setSelectedItemIds(new Set());
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMaterialCalcOpen, isAddModalOpen, inlineEditingId, selectedItemIds]);

  // Context menu state for right-click on table rows (Sisipkan Baris Kosong di Bawah)
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    item: WorkItem;
  } | null>(null);

  const handleContextMenu = (e: React.MouseEvent, item: WorkItem) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      item,
    });
  };

  useEffect(() => {
    const handleCloseMenu = () => setContextMenu(null);
    const handleKeyEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    window.addEventListener('click', handleCloseMenu);
    window.addEventListener('scroll', handleCloseMenu, true);
    window.addEventListener('keydown', handleKeyEscape);
    return () => {
      window.removeEventListener('click', handleCloseMenu);
      window.removeEventListener('scroll', handleCloseMenu, true);
      window.removeEventListener('keydown', handleKeyEscape);
    };
  }, []);

  // Form states for Add/Edit
  const [itemLevel, setItemLevel] = useState<1 | 2 | 3>(1); // 1 = Area, 2 = Sub-system, 3 = Detail Komponen
  const [parentId, setParentId] = useState<string>('');
  const [itemNo, setItemNo] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('');
  const [d1, setD1] = useState('');
  const [d2, setD2] = useState('');
  const [d3, setD3] = useState('');
  const [dLen, setDLen] = useState('');
  const [d4, setD4] = useState('');
  const [qtyStr, setQtyStr] = useState('');
  const [unit, setUnit] = useState('');
  const [weightStr, setWeightStr] = useState('');
  const [priceStr, setPriceStr] = useState('');
  const [notes, setNotes] = useState('');
  const [remark, setRemark] = useState('');
  const [subcontractor, setSubcontractor] = useState('');

  // Helper to calculate the next sequence number dynamically
  const getNextItemSequenceNo = (
    catId: string,
    level: 1 | 2 | 3,
    chosenParentId?: string
  ): string => {
    return getNextItemSequenceNumber(workItems, catId, level, chosenParentId);
  };

  const toggleCategoryCollapse = (catId: string) => {
    setCollapsedCats((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  const toggleNodeCollapse = (nodeId: string) => {
    setCollapsedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const toggleSelectAllInCategory = (categoryId: string, items: WorkItem[]) => {
    const newSelected = new Set(selectedItemIds);
    const categoryItemIds = items.filter(i => i.categoryId === categoryId).map(i => i.id);
    const allSelected = categoryItemIds.every(id => newSelected.has(id));

    if (allSelected) {
      categoryItemIds.forEach(id => newSelected.delete(id));
    } else {
      categoryItemIds.forEach(id => newSelected.add(id));
    }
    setSelectedItemIds(newSelected);
  };

  const toggleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItemIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItemIds(newSelected);
  };

  const handleBulkDelete = () => {
    if (onBulkDeleteItems && selectedItemIds.size > 0) {
      onBulkDeleteItems(Array.from(selectedItemIds));
      setSelectedItemIds(new Set());
    }
  };

  // Helper to open Add Modal configured for specific level and parent
  const openAddModalForLevel = (
    catId: string = '',
    level: 1 | 2 | 3 = 1,
    parentItem?: WorkItem
  ) => {
    setTargetCategoryForAdd(catId);
    setItemLevel(level);
    const pId = parentItem ? parentItem.id : '';
    setParentId(pId);

    if (catId) {
      setItemNo(getNextItemSequenceNo(catId, level, pId));
    } else {
      setItemNo('');
    }

    setDescription('');
    setType('');
    setD1('');
    setD2('');
    setD3('');
    setDLen('');
    setD4('');
    setQtyStr('');
    setUnit('');
    setWeightStr('');
    setPriceStr('');
    setNotes('');
    setRemark('');

    setAddedBatchCount(0);
    setLastAddedToast('');
    setIsAddModalOpen(true);
  };

  const openEditModal = (item: WorkItem) => {
    // Save any pending edits from previous row before switching
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
      onUpdateItem(editFormData);
    }
    setInlineEditingId(null);
    setEditFormData(null);
  };

  const insertRowBelow = (targetItem: WorkItem, explicitLevel?: number) => {
    // 1. Determine level and parentId
    let newLevel = explicitLevel;
    let newParentId = targetItem.parentId;
    let isAreaHeader = false;

    if (newLevel === undefined) {
      if (targetItem.itemLevel === 1 || targetItem.isAreaHeader) {
        // Under Area header, default to adding a Level 2 sub-system
        newLevel = 2;
        newParentId = targetItem.id;
      } else if (targetItem.itemLevel === 2) {
        // Next sibling Sub-system (Level 2)
        newLevel = 2;
        newParentId = targetItem.parentId;
      } else {
        // Sibling component (Level 3)
        newLevel = 3;
        newParentId = targetItem.parentId;
      }
    }

    if (newLevel === 1) {
      isAreaHeader = true;
      newParentId = undefined;
    }

    const newItemId = `wi-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const newItem: WorkItem = {
      id: newItemId,
      projectId: targetItem.projectId,
      categoryId: targetItem.categoryId,
      parentId: newParentId,
      itemLevel: newLevel,
      itemNo: '',
      description: '',
      notes: '',
      remark: '',
      type: '',
      d1: '',
      d2: '',
      d3: '',
      d4: '',
      qty: 0,
      unit: '',
      weightKg: 0,
      unitPrice: 0,
      totalPrice: 0,
      isCompleted: false,
      isAreaHeader,
    };

    // 2. Find insertion position
    const targetIdx = workItems.findIndex((i) => i.id === targetItem.id);
    let insertIdx = targetIdx + 1;

    if (targetIdx !== -1) {
      if (targetItem.itemLevel === 1 || targetItem.isAreaHeader) {
        while (
          insertIdx < workItems.length &&
          (workItems[insertIdx].parentId === targetItem.id ||
            workItems[insertIdx].itemNo.startsWith(`${targetItem.itemNo}.`))
        ) {
          insertIdx++;
        }
      } else if (targetItem.itemLevel === 2) {
        while (
          insertIdx < workItems.length &&
          (workItems[insertIdx].parentId === targetItem.id ||
            workItems[insertIdx].itemNo.startsWith(`${targetItem.itemNo}.`))
        ) {
          insertIdx++;
        }
      } else {
        insertIdx = targetIdx + 1;
      }
    } else {
      insertIdx = workItems.length;
    }

    const updatedWorkItems = [
      ...workItems.slice(0, insertIdx),
      newItem,
      ...workItems.slice(insertIdx),
    ];

    // 3. Resequence all itemNo inside this category to guarantee strictly sequential order!
    const resequencedList = resequenceAllCategoryItems(updatedWorkItems, targetItem.categoryId);

    // 4. Save to persistent storage / database
    if (onBatchSaveWorkItems) {
      onBatchSaveWorkItems(resequencedList);
    } else {
      sqliteService.importWorkItems(resequencedList, 'replace');
    }

    // 5. Activate inline editing immediately on the new empty row
    const resequencedNewItem = resequencedList.find((i) => i.id === newItemId) || newItem;
    setInlineEditingId(resequencedNewItem.id);
    setEditFormData({ ...resequencedNewItem });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.currentTarget.tagName === 'TEXTAREA' && e.shiftKey && !e.ctrlKey) {
        return;
      }

      // Shift+Enter, Ctrl+Enter, or Alt+Enter -> Save current and insert empty row below!
      if (e.shiftKey || e.ctrlKey || e.altKey) {
        e.preventDefault();
        if (editFormData) {
          onUpdateItem(editFormData);
          insertRowBelow(editFormData);
        }
        return;
      }

      e.preventDefault();
      saveInlineEdit();
    }
  };

  const handleEditFormChange = (field: keyof WorkItem, rawValue: any) => {
    const value = (rawValue && typeof rawValue === 'object' && 'target' in rawValue) ? rawValue.target.value : rawValue;

    setEditFormData((prev) => {
      if (!prev) return null;
      let newData: WorkItem = { ...prev, [field]: value };

      // Explicitly handle empty/null inputs by setting state to empty string instead of 0
      if (value === '' || value === null || value === undefined) {
        if (field === 'qty') {
          newData.qty = '' as any;
        } else if (field === 'd4') {
          newData.d4 = '';
        } else if (field === 'weightKg') {
          newData.weightKg = '' as any;
        }
      }

      // Dynamic structure level & parent resolution when itemNo is edited
      if (field === 'itemNo' && typeof value === 'string') {
        const trimmedVal = value.trim();
        if (trimmedVal !== '') {
          const parts = trimmedVal.split('.').filter(Boolean);
          if (parts.length === 1 && !trimmedVal.includes('.')) {
            // Level 1: Area Header (e.g. "1", "2", "A")
            newData.itemLevel = 1;
            newData.isAreaHeader = true;
            newData.parentId = undefined;
          } else if (parts.length === 2) {
            // Level 2: Sub-System (e.g. "1.1", "2.3")
            newData.itemLevel = 2;
            newData.isAreaHeader = false;
            const matchingArea = workItems.find(
              (i) => i.id !== newData.id && i.categoryId === newData.categoryId && (i.itemLevel === 1 || i.isAreaHeader) && i.itemNo.trim() === parts[0]
            );
            if (matchingArea) {
              newData.parentId = matchingArea.id;
            }
          } else if (parts.length >= 3) {
            // Level 3: Komponen (e.g. "1.1.1", "2.1.3")
            newData.itemLevel = 3;
            newData.isAreaHeader = false;
            const subNo = `${parts[0]}.${parts[1]}`;
            const matchingSub = workItems.find(
              (i) => i.id !== newData.id && i.categoryId === newData.categoryId && i.itemLevel === 2 && i.itemNo.trim() === subNo
            );
            if (matchingSub) {
              newData.parentId = matchingSub.id;
            } else {
              const matchingArea = workItems.find(
                (i) => i.id !== newData.id && i.categoryId === newData.categoryId && (i.itemLevel === 1 || i.isAreaHeader) && i.itemNo.trim() === parts[0]
              );
              if (matchingArea) {
                newData.parentId = matchingArea.id;
              }
            }
          }
        }
      }

      // Explicit structure level change override
      if (field === 'itemLevel') {
        const lvl = Number(value) as 1 | 2 | 3;
        newData.itemLevel = lvl;
        if (lvl === 1) {
          newData.isAreaHeader = true;
          newData.parentId = undefined;
        } else {
          newData.isAreaHeader = false;
          const parts = (newData.itemNo || '').trim().split('.').filter(Boolean);
          if (lvl === 2 && parts.length >= 1) {
            const matchingArea = workItems.find(
              (i) => i.id !== newData.id && i.categoryId === newData.categoryId && (i.itemLevel === 1 || i.isAreaHeader) && i.itemNo.trim() === parts[0]
            );
            if (matchingArea) newData.parentId = matchingArea.id;
          } else if (lvl === 3 && parts.length >= 2) {
            const subNo = `${parts[0]}.${parts[1]}`;
            const matchingSub = workItems.find(
              (i) => i.id !== newData.id && i.categoryId === newData.categoryId && i.itemLevel === 2 && i.itemNo.trim() === subNo
            );
            if (matchingSub) newData.parentId = matchingSub.id;
          }
        }
      }

      // Prevent negative tonnage/weight
      if (field === 'weightKg') {
        const numValue = typeof value === 'string' ? parseFloat(value) : (typeof value === 'number' ? value : NaN);
        if (!isNaN(numValue) && numValue < 0) {
          return prev; // Prevent update if negative
        }
      }

      // If TYPE is typed manually, see if we can find a matching material type from the catalog to link automatically!
      if (field === 'type' && typeof value === 'string' && value.trim()) {
        const matched = TonnageCalculator.getMaterialType(value);
        if (matched) {
          newData.unitPrice = matched.defaultUnitPrice;
          newData.unit = matched.defaultUnit || 'kg';
          if ((!newData.description || newData.description.startsWith('Work item ') || newData.description.startsWith('Baru')) && matched.descriptionHint) {
            newData.description = matched.descriptionHint;
          }
        }
      }

      // Calculate tonnage & price using TonnageCalculator
      const rawQtyForCalc = typeof newData.qty === 'number' ? newData.qty : (parseFloat(String(newData.qty)) || 1);
      const calcRes = TonnageCalculator.calculateItemTonnageAndPrice({
        typeCode: newData.type,
        d1: newData.d1,
        d2: newData.d2,
        d3: newData.d3,
        dLen: newData.dLen,
        d4: newData.d4,
        qty: rawQtyForCalc,
        unit: newData.unit,
        unitPrice: newData.unitPrice,
        priceBasis: newData.priceBasis,
      });

      if (calcRes.weightKg > 0) {
        newData.weightKg = calcRes.weightKg;
      }

      const unitLower = String(newData.unit || '').trim().toLowerCase();

      // Qty Calculation Logic:
      // If unit is 'kg', qty is set to workItem.weightKg (or calcRes.weightKg)
      // Otherwise fallback to D4 column value
      // Explicitly handle empty/null inputs by setting state to empty string instead of 0
      const isM2Unit = unitLower === 'm2' || unitLower === 'm²';
      const isMUnit = unitLower === 'm' || unitLower === 'meter' || unitLower === 'mtr';
      const isPcsUnit = ['pcs', 'unit', 'set', 'titik', 'btg', 'lot', 'buah', 'ls'].includes(unitLower);
      const rawD4 = parseFloat(String(newData.d4 || '0')) || 0;

      if (unitLower === 'kg') {
        if (calcRes.weightKg > 0) {
          newData.qty = Math.round(calcRes.weightKg * 100) / 100;
        } else if (newData.weightKg && Number(newData.weightKg) > 0) {
          newData.qty = Math.round(Number(newData.weightKg) * 100) / 100;
        } else if (field === 'qty' && (value === '' || value === null || value === undefined)) {
          newData.qty = '' as any;
        } else if (typeof newData.qty === 'number' && newData.qty > 0) {
          newData.weightKg = Math.round(newData.qty * 100) / 100;
        } else {
          newData.qty = '' as any;
        }
      } else {
        if (field === 'qty') {
          if (value === '' || value === null || value === undefined) {
            newData.qty = '' as any;
          } else {
            const strVal = typeof value === 'string' ? value.replace(',', '.').trim() : value;
            const parsedQty = parseFloat(strVal);
            newData.qty = !isNaN(parsedQty) ? Math.round(parsedQty * 100) / 100 : ('' as any);
          }
        } else if (field === 'd4') {
          if (value === '' || value === null || value === undefined) {
            newData.d4 = '';
          } else {
            const currentD4Str = String(value).trim();
            newData.d4 = currentD4Str;
            const d4Num = parseFloat(currentD4Str);
            if (!isNaN(d4Num) && d4Num > 0 && isPcsUnit && (!newData.qty || (newData.qty as any) === '' || newData.qty === 0)) {
              newData.qty = d4Num;
            }
          }
        }
      }

      // Calculate total price cleanly
      const effectiveQty = typeof newData.qty === 'number' && newData.qty > 0
        ? newData.qty
        : (rawD4 > 0 ? rawD4 : 0);
      const uPrice = typeof newData.unitPrice === 'number' ? newData.unitPrice : (parseFloat(String(newData.unitPrice || '0')) || 0);

      if (unitLower === 'kg' && newData.weightKg && newData.weightKg > 0) {
        newData.totalPrice = Math.round(newData.weightKg * uPrice);
      } else if (effectiveQty > 0 && uPrice > 0) {
        newData.totalPrice = Math.round(effectiveQty * uPrice);
      } else {
        newData.totalPrice = calcRes.totalPrice;
      }

      // Input Validation: When user manually clears both 'qty' and 'd4', reflect a clean empty value (prevent auto-filling with zero)
      const isQtyCleared = (newData.qty as any) === '' || newData.qty === null || newData.qty === undefined || newData.qty === 0;
      const isD4Cleared = !newData.d4 || String(newData.d4).trim() === '' || String(newData.d4).trim() === '0';
      if (isQtyCleared && isD4Cleared) {
        newData.qty = '' as any;
        newData.d4 = '';
      }

      newData.totalPrice = calcRes.totalPrice;
      return newData;
    });
  };

  const handleInlineSelectMaterial = (material: MaterialTypeDefinition) => {
    setEditFormData((prev) => {
      if (!prev) return null;
      const targetUnit = material.defaultUnit || prev.unit || 'kg';
      const newData: WorkItem = {
        ...prev,
        type: material.code,
        unitPrice: material.defaultUnitPrice,
        unit: targetUnit,
      };

      if (!newData.description || newData.description.startsWith('Work item ') || newData.description.startsWith('Baru')) {
        if (material.descriptionHint) {
          newData.description = material.descriptionHint;
        }
      }

      const rawQty = typeof newData.qty === 'number' ? newData.qty : (parseFloat(String(newData.qty)) || 1);
      const calcRes = TonnageCalculator.calculateItemTonnageAndPrice({
        typeCode: newData.type,
        d1: newData.d1,
        d2: newData.d2,
        d3: newData.d3,
        dLen: newData.dLen,
        d4: newData.d4,
        qty: rawQty,
        unit: newData.unit,
        unitPrice: newData.unitPrice,
        priceBasis: newData.priceBasis,
      });

      if (calcRes.weightKg > 0) {
        newData.weightKg = calcRes.weightKg;
      }

      const unitLower = String(targetUnit || '').trim().toLowerCase();
      if (unitLower === 'kg') {
        newData.qty = calcRes.weightKg > 0 ? Math.round(calcRes.weightKg * 1000) / 1000 : (newData.weightKg || ('' as any));
      } else {
        const d4Str = String(newData.d4 ?? '').trim();
        if (d4Str !== '') {
          const parsedD4 = parseFloat(d4Str);
          newData.qty = !isNaN(parsedD4) ? parsedD4 : ('' as any);
        } else {
          newData.qty = '' as any;
        }
      }

      newData.totalPrice = calcRes.totalPrice;
      return newData;
    });
  };

  const handleAddModalSelectMaterial = (material: MaterialTypeDefinition) => {
    setType(material.code);
    setPriceStr(String(material.defaultUnitPrice));
    if (material.defaultUnit) {
      setUnit(material.defaultUnit);
    }
    const targetD1 = d1 || (material.defaultD1 !== undefined ? String(material.defaultD1) : '');
    const targetD2 = d2 || (material.defaultD2 !== undefined ? String(material.defaultD2) : '');
    const targetD3 = d3 || (material.defaultD3 !== undefined ? String(material.defaultD3) : '');
    const targetDLen = dLen || (material.defaultDLen !== undefined ? String(material.defaultDLen) : '');
    const targetD4 = d4 || (material.defaultD4 !== undefined ? String(material.defaultD4) : '');

    setD1(targetD1);
    setD2(targetD2);
    setD3(targetD3);
    setDLen(targetDLen);
    setD4(targetD4);

    if (!description.trim() && material.descriptionHint) {
      setDescription(material.descriptionHint);
    }

    const calcRes = TonnageCalculator.calculateItemTonnageAndPrice({
      typeCode: material.code,
      d1: targetD1,
      d2: targetD2,
      d3: targetD3,
      dLen: targetDLen,
      d4: targetD4,
      qty: parseFloat(qtyStr) || 0,
      unit: material.defaultUnit || unit,
      unitPrice: material.defaultUnitPrice,
    });

    if (calcRes.weightKg > 0) {
      setWeightStr(String(calcRes.weightKg));
      const unitLower = String(material.defaultUnit || unit || '').trim().toLowerCase();
      if (unitLower === 'kg') {
        setQtyStr(String(Math.round(calcRes.weightKg * 1000) / 1000));
      }
    }
  };

  const handleDimensionChange = (newD1: string, newD2: string, newD3: string, newDLen: string, newD4: string, newType: string = type) => {
    let targetD1 = newD1;
    let targetD2 = newD2;
    let targetD3 = newD3;
    let targetDLen = newDLen;
    let targetD4 = newD4;

    const matchedMat = TonnageCalculator.getMaterialType(newType);
    let curPrice = parseFloat(priceStr) || 0;
    let curUnit = unit;
    if (matchedMat) {
      if (curPrice === 0 || curPrice === 48000 || curPrice === 1500000) {
        curPrice = matchedMat.defaultUnitPrice;
        setPriceStr(String(curPrice));
      }
      if (matchedMat.defaultUnit) {
        curUnit = matchedMat.defaultUnit;
        setUnit(curUnit);
      }
      if ((!description.trim() || description === 'Work item') && matchedMat.descriptionHint) {
        setDescription(matchedMat.descriptionHint);
      }
    }

    setD1(targetD1);
    setD2(targetD2);
    setD3(targetD3);
    setDLen(targetDLen);
    setD4(targetD4);
    setType(newType);

    const calcRes = TonnageCalculator.calculateItemTonnageAndPrice({
      typeCode: newType,
      d1: targetD1,
      d2: targetD2,
      d3: targetD3,
      dLen: targetDLen,
      d4: targetD4,
      qty: parseFloat(qtyStr) || 0,
      unit: curUnit,
      unitPrice: curPrice,
    });

    if (calcRes.weightKg > 0) {
      setWeightStr(String(calcRes.weightKg));
    }

    const unitLower = String(curUnit || '').trim().toLowerCase();
    const isKgUnit = unitLower === 'kg';
    const isUnitEmpty = !unitLower || unitLower === '' || unitLower === '-';

    if (isUnitEmpty) {
      setQtyStr('');
    } else if (isKgUnit && calcRes.weightKg > 0) {
      setQtyStr(String(Math.round(calcRes.weightKg * 1000) / 1000));
    } else {
      // Rule: Jika D4 terisi angka maka QTY otomatis sama dengan isi D4
      const d4ValStr = String(targetD4 ?? '').trim();
      if (d4ValStr !== '') {
        const parsedD4 = parseFloat(d4ValStr);
        if (!isNaN(parsedD4)) {
          setQtyStr(String(parsedD4));
        }
      }
    }
  };

  const handleApplyMaterialCalc = (result: CalculatedMaterialResult) => {
    if (inlineEditingId) {
      setEditFormData((prev) => {
        if (!prev) return null;
        const unitLower = String(result.unit || '').trim().toLowerCase();
        let qtyVal: any = result.qty;
        if (unitLower === 'kg') {
          qtyVal = result.weightKg > 0 ? result.weightKg : (result.qty || '');
        } else if (result.d4 && String(result.d4).trim() !== '') {
          const pD4 = parseFloat(String(result.d4));
          qtyVal = !isNaN(pD4) ? pD4 : (result.qty || '');
        }

        return {
          ...prev,
          type: result.typeCode,
          d1: result.d1,
          d2: result.d2,
          d3: result.d3,
          dLen: result.dLen || '',
          d4: result.d4,
          qty: qtyVal,
          unit: result.unit,
          weightKg: result.weightKg,
          unitPrice: result.unitPrice || prev.unitPrice,
          description: (!prev.description.trim() || 
                        prev.description.match(/^(Replating|Pipa|H-Beam|Besi Siku|Flat Bar|Round Bar|Square Bar|Kanal|Pasang|Crop & Replating)/))
                        ? result.description : prev.description,
          totalPrice: (result.weightKg > 0 && result.unit === 'kg') 
                       ? result.weightKg * (result.unitPrice || prev.unitPrice || 0) 
                       : (typeof qtyVal === 'number' ? qtyVal : 0) * (result.unitPrice || prev.unitPrice || 0),
        };
      });
      return;
    }

    setItemLevel(3);
    setType(result.typeCode);
    setD1(result.d1);
    setD2(result.d2);
    setD3(result.d3);
    setDLen(result.dLen || '');
    setD4(result.d4);
    setQtyStr(String(result.qty));
    setUnit(result.unit);
    setWeightStr(String(result.weightKg));
    if (result.unitPrice) {
      setPriceStr(String(result.unitPrice));
    }
    if (!description.trim()) {
      setDescription(result.description);
    }

    if (!isAddModalOpen) {
      const cat = result.category === 'pipe' ? 'cat-6' : 'cat-7';
      setTargetCategoryForAdd(cat);
      setItemNo(getNextItemSequenceNo(cat, 3, ''));
      setIsAddModalOpen(true);
    }
  };

  const handleSaveModal = (e?: React.FormEvent, keepOpen: boolean = false) => {
    if (e) e.preventDefault();
    if (!targetCategoryForAdd) {
      alert('Silakan pilih Kategori Galangan terlebih dahulu.');
      return;
    }
    if (!description.trim()) {
      alert('Silakan isi Nama Judul Area / Deskripsi Pekerjaan.');
      return;
    }

    let qty = qtyStr === '' ? 0 : (isNaN(parseFloat(qtyStr.replace(',', '.'))) ? 0 : Math.round(parseFloat(qtyStr.replace(',', '.')) * 100) / 100);
    const weightKg = weightStr === '' ? 0 : (isNaN(parseFloat(weightStr.replace(',', '.'))) ? 0 : Math.round(parseFloat(weightStr.replace(',', '.')) * 100) / 100);
    const isKgUnit = unit.trim().toLowerCase() === 'kg';
    if (isKgUnit) {
      if (weightKg > 0) qty = weightKg;
    } else {
      const d4Str = String(d4 ?? '').trim();
      if (d4Str !== '') {
        const parsedD4 = parseFloat(d4Str);
        if (!isNaN(parsedD4)) qty = parsedD4;
      }
    }
    const unitPrice = priceStr === '' ? 0 : (parseFloat(priceStr) || 0);
    const totalPrice = (weightKg > 0 && unit === 'kg') ? weightKg * unitPrice : qty * unitPrice;

    // Fallback itemNo if empty
    const finalItemNo = itemNo.trim() || getNextItemSequenceNo(targetCategoryForAdd, itemLevel, parentId) || '1';

    onAddItem({
      projectId: 'proj-f049',
      categoryId: targetCategoryForAdd,
      itemNo: finalItemNo,
      description: description.trim(),
      type: type.trim(),
      d1: d1.trim(),
      d2: d2.trim(),
      d3: d3.trim(),
      dLen: dLen.trim(),
      d4: d4.trim(),
      qty: qty,
      unit: unit,
      weightKg: weightKg,
      unitPrice: unitPrice,
      totalPrice: totalPrice,
      notes: notes.trim(),
      remark: remark.trim(),
      subcontractor: subcontractor.trim() || undefined,
      assignedTo: subcontractor.trim() || undefined,
      parentId: parentId || undefined,
      itemLevel,
      isAreaHeader: itemLevel === 1,
      isCompleted: false,
    });

    if (keepOpen) {
      setAddedBatchCount((prev) => prev + 1);
      setLastAddedToast(`✓ Item ${finalItemNo} "${description.trim()}" telah ditambahkan!`);

      // Reset fields for the next item
      setDescription('');
      setType('');
      setD1('');
      setD2('');
      setD3('');
      setDLen('');
      setD4('');
      setQtyStr('');
      setWeightStr('');
      setPriceStr('');
      setNotes('');
      setRemark('');
      setSubcontractor('');

      // Auto calculate next sequence number for the same level & parent
      setTimeout(() => {
        const nextNo = getNextItemSequenceNo(targetCategoryForAdd, itemLevel, parentId);
        setItemNo(nextNo);
        if (descInputRef.current) {
          descInputRef.current.focus();
        }
      }, 50);
    } else {
      setIsAddModalOpen(false);
      setAddedBatchCount(0);
      setLastAddedToast('');
    }
  };

  const toggleItemCompleted = (item: WorkItem) => {
    onUpdateItem({
      ...item,
      isCompleted: !item.isCompleted,
    });
  };

  // Helper to categorize items for tree structure inside a category
  const getCategoryTreeNodes = (categoryItems: WorkItem[]) => {
    // Determine level of each item
    const getLevelOfItem = (item: WorkItem): 1 | 2 | 3 => {
      if (item.itemLevel === 1 || item.isAreaHeader) return 1;
      if (item.itemLevel === 2) return 2;
      if (item.itemLevel === 3) return 3;

      // Infer from parentId or itemNo format
      if (item.parentId) {
        const p = categoryItems.find(i => i.id === item.parentId);
        if (p) {
          const pLvl = getLevelOfItem(p);
          return pLvl === 1 ? 2 : 3;
        }
      }

      // Check itemNo dots: "1" -> Level 1, "1.1" -> Level 2, "1.1.1" or "1.1.a" -> Level 3
      const parts = item.itemNo.trim().split('.');
      if (parts.length === 1 && (!item.type || item.type === '')) return 1;
      if (parts.length === 2) return 2;
      if (parts.length >= 3) return 3;
      return 3;
    };

    // Classify
    const areas: WorkItem[] = [];
    const subSystems: WorkItem[] = [];
    const components: WorkItem[] = [];

    categoryItems.forEach(item => {
      const lvl = getLevelOfItem(item);
      if (lvl === 1) areas.push(item);
      else if (lvl === 2) subSystems.push(item);
      else components.push(item);
    });

    // If there are no explicit areas (Level 1), synthesize or group top-level items
    return { areas, subSystems, components, getLevelOfItem };
  };

  // Helper to determine if an item is a leaf node in the 3-ply structure
  const isLeafItem = (item: WorkItem) => {
    if (item.itemLevel === 1 || item.isAreaHeader) return false;
    if (item.itemLevel === 2) {
      const hasChildren = workItems.some(c => 
        c.id !== item.id && 
        (c.parentId === item.id || c.itemNo.startsWith(`${item.itemNo}.`))
      );
      return !hasChildren;
    }
    return true; // Level 3 is always a leaf
  };

  // Helper to get all leaf descendants of a parent node (Level 1 or Level 2)
  const getLeafDescendants = (parent: WorkItem) => {
    return workItems.filter(item => {
      if (item.id === parent.id) return false;
      const isDescendant = item.parentId === parent.id || item.itemNo.startsWith(`${parent.itemNo}.`);
      if (!isDescendant) return false;
      return isLeafItem(item);
    });
  };

  // Helper to check if an item is completed (either direct for leaf, or derived for parent)
  const isItemCompleted = (item: WorkItem) => {
    if (isLeafItem(item)) {
      return Boolean(item.isCompleted);
    }
    const leaves = getLeafDescendants(item);
    if (leaves.length === 0) {
      return Boolean(item.isCompleted);
    }
    return leaves.every(leaf => Boolean(leaf.isCompleted));
  };

  // Categories matching current department
  const departmentCategories = useMemo(() => {
    if (selectedDepartment === 'all') return categories;
    const dept = DEPARTMENTS.find(d => d.id === selectedDepartment);
    if (!dept || dept.categoryCodes.length === 0) return categories;
    return categories.filter(c => dept.categoryCodes.includes(c.code));
  }, [categories, selectedDepartment]);

  // Active categories for rendering
  const activeCategories = useMemo(() => {
    if (selectedCategory !== 'all') {
      return categories.filter((c) => c.id === selectedCategory);
    }
    return departmentCategories;
  }, [categories, selectedCategory, departmentCategories]);

  // Available Level 1 areas in the current department / category
  const availableAreas = useMemo(() => {
    return workItems.filter((item) => {
      const isArea = item.itemLevel === 1 || item.isAreaHeader || (!item.itemNo.includes('.') && (!item.parentId || item.parentId === ''));
      if (!isArea) return false;
      if (selectedCategory !== 'all') {
        return item.categoryId === selectedCategory;
      }
      if (selectedDepartment !== 'all') {
        const dept = DEPARTMENTS.find(d => d.id === selectedDepartment);
        if (dept && dept.categoryCodes.length > 0) {
          const cat = categories.find(c => c.id === item.categoryId);
          return cat ? dept.categoryCodes.includes(cat.code) : true;
        }
      }
      return true;
    });
  }, [workItems, selectedCategory, selectedDepartment, categories]);

  const isFiltered = selectedDepartment !== 'all' || selectedCategory !== 'all' || selectedAreaId !== 'all' || Boolean(searchQuery.trim());

  const filteredWorkItems = useMemo(() => {
    return workItems.filter(item => {
      if (selectedDepartment !== 'all') {
        const dept = DEPARTMENTS.find(d => d.id === selectedDepartment);
        if (dept && dept.categoryCodes.length > 0) {
          const cat = categories.find(c => c.id === item.categoryId);
          if (!cat || !dept.categoryCodes.includes(cat.code)) return false;
        }
      }

      if (selectedCategory !== 'all' && item.categoryId !== selectedCategory) {
        return false;
      }

      if (selectedAreaId !== 'all') {
        const targetArea = workItems.find(w => w.id === selectedAreaId);
        const isAreaDirect = item.id === selectedAreaId;
        const isDescendant = item.parentId === selectedAreaId;
        const isUnderItemNo = targetArea ? (item.itemNo === targetArea.itemNo || item.itemNo.startsWith(`${targetArea.itemNo}.`)) : false;
        if (!isAreaDirect && !isDescendant && !isUnderItemNo) return false;
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchDesc = item.description.toLowerCase().includes(q);
        const matchType = item.type && item.type.toLowerCase().includes(q);
        const matchRemark = item.remark && item.remark.toLowerCase().includes(q);
        if (!matchDesc && !matchType && !matchRemark) return false;
      }

      return true;
    });
  }, [workItems, selectedDepartment, selectedCategory, selectedAreaId, searchQuery, categories]);

  const filteredTonnage = useMemo(() => {
    return filteredWorkItems.reduce((acc, i) => acc + (i.weightKg || 0), 0);
  }, [filteredWorkItems]);

  const filteredCost = useMemo(() => {
    return filteredWorkItems.reduce((acc, i) => acc + (i.totalPrice || 0), 0);
  }, [filteredWorkItems]);

  const resetAllFilters = () => {
    setSelectedDepartment('all');
    setSelectedCategory('all');
    setSelectedAreaId('all');
    setSearchQuery('');
  };

  const handleSelectDepartment = (deptId: string) => {
    setSelectedDepartment(deptId);
    setSelectedCategory('all');
    setSelectedAreaId('all');
  };

  const handleSelectCategory = (catId: string) => {
    setSelectedCategory(catId);
    setSelectedAreaId('all');
    if (catId !== 'all') {
      const cat = categories.find(c => c.id === catId);
      if (cat) {
        const parentDept = DEPARTMENTS.find(d => d.id !== 'all' && d.categoryCodes.includes(cat.code));
        if (parentDept && selectedDepartment !== 'all' && !parentDept.categoryCodes.includes(cat.code)) {
          setSelectedDepartment(parentDept.id);
        }
      }
    }
  };

  const grandTotalTonnage = workItems.reduce((acc, i) => acc + (i.weightKg || 0), 0);
  const grandTotalCost = workItems.reduce((acc, i) => acc + (i.totalPrice || 0), 0);

  // 1. Task Progress Metrics (Actionable Leaf items count)
  const leafItems = workItems.filter(item => isLeafItem(item));
  const completedLeafItems = leafItems.filter(item => Boolean(item.isCompleted));
  const taskProgressPercent = leafItems.length > 0 
    ? Math.round((completedLeafItems.length / leafItems.length) * 100) 
    : 0;

  // 2. Tonnage Progress Metrics (Completed Tonnage weight over total Tonnage weight)
  const itemsWithTonnage = workItems.filter(i => (i.weightKg || 0) > 0);
  const completedTonnage = itemsWithTonnage.reduce((acc, i) => {
    const completed = isItemCompleted(i);
    return acc + (completed ? (i.weightKg || 0) : 0);
  }, 0);
  const totalTonnage = itemsWithTonnage.reduce((acc, i) => acc + (i.weightKg || 0), 0);
  const tonnageProgressPercent = totalTonnage > 0
    ? Math.round((completedTonnage / totalTonnage) * 100)
    : 0;

  // 3. Cost Progress Metrics (Completed Cost value over total Cost value)
  const itemsWithCost = workItems.filter(i => (i.totalPrice || 0) > 0);
  const completedCost = itemsWithCost.reduce((acc, i) => {
    const completed = isItemCompleted(i);
    return acc + (completed ? (i.totalPrice || 0) : 0);
  }, 0);
  const totalCostVal = itemsWithCost.reduce((acc, i) => acc + (i.totalPrice || 0), 0);
  const costProgressPercent = totalCostVal > 0
    ? Math.round((completedCost / totalCostVal) * 100)
    : 0;

  const handleAutoRenumber = () => {
    let renumberedList: WorkItem[];
    if (selectedCategory && selectedCategory !== 'all') {
      renumberedList = resequenceCategoryItems(workItems, selectedCategory);
    } else {
      renumberedList = resequenceAllWorkItems(workItems);
    }
    if (onBatchSaveWorkItems) {
      onBatchSaveWorkItems(renumberedList);
    } else {
      sqliteService.importWorkItems(renumberedList, 'replace');
    }
  };

  return (
    <div className="space-y-4">
      {/* Category & Department Filter Bar */}
      <div className="bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs">
        {/* Left: Department, Category, Area dropdowns */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-slate-500 font-medium text-xs">
            <Filter className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="hidden sm:inline text-slate-700 font-semibold">Filter:</span>
          </div>

          {/* Department Dropdown */}
          <select
            value={selectedDepartment}
            onChange={(e) => handleSelectDepartment(e.target.value)}
            className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-hidden cursor-pointer min-h-[34px] max-w-full sm:max-w-[155px] md:max-w-[170px] truncate transition-colors flex-1 sm:flex-initial"
            title="Filter per Departemen Pekerjaan Galangan"
          >
            {DEPARTMENTS.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.label}
              </option>
            ))}
          </select>

          {/* Work Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => handleSelectCategory(e.target.value)}
            className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-hidden cursor-pointer min-h-[34px] max-w-full sm:max-w-[195px] md:max-w-[210px] truncate transition-colors flex-1 sm:flex-initial"
            title="Filter berdasarkan Work Category"
          >
            <option value="all">
              Semua Kategori ({departmentCategories.length > 0 ? departmentCategories.length : categories.length})
            </option>
            {departmentCategories.map((cat) => {
              const count = workItems.filter((i) => i.categoryId === cat.id).length;
              return (
                <option key={cat.id} value={cat.id}>
                  {cat.code}. {cat.name} ({count})
                </option>
              );
            })}
          </select>

          {/* Area Perbaikan Dropdown (shown if areas exist) */}
          {availableAreas.length > 0 && (
            <select
              value={selectedAreaId}
              onChange={(e) => setSelectedAreaId(e.target.value)}
              className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-hidden cursor-pointer min-h-[34px] max-w-full sm:max-w-[160px] md:max-w-[180px] truncate transition-colors flex-1 sm:flex-initial"
              title="Fokus per Area Perbaikan"
            >
              <option value="all">Semua Area ({availableAreas.length})</option>
              {availableAreas.map((area) => (
                <option key={area.id} value={area.id}>
                  Area {area.itemNo}: {area.description}
                </option>
              ))}
            </select>
          )}

          {/* Reset Filter button if any filter is active */}
          {isFiltered && (
            <button
              onClick={resetAllFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-medium rounded-lg transition-colors cursor-pointer min-h-[34px]"
              title="Reset semua filter ke default"
            >
              <RotateCcw className="w-3 h-3 text-amber-600" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Right: Search & Quick Status */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          {/* Bulk Selection Actions (Hapus) */}
          {selectedItemIds.size > 0 && (
            <div className="flex items-center gap-1.5 shrink-0 bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs">
              <button
                onClick={handleBulkDelete}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer min-h-[30px]"
                title="Hapus semua item yang dicentang"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus ({selectedItemIds.size})</span>
              </button>
            </div>
          )}

          {/* Search Box */}
          <div className="relative flex-1 md:w-56">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Cari item / uraian... (Ctrl+F)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-7 pr-7 py-1.5 text-xs bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500 min-h-[34px] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                title="Hapus pencarian"
              >
                &times;
              </button>
            )}
          </div>

          {/* Auto-Renumber Button */}
          <button
            onClick={handleAutoRenumber}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold rounded-lg shadow-2xs transition-colors shrink-0 cursor-pointer min-h-[34px]"
            title="Urutkan & Rapikan Penomoran Otomatis (Area 1, 2.. Sub 1.1, 1.2.. Komponen 1.1.1..)"
          >
            <ListOrdered className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Urutkan Nomor</span>
          </button>

          {/* Clear All Work Items Button */}
          {onClearAllItems && (
            <button
              onClick={onClearAllItems}
              disabled={workItems.length === 0}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 border text-xs font-semibold rounded-lg shadow-2xs transition-colors shrink-0 min-h-[34px] ${
                workItems.length === 0
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 cursor-pointer'
              }`}
              title="Kosongkan Semua Isi Kategori di Repair List"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden sm:inline">Kosongkan List</span>
            </button>
          )}

          {/* Audit Trail Button */}
          <button
            onClick={() => openAuditModal(undefined)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors shrink-0 cursor-pointer min-h-[34px]"
            title="Buka Log Riwayat Perubahan (Audit Trail Proyek)"
          >
            <History className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Audit Trail</span>
          </button>

          {/* Copy Table to Clipboard Button */}
          <button
            onClick={handleCopyTableTsv}
            disabled={workItems.length === 0}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 border text-xs font-semibold rounded-lg shadow-2xs transition-colors shrink-0 min-h-[34px] ${
              workItems.length === 0
                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 hover:border-slate-400 cursor-pointer'
            }`}
            title="Salin Seluruh Tabel Repair List ke Clipboard dalam Format Excel TSV (No. s/d REMARK)"
          >
            <Copy className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden md:inline">Salin Tabel</span>
          </button>

          {/* Download Official Template Button */}
          <button
            onClick={() => exportTemplate(categories, workItems, vessel?.name)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 hover:border-slate-400 text-xs font-semibold rounded-lg shadow-2xs transition-colors shrink-0 min-h-[34px] cursor-pointer"
            title="Unduh Template Excel 15 Kolom Standar yang Selaras dengan Aplikasi"
          >
            <Download className="w-3.5 h-3.5 text-emerald-700" />
            <span className="hidden lg:inline">Template Excel</span>
          </button>

          {/* Import Excel Button */}
          <button
            onClick={() => setIsExcelImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors shrink-0 min-h-[34px] cursor-pointer border border-emerald-700"
            title="Impor data tabel dari file Excel (.xlsx / .xls), CSV, atau TSV dengan validasi hierarki rapi"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-300" />
            <span>Impor Excel</span>
          </button>

          {/* Export Excel Button */}
          <button
            onClick={() => {
              if (onExportExcel) {
                onExportExcel();
              } else {
                exportShipyardExcel({
                  vessel: vessel || sqliteService.getVessel(),
                  schedule: schedule || sqliteService.getProjectSchedule(),
                  categories,
                  workItems,
                  signatures: sqliteService.getSignatures(),
                  includePrices: false,
                  singleSheetOnly: true,
                });
              }
            }}
            disabled={workItems.length === 0}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#03442C] hover:bg-[#04593A] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors shrink-0 min-h-[34px] ${
              workItems.length === 0
                ? 'opacity-60 cursor-not-allowed'
                : 'cursor-pointer'
            }`}
            title="Ekspor seluruh isi tabel Repair List ke file Microsoft Excel (.xlsx) lengkap dengan rumus dalam 1 Sheet"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-300" />
            <span>Ekspor Excel</span>
          </button>

          {/* Add Area Button */}
          <button
            onClick={() => openAddModalForLevel(selectedCategory !== 'all' ? selectedCategory : '', 1)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors shrink-0 cursor-pointer min-h-[34px]"
            title="Tambah Area / Pekerjaan Baru"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Area</span>
          </button>
        </div>
      </div>

      {/* Informative Banner when repair list is empty */}
      {workItems.length === 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-900 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold">Repair List Kosong.</span> Seluruh Kategori (I s/d XII) siap digunakan. Anda dapat menambah area baru atau mengimpor data dari Excel.
            </div>
          </div>
          <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
            <button
              onClick={() => setIsExcelImportModalOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-md font-semibold text-xs transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-600" />
              <span>Impor Excel</span>
            </button>
            <button
              onClick={() => openAddModalForLevel(selectedCategory !== 'all' ? selectedCategory : '', 1)}
              className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-semibold text-xs transition-colors cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Tambah Area</span>
            </button>
          </div>
        </div>
      )}

      {/* Spreadsheet Action Toolbar */}
      <SpreadsheetToolbar
        activeCell={spreadsheet.activeCell}
        items={workItems}
        onCut={spreadsheet.cutActiveCell}
        onCopy={spreadsheet.copyActiveCell}
        onPaste={spreadsheet.pasteActiveCell}
        onClearCell={spreadsheet.clearActiveCell}
        onInsertRowBelow={(item) => insertRowBelow(item)}
        onDeleteRow={(id) => onDeleteItem(id)}
        onOpenShortcutsModal={() => setIsShortcutsModalOpen(true)}
        toastMessage={spreadsheet.toastMessage}
      />

      {/* Work Items Table */}
      <div
        tabIndex={0}
        onKeyDown={spreadsheet.handleKeyDown}
        className="bg-white rounded-xl border-2 border-[#03442C]/40 shadow-sm overflow-hidden outline-hidden focus:ring-1 focus:ring-emerald-500"
      >
        {/* Mobile/Tablet Horizontal Scroll Hint */}
        <div className="block lg:hidden px-3 py-1 bg-emerald-50/90 border-b border-emerald-200 text-[11px] text-emerald-800 flex items-center justify-between">
          <span className="inline-flex items-center gap-1 font-medium">
            <span>&larr;</span>
            <span>Geser horizontal untuk kolom dimensi (D1-D4), Qty &amp; Tonase</span>
            <span>&rarr;</span>
          </span>
          <span className="font-mono text-[10px] text-emerald-600 font-semibold">Touch-Scroll</span>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDndKitDragEnd}>
          <SortableContext items={sortableItemIds} strategy={verticalListSortingStrategy}>
            <table className="w-full text-left text-xs border-collapse border border-slate-300">
            <thead>
              <tr className="bg-[#03442C] text-white font-bold uppercase text-[10px] tracking-wider align-middle border-b-2 border-emerald-950">
                <th className="py-2.5 px-2 w-9 text-center border-r border-emerald-800/60" title="Pilih / Check"></th>
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
                <th className="py-2.5 px-2 w-44 min-w-[176px] shrink-0 text-center">
                  <div className="flex items-center justify-between px-1">
                    <span className="leading-tight text-emerald-100 font-bold">Aksi &amp; Tambah</span>
                    <button
                      onClick={() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })}
                      className="px-1.5 py-0.5 text-[9px] font-semibold text-emerald-100 hover:text-white hover:bg-emerald-700/80 rounded border border-emerald-600/70 bg-emerald-800/60 transition-colors cursor-pointer inline-flex items-center gap-0.5 shadow-2xs"
                      title="Gulir ke bagian paling bawah tabel"
                    >
                      <span>&darr;</span>
                      <span>Bawah</span>
                    </button>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredWorkItems.length === 0 && (searchQuery.trim() || selectedAreaId !== 'all' || (selectedDepartment !== 'all' && workItems.length > 0)) ? (
                <tr>
                  <td colSpan={13} className="py-12 px-4 text-center bg-slate-50/50">
                    <div className="max-w-md mx-auto flex flex-col items-center justify-center text-slate-500">
                      <Filter className="w-8 h-8 text-slate-300 mb-2" />
                      <p className="font-semibold text-slate-700 text-sm">Tidak ada pekerjaan yang cocok dengan filter</p>
                      <p className="text-xs text-slate-500 mt-1">Coba ganti kategori, pilih semua departemen, atau hapus kata kunci pencarian.</p>
                      <button
                        onClick={resetAllFilters}
                        className="mt-3 px-3 py-1.5 bg-[#03442C] hover:bg-[#04593A] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                      >
                        Reset Filter (Tampilkan Semua)
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                activeCategories.map((category) => {
                  const categoryItems = workItems.filter((i) => {
                    const matchCat = i.categoryId === category.id;
                    if (!matchCat) return false;
                    if (selectedAreaId !== 'all') {
                      const targetArea = workItems.find(w => w.id === selectedAreaId);
                      const isAreaDirect = i.id === selectedAreaId;
                      const isDescendant = i.parentId === selectedAreaId;
                      const isUnderItemNo = targetArea ? (i.itemNo === targetArea.itemNo || i.itemNo.startsWith(`${targetArea.itemNo}.`)) : false;
                      if (!isAreaDirect && !isDescendant && !isUnderItemNo) return false;
                    }
                    if (!searchQuery) return true;
                    return (
                      i.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (i.type && i.type.toLowerCase().includes(searchQuery.toLowerCase())) ||
                      (i.remark && i.remark.toLowerCase().includes(searchQuery.toLowerCase()))
                    );
                  });

                  if (categoryItems.length === 0 && searchQuery.trim()) return null;

                const isCollapsed = Boolean(collapsedCats[category.id]);
                const catTonnage = categoryItems.reduce((a, b) => a + (b.weightKg || 0), 0);
                const catCost = categoryItems.reduce((a, b) => a + (b.totalPrice || 0), 0);

                const tree = getCategoryTreeNodes(categoryItems);

                return (
                  <React.Fragment key={category.id}>
                    {/* Category Header Row (Adaro Andalan Indonesia signature corporate deep forest green) */}
                    <tr className="bg-[#023321] text-white font-bold text-xs sticky top-0 z-10 border-y-2 border-emerald-950 shadow-xs">
                      <td colSpan={14} className="py-2 px-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={categoryItems.length > 0 && categoryItems.every((i) => selectedItemIds.has(i.id))}
                              onChange={() => toggleSelectAllInCategory(category.id, categoryItems)}
                              className="rounded bg-emerald-950 border-emerald-600 text-emerald-500 focus:ring-emerald-400 h-4 w-4 ml-1 cursor-pointer"
                              title="Pilih semua di kategori ini"
                            />
                            <button
                              onClick={() => toggleCategoryCollapse(category.id)}
                              className="flex items-center gap-2 hover:text-amber-300 transition-colors text-left cursor-pointer"
                            >
                              {isCollapsed ? (
                                <ChevronRight className="w-4 h-4 text-amber-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-amber-400" />
                              )}
                              <span className="tracking-wide font-extrabold text-sm text-white">
                                {category.code}. {category.name.toUpperCase()}
                              </span>
                              <span className="text-[11px] font-semibold bg-emerald-950/80 border border-emerald-700/70 text-emerald-200 px-2 py-0.5 rounded-full ml-1">
                                {categoryItems.length} item
                              </span>
                            </button>
                          </div>

                          <div className="flex items-center gap-3 text-xs font-normal">
                            {catTonnage > 0 && (
                              <span className="bg-emerald-950 px-2.5 py-1 rounded-md border border-amber-500/50 text-amber-300 font-mono font-bold text-xs shadow-2xs">
                                Tonase: {TonnageCalculator.formatWeight(catTonnage)}
                              </span>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openAddModalForLevel(category.id, 1);
                              }}
                              className="px-3 py-1 rounded-md bg-[#046A45] hover:bg-[#058456] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs border border-emerald-400/40 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5 text-amber-300" />
                              <span>+ Area</span>
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* Category Work Items Hierarchy */}
                    {!isCollapsed && (
                      categoryItems.length === 0 ? (
                        <tr>
                          <td colSpan={14} className="py-4 px-4 text-center bg-slate-50 border-b border-slate-200">
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-xs text-slate-500">
                              <span>Belum ada item pekerjaan di kategori {category.code}. {category.name}.</span>
                              <button
                                type="button"
                                onClick={() => openAddModalForLevel(category.id, 1)}
                                className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-semibold hover:underline cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Tambah item / area sekarang</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <>
                          {/* 1. Render Level 1 Areas */}
                        {tree.areas.map((area) => {
                          const isAreaCollapsed = Boolean(collapsedNodes[area.id]);

                          // Find sub-systems belonging to this Area
                          const areaSubSystems = tree.subSystems.filter(
                            (s) => s.parentId === area.id || s.itemNo.startsWith(`${area.itemNo}.`)
                          );

                          // Find standalone components under this Area
                          const areaComponents = tree.components.filter(
                            (c) => c.parentId === area.id || (c.itemNo.startsWith(`${area.itemNo}.`) && !areaSubSystems.some(s => c.parentId === s.id || c.itemNo.startsWith(`${s.itemNo}.`)))
                          );

                          // Aggregated totals for this Area
                          const allChildIds = new Set<string>();
                          areaSubSystems.forEach(s => {
                            allChildIds.add(s.id);
                            tree.components.filter(c => c.parentId === s.id || c.itemNo.startsWith(`${s.itemNo}.`)).forEach(c => allChildIds.add(c.id));
                          });
                          areaComponents.forEach(c => allChildIds.add(c.id));

                          const areaChildItems = categoryItems.filter(i => allChildIds.has(i.id));
                          const areaTotalWeight = areaChildItems.reduce((acc, i) => acc + (i.weightKg || 0), 0) + (area.weightKg || 0);
                          const areaTotalCost = areaChildItems.reduce((acc, i) => acc + (i.totalPrice || 0), 0) + (area.totalPrice || 0);

                          // Calculate progress for this Area (only consider actionable leaf items)
                          const areaLeaves = areaChildItems.filter(item => isLeafItem(item));
                          const totalAreaLeaves = areaLeaves.length;
                          const completedAreaLeaves = areaLeaves.filter(i => i.isCompleted).length;
                          const areaProgressPercent = totalAreaLeaves > 0 ? Math.round((completedAreaLeaves / totalAreaLeaves) * 100) : 0;

                          return (
                            <React.Fragment key={`area-block-${area.id}`}>
                              {/* AREA HEADER ROW (LEVEL 1) */}
                              {inlineEditingId === area.id && editFormData ? (() => {
                                const activeLabels = TonnageCalculator.getDimensionLabels(editFormData.type || '');
                                return (
                                  <tr className="bg-amber-50/90 border-t-2 border-amber-400 border-l-4 border-l-amber-600 font-bold shadow-xs transition-colors">
                                    <td className="py-2 px-3 text-center"></td>
                                    <td className="py-2 px-2 text-center min-w-[75px] max-w-[110px]">
                                      <input
                                        type="text"
                                        value={editFormData.itemNo}
                                        onChange={(e) => handleEditFormChange('itemNo', e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        title="Nomor Urut (Bisa diedit: 1 = Area, 1.1 = Sub-system, 1.1.1 = Komponen)"
                                        className="w-full text-center text-xs px-1.5 py-1.5 bg-white border border-amber-400 rounded focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-extrabold font-mono shadow-2xs"
                                      />
                                    </td>
                                    <td className="py-2 px-3">
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="text"
                                          value={editFormData.description}
                                          onChange={(e) => handleEditFormChange('description', e.target.value)}
                                          onKeyDown={handleKeyDown}
                                          className="w-full text-xs px-2 py-1.5 bg-white border border-slate-300 rounded focus:outline-hidden font-extrabold"
                                        />
                                      </div>
                                    </td>
                                    <td className="py-2 px-2 min-w-[140px]">
                                      <input
                                        type="text"
                                        value={editFormData.notes || ''}
                                        onChange={(e) => handleEditFormChange('notes', e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        className="w-full text-xs px-2 py-1.5 bg-white border border-slate-300 rounded"
                                        placeholder="Keterangan Area"
                                      />
                                    </td>
                                    <td className="py-2 px-1 align-top w-28 relative">
                                      <input
    type="text"
    value={editFormData.type || ''}
    onChange={(val) => handleEditFormChange('type', val)}
    onKeyDown={handleKeyDown}
    placeholder="Tipe..."
    className="w-full text-center text-xs px-2 py-1.5 bg-white border border-emerald-300 rounded focus:outline-hidden font-bold font-mono uppercase"
  />
                                    </td>
                                    <td className="py-2 px-1 align-top w-12">
                                      <input type="text" value={editFormData.d1 || ''} onChange={(e) => handleEditFormChange('d1', e.target.value)} onKeyDown={handleKeyDown} placeholder={activeLabels.placeholder1} title={activeLabels.d1} className="w-full text-center font-mono text-xs px-1 py-1.5 bg-white border border-slate-300 rounded focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-bold" />
                                    </td>
                                    <td className="py-2 px-1 align-top w-12">
                                      <input type="text" value={editFormData.d2 || ''} onChange={(e) => handleEditFormChange('d2', e.target.value)} onKeyDown={handleKeyDown} placeholder={activeLabels.placeholder2} title={activeLabels.d2} className="w-full text-center font-mono text-xs px-1 py-1.5 bg-white border border-slate-300 rounded focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-bold" />
                                    </td>
                                    <td className="py-2 px-1 align-top w-12">
                                      <input type="text" value={editFormData.d3 || ''} onChange={(e) => handleEditFormChange('d3', e.target.value)} onKeyDown={handleKeyDown} placeholder={activeLabels.placeholder3} title={activeLabels.d3} className="w-full text-center font-mono text-xs px-1 py-1.5 bg-white border border-slate-300 rounded focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-bold" disabled={activeLabels.placeholder3 === '-'} />
                                    </td>
                                    <td className="py-2 px-1 align-top w-14">
                                      <input type="text" value={editFormData.dLen || ''} onChange={(e) => handleEditFormChange('dLen', e.target.value)} onKeyDown={handleKeyDown} placeholder={activeLabels.placeholderLen} title={activeLabels.dLen} className="w-full text-center font-mono text-xs px-1 py-1.5 bg-amber-50 border border-amber-300 rounded focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-bold text-amber-900" />
                                    </td>
                                    <td className="py-2 px-1 align-top w-14">
                                      <input type="text" value={editFormData.d4 || ''} onChange={(e) => handleEditFormChange('d4', e.target.value)} onKeyDown={handleKeyDown} placeholder={activeLabels.placeholder4} title={activeLabels.d4} className="w-full text-center font-mono text-xs px-1 py-1.5 bg-white border border-slate-300 rounded focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-bold" />
                                    </td>
                                                                         <td className="py-1.5 px-1 align-top w-20">
                                       <input
                                         type="number"
                                         step="any"
                                         value={editFormData.qty || ''}
                                         onChange={(e) => handleEditFormChange('qty', parseFloat(e.target.value) || 0)}
                                         onKeyDown={handleKeyDown}
                                         placeholder="Qty"
                                         className="w-full text-right font-mono font-bold text-xs px-1.5 py-1.5 bg-white border border-slate-300 rounded focus:border-emerald-500"
                                       />
                                     </td>
                                     <td className="py-1.5 px-1 align-top w-20">
                                       <input
                                         type="text"
                                         value={editFormData.unit || ''}
                                         onChange={(e) => handleEditFormChange('unit', e.target.value)}
                                         onKeyDown={handleKeyDown}
                                         placeholder="Satuan"
                                         className="w-full text-center font-mono font-bold text-xs px-1.5 py-1.5 bg-white border border-slate-300 rounded focus:border-emerald-500"
                                       />
                                     </td>
                                    
                                    <td className="py-2 px-1 align-top min-w-[130px] w-36">
                                      <input
                                        type="text"
                                        value={editFormData.remark || ''}
                                        onChange={(e) => handleEditFormChange('remark', e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        className="w-full text-xs px-2 py-1.5 bg-white border border-slate-300 rounded font-normal"
                                        placeholder="Remark Area"
                                      />
                                    </td>

                                    <td className="py-2 px-2 text-center">
                                      <div className="flex items-center justify-center gap-1.5">
                                        <button onClick={saveInlineEdit} className="p-1 bg-emerald-600 text-white hover:bg-emerald-700 rounded shadow-2xs" title="Simpan">
                                          <Save className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={cancelInlineEdit} className="p-1 bg-slate-300 text-slate-700 hover:bg-slate-400 rounded shadow-2xs" title="Batal">
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })() : (
                                <tr
                                  draggable={true}
                                  onDragStart={(e) => handleDragStart(e, area)}
                                  onDragOver={(e) => handleDragOver(e, area)}
                                  onDragLeave={handleDragLeave}
                                  onDrop={(e) => handleDrop(e, area)}
                                  onDragEnd={handleDragEnd}
                                  onDoubleClick={() => openEditModal(area)}
                                  onContextMenu={(e) => handleContextMenu(e, area)}
                                  className={`font-bold border-t-2 border-slate-300 transition-colors cursor-pointer ${
                                    draggedItemId === area.id
                                      ? 'opacity-40 bg-amber-100/90'
                                      : dragOverItemId === area.id
                                      ? dropPosition === 'above'
                                        ? 'border-t-4 border-t-emerald-600 bg-emerald-50'
                                        : 'border-b-4 border-b-emerald-600 bg-emerald-50'
                                      : selectedItemIds.has(area.id)
                                      ? 'bg-sky-100/90 border-l-4 border-l-sky-600 hover:bg-sky-200/80 text-sky-950 shadow-2xs'
                                      : 'bg-slate-100/90 hover:bg-slate-200/80'
                                  }`}
                                >
                                  <td className="py-2 px-2 text-center border-r border-slate-200">
                                    <div className="flex items-center justify-center gap-1">
                                      <span
                                        draggable={true}
                                        onDragStart={(e) => handleDragStart(e, area)}
                                        title="Tahan & seret untuk mengubah urutan pekerjaan"
                                        className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-700 p-0.5 shrink-0"
                                      >
                                        <GripVertical className="w-3.5 h-3.5" />
                                      </span>
                                      <input
                                        type="checkbox"
                                        checked={selectedItemIds.has(area.id)}
                                        onChange={() => toggleSelectItem(area.id)}
                                        className="rounded border-slate-300 text-emerald-600 h-3.5 w-3.5 cursor-pointer"
                                      />
                                    </div>
                                  </td>
                                  <SpreadsheetCell
                                    itemId={area.id}
                                    field="itemNo"
                                    value={area.itemNo}
                                    activeCell={spreadsheet.activeCell}
                                    editingCell={spreadsheet.editingCell}
                                    editValue={spreadsheet.editValue}
                                    align="center"
                                    className="text-slate-800 font-extrabold text-xs border-r border-slate-200 font-mono"
                                    onSelectCell={spreadsheet.setActiveCell}
                                    onStartEdit={spreadsheet.startEditing}
                                    onEditChange={spreadsheet.setEditValue}
                                    onSaveEdit={spreadsheet.saveEditing}
                                    onCancelEdit={spreadsheet.cancelEditing}
                                    onContextMenu={(e, _, f) => {
                                      e.preventDefault();
                                      spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: area, field: f });
                                    }}
                                  />
                                  <SpreadsheetCell
                                    itemId={area.id}
                                    field="description"
                                    value={area.description}
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
                                    onContextMenu={(e, _, f) => {
                                      e.preventDefault();
                                      spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: area, field: f });
                                    }}
                                    displayFormatter={(val) => (
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleNodeCollapse(area.id);
                                          }}
                                          className="p-0.5 rounded text-slate-600 hover:bg-slate-300 cursor-pointer shrink-0"
                                        >
                                          {isAreaCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        </button>
                                        <span className="font-extrabold text-slate-900 text-xs tracking-wide">
                                          {val}
                                        </span>
                                        {area.updatedBy && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              openAuditModal(area.id);
                                            }}
                                            className="ml-1 px-1.5 py-0.5 rounded bg-slate-200/80 hover:bg-blue-100 text-[9px] text-slate-600 hover:text-blue-800 font-mono inline-flex items-center gap-1 transition-colors group cursor-pointer shrink-0"
                                            title={`Terakhir diubah oleh ${area.updatedBy} pada ${new Date(area.updatedAt || '').toLocaleString('id-ID')}`}
                                          >
                                            <History className="w-2.5 h-2.5 text-slate-500 group-hover:text-blue-600" />
                                            <span>{area.updatedBy.split(' ')[0]}</span>
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  />
                                  <SpreadsheetCell
                                    itemId={area.id}
                                    field="notes"
                                    value={area.notes}
                                    activeCell={spreadsheet.activeCell}
                                    editingCell={spreadsheet.editingCell}
                                    editValue={spreadsheet.editValue}
                                    align="left"
                                    className="text-slate-600 text-[11px] font-normal min-w-[140px] border-r border-slate-200"
                                    onSelectCell={spreadsheet.setActiveCell}
                                    onStartEdit={spreadsheet.startEditing}
                                    onEditChange={spreadsheet.setEditValue}
                                    onSaveEdit={spreadsheet.saveEditing}
                                    onCancelEdit={spreadsheet.cancelEditing}
                                    onContextMenu={(e, _, f) => {
                                      e.preventDefault();
                                      spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: area, field: f });
                                    }}
                                  />

                                  <SpreadsheetCell
                                    itemId={area.id}
                                    field="type"
                                    value={(area.type && area.type !== '0') ? area.type : ''}
                                    activeCell={spreadsheet.activeCell}
                                    editingCell={spreadsheet.editingCell}
                                    editValue={spreadsheet.editValue}
                                    align="center"
                                    className="font-mono text-slate-600 text-[11px] border-r border-slate-200 font-bold uppercase"
                                    onSelectCell={spreadsheet.setActiveCell}
                                    onStartEdit={spreadsheet.startEditing}
                                    onEditChange={spreadsheet.setEditValue}
                                    onSaveEdit={spreadsheet.saveEditing}
                                    onCancelEdit={spreadsheet.cancelEditing}
                                    onContextMenu={(e, _, f) => {
                                      e.preventDefault();
                                      spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: area, field: f });
                                    }}
                                  />

                                  <SpreadsheetCell
                                    itemId={area.id}
                                    field="d1"
                                    value={(area.d1 && area.d1 !== '0') ? area.d1 : ''}
                                    activeCell={spreadsheet.activeCell}
                                    editingCell={spreadsheet.editingCell}
                                    editValue={spreadsheet.editValue}
                                    align="center"
                                    className="font-mono text-slate-600 text-[11px] border-r border-slate-200 font-bold"
                                    onSelectCell={spreadsheet.setActiveCell}
                                    onStartEdit={spreadsheet.startEditing}
                                    onEditChange={spreadsheet.setEditValue}
                                    onSaveEdit={spreadsheet.saveEditing}
                                    onCancelEdit={spreadsheet.cancelEditing}
                                    onContextMenu={(e, _, f) => {
                                      e.preventDefault();
                                      spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: area, field: f });
                                    }}
                                  />

                                  <SpreadsheetCell
                                    itemId={area.id}
                                    field="d2"
                                    value={(area.d2 && area.d2 !== '0') ? area.d2 : ''}
                                    activeCell={spreadsheet.activeCell}
                                    editingCell={spreadsheet.editingCell}
                                    editValue={spreadsheet.editValue}
                                    align="center"
                                    className="font-mono text-slate-600 text-[11px] border-r border-slate-200 font-bold"
                                    onSelectCell={spreadsheet.setActiveCell}
                                    onStartEdit={spreadsheet.startEditing}
                                    onEditChange={spreadsheet.setEditValue}
                                    onSaveEdit={spreadsheet.saveEditing}
                                    onCancelEdit={spreadsheet.cancelEditing}
                                    onContextMenu={(e, _, f) => {
                                      e.preventDefault();
                                      spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: area, field: f });
                                    }}
                                  />

                                  <SpreadsheetCell
                                    itemId={area.id}
                                    field="d3"
                                    value={(area.d3 && area.d3 !== '0') ? area.d3 : ''}
                                    activeCell={spreadsheet.activeCell}
                                    editingCell={spreadsheet.editingCell}
                                    editValue={spreadsheet.editValue}
                                    align="center"
                                    className="font-mono text-slate-600 text-[11px] border-r border-slate-200 font-bold"
                                    onSelectCell={spreadsheet.setActiveCell}
                                    onStartEdit={spreadsheet.startEditing}
                                    onEditChange={spreadsheet.setEditValue}
                                    onSaveEdit={spreadsheet.saveEditing}
                                    onCancelEdit={spreadsheet.cancelEditing}
                                    onContextMenu={(e, _, f) => {
                                      e.preventDefault();
                                      spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: area, field: f });
                                    }}
                                  />

                                  <SpreadsheetCell
                                    itemId={area.id}
                                    field="dLen"
                                    value={(area.dLen && area.dLen !== '0') ? area.dLen : ''}
                                    activeCell={spreadsheet.activeCell}
                                    editingCell={spreadsheet.editingCell}
                                    editValue={spreadsheet.editValue}
                                    align="center"
                                    className="font-mono text-amber-900 font-bold bg-amber-50/50 text-[11px] border-x-2 border-amber-300/70"
                                    onSelectCell={spreadsheet.setActiveCell}
                                    onStartEdit={spreadsheet.startEditing}
                                    onEditChange={spreadsheet.setEditValue}
                                    onSaveEdit={spreadsheet.saveEditing}
                                    onCancelEdit={spreadsheet.cancelEditing}
                                    onContextMenu={(e, _, f) => {
                                      e.preventDefault();
                                      spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: area, field: f });
                                    }}
                                  />

                                  <SpreadsheetCell
                                    itemId={area.id}
                                    field="d4"
                                    value={(area.d4 && area.d4 !== '0') ? area.d4 : ''}
                                    
                                    
                                    activeCell={spreadsheet.activeCell}
                                    editingCell={spreadsheet.editingCell}
                                    editValue={spreadsheet.editValue}
                                    align="center"
                                    className="font-mono text-slate-600 text-[11px] border-r border-slate-200 font-bold"
                                    onSelectCell={spreadsheet.setActiveCell}
                                    onStartEdit={spreadsheet.startEditing}
                                    onEditChange={spreadsheet.setEditValue}
                                    onSaveEdit={spreadsheet.saveEditing}
                                    onCancelEdit={spreadsheet.cancelEditing}
                                    onContextMenu={(e, _, f) => {
                                      e.preventDefault();
                                      spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: area, field: f });
                                    }}
                                  />

                                  <SpreadsheetCell
                                     itemId={area.id}
                                     field="qty"
                                     value={area.qty}
                                     
                                     
                                     inputType="number"
                                     activeCell={spreadsheet.activeCell}
                                     editingCell={spreadsheet.editingCell}
                                     editValue={spreadsheet.editValue}
                                     align="right"
                                     className="border-r border-slate-200 w-20 font-bold font-mono"
                                     onSelectCell={spreadsheet.setActiveCell}
                                     onStartEdit={spreadsheet.startEditing}
                                     onEditChange={spreadsheet.setEditValue}
                                     onSaveEdit={spreadsheet.saveEditing}
                                     onCancelEdit={spreadsheet.cancelEditing}
                                     onContextMenu={(e, _, f) => {
                                       e.preventDefault();
                                       spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: area, field: f });
                                     }}
                                     displayFormatter={(val) => {
                                        if (val === undefined || val === null || (val as any) === '' || val === 0) return '-';
                                        const num = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
                                        if (isNaN(num) || num === 0) return '-';
                                        return num.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                      }}
                                   />

                                   <SpreadsheetCell
                                     itemId={area.id}
                                     field="unit"
                                     value={area.unit}
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
                                     onContextMenu={(e, _, f) => {
                                       e.preventDefault();
                                       spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: area, field: f });
                                     }}
                                     displayFormatter={(val) => val || '-'}
                                   />

                                   <SpreadsheetCell
                                    itemId={area.id}
                                    field="remark"
                                    value={area.remark}
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
                                    onContextMenu={(e, _, f) => {
                                      e.preventDefault();
                                      spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: area, field: f });
                                    }}
                                  />

                                  <td className="py-2 px-2 text-center">
                                    <div className="flex items-center justify-center gap-1.5 min-w-[160px]">
                                      <button
                                        onClick={() => openAddModalForLevel(category.id, 2, area)}
                                        className="px-2.5 py-1 bg-[#03442C] hover:bg-[#04593A] text-white text-[10px] font-bold rounded-md shadow-2xs inline-flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
                                        title="Tambah Sub-system di bawah Area ini"
                                      >
                                        <Plus className="w-3 h-3 text-amber-300" />
                                        <span>+ Sub-System</span>
                                      </button>
                                      <button
                                        onClick={() => openAuditModal(area.id)}
                                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer shrink-0"
                                        title="Lihat Riwayat Perubahan (Audit Trail)"
                                      >
                                        <History className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => openEditModal(area)}
                                        className="p-1 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors cursor-pointer shrink-0"
                                        title="Edit Area"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => onDeleteItem(area.id)}
                                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer shrink-0"
                                        title="Hapus Area"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              )}

                              {/* SUB-SYSTEMS & COMPONENTS UNDER THIS AREA */}
                              {!isAreaCollapsed && (
                                <>
                                  {areaSubSystems.map((subSystem) => {
                                    const isSubCollapsed = Boolean(collapsedNodes[subSystem.id]);

                                    // Find components under this sub-system
                                    const subComponents = tree.components.filter(
                                      (c) => c.parentId === subSystem.id || c.itemNo.startsWith(`${subSystem.itemNo}.`)
                                    );

                                    const subTotalWeight = subComponents.reduce((acc, c) => acc + (c.weightKg || 0), 0) + (subSystem.weightKg || 0);
                                    const subTotalCost = subComponents.reduce((acc, c) => acc + (c.totalPrice || 0), 0) + (subSystem.totalPrice || 0);

                                    return (
                                      <React.Fragment key={`sub-block-${subSystem.id}`}>
                                        {/* SUB-SYSTEM ROW (LEVEL 2) */}
                                        {inlineEditingId === subSystem.id && editFormData ? (() => {
                                          const activeLabels = TonnageCalculator.getDimensionLabels(editFormData.type || '');
                                          return (
                                            <tr className="bg-amber-50/90 border-t border-amber-300 border-l-4 border-l-amber-500 shadow-xs transition-colors">
                                              <td className="py-1.5 px-3 text-center"></td>
                                              <td className="py-1.5 px-1 align-top text-center min-w-[75px] max-w-[110px]">
                                                <input
                                                  type="text"
                                                  value={editFormData.itemNo}
                                                  onChange={(e) => handleEditFormChange('itemNo', e.target.value)}
                                                  onKeyDown={handleKeyDown}
                                                  title="Nomor Urut (Bisa diedit: 1 = Area, 1.1 = Sub-system, 1.1.1 = Komponen)"
                                                  className="w-full text-center text-xs px-1.5 py-1.5 bg-white border border-sky-400 rounded focus:outline-hidden focus:ring-2 focus:ring-sky-500 font-bold font-mono shadow-2xs"
                                                />
                                              </td>
                                              <td className="py-1.5 px-1 align-top min-w-[280px]">
                                                
                                                <textarea
                                                  rows={2}
                                                   value={editFormData.description}
                                                   onChange={(e) => handleEditFormChange('description', e.target.value)}
                                                   onKeyDown={handleKeyDown}
                                                   className="w-full text-xs px-2 py-1.5 bg-white border border-emerald-300 rounded focus:outline-hidden font-bold text-emerald-950 leading-relaxed resize-none"
                                                />
                                              </td>
                                              <td className="py-1.5 px-1 align-top min-w-[140px]">
                                                <input type="text" value={editFormData.notes || ''} onChange={(e) => handleEditFormChange('notes', e.target.value)} onKeyDown={handleKeyDown} className="w-full text-xs px-2 py-1.5 bg-white border border-emerald-300 rounded" placeholder="Keterangan Sub-system" />
                                              </td>
                                              <td className="py-1.5 px-1 align-top w-32 relative">
                                                <MaterialTypeSelector
                                                  value={editFormData.type || ''}
                                                  onChange={(val) => handleEditFormChange('type', val)}
                                                  onSelectMaterial={handleInlineSelectMaterial}
                                                  placeholder="Tipe..."
                                                  compact
                                                  inputClassName="w-full text-center text-xs px-1 py-1 bg-white border border-emerald-300 rounded focus:outline-hidden font-bold font-mono uppercase"
                                                />
                                              </td>
                                              <td className="py-1.5 px-1 align-top w-12">
                                                <input type="text" value={editFormData.d1 || ''} onChange={(e) => handleEditFormChange('d1', e.target.value)} onKeyDown={handleKeyDown} placeholder={activeLabels.placeholder1} title={activeLabels.d1} className="w-full text-center font-mono text-xs px-1 py-1.5 bg-white border border-emerald-300 rounded font-bold" />
                                              </td>
                                              <td className="py-1.5 px-1 align-top w-12">
                                                <input type="text" value={editFormData.d2 || ''} onChange={(e) => handleEditFormChange('d2', e.target.value)} onKeyDown={handleKeyDown} placeholder={activeLabels.placeholder2} title={activeLabels.d2} className="w-full text-center font-mono text-xs px-1 py-1.5 bg-white border border-emerald-300 rounded font-bold" />
                                              </td>
                                              <td className="py-1.5 px-1 align-top w-12">
                                                <input type="text" value={editFormData.d3 || ''} onChange={(e) => handleEditFormChange('d3', e.target.value)} onKeyDown={handleKeyDown} placeholder={activeLabels.placeholder3} title={activeLabels.d3} className="w-full text-center font-mono text-xs px-1 py-1.5 bg-white border border-emerald-300 rounded font-bold" disabled={activeLabels.placeholder3 === '-'} />
                                              </td>
                                              <td className="py-1.5 px-1 align-top w-14">
                                                <input type="text" value={editFormData.dLen || ''} onChange={(e) => handleEditFormChange('dLen', e.target.value)} onKeyDown={handleKeyDown} placeholder={activeLabels.placeholderLen} title={activeLabels.dLen} className="w-full text-center font-mono text-xs px-1 py-1.5 bg-amber-50 border border-amber-300 rounded focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-bold text-amber-900" />
                                              </td>
                                              <td className="py-1.5 px-1 align-top w-14">
                                                <input type="text" value={editFormData.d4 || ''} onChange={(e) => handleEditFormChange('d4', e.target.value)} onKeyDown={handleKeyDown} placeholder={activeLabels.placeholder4} title={activeLabels.d4} className="w-full text-center font-mono text-xs px-1 py-1.5 bg-white border border-emerald-300 rounded font-bold" />
                                              </td>
                                                                                   <td className="py-1.5 px-1 align-top w-20">
                                       <input
                                         type="number"
                                         step="any"
                                         value={editFormData.qty || ''}
                                         onChange={(e) => handleEditFormChange('qty', parseFloat(e.target.value) || 0)}
                                         onKeyDown={handleKeyDown}
                                         placeholder="Qty"
                                         className="w-full text-right font-mono font-bold text-xs px-1.5 py-1.5 bg-white border border-slate-300 rounded focus:border-emerald-500"
                                       />
                                     </td>
                                     <td className="py-1.5 px-1 align-top w-20">
                                       <input
                                         type="text"
                                         value={editFormData.unit || ''}
                                         onChange={(e) => handleEditFormChange('unit', e.target.value)}
                                         onKeyDown={handleKeyDown}
                                         placeholder="Satuan"
                                         className="w-full text-center font-mono font-bold text-xs px-1.5 py-1.5 bg-white border border-slate-300 rounded focus:border-emerald-500"
                                       />
                                     </td>
                                              <td className="py-1.5 px-1 align-top min-w-[130px] w-36">
                                                <input
                                                  type="text"
                                                  value={editFormData.remark || ''}
                                                  onChange={(e) => handleEditFormChange('remark', e.target.value)}
                                                  onKeyDown={handleKeyDown}
                                                  className="w-full text-xs px-2 py-1.5 bg-white border border-emerald-300 rounded font-normal"
                                                  placeholder="Remark Sub-system"
                                                />
                                              </td>
                                              
                                              <td className="py-1.5 px-1 align-top text-center w-28 pt-2.5">
                                                <div className="flex items-center justify-center gap-1.5">
                                                  <button onClick={saveInlineEdit} className="p-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded shadow-xs" title="Simpan">
                                                    <Save className="w-3.5 h-3.5" />
                                                  </button>
                                                  <button onClick={cancelInlineEdit} className="p-1.5 bg-slate-300 text-slate-700 hover:bg-slate-400 rounded shadow-xs" title="Batal">
                                                    <X className="w-3.5 h-3.5" />
                                                  </button>
                                                </div>
                                              </td>
                                            </tr>
                                          );
                                        })() : (
                                          <tr
                                            draggable={true}
                                            onDragStart={(e) => handleDragStart(e, subSystem)}
                                            onDragOver={(e) => handleDragOver(e, subSystem)}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e) => handleDrop(e, subSystem)}
                                            onDragEnd={handleDragEnd}
                                            onDoubleClick={() => openEditModal(subSystem)}
                                            onContextMenu={(e) => handleContextMenu(e, subSystem)}
                                            className={`font-semibold border-t border-slate-200 transition-colors cursor-pointer ${
                                              draggedItemId === subSystem.id
                                                ? 'opacity-40 bg-amber-100/90'
                                                : dragOverItemId === subSystem.id
                                                ? dropPosition === 'above'
                                                  ? 'border-t-4 border-t-emerald-600 bg-emerald-50'
                                                  : 'border-b-4 border-b-emerald-600 bg-emerald-50'
                                                : selectedItemIds.has(subSystem.id)
                                                ? 'bg-sky-100/80 border-l-4 border-l-sky-500 hover:bg-sky-100 text-sky-950 shadow-2xs'
                                                : 'bg-emerald-50/60 hover:bg-emerald-100/50'
                                            }`}
                                          >
                                            <td className="py-1.5 px-2 text-center border-r border-slate-200">
                                              <div className="flex items-center justify-center gap-1">
                                                <span
                                                  draggable={true}
                                                  onDragStart={(e) => handleDragStart(e, subSystem)}
                                                  title="Tahan & seret untuk mengubah urutan pekerjaan"
                                                  className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-700 p-0.5 shrink-0"
                                                >
                                                  <GripVertical className="w-3.5 h-3.5" />
                                                </span>
                                                <input
                                                  type="checkbox"
                                                  checked={selectedItemIds.has(subSystem.id)}
                                                  onChange={() => toggleSelectItem(subSystem.id)}
                                                  className="rounded border-slate-300 text-emerald-600 h-3.5 w-3.5 cursor-pointer"
                                                />
                                              </div>
                                            </td>
                                            <SpreadsheetCell
                                              itemId={subSystem.id}
                                              field="itemNo"
                                              value={subSystem.itemNo}
                                              activeCell={spreadsheet.activeCell}
                                              editingCell={spreadsheet.editingCell}
                                              editValue={spreadsheet.editValue}
                                              align="center"
                                              className="text-emerald-900 font-bold text-xs border-r border-slate-200 font-mono"
                                              onSelectCell={spreadsheet.setActiveCell}
                                              onStartEdit={spreadsheet.startEditing}
                                              onEditChange={spreadsheet.setEditValue}
                                              onSaveEdit={spreadsheet.saveEditing}
                                              onCancelEdit={spreadsheet.cancelEditing}
                                              onContextMenu={(e, _, f) => {
                                                e.preventDefault();
                                                spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: subSystem, field: f });
                                              }}
                                            />
                                            <SpreadsheetCell
                                              itemId={subSystem.id}
                                              field="description"
                                              value={subSystem.description}
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
                                              onContextMenu={(e, _, f) => {
                                                e.preventDefault();
                                                spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: subSystem, field: f });
                                              }}
                                              displayFormatter={(val) => (
                                                <div className="flex items-center gap-2 pl-3">
                                                  {subComponents.length > 0 ? (
                                                    <button
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleNodeCollapse(subSystem.id);
                                                      }}
                                                      className="p-0.5 rounded text-emerald-700 hover:bg-emerald-200 shrink-0 cursor-pointer"
                                                    >
                                                      {isSubCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                                    </button>
                                                  ) : (
                                                    <div className="w-4.5 h-4.5 shrink-0" />
                                                  )}
                                                  
                                                  <span className="font-bold text-xs shrink-0 text-slate-800">
                                                    {val}
                                                  </span>
                                                  {subSystem.updatedBy && (
                                                    <button
                                                      type="button"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        openAuditModal(subSystem.id);
                                                      }}
                                                      className="ml-1 px-1.5 py-0.5 rounded bg-emerald-100/70 hover:bg-blue-100 text-[9px] text-emerald-800 hover:text-blue-800 font-mono inline-flex items-center gap-1 transition-colors group cursor-pointer shrink-0"
                                                      title={`Terakhir diubah oleh ${subSystem.updatedBy} pada ${new Date(subSystem.updatedAt || '').toLocaleString('id-ID')}`}
                                                    >
                                                      <History className="w-2.5 h-2.5 text-emerald-600 group-hover:text-blue-600" />
                                                      <span>{subSystem.updatedBy.split(' ')[0]}</span>
                                                    </button>
                                                  )}
                                                </div>
                                              )}
                                            />
                                            <SpreadsheetCell
                                              itemId={subSystem.id}
                                              field="notes"
                                              value={subSystem.notes}
                                              activeCell={spreadsheet.activeCell}
                                              editingCell={spreadsheet.editingCell}
                                              editValue={spreadsheet.editValue}
                                              align="left"
                                              className="text-slate-600 text-[11px] min-w-[140px] border-r border-slate-200"
                                              onSelectCell={spreadsheet.setActiveCell}
                                              onStartEdit={spreadsheet.startEditing}
                                              onEditChange={spreadsheet.setEditValue}
                                              onSaveEdit={spreadsheet.saveEditing}
                                              onCancelEdit={spreadsheet.cancelEditing}
                                              onContextMenu={(e, _, f) => {
                                                e.preventDefault();
                                                spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: subSystem, field: f });
                                              }}
                                              displayFormatter={(val) => val || (subComponents.length > 0 ? `${subComponents.length} rincian` : '-')}
                                            />

                                            <SpreadsheetCell
                                              itemId={subSystem.id}
                                              field="type"
                                              value={(subSystem.type && subSystem.type !== '0') ? subSystem.type : ''}
                                              activeCell={spreadsheet.activeCell}
                                              editingCell={spreadsheet.editingCell}
                                              editValue={spreadsheet.editValue}
                                              align="center"
                                              className="font-mono text-slate-600 text-[11px] border-r border-slate-200 font-bold uppercase"
                                              onSelectCell={spreadsheet.setActiveCell}
                                              onStartEdit={spreadsheet.startEditing}
                                              onEditChange={spreadsheet.setEditValue}
                                              onSaveEdit={spreadsheet.saveEditing}
                                              onCancelEdit={spreadsheet.cancelEditing}
                                              onContextMenu={(e, _, f) => {
                                                e.preventDefault();
                                                spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: subSystem, field: f });
                                              }}
                                            />

                                            <SpreadsheetCell
                                              itemId={subSystem.id}
                                              field="d1"
                                              value={(subSystem.d1 && subSystem.d1 !== '0') ? subSystem.d1 : ''}
                                              activeCell={spreadsheet.activeCell}
                                              editingCell={spreadsheet.editingCell}
                                              editValue={spreadsheet.editValue}
                                              align="center"
                                              className="font-mono text-slate-600 text-[11px] border-r border-slate-200 font-bold"
                                              onSelectCell={spreadsheet.setActiveCell}
                                              onStartEdit={spreadsheet.startEditing}
                                              onEditChange={spreadsheet.setEditValue}
                                              onSaveEdit={spreadsheet.saveEditing}
                                              onCancelEdit={spreadsheet.cancelEditing}
                                              onContextMenu={(e, _, f) => {
                                                e.preventDefault();
                                                spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: subSystem, field: f });
                                              }}
                                            />

                                            <SpreadsheetCell
                                              itemId={subSystem.id}
                                              field="d2"
                                              value={(subSystem.d2 && subSystem.d2 !== '0') ? subSystem.d2 : ''}
                                              activeCell={spreadsheet.activeCell}
                                              editingCell={spreadsheet.editingCell}
                                              editValue={spreadsheet.editValue}
                                              align="center"
                                              className="font-mono text-slate-600 text-[11px] border-r border-slate-200 font-bold"
                                              onSelectCell={spreadsheet.setActiveCell}
                                              onStartEdit={spreadsheet.startEditing}
                                              onEditChange={spreadsheet.setEditValue}
                                              onSaveEdit={spreadsheet.saveEditing}
                                              onCancelEdit={spreadsheet.cancelEditing}
                                              onContextMenu={(e, _, f) => {
                                                e.preventDefault();
                                                spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: subSystem, field: f });
                                              }}
                                            />

                                            <SpreadsheetCell
                                              itemId={subSystem.id}
                                              field="d3"
                                              value={(subSystem.d3 && subSystem.d3 !== '0') ? subSystem.d3 : ''}
                                              activeCell={spreadsheet.activeCell}
                                              editingCell={spreadsheet.editingCell}
                                              editValue={spreadsheet.editValue}
                                              align="center"
                                              className="font-mono text-slate-600 text-[11px] border-r border-slate-200 font-bold"
                                              onSelectCell={spreadsheet.setActiveCell}
                                              onStartEdit={spreadsheet.startEditing}
                                              onEditChange={spreadsheet.setEditValue}
                                              onSaveEdit={spreadsheet.saveEditing}
                                              onCancelEdit={spreadsheet.cancelEditing}
                                              onContextMenu={(e, _, f) => {
                                                e.preventDefault();
                                                spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: subSystem, field: f });
                                              }}
                                            />

                                            <SpreadsheetCell
                                              itemId={subSystem.id}
                                              field="dLen"
                                              value={(subSystem.dLen && subSystem.dLen !== '0') ? subSystem.dLen : ''}
                                              activeCell={spreadsheet.activeCell}
                                              editingCell={spreadsheet.editingCell}
                                              editValue={spreadsheet.editValue}
                                              align="center"
                                              className="font-mono text-amber-900 font-bold bg-amber-50/50 text-[11px] border-x-2 border-amber-300/70"
                                              onSelectCell={spreadsheet.setActiveCell}
                                              onStartEdit={spreadsheet.startEditing}
                                              onEditChange={spreadsheet.setEditValue}
                                              onSaveEdit={spreadsheet.saveEditing}
                                              onCancelEdit={spreadsheet.cancelEditing}
                                              onContextMenu={(e, _, f) => {
                                                e.preventDefault();
                                                spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: subSystem, field: f });
                                              }}
                                            />

                                            <SpreadsheetCell
                                              itemId={subSystem.id}
                                              field="d4"
                                              value={(subSystem.d4 && subSystem.d4 !== '0') ? subSystem.d4 : ''}
                                              activeCell={spreadsheet.activeCell}
                                              editingCell={spreadsheet.editingCell}
                                              editValue={spreadsheet.editValue}
                                              align="center"
                                              className="font-mono text-slate-600 text-[11px] border-r border-slate-200 font-bold"
                                              onSelectCell={spreadsheet.setActiveCell}
                                              onStartEdit={spreadsheet.startEditing}
                                              onEditChange={spreadsheet.setEditValue}
                                              onSaveEdit={spreadsheet.saveEditing}
                                              onCancelEdit={spreadsheet.cancelEditing}
                                              onContextMenu={(e, _, f) => {
                                                e.preventDefault();
                                                spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: subSystem, field: f });
                                              }}
                                            />

                                            <SpreadsheetCell
                                     itemId={subSystem.id}
                                     field="qty"
                                     value={subSystem.qty}
                                     inputType="number"
                                     activeCell={spreadsheet.activeCell}
                                     editingCell={spreadsheet.editingCell}
                                     editValue={spreadsheet.editValue}
                                     align="right"
                                     className="border-r border-slate-200 w-20 font-bold font-mono"
                                     onSelectCell={spreadsheet.setActiveCell}
                                     onStartEdit={spreadsheet.startEditing}
                                     onEditChange={spreadsheet.setEditValue}
                                     onSaveEdit={spreadsheet.saveEditing}
                                     onCancelEdit={spreadsheet.cancelEditing}
                                     onContextMenu={(e, _, f) => {
                                       e.preventDefault();
                                       spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: subSystem, field: f });
                                     }}
                                     displayFormatter={(val) => {
                                        if (val === undefined || val === null || (val as any) === '' || val === 0) return '-';
                                        const num = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
                                        if (isNaN(num) || num === 0) return '-';
                                        return num.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                      }}
                                   />

                                   <SpreadsheetCell
                                     itemId={subSystem.id}
                                     field="unit"
                                     value={subSystem.unit}
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
                                     onContextMenu={(e, _, f) => {
                                       e.preventDefault();
                                       spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: subSystem, field: f });
                                     }}
                                     displayFormatter={(val) => val || '-'}
                                   />

                                   <SpreadsheetCell
                                              itemId={subSystem.id}
                                              field="remark"
                                              value={subSystem.remark}
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
                                              onContextMenu={(e, _, f) => {
                                                e.preventDefault();
                                                spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: subSystem, field: f });
                                              }}
                                            />
                                            
                                            <td className="py-1.5 px-2 text-center">
                                              <div className="flex items-center justify-center gap-1.5 min-w-[160px]">
                                                <button
                                                  onClick={() => openAddModalForLevel(category.id, 3, subSystem)}
                                                  className="px-2.5 py-1 bg-[#046A45] hover:bg-[#058456] text-white text-[10px] font-bold rounded-md shadow-2xs inline-flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
                                                  title="Tambah Detail Komponen di bawah Sub-system ini"
                                                >
                                                  <Plus className="w-3 h-3 text-amber-300" />
                                                  <span>+ Komponen</span>
                                                </button>
                                                <button
                                                  onClick={() => openAuditModal(subSystem.id)}
                                                  className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer shrink-0"
                                                  title="Lihat Riwayat Perubahan (Audit Trail)"
                                                >
                                                  <History className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                  onClick={() => openEditModal(subSystem)}
                                                  className="p-1 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors cursor-pointer shrink-0"
                                                  title="Edit Sub-system"
                                                >
                                                  <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                  onClick={() => onDeleteItem(subSystem.id)}
                                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer shrink-0"
                                                  title="Hapus Sub-system"
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                              </div>
                                            </td>
                                          </tr>
                                        )}

                                        {/* DETAIL COMPONENTS UNDER SUB-SYSTEM (LEVEL 3) */}
                                        {!isSubCollapsed &&
                                          subComponents.map((item) => (
                                            <ComponentRow
                                              key={item.id}
                                              item={item}
                                              selectedItemIds={selectedItemIds}
                                              toggleSelectItem={toggleSelectItem}
                                              toggleItemCompleted={toggleItemCompleted}
                                              openEditModal={openEditModal}
                                              onDeleteItem={onDeleteItem}
                                              inlineEditingId={inlineEditingId}
                                              editFormData={editFormData}
                                              handleEditFormChange={handleEditFormChange}
                                              handleInlineSelectMaterial={handleInlineSelectMaterial}
                                              saveInlineEdit={saveInlineEdit}
                                              cancelInlineEdit={cancelInlineEdit}
                                              setIsMaterialCalcOpen={setIsMaterialCalcOpen}
                                              onInsertRowBelow={insertRowBelow}
                                              onContextMenu={handleContextMenu}
                                              openAuditModal={openAuditModal}
                                              spreadsheet={spreadsheet}
                                            />
                                          ))}
                                      </React.Fragment>
                                    );
                                  })}

                                  {/* STANDALONE COMPONENTS DIRECTLY UNDER AREA */}
                                  {areaComponents.map((item) => (
                                    <ComponentRow
                                      key={item.id}
                                      item={item}
                                      selectedItemIds={selectedItemIds}
                                      toggleSelectItem={toggleSelectItem}
                                      toggleItemCompleted={toggleItemCompleted}
                                      openEditModal={openEditModal}
                                      onDeleteItem={onDeleteItem}
                                      inlineEditingId={inlineEditingId}
                                      editFormData={editFormData}
                                      handleEditFormChange={handleEditFormChange}
                                      handleInlineSelectMaterial={handleInlineSelectMaterial}
                                      saveInlineEdit={saveInlineEdit}
                                      cancelInlineEdit={cancelInlineEdit}
                                      setIsMaterialCalcOpen={setIsMaterialCalcOpen}
                                      onInsertRowBelow={insertRowBelow}
                                      onContextMenu={handleContextMenu}
                                      openAuditModal={openAuditModal}
                                      spreadsheet={spreadsheet}
                                    />
                                  ))}
                                </>
                              )}
                            </React.Fragment>
                          );
                        })}

                        {/* 2. Render Unassigned or Standalone Sub-systems / Components without Area */}
                        {tree.subSystems.filter(s => !tree.areas.some(a => s.parentId === a.id || s.itemNo.startsWith(`${a.itemNo}.`))).map(subSystem => {
                          const isSubCollapsed = Boolean(collapsedNodes[subSystem.id]);
                          const subComponents = tree.components.filter(c => c.parentId === subSystem.id || c.itemNo.startsWith(`${subSystem.itemNo}.`));
                          const subTotalWeight = subComponents.reduce((acc, c) => acc + (c.weightKg || 0), 0) + (subSystem.weightKg || 0);
                          const subTotalCost = subComponents.reduce((acc, c) => acc + (c.totalPrice || 0), 0) + (subSystem.totalPrice || 0);

                          return (
                            <React.Fragment key={`orphan-sub-${subSystem.id}`}>
                              {inlineEditingId === subSystem.id && editFormData ? (
                                <tr className="bg-amber-50/90 border-t border-amber-300 border-l-4 border-l-amber-500 shadow-xs transition-colors">
                                  <td className="py-1.5 px-3 text-center"></td>
                                  <td className="py-1.5 px-1 align-top text-center min-w-[75px] max-w-[110px]">
                                    <input
                                      type="text"
                                      value={editFormData.itemNo}
                                      onChange={(e) => handleEditFormChange('itemNo', e.target.value)}
                                      onKeyDown={handleKeyDown}
                                      title="Nomor Urut (Bisa diedit: 1 = Area, 1.1 = Sub-system, 1.1.1 = Komponen)"
                                      className="w-full text-center text-xs px-1.5 py-1.5 bg-white border border-sky-400 rounded focus:outline-hidden focus:ring-2 focus:ring-sky-500 font-bold font-mono shadow-2xs"
                                    />
                                  </td>
                                  <td className="py-1.5 px-1 align-top min-w-[280px]">
                                    
                                    <textarea
                                      rows={2}
                                                   value={editFormData.description}
                                                   onChange={(e) => handleEditFormChange('description', e.target.value)}
                                                   onKeyDown={handleKeyDown}
                                                   className="w-full text-xs px-2 py-1.5 bg-white border border-emerald-300 rounded focus:outline-hidden font-bold text-emerald-950 leading-relaxed resize-none"
                                    />
                                  </td>
                                  <td className="py-1.5 px-1 align-top min-w-[140px]">
                                    <input
                                      type="text"
                                      value={editFormData.remark || ''}
                                      onChange={(e) => handleEditFormChange('remark', e.target.value)}
                                      className="w-full text-xs px-2 py-1.5 bg-white border border-emerald-300 rounded"
                                      placeholder="Keterangan Sub-system"
                                    />
                                  </td>
                                  <td className="py-1.5 px-1 align-top w-32 relative">
                                    <MaterialTypeSelector
                                      value={editFormData.type || ''}
                                      onChange={(val) => handleEditFormChange('type', val)}
                                      onSelectMaterial={handleInlineSelectMaterial}
                                      placeholder="Tipe..."
                                      compact
                                      inputClassName="w-full text-center text-xs px-1 py-1 bg-white border border-emerald-300 rounded focus:outline-hidden font-bold font-mono uppercase"
                                    />
                                  </td>
                                  <td className="py-1.5 px-1 align-top w-12">
                                    <input type="text" value={editFormData.d1 || ''} onChange={(e) => handleEditFormChange('d1', e.target.value)} onKeyDown={handleKeyDown} placeholder={TonnageCalculator.getDimensionLabels(editFormData.type || '').placeholder1} title={TonnageCalculator.getDimensionLabels(editFormData.type || '').d1} className="w-full text-center font-mono text-xs px-1 py-1.5 bg-white border border-emerald-300 rounded font-bold" />
                                  </td>
                                  <td className="py-1.5 px-1 align-top w-12">
                                    <input type="text" value={editFormData.d2 || ''} onChange={(e) => handleEditFormChange('d2', e.target.value)} onKeyDown={handleKeyDown} placeholder={TonnageCalculator.getDimensionLabels(editFormData.type || '').placeholder2} title={TonnageCalculator.getDimensionLabels(editFormData.type || '').d2} className="w-full text-center font-mono text-xs px-1 py-1.5 bg-white border border-emerald-300 rounded font-bold" />
                                  </td>
                                  <td className="py-1.5 px-1 align-top w-12">
                                    <input type="text" value={editFormData.d3 || ''} onChange={(e) => handleEditFormChange('d3', e.target.value)} onKeyDown={handleKeyDown} placeholder={TonnageCalculator.getDimensionLabels(editFormData.type || '').placeholder3} title={TonnageCalculator.getDimensionLabels(editFormData.type || '').d3} className="w-full text-center font-mono text-xs px-1 py-1.5 bg-white border border-emerald-300 rounded font-bold" disabled={TonnageCalculator.getDimensionLabels(editFormData.type || '').placeholder3 === '-'} />
                                  </td>
                                  <td className="py-1.5 px-1 align-top w-14">
                                    <input type="text" value={editFormData.dLen || ''} onChange={(e) => handleEditFormChange('dLen', e.target.value)} onKeyDown={handleKeyDown} placeholder={TonnageCalculator.getDimensionLabels(editFormData.type || '').placeholderLen} title={TonnageCalculator.getDimensionLabels(editFormData.type || '').dLen} className="w-full text-center font-mono text-xs px-1 py-1.5 bg-amber-50 border border-amber-300 rounded focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-bold text-amber-900" />
                                  </td>
                                  <td className="py-1.5 px-1 align-top w-14">
                                    <input type="text" value={editFormData.d4 || ''} onChange={(e) => handleEditFormChange('d4', e.target.value)} onKeyDown={handleKeyDown} placeholder={TonnageCalculator.getDimensionLabels(editFormData.type || '').placeholder4} title={TonnageCalculator.getDimensionLabels(editFormData.type || '').d4} className="w-full text-center font-mono text-xs px-1 py-1.5 bg-white border border-emerald-300 rounded font-bold" />
                                  </td>
                                                                       <td className="py-1.5 px-1 align-top w-20">
                                       <input
                                         type="number"
                                         step="any"
                                         value={editFormData.qty || ''}
                                         onChange={(e) => handleEditFormChange('qty', parseFloat(e.target.value) || 0)}
                                         onKeyDown={handleKeyDown}
                                         placeholder="Qty"
                                         className="w-full text-right font-mono font-bold text-xs px-1.5 py-1.5 bg-white border border-slate-300 rounded focus:border-emerald-500"
                                       />
                                     </td>
                                     <td className="py-1.5 px-1 align-top w-20">
                                       <input
                                         type="text"
                                         value={editFormData.unit || ''}
                                         onChange={(e) => handleEditFormChange('unit', e.target.value)}
                                         onKeyDown={handleKeyDown}
                                         placeholder="Satuan"
                                         className="w-full text-center font-mono font-bold text-xs px-1.5 py-1.5 bg-white border border-slate-300 rounded focus:border-emerald-500"
                                       />
                                     </td>
                                  <td className="py-1.5 px-1 align-top min-w-[130px] w-36">
                                    <input
                                      type="text"
                                      value={editFormData.remark || ''}
                                      onChange={(e) => handleEditFormChange('remark', e.target.value)}
                                      onKeyDown={handleKeyDown}
                                      className="w-full text-xs px-2 py-1.5 bg-white border border-emerald-300 rounded font-normal"
                                      placeholder="Remark Sub-system"
                                    />
                                  </td>
                                  
                                  <td className="py-1.5 px-1 align-top text-center w-28 pt-2.5">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button onClick={saveInlineEdit} className="p-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded shadow-xs" title="Simpan">
                                        <Save className="w-3.5 h-3.5" />
                                      </button>
                                      <button onClick={cancelInlineEdit} className="p-1.5 bg-slate-300 text-slate-700 hover:bg-slate-400 rounded shadow-xs" title="Batal">
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ) : (
                                <tr
                                  onDoubleClick={() => openEditModal(subSystem)}
                                  onContextMenu={(e) => handleContextMenu(e, subSystem)}
                                  className={`font-semibold border-t border-slate-200 transition-colors cursor-pointer ${
                                    selectedItemIds.has(subSystem.id)
                                      ? 'bg-sky-100/80 border-l-4 border-l-sky-500 hover:bg-sky-100 text-sky-950 shadow-2xs'
                                      : 'bg-emerald-50/40 hover:bg-emerald-100/50'
                                  }`}
                                >
                                  <td className="py-1.5 px-3 text-center border-r border-slate-200">
                                    <input
                                      type="checkbox"
                                      checked={selectedItemIds.has(subSystem.id)}
                                      onChange={() => toggleSelectItem(subSystem.id)}
                                      className="rounded border-slate-300 text-emerald-600 h-3.5 w-3.5 cursor-pointer"
                                    />
                                  </td>
                                  <SpreadsheetCell
                                    itemId={subSystem.id}
                                    field="itemNo"
                                    value={subSystem.itemNo}
                                    activeCell={spreadsheet.activeCell}
                                    editingCell={spreadsheet.editingCell}
                                    editValue={spreadsheet.editValue}
                                    align="center"
                                    className="text-emerald-900 font-bold text-xs border-r border-slate-200 font-mono"
                                    onSelectCell={spreadsheet.setActiveCell}
                                    onStartEdit={spreadsheet.startEditing}
                                    onEditChange={spreadsheet.setEditValue}
                                    onSaveEdit={spreadsheet.saveEditing}
                                    onCancelEdit={spreadsheet.cancelEditing}
                                    onContextMenu={(e, _, f) => {
                                      e.preventDefault();
                                      spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: subSystem, field: f });
                                    }}
                                  />
                                  <SpreadsheetCell
                                    itemId={subSystem.id}
                                    field="description"
                                    value={subSystem.description}
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
                                    onContextMenu={(e, _, f) => {
                                      e.preventDefault();
                                      spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: subSystem, field: f });
                                    }}
                                    displayFormatter={(val) => (
                                      <div className="flex items-center gap-2 pl-3">
                                        {subComponents.length > 0 ? (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toggleNodeCollapse(subSystem.id);
                                            }}
                                            className="p-0.5 rounded text-emerald-700 hover:bg-emerald-200 shrink-0 cursor-pointer"
                                          >
                                            {isSubCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                          </button>
                                        ) : (
                                          <div className="w-4.5 h-4.5 shrink-0" />
                                        )}
                                        <span className="font-bold text-xs shrink-0 text-slate-800">
                                          {val}
                                        </span>
                                      </div>
                                    )}
                                  />
                                  <SpreadsheetCell
                                    itemId={subSystem.id}
                                    field="notes"
                                    value={subSystem.notes}
                                    activeCell={spreadsheet.activeCell}
                                    editingCell={spreadsheet.editingCell}
                                    editValue={spreadsheet.editValue}
                                    align="left"
                                    className="text-slate-600 text-[11px] min-w-[140px] border-r border-slate-200"
                                    onSelectCell={spreadsheet.setActiveCell}
                                    onStartEdit={spreadsheet.startEditing}
                                    onEditChange={spreadsheet.setEditValue}
                                    onSaveEdit={spreadsheet.saveEditing}
                                    onCancelEdit={spreadsheet.cancelEditing}
                                    onContextMenu={(e, _, f) => {
                                      e.preventDefault();
                                      spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: subSystem, field: f });
                                    }}
                                    displayFormatter={(val) => val || (subComponents.length > 0 ? `${subComponents.length} rincian` : '-')}
                                  />
                                  <SpreadsheetCell
                                    itemId={subSystem.id}
                                    field="type"
                                    value={(subSystem.type && subSystem.type !== '0') ? subSystem.type : ''}
                                    activeCell={spreadsheet.activeCell}
                                    editingCell={spreadsheet.editingCell}
                                    editValue={spreadsheet.editValue}
                                    align="center"
                                    className="font-mono text-slate-600 text-[11px] border-r border-slate-200 font-bold uppercase"
                                    onSelectCell={spreadsheet.setActiveCell}
                                    onStartEdit={spreadsheet.startEditing}
                                    onEditChange={spreadsheet.setEditValue}
                                    onSaveEdit={spreadsheet.saveEditing}
                                    onCancelEdit={spreadsheet.cancelEditing}
                                    onContextMenu={(e, _, f) => {
                                      e.preventDefault();
                                      spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: subSystem, field: f });
                                    }}
                                  />
                                  <SpreadsheetCell
                                    itemId={subSystem.id}
                                    field="d1"
                                    value={(subSystem.d1 && subSystem.d1 !== '0') ? subSystem.d1 : ''}
                                    activeCell={spreadsheet.activeCell}
                                    editingCell={spreadsheet.editingCell}
                                    editValue={spreadsheet.editValue}
                                    align="center"
                                    className="font-mono text-slate-600 text-[11px] border-r border-slate-200 font-bold"
                                    onSelectCell={spreadsheet.setActiveCell}
                                    onStartEdit={spreadsheet.startEditing}
                                    onEditChange={spreadsheet.setEditValue}
                                    onSaveEdit={spreadsheet.saveEditing}
                                    onCancelEdit={spreadsheet.cancelEditing}
                                    onContextMenu={(e, _, f) => {
                                      e.preventDefault();
                                      spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: subSystem, field: f });
                                    }}
                                  />
                                  <SpreadsheetCell
                                    itemId={subSystem.id}
                                    field="d2"
                                    value={(subSystem.d2 && subSystem.d2 !== '0') ? subSystem.d2 : ''}
                                    activeCell={spreadsheet.activeCell}
                                    editingCell={spreadsheet.editingCell}
                                    editValue={spreadsheet.editValue}
                                    align="center"
                                    className="font-mono text-slate-600 text-[11px] border-r border-slate-200 font-bold"
                                    onSelectCell={spreadsheet.setActiveCell}
                                    onStartEdit={spreadsheet.startEditing}
                                    onEditChange={spreadsheet.setEditValue}
                                    onSaveEdit={spreadsheet.saveEditing}
                                    onCancelEdit={spreadsheet.cancelEditing}
                                    onContextMenu={(e, _, f) => {
                                      e.preventDefault();
                                      spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: subSystem, field: f });
                                    }}
                                  />
                                  <SpreadsheetCell
                                    itemId={subSystem.id}
                                    field="d3"
                                    value={(subSystem.d3 && subSystem.d3 !== '0') ? subSystem.d3 : ''}
                                    activeCell={spreadsheet.activeCell}
                                    editingCell={spreadsheet.editingCell}
                                    editValue={spreadsheet.editValue}
                                    align="center"
                                    className="font-mono text-slate-600 text-[11px] border-r border-slate-200 font-bold"
                                    onSelectCell={spreadsheet.setActiveCell}
                                    onStartEdit={spreadsheet.startEditing}
                                    onEditChange={spreadsheet.setEditValue}
                                    onSaveEdit={spreadsheet.saveEditing}
                                    onCancelEdit={spreadsheet.cancelEditing}
                                    onContextMenu={(e, _, f) => {
                                      e.preventDefault();
                                      spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: subSystem, field: f });
                                    }}
                                  />
                                  <SpreadsheetCell
                                    itemId={subSystem.id}
                                    field="dLen"
                                    value={(subSystem.dLen && subSystem.dLen !== '0') ? subSystem.dLen : ''}
                                    activeCell={spreadsheet.activeCell}
                                    editingCell={spreadsheet.editingCell}
                                    editValue={spreadsheet.editValue}
                                    align="center"
                                    className="font-mono text-amber-900 font-bold bg-amber-50/50 text-[11px] border-x-2 border-amber-300/70"
                                    onSelectCell={spreadsheet.setActiveCell}
                                    onStartEdit={spreadsheet.startEditing}
                                    onEditChange={spreadsheet.setEditValue}
                                    onSaveEdit={spreadsheet.saveEditing}
                                    onCancelEdit={spreadsheet.cancelEditing}
                                    onContextMenu={(e, _, f) => {
                                      e.preventDefault();
                                      spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: subSystem, field: f });
                                    }}
                                  />
                                  <SpreadsheetCell
                                    itemId={subSystem.id}
                                    field="d4"
                                    value={(subSystem.d4 && subSystem.d4 !== '0') ? subSystem.d4 : ''}
                                    activeCell={spreadsheet.activeCell}
                                    editingCell={spreadsheet.editingCell}
                                    editValue={spreadsheet.editValue}
                                    align="center"
                                    className="font-mono text-slate-600 text-[11px] border-r border-slate-200 font-bold"
                                    onSelectCell={spreadsheet.setActiveCell}
                                    onStartEdit={spreadsheet.startEditing}
                                    onEditChange={spreadsheet.setEditValue}
                                    onSaveEdit={spreadsheet.saveEditing}
                                    onCancelEdit={spreadsheet.cancelEditing}
                                    onContextMenu={(e, _, f) => {
                                      e.preventDefault();
                                      spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: subSystem, field: f });
                                    }}
                                  />
                                  <SpreadsheetCell
                                     itemId={subSystem.id}
                                     field="qty"
                                     value={subSystem.qty}
                                     inputType="number"
                                     activeCell={spreadsheet.activeCell}
                                     editingCell={spreadsheet.editingCell}
                                     editValue={spreadsheet.editValue}
                                     align="right"
                                     className="border-r border-slate-200 w-20 font-bold font-mono"
                                     onSelectCell={spreadsheet.setActiveCell}
                                     onStartEdit={spreadsheet.startEditing}
                                     onEditChange={spreadsheet.setEditValue}
                                     onSaveEdit={spreadsheet.saveEditing}
                                     onCancelEdit={spreadsheet.cancelEditing}
                                     onContextMenu={(e, _, f) => {
                                       e.preventDefault();
                                       spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: subSystem, field: f });
                                     }}
                                     displayFormatter={(val) => {
                                        if (val === undefined || val === null || (val as any) === '' || val === 0) return '-';
                                        const num = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
                                        if (isNaN(num) || num === 0) return '-';
                                        return num.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                      }}
                                   />

                                   <SpreadsheetCell
                                     itemId={subSystem.id}
                                     field="unit"
                                     value={subSystem.unit}
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
                                     onContextMenu={(e, _, f) => {
                                       e.preventDefault();
                                       spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: subSystem, field: f });
                                     }}
                                     displayFormatter={(val) => val || '-'}
                                   />

                                   <SpreadsheetCell
                                    itemId={subSystem.id}
                                    field="remark"
                                    value={subSystem.remark}
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
                                    onContextMenu={(e, _, f) => {
                                      e.preventDefault();
                                      spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: subSystem, field: f });
                                    }}
                                  />
                                  
                                  <td className="py-1.5 px-2 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <button
                                        onClick={() => openAddModalForLevel(category.id, 3, subSystem)}
                                        className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold rounded flex items-center gap-1 cursor-pointer"
                                        title="Tambah Detail Komponen (Bracket, Stiffener, Frame, dll) di bawah Sub-system ini"
                                      >
                                        <Plus className="w-3 h-3" />
                                        <span>Komponen</span>
                                      </button>
                                      <button onClick={() => openEditModal(subSystem)} className="p-1 text-slate-500 hover:text-emerald-600" title="Edit Sub-system">
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button onClick={() => onDeleteItem(subSystem.id)} className="p-1 text-slate-400 hover:text-red-600" title="Hapus Sub-system">
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              )}
                              {subComponents.map(item => (
                                <ComponentRow
                                  key={item.id}
                                  item={item}
                                  selectedItemIds={selectedItemIds}
                                  toggleSelectItem={toggleSelectItem}
                                  toggleItemCompleted={toggleItemCompleted}
                                  openEditModal={openEditModal}
                                  onDeleteItem={onDeleteItem}
                                  inlineEditingId={inlineEditingId}
                                  editFormData={editFormData}
                                  handleEditFormChange={handleEditFormChange}
                                  handleInlineSelectMaterial={handleInlineSelectMaterial}
                                  saveInlineEdit={saveInlineEdit}
                                  cancelInlineEdit={cancelInlineEdit}
                                  setIsMaterialCalcOpen={setIsMaterialCalcOpen}
                                  onInsertRowBelow={insertRowBelow}
                                  onContextMenu={handleContextMenu}
                                  openAuditModal={openAuditModal}
                                  spreadsheet={spreadsheet}
                                />
                              ))}
                            </React.Fragment>
                          );
                        })}

                        {/* 3. Render Standalone Flat Items (No area, no sub-system) */}
                        {tree.components.filter(c => !tree.areas.some(a => c.parentId === a.id || c.itemNo.startsWith(`${a.itemNo}.`)) && !tree.subSystems.some(s => c.parentId === s.id || c.itemNo.startsWith(`${s.itemNo}.`))).map(item => (
                          <ComponentRow
                            key={item.id}
                            item={item}
                            selectedItemIds={selectedItemIds}
                            toggleSelectItem={toggleSelectItem}
                            toggleItemCompleted={toggleItemCompleted}
                            openEditModal={openEditModal}
                            onDeleteItem={onDeleteItem}
                            inlineEditingId={inlineEditingId}
                            editFormData={editFormData}
                            handleEditFormChange={handleEditFormChange}
                            handleInlineSelectMaterial={handleInlineSelectMaterial}
                            saveInlineEdit={saveInlineEdit}
                            cancelInlineEdit={cancelInlineEdit}
                            setIsMaterialCalcOpen={setIsMaterialCalcOpen}
                            onInsertRowBelow={insertRowBelow}
                            onContextMenu={handleContextMenu}
                            openAuditModal={openAuditModal}

                            spreadsheet={spreadsheet}
                          />
                        ))}
                      </>
                    )
                  )}
                  </React.Fragment>
                );
              })
            )}
            </tbody>
          </table>
          </SortableContext>
        </DndContext>
        </div>

        {/* Bottom Summary Bar: Total Tonase Baja */}
        <div className="bg-slate-50/90 border-t border-slate-200 px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg shadow-2xs">
            <Scale className="w-4 h-4 text-amber-700 shrink-0" />
            <span className="text-slate-700 font-medium text-xs">
              {isFiltered ? 'Tonase Terfilter:' : 'Total Tonase Baja:'}
            </span>
            <span className="font-mono font-bold text-amber-900 text-sm">
              {TonnageCalculator.formatWeight(isFiltered ? filteredTonnage : grandTotalTonnage)}
            </span>
            {isFiltered && (
              <span className="text-slate-500 text-[11px] font-normal ml-1">
                (Total Proyek: {TonnageCalculator.formatWeight(grandTotalTonnage)})
              </span>
            )}
          </div>

          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-md border border-slate-200 transition-colors cursor-pointer"
          >
            &uarr; Ke Atas
          </button>
        </div>
      </div>

      {/* Add Work Item Modal with Hierarchical Structure selector */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full my-auto max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header - Fixed at Top */}
            <div className="shrink-0 px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    Tambah Item / Skema Struktur Pekerjaan
                  </h3>
                  {addedBatchCount > 0 && (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full border border-emerald-300 animate-in zoom-in-90">
                      +{addedBatchCount} Ditambahkan
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Pilih tingkat hierarki pekerjaan: Area Title (1), Sub-System Utama (1.1), atau Detail Komponen Material (1.1.1)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg p-1 text-lg font-bold transition-colors"
              >
                &times;
              </button>
            </div>

            {/* Success Toast Banner when adding items continuously */}
            {lastAddedToast && (
              <div className="shrink-0 bg-emerald-600 text-white px-5 py-2 text-xs font-bold flex items-center justify-between shadow-xs animate-in slide-in-from-top-1 duration-150">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  {lastAddedToast}
                </span>
                <button
                  type="button"
                  onClick={() => setLastAddedToast('')}
                  className="text-white/80 hover:text-white font-bold ml-2"
                >
                  &times;
                </button>
              </div>
            )}

            {/* Modal Content Form Body - Scrollable Bawah-Atas */}
            <form onSubmit={(e) => handleSaveModal(e, false)} className="flex-1 overflow-y-auto p-5 space-y-3.5">
              {/* Level Segmented Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tingkat Skema Pekerjaan:
                </label>
                <div className="bg-slate-100 p-1.5 rounded-xl flex items-center justify-between gap-1 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setItemLevel(1);
                      setParentId('');
                      if (targetCategoryForAdd) {
                        setItemNo(getNextItemSequenceNo(targetCategoryForAdd, 1, ''));
                      } else {
                        setItemNo('');
                      }
                    }}
                    className={`flex-1 py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                      itemLevel === 1 ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>1. Area / Judul</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setItemLevel(2);
                      setParentId('');
                      if (targetCategoryForAdd) {
                        setItemNo(getNextItemSequenceNo(targetCategoryForAdd, 2, ''));
                      } else {
                        setItemNo('');
                      }
                    }}
                    className={`flex-1 py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                      itemLevel === 2 ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>2. Sub-System</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setItemLevel(3);
                      setParentId('');
                      if (targetCategoryForAdd) {
                        setItemNo(getNextItemSequenceNo(targetCategoryForAdd, 3, ''));
                      } else {
                        setItemNo('');
                      }
                    }}
                    className={`flex-1 py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                      itemLevel === 3 ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Box className="w-3.5 h-3.5" />
                    <span>3. Detail Komponen</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kategori Galangan <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={targetCategoryForAdd}
                    onChange={(e) => {
                      const newCat = e.target.value;
                      setTargetCategoryForAdd(newCat);
                      setParentId('');
                      if (newCat) {
                        setItemNo(getNextItemSequenceNo(newCat, itemLevel, ''));
                      } else {
                        setItemNo('');
                      }
                    }}
                    required
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white"
                  >
                    <option value="">-- Pilih Kategori Galangan --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code}. {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    No Item (ex: {itemLevel === 1 ? '1, 2, 3' : itemLevel === 2 ? '1.1, 1.2' : '1.1.1, 1.1.2'})
                  </label>
                  <input
                    type="text"
                    value={itemNo}
                    onChange={(e) => setItemNo(e.target.value)}
                    placeholder={
                      targetCategoryForAdd
                        ? (itemLevel === 1 ? '1' : itemLevel === 2 ? '1.1' : '1.1.1')
                        : 'Pilih kategori dahulu...'
                    }
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white font-mono font-bold text-slate-900"
                  />
                </div>
              </div>

              {/* Parent Selector if Level 2 or Level 3 */}
              {itemLevel === 2 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pilih Area Induk (Level 1)
                  </label>
                  <select
                    value={parentId}
                    onChange={(e) => {
                      const newParentId = e.target.value;
                      setParentId(newParentId);
                      if (targetCategoryForAdd) {
                        setItemNo(getNextItemSequenceNo(targetCategoryForAdd, 2, newParentId));
                      }
                    }}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-emerald-300 rounded-lg focus:bg-white font-medium"
                  >
                    <option value="">-- Buat Sub-system Tanpa Area Induk --</option>
                    {workItems
                      .filter(i => i.categoryId === targetCategoryForAdd && (i.itemLevel === 1 || i.isAreaHeader || !i.itemNo.includes('.')))
                      .map(a => (
                        <option key={a.id} value={a.id}>
                          {a.itemNo}. {a.description}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {itemLevel === 3 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pilih Sub-System Induk (Level 2)
                  </label>
                  <select
                    value={parentId}
                    onChange={(e) => {
                      const newParentId = e.target.value;
                      setParentId(newParentId);
                      if (targetCategoryForAdd) {
                        setItemNo(getNextItemSequenceNo(targetCategoryForAdd, 3, newParentId));
                      }
                    }}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-amber-300 rounded-lg focus:bg-white font-medium"
                  >
                    <option value="">-- Buat Komponen Langsung --</option>
                    {workItems
                      .filter(i => i.categoryId === targetCategoryForAdd && (i.itemLevel === 2 || (i.itemNo.includes('.') && i.itemNo.split('.').length === 2)))
                      .map(s => (
                        <option key={s.id} value={s.id}>
                          {s.itemNo} - {s.description}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {itemLevel === 1
                    ? 'Nama Judul Area Pekerjaan'
                    : itemLevel === 2
                    ? 'Nama Sub-System / Pekerjaan Utama'
                    : 'Deskripsi Komponen Detail & Material'} <span className="text-red-500">*</span>
                </label>
                <input
                  ref={descInputRef}
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={
                    itemLevel === 1
                      ? 'Contoh: 1. Bottom Area'
                      : itemLevel === 2
                      ? 'Contoh: 1.1 Replating bottom fr. 0-5 lajur A (port side)'
                      : 'Contoh: 1.1.1 Bracket (PL 10mm BKI)'
                  }
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-medium"
                  required
                />
              </div>

              {/* Material dimensions, volume, weight and pricing for all levels - Exact match with user reference sheet */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">
                      Skema Input Material (Sesuai Referensi Lapangan)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full border border-emerald-300 font-mono">
                      Type &bull; D1 &bull; D2 &bull; D3 &bull; Panjang &bull; D4 &bull; Berat
                    </span>
                  </div>
                </div>

                {/* Quick Type Presets from the reference sheet */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                    Pilih Cepat Profil Material (Contoh Lembar Perhitungan):
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { code: 'PL ABS', d1: '6100', d2: '1830', d3: '12', dLen: '', d4: '1', label: 'PL ABS (Plate Class ABS)' },
                      { code: 'PL BKI', d1: '6100', d2: '1830', d3: '12', dLen: '', d4: '1', label: 'PL BKI (Plate Class BKI)' },
                      { code: 'PL NC', d1: '6100', d2: '1830', d3: '12', dLen: '', d4: '1', label: 'PL NC (Plate Non-Class)' },
                      { code: 'PP B', d1: '2', d2: 'inch', d3: 'sch.40', dLen: '6000', d4: '1', label: 'PP B (Pipe CS / Black Sch.40)' },
                      { code: 'PP G', d1: '2', d2: 'inch', d3: 'sch.80', dLen: '6000', d4: '1', label: 'PP G (Pipe Galvanis Sch.80)' },
                      { code: 'RB MM', d1: '22', d2: '', d3: '', dLen: '6000', d4: '1', label: 'RB MM (Round Bar 22mm)' },
                      { code: 'RB IN', d1: '2', d2: '', d3: '', dLen: '6000', d4: '1', label: 'RB IN (Round Bar 2")' },
                      { code: 'FB', d1: '75', d2: '', d3: '12', dLen: '6000', d4: '1', label: 'FB (Flat Bar 75x12)' },
                      { code: 'EA', d1: '100', d2: '', d3: '10', dLen: '6000', d4: '1', label: 'EA (Equal Angle L100x10)' },
                      { code: 'UA', d1: '125', d2: '75', d3: '10', dLen: '6000', d4: '1', label: 'UA (Unequal Angle L125x75x10)' },
                      { code: 'SB', d1: '22', d2: '', d3: '', dLen: '6000', d4: '1', label: 'SB (Square Bar 22x22)' },
                      { code: 'CQR', d1: '2440', d2: '1220', d3: '12', dLen: '', d4: '1', label: 'CQR (Chequered Plate 12mm)' },
                      { code: 'GR', d1: '4000', d2: '900', d3: '', dLen: '', d4: '1', label: 'GR (Grating Plate 4x0.9m)' },
                      { code: 'HB', d1: '200', d2: '', d3: '', dLen: '6000', d4: '1', label: 'HB (H-Beam 200)' },
                    ].map((preset) => {
                      const isActive = type.toUpperCase().trim() === preset.code;
                      return (
                        <button
                          key={preset.code}
                          type="button"
                          onClick={() => {
                            handleDimensionChange(preset.d1, preset.d2, preset.d3, preset.dLen, preset.d4, preset.code);
                          }}
                          className={`px-2 py-1 text-[10px] rounded-md font-mono font-bold transition-all cursor-pointer border ${
                            isActive
                              ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/50'
                          }`}
                          title={`Klik untuk mengisi format ${preset.label}`}
                        >
                          {preset.code}
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                {(() => {
                  const addModalLabels = TonnageCalculator.getDimensionLabels(type);
                  const activeCalc = TonnageCalculator.calculateItemTonnageAndPrice({
                    typeCode: type,
                    d1,
                    d2,
                    d3,
                    dLen,
                    d4,
                    qty: parseFloat(qtyStr) || 1,
                    unit,
                    unitPrice: parseFloat(priceStr) || 0,
                  });

                  return (
                    <>
                      {/* 6 Column Inputs matching reference table */}
                      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-1">
                        <div>
                          <label className="block text-[10px] text-slate-700 mb-0.5 font-bold">
                            TYPE <span className="text-emerald-700">*</span>
                          </label>
                          <MaterialTypeSelector
                            value={type}
                            onChange={(val) => {
                              handleDimensionChange(d1, d2, d3, dLen, d4, val);
                            }}
                            onSelectMaterial={handleAddModalSelectMaterial}
                            placeholder="ex: PL ABS, PP B..."
                            compact
                            inputClassName="w-full text-center font-mono text-xs px-2 py-1.5 bg-white border border-emerald-400 rounded font-bold uppercase focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-700 mb-0.5 font-bold truncate" title={addModalLabels.d1}>
                            D1 ({addModalLabels.d1})
                          </label>
                          <input
                            type="text"
                            value={d1}
                            onChange={(e) => handleDimensionChange(e.target.value, d2, d3, dLen, d4, type)}
                            placeholder={addModalLabels.placeholder1}
                            title={addModalLabels.d1}
                            className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded font-mono font-bold text-slate-800 text-center focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-700 mb-0.5 font-bold truncate" title={addModalLabels.d2}>
                            D2 ({addModalLabels.d2})
                          </label>
                          <input
                            type="text"
                            value={d2}
                            onChange={(e) => handleDimensionChange(d1, e.target.value, d3, dLen, d4, type)}
                            placeholder={addModalLabels.placeholder2}
                            title={addModalLabels.d2}
                            className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded font-mono font-bold text-slate-800 text-center focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-700 mb-0.5 font-bold truncate" title={addModalLabels.d3}>
                            D3 ({addModalLabels.d3})
                          </label>
                          <input
                            type="text"
                            value={d3}
                            onChange={(e) => handleDimensionChange(d1, d2, e.target.value, dLen, d4, type)}
                            placeholder={addModalLabels.placeholder3}
                            title={addModalLabels.d3}
                            className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded font-mono font-bold text-slate-800 text-center focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                            disabled={addModalLabels.placeholder3 === '-'}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-amber-900 mb-0.5 font-bold truncate" title={addModalLabels.dLen}>
                            PANJANG (mm)
                          </label>
                          <input
                            type="text"
                            value={dLen}
                            onChange={(e) => handleDimensionChange(d1, d2, d3, e.target.value, d4, type)}
                            placeholder={addModalLabels.placeholderLen}
                            title={addModalLabels.dLen}
                            className="w-full px-2 py-1.5 text-xs bg-amber-50 border border-amber-300 rounded font-mono font-bold text-amber-900 text-center focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-700 mb-0.5 font-bold truncate" title={addModalLabels.d4}>
                            D4 ({addModalLabels.d4})
                          </label>
                          <input
                            type="text"
                            value={d4}
                            onChange={(e) => {
                              const val = e.target.value;
                              setD4(val);
                              handleDimensionChange(d1, d2, d3, dLen, val, type);
                            }}
                            placeholder={addModalLabels.placeholder4 || 'Jml Keping / Batang'}
                            title={addModalLabels.d4}
                            className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded font-mono font-bold text-slate-800 text-center focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                          />
                        </div>
                      </div>

                      {/* Live Calculation & Formula Card matching the reference image output */}
                      <div className="mt-2.5 p-2.5 bg-linear-to-r from-emerald-50/90 to-amber-50/90 border border-emerald-300/80 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                        <div className="flex-1 min-w-[200px]">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                            <span className="text-[11px] font-extrabold text-emerald-950 font-mono">
                              {type.trim() ? `Kalkulasi Otomatis: ${type.toUpperCase()}` : 'Kalkulator Tonase & Dimensi Siap'}
                            </span>
                            {addModalLabels.name && (
                              <span className="text-[10px] text-slate-600">
                                ({addModalLabels.name})
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-600 mt-0.5">
                            {type.trim()
                              ? `Format: D1=${addModalLabels.d1} | D2=${addModalLabels.d2} | D3=${addModalLabels.d3} | Panjang=${addModalLabels.dLen} | D4=${addModalLabels.d4}`
                              : 'Ketik tipe material atau pilih salah satu preset di atas untuk menghitung berat secara fleksibel.'}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-amber-300 shadow-xs">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Hasil Berat:
                          </span>
                          <span className="font-mono font-extrabold text-amber-900 text-base">
                            {activeCalc.weightKg > 0 ? `${activeCalc.weightKg.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg` : '-'}
                          </span>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <label className="block text-[11px] font-bold text-slate-700">
                  Volume, Satuan &amp; Berat Tonase (Qty &amp; Weight)
                </label>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5 font-semibold">
                      Volume / Qty Pekerjaan {unit === 'kg' && <span className="text-[9px] text-amber-700 font-bold">(Otomatis kg dari rumus)</span>}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={qtyStr}
                      onChange={(e) => {
                        const val = e.target.value;
                        setQtyStr(val);
                        if (unit === 'kg') setWeightStr(val);
                      }}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                      placeholder="Contoh: 1.50 atau 10"
                      title="Volume / Quantity pekerjaan (bisa desimal)"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">
                      Satuan (Unit)
                    </label>
                    <input
                      type="text"
                      value={unit}
                      onChange={(e) => {
                        const newUnit = e.target.value;
                        setUnit(newUnit);
                        const unitL = newUnit.trim().toLowerCase();
                        if (!unitL || unitL === '' || unitL === '-') {
                          setQtyStr('');
                        } else if (unitL === 'kg') {
                          if (weightStr && parseFloat(weightStr) > 0) {
                            setQtyStr(weightStr);
                          } else {
                            const curCalc = TonnageCalculator.calculateItemTonnageAndPrice({
                              typeCode: type,
                              d1,
                              d2,
                              d3,
                              dLen,
                              d4,
                              qty: parseFloat(qtyStr) || 1,
                              unit: 'kg',
                              unitPrice: parseFloat(priceStr) || 0,
                            });
                            if (curCalc.weightKg > 0) {
                              setQtyStr(String(Math.round(curCalc.weightKg * 1000) / 1000));
                              setWeightStr(String(curCalc.weightKg));
                            }
                          }
                        } else {
                          // Satuan selain KG -> menyesuaikan kolom D4
                          const d4Str = String(d4 ?? '').trim();
                          if (d4Str !== '') {
                            const parsedD4 = parseFloat(d4Str);
                            if (!isNaN(parsedD4)) {
                              setQtyStr(String(parsedD4));
                            }
                          }
                        }
                      }}
                      placeholder="kg / unit / pcs"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">
                      Tonase Berat (kg)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={weightStr}
                      onChange={(e) => {
                        setWeightStr(e.target.value);
                        if (unit === 'kg') setQtyStr(e.target.value);
                      }}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-amber-300 rounded-lg font-mono font-bold text-amber-900"
                    />
                  </div>
                </div>
              </div>



              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vendor / Subkontraktor
                  </label>
                  <input
                    type="text"
                    value={subcontractor}
                    onChange={(e) => setSubcontractor(e.target.value)}
                    placeholder="Nama vendor / subcont..."
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Keterangan
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Keterangan pekerjaan..."
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Remark
                  </label>
                  <input
                    type="text"
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    placeholder="Contoh: port side, frame 0-5"
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </form>

            {/* Modal Footer - Fixed at Bottom with Multi-Input Actions */}
            <div className="shrink-0 px-5 py-3 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setDescription('');
                  setType('');
                  setD1('');
                  setD2('');
                  setD3('');
                  setD4('');
                  setQtyStr('');
                  setUnit('');
                  setWeightStr('');
                  setPriceStr('');
                  setRemark('');
                }}
                className="px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100/60 rounded-lg transition-colors"
              >
                Kosongkan Form
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-lg transition-colors"
                >
                  Batal / Tutup
                </button>
                <button
                  type="button"
                  onClick={(e) => handleSaveModal(e, true)}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                  title="Simpan item ini dan langsung input item berikutnya tanpa menutup modal"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Simpan &amp; Tambah Lagi (+)</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => handleSaveModal(e, false)}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Simpan &amp; Selesai</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Right-Click Context Menu for Inserting Empty Row and Row Actions */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white rounded-xl shadow-2xl border border-slate-200/90 py-1.5 w-64 text-xs font-sans select-none animate-in fade-in zoom-in-95 duration-100"
          style={{
            top: Math.min(contextMenu.y, window.innerHeight - 200),
            left: Math.min(contextMenu.x, window.innerWidth - 275),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-semibold text-slate-500 flex items-center justify-between bg-slate-50 rounded-t-lg">
            <span>Baris No: <strong className="text-slate-800 font-mono">{contextMenu.item.itemNo}</strong></span>
            <span className="text-[10px] bg-slate-200/80 px-1.5 py-0.5 rounded text-slate-600 font-medium">
              {contextMenu.item.itemLevel === 1 || contextMenu.item.isAreaHeader ? 'Area' : contextMenu.item.itemLevel === 2 ? 'Sub-system' : 'Komponen'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              const target = contextMenu.item;
              setContextMenu(null);
              insertRowBelow(target);
            }}
            className="w-full text-left px-3 py-2 hover:bg-emerald-50 hover:text-emerald-900 flex items-center gap-2.5 text-slate-700 font-semibold transition-colors cursor-pointer"
          >
            <ArrowDownToLine className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="flex-1">
              <div>Sisipkan Baris Kosong di Bawah</div>
              <div className="text-[10px] text-emerald-700 font-normal">Nomor otomatis berurutan (Shift+Enter)</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              const target = contextMenu.item;
              setContextMenu(null);
              openEditModal(target);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 transition-colors cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>Edit Baris Ini (Double-Click)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const target = contextMenu.item;
              setContextMenu(null);
              openAuditModal(target.id);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-blue-50 text-blue-700 flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>Lihat Riwayat Perubahan (Audit Log)</span>
          </button>

          <div className="my-1 border-t border-slate-100" />
          <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Ubah Level Struktur:
          </div>
          <button
            type="button"
            onClick={() => {
              const target = contextMenu.item;
              setContextMenu(null);
              onUpdateItem({
                ...target,
                itemLevel: 1,
                isAreaHeader: true,
                parentId: undefined,
              });
            }}
            className={`w-full text-left px-3 py-1.5 hover:bg-amber-50 flex items-center justify-between text-slate-700 transition-colors cursor-pointer ${
              (contextMenu.item.itemLevel === 1 || contextMenu.item.isAreaHeader) ? 'font-bold bg-amber-50 text-amber-900' : ''
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
              Level 1 (Area Header)
            </span>
            <span className="font-mono text-[10px] text-amber-700">ex: 1</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const target = contextMenu.item;
              setContextMenu(null);
              const matchingArea = workItems.find((i) => i.id !== target.id && i.categoryId === target.categoryId && (i.itemLevel === 1 || i.isAreaHeader));
              onUpdateItem({
                ...target,
                itemLevel: 2,
                isAreaHeader: false,
                parentId: matchingArea?.id || target.parentId,
              });
            }}
            className={`w-full text-left px-3 py-1.5 hover:bg-sky-50 flex items-center justify-between text-slate-700 transition-colors cursor-pointer ${
              (contextMenu.item.itemLevel === 2) ? 'font-bold bg-sky-50 text-sky-900' : ''
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0"></span>
              Level 2 (Sub-System)
            </span>
            <span className="font-mono text-[10px] text-sky-700">ex: 1.1</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const target = contextMenu.item;
              setContextMenu(null);
              onUpdateItem({
                ...target,
                itemLevel: 3,
                isAreaHeader: false,
              });
            }}
            className={`w-full text-left px-3 py-1.5 hover:bg-emerald-50 flex items-center justify-between text-slate-700 transition-colors cursor-pointer ${
              (contextMenu.item.itemLevel === 3 && !contextMenu.item.isAreaHeader) ? 'font-bold bg-emerald-50 text-emerald-950' : ''
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
              Level 3 (Komponen)
            </span>
            <span className="font-mono text-[10px] text-emerald-700">ex: 1.1.1</span>
          </button>

          <div className="my-1 border-t border-slate-100" />

          <button
            type="button"
            onClick={() => {
              const target = contextMenu.item;
              setContextMenu(null);
              onDeleteItem(target.id);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-600 flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-500 shrink-0" />
            <span>Hapus Baris Ini</span>
          </button>
        </div>
      )}

      {/* Audit Log Modal */}
      <AuditLogModal
        isOpen={isAuditModalOpen}
        onClose={() => {
          setIsAuditModalOpen(false);
          setAuditTargetWorkItemId(undefined);
        }}
        targetWorkItemId={auditTargetWorkItemId}
        workItems={workItems}
      />



      {/* Right-click Context Menu */}
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
          onDeleteRow={(id) => onDeleteItem(id)}
          onEditRow={(target) => openEditModal(target)}
        />
      )}
      {/* Toast Notification for Qty / D4 Auto-clear Switch */}
      {(switchToast || spreadsheet.toastMessage) && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200 pointer-events-auto">
          <div className="flex items-center gap-3 px-4 py-3 bg-slate-900/95 text-white text-xs font-medium rounded-xl shadow-2xl border border-slate-700/80 backdrop-blur-md max-w-md">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex-1 leading-snug">
              <span className="font-semibold text-amber-300 mr-1">Info Otomatis:</span>
              <span>{switchToast?.message || spreadsheet.toastMessage}</span>
            </div>
            <button
              onClick={() => setSwitchToast(null)}
              className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
              title="Tutup Notifikasi"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Global Keyboard Shortcuts Cheat Sheet Modal */}
      <ShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      {/* Repair List Excel & Ship Specs Import Modal */}
      <RepairListExcelImportModal
        isOpen={isExcelImportModalOpen}
        onClose={() => setIsExcelImportModalOpen(false)}
        categories={categories}
        workItems={workItems}
        vessel={vessel}
        schedule={schedule}
        onImportWorkItems={(newItems, mode, extra) => {
          if (onImportWorkItems) {
            onImportWorkItems(newItems, mode, extra);
          } else {
            sqliteService.importWorkItems(newItems, mode);
            if (extra?.vesselSpec) sqliteService.updateVessel(extra.vesselSpec);
            if (extra?.projectSchedule) sqliteService.updateProjectSchedule(extra.projectSchedule);
          }
        }}
        onNotify={onNotify || spreadsheet.showToast}
      />
    </div>
  );
};

// Sub-component for rendering Level 3 Component rows
interface ComponentRowProps {
  item: WorkItem;
  draggedItemId?: string | null;
  dragOverItemId?: string | null;
  dropPosition?: 'above' | 'below' | null;
  onDragStart?: (e: React.DragEvent, item: WorkItem) => void;
  onDragOver?: (e: React.DragEvent, item: WorkItem) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, item: WorkItem) => void;
  onDragEnd?: () => void;
  selectedItemIds: Set<string>;
  toggleSelectItem: (id: string) => void;
  toggleItemCompleted: (item: WorkItem) => void;
  openEditModal: (item: WorkItem) => void;
  onDeleteItem: (id: string) => void;
  inlineEditingId: string | null;
  editFormData: WorkItem | null;
  handleEditFormChange: (field: keyof WorkItem, value: any) => void;
  handleInlineSelectMaterial: (m: MaterialTypeDefinition) => void;
  saveInlineEdit: () => void;
  cancelInlineEdit: () => void;
  setIsMaterialCalcOpen: (open: boolean) => void;
  onInsertRowBelow?: (targetItem: WorkItem) => void;
  onContextMenu?: (e: React.MouseEvent, item: WorkItem) => void;
  openAuditModal?: (workItemId?: string) => void;
  spreadsheet?: ReturnType<typeof useSpreadsheetTable>;
}

const ComponentRow: React.FC<ComponentRowProps> = ({
  item,
  selectedItemIds,
  toggleSelectItem,
  toggleItemCompleted,
  openEditModal,
  onDeleteItem,
  inlineEditingId,
  editFormData,
  handleEditFormChange,
  handleInlineSelectMaterial,
  saveInlineEdit,
  cancelInlineEdit,
  setIsMaterialCalcOpen,
  onInsertRowBelow,
  onContextMenu,
  openAuditModal,
  spreadsheet,
  draggedItemId,
  dragOverItemId,
  dropPosition,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const sortableStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  const isEditing = inlineEditingId === item.id && editFormData;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.currentTarget.tagName === 'TEXTAREA' && e.shiftKey && !e.ctrlKey) {
        return;
      }
      if ((e.shiftKey || e.ctrlKey || e.altKey) && onInsertRowBelow && editFormData) {
        e.preventDefault();
        saveInlineEdit();
        onInsertRowBelow(editFormData);
        return;
      }
      e.preventDefault();
      saveInlineEdit();
    }
  };

  if (isEditing) {
    return (
      <tr className="bg-amber-50/90 hover:bg-amber-50/90 border-y border-amber-300 border-l-4 border-l-amber-500 shadow-xs transition-colors">
        <td className="py-1.5 px-3 text-center"></td>
        <td className="py-1.5 px-1 align-top text-center min-w-[75px] max-w-[110px]">
          <input
            type="text"
            value={editFormData.itemNo}
            onChange={(e) => handleEditFormChange('itemNo', e.target.value)}
            onKeyDown={handleKeyDown}
            title="Nomor Urut (Bisa diedit: 1 = Area, 1.1 = Sub-system, 1.1.1 = Komponen)"
            className="w-full text-center text-xs px-1.5 py-1.5 bg-white border border-emerald-400 rounded focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-bold font-mono shadow-2xs"
          />
        </td>
        <td className="py-1.5 px-1 align-top min-w-[280px]">
          <textarea
            rows={2}
            value={editFormData.description}
            onChange={(e) => handleEditFormChange('description', e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            onKeyDown={handleKeyDown}
            className="w-full text-xs px-2 py-1.5 bg-white border border-emerald-300 rounded focus:outline-hidden resize-none leading-relaxed"
          />
        </td>
        <td className="py-1.5 px-1 align-top min-w-[140px]">
          <input type="text" value={editFormData.notes || ''} onChange={(e) => handleEditFormChange('notes', e.target.value)} onFocus={(e) => e.target.select()} onKeyDown={handleKeyDown} className="w-full text-xs px-2 py-1.5 bg-white border border-emerald-300 rounded" placeholder="Keterangan" />
        </td>
        <td className="py-1.5 px-1 align-top w-32 relative">
          <MaterialTypeSelector
            value={editFormData.type || ''}
            onChange={(val) => handleEditFormChange('type', val)}
            onSelectMaterial={handleInlineSelectMaterial}
            placeholder="Tipe..."
            compact
            inputClassName="w-full text-center text-xs px-1 py-1 bg-white border border-emerald-300 rounded focus:outline-hidden font-bold font-mono uppercase"
          />
        </td>
        <td className="py-1.5 px-1 align-top w-12">
          <input type="text" value={editFormData.d1 || ''} onChange={(e) => handleEditFormChange('d1', e.target.value)} onFocus={(e) => e.target.select()} onKeyDown={handleKeyDown} placeholder={TonnageCalculator.getDimensionLabels(editFormData.type || '').placeholder1} title={TonnageCalculator.getDimensionLabels(editFormData.type || '').d1} className="w-full text-center font-mono text-xs px-1 py-1.5 bg-white border border-emerald-300 rounded font-bold" />
        </td>
        <td className="py-1.5 px-1 align-top w-12">
          <input type="text" value={editFormData.d2 || ''} onChange={(e) => handleEditFormChange('d2', e.target.value)} onFocus={(e) => e.target.select()} onKeyDown={handleKeyDown} placeholder={TonnageCalculator.getDimensionLabels(editFormData.type || '').placeholder2} title={TonnageCalculator.getDimensionLabels(editFormData.type || '').d2} className="w-full text-center font-mono text-xs px-1 py-1.5 bg-white border border-emerald-300 rounded font-bold" />
        </td>
        <td className="py-1.5 px-1 align-top w-12">
          <input type="text" value={editFormData.d3 || ''} onChange={(e) => handleEditFormChange('d3', e.target.value)} onFocus={(e) => e.target.select()} onKeyDown={handleKeyDown} placeholder={TonnageCalculator.getDimensionLabels(editFormData.type || '').placeholder3} title={TonnageCalculator.getDimensionLabels(editFormData.type || '').d3} className="w-full text-center font-mono text-xs px-1 py-1.5 bg-white border border-emerald-300 rounded font-bold" disabled={TonnageCalculator.getDimensionLabels(editFormData.type || '').placeholder3 === '-'} />
        </td>
        <td className="py-1.5 px-1 align-top w-14">
          <input type="text" value={editFormData.dLen || ''} onChange={(e) => handleEditFormChange('dLen', e.target.value)} onFocus={(e) => e.target.select()} onKeyDown={handleKeyDown} placeholder={TonnageCalculator.getDimensionLabels(editFormData.type || '').placeholderLen} title={TonnageCalculator.getDimensionLabels(editFormData.type || '').dLen} className="w-full text-center font-mono text-xs px-1 py-1.5 bg-amber-50 border border-amber-300 rounded focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-bold text-amber-900" />
        </td>
        <td className="py-1.5 px-1 align-top w-14">
          <input type="text" value={editFormData.d4 || ''} onChange={(e) => handleEditFormChange('d4', e.target.value)} onFocus={(e) => e.target.select()} onKeyDown={handleKeyDown} placeholder={TonnageCalculator.getDimensionLabels(editFormData.type || '').placeholder4} title={TonnageCalculator.getDimensionLabels(editFormData.type || '').d4} className="w-full text-center font-mono text-xs px-1 py-1.5 bg-white border border-emerald-300 rounded font-bold" />
        </td>
        <td className="py-1.5 px-1 align-top w-20">
          <input
            type="number"
            step="any"
            value={editFormData.qty || ''}
            onChange={(e) => handleEditFormChange('qty', parseFloat(e.target.value) || 0)}
            onFocus={(e) => e.target.select()}
            onKeyDown={handleKeyDown}
            placeholder="Qty"
            className="w-full text-right font-mono font-bold text-xs px-1.5 py-1.5 bg-white border border-slate-300 rounded focus:border-emerald-500"
          />
        </td>
        <td className="py-1.5 px-1 align-top w-20">
          <input
            type="text"
            value={editFormData.unit || ''}
            onChange={(e) => handleEditFormChange('unit', e.target.value)}
            onFocus={(e) => e.target.select()}
            onKeyDown={handleKeyDown}
            placeholder="Satuan"
            className="w-full text-center font-mono font-bold text-xs px-1.5 py-1.5 bg-white border border-slate-300 rounded focus:border-emerald-500"
          />
        </td>
        <td className="py-1.5 px-1 align-top min-w-[130px] w-36">
          <input
            type="text"
            value={editFormData.remark || ''}
            onChange={(e) => handleEditFormChange('remark', e.target.value)}
            onFocus={(e) => e.target.select()}
            onKeyDown={handleKeyDown}
            className="w-full text-xs px-2 py-1.5 bg-white border border-emerald-300 rounded font-normal"
            placeholder="Remark"
          />
        </td>

        <td className="py-1.5 px-1 align-top text-center w-28 pt-2.5">
          <div className="flex items-center justify-center gap-1.5">
            <button onClick={saveInlineEdit} className="p-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded shadow-xs" title="Simpan">
              <Save className="w-3.5 h-3.5" />
            </button>
            <button onClick={cancelInlineEdit} className="p-1.5 bg-slate-300 text-slate-700 hover:bg-slate-400 rounded shadow-xs" title="Batal">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  // Fallback to basic row if spreadsheet engine not provided
  if (!spreadsheet) {
    return (
      <tr
        onDoubleClick={() => openEditModal(item)}
        onContextMenu={(e) => onContextMenu && onContextMenu(e, item)}
        className={`border-b border-slate-200 transition-colors cursor-pointer ${
          selectedItemIds.has(item.id)
            ? 'bg-sky-50/90 border-l-4 border-l-sky-500 hover:bg-sky-100/80 text-slate-900 font-medium shadow-2xs'
            : item.isCompleted
            ? 'bg-emerald-50/30 hover:bg-slate-50'
            : 'hover:bg-slate-50'
        }`}
      >
        <td className="py-1.5 px-3 text-center border-r border-slate-200">
          <input
            type="checkbox"
            checked={selectedItemIds.has(item.id)}
            onChange={() => toggleSelectItem(item.id)}
            className="rounded border-slate-300 text-emerald-600 h-3.5 w-3.5 cursor-pointer"
          />
        </td>
        <td className="py-1.5 px-2 text-center text-slate-500 font-mono text-[11px] pl-6 border-r border-slate-200">
          {item.itemNo}
        </td>
        <td className="py-1.5 px-3 pl-10 border-r border-slate-200">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-800">{item.description}</span>
          </div>
        </td>
        <td className="py-1.5 px-3 text-slate-500 text-[11px] min-w-[140px] border-r border-slate-200">{item.notes || ''}</td>
        <td className="py-1.5 px-2 text-center font-mono text-slate-600 text-[11px] border-r border-slate-200">{item.type || ''}</td>
        <td className="py-1.5 px-2 text-center font-mono text-slate-600 text-[11px] border-r border-slate-200">{item.d1 || ''}</td>
        <td className="py-1.5 px-2 text-center font-mono text-slate-600 text-[11px] border-r border-slate-200">{item.d2 || ''}</td>
        <td className="py-1.5 px-2 text-center font-mono text-slate-600 text-[11px] border-r border-slate-200">{item.d3 || ''}</td>
        <td className="py-1.5 px-2 text-center font-mono text-amber-900 font-bold bg-amber-50/50 text-[11px] border-x-2 border-amber-300/70">{item.dLen || ''}</td>
        <td className="py-1.5 px-2 text-center font-mono text-slate-600 text-[11px] border-r border-slate-200">{item.d4 || ''}</td>
        <td className="py-1.5 px-2 text-right border-r border-slate-200 font-mono font-bold">{item.qty || '-'}</td>
        <td className="py-1.5 px-2 text-center border-r border-slate-200 font-mono text-slate-600">{item.unit || '-'}</td>
        <td className="py-1.5 px-3 text-slate-600 text-[11px] border-r border-slate-200">{item.remark || ''}</td>
        <td className="py-1.5 px-2 text-center">Aksi</td>
      </tr>
    );
  }

  // Interactive Spreadsheet-enabled Row
  const {
    activeCell,
    editingCell,
    editValue,
    onSelectCell = spreadsheet.setActiveCell,
    onStartEdit = spreadsheet.startEditing,
    onEditChange = spreadsheet.setEditValue,
    onSaveEdit = spreadsheet.saveEditing,
    onCancelEdit = spreadsheet.cancelEditing,
    onContextMenu: handleCellContextMenu = (e: React.MouseEvent, iId: string, f: string) => {
      e.preventDefault();
      spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item, field: f });
    },
  } = {
    activeCell: spreadsheet.activeCell,
    editingCell: spreadsheet.editingCell,
    editValue: spreadsheet.editValue,
  };

  return (
    <tr
      ref={setNodeRef}
      style={sortableStyle}
      draggable={true}
      onDragStart={(e) => onDragStart && onDragStart(e, item)}
      onDragOver={(e) => onDragOver && onDragOver(e, item)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop && onDrop(e, item)}
      onDragEnd={onDragEnd}
      className={`border-b border-slate-200 transition-all ${isDragging ? 'bg-amber-50 border-2 border-dashed border-amber-400 shadow-lg scale-[1.01] z-50' : ''} ${
        draggedItemId === item.id
          ? 'opacity-40 bg-amber-100/90'
          : dragOverItemId === item.id
          ? dropPosition === 'above'
            ? 'border-t-4 border-t-emerald-600 bg-emerald-50'
            : 'border-b-4 border-b-emerald-600 bg-emerald-50'
          : selectedItemIds.has(item.id)
          ? 'bg-sky-50/90 border-l-4 border-l-sky-500 text-slate-900 font-medium shadow-2xs'
          : item.isCompleted
          ? 'bg-emerald-50/30 hover:bg-slate-50'
          : 'hover:bg-slate-50'
      }`}
    >
      <td className="py-1.5 px-2 text-center border-r border-slate-200">
        <div className="flex items-center justify-center gap-1">
          <span
            {...attributes}
            {...listeners}
            draggable={true}
            onDragStart={(e) => onDragStart && onDragStart(e, item)}
            title="Tahan & seret untuk mengubah urutan pekerjaan"
            className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-[#03442C] p-0.5 shrink-0 transition-colors"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </span>
          <input
            type="checkbox"
            checked={selectedItemIds.has(item.id)}
            onChange={() => toggleSelectItem(item.id)}
            className="rounded border-slate-300 text-emerald-600 h-3.5 w-3.5 cursor-pointer"
          />
        </div>
      </td>

      <SpreadsheetCell
        itemId={item.id}
        field="itemNo"
        value={item.itemNo}
        activeCell={activeCell}
        editingCell={editingCell}
        editValue={editValue}
        align="center"
        className="font-mono text-[11px] pl-6 border-r border-slate-200 text-slate-600"
        onSelectCell={onSelectCell}
        onStartEdit={onStartEdit}
        onEditChange={onEditChange}
        onSaveEdit={onSaveEdit}
        onCancelEdit={onCancelEdit}
        onContextMenu={handleCellContextMenu}
      />

      <SpreadsheetCell
        itemId={item.id}
        field="description"
        value={item.description}
        inputType="textarea"
        activeCell={activeCell}
        editingCell={editingCell}
        editValue={editValue}
        align="left"
        className="pl-6 border-r border-slate-200 min-w-[260px]"
        onSelectCell={onSelectCell}
        onStartEdit={onStartEdit}
        onEditChange={onEditChange}
        onSaveEdit={onSaveEdit}
        onCancelEdit={onCancelEdit}
        onContextMenu={handleCellContextMenu}
        displayFormatter={(val) => (
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-800">{val}</span>
            {item.updatedBy && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openAuditModal && openAuditModal(item.id);
                }}
                className="ml-1 px-1.5 py-0.5 rounded bg-slate-100 text-[9px] text-slate-500 font-mono inline-flex items-center gap-1 shrink-0"
                title={`Terakhir diubah oleh ${item.updatedBy}`}
              >
                <History className="w-2.5 h-2.5 text-slate-400" />
                <span>{item.updatedBy.split(' ')[0]}</span>
              </button>
            )}
          </div>
        )}
      />

      <SpreadsheetCell
        itemId={item.id}
        field="notes"
        value={item.notes}
        activeCell={activeCell}
        editingCell={editingCell}
        editValue={editValue}
        align="left"
        className="text-slate-500 text-[11px] min-w-[140px] border-r border-slate-200"
        onSelectCell={onSelectCell}
        onStartEdit={onStartEdit}
        onEditChange={onEditChange}
        onSaveEdit={onSaveEdit}
        onCancelEdit={onCancelEdit}
        onContextMenu={handleCellContextMenu}
      />

      <SpreadsheetCell
        itemId={item.id}
        field="type"
        value={(item.type && item.type !== '0') ? item.type : ''}
        activeCell={activeCell}
        editingCell={editingCell}
        editValue={editValue}
        align="center"
        className="font-mono text-slate-600 text-[11px] border-r border-slate-200 uppercase"
        onSelectCell={onSelectCell}
        onStartEdit={onStartEdit}
        onEditChange={onEditChange}
        onSaveEdit={onSaveEdit}
        onCancelEdit={onCancelEdit}
        onContextMenu={handleCellContextMenu}
      />

      <SpreadsheetCell
        itemId={item.id}
        field="d1"
        value={(item.d1 && item.d1 !== '0') ? item.d1 : ''}
        activeCell={activeCell}
        editingCell={editingCell}
        editValue={editValue}
        align="center"
        className="font-mono text-slate-600 text-[11px] border-r border-slate-200"
        onSelectCell={onSelectCell}
        onStartEdit={onStartEdit}
        onEditChange={onEditChange}
        onSaveEdit={onSaveEdit}
        onCancelEdit={onCancelEdit}
        onContextMenu={handleCellContextMenu}
      />

      <SpreadsheetCell
        itemId={item.id}
        field="d2"
        value={(item.d2 && item.d2 !== '0') ? item.d2 : ''}
        activeCell={activeCell}
        editingCell={editingCell}
        editValue={editValue}
        align="center"
        className="font-mono text-slate-600 text-[11px] border-r border-slate-200"
        onSelectCell={onSelectCell}
        onStartEdit={onStartEdit}
        onEditChange={onEditChange}
        onSaveEdit={onSaveEdit}
        onCancelEdit={onCancelEdit}
        onContextMenu={handleCellContextMenu}
      />

      <SpreadsheetCell
        itemId={item.id}
        field="d3"
        value={(item.d3 && item.d3 !== '0') ? item.d3 : ''}
        activeCell={activeCell}
        editingCell={editingCell}
        editValue={editValue}
        align="center"
        className="font-mono text-slate-600 text-[11px] border-r border-slate-200"
        onSelectCell={onSelectCell}
        onStartEdit={onStartEdit}
        onEditChange={onEditChange}
        onSaveEdit={onSaveEdit}
        onCancelEdit={onCancelEdit}
        onContextMenu={handleCellContextMenu}
      />

      <SpreadsheetCell
        itemId={item.id}
        field="dLen"
        value={(item.dLen && item.dLen !== '0') ? item.dLen : ''}
        activeCell={activeCell}
        editingCell={editingCell}
        editValue={editValue}
        align="center"
        className="font-mono text-amber-900 font-bold bg-amber-50/50 text-[11px] border-x-2 border-amber-300/70"
        onSelectCell={onSelectCell}
        onStartEdit={onStartEdit}
        onEditChange={onEditChange}
        onSaveEdit={onSaveEdit}
        onCancelEdit={onCancelEdit}
        onContextMenu={handleCellContextMenu}
      />

      <SpreadsheetCell
        itemId={item.id}
        field="d4"
        value={(item.d4 && item.d4 !== '0') ? item.d4 : ''}
        
        
        activeCell={activeCell}
        editingCell={editingCell}
        editValue={editValue}
        align="center"
        className="font-mono text-slate-600 text-[11px] border-r border-slate-200"
        onSelectCell={onSelectCell}
        onStartEdit={onStartEdit}
        onEditChange={onEditChange}
        onSaveEdit={onSaveEdit}
        onCancelEdit={onCancelEdit}
        onContextMenu={handleCellContextMenu}
      />

      <SpreadsheetCell
        itemId={item.id}
        field="qty"
        value={item.qty}
        
        
        inputType="number"
        activeCell={activeCell}
        editingCell={editingCell}
        editValue={editValue}
        align="right"
        className="border-r border-slate-200 w-20 font-mono font-bold"
        onSelectCell={onSelectCell}
        onStartEdit={onStartEdit}
        onEditChange={onEditChange}
        onSaveEdit={onSaveEdit}
        onCancelEdit={onCancelEdit}
        onContextMenu={handleCellContextMenu}
        displayFormatter={(val) => {
          const unitStr = String(item.unit || '').trim();
          if (!unitStr || unitStr === '' || unitStr === '-') {
            return '';
          }
          const isKg = unitStr.toLowerCase() === 'kg';
          if (isKg) {
            const w = item.weightKg && item.weightKg > 0 ? item.weightKg : (typeof val === 'number' ? val : (parseFloat(String(val)) || 0));
            return w > 0 ? <span className="font-mono font-bold text-amber-800 text-xs">{w.toFixed(2)}</span> : '';
          }
          if (item.d4 !== undefined && item.d4 !== null && String(item.d4).trim() !== '' && String(item.d4).trim() !== '0') {
            return <span className="font-mono font-bold text-slate-800 text-xs">{item.d4}</span>;
          }
          const num = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
          return (!isNaN(num) && num > 0) ? <span className="font-mono font-bold text-slate-800 text-xs">{num.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> : '';
        }}
      />

      <SpreadsheetCell
        itemId={item.id}
        field="unit"
        value={item.unit}
        activeCell={activeCell}
        editingCell={editingCell}
        editValue={editValue}
        align="center"
        className="border-r border-slate-200 w-20 font-mono text-xs font-bold text-slate-600 bg-slate-50/40"
        onSelectCell={onSelectCell}
        onStartEdit={onStartEdit}
        onEditChange={onEditChange}
        onSaveEdit={onSaveEdit}
        onCancelEdit={onCancelEdit}
        onContextMenu={handleCellContextMenu}
        displayFormatter={(val) => val || '-'}
      />

      <SpreadsheetCell
        itemId={item.id}
        field="remark"
        value={item.remark}
        activeCell={activeCell}
        editingCell={editingCell}
        editValue={editValue}
        align="left"
        className="text-slate-600 text-[11px] min-w-[130px] border-r border-slate-200"
        onSelectCell={onSelectCell}
        onStartEdit={onStartEdit}
        onEditChange={onEditChange}
        onSaveEdit={onSaveEdit}
        onCancelEdit={onCancelEdit}
        onContextMenu={handleCellContextMenu}
      />

      <td className="py-1.5 px-2 text-center">
        <div className="flex items-center justify-center gap-1.5 min-w-[160px]">
          {onInsertRowBelow && (
            <button
              onClick={() => onInsertRowBelow(item)}
              className="px-2 py-1 bg-amber-600/90 hover:bg-amber-700 text-white text-[10px] font-bold rounded-md shadow-2xs inline-flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
              title="Sisip baris baru di bawah item ini"
            >
              <Plus className="w-3 h-3 text-amber-200" />
              <span>+ Sisip</span>
            </button>
          )}

          <button
            onClick={() => openAuditModal && openAuditModal(item.id)}
            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer shrink-0"
            title="Lihat Riwayat Perubahan (Audit Trail)"
          >
            <History className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => openEditModal(item)} className="p-1 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors cursor-pointer shrink-0" title="Edit Item">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDeleteItem(item.id)} className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer shrink-0" title="Hapus Item">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
};
