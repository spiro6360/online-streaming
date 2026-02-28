/**
 * STREAMX - Global Controller (Final Robust Version)
 */

// 1. 전역 설정 및 상태 (변수명 충돌 방지를 위해 고유한 이름 사용)
const STREAMX_SB_URL = 'https://swfntarctmeinyftddtx.supabase.co';
const STREAMX_SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm50YXJjdG1laW55ZnRkZHR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzY0MjcsImV4cCI6MjA4Nzg1MjQyN30.KrgHiEPqCXPnVNIMK1AIiuoUT1iQc4K2w1SX4RHpWVE';

// Supabase 클라이언트 초기화 (window.supabase 라이브러리 사용)
let streamxClient = null;
if (window.supabase) {
  streamxClient = window.supabase.createClient(STREAMX_SB_URL, STREAMX_SB_KEY);
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

// 2. 핵심 로직
window.app = {
  // 화면 전환
  switchView: (viewId) => {
    console.log("Switching to:", viewId);
    appState.view = viewId;
    
    document.querySelectorAll(".content-view").forEach(v => v.classList.add("hidden"));
    const target = document.getElementById(`view-${viewId}`);
    if (target) target.classList.remove("hidden");

    document.querySelectorAll(".side-link, .m-nav-link").forEach(n => {
      n.classList.toggle("active", n.dataset.view === viewId);
    });

    window.app.render();
    document.getElementById("scroll-main").scrollTop = 0;
  },

  // 모달 제어
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
    if (show && !appState.isLoggedIn) {
      alert("로그인이 필요합니다.");
      window.app.toggleModal(true, "login");
      return;
    }
    const modal = document.getElementById("modal-live");
    if (modal) modal.classList.toggle("hidden", !show);
  },

  toggleNoti: (show) => {
    appState.isNotiOpen = show !== undefined ? show : !appState.isNotiOpen;
    document.getElementById("popup-notifications")?.classList.toggle("hidden", !appState.isNotiOpen);
  },

  // 인증 처리
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
        const { error } = await streamxClient.auth.signUp({
          email, password, options: { data: { username } }
        });
        if (error) throw error;
        alert("회원가입 완료! 인증 메일을 확인해 주세요.");
        window.app.toggleModal(true, "login");
      } else {
        const { error } = await streamxClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        location.reload();
      }
    } catch (e) { alert("오류: " + e.message); }
  },

  handleLogout: async () => {
    await streamxClient.auth.signOut();
    location.reload();
  },

  // 렌더링
  render: () => {
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

    const banner = document.getElementById("hero-banner");
    const showBanner = appState.streams.length > 0 && appState.view === "home" && !appState.query;
    banner?.classList.toggle("hidden", !showBanner);
    if (showBanner) {
      const s = appState.streams[0];
      document.getElementById("hero-title-text").textContent = s.title;
      document.getElementById("hero-desc-text").textContent = `${s.username}님의 라이브!`;
      document.getElementById("btn-hero-watch").onclick = () => window.app.openStream(s.id);
    }

    window.app.renderGrid("grid-home");
    window.app.renderGrid("grid-live");
    window.app.renderSidebar();
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

    if (filtered.length === 0) {
      if (containerId === "grid-home" && !appState.query) document.getElementById("empty-state")?.classList.remove("hidden");
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
      card.onclick = () => window.app.openStream(s.id);
      container.appendChild(card);
    });
  },

  renderSidebar: () => {
    const el = document.getElementById("list-recommended");
    if (!el) return;
    if (appState.streams.length === 0) {
      el.innerHTML = '<div style="padding:10px 16px; font-size:12px; color:#666">추천 채널 없음</div>';
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
    window.app.switchView("player");
    document.getElementById("p-title").textContent = s.title;
    document.getElementById("p-ch").textContent = s.username;
    document.getElementById("p-img").src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.username}`;
  }
};

// 3. 이벤트 리스너 등록 (최우선 실행)
document.addEventListener("DOMContentLoaded", async () => {
  console.log("StreamX Ready.");

  // 클릭 이벤트 통합 관리
  document.body.addEventListener("click", (e) => {
    const target = e.target.closest("button, a, .side-link, .m-nav-link, .user-avatar-circle");
    if (!target) {
      if (appState.isNotiOpen) window.app.toggleNoti(false);
      return;
    }

    // 탭 이동
    if (target.dataset.view) {
      e.preventDefault();
      window.app.switchView(target.dataset.view);
    }
    
    // 알림 토글
    if (target.id === "btn-noti-toggle") {
      e.stopPropagation();
      window.app.toggleNoti();
    } else {
      if (appState.isNotiOpen) window.app.toggleNoti(false);
    }

    // 아이디별 동작
    const tid = target.id;
    if (tid === "btn-login") window.app.toggleModal(true, "login");
    if (tid === "btn-register") window.app.toggleModal(true, "register");
    if (tid === "btn-modal-close") window.app.toggleModal(false);
    if (tid === "btn-modal-submit") window.app.handleAuth();
    if (tid === "btn-modal-switch") {
      const title = document.getElementById("modal-title")?.textContent;
      window.app.toggleModal(true, title === "로그인" ? "register" : "login");
    }
    if (tid === "btn-go-live") window.app.toggleLiveModal(true);
    if (tid === "btn-live-close") window.app.toggleLiveModal(false);
    if (tid === "btn-live-start") {
      const title = document.getElementById("ipt-live-title")?.value;
      if (!title) return alert("제목을 입력하세요.");
      streamxClient.from("streams").insert([{
        user_id: appState.currentUser.id, username: appState.currentUser.username,
        title, category: document.getElementById("sel-live-cat").value,
        thumbnail_url: "https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?auto=format&fit=crop&q=80&w=800"
      }]).then(() => location.reload());
    }
    if (tid === "btn-sidebar-toggle") {
      document.getElementById("sidebar")?.classList.toggle("closed");
    }
    if (tid === "lnk-home-logo") { e.preventDefault(); window.app.switchView("home"); }
    if (tid === "btn-my-avatar" || tid === "btn-m-mypage") window.app.switchView("mypage");
    if (tid === "btn-logout") window.app.handleLogout();
  });

  // 검색
  const searchInput = document.getElementById("ipt-global-search");
  if (searchInput) {
    searchInput.oninput = (e) => {
      appState.query = e.target.value.trim();
      document.getElementById("btn-search-clear")?.classList.toggle("hidden", !appState.query);
      window.app.render();
    };
  }

  // 초기 데이터 로드 (백그라운드)
  if (streamxClient) {
    const { data: { session } } = await streamxClient.auth.getSession();
    if (session?.user) {
      const { data: profile } = await streamxClient.from('profiles').select('*').eq('id', session.user.id).single();
      appState.isLoggedIn = true;
      appState.currentUser = profile;
      appState.userCash = profile ? profile.cash : 0;
    }
    const { data: streams } = await streamxClient.from('streams').select('*').order('created_at', { ascending: false });
    appState.streams = streams || [];
  }

  window.app.render();
  if (window.lucide) window.lucide.createIcons();
});
