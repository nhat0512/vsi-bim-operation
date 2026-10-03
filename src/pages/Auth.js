import { loginUser, registerUser } from '../state.js';

export function render() {
  return `
    <div class="auth-container" style="display: flex; min-height: 100vh; background: var(--bg-primary);">
      <!-- Left side: Illustration / Branding -->
      <div class="auth-banner" style="flex: 1; background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-purple) 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; padding: 40px; text-align: center;">
        <div style="font-size: 5rem; margin-bottom: 20px; animation: bounce 2s infinite;">🏗️</div>
        <h1 style="font-size: 2.5rem; font-weight: 800; margin-bottom: 16px; letter-spacing: -0.5px;">BIM TransPM</h1>
        <p style="font-size: 1.1rem; opacity: 0.9; max-width: 400px; line-height: 1.6;">Nền tảng quản trị dự án BIM hạ tầng giao thông mạnh mẽ, đồng bộ và chuyên nghiệp.</p>
        
        <div style="margin-top: 60px; display: flex; gap: 24px; opacity: 0.8;">
          <div style="display: flex; flex-direction: column; align-items: center;">
            <div style="font-size: 2rem; font-weight: bold;">50+</div>
            <div style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px;">Dự án</div>
          </div>
          <div style="display: flex; flex-direction: column; align-items: center;">
            <div style="font-size: 2rem; font-weight: bold;">1k+</div>
            <div style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px;">Nhân sự</div>
          </div>
        </div>
      </div>

      <!-- Right side: Auth Forms -->
      <div class="auth-form-wrapper" style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 40px; background: var(--bg-primary);">
        
        <!-- Login Form -->
        <div id="form-login" class="card animate-fade-in-up" style="width: 100%; max-width: 420px; padding: 40px; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.08);">
          <div style="text-align: center; margin-bottom: 32px;">
            <h2 style="font-size: 1.8rem; font-weight: 700; margin-bottom: 8px;">Đăng nhập</h2>
            <p style="color: var(--text-muted); font-size: 0.9rem;">Vui lòng điền thông tin để tiếp tục</p>
          </div>
          
          <div id="login-error" style="display: none; background: rgba(239, 68, 68, 0.1); color: var(--text-danger); padding: 12px; border-radius: 8px; margin-bottom: 20px; font-size: 0.85rem; border: 1px solid rgba(239, 68, 68, 0.3);"></div>

          <div class="form-group" style="margin-bottom: 20px;">
            <label style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px;">Email</label>
            <input type="email" id="login-email" class="form-input" placeholder="admin@vsibim.com" style="width: 100%; padding: 12px 16px; border-radius: 8px;" value="admin@vsibim.com">
          </div>
          
          <div class="form-group" style="margin-bottom: 24px;">
            <label style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px;">Mật khẩu</label>
            <input type="password" id="login-password" class="form-input" placeholder="••••••••" style="width: 100%; padding: 12px 16px; border-radius: 8px;" value="123456">
          </div>
          
          <button id="btn-submit-login" class="btn btn-primary" style="width: 100%; padding: 14px; font-size: 1rem; font-weight: 600; border-radius: 8px; justify-content: center; margin-bottom: 24px;">Đăng nhập hệ thống</button>
          
          <div style="text-align: center; font-size: 0.9rem; color: var(--text-secondary);">
            Chưa có tài khoản? <a href="#" id="link-to-register" style="color: var(--accent-primary); font-weight: 600; text-decoration: none;">Đăng ký ngay</a>
          </div>
        </div>

        <!-- Register Form (Hidden by default) -->
        <div id="form-register" class="card" style="display: none; width: 100%; max-width: 420px; padding: 40px; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.08);">
          <div style="text-align: center; margin-bottom: 32px;">
            <h2 style="font-size: 1.8rem; font-weight: 700; margin-bottom: 8px;">Tạo tài khoản mới</h2>
            <p style="color: var(--text-muted); font-size: 0.9rem;">Gia nhập không gian làm việc BIM TransPM</p>
          </div>
          
          <div id="register-error" style="display: none; background: rgba(239, 68, 68, 0.1); color: var(--text-danger); padding: 12px; border-radius: 8px; margin-bottom: 20px; font-size: 0.85rem; border: 1px solid rgba(239, 68, 68, 0.3);"></div>

          <div class="form-group" style="margin-bottom: 20px;">
            <label style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px;">Họ và tên</label>
            <input type="text" id="reg-name" class="form-input" placeholder="Nguyễn Văn A" style="width: 100%; padding: 12px 16px; border-radius: 8px;">
          </div>

          <div class="form-group" style="margin-bottom: 20px;">
            <label style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px;">Email công việc</label>
            <input type="email" id="reg-email" class="form-input" placeholder="email@company.com" style="width: 100%; padding: 12px 16px; border-radius: 8px;">
          </div>
          
          <div class="form-group" style="margin-bottom: 24px;">
            <label style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px;">Mật khẩu</label>
            <input type="password" id="reg-password" class="form-input" placeholder="••••••••" style="width: 100%; padding: 12px 16px; border-radius: 8px;">
          </div>
          
          <button id="btn-submit-register" class="btn btn-primary" style="width: 100%; padding: 14px; font-size: 1rem; font-weight: 600; border-radius: 8px; justify-content: center; margin-bottom: 24px;">Đăng ký</button>
          
          <div style="text-align: center; font-size: 0.9rem; color: var(--text-secondary);">
            Đã có tài khoản? <a href="#" id="link-to-login" style="color: var(--accent-primary); font-weight: 600; text-decoration: none;">Đăng nhập</a>
          </div>
        </div>

      </div>
    </div>
  `;
}

