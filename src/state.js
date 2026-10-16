// ============================================
// STATE MANAGEMENT — BIM Transport PM Platform
// ============================================

import { formatLocalDate } from './utils/formatters.js';
import { memberTimesheetsSeed } from './data/projects.js';

const listeners = new Set();

let state = {
  currentPage: 'dashboard',
  projects: [],
  personnel: [],
  softwareAssets: [],
  hardwareAssets: [],
  activityLog: [],
  timesheets: [...(memberTimesheetsSeed || [])],
  deletedTimesheetIds: [], // Danh sách tombstone chống hồi sinh timesheet đã xóa
  qualityData: null,
  selectedProjectId: null,
  sidebarOpen: false,
  modalOpen: false,
  modalContent: null,
  searchQuery: '',
  filterStatus: 'all',
  filterType: 'all',
  dashboardView: 'list', // 'list' or 'kanban'
  ganttScale: 'month', // 'day', 'month', 'quarter'
  isEditingLayout: false,
  dashboardLayout: ['kpi', 'filters', 'analytics', 'projects', 'sidebar', 'gantt'],
  widgetSpans: { kpi: 3, filters: 3, analytics: 3, projects: 2, sidebar: 1, gantt: 3 },
  theme: 'light', // 'light' or 'dark'
  notifications: [],
  currentUserRole: 'BIM Manager', // Legacy, to be replaced by currentUser.role
  currentUser: null, // { id, name, email, role }
  registeredUsers: [
    { id: 'u_admin', name: 'Nguyễn Thanh Nhật (Admin)', email: 'admin@vsibim.com', password: '123', role: 'BIM Manager' },
    { id: 'u_nhat', name: 'Nguyễn Thanh Nhật', email: 'nhattedisouth@gmail.com', password: '123', role: 'BIM Manager' },
    { id: 'u_thien', name: 'Thân Nguyễn Thái Thiện', email: 'thienthannguyenthai@gmail.com', password: '123', role: 'BIM Modeler' },
    { id: 'u_tai', name: 'Nguyễn Ngọc Thanh Tài', email: 'tainguyen6628@gmail.com', password: '123', role: 'BIM Modeler' },
    { id: 'u_thuan', name: 'Minh Thuận', email: 'minhthuan.uah@gmail.com', password: '123', role: 'BIM Modeler' },
    { id: 'u_an', name: 'Nguyễn Văn An', email: 'an.nguyen@bimvn.com', password: '123', role: 'BIM Coordinator' }
  ]
};

const savedState = localStorage.getItem('bimTransPM_State');
if (savedState) {
  try {
    const parsed = JSON.parse(savedState);
    state = { ...state, ...parsed };

    // Phục hồi tombstone các timesheet đã xóa từ localStorage
    try {
      const savedDeleted = localStorage.getItem('bimTransPM_DeletedTimesheets');
      if (savedDeleted) {
        const parsedDel = JSON.parse(savedDeleted);
        if (Array.isArray(parsedDel)) {
          state.deletedTimesheetIds = Array.from(new Set([...(state.deletedTimesheetIds || []), ...parsedDel]));
        }
      }
    } catch(e) {}

    // Lọc bỏ ngay các timesheets nằm trong danh sách đã xóa
    if (state.deletedTimesheetIds && state.deletedTimesheetIds.length > 0) {
      const dSet = new Set(state.deletedTimesheetIds);
      state.timesheets = (state.timesheets || []).filter(ts => {
        const key = ts.id || `${ts.userId}_${ts.projectId}_${ts.taskId || ''}_${ts.dateString || ts.date}_${!!ts.isActual}`;
        return !dSet.has(ts.id) && !dSet.has(key);
      });
    }

    // Đảm bảo 10 bản ghi vàng thực tế của thành viên (Dự án 14D) luôn có mặt
    if (memberTimesheetsSeed && Array.isArray(memberTimesheetsSeed)) {
      const dSet = new Set(state.deletedTimesheetIds || []);
      memberTimesheetsSeed.forEach(seedTs => {
        if (!dSet.has(seedTs.id)) {
          const exists = (state.timesheets || []).some(t => 
            t.id === seedTs.id || 
            ((t.dateString === seedTs.dateString || t.date === seedTs.date) && 
             t.taskId === seedTs.taskId && 
             t.isActual === seedTs.isActual)
          );
          if (!exists) {
            state.timesheets = state.timesheets || [];
            state.timesheets.push({ ...seedTs });
          }
        }
      });
    }
    
    // Auto-add new widgets to legacy saved layouts
    if (!state.dashboardLayout.includes('analytics')) {
      state.dashboardLayout.splice(2, 0, 'analytics');
      state.widgetSpans.analytics = 3;
    }
    
    // Đồng bộ người dùng Firebase thực vào registeredUsers
    state.registeredUsers = [
      { id: 'u_admin', name: 'Nguyễn Thanh Nhật (Admin)', email: 'admin@vsibim.com', password: '123', role: 'BIM Manager' },
      { id: 'u_nhat', name: 'Nguyễn Thanh Nhật', email: 'nhattedisouth@gmail.com', password: '123', role: 'BIM Manager' },
      { id: 'u_thien', name: 'Thân Nguyễn Thái Thiện', email: 'thienthannguyenthai@gmail.com', password: '123', role: 'BIM Modeler' },
      { id: 'u_tai', name: 'Nguyễn Ngọc Thanh Tài', email: 'tainguyen6628@gmail.com', password: '123', role: 'BIM Modeler' },
      { id: 'u_thuan', name: 'Minh Thuận', email: 'minhthuan.uah@gmail.com', password: '123', role: 'BIM Modeler' },
      { id: 'u_an', name: 'Nguyễn Văn An', email: 'an.nguyen@bimvn.com', password: '123', role: 'BIM Coordinator' }
    ];
  } catch(e) {
    console.error('Error loading state', e);
  }
}

// Apply initial theme
if (state.theme === 'dark') {
  document.documentElement.setAttribute('data-theme', 'dark');
} else {
  document.documentElement.setAttribute('data-theme', 'light');
}

/**
 * Get a shallow copy of the current state
 */
// ============================================
// AUTHENTICATION & DATABASE (Google Sheets & Firebase Auth)
// ============================================
const GAS_URL = "https://script.google.com/macros/s/AKfycbx7XiBpWK5409sDFQGFsJCtQHv3WHWGe8U4sfOQjZNqjQMmW3PTX9Csy431W3sQwm8y/exec";

