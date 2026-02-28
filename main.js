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
      query: "",
      hls: null
    },

    // --- Core UI Logic ---
    toggleModal(show, mode = "login") {
      console.log(`[App] Modal Toggle: ${show}, Mode: ${mode}`);
      const modal = document.getElementById("modal-global");
      if (!modal) return console.error("Modal element not found!");

      if (show) {
        modal.classList.remove("hidden");
        modal.style.display = "flex";
        
        const titleEl = document.getElementById("modal-title");
        const fieldsEl = document.getElementById("modal-fields");
        const switchTxtEl = document.getElementById("txt-modal-switch");
        const switchBtnEl = document.getElementById("btn-modal-switch");

        if (titleEl) titleEl.textContent = mode === "login" ? "로그인" : "회원가입";
        
        if (fieldsEl) {
          if (mode === "register") {
            fieldsEl.innerHTML = `
              <div class="field">
                <label>닉네임</label>
                <div style="display:flex; gap:8px;">
                  <input type="text" id="modal-id" placeholder="사용할 닉네임" autofocus style="flex:1" />
                  <button type="button" id="btn-check-nick" class="secondary-btn" style="padding:0 12px; font-size:12px; white-space:nowrap;">중복확인</button>
                </div>
                <small id="nick-msg" style="display:block; margin-top:4px; font-size:11px;"></small>
              </div>
              <div class="field"><label>이메일</label><input type="email" id="modal-email" placeholder="email@example.com" /></div>
              <div class="field"><label>비밀번호</label><input type="password" id="modal-pw" placeholder="6자리 이상 비밀번호" /></div>
            `;
          } else {
            fieldsEl.innerHTML = `
              <div class="field"><label>이메일</label><input type="email" id="modal-email" placeholder="이메일 입력" autofocus /></div>
              <div class="field"><label>비밀번호</label><input type="password" id="modal-pw" placeholder="비밀번호" /></div>
            `;
          }
        }
        
        this.state.isNickChecked = false;
        this.state.checkedNick = "";

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

    async checkUsername() {
      const client = getClient();
      const nickInput = document.getElementById("modal-id");
      const msgEl = document.getElementById("nick-msg");
      const nick = nickInput?.value.trim();

      if (!nick) return alert("닉네임을 입력해 주세요.");
      if (nick.length < 2) return alert("닉네임은 2자 이상이어야 합니다.");

      try {
        const { data, error } = await client.from('profiles').select('username').eq('username', nick);
        if (error) throw error;

        if (data && data.length > 0) {
          msgEl.textContent = "이미 사용 중인 닉네임입니다.";
          msgEl.style.color = "#ff4d4d";
          this.state.isNickChecked = false;
        } else {
          msgEl.textContent = "사용 가능한 닉네임입니다.";
          msgEl.style.color = "#4dff4d";
          this.state.isNickChecked = true;
          this.state.checkedNick = nick;
        }
      } catch (err) {
        console.error("Nick check error:", err);
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

      if (viewId !== "player" && this.state.hls) {
        this.state.hls.destroy();
        this.state.hls = null;
      }

      this.render();
    },

    toggleStreamKey() {
      const el = document.getElementById("stream-key-val");
      if (el.type === "password") {
        el.type = "text";
        el.value = this.state.currentUser?.stream_key || "N/A";
      } else {
        el.type = "password";
        el.value = "********";
      }
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

      if (mode === "register") {
        if (!this.state.isNickChecked || this.state.checkedNick !== username) {
          return alert("닉네임 중복 확인을 해주세요.");
        }
        if (password.length < 6) return alert("비밀번호는 6자리 이상이어야 합니다.");
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "처리 중...";
      }

      try {
        if (mode === "register") {
          const { error } = await client.auth.signUp({ 
            email, 
            password, 
            options: { data: { username } } 
          });
          if (error) throw error;
          alert("회원가입 신청 성공! 메일을 확인한 후 로그인해 주세요.");
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
        this.state.currentUser = profile;
      }
      this.render();
    },

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
        zoneGuest?.classList.add("hidden");
        zoneUser?.classList.remove("hidden");
        
        const cashEls = [document.getElementById("user-cash"), document.getElementById("mp-cash-val")];
        cashEls.forEach(el => { if (el) el.textContent = this.state.currentUser.cash?.toLocaleString() || "0"; });
        
        const avatarEls = [document.getElementById("header-avatar"), document.getElementById("mp-avatar")];
        avatarEls.forEach(el => { if (el) el.src = this.state.currentUser.avatar_url; });

        if (document.getElementById("mp-username")) document.getElementById("mp-username").textContent = this.state.currentUser.username;
        if (document.getElementById("mp-email")) document.getElementById("mp-email").textContent = this.state.currentUser.email;
      } else {
        zoneGuest?.classList.remove("hidden");
        zoneUser?.classList.add("hidden");
      }
      this.renderGrids();
    },

    renderGrids() {
      const configs = [
        { id: "grid-home", filter: s => s.status === "live" },
        { id: "grid-live", filter: s => s.status === "live" },
        { id: "grid-vod", filter: s => s.status === "vod" }
      ];

      configs.forEach(cfg => {
        const el = document.getElementById(cfg.id);
        if (!el) return;
        const filtered = this.state.streams.filter(cfg.filter);
        el.innerHTML = filtered.length ? filtered.map(s => `
          <div class="stream-card" onclick="window.app.openStream('${s.id}')">
            <div class="thumb-box"><img src="${s.thumbnail_url || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400'}" /></div>
            <div class="card-details">
              <div class="card-txt">
                <div class="c-title">${s.title}</div>
                <div class="c-channel">${s.username}</div>
              </div>
            </div>
          </div>
        `).join("") : '<div class="empty-msg" style="padding:40px; color:#888;">내역이 없습니다.</div>';
      });
    },

    openStream(id) {
      const s = this.state.streams.find(x => x.id === id);
      if (!s) return;
      this.switchView("player");
      document.getElementById("p-title").textContent = s.title;
      document.getElementById("p-ch").textContent = s.username;
      document.getElementById("p-img").src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.username}`;

      const video = document.getElementById("main-video");
      // 실제 구현 시: 미디어 서버에서 제공하는 HLS 경로 (예: https://server.com/live/stream_key/index.m3u8)
      // 여기서는 테스트를 위한 샘플 HLS 경로를 사용합니다.
      const source = "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8";

      if (window.Hls && window.Hls.isSupported()) {
        const hls = new window.Hls();
        hls.loadSource(source);
        hls.attachMedia(video);
        this.state.hls = hls;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = source;
      }
    }
  };

  window.app = App;
  document.addEventListener("DOMContentLoaded", () => {
    App.checkSession();
    App.loadStreams();

    document.addEventListener("click", (e) => {
      const t = e.target.closest("button, a, .side-link, .m-nav-link");
      if (!t) return;

      const id = t.id;
      if (t.dataset.view) {
        e.preventDefault();
        App.switchView(t.dataset.view);
      } else if (id === "btn-check-nick") {
        App.checkUsername();
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
