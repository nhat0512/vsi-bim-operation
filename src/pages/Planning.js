import { getState, setState } from '../state.js';

let currentOffset = 0;

function getPlanningData(offset = 0) {
  const data = [];
  const curr = new Date();
  
  const day = curr.getDay();
  const diff = curr.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(curr.setDate(diff));
  monday.setDate(monday.getDate() + (offset * 14));
  
  for (let w = 0; w < 2; w++) {
    const weekStart = new Date(monday);
    weekStart.setDate(weekStart.getDate() + (w * 7));
    
    const d = new Date(Date.UTC(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
    const weekString = `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
    
    const days = [];
    const dayNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    for (let i = 0; i < 7; i++) {
      const curDate = new Date(weekStart);
      curDate.setDate(curDate.getDate() + i);
      const dateString = `${curDate.getFullYear()}-${(curDate.getMonth()+1).toString().padStart(2, '0')}-${curDate.getDate().toString().padStart(2, '0')}`;
      const dateLabel = `${curDate.getDate().toString().padStart(2, '0')}/${(curDate.getMonth()+1).toString().padStart(2, '0')}`;
      days.push({ name: dayNames[i], dateString, dateLabel });
    }
    data.push({ weekNo, weekString, days });
  }
  return data;
}

export function render() {
  const state = getState();
  const planData = getPlanningData(currentOffset);
  const isManager = ['BIM Manager', 'Project Manager'].includes(state.currentUserRole);
  
  let targetPersonnel = [];
  if (isManager) {
    targetPersonnel = state.personnel || [];
  } else if (state.currentUserAuth) {
    const me = (state.personnel || []).find(p => p.email === state.currentUserAuth.email);
    if (me) targetPersonnel = [me];
  }
  
  const hierarchy = targetPersonnel.map(person => {
    const userProjects = [];
    (state.projects || []).forEach(proj => {
      const userTasks = (proj.tasks || []).filter(t => t.assignee === person.name);
      const isMember = (proj.team || []).some(m => m.name === person.name) || proj.teamLead === person.name;
      if (userTasks.length > 0) {
        userProjects.push({ project: proj, tasks: userTasks });
      } else if (isMember) {
        userProjects.push({ project: proj, tasks: [] });
      }
    });
    return { person, projects: userProjects };
  }).filter(h => h.projects.length > 0 || isManager);

  const timesheets = state.timesheets || [];
  
  const getTsRecord = (userId, taskId, dateStr) => {
    return timesheets.find(t => t.userId === userId && t.taskId === taskId && t.dateString === dateStr && !t.isActual);
  };
  
  const getActualHours = (userId, taskId, dateStr) => {
    return timesheets.filter(t => t.userId === userId && t.taskId === taskId && t.dateString === dateStr && t.isActual)
      .reduce((sum, t) => sum + (Number(t.hours) || 0), 0);
  };
  
  const getUserWeekTotal = (userId, weekData) => {
    const weekDates = weekData.days.map(d => d.dateString);
    return timesheets.filter(t => t.userId === userId && weekDates.includes(t.dateString) && !t.isActual)
      .reduce((sum, t) => sum + (Number(t.hours) || 0), 0);
  };

  const getTaskWeekTotal = (userId, taskId, weekData) => {
    const weekDates = weekData.days.map(d => d.dateString);
    return timesheets.filter(t => t.userId === userId && t.taskId === taskId && weekDates.includes(t.dateString) && !t.isActual)
      .reduce((sum, t) => sum + (Number(t.hours) || 0), 0);
  };
  
  const getProjectWeekTotal = (userId, projectId, weekData) => {
    const weekDates = weekData.days.map(d => d.dateString);
    return timesheets.filter(t => t.userId === userId && t.projectId === projectId && weekDates.includes(t.dateString) && !t.isActual)
      .reduce((sum, t) => sum + (Number(t.hours) || 0), 0);
  };
  
  const getTeamWeekTotal = (weekData) => {
    const weekDates = weekData.days.map(d => d.dateString);
    return timesheets.filter(t => weekDates.includes(t.dateString) && !t.isActual)
      .reduce((sum, t) => sum + (Number(t.hours) || 0), 0);
  };

  const getTeamTotal = () => {
    return timesheets.filter(t => !t.isActual).reduce((sum, t) => sum + (Number(t.hours) || 0), 0);
  };

  return `
    <div class="animate-fade-in-up" style="height: calc(100vh - 100px); display: flex; flex-direction: column;">
      <div class="flex items-center justify-between mb-lg">
        <div>
          <h1 class="section-title">📅 General Planning</h1>
          <div class="text-sm text-muted">Daily timesheet & Weekly workload (2 weeks view)</div>
        </div>
        
        <div class="flex items-center gap-sm">
          <button class="btn btn-outline btn-sm" id="btn-export-csv" title="Xuất CSV (Tuần hiện tại)">📥 Xuất CSV</button>
          <div style="width: 1px; height: 24px; background: var(--border-subtle); margin: 0 8px;"></div>
          <button class="btn btn-outline btn-sm" id="btn-prev-week">◀ Trở về 2 tuần</button>
          <button class="btn btn-outline btn-sm" id="btn-today-week">Hiện tại</button>
          <button class="btn btn-outline btn-sm" id="btn-next-week">Tiếp 2 tuần ▶</button>
        </div>
      </div>
      
      <div class="card p-0" style="flex: 1; overflow: auto; background: var(--bg-secondary);">
        <table style="width: 100%; border-collapse: collapse; min-width: 1400px;" class="planning-table">
          <thead>
            <tr>
              <th style="text-align: left; padding: 12px; border-bottom: 1px solid var(--border-subtle); position: sticky; left: 0; background: var(--bg-secondary); z-index: 10; width: 280px;" rowspan="2">Member / Project / Task</th>
              ${planData.map(w => `
                <th colspan="8" style="text-align: center; padding: 10px 6px; border-bottom: 1px solid var(--border-subtle); border-left: 1px solid var(--border-subtle); font-weight: 600; color: var(--text-primary); background: var(--bg-tertiary); font-size: 0.9rem;">
                  Tuần ${w.weekNo} <span style="font-size:0.75rem; color:var(--text-muted); font-weight:normal;">(${w.days[0].dateLabel} - ${w.days[6].dateLabel})</span>
                </th>
              `).join('')}
              <th style="text-align: center; padding: 12px; border-bottom: 1px solid var(--border-subtle); border-left: 2px solid var(--border-subtle); font-weight: bold; width: 80px;" rowspan="2">Total<br>h</th>
            </tr>
            <tr>
              ${planData.map(w => {
                let html = '';
                w.days.forEach(d => {
                  const isWeekend = d.name === 'T7' || d.name === 'CN';
                  html += `<th style="text-align: center; padding: 8px 4px; border-bottom: 1px solid var(--border-subtle); font-size: 0.75rem; font-weight: normal; color: ${isWeekend ? 'var(--text-danger)' : 'var(--text-muted)'}; border-left: ${d.name==='T2'?'2px solid var(--border-subtle)':'none'}; background: ${isWeekend ? 'rgba(255,0,0,0.02)' : 'transparent'};">
                    <div style="font-weight: bold;">${d.name}</div>
                    <div>${d.dateLabel}</div>
                  </th>`;
                });
                html += `<th style="text-align: center; padding: 8px 4px; border-bottom: 1px solid var(--border-subtle); font-size: 0.75rem; font-weight: bold; color: var(--accent-primary); background: rgba(var(--accent-primary-rgb), 0.05); width: 50px;">Tổng</th>`;
                return html;
              }).join('')}
            </tr>
            
            <!-- TEAM TOTAL ROW -->
            ${isManager ? `
            <tr style="background: var(--accent-warning-glow); border-bottom: 1px solid var(--border-subtle);">
              <td style="padding: 12px; position: sticky; left: 0; background: var(--bg-tertiary); z-index: 9; font-weight: 600; border-right: 1px solid var(--border-subtle);">
                ▼ TEAM TOTAL <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: normal; margin-left: 8px;">${targetPersonnel.length} members</span>
              </td>
              ${planData.map(w => {
                let html = '';
                w.days.forEach(d => {
                  html += `<td style="text-align: center; border-left: ${d.name==='T2'?'2px solid var(--border-subtle)':'none'};"></td>`;
                });
                const total = getTeamWeekTotal(w);
                html += `<td style="text-align: center; padding: 8px; background: rgba(var(--accent-primary-rgb), 0.05);"><div style="color: var(--accent-warning); border: 1px solid var(--accent-warning); border-radius: 4px; padding: 2px 4px; display: inline-block; min-width: 40px; font-weight: 600;">${total}h</div></td>`;
                return html;
              }).join('')}
              <td style="text-align: center; padding: 8px; font-weight: 600; color: var(--accent-warning); border-left: 1px solid var(--border-subtle); background: var(--bg-tertiary);">${getTeamTotal()}h</td>
            </tr>
            ` : ''}
          </thead>
          <tbody>
            ${hierarchy.map(h => {
              const personId = h.person.id;
              
              // Person Row
              let html = `
                <tr style="border-bottom: 1px solid var(--border-subtle); background: var(--bg-tertiary);">
                  <td style="padding: 8px 12px; position: sticky; left: 0; background: var(--bg-tertiary); z-index: 9; border-right: 1px solid var(--border-subtle);">
                    <div class="flex items-center gap-sm">
                      <img src="${(h.person.avatar && h.person.avatar.length > 5) ? h.person.avatar : `https://ui-avatars.com/api/?name=${encodeURIComponent(h.person.name)}&background=3b82f6&color=fff&rounded=true`}" style="width: 28px; height: 28px; border-radius: 50%; box-shadow: var(--shadow-sm);">
                      <div style="font-weight: bold; font-size: 0.9rem;">${h.person.name}</div>
                      <button class="btn-icon btn-analytics" data-uid="${personId}" title="Xem biểu đồ thời gian" style="margin-left: auto;">📊</button>
                    </div>
                  </td>
                  ${planData.map(w => {
                    let wHtml = '';
                    w.days.forEach(d => {
                    wHtml += `<td style="border-left: ${d.name==='T2'?'1px solid var(--border-subtle)':'none'}; background: ${d.name==='T7'||d.name==='CN'?'rgba(239, 68, 68, 0.05)':'transparent'};"></td>`;
                    });
                    const wTotal = getUserWeekTotal(personId, w);
                    const color = wTotal > 40 ? 'color: var(--accent-danger)' : (wTotal > 0 ? 'color: var(--accent-secondary)' : 'color: var(--text-muted)');
                    const burnoutBadge = wTotal > 50 ? `<span style="font-size:0.6rem; background:var(--accent-danger); color:white; padding:1px 4px; border-radius:4px; margin-left:4px;" title="Burnout Risk!">⚠️</span>` : '';
                    
                    wHtml += `<td style="text-align: center; font-weight: 600; font-size: 0.85rem; background: var(--bg-tertiary);" style="${color}">${wTotal > 0 ? wTotal + 'h' : '—'} ${burnoutBadge}</td>`;
                    return wHtml;
                  }).join('')}
                  <td style="text-align: center; font-weight: 600; font-size: 0.85rem; color: var(--text-primary); border-left: 1px solid var(--border-subtle);">
                    ${timesheets.filter(t => t.userId === personId && !t.isActual).reduce((s, t) => s + (Number(t.hours)||0), 0)}h
                  </td>
                </tr>
              `;
              
              // Projects Rows
              h.projects.forEach(pObj => {
                const projTotal = timesheets.filter(t => t.userId === personId && t.projectId === pObj.project.id && !t.isActual).reduce((s, t) => s + (Number(t.hours)||0), 0);
                
                html += `
                  <tr style="border-bottom: 1px dashed var(--border-subtle); opacity: 0.9;">
                    <td style="padding: 6px 12px 6px 36px; position: sticky; left: 0; background: var(--bg-secondary); z-index: 8; font-size: 0.8rem; color: var(--text-muted); border-right: 1px solid var(--border-subtle);">
                      ▼ ${pObj.project.code} — ${pObj.project.name}
                    </td>
                    ${planData.map(w => {
                      let wHtml = '';
                      w.days.forEach(d => {
                         wHtml += `<td style="border-left: ${d.name==='T2'?'1px solid var(--border-subtle)':'none'}; background: ${d.name==='T7'||d.name==='CN'?'rgba(239, 68, 68, 0.05)':'transparent'};"></td>`;
                      });
                      const pwTotal = getProjectWeekTotal(personId, pObj.project.id, w);
                      wHtml += `<td style="text-align: center; font-size: 0.75rem; color: ${pwTotal > 0 ? 'var(--text-primary)' : 'var(--text-muted)'}; background: var(--bg-tertiary);">${pwTotal > 0 ? pwTotal + 'h' : '—'}</td>`;
                      return wHtml;
                    }).join('')}
                    <td style="text-align: center; font-size: 0.75rem; color: var(--text-muted); border-left: 1px solid var(--border-subtle);">${projTotal > 0 ? projTotal + 'h' : '—'}</td>
                  </tr>
                `;
                
                // Tasks Rows
                const tasksToRender = [...pObj.tasks];
                const hasGeneralTs = timesheets.some(t => t.userId === personId && t.projectId === pObj.project.id && t.taskId === 't_general');
                if (tasksToRender.length === 0 || hasGeneralTs) {
                  tasksToRender.push({ name: 'Công việc chung (Chưa phân Task)', isGeneral: true });
                }
                tasksToRender.forEach(task => {
                  const trueIdx = task.isGeneral ? -1 : pObj.project.tasks.findIndex(t => t.name === task.name && t.assignee === task.assignee);
                  const taskId = task.isGeneral ? 't_general' : `t_${trueIdx}`;
                  
                  const taskTotal = timesheets.filter(t => t.userId === personId && t.projectId === pObj.project.id && t.taskId === taskId && !t.isActual).reduce((s, t) => s + (Number(t.hours)||0), 0);

                  html += `
                    <tr style="border-bottom: 1px solid var(--border-subtle);">
                      <td style="padding: 4px 12px 4px 60px; position: sticky; left: 0; background: var(--bg-secondary); z-index: 8; font-size: 0.8rem; border-left: 3px solid var(--accent-primary); border-right: 1px solid var(--border-subtle);">
                        └ ${task.name}
                      </td>
                      ${planData.map(w => {
                        let wHtml = '';
                        w.days.forEach(d => {
                          const ts = getTsRecord(personId, taskId, d.dateString);
                          const val = ts ? ts.hours : '';
                          const isOT = ts ? ts.isOT : false;
                          const hasComment = ts && ts.comment;
                          
                          let indicator = '';
                          if (isOT || hasComment) {
                            indicator = `<div style="position:absolute; top:2px; right:2px; width:6px; height:6px; border-radius:50%; background:${isOT ? 'var(--accent-danger)' : 'var(--accent-warning)'};" title="${isOT ? 'Làm ngoài giờ (OT)' : 'Có ghi chú'}"></div>`;
                          }
                          
                          wHtml += `
                            <td style="text-align: center; padding: 4px; position:relative; border-left: ${d.name==='T2'?'1px solid var(--border-subtle)':'none'}; background: ${d.name==='T7'||d.name==='CN'?'rgba(239, 68, 68, 0.05)':'transparent'}; transition: background 0.2s;">
                              ${indicator}
                              <input type="number" class="ts-input" 
                                data-uid="${personId}" 
                                data-pid="${pObj.project.id}" 
                                data-tid="${taskId}" 
                                data-date="${d.dateString}" 
                                value="${val}" 
                                min="0" max="24"
                                title="Double-click để ghi chú/OT"
                                style="width: 40px; text-align: center; background: var(--bg-input); border: 1px solid var(--border-subtle); border-radius: 4px; color: var(--text-primary); font-size: 0.75rem; padding: 4px; transition: border-color 0.2s, box-shadow 0.2s;"
                              >
                              ${(() => {
                                const actual = getActualHours(personId, taskId, d.dateString);
                                if (actual > 0) {
                                  return `<div style="font-size: 0.7rem; color: #10b981; font-weight: 600; margin-top: 2px;">${actual}h</div>`;
                                }
                                return '';
                              })()}
                            </td>
                          `;
                        });
                        const twTotal = getTaskWeekTotal(personId, taskId, w);
                        wHtml += `<td style="text-align: center; font-size: 0.75rem; font-weight: bold; background: rgba(var(--accent-primary-rgb), 0.05);">${twTotal > 0 ? twTotal + 'h' : ''}</td>`;
                        return wHtml;
                      }).join('')}
                      <td style="text-align: center; font-size: 0.75rem; font-weight: bold; border-left: 2px solid var(--border-subtle);">${taskTotal > 0 ? taskTotal + 'h' : ''}</td>
                    </tr>
                  `;
                });
              });
              
              return html;
            }).join('')}
          </tbody>
        </table>
      </div>
      
      <!-- Modals -->
      <div id="ts-detail-modal" class="modal-backdrop" style="display: none; z-index: 9999;">
        <div class="modal-content" style="max-width: 400px;">
          <div class="modal-header">
            <h3>Chi tiết công việc</h3>
            <button class="btn-icon" id="ts-detail-close">×</button>
          </div>
          <div class="modal-body">
            <input type="hidden" id="ts-uid">
            <input type="hidden" id="ts-pid">
            <input type="hidden" id="ts-tid">
            <input type="hidden" id="ts-date">
            
            <div class="form-group">
              <label>Số giờ làm</label>
              <input type="number" id="ts-hours" class="form-input" min="0" max="24">
            </div>
            
            <div class="form-group" style="display:flex; align-items:center; gap:8px;">
              <input type="checkbox" id="ts-isot">
              <label for="ts-isot" style="margin:0; color:#ff3333; font-weight:bold;">Làm ngoài giờ (OT)</label>
            </div>
            
            <div class="form-group">
              <label>Ghi chú công việc</label>
              <textarea id="ts-comment" class="form-input" rows="3" placeholder="Ví dụ: Họp review thiết kế..."></textarea>
            </div>
          </div>
          <div class="modal-footer" style="display:flex; justify-content:space-between;">
            <button class="btn btn-outline text-danger" id="ts-detail-delete" style="border-color:transparent;">Xóa dữ liệu</button>
            <div class="flex gap-sm">
              <button class="btn btn-outline" id="ts-detail-cancel">Hủy</button>
              <button class="btn btn-primary" id="ts-detail-save">Lưu lại</button>
            </div>
          </div>
        </div>
      </div>
      
      <div id="analytics-modal" class="modal-backdrop" style="display: none; z-index: 9999;">
        <div class="modal-content" style="max-width: 500px;">
          <div class="modal-header">
            <h3>Phân bổ nguồn lực cá nhân (2 tuần)</h3>
            <button class="btn-icon" id="analytics-close">×</button>
          </div>
          <div class="modal-body" style="text-align:center;">
             <h4 id="analytics-name" style="margin-bottom:1rem;"></h4>
             <div id="analytics-chart-container" style="display:flex; justify-content:center; gap: 24px; align-items:center;">
                <!-- Chart injected here -->
             </div>
          </div>
        </div>
      </div>

      <style>
        .planning-table th, .planning-table td {
          white-space: nowrap;
        }
        .planning-table tbody tr:hover td:not(:first-child) {
          background: rgba(255, 255, 255, 0.03);
        }
        .ts-input:focus {
          outline: 1px solid var(--accent-primary);
          background: rgba(255, 255, 255, 0.1) !important;
        }
        .ts-input::-webkit-outer-spin-button,
        .ts-input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .ts-input[type=number] {
          -moz-appearance: textfield;
        }
      </style>
    </div>
  `;
}

export function init() {
  const container = document.getElementById('page-content');
  if (!container) return;

  document.getElementById('btn-prev-week')?.addEventListener('click', () => {
    currentOffset -= 1;
    container.innerHTML = render();
    init();
  });
  document.getElementById('btn-next-week')?.addEventListener('click', () => {
    currentOffset += 1;
    container.innerHTML = render();
    init();
  });
  document.getElementById('btn-today-week')?.addEventListener('click', () => {
    currentOffset = 0;
    container.innerHTML = render();
    init();
  });

  // --- 1. Export CSV ---
  document.getElementById('btn-export-csv')?.addEventListener('click', () => {
    const { timesheets, personnel, projects } = getState();
    const planData = getPlanningData(currentOffset);
    let csv = "Nhân sự,Dự án,Công việc,Ngày,Giờ,Phân loại,Ghi chú\n";
    
    planData.forEach(w => {
      w.days.forEach(d => {
        const records = (timesheets || []).filter(t => t.dateString === d.dateString);
        records.forEach(r => {
          const person = (personnel || []).find(p => p.id === r.userId);
          const project = (projects || []).find(p => p.id === r.projectId);
          const pName = person ? person.name : r.userId;
          const projName = project ? project.name : r.projectId;
          // Find task name using true index
          let tName = r.taskId;
          if (project && r.taskId.startsWith('t_')) {
            const tIdx = parseInt(r.taskId.replace('t_', ''), 10);
            if (project.tasks && project.tasks[tIdx]) {
              tName = project.tasks[tIdx].name;
            }
          }
          
          const classification = r.isOT ? 'Làm ngoài giờ (OT)' : 'Hành chính';
          const comment = (r.comment || '').replace(/"/g, '""'); // escape quotes
          
          csv += `"${pName}","${projName}","${tName}","${d.dateString}","${r.hours}","${classification}","${comment}"\n`;
        });
      });
    });
    
    const blob = new Blob(["\uFEFF"+csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Timesheet_Export_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  // --- 2. Regular Input Change ---
  document.querySelectorAll('.ts-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const val = e.target.value;
      saveTimesheet(e.target.dataset, Number(val));
    });
    
    // --- 3. Double Click Modal ---
    input.addEventListener('dblclick', (e) => {
      e.preventDefault();
      const ds = e.target.dataset;
      openTsModal(ds);
    });
  });
  
  // --- 4. Personal Analytics Modal ---
  document.querySelectorAll('.btn-analytics').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const uid = e.currentTarget.dataset.uid;
      openAnalyticsModal(uid);
    });
  });

  // Setup Modals UI
  const modalTs = document.getElementById('ts-detail-modal');
  const modalAnalytics = document.getElementById('analytics-modal');
  
  document.getElementById('ts-detail-close')?.addEventListener('click', () => modalTs.style.display = 'none');
  document.getElementById('ts-detail-cancel')?.addEventListener('click', () => modalTs.style.display = 'none');
  
  document.getElementById('analytics-close')?.addEventListener('click', () => modalAnalytics.style.display = 'none');

  document.getElementById('ts-detail-save')?.addEventListener('click', () => {
    const ds = {
      uid: document.getElementById('ts-uid').value,
      pid: document.getElementById('ts-pid').value,
      tid: document.getElementById('ts-tid').value,
      date: document.getElementById('ts-date').value
    };
    const hours = Number(document.getElementById('ts-hours').value);
    const isOT = document.getElementById('ts-isot').checked;
    const comment = document.getElementById('ts-comment').value.trim();
    
    saveTimesheet(ds, hours, isOT, comment);
    modalTs.style.display = 'none';
  });
  
  document.getElementById('ts-detail-delete')?.addEventListener('click', () => {
    const ds = {
      uid: document.getElementById('ts-uid').value,
      pid: document.getElementById('ts-pid').value,
      tid: document.getElementById('ts-tid').value,
      date: document.getElementById('ts-date').value
    };
    saveTimesheet(ds, 0, false, '');
    modalTs.style.display = 'none';
  });
}

function openTsModal(ds) {
  const modal = document.getElementById('ts-detail-modal');
  document.getElementById('ts-uid').value = ds.uid;
  document.getElementById('ts-pid').value = ds.pid;
  document.getElementById('ts-tid').value = ds.tid;
  document.getElementById('ts-date').value = ds.date;
  
  const { timesheets } = getState();
  const ts = (timesheets || []).find(t => t.userId === ds.uid && t.projectId === ds.pid && t.taskId === ds.tid && t.dateString === ds.date);
  
  document.getElementById('ts-hours').value = ts ? ts.hours : '';
  document.getElementById('ts-isot').checked = ts ? ts.isOT : false;
  document.getElementById('ts-comment').value = ts && ts.comment ? ts.comment : '';
  
  modal.style.display = 'flex';
}

function openAnalyticsModal(uid) {
  const modal = document.getElementById('analytics-modal');
  const { personnel, timesheets, projects } = getState();
  const person = (personnel || []).find(p => p.id === uid);
  if(!person) return;
  
  document.getElementById('analytics-name').innerText = `Dữ liệu của ${person.name}`;
  
  const planData = getPlanningData(currentOffset);
  const weekDates = [];
  planData.forEach(w => w.days.forEach(d => weekDates.push(d.dateString)));
  
  // Aggregate hours by project
  const projSums = {};
  let totalHours = 0;
  
  (timesheets || []).filter(t => t.userId === uid && weekDates.includes(t.dateString)).forEach(t => {
    projSums[t.projectId] = (projSums[t.projectId] || 0) + Number(t.hours);
    totalHours += Number(t.hours);
  });
  
  const container = document.getElementById('analytics-chart-container');
  if(totalHours === 0) {
    container.innerHTML = `<div class="text-muted">Chưa có dữ liệu làm việc trong 2 tuần này.</div>`;
    modal.style.display = 'flex';
    return;
  }
  
  const colors = ['#6200ea', '#00c853', '#d50000', '#ffab00', '#00b0ff', '#aa00ff'];
  let legendHtml = '<div style="text-align:left;">';
  let conicStops = [];
  let currentAngle = 0;
  
  Object.keys(projSums).forEach((pid, idx) => {
    const val = projSums[pid];
    const pct = (val / totalHours) * 100;
    const proj = (projects||[]).find(p => p.id === pid);
    const pName = proj ? proj.name : 'Unknown';
    const color = colors[idx % colors.length];
    
    conicStops.push(`${color} ${currentAngle}% ${currentAngle + pct}%`);
    currentAngle += pct;
    
    legendHtml += `
      <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
        <div style="width:12px; height:12px; border-radius:50%; background:${color};"></div>
        <div style="font-size:0.9rem;">${pName} (${val}h - ${pct.toFixed(1)}%)</div>
      </div>
    `;
  });
  legendHtml += '</div>';
  
  const pieCss = `width: 150px; height: 150px; border-radius: 50%; background: conic-gradient(${conicStops.join(', ')});`;
  
  container.innerHTML = `
    <div style="${pieCss}"></div>
    ${legendHtml}
  `;
  
  modal.style.display = 'flex';
}

function saveTimesheet(ds, hours, isOT = false, comment = '') {
  const uid = ds.uid;
  const pid = ds.pid;
  const tid = ds.tid;
  const dateStr = ds.date;
  
  const { timesheets } = getState();
  const updated = [...(timesheets || [])];
  
  const existingIdx = updated.findIndex(t => t.userId === uid && t.projectId === pid && t.taskId === tid && t.dateString === dateStr);
  
  if (hours === 0 || hours === '') {
    if (existingIdx >= 0) updated.splice(existingIdx, 1);
  } else {
    if (existingIdx >= 0) {
      updated[existingIdx].hours = hours;
      updated[existingIdx].isOT = isOT;
      updated[existingIdx].comment = comment;
    } else {
      updated.push({
        id: `ts-${Date.now()}-${Math.random()}`,
        userId: uid,
        projectId: pid,
        taskId: tid,
        dateString: dateStr,
        hours: hours,
        isOT: isOT,
        comment: comment
      });
    }
  }
  
  import('../state.js').then(module => {
    module.setState('timesheets', updated);
    const container = document.getElementById('page-content');
    if (container) {
      container.innerHTML = render();
      init();
    }
  });
}

export function destroy() {}
