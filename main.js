/**
 * STREAMX - Global Controller (Ultra-Robust Version)
 */

(function() {
  console.log("[StreamX] Booting...");

  // 1. Supabase Initialization
  const SX_URL = 'https://swfntarctmeinyftddtx.supabase.co';
  const SX_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm50YXJjdG1laW55ZnRkZHR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzY0MjcsImV4cCI6MjA4Nzg1MjQyN30.KrgHiEPqCXPnVNIMK1AIiuoUT1iQc4K2w1SX4RHpWVE';
  let sxClient = null;

  function getClient() {
    if (!sxClient && window.supabase) {
      sxClient = window.supabase.createClient(SX_URL, SX_KEY);
    }
    return sxClient;
  }

  const App = {
    state: {
      isLoggedIn: false,
      currentUser: null,
      streams: [],
      query: ""
    },

    // --- Core UI Logic ---
    toggleModal(show, mode = "login") {
      console.log(`[App] Modal Toggle: ${show}, Mode: ${mode}`);
      const modal = document.getElementById("modal-global");
      if (!modal) return console.error("Modal element not found!");

      if (show) {
        modal.classList.remove("hidden");
        // Force display flex in case class toggle isn't enough
        modal.style.display = "flex";
        
        const titleEl = document.getElementById("modal-title");
        const fieldsEl = document.getElementById("modal-fields");
        const switchTxtEl = document.getElementById("txt-modal-switch");
        const switchBtnEl = document.getElementById("btn-modal-switch");

        if (titleEl) titleEl.textContent = mode === "login" ? "로그인" : "회원가입";
        
        if (fieldsEl) {
          fieldsEl.innerHTML = mode === "register" ? `
            <div class="field"><label>닉네임</label><input type="text" id="modal-id" placeholder="사용할 닉네임" autofocus /></div>
            <div class="field"><label>이메일</label><input type="email" id="modal-email" placeholder="email@example.com" /></div>
            <div class="field"><label>비밀번호</label><input type="password" id="modal-pw" placeholder="6자리 이상 비밀번호" /></div>
          ` : `
            <div class="field"><label>이메일</label><input type="email" id="modal-email" placeholder="이메일 입력" autofocus /></div>
            <div class="field"><label>비밀번호</label><input type="password" id="modal-pw" placeholder="비밀번호" /></div>
          `;
        }
        
        if (switchTxtEl) switchTxtEl.textContent = mode === "login" ? "계정이 없으신가요?" : "이미 계정이 있으신가요?";
        if (switchBtnEl) switchBtnEl.textContent = mode === "login" ? "회원가입" : "로그인";
        
        const submitBtn = document.getElementById("btn-modal-submit");
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "계속하기";
          submitBtn.dataset.mode = mode;
        }
      } else {
        modal.classList.add("hidden");
        modal.style.display = "none";
      }
    },

    switchView(viewId) {
      console.log("[App] Switch View:", viewId);
      document.querySelectorAll(".content-view").forEach(v => v.classList.add("hidden"));
      const target = document.getElementById(`view-${viewId}`);
      if (target) target.classList.remove("hidden");
      
      document.querySelectorAll(".side-link, .m-nav-link").forEach(n => {
        n.classList.toggle("active", n.dataset.view === viewId);
      });
    },

    // --- Authentication ---
    async handleAuth() {
      const client = getClient();
      if (!client) return alert("데이터베이스 연결 대기 중...");

      const submitBtn = document.getElementById("btn-modal-submit");
      const mode = submitBtn ? submitBtn.dataset.mode : "login";
      
      const email = document.getElementById("modal-email")?.value.trim();
      const password = document.getElementById("modal-pw")?.value.trim();
      const username = document.getElementById("modal-id")?.value.trim();

      if (!email || !password || (mode === "register" && !username)) {
        return alert("모든 정보를 입력해 주세요.");
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "처리 중...";
      }

      try {
        if (mode === "register") {
          const { error } = await client.auth.signUp({ email, password, options: { data: { username } } });
          if (error) throw error;
          alert("회원가입 성공! 메일을 확인한 후 로그인해 주세요.");
          this.toggleModal(true, "login");
        } else {
          const { error } = await client.auth.signInWithPassword({ email, password });
          if (error) throw error;
          location.reload();
        }
      } catch (err) {
        alert("오류: " + err.message);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "계속하기";
        }
      }
    },

    async checkSession() {
      const client = getClient();
      if (!client) return;
      const { data: { session } } = await client.auth.getSession();
      if (session?.user) {
        this.state.isLoggedIn = true;
        const { data: profile } = await client.from('profiles').select('*').eq('id', session.user.id).single();
        if (profile) {
          this.state.currentUser = profile;
        } else {
          this.state.currentUser = { id: session.user.id, username: session.user.user_metadata?.username || "사용자", avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.id}` };
        }
      }
      this.render();
    },

    // --- Data & Rendering ---
    async loadStreams() {
      const client = getClient();
      if (!client) return;
      const { data, error } = await client.from('streams').select('*').order('created_at', { ascending: false });
      if (!error) {
        this.state.streams = data || [];
        this.renderGrids();
      }
    },

    render() {
      const zoneGuest = document.getElementById("zone-guest");
      const zoneUser = document.getElementById("zone-user");
      
      if (this.state.isLoggedIn && this.state.currentUser) {
        if (zoneGuest) zoneGuest.classList.add("hidden");
        if (zoneUser) zoneUser.classList.remove("hidden");
        const cashEl = document.getElementById("user-cash");
        if (cashEl) cashEl.textContent = "1,250"; // Default or from profile
        const avatarEl = document.getElementById("header-avatar");
        if (avatarEl) avatarEl.src = this.state.currentUser.avatar_url;
      } else {
        if (zoneGuest) zoneGuest.classList.remove("hidden");
        if (zoneUser) zoneUser.classList.add("hidden");
      }
      this.renderGrids();
    },

    renderGrids() {
      const containers = ["grid-home", "grid-live"];
      containers.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.innerHTML = "";
        this.state.streams.forEach(s => {
          const card = document.createElement("div");
          card.className = "stream-card";
          card.innerHTML = `
            <div class="thumb-box"><img src="${s.thumbnail_url}" /></div>
            <div class="card-details">
              <div class="card-txt">
                <div class="c-title">${s.title}</div>
                <div class="c-channel">${s.username}</div>
              </div>
            </div>
          `;
          card.onclick = () => this.openStream(s.id);
          el.appendChild(card);
        });
      });
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

  // --- Initialize ---
  document.addEventListener("DOMContentLoaded", () => {
    App.checkSession();
    App.loadStreams();

    // Global Click Handler
    document.addEventListener("click", (e) => {
      const t = e.target.closest("button, a, .side-link, .m-nav-link");
      if (!t) return;

      const id = t.id;
      console.log("[App] Global Click:", id || t.className);

      if (t.dataset.view) {
        e.preventDefault();
        App.switchView(t.dataset.view);
      } else if (id === "btn-login") {
        App.toggleModal(true, "login");
      } else if (id === "btn-register") {
        App.toggleModal(true, "register");
      } else if (id === "btn-modal-close") {
        App.toggleModal(false);
      } else if (id === "btn-modal-switch") {
        const title = document.getElementById("modal-title")?.textContent;
        App.toggleModal(true, title === "로그인" ? "register" : "login");
      } else if (id === "btn-modal-submit") {
        App.handleAuth();
      } else if (id === "btn-logout") {
        const client = getClient();
        if (client) client.auth.signOut().then(() => location.reload());
      } else if (id === "lnk-home-logo") {
        e.preventDefault();
        App.switchView("home");
      }
    });

    if (window.lucide) window.lucide.createIcons();
  });

})();
