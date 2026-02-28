/**
 * STREAMX - Global Controller (Supabase Integrated & Refined)
 */

const SUPABASE_URL = 'https://swfntarctmeinyftddtx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm50YXJjdG1laW55ZnRkZHR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzY0MjcsImV4cCI6MjA4Nzg1MjQyN30.KrgHiEPqCXPnVNIMK1AIiuoUT1iQc4K2w1SX4RHpWVE';
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

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

window.app = {
  // --- View Control ---
  switchView: (viewId) => {
    console.log("Switching view to:", viewId);
    state.view = viewId;
    
    document.querySelectorAll(".content-view").forEach(v => v.classList.add("hidden"));
    const target = document.getElementById(`view-${viewId}`);
    if (target) target.classList.remove("hidden");

    document.querySelectorAll(".side-link, .m-nav-link").forEach(n => {
      n.classList.toggle("active", n.dataset.view === viewId);
    });

    window.app.render();
    const scrollMain = document.getElementById("scroll-main");
    if (scrollMain) scrollMain.scrollTop = 0;
  },

  // --- Modal & UI Control ---
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
      window.app.toggleModal(true, "login");
      return;
    }
    const modal = document.getElementById("modal-live");
    if (modal) modal.classList.toggle("hidden", !show);
  },

  toggleNoti: (show) => {
    state.isNotiOpen = show !== undefined ? show : !state.isNotiOpen;
    document.getElementById("popup-notifications")?.classList.toggle("hidden", !state.isNotiOpen);
  },

  // --- Auth & Profile ---
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
        const { data, error } = await supabaseClient.auth.signUp({
          email,
          password,
          options: { data: { username } }
        });
        if (error) throw error;
        alert("회원가입이 완료되었습니다! 이메일 인증 후 로그인해 주세요.");
        window.app.toggleModal(true, "login");
      } else {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        location.reload();
      }
    } catch (e) {
      alert(e.message);
    }
  },

  handleLogout: async () => {
    await supabaseClient.auth.signOut();
    location.reload();
  },

  // --- Data & Rendering ---
  render: () => {
    // 1. Auth UI
    const zoneGuest = document.getElementById("zone-guest");
    const zoneUser = document.getElementById("zone-user");
    if (state.isLoggedIn && state.currentUser) {
      zoneGuest?.classList.add("hidden");
      zoneUser?.classList.remove("hidden");
      document.getElementById("user-cash").textContent = state.userCash.toLocaleString();
      document.getElementById("header-avatar").src = state.currentUser.avatar_url;
      
      // 마이페이지 업데이트
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

    // 2. Banner
    const banner = document.getElementById("hero-banner");
    const showBanner = state.streams.length > 0 && state.view === "home" && !state.query;
    banner?.classList.toggle("hidden", !showBanner);
    if (showBanner) {
      const s = state.streams[0];
      document.getElementById("hero-title-text").textContent = s.title;
      document.getElementById("hero-desc-text").textContent = `${s.username}님의 라이브!`;
      document.getElementById("btn-hero-watch").onclick = () => window.app.openStream(s.id);
    }

    // 3. Grid
    window.app.renderGrid("grid-home");
    window.app.renderGrid("grid-live");
    window.app.renderSidebar();
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
      if (containerId === "grid-home" && !state.query) document.getElementById("empty-state").classList.remove("hidden");
      else container.innerHTML = '<div style="grid-column:1/-1; padding:100px; text-align:center; color:#666">라이브 중인 방송이 없습니다.</div>';
      return;
    }
    document.getElementById("empty-state").classList.add("hidden");

    filtered.forEach(s => {
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
      card.onclick = () => window.app.openStream(s.id);
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
    window.app.switchView("player");
    document.getElementById("p-title").textContent = s.title;
    document.getElementById("p-ch").textContent = s.username;
    document.getElementById("p-img").src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.username}`;
  }
};

// --- 초기화 및 이벤트 리스너 ---
document.addEventListener("DOMContentLoaded", async () => {
  console.log("StreamX initializing...");

  // 클릭 이벤트 통합
  document.body.addEventListener("click", (e) => {
    const target = e.target.closest("button, a, .side-link, .m-nav-link, .user-avatar-circle");
    if (!target) {
      if (state.isNotiOpen) window.app.toggleNoti(false);
      return;
    }

    if (target.dataset.view) {
      e.preventDefault();
      window.app.switchView(target.dataset.view);
    }
    
    // 알림창 클릭 예외 처리
    if (target.id === "btn-noti-toggle") {
      e.stopPropagation();
      window.app.toggleNoti();
    } else {
      if (state.isNotiOpen) window.app.toggleNoti(false);
    }

    if (target.id === "btn-login") window.app.toggleModal(true, "login");
    if (target.id === "btn-register") window.app.toggleModal(true, "register");
    if (target.id === "btn-modal-close") window.app.toggleModal(false);
    if (target.id === "btn-modal-submit") window.app.handleAuth();
    if (target.id === "btn-modal-switch") {
      const isLogin = document.getElementById("modal-title").textContent === "로그인";
      window.app.toggleModal(true, isLogin ? "register" : "login");
    }
    if (target.id === "btn-go-live") window.app.toggleLiveModal(true);
    if (target.id === "btn-live-close") window.app.toggleLiveModal(false);
    if (target.id === "btn-live-start") {
      const title = document.getElementById("ipt-live-title").value;
      if (!title) return alert("제목을 입력하세요.");
      supabaseClient.from("streams").insert([{
        user_id: state.currentUser.id,
        username: state.currentUser.username,
        title,
        category: document.getElementById("sel-live-cat").value,
        thumbnail_url: "https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?auto=format&fit=crop&q=80&w=800"
      }]).then(() => location.reload());
    }
    if (target.id === "btn-sidebar-toggle") {
      document.getElementById("sidebar").classList.toggle("closed");
      document.getElementById("scroll-main").classList.toggle("expanded");
    }
    if (target.id === "lnk-home-logo") { e.preventDefault(); window.app.switchView("home"); }
    if (target.id === "btn-my-avatar" || target.id === "btn-m-mypage") {
      window.app.switchView("mypage");
    }
    if (target.id === "btn-logout") window.app.handleLogout();
  });

  // 검색
  document.getElementById("ipt-global-search").oninput = (e) => {
    state.query = e.target.value.trim();
    document.getElementById("btn-search-clear").classList.toggle("hidden", !state.query);
    window.app.render();
  };

  // 초기 로드
  if (supabaseClient) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session?.user) {
      const { data: profile } = await supabaseClient.from('profiles').select('*').eq('id', session.user.id).single();
      state.isLoggedIn = true;
      state.currentUser = profile;
      state.userCash = profile ? profile.cash : 0;
    }
    const { data: streams } = await supabaseClient.from('streams').select('*').order('created_at', { ascending: false });
    state.streams = streams || [];
  }

  window.app.render();
  if (window.lucide) window.lucide.createIcons();
});
