import React, { useState, useEffect, useCallback, useRef } from 'react';
import { WorkCategory, WorkItem } from '../types';
import { TonnageCalculator } from '../utils/tonnageCalculator';

export interface ActiveCell {
  itemId: string;
  field: string;
}

export const REPAIR_COLUMNS = [
  'itemNo',
  'description',
  'notes',
  'type',
  'd1',
  'd2',
  'd3',
  'dLen',
  'd4',
  'qty',
  'unit',
  'remark',
];

export const OPNAME_COLUMNS = [
  'itemNo',
  'description',
  'notes',
  'type',
  'd1',
  'd2',
  'd3',
  'dLen',
  'd4',
  'qty',
  'unit',
  'remark',
  'opnameQty',
  'opnamePercent',
  'subcontractor',
  'opnameStatus',
];

export const COLUMN_LABELS: Record<string, string> = {
  itemNo: 'No. Item',
  description: 'Uraian Pekerjaan',
  notes: 'Spesifikasi / Keterangan',
  type: 'Tipe Material',
  d1: 'Dimensi D1 (Tebal/Dia)',
  d2: 'Dimensi D2 (Panjang)',
  d3: 'Dimensi D3',
  dLen: 'Panjang Lajur (m)',
  d4: 'Jumlah D4',
  qty: 'Volume / Qty',
  unit: 'Satuan',
  weightKg: 'Berat Tonase (kg)',
  opnameQty: 'Qty Opname',
  opnamePercent: '% Opname',
  subcontractor: 'Vendor / Subcont',
  opnameStatus: 'Status Opname',
  remark: 'Remark / Catatan',
};

/**
 * Applies multiple column field values (No. s/d REMARK) to a WorkItem in a single unified calculation pass.
 * Recalculates Tonnage Weight (kg), Volumes, Prices, and Structure Levels automatically.
 */
export function applyValuesToWorkItem(
  item: WorkItem,
  fieldValues: Record<string, any>
): WorkItem {
  let updated: WorkItem = {
    ...item,
    ...fieldValues,
    updatedAt: new Date().toISOString(),
  };

  // Format string fields safely
  ['notes', 'remark', 'type', 'unit', 'd1', 'd2', 'd3', 'dLen', 'd4'].forEach((f) => {
    if (f in fieldValues) {
      const val = fieldValues[f];
      (updated as any)[f] = val !== undefined && val !== null ? String(val).trim() : '';
    }
  });

  if ('itemNo' in fieldValues) {
    const rawNo = fieldValues.itemNo;
    updated.itemNo = rawNo !== undefined && rawNo !== null ? String(rawNo).trim() : updated.itemNo;
  }

  if ('description' in fieldValues) {
    const rawDesc = fieldValues.description;
    updated.description = rawDesc !== undefined && rawDesc !== null ? String(rawDesc).trim() : updated.description;
  }

  if ('qty' in fieldValues) {
    const rawQty = fieldValues.qty;
    if (rawQty === '' || rawQty === null || rawQty === undefined) {
      updated.qty = '' as any;
    } else {
      const strVal = typeof rawQty === 'string' ? rawQty.replace(',', '.').trim() : rawQty;
      const num = parseFloat(strVal);
      updated.qty = isNaN(num) ? ('' as any) : Math.round(num * 100) / 100;
    }
  }

  // Auto infer itemLevel & isAreaHeader from itemNo
  if (updated.itemNo) {
    const parts = updated.itemNo.split('.').filter(Boolean);
    if (parts.length === 1 && (!updated.type || updated.type === '')) {
      updated.itemLevel = 1;
      updated.isAreaHeader = true;
    } else if (parts.length === 2) {
      updated.itemLevel = 2;
      updated.isAreaHeader = false;
    } else if (parts.length >= 3) {
      updated.itemLevel = 3;
      updated.isAreaHeader = false;
    }
  }

  // Calculate Tonnage & Price
  const unitLower = String(updated.unit || '').trim().toLowerCase();
  const isKgUnit = unitLower === 'kg';
  const rawD4 = parseFloat(String(updated.d4 || '0')) || 0;
  const rawQtyNum = typeof updated.qty === 'number' ? updated.qty : (parseFloat(String(updated.qty || '0')) || 0);

  const calcRes = TonnageCalculator.calculateItemTonnageAndPrice({
    typeCode: updated.type,
    d1: updated.d1,
    d2: updated.d2,
    d3: updated.d3,
    dLen: updated.dLen,
    d4: updated.d4,
    qty: rawQtyNum > 0 ? rawQtyNum : (rawD4 > 0 ? rawD4 : 1),
    unit: updated.unit,
    unitPrice: updated.unitPrice,
    priceBasis: updated.priceBasis,
  });

  if (calcRes.weightKg > 0) {
    updated.weightKg = calcRes.weightKg;
  }

  if (isKgUnit && calcRes.weightKg > 0) {
    updated.qty = Math.round(calcRes.weightKg * 100) / 100;
  } else if (rawD4 > 0 && (!updated.qty || (updated.qty as any) === '' || updated.qty === 0)) {
    const isPcs = ['pcs', 'unit', 'set', 'titik', 'btg', 'lot', 'buah', 'ls', 'lbr'].includes(unitLower);
    if (isPcs) updated.qty = rawD4;
  }

  const uPrice = typeof updated.unitPrice === 'number' ? updated.unitPrice : (parseFloat(String(updated.unitPrice || '0')) || 0);
  const effectiveQty = typeof updated.qty === 'number' && updated.qty > 0 ? updated.qty : (rawD4 > 0 ? rawD4 : 0);

  if (isKgUnit && updated.weightKg && updated.weightKg > 0) {
    updated.totalPrice = Math.round(updated.weightKg * uPrice);
  } else if (effectiveQty > 0 && uPrice > 0) {
    updated.totalPrice = Math.round(effectiveQty * uPrice);
  } else if (calcRes.totalPrice > 0) {
    updated.totalPrice = calcRes.totalPrice;
  }

  return updated;
}

