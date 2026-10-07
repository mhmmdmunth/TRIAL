import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { sqliteService } from './services/sqliteService';
import { authService } from './services/authService';
import { projectService } from './services/projectService';
import {
  VesselSpec,
  ProjectSchedule,
  WorkCategory,
  WorkItem,
  DefectSurvey,
  Signatures,
  CostSummary,
  UserProfile,
  ShipyardProject,
} from './types';
import { Header } from './components/Header';
import { LoginScreen } from './components/LoginScreen';
import { ProjectSelectionHub } from './components/ProjectSelectionHub';
import { RepairListTable } from './components/RepairListTable';
import { OpnameVerificationTable } from './components/OpnameVerificationTable';
import { DefectSurveyList } from './components/DefectSurveyList';
import { DefectSurveyModal } from './components/DefectSurveyModal';
import { CostEstimationSummary } from './components/CostEstimationSummary';
import { MaterialEstimationView } from './components/MaterialEstimation/MaterialEstimationView';
import { PlanProgressModule } from './components/PlanProgressModule';
import { materialEstimationService } from './services/materialEstimationService';

import { MaterialCatalogManager } from './components/MaterialCatalogManager';
import { SqliteConsoleModal } from './components/SqliteConsoleModal';
import { PdfExportModal } from './components/PdfExportModal';
import { exportShipyardExcel } from './utils/excelExport';
import { VesselProjectModal } from './components/VesselProjectModal';
import { CustomDialogModal } from './components/CustomDialogModal';
import { ExportImportModal } from './components/ExportImportModal';
import { exportShipyardWord } from './utils/wordExport';
import { generateImportTemplate } from './utils/fileImport';
import { TonnageCalculator } from './utils/tonnageCalculator';
import {
  DEFAULT_VESSEL,
  DEFAULT_SCHEDULE,
  DEFAULT_CATEGORIES,
  DEFAULT_WORK_ITEMS,
  DEFAULT_DEFECT_SURVEYS,
  DEFAULT_SIGNATURES,
} from './data/shipyardSeedData';

