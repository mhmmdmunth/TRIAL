import React, { useRef, useEffect } from 'react';

interface SpreadsheetCellProps {
  itemId: string;
  field: string;
  value: any;
  activeCell: { itemId: string; field: string } | null;
  editingCell: { itemId: string; field: string } | null;
  editValue: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
  inputType?: 'text' | 'number' | 'textarea' | 'select';
  selectOptions?: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  onSelectCell: (cell: { itemId: string; field: string }) => void;
  onStartEdit: (cell: { itemId: string; field: string }, initialVal?: string) => void;
  onEditChange: (val: string) => void;
  onSaveEdit: (direction?: { row: number; col: number; autoStartEdit?: boolean }) => void;
  onCancelEdit: () => void;
  onContextMenu: (e: React.MouseEvent, itemId: string, field: string) => void;
  displayFormatter?: (val: any) => React.ReactNode;
}

export const SpreadsheetCell: React.FC<SpreadsheetCellProps> = ({
  itemId,
  field,
  value,
  activeCell,
  editingCell,
  editValue,
  align = 'left',
  className = '',
  inputType = 'text',
  selectOptions,
  placeholder = '',
  disabled = false,
  readOnly = false,
  onSelectCell,
  onStartEdit,
  onEditChange,
  onSaveEdit,
  onCancelEdit,
  onContextMenu,
  displayFormatter,
}) => {
  const isLocked = disabled || readOnly;
  const isSelected = activeCell?.itemId === itemId && activeCell?.field === field;
  const isEditing = !isLocked && editingCell?.itemId === itemId && editingCell?.field === field;
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if ('select' in inputRef.current) {
        inputRef.current.select();
      }
    }
  }, [isEditing]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (inputType === 'textarea' && e.shiftKey) {
        // Shift+Enter creates a new line in textarea
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      onSaveEdit(e.shiftKey ? { row: -1, col: 0, autoStartEdit: false } : { row: 1, col: 0, autoStartEdit: false });
    } else if (e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      onSaveEdit(e.shiftKey ? { row: 0, col: -1, autoStartEdit: true } : { row: 0, col: 1, autoStartEdit: true });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      onSaveEdit({ row: -1, col: 0, autoStartEdit: false });
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      onSaveEdit({ row: 1, col: 0, autoStartEdit: false });
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onCancelEdit();
    }
    // Arrow keys, Home, End, Backspace, Delete, Ctrl+A/C/V work naturally without interruption
  };

  const alignClass =
    align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';

  // Render Editing Input
  if (isEditing) {
    return (
      <td className={`p-0 relative z-20 bg-amber-50 ${className}`}>
        {inputType === 'textarea' ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            rows={2}
            value={editValue}
            onChange={(e) => onEditChange(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            onKeyDown={handleKeyDown}
            onBlur={() => onSaveEdit()}
            placeholder={placeholder}
            className={`w-full h-full text-xs px-2 py-1 bg-amber-50 border-2 border-emerald-600 rounded-none focus:outline-hidden resize-none leading-relaxed font-sans shadow-inner ${alignClass}`}
          />
        ) : inputType === 'select' && selectOptions ? (
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            value={editValue}
            onChange={(e) => {
              onEditChange(e.target.value);
              onSaveEdit();
            }}
            onKeyDown={handleKeyDown}
            onBlur={() => onSaveEdit()}
            className={`w-full h-full text-xs px-1.5 py-1 bg-amber-50 border-2 border-emerald-600 rounded-none focus:outline-hidden font-medium ${alignClass}`}
          >
            {selectOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type={inputType}
            step={inputType === 'number' ? 'any' : undefined}
            value={editValue}
            onChange={(e) => onEditChange(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            onKeyDown={handleKeyDown}
            onBlur={() => onSaveEdit()}
            placeholder={placeholder}
            className={`w-full h-full text-xs px-1.5 py-1 bg-amber-50 border-2 border-emerald-600 rounded-none focus:outline-hidden font-mono font-semibold ${alignClass}`}
          />
        )}
      </td>
    );
  }

  // Display cell value
  const formattedContent = displayFormatter
    ? displayFormatter(value)
    : value !== undefined && value !== null && value !== '' && value !== 0
    ? String(value)
    : '';

  return (
    <td
      onClick={(e) => {
        e.stopPropagation();
        onSelectCell({ itemId, field });
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (!isLocked) {
          onStartEdit({ itemId, field });
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onSelectCell({ itemId, field });
        if (!isLocked) {
          onContextMenu(e, itemId, field);
        }
      }}
      className={`relative px-2 py-1.5 transition-all text-xs font-sans select-none ${
        isLocked ? 'cursor-not-allowed bg-slate-100/70 opacity-60 text-slate-400' : 'cursor-cell'
      } ${alignClass} ${
        isSelected
          ? 'ring-2 ring-emerald-600 bg-emerald-100/70 text-slate-900 font-semibold z-10'
          : !isLocked ? 'hover:bg-slate-100/80' : ''
      } ${className}`}
    >
      <div className={inputType === 'textarea' || displayFormatter ? 'max-w-full overflow-hidden' : 'truncate max-w-full'}>
        {displayFormatter ? (formattedContent !== undefined && formattedContent !== null ? formattedContent : '') : (formattedContent || <span className="text-slate-300 italic text-[11px]">-</span>)}
      </div>

      {/* Excel active cell handle square in bottom right */}
      {isSelected && (
        <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-emerald-600 border border-white rounded-xs z-20" />
      )}
    </td>
  );
};
