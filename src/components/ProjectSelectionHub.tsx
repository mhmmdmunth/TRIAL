import React, { useState, useMemo } from 'react';
import {
  Ship,
  Plus,
  Search,
  Filter,
  Calendar,
  Building2,
  Clock,
  TrendingUp,
  FolderOpen,
  Copy,
  Trash2,
  Edit3,
  ArrowRight,
  LogOut,
  LogIn,
  User,
  Shield,
  Layers,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  HardHat,
  Database,
  Anchor,
  X,
  Camera,
  Download,
  Upload
} from 'lucide-react';
import { ShipyardProject, UserProfile, VesselSpec, ProjectSchedule } from '../types';
import { projectService } from '../services/projectService';

interface ProjectSelectionHubProps {
  currentUser: UserProfile | null;
  onSelectProject: (projectId: string) => void;
  onLogout: () => void;
  onOpenLogin: () => void;
  onNotify: (msg: string) => void;
  onConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

export const ProjectSelectionHub: React.FC<ProjectSelectionHubProps> = ({
  currentUser,
  onSelectProject,
  onLogout,
  onOpenLogin,
  onNotify,
  onConfirm,
}) => {
  const [projects, setProjects] = useState<ShipyardProject[]>(() => projectService.getAllProjects());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Under Docking' | 'In Progress' | 'Preparation' | 'Completed'>('all');
  const [vesselTypeFilter, setVesselTypeFilter] = useState<'all' | 'tug' | 'barge' | 'tanker'>('all');
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState<boolean>(false);
  const [editingProject, setEditingProject] = useState<ShipyardProject | null>(null);

  // New Project Form State
  const [formData, setFormData] = useState({
    name: '',
    dimension: '25,00 x 7,50 x 3,20 Meter',
    vesselType: 'Tug Boat',
    dockingType: 'Docking Repair',
    companyOwner: 'PT. PELAYARAN NUSANTARA',
    projectNo: `F-0${Math.floor(50 + Math.random() * 40)}`,
    classification: 'BKI',
    kindOfSurvey: 'Intermediate Survey',
    dockingPosition: 'Slipway #3',
    dockingDate: 'Senin, 14 September 2026',
    undockingDate: 'Senin, 05 Oktober 2026',
    dockingDurationDays: 21,
    status: 'Preparation' as 'In Progress' | 'Under Docking' | 'Completed' | 'Preparation',
    photoUrl: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&w=600&q=80',
  });

  const refreshProjects = () => {
    setProjects([...projectService.getAllProjects()]);
  };

  // Filtered project list
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchSearch =
        p.vessel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.vessel.projectNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.vessel.companyOwner.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.vessel.vesselType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.vessel.classification.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus = statusFilter === 'all' ? true : p.schedule.status === statusFilter;

      let matchVesselType = true;
      const vt = p.vessel.vesselType.toLowerCase();
      if (vesselTypeFilter === 'tug') {
        matchVesselType = vt.includes('tug') || vt.includes('tunda');
      } else if (vesselTypeFilter === 'barge') {
        matchVesselType = vt.includes('barge') || vt.includes('tongkang');
      } else if (vesselTypeFilter === 'tanker') {
        matchVesselType = vt.includes('tanker') || vt.includes('spob');
      }

      return matchSearch && matchStatus && matchVesselType;
    });
  }, [projects, searchQuery, statusFilter, vesselTypeFilter]);

  // Overall Yard KPIs
  const kpis = useMemo(() => {
    const total = projects.length;
    const underDocking = projects.filter((p) => p.schedule.status === 'Under Docking').length;
    const inProgress = projects.filter((p) => p.schedule.status === 'In Progress').length;
    const totalEstimatedCost = projects.reduce((acc, curr) => acc + (curr.estimatedCost || 0), 0);
    return { total, underDocking, inProgress, totalEstimatedCost };
  }, [projects]);

  const handleOpenNewModal = (template?: 'tug' | 'barge' | 'tanker') => {
    if (template === 'barge') {
      setFormData({
        name: 'BG. SEJAHTERA 330',
        dimension: '100,00 x 26,00 x 6,00 Meter',
        vesselType: 'Barge / Tongkang',
        dockingType: 'Special Survey & Re-plating',
        companyOwner: 'PT. MITRA BAHARI SAMUDRA',
        projectNo: `F-0${Math.floor(60 + Math.random() * 30)}`,
        classification: 'BKI',
        kindOfSurvey: 'Special Survey No. 4 (SS-4)',
        dockingPosition: 'Slipway #2',
        dockingDate: 'Rabu, 16 September 2026',
        undockingDate: 'Rabu, 07 Oktober 2026',
        dockingDurationDays: 21,
        status: 'Preparation',
        photoUrl: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=600&q=80',
      });
    } else if (template === 'tanker') {
      setFormData({
        name: 'MT. SAMUDRA PERDANA 02',
        dimension: '88,00 x 15,00 x 7,00 Meter',
        vesselType: 'Oil Tanker 1500 DWT',
        dockingType: 'Special Survey & Cargo Tank Coating',
        companyOwner: 'PT. ENERGY MARITIM TRANSPORT',
        projectNo: `F-0${Math.floor(70 + Math.random() * 20)}`,
        classification: 'BKI',
        kindOfSurvey: 'Special Survey & Drydocking',
        dockingPosition: 'Graving Dock #1',
        dockingDate: 'Senin, 21 September 2026',
        undockingDate: 'Senin, 19 Oktober 2026',
        dockingDurationDays: 28,
        status: 'Preparation',
        photoUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=600&q=80',
      });
    } else {
      setFormData({
        name: 'TB. SAMUDRA JAYA 09',
        dimension: '26,50 x 8,00 x 3,60 Meter',
        vesselType: 'Tug Boat 2x1200 HP',
        dockingType: 'Docking Repair & Overhaul Engine',
        companyOwner: 'PT. PELAYARAN KARTIKA SAMUDRA ADIJAYA',
        projectNo: `F-0${Math.floor(50 + Math.random() * 40)}`,
        classification: 'BKI',
        kindOfSurvey: 'Intermediate Survey No. 5',
        dockingPosition: 'Slipway #1',
        dockingDate: 'Senin, 14 September 2026',
        undockingDate: 'Senin, 05 Oktober 2026',
        dockingDurationDays: 21,
        status: 'Preparation',
        photoUrl: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&w=600&q=80',
      });
    }
    setEditingProject(null);
    setIsNewProjectModalOpen(true);
  };

  const handleEditProjectModal = (proj: ShipyardProject) => {
    setEditingProject(proj);
    setFormData({
      name: proj.vessel.name,
      dimension: proj.vessel.dimension,
      vesselType: proj.vessel.vesselType,
      dockingType: proj.vessel.dockingType,
      companyOwner: proj.vessel.companyOwner,
      projectNo: proj.vessel.projectNo,
      classification: proj.vessel.classification,
      kindOfSurvey: proj.vessel.kindOfSurvey,
      dockingPosition: proj.schedule.dockingPosition,
      dockingDate: proj.schedule.dockingDate,
      undockingDate: proj.schedule.undockingDate,
      dockingDurationDays: proj.schedule.dockingDurationDays,
      status: proj.schedule.status,
      photoUrl: proj.vessel.photoUrl || '',
    });
    setIsNewProjectModalOpen(true);
  };

  const handleSaveProjectForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      onNotify('Nama kapal wajib diisi!');
      return;
    }

    if (editingProject) {
      projectService.updateProjectData(editingProject.id, {
        vessel: {
          ...editingProject.vessel,
          name: formData.name,
          dimension: formData.dimension,
          vesselType: formData.vesselType,
          dockingType: formData.dockingType,
          companyOwner: formData.companyOwner,
          projectNo: formData.projectNo,
          classification: formData.classification,
          kindOfSurvey: formData.kindOfSurvey,
          photoUrl: formData.photoUrl,
        },
        schedule: {
          ...editingProject.schedule,
          dockingPosition: formData.dockingPosition,
          dockingDate: formData.dockingDate,
          undockingDate: formData.undockingDate,
          dockingDurationDays: Number(formData.dockingDurationDays),
          status: formData.status,
        },
      });
      onNotify(`Proyek kapal ${formData.name} berhasil diperbarui.`);
    } else {
      const newProj = projectService.createProject(
        {
          name: formData.name,
          dimension: formData.dimension,
          vesselType: formData.vesselType,
          dockingType: formData.dockingType,
          companyOwner: formData.companyOwner,
          projectNo: formData.projectNo,
          classification: formData.classification,
          kindOfSurvey: formData.kindOfSurvey,
          photoUrl: formData.photoUrl,
        },
        {
          dockingPosition: formData.dockingPosition,
          dockingDate: formData.dockingDate,
          undockingDate: formData.undockingDate,
          dockingDurationDays: Number(formData.dockingDurationDays),
          status: formData.status,
        }
      );
      onNotify(`Proyek kapal baru ${newProj.vessel.name} berhasil dibuat!`);
    }

    setIsNewProjectModalOpen(false);
    refreshProjects();
  };

  const handleDuplicate = (id: string, name: string) => {
    const dup = projectService.duplicateProject(id);
    if (dup) {
      onNotify(`Proyek ${name} berhasil diduplikasi menjadi template baru.`);
      refreshProjects();
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (projects.length <= 1) {
      onNotify('Tidak dapat menghapus. Sistem membutuhkan minimal 1 proyek kapal.');
      return;
    }

    onConfirm(
      'Hapus Proyek Kapal',
      `Apakah Anda yakin ingin menghapus proyek ${name}? Seluruh data Repair List, Defect Survey, dan Estimasi Biaya pada proyek ini akan dihapus permanen.`,
      () => {
        projectService.deleteProject(id);
        onNotify(`Proyek ${name} telah dihapus.`);
        refreshProjects();
      }
    );
  };

  const formatRupiah = (val?: number) => {
    if (!val) return 'Rp 0';
    return `Rp ${val.toLocaleString('id-ID')}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'In Progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
            In Progress
          </span>
        );
      case 'Under Docking':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            Under Docking
          </span>
        );
      case 'Preparation':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
            Preparation
          </span>
        );
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
            Completed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* Top Main Navigation */}
      <header className="bg-slate-900 text-white sticky top-0 z-30 shadow-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-950/40">
              <Ship className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-wide text-white">
                  SHIPYARD SIMREP
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Projects Portal
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Portofolio &amp; Manajemen Proyek Reparasi Seluruh Kapal Galangan
              </p>
            </div>
          </div>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <>
                <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                    {currentUser.initials}
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-slate-200 leading-none">
                      {currentUser.name}
                    </div>
                    <div className="text-[10px] text-emerald-400 font-medium mt-0.5">
                      {currentUser.role} &bull; {currentUser.department}
                    </div>
                  </div>
                </div>

                <button
                  id="btn-logout"
                  onClick={onLogout}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/60 text-xs font-semibold transition-colors cursor-pointer"
                  title="Keluar dari sesi login"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Keluar</span>
                </button>
              </>
            ) : (
              <button
                id="btn-login-hub-top"
                onClick={onOpenLogin}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-colors cursor-pointer"
                title="Masuk ke Akun Galangan"
              >
                <LogIn className="w-4 h-4" />
                <span>Masuk / Login Pengguna</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Top Welcome Banner & KPI Metrics */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {currentUser ? `Selamat Datang, ${currentUser.name}` : 'Portofolio & Management Proyek Galangan Kapal'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                {currentUser
                  ? 'Pilih proyek kapal untuk membuka dokumen Repair List, kalkulator tonase, survei kerusakan, estimasi RAB, dan monitoring kurva S.'
                  : 'Pilih salah satu kapal di bawah ini untuk masuk ke langkah login dan mengelola workspace teknis proyek.'}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              {!currentUser && (
                <button
                  onClick={onOpenLogin}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <LogIn className="w-4 h-4 text-emerald-400" />
                  <span>🔑 Login Pengguna</span>
                </button>
              )}
              <button
                id="btn-create-new-project"
                onClick={() => {
                  if (!currentUser) {
                    onNotify('Silakan login terlebih dahulu untuk membuat proyek kapal baru.');
                    onOpenLogin();
                    return;
                  }
                  handleOpenNewModal('tug');
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Buat Proyek Kapal Baru</span>
              </button>
            </div>
          </div>

          {/* KPI Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
                <span>Total Armada Kapal</span>
                <Ship className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-2xl font-black text-slate-800">{kpis.total}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Kapal terdaftar di sistem</div>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80">
              <div className="flex items-center justify-between text-blue-800 text-xs font-semibold mb-1">
                <span>Sedang Naik Dok</span>
                <Anchor className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-black text-blue-900">{kpis.underDocking}</div>
              <div className="text-[11px] text-blue-700 mt-0.5">Posisi slipway / graving dock</div>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
              <div className="flex items-center justify-between text-emerald-800 text-xs font-semibold mb-1">
                <span>Pekerjaan Berjalan</span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-900">{kpis.inProgress}</div>
              <div className="text-[11px] text-emerald-700 mt-0.5">Progress tracking aktif</div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80">
              <div className="flex items-center justify-between text-amber-800 text-xs font-semibold mb-1">
                <span>Total Estimasi BOQ</span>
                <BarChart3 className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-base sm:text-lg font-black text-amber-900 truncate">
                {formatRupiah(kpis.totalEstimatedCost)}
              </div>
              <div className="text-[11px] text-amber-700 mt-0.5">Nilai kontrak &amp; RAB galangan</div>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
          {/* Top Row: Vessel Type Filters & Search */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Vessel Type Tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
                <Ship className="w-3.5 h-3.5 text-slate-400" />
                Tipe Kapal:
              </span>
              <button
                onClick={() => setVesselTypeFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  vesselTypeFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setVesselTypeFilter('tug')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  vesselTypeFilter === 'tug'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                🛥️ Tug Boat
              </button>
              <button
                onClick={() => setVesselTypeFilter('barge')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  vesselTypeFilter === 'barge'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                🚢 Barge / Tongkang
              </button>
              <button
                onClick={() => setVesselTypeFilter('tanker')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  vesselTypeFilter === 'tanker'
                    ? 'bg-amber-600 text-white font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                🛢️ Oil Tanker / SPOB
              </button>
            </div>

            {/* Search Box */}
            <div className="relative w-full lg:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama kapal, no. proyek, owner..."
                className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Bottom Row: Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 mr-1">Status:</span>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua ({projects.length})
            </button>
            <button
              onClick={() => setStatusFilter('Under Docking')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                statusFilter === 'Under Docking'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Sedang Docking ({projects.filter((p) => p.schedule.status === 'Under Docking').length})
            </button>
            <button
              onClick={() => setStatusFilter('In Progress')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                statusFilter === 'In Progress'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              In Progress ({projects.filter((p) => p.schedule.status === 'In Progress').length})
            </button>
            <button
              onClick={() => setStatusFilter('Preparation')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                statusFilter === 'Preparation'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Persiapan ({projects.filter((p) => p.schedule.status === 'Preparation').length})
            </button>
          </div>
        </div>

        {/* Project Cards Grid */}
        {filteredProjects.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Ship className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Tidak ada proyek yang cocok</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Tidak ditemukan proyek kapal dengan kata kunci atau filter status tersebut.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
              className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 cursor-pointer"
            >
              Reset Filter
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProjects.map((proj) => (
              <div
                key={proj.id}
                className="bg-white rounded-2xl border border-slate-200/90 hover:border-emerald-500/60 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between overflow-hidden group"
              >
                {/* Card Top / Vessel Photo & Status */}
                <div>
                  <div className="relative h-44 bg-slate-900 overflow-hidden">
                    {proj.vessel.photoUrl ? (
                      <img
                        src={proj.vessel.photoUrl}
                        alt={proj.vessel.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600">
                        <Ship className="w-16 h-16" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />

                    {/* Status Badge */}
                    <div className="absolute top-3 right-3">
                      {getStatusBadge(proj.schedule.status)}
                    </div>

                    {/* Classification & Project No */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-slate-900/80 backdrop-blur-md text-emerald-400 border border-emerald-500/30">
                        {proj.vessel.projectNo}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-900/80 backdrop-blur-md text-slate-200 border border-slate-700">
                        Class {proj.vessel.classification}
                      </span>
                    </div>

                    {/* Vessel Name & Owner on Image Bottom */}
                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="text-lg font-bold text-white tracking-tight truncate flex items-center gap-1.5">
                        <span>{proj.vessel.name}</span>
                      </h3>
                      <p className="text-xs text-slate-300 truncate flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="truncate">{proj.vessel.companyOwner}</span>
                      </p>
                    </div>
                  </div>

                  {/* Card Content & Technical Specs */}
                  <div className="p-4 space-y-3.5">
                    {/* Key Specs Table */}
                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Tipe Kapal</span>
                        <span className="font-semibold text-slate-700 truncate block">{proj.vessel.vesselType}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Posisi Dok</span>
                        <span className="font-semibold text-slate-700 truncate block">{proj.schedule.dockingPosition}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Dimensi Utama</span>
                        <span className="font-semibold text-slate-700 truncate block">{proj.vessel.dimension}</span>
                      </div>
                    </div>

                    {/* Docking Schedule Range */}
                    <div className="text-[11px] text-slate-600 flex items-center justify-between bg-emerald-50/60 border border-emerald-100 px-3 py-1.5 rounded-lg">
                      <span className="flex items-center gap-1 font-medium text-emerald-900">
                        <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                        {proj.schedule.dockingDate}
                      </span>
                      <span className="font-bold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200">
                        {proj.schedule.dockingDurationDays} Hari
                      </span>
                    </div>

                    {/* Progress Bar & Stats */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">Realisasi Progres</span>
                        <span className="font-bold text-emerald-700">{proj.progressPercent || 0}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(0, proj.progressPercent || 0))}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>{proj.workItems?.length || 0} Uraian Pekerjaan</span>
                        <span>{proj.defectSurveys?.length || 0} Data Kerusakan</span>
                      </div>
                    </div>

                    {/* Estimated Cost Preview */}
                    <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Estimasi RAB:</span>
                      <span className="font-bold text-slate-900 font-mono">
                        {formatRupiah(proj.estimatedCost)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="p-4 pt-0 border-t border-slate-100 flex items-center justify-between gap-2 mt-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEditProjectModal(proj)}
                      className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                      title="Edit Spesifikasi &amp; Jadwal Kapal"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDuplicate(proj.id, proj.vessel.name)}
                      className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                      title="Duplikasi Template Proyek"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(proj.id, proj.vessel.name)}
                      className="p-2 rounded-lg bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-600 transition-colors"
                      title="Hapus Proyek Kapal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Primary Enter Project Button */}
                  <button
                    id={`btn-open-project-${proj.id}`}
                    onClick={() => onSelectProject(proj.id)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer group-hover:ring-2 group-hover:ring-emerald-400/40"
                  >
                    <span>Masuk ke Proyek</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* New / Edit Project Modal */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-600 rounded-xl">
                  <Ship className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base">
                    {editingProject ? 'Edit Spesifikasi Proyek Kapal' : 'Tambah Proyek Kapal Baru'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Masukkan data spesifikasi teknis dan jadwal docking kapal
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsNewProjectModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSaveProjectForm} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Quick Template Selector */}
              {!editingProject && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-700 block mb-2">
                    Gunakan Preset Template Galangan:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenNewModal('tug')}
                      className="px-3 py-2 bg-white border border-slate-300 hover:border-emerald-500 rounded-xl text-xs font-semibold text-slate-700 hover:text-emerald-700 text-left transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>🛥️</span>
                      <div>
                        <div className="font-bold">Tug Boat</div>
                        <div className="text-[10px] text-slate-400">2x1200 HP Engine</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenNewModal('barge')}
                      className="px-3 py-2 bg-white border border-slate-300 hover:border-emerald-500 rounded-xl text-xs font-semibold text-slate-700 hover:text-emerald-700 text-left transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>🚢</span>
                      <div>
                        <div className="font-bold">Barge / Tongkang</div>
                        <div className="text-[10px] text-slate-400">300 Ft Deck Cargo</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenNewModal('tanker')}
                      className="px-3 py-2 bg-white border border-slate-300 hover:border-emerald-500 rounded-xl text-xs font-semibold text-slate-700 hover:text-emerald-700 text-left transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>🛢️</span>
                      <div>
                        <div className="font-bold">Oil Tanker / SPOB</div>
                        <div className="text-[10px] text-slate-400">1500 DWT Cargo Tank</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Kapal *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: TB. KSA BINTANG"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Proyek (Project No) *</label>
                  <input
                    type="text"
                    required
                    value={formData.projectNo}
                    onChange={(e) => setFormData({ ...formData, projectNo: e.target.value })}
                    placeholder="Contoh: F-049"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-1 focus:ring-emerald-500 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tipe Kapal</label>
                  <input
                    type="text"
                    value={formData.vesselType}
                    onChange={(e) => setFormData({ ...formData, vesselType: e.target.value })}
                    placeholder="Contoh: Tug Boat, Barge, Cargo"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Perusahaan Pemilik (Owner)</label>
                  <input
                    type="text"
                    value={formData.companyOwner}
                    onChange={(e) => setFormData({ ...formData, companyOwner: e.target.value })}
                    placeholder="PT. Pelayaran..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Dimensi Utama (P x L x T)</label>
                  <input
                    type="text"
                    value={formData.dimension}
                    onChange={(e) => setFormData({ ...formData, dimension: e.target.value })}
                    placeholder="23,97 x 7,26 x 3,00 Meter"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Biro Klasifikasi</label>
                  <select
                    value={formData.classification}
                    onChange={(e) => setFormData({ ...formData, classification: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white"
                  >
                    <option value="BKI">BKI (Biro Klasifikasi Indonesia)</option>
                    <option value="ABS">ABS (American Bureau of Shipping)</option>
                    <option value="NK">NK (ClassNK - Nippon Kaiji Kyokai)</option>
                    <option value="BV">BV (Bureau Veritas)</option>
                    <option value="LR">LR (Lloyd's Register)</option>
                    <option value="NC">Non-Class</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Posisi Dok / Slipway</label>
                  <input
                    type="text"
                    value={formData.dockingPosition}
                    onChange={(e) => setFormData({ ...formData, dockingPosition: e.target.value })}
                    placeholder="Contoh: Slipway #5 / Graving Dock 1"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status Proyek</label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as 'In Progress' | 'Under Docking' | 'Completed' | 'Preparation',
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white font-semibold"
                  >
                    <option value="Preparation">Preparation (Persiapan)</option>
                    <option value="Under Docking">Under Docking (Sedang Naik Dok)</option>
                    <option value="In Progress">In Progress (Pengerjaan Reparasi)</option>
                    <option value="Completed">Completed (Selesai)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Mulai Docking</label>
                  <input
                    type="text"
                    value={formData.dockingDate}
                    onChange={(e) => setFormData({ ...formData, dockingDate: e.target.value })}
                    placeholder="Senin, 07 September 2026"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Estimasi Undocking</label>
                  <input
                    type="text"
                    value={formData.undockingDate}
                    onChange={(e) => setFormData({ ...formData, undockingDate: e.target.value })}
                    placeholder="Kamis, 01 Oktober 2026"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white"
                  />
                </div>

                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Foto Kapal (URL / Link)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.photoUrl}
                      onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                      placeholder="https://images.unsplash.com/..."
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewProjectModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {editingProject ? 'Simpan Perubahan' : 'Buat Proyek Kapal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/90 py-4 px-6 text-center text-xs text-slate-500">
        &copy; 2026 SIMREP Enterprise &bull; Sistem Terpadu Galangan Kapal Indonesia.
      </footer>
    </div>
  );
};
