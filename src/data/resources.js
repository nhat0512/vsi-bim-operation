// ============================================
// MOCK DATA — Resources (Personnel, Software, Hardware)
// ============================================

export const personnelItems = [
  {
    id: 'R001',
    name: 'Nguyễn Văn An',
    role: 'BIM Manager',
    roleId: 'bim-manager',
    level: 'senior',
    email: 'an.nguyen@bimvn.com',
    phone: '0901-234-567',
    avatar: 'NVA',
    skills: ['Revit', 'Civil 3D', 'Navisworks', 'BIM 360', 'Dynamo'],
    certifications: ['Autodesk Certified Professional', 'buildingSMART openBIM'],
    allocation: [
      { projectId: 'P001', projectName: 'QL1A HCM-Long Thành', percentage: 40 },
      { projectId: 'P005', projectName: 'Vành Đai 4', percentage: 50 }
    ],
    totalAllocation: 90,
    status: 'active',
    joinDate: '2020-03-15'
  },
  {
    id: 'R002',
    name: 'Trần Minh Khoa',
    role: 'BIM Coordinator',
    roleId: 'bim-coordinator',
    level: 'mid',
    email: 'khoa.tran@bimvn.com',
    phone: '0912-345-678',
    avatar: 'TMK',
    skills: ['Revit', 'Navisworks', 'Civil 3D', 'Dynamo'],
    certifications: ['Autodesk Certified Professional'],
    allocation: [
      { projectId: 'P001', projectName: 'QL1A HCM-Long Thành', percentage: 50 },
      { projectId: 'P004', projectName: 'Nút giao An Phú', percentage: 30 },
      { projectId: 'P006', projectName: 'Cao tốc BN-HP', percentage: 25 }
    ],
    totalAllocation: 105,
    status: 'overloaded',
    joinDate: '2021-06-01'
  },
  {
    id: 'R003',
    name: 'Lê Thị Hoa',
    role: 'BIM Modeler',
    roleId: 'bim-modeler',
    level: 'mid',
    email: 'hoa.le@bimvn.com',
    phone: '0923-456-789',
    avatar: 'LTH',
    skills: ['Revit', 'Civil 3D', 'InfraWorks'],
    certifications: [],
    allocation: [
      { projectId: 'P001', projectName: 'QL1A HCM-Long Thành', percentage: 60 },
      { projectId: 'P003', projectName: 'Hầm Hải Vân 2', percentage: 40 }
    ],
    totalAllocation: 100,
    status: 'active',
    joinDate: '2022-01-10'
  },
  {
    id: 'R004',
    name: 'Phạm Đức Hùng',
    role: 'BIM Modeler',
    roleId: 'bim-modeler',
    level: 'mid',
    email: 'hung.pham@bimvn.com',
    phone: '0934-567-890',
    avatar: 'PDH',
    skills: ['Revit', 'Civil 3D', 'OpenRoads Designer'],
    certifications: ['Autodesk Certified Associate'],
    allocation: [
      { projectId: 'P001', projectName: 'QL1A HCM-Long Thành', percentage: 30 },
      { projectId: 'P002', projectName: 'Cầu Mỹ Thuận 2', percentage: 70 }
    ],
    totalAllocation: 100,
    status: 'active',
    joinDate: '2021-09-15'
  },
  {
    id: 'R005',
    name: 'Nguyễn Thị Mai',
    role: 'BIM Modeler',
    roleId: 'bim-modeler',
    level: 'junior',
    email: 'mai.nguyen@bimvn.com',
    phone: '0945-678-901',
    avatar: 'NTM',
    skills: ['Revit', 'AutoCAD'],
    certifications: [],
    allocation: [
      { projectId: 'P001', projectName: 'QL1A HCM-Long Thành', percentage: 40 },
      { projectId: 'P003', projectName: 'Hầm Hải Vân 2', percentage: 50 }
    ],
    totalAllocation: 90,
    status: 'active',
    joinDate: '2023-03-01'
  },
  {
    id: 'R006',
    name: 'Võ Hoàng Nam',
    role: 'BIM Coordinator',
    roleId: 'bim-coordinator',
    level: 'mid',
    email: 'nam.vo@bimvn.com',
    phone: '0956-789-012',
    avatar: 'VHN',
    skills: ['Revit', 'Civil 3D', 'Navisworks', 'BIM 360'],
    certifications: ['Autodesk Certified Professional'],
    allocation: [
      { projectId: 'P001', projectName: 'QL1A HCM-Long Thành', percentage: 20 },
      { projectId: 'P004', projectName: 'Nút giao An Phú', percentage: 70 }
    ],
    totalAllocation: 90,
    status: 'active',
    joinDate: '2022-05-15'
  },
  {
    id: 'R007',
    name: 'Lê Văn Tùng',
    role: 'Khảo sát viên',
    roleId: 'surveyor',
    level: 'mid',
    email: 'tung.le@bimvn.com',
    phone: '0967-890-123',
    avatar: 'LVT',
    skills: ['Total Station', '3D Scanner', 'ReCap Pro', 'Civil 3D'],
    certifications: [],
    allocation: [
      { projectId: 'P002', projectName: 'Cầu Mỹ Thuận 2', percentage: 30 },
      { projectId: 'P003', projectName: 'Hầm Hải Vân 2', percentage: 40 },
      { projectId: 'P005', projectName: 'Vành Đai 4', percentage: 30 }
    ],
    totalAllocation: 100,
    status: 'active',
    joinDate: '2021-11-01'
  },
  {
    id: 'R008',
    name: 'Đặng Thị Lan',
    role: 'QA/QC Engineer',
    roleId: 'qaqc',
    level: 'mid',
    email: 'lan.dang@bimvn.com',
    phone: '0978-901-234',
    avatar: 'DTL',
    skills: ['Navisworks', 'Solibri', 'BIM 360'],
    certifications: ['buildingSMART openBIM'],
    allocation: [
      { projectId: 'P001', projectName: 'QL1A HCM-Long Thành', percentage: 30 },
      { projectId: 'P002', projectName: 'Cầu Mỹ Thuận 2', percentage: 25 },
      { projectId: 'P004', projectName: 'Nút giao An Phú', percentage: 20 }
    ],
    totalAllocation: 75,
    status: 'active',
    joinDate: '2022-08-01'
  },
  {
    id: 'R009',
    name: 'Hoàng Minh Tuấn',
    role: 'Design Engineer',
    roleId: 'design-engineer',
    level: 'senior',
    email: 'tuan.hoang@bimvn.com',
    phone: '0989-012-345',
    avatar: 'HMT',
    skills: ['Civil 3D', 'OpenRoads', 'MIDAS', 'SAP2000'],
    certifications: ['PE Civil'],
    allocation: [
      { projectId: 'P002', projectName: 'Cầu Mỹ Thuận 2', percentage: 50 },
      { projectId: 'P003', projectName: 'Hầm Hải Vân 2', percentage: 40 }
    ],
    totalAllocation: 90,
    status: 'active',
    joinDate: '2019-07-15'
  },
  {
    id: 'R010',
    name: 'Bùi Thanh Hà',
    role: 'CAD Technician',
    roleId: 'cad-technician',
    level: 'junior',
    email: 'ha.bui@bimvn.com',
    phone: '0990-123-456',
    avatar: 'BTH',
    skills: ['AutoCAD', 'Revit', 'SketchUp'],
    certifications: [],
    allocation: [
      { projectId: 'P005', projectName: 'Vành Đai 4', percentage: 80 }
    ],
    totalAllocation: 80,
    status: 'active',
    joinDate: '2024-01-15'
  },
  {
    id: 'R011',
    name: 'Trịnh Quốc Bảo',
    role: 'BIM Modeler',
    roleId: 'bim-modeler',
    level: 'mid',
    email: 'bao.trinh@bimvn.com',
    phone: '0901-234-999',
    avatar: 'TQB',
    skills: ['Revit', 'Civil 3D', 'Dynamo'],
    certifications: [],
    allocation: [
      { projectId: 'P003', projectName: 'Hầm Hải Vân 2', percentage: 60 },
      { projectId: 'P005', projectName: 'Vành Đai 4', percentage: 30 }
    ],
    totalAllocation: 90,
    status: 'active',
    joinDate: '2023-06-01'
  },
  {
    id: 'R012',
    name: 'Phan Thị Yến',
    role: 'Project Manager',
    roleId: 'project-manager',
    level: 'senior',
    email: 'yen.phan@bimvn.com',
    phone: '0912-999-888',
    avatar: 'PTY',
    skills: ['MS Project', 'BIM 360', 'Power BI', 'Primavera P6'],
    certifications: ['PMP', 'BIM Manager Certificate'],
    allocation: [
      { projectId: 'P001', projectName: 'QL1A HCM-Long Thành', percentage: 25 },
      { projectId: 'P002', projectName: 'Cầu Mỹ Thuận 2', percentage: 25 },
      { projectId: 'P005', projectName: 'Vành Đai 4', percentage: 30 }
    ],
    totalAllocation: 80,
    status: 'active',
    joinDate: '2018-04-01'
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
  { id: 'A001', type: 'task', user: 'Trần Minh Khoa', action: 'hoàn thành clash detection round 2', project: 'QL1A HCM-Long Thành', time: '15 phút trước', dotColor: 'var(--accent-secondary)' },
  { id: 'A002', type: 'model', user: 'Phạm Đức Hùng', action: 'cập nhật model trụ tháp lên LOD 300', project: 'Cầu Mỹ Thuận 2', time: '32 phút trước', dotColor: 'var(--accent-primary)' },
  { id: 'A003', type: 'clash', user: 'Đặng Thị Lan', action: 'phát hiện 15 clash mới (MEP vs Structure)', project: 'Hầm Hải Vân 2', time: '1 giờ trước', dotColor: 'var(--accent-warning)' },
  { id: 'A004', type: 'meeting', user: 'Phan Thị Yến', action: 'đặt lịch họp BIM coordination', project: 'Vành Đai 4', time: '2 giờ trước', dotColor: 'var(--accent-purple)' },
  { id: 'A005', type: 'resource', user: 'Nguyễn Văn An', action: 'phân bổ Bùi Thanh Hà vào team', project: 'Vành Đai 4', time: '3 giờ trước', dotColor: 'var(--accent-cyan)' },
  { id: 'A006', type: 'upload', user: 'Lê Văn Tùng', action: 'upload point cloud scan đợt 3', project: 'Hầm Hải Vân 2', time: '4 giờ trước', dotColor: 'var(--accent-secondary)' },
  { id: 'A007', type: 'review', user: 'Nguyễn Văn An', action: 'duyệt BEP v2.1', project: 'QL1A HCM-Long Thành', time: '5 giờ trước', dotColor: 'var(--accent-primary)' },
  { id: 'A008', type: 'alert', user: 'Hệ thống', action: 'cảnh báo Trần Minh Khoa vượt 105% allocation', project: '', time: '6 giờ trước', dotColor: 'var(--accent-danger)' }
];
