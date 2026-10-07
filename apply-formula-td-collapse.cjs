const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/RepairListTable.tsx');
let code = fs.readFileSync(filePath, 'utf8');

// 1. Area Row (lines ~1940-2060)
const areaCellsOld = `                                   <SpreadsheetCell
                                     itemId={area.id}
                                     field="type"
                                     value={(area.type && area.type !== '0') ? area.type : ''}
                                     activeCell={spreadsheet.activeCell}
                                     editingCell={spreadsheet.editingCell}
                                     editValue={spreadsheet.editValue}
                                     align="center"
                                     className="font-mono text-slate-600 text-[11px] border-r border-slate-200 font-bold uppercase"
                                     onSelectCell={spreadsheet.setActiveCell}
                                     onStartEdit={spreadsheet.startEditing}
                                     onEditChange={spreadsheet.setEditValue}
                                     onSaveEdit={spreadsheet.saveEditing}
                                     onCancelEdit={spreadsheet.cancelEditing}
                                     onContextMenu={(e, _, f) => {
                                       e.preventDefault();
                                       spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: area, field: f });
                                     }}
                                   />

                                   <SpreadsheetCell
                                     itemId={area.id}
                                     field="d1"
                                     value={(area.d1 && area.d1 !== '0') ? area.d1 : ''}
                                     activeCell={spreadsheet.activeCell}
                                     editingCell={spreadsheet.editingCell}
                                     editValue={spreadsheet.editValue}
                                     align="center"
                                     className="font-mono text-slate-600 text-[11px] border-r border-slate-200 font-bold"
                                     onSelectCell={spreadsheet.setActiveCell}
                                     onStartEdit={spreadsheet.startEditing}
                                     onEditChange={spreadsheet.setEditValue}
                                     onSaveEdit={spreadsheet.saveEditing}
                                     onCancelEdit={spreadsheet.cancelEditing}
                                     onContextMenu={(e, _, f) => {
                                       e.preventDefault();
                                       spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: area, field: f });
                                     }}
                                   />

                                   <SpreadsheetCell
                                     itemId={area.id}
                                     field="d2"
                                     value={(area.d2 && area.d2 !== '0') ? area.d2 : ''}
                                     activeCell={spreadsheet.activeCell}
                                     editingCell={spreadsheet.editingCell}
                                     editValue={spreadsheet.editValue}
                                     align="center"
                                     className="font-mono text-slate-600 text-[11px] border-r border-slate-200 font-bold"
                                     onSelectCell={spreadsheet.setActiveCell}
                                     onStartEdit={spreadsheet.startEditing}
                                     onEditChange={spreadsheet.setEditValue}
                                     onSaveEdit={spreadsheet.saveEditing}
                                     onCancelEdit={spreadsheet.cancelEditing}
                                     onContextMenu={(e, _, f) => {
                                       e.preventDefault();
                                       spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: area, field: f });
                                     }}
                                   />

                                   <SpreadsheetCell
                                     itemId={area.id}
                                     field="d3"
                                     value={(area.d3 && area.d3 !== '0') ? area.d3 : ''}
                                     activeCell={spreadsheet.activeCell}
                                     editingCell={spreadsheet.editingCell}
                                     editValue={spreadsheet.editValue}
                                     align="center"
                                     className="font-mono text-slate-600 text-[11px] border-r border-slate-200 font-bold"
                                     onSelectCell={spreadsheet.setActiveCell}
                                     onStartEdit={spreadsheet.startEditing}
                                     onEditChange={spreadsheet.setEditValue}
                                     onSaveEdit={spreadsheet.saveEditing}
                                     onCancelEdit={spreadsheet.cancelEditing}
                                     onContextMenu={(e, _, f) => {
                                       e.preventDefault();
                                       spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: area, field: f });
                                     }}
                                   />

                                   <SpreadsheetCell
                                     itemId={area.id}
                                     field="dLen"
                                     value={(area.dLen && area.dLen !== '0') ? area.dLen : ''}
                                     activeCell={spreadsheet.activeCell}
                                     editingCell={spreadsheet.editingCell}
                                     editValue={spreadsheet.editValue}
                                     align="center"
                                     className="font-mono text-amber-900 font-bold bg-amber-50/50 text-[11px] border-x-2 border-amber-300/70"
                                     onSelectCell={spreadsheet.setActiveCell}
                                     onStartEdit={spreadsheet.startEditing}
                                     onEditChange={spreadsheet.setEditValue}
                                     onSaveEdit={spreadsheet.saveEditing}
                                     onCancelEdit={spreadsheet.cancelEditing}
                                     onContextMenu={(e, _, f) => {
                                       e.preventDefault();
                                       spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: area, field: f });
                                     }}
                                   />

                                   <SpreadsheetCell
                                     itemId={area.id}
                                     field="d4"
                                     value={(area.d4 && area.d4 !== '0') ? area.d4 : ''}
                                     activeCell={spreadsheet.activeCell}
                                     editingCell={spreadsheet.editingCell}
                                     editValue={spreadsheet.editValue}
                                     align="center"
                                     className="font-mono text-slate-600 text-[11px] border-r border-slate-200 font-bold"
                                     onSelectCell={spreadsheet.setActiveCell}
                                     onStartEdit={spreadsheet.startEditing}
                                     onEditChange={spreadsheet.setEditValue}
                                     onSaveEdit={spreadsheet.saveEditing}
                                     onCancelEdit={spreadsheet.cancelEditing}
                                     onContextMenu={(e, _, f) => {
                                       e.preventDefault();
                                       spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: area, field: f });
                                     }}
                                   />`;

