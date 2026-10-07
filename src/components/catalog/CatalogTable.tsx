import React, { useState } from 'react';
import {
  TonnageCalculator,
  MaterialTypeDefinition,
} from '../../utils/tonnageCalculator';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Copy,
  Table,
  Sliders,
  Sparkles,
  Layers,
  Wrench,
  Tag,
  Save,
  RotateCcw,
  CheckCheck,
} from 'lucide-react';

interface CatalogTableProps {
  catalog: MaterialTypeDefinition[];
  onUpdateItem: (oldCode: string, item: MaterialTypeDefinition) => boolean;
  onDeleteItem: (code: string) => void;
  onDuplicateItem: (item: MaterialTypeDefinition) => void;
  onOpenEditModal: (item: MaterialTypeDefinition) => void;
  onOpenAddModal: () => void;
  onNotify?: (msg: string) => void;
}

export const CatalogTable: React.FC<CatalogTableProps> = ({
  catalog,
  onUpdateItem,
  onDeleteItem,
  onDuplicateItem,
  onOpenEditModal,
  onOpenAddModal,
  onNotify,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isSpreadsheetMode, setIsSpreadsheetMode] = useState(false);

  // Active inline cell editing state for standard mode
  // cellKey format: `${code}-${field}` (e.g., 'PL BKI-price', 'PL BKI-name', 'PL BKI-unit', 'PL BKI-code')
  const [editingCell, setEditingCell] = useState<{ code: string; field: string } | null>(null);
  const [cellDraftValue, setCellDraftValue] = useState<string>('');
  const [savedBadgeCode, setSavedBadgeCode] = useState<string | null>(null);

  // Draft changes for Spreadsheet Mode
  const [spreadsheetDrafts, setSpreadsheetDrafts] = useState<Record<string, Partial<MaterialTypeDefinition>>>({});
  const [hasSpreadsheetChanges, setHasSpreadsheetChanges] = useState(false);

  // Categories config
  const categories = [
    { id: 'all', label: 'Semua Katalog', icon: Tag, count: catalog.length },
    { id: 'plate', label: 'Pelat Baja', icon: Tag, count: catalog.filter((c) => c.category === 'plate').length },
    { id: 'pipe', label: 'Pipa Baja', icon: Wrench, count: catalog.filter((c) => c.category === 'pipe').length },
    { id: 'profile', label: 'Profil Konstruksi', icon: Layers, count: catalog.filter((c) => c.category === 'profile').length },
    { id: 'service', label: 'Jasa & Docking', icon: Sparkles, count: catalog.filter((c) => c.category === 'service').length },
    { id: 'other', label: 'Lainnya', icon: Sliders, count: catalog.filter((c) => c.category === 'other').length },
  ];

  // Filtering
  const filteredItems = catalog.filter((item) => {
    const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
    if (!matchesCat) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.code.toLowerCase().includes(q) ||
      item.name.toLowerCase().includes(q) ||
      item.categoryLabel.toLowerCase().includes(q) ||
      (item.descriptionHint && item.descriptionHint.toLowerCase().includes(q)) ||
      item.defaultUnit.toLowerCase().includes(q)
    );
  });

  // Start cell editing in standard mode
  const startEditingCell = (code: string, field: string, currentValue: any) => {
    setEditingCell({ code, field });
    setCellDraftValue(currentValue !== undefined && currentValue !== null ? String(currentValue) : '');
  };

  // Save single cell edit
  const saveCellEdit = (item: MaterialTypeDefinition) => {
    if (!editingCell) return;
    const { field, code: oldCode } = editingCell;

    const updatedItem = { ...item };

    if (field === 'code') {
      const newCode = cellDraftValue.trim().toUpperCase();
      if (!newCode) return;
      updatedItem.code = newCode;
    } else if (field === 'name') {
      if (!cellDraftValue.trim()) return;
      updatedItem.name = cellDraftValue.trim();
    } else if (field === 'category') {
      const cat = cellDraftValue as any;
      updatedItem.category = cat;
      const catLabelMap: Record<string, string> = {
        plate: 'Pelat Baja',
        pipe: 'Pipa Baja',
        profile: 'Profil Konstruksi',
        service: 'Jasa & Docking',
        other: 'Lainnya',
      };
      updatedItem.categoryLabel = catLabelMap[cat] || 'Umum';
    } else if (field === 'defaultUnit') {
      updatedItem.defaultUnit = cellDraftValue.trim() || 'kg';
    } else if (field === 'defaultUnitPrice') {
      const p = parseFloat(cellDraftValue);
      if (!isNaN(p)) updatedItem.defaultUnitPrice = Math.max(0, p);
    } else if (field === 'weightPerMeterKg') {
      const w = parseFloat(cellDraftValue);
      updatedItem.weightPerMeterKg = !isNaN(w) && w > 0 ? w : undefined;
    } else if (field === 'weightPerSqmKg') {
      const w = parseFloat(cellDraftValue);
      updatedItem.weightPerSqmKg = !isNaN(w) && w > 0 ? w : undefined;
    } else if (field === 'defaultD1') {
      const v = parseFloat(cellDraftValue);
      updatedItem.defaultD1 = !isNaN(v) ? v : undefined;
    } else if (field === 'defaultD2') {
      const v = parseFloat(cellDraftValue);
      updatedItem.defaultD2 = !isNaN(v) ? v : undefined;
    } else if (field === 'defaultD3') {
      const v = parseFloat(cellDraftValue);
      updatedItem.defaultD3 = !isNaN(v) ? v : undefined;
    } else if (field === 'defaultD4') {
      const v = parseFloat(cellDraftValue);
      updatedItem.defaultD4 = !isNaN(v) ? v : 1;
    } else if (field === 'descriptionHint') {
      updatedItem.descriptionHint = cellDraftValue.trim() || undefined;
    }

    const success = onUpdateItem(oldCode, updatedItem);
    if (success) {
      setSavedBadgeCode(updatedItem.code);
      setTimeout(() => setSavedBadgeCode(null), 2500);
      onNotify?.(`Spesifikasi ${updatedItem.code} berhasil diperbarui.`);
    }
    setEditingCell(null);
  };

  // Handle Spreadsheet mode changes
  const handleSpreadsheetFieldChange = (code: string, field: keyof MaterialTypeDefinition, value: any) => {
    setSpreadsheetDrafts((prev) => ({
      ...prev,
      [code]: {
        ...(prev[code] || {}),
        [field]: value,
      },
    }));
    setHasSpreadsheetChanges(true);
  };

  // Save all spreadsheet changes
  const handleSaveAllSpreadsheet = () => {
    let count = 0;
    Object.entries(spreadsheetDrafts).forEach(([code, patch]) => {
      const original = catalog.find((c) => c.code.toUpperCase() === code.toUpperCase());
      if (original) {
        const patchObj = (patch || {}) as Partial<MaterialTypeDefinition>;
        const merged: MaterialTypeDefinition = {
          ...original,
          ...patchObj,
        };
        onUpdateItem(code, merged);
        count++;
      }
    });
    setSpreadsheetDrafts({});
    setHasSpreadsheetChanges(false);
    onNotify?.(`${count} item spesifikasi material berhasil disimpan ke database.`);
  };

  // Cancel spreadsheet changes
  const handleCancelSpreadsheet = () => {
    setSpreadsheetDrafts({});
    setHasSpreadsheetChanges(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Top Filter & Mode Switcher Bar */}
      <div className="p-4 bg-slate-50/90 border-b border-slate-200 flex flex-col lg:flex-row items-center justify-between gap-3">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0 scrollbar-none">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  isSelected
                    ? 'bg-emerald-700 text-white font-semibold shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? 'bg-emerald-800 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Tools: Search & Spreadsheet Toggle */}
        <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kode, spesifikasi, satuan..."
              className="w-full pl-9 pr-7 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Toggle Mode Button */}
          <button
            onClick={() => setIsSpreadsheetMode(!isSpreadsheetMode)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors shrink-0 ${
              isSpreadsheetMode
                ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
            }`}
            title="Buka semua sel dalam mode input spreadsheet langsung"
          >
            <Table className="w-3.5 h-3.5" />
            <span>{isSpreadsheetMode ? 'Mode Grid Aktif' : 'Mode Spreadsheet'}</span>
          </button>
        </div>
      </div>

      {/* Spreadsheet Action Bar when Active */}
      {isSpreadsheetMode && (
        <div className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-emerald-900 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
            <span>
              <strong>Mode Spreadsheet Langsung:</strong> Semua kolom dapat diedit langsung di tabel. Klik tombol Simpan untuk menerapkan ke database.
            </span>
          </div>
          <div className="flex items-center gap-2">
            {hasSpreadsheetChanges && (
              <>
                <button
                  onClick={handleCancelSpreadsheet}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-md border border-slate-300"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Batalkan</span>
                </button>
                <button
                  onClick={handleSaveAllSpreadsheet}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-md shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Semua Perubahan</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Table Data */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700 border-collapse">
          <thead className="bg-slate-100/90 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-3 w-10 text-center">No</th>
              <th className="py-2.5 px-3 min-w-[130px]">Kode Tipe</th>
              <th className="py-2.5 px-3 min-w-[220px]">Nama &amp; Spesifikasi Teknis</th>
              <th className="py-2.5 px-3 min-w-[130px]">Kategori</th>
              <th className="py-2.5 px-3 min-w-[80px] text-center">Satuan</th>
              <th className="py-2.5 px-3 min-w-[140px] text-right">Tarif Dasar (Rp)</th>
              <th className="py-2.5 px-3 min-w-[150px] text-center">Dimensi Default (P×L×T×Qty)</th>
              <th className="py-2.5 px-3 min-w-[110px] text-center">Berat Standar</th>
              <th className="py-2.5 px-3 min-w-[180px]">Petunjuk Deskripsi (Hint)</th>
              <th className="py-2.5 px-3 w-24 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-sans">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-10 text-center text-slate-400">
                  Tidak ada material yang cocok dengan pencarian &quot;{searchQuery}&quot;
                </td>
              </tr>
            ) : (
              filteredItems.map((item, idx) => {
                const patch = spreadsheetDrafts[item.code] || {};
                const currentItem = { ...item, ...patch };
                const isJustSaved = savedBadgeCode === item.code;

                return (
                  <tr
                    key={item.code}
                    className={`hover:bg-slate-50/80 transition-colors group ${
                      isSpreadsheetMode ? 'bg-white' : ''
                    }`}
                  >
                    {/* Column 1: No */}
                    <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                      {idx + 1}
                    </td>

                    {/* Column 2: Kode Tipe (Editable) */}
                    <td className="py-2 px-3">
                      {isSpreadsheetMode ? (
                        <input
                          type="text"
                          value={currentItem.code}
                          onChange={(e) =>
                            handleSpreadsheetFieldChange(item.code, 'code', e.target.value.toUpperCase())
                          }
                          className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded font-mono font-bold text-xs focus:bg-white focus:border-emerald-500"
                        />
                      ) : editingCell?.code === item.code && editingCell?.field === 'code' ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={cellDraftValue}
                            onChange={(e) => setCellDraftValue(e.target.value.toUpperCase())}
                            onBlur={() => saveCellEdit(item)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveCellEdit(item);
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            autoFocus
                            className="w-28 px-2 py-0.5 font-mono font-bold text-xs bg-white border border-emerald-500 rounded focus:outline-hidden"
                          />
                          <button
                            onClick={() => saveCellEdit(item)}
                            className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => startEditingCell(item.code, 'code', item.code)}
                          className="cursor-pointer flex items-center justify-between gap-1 group/cell p-1 rounded hover:bg-slate-100"
                          title="Klik untuk edit kode"
                        >
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {item.code}
                          </span>
                          <Edit2 className="w-2.5 h-2.5 text-slate-300 opacity-0 group-hover/cell:opacity-100 text-emerald-600" />
                        </div>
                      )}
                    </td>

                    {/* Column 3: Nama & Spesifikasi (Editable) */}
                    <td className="py-2 px-3 font-medium text-slate-800">
                      {isSpreadsheetMode ? (
                        <input
                          type="text"
                          value={currentItem.name}
                          onChange={(e) => handleSpreadsheetFieldChange(item.code, 'name', e.target.value)}
                          className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs focus:bg-white focus:border-emerald-500"
                        />
                      ) : editingCell?.code === item.code && editingCell?.field === 'name' ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={cellDraftValue}
                            onChange={(e) => setCellDraftValue(e.target.value)}
                            onBlur={() => saveCellEdit(item)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveCellEdit(item);
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            autoFocus
                            className="w-full px-2 py-0.5 text-xs bg-white border border-emerald-500 rounded focus:outline-hidden"
                          />
                          <button
                            onClick={() => saveCellEdit(item)}
                            className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => startEditingCell(item.code, 'name', item.name)}
                          className="cursor-pointer flex items-center justify-between gap-1 group/cell p-1 rounded hover:bg-slate-100"
                          title="Klik untuk edit nama/spesifikasi"
                        >
                          <span className="truncate max-w-[240px]">{item.name}</span>
                          <Edit2 className="w-2.5 h-2.5 text-slate-300 opacity-0 group-hover/cell:opacity-100 text-emerald-600" />
                        </div>
                      )}
                    </td>

                    {/* Column 4: Kategori (Editable) */}
                    <td className="py-2 px-3">
                      {isSpreadsheetMode ? (
                        <select
                          value={currentItem.category}
                          onChange={(e) => {
                            const cat = e.target.value as any;
                            const catLabelMap: Record<string, string> = {
                              plate: 'Pelat Baja',
                              pipe: 'Pipa Baja',
                              profile: 'Profil Konstruksi',
                              service: 'Jasa & Docking',
                              other: 'Lainnya',
                            };
                            handleSpreadsheetFieldChange(item.code, 'category', cat);
                            handleSpreadsheetFieldChange(item.code, 'categoryLabel', catLabelMap[cat] || 'Umum');
                          }}
                          className="w-full px-1.5 py-1 bg-slate-50 border border-slate-300 rounded text-xs focus:bg-white"
                        >
                          <option value="plate">Pelat Baja</option>
                          <option value="pipe">Pipa Baja</option>
                          <option value="profile">Profil Konstruksi</option>
                          <option value="service">Jasa &amp; Docking</option>
                          <option value="other">Lainnya</option>
                        </select>
                      ) : editingCell?.code === item.code && editingCell?.field === 'category' ? (
                        <select
                          value={cellDraftValue}
                          onChange={(e) => {
                            setCellDraftValue(e.target.value);
                            saveCellEdit(item);
                          }}
                          onBlur={() => setEditingCell(null)}
                          autoFocus
                          className="w-full px-1.5 py-0.5 text-xs bg-white border border-emerald-500 rounded"
                        >
                          <option value="plate">Pelat Baja</option>
                          <option value="pipe">Pipa Baja</option>
                          <option value="profile">Profil Konstruksi</option>
                          <option value="service">Jasa &amp; Docking</option>
                          <option value="other">Lainnya</option>
                        </select>
                      ) : (
                        <div
                          onClick={() => startEditingCell(item.code, 'category', item.category)}
                          className="cursor-pointer group/cell inline-flex items-center gap-1"
                          title="Klik untuk ubah kategori"
                        >
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${
                              item.badgeBg || 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {item.categoryLabel}
                          </span>
                          <Edit2 className="w-2.5 h-2.5 text-slate-300 opacity-0 group-hover/cell:opacity-100 text-emerald-600" />
                        </div>
                      )}
                    </td>

                    {/* Column 5: Satuan (Editable) */}
                    <td className="py-2 px-3 text-center">
                      {isSpreadsheetMode ? (
                        <input
                          type="text"
                          value={currentItem.defaultUnit}
                          onChange={(e) =>
                            handleSpreadsheetFieldChange(item.code, 'defaultUnit', e.target.value)
                          }
                          className="w-16 text-center px-1.5 py-1 bg-slate-50 border border-slate-300 rounded font-mono text-xs focus:bg-white"
                        />
                      ) : editingCell?.code === item.code && editingCell?.field === 'defaultUnit' ? (
                        <div className="flex items-center gap-1 justify-center">
                          <input
                            type="text"
                            value={cellDraftValue}
                            onChange={(e) => setCellDraftValue(e.target.value)}
                            onBlur={() => saveCellEdit(item)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveCellEdit(item);
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            autoFocus
                            className="w-16 text-center font-mono text-xs bg-white border border-emerald-500 rounded px-1 py-0.5 focus:outline-hidden"
                          />
                          <button
                            onClick={() => saveCellEdit(item)}
                            className="p-0.5 bg-emerald-600 text-white rounded"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => startEditingCell(item.code, 'defaultUnit', item.defaultUnit)}
                          className="cursor-pointer group/cell inline-flex items-center gap-1 font-mono font-semibold text-slate-700 hover:text-emerald-700 p-1 rounded"
                          title="Klik untuk edit satuan"
                        >
                          <span>{item.defaultUnit}</span>
                          <Edit2 className="w-2.5 h-2.5 text-slate-300 opacity-0 group-hover/cell:opacity-100" />
                        </div>
                      )}
                    </td>

                    {/* Column 6: Tarif Dasar Rp (Editable) */}
                    <td className="py-2 px-3 text-right font-mono">
                      {isSpreadsheetMode ? (
                        <input
                          type="number"
                          step="100"
                          value={currentItem.defaultUnitPrice}
                          onChange={(e) =>
                            handleSpreadsheetFieldChange(
                              item.code,
                              'defaultUnitPrice',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-28 text-right px-2 py-1 bg-slate-50 border border-slate-300 rounded font-mono font-bold text-emerald-800 text-xs focus:bg-white focus:border-emerald-500"
                        />
                      ) : editingCell?.code === item.code && editingCell?.field === 'defaultUnitPrice' ? (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            step="500"
                            value={cellDraftValue}
                            onChange={(e) => setCellDraftValue(e.target.value)}
                            onBlur={() => saveCellEdit(item)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveCellEdit(item);
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            autoFocus
                            className="w-28 text-right font-mono text-xs px-2 py-1 bg-white border border-emerald-500 rounded focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                          />
                          <button
                            onClick={() => saveCellEdit(item)}
                            className="p-1 text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors"
                            title="Simpan tarif"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() =>
                            startEditingCell(item.code, 'defaultUnitPrice', item.defaultUnitPrice)
                          }
                          className="cursor-pointer group/price flex items-center justify-end gap-1 py-1 px-1.5 rounded hover:bg-emerald-50 transition-colors"
                          title="Klik untuk edit cepat tarif"
                        >
                          <span className="font-bold text-emerald-700">
                            {TonnageCalculator.formatRupiah(item.defaultUnitPrice)}
                          </span>
                          <Edit2 className="w-2.5 h-2.5 text-slate-300 opacity-0 group-hover/price:opacity-100 text-emerald-600" />
                          {isJustSaved && (
                            <span className="text-[9px] bg-emerald-600 text-white px-1 rounded animate-pulse">
                              Tersimpan
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Column 7: Dimensi Default D1 - D4 (Editable) */}
                    <td className="py-2 px-3 text-center font-mono text-[11px] text-slate-500">
                      {isSpreadsheetMode ? (
                        <div className="grid grid-cols-4 gap-1">
                          <input
                            type="number"
                            placeholder="D1"
                            value={currentItem.defaultD1 ?? ''}
                            onChange={(e) =>
                              handleSpreadsheetFieldChange(
                                item.code,
                                'defaultD1',
                                e.target.value ? parseFloat(e.target.value) : undefined
                              )
                            }
                            className="w-full px-1 py-0.5 text-[10px] bg-slate-50 border border-slate-300 rounded text-center"
                            title="D1: Panjang (mm)"
                          />
                          <input
                            type="number"
                            placeholder="D2"
                            value={currentItem.defaultD2 ?? ''}
                            onChange={(e) =>
                              handleSpreadsheetFieldChange(
                                item.code,
                                'defaultD2',
                                e.target.value ? parseFloat(e.target.value) : undefined
                              )
                            }
                            className="w-full px-1 py-0.5 text-[10px] bg-slate-50 border border-slate-300 rounded text-center"
                            title="D2: Lebar (mm)"
                          />
                          <input
                            type="number"
                            placeholder="D3"
                            value={currentItem.defaultD3 ?? ''}
                            onChange={(e) =>
                              handleSpreadsheetFieldChange(
                                item.code,
                                'defaultD3',
                                e.target.value ? parseFloat(e.target.value) : undefined
                              )
                            }
                            className="w-full px-1 py-0.5 text-[10px] bg-slate-50 border border-slate-300 rounded text-center"
                            title="D3: Tebal (mm)"
                          />
                          <input
                            type="number"
                            placeholder="D4"
                            value={currentItem.defaultD4 ?? ''}
                            onChange={(e) =>
                              handleSpreadsheetFieldChange(
                                item.code,
                                'defaultD4',
                                e.target.value ? parseFloat(e.target.value) : 1
                              )
                            }
                            className="w-full px-1 py-0.5 text-[10px] bg-slate-50 border border-slate-300 rounded text-center"
                            title="D4: Qty (Pcs)"
                          />
                        </div>
                      ) : (
                        <div
                          onClick={() => onOpenEditModal(item)}
                          className="cursor-pointer group/dim p-1 rounded hover:bg-slate-100 flex items-center justify-center gap-1"
                          title="Klik untuk edit dimensi default"
                        >
                          <span>
                            {[item.defaultD1, item.defaultD2, item.defaultD3, item.defaultD4]
                              .filter(Boolean)
                              .join(' × ') || '-'}
                          </span>
                          <Edit2 className="w-2.5 h-2.5 text-slate-300 opacity-0 group-hover/dim:opacity-100 text-emerald-600" />
                        </div>
                      )}
                    </td>

                    {/* Column 8: Berat Standar Teknis (Editable) */}
                    <td className="py-2 px-3 text-center font-mono text-[11px] text-slate-600">
                      {isSpreadsheetMode ? (
                        <input
                          type="number"
                          step="0.01"
                          placeholder="kg/m"
                          value={currentItem.weightPerMeterKg ?? currentItem.weightPerSqmKg ?? ''}
                          onChange={(e) => {
                            const val = e.target.value ? parseFloat(e.target.value) : undefined;
                            if (item.category === 'pipe' || item.category === 'profile') {
                              handleSpreadsheetFieldChange(item.code, 'weightPerMeterKg', val);
                            } else {
                              handleSpreadsheetFieldChange(item.code, 'weightPerSqmKg', val);
                            }
                          }}
                          className="w-20 text-center px-1.5 py-1 bg-slate-50 border border-slate-300 rounded text-[11px]"
                        />
                      ) : (
                        <div
                          onClick={() => onOpenEditModal(item)}
                          className="cursor-pointer group/w p-1 rounded hover:bg-slate-100 flex items-center justify-center gap-1"
                          title="Klik untuk edit parameter berat"
                        >
                          <span>
                            {item.weightPerMeterKg
                              ? `${item.weightPerMeterKg} kg/m`
                              : item.weightPerSqmKg
                              ? `${item.weightPerSqmKg} kg/m²`
                              : item.density
                              ? `${item.density} kg/dm³`
                              : '-'}
                          </span>
                          <Edit2 className="w-2.5 h-2.5 text-slate-300 opacity-0 group-hover/w:opacity-100 text-emerald-600" />
                        </div>
                      )}
                    </td>

                    {/* Column 9: Petunjuk Deskripsi (Editable) */}
                    <td className="py-2 px-3 text-[11px] text-slate-500 italic max-w-xs">
                      {isSpreadsheetMode ? (
                        <input
                          type="text"
                          value={currentItem.descriptionHint || ''}
                          onChange={(e) =>
                            handleSpreadsheetFieldChange(item.code, 'descriptionHint', e.target.value)
                          }
                          className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs focus:bg-white"
                        />
                      ) : (
                        <div
                          onClick={() => onOpenEditModal(item)}
                          className="cursor-pointer group/hint p-1 rounded hover:bg-slate-100 flex items-center justify-between gap-1"
                          title="Klik untuk edit petunjuk deskripsi"
                        >
                          <span className="truncate max-w-[180px]">{item.descriptionHint || '-'}</span>
                          <Edit2 className="w-2.5 h-2.5 text-slate-300 opacity-0 group-hover/hint:opacity-100 text-emerald-600" />
                        </div>
                      )}
                    </td>

                    {/* Column 10: Action buttons */}
                    <td className="py-2 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onOpenEditModal(item)}
                          className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                          title="Edit spesifikasi lengkap & parameter"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDuplicateItem(item)}
                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Duplikasi material ini"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteItem(item.code)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Hapus dari katalog"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer bar with quick add item */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span>Menampilkan <strong>{filteredItems.length}</strong> dari <strong>{catalog.length}</strong> material &amp; jasa galangan</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg shadow-xs transition-colors text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Item Baru</span>
          </button>
        </div>
      </div>
    </div>
  );
};
