with open('/src/components/RepairListTable.tsx', 'r') as f:
    content = f.read()

# 1. Orphan subSystem inline edit:
# find `<td className="py-1.5 px-1 align-top w-28">` that contains `step="any"` and `editFormData.unit`
old_orphan_inline = '''                                  <td className="py-1.5 px-1 align-top w-28">
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-1">
                                        <input
                                          type="number"
                                                       step="any"
                                                       value={editFormData.qty || ''}
                                                       onChange={(e) => handleEditFormChange('qty', parseFloat(e.target.value) || 0)}
                                                       onKeyDown={handleKeyDown}
                                                       className="w-14 text-right font-mono text-xs px-1 py-1 bg-white border border-emerald-300 rounded"
                                        />
                                        <input
                                          type="text"
                                                       value={editFormData.unit || ''}
                                                       onChange={(e) => handleEditFormChange('unit', e.target.value)}
                                                       onKeyDown={handleKeyDown}
                                                       className="w-12 text-center font-mono text-xs px-1 py-1 bg-white border border-emerald-300 rounded"
                                        />
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <span className="text-[10px] text-amber-700 font-semibold shrink-0">Kg:</span>
                                        <input
                                          type="number"
                                                       step="0.01"
                                                       value={editFormData.weightKg || ''}
                                                       onChange={(e) => handleEditFormChange('weightKg', parseFloat(e.target.value) || 0)}
                                                       onKeyDown={handleKeyDown}
                                                       className="w-full text-right font-mono font-bold text-amber-800 text-xs px-1 py-0.5 bg-white border border-amber-300 rounded"
                                        />
                                      </div>
                                    </div>
                                  </td>'''

new_orphan_inline = '''                                  <td className="py-1.5 px-1 align-top w-20">
                                    <input
                                      type="number"
                                      step="any"
                                      value={editFormData.qty || ''}
                                      onChange={(e) => handleEditFormChange('qty', parseFloat(e.target.value) || 0)}
                                      onKeyDown={handleKeyDown}
                                      placeholder="Qty"
                                      className="w-full text-right font-mono text-xs px-1 py-1.5 bg-white border border-emerald-300 rounded font-bold"
                                    />
                                  </td>
                                  <td className="py-1.5 px-1 align-top w-16">
                                    <input
                                      type="text"
                                      value={editFormData.unit || ''}
                                      onChange={(e) => handleEditFormChange('unit', e.target.value)}
                                      onKeyDown={handleKeyDown}
                                      placeholder="Satuan"
                                      className="w-full text-center font-mono text-xs px-1 py-1.5 bg-white border border-emerald-300 rounded font-bold"
                                    />
                                  </td>
                                  <td className="py-1.5 px-1 align-top w-24">
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={editFormData.weightKg || ''}
                                      onChange={(e) => handleEditFormChange('weightKg', parseFloat(e.target.value) || 0)}
                                      onKeyDown={handleKeyDown}
                                      placeholder="Tonase (kg)"
                                      className="w-full text-right font-mono font-bold text-amber-900 text-xs px-1 py-1.5 bg-amber-50 border border-amber-300 rounded"
                                    />
                                  </td>'''

if old_orphan_inline in content:
    content = content.replace(old_orphan_inline, new_orphan_inline, 1)
    print("Orphan subSystem inline edit replaced!")
else:
    print("Warning: old_orphan_inline not found exactly")

# 2. Orphan subSystem standard SpreadsheetCell:
# Find the block around itemId={subSystem.id} with className="border-r border-slate-200"
import re

orphan_cell_pattern = re.compile(
    r'(<SpreadsheetCell\s+itemId=\{subSystem\.id\}\s+field="qty"[\s\S]*?displayFormatter=\{[\s\S]*?\}\s*/>)',
    re.MULTILINE
)

