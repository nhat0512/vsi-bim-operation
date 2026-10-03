// ============================================
// CONSTANTS — BIM Transport Infrastructure
// ============================================

export const PROJECT_TYPES = {
  road: { label: 'Đường bộ', icon: '🛣️', color: 'blue' },
  bridge: { label: 'Cầu', icon: '🌉', color: 'green' },
  tunnel: { label: 'Hầm', icon: '🚇', color: 'purple' },
  interchange: { label: 'Nút giao', icon: '🔀', color: 'orange' },
  drainage: { label: 'Thoát nước', icon: '💧', color: 'cyan' },
  lighting: { label: 'Chiếu sáng', icon: '💡', color: 'yellow' }
};

export const PROJECT_STATUSES = {
  planning: { label: 'Lập kế hoạch', class: 'planning' },
  active: { label: 'Đang triển khai', class: 'active' },
  'on-hold': { label: 'Tạm dừng', class: 'on-hold' },
  completed: { label: 'Hoàn thành', class: 'completed' },
  overdue: { label: 'Quá hạn', class: 'overdue' }
};

export const BIM_PHASES = [
  { id: 'survey', label: 'Khảo sát', icon: '📐', order: 1 },
  { id: 'preliminary', label: 'TK Sơ bộ', icon: '📋', order: 2 },
  { id: 'technical', label: 'TKKT', icon: '📝', order: 3 },
  { id: 'detailed', label: 'TKBVTC', icon: '🏗️', order: 4 },
  { id: 'construction', label: 'Thi công', icon: '🔨', order: 5 },
  { id: 'handover', label: 'Nghiệm thu', icon: '✅', order: 6 }
];

export const LOD_LEVELS = [
  { level: 100, label: 'LOD 100', desc: 'Conceptual', color: '#64748b' },
  { level: 200, label: 'LOD 200', desc: 'Approximate', color: '#3b82f6' },
  { level: 300, label: 'LOD 300', desc: 'Precise', color: '#10b981' },
  { level: 350, label: 'LOD 350', desc: 'Construction', color: '#f59e0b' },
  { level: 400, label: 'LOD 400', desc: 'Fabrication', color: '#8b5cf6' },
  { level: 500, label: 'LOD 500', desc: 'As-built', color: '#ef4444' }
];

export const DISCIPLINES = [
  { id: 'road', label: 'Đường', icon: '🛣️' },
  { id: 'bridge', label: 'Cầu', icon: '🌉' },
  { id: 'tunnel', label: 'Hầm', icon: '🚇' },
  { id: 'drainage', label: 'Thoát nước', icon: '💧' },
  { id: 'lighting', label: 'Chiếu sáng', icon: '💡' },
  { id: 'traffic', label: 'Tín hiệu GT', icon: '🚦' },
  { id: 'landscape', label: 'Cảnh quan', icon: '🌳' },
  { id: 'geotechnical', label: 'Địa kỹ thuật', icon: '🪨' }
];

export const RESOURCE_TYPES = {
  personnel: { label: 'Nhân sự', icon: '👤' },
  software: { label: 'Phần mềm', icon: '💻' },
  hardware: { label: 'Thiết bị', icon: '🖥️' },
  license: { label: 'License', icon: '🔑' }
};

export const ROLES = [
  { id: 'bim-manager', label: 'BIM Manager', level: 'senior' },
  { id: 'bim-coordinator', label: 'BIM Coordinator', level: 'mid' },
  { id: 'bim-modeler', label: 'BIM Modeler', level: 'mid' },
  { id: 'cad-technician', label: 'CAD Technician', level: 'junior' },
  { id: 'surveyor', label: 'Khảo sát viên', level: 'mid' },
  { id: 'qaqc', label: 'QA/QC Engineer', level: 'mid' },
  { id: 'project-manager', label: 'Project Manager', level: 'senior' },
  { id: 'design-engineer', label: 'Design Engineer', level: 'mid' }
];

export const SOFTWARE_LIST = [
  { id: 'revit', name: 'Autodesk Revit', type: 'Modeling' },
  { id: 'civil3d', name: 'AutoCAD Civil 3D', type: 'Civil' },
  { id: 'navisworks', name: 'Navisworks Manage', type: 'Coordination' },
  { id: 'infraworks', name: 'InfraWorks', type: 'Conceptual' },
  { id: 'openroads', name: 'OpenRoads Designer', type: 'Road Design' },
  { id: 'dynamo', name: 'Dynamo', type: 'Automation' },
  { id: 'bim360', name: 'BIM 360 / ACC', type: 'CDE' },
  { id: 'recap', name: 'ReCap Pro', type: 'Point Cloud' }
];

export const MONTHS_VI = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
  'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
  'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
];

export const PRIORITY_LEVELS = {
  critical: { label: 'Rất cao', color: 'var(--accent-danger)', icon: '🔴' },
  high: { label: 'Cao', color: 'var(--accent-warning)', icon: '🟠' },
  medium: { label: 'Trung bình', color: 'var(--accent-primary)', icon: '🔵' },
  low: { label: 'Thấp', color: 'var(--accent-secondary)', icon: '🟢' }
};