export function init() {
  const formLogin = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');
  
  // Toggles
  document.getElementById('link-to-register')?.addEventListener('click', (e) => {
    e.preventDefault();
    formLogin.style.display = 'none';
    formRegister.style.display = 'block';
    formRegister.classList.add('animate-fade-in-up');
  });

  document.getElementById('link-to-login')?.addEventListener('click', (e) => {
    e.preventDefault();
    formRegister.style.display = 'none';
    formLogin.style.display = 'block';
    formLogin.classList.add('animate-fade-in-up');
  });

  // Login Submit
  document.getElementById('btn-submit-login')?.addEventListener('click', async () => {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    const errBox = document.getElementById('login-error');
    const btn = document.getElementById('btn-submit-login');
    
    if (!email || !pass) {
      errBox.textContent = 'Vui lòng điền đầy đủ thông tin';
      errBox.style.display = 'block';
      return;
    }
    
    btn.textContent = 'Đang xử lý...';
    btn.disabled = true;
    
    const res = await loginUser(email, pass);
    if (res.success) {
      window.location.hash = ''; // reset hash
      window.location.reload();
    } else {
      errBox.textContent = res.message;
      errBox.style.display = 'block';
      btn.textContent = 'Đăng nhập hệ thống';
      btn.disabled = false;
    }
  });

  // Register Submit
  document.getElementById('btn-submit-register')?.addEventListener('click', async () => {
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const pass = document.getElementById('reg-password').value;
    const errBox = document.getElementById('register-error');
    const btn = document.getElementById('btn-submit-register');
    
    if (!name || !email || !pass) {
      errBox.textContent = 'Vui lòng điền đầy đủ thông tin';
      errBox.style.display = 'block';
      return;
    }
    
    btn.textContent = 'Đang xử lý...';
    btn.disabled = true;

    const res = await registerUser(name, email, pass);
    if (res.success) {
      window.location.hash = '';
      window.location.reload();
    } else {
      errBox.textContent = res.message;
      errBox.style.display = 'block';
      btn.textContent = 'Đăng ký';
      btn.disabled = false;
    }
  });
}

export function destroy() {}