# Note: The first occurrence was already replaced (lines 2502-2548). Now there is only the second occurrence!
matches = list(orphan_cell_pattern.finditer(content))
print(f"Found {len(matches)} matches for subSystem qty SpreadsheetCell")
if len(matches) == 1:
    m = matches[0]
    new_sub_cells = '''<SpreadsheetCell
                                    itemId={subSystem.id}
                                    field="qty"
                                    value={subSystem.qty}
                                    inputType="number"
                                    activeCell={spreadsheet.activeCell}
                                    editingCell={spreadsheet.editingCell}
                                    editValue={spreadsheet.editValue}
                                    align="right"
                                    className="border-r border-slate-200 w-20 font-bold font-mono"
                                    onSelectCell={spreadsheet.setActiveCell}
                                    onStartEdit={spreadsheet.startEditing}
                                    onEditChange={spreadsheet.setEditValue}
                                    onSaveEdit={spreadsheet.saveEditing}
                                    onCancelEdit={spreadsheet.cancelEditing}
                                    onContextMenu={(e, _, f) => {
                                      e.preventDefault();
                                      spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: subSystem, field: f });
                                    }}
                                    displayFormatter={(val) => (val !== undefined && val !== null && val !== '' ? String(val) : '-')}
                                  />

                                  <SpreadsheetCell
                                    itemId={subSystem.id}
                                    field="unit"
                                    value={subSystem.unit}
                                    activeCell={spreadsheet.activeCell}
                                    editingCell={spreadsheet.editingCell}
                                    editValue={spreadsheet.editValue}
                                    align="center"
                                    className="border-r border-slate-200 w-16 font-bold font-mono text-slate-600"
                                    onSelectCell={spreadsheet.setActiveCell}
                                    onStartEdit={spreadsheet.startEditing}
                                    onEditChange={spreadsheet.setEditValue}
                                    onSaveEdit={spreadsheet.saveEditing}
                                    onCancelEdit={spreadsheet.cancelEditing}
                                    onContextMenu={(e, _, f) => {
                                      e.preventDefault();
                                      spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: subSystem, field: f });
                                    }}
                                    displayFormatter={(val) => val || '-'}
                                  />

                                  <SpreadsheetCell
                                    itemId={subSystem.id}
                                    field="weightKg"
                                    value={subSystem.weightKg}
                                    inputType="number"
                                    activeCell={spreadsheet.activeCell}
                                    editingCell={spreadsheet.editingCell}
                                    editValue={spreadsheet.editValue}
                                    align="right"
                                    className="border-r border-slate-200 w-24 font-bold font-mono text-amber-800 bg-amber-50/30"
                                    onSelectCell={spreadsheet.setActiveCell}
                                    onStartEdit={spreadsheet.startEditing}
                                    onEditChange={spreadsheet.setEditValue}
                                    onSaveEdit={spreadsheet.saveEditing}
                                    onCancelEdit={spreadsheet.cancelEditing}
                                    onContextMenu={(e, _, f) => {
                                      e.preventDefault();
                                      spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: subSystem, field: f });
                                    }}
                                    displayFormatter={(val) => {
                                      if (subComponents.length > 0) {
                                        return (
                                          <div>
                                            <span className="font-mono font-bold text-amber-800 text-xs">{subTotalWeight.toFixed(2)}</span>
                                            <span className="text-[9px] block text-slate-400 font-sans font-normal leading-none">(Subtotal)</span>
                                          </div>
                                        );
                                      }
                                      return val && Number(val) > 0 ? Number(val).toFixed(2) : '-';
                                    }}
                                  />'''
    content = content[:m.start()] + new_sub_cells + content[m.end():]
    print("Orphan subSystem SpreadsheetCell replaced!")

# 3. ComponentRow inline edit:
comp_inline_pattern = re.compile(
    r'(<td className="py-1\.5 px-1 align-top w-28">\s*<div className="space-y-1">[\s\S]*?editFormData\.weightKg[\s\S]*?<\/td>)',
    re.MULTILINE
)
matches_comp = list(comp_inline_pattern.finditer(content))
print(f"Found {len(matches_comp)} matches for remaining w-28 inline edit cell")
if len(matches_comp) == 1:
    m = matches_comp[0]
    new_comp_inline = '''<td className="py-1.5 px-1 align-top w-20">
          <input
            type="number"
            step="any"
            value={editFormData.qty || ''}
            onChange={(e) => handleEditFormChange('qty', parseFloat(e.target.value) || 0)}
            onKeyDown={handleKeyDown}
            placeholder="Qty"
            className="w-full text-right font-mono text-xs px-1 py-1.5 bg-white border border-emerald-300 rounded font-bold"
          />
        </td>
        <td className="py-1.5 px-1 align-top w-16">
          <input
            type="text"
            value={editFormData.unit || ''}
            onChange={(e) => handleEditFormChange('unit', e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Satuan"
            className="w-full text-center font-mono text-xs px-1 py-1.5 bg-white border border-emerald-300 rounded font-bold"
          />
        </td>
        <td className="py-1.5 px-1 align-top w-24">
          <input
            type="number"
            step="0.01"
            value={editFormData.weightKg || ''}
            onChange={(e) => handleEditFormChange('weightKg', parseFloat(e.target.value) || 0)}
            onKeyDown={handleKeyDown}
            placeholder="Tonase (kg)"
            className="w-full text-right font-mono font-bold text-amber-900 text-xs px-1 py-1.5 bg-amber-50 border border-amber-300 rounded"
          />
        </td>'''
    content = content[:m.start()] + new_comp_inline + content[m.end():]
    print("ComponentRow inline edit replaced!")

