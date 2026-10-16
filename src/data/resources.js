// ============================================
// RESOURCES — Real Personnel (Synced with Firebase Auth), Software, Hardware
// ============================================

export const personnelItems = [
  {
    id: 'u_admin',
    name: 'Nguyễn Thanh Nhật',
    role: 'BIM Manager',
    roleId: 'bim-manager',
    level: 'senior',
    email: 'admin@vsibim.com',
    secondaryEmails: ['nhattedisouth@gmail.com'],
    phone: '0901-888-999',
    avatar: 'NTN',
    skills: ['Revit', 'Civil 3D', 'Navisworks', 'Quản lý dự án BIM', 'BIM 360 / ACC'],
    certifications: ['Autodesk Certified Professional', 'BIM Manager Certificate'],
    allocation: [
      { projectId: 'P001', projectName: 'QL1A HCM-Long Thành', percentage: 25 },
      { projectId: 'P007', projectName: 'Theo dõi tiến độ bản vẽ 14D', percentage: 25 }
    ],
    totalAllocation: 50,
    status: 'active',
    joinDate: '2020-01-01'
  },
  {
    id: 'u_nhat',
    name: 'Nguyễn Thanh Nhật (PM)',
    role: 'Project Manager',
    roleId: 'project-manager',
    level: 'senior',
    email: 'nhattedisouth@gmail.com',
    secondaryEmails: ['admin@vsibim.com'],
    phone: '0901-888-999',
    avatar: 'NTN',
    skills: ['MS Project', 'Power BI', 'Civil 3D', 'Quản trị tiến độ & chi phí (EVM)'],
    certifications: ['PMP', 'BIM Coordinator Certificate'],
    allocation: [
      { projectId: 'P007', projectName: 'Theo dõi tiến độ bản vẽ 14D', percentage: 50 }
    ],
    totalAllocation: 50,
    status: 'active',
    joinDate: '2020-03-15'
  },
  {
    id: 'u_thien',
    name: 'Thân Nguyễn Thái Thiện',
    role: 'BIM Modeler',
    roleId: 'bim-modeler',
    level: 'mid',
    email: 'thienthannguyenthai@gmail.com',
    secondaryEmails: ['thien.than@vsibim.com'],
    phone: '0918-345-678',
    avatar: 'TNTT',
    skills: ['Civil 3D', 'InfraWorks', 'AutoCAD', 'San nền & Trắc dọc tuyến'],
    certifications: ['Autodesk Certified Professional'],
    allocation: [
      { projectId: 'P007', projectName: 'Theo dõi tiến độ bản vẽ 14D', percentage: 100 }
    ],
    totalAllocation: 100,
    status: 'active',
    joinDate: '2023-02-15'
  },
  {
    id: 'u_tai',
    name: 'Nguyễn Ngọc Thanh Tài',
    role: 'BIM Modeler',
    roleId: 'bim-modeler',
    level: 'mid',
    email: 'tainguyen6628@gmail.com',
    secondaryEmails: ['tai.nguyen@vsibim.com'],
    phone: '0928-456-789',
    avatar: 'NNTT',
    skills: ['Civil 3D', 'Revit Structure', 'Navisworks', 'Cầu & Kết cấu BTCT'],
    certifications: ['Autodesk Certified Professional'],
    allocation: [
      { projectId: 'P007', projectName: 'Theo dõi tiến độ bản vẽ 14D', percentage: 100 }
    ],
    totalAllocation: 100,
    status: 'active',
    joinDate: '2023-03-01'
  },
  {
    id: 'u_thuan',
    name: 'Minh Thuận',
    role: 'BIM Modeler',
    roleId: 'bim-modeler',
    level: 'mid',
    email: 'minhthuan.uah@gmail.com',
    phone: '0938-112-233',
    avatar: 'MT',
    skills: ['Revit Architecture', 'Civil 3D', 'AutoCAD', 'Hạ tầng kỹ thuật'],
    certifications: ['Autodesk Certified Associate'],
    allocation: [
      { projectId: 'P007', projectName: 'Theo dõi tiến độ bản vẽ 14D', percentage: 100 }
    ],
    totalAllocation: 100,
    status: 'active',
    joinDate: '2023-05-10'
  },
  {
    id: 'u_an',
    name: 'Nguyễn Văn An',
    role: 'BIM Coordinator',
    roleId: 'bim-coordinator',
    level: 'senior',
    email: 'an.nguyen@bimvn.com',
    phone: '0901-234-567',
    avatar: 'NVA',
    skills: ['Revit', 'Civil 3D', 'Navisworks', 'QA/QC Clash Detection', 'Dynamo'],
    certifications: ['Autodesk Certified Professional', 'buildingSMART openBIM'],
    allocation: [
      { projectId: 'P001', projectName: 'QL1A HCM-Long Thành', percentage: 50 },
      { projectId: 'P007', projectName: 'Theo dõi tiến độ bản vẽ 14D', percentage: 50 }
    ],
    totalAllocation: 100,
    status: 'active',
    joinDate: '2021-06-01'
  }
];

