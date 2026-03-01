/**
 * STREAMX - Global Controller (Full OBS + Media Server Integration)
 */

(function() {
  console.log("[StreamX] 시스템 부팅 중...");

  // 브라우저 기본 알림을 한국어로 자동 번역하도록 가로채기
  const _originalAlert = window.alert;
  window.alert = function(msg) {
    if (window.app && window.app.translateError) {
      _originalAlert(window.app.translateError(msg));
    } else {
      _originalAlert(msg);
    }
  };

  const SX_URL = 'https://swfntarctmeinyftddtx.supabase.co';
  const SX_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm50YXJjdG1laW55ZnRkZHR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzY0MjcsImV4cCI6MjA4Nzg1MjQyN30.KrgHiEPqCXPnVNIMK1AIiuoUT1iQc4K2w1SX4RHpWVE';
  let supabase = null;
  let hls = null;

  // IDX 환경 또는 로컬 환경에 따른 서버 주소 설정
  const MEDIA_SERVER_IP = window.location.hostname; // 현재 접속 중인 도메인/IP
  const RTMP_URL = `rtmp://${MEDIA_SERVER_IP}/live`;
  const HLS_BASE_URL = `http://${MEDIA_SERVER_IP}:8000/live`;

  function getClient() {
    if (!supabase && window.supabase) {
      supabase = window.supabase.createClient(SX_URL, SX_KEY);
    }
    return supabase;
  }

  const App = {
    state: {
      isLoggedIn: false,
      currentUser: null,
      streams: [],
      isStreamKeyVisible: false,
      isNickChecked: false,
      checkedNick: ""
    },

    // --- Toast System ---
    toast(msg, type = "info") {
      const container = document.getElementById("toast-container");
      if (!container) return;
      
      // 메시지가 객체인 경우 처리
      const messageText = typeof msg === 'string' ? msg : (msg?.message || JSON.stringify(msg));
      const translated = this.translateError(messageText);

      const toast = document.createElement("div");
      toast.className = `toast ${type}`;
      toast.innerHTML = `<div class="toast-msg">${translated}</div>`;
      container.appendChild(toast);
      
      setTimeout(() => {
        toast.classList.add("fade-out");
        setTimeout(() => toast.remove(), 300);
      }, 3500);
    },

    translateError(msg) {
      if (!msg) return "";
      const text = String(msg);
      
      // 정규식 기반 강제 매핑 (대소문자 무관)
      if (/invalid login credentials/i.test(text) || /invalid credentials/i.test(text)) {
        return "이메일 또는 비밀번호가 잘못되었습니다.";
      }
      if (/user already registered/i.test(text)) return "이미 가입된 이메일 주소입니다.";
      if (/email not confirmed/i.test(text)) return "이메일 인증이 완료되지 않았습니다. 메일함을 확인해주세요.";
      if (/signup disabled/i.test(text)) return "현재 회원가입이 비활성화되어 있습니다.";
      if (/invalid email/i.test(text)) return "유효하지 않은 이메일 형식입니다.";
      if (/password should be at least 6 characters/i.test(text)) return "비밀번호는 최소 6자 이상이어야 합니다.";
      if (/rate limit/i.test(text) || /too many requests/i.test(text)) return "너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.";
      if (/user not found/i.test(text)) return "사용자를 찾을 수 없습니다.";
      if (/network error/i.test(text)) return "네트워크 연결이 원활하지 않습니다.";
      
      return text;
    },

    // --- Notification List ---
    addNotification(title, content) {
      const list = document.querySelector(".noti-list");
      if (!list) return;
      
      const emptyMsg = list.querySelector(".noti-empty");
      if (emptyMsg) emptyMsg.remove();

      const translatedContent = this.translateError(content);

      const noti = document.createElement("div");
      noti.className = "noti-item";
      noti.innerHTML = `
        <div class="noti-item-title">${title}</div>
        <div class="noti-item-content">${translatedContent}</div>
        <div class="noti-item-time">방금 전</div>
      `;
      list.prepend(noti);
      this.toast(`${title}: ${translatedContent}`, "info");

      // 알림 배지 처리 (있다면)
      const btn = document.getElementById("btn-noti-toggle");
      if (btn && !btn.querySelector(".noti-badge")) {
        const badge = document.createElement("span");
        badge.className = "noti-badge";
        btn.appendChild(badge);
      }
    },

    toggleNotiPopup(forceHide = false) {
      const popup = document.getElementById("popup-notifications");
      if (!popup) return;
      if (forceHide) {
        popup.classList.add("hidden");
      } else {
        popup.classList.toggle("hidden");
        // 팝업을 열면 배지 제거
        if (!popup.classList.contains("hidden")) {
          document.querySelector(".noti-badge")?.remove();
        }
      }
    },

    toggleSidebar() {
      const sidebar = document.getElementById("sidebar");
      if (sidebar) {
        sidebar.classList.toggle("collapsed");
        // 메인 컨텐츠 영역의 여백도 조절해야 할 수 있음 (CSS에서 처리 권장)
        document.querySelector(".main-content")?.classList.toggle("sidebar-collapsed");
      }
    },

    // --- Modal Logic ---
    toggleModal(show, mode = "login") {
      const modal = document.getElementById("modal-global");
      if (!modal) return;
      if (show) {
        modal.classList.remove("hidden");
        modal.style.display = "flex";
        const titleEl = document.getElementById("modal-title");
        const fieldsEl = document.getElementById("modal-fields");
        if (titleEl) titleEl.textContent = mode === "login" ? "로그인" : "회원가입";
        if (fieldsEl) {
          fieldsEl.innerHTML = mode === "register" ? `
            <div class="field">
              <label>닉네임</label>
              <div style="display:flex; gap:8px;">
                <input type="text" id="modal-username" placeholder="사용할 닉네임" autofocus style="flex:1" />
                <button type="button" id="btn-check-nick" class="secondary-btn" style="padding:0 12px; font-size:12px; white-space:nowrap;">중복확인</button>
              </div>
              <small id="nick-msg" style="display:block; margin-top:4px; font-size:11px;"></small>
            </div>
            <div class="field"><label>이메일</label><input type="email" id="modal-email" placeholder="이메일@주소.com" /></div>
            <div class="field"><label>비밀번호</label><input type="password" id="modal-pw" placeholder="6자리 이상 비밀번호" /></div>
          ` : `
            <div class="field"><label>이메일</label><input type="email" id="modal-email" placeholder="이메일 입력" autofocus /></div>
            <div class="field"><label>비밀번호</label><input type="password" id="modal-pw" placeholder="비밀번호" /></div>
          `;
        }
        document.getElementById("btn-modal-submit").dataset.mode = mode;
        
        // 하단 안내 문구 및 버튼 텍스트 변경
        const switchTextEl = document.getElementById("txt-modal-switch");
        const switchBtnEl = document.getElementById("btn-modal-switch");
        if (switchTextEl && switchBtnEl) {
          if (mode === "register") {
            switchTextEl.textContent = "이미 계정이 있으신가요?";
            switchBtnEl.textContent = "로그인";
          } else {
            switchTextEl.textContent = "계정이 없으신가요?";
            switchBtnEl.textContent = "회원가입";
          }
        }
      } else {
        modal.classList.add("hidden");
        modal.style.display = "none";
      }
    },

    async checkUsername() {
      const nick = document.getElementById("modal-username")?.value.trim();
      if (!nick || nick.length < 2) return this.toast("닉네임은 2자 이상이어야 합니다.", "error");
      const { data } = await getClient().from('profiles').select('username').eq('username', nick);
      const msgEl = document.getElementById("nick-msg");
      if (data && data.length > 0) {
        msgEl.textContent = "이미 사용 중인 닉네임입니다."; msgEl.style.color = "#ff4d4d";
        this.state.isNickChecked = false;
      } else {
        msgEl.textContent = "사용 가능한 닉네임입니다."; msgEl.style.color = "#4dff4d";
        this.state.isNickChecked = true;
        this.state.checkedNick = nick;
      }
    },

    // --- Authentication ---
    async handleAuth() {
      const client = getClient();
      const mode = document.getElementById("btn-modal-submit").dataset.mode;
      const email = document.getElementById("modal-email")?.value.trim();
      const password = document.getElementById("modal-pw")?.value.trim();
      const username = document.getElementById("modal-username")?.value.trim();

      if (mode === "register") {
        if (!this.state.isNickChecked || this.state.checkedNick !== username) return this.toast("닉네임 중복 확인을 해주세요.", "error");
        if (password.length < 6) return this.toast("비밀번호는 6자리 이상이어야 합니다.", "error");
        const { error } = await client.auth.signUp({ 
          email, 
          password, 
          options: { 
            data: { username },
            emailRedirectTo: 'https://emailauthentication.shop'
          } 
        });
        if (error) return this.toast(error.message, "error");
        this.addNotification("회원가입", "회원가입 성공! 메일 인증 후 로그인 가능합니다.");
        this.toggleModal(true, "login");
      } else {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) return this.toast(error.message, "error");
        location.reload();
      }
    },

    async withdrawAccount() {
      if (!confirm("정말로 탈퇴하시겠습니까? 모든 데이터가 삭제되며 이 닉네임은 다른 사람이 사용할 수 있게 됩니다.")) return;
      
      const client = getClient();
      const { error } = await client.rpc('withdraw_user');
      
      if (error) {
        console.error("Withdraw error:", error);
        return this.toast("탈퇴 처리 중 오류가 발생했습니다: " + error.message, "error");
      }
      
      this.toast("탈퇴가 완료되었습니다. 그동안 이용해주셔서 감사합니다.", "success");
      await client.auth.signOut();
      setTimeout(() => location.reload(), 1500);
    },

    async updateStreamInfo() {
      const title = document.getElementById("ipt-stream-title").value.trim();
      const category = document.getElementById("sel-stream-category").value;
      if (!title) return this.toast("방송 제목을 입력해주세요.", "error");

      const client = getClient();
      const user = this.state.currentUser;

      // 이미 방송 정보가 있는지 확인
      const { data: existing } = await client.from('streams')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      let error;
      if (existing) {
        // 업데이트
        const { error: err } = await client.from('streams')
          .update({ title, category })
          .eq('user_id', user.id);
        error = err;
      } else {
        // 신규 생성
        const { error: err } = await client.from('streams')
          .insert({
            user_id: user.id,
            username: user.username,
            title,
            category,
            status: 'off'
          });
        error = err;
      }

      if (error) {
        this.toast("방송 정보 업데이트 실패: " + error.message, "error");
      } else {
        this.addNotification("방송 설정", "방송 정보가 성공적으로 업데이트되었습니다.");
        this.loadStreams(); // 목록 갱신
      }
    },

    async checkSession() {
      const client = getClient();
      const { data: { session } } = await client.auth.getSession();
      
      if (session?.user) {
        // 이메일 인증 여부 확인
        if (!session.user.email_confirmed_at) {
          this.addNotification("보안", "이메일 인증이 필요합니다. 메일함을 확인해 주세요.");
          await client.auth.signOut();
          return;
        }

        this.state.isLoggedIn = true;
        const { data: profile } = await client.from('profiles').select('*').eq('id', session.user.id).single();
        this.state.currentUser = profile;
        this.updateProfileUI();
      }
      this.render();
    },

    async updateProfileUI() {
      const u = this.state.currentUser;
      if (!u) return;
      document.getElementById("mp-username").textContent = u.username;
      document.getElementById("mp-email").textContent = u.email;
      document.getElementById("mp-cash-val").textContent = u.cash?.toLocaleString() || "0";
      document.getElementById("header-avatar").src = u.avatar_url;
      document.getElementById("mp-avatar").src = u.avatar_url;
      document.getElementById("user-cash").textContent = u.cash?.toLocaleString() || "0";
      
      // 스트림 설정 정보 업데이트
      document.getElementById("rtmp-url").value = RTMP_URL;
      document.getElementById("stream-key-val").value = u.stream_key;

      // 기존 방송 정보 불러오기
      const { data: stream } = await getClient().from('streams')
        .select('title, category')
        .eq('user_id', u.id)
        .maybeSingle();
      
      if (stream) {
        document.getElementById("ipt-stream-title").value = stream.title || "";
        document.getElementById("sel-stream-category").value = stream.category || "저스트 채팅";
      }
    },

    toggleStreamKey() {
      const el = document.getElementById("stream-key-val");
      this.state.isStreamKeyVisible = !this.state.isStreamKeyVisible;
      el.type = this.state.isStreamKeyVisible ? "text" : "password";
      const btn = el.nextElementSibling;
      if (btn) btn.innerHTML = `<i data-lucide="${this.state.isStreamKeyVisible ? 'eye-off' : 'eye'}"></i>`;
      if (window.lucide) window.lucide.createIcons();
    },

    // --- Streaming & View ---
    switchView(viewId) {
      if (viewId === 'mypage' && !this.state.isLoggedIn) {
        this.toast("로그인이 필요한 서비스입니다.", "info");
        this.toggleModal(true, 'login');
        return;
      }
      document.querySelectorAll(".content-view").forEach(v => v.classList.add("hidden"));
      document.getElementById(`view-${viewId}`)?.classList.remove("hidden");
      document.querySelectorAll(".side-link, .m-nav-link").forEach(n => {
        n.classList.toggle("active", n.dataset.view === viewId);
      });
      if (viewId !== "player") this.stopVideo();
      this.render();
    },

    async loadStreams() {
      const { data } = await getClient().from('streams').select('*').order('created_at', { ascending: false });
      this.state.streams = data || [];
      this.renderGrids();
    },

    render() {
      const guest = document.getElementById("zone-guest");
      const user = document.getElementById("zone-user");
      if (this.state.isLoggedIn) {
        guest?.classList.add("hidden"); user?.classList.remove("hidden");
      } else {
        guest?.classList.remove("hidden"); user?.classList.add("hidden");
      }
      this.renderGrids();
    },

    renderGrids() {
      const configs = [
        { id: "grid-home", filter: s => s.status === "live", type: 'live' },
        { id: "grid-live", filter: s => s.status === "live", type: 'live' },
        { id: "grid-vod", filter: s => s.status === "vod", type: 'vod' }
      ];
      configs.forEach(cfg => {
        const el = document.getElementById(cfg.id);
        if (!el) return;
        const filtered = this.state.streams.filter(cfg.filter);
        
        if (filtered.length) {
          el.innerHTML = filtered.map(s => `
            <div class="stream-card" onclick="window.app.openStream('${s.id}')">
              <div class="thumb-box">
                <img src="${s.thumbnail_url || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400'}" />
                <div class="card-category">${s.category || '저스트 채팅'}</div>
              </div>
              <div class="card-details">
                <div class="card-txt">
                  <div class="c-title">${s.title}</div>
                  <div class="c-channel">${s.username}</div>
                </div>
              </div>
            </div>
          `).join("");
        } else {
          // 타입별 다른 메시지 출력
          const isVod = cfg.type === 'vod';
          el.innerHTML = `
            <div class="empty-msg-box">
              <div class="empty-icon-circle">
                <i data-lucide="${isVod ? 'history' : 'video-off'}"></i>
              </div>
              <h3>${isVod ? '아직 저장된 영상이 없어요' : '지금은 방송 중인 채널이 없어요'}</h3>
              <p>${isVod ? '스트리머가 방송을 종료하면 이곳에서 다시볼 수 있습니다.' : '직접 첫 번째 방송의 주인공이 되어보세요!'}</p>
              ${isVod ? '' : '<button class="primary-btn" onclick="window.app.switchView(\'mypage\')">방송 시작하기</button>'}
            </div>
          `;
        }
        if (window.lucide) window.lucide.createIcons();
      });
    },

    async openStream(id) {
      const s = this.state.streams.find(x => x.id === id);
      if (!s) return;
      
      // 스트리머의 고유 스트림 키를 가져오기 위해 프로필 정보 조회
      const { data: profile } = await getClient().from('profiles').select('stream_key').eq('username', s.username).single();
      const streamKey = profile ? profile.stream_key : 'test';

      this.switchView("player");
      document.getElementById("p-title").textContent = s.title;
      document.getElementById("p-ch").textContent = s.username;
      document.getElementById("p-img").src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.username}`;
      
      // 실제 미디어 서버의 HLS 주소 연결
      const video = document.getElementById("main-video");
      const streamUrl = `${HLS_BASE_URL}/${streamKey}/index.m3u8`;
      
      console.log("[StreamX] Playing HLS:", streamUrl);

      if (Hls.isSupported()) {
        if (hls) hls.destroy();
        hls = new Hls();
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) console.warn("HLS 치명적 오류, 방송이 오프라인일 수 있습니다.");
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamUrl;
        video.addEventListener('loadedmetadata', () => video.play());
      }
    },

    stopVideo() {
      const video = document.getElementById("main-video");
      if (video) { video.pause(); video.src = ""; }
      if (hls) { hls.destroy(); hls = null; }
    }
  };

  window.app = App;
  document.addEventListener("DOMContentLoaded", () => {
    App.checkSession();
    App.loadStreams();
    document.addEventListener("click", (e) => {
      const t = e.target.closest("button, a, .side-link, .m-nav-link, .user-avatar-circle");
      const isNotiArea = e.target.closest("#popup-notifications") || e.target.closest("#btn-noti-toggle");
      
      if (!isNotiArea) {
        App.toggleNotiPopup(true);
      }

      if (!t) return;
      const id = t.id;
      if (t.dataset.view) { e.preventDefault(); App.switchView(t.dataset.view); }
      else if (id === "btn-check-nick") App.checkUsername();
      else if (id === "btn-modal-submit") App.handleAuth();
      else if (id === "btn-update-stream") App.updateStreamInfo();
      else if (id === "btn-logout") getClient().auth.signOut().then(() => location.reload());
      else if (id === "btn-withdraw") App.withdrawAccount();
      else if (id === "lnk-home-logo") { e.preventDefault(); App.switchView("home"); }
      else if (id === "btn-modal-close") App.toggleModal(false);
      else if (id === "btn-noti-toggle") App.toggleNotiPopup();
      else if (id === "btn-sidebar-toggle") App.toggleSidebar();
      else if (id === "btn-modal-switch") {
        const title = document.getElementById("modal-title")?.textContent;
        App.toggleModal(true, title === "로그인" ? "register" : "login");
      }
    });
    if (window.lucide) window.lucide.createIcons();
  });
})();