# 4. ComponentRow fallback row:
# `<td className="py-1.5 px-3 text-right border-r border-slate-200">{item.qty} {item.unit}</td>`
old_fallback = '<td className="py-1.5 px-3 text-right border-r border-slate-200">{item.qty} {item.unit}</td>'
new_fallback = '''<td className="py-1.5 px-2.5 text-right font-mono border-r border-slate-200">{item.qty !== undefined && item.qty !== null ? item.qty : '-'}</td>
        <td className="py-1.5 px-2 text-center font-mono text-slate-600 font-bold border-r border-slate-200">{item.unit || '-'}</td>
        <td className="py-1.5 px-2.5 text-right font-mono text-amber-800 font-bold bg-amber-50/30 border-r border-slate-200">{item.weightKg ? item.weightKg.toFixed(2) : '-'}</td>'''
if old_fallback in content:
    content = content.replace(old_fallback, new_fallback, 1)
    print("ComponentRow fallback replaced!")

# 5. ComponentRow standard SpreadsheetCell:
# `<SpreadsheetCell itemId={item.id} field="qty" ... displayFormatter={() => ...} />`
comp_cell_pattern = re.compile(
    r'(<SpreadsheetCell\s+itemId=\{item\.id\}\s+field="qty"[\s\S]*?displayFormatter=\{[\s\S]*?\}\s*/>)',
    re.MULTILINE
)
matches_comp_cell = list(comp_cell_pattern.finditer(content))
print(f"Found {len(matches_comp_cell)} matches for ComponentRow qty SpreadsheetCell")
if len(matches_comp_cell) == 1:
    m = matches_comp_cell[0]
    new_comp_cell = '''<SpreadsheetCell
        itemId={item.id}
        field="qty"
        value={item.qty}
        inputType="number"
        activeCell={activeCell}
        editingCell={editingCell}
        editValue={editValue}
        align="right"
        className="border-r border-slate-200 w-20 font-mono text-xs font-bold"
        onSelectCell={onSelectCell}
        onStartEdit={onStartEdit}
        onEditChange={onEditChange}
        onSaveEdit={onSaveEdit}
        onCancelEdit={onCancelEdit}
        onContextMenu={handleCellContextMenu}
        displayFormatter={(val) => (val !== undefined && val !== null && val !== '' ? String(val) : '-')}
      />

      <SpreadsheetCell
        itemId={item.id}
        field="unit"
        value={item.unit}
        activeCell={activeCell}
        editingCell={editingCell}
        editValue={editValue}
        align="center"
        className="border-r border-slate-200 w-16 font-mono text-xs text-slate-600 font-bold"
        onSelectCell={onSelectCell}
        onStartEdit={onStartEdit}
        onEditChange={onEditChange}
        onSaveEdit={onSaveEdit}
        onCancelEdit={onCancelEdit}
        onContextMenu={handleCellContextMenu}
        displayFormatter={(val) => val || '-'}
      />

      <SpreadsheetCell
        itemId={item.id}
        field="weightKg"
        value={item.weightKg}
        inputType="number"
        activeCell={activeCell}
        editingCell={editingCell}
        editValue={editValue}
        align="right"
        className="border-r border-slate-200 w-24 font-mono text-xs text-amber-800 font-bold bg-amber-50/30"
        onSelectCell={onSelectCell}
        onStartEdit={onStartEdit}
        onEditChange={onEditChange}
        onSaveEdit={onSaveEdit}
        onCancelEdit={onCancelEdit}
        onContextMenu={handleCellContextMenu}
        displayFormatter={(val) => (val && Number(val) > 0 ? Number(val).toFixed(2) : '-')}
      />'''
    content = content[:m.start()] + new_comp_cell + content[m.end():]
    print("ComponentRow standard SpreadsheetCell replaced!")

with open('/src/components/RepairListTable.tsx', 'w') as f:
    f.write(content)

print("RepairListTable.tsx written successfully!")