let syncTimeout = null;
export async function syncToFirestore(forceResetTombstones = false) {
  if (!db) return;
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    try {
      // 🛡️ CHẶN GHI ĐÈ NGUY HIỂM (Data Loss Prevention)
      // Không bao giờ ghi đè lên Firestore nếu state.projects đang rỗng
      if (!state.projects || state.projects.length === 0) {
        console.warn("⚠️ Bỏ qua syncToFirestore: projects rỗng, bảo vệ an toàn dữ liệu!");
        return;
      }

      // Lưu snapshot trước khi gửi lên Cloud để luôn có điểm phục hồi an toàn
      saveLocalSnapshot('Trước khi đồng bộ Cloud');

      // TỰ ĐỘNG ĐỒNG BỘ DỮ LIỆU LIÊN KẾT (Single Source of Truth)
      if (state.projects) {
        state.projects.forEach(proj => {
          if (proj.tasks && proj.tasks.length > 0) {
             const totalProgress = proj.tasks.reduce((sum, t) => sum + (t.progress || 0), 0);
             proj.progress = Math.round(totalProgress / proj.tasks.length);
          }
        });
      }

      if (state.projects && state.personnel) {
        state.personnel.forEach(person => {
          const oldAllocMap = {};
          (person.allocation || []).forEach(a => oldAllocMap[a.projectId] = a.percentage);
          
          const newAllocation = [];
          state.projects.forEach(proj => {
            const inTeam = (proj.team || []).some(m => m.name === person.name);
            const isLead = proj.teamLead === person.name;
            const inTasks = (proj.tasks || []).some(t => t.assignee === person.name);
            if (inTeam || isLead || inTasks) {
               newAllocation.push({
                 projectId: proj.id,
                 projectName: proj.name,
                 percentage: oldAllocMap[proj.id] || 30
               });
            }
          });
          
          person.allocation = newAllocation;
          person.totalAllocation = newAllocation.reduce((sum, a) => sum + a.percentage, 0);
          person.status = person.totalAllocation > 100 ? 'overloaded' : (person.totalAllocation > 0 ? 'active' : 'idle');
        });
      }

      // Đọc tài liệu hiện tại trên Firestore trước khi ghi để MERGE AN TOÀN
      const docRef = doc(db, "app_data", "main");
      let existingData = {};
      try {
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          existingData = snap.data() || {};
        }
      } catch(e) {}

      // 🛡️ BẢO VỆ TIMESHEETS (Đồng bộ an toàn giữa các thiết bị nhưng TÔN TRỌNG THAO TÁC XÓA)
      let deletedIds = new Set();
      if (!forceResetTombstones) {
        deletedIds = new Set([
          ...(state.deletedTimesheetIds || []),
          ...(existingData.deletedTimesheetIds || [])
        ]);
        try {
          const localDelStr = localStorage.getItem('bimTransPM_DeletedTimesheets');
          if (localDelStr) {
            const parsedLocalDel = JSON.parse(localDelStr);
            if (Array.isArray(parsedLocalDel)) {
              parsedLocalDel.forEach(id => deletedIds.add(id));
            }
          }
        } catch(e) {}
        state.deletedTimesheetIds = Array.from(deletedIds);
        try {
          localStorage.setItem('bimTransPM_DeletedTimesheets', JSON.stringify(state.deletedTimesheetIds));
        } catch(e) {}
      } else {
        // Khi khôi phục backup hoặc reset: dọn sạch hoàn toàn các tombstone
        state.deletedTimesheetIds = [];
        try {
          localStorage.removeItem('bimTransPM_DeletedTimesheets');
        } catch(e) {}
      }

      const tsMap = new Map();
      const isTsDeleted = (ts) => {
        if (!ts) return true;
        if (forceResetTombstones) return false;
        const key = ts.id || `${ts.userId}_${ts.projectId}_${ts.taskId || ''}_${ts.dateString || ts.date}_${!!ts.isActual}`;
        return deletedIds.has(ts.id) || deletedIds.has(key);
      };

      // 1. Lấy timesheets từ Firestore nếu không forceReset
      if (!forceResetTombstones && existingData.timesheets && existingData.timesheets.length > 0) {
        existingData.timesheets.forEach(ts => {
          if (!isTsDeleted(ts)) {
            const key = ts.id || `${ts.userId}_${ts.projectId}_${ts.taskId || ''}_${ts.dateString || ts.date}_${!!ts.isActual}`;
            tsMap.set(key, ts);
          }
        });
      }

      // 2. Gộp timesheets hiện tại ở State & Seed Timesheets (10 mục thực tế 14D)
      if (memberTimesheetsSeed && Array.isArray(memberTimesheetsSeed)) {
        memberTimesheetsSeed.forEach(seedTs => {
          if (!isTsDeleted(seedTs)) {
            const key = seedTs.id || `${seedTs.userId}_${seedTs.projectId}_${seedTs.taskId || ''}_${seedTs.dateString || seedTs.date}_${!!seedTs.isActual}`;
            if (!tsMap.has(key)) {
              tsMap.set(key, seedTs);
            }
          }
        });
      }

      (state.timesheets || []).forEach(ts => {
        if (!isTsDeleted(ts)) {
          const key = ts.id || `${ts.userId}_${ts.projectId}_${ts.taskId || ''}_${ts.dateString || ts.date}_${!!ts.isActual}`;
          tsMap.set(key, ts);
        }
      });

      let timesheetsToSave = Array.from(tsMap.values());
      state.timesheets = timesheetsToSave;

      // 🛡️ BẢO VỆ PROJECTS & TASKS (Data Loss Prevention Guard)
      let projectsToSave = [...(state.projects || [])];
      if (existingData.projects && existingData.projects.length > 0) {
        // 1. Chống mất số lượng dự án: Nếu state hiện tại có ít dự án hơn Firestore
        if (projectsToSave.length < existingData.projects.length) {
          console.warn(`🛡️ DLP Guard: Phát hiện thiếu dự án (${projectsToSave.length} vs ${existingData.projects.length}). Tự động gộp!`);
          const pMap = new Map(existingData.projects.map(p => [p.id, p]));
          projectsToSave.forEach(p => pMap.set(p.id, p));
          projectsToSave = Array.from(pMap.values());
          state.projects = projectsToSave;
        }

        // 2. Chống mất Tasks, Segments, Milestones khi cập nhật một phần (cho phép xóa rỗng có chủ đích)
        projectsToSave.forEach(p => {
          const exP = existingData.projects.find(ep => ep.id === p.id);
          if (exP) {
            if (p.tasks === undefined && exP.tasks) {
              p.tasks = exP.tasks;
            }
            if (p.segments === undefined && exP.segments) {
              p.segments = exP.segments;
            }
            if (p.milestones === undefined && exP.milestones) {
              p.milestones = exP.milestones;
            }
          }
        });
      }

      const dataToSave = JSON.parse(JSON.stringify({
        projects: projectsToSave,
        personnel: state.personnel || existingData.personnel || [],
        softwareAssets: state.softwareAssets || existingData.softwareAssets || [],
        hardwareAssets: state.hardwareAssets || existingData.hardwareAssets || [],
        activityLog: state.activityLog || existingData.activityLog || [],
        timesheets: timesheetsToSave,
        deletedTimesheetIds: state.deletedTimesheetIds || [],
        lastUpdated: new Date().toISOString()
      }));

      await setDoc(docRef, dataToSave, { merge: true });
      console.log("✅ Đồng bộ Firestore an toàn thành công (merge: true)");
    } catch (e) {
      console.error("❌ Lỗi đồng bộ Firestore:", e);
    }
  }, 1000);
}

/**
 * KHÔI PHỤC DỮ LIỆU TỪ GOOGLE SHEETS (Dự án 14D, Tasks, Giờ làm của kỹ sư)
 */
