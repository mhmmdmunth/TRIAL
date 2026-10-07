import React, { useState, useMemo } from 'react';
import {
  History,
  X,
  Search,
  Filter,
  User,
  Clock,
  Trash2,
  Download,
  CheckCircle2,
  Edit3,
  Layers,
  FileSpreadsheet,
  RefreshCw,
  Tag,
  AlertCircle,
} from 'lucide-react';
import { WorkItemAuditLog, WorkItem } from '../types';
import { sqliteService } from '../services/sqliteService';

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialWorkItemId?: string;
  workItems: WorkItem[];
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({
  isOpen,
  onClose,
  initialWorkItemId,
  workItems,
}) => {
  const [selectedWorkItemId, setSelectedWorkItemId] = useState<string>(initialWorkItemId || 'all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // Sync initialWorkItemId when modal opens
  React.useEffect(() => {
    if (!isOpen) return;
    if (initialWorkItemId) {
      setSelectedWorkItemId(initialWorkItemId);
    } else {
      setSelectedWorkItemId('all');
    }
    setShowClearConfirm(false);
  }, [initialWorkItemId, isOpen]);

  // Load audit logs from sqliteService
  const logs = useMemo(() => {
    if (!isOpen) return [];
    const filterId = selectedWorkItemId !== 'all' ? selectedWorkItemId : undefined;
    return sqliteService.getAuditLogs(filterId, 500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedWorkItemId, refreshKey]);

  // Filter logs by search and action
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Action filter
      if (selectedAction !== 'all' && log.action !== selectedAction) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchItemNo = log.itemNo ? log.itemNo.toLowerCase().includes(q) : false;
        const matchDesc = log.description ? log.description.toLowerCase().includes(q) : false;
        const matchUser = log.changedBy ? log.changedBy.toLowerCase().includes(q) : false;
        const matchRole = log.changedByRole ? log.changedByRole.toLowerCase().includes(q) : false;
        const matchDetails = log.details ? log.details.toLowerCase().includes(q) : false;
        return matchItemNo || matchDesc || matchUser || matchRole || matchDetails;
      }
      return true;
    });
  }, [logs, selectedAction, searchQuery]);

  if (!isOpen) return null;

  const handleExecuteClearLogs = (clearScopeAll: boolean = false) => {
    const targetId = clearScopeAll || selectedWorkItemId === 'all' ? undefined : selectedWorkItemId;
    sqliteService.clearAuditLogs(targetId);
    setRefreshKey((k) => k + 1);
    setShowClearConfirm(false);
    setNotificationMsg(targetId ? 'Riwayat perubahan item pekerjaan berhasil dihapus.' : 'Seluruh log audit trail proyek berhasil dibersihkan.');
    setTimeout(() => {
      setNotificationMsg(null);
    }, 3000);
  };

  const handleExportCsv = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['Waktu', 'Item No', 'Deskripsi Pekerjaan', 'Aksi', 'Oleh', 'Jabatan / Peran', 'Detail Perubahan'];
    const rows = filteredLogs.map((l) => [
      `"${new Date(l.timestamp).toLocaleString('id-ID')}"`,
      `"${l.itemNo || ''}"`,
      `"${(l.description || '').replace(/"/g, '""')}"`,
      `"${l.action}"`,
      `"${l.changedBy}"`,
      `"${l.changedByRole || ''}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Audit_Trail_Repair_List_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTimestamp = (iso: string) => {
    try {
      const date = new Date(iso);
      const formatted = date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      // Calculate relative time
      const diffMs = Date.now() - date.getTime();
      const diffMin = Math.floor(diffMs / (1000 * 60));
      const diffHrs = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHrs / 24);

      let relative = '';
      if (diffMin < 1) relative = 'Baru saja';
      else if (diffMin < 60) relative = `${diffMin} mnt lalu`;
      else if (diffHrs < 24) relative = `${diffHrs} jam lalu`;
      else relative = `${diffDays} hari lalu`;

      return { formatted, relative };
    } catch {
      return { formatted: iso, relative: '' };
    }
  };

  const getActionBadge = (action: WorkItemAuditLog['action']) => {
    switch (action) {
      case 'created':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3" /> Dibuat
          </span>
        );
      case 'updated':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">
            <Edit3 className="w-3 h-3" /> Diperbarui
          </span>
        );
      case 'dimension_changed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            <Tag className="w-3 h-3" /> Dimensi / Material
          </span>
        );
      case 'progress_updated':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-100 text-cyan-800 border border-cyan-300">
            <RefreshCw className="w-3 h-3" /> Progres Fisik
          </span>
        );
      case 'status_changed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300">
            <CheckCircle2 className="w-3 h-3" /> Status Selesai
          </span>
        );
      case 'deleted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
            <Trash2 className="w-3 h-3" /> Dihapus
          </span>
        );
      case 'reordered':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-300">
            <Layers className="w-3 h-3" /> Susunan / Nomor Urut
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-300">
            {action}
          </span>
        );
    }
  };

  const getRoleBadge = (role?: string) => {
    const r = (role || 'PPC').toUpperCase();
    if (r.includes('PPC') || r.includes('PLANNING')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (r.includes('QC') || r.includes('INSPECTOR') || r.includes('SURVEYOR')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (r.includes('MANAGER') || r.includes('YARD')) {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    if (r.includes('SUB') || r.includes('VENDOR')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Log Riwayat Perubahan (Audit Trail)
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-mono">
                  {filteredLogs.length} Entri
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Pencatatan rekam jejak otomatis: waktu pengubahan, pelaku (user/role), dan rincian perubahan data pekerjaan.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nomor, deskripsi, nama user..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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

            {/* Work Item Scope Select */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={selectedWorkItemId}
                onChange={(e) => setSelectedWorkItemId(e.target.value)}
                className="text-xs py-1.5 px-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none max-w-[220px] text-ellipsis"
              >
                <option value="all">Semua Item Pekerjaan (Proyek)</option>
                {workItems.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.itemNo ? `${w.itemNo} - ` : ''}
                    {w.description.length > 35 ? `${w.description.substring(0, 35)}...` : w.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Type Select */}
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="text-xs py-1.5 px-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="all">Semua Aksi</option>
              <option value="created">Dibuat (Created)</option>
              <option value="updated">Diperbarui (Updated)</option>
              <option value="dimension_changed">Dimensi & Material</option>
              <option value="progress_updated">Progres Fisik</option>
              <option value="status_changed">Status Selesai</option>
              <option value="reordered">Susunan / Nomor Urut</option>
              <option value="deleted">Dihapus (Deleted)</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowClearConfirm(false);
                setRefreshKey((k) => k + 1);
              }}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg border border-slate-300 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Muat Ulang Log"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Segarkan</span>
            </button>
            <button
              onClick={handleExportCsv}
              disabled={filteredLogs.length === 0}
              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="Unduh Log sebagai CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Ekspor CSV</span>
            </button>
            <button
              onClick={() => setShowClearConfirm(!showClearConfirm)}
              disabled={logs.length === 0}
              className={`px-2.5 py-1.5 ${
                showClearConfirm ? 'bg-rose-600 text-white border-rose-700' : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
              } border text-xs font-medium rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer`}
              title="Bersihkan / Hapus Log"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Log</span>
            </button>
          </div>
        </div>

        {/* Notification Toast Bar */}
        {notificationMsg && (
          <div className="px-6 py-2.5 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{notificationMsg}</span>
            </div>
            <button
              onClick={() => setNotificationMsg(null)}
              className="text-emerald-600 hover:text-emerald-900 p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* In-App Clear Confirmation Panel */}
        {showClearConfirm && (
          <div className="px-6 py-3 bg-rose-50 border-b border-rose-200 flex flex-wrap items-center justify-between gap-3 text-xs animate-fadeIn">
            <div className="flex items-center gap-2 text-rose-900">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <div>
                <span className="font-semibold">Konfirmasi Pembersihan Log:</span>{' '}
                {selectedWorkItemId !== 'all'
                  ? 'Pilih cakupan log riwayat yang ingin dihapus:'
                  : 'Yakin ingin menghapus seluruh log riwayat audit trail proyek ini? Tindakan ini tidak dapat dibatalkan.'}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {selectedWorkItemId !== 'all' ? (
                <>
                  <button
                    onClick={() => handleExecuteClearLogs(false)}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-md shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Hapus Item Ini Saja</span>
                  </button>
                  <button
                    onClick={() => handleExecuteClearLogs(true)}
                    className="px-3 py-1 bg-rose-800 hover:bg-rose-900 text-white font-medium rounded-md shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Hapus Seluruh Proyek</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleExecuteClearLogs(true)}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-md shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Ya, Hapus Seluruh Log</span>
                </button>
              )}
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-medium rounded-md transition-colors cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {/* Audit Log Timeline Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100/50">
          {filteredLogs.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-200/80 flex items-center justify-center mx-auto mb-3 text-slate-400">
                <History className="w-8 h-8" />
              </div>
              <h4 className="text-base font-semibold text-slate-700">Belum Ada Catatan Riwayat</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Aktivitas penambahan, perubahan data material, volume, status progres, dan nomor urut pekerjaan akan otomatis tercatat di sini secara permanen.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredLogs.map((log) => {
                const { formatted, relative } = formatTimestamp(log.timestamp);
                return (
                  <div
                    key={log.id}
                    className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                      {/* Left: Item identity and action */}
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {getActionBadge(log.action)}
                        <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {log.itemNo || 'Item'}
                        </span>
                        <span className="font-semibold text-sm text-slate-900">
                          {log.description || 'Pekerjaan Galangan'}
                        </span>
                      </div>

                      {/* Right: Timestamp */}
                      <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium text-slate-700">{formatted}</span>
                        {relative && (
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-mono">
                            {relative}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Content: Details and Actor Badge */}
                    <div className="pt-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                      <div className="flex-1 text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200/60 font-mono text-[11px] leading-relaxed">
                        <span className="text-slate-500 font-sans font-medium mr-1.5">Keterangan:</span>
                        {log.details || 'Pembaruan data pekerjaan'}
                      </div>

                      {/* Actor Badge */}
                      <div className="flex items-center gap-2 shrink-0 bg-slate-50/80 px-3 py-1.5 rounded-lg border border-slate-200 self-start md:self-auto">
                        <div className="w-6 h-6 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-[10px]">
                          {(log.changedBy || 'U')[0].toUpperCase()}
                        </div>
                        <div className="text-left">
                          <div className="font-semibold text-slate-800 text-[11px]">
                            {log.changedBy || 'User'}
                          </div>
                          <div className="flex items-center gap-1">
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded border font-medium uppercase ${getRoleBadge(
                                log.changedByRole
                              )}`}
                            >
                              {log.changedByRole || 'PPC'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>Audit trail tersimpan di SQLite Browser & Local Database proyek.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-lg transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
