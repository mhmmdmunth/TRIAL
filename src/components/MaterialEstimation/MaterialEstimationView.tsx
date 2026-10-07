import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Layers,
  Search,
  Plus,
  Trash2,
  Edit2,
  Copy,
  Download,
  Printer,
  RotateCcw,
  Sparkles,
  Filter,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Shield,
  Pipette,
  Paintbrush,
  Flame,
  Cog,
  Anchor,
  Zap,
  Package,
  SlidersHorizontal,
  ExternalLink,
  Tag,
  CheckSquare,
  Square,
  RefreshCw,
} from 'lucide-react';
import {
  ProjectMaterialEstimate,
  MaterialClassification,
  MaterialProcurementStatus,
  WorkItem,
  VesselSpec,
  ProjectSchedule,
  WorkCategory,
} from '../../types';
import {
  materialEstimationService,
  MATERIAL_CLASSIFICATIONS,
  MATERIAL_PROCUREMENT_STATUSES,
  calculateMaterialSummary,
} from '../../services/materialEstimationService';
import { MaterialEstimationModal } from './MaterialEstimationModal';

interface MaterialEstimationViewProps {
  projectId: string;
  vessel: VesselSpec;
  schedule: ProjectSchedule;
  categories: WorkCategory[];
  workItems: WorkItem[];
  onNotify?: (message: string) => void;
  onNavigateToRepairList?: () => void;
}