export const softwareAssets = [
  { id: 'SW001', name: 'Autodesk Revit 2025', type: 'Modeling', totalLicenses: 15, usedLicenses: 12, expiryDate: '2027-03-31', costPerYear: '$2,545' },
  { id: 'SW002', name: 'AutoCAD Civil 3D 2025', type: 'Civil', totalLicenses: 10, usedLicenses: 8, expiryDate: '2027-03-31', costPerYear: '$2,365' },
  { id: 'SW003', name: 'Navisworks Manage 2025', type: 'Coordination', totalLicenses: 5, usedLicenses: 4, expiryDate: '2027-03-31', costPerYear: '$2,810' },
  { id: 'SW004', name: 'InfraWorks 2025', type: 'Conceptual', totalLicenses: 3, usedLicenses: 2, expiryDate: '2027-03-31', costPerYear: '$2,545' },
  { id: 'SW005', name: 'OpenRoads Designer', type: 'Road Design', totalLicenses: 4, usedLicenses: 3, expiryDate: '2027-06-30', costPerYear: '$3,200' },
  { id: 'SW006', name: 'Autodesk BIM 360 / ACC', type: 'CDE', totalLicenses: 25, usedLicenses: 18, expiryDate: '2027-03-31', costPerYear: '$600' },
  { id: 'SW007', name: 'ReCap Pro', type: 'Point Cloud', totalLicenses: 3, usedLicenses: 2, expiryDate: '2027-03-31', costPerYear: '$455' },
  { id: 'SW008', name: 'Dynamo Studio', type: 'Automation', totalLicenses: 5, usedLicenses: 3, expiryDate: '2027-03-31', costPerYear: '$0 (bundled)' }
];

export const hardwareAssets = [
  { id: 'HW001', name: 'HP Z8 G5 Workstation', type: 'Workstation', quantity: 12, assigned: 10, specs: 'Xeon W-3445 / RTX A5000 / 128GB RAM', status: 'active' },
  { id: 'HW002', name: 'Dell Precision 7875', type: 'Workstation', quantity: 8, assigned: 7, specs: 'AMD EPYC / RTX 4090 / 128GB RAM', status: 'active' },
  { id: 'HW003', name: 'FARO Focus S350', type: '3D Scanner', quantity: 2, assigned: 2, specs: 'Range 350m / ±1mm accuracy', status: 'active' },
  { id: 'HW004', name: 'DJI Matrice 350 RTK', type: 'Drone', quantity: 2, assigned: 1, specs: 'Lidar L2 + P1 Camera', status: 'active' },
  { id: 'HW005', name: 'Leica TS16 Total Station', type: 'Survey', quantity: 3, assigned: 2, specs: '1" angular / AutoHeight', status: 'active' },
  { id: 'HW006', name: 'Dell PowerEdge R760', type: 'Server', quantity: 2, assigned: 2, specs: 'Xeon 8480+ / 512GB / 20TB NVMe', status: 'active' }
];

export const activityLog = [
  { id: 'A001', type: 'task', user: 'Thân Nguyễn Thái Thiện', action: 'cập nhật tiến độ phân đoạn Km0-Km5 lên 75%', project: 'Theo dõi tiến độ bản vẽ 14D', time: '15 phút trước', dotColor: 'var(--accent-secondary)' },
  { id: 'A002', type: 'model', user: 'Nguyễn Ngọc Thanh Tài', action: 'hoàn thành mô hình cầu đi thép & 16 cống', project: 'Theo dõi tiến độ bản vẽ 14D', time: '32 phút trước', dotColor: 'var(--accent-primary)' },
  { id: 'A003', type: 'clash', user: 'Nguyễn Văn An', action: 'kiểm tra xung đột mô hình hạ tầng & thoát nước', project: 'Theo dõi tiến độ bản vẽ 14D', time: '1 giờ trước', dotColor: 'var(--accent-warning)' },
  { id: 'A004', type: 'meeting', user: 'Nguyễn Thanh Nhật', action: 'phê duyệt mốc hoàn thành đợt 1', project: 'Theo dõi tiến độ bản vẽ 14D', time: '2 giờ trước', dotColor: 'var(--accent-purple)' },
  { id: 'A005', type: 'resource', user: 'Minh Thuận', action: 'nhận bàn giao phụ trách phân đoạn Km50-Km62', project: 'Theo dõi tiến độ bản vẽ 14D', time: '3 giờ trước', dotColor: 'var(--accent-cyan)' }
];
