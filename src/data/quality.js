// ============================================
// MOCK DATA — BIM Quality & Clash Detection
// ============================================

export const qualityData = {
  overallScore: 81,
  bepCompliance: 88,
  lodCompliance: 75,
  modelConsistency: 82,
  clashScore: 78,

  // LOD tracking per project
  lodTracking: [
    { projectId: 'P001', discipline: 'Đường', targetLOD: 350, currentLOD: 300, compliance: 85 },
    { projectId: 'P001', discipline: 'Cầu vượt', targetLOD: 350, currentLOD: 300, compliance: 80 },
    { projectId: 'P001', discipline: 'Thoát nước', targetLOD: 350, currentLOD: 200, compliance: 60 },
    { projectId: 'P001', discipline: 'Chiếu sáng', targetLOD: 300, currentLOD: 200, compliance: 65 },
    { projectId: 'P002', discipline: 'Cầu chính', targetLOD: 400, currentLOD: 200, compliance: 50 },
    { projectId: 'P002', discipline: 'Trụ tháp', targetLOD: 400, currentLOD: 300, compliance: 70 },
    { projectId: 'P002', discipline: 'Đường dẫn', targetLOD: 350, currentLOD: 200, compliance: 55 },
    { projectId: 'P003', discipline: 'Vỏ hầm', targetLOD: 500, currentLOD: 200, compliance: 40 },
    { projectId: 'P003', discipline: 'M&E hầm', targetLOD: 400, currentLOD: 100, compliance: 25 },
    { projectId: 'P004', discipline: 'Nút giao', targetLOD: 350, currentLOD: 300, compliance: 82 },
    { projectId: 'P004', discipline: 'Cầu vượt', targetLOD: 350, currentLOD: 300, compliance: 78 }
  ],

  // BEP compliance checklist
  bepChecklist: [
    { id: 'BEP01', item: 'Project Info & Goals', status: 'pass', notes: '' },
    { id: 'BEP02', item: 'BIM Uses defined', status: 'pass', notes: '' },
    { id: 'BEP03', item: 'LOD Matrix defined', status: 'pass', notes: '' },
    { id: 'BEP04', item: 'File naming convention', status: 'pass', notes: '' },
    { id: 'BEP05', item: 'Coordinate system established', status: 'pass', notes: 'VN-2000 / UTM Zone 48' },
    { id: 'BEP06', item: 'Clash detection schedule', status: 'warning', notes: 'Chưa cập nhật lịch cho Q4' },
    { id: 'BEP07', item: 'Deliverables timeline', status: 'pass', notes: '' },
    { id: 'BEP08', item: 'QA/QC procedures', status: 'pass', notes: '' },
    { id: 'BEP09', item: 'CDE workflow defined', status: 'pass', notes: '' },
    { id: 'BEP10', item: 'Model exchange formats', status: 'warning', notes: 'IFC export settings chưa kiểm tra' },
    { id: 'BEP11', item: 'Training plan', status: 'fail', notes: 'Chưa có kế hoạch đào tạo team mới' },
    { id: 'BEP12', item: 'Change management process', status: 'pass', notes: '' }
  ],

  // Clash detection summary
  clashSummary: [
    { projectId: 'P001', projectName: 'QL1A HCM-Long Thành', total: 245, newClashes: 12, inProgress: 35, resolved: 198, critical: 5 },
    { projectId: 'P002', projectName: 'Cầu Mỹ Thuận 2', total: 156, newClashes: 22, inProgress: 45, resolved: 89, critical: 8 },
    { projectId: 'P003', projectName: 'Hầm Hải Vân 2', total: 320, newClashes: 38, inProgress: 137, resolved: 145, critical: 15 },
    { projectId: 'P004', projectName: 'Nút giao An Phú', total: 180, newClashes: 8, inProgress: 30, resolved: 142, critical: 3 },
    { projectId: 'P005', projectName: 'Vành Đai 4', total: 45, newClashes: 15, inProgress: 18, resolved: 12, critical: 2 },
    { projectId: 'P006', projectName: 'Cao tốc BN-HP', total: 78, newClashes: 10, inProgress: 38, resolved: 30, critical: 4 }
  ],

  // Recent clash details
  recentClashes: [
    { id: 'CL001', project: 'Hầm Hải Vân 2', type: 'Hard', disciplines: 'Structure vs MEP', description: 'Ống thông gió xuyên qua dầm vỏ hầm tại Km3+200', severity: 'critical', status: 'new', assignee: 'Đặng Thị Lan', date: '2026-09-11' },
    { id: 'CL002', project: 'QL1A HCM-Long Thành', type: 'Hard', disciplines: 'Road vs Drainage', description: 'Cống hộp giao cắt với móng dải phân cách tại Km15+800', severity: 'high', status: 'in-progress', assignee: 'Trần Minh Khoa', date: '2026-09-10' },
    { id: 'CL003', project: 'Cầu Mỹ Thuận 2', type: 'Soft', disciplines: 'Bridge vs Road', description: 'Clearance không đủ giữa dầm cầu và mặt đường dẫn', severity: 'high', status: 'in-progress', assignee: 'Phạm Đức Hùng', date: '2026-09-10' },
    { id: 'CL004', project: 'Nút giao An Phú', type: 'Hard', disciplines: 'Road vs Lighting', description: 'Trụ đèn chiếu sáng nằm trong phạm vi dải an toàn', severity: 'medium', status: 'new', assignee: 'Võ Hoàng Nam', date: '2026-09-11' },
    { id: 'CL005', project: 'Hầm Hải Vân 2', type: 'Hard', disciplines: 'Structure vs Drainage', description: 'Đường ống thoát nước xuyên qua thành hầm segment 45', severity: 'critical', status: 'new', assignee: 'Đặng Thị Lan', date: '2026-09-11' },
    { id: 'CL006', project: 'QL1A HCM-Long Thành', type: 'Soft', disciplines: 'Road vs Traffic', description: 'Biển báo giao thông nằm ngoài tầm nhìn yêu cầu', severity: 'low', status: 'resolved', assignee: 'Lê Thị Hoa', date: '2026-09-09' },
    { id: 'CL007', project: 'Vành Đai 4', type: 'Hard', disciplines: 'Road vs Geotechnical', description: 'Taluy đường xâm phạm hành lang an toàn đê', severity: 'high', status: 'new', assignee: 'Nguyễn Văn An', date: '2026-09-11' },
    { id: 'CL008', project: 'Cầu Mỹ Thuận 2', type: 'Hard', disciplines: 'Bridge vs Geotechnical', description: 'Cọc khoan nhồi chồng lấn vùng đất yếu chưa xử lý', severity: 'critical', status: 'in-progress', assignee: 'Hoàng Minh Tuấn', date: '2026-09-09' }
  ]
};