interface ContextMenuState {
  x: number;
  y: number;
  item: WorkItem;
  field?: string;
}

interface UseSpreadsheetTableProps {
  items: WorkItem[];
  columns: string[];
  onUpdateItem: (item: WorkItem) => void;
  onAddItem?: (item: Omit<WorkItem, 'id'>) => void;
  onDeleteItem?: (id: string) => void;
  onFieldSwitchToast?: (message: string, type: 'qty' | 'd4') => void;
  onBatchUpdateItems?: (items: WorkItem[]) => void;
  categories?: WorkCategory[];
}

export function useSpreadsheetTable({
  items,
  columns,
  onUpdateItem,
  onAddItem,
  onDeleteItem,
  onFieldSwitchToast,
  onBatchUpdateItems,
  categories,
}: UseSpreadsheetTableProps) {
  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);
  const [editingCell, setEditingCell] = useState<ActiveCell | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const internalClipboardRef = useRef<string>('');

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2000);
  }, []);

  // Helper to get raw cell value
  const getCellValue = useCallback((item: WorkItem, field: string): any => {
    const val = (item as any)[field];
    if (val === undefined || val === null) return '';
    return val;
  }, []);

  // Helper to update a cell on an item
  const updateCellValue = useCallback(
    (item: WorkItem, field: string, value: any) => {
      let formattedVal: any = value;
      const isFieldCleared = value === '' || value === null || value === undefined;

      const numericFields = ['qty', 'weightKg', 'opnameQty', 'opnamePercent'];
      if (numericFields.includes(field)) {
        if (isFieldCleared) {
          formattedVal = '';
        } else {
          const strVal = typeof value === 'string' ? value.replace(',', '.').trim() : value;
          const num = parseFloat(strVal);
          formattedVal = isNaN(num) ? '' : Math.round(num * 100) / 100;
        }
      }

      const updated: WorkItem = {
        ...item,
        [field]: formattedVal,
        updatedAt: new Date().toISOString(),
      };

      // Intelligent Qty, Weight, Unit, and Dimension Synchronization (Shipyard Standard)
      if (['unit', 'type', 'd1', 'd2', 'd3', 'dLen', 'd4', 'qty', 'weightKg', 'unitPrice'].includes(field)) {
        const unitLower = String(updated.unit || '').trim().toLowerCase();
        const isKgUnit = unitLower === 'kg';
        const isM2Unit = unitLower === 'm2' || unitLower === 'm²';
        const isMUnit = unitLower === 'm' || unitLower === 'meter' || unitLower === 'mtr';
        const isPcsUnit = ['pcs', 'unit', 'set', 'titik', 'btg', 'lot', 'buah', 'ls'].includes(unitLower);

        const rawD4 = parseFloat(String(updated.d4 || '0')) || 0;
        const rawQty = typeof updated.qty === 'number' ? updated.qty : (parseFloat(String(updated.qty || '0')) || 0);

        // 1. Calculate Tonnage / Weight from dimensions
        const calcRes = TonnageCalculator.calculateItemTonnageAndPrice({
          typeCode: updated.type,
          d1: updated.d1,
          d2: updated.d2,
          d3: updated.d3,
          dLen: updated.dLen,
          d4: updated.d4,
          qty: rawQty > 0 ? rawQty : (rawD4 > 0 ? rawD4 : 1),
          unit: updated.unit,
          unitPrice: updated.unitPrice,
          priceBasis: updated.priceBasis,
        });

        if (calcRes.weightKg > 0) {
          updated.weightKg = calcRes.weightKg;
        }

        // 2. Field-specific synchronizations
        if (field === 'qty') {
          if (isFieldCleared) {
            updated.qty = '' as any;
          } else {
            updated.qty = formattedVal;
            if (isKgUnit && typeof formattedVal === 'number' && formattedVal > 0) {
              updated.weightKg = formattedVal;
            }
          }
        } else if (field === 'd4') {
          if (isFieldCleared) {
            updated.d4 = '';
            if (isPcsUnit && (!updated.qty || updated.qty === 0)) {
              updated.qty = '' as any;
            }
          } else {
            updated.d4 = String(formattedVal);
            const d4Num = parseFloat(String(formattedVal));
            if (!isNaN(d4Num) && d4Num > 0) {
              if (isKgUnit && calcRes.weightKg > 0) {
                updated.qty = Math.round(calcRes.weightKg * 100) / 100;
              } else if (isPcsUnit && (!updated.qty || (updated.qty as any) === '' || updated.qty === 0)) {
                updated.qty = d4Num;
              }
            }
          }
        } else if (field === 'unit') {
          if (isKgUnit) {
            if (calcRes.weightKg > 0) {
              updated.qty = Math.round(calcRes.weightKg * 100) / 100;
            } else if (updated.weightKg && Number(updated.weightKg) > 0) {
              updated.qty = Math.round(Number(updated.weightKg) * 100) / 100;
            }
          } else if (isPcsUnit && rawD4 > 0 && (!updated.qty || (updated.qty as any) === '')) {
            updated.qty = rawD4;
          }
        } else if (['type', 'd1', 'd2', 'd3', 'dLen'].includes(field)) {
          // If dimensions change and unit is KG, update Qty to match the newly calculated weight
          if (isKgUnit && calcRes.weightKg > 0) {
            updated.qty = Math.round(calcRes.weightKg * 100) / 100;
          }
        }

        // 3. Clean Price Calculation
        const effectiveQty = typeof updated.qty === 'number' && updated.qty > 0
          ? updated.qty
          : (rawD4 > 0 ? rawD4 : 0);
        const uPrice = typeof updated.unitPrice === 'number' ? updated.unitPrice : (parseFloat(String(updated.unitPrice || '0')) || 0);

        if (isKgUnit && updated.weightKg && updated.weightKg > 0) {
          updated.totalPrice = Math.round(updated.weightKg * uPrice);
        } else if (effectiveQty > 0 && uPrice > 0) {
          updated.totalPrice = Math.round(effectiveQty * uPrice);
        } else {
          updated.totalPrice = calcRes.totalPrice;
        }

        // Clean validation: If both Qty and D4 are cleared, maintain clean empty strings
        if (isFieldCleared && (field === 'qty' || field === 'd4')) {
          if (!updated.qty || (updated.qty as any) === 0) updated.qty = '' as any;
          if (!updated.d4 || updated.d4 === '0') updated.d4 = '';
        }
      }

      // Auto update percentage if opnameQty changes
      if (field === 'opnameQty' && item.qty > 0) {
        updated.opnamePercent = Math.round(((formattedVal as number) / item.qty) * 100);
      } else if (field === 'opnamePercent' && item.qty > 0) {
        updated.opnameQty = Math.round((item.qty * (formattedVal as number)) / 100);
      }

      onUpdateItem(updated);
    },
    [onUpdateItem]
  );

  // Start editing active cell
  const startEditing = useCallback(
    (cell: ActiveCell, initialVal?: string) => {
      const item = items.find((i) => i.id === cell.itemId);
      if (!item) return;
      setActiveCell(cell);
      setEditingCell(cell);
      if (initialVal !== undefined) {
        setEditValue(initialVal);
      } else {
        const currentVal = getCellValue(item, cell.field);
        setEditValue(currentVal !== undefined && currentVal !== null ? String(currentVal) : '');
      }
    },
    [items, getCellValue]
  );

  // Navigation handlers
  const moveActiveCell = useCallback(
    (rowDelta: number, colDelta: number, autoStartEdit: boolean = false) => {
      if (!items || items.length === 0) {
        return;
      }

      if (!activeCell) {
        if (items[0]?.id) {
          const firstCell = { itemId: items[0].id, field: columns[0] || 'itemNo' };
          setActiveCell(firstCell);
          if (autoStartEdit) {
            startEditing(firstCell);
          }
        }
        return;
      }

      const currentRowIndex = items.findIndex((i) => i && i.id === activeCell.itemId);
      const currentColIndex = columns.indexOf(activeCell.field);

      let curRow = currentRowIndex !== -1 ? currentRowIndex : 0;
      let curCol = currentColIndex !== -1 ? currentColIndex : 0;

      let nextRowIndex = curRow + rowDelta;
      let nextColIndex = curCol + colDelta;

      // Wrap-around row behavior for Tab navigation (Excel style)
      if (colDelta > 0 && nextColIndex >= columns.length) {
        if (curRow < items.length - 1) {
          nextRowIndex = curRow + 1;
          nextColIndex = 0;
        } else {
          nextColIndex = columns.length - 1;
        }
      } else if (colDelta < 0 && nextColIndex < 0) {
        if (curRow > 0) {
          nextRowIndex = curRow - 1;
          nextColIndex = columns.length - 1;
        } else {
          nextColIndex = 0;
        }
      } else {
        if (nextRowIndex < 0) nextRowIndex = 0;
        if (nextRowIndex >= items.length) nextRowIndex = items.length - 1;
        if (nextColIndex < 0) nextColIndex = 0;
        if (nextColIndex >= columns.length) nextColIndex = columns.length - 1;
      }

      const targetItem = items[nextRowIndex];
      const targetCol = columns[nextColIndex];

      if (targetItem?.id && targetCol) {
        const nextCell = {
          itemId: targetItem.id,
          field: targetCol,
        };
        setActiveCell(nextCell);
        if (autoStartEdit) {
          startEditing(nextCell);
        }
      }
    },
    [activeCell, items, columns, startEditing]
  );

  // Save current edit with optional directional movement
  const saveEditing = useCallback(
    (direction?: { row: number; col: number; autoStartEdit?: boolean }) => {
      if (!editingCell) return;
      const item = items.find((i) => i.id === editingCell.itemId);
      if (item) {
        updateCellValue(item, editingCell.field, editValue);
      }
      setEditingCell(null);
      if (direction) {
        moveActiveCell(direction.row, direction.col, direction.autoStartEdit ?? true);
      }
    },
    [editingCell, editValue, items, updateCellValue, moveActiveCell]
  );

  // Cancel current edit
  const cancelEditing = useCallback(() => {
    setEditingCell(null);
  }, []);

  // Copy cell value to clipboard
  const copyActiveCell = useCallback(async () => {
    if (!activeCell) return;
    const item = items.find((i) => i.id === activeCell.itemId);
    if (!item) return;
    const val = String(getCellValue(item, activeCell.field));
    internalClipboardRef.current = val;
    try {
      await navigator.clipboard.writeText(val);
      showToast(`Tersalin: "${val.length > 20 ? val.substring(0, 20) + '...' : val}"`);
    } catch {
      showToast(`Tersalin: "${val}"`);
    }
  }, [activeCell, items, getCellValue, showToast]);

  // Cut cell value
  const cutActiveCell = useCallback(async () => {
    if (!activeCell) return;
    const item = items.find((i) => i.id === activeCell.itemId);
    if (!item) return;
    const val = String(getCellValue(item, activeCell.field));
    internalClipboardRef.current = val;
    try {
      await navigator.clipboard.writeText(val);
    } catch {}
    updateCellValue(item, activeCell.field, '');
    showToast(`Dipotong: "${val}"`);
  }, [activeCell, items, getCellValue, updateCellValue, showToast]);

  // Copy full row values (No. s/d REMARK) to clipboard
  const copyRowToClipboard = useCallback(async (item: WorkItem) => {
    const tsv = [
      item.itemNo || '',
      item.description || '',
      item.notes || '',
      item.type && item.type !== '-' ? item.type : '',
      item.d1 || '',
      item.d2 || '',
      item.d3 || '',
      item.dLen || '',
      item.d4 || '',
      item.qty !== undefined && item.qty !== null ? String(item.qty) : '',
      item.unit || '',
      item.remark || '',
    ].join('\t');

    internalClipboardRef.current = tsv;
    try {
      await navigator.clipboard.writeText(tsv);
      showToast(`✓ Baris ${item.itemNo || ''} (No. s/d REMARK) disalin ke clipboard!`);
    } catch {
      showToast(`✓ Baris ${item.itemNo || ''} disalin ke clipboard!`);
    }
  }, [showToast]);

  // Paste into active cell or table range starting at activeCell (No. s/d REMARK)
  const pasteActiveCell = useCallback(async () => {
    if (!activeCell) return;
    const item = items.find((i) => i.id === activeCell.itemId);
    if (!item) return;

    let textToPaste = internalClipboardRef.current;
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText) textToPaste = clipText;
    } catch {}

    if (!textToPaste || !textToPaste.trim()) return;

    const rawLines = textToPaste.trim().split(/\r?\n/);
    if (rawLines.length === 1 && !textToPaste.includes('\t')) {
      // Single cell paste
      updateCellValue(item, activeCell.field, textToPaste.trim());
      showToast(`Ditempel: "${textToPaste.trim()}"`);
      return;
    }

    // Multi-cell / Multi-row Paste handling (Columns No. s/d REMARK)
    const colIndex = columns.indexOf(activeCell.field);
    const rowIndex = items.findIndex((i) => i.id === activeCell.itemId);
    if (colIndex === -1 || rowIndex === -1) return;

    // Check if line 0 is a header row (e.g. contains "no", "uraian", "work items", "keterangan", "type", "remark")
    let dataLines = rawLines;
    const firstLineLower = rawLines[0].toLowerCase();
    const isHeaderLine = (
      firstLineLower.includes('no') ||
      firstLineLower.includes('uraian') ||
      firstLineLower.includes('work item') ||
      firstLineLower.includes('keterangan') ||
      firstLineLower.includes('type') ||
      firstLineLower.includes('remark')
    ) && (firstLineLower.includes('\t') || rawLines.length > 1);

    if (isHeaderLine && rawLines.length > 1) {
      dataLines = rawLines.slice(1);
    }

    const newItemsList = [...items];
    let updatedCount = 0;
    let addedCount = 0;

    dataLines.forEach((line, rOffset) => {
      const lineStr = line.trim();
      if (!lineStr) return;

      const cellVals = line.split('\t');
      const targetRowIndex = rowIndex + rOffset;

      // Map values starting from target colIndex
      const fieldValuesMap: Record<string, any> = {};
      cellVals.forEach((cVal, cOffset) => {
        const targetColField = columns[colIndex + cOffset];
        if (targetColField) {
          fieldValuesMap[targetColField] = cVal.trim();
        }
      });

      if (Object.keys(fieldValuesMap).length === 0) return;

      if (targetRowIndex < newItemsList.length) {
        // Update existing row in-place
        newItemsList[targetRowIndex] = applyValuesToWorkItem(newItemsList[targetRowIndex], fieldValuesMap);
        updatedCount++;
      } else {
        // Dynamically create new row for extra pasted lines
        const prevRow = newItemsList[newItemsList.length - 1];
        const newId = `work-imp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${rOffset}`;
        const baseRow: WorkItem = {
          id: newId,
          projectId: prevRow?.projectId || 'proj-f049',
          categoryId: prevRow?.categoryId || (categories?.[0]?.id || 'cat-1'),
          itemNo: '',
          description: 'Pekerjaan Hasil Paste',
          qty: 1,
          unit: 'kg',
          unitPrice: 0,
          totalPrice: 0,
          itemLevel: 3,
          isAreaHeader: false,
        };
        const createdRow = applyValuesToWorkItem(baseRow, fieldValuesMap);
        newItemsList.push(createdRow);
        addedCount++;
      }
    });

    if (onBatchUpdateItems) {
      onBatchUpdateItems(newItemsList);
    } else {
      newItemsList.forEach((it) => onUpdateItem(it));
    }

    const totalAffected = updatedCount + addedCount;
    showToast(`✓ Ditempel ${totalAffected} baris (${updatedCount} diperbarui${addedCount > 0 ? `, ${addedCount} baru` : ''}) dari No. s/d REMARK!`);
  }, [activeCell, items, columns, categories, onBatchUpdateItems, onUpdateItem, updateCellValue, showToast]);

  // Clear cell value
  const clearActiveCell = useCallback(() => {
    if (!activeCell) return;
    const item = items.find((i) => i.id === activeCell.itemId);
    if (!item) return;
    updateCellValue(item, activeCell.field, '');
    showToast(`Sel dibersihkan`);
  }, [activeCell, items, updateCellValue, showToast]);

  // Safe key listener for spreadsheet shortcuts (Never interferes with other keyboard inputs)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent | KeyboardEvent) => {
      const target = (e.target || document.activeElement) as HTMLElement | null;

      // 1. If currently inside any external form field, search input, select, textarea, or modal dialog, DO NOT INTERCEPT
      const isInsideModalOrDialog = Boolean(target?.closest('[role="dialog"], .modal, .drawer, [aria-modal="true"]'));
      const isExternalInputField = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      );

      // If user is typing in search, modals, or inline non-spreadsheet inputs, exit immediately without blocking
      if (isInsideModalOrDialog || (isExternalInputField && !editingCell)) {
        return;
      }

      // 2. If actively editing a spreadsheet cell
      if (editingCell) {
        if (e.key === 'Escape') {
          e.preventDefault();
          cancelEditing();
          return;
        }

        if (e.key === 'Enter') {
          // Allow Shift+Enter for newline in textarea
          if (target?.tagName === 'TEXTAREA' && e.shiftKey) {
            return;
          }
          e.preventDefault();
          saveEditing();
          if (e.shiftKey) {
            moveActiveCell(-1, 0);
          } else {
            moveActiveCell(1, 0);
          }
          return;
        }

        if (e.key === 'Tab') {
          e.preventDefault();
          saveEditing({ row: 0, col: e.shiftKey ? -1 : 1, autoStartEdit: true });
          return;
        }

        // Inside the active cell input, let arrows, backspace, delete, copy/paste work naturally
        return;
      }

      // 3. If in navigation mode (activeCell selected, not editing)
      if (activeCell) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setActiveCell(null);
          return;
        }

        if (e.key === 'ArrowUp') {
          e.preventDefault();
          moveActiveCell(-1, 0);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          moveActiveCell(1, 0);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          moveActiveCell(0, -1);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          moveActiveCell(0, 1);
        } else if (e.key === 'Tab') {
          e.preventDefault();
          moveActiveCell(0, e.shiftKey ? -1 : 1, true);
        } else if (e.key === 'Enter' || e.key === 'F2') {
          e.preventDefault();
          startEditing(activeCell);
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          clearActiveCell();
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
          e.preventDefault();
          copyActiveCell();
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
          e.preventDefault();
          cutActiveCell();
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
          e.preventDefault();
          pasteActiveCell();
        } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          // Direct typing on selected cell starts edit with that key
          startEditing(activeCell, e.key);
        }
      }
    },
    [
      editingCell,
      activeCell,
      saveEditing,
      cancelEditing,
      moveActiveCell,
      startEditing,
      clearActiveCell,
      copyActiveCell,
      cutActiveCell,
      pasteActiveCell,
      setActiveCell,
    ]
  );

  return {
    activeCell,
    setActiveCell,
    editingCell,
    setEditingCell,
    editValue,
    setEditValue,
    contextMenu,
    setContextMenu,
    toastMessage,
    startEditing,
    saveEditing,
    cancelEditing,
    copyActiveCell,
    copyRowToClipboard,
    cutActiveCell,
    pasteActiveCell,
    clearActiveCell,
    moveActiveCell,
    handleKeyDown,
    showToast,
  };
}
