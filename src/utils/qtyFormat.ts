export function formatVolQtyDisplay(qty: number | undefined, unit: string | undefined, weightKg: number | undefined): { primary: string; sub: string; isBlank: boolean } {
  const cleanUnit = (unit || '').trim().toLowerCase();
  
  // If no unit input (blank / '-')
  if (!cleanUnit || cleanUnit === '-' || cleanUnit === '') {
    return { primary: '', sub: '', isBlank: true };
  }

  // If unit is kg
  if (cleanUnit === 'kg') {
    const w = weightKg && weightKg > 0 ? weightKg : (qty || 0);
    const prim = w > 0 ? (w % 1 !== 0 ? w.toFixed(2) : String(w)) : '-';
    return { primary: prim, sub: '', isBlank: false };
  }

  // For pcs, ls, lot, m, m2, m3, etc.
  const prim = qty !== undefined && qty !== null && qty !== 0 ? (qty % 1 !== 0 ? qty.toFixed(2) : String(qty)) : '-';
  const sub = weightKg && weightKg > 0 ? `${weightKg.toFixed(2)} kg` : '';
  return { primary: prim, sub, isBlank: false };
}
