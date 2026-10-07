import React from 'react';
import { MaterialTypeDefinition } from '../utils/tonnageCalculator';

interface MaterialTypeSelectorProps {
  value?: string;
  onChange: (value: string) => void;
  onSelectMaterial?: (material: MaterialTypeDefinition) => void;
  onOpenCalculator?: () => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  compact?: boolean;
  disabled?: boolean;
}

const COMMON_MATERIAL_TYPES = [
  { code: 'PL ABS', label: 'PL ABS - Plate Class ABS (P x L x T)' },
  { code: 'PL BKI', label: 'PL BKI - Plate Class BKI (P x L x T)' },
  { code: 'PL NC', label: 'PL NC - Plate Non-Class (P x L x T)' },
  { code: 'PP B', label: 'PP B - Pipe CS / Black (NPS x Satuan x Schedule x Panjang)' },
  { code: 'PP G', label: 'PP G - Pipe Galvanis (NPS x Satuan x Schedule x Panjang)' },
  { code: 'RB MM', label: 'RB MM - Round Bar As Besi mm (Dia mm x Panjang)' },
  { code: 'RB IN', label: 'RB IN - Round Bar As Besi inchi (Dia inchi x Panjang)' },
  { code: 'FB', label: 'FB - Flat Bar Strip (Lebar x Tebal x Panjang)' },
  { code: 'EA', label: 'EA - Equal Angle Siku Sama Kaki (Sayap x Tebal x Panjang)' },
  { code: 'UA', label: 'UA - Unequal Angle Siku Beda Kaki (Sayap1 x Sayap2 x Tebal x Panjang)' },
  { code: 'SB', label: 'SB - Square Bar Besi Kotak (Sisi x Panjang)' },
  { code: 'CQR', label: 'CQR - Pelat Bordes / Chequered Plate' },
  { code: 'GR', label: 'GR - Steel Grating Galvanized' },
  { code: 'HB', label: 'HB - Profil H-Beam (Nominal x Panjang)' },
  { code: 'WF', label: 'WF - Wide Flange Beam (Nominal x Panjang)' },
  { code: 'UNP', label: 'UNP - Kanal U (Nominal x Panjang)' },
];

export const MaterialTypeSelector: React.FC<MaterialTypeSelectorProps> = ({
  value = '',
  onChange,
  placeholder = 'Ketik Tipe...',
  className = '',
  inputClassName = '',
  compact = false,
  disabled = false,
}) => {
  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        list="material-types-datalist"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full font-mono text-xs ${
          compact ? 'px-2 py-1.5' : 'px-3 py-2'
        } bg-white border border-slate-300 rounded-md focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 ${inputClassName}`}
      />
      <datalist id="material-types-datalist">
        {COMMON_MATERIAL_TYPES.map((t) => (
          <option key={t.code} value={t.code}>
            {t.label}
          </option>
        ))}
      </datalist>
    </div>
  );
};
