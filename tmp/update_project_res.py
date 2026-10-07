with open("src/components/ProjectResources/ProjectResourceView.tsx", "r") as f:
    res_content = f.read()

old_header = """                <th className="py-2.5 px-3 text-right">Kuantitas / Mandays</th>"""
new_header = """                <th className="py-2.5 px-3 text-right w-28">Kuantitas</th>
                <th className="py-2.5 px-2 text-center w-20">Satuan</th>"""
assert old_header in res_content, "old_header not found"
res_content = res_content.replace(old_header, new_header, 1)

old_colspan = """<td colSpan={10} className="py-12 text-center text-slate-400">"""
new_colspan = """<td colSpan={11} className="py-12 text-center text-slate-400">"""
assert old_colspan in res_content, "old_colspan not found"
res_content = res_content.replace(old_colspan, new_colspan, 1)

old_row_td = """                      {/* Quantity / Mandays */}
                      <td className="py-2.5 px-3 text-right">
                        {isManpower && item.headcount && item.workDays ? (
                          <div>
                            <span className="font-bold font-mono text-blue-900">
                              {item.headcount * item.workDays}
                            </span>
                            <span className="text-[10px] text-slate-400 ml-1">mandays</span>
                            <div className="text-[10px] text-slate-500">
                              ({item.headcount} Org × {item.workDays} Hr)
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span className="font-bold font-mono text-slate-900">{item.qty}</span>
                            <span className="text-[10px] text-slate-500 ml-1">{item.unit}</span>
                            {item.weightKg ? (
                              <div className="text-[10px] text-slate-400">({item.weightKg} kg)</div>
                            ) : null}
                          </div>
                        )}
                      </td>"""

new_row_td = """                      {/* Quantity / Mandays */}
                      <td className="py-2.5 px-3 text-right font-mono">
                        {isManpower && item.headcount && item.workDays ? (
                          <div>
                            <span className="font-bold text-blue-900">
                              {item.headcount * item.workDays}
                            </span>
                            <div className="text-[10px] text-slate-500 font-sans">
                              ({item.headcount} Org × {item.workDays} Hr)
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span className="font-bold text-slate-900">{item.qty !== undefined && item.qty !== null ? item.qty : '-'}</span>
                            {item.weightKg ? (
                              <div className="text-[10px] text-slate-400 font-sans">({item.weightKg} kg)</div>
                            ) : null}
                          </div>
                        )}
                      </td>

                      {/* Satuan */}
                      <td className="py-2.5 px-2 text-center font-mono">
                        <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded text-[10px] font-bold uppercase inline-block">
                          {isManpower ? 'mandays' : (item.unit || '-')}
                        </span>
                      </td>"""

assert old_row_td in res_content, "old_row_td not found"
res_content = res_content.replace(old_row_td, new_row_td, 1)

with open("src/components/ProjectResources/ProjectResourceView.tsx", "w") as f:
    f.write(res_content)

print("ProjectResourceView.tsx updated successfully!")
