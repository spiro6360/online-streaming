/**
 * STREAMX - Global Controller (Direct Binding Version)
 */

(function() {
  console.log("[StreamX] System Loading...");

  // 1. Supabase Initialization
  const SUPABASE_URL = 'https://swfntarctmeinyftddtx.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm50YXJjdG1laW55ZnRkZHR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzY0MjcsImV4cCI6MjA4Nzg1MjQyN30.KrgHiEPqCXPnVNIMK1AIiuoUT1iQc4K2w1SX4RHpWVE';
  const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

  const App = {
    state: { 
      view: "home", 
      isLoggedIn: false, 
      currentUser: null, 
      userCash: 0,
      streams: [],
      query: ""
    },

    // [중요] 모달 제어 함수
    toggleModal(show, mode = "login") {
      console.log(`[StreamX] toggleModal logic: show=${show}, mode=${mode}`);
      const modal = document.getElementById("modal-global");
      if (!modal) return console.error("Modal element not found in DOM");

      if (show) {
        modal.classList.remove("hidden");
        modal.style.display = "flex";
        
        const titleEl = document.getElementById("modal-title");
        if (titleEl) titleEl.textContent = mode === "login" ? "로그인" : "회원가입";
        
        const fields = document.getElementById("modal-fields");
        if (fields) {
          if (mode === "register") {
            this.state.isUsernameChecked = false; // 중복체크 상태 초기화
            fields.innerHTML = `
              <div class="field">
                <label>닉네임</label>
                <div style="display:flex; gap:8px;">
                  <input type="text" id="modal-username" placeholder="사용할 닉네임" style="flex:1" autofocus />
                  <button type="button" id="btn-check-user" class="secondary-btn" style="padding:0 12px; font-size:12px; white-space:nowrap;">중복확인</button>
                </div>
                <div id="user-check-msg" style="font-size:11px; margin-top:4px; height:14px;"></div>
              </div>
              <div class="field"><label>이메일</label><input type="email" id="modal-email" placeholder="email@example.com" /></div>
              <div class="field"><label>비밀번호</label><input type="password" id="modal-pw" placeholder="6자리 이상 비밀번호" /></div>
            `;
            // 중복 확인 이벤트 바인딩
            setTimeout(() => {
              const checkBtn = document.getElementById("btn-check-user");
              if (checkBtn) checkBtn.onclick = () => this.checkUsername();
            }, 0);
          } else {
            fields.innerHTML = `
              <div class="field"><label>이메일</label><input type="email" id="modal-email" placeholder="email@example.com" autofocus /></div>
              <div class="field"><label>비밀번호</label><input type="password" id="modal-pw" placeholder="비밀번호" /></div>
            `;
          }
        }
        
        const switchTxt = document.getElementById("txt-modal-switch");
        if (switchTxt) switchTxt.textContent = mode === "login" ? "계정이 없으신가요?" : "이미 계정이 있으신가요?";
        const switchBtn = document.getElementById("btn-modal-switch");
        if (switchBtn) {
          switchBtn.textContent = mode === "login" ? "회원가입" : "로그인";
          switchBtn.onclick = () => this.toggleModal(true, mode === "login" ? "register" : "login");
        }
        
        const submitBtn = document.getElementById("btn-modal-submit");
        if (submitBtn) {
          submitBtn.onclick = () => this.handleAuth();
          submitBtn.disabled = false;
          submitBtn.textContent = "계속하기";
        }

        const closeBtn = document.getElementById("btn-modal-close");
        if (closeBtn) closeBtn.onclick = () => this.toggleModal(false);
      } else {
        modal.classList.add("hidden");
        modal.style.display = "none";
      }
    },

    async checkUsername() {
      const username = document.getElementById("modal-username")?.value.trim();
      const msgEl = document.getElementById("user-check-msg");
      if (!username || username.length < 2) {
        if (msgEl) { msgEl.style.color = "#ff4d4d"; msgEl.textContent = "닉네임을 2자 이상 입력해주세요."; }
        return;
      }

      const btn = document.getElementById("btn-check-user");
      if (btn) btn.disabled = true;

      try {
        const { data, error } = await supabase.from('profiles').select('username').eq('username', username).maybeSingle();
        if (error) throw error;
        
        if (data) {
          this.state.isUsernameChecked = false;
          if (msgEl) { msgEl.style.color = "#ff4d4d"; msgEl.textContent = "이미 사용 중인 닉네임입니다."; }
        } else {
          this.state.isUsernameChecked = true;
          this.state.checkedUsername = username;
          if (msgEl) { msgEl.style.color = "#4ade80"; msgEl.textContent = "사용 가능한 닉네임입니다."; }
        }
      } catch (e) {
        console.error(e);
        alert("중복 확인 중 오류가 발생했습니다.");
      } finally {
        if (btn) btn.disabled = false;
      }
    },

    async handleAuth() {
      if (!supabase) return alert("데이터베이스 연결 실패");
      const titleEl = document.getElementById("modal-title");
      const mode = titleEl && titleEl.textContent === "회원가입" ? "register" : "login";
      
      const email = document.getElementById("modal-email")?.value.trim();
      const password = document.getElementById("modal-pw")?.value.trim();
      const username = document.getElementById("modal-username")?.value.trim();

      if (!email || !password) return alert("이메일과 비밀번호를 입력해주세요.");

      if (mode === "register") {
        if (!username) return alert("닉네임을 입력해주세요.");
        if (!this.state.isUsernameChecked || this.state.checkedUsername !== username) {
          return alert("닉네임 중복 확인을 해주세요.");
        }
        if (password.length < 6) return alert("비밀번호는 6자리 이상이어야 합니다.");
      }

      const btn = document.getElementById("btn-modal-submit");
      if (btn) { btn.disabled = true; btn.textContent = "처리 중..."; }

      try {
        if (mode === "register") {
          const { error } = await supabase.auth.signUp({ 
            email, 
            password, 
            options: { data: { username } } 
          });
          if (error) {
            if (error.message.includes("User already registered")) {
              throw new Error("이미 가입된 이메일입니다.");
            }
            throw error;
          }
          alert("회원가입 성공! 메일함(또는 스팸함)에서 인증 메일을 확인한 후 로그인해 주세요.");
          this.toggleModal(true, "login");
        } else {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
          location.reload();
        }
      } catch (e) {
        alert("알림: " + e.message);
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = "계속하기"; }
      }
    },

    async init() {
      console.log("[StreamX] App initializing...");
      this.bindGlobalEvents();
      this.checkSession();
      this.loadStreams();
      if (window.lucide) window.lucide.createIcons();
    },

    bindGlobalEvents() {
      document.addEventListener("click", (e) => {
        const t = e.target.closest("[data-view], #btn-logout, #btn-sidebar-toggle, #lnk-home-logo");
        if (!t) return;

        if (t.dataset.view) { e.preventDefault(); this.switchView(t.dataset.view); }
        else if (t.id === "btn-logout") { supabase.auth.signOut().then(() => location.reload()); }
        else if (t.id === "btn-sidebar-toggle") { document.getElementById("sidebar")?.classList.toggle("closed"); }
        else if (t.id === "lnk-home-logo") { e.preventDefault(); this.switchView("home"); }
      });
    },

    async checkSession() {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        this.state.isLoggedIn = true;
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        this.state.currentUser = profile || { username: "User", avatar_url: "" };
      }
      this.render();
    },

    async loadStreams() {
      if (!supabase) return;
      const { data } = await supabase.from('streams').select('*').order('created_at', { ascending: false });
      this.state.streams = data || [];
      this.render();
    },

    switchView(id) {
      this.state.view = id;
      document.querySelectorAll(".content-view").forEach(v => v.classList.add("hidden"));
      document.getElementById(`view-${id}`)?.classList.remove("hidden");
      document.querySelectorAll(".side-link, .m-nav-link").forEach(n => n.classList.toggle("active", n.dataset.view === id));
      this.render();
    },

    render() {
      const guest = document.getElementById("zone-guest");
      const user = document.getElementById("zone-user");
      if (this.state.isLoggedIn && this.state.currentUser) {
        guest?.classList.add("hidden");
        user?.classList.remove("hidden");
        const cash = document.getElementById("user-cash");
        if (cash) cash.textContent = (this.state.currentUser.cash || 0).toLocaleString();
        const av = document.getElementById("header-avatar");
        if (av) av.src = this.state.currentUser.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${this.state.currentUser.id}`;
      } else {
        guest?.classList.remove("hidden");
        user?.classList.add("hidden");
      }
      this.renderGrid("grid-home");
      this.renderGrid("grid-live");
    },

    renderGrid(id) {
      const el = document.getElementById(id);
      if (!el) return;
      el.innerHTML = this.state.streams.length ? this.state.streams.map(s => `
        <div class="stream-card" onclick="window.app.openStream('${s.id}')">
          <div class="thumb-box"><img src="${s.thumbnail_url}" /></div>
          <div class="card-details"><div class="card-txt"><div class="c-title">${s.title}</div><div class="c-channel">${s.username}</div></div></div>
        </div>
      `).join("") : '<div style="grid-column:1/-1; padding:80px; text-align:center; color:#888">현재 방송이 없습니다.</div>';
    },

    openStream(id) {
      const s = this.state.streams.find(x => x.id === id);
      if (!s) return;
      this.switchView("player");
      document.getElementById("p-title").textContent = s.title;
      document.getElementById("p-ch").textContent = s.username;
      document.getElementById("p-img").src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.username}`;
    }
  };

  window.app = App;
  document.addEventListener("DOMContentLoaded", () => App.init());
})();