const areaCellsNew = `                                   {Boolean(
                                     (area.type && area.type.trim() !== '' && area.type !== '0') ||
                                     (area.d1 && area.d1.trim() !== '' && area.d1 !== '0') ||
                                     (area.d2 && area.d2.trim() !== '' && area.d2 !== '0') ||
                                     (area.d3 && area.d3.trim() !== '' && area.d3 !== '0') ||
                                     (area.dLen && area.dLen.trim() !== '' && area.dLen !== '0') ||
                                     (area.d4 && area.d4.trim() !== '' && area.d4 !== '0')
                                   ) ? (
                                     <>
                                       <SpreadsheetCell
                                         itemId={area.id}
                                         field="type"
                                         value={(area.type && area.type !== '0') ? area.type : ''}
                                         activeCell={spreadsheet.activeCell}
                                         editingCell={spreadsheet.editingCell}
                                         editValue={spreadsheet.editValue}
                                         align="center"
                                         className="font-mono text-slate-600 text-[11px] border-r border-slate-200 font-bold uppercase"
                                         onSelectCell={spreadsheet.setActiveCell}
                                         onStartEdit={spreadsheet.startEditing}
                                         onEditChange={spreadsheet.setEditValue}
                                         onSaveEdit={spreadsheet.saveEditing}
                                         onCancelEdit={spreadsheet.cancelEditing}
                                         onContextMenu={(e, _, f) => {
                                           e.preventDefault();
                                           spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: area, field: f });
                                         }}
                                       />

                                       <SpreadsheetCell
                                         itemId={area.id}
                                         field="d1"
                                         value={(area.d1 && area.d1 !== '0') ? area.d1 : ''}
                                         activeCell={spreadsheet.activeCell}
                                         editingCell={spreadsheet.editingCell}
                                         editValue={spreadsheet.editValue}
                                         align="center"
                                         className="font-mono text-slate-600 text-[11px] border-r border-slate-200 font-bold"
                                         onSelectCell={spreadsheet.setActiveCell}
                                         onStartEdit={spreadsheet.startEditing}
                                         onEditChange={spreadsheet.setEditValue}
                                         onSaveEdit={spreadsheet.saveEditing}
                                         onCancelEdit={spreadsheet.cancelEditing}
                                         onContextMenu={(e, _, f) => {
                                           e.preventDefault();
                                           spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: area, field: f });
                                         }}
                                       />

                                       <SpreadsheetCell
                                         itemId={area.id}
                                         field="d2"
                                         value={(area.d2 && area.d2 !== '0') ? area.d2 : ''}
                                         activeCell={spreadsheet.activeCell}
                                         editingCell={spreadsheet.editingCell}
                                         editValue={spreadsheet.editValue}
                                         align="center"
                                         className="font-mono text-slate-600 text-[11px] border-r border-slate-200 font-bold"
                                         onSelectCell={spreadsheet.setActiveCell}
                                         onStartEdit={spreadsheet.startEditing}
                                         onEditChange={spreadsheet.setEditValue}
                                         onSaveEdit={spreadsheet.saveEditing}
                                         onCancelEdit={spreadsheet.cancelEditing}
                                         onContextMenu={(e, _, f) => {
                                           e.preventDefault();
                                           spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: area, field: f });
                                         }}
                                       />

                                       <SpreadsheetCell
                                         itemId={area.id}
                                         field="d3"
                                         value={(area.d3 && area.d3 !== '0') ? area.d3 : ''}
                                         activeCell={spreadsheet.activeCell}
                                         editingCell={spreadsheet.editingCell}
                                         editValue={spreadsheet.editValue}
                                         align="center"
                                         className="font-mono text-slate-600 text-[11px] border-r border-slate-200 font-bold"
                                         onSelectCell={spreadsheet.setActiveCell}
                                         onStartEdit={spreadsheet.startEditing}
                                         onEditChange={spreadsheet.setEditValue}
                                         onSaveEdit={spreadsheet.saveEditing}
                                         onCancelEdit={spreadsheet.cancelEditing}
                                         onContextMenu={(e, _, f) => {
                                           e.preventDefault();
                                           spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: area, field: f });
                                         }}
                                       />

                                       <SpreadsheetCell
                                         itemId={area.id}
                                         field="dLen"
                                         value={(area.dLen && area.dLen !== '0') ? area.dLen : ''}
                                         activeCell={spreadsheet.activeCell}
                                         editingCell={spreadsheet.editingCell}
                                         editValue={spreadsheet.editValue}
                                         align="center"
                                         className="font-mono text-amber-900 font-bold bg-amber-50/50 text-[11px] border-x-2 border-amber-300/70"
                                         onSelectCell={spreadsheet.setActiveCell}
                                         onStartEdit={spreadsheet.startEditing}
                                         onEditChange={spreadsheet.setEditValue}
                                         onSaveEdit={spreadsheet.saveEditing}
                                         onCancelEdit={spreadsheet.cancelEditing}
                                         onContextMenu={(e, _, f) => {
                                           e.preventDefault();
                                           spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: area, field: f });
                                         }}
                                       />

                                       <SpreadsheetCell
                                         itemId={area.id}
                                         field="d4"
                                         value={(area.d4 && area.d4 !== '0') ? area.d4 : ''}
                                         activeCell={spreadsheet.activeCell}
                                         editingCell={spreadsheet.editingCell}
                                         editValue={spreadsheet.editValue}
                                         align="center"
                                         className="font-mono text-slate-600 text-[11px] border-r border-slate-200 font-bold"
                                         onSelectCell={spreadsheet.setActiveCell}
                                         onStartEdit={spreadsheet.startEditing}
                                         onEditChange={spreadsheet.setEditValue}
                                         onSaveEdit={spreadsheet.saveEditing}
                                         onCancelEdit={spreadsheet.cancelEditing}
                                         onContextMenu={(e, _, f) => {
                                           e.preventDefault();
                                           spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: area, field: f });
                                         }}
                                       />
                                     </>
                                   ) : (
                                     <td colSpan={6} className="border-r border-slate-200 bg-slate-100/30"></td>
                                   )}`;

