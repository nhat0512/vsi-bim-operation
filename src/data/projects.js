// ============================================
// MOCK DATA — BIM Projects for Transport Infrastructure
// ============================================

export const projectItems = [
  {
    id: 'P001',
    code: 'QL1A-HCM-LT',
    name: 'Mở rộng QL1A đoạn HCM - Long Thành',
    type: 'road',
    status: 'active',
    priority: 'critical',
    client: 'Ban QLDA Đường bộ 7',
    location: 'TP.HCM - Đồng Nai',
    length: '32.5 km',
    budget: '4,200 tỷ VNĐ',
    progress: 68,
    startDate: '2026-01-15',
    endDate: '2027-06-30',
    bepVersion: 'v2.1',
    currentPhase: 'detailed',
    modelHealth: 87,
    lodTarget: 350,
    lodCurrent: 300,
    clashesTotal: 245,
    clashesResolved: 198,
    disciplines: ['road', 'bridge', 'drainage', 'lighting', 'traffic'],
    teamSize: 18,
    teamLead: 'Nguyễn Văn An',
    segments: [
      { id: 'S1', name: 'Km0+000 - Km8+500', progress: 85 },
      { id: 'S2', name: 'Km8+500 - Km18+000', progress: 72 },
      { id: 'S3', name: 'Km18+000 - Km25+200', progress: 60 },
      { id: 'S4', name: 'Km25+200 - Km32+500', progress: 45 }
    ],
    phases: [
      { id: 'survey', status: 'completed', progress: 100, startDate: '2026-01-15', endDate: '2026-03-15' },
      { id: 'preliminary', status: 'completed', progress: 100, startDate: '2026-03-01', endDate: '2026-05-30' },
      { id: 'technical', status: 'completed', progress: 100, startDate: '2026-05-15', endDate: '2026-08-30' },
      { id: 'detailed', status: 'active', progress: 68, startDate: '2026-08-01', endDate: '2027-02-28' },
      { id: 'construction', status: 'planning', progress: 0, startDate: '2027-01-15', endDate: '2027-06-30' },
      { id: 'handover', status: 'planning', progress: 0, startDate: '2027-06-01', endDate: '2027-06-30' }
    ],
    tasks: [
      { id: 'T001', name: 'Mô hình tuyến chính', assignee: 'Trần Minh Khoa', status: 'completed', progress: 100, dueDate: '2026-09-01' },
      { id: 'T002', name: 'Thiết kế nút giao Km12', assignee: 'Lê Thị Hoa', status: 'active', progress: 75, dueDate: '2026-09-20' },
      { id: 'T003', name: 'Model cầu vượt Km18', assignee: 'Phạm Đức Hùng', status: 'active', progress: 45, dueDate: '2026-10-15' },
      { id: 'T004', name: 'Hệ thống thoát nước', assignee: 'Nguyễn Thị Mai', status: 'active', progress: 60, dueDate: '2026-09-30' },
      { id: 'T005', name: 'Chiếu sáng đoạn 1-2', assignee: 'Võ Hoàng Nam', status: 'planning', progress: 10, dueDate: '2026-10-30' },
      { id: 'T006', name: 'Clash detection round 3', assignee: 'Trần Minh Khoa', status: 'active', progress: 50, dueDate: '2026-09-25' }
    ]
  },
  {
    id: 'P002',
    code: 'CAU-MY-THUAN-2',
    name: 'Cầu Mỹ Thuận 2 — BIM Model',
    type: 'bridge',
    status: 'active',
    priority: 'high',
    client: 'Ban QLDA Đường bộ 6',
    location: 'Tiền Giang - Vĩnh Long',
    length: '6.61 km',
    budget: '5,003 tỷ VNĐ',
    progress: 42,
    startDate: '2026-03-01',
    endDate: '2027-12-31',
    bepVersion: 'v1.3',
    currentPhase: 'technical',
    modelHealth: 79,
    lodTarget: 400,
    lodCurrent: 200,
    clashesTotal: 156,
    clashesResolved: 89,
    disciplines: ['bridge', 'road', 'geotechnical', 'drainage'],
    teamSize: 22,
    teamLead: 'Phạm Đức Hùng',
    segments: [
      { id: 'S1', name: 'Đường dẫn phía Tiền Giang', progress: 55 },
      { id: 'S2', name: 'Cầu chính (dây văng)', progress: 35 },
      { id: 'S3', name: 'Đường dẫn phía Vĩnh Long', progress: 48 }
    ],
    phases: [
      { id: 'survey', status: 'completed', progress: 100, startDate: '2026-03-01', endDate: '2026-05-15' },
      { id: 'preliminary', status: 'completed', progress: 100, startDate: '2026-05-01', endDate: '2026-07-30' },
      { id: 'technical', status: 'active', progress: 55, startDate: '2026-07-15', endDate: '2027-03-30' },
      { id: 'detailed', status: 'planning', progress: 0, startDate: '2027-03-01', endDate: '2027-09-30' },
      { id: 'construction', status: 'planning', progress: 0, startDate: '2027-09-01', endDate: '2027-12-31' },
      { id: 'handover', status: 'planning', progress: 0, startDate: '2027-12-01', endDate: '2027-12-31' }
    ],
    tasks: [
      { id: 'T001', name: 'Model kết cấu nhịp chính', assignee: 'Trần Minh Khoa', status: 'active', progress: 40, dueDate: '2026-11-15' },
      { id: 'T002', name: 'Model trụ tháp dây văng', assignee: 'Phạm Đức Hùng', status: 'active', progress: 55, dueDate: '2026-10-30' },
      { id: 'T003', name: 'Khảo sát địa chất bổ sung', assignee: 'Lê Văn Tùng', status: 'completed', progress: 100, dueDate: '2026-08-15' }
    ]
  },
  {
    id: 'P003',
    code: 'HAM-HAI-VAN-2',
    name: 'Hầm Hải Vân 2 — As-built BIM',
    type: 'tunnel',
    status: 'active',
    priority: 'high',
    client: 'Ban QLDA 85',
    location: 'Thừa Thiên Huế - Đà Nẵng',
    length: '6.28 km',
    budget: '8,900 tỷ VNĐ',
    progress: 35,
    startDate: '2026-04-01',
    endDate: '2028-03-31',
    bepVersion: 'v1.5',
    currentPhase: 'technical',
    modelHealth: 72,
    lodTarget: 500,
    lodCurrent: 200,
    clashesTotal: 320,
    clashesResolved: 145,
    disciplines: ['tunnel', 'road', 'lighting', 'drainage', 'traffic'],
    teamSize: 28,
    teamLead: 'Lê Thị Hoa',
    segments: [
      { id: 'S1', name: 'Cửa hầm phía Bắc', progress: 50 },
      { id: 'S2', name: 'Đoạn hầm chính', progress: 25 },
      { id: 'S3', name: 'Cửa hầm phía Nam', progress: 42 },
      { id: 'S4', name: 'Hệ thống M&E hầm', progress: 30 }
    ],
    phases: [
      { id: 'survey', status: 'completed', progress: 100, startDate: '2026-04-01', endDate: '2026-06-30' },
      { id: 'preliminary', status: 'completed', progress: 100, startDate: '2026-06-15', endDate: '2026-09-15' },
      { id: 'technical', status: 'active', progress: 40, startDate: '2026-09-01', endDate: '2027-06-30' },
      { id: 'detailed', status: 'planning', progress: 0, startDate: '2027-06-01', endDate: '2027-12-31' },
      { id: 'construction', status: 'planning', progress: 0, startDate: '2027-12-01', endDate: '2028-03-31' },
      { id: 'handover', status: 'planning', progress: 0, startDate: '2028-03-01', endDate: '2028-03-31' }
    ],
    tasks: [
      { id: 'T001', name: 'Scan 3D hiện trạng hầm', assignee: 'Lê Văn Tùng', status: 'active', progress: 65, dueDate: '2026-10-30' },
      { id: 'T002', name: 'Model vỏ hầm segment', assignee: 'Nguyễn Thị Mai', status: 'active', progress: 30, dueDate: '2026-12-15' }
    ]
  },
  {
    id: 'P004',
    code: 'NUT-GIAO-AN-PHU',
    name: 'Nút giao An Phú — Thiết kế BIM',
    type: 'interchange',
    status: 'active',
    priority: 'medium',
    client: 'Sở GTVT TP.HCM',
    location: 'TP.HCM, Quận 2',
    length: '2.1 km',
    budget: '3,400 tỷ VNĐ',
    progress: 55,
    startDate: '2026-02-01',
    endDate: '2027-04-30',
    bepVersion: 'v2.0',
    currentPhase: 'detailed',
    modelHealth: 82,
    lodTarget: 350,
    lodCurrent: 300,
    clashesTotal: 180,
    clashesResolved: 142,
    disciplines: ['road', 'bridge', 'drainage', 'lighting', 'traffic', 'landscape'],
    teamSize: 15,
    teamLead: 'Võ Hoàng Nam',
    segments: [
      { id: 'S1', name: 'Nhánh A (hướng Thủ Đức)', progress: 65 },
      { id: 'S2', name: 'Nhánh B (hướng Q7)', progress: 55 },
      { id: 'S3', name: 'Cầu vượt trung tâm', progress: 45 },
      { id: 'S4', name: 'Hầm chui + đường gom', progress: 50 }
    ],
    phases: [
      { id: 'survey', status: 'completed', progress: 100, startDate: '2026-02-01', endDate: '2026-03-31' },
      { id: 'preliminary', status: 'completed', progress: 100, startDate: '2026-03-15', endDate: '2026-06-15' },
      { id: 'technical', status: 'completed', progress: 100, startDate: '2026-06-01', endDate: '2026-08-31' },
      { id: 'detailed', status: 'active', progress: 55, startDate: '2026-08-15', endDate: '2027-01-31' },
      { id: 'construction', status: 'planning', progress: 0, startDate: '2027-01-15', endDate: '2027-04-30' },
      { id: 'handover', status: 'planning', progress: 0, startDate: '2027-04-15', endDate: '2027-04-30' }
    ],
    tasks: [
      { id: 'T001', name: 'Model nhánh A hoàn thiện', assignee: 'Võ Hoàng Nam', status: 'active', progress: 70, dueDate: '2026-09-30' },
      { id: 'T002', name: 'Thiết kế hầm chui', assignee: 'Trần Minh Khoa', status: 'active', progress: 40, dueDate: '2026-10-20' }
    ]
  },
  {
    id: 'P005',
    code: 'VANH-DAI-4',
    name: 'Đường Vành Đai 4 TP.HCM — Đoạn 1',
    type: 'road',
    status: 'planning',
    priority: 'critical',
    client: 'Ban QLDA Mỹ Thuận',
    location: 'TP.HCM - Bình Dương - Long An',
    length: '48.7 km',
    budget: '12,500 tỷ VNĐ',
    progress: 12,
    startDate: '2026-07-01',
    endDate: '2028-12-31',
    bepVersion: 'v1.0',
    currentPhase: 'preliminary',
    modelHealth: 65,
    lodTarget: 300,
    lodCurrent: 100,
    clashesTotal: 45,
    clashesResolved: 12,
    disciplines: ['road', 'bridge', 'drainage', 'lighting', 'traffic', 'landscape', 'geotechnical'],
    teamSize: 35,
    teamLead: 'Nguyễn Văn An',
    segments: [
      { id: 'S1', name: 'Km0 - Km12 (Bình Dương)', progress: 18 },
      { id: 'S2', name: 'Km12 - Km28 (HCM)', progress: 15 },
      { id: 'S3', name: 'Km28 - Km38 (HCM)', progress: 8 },
      { id: 'S4', name: 'Km38 - Km48.7 (Long An)', progress: 5 }
    ],
    phases: [
      { id: 'survey', status: 'completed', progress: 100, startDate: '2026-07-01', endDate: '2026-09-30' },
      { id: 'preliminary', status: 'active', progress: 30, startDate: '2026-09-15', endDate: '2027-03-31' },
      { id: 'technical', status: 'planning', progress: 0, startDate: '2027-03-01', endDate: '2027-09-30' },
      { id: 'detailed', status: 'planning', progress: 0, startDate: '2027-09-01', endDate: '2028-06-30' },
      { id: 'construction', status: 'planning', progress: 0, startDate: '2028-06-01', endDate: '2028-12-31' },
      { id: 'handover', status: 'planning', progress: 0, startDate: '2028-12-01', endDate: '2028-12-31' }
    ],
    tasks: [
      { id: 'T001', name: 'Lập BEP dự án', assignee: 'Nguyễn Văn An', status: 'active', progress: 60, dueDate: '2026-10-15' },
      { id: 'T002', name: 'Xử lý dữ liệu khảo sát', assignee: 'Lê Văn Tùng', status: 'active', progress: 45, dueDate: '2026-10-30' }
    ]
  },
  {
    id: 'P006',
    code: 'CAO-TOC-BN-HP',
    name: 'Cao tốc Bắc Ninh - Hải Phòng mở rộng',
    type: 'road',
    status: 'on-hold',
    priority: 'medium',
    client: 'VEC',
    location: 'Bắc Ninh - Hải Dương - Hải Phòng',
    length: '74 km',
    budget: '9,800 tỷ VNĐ',
    progress: 25,
    startDate: '2026-05-01',
    endDate: '2028-06-30',
    bepVersion: 'v1.2',
    currentPhase: 'preliminary',
    modelHealth: 70,
    lodTarget: 300,
    lodCurrent: 100,
    clashesTotal: 78,
    clashesResolved: 30,
    disciplines: ['road', 'bridge', 'drainage', 'traffic'],
    teamSize: 12,
    teamLead: 'Trần Minh Khoa',
    segments: [
      { id: 'S1', name: 'Đoạn Bắc Ninh', progress: 35 },
      { id: 'S2', name: 'Đoạn Hải Dương', progress: 22 },
      { id: 'S3', name: 'Đoạn Hải Phòng', progress: 18 }
    ],
    phases: [
      { id: 'survey', status: 'completed', progress: 100, startDate: '2026-05-01', endDate: '2026-07-31' },
      { id: 'preliminary', status: 'on-hold', progress: 40, startDate: '2026-07-15', endDate: '2027-01-31' },
      { id: 'technical', status: 'planning', progress: 0, startDate: '2027-01-15', endDate: '2027-09-30' },
      { id: 'detailed', status: 'planning', progress: 0, startDate: '2027-09-01', endDate: '2028-03-31' },
      { id: 'construction', status: 'planning', progress: 0, startDate: '2028-03-01', endDate: '2028-06-30' },
      { id: 'handover', status: 'planning', progress: 0, startDate: '2028-06-01', endDate: '2028-06-30' }
    ],
    tasks: []
  },
  {
    id: 'P007',
    code: '14D',
    name: 'Theo dõi tiến độ bản vẽ 14D',
    type: 'road',
    status: 'active',
    priority: 'high',
    client: 'Dự án 14D',
    location: 'Tuyển 14D',
    length: '72 km',
    budget: 'Chưa cập nhật',
    progress: 45,
    startDate: '2026-07-01',
    endDate: '2026-12-31',
    bepVersion: 'v1.0',
    currentPhase: 'detailed',
    modelHealth: 100,
    lodTarget: 300,
    lodCurrent: 300,
    clashesTotal: 0,
    clashesResolved: 0,
    disciplines: ['road', 'bridge', 'drainage'],
    teamSize: 10,
    teamLead: 'Trần Minh Khoa',
    segments: [
      { id: 'S1', name: 'Km0-Km27', progress: 80 },
      { id: 'S2', name: 'Km27-Km40', progress: 50 },
      { id: 'S3', name: 'Km40-Km50', progress: 40 },
      { id: 'S4', name: 'Km50-Km62', progress: 60 },
      { id: 'S5', name: 'Km62-Km72', progress: 0 }
    ],
    phases: [
      { id: 'survey', status: 'completed', progress: 100, startDate: '2026-01-01', endDate: '2026-03-31' },
      { id: 'preliminary', status: 'completed', progress: 100, startDate: '2026-03-01', endDate: '2026-06-30' },
      { id: 'technical', status: 'active', progress: 80, startDate: '2026-05-15', endDate: '2026-08-30' },
      { id: 'detailed', status: 'planning', progress: 0, startDate: '2026-07-01', endDate: '2026-12-31' },
      { id: 'construction', status: 'planning', progress: 0, startDate: '2027-01-01', endDate: '2027-06-30' },
      { id: 'handover', status: 'planning', progress: 0, startDate: '2027-06-01', endDate: '2027-12-31' }
    ],
    tasks: [
      { id: 'T001', name: 'Hoàn thiện hồ sơ thanh toán đợt 1', assignee: 'Trần Minh Khoa', status: 'active', progress: 60, dueDate: '2026-09-25' },
      { id: 'T002', name: 'Thẩm tra bản vẽ lần 2 (Km44-Km46)', assignee: 'Nguyễn Văn An', status: 'active', progress: 20, dueDate: '2026-09-19' }
    ]
  }
];
