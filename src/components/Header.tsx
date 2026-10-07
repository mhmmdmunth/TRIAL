import React, { useState, useRef, useEffect } from 'react';
import {
  Ship,
  FileText,
  Database,
  PlusCircle,
  Clock,
  CheckCircle2,
  CloudOff,
  Cloud,
  Layers,
  FileSpreadsheet,
  Calculator,
  Camera,
  TrendingUp,
  Building2,
  RefreshCw,
  Check,
  FileDown,
  FileUp,
  ChevronDown,
  Download,
  FileCode,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  UploadCloud,
  Layers3,
  LogOut,
  User,
  FolderOpen,
  ClipboardCheck,
  Box,
} from 'lucide-react';
import { VesselSpec, ProjectSchedule, CostSummary, UserProfile, ShipyardProject } from '../types';

interface HeaderProps {
  vessel: VesselSpec;
  schedule: ProjectSchedule;
  costSummary: CostSummary;
  surveyCount: number;
  unsyncedSurveyCount: number;
  totalWorkItemsCount?: number;
  saveStatus?: 'saved' | 'saving' | 'syncing';
  lastSavedTime?: Date | null;
  activeTab: 'repair-list' | 'material-estimation' | 'plan-vs-actual' | 'opname' | 'defect-surveys' | 'cost-estimation';
  setActiveTab: (tab: 'repair-list' | 'material-estimation' | 'plan-vs-actual' | 'opname' | 'defect-surveys' | 'cost-estimation') => void;
  materialEstimateCount?: number;
  materialEstimateCost?: number;
  onOpenAddSurvey: () => void;
  onOpenPdfModal: () => void;
  onExportExcel: () => void;
  onOpenSqliteModal: () => void;
  onOpenVesselModal: () => void;
  onSyncAll: () => void;
  onOpenExportImportModal: (tab?: 'export' | 'import') => void;
  onQuickExportWord?: () => void;
  onQuickExportPdf?: () => void;
  onDownloadTemplate?: () => void;
  currentUser?: UserProfile | null;
  onBackToProjects?: () => void;
  onLogout?: () => void;
  onSwitchProject?: (projectId: string) => void;
  allProjects?: ShipyardProject[];
  currentProjectId?: string;
  onManualSave?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  vessel,
  schedule,
  costSummary,
  surveyCount,
  unsyncedSurveyCount,
  totalWorkItemsCount = 0,
  saveStatus = 'saved',
  lastSavedTime,
  activeTab,
  setActiveTab,
  materialEstimateCount,
  materialEstimateCost,
  onOpenAddSurvey,
  onOpenPdfModal,
  onExportExcel,
  onOpenSqliteModal,
  onOpenVesselModal,
  onSyncAll,
  onOpenExportImportModal,
  onQuickExportWord,
  onQuickExportPdf,
  onDownloadTemplate,
  currentUser,
  onBackToProjects,
  onLogout,
  onSwitchProject,
  allProjects = [],
  currentProjectId,
  onManualSave,
}) => {
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setIsProjectDropdownOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  return (
    <header className="bg-white border-b border-slate-200/90 sticky top-0 z-30 shadow-xs w-full backdrop-blur-md bg-white/95">
      {/* Super Top Hub Bar: Project Navigation & User Session */}
      <div className="bg-slate-900 text-white px-2.5 sm:px-4 py-1.5 flex items-center justify-between text-xs border-b border-slate-800">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Back to Project Portfolio Hub Button */}
          {onBackToProjects && (
            <button
              id="btn-back-to-projects-hub"
              onClick={onBackToProjects}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-700/80 hover:bg-emerald-600 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer ring-1 ring-emerald-500/40"
              title="Kembali ke Dashboard Portofolio Seluruh Kapal Galangan"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Semua Proyek Kapal</span>
            </button>
          )}

          {/* Quick Project Switcher Dropdown */}
          {allProjects.length > 1 && onSwitchProject && (
            <div className="relative" ref={projectDropdownRef}>
              <button
                onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                title="Ganti Proyek Kapal Aktif"
              >
                <Ship className="w-3.5 h-3.5 text-emerald-400" />
                <span className="max-w-[120px] sm:max-w-[180px] truncate">{vessel?.name || 'Proyek Kapal'}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {isProjectDropdownOpen && (
                <div className="absolute left-0 top-full mt-1 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 text-slate-200">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    Pilih Proyek Kapal Galangan:
                  </div>
                  {allProjects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        onSwitchProject(p.id);
                        setIsProjectDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-800 transition-colors cursor-pointer ${
                        p.id === currentProjectId ? 'bg-emerald-950/80 text-emerald-300 font-bold' : ''
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="truncate font-semibold">{p.vessel?.name || 'Kapal'}</div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {p.vessel?.projectNo || 'F-00'} &bull; {p.vessel?.vesselType || 'Vessel'}
                        </div>
                      </div>
                      {p.id === currentProjectId && (
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      )}
                    </button>
                  ))}
                  <div className="pt-1 mt-1 border-t border-slate-800 px-2">
                    <button
                      onClick={() => {
                        setIsProjectDropdownOpen(false);
                        if (onBackToProjects) onBackToProjects();
                      }}
                      className="w-full py-1.5 text-center text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center justify-center gap-1"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>Buka Manajemen Proyek</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right side: Logged-in User Info & Logout Menu */}
        <div className="flex items-center gap-2">
          {currentUser && (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
              >
                <div className="w-5 h-5 rounded-md bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center">
                  {currentUser.initials}
                </div>
                <span className="font-semibold text-xs hidden sm:inline">{currentUser.name}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono hidden md:inline">
                  {currentUser.role}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 text-slate-200">
                  <div className="px-3 py-2 border-b border-slate-800">
                    <div className="font-bold text-xs text-white">{currentUser.name}</div>
                    <div className="text-[11px] text-slate-400">{currentUser.title}</div>
                    <div className="text-[10px] text-emerald-400 font-mono mt-0.5">{currentUser.department}</div>
                  </div>

                  {onBackToProjects && (
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onBackToProjects();
                      }}
                      className="w-full px-3 py-2 text-left text-xs hover:bg-slate-800 flex items-center gap-2 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Daftar Proyek Kapal</span>
                    </button>
                  )}

                  {onLogout && (
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full px-3 py-2 text-left text-xs hover:bg-red-950/60 text-red-400 hover:text-red-300 flex items-center gap-2 transition-colors border-t border-slate-800 mt-1 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Keluar (Logout)</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="w-full px-2.5 sm:px-4 py-2 sm:py-2.5">
        {/* Top Row: Vessel Identification, Specs & Primary Action Hub */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Left: Vessel Brand, Specs, Photo */}
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            {/* Vessel Photo with Hover Quick Edit */}
            <div className="relative group shrink-0 mt-0.5 sm:mt-0">
              {vessel?.photoUrl ? (
                <img
                  src={vessel.photoUrl}
                  alt={vessel?.name || 'Vessel'}
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl object-cover border border-slate-200/90 shadow-xs ring-1 ring-slate-100"
                />
              ) : (
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center text-white shadow-xs border border-slate-700/50">
                  <Ship className="w-5 h-5 text-emerald-400" />
                </div>
              )}
              <button
                id="btn-edit-vessel-photo"
                onClick={onOpenVesselModal}
                title="Upload / Ganti Foto Kapal"
                className="absolute inset-0 bg-slate-900/65 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center text-white text-[10px] font-bold gap-1 cursor-pointer shadow-inner"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Vessel Info & Badges */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate flex items-center gap-1.5">
                  <span>{vessel?.name || 'TB. KSA BINTANG'}</span>
                </h1>

                {/* Vessel Type */}
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  {vessel?.vesselType || 'Tug Boat'}
                </span>

                {/* Project No Badge */}
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {vessel?.projectNo || 'F-049'}
                </span>

                {/* Quick Edit Spek button */}
                <button
                  id="btn-vessel-spec-modal"
                  onClick={onOpenVesselModal}
                  className="text-xs px-2.5 py-0.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-md border border-slate-200 font-medium transition-colors inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                  title="Lihat & ubah spesifikasi kapal serta foto"
                >
                  <Camera className="w-3 h-3 text-slate-500" />
                  <span>Spek &amp; Foto</span>
                </button>
              </div>

              {/* Compact Technical Specs & Docking Schedule */}
              <div className="text-[11px] sm:text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                <span className="inline-flex items-center gap-1 font-medium text-slate-700 truncate max-w-[200px] sm:max-w-xs">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{vessel?.companyOwner || 'PT. PELAYARAN KARTIKA SAMUDRA ADIJAYA'}</span>
                </span>
                <span className="text-slate-300 hidden sm:inline">&bull;</span>
                <span className="bg-slate-50 sm:bg-transparent px-1.5 py-0.5 sm:p-0 rounded border sm:border-0 border-slate-200/60">
                  Dimensi: <strong className="font-semibold text-slate-700">{vessel?.dimension || '-'}</strong>
                </span>
                <span className="text-slate-300 hidden sm:inline">&bull;</span>
                <span className="bg-slate-50 sm:bg-transparent px-1.5 py-0.5 sm:p-0 rounded border sm:border-0 border-slate-200/60">
                  Kelas: <strong className="font-semibold text-slate-700">{vessel?.classification || 'BKI'}</strong>
                </span>
                <span className="text-slate-300 hidden sm:inline">&bull;</span>
                <span className="inline-flex items-center gap-1">
                  Dock: <strong className="font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">{schedule?.dockingPosition || 'Slipway #1'}</strong>
                </span>
                <span className="text-slate-300 hidden sm:inline">&bull;</span>
                <span className="inline-flex items-center gap-1 text-slate-700 font-medium bg-amber-50/80 border border-amber-200 px-1.5 py-0.5 rounded">
                  <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                  <span>{schedule?.dockingDate || '-'} - {schedule?.undockingDate || '-'} ({schedule?.dockingDurationDays || 0} hr)</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right: Database Engine & Tools */}
          <div className="flex flex-wrap items-center gap-2 shrink-0 w-full lg:w-auto justify-start lg:justify-end">
            {/* Live SQLite Database Save & Sync Status Indicator */}
            <div className="flex items-center gap-1.5">
              {/* Explicit Manual Save Button */}
              {onManualSave && (
                <button
                  id="btn-manual-save-db"
                  onClick={onManualSave}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border shadow-2xs min-h-[34px] cursor-pointer transition-all duration-200 ${
                    saveStatus === 'saving' || saveStatus === 'syncing'
                      ? 'bg-amber-50 text-amber-900 border-amber-300'
                      : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white border-emerald-600 hover:border-emerald-700 shadow-emerald-900/10'
                  }`}
                  title="Klik untuk langsung menyimpan seluruh data proyek ke database SQLite lokal"
                >
                  {saveStatus === 'saving' ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin shrink-0" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />
                      <span>Simpan Project</span>
                    </>
                  )}
                </button>
              )}

              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border shadow-2xs min-h-[34px] cursor-default shrink-0 transition-colors duration-300 ease-in-out ${
                  saveStatus === 'syncing'
                    ? 'bg-sky-50 text-sky-900 border-sky-300'
                    : 'bg-emerald-50/90 text-emerald-950 border-emerald-200'
                }`}
                title={`Semua perubahan otomatis tersimpan di SQLite lokal. ${
                  lastSavedTime
                    ? `Tersimpan pukul ${lastSavedTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                    : ''
                }`}
              >
                {saveStatus === 'syncing' ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-sky-600 animate-spin shrink-0" />
                    <span className="font-bold text-sky-900">Menyinkron...</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="font-bold text-emerald-950 hidden sm:inline">Auto-Save</span>
                    <span className="text-[10px] text-emerald-700 font-mono hidden xl:inline">
                      ({lastSavedTime ? lastSavedTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'SQLite'})
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* SQLite Sync Status Button */}
            <button
              id="btn-sync-server"
              onClick={onSyncAll}
              title={unsyncedSurveyCount > 0 ? `${unsyncedSurveyCount} data lokal belum sync ke server` : 'Semua data survey tersinkron di SQLite'}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 min-h-[34px]"
            >
              {unsyncedSurveyCount > 0 ? (
                <>
                  <CloudOff className="w-3.5 h-3.5 text-amber-500 animate-bounce" />
                  <span className="text-xs text-amber-700 font-semibold">Sync ({unsyncedSurveyCount})</span>
                </>
              ) : (
                <>
                  <Cloud className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-xs text-slate-600 font-medium hidden sm:inline">Sync Server</span>
                </>
              )}
            </button>

            {/* SQLite Database Console */}
            <button
              id="btn-sqlite-console"
              onClick={onOpenSqliteModal}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 text-xs font-medium rounded-xl border border-slate-200 transition-colors cursor-pointer min-h-[34px]"
              title="Kelola Database SQLite Lokal (Query, Dump .sql, Unduh .sqlite)"
            >
              <Database className="w-3.5 h-3.5 text-slate-500" />
              <span>Database</span>
            </button>
          </div>
        </div>

        {/* ================= REDESIGNED NAVIGATION TABS ================= */}
        {/* CSS selectors targeted: header > div > div:nth-of-type(2) > button:nth-of-type(1..6) */}
        <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-slate-100 text-xs font-medium overflow-x-auto scrollbar-none pb-0.5">
          {/* TAB 1: Repair List (I - XI) */}
          <button
            id="tab-btn-repair-list"
            onClick={() => setActiveTab('repair-list')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap min-h-[36px] cursor-pointer ${
              activeTab === 'repair-list'
                ? 'bg-slate-900 text-white font-bold shadow-md shadow-slate-900/10 ring-1 ring-slate-900'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200/80'
            }`}
          >
            <Layers className={`w-4 h-4 ${activeTab === 'repair-list' ? 'text-emerald-400' : 'text-slate-500'}`} />
            <span>Repair List (Kategori I - XI)</span>
            {totalWorkItemsCount > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  activeTab === 'repair-list'
                    ? 'bg-slate-800 text-emerald-300 border border-slate-700'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {totalWorkItemsCount}
              </span>
            )}
          </button>

          {/* TAB 2: Estimasi Material Proyek (BOM / Material Take-Off) */}
          <button
            id="tab-btn-material-estimation"
            onClick={() => setActiveTab('material-estimation')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap min-h-[36px] cursor-pointer ${
              activeTab === 'material-estimation'
                ? 'bg-slate-900 text-white font-bold shadow-md shadow-slate-900/10 ring-1 ring-slate-900'
                : 'bg-emerald-50/70 hover:bg-emerald-100/70 text-emerald-950 hover:text-emerald-900 border border-emerald-300/80'
            }`}
          >
            <Box className={`w-4 h-4 ${activeTab === 'material-estimation' ? 'text-emerald-400' : 'text-emerald-700'}`} />
            <span>Estimasi Material (BOM)</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeTab === 'material-estimation'
                  ? 'bg-emerald-800 text-emerald-100 border border-emerald-700'
                  : 'bg-emerald-200/90 text-emerald-950 border border-emerald-300'
              }`}
            >
              {materialEstimateCount !== undefined && materialEstimateCount > 0 ? `${materialEstimateCount} Mat` : 'BOM'}
            </span>
          </button>

          {/* TAB 2.5: Plan vs Progress/Actual (S-Curve) */}
          <button
            id="tab-btn-plan-vs-actual"
            onClick={() => setActiveTab('plan-vs-actual')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap min-h-[36px] cursor-pointer ${
              activeTab === 'plan-vs-actual'
                ? 'bg-[#0b2545] text-white font-bold shadow-md shadow-[#0b2545]/20 ring-1 ring-[#0b2545]'
                : 'bg-amber-50/80 hover:bg-amber-100/80 text-[#0b2545] font-bold border border-amber-300/80'
            }`}
          >
            <TrendingUp className={`w-4 h-4 ${activeTab === 'plan-vs-actual' ? 'text-amber-400' : 'text-amber-600'}`} />
            <span>Plan vs Progress</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeTab === 'plan-vs-actual'
                  ? 'bg-[#134074] text-amber-300 border border-amber-500/30'
                  : 'bg-amber-200 text-amber-900'
              }`}
            >
              S-Curve
            </span>
          </button>

          {/* TAB 3: Opname & Verifikasi Subcont */}
          <button
            id="tab-btn-opname"
            onClick={() => setActiveTab('opname')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap min-h-[36px] cursor-pointer ${
              activeTab === 'opname'
                ? 'bg-slate-900 text-white font-bold shadow-md shadow-slate-900/10 ring-1 ring-slate-900'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200/80'
            }`}
          >
            <ClipboardCheck className={`w-4 h-4 ${activeTab === 'opname' ? 'text-emerald-400' : 'text-slate-500'}`} />
            <span>Opname &amp; Subcont</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeTab === 'opname'
                  ? 'bg-emerald-800 text-emerald-100 border border-emerald-700'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              Audit
            </span>
          </button>

          {/* TAB 3: Defect Survey (Offline) */}
          <button
            id="tab-btn-defect-surveys"
            onClick={() => setActiveTab('defect-surveys')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap min-h-[36px] cursor-pointer ${
              activeTab === 'defect-surveys'
                ? 'bg-slate-900 text-white font-bold shadow-md shadow-slate-900/10 ring-1 ring-slate-900'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200/80'
            }`}
          >
            <CheckCircle2 className={`w-4 h-4 ${activeTab === 'defect-surveys' ? 'text-emerald-400' : 'text-slate-500'}`} />
            <span>Defect Survey (Offline)</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeTab === 'defect-surveys'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {surveyCount}
            </span>
          </button>

          {/* TAB 4: RAB & Estimasi Biaya */}
          <button
            id="tab-btn-cost-estimation"
            onClick={() => setActiveTab('cost-estimation')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap min-h-[36px] cursor-pointer ${
              activeTab === 'cost-estimation'
                ? 'bg-slate-900 text-white font-bold shadow-md shadow-slate-900/10 ring-1 ring-slate-900'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200/80'
            }`}
          >
            <FileSpreadsheet className={`w-4 h-4 ${activeTab === 'cost-estimation' ? 'text-emerald-400' : 'text-slate-500'}`} />
            <span>RAB &amp; Estimasi Biaya</span>
            {costSummary.totalCost > 0 && (
              <span
                className={`hidden md:inline-block px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  activeTab === 'cost-estimation'
                    ? 'bg-slate-800 text-emerald-300 border border-slate-700'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}
              >
                Rp {(costSummary.totalCost / 1000000).toFixed(1)}Jt
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
