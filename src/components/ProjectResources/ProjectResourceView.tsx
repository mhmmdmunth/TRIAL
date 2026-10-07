import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Box,
  Users,
  Flame,
  Wrench,
  ShieldCheck,
  Building,
  Plus,
  Search,
  Filter,
  Download,
  Printer,
  Sparkles,
  Calculator,
  RefreshCw,
  Edit2,
  Trash2,
  Copy,
  TrendingUp,
  DollarSign,
  Layers,
  ArrowUpDown,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Sliders,
  ChevronDown,
} from 'lucide-react';
import { ProjectResourceItem, ResourceCategory, WorkItem, VesselSpec, WorkCategory } from '../../types';
import {
  RESOURCE_CATEGORIES,
  RESOURCE_STATUSES,
  calculateResourceSummary,
  projectResourceService,
} from '../../services/projectResourceService';
import { ProjectResourceModal } from './ProjectResourceModal';
import { QuickCalculatorsModal } from './QuickCalculatorsModal';

interface ProjectResourceViewProps {
  projectId: string;
  vessel: VesselSpec;
  workItems: WorkItem[];
  categories: WorkCategory[];
  totalRabCost?: number; // Total Penawaran RAB from cost estimation tab for gross profit comparison
}

export const ProjectResourceView: React.FC<ProjectResourceViewProps> = ({
  projectId,
  vessel,
  workItems,
  categories,
  totalRabCost = 0,
}) => {
  // Resources state
  const [resources, setResources] = useState<ProjectResourceItem[]>(() =>
    projectResourceService.getResources(projectId)
  );

  // Filter & Search states
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'cost-desc' | 'cost-asc' | 'name' | 'category'>('cost-desc');
  const [contingencyPercent, setContingencyPercent] = useState<number>(10);

  // Modals state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProjectResourceItem | null>(null);
  const [isCalcModalOpen, setIsCalcModalOpen] = useState(false);
  const [presetDropdownOpen, setPresetDropdownOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // In-app confirmation dialog state (safe for iframes)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    isDanger?: boolean;
    onConfirm: () => void;
  } | null>(null);

  // Calculate live summary
  const summary = useMemo(() => {
    return calculateResourceSummary(resources, contingencyPercent);
  }, [resources, contingencyPercent]);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Save changes wrapper
  const handleSaveResource = (
    itemData: Omit<ProjectResourceItem, 'id' | 'projectId' | 'totalCost'>,
    editId?: string
  ) => {
    if (editId) {
      const existing = resources.find((r) => r.id === editId);
      if (existing) {
        const updated: ProjectResourceItem = {
          ...existing,
          ...itemData,
          id: editId,
          projectId,
        };
        projectResourceService.updateResource(projectId, updated);
        setResources(projectResourceService.getResources(projectId));
        showNotification('Item kebutuhan berhasil diperbarui.');
      }
    } else {
      projectResourceService.addResource(projectId, itemData);
      setResources(projectResourceService.getResources(projectId));
      showNotification('Kebutuhan proyek baru berhasil ditambahkan.');
    }
  };

  const handleDeleteResource = (id: string) => {
    const target = resources.find((r) => r.id === id);
    setConfirmDialog({
      isOpen: true,
      title: 'Hapus Item Kebutuhan',
      message: `Yakin ingin menghapus item "${target?.name || 'kebutuhan'}" dari daftar estimasi?`,
      confirmText: 'Hapus Item',
      isDanger: true,
      onConfirm: () => {
        projectResourceService.deleteResource(projectId, id);
        setResources(projectResourceService.getResources(projectId));
        showNotification('Item kebutuhan telah dihapus.');
        setConfirmDialog(null);
      },
    });
  };

  const handleDuplicateResource = (item: ProjectResourceItem) => {
    const { id, projectId: pId, totalCost, createdAt, updatedAt, ...rest } = item;
    projectResourceService.addResource(projectId, {
      ...rest,
      name: `${rest.name} (Copy)`,
    });
    setResources(projectResourceService.getResources(projectId));
    showNotification(`Item "${item.name}" berhasil diduplikat.`);
  };

  const handleStatusChange = (id: string, newStatus: any) => {
    const target = resources.find((r) => r.id === id);
    if (target) {
      projectResourceService.updateResource(projectId, {
        ...target,
        status: newStatus,
      });
      setResources(projectResourceService.getResources(projectId));
    }
  };

  // Auto Generate from Work Items
  const handleAutoGenerate = () => {
    if (resources.length > 0) {
      setConfirmDialog({
        isOpen: true,
        title: 'Generate Cerdas dari Repair List',
        message:
          'Analisis cerdas akan meregenerasi kebutuhan material, tenaga kerja & consumables berdasarkan repair list saat ini. Data saat ini akan digantikan. Lanjutkan?',
        confirmText: 'Ya, Generate Kebutuhan',
        isDanger: false,
        onConfirm: () => {
          const generated = projectResourceService.generateFromWorkItems(projectId, workItems);
          setResources(generated);
          showNotification('Berhasil mengenerate estimasi kebutuhan dari scope Repair List!');
          setConfirmDialog(null);
        },
      });
      return;
    }
    const generated = projectResourceService.generateFromWorkItems(projectId, workItems);
    setResources(generated);
    showNotification('Berhasil mengenerate estimasi kebutuhan dari scope Repair List!');
  };

  // Load Preset
  const handleLoadPreset = (type: 'standard' | 'clean') => {
    setPresetDropdownOpen(false);
    if (type === 'standard') {
      if (resources.length > 0) {
        setConfirmDialog({
          isOpen: true,
          title: 'Muat Preset Standar Reparasi',
          message:
            'Muat preset standar reparasi galangan kapal? Seluruh item kebutuhan saat ini akan digantikan dengan konfigurasi standar kapal.',
          confirmText: 'Muat Preset',
          isDanger: false,
          onConfirm: () => {
            const preset = projectResourceService.getStandardDockingPreset(projectId);
            projectResourceService.saveResources(projectId, preset);
            setResources(preset);
            showNotification('Preset standar reparasi galangan kapal berhasil dimuat.');
            setConfirmDialog(null);
          },
        });
        return;
      }
      const preset = projectResourceService.getStandardDockingPreset(projectId);
      projectResourceService.saveResources(projectId, preset);
      setResources(preset);
      showNotification('Preset standar reparasi galangan kapal berhasil dimuat.');
    } else if (type === 'clean') {
      setConfirmDialog({
        isOpen: true,
        title: 'Kosongkan Seluruh Daftar Kebutuhan',
        message: `Apakah Anda yakin ingin mengosongkan seluruh (${resources.length}) item kebutuhan pada proyek ini? Tindakan ini akan mereset seluruh material, tenaga kerja, consumables, dan peralatan.`,
        confirmText: 'Ya, Kosongkan Semua',
        isDanger: true,
        onConfirm: () => {
          projectResourceService.clearAllResources(projectId);
          setResources([]);
          showNotification('Seluruh daftar kebutuhan proyek telah dikosongkan.');
          setConfirmDialog(null);
        },
      });
    }
  };

  // Quick batch append from calculator
  const handleAddFromCalculator = (
    items: Omit<ProjectResourceItem, 'id' | 'projectId' | 'totalCost'>[]
  ) => {
    items.forEach((item) => {
      projectResourceService.addResource(projectId, item);
    });
    setResources(projectResourceService.getResources(projectId));
    showNotification(`${items.length} item dari kalkulator berhasil ditambahkan ke estimasi.`);
  };

  // Export to Excel / CSV
  const handleExportCsv = () => {
    projectResourceService.exportToCsv(resources, vessel, summary);
  };

  // Native Print
  const handlePrint = () => {
    window.print();
  };

  // Filter & Sort Resources
  const filteredResources = useMemo(() => {
    return resources
      .filter((item) => {
        // Category Filter
        if (activeCategoryFilter !== 'all' && item.category !== activeCategoryFilter) {
          return false;
        }
        // Status Filter
        if (statusFilter !== 'all' && item.status !== statusFilter) {
          return false;
        }
        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = (item.name || '').toLowerCase().includes(q);
          const matchCode = (item.code || '').toLowerCase().includes(q);
          const matchSpec = (item.specOrRole || '').toLowerCase().includes(q);
          const matchSub = (item.supplierOrSubcont || '').toLowerCase().includes(q);
          const matchRemarks = (item.remarks || '').toLowerCase().includes(q);
          if (!matchName && !matchCode && !matchSpec && !matchSub && !matchRemarks) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'cost-desc') return (b.totalCost || 0) - (a.totalCost || 0);
        if (sortBy === 'cost-asc') return (a.totalCost || 0) - (b.totalCost || 0);
        if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
        if (sortBy === 'category') return (a.category || '').localeCompare(b.category || '');
        return 0;
      });
  }, [resources, activeCategoryFilter, statusFilter, searchQuery, sortBy]);

  // Margin / Profit calculations if totalRabCost exists
  const grossProfitAmount = totalRabCost > 0 ? totalRabCost - summary.finalProjectBudget : 0;
  const grossMarginPercent = totalRabCost > 0 ? (grossProfitAmount / totalRabCost) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-16 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-bold flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* TOP KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-2.5">
        {/* TOTAL BUDGET PROJECT */}
        <div className="col-span-2 p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white shadow-md relative overflow-hidden border border-slate-800">
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  Total Anggaran Kebutuhan Proyek
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  +{contingencyPercent}% Buffer
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white mt-1">
                Rp {summary.finalProjectBudget.toLocaleString('id-ID')}
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>Dasar: Rp {summary.grandTotalResourceCost.toLocaleString('id-ID')}</span>
              <span className="text-emerald-400 font-semibold font-mono">
                {resources.length} Item Kebutuhan
              </span>
            </div>
          </div>
        </div>

        {/* MATERIAL */}
        <div className="p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <Box className="w-3.5 h-3.5 text-emerald-600" />
              Material Utama
            </span>
            <span className="text-[10px] font-bold font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-md">
              {summary.itemCountByCategory.material} item
            </span>
          </div>
          <div className="text-sm sm:text-base font-bold font-mono text-slate-900 truncate">
            Rp {(summary.totalMaterialCost / 1000000).toFixed(1)} Jt
          </div>
          <div className="text-[10px] text-slate-500 mt-1 truncate">
            Tonase: <strong>{(summary.totalMaterialTonnageKg / 1000).toFixed(2)} Ton</strong>
          </div>
        </div>

        {/* MAN POWER */}
        <div className="p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-blue-600" />
              Tenaga Kerja
            </span>
            <span className="text-[10px] font-bold font-mono text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded-md">
              {summary.itemCountByCategory.manpower} tim
            </span>
          </div>
          <div className="text-sm sm:text-base font-bold font-mono text-slate-900 truncate">
            Rp {(summary.totalManpowerCost / 1000000).toFixed(1)} Jt
          </div>
          <div className="text-[10px] text-slate-500 mt-1 truncate">
            Total: <strong>{summary.totalMandays} Mandays</strong>
          </div>
        </div>

        {/* CONSUMABLES */}
        <div className="p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-600" />
              Consumables
            </span>
            <span className="text-[10px] font-bold font-mono text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded-md">
              {summary.itemCountByCategory.consumable} item
            </span>
          </div>
          <div className="text-sm sm:text-base font-bold font-mono text-slate-900 truncate">
            Rp {(summary.totalConsumableCost / 1000000).toFixed(1)} Jt
          </div>
          <div className="text-[10px] text-slate-500 mt-1 truncate">
            Kawat las, gas, pasir, APD
          </div>
        </div>

        {/* EQUIPMENT & SUBCONT */}
        <div className="p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <Wrench className="w-3.5 h-3.5 text-indigo-600" />
              Alat &amp; Subcont
            </span>
            <span className="text-[10px] font-bold font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded-md">
              {summary.itemCountByCategory.equipment + summary.itemCountByCategory.subcont} item
            </span>
          </div>
          <div className="text-sm sm:text-base font-bold font-mono text-slate-900 truncate">
            Rp {((summary.totalEquipmentCost + summary.totalSubcontCost) / 1000000).toFixed(1)} Jt
          </div>
          <div className="text-[10px] text-slate-500 mt-1 truncate">
            Crane, kompresor, NDT UTM
          </div>
        </div>
      </div>

      {/* COST BREAKDOWN PROPORTIONAL BAR */}
      {summary.grandTotalResourceCost > 0 && (
        <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Distribusi Proporsi Biaya Kebutuhan Proyek
            </span>
            <span className="text-slate-400 text-[11px]">
              Kebutuhan Dasar: <strong>Rp {summary.grandTotalResourceCost.toLocaleString('id-ID')}</strong>
            </span>
          </div>

          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
            {summary.totalMaterialCost > 0 && (
              <div
                style={{ width: `${(summary.totalMaterialCost / summary.grandTotalResourceCost) * 100}%` }}
                className="bg-emerald-500 h-full transition-all"
                title={`Material: Rp ${summary.totalMaterialCost.toLocaleString('id-ID')} (${(
                  (summary.totalMaterialCost / summary.grandTotalResourceCost) *
                  100
                ).toFixed(1)}%)`}
              />
            )}
            {summary.totalManpowerCost > 0 && (
              <div
                style={{ width: `${(summary.totalManpowerCost / summary.grandTotalResourceCost) * 100}%` }}
                className="bg-blue-500 h-full transition-all"
                title={`Man Power: Rp ${summary.totalManpowerCost.toLocaleString('id-ID')} (${(
                  (summary.totalManpowerCost / summary.grandTotalResourceCost) *
                  100
                ).toFixed(1)}%)`}
              />
            )}
            {summary.totalConsumableCost > 0 && (
              <div
                style={{ width: `${(summary.totalConsumableCost / summary.grandTotalResourceCost) * 100}%` }}
                className="bg-amber-500 h-full transition-all"
                title={`Consumables: Rp ${summary.totalConsumableCost.toLocaleString('id-ID')} (${(
                  (summary.totalConsumableCost / summary.grandTotalResourceCost) *
                  100
                ).toFixed(1)}%)`}
              />
            )}
            {summary.totalEquipmentCost > 0 && (
              <div
                style={{ width: `${(summary.totalEquipmentCost / summary.grandTotalResourceCost) * 100}%` }}
                className="bg-indigo-500 h-full transition-all"
                title={`Equipment: Rp ${summary.totalEquipmentCost.toLocaleString('id-ID')} (${(
                  (summary.totalEquipmentCost / summary.grandTotalResourceCost) *
                  100
                ).toFixed(1)}%)`}
              />
            )}
            {summary.totalSubcontCost > 0 && (
              <div
                style={{ width: `${(summary.totalSubcontCost / summary.grandTotalResourceCost) * 100}%` }}
                className="bg-purple-500 h-full transition-all"
                title={`Subcont: Rp ${summary.totalSubcontCost.toLocaleString('id-ID')} (${(
                  (summary.totalSubcontCost / summary.grandTotalResourceCost) *
                  100
                ).toFixed(1)}%)`}
              />
            )}
            {summary.totalOverheadCost > 0 && (
              <div
                style={{ width: `${(summary.totalOverheadCost / summary.grandTotalResourceCost) * 100}%` }}
                className="bg-slate-500 h-full transition-all"
                title={`Overhead: Rp ${summary.totalOverheadCost.toLocaleString('id-ID')} (${(
                  (summary.totalOverheadCost / summary.grandTotalResourceCost) *
                  100
                ).toFixed(1)}%)`}
              />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600 pt-0.5">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Material:{' '}
              <strong className="text-slate-900">
                {((summary.totalMaterialCost / summary.grandTotalResourceCost) * 100).toFixed(0)}%
              </strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              Tenaga Kerja:{' '}
              <strong className="text-slate-900">
                {((summary.totalManpowerCost / summary.grandTotalResourceCost) * 100).toFixed(0)}%
              </strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              Consumables:{' '}
              <strong className="text-slate-900">
                {((summary.totalConsumableCost / summary.grandTotalResourceCost) * 100).toFixed(0)}%
              </strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              Alat &amp; Mesin:{' '}
              <strong className="text-slate-900">
                {((summary.totalEquipmentCost / summary.grandTotalResourceCost) * 100).toFixed(0)}%
              </strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              Subcont:{' '}
              <strong className="text-slate-900">
                {((summary.totalSubcontCost / summary.grandTotalResourceCost) * 100).toFixed(0)}%
              </strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
              Overhead Galangan:{' '}
              <strong className="text-slate-900">
                {((summary.totalOverheadCost / summary.grandTotalResourceCost) * 100).toFixed(0)}%
              </strong>
            </span>
          </div>
        </div>
      )}

      {/* PROFIT MARGIN COMPARISON BAR (IF RAB IS AVAILABLE) */}
      {totalRabCost > 0 && (
        <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-2xs">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-emerald-950 block">
                Analisis Estimasi Laba Kotor Proyek (RAB Penawaran vs Modal Kebutuhan)
              </span>
              <span className="text-[11px] text-emerald-800/80">
                Penawaran RAB: <strong>Rp {totalRabCost.toLocaleString('id-ID')}</strong> | Anggaran Kebutuhan:{' '}
                <strong>Rp {summary.finalProjectBudget.toLocaleString('id-ID')}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">
                Estimasi Laba Kotor (Gross Profit)
              </span>
              <span
                className={`text-sm sm:text-base font-bold font-mono ${
                  grossProfitAmount >= 0 ? 'text-emerald-700' : 'text-red-600'
                }`}
              >
                Rp {grossProfitAmount.toLocaleString('id-ID')} ({grossMarginPercent.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ACTION TOOLBAR */}
      <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Add New Button */}
          <button
            type="button"
            onClick={() => {
              setEditingItem(null);
              setIsAddEditModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-900/10 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Kebutuhan</span>
          </button>

          {/* Quick Engineering Calculator Button */}
          <button
            type="button"
            onClick={() => setIsCalcModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition-colors cursor-pointer shadow-2xs"
          >
            <Calculator className="w-4 h-4 text-amber-600" />
            <span>Kalkulator Rasio Lapangan</span>
          </button>

          {/* Smart Auto Generate from Repair List */}
          <button
            type="button"
            onClick={handleAutoGenerate}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-300 transition-colors cursor-pointer shadow-2xs"
            title="Analisis otomatis seluruh item pekerjaan (baja, cat, pipa) dan buat daftar kebutuhan"
          >
            <Sparkles className="w-4 h-4 text-sky-600" />
            <span>⚡ Generate Cerdas dari Repair List</span>
          </button>

          {/* Preset Selector Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setPresetDropdownOpen(!presetDropdownOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 transition-colors cursor-pointer"
            >
              <Layers className="w-4 h-4 text-slate-500" />
              <span>Muat Preset</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {presetDropdownOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-64 bg-white rounded-xl border border-slate-200 shadow-xl py-1 z-30 animate-in fade-in duration-100">
                <button
                  type="button"
                  onClick={() => handleLoadPreset('standard')}
                  className="w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 text-slate-800 font-medium flex items-center justify-between"
                >
                  <span>Preset Standar Reparasi Galangan</span>
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.2 rounded">
                    Lengkap
                  </span>
                </button>
                <div className="my-1 border-t border-slate-100" />
                <button
                  type="button"
                  onClick={() => handleLoadPreset('clean')}
                  className="w-full text-left px-3.5 py-2 text-xs hover:bg-red-50 text-red-600 font-semibold flex items-center justify-between group transition-colors rounded-lg cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Trash2 className="w-3.5 h-3.5 text-red-500 group-hover:scale-110 transition-transform" />
                    <span>Kosongkan Seluruh Daftar</span>
                  </span>
                  <span className="text-[10px] text-red-500 font-medium bg-red-100/60 group-hover:bg-red-200/60 px-1.5 py-0.5 rounded">
                    Reset
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Export to Excel */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs transition-colors cursor-pointer"
            title="Download file CSV untuk dibuka di Microsoft Excel"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Ekspor Excel</span>
          </button>

          {/* Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs transition-colors cursor-pointer"
            title="Cetak format rekapitulasi kebutuhan proyek"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span className="hidden sm:inline">Cetak</span>
          </button>
        </div>
      </div>

      {/* CATEGORY TABS NAVIGATION */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveCategoryFilter('all')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs transition-all whitespace-nowrap cursor-pointer ${
            activeCategoryFilter === 'all'
              ? 'bg-slate-900 text-white font-bold shadow-xs'
              : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Semua Kebutuhan</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
              activeCategoryFilter === 'all' ? 'bg-slate-800 text-emerald-300' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {resources.length}
          </span>
        </button>

        {RESOURCE_CATEGORIES.map((cat) => {
          const count = summary.itemCountByCategory[cat.id] || 0;
          let subtotal = 0;
          if (cat.id === 'material') subtotal = summary.totalMaterialCost;
          else if (cat.id === 'manpower') subtotal = summary.totalManpowerCost;
          else if (cat.id === 'consumable') subtotal = summary.totalConsumableCost;
          else if (cat.id === 'equipment') subtotal = summary.totalEquipmentCost;
          else if (cat.id === 'subcont') subtotal = summary.totalSubcontCost;
          else if (cat.id === 'overhead') subtotal = summary.totalOverheadCost;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategoryFilter(cat.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs transition-all whitespace-nowrap cursor-pointer ${
                activeCategoryFilter === cat.id
                  ? 'bg-slate-900 text-white font-bold shadow-xs'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
              }`}
            >
              {cat.id === 'material' && <Box className="w-3.5 h-3.5 text-emerald-500" />}
              {cat.id === 'manpower' && <Users className="w-3.5 h-3.5 text-blue-500" />}
              {cat.id === 'consumable' && <Flame className="w-3.5 h-3.5 text-amber-500" />}
              {cat.id === 'equipment' && <Wrench className="w-3.5 h-3.5 text-indigo-500" />}
              {cat.id === 'subcont' && <ShieldCheck className="w-3.5 h-3.5 text-purple-500" />}
              {cat.id === 'overhead' && <Building className="w-3.5 h-3.5 text-slate-500" />}
              <span>{cat.shortLabel}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  activeCategoryFilter === cat.id
                    ? 'bg-slate-800 text-emerald-300'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari kebutuhan, spesifikasi, kode, atau vendor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-hidden"
            >
              <option value="all">Semua Status</option>
              {RESOURCE_STATUSES.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500">Urutkan:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-hidden"
            >
              <option value="cost-desc">Biaya Terbesar</option>
              <option value="cost-asc">Biaya Terkecil</option>
              <option value="name">Nama Kebutuhan</option>
              <option value="category">Kategori</option>
            </select>
          </div>
        </div>
      </div>

      {/* RESOURCES TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 select-none">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">No</th>
                <th className="py-2.5 px-3 w-28">Kategori</th>
                <th className="py-2.5 px-3 w-24">Kode</th>
                <th className="py-2.5 px-3">Nama Kebutuhan &amp; Spesifikasi</th>
                <th className="py-2.5 px-3 text-right w-24">Kuantitas</th>
                <th className="py-2.5 px-3 text-center w-20">Satuan</th>
                <th className="py-2.5 px-3 text-right">Harga Satuan</th>
                <th className="py-2.5 px-3 text-right">Total Biaya (Rp)</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3">Vendor / Supplier</th>
                <th className="py-2.5 px-3 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal text-slate-800">
              {filteredResources.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <Boxes className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">Tidak ada item kebutuhan ditemukan</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Gunakan tombol "Tambah Kebutuhan" atau "Generate Cerdas dari Repair List" untuk mengisi data.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredResources.map((item, idx) => {
                  const catDef = RESOURCE_CATEGORIES.find((c) => c.id === item.category);
                  const isManpower = item.category === 'manpower';

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* No */}
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>

                      {/* Category Badge */}
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            catDef?.badgeBg || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {item.category === 'material' && <Box className="w-3 h-3" />}
                          {item.category === 'manpower' && <Users className="w-3 h-3" />}
                          {item.category === 'consumable' && <Flame className="w-3 h-3" />}
                          {item.category === 'equipment' && <Wrench className="w-3 h-3" />}
                          {item.category === 'subcont' && <ShieldCheck className="w-3 h-3" />}
                          {item.category === 'overhead' && <Building className="w-3 h-3" />}
                          <span>{catDef?.shortLabel || item.category}</span>
                        </span>
                      </td>

                      {/* Code */}
                      <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                        {item.code || '-'}
                      </td>

                      {/* Name & Spec */}
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900">{item.name}</div>
                        {item.specOrRole && (
                          <div className="text-[11px] text-slate-500 font-normal line-clamp-1 mt-0.5">
                            {item.specOrRole}
                          </div>
                        )}
                        {item.remarks && (
                          <div className="text-[10px] text-amber-700 italic line-clamp-1">
                            Ket: {item.remarks}
                          </div>
                        )}
                      </td>

                      {/* Quantity */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {isManpower && item.headcount && item.workDays ? (
                          <div>
                            <span>{item.headcount * item.workDays}</span>
                            <div className="text-[10px] text-slate-500 font-normal">
                              ({item.headcount} Org × {item.workDays} Hr)
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span>{item.qty}</span>
                            {item.weightKg ? (
                              <div className="text-[10px] text-slate-400">({item.weightKg} kg)</div>
                            ) : null}
                          </div>
                        )}
                      </td>

                      {/* Satuan */}
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-800 border border-slate-200 rounded font-mono font-bold text-xs">
                          {isManpower ? 'mandays' : (item.unit || '-')}
                        </span>
                      </td>

                      {/* Unit Price */}
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        Rp {item.unitPrice.toLocaleString('id-ID')}
                        <span className="text-[10px] text-slate-400 block font-sans">
                          /{item.category === 'manpower' ? 'manday' : item.unit}
                        </span>
                      </td>

                      {/* Total Cost */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        Rp {(item.totalCost || 0).toLocaleString('id-ID')}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 text-center">
                        <select
                          value={item.status || 'Rencana'}
                          onChange={(e) => handleStatusChange(item.id, e.target.value)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border cursor-pointer ${
                            item.status === 'Approved'
                              ? 'bg-sky-50 text-sky-800 border-sky-300'
                              : item.status === 'PO Issued'
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : item.status === 'On Yard'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : item.status === 'Terpakai'
                              ? 'bg-indigo-50 text-indigo-800 border-indigo-300'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          {RESOURCE_STATUSES.map((st) => (
                            <option key={st.id} value={st.id}>
                              {st.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Vendor / Supplier */}
                      <td className="py-2.5 px-3 text-slate-600 text-[11px] truncate max-w-[150px]">
                        {item.supplierOrSubcont || '-'}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingItem(item);
                              setIsAddEditModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                            title="Edit rincian item ini"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicateResource(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Duplikat item ini"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteResource(item.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Hapus item ini"
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

            {/* Table Footer Summary */}
            {filteredResources.length > 0 && (
              <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200 text-slate-900">
                <tr>
                  <td colSpan={6} className="py-3 px-3 text-right">
                    SUBTOTAL KEBUTUHAN TERPILIH ({filteredResources.length} Item):
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-sm text-emerald-800 font-black">
                    Rp{' '}
                    {filteredResources
                      .reduce((acc, cur) => acc + (cur.totalCost || 0), 0)
                      .toLocaleString('id-ID')}
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* BOTTOM CONTINGENCY & RECAPITULATION CARD */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-600" />
              <span>Konfigurasi Buffer Kontingensi &amp; Rekapitulasi Proyek</span>
            </h4>
            <p className="text-xs text-slate-500">
              Antisipasi fluktuasi harga material, jam kerja lembur, atau penambahan kebutuhan tak terduga.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-700">Persentase Kontingensi:</span>
            <div className="flex items-center gap-1.5">
              {[5, 10, 15, 20].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setContingencyPercent(pct)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    contingencyPercent === pct
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {pct}%
                </button>
              ))}
              <div className="flex items-center ml-1">
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={contingencyPercent}
                  onChange={(e) => setContingencyPercent(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-14 px-2 py-1 text-xs font-bold text-center border border-slate-300 rounded-lg"
                />
                <span className="text-xs font-bold ml-1 text-slate-600">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Steps Calculation Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <span className="text-slate-500 block">1. Total Kebutuhan Dasar (Direct Costs):</span>
            <strong className="text-base font-mono text-slate-900 block mt-1">
              Rp {summary.grandTotalResourceCost.toLocaleString('id-ID')}
            </strong>
            <span className="text-[10px] text-slate-400">Material + SDM + Consumables + Alat</span>
          </div>

          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs">
            <span className="text-amber-800 block">
              2. Buffer Kontingensi Proyek ({contingencyPercent}%):
            </span>
            <strong className="text-base font-mono text-amber-900 block mt-1">
              Rp {summary.contingencyAmount.toLocaleString('id-ID')}
            </strong>
            <span className="text-[10px] text-amber-700/80">Buffer risiko &amp; variasi lapangan</span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-600 text-white text-xs shadow-md shadow-emerald-900/10">
            <span className="text-emerald-100 block font-medium">
              3. TOTAL ESTIMASI ANGGARAN KEBUTUHAN:
            </span>
            <strong className="text-base sm:text-lg font-mono font-black block mt-1 text-white">
              Rp {summary.finalProjectBudget.toLocaleString('id-ID')}
            </strong>
            <span className="text-[10px] text-emerald-200">Siap diajukan ke Manajemen &amp; Proyek</span>
          </div>
        </div>
      </div>

      {/* Add / Edit Resource Modal */}
      <ProjectResourceModal
        isOpen={isAddEditModalOpen}
        onClose={() => {
          setIsAddEditModalOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSaveResource}
        initialItem={editingItem}
        projectId={projectId}
      />

      {/* Field Engineering Calculator Modal */}
      <QuickCalculatorsModal
        isOpen={isCalcModalOpen}
        onClose={() => setIsCalcModalOpen(false)}
        onAddGeneratedResources={handleAddFromCalculator}
      />

      {/* In-app Confirmation Modal (Iframe Safe) */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div
                className={`p-2.5 rounded-xl shrink-0 ${
                  confirmDialog.isDanger
                    ? 'bg-red-100 text-red-600'
                    : 'bg-emerald-100 text-emerald-600'
                }`}
              >
                {confirmDialog.isDanger ? (
                  <AlertCircle className="w-5 h-5" />
                ) : (
                  <Layers className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-900 leading-tight">
                  {confirmDialog.title}
                </h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  {confirmDialog.message}
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className={`px-4 py-2 text-xs font-bold rounded-xl text-white shadow-sm transition-all cursor-pointer ${
                  confirmDialog.isDanger
                    ? 'bg-red-600 hover:bg-red-700 shadow-red-900/10'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/10'
                }`}
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