if (code.includes(areaCellsOld)) {
  code = code.replace(areaCellsOld, areaCellsNew);
  console.log('Updated Area formula cells');
} else {
  console.log('Could not find areaCellsOld');
}

// 2. SubSystem formula cells
const subCellsOld = `                                             <SpreadsheetCell
                                               itemId={subSystem.id}
                                               field="type"
                                               value={(subSystem.type && subSystem.type !== '0') ? subSystem.type : ''}
                                               activeCell={spreadsheet.activeCell}
                                               editingCell={spreadsheet.editingCell}
                                               editValue={spreadsheet.editValue}
                                               align="center"
                                               className="font-mono text-slate-600 text-[11px] border-r border-slate-200 font-bold uppercase"
                                               onSelectCell={spreadsheet.setActiveCell}
                                               onStartEdit={spreadsheet.startEditing}
                                               onEditChange={spreadsheet.setEditValue}
                                               onSaveEdit={spreadsheet.saveEditing}
                                               onCancelEdit={spreadsheet.cancelEditing}
                                               onContextMenu={(e, _, f) => {
                                                 e.preventDefault();
                                                 spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: subSystem, field: f });
                                               }}
                                             />

                                             <SpreadsheetCell
                                               itemId={subSystem.id}
                                               field="d1"
                                               value={(subSystem.d1 && subSystem.d1 !== '0') ? subSystem.d1 : ''}
                                               activeCell={spreadsheet.activeCell}
                                               editingCell={spreadsheet.editingCell}
                                               editValue={spreadsheet.editValue}
                                               align="center"
                                               className="font-mono text-slate-600 text-[11px] border-r border-slate-200 font-bold"
                                               onSelectCell={spreadsheet.setActiveCell}
                                               onStartEdit={spreadsheet.startEditing}
                                               onEditChange={spreadsheet.setEditValue}
                                               onSaveEdit={spreadsheet.saveEditing}
                                               onCancelEdit={spreadsheet.cancelEditing}
                                               onContextMenu={(e, _, f) => {
                                                 e.preventDefault();
                                                 spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: subSystem, field: f });
                                               }}
                                             />

                                             <SpreadsheetCell
                                               itemId={subSystem.id}
                                               field="d2"
                                               value={(subSystem.d2 && subSystem.d2 !== '0') ? subSystem.d2 : ''}
                                               activeCell={spreadsheet.activeCell}
                                               editingCell={spreadsheet.editingCell}
                                               editValue={spreadsheet.editValue}
                                               align="center"
                                               className="font-mono text-slate-600 text-[11px] border-r border-slate-200 font-bold"
                                               onSelectCell={spreadsheet.setActiveCell}
                                               onStartEdit={spreadsheet.startEditing}
                                               onEditChange={spreadsheet.setEditValue}
                                               onSaveEdit={spreadsheet.saveEditing}
                                               onCancelEdit={spreadsheet.cancelEditing}
                                               onContextMenu={(e, _, f) => {
                                                 e.preventDefault();
                                                 spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: subSystem, field: f });
                                               }}
                                             />

                                             <SpreadsheetCell
                                               itemId={subSystem.id}
                                               field="d3"
                                               value={(subSystem.d3 && subSystem.d3 !== '0') ? subSystem.d3 : ''}
                                               activeCell={spreadsheet.activeCell}
                                               editingCell={spreadsheet.editingCell}
                                               editValue={spreadsheet.editValue}
                                               align="center"
                                               className="font-mono text-slate-600 text-[11px] border-r border-slate-200 font-bold"
                                               onSelectCell={spreadsheet.setActiveCell}
                                               onStartEdit={spreadsheet.startEditing}
                                               onEditChange={spreadsheet.setEditValue}
                                               onSaveEdit={spreadsheet.saveEditing}
                                               onCancelEdit={spreadsheet.cancelEditing}
                                               onContextMenu={(e, _, f) => {
                                                 e.preventDefault();
                                                 spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: subSystem, field: f });
                                               }}
                                             />

                                             <SpreadsheetCell
                                               itemId={subSystem.id}
                                               field="dLen"
                                               value={(subSystem.dLen && subSystem.dLen !== '0') ? subSystem.dLen : ''}
                                               activeCell={spreadsheet.activeCell}
                                               editingCell={spreadsheet.editingCell}
                                               editValue={spreadsheet.editValue}
                                               align="center"
                                               className="font-mono text-amber-900 font-bold bg-amber-50/50 text-[11px] border-x-2 border-amber-300/70"
                                               onSelectCell={spreadsheet.setActiveCell}
                                               onStartEdit={spreadsheet.startEditing}
                                               onEditChange={spreadsheet.setEditValue}
                                               onSaveEdit={spreadsheet.saveEditing}
                                               onCancelEdit={spreadsheet.cancelEditing}
                                               onContextMenu={(e, _, f) => {
                                                 e.preventDefault();
                                                 spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: subSystem, field: f });
                                               }}
                                             />

                                             <SpreadsheetCell
                                               itemId={subSystem.id}
                                               field="d4"
                                               value={(subSystem.d4 && subSystem.d4 !== '0') ? subSystem.d4 : ''}
                                               activeCell={spreadsheet.activeCell}
                                               editingCell={spreadsheet.editingCell}
                                               editValue={spreadsheet.editValue}
                                               align="center"
                                               className="font-mono text-slate-600 text-[11px] border-r border-slate-200 font-bold"
                                               onSelectCell={spreadsheet.setActiveCell}
                                               onStartEdit={spreadsheet.startEditing}
                                               onEditChange={spreadsheet.setEditValue}
                                               onSaveEdit={spreadsheet.saveEditing}
                                               onCancelEdit={spreadsheet.cancelEditing}
                                               onContextMenu={(e, _, f) => {
                                                 e.preventDefault();
                                                 spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: subSystem, field: f });
                                               }}
                                             />`;

