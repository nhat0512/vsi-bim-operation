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
    milestones: [
      { id: 'M1', name: 'Nộp thẩm tra lần 1', date: '2026-09-25' },
      { id: 'M2', name: 'Nộp thẩm tra lần 2', date: '2026-10-20' },
      { id: 'M3', name: 'Hoàn thiện hồ sơ thanh toán', date: '2026-10-29' }
    ],
    segments: [
      {
        id: 'S1',
        name: 'Km0-Km27',
        progress: 80,
        progresses: [100, 100, 60],
        deadlines: ['2026-09-17', '2026-10-15', '2026-10-29'],
        subSegments: [
          {
            id: 'Sub_S1_1',
            name: 'Km0-km5 (5 km)',
            progresses: [100, 100, 75],
            deadlines: ['2026-08-12', '2026-10-15', '2026-10-29'],
            note: 'Còn đang so sánh Khối lượng (Chưa có ngày cụ thể xong)'
          },
          {
            id: 'Sub_S1_2',
            name: 'Km5-km10 (5 km)',
            progresses: [100, 100, 75],
            deadlines: ['2026-07-14', '2026-10-15', '2026-10-29'],
            note: ''
          },
          {
            id: 'Sub_S1_3',
            name: 'Km10-km16 (6 km)',
            progresses: [100, 100, 75],
            deadlines: ['2026-09-17', '2026-10-15', '2026-10-29'],
            note: '- 2 cầu, - 25 cống'
          },
          {
            id: 'Sub_S1_4',
            name: 'Km16-km21 (5 km)',
            progresses: [0, 0, 0],
            deadlines: ['2026-09-25', '2026-10-15', '2026-10-29'],
            note: ''
          },
          {
            id: 'Sub_S1_5',
            name: 'Km21-km27 (6 km)',
            progresses: [0, 0, 0],
            deadlines: ['2026-09-25', '2026-10-15', '2026-10-29'],
            note: ''
          }
        ]
      },
      {
        id: 'S2',
        name: 'Km27-Km40',
        progress: 50,
        progresses: [60, 50, 40],
        deadlines: ['2026-09-22', '2026-10-10', '2026-10-29'],
        subSegments: [
          {
            id: 'Sub_S2_1',
            name: 'Km27-Km31 (4 km)',
            progresses: [0, 0, 0],
            deadlines: ['2026-09-25', '2026-10-15', '2026-10-29'],
            note: ''
          },
          {
            id: 'Sub_S2_2',
            name: 'Km31-Km34 (3 km)',
            progresses: [100, 100, 75],
            deadlines: ['2026-09-22', '2026-10-10', '2026-10-29'],
            note: '- 0 cầu, - 12 cống'
          },
          {
            id: 'Sub_S2_3',
            name: 'Km34-Km35 (1 km)',
            progresses: [100, 100, 75],
            deadlines: ['2026-08-21', '2026-10-10', '2026-10-29'],
            note: 'a. Linh bổ sung thang bậc nước, tường TL'
          },
          {
            id: 'Sub_S2_4',
            name: 'Km35-Km40 (5 km)',
            progresses: [0, 0, 0],
            deadlines: ['2026-09-25', '2026-10-15', '2026-10-29'],
            note: ''
          }
        ]
      },
      {
        id: 'S3',
        name: 'Km40-Km50',
        progress: 60,
        progresses: [80, 80, 60],
        deadlines: ['2026-09-28', '2026-10-26', '2026-10-29'],
        subSegments: [
          {
            id: 'Sub_S3_1',
            name: 'Km40-Km44 (4 km)',
            progresses: [100, 100, 75],
            deadlines: ['2026-09-25', '2026-10-22', '2026-10-29'],
            note: '- 1 cầu gần xong đã đi thép a. Linh, - 16 cống'
          },
          {
            id: 'Sub_S3_2',
            name: 'Km44-Km46 (2 km)',
            progresses: [100, 100, 75],
            deadlines: ['2026-08-09', '2026-10-22', '2026-10-29'],
            note: 'a. Linh bổ sung thang bậc nước + Tường TL'
          },
          {
            id: 'Sub_S3_3',
            name: 'Km46-Km47 (1 km)',
            progresses: [100, 100, 75],
            deadlines: ['2026-09-23', '2026-10-26', '2026-10-29'],
            note: '- 0 cầu, - 6 cống'
          },
          {
            id: 'Sub_S3_4',
            name: 'Km47-Km49 (2 km)',
            progresses: [100, 100, 75],
            deadlines: ['2026-09-28', '2026-10-26', '2026-10-29'],
            note: '- 2 cầu, trong đó 1 cầu 48 đã đi thép, - 5 cống'
          },
          {
            id: 'Sub_S3_5',
            name: 'Km49-Km50 (1 km)',
            progresses: [0, 0, 0],
            deadlines: ['2026-09-25', '2026-10-15', '2026-10-29'],
            note: ''
          }
        ]
      },
      {
        id: 'S4',
        name: 'Km50-Km62',
        progress: 45,
        progresses: [65, 65, 50],
        deadlines: ['2026-09-24', '2026-10-26', '2026-10-29'],
        subSegments: [
          {
            id: 'Sub_S4_1',
            name: 'Km50-Km53 (3 km)',
            progresses: [100, 100, 75],
            deadlines: ['2026-09-24', '2026-10-26', '2026-10-29'],
            note: '- 2 cầu ngắn, - 6 cống'
          },
          {
            id: 'Sub_S4_2',
            name: 'Km53-Km54 (1 km)',
            progresses: [100, 100, 75],
            deadlines: ['2026-07-26', '2026-10-17', '2026-10-29'],
            note: 'a. Linh bổ sung thang bậc nước + Tường TL'
          },
          {
            id: 'Sub_S4_3',
            name: 'Km54-Km62 (8 km)',
            progresses: [0, 0, 0],
            deadlines: ['2026-09-25', '2026-10-15', '2026-10-29'],
            note: ''
          }
        ]
      },
      {
        id: 'S5',
        name: 'Km62-Km72',
        progress: 55,
        progresses: [100, 65, 50],
        deadlines: ['2026-09-29', '2026-10-28', '2026-10-29'],
        subSegments: [
          {
            id: 'Sub_S5_1',
            name: 'Km62-Km69 (7 km)',
            progresses: [100, 0, 0],
            deadlines: ['2026-09-29', '2026-10-20', '2026-10-29'],
            note: '- 3 cầu trong đó 1 dài, 2 cái trung bình, - 28 cống'
          },
          {
            id: 'Sub_S5_2',
            name: 'Km69-Km70 (1 km)',
            progresses: [100, 100, 75],
            deadlines: ['2026-08-21', '2026-10-28', '2026-10-29'],
            note: '- 2 cầu, - 4 cống'
          },
          {
            id: 'Sub_S5_3',
            name: 'Km70-km72 (2 km)',
            progresses: [100, 100, 75],
            deadlines: ['2026-09-23', '2026-10-17', '2026-10-29'],
            note: '- 0 cầu, - 8 cống'
          }
        ]
      }
    ],
    team: [
      { name: 'Thân Nguyễn Thái Thiện', role: 'BIM Modeler' },
      { name: 'Nguyễn Ngọc Thanh Tài', role: 'BIM Modeler' },
      { name: 'Trần Minh Khoa', role: 'BIM Coordinator' },
      { name: 'Nguyễn Văn An', role: 'BIM Manager' }
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
      {
        id: 't_1789354546060',
        name: 'An Toàn Giao Thông (Km0-Km5)',
        assignee: 'Thân Nguyễn Thái Thiện',
        phase: 'BVTC',
        lod: 'LOD 300',
        chainage: 'Km0-5',
        status: 'active',
        progress: 75,
        dueDate: '2026-09-25',
        segmentIdx: 0,
        subSegmentIdx: 0,
        milestoneIdx: 0,
        dailyHours_planned: { '2026-09-14': 3, '2026-09-15': 3, '2026-09-16': 3, '2026-09-17': 3, '2026-09-18': 3 },
        dailyHours_actual: { '2026-09-14': 3, '2026-09-15': 3 }
      },
      {
        id: 't_atgt_km5_km27',
        name: 'An Toàn Giao Thông (Km5-Km27)',
        assignee: 'Thân Nguyễn Thái Thiện',
        phase: 'BVTC',
        lod: 'LOD 300',
        chainage: 'Km5-27',
        status: 'active',
        progress: 60,
        dueDate: '2026-10-15',
        segmentIdx: 0,
        subSegmentIdx: 1,
        milestoneIdx: 0,
        dailyHours_planned: { '2026-10-15': 4, '2026-10-16': 4 },
        dailyHours_actual: {}
      },
      {
        id: 't_1789354764016',
        name: 'An Toàn Giao Thông (Km34-Km35)',
        assignee: 'Thân Nguyễn Thái Thiện',
        phase: 'BVTC',
        lod: 'LOD 300',
        chainage: 'Km34-35',
        status: 'active',
        progress: 75,
        dueDate: '2026-10-10',
        segmentIdx: 1,
        subSegmentIdx: 2,
        milestoneIdx: 1,
        dailyHours_planned: { '2026-10-12': 4, '2026-10-13': 4, '2026-10-14': 4 },
        dailyHours_actual: { '2026-10-12': 4, '2026-10-13': 4 }
      },
      {
        id: 't_atgt_km40_km50',
        name: 'An Toàn Giao Thông (Km40-Km50)',
        assignee: 'Thân Nguyễn Thái Thiện',
        phase: 'BVTC',
        lod: 'LOD 300',
        chainage: 'Km40-50',
        status: 'active',
        progress: 50,
        dueDate: '2026-10-26',
        segmentIdx: 2,
        subSegmentIdx: 0,
        milestoneIdx: 1,
        dailyHours_planned: { '2026-10-19': 4, '2026-10-20': 4 },
        dailyHours_actual: {}
      },
      {
        id: 't_atgt_km50_km62',
        name: 'An Toàn Giao Thông (Km50-Km62)',
        assignee: 'Thân Nguyễn Thái Thiện',
        phase: 'BVTC',
        lod: 'LOD 300',
        chainage: 'Km50-62',
        status: 'active',
        progress: 40,
        dueDate: '2026-10-26',
        segmentIdx: 3,
        subSegmentIdx: 0,
        milestoneIdx: 1,
        dailyHours_planned: { '2026-10-21': 4, '2026-10-22': 4 },
        dailyHours_actual: {}
      },
      {
        id: 't_atgt_km62_km72',
        name: 'An Toàn Giao Thông (Km62-Km72)',
        assignee: 'Thân Nguyễn Thái Thiện',
        phase: 'BVTC',
        lod: 'LOD 300',
        chainage: 'Km62-72',
        status: 'active',
        progress: 30,
        dueDate: '2026-10-28',
        segmentIdx: 4,
        subSegmentIdx: 0,
        milestoneIdx: 1,
        dailyHours_planned: { '2026-10-23': 4, '2026-10-24': 4 },
        dailyHours_actual: {}
      },
      {
        id: 't_1789354890001',
        name: 'Mô hình Cầu & Cống (Km10-Km16: 2 cầu, 25 cống)',
        assignee: 'Nguyễn Ngọc Thanh Tài',
        phase: 'BVTC',
        lod: 'LOD 300',
        chainage: 'Km10-16',
        status: 'active',
        progress: 75,
        dueDate: '2026-09-23',
        segmentIdx: 0,
        subSegmentIdx: 2,
        milestoneIdx: 0,
        dailyHours_planned: { '2026-10-08': 4, '2026-10-09': 4 },
        dailyHours_actual: { '2026-10-08': 4, '2026-10-09': 4 }
      },
      {
        id: 't_1789354890002',
        name: 'Mô hình Cống & Thoát nước (Km31-Km34: 12 cống)',
        assignee: 'Nguyễn Ngọc Thanh Tài',
        phase: 'BVTC',
        lod: 'LOD 300',
        chainage: 'Km31-34',
        status: 'active',
        progress: 75,
        dueDate: '2026-10-10',
        segmentIdx: 1,
        subSegmentIdx: 1,
        milestoneIdx: 1,
        dailyHours_planned: { '2026-10-10': 4, '2026-10-11': 4 },
        dailyHours_actual: { '2026-10-10': 4 }
      },
      {
        id: 't_1789354890003',
        name: 'Mô hình 1 cầu đi thép & 16 cống (Km40-Km44)',
        assignee: 'Nguyễn Ngọc Thanh Tài',
        phase: 'BVTC',
        lod: 'LOD 300',
        chainage: 'Km40-44',
        status: 'active',
        progress: 75,
        dueDate: '2026-10-22',
        segmentIdx: 2,
        subSegmentIdx: 0,
        milestoneIdx: 1,
        dailyHours_planned: { '2026-10-13': 4, '2026-10-14': 4 },
        dailyHours_actual: { '2026-10-13': 4 }
      },
      {
        id: 't_1789354890004',
        name: 'Bổ sung thang bậc nước & Tường chắn (Km44-Km46)',
        assignee: 'Nguyễn Ngọc Thanh Tài',
        phase: 'BVTC',
        lod: 'LOD 300',
        chainage: 'Km44-46',
        status: 'active',
        progress: 75,
        dueDate: '2026-10-22',
        segmentIdx: 2,
        subSegmentIdx: 1,
        milestoneIdx: 1
      },
      {
        id: 't_1789354890005',
        name: 'Mô hình cầu 48 đi thép & 5 cống (Km47-Km49)',
        assignee: 'Nguyễn Ngọc Thanh Tài',
        phase: 'BVTC',
        lod: 'LOD 300',
        chainage: 'Km47-49',
        status: 'active',
        progress: 75,
        dueDate: '2026-10-26',
        segmentIdx: 2,
        subSegmentIdx: 3,
        milestoneIdx: 1
      },
      {
        id: 't_1789354890006',
        name: 'Mô hình 2 cầu ngắn & 6 cống (Km50-Km53)',
        assignee: 'Nguyễn Ngọc Thanh Tài',
        phase: 'BVTC',
        lod: 'LOD 300',
        chainage: 'Km50-53',
        status: 'active',
        progress: 75,
        dueDate: '2026-10-26',
        segmentIdx: 3,
        subSegmentIdx: 0,
        milestoneIdx: 1
      },
      {
        id: 't_1789354890007',
        name: 'Bổ sung thang bậc nước & Tường chắn (Km53-Km54)',
        assignee: 'Nguyễn Ngọc Thanh Tài',
        phase: 'BVTC',
        lod: 'LOD 300',
        chainage: 'Km53-54',
        status: 'active',
        progress: 75,
        dueDate: '2026-10-17',
        segmentIdx: 3,
        subSegmentIdx: 1,
        milestoneIdx: 1
      },
      {
        id: 't_1789354890008',
        name: 'Mô hình 3 cầu & 28 cống (Km62-Km69)',
        assignee: 'Nguyễn Ngọc Thanh Tài',
        phase: 'BVTC',
        lod: 'LOD 300',
        chainage: 'Km62-69',
        status: 'completed',
        progress: 100,
        dueDate: '2026-09-29',
        segmentIdx: 4,
        subSegmentIdx: 0,
        milestoneIdx: 0
      },
      {
        id: 't_1789354890009',
        name: 'Mô hình 2 cầu & 4 cống (Km69-Km70)',
        assignee: 'Nguyễn Ngọc Thanh Tài',
        phase: 'BVTC',
        lod: 'LOD 300',
        chainage: 'Km69-70',
        status: 'active',
        progress: 75,
        dueDate: '2026-10-28',
        segmentIdx: 4,
        subSegmentIdx: 1,
        milestoneIdx: 1
      },
      {
        id: 't_1789354890010',
        name: 'Mô hình 8 cống (Km70-Km72)',
        assignee: 'Nguyễn Ngọc Thanh Tài',
        phase: 'BVTC',
        lod: 'LOD 300',
        chainage: 'Km70-72',
        status: 'active',
        progress: 75,
        dueDate: '2026-10-17',
        segmentIdx: 4,
        subSegmentIdx: 2,
        milestoneIdx: 1
      },
      {
        id: 'T001',
        name: 'Hoàn thiện hồ sơ thanh toán đợt 1',
        assignee: 'Trần Minh Khoa',
        status: 'active',
        progress: 60,
        dueDate: '2026-09-25',
        segmentIdx: 0,
        milestoneIdx: 0
      },
      {
        id: 'T002',
        name: 'Thẩm tra bản vẽ lần 2 (Km44-Km46)',
        assignee: 'Nguyễn Văn An',
        status: 'active',
        progress: 20,
        dueDate: '2026-09-19',
        segmentIdx: 2,
        subSegmentIdx: 1,
        milestoneIdx: 1
      }
    ]
  }
];
