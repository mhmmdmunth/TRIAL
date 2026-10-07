import React, { useState, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Link,
  Unlink,
  ArrowDownToLine,
  ArrowUpFromLine,
  Database,
  Layers,
  Sparkles,
  Lock,
  LogOut,
  Sliders,
  Check,
  Eye,
} from 'lucide-react';
import { WorkCategory, WorkItem, VesselSpec } from '../types';
import {
  googleSignIn,
  googleSignOut,
  initGoogleAuth,
  getGoogleAccessToken,
  getCachedGoogleUser,
} from '../services/googleAuthService';
import {
  googleSheetsService,
  LinkedSpreadsheet,
} from '../services/googleSheetsService';
import { exportShipyardExcel } from '../utils/excelExport';
import { DEFAULT_SCHEDULE, DEFAULT_SIGNATURES } from '../data/shipyardSeedData';
import { User } from 'firebase/auth';

interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  vessel: VesselSpec;
  categories: WorkCategory[];
  workItems: WorkItem[];
  projectId?: string;
  onApplyImportedItems: (items: WorkItem[], mode: 'replace' | 'append') => void;
  onShowToast?: (msg: string) => void;
}

export const GoogleSheetsSyncModal: React.FC<GoogleSheetsSyncModalProps> = ({
  isOpen,
  onClose,
  vessel,
  categories,
  workItems,
  projectId = 'proj-f049',
  onApplyImportedItems,
  onShowToast,
}) => {
  const [googleUser, setGoogleUser] = useState<User | null>(getCachedGoogleUser());
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [linkedSheet, setLinkedSheet] = useState<LinkedSpreadsheet | null>(null);
  const [sheetUrlInput, setSheetUrlInput] = useState('');
  
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pull Preview State
  const [pulledResult, setPulledResult] = useState<{
    items: WorkItem[];
    sheetTitle: string;
    totalWeightKg: number;
    totalCost: number;
    areaCount: number;
  } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<'pull' | 'push' | null>(null);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');

  // Load linked sheet on open & listen to auth
  useEffect(() => {
    if (isOpen) {
      const saved = googleSheetsService.getLinkedSpreadsheet(projectId);
      setLinkedSheet(saved);
      if (saved) {
        setSheetUrlInput(saved.spreadsheetUrl);
      }
      setGoogleUser(getCachedGoogleUser());
      setSyncStatusMsg(null);
      setErrorMessage(null);
      setPulledResult(null);
    }
  }, [isOpen, projectId]);

  useEffect(() => {
    const unsub = initGoogleAuth((user) => {
      setGoogleUser(user);
    });
    return () => unsub();
  }, []);

  if (!isOpen) return null;

  const handleGoogleLogin = async (): Promise<boolean> => {
    setIsAuthLoading(true);
    setErrorMessage(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        onShowToast?.('Berhasil terhubung dengan Google Workspace!');
        return true;
      } else {
        // User closed or cancelled popup
        return false;
      }
    } catch (e: any) {
      if (e?.code === 'auth/popup-blocked') {
        setErrorMessage('Jendela login Google diblokir oleh browser. Silakan izinkan pop-up untuk situs ini.');
      } else {
        setErrorMessage(e.message || 'Gagal login dengan akun Google.');
      }
      return false;
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await googleSignOut();
      setGoogleUser(null);
      onShowToast?.('Telah keluar dari akun Google.');
    } catch (e: any) {
      console.error('Logout error', e);
    }
  };

  const handleCreateNewSpreadsheet = async () => {
    setErrorMessage(null);
    setSyncStatusMsg(null);

    // Verify or prompt login first
    let token = await getGoogleAccessToken();
    if (!token || !googleUser) {
      const loginSuccess = await handleGoogleLogin();
      if (!loginSuccess) {
        // Stop if user did not log in
        return;
      }
      token = await getGoogleAccessToken();
      if (!token) {
        setErrorMessage('Silakan selesaikan login Google untuk membuat spreadsheet.');
        return;
      }
    }

    setIsCreatingSheet(true);
    try {
      const newLinked = await googleSheetsService.createRepairListSpreadsheet(
        vessel,
        categories,
        workItems
      );
      googleSheetsService.saveLinkedSpreadsheet(projectId, newLinked);
      setLinkedSheet(newLinked);
      setSheetUrlInput(newLinked.spreadsheetUrl);
      setSyncStatusMsg('Google Spreadsheet baru berhasil dibuat dan diformat otomatis!');
      onShowToast?.('Spreadsheet baru siap dikelola online!');
    } catch (e: any) {
      console.error('Create Sheet Failed', e);
      setErrorMessage(e.message || 'Gagal membuat Google Spreadsheet.');
    } finally {
      setIsCreatingSheet(false);
    }
  };

  const handleLinkExistingSheet = async () => {
    setErrorMessage(null);
    const parsedId = googleSheetsService.parseSpreadsheetId(sheetUrlInput);
    if (!parsedId) {
      setErrorMessage('URL atau ID Google Spreadsheet tidak valid.');
      return;
    }

    try {
      const { sheetTitle } = await googleSheetsService.fetchSpreadsheetRawData(parsedId);
      const linked: LinkedSpreadsheet = {
        spreadsheetId: parsedId,
        spreadsheetUrl: sheetUrlInput.includes('http')
          ? sheetUrlInput
          : `https://docs.google.com/spreadsheets/d/${parsedId}/edit`,
        title: sheetTitle || `Repair List Sheet (${parsedId.substring(0, 8)})`,
        sheetName: sheetTitle || 'Sheet1',
        lastSyncedAt: new Date().toISOString(),
      };
      googleSheetsService.saveLinkedSpreadsheet(projectId, linked);
      setLinkedSheet(linked);
      setSyncStatusMsg('Spreadsheet berhasil ditautkan ke proyek ini.');
      onShowToast?.('Spreadsheet berhasil ditautkan!');
    } catch (e: any) {
      console.error('Link sheet failed', e);
      setErrorMessage(e.message || 'Gagal mengakses Google Spreadsheet yang ditautkan.');
    }
  };

  const handleUnlink = () => {
    googleSheetsService.unlinkSpreadsheet(projectId);
    setLinkedSheet(null);
    setSheetUrlInput('');
    setPulledResult(null);
    setSyncStatusMsg('Tautan Google Spreadsheet telah dilepas.');
  };

  const handleStartPull = async () => {
    if (!linkedSheet) return;
    setIsPulling(true);
    setErrorMessage(null);
    try {
      const { parseResult, sheetTitle } = await googleSheetsService.pullAndParseWorkItems(
        linkedSheet.spreadsheetId,
        projectId,
        categories,
        linkedSheet.sheetName
      );

      if (!parseResult.success) {
        throw new Error(parseResult.errors.join('\n'));
      }

      setPulledResult({
        items: parseResult.importedItems,
        sheetTitle,
        totalWeightKg: parseResult.summary.totalWeightKg,
        totalCost: parseResult.summary.totalCost,
        areaCount: parseResult.summary.areaHeadersCount,
      });

      // Show confirmation dialog before mutating local DB as mandated by Workspace skill
      setShowConfirmModal('pull');
    } catch (e: any) {
      console.error('Pull failed', e);
      setErrorMessage(e.message || 'Gagal menarik data dari Google Sheets.');
    } finally {
      setIsPulling(false);
    }
  };

  const handleConfirmPull = () => {
    if (!pulledResult) return;
    onApplyImportedItems(pulledResult.items, importMode);
    
    // Update last sync time
    const updated: LinkedSpreadsheet = {
      ...linkedSheet!,
      lastSyncedAt: new Date().toISOString(),
      totalRows: pulledResult.items.length,
    };
    googleSheetsService.saveLinkedSpreadsheet(projectId, updated);
    setLinkedSheet(updated);

    setShowConfirmModal(null);
    setPulledResult(null);
    setSyncStatusMsg(
      `Sukses! ${pulledResult.items.length} item pekerjaan berhasil diperbarui secara inline dari Google Sheets.`
    );
    onShowToast?.('Tabel Repair List berhasil disinkronkan!');
  };

  const handleStartPush = () => {
    if (!linkedSheet) return;
    setShowConfirmModal('push');
  };

  const handleConfirmPush = async () => {
    if (!linkedSheet) return;
    setShowConfirmModal(null);
    setIsPushing(true);
    setErrorMessage(null);
    try {
      const res = await googleSheetsService.pushWorkItemsToSpreadsheet(
        linkedSheet.spreadsheetId,
        linkedSheet.sheetName,
        categories,
        workItems
      );

      const updated: LinkedSpreadsheet = {
        ...linkedSheet,
        lastSyncedAt: new Date().toISOString(),
        totalRows: workItems.length,
      };
      googleSheetsService.saveLinkedSpreadsheet(projectId, updated);
      setLinkedSheet(updated);

      setSyncStatusMsg(`Berhasil mengirim seluruh baris (${workItems.length} item) ke Google Sheets!`);
      onShowToast?.('Pembaruan data berhasil dikirim ke Google Sheets!');
    } catch (e: any) {
      console.error('Push failed', e);
      setErrorMessage(e.message || 'Gagal mengirim data ke Google Sheets.');
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#03442C] text-white flex items-center justify-between border-b-2 border-emerald-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-800/80 border border-emerald-600/60 text-amber-300">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight flex items-center gap-2">
                <span>Google Sheets Live Sync &amp; Inline Maintain</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-700 font-mono text-emerald-200">
                  Two-Way Sync
                </span>
              </h2>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                Kelola repair list secara kolaboratif di Google Spreadsheet &amp; sinkronkan pembaruan inline ke aplikasi.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-800/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* 1. Google Account Connection Card */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                1. Status Akun Google Workspace
              </span>
              {googleUser ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-semibold">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Terhubung
                </span>
              ) : (
                <span className="text-[11px] text-slate-500">Belum login</span>
              )}
            </div>

            {googleUser ? (
              <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200">
                <div className="flex items-center gap-3">
                  {googleUser.photoURL ? (
                    <img
                      src={googleUser.photoURL}
                      alt={googleUser.displayName || 'Google User'}
                      className="w-9 h-9 rounded-full border border-slate-200"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-xs">
                      {googleUser.email?.substring(0, 2).toUpperCase() || 'G'}
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-bold text-slate-900">{googleUser.displayName || 'Pengguna Google'}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{googleUser.email}</div>
                  </div>
                </div>
                <button
                  onClick={handleGoogleLogout}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-medium inline-flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5 text-slate-400" />
                  <span>Keluar</span>
                </button>
              </div>
            ) : (
              <div className="bg-white p-3.5 rounded-lg border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-slate-600 text-center sm:text-left">
                  Hubungkan akun Google Anda untuk membaca, membuat, dan memperbarui Google Sheets secara instan.
                </p>
                {/* Official Material Google Sign-In Button */}
                <button
                  onClick={handleGoogleLogin}
                  disabled={isAuthLoading}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl shadow-xs font-semibold text-xs inline-flex items-center gap-2 transition-all cursor-pointer shrink-0"
                >
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                  <span>{isAuthLoading ? 'Menghubungkan...' : 'Sign in with Google'}</span>
                </button>
              </div>
            )}
          </div>

          {/* 2. Linked Google Spreadsheet Section */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                2. Spreadsheet Terhubung
              </span>
              {linkedSheet && (
                <button
                  onClick={handleUnlink}
                  className="text-slate-400 hover:text-rose-600 text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer transition-colors"
                  title="Lepaskan tautan spreadsheet ini"
                >
                  <Unlink className="w-3 h-3" />
                  <span>Putuskan Tautan</span>
                </button>
              )}
            </div>

            {linkedSheet ? (
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-emerald-950 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{linkedSheet.title}</span>
                    </h3>
                    <p className="text-[11px] text-emerald-800/80 mt-0.5 font-mono">
                      Sheet: <strong className="text-emerald-900">{linkedSheet.sheetName}</strong> &bull; ID:{' '}
                      {linkedSheet.spreadsheetId.substring(0, 16)}...
                    </p>
                    {linkedSheet.lastSyncedAt && (
                      <p className="text-[10px] text-slate-500 mt-1">
                        Terakhir sinkron: {new Date(linkedSheet.lastSyncedAt).toLocaleString('id-ID')}
                      </p>
                    )}
                  </div>
                  <a
                    href={linkedSheet.spreadsheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs inline-flex items-center gap-1.5 shrink-0 transition-colors"
                  >
                    <span>Buka Sheet</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* Inline Action Sync Buttons */}
                <div className="pt-2 border-t border-emerald-200/60 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={handleStartPull}
                    disabled={isPulling || isPushing}
                    className="p-2.5 rounded-xl bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold shadow-2xs inline-flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <ArrowDownToLine className={`w-4 h-4 text-emerald-700 ${isPulling ? 'animate-bounce' : ''}`} />
                    <div className="text-left">
                      <div className="leading-tight">Tarik dari Google Sheets (Pull)</div>
                      <div className="text-[10px] text-slate-500 font-normal">Update tabel aplikasi dari online</div>
                    </div>
                  </button>

                  <button
                    onClick={handleStartPush}
                    disabled={isPulling || isPushing}
                    className="p-2.5 rounded-xl bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold shadow-2xs inline-flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <ArrowUpFromLine className={`w-4 h-4 text-emerald-700 ${isPushing ? 'animate-bounce' : ''}`} />
                    <div className="text-left">
                      <div className="leading-tight">Kirim ke Google Sheets (Push)</div>
                      <div className="text-[10px] text-slate-500 font-normal">Kirim perubahan lokal ke sheet</div>
                    </div>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Option A: Create New Sheet */}
                <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-emerald-950">Buat Google Spreadsheet Otomatis</h4>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Membuat spreadsheet terformat lengkap dengan formula tonase, RAB, dan hirarki pekerjaan kapal {vessel.name}.
                      </p>
                    </div>
                    <button
                      onClick={handleCreateNewSpreadsheet}
                      disabled={isCreatingSheet}
                      className="px-3.5 py-2 bg-[#03442C] hover:bg-[#04593A] text-white rounded-xl text-xs font-bold shadow-xs inline-flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
                    >
                      {isCreatingSheet ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-300" />
                          <span>Sedang Membuat...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>Buat Spreadsheet</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="pt-2 border-t border-emerald-200/60 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <span className="text-slate-500">Alternatif Web:</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          await exportShipyardExcel({
                            vessel,
                            schedule: DEFAULT_SCHEDULE,
                            categories,
                            workItems,
                            signatures: DEFAULT_SIGNATURES,
                            includePrices: true,
                          });
                          onShowToast?.('File Excel berhasil diunduh. Unggah ke Google Drive untuk dibuka di Google Sheets.');
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg font-medium cursor-pointer transition-colors"
                      >
                        Download Excel Formatted
                      </button>
                      <a
                        href="https://sheets.new"
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg font-medium cursor-pointer inline-flex items-center gap-1 transition-colors"
                      >
                        <span>Buka sheets.new</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Option B: Link Existing Sheet */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <h4 className="text-xs font-bold text-slate-800">Atau Tautkan Google Sheet yang Sudah Ada</h4>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={sheetUrlInput}
                      onChange={(e) => setSheetUrlInput(e.target.value)}
                      placeholder="Tempel URL atau ID Spreadsheet (contoh: https://docs.google.com/spreadsheets/d/...)"
                      className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      onClick={handleLinkExistingSheet}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer shrink-0 inline-flex items-center gap-1"
                    >
                      <Link className="w-3 h-3" />
                      <span>Tautkan</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Feedback & Error Messages */}
          {syncStatusMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{syncStatusMsg}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span>SQLite Engine &bull; Validasi Tipe Data Aktif</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Workspace Mutating Actions (Mandatory as per Workspace Skill) */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-full bg-amber-100 text-amber-800 shrink-0">
                <AlertCircle className="w-6 h-6 text-amber-700" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {showConfirmModal === 'pull'
                    ? 'Konfirmasi Pembaruan Inline dari Google Sheets'
                    : 'Konfirmasi Kirim Data ke Google Sheets'}
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  {showConfirmModal === 'pull'
                    ? `Apakah Anda yakin ingin menerapkan ${pulledResult?.items.length || 0} item pekerjaan dari Google Sheet "${pulledResult?.sheetTitle}" ke database aplikasi?`
                    : `Apakah Anda yakin ingin memperbarui Google Sheet "${linkedSheet?.title}" dengan ${workItems.length} item pekerjaan yang ada di aplikasi saat ini?`}
                </p>
              </div>
            </div>

            {showConfirmModal === 'pull' && pulledResult && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="font-bold text-slate-700">Ringkasan Data yang Ditarik:</div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>Total Item: <strong>{pulledResult.items.length}</strong></div>
                  <div>Area Header: <strong>{pulledResult.areaCount}</strong></div>
                  <div>Tonase: <strong>{(pulledResult.totalWeightKg / 1000).toFixed(2)} Ton</strong></div>
                  <div>Nilai RAB: <strong>Rp {pulledResult.totalCost.toLocaleString('id-ID')}</strong></div>
                </div>

                <div className="pt-2 border-t border-slate-200">
                  <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                    Mode Penerapan:
                  </label>
                  <div className="flex gap-2">
                    <label className="flex items-center gap-1.5 text-xs text-slate-800 cursor-pointer">
                      <input
                        type="radio"
                        checked={importMode === 'replace'}
                        onChange={() => setImportMode('replace')}
                        className="text-emerald-600"
                      />
                      <span>Gantikan Semua (Replace)</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-800 cursor-pointer ml-3">
                      <input
                        type="radio"
                        checked={importMode === 'append'}
                        onChange={() => setImportMode('append')}
                        className="text-emerald-600"
                      />
                      <span>Tambahkan (Append)</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowConfirmModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={showConfirmModal === 'pull' ? handleConfirmPull : handleConfirmPush}
                className="px-4 py-2 rounded-xl bg-[#03442C] hover:bg-[#04593A] text-white text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <Check className="w-4 h-4 text-amber-300" />
                <span>{showConfirmModal === 'pull' ? 'Terapkan ke Aplikasi' : 'Kirim ke Spreadsheet'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