const subCellsNew = `                                             {Boolean(
                                               (subSystem.type && subSystem.type.trim() !== '' && subSystem.type !== '0') ||
                                               (subSystem.d1 && subSystem.d1.trim() !== '' && subSystem.d1 !== '0') ||
                                               (subSystem.d2 && subSystem.d2.trim() !== '' && subSystem.d2 !== '0') ||
                                               (subSystem.d3 && subSystem.d3.trim() !== '' && subSystem.d3 !== '0') ||
                                               (subSystem.dLen && subSystem.dLen.trim() !== '' && subSystem.dLen !== '0') ||
                                               (subSystem.d4 && subSystem.d4.trim() !== '' && subSystem.d4 !== '0')
                                             ) ? (
                                               <>
                                                 <SpreadsheetCell
                                                   itemId={subSystem.id}
                                                   field="type"
                                                   value={(subSystem.type && subSystem.type !== '0') ? subSystem.type : ''}
                                                   activeCell={spreadsheet.activeCell}
                                                   editingCell={spreadsheet.editingCell}
                                                   editValue={spreadsheet.editValue}
                                                   align="center"
                                                   className="font-mono text-slate-600 text-[11px] border-r border-slate-200 font-bold uppercase"
                                                   onSelectCell={spreadsheet.setActiveCell}
                                                   onStartEdit={spreadsheet.startEditing}
                                                   onEditChange={spreadsheet.setEditValue}
                                                   onSaveEdit={spreadsheet.saveEditing}
                                                   onCancelEdit={spreadsheet.cancelEditing}
                                                   onContextMenu={(e, _, f) => {
                                                     e.preventDefault();
                                                     spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: subSystem, field: f });
                                                   }}
                                                 />

                                                 <SpreadsheetCell
                                                   itemId={subSystem.id}
                                                   field="d1"
                                                   value={(subSystem.d1 && subSystem.d1 !== '0') ? subSystem.d1 : ''}
                                                   activeCell={spreadsheet.activeCell}
                                                   editingCell={spreadsheet.editingCell}
                                                   editValue={spreadsheet.editValue}
                                                   align="center"
                                                   className="font-mono text-slate-600 text-[11px] border-r border-slate-200 font-bold"
                                                   onSelectCell={spreadsheet.setActiveCell}
                                                   onStartEdit={spreadsheet.startEditing}
                                                   onEditChange={spreadsheet.setEditValue}
                                                   onSaveEdit={spreadsheet.saveEditing}
                                                   onCancelEdit={spreadsheet.cancelEditing}
                                                   onContextMenu={(e, _, f) => {
                                                     e.preventDefault();
                                                     spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: subSystem, field: f });
                                                   }}
                                                 />

                                                 <SpreadsheetCell
                                                   itemId={subSystem.id}
                                                   field="d2"
                                                   value={(subSystem.d2 && subSystem.d2 !== '0') ? subSystem.d2 : ''}
                                                   activeCell={spreadsheet.activeCell}
                                                   editingCell={spreadsheet.editingCell}
                                                   editValue={spreadsheet.editValue}
                                                   align="center"
                                                   className="font-mono text-slate-600 text-[11px] border-r border-slate-200 font-bold"
                                                   onSelectCell={spreadsheet.setActiveCell}
                                                   onStartEdit={spreadsheet.startEditing}
                                                   onEditChange={spreadsheet.setEditValue}
                                                   onSaveEdit={spreadsheet.saveEditing}
                                                   onCancelEdit={spreadsheet.cancelEditing}
                                                   onContextMenu={(e, _, f) => {
                                                     e.preventDefault();
                                                     spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: subSystem, field: f });
                                                   }}
                                                 />

                                                 <SpreadsheetCell
                                                   itemId={subSystem.id}
                                                   field="d3"
                                                   value={(subSystem.d3 && subSystem.d3 !== '0') ? subSystem.d3 : ''}
                                                   activeCell={spreadsheet.activeCell}
                                                   editingCell={spreadsheet.editingCell}
                                                   editValue={spreadsheet.editValue}
                                                   align="center"
                                                   className="font-mono text-slate-600 text-[11px] border-r border-slate-200 font-bold"
                                                   onSelectCell={spreadsheet.setActiveCell}
                                                   onStartEdit={spreadsheet.startEditing}
                                                   onEditChange={spreadsheet.setEditValue}
                                                   onSaveEdit={spreadsheet.saveEditing}
                                                   onCancelEdit={spreadsheet.cancelEditing}
                                                   onContextMenu={(e, _, f) => {
                                                     e.preventDefault();
                                                     spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: subSystem, field: f });
                                                   }}
                                                 />

                                                 <SpreadsheetCell
                                                   itemId={subSystem.id}
                                                   field="dLen"
                                                   value={(subSystem.dLen && subSystem.dLen !== '0') ? subSystem.dLen : ''}
                                                   activeCell={spreadsheet.activeCell}
                                                   editingCell={spreadsheet.editingCell}
                                                   editValue={spreadsheet.editValue}
                                                   align="center"
                                                   className="font-mono text-amber-900 font-bold bg-amber-50/50 text-[11px] border-x-2 border-amber-300/70"
                                                   onSelectCell={spreadsheet.setActiveCell}
                                                   onStartEdit={spreadsheet.startEditing}
                                                   onEditChange={spreadsheet.setEditValue}
                                                   onSaveEdit={spreadsheet.saveEditing}
                                                   onCancelEdit={spreadsheet.cancelEditing}
                                                   onContextMenu={(e, _, f) => {
                                                     e.preventDefault();
                                                     spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: subSystem, field: f });
                                                   }}
                                                 />

                                                 <SpreadsheetCell
                                                   itemId={subSystem.id}
                                                   field="d4"
                                                   value={(subSystem.d4 && subSystem.d4 !== '0') ? subSystem.d4 : ''}
                                                   activeCell={spreadsheet.activeCell}
                                                   editingCell={spreadsheet.editingCell}
                                                   editValue={spreadsheet.editValue}
                                                   align="center"
                                                   className="font-mono text-slate-600 text-[11px] border-r border-slate-200 font-bold"
                                                   onSelectCell={spreadsheet.setActiveCell}
                                                   onStartEdit={spreadsheet.startEditing}
                                                   onEditChange={spreadsheet.setEditValue}
                                                   onSaveEdit={spreadsheet.saveEditing}
                                                   onCancelEdit={spreadsheet.cancelEditing}
                                                   onContextMenu={(e, _, f) => {
                                                     e.preventDefault();
                                                     spreadsheet.setContextMenu({ x: e.clientX, y: e.clientY, item: subSystem, field: f });
                                                   }}
                                                 />
                                               </>
                                             ) : (
                                               <td colSpan={6} className="border-r border-slate-200 bg-slate-50/30"></td>
                                             )}`;

