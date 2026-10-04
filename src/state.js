// ============================================
// STATE MANAGEMENT — BIM Transport PM Platform
// ============================================

const listeners = new Set();

let state = {
  currentPage: 'dashboard',
  projects: [],
  personnel: [],
  softwareAssets: [],
  hardwareAssets: [],
  activityLog: [],
  timesheets: [],
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
    // Default admin account
    { id: 'u-1', name: 'Admin', email: 'admin@vsibim.com', password: '123', role: 'BIM Manager' }
  ]
};

// Khôi phục state từ localStorage nếu có
const savedState = localStorage.getItem('bimTransPM_State');
if (savedState) {
  try {
    const parsed = JSON.parse(savedState);
    state = { ...state, ...parsed };
    
    // Auto-add new widgets to legacy saved layouts
    if (!state.dashboardLayout.includes('analytics')) {
      state.dashboardLayout.splice(2, 0, 'analytics');
      state.widgetSpans.analytics = 3;
    }
    
    // Ensure default admin exists
    if (!state.registeredUsers || state.registeredUsers.length === 0) {
      state.registeredUsers = [{ id: 'u-1', name: 'Admin', email: 'admin@vsibim.com', password: '123', role: 'BIM Manager' }];
    }
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
function syncToFirestore() {
  if (!db) return;
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    try {
      // TỰ ĐỘNG ĐỒNG BỘ DỮ LIỆU LIÊN KẾT (Single Source of Truth)
      if (state.projects) {
        state.projects.forEach(proj => {
          // 1. Đồng bộ tiến độ dự án từ các tasks
          if (proj.tasks && proj.tasks.length > 0) {
             const totalProgress = proj.tasks.reduce((sum, t) => sum + (t.progress || 0), 0);
             proj.progress = Math.round(totalProgress / proj.tasks.length);
          }
        });
      }

      if (state.projects && state.personnel) {
        state.personnel.forEach(person => {
          // 2. Đồng bộ nguồn lực (allocation) từ danh sách thành viên dự án
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
                 percentage: oldAllocMap[proj.id] || 30 // Mặc định 30% nếu mới gán
               });
            }
          });
          
          person.allocation = newAllocation;
          person.totalAllocation = newAllocation.reduce((sum, a) => sum + a.percentage, 0);
          person.status = person.totalAllocation > 100 ? 'overloaded' : (person.totalAllocation > 0 ? 'active' : 'idle');
        });
      }

      const dataToSave = JSON.parse(JSON.stringify({
        projects: state.projects || [],
        personnel: state.personnel || [],
        softwareAssets: state.softwareAssets || [],
        hardwareAssets: state.hardwareAssets || [],
        activityLog: state.activityLog || [],
        timesheets: state.timesheets || [],
        lastUpdated: new Date().toISOString()
      }));
      await setDoc(doc(db, "app_data", "main"), dataToSave);
      console.log("✅ Đồng bộ Firestore thành công");
    } catch (e) {
      console.error("❌ Lỗi đồng bộ Firestore:", e);
    }
  }, 1000);
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
  
  const person = state.personnel.find(p => p.email === authUser.email);
  let role = person ? person.role : 'Member'; // Mặc định là Member
  let allocation = person ? (person.allocation || []) : [];
  
  // Hardcode admin default account to prevent lockout
  if (authUser.email === 'admin@vsibim.com') {
    role = 'BIM Manager';
  }

  // Prevent infinite loop if already set to same values (shallow check)
  if (!state.currentUser || state.currentUser.role !== role || state.currentUser.allocation?.length !== allocation.length) {
    setState('currentUser', {
      ...authUser,
      role: role,
      personnelRecord: person || null,
      allocation: allocation
    });
    setState('currentUserRole', role);
    
    // Apply UI Restrictions
    if (typeof document !== 'undefined') {
      if (role !== 'BIM Manager') {
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
        const authUser = { 
          id: user.uid, 
          name: user.displayName || user.email.split('@')[0], 
          email: user.email 
        };
        setState('currentUserAuth', authUser);
        
        // Auto-sync to personnel list (Google Sheets)
        const personnel = state.personnel || [];
        if (!personnel.find(p => p.email === user.email)) {
          personnel.unshift({
            id: `p-${Date.now()}`,
            name: authUser.name,
            email: user.email,
            avatar: '👤',
            role: user.email === 'admin@vsibim.com' ? 'BIM Manager' : 'Member',
            level: 'New',
            skills: [],
            allocation: [],
            totalAllocation: 0
          });
          setState('personnel', personnel);
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
      startDate: phaseStart.toISOString().split('T')[0],
      endDate: phaseEnd.toISOString().split('T')[0]
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
    segments: [],
    phases: generateDefaultPhases(projectData.startDate, projectData.endDate),
    tasks: []
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
          setState('projects', data.projects || [], true);
          setState('personnel', data.personnel || [], true);
          setState('softwareAssets', data.softwareAssets || resourcesMod.softwareAssets, true);
          setState('hardwareAssets', data.hardwareAssets || resourcesMod.hardwareAssets, true);
          setState('activityLog', data.activityLog || resourcesMod.activityLog, true);
          setState('timesheets', data.timesheets || [], true);
          console.log("🔄 Dữ liệu Firestore đã cập nhật real-time");
          
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('hashchange'));
          }
        } else {
          // Khởi tạo lần đầu
          setState('projects', defaultProjects, true);
          setState('personnel', [], true);
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
              // Gọi setState không có 'true' để kích hoạt syncToFirestore
              setState('personnel', updatedPersonnel);
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
         setState('personnel', [], true);
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
