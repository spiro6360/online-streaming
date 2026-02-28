/**
 * STREAMX - Global Controller (Full Restored Version)
 */

(function() {
  const SUPABASE_URL = 'https://swfntarctmeinyftddtx.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm50YXJjdG1laW55ZnRkZHR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzY0MjcsImV4cCI6MjA4Nzg1MjQyN30.KrgHiEPqCXPnVNIMK1AIiuoUT1iQc4K2w1SX4RHpWVE';
  
  const sbClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

  const state = {
    view: "home",
    isSidebarOpen: true,
    isLoggedIn: false,
    currentUser: null,
    userCash: 0,
    streams: [],
    query: "",
    isNotiOpen: false
  };

  const App = {
    switchView: (viewId) => {
      state.view = viewId;
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

    toggleModal: (show, mode = "login") => {
      const modal = document.getElementById("modal-global");
      if (!modal) return;
      modal.classList.toggle("hidden", !show);
      if (show) {
        document.getElementById("modal-title").textContent = mode === "login" ? "로그인" : "회원가입";
        const fields = document.getElementById("modal-fields");
        if (fields) {
          fields.innerHTML = mode === "register" ? `
            <div class="field"><label>아이디</label><input type="text" id="modal-id" placeholder="사용할 아이디" /></div>
            <div class="field"><label>이메일</label><input type="email" id="modal-email" placeholder="example@email.com" /></div>
            <div class="field"><label>비밀번호</label><input type="password" id="modal-pw" placeholder="6자리 이상 비밀번호" /></div>
          ` : `
            <div class="field"><label>이메일</label><input type="email" id="modal-id" placeholder="가입한 이메일" /></div>
            <div class="field"><label>비밀번호</label><input type="password" id="modal-pw" placeholder="비밀번호" /></div>
          `;
        }
        document.getElementById("txt-modal-switch").textContent = mode === "login" ? "계정이 없으신가요?" : "이미 계정이 있으신가요?";
        document.getElementById("btn-modal-switch").textContent = mode === "login" ? "회원가입" : "로그인";
      }
    },

    toggleLiveModal: (show) => {
      if (show && !state.isLoggedIn) {
        alert("로그인이 필요합니다.");
        App.toggleModal(true, "login");
        return;
      }
      const modal = document.getElementById("modal-live");
      if (modal) modal.classList.toggle("hidden", !show);
    },

    toggleNoti: (show) => {
      state.isNotiOpen = show !== undefined ? show : !state.isNotiOpen;
      document.getElementById("popup-notifications")?.classList.toggle("hidden", !state.isNotiOpen);
    },

    handleAuth: async () => {
      const title = document.getElementById("modal-title").textContent;
      const mode = title === "로그인" ? "login" : "register";
      const email = mode === "register" ? document.getElementById("modal-email")?.value : document.getElementById("modal-id")?.value;
      const password = document.getElementById("modal-pw")?.value;
      const username = document.getElementById("modal-id")?.value;

      if (!email || !password || (mode === "register" && !username)) {
        alert("모든 필드를 입력해 주세요.");
        return;
      }

      try {
        if (mode === "register") {
          const { error } = await sbClient.auth.signUp({
            email, password, options: { data: { username } }
          });
          if (error) throw error;
          alert("회원가입 완료! 인증 메일을 확인해 주세요.");
          App.toggleModal(true, "login");
        } else {
          const { error } = await sbClient.auth.signInWithPassword({ email, password });
          if (error) throw error;
          location.reload();
        }
      } catch (e) { alert(e.message); }
    },

    handleLogout: async () => {
      await sbClient.auth.signOut();
      location.reload();
    },

    render: () => {
      const zoneGuest = document.getElementById("zone-guest");
      const zoneUser = document.getElementById("zone-user");
      if (state.isLoggedIn && state.currentUser) {
        zoneGuest?.classList.add("hidden");
        zoneUser?.classList.remove("hidden");
        const cashEl = document.getElementById("user-cash");
        if (cashEl) cashEl.textContent = state.userCash.toLocaleString();
        const headerAvatar = document.getElementById("header-avatar");
        if (headerAvatar) headerAvatar.src = state.currentUser.avatar_url;
        if (state.view === "mypage") {
          const mpAvatar = document.getElementById("mp-avatar");
          const mpUsername = document.getElementById("mp-username");
          const mpEmail = document.getElementById("mp-email");
          const mpCashVal = document.getElementById("mp-cash-val");
          if (mpAvatar) mpAvatar.src = state.currentUser.avatar_url;
          if (mpUsername) mpUsername.textContent = state.currentUser.username;
          if (mpEmail) mpEmail.textContent = state.currentUser.email;
          if (mpCashVal) mpCashVal.textContent = state.userCash.toLocaleString();
        }
      } else {
        zoneGuest?.classList.remove("hidden");
        zoneUser?.classList.add("hidden");
      }

      const banner = document.getElementById("hero-banner");
      const showBanner = state.streams.length > 0 && state.view === "home" && !state.query;
      banner?.classList.toggle("hidden", !showBanner);
      if (showBanner) {
        const s = state.streams[0];
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
      let filtered = state.streams;
      if (state.query) {
        const q = state.query.toLowerCase();
        filtered = filtered.filter(s => s.title.toLowerCase().includes(q) || s.username.toLowerCase().includes(q));
      }
      if (filtered.length === 0) {
        if (containerId === "grid-home" && !state.query) document.getElementById("empty-state")?.classList.remove("hidden");
        else container.innerHTML = '<div style="grid-column:1/-1; padding:100px; text-align:center; color:#666">방송이 없습니다.</div>';
        return;
      }
      document.getElementById("empty-state")?.classList.add("hidden");
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
      if (state.streams.length === 0) {
        el.innerHTML = '<div style="padding:10px 16px; font-size:12px; color:#666">추천 채널 없음</div>';
        return;
      }
      el.innerHTML = state.streams.slice(0, 5).map(s => `
        <button class="channel-item" onclick="window.app.openStream('${s.id}')">
          <span class="ch-name">${s.username}</span>
        </button>
      `).join("");
    },

    openStream: (id) => {
      const s = state.streams.find(x => x.id === id);
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

  window.app = App;

  document.addEventListener("DOMContentLoaded", async () => {
    document.body.addEventListener("click", (e) => {
      const target = e.target.closest("button, a, .side-link, .m-nav-link, .user-avatar-circle");
      if (!target) { if (state.isNotiOpen) App.toggleNoti(false); return; }
      if (target.dataset.view) { e.preventDefault(); App.switchView(target.dataset.view); }
      if (target.id === "btn-noti-toggle") { e.stopPropagation(); App.toggleNoti(); }
      else { if (state.isNotiOpen) App.toggleNoti(false); }
      if (target.id === "btn-login") App.toggleModal(true, "login");
      if (target.id === "btn-register") App.toggleModal(true, "register");
      if (target.id === "btn-modal-close") App.toggleModal(false);
      if (target.id === "btn-modal-submit") App.handleAuth();
      if (target.id === "btn-modal-switch") {
        const titleEl = document.getElementById("modal-title");
        const isLogin = titleEl && titleEl.textContent === "로그인";
        App.toggleModal(true, isLogin ? "register" : "login");
      }
      if (target.id === "btn-go-live") App.toggleLiveModal(true);
      if (target.id === "btn-live-close") App.toggleLiveModal(false);
      if (target.id === "btn-live-start") {
        const iptTitle = document.getElementById("ipt-live-title");
        const title = iptTitle ? iptTitle.value : "";
        if (!title) return alert("제목을 입력하세요.");
        sbClient.from("streams").insert([{
          user_id: state.currentUser.id, username: state.currentUser.username,
          title, category: document.getElementById("sel-live-cat").value,
          thumbnail_url: "https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?auto=format&fit=crop&q=80&w=800"
        }]).then(() => location.reload());
      }
      if (target.id === "btn-sidebar-toggle") {
        document.getElementById("sidebar")?.classList.toggle("closed");
      }
      if (target.id === "lnk-home-logo") { e.preventDefault(); App.switchView("home"); }
      if (target.id === "btn-my-avatar" || target.id === "btn-m-mypage") {
        App.switchView("mypage");
      }
      if (target.id === "btn-logout") App.handleLogout();
    });

    const iptSearch = document.getElementById("ipt-global-search");
    if (iptSearch) {
      iptSearch.oninput = (e) => {
        state.query = e.target.value.trim();
        const btnClear = document.getElementById("btn-search-clear");
        if (btnClear) btnClear.classList.toggle("hidden", !state.query);
        App.render();
      };
    }

    if (sbClient) {
      const { data: { session } } = await sbClient.auth.getSession();
      if (session?.user) {
        const { data: profile } = await sbClient.from('profiles').select('*').eq('id', session.user.id).single();
        state.isLoggedIn = true;
        state.currentUser = profile;
        state.userCash = profile ? profile.cash : 0;
      }
      const { data: streams } = await sbClient.from('streams').select('*').order('created_at', { ascending: false });
      state.streams = streams || [];
    }
    App.render();
    if (window.lucide) window.lucide.createIcons();
  });
})();