export async function restoreFromGoogleSheets() {
  try {
    console.log("⏳ Đang kết nối tải dữ liệu gốc từ Google Sheets...");
    const res = await fetch(GAS_URL);
    if (!res.ok) throw new Error("Không thể kết nối đến Google Sheets");
    const data = await res.json();
    
    // 1. Phục hồi danh sách Tasks từ Google Sheets
    const rawTasks = [];
    if (Array.isArray(data.Tasks)) {
      data.Tasks.forEach(row => {
        if (typeof row === 'object' && row !== null) {
          for (const val of Object.values(row)) {
            if (typeof val === 'string' && val.trim().startsWith('{')) {
              try {
                const parsed = JSON.parse(val);
                if (parsed && (parsed.id || parsed.name)) rawTasks.push(parsed);
              } catch(e) {}
            } else if (typeof val === 'object' && val !== null && (val.id || val.name)) {
              rawTasks.push(val);
            }
          }
          if (row.id && row.name && !rawTasks.some(t => t.id === row.id)) {
            rawTasks.push(row);
          }
        }
      });
    }

    // 2. Phục hồi Resources (Nhân sự kỹ sư)
    const rawResources = [];
    if (Array.isArray(data.Resources)) {
      data.Resources.forEach(row => {
        if (typeof row === 'object' && row !== null) {
          for (const val of Object.values(row)) {
            if (typeof val === 'string' && val.trim().startsWith('{')) {
              try {
                const parsed = JSON.parse(val);
                if (parsed && parsed.name) rawResources.push(parsed);
              } catch(e) {}
            } else if (typeof val === 'object' && val !== null && val.name) {
              rawResources.push(val);
            }
          }
          if (row.name && !rawResources.some(r => r.name === row.name)) {
            rawResources.push(row);
          }
        }
      });
    }

    // Cập nhật Personnel
    let personnel = [...(state.personnel || [])];
    rawResources.forEach(res => {
      const existing = personnel.find(p => p.name === res.name);
      if (!existing) {
        personnel.push({
          id: res.id || `p-trieu-${Date.now()}`,
          name: res.name,
          email: `${res.name.toLowerCase().replace(/\s+/g, '')}@vsibim.com`,
          avatar: "👤",
          role: res.role || "Modeler",
          level: "Mid",
          skills: Array.isArray(res.skills) ? res.skills : (res.skills ? [res.skills] : ["Civil 3D"]),
          allocation: [{ projectId: "P007", projectName: "Theo dõi tiến độ bản vẽ 14D", percentage: 100 }],
          totalAllocation: 100,
          status: "active"
        });
      }
    });

    // 3. Phục hồi Dự án 14D và nhiệm vụ (Tasks)
    let projects = [...(state.projects || [])];
    let p14d = projects.find(p => p.id === 'P007' || p.code === '14D' || (p.name && p.name.includes('14D')));
    
    // Nạp mẫu chi tiết đầy đủ của 14D từ projects.js
    const projectsMod = await import('./data/projects.js');
    const default14D = projectsMod.projectItems.find(p => p.id === 'P007') || {};

    if (!p14d) {
      p14d = JSON.parse(JSON.stringify(default14D));
      projects.push(p14d);
    } else {
      p14d.code = '14D';
      p14d.name = 'Theo dõi tiến độ bản vẽ 14D';
      p14d.client = 'Dự án 14D';
      p14d.location = 'Tuyến 14D';
      
      // Nếu thiếu milestones hoặc segments chi tiết, khôi phục từ default14D
      if (!p14d.milestones || p14d.milestones.length === 0) {
        p14d.milestones = JSON.parse(JSON.stringify(default14D.milestones || []));
      }
      if (!p14d.segments || p14d.segments.length === 0 || !p14d.segments[0].subSegments || p14d.segments[0].subSegments.length === 0) {
        p14d.segments = JSON.parse(JSON.stringify(default14D.segments || []));
      }
    }

    // Merge tasks từ default14D và Google Sheets vào p14d.tasks
    if (!p14d.tasks || p14d.tasks.length <= 2) {
      p14d.tasks = JSON.parse(JSON.stringify(default14D.tasks || []));
    } else {
      const existingIds = new Set(p14d.tasks.map(t => t.id || t.name));
      (default14D.tasks || []).forEach(dt => {
        if (!existingIds.has(dt.id) && !existingIds.has(dt.name)) {
          p14d.tasks.push(JSON.parse(JSON.stringify(dt)));
          existingIds.add(dt.id);
        }
      });
    }

    rawTasks.forEach(gTask => {
      const existingTask = p14d.tasks.find(t => t.id === gTask.id || (t.name === gTask.name && t.chainage === gTask.chainage));
      if (!existingTask) {
        let segIdx = 0, subIdx = 0, mlIdx = 0;
        if (gTask.chainage === 'Km34-35') {
          segIdx = 1; subIdx = 2; mlIdx = 1;
        }
        const defaultAssignee = (gTask.name && gTask.name.toLowerCase().includes('cầu')) ? 'Nguyễn Ngọc Thanh Tài' : 'Thân Nguyễn Thái Thiện';
        p14d.tasks.unshift({
          id: gTask.id || `t_${Date.now()}`,
          name: gTask.name ? `${gTask.name} (${gTask.chainage || ''})` : 'Hạng mục 14D',
          phase: gTask.phase || 'BVTC',
          lod: gTask.lod || 'LOD 300',
          chainage: gTask.chainage || 'Km0-5',
          assignee: (gTask.assignee && gTask.assignee !== 'Nguyễn Quốc Triệu') ? gTask.assignee : defaultAssignee,
          progress: 75,
          status: 'active',
          dueDate: '2026-10-30',
          segmentIdx: segIdx,
          subSegmentIdx: subIdx,
          milestoneIdx: mlIdx,
          dailyHours_planned: gTask.dailyHours_planned || {},
          dailyHours_actual: gTask.dailyHours_actual || {}
        });
      } else {
        if (gTask.dailyHours_planned) existingTask.dailyHours_planned = { ...existingTask.dailyHours_planned, ...gTask.dailyHours_planned };
        if (gTask.dailyHours_actual) existingTask.dailyHours_actual = { ...existingTask.dailyHours_actual, ...gTask.dailyHours_actual };
      }
    });

    // Đảm bảo team của 14D có đầy đủ nhân sự chủ lực
    p14d.team = p14d.team || [];
    if (!p14d.team.some(m => m.name === 'Thân Nguyễn Thái Thiện')) {
      p14d.team.unshift({ name: 'Thân Nguyễn Thái Thiện', role: 'BIM Modeler' });
    }
    if (!p14d.team.some(m => m.name === 'Nguyễn Ngọc Thanh Tài')) {
      p14d.team.unshift({ name: 'Nguyễn Ngọc Thanh Tài', role: 'BIM Modeler' });
    }
    if (!p14d.team.some(m => m.name === 'Trần Minh Khoa')) {
      p14d.team.push({ name: 'Trần Minh Khoa', role: 'BIM Coordinator' });
    }
    if (!p14d.team.some(m => m.name === 'Nguyễn Văn An')) {
      p14d.team.push({ name: 'Nguyễn Văn An', role: 'BIM Manager' });
    }

    // 4. Phục hồi Timesheets (Giờ làm kỹ sư đã nhập) từ dailyHours_planned và dailyHours_actual
    const delSetGoogle = new Set(state.deletedTimesheetIds || []);
    let timesheets = [...(state.timesheets || [])];

    (p14d.tasks || []).forEach(gTask => {
      const taskId = gTask.id;
      let taskAssignee = gTask.assignee;
      if (!taskAssignee || taskAssignee === 'Nguyễn Quốc Triệu') {
        taskAssignee = (gTask.name && gTask.name.toLowerCase().includes('cầu')) ? 'Nguyễn Ngọc Thanh Tài' : 'Thân Nguyễn Thái Thiện';
      }
      const personObj = personnel.find(p => p.name === taskAssignee);
      const uid = personObj ? personObj.id : (taskAssignee === 'Nguyễn Ngọc Thanh Tài' ? 'r_tai' : 'r_thien');

      // Kế hoạch giờ (dailyHours_planned)
      if (gTask.dailyHours_planned && typeof gTask.dailyHours_planned === 'object') {
        Object.entries(gTask.dailyHours_planned).forEach(([dateStr, hours]) => {
          const numH = Number(hours);
          const planId = `ts-plan-${taskId}-${dateStr}`;
          const planKey = `${uid}_${p14d.id}_${taskId}_${dateStr}_false`;
          if (numH > 0 && !delSetGoogle.has(planId) && !delSetGoogle.has(planKey)) {
            const exists = timesheets.some(ts => ts.taskId === taskId && ts.dateString === dateStr && !ts.isActual);
            if (!exists) {
              timesheets.push({
                id: planId,
                userId: uid,
                userName: taskAssignee,
                email: personObj ? personObj.email : 'trieu.nguyen@vsibim.com',
                projectId: p14d.id,
                projectName: p14d.name,
                taskId: taskId,
                taskName: gTask.name || 'An Toàn Giao Thông',
                dateString: dateStr,
                date: dateStr,
                hours: numH,
                isActual: false,
                isOT: false,
                comment: `Kế hoạch ${gTask.name} (${gTask.chainage || ''})`
              });
            }
          }
        });
      }

      // Giờ thực tế (dailyHours_actual)
      if (gTask.dailyHours_actual && typeof gTask.dailyHours_actual === 'object') {
        Object.entries(gTask.dailyHours_actual).forEach(([dateStr, hours]) => {
          const numH = Number(hours);
          const actId = `ts-act-${taskId}-${dateStr}`;
          const actKey = `${uid}_${p14d.id}_${taskId}_${dateStr}_true`;
          if (numH > 0 && !delSetGoogle.has(actId) && !delSetGoogle.has(actKey)) {
            const exists = timesheets.some(ts => ts.taskId === taskId && ts.dateString === dateStr && ts.isActual);
            if (!exists) {
              timesheets.push({
                id: actId,
                userId: uid,
                userName: taskAssignee,
                email: personObj ? personObj.email : 'trieu.nguyen@vsibim.com',
                projectId: p14d.id,
                projectName: p14d.name,
                taskId: taskId,
                taskName: gTask.name || 'An Toàn Giao Thông',
                dateString: dateStr,
                date: dateStr,
                hours: numH,
                isActual: true,
                isOT: false,
                comment: `Thực tế ${gTask.name}`
              });
            }
          }
        });
      }
    });

    // 5. Cập nhật State
    setState('projects', projects);
    setState('personnel', personnel);
    setState('timesheets', timesheets);
    syncToFirestore();

    console.log(`✅ Khôi phục thành công từ Google Sheets! Tasks: ${rawTasks.length}, Timesheets: ${timesheets.length}`);
    return {
      success: true,
      tasksCount: rawTasks.length,
      timesheetsCount: timesheets.length,
      personnelCount: rawResources.length
    };
  } catch (err) {
    console.error("❌ Lỗi khi khôi phục từ Google Sheets:", err);
    return { success: false, error: err.message };
  }
}

/**
 * XUẤT FILE SAO LƯU TOÀN BỘ HỆ THỐNG VỀ MÁY (FULL SYSTEM BACKUP)
 */