export default function App() {
  // Auth & Project Hub State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => authService.getCurrentUser());
  const [currentProject, setCurrentProject] = useState<ShipyardProject | null>(() => projectService.getActiveProject());
  const [allProjects, setAllProjects] = useState<ShipyardProject[]>(() => projectService.getAllProjects());
  const [currentView, setCurrentView] = useState<'login' | 'projects-hub' | 'workspace'>(() => {
    const saved = localStorage.getItem('shipyard_current_view');
    if (saved === 'workspace' && authService.getCurrentUser() && projectService.getActiveProject()) {
      return 'workspace';
    }
    return 'projects-hub';
  });
  const [pendingProjectId, setPendingProjectId] = useState<string | null>(null);
  const [pendingProjectName, setPendingProjectName] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'repair-list' | 'material-estimation' | 'plan-vs-actual' | 'opname' | 'defect-surveys' | 'cost-estimation'>(() => {
    const saved = localStorage.getItem('shipyard_active_tab');
    if (saved === 'repair-list' || saved === 'material-estimation' || saved === 'plan-vs-actual' || saved === 'opname' || saved === 'defect-surveys' || saved === 'cost-estimation') {
      return saved;
    }
    return 'repair-list';
  });

  useEffect(() => {
    try {
      localStorage.setItem('shipyard_current_view', currentView);
    } catch (e) {
      console.warn(e);
    }
  }, [currentView]);

  useEffect(() => {
    try {
      localStorage.setItem('shipyard_active_tab', activeTab);
    } catch (e) {
      console.warn(e);
    }
  }, [activeTab]);
  const [vessel, setVessel] = useState<VesselSpec>(DEFAULT_VESSEL);
  const [schedule, setSchedule] = useState<ProjectSchedule>(DEFAULT_SCHEDULE);
  const [categories, setCategories] = useState<WorkCategory[]>(DEFAULT_CATEGORIES);
  const [workItems, setWorkItems] = useState<WorkItem[]>(DEFAULT_WORK_ITEMS);
  const [opnameItems, setOpnameItems] = useState<WorkItem[]>([]);
  const [defectSurveys, setDefectSurveys] = useState<DefectSurvey[]>(DEFAULT_DEFECT_SURVEYS);
  const [signatures, setSignatures] = useState<Signatures>(DEFAULT_SIGNATURES);

  // Modals state
  const [isAddSurveyOpen, setIsAddSurveyOpen] = useState<boolean>(false);
  const [editingSurvey, setEditingSurvey] = useState<DefectSurvey | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);
  const [isSqliteModalOpen, setIsSqliteModalOpen] = useState<boolean>(false);
  const [isVesselModalOpen, setIsVesselModalOpen] = useState<boolean>(false);
  const [isExportImportModalOpen, setIsExportImportModalOpen] = useState<boolean>(false);
  const [exportImportDefaultTab, setExportImportDefaultTab] = useState<'export' | 'import'>('export');

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'syncing'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(new Date());

  // Custom dialog modal state
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    type: 'confirm' | 'alert';
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    type: 'confirm',
    title: '',
    message: '',
  });

  const showCustomConfirm = useCallback((title: string, message: string, onConfirm: () => void) => {
    setDialogState({
      isOpen: true,
      type: 'confirm',
      title,
      message,
      onConfirm,
    });
  }, []);

  const showCustomAlert = useCallback((title: string, message: string) => {
    setDialogState({
      isOpen: true,
      type: 'alert',
      title,
      message,
    });
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Synchronize state from SQLite DB
  const loadDataFromSqlite = useCallback(() => {
    if (!sqliteService.isReady()) return;

    const v = sqliteService.getVessel();
    const s = sqliteService.getProjectSchedule();
    const c = sqliteService.getWorkCategories();
    const w = sqliteService.getWorkItems();
    const op = sqliteService.getOpnameWorkItems();
    const d = sqliteService.getDefectSurveys();
    const sig = sqliteService.getSignatures();

    setVessel(v);
    setSchedule(s);
    setCategories(c);
    setWorkItems(w);
    setOpnameItems(op);
    setDefectSurveys(d);
    setSignatures(sig);

    // Also sync to active project in projectService
    const activeProj = projectService.getActiveProject();
    if (activeProj) {
      projectService.updateProjectData(activeProj.id, {
        vessel: v,
        schedule: s,
        categories: c,
        workItems: w,
        opnameItems: op,
        defectSurveys: d,
        signatures: sig,
      });
      setAllProjects(projectService.getAllProjects());
    }
  }, []);

  // Handle switching or opening a project (accepts object or string ID)
  const handleSelectProject = useCallback((projectOrId: ShipyardProject | string) => {
    const targetId = typeof projectOrId === 'string' ? projectOrId : projectOrId.id;
    let project = projectService.getProjectById(targetId) || (typeof projectOrId === 'object' ? projectOrId : null);
    if (!project) {
      project = projectService.getActiveProject();
    }
    if (!project) return;

    // Check if user is logged in
    const activeUser = currentUser || authService.getCurrentUser();
    if (!activeUser) {
      setPendingProjectId(project.id);
      setPendingProjectName(project.vessel?.name || 'Kapal');
      setCurrentView('login');
      showToast(`Silakan login terlebih dahulu untuk mengakses workspace proyek ${project.vessel?.name || ''}`);
      return;
    }

    const currentLoadedVessel = sqliteService.getVessel();
    const isAlreadyLoaded = currentLoadedVessel && (currentLoadedVessel.id === project.vessel?.id || currentLoadedVessel.name === project.vessel?.name);

    projectService.setActiveProjectId(project.id);
    setCurrentProject(project);

    if (!isAlreadyLoaded || sqliteService.getWorkItems().length === 0) {
      sqliteService.loadProjectData(project);
    }

    loadDataFromSqlite();
    setCurrentView('workspace');
    showToast(`Beralih ke proyek kapal: ${project.vessel?.name || 'Kapal'}`);
  }, [currentUser, loadDataFromSqlite]);

  const handleOpenLogin = () => {
    setPendingProjectId(null);
    setPendingProjectName(null);
    setCurrentView('login');
  };

  const handleSwitchProjectById = useCallback((projectId: string) => {
    handleSelectProject(projectId);
  }, [handleSelectProject]);

  const handleBackToProjectsHub = () => {
    setAllProjects(projectService.getAllProjects());
    setCurrentView('projects-hub');
  };

  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    const targetProjId = pendingProjectId;
    setPendingProjectId(null);
    setPendingProjectName(null);

    if (targetProjId) {
      const proj = projectService.getProjectById(targetProjId);
      if (proj) {
        projectService.setActiveProjectId(proj.id);
        setCurrentProject(proj);
        const currentLoadedVessel = sqliteService.getVessel();
        const isAlreadyLoaded = currentLoadedVessel && (currentLoadedVessel.id === proj.vessel?.id || currentLoadedVessel.name === proj.vessel?.name);
        if (!isAlreadyLoaded || sqliteService.getWorkItems().length === 0) {
          sqliteService.loadProjectData(proj);
        }
        loadDataFromSqlite();
        setCurrentView('workspace');
        showToast(`Selamat datang, ${user.name}! Mengakses workspace ${proj.vessel.name}`);
        return;
      }
    }

    // Default return to projects hub after login
    setAllProjects(projectService.getAllProjects());
    setCurrentView('projects-hub');
    showToast(`Selamat datang, ${user.name} (${user.role})!`);
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    setPendingProjectId(null);
    setPendingProjectName(null);
    setCurrentView('projects-hub');
    showToast('Anda telah keluar dari sistem.');
  };

  useEffect(() => {
    sqliteService.init().then(() => {
      loadDataFromSqlite();
      setLastSavedTime(new Date());
    });

    // Reactive subscription with smooth, flicker-free status transitions
    let saveTimeout: NodeJS.Timeout | null = null;
    const unsubscribe = sqliteService.subscribe(() => {
      console.log('Subscribed callback triggered!');
      loadDataFromSqlite();
      setSaveStatus('saving');
      if (saveTimeout) clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        setSaveStatus('saved');
        setLastSavedTime(new Date());
      }, 600);
    });

    return () => {
      if (saveTimeout) clearTimeout(saveTimeout);
      unsubscribe();
    };
  }, [loadDataFromSqlite]);

  // Handle Global Keyboard Shortcut: ESC key to close active pop-ups/modals or reset active dialogs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        let hasClosedModal = false;

        if (dialogState.isOpen) {
          setDialogState((prev) => ({ ...prev, isOpen: false }));
          hasClosedModal = true;
        } else if (isAddSurveyOpen) {
          setIsAddSurveyOpen(false);
          setEditingSurvey(null);
          hasClosedModal = true;
        } else if (isPdfModalOpen) {
          setIsPdfModalOpen(false);
          hasClosedModal = true;
        } else if (isSqliteModalOpen) {
          setIsSqliteModalOpen(false);
          hasClosedModal = true;
        } else if (isVesselModalOpen) {
          setIsVesselModalOpen(false);
          hasClosedModal = true;
        } else if (isExportImportModalOpen) {
          setIsExportImportModalOpen(false);
          hasClosedModal = true;
        }

        if (hasClosedModal) {
          showToast('Pop-up / Modal ditutup (Esc)');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    dialogState.isOpen,
    isAddSurveyOpen,
    isPdfModalOpen,
    isSqliteModalOpen,
    isVesselModalOpen,
    isExportImportModalOpen,
  ]);

  // Compute Cost Summary for Tim PPC & Pimpro
  const computeCostSummary = (): CostSummary => {
    let totalTonnageKg = 0;
    let totalBaseCost = 0;
    const subtotalByCategory: Record<string, { name: string; amount: number; tonnage: number }> = {};

    categories.forEach((cat) => {
      subtotalByCategory[cat.id] = { name: cat.name, amount: 0, tonnage: 0 };
    });

    workItems.forEach((item) => {
      if (item.weightKg && item.weightKg > 0) {
        totalTonnageKg += item.weightKg;
      }
      totalBaseCost += item.totalPrice || 0;

      if (subtotalByCategory[item.categoryId]) {
        subtotalByCategory[item.categoryId].amount += item.totalPrice || 0;
        if (item.weightKg) {
          subtotalByCategory[item.categoryId].tonnage += item.weightKg;
        }
      }
    });

    const marginPercent = 5;
    const ppnPercent = 11;
    const costWithMargin = totalBaseCost * (1 + marginPercent / 100);
    const grandTotalCost = costWithMargin * (1 + ppnPercent / 100);

    return {
      totalTonnageKg,
      totalWorkItems: workItems.length,
      subtotalByCategory,
      totalBaseCost,
      marginPercent,
      ppnPercent,
      grandTotalCost,
      totalCost: grandTotalCost,
    };
  };

  const costSummary = computeCostSummary();
  const unsyncedSurveyCount = defectSurveys.filter((s) => s.syncStatus === 0).length;

  // Handlers for Defect Surveys
  const handleSaveSurvey = (
    surveyData: Omit<DefectSurvey, 'id' | 'createdAt'>,
    editId?: string
  ) => {
    if (editId) {
      const existing = defectSurveys.find((s) => s.id === editId);
      if (existing) {
        sqliteService.updateDefectSurvey({
          ...existing,
          ...surveyData,
        });
        showToast(`Survey ${surveyData.locationZone} berhasil diperbarui di SQLite.`);
      }
    } else {
      sqliteService.addDefectSurvey(surveyData);
      showToast(`Data kerusakan baru zona ${surveyData.locationZone} tersimpan offline di SQLite!`);
    }
    setEditingSurvey(null);
  };

  const handleDeleteSurvey = (id: string) => {
    showCustomConfirm(
      'Konfirmasi Hapus Survey',
      'Apakah Anda yakin ingin menghapus catatan survey kerusakan ini? Tindakan ini tidak dapat dibatalkan.',
      () => {
        sqliteService.deleteDefectSurvey(id);
        showToast('Data survey telah dihapus dari SQLite.');
      }
    );
  };

  const handleConvertSurveyToBoq = (surveyId: string) => {
    const workItemId = sqliteService.convertSurveyToWorkItem(surveyId);
    if (workItemId) {
      showToast('Survey berhasil ditransfer ke BoQ VII. Steelwork Replating!');
    }
  };

  const handleSyncAllSurveys = () => {
    setSaveStatus('syncing');
    setTimeout(() => {
      sqliteService.syncAllSurveys();
      setSaveStatus('saved');
      setLastSavedTime(new Date());
      showToast('Semua survey offline berhasil disinkronkan ke server galangan.');
    }, 450);
  };

  // Handlers for Work Items
  const handleAddWorkItem = useCallback((item: Omit<WorkItem, 'id'>) => {
    sqliteService.addWorkItem(item);
    showToast(`Pekerjaan "${item.description}" ditambahkan dan nomor urut diperbarui otomatis.`);
  }, []);

  const handleUpdateWorkItem = useCallback((item: WorkItem) => {
    sqliteService.updateWorkItem(item);
    loadDataFromSqlite();
  }, [loadDataFromSqlite]);

  const handleUpdateWorkItemsBatch = useCallback((items: WorkItem[]) => {
    sqliteService.updateWorkItemsBatch(items);
    loadDataFromSqlite();
  }, [loadDataFromSqlite]);

  const handleDeleteWorkItem = useCallback((id: string) => {
    showCustomConfirm(
      'Konfirmasi Hapus Pekerjaan',
      'Apakah Anda yakin ingin menghapus item pekerjaan ini? Semua nomor urut (Area, Sub-system, Komponen) akan otomatis disusun ulang secara berurutan.',
      () => {
        sqliteService.deleteWorkItem(id);
        loadDataFromSqlite();
        showToast('Item pekerjaan dihapus dan nomor urut diperbarui otomatis.');
      }
    );
  }, [loadDataFromSqlite]);

  const handleBulkDeleteWorkItems = useCallback((ids: string[]) => {
    showCustomConfirm(
      'Konfirmasi Hapus Massal',
      `Apakah Anda yakin ingin menghapus ${ids.length} item pekerjaan yang dipilih? Nomor urut pekerjaan akan otomatis disusun ulang.`,
      () => {
        sqliteService.deleteWorkItems(ids);
        loadDataFromSqlite();
        showToast(`${ids.length} item pekerjaan berhasil dihapus dan nomor urut diperbarui otomatis.`);
      }
    );
  }, [loadDataFromSqlite]);

  const handleClearAllWorkItems = useCallback(() => {
    showCustomConfirm(
      'Kosongkan Seluruh Repair List',
      'Apakah Anda yakin ingin mengosongkan semua isi kategori di Repair List? Semua item pekerjaan akan dihapus, namun seluruh daftar Kategori (I s/d XII) tetap utuh dan siap digunakan.',
      () => {
        sqliteService.clearAllWorkItems();
        loadDataFromSqlite();
        showToast('Semua isi kategori di Repair List berhasil dikosongkan.');
      }
    );
  }, [loadDataFromSqlite]);

  const handleBatchSaveWorkItems = useCallback((newWorkItemsList: WorkItem[]) => {
    sqliteService.importWorkItems(newWorkItemsList, 'replace');
    loadDataFromSqlite();
    showToast('Perubahan susunan, salinan & pemindahan baris berhasil disimpan.');
  }, [loadDataFromSqlite]);

  // Handlers for Opname Items (strictly isolated from Repair List)
  const handleAddOpnameItem = useCallback((item: Omit<WorkItem, 'id'>) => {
    sqliteService.addOpnameWorkItem(item);
    showToast(`Pekerjaan "${item.description}" ditambahkan ke tab Opname & Subcont.`);
  }, []);

  const handleUpdateOpnameItem = useCallback((item: WorkItem) => {
    sqliteService.updateOpnameWorkItem(item);
  }, []);

  const handleUpdateOpnameItemsBatch = useCallback((items: WorkItem[]) => {
    sqliteService.updateOpnameWorkItemsBatch(items);
  }, []);

  const handleDeleteOpnameItem = useCallback((id: string) => {
    showCustomConfirm(
      'Konfirmasi Hapus Item Opname',
      'Apakah Anda yakin ingin menghapus item ini dari tab Opname & Subcont? (Tabel Repair List tidak akan terpengaruh)',
      () => {
        sqliteService.deleteOpnameWorkItem(id);
        loadDataFromSqlite();
        showToast('Item opname dihapus dan nomor urut diperbarui.');
      }
    );
  }, [loadDataFromSqlite, showCustomConfirm]);

  const handleBulkDeleteOpnameItems = useCallback((ids: string[]) => {
    showCustomConfirm(
      'Konfirmasi Hapus Massal Opname',
      `Apakah Anda yakin ingin menghapus ${ids.length} item opname yang dipilih? (Tabel Repair List tidak akan terpengaruh)`,
      () => {
        sqliteService.deleteOpnameWorkItems(ids);
        loadDataFromSqlite();
        showToast(`${ids.length} item opname berhasil dihapus.`);
      }
    );
  }, [loadDataFromSqlite, showCustomConfirm]);

  const handleClearAllOpnameItems = useCallback(() => {
    showCustomConfirm(
      'Kosongkan Seluruh Tabel Opname',
      'Apakah Anda yakin ingin mengosongkan semua item di tab Opname & Subcont? (Tabel Repair List tetap utuh dan aman).',
      () => {
        sqliteService.clearAllOpnameWorkItems();
        loadDataFromSqlite();
        showToast('Semua item di tab Opname berhasil dikosongkan.');
      }
    );
  }, [loadDataFromSqlite, showCustomConfirm]);

  const handleBatchSaveOpnameItems = useCallback((newOpnameList: WorkItem[]) => {
    sqliteService.importOpnameWorkItems(newOpnameList, 'replace');
    loadDataFromSqlite();
    showToast('Perubahan tabel Opname berhasil disimpan.');
  }, [loadDataFromSqlite]);

  const handleSyncOpnameFromRepairList = useCallback((mode: 'replace' | 'merge_new' = 'merge_new') => {
    showCustomConfirm(
      mode === 'replace' ? 'Sinkron Ulang Opname dari Repair List' : 'Tarik Item Baru dari Repair List',
      mode === 'replace'
        ? 'Tindakan ini akan menyalin ulang seluruh data dari Repair List ke tab Opname. Data opname saat ini akan ditimpa. Lanjutkan?'
        : 'Tindakan ini akan menambahkan item-item baru dari Repair List yang belum ada di tabel Opname tanpa menimpa data yang sudah ada.',
      () => {
        sqliteService.syncOpnameFromRepairList(mode);
        loadDataFromSqlite();
        showToast(mode === 'replace' ? 'Tabel Opname berhasil disinkronkan dari Repair List!' : 'Item baru berhasil ditambahkan ke Opname.');
      }
    );
  }, [loadDataFromSqlite, showCustomConfirm]);

  // Manual & Auto Save Handlers
  const handleManualSave = useCallback(() => {
    setSaveStatus('saving');
    sqliteService.flushPersist();
    loadDataFromSqlite();
    setTimeout(() => {
      setSaveStatus('saved');
      setLastSavedTime(new Date());
      showToast('Database & seluruh data proyek kapal berhasil disimpan!');
    }, 300);
  }, [loadDataFromSqlite]);

  // Save Vessel & Project Specs
  const handleSaveVesselAndSchedule = useCallback((newVessel: VesselSpec, newSchedule: ProjectSchedule) => {
    sqliteService.updateVessel(newVessel);
    sqliteService.updateProjectSchedule(newSchedule);
    sqliteService.flushPersist();
    loadDataFromSqlite();
    showToast('Informasi spesifikasi kapal & jadwal docking diperbarui.');
  }, [loadDataFromSqlite]);

  const handleSaveSignatures = useCallback((newSig: Signatures) => {
    sqliteService.updateSignatures(newSig);
    sqliteService.flushPersist();
    loadDataFromSqlite();
  }, [loadDataFromSqlite]);

  const handleExportExcel = useCallback(async () => {
    try {
      showToast('Memproses & mengunduh file Excel (.xlsx)...');
      await exportShipyardExcel({
        vessel,
        schedule,
        categories,
        workItems,
        signatures,
        includePrices: false,
      });
      showToast('Dokumen Excel Repair List (tanpa RAB) berhasil diunduh!');
    } catch (err) {
      console.error('Export Excel error:', err);
      showToast('Gagal mengunduh file Excel.');
    }
  }, [vessel, schedule, categories, workItems, signatures]);

  const handleQuickExportWord = useCallback(() => {
    try {
      showToast('Memproses & mengunduh dokumen Word (.doc)...');
      exportShipyardWord({
        vessel,
        schedule,
        categories,
        workItems,
        signatures,
        defectSurveys,
        includePrices: true,
      });
      showToast('Dokumen Word (Scope of Work & Repair List) berhasil diunduh!');
    } catch (err) {
      console.error('Export Word error:', err);
      showToast('Gagal mengunduh file Word.');
    }
  }, [vessel, schedule, categories, workItems, signatures, defectSurveys]);

  const handleDownloadTemplate = useCallback(() => {
    try {
      showToast('Mengunduh template impor Excel...');
      generateImportTemplate(categories, workItems, vessel?.name);
      showToast('Template Excel berhasil diunduh.');
    } catch (err) {
      console.error('Download template error:', err);
      showToast('Gagal mengunduh template.');
    }
  }, [categories, workItems, vessel?.name]);

  const handleOpenAddSurvey = useCallback(() => {
    setEditingSurvey(null);
    setIsAddSurveyOpen(true);
  }, []);

  const handleCloseAddSurvey = useCallback(() => {
    setIsAddSurveyOpen(false);
    setEditingSurvey(null);
  }, []);

  const handleOpenPdfModal = useCallback(() => {
    setIsPdfModalOpen(true);
  }, []);

  const handleClosePdfModal = useCallback(() => {
    setIsPdfModalOpen(false);
  }, []);

  const handleOpenSqliteModal = useCallback(() => {
    setIsSqliteModalOpen(true);
  }, []);

  const handleCloseSqliteModal = useCallback(() => {
    setIsSqliteModalOpen(false);
  }, []);

  const handleOpenVesselModal = useCallback(() => {
    setIsVesselModalOpen(true);
  }, []);

  const handleCloseVesselModal = useCallback(() => {
    setIsVesselModalOpen(false);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const handleOpenExportImportModal = useCallback((tab: 'export' | 'import' = 'export') => {
    setExportImportDefaultTab(tab);
    setIsExportImportModalOpen(true);
  }, []);

  const handleCloseExportImportModal = useCallback(() => {
    setIsExportImportModalOpen(false);
  }, []);

  const handleImportWorkItems = useCallback(
    (
      newItems: WorkItem[],
      mode: 'replace' | 'append',
      extra?: {
        vesselSpec?: Partial<VesselSpec>;
        projectSchedule?: Partial<ProjectSchedule>;
        vesselPhotoUrl?: string;
      }
    ) => {
      sqliteService.importWorkItems(newItems, mode);

      if (extra) {
        if (extra.vesselSpec || extra.vesselPhotoUrl) {
          const currentV = sqliteService.getVessel();
          const updatedV: VesselSpec = {
            ...currentV,
            ...(extra.vesselSpec || {}),
            ...(extra.vesselPhotoUrl ? { photoUrl: extra.vesselPhotoUrl } : {}),
          };
          sqliteService.updateVessel(updatedV);
        }
        if (extra.projectSchedule) {
          const currentS = sqliteService.getProjectSchedule();
          const updatedS: ProjectSchedule = {
            ...currentS,
            ...extra.projectSchedule,
          };
          sqliteService.updateProjectSchedule(updatedS);
        }
      }

      loadDataFromSqlite();
      showToast(
        `Berhasil mengimpor ${newItems.length} item pekerjaan ${
          extra?.vesselSpec || extra?.vesselPhotoUrl ? '& spesifikasi/foto kapal' : ''
        } (${mode === 'replace' ? 'Ganti Seluruh Data' : 'Tambahkan ke Daftar'}).`
      );
    },
    [loadDataFromSqlite]
  );

  // Material estimates for the active project (Declared before early returns to preserve hook order)
  const activeProjectId = currentProject?.id || vessel?.id || 'proj-f049';
  const projectMaterials = useMemo(() => {
    return materialEstimationService.getMaterialEstimates(activeProjectId);
  }, [activeProjectId, workItems, activeTab]);

  // VIEW 1: Login Screen (Shown when requested or logging in for a project)
  if (currentView === 'login') {
    return (
      <div className="min-h-screen bg-slate-900 font-sans selection:bg-emerald-500 selection:text-white">
        <LoginScreen
          onLoginSuccess={handleLoginSuccess}
          pendingProjectName={pendingProjectName}
          onBackToHub={() => setCurrentView('projects-hub')}
        />
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-lg border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    );
  }

  // VIEW 2: Project Selection & Management Hub (Interface before entering project workspace)
  if (currentView === 'projects-hub' || !currentProject) {
    return (
      <div className="min-h-screen bg-slate-950 font-sans selection:bg-emerald-500 selection:text-white flex flex-col">
        <ProjectSelectionHub
          currentUser={currentUser}
          onSelectProject={handleSelectProject}
          onLogout={handleLogout}
          onOpenLogin={handleOpenLogin}
          onNotify={showToast}
          onConfirm={showCustomConfirm}
        />
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-lg border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>{toastMessage}</span>
          </div>
        )}
        <CustomDialogModal
          isOpen={dialogState.isOpen}
          type={dialogState.type}
          title={dialogState.title}
          message={dialogState.message}
          onConfirm={dialogState.onConfirm}
          onClose={() => setDialogState((prev) => ({ ...prev, isOpen: false }))}
        />
      </div>
    );
  }

  // VIEW 3: Specific Ship Project Technical Workspace
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Application Header */}
      <Header
        vessel={vessel}
        schedule={schedule}
        costSummary={costSummary}
        surveyCount={defectSurveys.length}
        unsyncedSurveyCount={unsyncedSurveyCount}
        totalWorkItemsCount={workItems.length}
        saveStatus={saveStatus}
        lastSavedTime={lastSavedTime}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        materialEstimateCount={projectMaterials.length}
        materialEstimateCost={projectMaterials.reduce((sum, m) => sum + (m.totalCost || 0), 0)}
        currentUser={currentUser}
        onBackToProjects={handleBackToProjectsHub}
        onLogout={handleLogout}
        onSwitchProject={handleSwitchProjectById}
        allProjects={allProjects}
        currentProjectId={currentProject?.id || activeProjectId || ''}
        onOpenAddSurvey={handleOpenAddSurvey}
        onOpenPdfModal={handleOpenPdfModal}
        onExportExcel={handleExportExcel}
        onOpenSqliteModal={handleOpenSqliteModal}
        onOpenVesselModal={handleOpenVesselModal}
        onSyncAll={handleSyncAllSurveys}
        onOpenExportImportModal={handleOpenExportImportModal}
        onQuickExportWord={handleQuickExportWord}
        onQuickExportPdf={handleOpenPdfModal}
        onDownloadTemplate={handleDownloadTemplate}
        onManualSave={handleManualSave}
      />

      {/* Main Content Area */}
      <main className="w-full px-2 sm:px-3 py-3 flex-1">
        {activeTab === 'repair-list' && (
          <RepairListTable
            categories={categories}
            workItems={workItems}
            projectId={activeProjectId}
            vessel={vessel}
            schedule={schedule}
            onAddItem={handleAddWorkItem}
            onUpdateItem={handleUpdateWorkItem}
            onDeleteItem={handleDeleteWorkItem}
            onBulkDeleteItems={handleBulkDeleteWorkItems}
            onClearAllItems={handleClearAllWorkItems}
            onBatchSaveWorkItems={handleBatchSaveWorkItems}
            onExportExcel={handleExportExcel}
            onImportWorkItems={handleImportWorkItems}
            onNotify={showToast}
          />
        )}

        {activeTab === 'material-estimation' && (
          <MaterialEstimationView
            projectId={activeProjectId}
            vessel={vessel}
            schedule={schedule}
            categories={categories}
            workItems={workItems}
            onNotify={showToast}
            onNavigateToRepairList={() => setActiveTab('repair-list')}
          />
        )}

        {activeTab === 'opname' && (
          <OpnameVerificationTable
            categories={categories}
            workItems={opnameItems}
            vessel={vessel}
            schedule={schedule}
            currentUser={currentUser}
            signatures={signatures}
            onUpdateItem={handleUpdateOpnameItem}
            onAddItem={handleAddOpnameItem}
            onDeleteItem={handleDeleteOpnameItem}
            onBulkDeleteItems={handleBulkDeleteOpnameItems}
            onBatchUpdateItems={handleBatchSaveOpnameItems}
            onClearAllItems={handleClearAllOpnameItems}
            onSyncFromRepairList={handleSyncOpnameFromRepairList}
            onExportExcel={handleExportExcel}
            onExportPdf={handleOpenPdfModal}
            onExportWord={handleQuickExportWord}
          />
        )}

        {activeTab === 'defect-surveys' && (
          <DefectSurveyList
            surveys={defectSurveys}
            onOpenAddModal={handleOpenAddSurvey}
            onEditSurvey={(survey) => {
              setEditingSurvey(survey);
              setIsAddSurveyOpen(true);
            }}
            onDeleteSurvey={handleDeleteSurvey}
            onConvertToWorkItem={handleConvertSurveyToBoq}
            onSyncAll={handleSyncAllSurveys}
            onExportExcel={handleExportExcel}
            onExportPdf={handleOpenPdfModal}
            onExportWord={handleQuickExportWord}
            onOpenImportModal={() => handleOpenExportImportModal('import')}
            onDownloadTemplate={handleDownloadTemplate}
            onOpenFullModal={(tab) => handleOpenExportImportModal(tab)}
          />
        )}

        {activeTab === 'plan-vs-actual' && (
          <PlanProgressModule
            vessel={vessel}
            schedule={schedule}
            categories={categories}
            workItems={workItems}
            onUpdateItems={(items) => {
              setWorkItems(items);
              handleUpdateWorkItemsBatch(items);
            }}
            onSaveToast={showToast}
          />
        )}

        {activeTab === 'cost-estimation' && (
          <CostEstimationSummary
            categories={categories}
            workItems={workItems}
            vessel={vessel}
            onOpenPdfModal={handleOpenPdfModal}
            onExportExcel={handleExportExcel}
            onExportWord={handleQuickExportWord}
            onOpenImportModal={() => handleOpenExportImportModal('import')}
            onDownloadTemplate={handleDownloadTemplate}
            onOpenFullModal={(tab) => handleOpenExportImportModal(tab)}
            onAddItem={handleAddWorkItem}
            onUpdateItem={handleUpdateWorkItem}
            onDeleteItem={handleDeleteWorkItem}
            onBulkDeleteItems={handleBulkDeleteWorkItems}
            onUpdateItemsBatch={handleUpdateWorkItemsBatch}
            onNavigateToMaterialEstimation={() => setActiveTab('material-estimation')}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-2.5 text-xs text-slate-500 w-full">
        <div className="w-full px-2 sm:px-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-500">
            <span className="font-medium text-slate-700">&copy; {new Date().getFullYear()} Sistem Reparasi Galangan Kapal</span>
            <span className="text-slate-300">&bull;</span>
            <span className="text-slate-500">Standar BKI &amp; IACS</span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Prepared: <strong className="text-slate-700 font-medium">{signatures.preparedByName || 'Pimpro'}</strong> ({signatures.preparedByTitle})</span>
            </span>
            <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              <span>Reviewed: <strong className="text-slate-700 font-medium">{signatures.reviewedByName || 'Owner Surveyor'}</strong> ({signatures.reviewedByTitle})</span>
            </span>
          </div>
        </div>
      </footer>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-lg border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modals */}
      <DefectSurveyModal
        isOpen={isAddSurveyOpen}
        onClose={handleCloseAddSurvey}
        onSave={handleSaveSurvey}
        initialSurvey={editingSurvey}
        projectId={schedule.id}
      />

      <PdfExportModal
        isOpen={isPdfModalOpen}
        onClose={handleClosePdfModal}
        vessel={vessel}
        schedule={schedule}
        categories={categories}
        workItems={workItems}
        signatures={signatures}
        defectSurveys={defectSurveys}
        onSaveSignatures={handleSaveSignatures}
      />

      <SqliteConsoleModal
        isOpen={isSqliteModalOpen}
        onClose={handleCloseSqliteModal}
        vesselName={vessel.name}
        onConfirm={showCustomConfirm}
        onAlert={showCustomAlert}
      />

      <VesselProjectModal
        isOpen={isVesselModalOpen}
        onClose={handleCloseVesselModal}
        vessel={vessel}
        schedule={schedule}
        onSave={handleSaveVesselAndSchedule}
        onAlert={showCustomAlert}
      />

      <CustomDialogModal
        isOpen={dialogState.isOpen}
        type={dialogState.type}
        title={dialogState.title}
        message={dialogState.message}
        onConfirm={dialogState.onConfirm}
        onClose={handleCloseDialog}
      />

      <ExportImportModal
        isOpen={isExportImportModalOpen}
        onClose={handleCloseExportImportModal}
        initialTab={exportImportDefaultTab}
        vessel={vessel}
        schedule={schedule}
        categories={categories}
        workItems={workItems}
        signatures={signatures}
        defectSurveys={defectSurveys}
        onOpenPdfModal={() => {
          setIsExportImportModalOpen(false);
          setIsPdfModalOpen(true);
        }}
        onExportExcel={handleExportExcel}
        onImportWorkItems={handleImportWorkItems}
        onNotify={showToast}
        onConfirm={showCustomConfirm}
        onAlert={showCustomAlert}
      />
    </div>
  );
}
