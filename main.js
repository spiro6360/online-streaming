/**
 * STREAMX - Global Controller (Maximum Reliability)
 */

// 1. 초기 앱 상태
const state = {
  view: "home",
  isSidebarOpen: true,
  isLoggedIn: false,
  currentUser: null,
  userCash: 1250,
  streams: [],
  query: ""
};

// 2. Supabase 설정 (오류 방지 처리가 포함된 초기화)
const SUPABASE_URL = 'https://swfntarctmeinyftddtx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm50YXJjdG1laW55ZnRkZHR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzY0MjcsImV4cCI6MjA4Nzg1MjQyN30.KrgHiEPqCXPnVNIMK1AIiuoUT1iQc4K2w1SX4RHpWVE';
let supabase = null;

function initSupabase() {
  try {
    if (window.supabase) {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      console.log("Supabase client created.");
    }
  } catch (e) {
    console.error("Supabase init error:", e);
  }
}

// 3. 전역 앱 객체
window.app = {
  // 화면 전환 (가장 먼저 작동해야 함)
  switchView: (viewId) => {
    state.view = viewId;
    document.querySelectorAll(".content-view").forEach(v => v.classList.add("hidden"));
    const target = document.getElementById(`view-${viewId}`);
    if (target) target.classList.remove("hidden");

    document.querySelectorAll(".side-link, .m-nav-link").forEach(n => {
      n.classList.toggle("active", n.dataset.view === viewId);
    });
    window.app.render();
  },

  // 모달 제어
  toggleModal: (show, mode = "login") => {
    const modal = document.getElementById("modal-global");
    if (!modal) return;
    modal.classList.toggle("hidden", !show);
    if (show) {
      document.getElementById("modal-title").textContent = mode === "login" ? "로그인" : "회원가입";
      const fields = document.getElementById("modal-fields");
      fields.innerHTML = mode === "register" ? `
        <div class="field"><label>아이디</label><input type="text" id="modal-id" placeholder="아이디" /></div>
        <div class="field"><label>이메일</label><input type="text" id="modal-email" placeholder="이메일" /></div>
        <div class="field"><label>비밀번호</label><input type="password" id="modal-pw" placeholder="비밀번호" /></div>
      ` : `
        <div class="field"><label>이메일 또는 아이디</label><input type="text" id="modal-id" placeholder="이메일 또는 아이디" /></div>
        <div class="field"><label>비밀번호</label><input type="password" id="modal-pw" placeholder="비밀번호" /></div>
      `;
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

  // 화면 업데이트
  render: () => {
    // 로그인 상태 UI 업데이트
    const zoneGuest = document.getElementById("zone-guest");
    const zoneUser = document.getElementById("zone-user");
    if (state.isLoggedIn) {
      zoneGuest?.classList.add("hidden");
      zoneUser?.classList.remove("hidden");
      const cashEl = document.getElementById("user-cash");
      if (cashEl) cashEl.textContent = state.userCash.toLocaleString();
    } else {
      zoneGuest?.classList.remove("hidden");
      zoneUser?.classList.add("hidden");
    }

    // 추천 배너 업데이트
    const banner = document.getElementById("hero-banner");
    const showBanner = state.streams.length > 0 && state.view === "home" && !state.query;
    banner?.classList.toggle("hidden", !showBanner);
    if (showBanner) {
      const s = state.streams[0];
      document.getElementById("hero-title-text").textContent = s.title;
      document.getElementById("hero-desc-text").textContent = `${s.username}님의 라이브!`;
    }

    // 방송 리스트 갱신
    window.app.renderGrid("grid-home");
    window.app.renderGrid("grid-live");
  },

  renderGrid: (containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";
    
    const filtered = state.streams.filter(s => {
      const q = state.query.toLowerCase();
      return s.title.toLowerCase().includes(q) || s.username.toLowerCase().includes(q);
    });

    if (filtered.length === 0) {
      if (containerId === "grid-home" && !state.query) {
        document.getElementById("empty-state")?.classList.remove("hidden");
      } else {
        container.innerHTML = '<div style="grid-column:1/-1; padding:100px; text-align:center; color:#666">방송이 없습니다.</div>';
      }
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

  openStream: (id) => {
    const s = state.streams.find(x => x.id === id);
    if (!s) return;
    window.app.switchView("player");
    document.getElementById("p-title").textContent = s.title;
    document.getElementById("p-ch").textContent = s.username;
    document.getElementById("p-img").src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.username}`;
  },

  handleAuth: async () => {
    if (!supabase) { alert("연결 중입니다. 잠시 후 다시 시도하세요."); return; }
    const mode = document.getElementById("modal-title").textContent === "로그인" ? "login" : "register";
    const email = document.getElementById("modal-email")?.value || document.getElementById("modal-id")?.value;
    const password = document.getElementById("modal-pw")?.value;
    const username = document.getElementById("modal-id")?.value;

    try {
      if (mode === "register") {
        const { error } = await supabase.auth.signUp({ email, password, options: { data: { username } } });
        if (error) throw error;
        alert("회원가입 완료! 로그인을 진행해주세요.");
        window.app.toggleModal(true, "login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.reload();
      }
    } catch (e) { alert(e.message); }
  },

  handleCreateStream: async () => {
    if (!supabase || !state.isLoggedIn) return;
    const title = document.getElementById("ipt-live-title").value.trim();
    if (!title) { alert("제목을 입력하세요."); return; }
    const { error } = await supabase.from('streams').insert([{
      user_id: state.currentUser.id,
      username: state.currentUser.username,
      title, category: document.getElementById("sel-live-cat").value,
      thumbnail_url: "https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?auto=format&fit=crop&q=80&w=800"
    }]);
    if (error) alert(error.message);
    else window.location.reload();
  }
};

// 4. 이벤트 연결 (DOM 로드 후 즉시 실행)
function setupEvents() {
  console.log("Setting up event listeners...");
  
  // 모든 클릭을 최우선으로 감지
  document.addEventListener("click", (e) => {
    const target = e.target.closest("button, a, .side-link, .m-nav-link");
    if (!target) return;

    // 탭 이동
    if (target.dataset.view) {
      e.preventDefault();
      window.app.switchView(target.dataset.view);
    }

    // 개별 버튼 액션
    if (target.id === "btn-sidebar-toggle") {
      state.isSidebarOpen = !state.isSidebarOpen;
      document.getElementById("sidebar")?.classList.toggle("closed", !state.isSidebarOpen);
      document.getElementById("scroll-main")?.classList.toggle("expanded", !state.isSidebarOpen);
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
    if (target.id === "btn-live-start") window.app.handleCreateStream();
    if (target.id === "lnk-home-logo") { e.preventDefault(); window.app.switchView("home"); }
  }, true); // 캡처링 단계에서 감지하여 반응성 극대화

  // 검색
  const searchInput = document.getElementById("ipt-global-search");
  if (searchInput) {
    searchInput.oninput = (e) => {
      state.query = e.target.value.trim();
      document.getElementById("btn-search-clear")?.classList.toggle("hidden", !state.query);
      window.app.render();
    };
  }
}

// 5. 실행
document.addEventListener("DOMContentLoaded", async () => {
  initSupabase();
  setupEvents();
  
  // 데이터 불러오기 (UI 차단 방지)
  if (supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        state.isLoggedIn = true;
        state.currentUser = profile;
        state.userCash = profile ? profile.cash : 1250;
      }
      const { data: streams } = await supabase.from('streams').select('*').order('created_at', { ascending: false });
      state.streams = streams || [];
    } catch (e) {
      console.warn("Initial data load failed, but UI is ready.");
    }
  }

  window.app.render();
  if (window.lucide) window.lucide.createIcons();
});
