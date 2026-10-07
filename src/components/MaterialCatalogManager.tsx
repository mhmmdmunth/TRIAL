import React, { useState, useEffect } from 'react';
import {
  TonnageCalculator,
  MaterialTypeDefinition,
} from '../utils/tonnageCalculator';
import {
  Calculator,
  Tag,
  TrendingUp,
  Plus,
  Percent,
  Download,
  Upload,
  RotateCcw,
} from 'lucide-react';
import { CatalogTable } from './catalog/CatalogTable';
import { InteractiveMaterialCalculator } from './catalog/InteractiveMaterialCalculator';
import { PriceAnalyticsMatrix } from './catalog/PriceAnalyticsMatrix';
import { EditMaterialModal } from './catalog/EditMaterialModal';
import { BulkMarkupModal } from './catalog/BulkMarkupModal';
import { TabExportImportButton } from './TabExportImportButton';

interface MaterialCatalogManagerProps {
  onNotify?: (msg: string) => void;
  onConfirm?: (title: string, message: string, onConfirm: () => void) => void;
  onAlert?: (title: string, message: string) => void;
  onExportExcel?: () => void;
  onExportPdf?: () => void;
  onExportWord?: () => void;
  onOpenImportModal?: () => void;
  onDownloadTemplate?: () => void;
  onOpenFullModal?: (tab?: 'export' | 'import') => void;
}

