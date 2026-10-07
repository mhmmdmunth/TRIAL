import React, { useState, useEffect } from 'react';
import { VesselSpec, ProjectSchedule } from '../types';
import { Ship, Calendar, Anchor, Award, Building, FileText, Compass, Clock, CheckCircle2, AlertTriangle, Edit3 } from 'lucide-react';
import { parseDateFlexible, formatDateToIso, formatDateToDisplay, formatDayName, calculateDockingDuration } from '../utils/dateUtils';

interface ShipyardProjectSpecHeaderProps {
  vessel: VesselSpec;
  schedule: ProjectSchedule;
  onUpdateVessel?: (vessel: VesselSpec) => void;
  onUpdateSchedule?: (schedule: ProjectSchedule) => void;
}

export const ShipyardProjectSpecHeader: React.FC<ShipyardProjectSpecHeaderProps> = ({
  vessel,
  schedule,
  onUpdateVessel,
  onUpdateSchedule,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editVessel, setEditVessel] = useState<VesselSpec>(vessel);
  const [editSchedule, setEditSchedule] = useState<ProjectSchedule>(schedule);

  useEffect(() => {
    setEditVessel(vessel);
  }, [vessel]);

  useEffect(() => {
    setEditSchedule(schedule);
  }, [schedule]);

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

  const handleSave = () => {
    console.log('ShipyardProjectSpecHeader saving:', editSchedule);
    if (onUpdateVessel) onUpdateVessel(editVessel);
    if (onUpdateSchedule) onUpdateSchedule(editSchedule);
    setIsEditing(false);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden text-xs">
      {/* Top Banner with Vessel Name and Project Code */}
      <div className="bg-slate-900 text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="bg-[#03442C] p-1.5 rounded-lg text-emerald-300 border border-emerald-600/40">
            <Ship className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 font-bold text-sm text-white">
              <span>TIMELINE DOCKING &amp; REPAIR</span>
              <span className="text-emerald-400 font-mono font-black text-sm tracking-wide">
                {vessel.name || 'BG. CAKRAWALA I'}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Project No: {vessel.projectNo || 'E-081'} | Owner: {vessel.companyOwner || 'PT. CAKRAWALA NUSA BAHARI'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onUpdateVessel && (
            <div className="flex gap-1.5">
              {isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                >
                  <span>Batal</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (isEditing) handleSave();
                  else {
                    setEditVessel(vessel);
                    setEditSchedule(schedule);
                    setIsEditing(true);
                  }
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                <span>{isEditing ? 'Simpan Perubahan' : 'Ubah Data & Milestone'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Vessel Specifications (Left) vs Milestones Plan / Actual (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 bg-slate-50/50">
        {/* Left Side: Vessel & Survey Specifications */}
        <div className="lg:col-span-7 p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Vessel Name</span>
            {isEditing ? (
              <input
                type="text"
                value={editVessel.name || ''}
                onChange={(e) => setEditVessel({ ...editVessel, name: e.target.value })}
                className="px-2 py-1 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none text-xs font-mono font-bold"
              />
            ) : (
              <strong className="text-slate-900 font-mono text-xs">{vessel.name || '-'}</strong>
            )}
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Dimension (L x B x D)</span>
            {isEditing ? (
              <input
                type="text"
                value={editVessel.dimension || ''}
                onChange={(e) => setEditVessel({ ...editVessel, dimension: e.target.value })}
                className="px-2 py-1 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none text-xs font-mono"
              />
            ) : (
              <strong className="text-slate-900 font-mono text-xs">{vessel.dimension || '-'}</strong>
            )}
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Vessel Type</span>
            {isEditing ? (
              <input
                type="text"
                value={editVessel.vesselType || ''}
                onChange={(e) => setEditVessel({ ...editVessel, vesselType: e.target.value })}
                className="px-2 py-1 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none text-xs"
              />
            ) : (
              <span className="text-slate-800 font-medium text-xs">{vessel.vesselType || 'Deck Cargo Barge'}</span>
            )}
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Docking Type</span>
            {isEditing ? (
              <input
                type="text"
                value={editVessel.dockingType || ''}
                onChange={(e) => setEditVessel({ ...editVessel, dockingType: e.target.value })}
                className="px-2 py-1 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none text-xs"
              />
            ) : (
              <span className="text-slate-800 font-medium text-xs">{vessel.dockingType || 'Docking Repair'}</span>
            )}
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Company / Owner</span>
            {isEditing ? (
              <input
                type="text"
                value={editVessel.companyOwner || ''}
                onChange={(e) => setEditVessel({ ...editVessel, companyOwner: e.target.value })}
                className="px-2 py-1 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none text-xs"
              />
            ) : (
              <span className="text-slate-800 font-medium text-xs">{vessel.companyOwner || '-'}</span>
            )}
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Project No.</span>
            {isEditing ? (
              <input
                type="text"
                value={editVessel.projectNo || ''}
                onChange={(e) => setEditVessel({ ...editVessel, projectNo: e.target.value })}
                className="px-2 py-1 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none text-xs font-mono font-bold text-emerald-900"
              />
            ) : (
              <strong className="text-emerald-900 font-mono font-bold text-xs">{vessel.projectNo || '-'}</strong>
            )}
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Classification</span>
            {isEditing ? (
              <input
                type="text"
                value={editVessel.classification || ''}
                onChange={(e) => setEditVessel({ ...editVessel, classification: e.target.value })}
                className="px-2 py-1 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none text-xs font-mono font-bold"
              />
            ) : (
              <span className="font-mono font-bold text-slate-800 text-xs">{vessel.classification || 'BKI'}</span>
            )}
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Kind of Survey</span>
            {isEditing ? (
              <input
                type="text"
                value={editVessel.kindOfSurvey || ''}
                onChange={(e) => setEditVessel({ ...editVessel, kindOfSurvey: e.target.value })}
                className="px-2 py-1 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none text-xs font-semibold"
              />
            ) : (
              <span className="text-slate-800 font-semibold text-xs">{vessel.kindOfSurvey || 'Special Survey - 3'}</span>
            )}
          </div>
        </div>

        {/* Right Side: Milestones Comparison Table (Plan vs Actual) */}
        <div className="lg:col-span-5 p-3 flex flex-col justify-center">
          <div className="overflow-hidden rounded-lg border border-slate-200 shadow-2xs">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead className="bg-slate-900 text-white font-bold text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="py-1.5 px-2.5 border-r border-slate-800">Tahapan Milestone</th>
                  <th className="py-1.5 px-2.5 border-r border-slate-800 text-center bg-indigo-950 text-indigo-200">
                    Plan
                  </th>
                  <th className="py-1.5 px-2.5 text-center bg-emerald-950 text-emerald-300">
                    Actual
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white font-mono text-[11px]">
                <tr className="hover:bg-slate-50">
                  <td className="py-1 px-2.5 font-sans font-semibold text-slate-700">Arrival (Tiba)</td>
                  <td className="py-1 px-2.5 text-center text-indigo-900 bg-indigo-50/30">
                    {isEditing ? (
                      <input
                        type="date"
                        value={getIsoDateString(editSchedule.arriveBgn || '15 Nov 25')}
                        onChange={(e) => setEditSchedule({ ...editSchedule, arriveBgn: formatIsoToDisplay(e.target.value) })}
                        className="w-full px-1 py-0.5 bg-white border border-slate-300 rounded text-center text-[11px] focus:ring-1 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                      />
                    ) : (
                      schedule.arriveBgn || '15 Nov 25'
                    )}
                  </td>
                  <td className="py-1 px-2.5 text-center text-emerald-900 bg-emerald-50/30">
                    {isEditing ? (
                      <input
                        type="date"
                        value={getIsoDateString(editSchedule.arrivalMeeting || editSchedule.arriveBgn || '15 Nov 25')}
                        onChange={(e) => setEditSchedule({ ...editSchedule, arrivalMeeting: formatIsoToDisplay(e.target.value) })}
                        className="w-full px-1 py-0.5 bg-white border border-slate-300 rounded text-center text-[11px] focus:ring-1 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                      />
                    ) : (
                      schedule.arrivalMeeting || schedule.arriveBgn || '15 Nov 25'
                    )}
                  </td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="py-1 px-2.5 font-sans font-semibold text-slate-700">Start Project</td>
                  <td className="py-1 px-2.5 text-center text-indigo-900 bg-indigo-50/30">
                    {isEditing ? (
                      <input
                        type="date"
                        value={getIsoDateString(editSchedule.startContract || '23 Nov 25')}
                        onChange={(e) => setEditSchedule({ ...editSchedule, startContract: formatIsoToDisplay(e.target.value) })}
                        className="w-full px-1 py-0.5 bg-white border border-slate-300 rounded text-center text-[11px] focus:ring-1 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                      />
                    ) : (
                      schedule.startContract || '23 Nov 25'
                    )}
                  </td>
                  <td className="py-1 px-2.5 text-center text-emerald-900 bg-emerald-50/30">
                    {isEditing ? (
                      <input
                        type="date"
                        value={getIsoDateString(editSchedule.actualStartContract || '27 Nov 25')}
                        onChange={(e) => setEditSchedule({ ...editSchedule, actualStartContract: formatIsoToDisplay(e.target.value) })}
                        className="w-full px-1 py-0.5 bg-white border border-slate-300 rounded text-center text-[11px] focus:ring-1 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                      />
                    ) : (
                      schedule.actualStartContract || '27 Nov 25'
                    )}
                  </td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="py-1 px-2.5 font-sans font-semibold text-slate-700">Naik Dok (Docking)</td>
                  <td className="py-1 px-2.5 text-center text-indigo-900 bg-indigo-50/30">
                    {isEditing ? (
                      <input
                        type="date"
                        value={getIsoDateString(editSchedule.dockingDate || '22 Nov 25')}
                        onChange={(e) => {
                          const newDocking = formatIsoToDisplay(e.target.value);
                          const updated = { ...editSchedule, dockingDate: newDocking };
                          updated.dockingDurationDays = calculateDockingDuration(newDocking, editSchedule.undockingDate);
                          setEditSchedule(updated);
                        }}
                        className="w-full px-1 py-0.5 bg-white border border-slate-300 rounded text-center text-[11px] focus:ring-1 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                      />
                    ) : (
                      schedule.dockingDate || '22 Nov 25'
                    )}
                  </td>
                  <td className="py-1 px-2.5 text-center text-emerald-900 bg-emerald-50/30">
                    {isEditing ? (
                      <input
                        type="date"
                        value={getIsoDateString(editSchedule.actualDockingDate || '23 Nov 25')}
                        onChange={(e) => setEditSchedule({ ...editSchedule, actualDockingDate: formatIsoToDisplay(e.target.value) })}
                        className="w-full px-1 py-0.5 bg-white border border-slate-300 rounded text-center text-[11px] focus:ring-1 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                      />
                    ) : (
                      schedule.actualDockingDate || '23 Nov 25'
                    )}
                  </td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="py-1 px-2.5 font-sans font-semibold text-slate-700">Turun Dok (Undocking)</td>
                  <td className="py-1 px-2.5 text-center text-indigo-900 bg-indigo-50/30">
                    {isEditing ? (
                      <input
                        type="date"
                        value={getIsoDateString(editSchedule.undockingDate || '17 Des 25')}
                        onChange={(e) => {
                          const newUndocking = formatIsoToDisplay(e.target.value);
                          const updated = { ...editSchedule, undockingDate: newUndocking };
                          updated.dockingDurationDays = calculateDockingDuration(editSchedule.dockingDate, newUndocking);
                          setEditSchedule(updated);
                        }}
                        className="w-full px-1 py-0.5 bg-white border border-slate-300 rounded text-center text-[11px] focus:ring-1 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                      />
                    ) : (
                      schedule.undockingDate || '17 Des 25'
                    )}
                  </td>
                  <td className="py-1 px-2.5 text-center text-emerald-900 bg-emerald-50/30 font-bold">
                    {isEditing ? (
                      <input
                        type="date"
                        value={getIsoDateString(editSchedule.actualUndockingDate || '03 Jan 26')}
                        onChange={(e) => setEditSchedule({ ...editSchedule, actualUndockingDate: formatIsoToDisplay(e.target.value) })}
                        className="w-full px-1 py-0.5 bg-white border border-slate-300 rounded text-center text-[11px] focus:ring-1 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                      />
                    ) : (
                      schedule.actualUndockingDate || '03 Jan 26'
                    )}
                  </td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="py-1 px-2.5 font-sans font-semibold text-slate-700">Selesai (Finish)</td>
                  <td className="py-1 px-2.5 text-center text-indigo-900 bg-indigo-50/30">
                    {isEditing ? (
                      <input
                        type="date"
                        value={getIsoDateString(editSchedule.finishWork || '23 Des 25')}
                        onChange={(e) => setEditSchedule({ ...editSchedule, finishWork: formatIsoToDisplay(e.target.value) })}
                        className="w-full px-1 py-0.5 bg-white border border-slate-300 rounded text-center text-[11px] focus:ring-1 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                      />
                    ) : (
                      schedule.finishWork || '23 Des 25'
                    )}
                  </td>
                  <td className="py-1 px-2.5 text-center text-emerald-900 bg-emerald-50/30 font-bold">
                    {isEditing ? (
                      <input
                        type="date"
                        value={getIsoDateString(editSchedule.actualFinishWork || '05 Jan 26')}
                        onChange={(e) => setEditSchedule({ ...editSchedule, actualFinishWork: formatIsoToDisplay(e.target.value) })}
                        className="w-full px-1 py-0.5 bg-white border border-slate-300 rounded text-center text-[11px] focus:ring-1 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                      />
                    ) : (
                      schedule.actualFinishWork || '05 Jan 26'
                    )}
                  </td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="py-1 px-2.5 font-sans font-semibold text-slate-700">Sail-Out (Berlayar)</td>
                  <td className="py-1 px-2.5 text-center text-indigo-900 bg-indigo-50/30">
                    {isEditing ? (
                      <input
                        type="date"
                        value={getIsoDateString(editSchedule.sailOut)}
                        onChange={(e) => setEditSchedule({ ...editSchedule, sailOut: formatIsoToDisplay(e.target.value) })}
                        className="w-full px-1 py-0.5 bg-white border border-slate-300 rounded text-center text-[11px] focus:ring-1 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                      />
                    ) : (
                      schedule.sailOut || '-'
                    )}
                  </td>
                  <td className="py-1 px-2.5 text-center text-emerald-900 bg-emerald-50/30">
                    {isEditing ? (
                      <input
                        type="date"
                        value={getIsoDateString(editSchedule.actualSailOut || editSchedule.sailOut)}
                        onChange={(e) => setEditSchedule({ ...editSchedule, actualSailOut: formatIsoToDisplay(e.target.value) })}
                        className="w-full px-1 py-0.5 bg-white border border-slate-300 rounded text-center text-[11px] focus:ring-1 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                      />
                    ) : (
                      schedule.actualSailOut || schedule.sailOut || '-'
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
