/**
 * STREAMX - Global Controller (Final Stable Version)
 */

// 1. Supabase & 상태 초기화
const SUPABASE_URL = 'https://swfntarctmeinyftddtx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm50YXJjdG1laW55ZnRkZHR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzY0MjcsImV4cCI6MjA4Nzg1MjQyN30.KrgHiEPqCXPnVNIMK1AIiuoUT1iQc4K2w1SX4RHpWVE';
const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const state = {
  view: "home",
  isLoggedIn: false,
  currentUser: null,
  streams: [],
  query: ""
};

// 2. 핵심 로직 객체
window.app = {
  // 화면 전환 기능
  switchView: (viewId) => {
    console.log("Switching view to:", viewId);
    state.view = viewId;
    
    // UI 업데이트
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

  // 모달(팝업) 제어
  toggleModal: (show, mode = "login") => {
    const modal = document.getElementById("modal-global");
    if (!modal) return;
    
    modal.classList.toggle("hidden", !show);
    if (show) {
      const title = document.getElementById("modal-title");
      const fields = document.getElementById("modal-fields");
      if (title) title.textContent = mode === "login" ? "로그인" : "회원가입";
      
      if (fields) {
        fields.innerHTML = mode === "register" ? `
          <div class="field"><label>아이디</label><input type="text" id="modal-id" placeholder="아이디" /></div>
          <div class="field"><label>이메일</label><input type="text" id="modal-email" placeholder="이메일" /></div>
          <div class="field"><label>비밀번호</label><input type="password" id="modal-pw" placeholder="비밀번호" /></div>
        ` : `
          <div class="field"><label>아이디/이메일</label><input type="text" id="modal-id" placeholder="아이디 또는 이메일" /></div>
          <div class="field"><label>비밀번호</label><input type="password" id="modal-pw" placeholder="비밀번호" /></div>
        `;
      }
    }
  },

  // 방송하기 모달 제어
  toggleLiveModal: (show) => {
    if (show && !state.isLoggedIn) {
      alert("로그인이 필요합니다.");
      window.app.toggleModal(true, "login");
      return;
    }
    const modal = document.getElementById("modal-live");
    if (modal) modal.classList.toggle("hidden", !show);
  },

  // 화면 렌더링(갱신)
  render: () => {
    // 추천 배너 표시 여부
    const banner = document.getElementById("hero-banner");
    const showBanner = state.streams.length > 0 && state.view === "home" && !state.query;
    if (banner) banner.classList.toggle("hidden", !showBanner);
    
    if (showBanner) {
      const s = state.streams[0];
      const titleText = document.getElementById("hero-title-text");
      const descText = document.getElementById("hero-desc-text");
      const watchBtn = document.getElementById("btn-hero-watch");
      if (titleText) titleText.textContent = s.title;
      if (descText) descText.textContent = `${s.username}님의 라이브 방송!`;
      if (watchBtn) watchBtn.onclick = () => window.app.openStream(s.id);
    }

    // 로그인 상태에 따른 헤더 변경
    const zoneGuest = document.getElementById("zone-guest");
    const zoneUser = document.getElementById("zone-user");
    if (zoneGuest) zoneGuest.classList.toggle("hidden", state.isLoggedIn);
    if (zoneUser) zoneUser.classList.toggle("hidden", !state.isLoggedIn);
    
    if (state.isLoggedIn && state.currentUser) {
      const cashEl = document.getElementById("user-cash");
      if (cashEl) cashEl.textContent = (state.currentUser.cash || 0).toLocaleString();
    }

    // 방송 목록 그리드 갱신
    window.app.renderGrid("grid-home");
    window.app.renderGrid("grid-live");
  },

  // 그리드에 방송 카드 생성
  renderGrid: (containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";
    
    let filtered = state.streams;
    if (state.query) {
      const q = state.query.toLowerCase();
      filtered = filtered.filter(s => 
        s.title.toLowerCase().includes(q) || s.username.toLowerCase().includes(q)
      );
    }

    const emptyState = document.getElementById("empty-state");
    if (filtered.length === 0) {
      if (containerId === "grid-home" && !state.query && emptyState) {
        emptyState.classList.remove("hidden");
      } else {
        container.innerHTML = '<div style="grid-column:1/-1; padding:100px; text-align:center; color:#666">방송이 없습니다.</div>';
      }
      return;
    }
    if (emptyState) emptyState.classList.add("hidden");

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

  // 방송 시청 페이지 열기
  openStream: (id) => {
    const s = state.streams.find(x => x.id === id);
    if (!s) return;
    window.app.switchView("player");
    const pTitle = document.getElementById("p-title");
    const pCh = document.getElementById("p-ch");
    const pImg = document.getElementById("p-img");
    if (pTitle) pTitle.textContent = s.title;
    if (pCh) pCh.textContent = s.username;
    if (pImg) pImg.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.username}`;
  },

  // 회원가입/로그인 처리
  handleAuth: async () => {
    const emailEl = document.getElementById("modal-email");
    const idEl = document.getElementById("modal-id");
    const pwEl = document.getElementById("modal-pw");
    const titleEl = document.getElementById("modal-title");
    
    const email = emailEl ? emailEl.value : (idEl ? idEl.value : "");
    const password = pwEl ? pwEl.value : "";
    const username = idEl ? idEl.value : "";
    const mode = titleEl && titleEl.textContent === "로그인" ? "login" : "register";

    if (!email || !password) return alert("모든 항목을 입력하세요.");

    try {
      if (mode === "register") {
        const { error } = await supabase.auth.signUp({ email, password, options: { data: { username } } });
        if (error) throw error;
        alert("가입 성공! 메일을 확인하거나 로그인을 진행하세요.");
        window.app.toggleModal(true, "login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        location.reload(); // 로그인 성공 시 새로고침
      }
    } catch (e) {
      alert("인증 오류: " + e.message);
    }
  }
};

// 3. 이벤트 바인딩 및 초기화
document.addEventListener("DOMContentLoaded", () => {
  console.log("App initializing...");

  // 클릭 이벤트 통합 처리 (가장 확실한 방식)
  document.body.addEventListener("click", (e) => {
    const target = e.target.closest("button, a, .side-link, .m-nav-link");
    if (!target) return;

    // 탭 이동 (data-view 속성 기준)
    if (target.dataset.view) {
      e.preventDefault();
      window.app.switchView(target.dataset.view);
      return;
    }

    // 버튼 ID별 동작
    const id = target.id;
    if (id === "btn-login") window.app.toggleModal(true, "login");
    else if (id === "btn-register") window.app.toggleModal(true, "register");
    else if (id === "btn-modal-close") window.app.toggleModal(false);
    else if (id === "btn-modal-submit") window.app.handleAuth();
    else if (id === "btn-modal-switch") {
      const titleEl = document.getElementById("modal-title");
      const isLogin = titleEl && titleEl.textContent === "로그인";
      window.app.toggleModal(true, isLogin ? "register" : "login");
    }
    else if (id === "btn-go-live") window.app.toggleLiveModal(true);
    else if (id === "btn-live-close") window.app.toggleLiveModal(false);
    else if (id === "btn-live-start") {
      const titleEl = document.getElementById("ipt-live-title");
      const title = titleEl ? titleEl.value : "";
      if (!title) return alert("제목을 입력하세요.");
      
      const catEl = document.getElementById("sel-live-cat");
      supabase.from("streams").insert([{
        user_id: state.currentUser.id,
        username: state.currentUser.username,
        title,
        category: catEl ? catEl.value : "game",
        thumbnail_url: "https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?auto=format&fit=crop&q=80&w=800"
      }]).then(() => location.reload());
    }
    else if (id === "btn-sidebar-toggle") {
      const sidebar = document.getElementById("sidebar");
      const main = document.getElementById("scroll-main");
      if (sidebar) sidebar.classList.toggle("closed");
      if (main) main.classList.toggle("expanded");
    }
    else if (id === "lnk-home-logo") {
      e.preventDefault();
      window.app.switchView("home");
    }
  });

  // 검색 기능
  const searchInput = document.getElementById("ipt-global-search");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      state.query = e.target.value.trim();
      const clearBtn = document.getElementById("btn-search-clear");
      if (clearBtn) clearBtn.classList.toggle("hidden", !state.query);
      window.app.render();
    });
  }

  // 초기 데이터 로드 (비동기)
  if (supabase) {
    // 1. 유저 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && session.user) {
        supabase.from("profiles").select("*").eq("id", session.user.id).single().then(({ data }) => {
          state.isLoggedIn = true;
          state.currentUser = data || { id: session.user.id, username: session.user.user_metadata.username };
          window.app.render();
        });
      }
    });
    // 2. 방송 목록 로드
    supabase.from("streams").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      state.streams = data || [];
      window.app.render();
    });
  }

  // 초기 렌더링
  window.app.render();
  if (window.lucide) window.lucide.createIcons();
});