export const MaterialCatalogManager: React.FC<MaterialCatalogManagerProps> = ({
  onNotify,
  onConfirm,
  onAlert,
  onExportExcel,
  onExportPdf,
  onExportWord,
  onOpenImportModal,
  onDownloadTemplate,
  onOpenFullModal,
}) => {
  const [catalog, setCatalog] = useState<MaterialTypeDefinition[]>(() =>
    TonnageCalculator.getMaterialCatalog()
  );
  const [activeSubTab, setActiveSubTab] = useState<'catalog-table' | 'interactive-calc' | 'price-analytics'>('catalog-table');

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editModalMode, setEditModalMode] = useState<'add' | 'edit'>('add');
  const [modalInitialItem, setModalInitialItem] = useState<MaterialTypeDefinition | null>(null);
  const [isMarkupModalOpen, setIsMarkupModalOpen] = useState(false);

  // Subscribe to changes in TonnageCalculator
  useEffect(() => {
    const unsub = TonnageCalculator.subscribeCatalog((newCatalog) => {
      setCatalog(newCatalog);
    });
    return () => unsub();
  }, []);

  // Update item in catalog
  const handleUpdateItem = (oldCode: string, item: MaterialTypeDefinition): boolean => {
    const ok = TonnageCalculator.updateMaterialTypeFull(oldCode, item);
    if (ok) {
      setCatalog(TonnageCalculator.getMaterialCatalog());
    }
    return ok;
  };

  // Delete item from catalog
  const handleDeleteItem = (code: string) => {
    const performDelete = () => {
      TonnageCalculator.deleteMaterialType(code);
      setCatalog(TonnageCalculator.getMaterialCatalog());
      onNotify?.(`Item "${code}" telah dihapus.`);
    };

    if (onConfirm) {
      onConfirm(
        'Konfirmasi Hapus Katalog',
        `Apakah Anda yakin ingin menghapus "${code}" dari database katalog?`,
        performDelete
      );
    } else if (window.confirm(`Apakah Anda yakin ingin menghapus "${code}" dari database katalog?`)) {
      performDelete();
    }
  };

  // Duplicate item in catalog
  const handleDuplicateItem = (item: MaterialTypeDefinition) => {
    let newCode = `${item.code}_COPY`;
    let counter = 1;
    while (catalog.some((c) => c.code.toUpperCase() === newCode.toUpperCase())) {
      counter++;
      newCode = `${item.code}_COPY${counter}`;
    }
    const duplicated: MaterialTypeDefinition = {
      ...item,
      code: newCode,
      name: `${item.name} (Salinan)`,
    };
    TonnageCalculator.addMaterialType(duplicated);
    setCatalog(TonnageCalculator.getMaterialCatalog());
    onNotify?.(`Berhasil menduplikasi menjadi "${newCode}".`);
  };

  // Open Edit modal
  const handleOpenEditModal = (item: MaterialTypeDefinition) => {
    setModalInitialItem(item);
    setEditModalMode('edit');
    setIsEditModalOpen(true);
  };

  // Open Add modal
  const handleOpenAddModal = () => {
    setModalInitialItem(null);
    setEditModalMode('add');
    setIsEditModalOpen(true);
  };

  // Save from Add / Edit Modal
  const handleSaveModal = (oldCode: string, item: MaterialTypeDefinition): boolean => {
    if (editModalMode === 'add') {
      const added = TonnageCalculator.addMaterialType(item);
      if (added) {
        setCatalog(TonnageCalculator.getMaterialCatalog());
        onNotify?.(`Material "${item.code}" berhasil ditambahkan ke database.`);
        return true;
      }
      return false;
    } else {
      const updated = TonnageCalculator.updateMaterialTypeFull(oldCode, item);
      if (updated) {
        setCatalog(TonnageCalculator.getMaterialCatalog());
        onNotify?.(`Spesifikasi "${item.code}" berhasil diperbarui.`);
        return true;
      }
      return false;
    }
  };

  // Direct price update (e.g., from analytics matrix)
  const handleUpdatePrice = (code: string, newPrice: number) => {
    TonnageCalculator.updateMaterialType(code, { defaultUnitPrice: newPrice });
    setCatalog(TonnageCalculator.getMaterialCatalog());
    onNotify?.(`Tarif "${code}" berhasil diubah menjadi ${TonnageCalculator.formatRupiah(newPrice)}.`);
  };

  // Bulk markup handler
  const handleApplyMarkup = (category: string, percentage: number) => {
    TonnageCalculator.applyPercentageMarkup(category, percentage);
    setCatalog(TonnageCalculator.getMaterialCatalog());
    onNotify?.(
      `Penyesuaian tarif ${percentage > 0 ? `+${percentage}%` : `${percentage}%`} berhasil diterapkan pada ${category === 'all' ? 'semua kategori' : `kategori ${category}`}.`
    );
  };

  // Reset to shipyard standard defaults
  const handleResetCatalog = () => {
    const performReset = () => {
      TonnageCalculator.resetCatalogToDefault();
      setCatalog(TonnageCalculator.getMaterialCatalog());
      onNotify?.('Database katalog berhasil direset ke standar default galangan.');
    };

    if (onConfirm) {
      onConfirm(
        'Reset Database Katalog',
        'Apakah Anda yakin ingin mengembalikan seluruh database katalog ke standar harga default BKI/PPC galangan kapal? Seluruh kustomisasi akan hilang.',
        performReset
      );
    } else if (
      window.confirm(
        'Kembalikan seluruh database katalog ke standar harga default BKI/PPC galangan kapal?'
      )
    ) {
      performReset();
    }
  };

  // Export JSON file
  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(catalog, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `material_catalog_shipyard_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    onNotify?.('Database katalog berhasil diekspor ke file JSON.');
  };

  // Import JSON file
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const imported = JSON.parse(evt.target?.result as string);
        if (Array.isArray(imported) && imported.length > 0) {
          TonnageCalculator.saveCatalog(imported);
          setCatalog(TonnageCalculator.getMaterialCatalog());
          onNotify?.(`Berhasil mengimpor ${imported.length} item katalog.`);
        } else {
          if (onAlert) {
            onAlert('Kesalahan Impor', 'Format file JSON tidak valid atau data kosong.');
          } else {
            alert('Format file JSON tidak valid atau data kosong.');
          }
        }
      } catch (err) {
        if (onAlert) {
          onAlert('Kesalahan Impor', 'Gagal membaca file JSON katalog.');
        } else {
          alert('Gagal membaca file JSON katalog.');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Metrics Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  Database Katalog &amp; Kalkulator Material (Semua Kolom &amp; Spesifikasi Editable)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Kelola master database harga pelat baja, pipa, profil baja, jasa docking, dan parameter kalkulator material.
                Semua kolom, tarif, dimensi, dan spesifikasi teknis dapat diedit langsung secara inline atau mode spreadsheet.
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Item Baru</span>
            </button>

            <button
              onClick={() => setIsMarkupModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg border border-slate-300 transition-colors"
              title="Sesuaikan seluruh harga berdasarkan persentase inflasi/margin"
            >
              <Percent className="w-4 h-4 text-emerald-600" />
              <span>Markup &amp; Margin</span>
            </button>

            {/* Export & Import Tools for Material Catalog */}
            <TabExportImportButton
              tabName="material-catalog"
              onExportExcel={onExportExcel}
              onExportPdf={onExportPdf}
              onExportWord={onExportWord}
              onOpenImportModal={onOpenImportModal}
              onDownloadTemplate={onDownloadTemplate}
              onOpenFullModal={onOpenFullModal}
              onExportJson={handleExportJson}
              onImportJson={handleImportJson}
            />

            <button
              onClick={handleResetCatalog}
              className="inline-flex items-center gap-1 px-2.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-medium rounded-lg border border-rose-200 transition-colors"
              title="Kembalikan semua tarif ke standar default galangan"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Standar</span>
            </button>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
          <button
            onClick={() => setActiveSubTab('catalog-table')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeSubTab === 'catalog-table'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Daftar Katalog &amp; Edit Kolom ({catalog.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('interactive-calc')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeSubTab === 'interactive-calc'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Calculator className="w-3.5 h-3.5 text-emerald-400" />
            <span>Kalkulator &amp; Simulator Material (100% Parameter Editable)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('price-analytics')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeSubTab === 'price-analytics'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
            <span>Matriks &amp; Analisis Komparasi Harga</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: CATALOG TABLE (WITH FULL INLINE & SPREADSHEET EDITING) */}
      {activeSubTab === 'catalog-table' && (
        <CatalogTable
          catalog={catalog}
          onUpdateItem={handleUpdateItem}
          onDeleteItem={handleDeleteItem}
          onDuplicateItem={handleDuplicateItem}
          onOpenEditModal={handleOpenEditModal}
          onOpenAddModal={handleOpenAddModal}
          onNotify={onNotify}
        />
      )}

      {/* SUB-TAB 2: INTERACTIVE CALCULATOR (100% EDITABLE SPECS & FORMULAS) */}
      {activeSubTab === 'interactive-calc' && (
        <InteractiveMaterialCalculator
          onSaveToCatalog={(item) => {
            const added = TonnageCalculator.addMaterialType(item);
            if (!added) {
              TonnageCalculator.updateMaterialType(item.code, item);
            }
            setCatalog(TonnageCalculator.getMaterialCatalog());
            return true;
          }}
          onNotify={onNotify}
        />
      )}

      {/* SUB-TAB 3: PRICE COMPARISON & ANALYTICS MATRIX */}
      {activeSubTab === 'price-analytics' && (
        <PriceAnalyticsMatrix
          catalog={catalog}
          onUpdatePrice={handleUpdatePrice}
        />
      )}

      {/* Modal: Add / Edit Material Specification */}
      <EditMaterialModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveModal}
        initialItem={modalInitialItem}
        mode={editModalMode}
      />

      {/* Modal: Bulk Percentage Markup / Margin Adjustment */}
      <BulkMarkupModal
        isOpen={isMarkupModalOpen}
        onClose={() => setIsMarkupModalOpen(false)}
        onApply={handleApplyMarkup}
      />
    </div>
  );
};
