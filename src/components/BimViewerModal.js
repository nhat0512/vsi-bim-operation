import * as THREE from 'https://esm.sh/three@0.135.0';
import { OrbitControls } from 'https://esm.sh/three@0.135.0/examples/jsm/controls/OrbitControls';
import { IFCLoader } from 'https://esm.sh/web-ifc-three@0.0.126/IFCLoader';

let currentIfcModel = null;
let ifcLoader = null;
let scene, camera, renderer, controls;

export function openBimViewer(projectId, projectName) {
  const container = document.getElementById('bim-viewer-container');
  if (!container) return;

  container.innerHTML = `
    <div class="bim-viewer-overlay animate-fade-in">
      <div class="bim-viewer-header">
        <div class="bim-viewer-title">
          <span style="color: var(--accent-primary); margin-right: 8px;">🏗️</span>
          ${projectName} - Trình xem IFC
        </div>
        <div style="display: flex; gap: 10px;">
          <input type="file" id="ifc-file-input" accept=".ifc" style="display: none;">
          <button class="btn btn-primary" onclick="document.getElementById('ifc-file-input').click()">
            📁 Tải lên file .ifc
          </button>
          <button class="btn btn-outline" id="close-bim-viewer">Thoát ✕</button>
        </div>
      </div>
      
      <div class="bim-viewer-toolbar">
        <button class="viewer-tool" title="Xoay mô hình (Orbit)">🔄</button>
        <button class="viewer-tool" title="Di chuyển (Pan)">✋</button>
        <button class="viewer-tool" title="Đo khoảng cách (Measure)">📏</button>
        <button class="viewer-tool" title="Cắt lớp (Section Box)">✂️</button>
        <button class="viewer-tool" title="Thuộc tính cấu kiện (Properties)">ℹ️</button>
        <button class="viewer-tool" title="Ghi chú lỗi (Clash/Issue)">⚠️</button>
      </div>
      
      <div id="three-canvas-container" class="bim-viewer-canvas">
        <div id="upload-prompt" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: var(--text-muted); z-index: 5;">
          <h2>Chưa có mô hình</h2>
          <p>Vui lòng bấm nút "Tải lên file .ifc" để xem mô hình thực tế</p>
        </div>
      </div>
      
      <div class="bim-viewer-loading" id="bim-loading" style="display: none;">
        <div class="spinner"></div>
        <div>Đang xử lý file IFC... Xin chờ!</div>
      </div>
    </div>
  `;

  document.getElementById('close-bim-viewer').addEventListener('click', () => {
    container.innerHTML = '';
    // Clean up
    if (currentIfcModel && scene) {
      scene.remove(currentIfcModel);
      currentIfcModel = null;
    }
  });

  document.getElementById('ifc-file-input').addEventListener('change', handleIfcUpload);

  // Initialize empty scene first
  initThreeJS();
}

async function handleIfcUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  document.getElementById('upload-prompt').style.display = 'none';
  document.getElementById('bim-loading').style.display = 'flex';

  try {
    if (!ifcLoader) {
      // Setup IFC Loader
      ifcLoader = new IFCLoader();
      // Set the path to the wasm files
      ifcLoader.ifcManager.setWasmPath('https://unpkg.com/web-ifc@0.0.36/');
    }

    const objectUrl = URL.createObjectURL(file);
    
    // Parse the file
    ifcLoader.load(
      objectUrl,
      (ifcModel) => {
        if (currentIfcModel) scene.remove(currentIfcModel);
        
        currentIfcModel = ifcModel;
        scene.add(ifcModel);
        
        document.getElementById('bim-loading').style.display = 'none';
        URL.revokeObjectURL(objectUrl);
        
        // Auto-center camera on the model (simplified)
        ifcModel.geometry.computeBoundingBox();
        const bbox = ifcModel.geometry.boundingBox;
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        controls.target.copy(center);
        camera.position.set(center.x + 50, center.y + 50, center.z + 50);
        controls.update();
      },
      (progress) => {
        // Optional progress callback
      },
      (error) => {
        console.error(error);
        alert('Lỗi khi đọc file IFC!');
        document.getElementById('bim-loading').style.display = 'none';
      }
    );
  } catch (err) {
    console.error(err);
    alert('Đã xảy ra lỗi khi khởi tạo trình đọc IFC.');
    document.getElementById('bim-loading').style.display = 'none';
  }
}

function initThreeJS() {
  const container = document.getElementById('three-canvas-container');
  const width = container.clientWidth;
  const height = container.clientHeight;

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(
    getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim() || '#080d1a'
  );

  // Camera
  camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
  camera.position.set(50, 50, 80);
  camera.lookAt(0, 0, 0);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  // Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(20, 50, 20);
  scene.add(dirLight);

  // Grid
  const gridHelper = new THREE.GridHelper(100, 20, 0x3b82f6, 0x475569);
  gridHelper.material.opacity = 0.2;
  gridHelper.material.transparent = true;
  scene.add(gridHelper);

  // Animation Loop
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  // Handle Resize
  window.addEventListener('resize', () => {
    if (!container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  });
}