export const MaterialEstimationView: React.FC<MaterialEstimationViewProps> = ({
  projectId,
  vessel,
  schedule,
  categories,
  workItems,
  onNotify,
  onNavigateToRepairList,
}) => {
  // Materials state
  const [materials, setMaterials] = useState<ProjectMaterialEstimate[]>(() =>
    materialEstimationService.getMaterialEstimates(projectId)
  );

  // Automatically sync material estimates whenever active project or repair list changes
  useEffect(() => {
    if (!projectId) return;
    const generated = materialEstimationService.generateFromRepairList(
      projectId,
      workItems,
      categories,
      'replace'
    );
    setMaterials(generated);
  }, [projectId, workItems, categories]);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProjectMaterialEstimate | null>(null);
  const [selectedDefaultWorkItemId, setSelectedDefaultWorkItemId] = useState<string | undefined>();
  const [isConfirmGenerateOpen, setIsConfirmGenerateOpen] = useState(false);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedClassificationFilter, setSelectedClassificationFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [viewGrouping, setViewGrouping] = useState<'flat' | 'by-category' | 'by-classification'>('by-category');

  // Multi-select for bulk delete
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  // Save changes helper
  const handleSaveItem = (itemPayload: Partial<ProjectMaterialEstimate>) => {
    if (itemPayload.id) {
      materialEstimationService.updateMaterialEstimate(projectId, itemPayload as ProjectMaterialEstimate);
      onNotify?.(`Material "${itemPayload.materialName}" berhasil diperbarui.`);
    } else {
      materialEstimationService.addMaterialEstimate(
        projectId,
        itemPayload as Omit<ProjectMaterialEstimate, 'id' | 'projectId' | 'totalCost' | 'totalQtyWithBuffer' | 'createdAt' | 'updatedAt'>
      );
      onNotify?.(`Material "${itemPayload.materialName}" berhasil ditambahkan.`);
    }
    setMaterials(materialEstimationService.getMaterialEstimates(projectId));
  };

  const handleDeleteItem = (id: string, name: string) => {
    if (window.confirm(`Hapus material "${name}" dari daftar estimasi proyek?`)) {
      materialEstimationService.deleteMaterialEstimate(projectId, id);
      setMaterials(materialEstimationService.getMaterialEstimates(projectId));
      onNotify?.(`Material "${name}" telah dihapus.`);
    }
  };

  const handleDuplicateItem = (item: ProjectMaterialEstimate) => {
    const copyPayload: Omit<ProjectMaterialEstimate, 'id' | 'projectId' | 'totalCost' | 'totalQtyWithBuffer' | 'createdAt' | 'updatedAt'> = {
      ...item,
      materialCode: `${item.materialCode}-CPY`,
      materialName: `${item.materialName} (Copy)`,
    };
    materialEstimationService.addMaterialEstimate(projectId, copyPayload);
    setMaterials(materialEstimationService.getMaterialEstimates(projectId));
    onNotify?.(`Salinan material "${item.materialName}" berhasil dibuat.`);
  };

  const handleBulkDelete = () => {
    if (selectedItemIds.size === 0) return;
    if (window.confirm(`Hapus ${selectedItemIds.size} material terpilih dari daftar estimasi?`)) {
      materialEstimationService.deleteMaterialEstimatesBatch(projectId, Array.from(selectedItemIds));
      setSelectedItemIds(new Set());
      setMaterials(materialEstimationService.getMaterialEstimates(projectId));
      onNotify?.(`${selectedItemIds.size} material berhasil dihapus.`);
    }
  };

  const handleToggleStatus = (item: ProjectMaterialEstimate, newStatus: MaterialProcurementStatus) => {
    const updated: ProjectMaterialEstimate = {
      ...item,
      procurementStatus: newStatus,
    };
    materialEstimationService.updateMaterialEstimate(projectId, updated);
    setMaterials(materialEstimationService.getMaterialEstimates(projectId));
  };

  const handleAutoGenerate = (mode: 'replace' | 'append') => {
    const result = materialEstimationService.generateFromRepairList(
      projectId,
      workItems,
      categories,
      mode
    );
    setMaterials(result);
    setIsConfirmGenerateOpen(false);
    onNotify?.(`Berhasil mengkalkulasi ${result.length} estimasi material dari Repair List.`);
  };

  const handleExportExcel = async () => {
    try {
      await materialEstimationService.exportToExcel(vessel, schedule, materials, categories);
      onNotify?.('File Excel BOM Material berhasil diekspor.');
    } catch (e) {
      console.error('Failed to export Excel', e);
      alert('Terjadi kesalahan saat mengekspor file Excel.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Filtered materials
  const filteredMaterials = useMemo(() => {
    return materials.filter((item) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCode = (item.materialCode || '').toLowerCase().includes(q);
        const matchName = (item.materialName || '').toLowerCase().includes(q);
        const matchSpec = (item.specification || '').toLowerCase().includes(q);
        const matchItemNo = (item.workItemNo || '').toLowerCase().includes(q);
        const matchItemDesc = (item.workItemDescription || '').toLowerCase().includes(q);
        const matchSupplier = (item.supplierName || '').toLowerCase().includes(q);
        const matchLocation = (item.locationOrTarget || '').toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchSpec && !matchItemNo && !matchItemDesc && !matchSupplier && !matchLocation) {
          return false;
        }
      }

      // Category filter
      if (selectedCategoryFilter !== 'all') {
        if (item.categoryId !== selectedCategoryFilter && item.categoryCode !== selectedCategoryFilter) {
          return false;
        }
      }

      // Classification filter
      if (selectedClassificationFilter !== 'all') {
        if (item.classification !== selectedClassificationFilter) {
          return false;
        }
      }

      // Status filter
      if (selectedStatusFilter !== 'all') {
        if (item.procurementStatus !== selectedStatusFilter) {
          return false;
        }
      }

      return true;
    });
  }, [materials, searchQuery, selectedCategoryFilter, selectedClassificationFilter, selectedStatusFilter]);

  // Overall KPI Summary
  const summary = useMemo(() => calculateMaterialSummary(materials), [materials]);
  const filteredSummary = useMemo(() => calculateMaterialSummary(filteredMaterials), [filteredMaterials]);

  // Grouped items
  const groupedByCategory = useMemo(() => {
    const map = new Map<string, ProjectMaterialEstimate[]>();
    filteredMaterials.forEach((m) => {
      const key = m.categoryCode ? `Kategori ${m.categoryCode}. ${m.categoryName || ''}` : 'Material Umum Proyek';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    });
    return Array.from(map.entries());
  }, [filteredMaterials]);

  const groupedByClassification = useMemo(() => {
    const map = new Map<string, ProjectMaterialEstimate[]>();
    filteredMaterials.forEach((m) => {
      const meta = MATERIAL_CLASSIFICATIONS.find((c) => c.id === m.classification);
      const key = meta ? meta.label : 'Material Lain-lain';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    });
    return Array.from(map.entries());
  }, [filteredMaterials]);

  // Multi-select toggle helpers
  const toggleSelectAll = () => {
    if (selectedItemIds.size === filteredMaterials.length && filteredMaterials.length > 0) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(filteredMaterials.map((m) => m.id)));
    }
  };

  const toggleSelectItem = (id: string) => {
    const next = new Set(selectedItemIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedItemIds(next);
  };

  const getClassificationMeta = (cls: string) => {
    return MATERIAL_CLASSIFICATIONS.find((m) => m.id === cls);
  };

  return (
    <div className="space-y-4 pb-16">
      {/* 1. TOP HEADER & VESSEL CONTEXT */}
      <div className="bg-linear-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-2xl p-5 shadow-xl border border-slate-700/60 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-linear-to-l from-emerald-500/10 to-transparent pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 rounded-full text-[11px] font-bold tracking-wider uppercase">
                Shipyard Material Take-Off (BOM)
              </span>
              <span className="px-2 py-0.5 bg-white/10 text-slate-300 rounded text-[11px] font-mono">
                No. Proyek: <strong>{vessel.projectNo || 'F-049'}</strong>
              </span>
              <span className="px-2 py-0.5 bg-white/10 text-slate-300 rounded text-[11px]">
                Klas: <strong>{vessel.classification || 'BKI'}</strong>
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Box className="w-6 h-6 text-emerald-400" />
              <span>Estimasi Material Proyek: {vessel.name || 'TB. KSA BINTANG'}</span>
            </h1>

            <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
              Daftar kebutuhan material terperinci (Bill of Materials) yang dikalkulasi dan terhubung
              langsung ke item pekerjaan di <strong>Repair List ({workItems.length} Pekerjaan)</strong>.
              Membantu PPC &amp; Logistik merencanakan pengadaan baja, pipa, cat, elektroda &amp; outfitting.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => setIsConfirmGenerateOpen(true)}
              className="px-3.5 py-2 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-2 transition-all cursor-pointer ring-2 ring-emerald-400/30"
              title="Kalkulasi otomatis material dari item repair list yang ada"
            >
              <Sparkles className="w-4 h-4 text-emerald-200" />
              <span>⚡ Generate dari Repair List</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingItem(null);
                setSelectedDefaultWorkItemId(undefined);
                setIsModalOpen(true);
              }}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-600 stroke-[3]" />
              <span>+ Tambah Material</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3 py-2 bg-slate-800/90 hover:bg-slate-700 text-emerald-300 text-xs font-bold rounded-xl border border-slate-600/80 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Ekspor daftar material ke Excel (.xlsx) lengkap formula"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="p-2 bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-600/80 transition-colors cursor-pointer"
              title="Cetak Laporan Estimasi Material"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Vessel specs ribbon */}
        <div className="mt-4 pt-3 border-t border-slate-700/60 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase">Pemilik Kapal</span>
            <span className="font-semibold text-slate-200 truncate block">{vessel.companyOwner || '-'}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase">Jenis &amp; Ukuran</span>
            <span className="font-semibold text-slate-200 truncate block">
              {vessel.vesselType} ({vessel.dimension})
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase">Jadwal Docking</span>
            <span className="font-semibold text-slate-200 truncate block">{schedule.dockingDate || '-'}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase">Target Selesai</span>
            <span className="font-semibold text-slate-200 truncate block">{schedule.finishWork || '-'}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase">Item Repair List</span>
            <span className="font-semibold text-emerald-300 flex items-center gap-1 font-mono">
              {workItems.length} Pekerjaan
              {onNavigateToRepairList && (
                <button
                  type="button"
                  onClick={onNavigateToRepairList}
                  className="text-[10px] underline text-emerald-400 hover:text-emerald-200 ml-1 cursor-pointer"
                >
                  (Buka)
                </button>
              )}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase">Item Terhubung Material</span>
            <span className="font-semibold text-slate-200 font-mono">
              {summary.linkedWorkItemsCount} / {workItems.length} ({Math.round((summary.linkedWorkItemsCount / Math.max(1, workItems.length)) * 100)}%)
            </span>
          </div>
        </div>
      </div>

      {/* 2. STATS & KPI HIGHLIGHTS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Cost */}
        <div className="p-3.5 bg-linear-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-emerald-800 text-[11px] font-bold uppercase tracking-wider mb-1">
            <span>Total Biaya Material</span>
            <Box className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-950 font-mono truncate">
            Rp {(summary.totalEstimatedCost / 1000000).toFixed(1)} Jt
          </div>
          <div className="text-[10px] text-emerald-700 font-medium mt-0.5">
            Rp {summary.totalEstimatedCost.toLocaleString('id-ID')}
          </div>
        </div>

        {/* Total Steel */}
        <div className="p-3.5 bg-linear-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-blue-800 text-[11px] font-bold uppercase tracking-wider mb-1">
            <span>Tonase Baja &amp; Profil</span>
            <Layers className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-lg sm:text-xl font-black text-blue-950 font-mono">
            {summary.totalSteelWeightTons.toFixed(2)} Ton
          </div>
          <div className="text-[10px] text-blue-700 font-medium mt-0.5">
            {summary.totalSteelWeightKg.toLocaleString('id-ID')} Kg Plat Lambung
          </div>
        </div>

        {/* Paint & Blasting */}
        <div className="p-3.5 bg-linear-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-amber-800 text-[11px] font-bold uppercase tracking-wider mb-1">
            <span>Cat Marine &amp; Grit</span>
            <Paintbrush className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-lg sm:text-xl font-black text-amber-950 font-mono">
            {summary.totalPaintLiters} Ltr
          </div>
          <div className="text-[10px] text-amber-700 font-medium mt-0.5">
            {Math.ceil(summary.totalPaintLiters / 20)} Pail Cat &bull; {summary.totalAbrasiveTons} Ton Grit
          </div>
        </div>

        {/* Piping & Fittings */}
        <div className="p-3.5 bg-linear-to-br from-cyan-50 to-sky-50 border border-cyan-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-cyan-800 text-[11px] font-bold uppercase tracking-wider mb-1">
            <span>Pipa &amp; Katup</span>
            <Pipette className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="text-lg sm:text-xl font-black text-cyan-950 font-mono">
            {summary.totalPipeMeters} Meter
          </div>
          <div className="text-[10px] text-cyan-700 font-medium mt-0.5">
            Seamless Sch 40/80 + Flanges
          </div>
        </div>

        {/* Anodes & Outfitting */}
        <div className="p-3.5 bg-linear-to-br from-teal-50 to-emerald-50 border border-teal-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-teal-800 text-[11px] font-bold uppercase tracking-wider mb-1">
            <span>Zinc Anode</span>
            <Shield className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-lg sm:text-xl font-black text-teal-950 font-mono">
            {summary.totalAnodesCount} Pcs
          </div>
          <div className="text-[10px] text-teal-700 font-medium mt-0.5">
            Proteksi Katodik Lambung &amp; Sea Chest
          </div>
        </div>

        {/* Procurement Readiness */}
        <div className="p-3.5 bg-linear-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-purple-800 text-[11px] font-bold uppercase tracking-wider mb-1">
            <span>Kesiapan di Yard</span>
            <Package className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-lg sm:text-xl font-black text-purple-950 font-mono">
            {summary.statusCounts['Tersedia di Yard'] || 0} / {summary.totalItemsCount}
          </div>
          <div className="text-[10px] text-purple-700 font-medium mt-0.5">
            Ready Gudang &bull; {summary.statusCounts['PO Issued'] || 0} PO Terbit
          </div>
        </div>
      </div>

      {/* 3. FILTER, SEARCH & VIEW TOOLBAR */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kode material, nama, spek, item repair list, atau supplier..."
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
              >
                &times;
              </button>
            )}
          </div>

          {/* Quick Filter Dropdowns */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Category Filter */}
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium"
            >
              <option value="all">Semua Kategori Repair List</option>
              {categories.map((c) => (
                <option key={c.id} value={c.code}>
                  Kategori {c.code}. {c.name}
                </option>
              ))}
            </select>

            {/* Classification Filter */}
            <select
              value={selectedClassificationFilter}
              onChange={(e) => setSelectedClassificationFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium"
            >
              <option value="all">Semua Jenis Material</option>
              {MATERIAL_CLASSIFICATIONS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.shortLabel}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium"
            >
              <option value="all">Semua Status Pengadaan</option>
              {MATERIAL_PROCUREMENT_STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-slate-100 p-0.5">
              <button
                type="button"
                onClick={() => setViewGrouping('by-category')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${
                  viewGrouping === 'by-category' ? 'bg-white text-emerald-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Grup Kategori
              </button>
              <button
                type="button"
                onClick={() => setViewGrouping('by-classification')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${
                  viewGrouping === 'by-classification' ? 'bg-white text-emerald-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Grup Jenis Mat
              </button>
              <button
                type="button"
                onClick={() => setViewGrouping('flat')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${
                  viewGrouping === 'flat' ? 'bg-white text-emerald-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Semua Baris
              </button>
            </div>
          </div>
        </div>

        {/* Selected Rows action bar */}
        {selectedItemIds.size > 0 && (
          <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs bg-amber-50/80 -mx-3.5 -mb-3.5 p-3 rounded-b-xl">
            <span className="text-amber-900 font-bold">
              {selectedItemIds.size} material dipilih
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBulkDelete}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus {selectedItemIds.size} Item</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedItemIds(new Set())}
                className="px-2 py-1 text-slate-600 hover:text-slate-900 font-semibold"
              >
                Batal
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. MAIN MATERIALS TABLE CONTENT */}
      {filteredMaterials.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white rounded-2xl border border-dashed border-slate-300 shadow-xs">
          <Box className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">
            {searchQuery || selectedCategoryFilter !== 'all' || selectedClassificationFilter !== 'all'
              ? 'Tidak ada material yang cocok dengan filter'
              : 'Daftar Estimasi Material Masih Kosong'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-5">
            {searchQuery || selectedCategoryFilter !== 'all'
              ? 'Coba bersihkan kata kunci pencarian atau ubah filter kategori di atas.'
              : 'Klik tombol di bawah untuk mengkalkulasi otomatis seluruh kebutuhan material dari Repair List, atau tambahkan material baru secara manual.'}
          </p>

          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => handleAutoGenerate('replace')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>⚡ Generate Estimasi dari Repair List</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingItem(null);
                setIsModalOpen(true);
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tambah Material Manual</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {viewGrouping === 'by-category' ? (
            groupedByCategory.map(([groupTitle, items]) => (
              <MaterialTableSection
                key={groupTitle}
                title={groupTitle}
                items={items}
                selectedItemIds={selectedItemIds}
                toggleSelectItem={toggleSelectItem}
                onEdit={(item) => {
                  setEditingItem(item);
                  setIsModalOpen(true);
                }}
                onDelete={(id, name) => handleDeleteItem(id, name)}
                onDuplicate={handleDuplicateItem}
                onToggleStatus={handleToggleStatus}
                getClassificationMeta={getClassificationMeta}
              />
            ))
          ) : viewGrouping === 'by-classification' ? (
            groupedByClassification.map(([groupTitle, items]) => (
              <MaterialTableSection
                key={groupTitle}
                title={groupTitle}
                items={items}
                selectedItemIds={selectedItemIds}
                toggleSelectItem={toggleSelectItem}
                onEdit={(item) => {
                  setEditingItem(item);
                  setIsModalOpen(true);
                }}
                onDelete={(id, name) => handleDeleteItem(id, name)}
                onDuplicate={handleDuplicateItem}
                onToggleStatus={handleToggleStatus}
                getClassificationMeta={getClassificationMeta}
              />
            ))
          ) : (
            <MaterialTableSection
              title={`Semua Estimasi Material Proyek (${filteredMaterials.length} Item)`}
              items={filteredMaterials}
              selectedItemIds={selectedItemIds}
              toggleSelectItem={toggleSelectItem}
              onEdit={(item) => {
                setEditingItem(item);
                setIsModalOpen(true);
              }}
              onDelete={(id, name) => handleDeleteItem(id, name)}
              onDuplicate={handleDuplicateItem}
              onToggleStatus={handleToggleStatus}
              getClassificationMeta={getClassificationMeta}
            />
          )}

          {/* Sticky Total Footer */}
          <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-xs">
              <span className="text-slate-400">
                Total Baris Ditampilkan:{' '}
                <strong className="text-white font-mono text-sm">{filteredMaterials.length} Item</strong>
              </span>
              <span className="text-slate-400">
                Total Tonase Baja:{' '}
                <strong className="text-blue-300 font-mono text-sm">
                  {filteredSummary.totalSteelWeightTons.toFixed(2)} Ton
                </strong>
              </span>
              <span className="text-slate-400">
                Total Cat:{' '}
                <strong className="text-amber-300 font-mono text-sm">
                  {filteredSummary.totalPaintLiters} Liter
                </strong>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                Grand Total Estimasi Material:
              </span>
              <span className="text-lg sm:text-xl font-black text-emerald-400 font-mono">
                Rp {filteredSummary.totalEstimatedCost.toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 5. ADD / EDIT MATERIAL MODAL */}
      <MaterialEstimationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveItem}
        initialItem={editingItem}
        workItems={workItems}
        categories={categories}
        defaultWorkItemId={selectedDefaultWorkItemId}
      />

      {/* 6. CONFIRM AUTO-GENERATE MODAL */}
      {isConfirmGenerateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Generate Estimasi dari Repair List
                </h3>
                <p className="text-xs text-slate-500">
                  Algoritma PPC akan membaca dimensi, tonase, dan jenis pekerjaan repair list.
                </p>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950 space-y-1">
              <p className="font-semibold">Otomasi yang akan dijalankan:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-slate-700">
                <li>Kalkulasi pelat baja standar (1500x6000mm) &amp; profil BKI/ABS</li>
                <li>Kebutuhan kawat las LB-52 (~2.2% berat baja) &amp; gas potong O2/LPG</li>
                <li>Kebutuhan pasir copper slag Sa 2.5 (28 kg/m²) &amp; cat epoxy primer/AF</li>
                <li>Pipa seamless ASTM A53 Sch 40, flange JIS &amp; gasket</li>
                <li>Penggantian sacrificial zinc anode dan gland packing</li>
              </ul>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => handleAutoGenerate('replace')}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Timpa Ulang / Refresh Seluruh Estimasi</span>
              </button>

              <button
                type="button"
                onClick={() => handleAutoGenerate('append')}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Tambahkan ke Daftar Saat Ini (Append)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsConfirmGenerateOpen(false)}
                className="w-full py-2 text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Sub-component for rendering a table section (grouped or flat)
interface MaterialTableSectionProps {
  title: string;
  items: ProjectMaterialEstimate[];
  selectedItemIds: Set<string>;
  toggleSelectItem: (id: string) => void;
  onEdit: (item: ProjectMaterialEstimate) => void;
  onDelete: (id: string, name: string) => void;
  onDuplicate: (item: ProjectMaterialEstimate) => void;
  onToggleStatus: (item: ProjectMaterialEstimate, newStatus: MaterialProcurementStatus) => void;
  getClassificationMeta: (cls: string) => any;
}

const MaterialTableSection: React.FC<MaterialTableSectionProps> = ({
  title,
  items,
  selectedItemIds,
  toggleSelectItem,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleStatus,
  getClassificationMeta,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const sectionCost = items.reduce((sum, i) => sum + (i.totalCost || 0), 0);
  const sectionWeightKg = items.reduce((sum, i) => sum + (i.calculatedWeightKg || 0), 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Section Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-4 py-3 bg-slate-100/80 hover:bg-slate-100 border-b border-slate-200 flex items-center justify-between cursor-pointer transition-colors select-none"
      >
        <div className="flex items-center gap-2.5">
          <button type="button" className="text-slate-500">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          <span className="font-bold text-xs sm:text-sm text-slate-900 tracking-tight">
            {title}
          </span>
          <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-bold font-mono rounded-full">
            {items.length} item
          </span>
        </div>

        <div className="flex items-center gap-3">
          {sectionWeightKg > 0 && (
            <span className="text-[11px] text-slate-600 hidden sm:inline">
              Tonase: <strong className="font-mono text-amber-900">{(sectionWeightKg / 1000).toFixed(2)} Ton</strong>
            </span>
          )}
          <span className="text-xs sm:text-sm font-extrabold text-emerald-800 font-mono">
            Rp {sectionCost.toLocaleString('id-ID')}
          </span>
        </div>
      </div>

      {/* Table */}
      {isExpanded && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/90 text-slate-600 border-b border-slate-200 text-[11px] font-bold">
                <th className="py-2.5 px-3 w-8 text-center">
                  <span className="sr-only">Pilih</span>
                </th>
                <th className="py-2.5 px-2.5 w-24">Kode</th>
                <th className="py-2.5 px-3 min-w-[240px]">Nama Material &amp; Spesifikasi Teknis</th>
                <th className="py-2.5 px-3 min-w-[200px]">Item Repair List Terkait</th>
                <th className="py-2.5 px-2.5 text-center w-24">Kebutuhan Qty</th>
                <th className="py-2.5 px-2.5 text-center w-20">Satuan</th>
                <th className="py-2.5 px-2.5 text-center w-24">Tonase (Kg)</th>
                <th className="py-2.5 px-3 text-right w-28">Harga Satuan</th>
                <th className="py-2.5 px-3 text-right w-32">Total Biaya</th>
                <th className="py-2.5 px-3 w-36 text-center">Status Pengadaan</th>
                <th className="py-2.5 px-3 w-36">Supplier / Vendor</th>
                <th className="py-2.5 px-2.5 w-20 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((mat, idx) => {
                const isSelected = selectedItemIds.has(mat.id);
                const clsMeta = getClassificationMeta(mat.classification);

                return (
                  <tr
                    key={mat.id}
                    className={`hover:bg-emerald-50/40 transition-colors group ${
                      isSelected ? 'bg-amber-50/70' : idx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-2 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectItem(mat.id)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                    </td>

                    {/* Material Code */}
                    <td className="py-2 px-2.5 font-mono font-bold text-[11px] text-slate-700">
                      {mat.materialCode}
                    </td>

                    {/* Name & Technical Spec */}
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 group-hover:text-emerald-950">
                          {mat.materialName}
                        </span>
                        {clsMeta && (
                          <span
                            className={`px-1.5 py-0.2 text-[9px] font-semibold rounded border ${clsMeta.badgeBg} ${clsMeta.badgeBorder} ${clsMeta.badgeText}`}
                          >
                            {clsMeta.shortLabel}
                          </span>
                        )}
                      </div>
                      {mat.specification && (
                        <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                          {mat.specification}
                        </div>
                      )}
                      {mat.locationOrTarget && (
                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <Tag className="w-3 h-3 text-slate-400" />
                          <span>Lokasi: {mat.locationOrTarget}</span>
                        </div>
                      )}
                    </td>

                    {/* Linked Repair Item */}
                    <td className="py-2 px-3">
                      {mat.workItemNo ? (
                        <div className="p-1.5 bg-sky-50 border border-sky-200 rounded-lg text-[11px]">
                          <div className="flex items-center gap-1">
                            <span className="px-1 py-0.2 bg-sky-600 text-white font-mono font-bold text-[9px] rounded">
                              No. {mat.workItemNo}
                            </span>
                            <span className="font-semibold text-sky-950 truncate">
                              {mat.workItemDescription || 'Item Pekerjaan'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          Umum (Seluruh Proyek)
                        </span>
                      )}
                    </td>

                    {/* Qty */}
                    <td className="py-2 px-2.5 text-center font-mono">
                      <div className="font-bold text-slate-900 text-xs">
                        {mat.totalQtyWithBuffer}
                      </div>
                      {mat.qtyBufferPercent ? (
                        <div className="text-[10px] text-slate-400">
                          Req: {mat.qtyRequired} (+{mat.qtyBufferPercent}%)
                        </div>
                      ) : null}
                    </td>

                    {/* Satuan */}
                    <td className="py-2 px-2.5 text-center">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded font-mono font-bold text-xs">
                        {mat.unit || 'pcs'}
                      </span>
                    </td>

                    {/* Weight (Kg) */}
                    <td className="py-2 px-2.5 text-center font-mono text-slate-800">
                      {mat.calculatedWeightKg && mat.calculatedWeightKg > 0 ? (
                        <span className="font-bold text-amber-950">
                          {mat.calculatedWeightKg.toLocaleString('id-ID')} kg
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* Unit Price */}
                    <td className="py-2 px-3 text-right font-mono text-slate-700">
                      Rp {mat.unitPrice.toLocaleString('id-ID')}
                      <span className="block text-[10px] text-slate-400">
                        {mat.priceBasis === 'weight' ? '/kg' : `/${mat.unit}`}
                      </span>
                    </td>

                    {/* Total Cost */}
                    <td className="py-2 px-3 text-right font-mono font-extrabold text-emerald-800 text-xs">
                      Rp {mat.totalCost.toLocaleString('id-ID')}
                    </td>

                    {/* Procurement Status dropdown */}
                    <td className="py-2 px-3 text-center">
                      <select
                        value={mat.procurementStatus}
                        onChange={(e) =>
                          onToggleStatus(mat, e.target.value as MaterialProcurementStatus)
                        }
                        className={`text-[10px] font-bold px-2 py-1 rounded-full border cursor-pointer focus:outline-hidden ${
                          mat.procurementStatus === 'Tersedia di Yard'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                            : mat.procurementStatus === 'PO Issued'
                            ? 'bg-purple-50 border-purple-300 text-purple-800'
                            : mat.procurementStatus === 'Disetujui Pimpro'
                            ? 'bg-blue-50 border-blue-300 text-blue-800'
                            : mat.procurementStatus === 'Selesai Terpasang'
                            ? 'bg-teal-50 border-teal-300 text-teal-900'
                            : 'bg-slate-100 border-slate-300 text-slate-700'
                        }`}
                      >
                        {MATERIAL_PROCUREMENT_STATUSES.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Supplier */}
                    <td className="py-2 px-3 text-slate-700 text-[11px] truncate">
                      {mat.supplierName || '-'}
                      {mat.brandOrStandard && (
                        <span className="block text-[10px] text-slate-400">
                          {mat.brandOrStandard}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-2 px-2.5 text-center">
                      <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => onEdit(mat)}
                          className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                          title="Edit Material"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDuplicate(mat)}
                          className="p-1 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                          title="Duplikat Material"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(mat.id, mat.materialName)}
                          className="p-1 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                          title="Hapus Material"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