export function exportBackupJSON() {
  const backup = {
    version: "2.0",
    system: "VSI BIM Operation Platform",
    exportedAt: new Date().toISOString(),
    exportedBy: state.currentUser?.email || state.currentUserAuth?.email || 'admin@vsibim.com',
    projects: state.projects || [],
    personnel: state.personnel || [],
    timesheets: state.timesheets || [],
    softwareAssets: state.softwareAssets || [],
    hardwareAssets: state.hardwareAssets || [],
    activityLog: state.activityLog || [],
    qualityData: state.qualityData || null,
    registeredUsers: state.registeredUsers || [],
    dashboardLayout: state.dashboardLayout || [],
    widgetSpans: state.widgetSpans || {},
    theme: state.theme || 'light'
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `BIM_TransPM_FullBackup_${formatLocalDate(new Date())}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * NHẬP FILE SAO LƯU JSON TỪ MÁY VÀ KHÔI PHỤC TOÀN BỘ HỆ THỐNG (FULL RESTORE)
 */
export function importBackupJSON(fileOrData) {
  return new Promise((resolve, reject) => {
    const processData = async (data) => {
      try {
        if (!data || typeof data !== 'object') {
          throw new Error("Dữ liệu sao lưu không hợp lệ");
        }

        // 1. DỌN SẠCH CÁC TOMBSTONE ĐÃ XÓA để giải phóng dữ liệu giờ làm & nhiệm vụ của nhân sự
        state.deletedTimesheetIds = [];
        try {
          localStorage.removeItem('bimTransPM_DeletedTimesheets');
        } catch(err) {}

        // 2. Nạp dữ liệu toàn bộ các module từ file backup
        if (data.projects && Array.isArray(data.projects)) setState('projects', data.projects);
        if (data.personnel && Array.isArray(data.personnel)) setState('personnel', data.personnel);
        
        let tsToRestore = (data.timesheets && Array.isArray(data.timesheets)) ? [...data.timesheets] : [];
        if (memberTimesheetsSeed && Array.isArray(memberTimesheetsSeed)) {
          memberTimesheetsSeed.forEach(seedTs => {
            const hasIt = tsToRestore.some(t => 
              t.id === seedTs.id || 
              ((t.dateString === seedTs.dateString || t.date === seedTs.date) && 
               (t.taskId === seedTs.taskId || t.note === seedTs.note || t.comment === seedTs.comment) && 
               t.isActual === seedTs.isActual)
            );
            if (!hasIt) tsToRestore.push({ ...seedTs });
          });
        }
        setState('timesheets', tsToRestore);
        if (data.softwareAssets && Array.isArray(data.softwareAssets)) setState('softwareAssets', data.softwareAssets);
        if (data.hardwareAssets && Array.isArray(data.hardwareAssets)) setState('hardwareAssets', data.hardwareAssets);
        if (data.activityLog && Array.isArray(data.activityLog)) setState('activityLog', data.activityLog);
        if (data.qualityData) setState('qualityData', data.qualityData);
        if (data.registeredUsers && Array.isArray(data.registeredUsers)) setState('registeredUsers', data.registeredUsers);
        if (data.dashboardLayout && Array.isArray(data.dashboardLayout)) setState('dashboardLayout', data.dashboardLayout);
        if (data.widgetSpans && typeof data.widgetSpans === 'object') setState('widgetSpans', data.widgetSpans);
        if (data.theme) setState('theme', data.theme);

        // Lưu vào localStorage ngay
        try {
          localStorage.setItem('bimTransPM_State', JSON.stringify(state));
        } catch(e) {}

        // 3. Tạo ngay điểm phục hồi cục bộ
        saveLocalSnapshot(`Khôi phục toàn bộ từ file backup: ${fileOrData?.name || 'JSON'}`);

        // 4. Đồng bộ ngay lên Firestore với cờ forceResetTombstones = true
        await syncToFirestore(true);

        let totalTasks = 0;
        (state.projects || []).forEach(p => { totalTasks += (p.tasks || []).length; });

        console.log(`✅ Phục hồi hoàn tất từ Backup JSON! ${state.projects.length} dự án, ${totalTasks} tasks, ${state.timesheets.length} timesheets`);

        resolve({ 
          success: true, 
          projectsCount: (state.projects || []).length,
          tasksCount: totalTasks,
          timesheetsCount: (state.timesheets || []).length,
          personnelCount: (state.personnel || []).length
        });
      } catch (err) {
        reject(err);
      }
    };

    if (fileOrData instanceof File || fileOrData instanceof Blob) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          processData(parsed);
        } catch (err) {
          reject(new Error("File JSON không đúng định dạng: " + err.message));
        }
      };
      reader.onerror = () => reject(new Error("Không thể đọc file"));
      reader.readAsText(fileOrData);
    } else if (typeof fileOrData === 'object' && fileOrData !== null) {
      processData(fileOrData);
    } else if (typeof fileOrData === 'string') {
      try {
        const parsed = JSON.parse(fileOrData);
        processData(parsed);
      } catch(e) {
        reject(new Error("Chuỗi JSON không đúng định dạng: " + e.message));
      }
    } else {
      reject(new Error("Định dạng dữ liệu không được hỗ trợ"));
    }
  });
}

const SNAPSHOT_KEY_PREFIX = 'bimTransPM_snapshot_';
const MAX_SNAPSHOTS = 5;

/**
 * LƯU BẢN SAO LƯU ROLLING CỤC BỘ (LOCAL SNAPSHOT)
 */
export function saveLocalSnapshot(reason = 'Tự động sao lưu') {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    if (!state.projects || state.projects.length === 0) return;
    
    let totalTasks = 0;
    state.projects.forEach(p => { totalTasks += (p.tasks || []).length; });
    const timesheetsCount = (state.timesheets || []).length;
    
    if (totalTasks === 0 && timesheetsCount === 0) return;

    const newSnapshot = {
      timestamp: Date.now(),
      isoDate: new Date().toLocaleString('vi-VN'),
      reason: reason,
      summary: {
        projectsCount: state.projects.length,
        totalTasks: totalTasks,
        timesheetsCount: timesheetsCount,
        personnelCount: (state.personnel || []).length
      },
      data: {
        projects: JSON.parse(JSON.stringify(state.projects)),
        personnel: JSON.parse(JSON.stringify(state.personnel || [])),
        timesheets: JSON.parse(JSON.stringify(state.timesheets || [])),
        softwareAssets: JSON.parse(JSON.stringify(state.softwareAssets || [])),
        hardwareAssets: JSON.parse(JSON.stringify(state.hardwareAssets || [])),
        activityLog: JSON.parse(JSON.stringify(state.activityLog || []))
      }
    };

    let metaList = getLocalSnapshotsMetadata();
    if (metaList.length > 0) {
      const last = metaList[0];
      if (Date.now() - last.timestamp < 30000 && 
          last.summary.totalTasks === totalTasks && 
          last.summary.timesheetsCount === timesheetsCount) {
        return;
      }
    }

    metaList.unshift({
      timestamp: newSnapshot.timestamp,
      isoDate: newSnapshot.isoDate,
      reason: newSnapshot.reason,
      summary: newSnapshot.summary
    });

    if (metaList.length > MAX_SNAPSHOTS) {
      metaList = metaList.slice(0, MAX_SNAPSHOTS);
    }

    // Dịch chuyển các slot dữ liệu
    for (let i = MAX_SNAPSHOTS - 1; i >= 1; i--) {
      const prev = localStorage.getItem(`${SNAPSHOT_KEY_PREFIX}${i - 1}`);
      if (prev) localStorage.setItem(`${SNAPSHOT_KEY_PREFIX}${i}`, prev);
    }
    localStorage.setItem(`${SNAPSHOT_KEY_PREFIX}0`, JSON.stringify(newSnapshot));
    localStorage.setItem('bimTransPM_snapshots_meta', JSON.stringify(metaList));
    console.log(`📦 [DLP] Đã tạo điểm phục hồi cục bộ: ${newSnapshot.summary.projectsCount} dự án, ${totalTasks} tasks, ${timesheetsCount} timesheets (${reason})`);
  } catch (e) {
    console.warn("⚠️ Không thể lưu snapshot cục bộ:", e);
  }
}

/**
 * LẤY DANH SÁCH METADATA CỦA CÁC ĐIỂM PHỤC HỒI
 */
export function getLocalSnapshotsMetadata() {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = localStorage.getItem('bimTransPM_snapshots_meta');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * PHỤC HỒI STATE TỪ ĐIỂM SAO LƯU CHỈ ĐỊNH
 */
export function restoreSnapshotByIndex(index) {
  if (typeof window === 'undefined' || !window.localStorage) return { success: false, error: 'Trình duyệt không hỗ trợ localStorage' };
  try {
    const raw = localStorage.getItem(`${SNAPSHOT_KEY_PREFIX}${index}`);
    if (!raw) return { success: false, error: 'Không tìm thấy dữ liệu điểm sao lưu này' };
    const snapshot = JSON.parse(raw);
    if (!snapshot || !snapshot.data) return { success: false, error: 'Dữ liệu điểm sao lưu bị hỏng' };

    // Dọn sạch tombstone đã xóa để toàn bộ dữ liệu giờ làm trong snapshot được khôi phục nguyên vẹn
    state.deletedTimesheetIds = [];
    try {
      localStorage.removeItem('bimTransPM_DeletedTimesheets');
    } catch(err) {}

    if (snapshot.data.projects) setState('projects', snapshot.data.projects);
    if (snapshot.data.personnel) setState('personnel', snapshot.data.personnel);
    if (snapshot.data.timesheets) setState('timesheets', snapshot.data.timesheets);
    if (snapshot.data.softwareAssets) setState('softwareAssets', snapshot.data.softwareAssets);
    if (snapshot.data.hardwareAssets) setState('hardwareAssets', snapshot.data.hardwareAssets);
    if (snapshot.data.activityLog) setState('activityLog', snapshot.data.activityLog);

    syncToFirestore(true);
    return {
      success: true,
      summary: snapshot.summary,
      isoDate: snapshot.isoDate,
      reason: snapshot.reason
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}


import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, getDocs, getDoc, onSnapshot, writeBatch, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export function recalculateUserRole() {
  const authUser = state.currentUserAuth;
  if (!authUser) {
    if (state.currentUser !== null) setState('currentUser', null);
    return;
  }
  
  const authEmail = (authUser.email || '').toLowerCase().trim();
  const person = (state.personnel || []).find(p => 
    (p.email || '').toLowerCase() === authEmail ||
    (p.secondaryEmails || []).some(e => e.toLowerCase() === authEmail)
  );

  let canonicalName = person?.name || authUser.name;
  if (!canonicalName || canonicalName === authEmail.split('@')[0]) {
    if (authEmail.includes('thienthan') || authEmail.includes('thien.than')) canonicalName = 'Thân Nguyễn Thái Thiện';
    else if (authEmail.includes('tainguyen') || authEmail.includes('tai.nguyen')) canonicalName = 'Nguyễn Ngọc Thanh Tài';
    else if (authEmail.includes('minhthuan')) canonicalName = 'Minh Thuận';
    else if (authEmail.includes('an.nguyen')) canonicalName = 'Nguyễn Văn An';
    else if (authEmail.includes('nhattedisouth') || authEmail === 'admin@vsibim.com') canonicalName = 'Nguyễn Thanh Nhật';
  }

  let role = person ? person.role : 'BIM Modeler';
  let allocation = person ? (person.allocation || []) : [];
  
  // Hardcode admin default account to prevent lockout
  if (authUser.email === 'admin@vsibim.com' || authUser.email === 'nhattedisouth@gmail.com') {
    role = 'BIM Manager';
  }

  // Prevent infinite loop if already set to same values (shallow check)
  if (!state.currentUser || state.currentUser.role !== role || state.currentUser.name !== canonicalName || state.currentUser.allocation?.length !== allocation.length) {
    setState('currentUser', {
      ...authUser,
      name: canonicalName,
      role: role,
      personnelRecord: person || null,
      allocation: allocation
    });
    setState('currentUserRole', role);
    
    // Apply UI Restrictions
    if (typeof document !== 'undefined') {
      if (role !== 'BIM Manager' && role !== 'Project Manager') {
        document.body.classList.add('restricted-mode');
      } else {
        document.body.classList.remove('restricted-mode');
      }
    }
  }
}

// BẠN SẼ ĐIỀN THÔNG TIN FIREBASE VÀO ĐÂY:
const firebaseConfig = {
  apiKey: "AIzaSyAEBParbnzUgyijCnZr7z_82Y05GlvSw-s",
  authDomain: "vsi-bim-operation.firebaseapp.com",
  projectId: "vsi-bim-operation",
  storageBucket: "vsi-bim-operation.firebasestorage.app",
  messagingSenderId: "181958877932",
  appId: "1:181958877932:web:b7ae98a7068abb65c6fbc9",
  measurementId: "G-B0GMNNFDCY"
};

// Khởi tạo Firebase nếu có cấu hình thực
let app, auth;
export let db;

let authInitResolve;
export const authReady = new Promise((resolve) => {
  authInitResolve = resolve;
});

if (firebaseConfig.apiKey && !firebaseConfig.apiKey.includes('ĐIỀN')) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    
    onAuthStateChanged(auth, (user) => {
      if (user) {
        const emailLower = (user.email || '').toLowerCase().trim();
        const personnel = state.personnel || [];
        const foundPerson = personnel.find(p => 
          (p.email || '').toLowerCase() === emailLower || 
          (p.secondaryEmails || []).some(e => e.toLowerCase() === emailLower)
        );
        
        let canonicalName = user.displayName;
        if (!canonicalName || canonicalName === user.email.split('@')[0]) {
          if (foundPerson) {
            canonicalName = foundPerson.name;
          } else if (emailLower.includes('thienthannguyen') || emailLower.includes('thien.than')) {
            canonicalName = 'Thân Nguyễn Thái Thiện';
          } else if (emailLower.includes('tainguyen6628') || emailLower.includes('tai.nguyen')) {
            canonicalName = 'Nguyễn Ngọc Thanh Tài';
          } else if (emailLower.includes('minhthuan')) {
            canonicalName = 'Minh Thuận';
          } else if (emailLower.includes('nhattedisouth') || emailLower === 'admin@vsibim.com') {
            canonicalName = 'Nguyễn Thanh Nhật';
          } else if (emailLower.includes('an.nguyen')) {
            canonicalName = 'Nguyễn Văn An';
          } else {
            canonicalName = user.email.split('@')[0];
          }
        }

        const authUser = { 
          id: user.uid, 
          name: canonicalName, 
          email: user.email 
        };
        setState('currentUserAuth', authUser);
        
        // Tự động bổ sung vào danh sách nhân sự nếu là người mới
        if (!foundPerson) {
          personnel.push({
            id: `p-${user.uid}`,
            name: canonicalName,
            email: user.email,
            avatar: canonicalName.split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase() || '👤',
            role: (user.email === 'admin@vsibim.com' || user.email === 'nhattedisouth@gmail.com') ? 'BIM Manager' : 'BIM Modeler',
            level: 'mid',
            skills: ['Civil 3D', 'Revit', 'AutoCAD'],
            allocation: [{ projectId: 'P007', projectName: 'Theo dõi tiến độ bản vẽ 14D', percentage: 100 }],
            totalAllocation: 100,
            status: 'active'
          });
          setState('personnel', personnel);
          syncToFirestore();
        }
      } else {
        setState('currentUserAuth', null);
      }
      authInitResolve();
    });
  } catch (error) {
    console.error("Firebase init error:", error);
    authInitResolve();
  }
} else {
  console.warn("⚠️ Firebase Config chưa được cấu hình. Hệ thống sẽ không hoạt động!");
  authInitResolve();
}

export async function loginUser(email, password) {
  if (!auth) return { success: false, message: 'Hệ thống chưa được kết nối Firebase' };
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Auto-sync missing users to personnel (Google Sheets)
    const personnel = state.personnel || [];
    const exists = personnel.find(p => p.email === email);
    if (!exists) {
      personnel.unshift({
        id: `p-${Date.now()}`,
        name: userCredential.user.displayName || email.split('@')[0],
        email: email,
        avatar: '👤',
        role: email === 'admin@vsibim.com' ? 'BIM Manager' : 'Member',
        level: 'New',
        skills: [],
        allocation: [],
        totalAllocation: 0
      });
      setState('personnel', personnel);
    }

    return { success: true };
  } catch (error) {
    console.error("Login err:", error);
    let msg = `Đăng nhập thất bại: ${error.message}`;
    if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') msg = 'Sai email hoặc mật khẩu';
    else if (error.code === 'auth/user-not-found') msg = 'Tài khoản không tồn tại';
    else if (error.code === 'auth/too-many-requests') msg = 'Bạn đã thử sai quá nhiều lần. Vui lòng thử lại sau.';
    else if (error.code === 'auth/user-disabled') msg = 'Tài khoản này đã bị khóa.';
    return { success: false, message: msg };
  }
}

export async function registerUser(name, email, password) {
  if (!auth) return { success: false, message: 'Hệ thống chưa được kết nối Firebase' };
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName: name });
    
    // Auto-add to Personnel list as Member (Google Sheets)
    const personnel = state.personnel || [];
    personnel.unshift({
      id: `p-${Date.now()}`,
      name: name,
      email: email,
      avatar: '👤',
      role: 'Member',
      level: 'New',
      skills: [],
      allocation: [],
      totalAllocation: 0
    });
    setState('personnel', personnel);
    
    return { success: true };
  } catch (error) {
    console.error("Reg err:", error);
    let msg = `Đăng ký thất bại: ${error.message}`;
    if (error.code === 'auth/email-already-in-use') msg = 'Email này đã được sử dụng';
    else if (error.code === 'auth/weak-password') msg = 'Mật khẩu quá yếu (cần tối thiểu 6 ký tự)';
    else if (error.code === 'auth/operation-not-allowed') msg = 'Lỗi: Bạn chưa bật tính năng đăng nhập Email/Password trong Firebase Console.';
    return { success: false, message: msg };
  }
}

export async function logoutUser() {
  if (auth) {
    await signOut(auth);
  }
  setState('currentUserAuth', null);
}

export function getState() {
  const current = state.currentUser;
  if (current && current.role === 'Guest') {
    const allowedProjectIds = current.allocation ? current.allocation.map(a => a.projectId) : [];
    const filteredProjects = state.projects.filter(p => allowedProjectIds.includes(p.id));
    return { ...state, projects: filteredProjects };
  }
  return { ...state };
}

/**
 * Update a single key in state and notify all subscribers
 */
export function setState(key, value, fromCloud = false) {
  state[key] = value;
  
  if (!fromCloud) {
    state.lastLocalUpdate = Date.now();
  }
  
  if (typeof window !== 'undefined' && window.localStorage) {
     try {
       localStorage.setItem('bimTransPM_State', JSON.stringify(state));
       if (key === 'projects') {
         localStorage.setItem('bim_transpm_projects', JSON.stringify(value));
       }
     } catch(e) {}
  }
  
  // Sync to Firestore if the change originated from the UI
  if (!fromCloud && ['projects', 'personnel', 'softwareAssets', 'hardwareAssets', 'activityLog', 'timesheets'].includes(key)) {
    syncToFirestore();
  }

  listeners.forEach(fn => fn(key, value, { ...state }));
  
  if (key === 'personnel' || key === 'currentUserAuth') {
    recalculateUserRole();
  }
}

/**
 * Subscribe to state changes
 */
export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ============================================
// PROJECT CRUD OPERATIONS
// ============================================

/**
 * Generate next project ID (P007, P008, ...)
 */
function generateProjectId() {
  const projects = state.projects;
  const maxNum = projects.reduce((max, p) => {
    const num = parseInt(p.id.replace('P', ''), 10);
    return num > max ? num : max;
  }, 0);
  return `P${String(maxNum + 1).padStart(3, '0')}`;
}

/**
 * Generate default phases for a new project
 */
function generateDefaultPhases(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalDays = (end - start) / (1000 * 60 * 60 * 24);
  const phaseDuration = Math.floor(totalDays / 6);

  const phaseIds = ['survey', 'preliminary', 'technical', 'detailed', 'construction', 'handover'];
  return phaseIds.map((id, i) => {
    const phaseStart = new Date(start.getTime() + i * phaseDuration * 24 * 60 * 60 * 1000);
    const phaseEnd = new Date(phaseStart.getTime() + phaseDuration * 24 * 60 * 60 * 1000);
    return {
      id,
      status: i === 0 ? 'active' : 'planning',
      progress: 0,
      startDate: formatLocalDate(phaseStart),
      endDate: formatLocalDate(phaseEnd)
    };
  });
}

/**
 * Add a new project to state
 * @param {Object} projectData - Partial project data from form
 * @returns {Object} The complete new project object
 */
export function addProject(projectData) {
  const id = generateProjectId();
  const newProject = {
    id,
    code: projectData.code || id,
    name: projectData.name,
    type: projectData.type || 'road',
    status: projectData.status || 'planning',
    priority: projectData.priority || 'medium',
    client: projectData.client || '',
    location: projectData.location || '',
    length: projectData.length || '',
    budget: projectData.budget || '',
    progress: 0,
    startDate: projectData.startDate,
    endDate: projectData.endDate,
    bepVersion: projectData.bepVersion || 'v1.0',
    currentPhase: 'survey',
    modelHealth: 50,
    lodTarget: parseInt(projectData.lodTarget, 10) || 300,
    lodCurrent: 100,
    clashesTotal: 0,
    clashesResolved: 0,
    disciplines: projectData.disciplines || ['road'],
    teamSize: parseInt(projectData.teamSize, 10) || 5,
    teamLead: projectData.teamLead || '',
    segments: projectData.segments || [],
    phases: projectData.phases || generateDefaultPhases(projectData.startDate, projectData.endDate),
    tasks: projectData.tasks || [],
    milestones: projectData.milestones || [],
    rfis: projectData.rfis || []
  };

  const projects = [...state.projects, newProject];
  setState('projects', projects);
  pushToHistory(projects);

  // Add activity log
  addActivityLog(`tạo dự án mới "${newProject.name}"`, newProject.name);

  console.log(`✅ Project ${id} added:`, newProject.name);
  return newProject;
}

/**
 * Update an existing project
 * @param {string} projectId - ID of the project to update
 * @param {Object} updates - Fields to update
 * @returns {Object|null} The updated project or null if not found
 */
export function updateProject(projectId, updates) {
  const projects = state.projects.map(p => {
    if (p.id === projectId) {
      return { ...p, ...updates };
    }
    return p;
  });

  const updated = projects.find(p => p.id === projectId);
  if (!updated) return null;

  setState('projects', projects);
  pushToHistory(projects);
  addActivityLog(`cập nhật dự án "${updated.name}"`, updated.name);

  console.log(`✅ Project ${projectId} updated`);
  return updated;
}

/**
 * Delete a project from state
 * @param {string} projectId - ID of the project to delete
 * @returns {boolean} True if deleted successfully
 */
export function deleteProject(projectId) {
  const project = state.projects.find(p => p.id === projectId);
  if (!project) return false;

  const projects = state.projects.filter(p => p.id !== projectId);
  setState('projects', projects);
  pushToHistory(projects);

  addActivityLog(`xóa dự án "${project.name}"`, project.name);

  console.log(`🗑️ Project ${projectId} deleted:`, project.name);
  return true;
}

// ============================================
// TIMESHEET CRUD OPERATIONS
// ============================================

/**
 * XÓA BẢN GHI TIMESHEET AN TOÀN (VĨNH VIỄN, CHỐNG TỰ HỒI SINH TỪ CLOUD)
 * @param {string} idOrKey - ID hoặc Composite Key của timesheet
 * @returns {boolean} True nếu xóa thành công
 */
export function deleteTimesheet(idOrKey) {
  if (!idOrKey) return false;
  
  const curTimesheets = state.timesheets || [];
  const targetTs = curTimesheets.find(t => {
    if (t.id === idOrKey) return true;
    const cKey = `${t.userId}_${t.projectId}_${t.taskId || ''}_${t.dateString || t.date}_${!!t.isActual}`;
    return cKey === idOrKey;
  });

  // Gom tất cả các key đại diện cho bản ghi này vào tombstone
  const tombstoneKeys = [idOrKey];
  if (targetTs) {
    if (targetTs.id) tombstoneKeys.push(targetTs.id);
    const cKey = `${targetTs.userId}_${targetTs.projectId}_${targetTs.taskId || ''}_${targetTs.dateString || targetTs.date}_${!!targetTs.isActual}`;
    tombstoneKeys.push(cKey);
    const dStr = targetTs.dateString || targetTs.date;
    if (targetTs.taskId && dStr) {
      tombstoneKeys.push(`ts-${targetTs.isActual ? 'act' : 'plan'}-${targetTs.taskId}-${dStr}`);
    }
  }

  // 1. Cập nhật danh sách tombstone (deletedTimesheetIds)
  const deletedSet = new Set([...(state.deletedTimesheetIds || []), ...tombstoneKeys]);
  state.deletedTimesheetIds = Array.from(deletedSet);
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem('bimTransPM_DeletedTimesheets', JSON.stringify(state.deletedTimesheetIds));
    } catch(e) {}
  }

  // 2. Lọc bỏ khỏi state.timesheets
  const updatedTs = curTimesheets.filter(t => {
    if (tombstoneKeys.includes(t.id)) return false;
    const cKey = `${t.userId}_${t.projectId}_${t.taskId || ''}_${t.dateString || t.date}_${!!t.isActual}`;
    if (tombstoneKeys.includes(cKey)) return false;
    return true;
  });
  state.timesheets = updatedTs;

  // 3. Xóa đồng bộ trong dailyHours_actual / dailyHours_planned trên task của project
  if (targetTs && targetTs.projectId) {
    const dStr = targetTs.dateString || targetTs.date;
    const isActual = targetTs.isActual !== false;
    let anyProjectUpdated = false;

    const updatedProjects = (state.projects || []).map(p => {
      if (p.id === targetTs.projectId && p.tasks) {
        let taskModified = false;
        const newTasks = p.tasks.map(tsk => {
          const matchTask = tsk.id === targetTs.taskId || tsk.name === targetTs.taskName;
          if (matchTask) {
            if (isActual && tsk.dailyHours_actual && tsk.dailyHours_actual[dStr] !== undefined) {
              const newActual = { ...tsk.dailyHours_actual };
              delete newActual[dStr];
              taskModified = true;
              return { ...tsk, dailyHours_actual: newActual };
            } else if (!isActual && tsk.dailyHours_planned && tsk.dailyHours_planned[dStr] !== undefined) {
              const newPlanned = { ...tsk.dailyHours_planned };
              delete newPlanned[dStr];
              taskModified = true;
              return { ...tsk, dailyHours_planned: newPlanned };
            }
          }
          return tsk;
        });
        if (taskModified) {
          anyProjectUpdated = true;
          return { ...p, tasks: newTasks };
        }
      }
      return p;
    });

    if (anyProjectUpdated) {
      state.projects = updatedProjects;
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          localStorage.setItem('bim_transpm_projects', JSON.stringify(updatedProjects));
        } catch(e) {}
      }
    }
  }

  // 4. Lưu local state & tạo snapshot phục hồi
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem('bimTransPM_State', JSON.stringify(state));
    } catch(e) {}
  }
  saveLocalSnapshot(`Xóa bản ghi giờ làm (${targetTs?.hours || 0}h)`);

  // 5. Thông báo subscribers & ghi nhật ký
  listeners.forEach(fn => fn('timesheets', state.timesheets, { ...state }));
  if (targetTs) {
    addActivityLog(`xóa bản ghi ${targetTs.hours}h ngày ${targetTs.dateString || targetTs.date}`, targetTs.projectName || '');
  }

  // 6. Đồng bộ ngay lên Firestore
  syncToFirestore();

  console.log(`🗑️ Đã xóa timesheet vĩnh viễn: ${idOrKey}`);
  return true;
}

/**
 * Add an entry to the activity log
 */
export function addActivityLog(action, project = '') {
  const userName = state.currentUserAuth?.name || state.currentUserAuth?.email?.split('@')[0] || 'Hệ thống';
  const now = new Date();
  const time = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' — Hôm nay';
  const newLog = {
    id: `log-${Date.now()}`,
    user: userName,
    email: state.currentUserAuth?.email || 'system',
    action,
    project,
    time,
    timestamp: Date.now(),
    dotColor: 'var(--accent-primary)'
  };

  const activityLog = [newLog, ...state.activityLog].slice(0, 50); // Keep last 50
  setState('activityLog', activityLog);
}

// ============================================
// DATA PERSISTENCE & HISTORY (Undo/Redo)
// ============================================

const STORAGE_KEY = 'bim_transpm_projects';
let historyStack = [];

/**
 * Save projects to localStorage
 */
function saveToLocalStorage(projects) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (e) {
    console.error('Lỗi khi lưu vào localStorage:', e);
  }
}

/**
 * Push current projects state to history stack
 */
function pushToHistory(projects) {
  // Deep clone to avoid reference issues
  const snapshot = JSON.parse(JSON.stringify(projects));
  historyStack.push(snapshot);
  // Keep only last 20 actions
  if (historyStack.length > 20) {
    historyStack.shift();
  }
}

/**
 * Undo the last action
 */
export function undoLastAction() {
  if (historyStack.length <= 1) return false; // Not enough history

  // Pop current state
  historyStack.pop(); 
  
  // Get previous state
  const previousState = historyStack[historyStack.length - 1];
  
  // Clone to avoid reference mutations
  const restoredProjects = JSON.parse(JSON.stringify(previousState));
  
  // Update state without triggering history push
  state.projects = restoredProjects;
  saveToLocalStorage(restoredProjects);
  
  listeners.forEach(fn => fn('projects', restoredProjects, { ...state }));
  addActivityLog('Hệ thống', 'đã hoàn tác hành động vừa rồi');
  
  return true;
}

/**
 * Check for overdue RFIs and generate notifications
 */
export function checkOverdueItems() {
  const newNotifs = [];
  const today = new Date();
  
  state.projects.forEach(p => {
    (p.rfis || []).forEach(rfi => {
      if (rfi.status !== 'Closed' && rfi.status !== 'Answered') {
        const dueDate = new Date(rfi.dueDate);
        if (dueDate < today && rfi.status !== 'Overdue') {
          // Auto-escalate to Overdue
          rfi.status = 'Overdue';
          newNotifs.push({
            id: `notif-${Date.now()}-${Math.random()}`,
            type: 'error',
            title: `Cảnh báo: RFI trễ hạn`,
            message: `RFI "${rfi.title}" thuộc dự án ${p.name} đã trễ hạn. Người phụ trách: ${rfi.assignee || 'Chưa gán'}`
          });
        }
      }
    });
  });

  // Check expiring software licenses (within 30 days)
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(today.getDate() + 30);
  
  (state.softwareAssets || []).forEach(sw => {
    const expDate = new Date(sw.expiryDate);
    if (expDate > today && expDate <= thirtyDaysFromNow && !sw.alerted) {
      sw.alerted = true; // prevent duplicate alerts
      const daysLeft = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
      newNotifs.push({
        id: `notif-sw-${sw.id || Math.random()}`,
        type: 'warning',
        title: `Sắp hết hạn bản quyền`,
        message: `Phần mềm ${sw.name} sẽ hết hạn trong ${daysLeft} ngày nữa (${expDate.toLocaleDateString('vi-VN')}).`
      });
    }
  });

  if (newNotifs.length > 0) {
    state.notifications = [...newNotifs, ...state.notifications].slice(0, 50); // Keep max 50
    // Force a re-render/notify
    listeners.forEach(fn => fn('notifications', state.notifications, { ...state }));
  }
}

// ============================================
// INITIAL DATA LOADING
// ============================================

/**
 * Load initial data into state
 */
export async function loadInitialData() {
  try {
    const [projectsMod, resourcesMod, qualityMod] = await Promise.all([
      import('./data/projects.js'),
      import('./data/resources.js'),
      import('./data/quality.js')
    ]);

    const defaultProjects = projectsMod.projectItems;
    
    if (db) {
      console.log("⏳ Đang kết nối Real-time với Firestore...");
      onSnapshot(doc(db, "app_data", "main"), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          
          let projectsToLoad = data.projects || [];

          // ─── PHỤC HỒI (1): Khôi phục từ localStorage nếu Firestore trống ───
          if (projectsToLoad.length === 0 && typeof window !== 'undefined' && window.localStorage) {
            try {
              const localProjStr = localStorage.getItem('bim_transpm_projects');
              if (localProjStr) {
                const localProj = JSON.parse(localProjStr);
                if (localProj && localProj.length > 0) {
                  projectsToLoad = localProj;
                }
              }
            } catch(err) {}
          }

          // ─── PHỤC HỒI (2): Xử lý trùng tên lỗi do sao chép (như P006 và P007 cùng tên QL15D) ───
          const seenNames = new Map();
          const duplicatedIds = new Set();
          projectsToLoad.forEach(p => {
            if (seenNames.has(p.name)) {
              duplicatedIds.add(p.id);
            } else {
              seenNames.set(p.name, p);
            }
          });
          if (duplicatedIds.size > 0) {
            projectsToLoad = projectsToLoad.filter(p => !duplicatedIds.has(p.id));
            duplicatedIds.forEach(dupId => {
              const defaultVersion = defaultProjects.find(p => p.id === dupId);
              if (defaultVersion) {
                projectsToLoad.push(defaultVersion);
              }
            });
          }

          // ─── PHỤC HỒI (3): Bổ sung các dự án bị thiếu ───
          const currentIds = new Set(projectsToLoad.map(p => p.id));
          const missingDefaults = defaultProjects.filter(p => !currentIds.has(p.id));
          if (missingDefaults.length > 0) {
            projectsToLoad = [...projectsToLoad, ...missingDefaults];
          }

          // Xóa duplicate theo ID
          const seenIds = new Set();
          projectsToLoad = projectsToLoad.filter(p => {
            if (seenIds.has(p.id)) return false;
            seenIds.add(p.id);
            return true;
          });

          // Sắp xếp theo ID
          projectsToLoad.sort((a, b) => a.id.localeCompare(b.id));

          // Bảo đảm dự án 14D luôn có đầy đủ ma trận tiến độ (Milestones & Phân đoạn chi tiết), Team & Tasks
          const p14dIdx = projectsToLoad.findIndex(p => p.id === 'P007' || p.code === '14D' || (p.name && p.name.includes('14D')));
          const default14D = defaultProjects.find(p => p.id === 'P007');
          if (p14dIdx >= 0 && default14D) {
            const cur = projectsToLoad[p14dIdx];
            if (!cur.milestones || cur.milestones.length === 0) {
              cur.milestones = JSON.parse(JSON.stringify(default14D.milestones || []));
            }
            if (!cur.segments || cur.segments.length === 0 || !cur.segments[0].subSegments || cur.segments[0].subSegments.length === 0) {
              cur.segments = JSON.parse(JSON.stringify(default14D.segments || []));
            }
            if (!cur.team || cur.team.length === 0) {
              cur.team = JSON.parse(JSON.stringify(default14D.team || []));
            } else {
              if (!cur.team.some(m => m.name === 'Thân Nguyễn Thái Thiện')) {
                cur.team.unshift({ name: 'Thân Nguyễn Thái Thiện', role: 'BIM Modeler' });
              }
              if (!cur.team.some(m => m.name === 'Nguyễn Ngọc Thanh Tài')) {
                cur.team.unshift({ name: 'Nguyễn Ngọc Thanh Tài', role: 'BIM Modeler' });
              }
            }
            // Chỉ nạp tasks mẫu cho 14D nếu chưa từng có danh sách tasks (không ép thêm lại task người dùng đã xóa)
            if (cur.tasks === undefined) {
              cur.tasks = JSON.parse(JSON.stringify(default14D.tasks || []));
            }
          }

          let loadedPersonnel = (data.personnel && data.personnel.length > 0) ? data.personnel : resourcesMod.personnelItems;
          
          // Dọn sạch hoàn toàn các mock user cũ (R001-R012)
          const mockEmailsToRemove = new Set([
            'khoa.tran@bimvn.com', 'hoa.le@bimvn.com', 'hung.pham@bimvn.com',
            'mai.nguyen@bimvn.com', 'nam.hoang@bimvn.com', 'tung.le@bimvn.com',
            'lan.dang@bimvn.com', 'ha.bui@bimvn.com', 'long.vu@bimvn.com',
            'bao.trinh@bimvn.com', 'yen.phan@bimvn.com'
          ]);
          loadedPersonnel = loadedPersonnel.filter(p => !mockEmailsToRemove.has(p.email) && !/^R\d{3}$/.test(p.id));

          // Đảm bảo toàn bộ 6 tài khoản Firebase Auth thật luôn hiện diện đầy đủ
          resourcesMod.personnelItems.forEach(realUser => {
            const existingIdx = loadedPersonnel.findIndex(p => 
              (p.email && p.email.toLowerCase() === realUser.email.toLowerCase()) || 
              (p.name && p.name === realUser.name)
            );
            if (existingIdx >= 0) {
              loadedPersonnel[existingIdx] = {
                ...realUser,
                ...loadedPersonnel[existingIdx],
                email: realUser.email,
                secondaryEmails: realUser.secondaryEmails || []
              };
            } else {
              loadedPersonnel.push(realUser);
            }
          });

          setState('projects', projectsToLoad.length > 0 ? projectsToLoad : defaultProjects, true);
          setState('personnel', loadedPersonnel, true);
          setState('softwareAssets', data.softwareAssets || resourcesMod.softwareAssets, true);
          setState('hardwareAssets', data.hardwareAssets || resourcesMod.hardwareAssets, true);
          setState('activityLog', data.activityLog || resourcesMod.activityLog, true);

          // ─── PHỤC HỒI (4): Timesheets — lấy từ Firestore, localStorage hoặc sinh từ planned/actual ───
          let deletedIds = new Set([
            ...(state.deletedTimesheetIds || []),
            ...(data.deletedTimesheetIds || [])
          ]);
          try {
            const localDelStr = localStorage.getItem('bimTransPM_DeletedTimesheets');
            if (localDelStr) {
              const parsedLocalDel = JSON.parse(localDelStr);
              if (Array.isArray(parsedLocalDel)) {
                parsedLocalDel.forEach(id => deletedIds.add(id));
              }
            }
          } catch(e) {}
          state.deletedTimesheetIds = Array.from(deletedIds);

          const isTsDeleted = (ts) => {
            if (!ts) return true;
            const key = ts.id || `${ts.userId}_${ts.projectId}_${ts.taskId || ''}_${ts.dateString || ts.date}_${!!ts.isActual}`;
            return deletedIds.has(ts.id) || deletedIds.has(key);
          };

          let timesheetsToLoad = (data.timesheets || []).filter(ts => !isTsDeleted(ts));
          if (timesheetsToLoad.length === 0 && typeof window !== 'undefined' && window.localStorage) {
            try {
              const localStateStr = localStorage.getItem('bimTransPM_State');
              if (localStateStr) {
                const localState = JSON.parse(localStateStr);
                if (localState.timesheets && localState.timesheets.length > 0) {
                  timesheetsToLoad = localState.timesheets.filter(ts => !isTsDeleted(ts));
                }
              }
            } catch(err) {}
          }

          // Helper tra cứu định danh chuẩn cho nhân sự thật của hệ thống
          const getCanonicalUserInfo = (val) => {
            const s = (val || '').toLowerCase().trim();
            if (s.includes('thiện') || s.includes('thienthan') || s.includes('thien.than') || s === 'u_thien') {
              return { uid: 'u_thien', name: 'Thân Nguyễn Thái Thiện', email: 'thienthannguyenthai@gmail.com' };
            }
            if (s.includes('tài') || s.includes('tainguyen') || s.includes('tai.nguyen') || s === 'u_tai') {
              return { uid: 'u_tai', name: 'Nguyễn Ngọc Thanh Tài', email: 'tainguyen6628@gmail.com' };
            }
            if (s.includes('thuận') || s.includes('minhthuan') || s === 'u_thuan') {
              return { uid: 'u_thuan', name: 'Minh Thuận', email: 'minhthuan.uah@gmail.com' };
            }
            if (s.includes('an') || s.includes('an.nguyen') || s === 'u_an') {
              return { uid: 'u_an', name: 'Nguyễn Văn An', email: 'an.nguyen@bimvn.com' };
            }
            if (s.includes('nhật') || s.includes('nhatte') || s.includes('admin@vsibim.com') || s === 'u_nhat' || s === 'u_admin') {
              return { uid: 'u_nhat', name: 'Nguyễn Thanh Nhật', email: 'nhattedisouth@gmail.com' };
            }
            const p = loadedPersonnel.find(x => x.name === val || x.email === val || x.id === val);
            return { uid: p?.id || val || 'unknown', name: p?.name || val || 'Nhân viên', email: p?.email || '' };
          };

          // Tự động bổ sung giờ làm của Modeler từ tasks trên TẤT CẢ các dự án
          const allProjectsToScan = [...projectsToLoad];
          if (default14D && !allProjectsToScan.some(p => p.id === default14D.id)) {
            allProjectsToScan.push(default14D);
          }

          allProjectsToScan.forEach(proj => {
            (proj.tasks || []).forEach(task => {
              const taskId = task.id;
              const taskAssignee = task.assignee || 'Thân Nguyễn Thái Thiện';
              const canonical = getCanonicalUserInfo(taskAssignee);
              const uid = canonical.uid;
              const email = canonical.email;
              const userName = canonical.name;
              
              if (task.dailyHours_planned && typeof task.dailyHours_planned === 'object') {
                Object.entries(task.dailyHours_planned).forEach(([dStr, hrs]) => {
                  const hNum = Number(hrs);
                  const planId = `ts-plan-${taskId}-${dStr}`;
                  const planKey = `${uid}_${proj.id}_${taskId}_${dStr}_false`;
                  if (hNum > 0 && !deletedIds.has(planId) && !deletedIds.has(planKey) && !timesheetsToLoad.some(ts => ts.taskId === taskId && ts.dateString === dStr && !ts.isActual)) {
                    timesheetsToLoad.push({
                      id: planId,
                      userId: uid,
                      userName: userName,
                      email: email,
                      projectId: proj.id,
                      projectName: proj.name,
                      taskId: taskId,
                      taskName: task.name,
                      dateString: dStr,
                      date: dStr,
                      hours: hNum,
                      isActual: false,
                      isOT: false,
                      comment: `Kế hoạch ${task.name}`
                    });
                  }
                });
              }

              if (task.dailyHours_actual && typeof task.dailyHours_actual === 'object') {
                Object.entries(task.dailyHours_actual).forEach(([dStr, hrs]) => {
                  const hNum = Number(hrs);
                  const actId = `ts-act-${taskId}-${dStr}`;
                  const actKey = `${uid}_${proj.id}_${taskId}_${dStr}_true`;
                  if (hNum > 0 && !deletedIds.has(actId) && !deletedIds.has(actKey) && !timesheetsToLoad.some(ts => ts.taskId === taskId && ts.dateString === dStr && ts.isActual)) {
                    timesheetsToLoad.push({
                      id: actId,
                      userId: uid,
                      userName: userName,
                      email: email,
                      projectId: proj.id,
                      projectName: proj.name,
                      taskId: taskId,
                      taskName: task.name,
                      dateString: dStr,
                      date: dStr,
                      hours: hNum,
                      isActual: true,
                      isOT: false,
                      comment: `Thực tế ${task.name}`
                    });
                  }
                });
              }
            });
          });

          // Bảo vệ các bản ghi thực tế của thành viên (10 bản ghi vàng từ dự án 14D)
          if (memberTimesheetsSeed && Array.isArray(memberTimesheetsSeed)) {
            memberTimesheetsSeed.forEach(seedTs => {
              if (!isTsDeleted(seedTs)) {
                const exists = timesheetsToLoad.some(t => 
                  t.id === seedTs.id || 
                  ((t.dateString === seedTs.dateString || t.date === seedTs.date) && 
                   (t.taskId === seedTs.taskId || t.note === seedTs.note || t.comment === seedTs.comment) && 
                   t.isActual === seedTs.isActual)
                );
                if (!exists) {
                  timesheetsToLoad.push({ ...seedTs });
                }
              }
            });
          }

          // Chuẩn hóa toàn bộ timesheets về định danh nhất quán (canonical)
          timesheetsToLoad = timesheetsToLoad.map(ts => {
            const canonical = getCanonicalUserInfo(ts.email || ts.userName || ts.userId);
            return {
              ...ts,
              userId: canonical.uid,
              userName: canonical.name,
              email: canonical.email,
              isActual: Boolean(ts.isActual === true || ts.isActual === 'true' || ts.isActual === 1)
            };
          });

          setState('timesheets', timesheetsToLoad, true);
          console.log("🔄 Dữ liệu Firestore đã kết nối real-time");

          // Phục hồi từ Google Sheets chỉ chạy thủ công khi người dùng bấm nút trên Topbar, không tự động đè lại thao tác xóa
          
          if (typeof window !== 'undefined') {
            const isLocalWrite = docSnap.metadata && docSnap.metadata.hasPendingWrites;
            const isEditing = document.activeElement && ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName);
            
            if (!isLocalWrite && !isEditing) {
              window.dispatchEvent(new Event('hashchange'));
            }
            saveLocalSnapshot('Tải dữ liệu Cloud thành công');
          }
        } else {
          // Khởi tạo lần đầu
          setState('projects', defaultProjects, true);
          setState('personnel', resourcesMod.personnelItems, true);
          setState('softwareAssets', resourcesMod.softwareAssets, true);
          setState('hardwareAssets', resourcesMod.hardwareAssets, true);
          setState('activityLog', resourcesMod.activityLog, true);
          setState('timesheets', [], true);
          syncToFirestore(); // seed
        }
        
        // --- BẢO ĐẢM USER ĐĂNG NHẬP LUÔN CÓ TRONG NGUỒN LỰC ---
        // (Chạy độc lập để luôn đảm bảo tài khoản không bị lọt lưới)
        const currentUser = getState().currentUserAuth;
        if (currentUser) {
           const pList = getState().personnel;
           if (!pList.find(p => p.email === currentUser.email)) {
              const updatedPersonnel = [...pList, {
                 id: `p-${Date.now()}`,
                 name: currentUser.name,
                 email: currentUser.email,
                 avatar: '👤',
                 role: currentUser.email === 'admin@vsibim.com' ? 'BIM Manager' : 'Member',
                 level: 'New',
                 skills: [],
                 allocation: [],
                 totalAllocation: 0
              }];
              // BUG FIX: Dùng fromCloud=true để KHÔNG kích hoạt syncToFirestore ngay
              // tại đây vì projects chưa được ghi vào state xong — tránh ghi đè
              // Firestore với mảng projects rỗng gây mất toàn bộ dữ liệu dự án.
              // Thay vào đó, dùng setTimeout để sync sau khi state đã ổn định.
              setState('personnel', updatedPersonnel, true);
              setTimeout(() => syncToFirestore(), 3000); // Sync sau 3 giây khi dữ liệu đã sẵn sàng
           }
        }
        // ------------------------------------------------------
      }, (error) => {
         console.error("Lỗi onSnapshot:", error);
         if (error.code === 'permission-denied') {
            alert("LỖI BẢO MẬT FIREBASE: Bạn chưa thiết lập Rules cho phép đọc/ghi dữ liệu!\nVui lòng vào tab Rules trên Firebase Console và đổi thành 'allow read, write: if request.auth != null;'");
         }
         // Fallback load data locally so UI doesn't stay empty
         setState('projects', defaultProjects, true);
         setState('personnel', resourcesMod.personnelItems, true);
         setState('softwareAssets', resourcesMod.softwareAssets, true);
         setState('hardwareAssets', resourcesMod.hardwareAssets, true);
         setState('activityLog', resourcesMod.activityLog, true);
         setState('timesheets', [], true);
      });
    } else {
      setState('projects', defaultProjects, true);
    }

    setState('qualityData', qualityMod.qualityData);
    pushToHistory(getState().projects);
    checkOverdueItems();
    console.log('✅ BIM PM data loaded successfully');
  } catch (e) {
    console.error('❌ Error loading data:', e);
  }
}
