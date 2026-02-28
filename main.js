/**
 * STREAMX - Global Controller (Absolute Stability Version)
 */

// 변수 중복 선언 에러를 방지하기 위해 var와 SX_ 접두사 사용
var SX_URL = 'https://swfntarctmeinyftddtx.supabase.co';
var SX_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm50YXJjdG1laW55ZnRkZHR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzY0MjcsImV4cCI6MjA4Nzg1MjQyN30.KrgHiEPqCXPnVNIMK1AIiuoUT1iQc4K2w1SX4RHpWVE';
var SX_CLIENT = window.supabase ? window.supabase.createClient(SX_URL, SX_KEY) : null;

var SX_STATE = {
  view: "home",
  isLoggedIn: false,
  currentUser: null,
  userCash: 0,
  streams: [],
  query: "",
  isNotiOpen: false
};

// 모든 기능을 전역 window.app 객체에 담음
window.app = {
  // 화면 전환
  switchView: function(viewId) {
    console.log("Switch View:", viewId);
    SX_STATE.view = viewId;
    var views = document.querySelectorAll(".content-view");
    for (var i = 0; i < views.length; i++) views[i].classList.add("hidden");
    
    var target = document.getElementById("view-" + viewId);
    if (target) target.classList.remove("hidden");

    var navs = document.querySelectorAll(".side-link, .m-nav-link");
    for (var j = 0; navs && j < navs.length; j++) {
      navs[j].classList.toggle("active", navs[j].getAttribute("data-view") === viewId);
    }
    window.app.render();
  },

  // 로그인/회원가입 모달 열기
  toggleModal: function(show, mode) {
    console.log("Toggle Modal:", show, mode);
    var modal = document.getElementById("modal-global");
    if (!modal) return;
    
    if (show) {
      modal.classList.remove("hidden");
      var title = document.getElementById("modal-title");
      if (title) title.textContent = (mode === "login" ? "로그인" : "회원가입");
      
      var fields = document.getElementById("modal-fields");
      if (fields) {
        if (mode === "register") {
          fields.innerHTML = '<div class="field"><label>아이디</label><input type="text" id="modal-id" placeholder="아이디"></div>' +
                             '<div class="field"><label>이메일</label><input type="email" id="modal-email" placeholder="email@example.com"></div>' +
                             '<div class="field"><label>비밀번호</label><input type="password" id="modal-pw" placeholder="6자리 이상"></div>';
        } else {
          fields.innerHTML = '<div class="field"><label>이메일</label><input type="email" id="modal-id" placeholder="가입한 이메일"></div>' +
                             '<div class="field"><label>비밀번호</label><input type="password" id="modal-pw" placeholder="비밀번호"></div>';
        }
      }
      var sTxt = document.getElementById("txt-modal-switch");
      var sBtn = document.getElementById("btn-modal-switch");
      if (sTxt) sTxt.textContent = (mode === "login" ? "계정이 없으신가요?" : "이미 계정이 있으신가요?");
      if (sBtn) sBtn.textContent = (mode === "login" ? "회원가입" : "로그인");
    } else {
      modal.classList.add("hidden");
    }
  },

  // 인증 처리
  handleAuth: async function() {
    var title = document.getElementById("modal-title").textContent;
    var mode = (title === "로그인" ? "login" : "register");
    var id = document.getElementById("modal-id")?.value;
    var email = document.getElementById("modal-email")?.value || id;
    var pw = document.getElementById("modal-pw")?.value;

    if (!email || !pw) return alert("항목을 입력하세요.");

    try {
      if (mode === "register") {
        var { error } = await SX_CLIENT.auth.signUp({ email, password: pw, options: { data: { username: id } } });
        if (error) throw error;
        alert("가입 성공! 메일을 확인해 주세요.");
        window.app.toggleModal(true, "login");
      } else {
        var { error } = await SX_CLIENT.auth.signInWithPassword({ email, password: pw });
        if (error) throw error;
        location.reload();
      }
    } catch (e) { alert(e.message); }
  },

  // 렌더링
  render: function() {
    var guest = document.getElementById("zone-guest");
    var user = document.getElementById("zone-user");
    if (SX_STATE.isLoggedIn) {
      guest?.classList.add("hidden");
      user?.classList.remove("hidden");
      var cash = document.getElementById("user-cash");
      if (cash) cash.textContent = SX_STATE.userCash.toLocaleString();
    } else {
      guest?.classList.remove("hidden");
      user?.classList.add("hidden");
    }
    window.app.renderGrid("grid-home");
    window.app.renderGrid("grid-live");
  },

  renderGrid: function(cid) {
    var container = document.getElementById(cid);
    if (!container) return;
    container.innerHTML = "";
    var list = SX_STATE.streams;
    if (SX_STATE.query) {
      list = list.filter(s => s.title.toLowerCase().includes(SX_STATE.query.toLowerCase()));
    }
    if (list.length === 0) {
      if (cid === "grid-home" && !SX_STATE.query) document.getElementById("empty-state")?.classList.remove("hidden");
      else container.innerHTML = "<div>방송이 없습니다.</div>";
      return;
    }
    document.getElementById("empty-state")?.classList.add("hidden");
    list.forEach(s => {
      var card = document.createElement("div");
      card.className = "stream-card";
      card.innerHTML = '<div class="thumb-box"><img src="' + s.thumbnail_url + '"></div>' +
                       '<div class="card-details"><div class="c-title">' + s.title + '</div><div class="c-channel">' + s.username + '</div></div>';
      card.onclick = () => window.app.openStream(s.id);
      container.appendChild(card);
    });
  },

  openStream: function(id) {
    var s = SX_STATE.streams.find(x => x.id === id);
    if (!s) return;
    window.app.switchView("player");
    document.getElementById("p-title").textContent = s.title;
    document.getElementById("p-ch").textContent = s.username;
  }
};

// 이벤트 설정
document.addEventListener("DOMContentLoaded", async function() {
  console.log("StreamX Initializing...");

  // 클릭 이벤트 통합 관리
  document.body.onclick = function(e) {
    var t = e.target.closest("button, a, .side-link, .m-nav-link");
    if (!t) return;

    var id = t.id;
    var view = t.getAttribute("data-view");

    if (view) { e.preventDefault(); window.app.switchView(view); }
    else if (id === "btn-login") window.app.toggleModal(true, "login");
    else if (id === "btn-register") window.app.toggleModal(true, "register");
    else if (id === "btn-modal-close") window.app.toggleModal(false);
    else if (id === "btn-modal-submit") window.app.handleAuth();
    else if (id === "btn-modal-switch") {
      var title = document.getElementById("modal-title").textContent;
      window.app.toggleModal(true, title === "로그인" ? "register" : "login");
    }
    else if (id === "lnk-home-logo") { e.preventDefault(); window.app.switchView("home"); }
  };

  // 초기 데이터 로드
  if (SX_CLIENT) {
    var { data: { session } } = await SX_CLIENT.auth.getSession();
    if (session) {
      var { data: profile } = await SX_CLIENT.from('profiles').select('*').eq('id', session.user.id).single();
      SX_STATE.isLoggedIn = true;
      SX_STATE.currentUser = profile;
      SX_STATE.userCash = profile ? profile.cash : 0;
    }
    var { data: streams } = await SX_CLIENT.from('streams').select('*').order('created_at', { ascending: false });
    SX_STATE.streams = streams || [];
  }

  window.app.render();
  if (window.lucide) window.lucide.createIcons();
});
