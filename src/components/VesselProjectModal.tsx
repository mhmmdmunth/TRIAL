import React, { useState, useEffect } from 'react';
import { X, Save, Ship, Calendar, Camera, Upload, Trash2, Link, Check } from 'lucide-react';
import { VesselSpec, ProjectSchedule } from '../types';
import { parseDateFlexible, formatDateToIso, formatDateToDisplay, formatDayName, calculateDockingDuration } from '../utils/dateUtils';

const PRESET_VESSEL_PHOTOS = [
  {
    name: 'Tug Boat',
    url: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Cargo Ship',
    url: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Tanker',
    url: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Container',
    url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80',
  },
];

interface VesselProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  vessel: VesselSpec;
  schedule: ProjectSchedule;
  onSave: (vessel: VesselSpec, schedule: ProjectSchedule) => void;
  onAlert?: (title: string, message: string) => void;
}

export const VesselProjectModal: React.FC<VesselProjectModalProps> = ({
  isOpen,
  onClose,
  vessel,
  schedule,
  onSave,
  onAlert,
}) => {
  const [vesselForm, setVesselForm] = useState<VesselSpec>(vessel);
  const [scheduleForm, setScheduleForm] = useState<ProjectSchedule>(schedule);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && (e.key === 'Escape' || e.key === 'Esc')) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setVesselForm(vessel);
      setScheduleForm(schedule);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      if (onAlert) {
        onAlert('Ukuran File Melebihi Batas', 'Ukuran file foto maksimal adalah 8MB.');
      } else {
        alert('Ukuran file foto maksimal 8MB');
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setVesselForm((prev) => ({ ...prev, photoUrl: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const getIsoDateString = (dateStr?: string | null): string => {
    if (!dateStr || dateStr === '-') return '';
    const d = parseDateFlexible(dateStr);
    if (!d) return '';
    return formatDateToIso(d);
  };

  const formatIsoToDisplay = (isoStr: string): string => {
    if (!isoStr) return '-';
    const d = parseDateFlexible(isoStr);
    if (!d) return isoStr;
    const dayName = formatDayName(d);
    const displayDate = formatDateToDisplay(d);
    return dayName ? `${dayName}, ${displayDate}` : displayDate;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(vesselForm, scheduleForm);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              Spesifikasi Kapal &amp; Jadwal Docking (PPC)
            </h3>
            <p className="text-xs text-slate-500">
              Informasi header formal dokumen estimasi dan repair list galangan.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 flex-1 overflow-y-auto">
          {/* Vessel Photo Upload Section */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-emerald-600" />
                <span>Foto Profil / Visual Kapal</span>
              </label>
              {vesselForm.photoUrl && (
                <button
                  type="button"
                  onClick={() => setVesselForm({ ...vesselForm, photoUrl: '' })}
                  className="text-[11px] font-medium text-rose-600 hover:text-rose-700 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Hapus Foto</span>
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Image Preview Box */}
              <div className="relative group shrink-0">
                {vesselForm.photoUrl ? (
                  <img
                    src={vesselForm.photoUrl}
                    alt="Preview Kapal"
                    className="w-24 h-24 rounded-xl object-cover border-2 border-emerald-500/30 shadow-xs"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-xl bg-slate-200 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 gap-1">
                    <Ship className="w-8 h-8 text-slate-400" />
                    <span className="text-[10px] font-medium">Belum ada foto</span>
                  </div>
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex-1 space-y-2.5 w-full text-xs">
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg cursor-pointer shadow-xs transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Foto Dari HP/PC</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      const url = prompt('Masukkan URL Foto Kapal (https://...):', vesselForm.photoUrl || '');
                      if (url !== null) {
                        setVesselForm({ ...vesselForm, photoUrl: url.trim() });
                      }
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-medium rounded-lg border border-slate-300 transition-colors"
                  >
                    <Link className="w-3.5 h-3.5 text-slate-500" />
                    <span>Input URL Gambar</span>
                  </button>
                </div>

                {/* Presets options */}
                <div>
                  <span className="block text-[10px] text-slate-500 font-medium mb-1">
                    Atau pilih sampel foto tipe kapal:
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {PRESET_VESSEL_PHOTOS.map((preset) => {
                      const isSelected = vesselForm.photoUrl === preset.url;
                      return (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => setVesselForm({ ...vesselForm, photoUrl: preset.url })}
                          className={`text-[10px] px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 transition-all ${
                            isSelected
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-400 font-semibold shadow-2xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-emerald-600" />}
                          <span>{preset.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Vessel Specification Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
              <Ship className="w-4 h-4 text-emerald-600" />
              <span>General Specification Vessel</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Vessel Name
                </label>
                <input
                  type="text"
                  value={vesselForm.name}
                  onChange={(e) => setVesselForm({ ...vesselForm, name: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Vessel Dimension
                </label>
                <input
                  type="text"
                  value={vesselForm.dimension}
                  onChange={(e) => setVesselForm({ ...vesselForm, dimension: e.target.value })}
                  placeholder="23,97 x 7,26 x 3,00 Meter"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Vessel Type
                </label>
                <input
                  type="text"
                  value={vesselForm.vesselType}
                  onChange={(e) => setVesselForm({ ...vesselForm, vesselType: e.target.value })}
                  placeholder="Tug Boat / Barge"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Docking Type
                </label>
                <input
                  type="text"
                  value={vesselForm.dockingType}
                  onChange={(e) => setVesselForm({ ...vesselForm, dockingType: e.target.value })}
                  placeholder="Docking Repair / Special Survey"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Company Owner
                </label>
                <input
                  type="text"
                  value={vesselForm.companyOwner}
                  onChange={(e) => setVesselForm({ ...vesselForm, companyOwner: e.target.value })}
                  placeholder="PT. PELAYARAN KARTIKA SAMUDRA ADIJAYA"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Project No
                </label>
                <input
                  type="text"
                  value={vesselForm.projectNo}
                  onChange={(e) => setVesselForm({ ...vesselForm, projectNo: e.target.value })}
                  placeholder="F-049"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Classification
                </label>
                <input
                  type="text"
                  value={vesselForm.classification}
                  onChange={(e) => setVesselForm({ ...vesselForm, classification: e.target.value })}
                  placeholder="BKI / NK / LR"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Kind of Survey
                </label>
                <input
                  type="text"
                  value={vesselForm.kindOfSurvey}
                  onChange={(e) => setVesselForm({ ...vesselForm, kindOfSurvey: e.target.value })}
                  placeholder="Intermediate Survey No. 5"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Project Schedule Section */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Date of Project (PPC Timeline)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Arrive @BGN
                </label>
                <input
                  type="date"
                  value={getIsoDateString(scheduleForm.arriveBgn)}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, arriveBgn: formatIsoToDisplay(e.target.value) })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Start Contract
                </label>
                <input
                  type="date"
                  value={getIsoDateString(scheduleForm.startContract)}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, startContract: formatIsoToDisplay(e.target.value) })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Docking Date
                </label>
                <input
                  type="date"
                  value={getIsoDateString(scheduleForm.dockingDate)}
                  onChange={(e) => {
                    const newDocking = formatIsoToDisplay(e.target.value);
                    const updated = { ...scheduleForm, dockingDate: newDocking };
                    updated.dockingDurationDays = calculateDockingDuration(newDocking, scheduleForm.undockingDate);
                    setScheduleForm(updated);
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Undocking Date
                </label>
                <input
                  type="date"
                  value={getIsoDateString(scheduleForm.undockingDate)}
                  onChange={(e) => {
                    const newUndocking = formatIsoToDisplay(e.target.value);
                    const updated = { ...scheduleForm, undockingDate: newUndocking };
                    updated.dockingDurationDays = calculateDockingDuration(scheduleForm.dockingDate, newUndocking);
                    setScheduleForm(updated);
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Finish Work Date
                </label>
                <input
                  type="date"
                  value={getIsoDateString(scheduleForm.finishWork)}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, finishWork: formatIsoToDisplay(e.target.value) })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Sail Out Date
                </label>
                <input
                  type="date"
                  value={getIsoDateString(scheduleForm.sailOut)}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, sailOut: formatIsoToDisplay(e.target.value) })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Docking Position
                </label>
                <input
                  type="text"
                  value={scheduleForm.dockingPosition}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, dockingPosition: e.target.value })}
                  placeholder="#5"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Durasi On Dock (Hari) <span className="text-[10px] text-emerald-600 font-normal">(Otomatis)</span>
                </label>
                <input
                  type="number"
                  value={scheduleForm.dockingDurationDays}
                  readOnly
                  className="w-full px-2.5 py-1.5 bg-slate-100 border border-slate-300 rounded-lg text-slate-700 font-bold cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
