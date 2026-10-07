/**
 * Flexible date parsing and formatting utilities for shipyard project schedules.
 */

const MONTH_MAP: Record<string, number> = {
  januari: 0, jan: 0, january: 0,
  februari: 1, feb: 1, february: 1,
  maret: 2, mar: 2, march: 2,
  april: 3, apr: 3,
  mei: 4, may: 4,
  juni: 5, jun: 5, june: 5,
  juli: 6, jul: 6, july: 6,
  agustus: 7, agu: 7, aug: 7, august: 7,
  september: 8, sep: 8,
  oktober: 9, okt: 9, oct: 9, october: 9,
  november: 10, nov: 10,
  desember: 11, des: 11, dec: 11, december: 11,
};

const DAY_NAMES_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/**
 * Parse any date string format (ISO YYYY-MM-DD, Indonesian text "Senin, 07 September 2026", etc.)
 */
export function parseDateFlexible(dateStr?: string | null): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const clean = dateStr.trim();
  if (!clean || clean === '-') return null;

  // 1. ISO standard YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
    const parts = clean.split('T')[0].split('-');
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    return isNaN(d.getTime()) ? null : d;
  }

  // 2. Format DD/MM/YYYY or DD-MM-YYYY
  const slashMatch = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (slashMatch) {
    const d = new Date(parseInt(slashMatch[3], 10), parseInt(slashMatch[2], 10) - 1, parseInt(slashMatch[1], 10));
    return isNaN(d.getTime()) ? null : d;
  }

  // 3. Textual Indonesian date e.g. "Senin, 07 September 2026" or "07 Sep 2026"
  const tokens = clean.toLowerCase().replace(/[,.-]/g, ' ').split(/\s+/).filter(Boolean);
  let day = 1;
  let month = 0;
  let year = new Date().getFullYear();
  let foundMonth = false;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (MONTH_MAP[t] !== undefined) {
      month = MONTH_MAP[t];
      foundMonth = true;
      if (i > 0 && /^\d{1,2}$/.test(tokens[i - 1])) {
        day = parseInt(tokens[i - 1], 10);
      } else if (i < tokens.length - 1 && /^\d{1,2}$/.test(tokens[i + 1])) {
        day = parseInt(tokens[i + 1], 10);
      }
    } else if (/^\d{4}$/.test(t)) {
      year = parseInt(t, 10);
    } else if (/^\d{2}$/.test(t) && i === tokens.length - 1) {
      const yr = parseInt(t, 10);
      year = yr < 50 ? 2000 + yr : 1900 + yr;
    }
  }

  if (foundMonth) {
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }

  const fallback = new Date(clean);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Format a Date to standard ISO YYYY-MM-DD
 */
export function formatDateToIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Format a Date to human display "07 Sep 2026"
 */
export function formatDateToDisplay(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = MONTH_NAMES_SHORT[d.getMonth()] || '';
  const y = d.getFullYear();
  return `${day} ${month} ${y}`;
}

export function formatDayName(d: Date): string {
  return DAY_NAMES_ID[d.getDay()] || '';
}

/**
  * Calculate duration in days between docking date and undocking date
  */
export function calculateDockingDuration(dockingDateStr?: string | null, undockingDateStr?: string | null): number {
  const d1 = parseDateFlexible(dockingDateStr);
  const d2 = parseDateFlexible(undockingDateStr);
  if (!d1 || !d2) return 0;
  const diffTime = d2.getTime() - d1.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 ? diffDays : 0;
}