if (code.includes(subCellsOld)) {
  code = code.replaceAll(subCellsOld, subCellsNew);
  console.log('Updated SubSystem formula cells');
} else {
  console.log('Could not find subCellsOld');
}

// 3. ComponentRow formula cells (lines ~4360-4460)
const compCellsOld = `      <SpreadsheetCell
        itemId={item.id}
        field="type"
        value={(item.type && item.type !== '0') ? item.type : ''}
        activeCell={activeCell}
        editingCell={editingCell}
        editValue={editValue}
        align="center"
        className="font-mono text-slate-600 text-[11px] border-r border-slate-200 uppercase"
        onSelectCell={onSelectCell}
        onStartEdit={onStartEdit}
        onEditChange={onEditChange}
        onSaveEdit={onSaveEdit}
        onCancelEdit={onCancelEdit}
        onContextMenu={handleCellContextMenu}
      />

      <SpreadsheetCell
        itemId={item.id}
        field="d1"
        value={(item.d1 && item.d1 !== '0') ? item.d1 : ''}
        activeCell={activeCell}
        editingCell={editingCell}
        editValue={editValue}
        align="center"
        className="font-mono text-slate-600 text-[11px] border-r border-slate-200"
        onSelectCell={onSelectCell}
        onStartEdit={onStartEdit}
        onEditChange={onEditChange}
        onSaveEdit={onSaveEdit}
        onCancelEdit={onCancelEdit}
        onContextMenu={handleCellContextMenu}
      />

      <SpreadsheetCell
        itemId={item.id}
        field="d2"
        value={(item.d2 && item.d2 !== '0') ? item.d2 : ''}
        activeCell={activeCell}
        editingCell={editingCell}
        editValue={editValue}
        align="center"
        className="font-mono text-slate-600 text-[11px] border-r border-slate-200"
        onSelectCell={onSelectCell}
        onStartEdit={onStartEdit}
        onEditChange={onEditChange}
        onSaveEdit={onSaveEdit}
        onCancelEdit={onCancelEdit}
        onContextMenu={handleCellContextMenu}
      />

      <SpreadsheetCell
        itemId={item.id}
        field="d3"
        value={(item.d3 && item.d3 !== '0') ? item.d3 : ''}
        activeCell={activeCell}
        editingCell={editingCell}
        editValue={editValue}
        align="center"
        className="font-mono text-slate-600 text-[11px] border-r border-slate-200"
        onSelectCell={onSelectCell}
        onStartEdit={onStartEdit}
        onEditChange={onEditChange}
        onSaveEdit={onSaveEdit}
        onCancelEdit={onCancelEdit}
        onContextMenu={handleCellContextMenu}
      />

      <SpreadsheetCell
        itemId={item.id}
        field="dLen"
        value={(item.dLen && item.dLen !== '0') ? item.dLen : ''}
        activeCell={activeCell}
        editingCell={editingCell}
        editValue={editValue}
        align="center"
        className="font-mono text-amber-900 font-bold bg-amber-50/50 text-[11px] border-x-2 border-amber-300/70"
        onSelectCell={onSelectCell}
        onStartEdit={onStartEdit}
        onEditChange={onEditChange}
        onSaveEdit={onSaveEdit}
        onCancelEdit={onCancelEdit}
        onContextMenu={handleCellContextMenu}
      />

      <SpreadsheetCell
        itemId={item.id}
        field="d4"
        value={(item.d4 && item.d4 !== '0') ? item.d4 : ''}
        activeCell={activeCell}
        editingCell={editingCell}
        editValue={editValue}
        align="center"
        className="font-mono text-slate-600 text-[11px] border-r border-slate-200"
        onSelectCell={onSelectCell}
        onStartEdit={onStartEdit}
        onEditChange={onEditChange}
        onSaveEdit={onSaveEdit}
        onCancelEdit={onCancelEdit}
        onContextMenu={handleCellContextMenu}
      />`;

