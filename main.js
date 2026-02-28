/**
 * STREAMX - Global Controller (Final Ultra-Robust Version)
 */

(function() {
  // Use unique constant names to avoid any potential global collisions
  const STREAMX_CONFIG = {
    URL: 'https://swfntarctmeinyftddtx.supabase.co',
    KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm50YXJjdG1laW55ZnRkZHR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzY0MjcsImV4cCI6MjA4Nzg1MjQyN30.KrgHiEPqCXPnVNIMK1AIiuoUT1iQc4K2w1SX4RHpWVE'
  };

  // Safe client initialization
  let dbClient = null;
  try {
    if (window.supabase) {
      dbClient = window.supabase.createClient(STREAMX_CONFIG.URL, STREAMX_CONFIG.KEY);
    }
  } catch (e) {
    console.error("Supabase Client Init Error:", e);
  }

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
    // --- View & Navigation ---
    switchView: (viewId) => {
      console.log("[App] Navigating to:", viewId);
      appState.view = viewId;
      
      document.querySelectorAll(".content-view").forEach(v => v.classList.add("hidden"));
      const target = document.getElementById(`view-${viewId}`);
      if (target) target.classList.remove("hidden");

      document.querySelectorAll(".side-link, .m-nav-link").forEach(n => {
        n.classList.toggle("active", n.dataset.view === viewId);
      });

      App.render();
      const scrollMain = document.getElementById("scroll-main");
      if (scrollMain) scrollMain.scrollTop = 0;
    },

    // --- Modal Control ---
    toggleModal: (show, mode = "login") => {
      console.log("[App] Toggle Modal:", show, mode);
      const modal = document.getElementById("modal-global");
      if (!modal) return;
      
      modal.classList.toggle("hidden", !show);
      if (show) {
        const titleEl = document.getElementById("modal-title");
        const fieldsEl = document.getElementById("modal-fields");
        const switchTxt = document.getElementById("txt-modal-switch");
        const switchBtn = document.getElementById("btn-modal-switch");

        if (titleEl) titleEl.textContent = mode === "login" ? "로그인" : "회원가입";
        if (fieldsEl) {
          fieldsEl.innerHTML = mode === "register" ? `
            <div class="field"><label>아이디</label><input type="text" id="modal-id" placeholder="사용할 아이디" /></div>
            <div class="field"><label>이메일</label><input type="email" id="modal-email" placeholder="example@email.com" /></div>
            <div class="field"><label>비밀번호</label><input type="password" id="modal-pw" placeholder="6자리 이상" /></div>
          ` : `
            <div class="field"><label>이메일</label><input type="email" id="modal-id" placeholder="가입한 이메일" /></div>
            <div class="field"><label>비밀번호</label><input type="password" id="modal-pw" placeholder="비밀번호" /></div>
          `;
        }
        if (switchTxt) switchTxt.textContent = mode === "login" ? "계정이 없으신가요?" : "이미 계정이 있으신가요?";
        if (switchBtn) switchBtn.textContent = mode === "login" ? "회원가입" : "로그인";
      }
    },

    toggleLiveModal: (show) => {
      if (show && !appState.isLoggedIn) {
        alert("로그인이 필요합니다.");
        App.toggleModal(true, "login");
        return;
      }
      document.getElementById("modal-live")?.classList.toggle("hidden", !show);
    },

    toggleNoti: (show) => {
      appState.isNotiOpen = show !== undefined ? show : !appState.isNotiOpen;
      document.getElementById("popup-notifications")?.classList.toggle("hidden", !appState.isNotiOpen);
    },

    // --- Auth Actions ---
    handleAuth: async () => {
      if (!dbClient) return alert("데이터베이스 연결 대기 중...");
      
      const titleEl = document.getElementById("modal-title");
      const mode = titleEl && titleEl.textContent === "로그인" ? "login" : "register";
      
      const idVal = document.getElementById("modal-id")?.value;
      const emailVal = document.getElementById("modal-email")?.value;
      const pwVal = document.getElementById("modal-pw")?.value;

      const email = mode === "register" ? emailVal : idVal;
      const password = pwVal;
      const username = idVal;

      if (!email || !password || (mode === "register" && !username)) {
        return alert("모든 정보를 입력해 주세요.");
      }

      try {
        if (mode === "register") {
          const { error } = await dbClient.auth.signUp({
            email, password, options: { data: { username } }
          });
          if (error) throw error;
          alert("가입 성공! 인증 메일을 확인해 주세요.");
          App.toggleModal(true, "login");
        } else {
          const { error } = await dbClient.auth.signInWithPassword({ email, password });
          if (error) throw error;
          location.reload();
        }
      } catch (e) {
        alert("인증 실패: " + e.message);
      }
    },

    handleLogout: async () => {
      if (dbClient) await dbClient.auth.signOut();
      location.reload();
    },

    // --- Rendering ---
    render: () => {
      // 1. Header Auth
      const zoneGuest = document.getElementById("zone-guest");
      const zoneUser = document.getElementById("zone-user");
      if (appState.isLoggedIn && appState.currentUser) {
        zoneGuest?.classList.add("hidden");
        zoneUser?.classList.remove("hidden");
        const cashEl = document.getElementById("user-cash");
        const avatarEl = document.getElementById("header-avatar");
        if (cashEl) cashEl.textContent = appState.userCash.toLocaleString();
        if (avatarEl) avatarEl.src = appState.currentUser.avatar_url;
        
        if (appState.view === "mypage") {
          const mpAvatar = document.getElementById("mp-avatar");
          const mpUser = document.getElementById("mp-username");
          const mpEmail = document.getElementById("mp-email");
          const mpCash = document.getElementById("mp-cash-val");
          if (mpAvatar) mpAvatar.src = appState.currentUser.avatar_url;
          if (mpUser) mpUser.textContent = appState.currentUser.username;
          if (mpEmail) mpEmail.textContent = appState.currentUser.email;
          if (mpCash) mpCash.textContent = appState.userCash.toLocaleString();
        }
      } else {
        zoneGuest?.classList.remove("hidden");
        zoneUser?.classList.add("hidden");
      }

      // 2. Banner
      const banner = document.getElementById("hero-banner");
      const showBanner = appState.streams.length > 0 && appState.view === "home" && !appState.query;
      banner?.classList.toggle("hidden", !showBanner);
      if (showBanner) {
        const s = appState.streams[0];
        const hTitle = document.getElementById("hero-title-text");
        const hDesc = document.getElementById("hero-desc-text");
        const hWatch = document.getElementById("btn-hero-watch");
        if (hTitle) hTitle.textContent = s.title;
        if (hDesc) hDesc.textContent = `${s.username}님의 라이브!`;
        if (hWatch) hWatch.onclick = () => App.openStream(s.id);
      }

      App.renderGrid("grid-home");
      App.renderGrid("grid-live");
      App.renderSidebar();
    },

    renderGrid: (containerId) => {
      const container = document.getElementById(containerId);
      if (!container) return;
      container.innerHTML = "";
      
      let list = appState.streams;
      if (appState.query) {
        const q = appState.query.toLowerCase();
        list = list.filter(s => s.title.toLowerCase().includes(q) || s.username.toLowerCase().includes(q));
      }

      const emptyState = document.getElementById("empty-state");
      if (list.length === 0) {
        if (containerId === "grid-home" && !appState.query && emptyState) emptyState.classList.remove("hidden");
        else container.innerHTML = '<div style="grid-column:1/-1; padding:80px; text-align:center; color:#888">현재 방송이 없습니다.</div>';
        return;
      }
      if (emptyState) emptyState.classList.add("hidden");

      list.forEach(s => {
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
      const pTitle = document.getElementById("p-title");
      const pCh = document.getElementById("p-ch");
      const pImg = document.getElementById("p-img");
      if (pTitle) pTitle.textContent = s.title;
      if (pCh) pCh.textContent = s.username;
      if (pImg) pImg.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.username}`;
    }
  };

  // Expose to window
  window.app = App;

  // --- Bootstrapping ---
  const init = async () => {
    console.log("[App] Booting...");

    // 1. Global Click Listener (Event Delegation)
    document.body.addEventListener("click", (e) => {
      const target = e.target.closest("button, a, .side-link, .m-nav-link, .user-avatar-circle");
      if (!target) {
        if (appState.isNotiOpen) App.toggleNoti(false);
        return;
      }

      // View switching
      if (target.dataset.view) {
        e.preventDefault();
        App.switchView(target.dataset.view);
        return;
      }

      // ID based actions
      const id = target.id;
      if (id === "btn-login") App.toggleModal(true, "login");
      else if (id === "btn-register") App.toggleModal(true, "register");
      else if (id === "btn-modal-close") App.toggleModal(false);
      else if (id === "btn-modal-submit") App.handleAuth();
      else if (id === "btn-modal-switch") {
        const titleEl = document.getElementById("modal-title");
        const mode = titleEl && titleEl.textContent === "로그인" ? "register" : "login";
        App.toggleModal(true, mode);
      }
      else if (id === "btn-noti-toggle") { e.stopPropagation(); App.toggleNoti(); }
      else if (id === "btn-go-live") App.toggleLiveModal(true);
      else if (id === "btn-live-close") App.toggleLiveModal(false);
      else if (id === "btn-live-start") {
        const title = document.getElementById("ipt-live-title")?.value;
        if (!title) return alert("제목을 입력하세요.");
        const cat = document.getElementById("sel-live-cat")?.value || "game";
        dbClient.from("streams").insert([{
          user_id: appState.currentUser.id, username: appState.currentUser.username,
          title, category: cat, thumbnail_url: "https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?auto=format&fit=crop&q=80&w=800"
        }]).then(() => location.reload());
      }
      else if (id === "btn-sidebar-toggle") document.getElementById("sidebar")?.classList.toggle("closed");
      else if (id === "lnk-home-logo") { e.preventDefault(); App.switchView("home"); }
      else if (id === "btn-my-avatar" || id === "btn-m-mypage") App.switchView("mypage");
      else if (id === "btn-logout") App.handleLogout();

      // Close noti if clicked elsewhere
      if (id !== "btn-noti-toggle" && appState.isNotiOpen) App.toggleNoti(false);
    });

    // 2. Search Input
    const searchInput = document.getElementById("ipt-global-search");
    if (searchInput) {
      searchInput.oninput = (e) => {
        appState.query = e.target.value.trim();
        document.getElementById("btn-search-clear")?.classList.toggle("hidden", !appState.query);
        App.render();
      };
    }

    // 3. Data Sync
    if (dbClient) {
      const { data: { session } } = await dbClient.auth.getSession();
      if (session?.user) {
        const { data: profile } = await dbClient.from('profiles').select('*').eq('id', session.user.id).single();
        appState.isLoggedIn = true;
        appState.currentUser = profile;
        appState.userCash = profile ? profile.cash : 0;
      }
      const { data: streams } = await dbClient.from('streams').select('*').order('created_at', { ascending: false });
      appState.streams = streams || [];
    }

    App.render();
    if (window.lucide) window.lucide.createIcons();
  };

  // Run init
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
