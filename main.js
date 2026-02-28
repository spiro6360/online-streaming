/**
 * STREAMX - Global Controller (Final Complete Version)
 */

(function() {
  // 1. Supabase Configuration
  const SUPABASE_URL = 'https://swfntarctmeinyftddtx.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm50YXJjdG1laW55ZnRkZHR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzY0MjcsImV4cCI6MjA4Nzg1MjQyN30.KrgHiEPqCXPnVNIMK1AIiuoUT1iQc4K2w1SX4RHpWVE';
  
  // Initialize client with a unique local name
  const client = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

  const state = {
    view: "home",
    isLoggedIn: false,
    currentUser: null,
    userCash: 0,
    streams: [],
    query: "",
    isNotiOpen: false
  };

  // 2. Main App Logic
  const App = {
    // Switch View
    switchView: (viewId) => {
      console.log("Navigating to:", viewId);
      state.view = viewId;
      
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

    // Global Modal Control
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

    // Live Broadcast Modal
    toggleLiveModal: (show) => {
      if (show && !state.isLoggedIn) {
        alert("로그인이 필요합니다.");
        App.toggleModal(true, "login");
        return;
      }
      const modal = document.getElementById("modal-live");
      if (modal) modal.classList.toggle("hidden", !show);
    },

    // Notification Dropdown
    toggleNoti: (show) => {
      state.isNotiOpen = show !== undefined ? show : !state.isNotiOpen;
      document.getElementById("popup-notifications")?.classList.toggle("hidden", !state.isNotiOpen);
    },

    // Authentication Logic
    handleAuth: async () => {
      if (!client) return alert("Supabase 연결 실패");
      const title = document.getElementById("modal-title").textContent;
      const mode = title === "로그인" ? "login" : "register";
      
      const idInput = document.getElementById("modal-id");
      const emailInput = document.getElementById("modal-email");
      const pwInput = document.getElementById("modal-pw");

      const email = mode === "register" ? emailInput?.value : idInput?.value;
      const password = pwInput?.value;
      const username = idInput?.value;

      if (!email || !password || (mode === "register" && !username)) {
        return alert("모든 필드를 입력하세요.");
      }

      try {
        if (mode === "register") {
          const { error } = await client.auth.signUp({
            email, password, options: { data: { username } }
          });
          if (error) throw error;
          alert("회원가입 성공! 인증 메일을 확인해 주세요.");
          App.toggleModal(true, "login");
        } else {
          const { error } = await client.auth.signInWithPassword({ email, password });
          if (error) throw error;
          location.reload();
        }
      } catch (e) {
        alert("오류: " + e.message);
      }
    },

    // Logout
    handleLogout: async () => {
      await client.auth.signOut();
      location.reload();
    },

    // Update UI based on data
    render: () => {
      // 1. Auth Headers
      const zoneGuest = document.getElementById("zone-guest");
      const zoneUser = document.getElementById("zone-user");
      if (state.isLoggedIn && state.currentUser) {
        zoneGuest?.classList.add("hidden");
        zoneUser?.classList.remove("hidden");
        document.getElementById("user-cash").textContent = state.userCash.toLocaleString();
        document.getElementById("header-avatar").src = state.currentUser.avatar_url;
        
        if (state.view === "mypage") {
          document.getElementById("mp-avatar").src = state.currentUser.avatar_url;
          document.getElementById("mp-username").textContent = state.currentUser.username;
          document.getElementById("mp-email").textContent = state.currentUser.email;
          document.getElementById("mp-cash-val").textContent = state.userCash.toLocaleString();
        }
      } else {
        zoneGuest?.classList.remove("hidden");
        zoneUser?.classList.add("hidden");
      }

      // 2. Recommendation Banner
      const banner = document.getElementById("hero-banner");
      const showBanner = state.streams.length > 0 && state.view === "home" && !state.query;
      banner?.classList.toggle("hidden", !showBanner);
      if (showBanner) {
        const s = state.streams[0];
        document.getElementById("hero-title-text").textContent = s.title;
        document.getElementById("hero-desc-text").textContent = `${s.username}님의 방송 시청하기`;
        document.getElementById("btn-hero-watch").onclick = () => App.openStream(s.id);
      }

      // 3. Populate Grids
      App.renderGrid("grid-home");
      App.renderGrid("grid-live");
      App.renderSidebar();
    },

    renderGrid: (containerId) => {
      const container = document.getElementById(containerId);
      if (!container) return;
      container.innerHTML = "";
      
      let list = state.streams;
      if (state.query) {
        const q = state.query.toLowerCase();
        list = list.filter(s => s.title.toLowerCase().includes(q) || s.username.toLowerCase().includes(q));
      }

      if (list.length === 0) {
        if (containerId === "grid-home" && !state.query) document.getElementById("empty-state").classList.remove("hidden");
        else container.innerHTML = '<div style="grid-column:1/-1; padding:80px; text-align:center; color:#888">방송이 없습니다.</div>';
        return;
      }
      document.getElementById("empty-state").classList.add("hidden");

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
      if (state.streams.length === 0) {
        el.innerHTML = '<div style="padding:16px; font-size:13px; color:#888">추천 없음</div>';
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
      document.getElementById("p-title").textContent = s.title;
      document.getElementById("p-ch").textContent = s.username;
      document.getElementById("p-img").src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.username}`;
    }
  };

  // Expose to window for HTML usage
  window.app = App;

  // 3. Initialization
  document.addEventListener("DOMContentLoaded", async () => {
    console.log("App Initializing...");

    // Event Delegation for All Buttons
    document.body.addEventListener("click", (e) => {
      const target = e.target.closest("button, a, .side-link, .m-nav-link, .user-avatar-circle");
      if (!target) {
        if (state.isNotiOpen) App.toggleNoti(false);
        return;
      }

      if (target.dataset.view) {
        e.preventDefault();
        App.switchView(target.dataset.view);
      }
      
      const tid = target.id;
      if (tid === "btn-noti-toggle") { e.stopPropagation(); App.toggleNoti(); }
      else { if (state.isNotiOpen) App.toggleNoti(false); }

      if (tid === "btn-login") App.toggleModal(true, "login");
      if (tid === "btn-register") App.toggleModal(true, "register");
      if (tid === "btn-modal-close") App.toggleModal(false);
      if (tid === "btn-modal-submit") App.handleAuth();
      if (tid === "btn-modal-switch") {
        const title = document.getElementById("modal-title").textContent;
        App.toggleModal(true, title === "로그인" ? "register" : "login");
      }
      if (tid === "btn-go-live") App.toggleLiveModal(true);
      if (tid === "btn-live-close") App.toggleLiveModal(false);
      if (tid === "btn-live-start") {
        const title = document.getElementById("ipt-live-title").value;
        if (!title) return alert("제목을 입력하세요.");
        client.from("streams").insert([{
          user_id: state.currentUser.id, username: state.currentUser.username,
          title, category: document.getElementById("sel-live-cat").value,
          thumbnail_url: "https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?auto=format&fit=crop&q=80&w=800"
        }]).then(() => location.reload());
      }
      if (tid === "btn-sidebar-toggle") document.getElementById("sidebar")?.classList.toggle("closed");
      if (tid === "lnk-home-logo") { e.preventDefault(); App.switchView("home"); }
      if (tid === "btn-my-avatar" || tid === "btn-m-mypage") App.switchView("mypage");
      if (tid === "btn-logout") App.handleLogout();
    });

    // Search Input
    document.getElementById("ipt-global-search").oninput = (e) => {
      state.query = e.target.value.trim();
      document.getElementById("btn-search-clear").classList.toggle("hidden", !state.query);
      App.render();
    };

    // Load Data from Supabase
    if (client) {
      try {
        const { data: { session } } = await client.auth.getSession();
        if (session?.user) {
          const { data: profile } = await client.from('profiles').select('*').eq('id', session.user.id).single();
          state.isLoggedIn = true;
          state.currentUser = profile;
          state.userCash = profile ? profile.cash : 0;
        }
        const { data: streams } = await client.from('streams').select('*').order('created_at', { ascending: false });
        state.streams = streams || [];
      } catch (err) {
        console.warn("Data load error:", err);
      }
    }

    App.render();
    if (window.lucide) window.lucide.createIcons();
  });
})();