const compCellsNew = `      {Boolean(
        (item.type && item.type.trim() !== '' && item.type !== '0') ||
        (item.d1 && item.d1.trim() !== '' && item.d1 !== '0') ||
        (item.d2 && item.d2.trim() !== '' && item.d2 !== '0') ||
        (item.d3 && item.d3.trim() !== '' && item.d3 !== '0') ||
        (item.dLen && item.dLen.trim() !== '' && item.dLen !== '0') ||
        (item.d4 && item.d4.trim() !== '' && item.d4 !== '0')
      ) ? (
        <>
          <SpreadsheetCell
            itemId={item.id}
            field="type"
            value={(item.type && item.type !== '0') ? item.type : ''}
            activeCell={activeCell}
            editingCell={editingCell}
            editValue={editValue}
            align="center"
            className="font-mono text-slate-600 text-[11px] border-r border-slate-200 uppercase"
            onSelectCell={onSelectCell}
            onStartEdit={onStartEdit}
            onEditChange={onEditChange}
            onSaveEdit={onSaveEdit}
            onCancelEdit={onCancelEdit}
            onContextMenu={handleCellContextMenu}
          />

          <SpreadsheetCell
            itemId={item.id}
            field="d1"
            value={(item.d1 && item.d1 !== '0') ? item.d1 : ''}
            activeCell={activeCell}
            editingCell={editingCell}
            editValue={editValue}
            align="center"
            className="font-mono text-slate-600 text-[11px] border-r border-slate-200"
            onSelectCell={onSelectCell}
            onStartEdit={onStartEdit}
            onEditChange={onEditChange}
            onSaveEdit={onSaveEdit}
            onCancelEdit={onCancelEdit}
            onContextMenu={handleCellContextMenu}
          />

          <SpreadsheetCell
            itemId={item.id}
            field="d2"
            value={(item.d2 && item.d2 !== '0') ? item.d2 : ''}
            activeCell={activeCell}
            editingCell={editingCell}
            editValue={editValue}
            align="center"
            className="font-mono text-slate-600 text-[11px] border-r border-slate-200"
            onSelectCell={onSelectCell}
            onStartEdit={onStartEdit}
            onEditChange={onEditChange}
            onSaveEdit={onSaveEdit}
            onCancelEdit={onCancelEdit}
            onContextMenu={handleCellContextMenu}
          />

          <SpreadsheetCell
            itemId={item.id}
            field="d3"
            value={(item.d3 && item.d3 !== '0') ? item.d3 : ''}
            activeCell={activeCell}
            editingCell={editingCell}
            editValue={editValue}
            align="center"
            className="font-mono text-slate-600 text-[11px] border-r border-slate-200"
            onSelectCell={onSelectCell}
            onStartEdit={onStartEdit}
            onEditChange={onEditChange}
            onSaveEdit={onSaveEdit}
            onCancelEdit={onCancelEdit}
            onContextMenu={handleCellContextMenu}
          />

          <SpreadsheetCell
            itemId={item.id}
            field="dLen"
            value={(item.dLen && item.dLen !== '0') ? item.dLen : ''}
            activeCell={activeCell}
            editingCell={editingCell}
            editValue={editValue}
            align="center"
            className="font-mono text-amber-900 font-bold bg-amber-50/50 text-[11px] border-x-2 border-amber-300/70"
            onSelectCell={onSelectCell}
            onStartEdit={onStartEdit}
            onEditChange={onEditChange}
            onSaveEdit={onSaveEdit}
            onCancelEdit={onCancelEdit}
            onContextMenu={handleCellContextMenu}
          />

          <SpreadsheetCell
            itemId={item.id}
            field="d4"
            value={(item.d4 && item.d4 !== '0') ? item.d4 : ''}
            activeCell={activeCell}
            editingCell={editingCell}
            editValue={editValue}
            align="center"
            className="font-mono text-slate-600 text-[11px] border-r border-slate-200"
            onSelectCell={onSelectCell}
            onStartEdit={onStartEdit}
            onEditChange={onEditChange}
            onSaveEdit={onSaveEdit}
            onCancelEdit={onCancelEdit}
            onContextMenu={handleCellContextMenu}
          />
        </>
      ) : (
        <td colSpan={6} className="border-r border-slate-200 bg-slate-50/20"></td>
      )}`;

if (code.includes(compCellsOld)) {
  code = code.replace(compCellsOld, compCellsNew);
  console.log('Updated ComponentRow formula cells');
} else {
  console.log('Could not find compCellsOld');
}

fs.writeFileSync(filePath, code, 'utf8');
console.log('Successfully updated RepairListTable.tsx for formula td collapse');
