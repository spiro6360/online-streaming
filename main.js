/**
 * STREAMX - Global Controller (Final Complete Robust Version)
 */

(function() {
  // 1. Supabase Initialization (Unique names to avoid collisions)
  const SX_URL = 'https://swfntarctmeinyftddtx.supabase.co';
  const SX_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm50YXJjdG1laW55ZnRkZHR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzY0MjcsImV4cCI6MjA4Nzg1MjQyN30.KrgHiEPqCXPnVNIMK1AIiuoUT1iQc4K2w1SX4RHpWVE';
  const sxClient = window.supabase ? window.supabase.createClient(SX_URL, SX_KEY) : null;

  const appState = {
    view: "home",
    isLoggedIn: false,
    currentUser: null,
    userCash: 0,
    streams: [],
    query: "",
    isNotiOpen: false
  };

  const App = {
    // --- View & UI Control ---
    switchView: (viewId) => {
      console.log("[App] Navigating:", viewId);
      appState.view = viewId;
      
      document.querySelectorAll(".content-view").forEach(v => v.classList.add("hidden"));
      const target = document.getElementById(`view-${viewId}`);
      if (target) target.classList.remove("hidden");

      document.querySelectorAll(".side-link, .m-nav-link").forEach(n => {
        n.classList.toggle("active", n.dataset.view === viewId);
      });

      App.render();
      const scrollArea = document.getElementById("scroll-main");
      if (scrollArea) scrollArea.scrollTop = 0;
    },

    toggleModal: (show, mode = "login") => {
      const modal = document.getElementById("modal-global");
      if (!modal) return;
      
      modal.classList.toggle("hidden", !show);
      if (show) {
        document.getElementById("modal-title").textContent = mode === "login" ? "로그인" : "회원가입";
        const fields = document.getElementById("modal-fields");
        if (fields) {
          // Fields: Login uses email/pw, Register adds username
          fields.innerHTML = mode === "register" ? `
            <div class="field"><label>사용할 아이디(닉네임)</label><input type="text" id="modal-id" placeholder="닉네임 입력" /></div>
            <div class="field"><label>이메일 주소</label><input type="email" id="modal-email" placeholder="email@example.com" /></div>
            <div class="field"><label>비밀번호</label><input type="password" id="modal-pw" placeholder="6자리 이상 비밀번호" /></div>
          ` : `
            <div class="field"><label>이메일 주소</label><input type="email" id="modal-email" placeholder="가입한 이메일 입력" /></div>
            <div class="field"><label>비밀번호</label><input type="password" id="modal-pw" placeholder="비밀번호" /></div>
          `;
        }
        document.getElementById("txt-modal-switch").textContent = mode === "login" ? "계정이 없으신가요?" : "이미 계정이 있으신가요?";
        document.getElementById("btn-modal-switch").textContent = mode === "login" ? "회원가입" : "로그인";
      }
    },

    toggleLiveModal: (show) => {
      if (show && !appState.isLoggedIn) {
        alert("로그인이 필요한 기능입니다.");
        App.toggleModal(true, "login");
        return;
      }
      document.getElementById("modal-live")?.classList.toggle("hidden", !show);
    },

    toggleNoti: (show) => {
      appState.isNotiOpen = show !== undefined ? show : !appState.isNotiOpen;
      document.getElementById("popup-notifications")?.classList.toggle("hidden", !appState.isNotiOpen);
    },

    // --- Authentication ---
    handleAuth: async () => {
      if (!sxClient) return alert("데이터베이스 연결 실패");
      
      const title = document.getElementById("modal-title").textContent;
      const mode = title === "로그인" ? "login" : "register";
      
      const email = document.getElementById("modal-email")?.value.trim();
      const password = document.getElementById("modal-pw")?.value.trim();
      const username = document.getElementById("modal-id")?.value.trim();

      if (!email || !password || (mode === "register" && !username)) {
        return alert("모든 항목을 정확히 입력해 주세요.");
      }

      try {
        if (mode === "register") {
          // Register with metadata for trigger to handle profile creation
          const { error } = await sxClient.auth.signUp({
            email, password, options: { data: { username } }
          });
          if (error) throw error;
          alert("회원가입 성공! 메일함에서 인증 링크를 클릭한 후 로그인해 주세요.");
          App.toggleModal(true, "login");
        } else {
          // Login
          const { error } = await sxClient.auth.signInWithPassword({ email, password });
          if (error) throw error;
          location.reload(); // Refresh to trigger session load
        }
      } catch (err) {
        alert("인증 오류: " + err.message);
      }
    },

    handleLogout: async () => {
      if (sxClient) await sxClient.auth.signOut();
      location.reload();
    },

    // --- Data Handling ---
    loadStreams: async () => {
      if (!sxClient) return;
      const { data, error } = await sxClient.from('streams').select('*').order('created_at', { ascending: false });
      if (!error) appState.streams = data || [];
      App.render();
    },

    checkSession: async () => {
      if (!sxClient) return;
      const { data: { session } } = await sxClient.auth.getSession();
      if (session?.user) {
        const { data: profile } = await sxClient.from('profiles').select('*').eq('id', session.user.id).single();
        appState.isLoggedIn = true;
        appState.currentUser = profile;
        appState.userCash = profile ? profile.cash : 0;
      }
      App.render();
    },

    // --- Rendering ---
    render: () => {
      // 1. Auth UI
      const zoneGuest = document.getElementById("zone-guest");
      const zoneUser = document.getElementById("zone-user");
      if (appState.isLoggedIn && appState.currentUser) {
        zoneGuest?.classList.add("hidden");
        zoneUser?.classList.remove("hidden");
        document.getElementById("user-cash").textContent = appState.userCash.toLocaleString();
        document.getElementById("header-avatar").src = appState.currentUser.avatar_url;
        
        if (appState.view === "mypage") {
          document.getElementById("mp-avatar").src = appState.currentUser.avatar_url;
          document.getElementById("mp-username").textContent = appState.currentUser.username;
          document.getElementById("mp-email").textContent = appState.currentUser.email;
          document.getElementById("mp-cash-val").textContent = appState.userCash.toLocaleString();
        }
      } else {
        zoneGuest?.classList.remove("hidden");
        zoneUser?.classList.add("hidden");
      }

      // 2. Hero Banner
      const banner = document.getElementById("hero-banner");
      const hasStreams = appState.streams.length > 0;
      const showBanner = hasStreams && appState.view === "home" && !appState.query;
      banner?.classList.toggle("hidden", !showBanner);
      if (showBanner) {
        const s = appState.streams[0];
        document.getElementById("hero-title-text").textContent = s.title;
        document.getElementById("hero-desc-text").textContent = `${s.username}님의 실시간 스트리밍`;
        document.getElementById("btn-hero-watch").onclick = () => App.openStream(s.id);
      }

      // 3. Grid Update
      App.renderGrid("grid-home");
      App.renderGrid("grid-live");
      App.renderSidebar();
    },

    renderGrid: (containerId) => {
      const container = document.getElementById(containerId);
      if (!container) return;
      container.innerHTML = "";
      
      let filtered = appState.streams;
      if (appState.query) {
        const q = appState.query.toLowerCase();
        filtered = filtered.filter(s => s.title.toLowerCase().includes(q) || s.username.toLowerCase().includes(q));
      }

      const empty = document.getElementById("empty-state");
      if (filtered.length === 0) {
        if (containerId === "grid-home" && !appState.query && empty) empty.classList.remove("hidden");
        else container.innerHTML = '<div style="grid-column:1/-1; padding:100px; text-align:center; color:#888">현재 방송 중인 채널이 없습니다.</div>';
        return;
      }
      if (empty) empty.classList.add("hidden");

      filtered.forEach(s => {
        const card = document.createElement("div");
        card.className = "stream-card";
        card.innerHTML = `
          <div class="thumb-box"><img src="${s.thumbnail_url}" /></div>
          <div class="card-details"><div class="card-txt">
            <div class="c-title">${s.title}</div><div class="c-channel">${s.username}</div>
          </div></div>
        `;
        card.onclick = () => App.openStream(s.id);
        container.appendChild(card);
      });
    },

    renderSidebar: () => {
      const el = document.getElementById("list-recommended");
      if (!el) return;
      if (appState.streams.length === 0) {
        el.innerHTML = '<div style="padding:16px; font-size:13px; color:#888">추천 없음</div>';
        return;
      }
      el.innerHTML = appState.streams.slice(0, 5).map(s => `
        <button class="channel-item" onclick="window.app.openStream('${s.id}')">
          <span class="ch-name">${s.username}</span>
        </button>
      `).join("");
    },

    openStream: (id) => {
      const s = appState.streams.find(x => x.id === id);
      if (!s) return;
      App.switchView("player");
      document.getElementById("p-title").textContent = s.title;
      document.getElementById("p-ch").textContent = s.username;
      document.getElementById("p-img").src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.username}`;
    }
  };

  // --- Initial Bootstrap ---
  window.app = App; // Expose to global

  document.addEventListener("DOMContentLoaded", () => {
    console.log("[StreamX] Booting System...");

    // Event Delegation (Unified Click Handler)
    document.body.addEventListener("click", (e) => {
      const t = e.target.closest("button, a, .side-link, .m-nav-link, .user-avatar-circle");
      if (!t) {
        if (appState.isNotiOpen) App.toggleNoti(false);
        return;
      }

      if (t.dataset.view) { e.preventDefault(); App.switchView(t.dataset.view); return; }
      
      const id = t.id;
      if (id === "btn-noti-toggle") { e.stopPropagation(); App.toggleNoti(); }
      else { if (appState.isNotiOpen) App.toggleNoti(false); }

      if (id === "btn-login") App.toggleModal(true, "login");
      else if (id === "btn-register") App.toggleModal(true, "register");
      else if (id === "btn-modal-close") App.toggleModal(false);
      else if (id === "btn-modal-submit") App.handleAuth();
      else if (id === "btn-modal-switch") {
        const title = document.getElementById("modal-title")?.textContent;
        App.toggleModal(true, title === "로그인" ? "register" : "login");
      }
      else if (id === "btn-go-live") App.toggleLiveModal(true);
      else if (id === "btn-live-close") App.toggleLiveModal(false);
      else if (id === "btn-live-start") {
        const title = document.getElementById("ipt-live-title")?.value;
        if (!title) return alert("제목을 입력하세요.");
        sxClient.from("streams").insert([{
          user_id: appState.currentUser.id, username: appState.currentUser.username,
          title, category: document.getElementById("sel-live-cat").value,
          thumbnail_url: "https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?auto=format&fit=crop&q=80&w=800"
        }]).then(() => location.reload());
      }
      else if (id === "btn-sidebar-toggle") document.getElementById("sidebar")?.classList.toggle("closed");
      else if (id === "lnk-home-logo") { e.preventDefault(); App.switchView("home"); }
      else if (id === "btn-my-avatar" || id === "btn-m-mypage") App.switchView("mypage");
      else if (id === "btn-logout") App.handleLogout();
    });

    // Search Handler
    const searchIpt = document.getElementById("ipt-global-search");
    if (searchIpt) {
      searchIpt.oninput = (e) => {
        appState.query = e.target.value.trim();
        document.getElementById("btn-search-clear")?.classList.toggle("hidden", !appState.query);
        App.render();
      };
    }

    // Startup Data Load
    App.checkSession();
    App.loadStreams();
    if (window.lucide) window.lucide.createIcons();
  });
})();
