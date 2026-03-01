/**
 * STREAMX - Global Controller (Full OBS + Media Server Integration)
 */

(function() {
  console.log("[StreamX] System Booting...");

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
            <div class="field"><label>이메일</label><input type="email" id="modal-email" placeholder="email@example.com" /></div>
            <div class="field"><label>비밀번호</label><input type="password" id="modal-pw" placeholder="6자리 이상 비밀번호" /></div>
          ` : `
            <div class="field"><label>이메일</label><input type="email" id="modal-email" placeholder="이메일 입력" autofocus /></div>
            <div class="field"><label>비밀번호</label><input type="password" id="modal-pw" placeholder="비밀번호" /></div>
          `;
        }
        document.getElementById("btn-modal-submit").dataset.mode = mode;
      } else {
        modal.classList.add("hidden");
        modal.style.display = "none";
      }
    },

    async checkUsername() {
      const nick = document.getElementById("modal-username")?.value.trim();
      if (!nick || nick.length < 2) return alert("닉네임은 2자 이상이어야 합니다.");
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
        if (!this.state.isNickChecked || this.state.checkedNick !== username) return alert("닉네임 중복 확인을 해주세요.");
        if (password.length < 6) return alert("비밀번호는 6자리 이상이어야 합니다.");
        const { error } = await client.auth.signUp({ 
          email, 
          password, 
          options: { 
            data: { username },
            emailRedirectTo: 'https://emailauthentication.shop'
          } 
        });
        if (error) return alert(error.message);
        alert("회원가입 성공! 메일 인증 후 로그인 가능합니다.");
        this.toggleModal(true, "login");
      } else {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) return alert(error.message);
        location.reload();
      }
    },

    async withdrawAccount() {
      if (!confirm("정말로 탈퇴하시겠습니까? 모든 데이터가 삭제되며 이 닉네임은 다른 사람이 사용할 수 있게 됩니다.")) return;
      
      const client = getClient();
      const { error } = await client.rpc('withdraw_user');
      
      if (error) {
        console.error("Withdraw error:", error);
        return alert("탈퇴 처리 중 오류가 발생했습니다: " + error.message);
      }
      
      alert("탈퇴가 완료되었습니다. 그동안 이용해주셔서 감사합니다.");
      await client.auth.signOut();
      location.reload();
    },

    async updateStreamInfo() {
      const title = document.getElementById("ipt-stream-title").value.trim();
      const category = document.getElementById("sel-stream-category").value;
      if (!title) return alert("방송 제목을 입력해주세요.");

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
            status: 'live'
          });
        error = err;
      }

      if (error) {
        alert("방송 정보 업데이트 실패: " + error.message);
      } else {
        alert("방송 정보가 성공적으로 업데이트되었습니다.");
        this.loadStreams(); // 목록 갱신
      }
    },

    async checkSession() {
      const client = getClient();
      const { data: { session } } = await client.auth.getSession();
      if (session?.user) {
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
        document.getElementById("sel-stream-category").value = stream.category || "Just Chatting";
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
        { id: "grid-home", filter: s => s.status === "live" },
        { id: "grid-live", filter: s => s.status === "live" },
        { id: "grid-vod", filter: s => s.status === "vod" }
      ];
      configs.forEach(cfg => {
        const el = document.getElementById(cfg.id);
        if (!el) return;
        const filtered = this.state.streams.filter(cfg.filter);
        el.innerHTML = filtered.length ? filtered.map(s => `
          <div class="stream-card" onclick="window.app.openStream('${s.id}')">
            <div class="thumb-box">
              <img src="${s.thumbnail_url || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400'}" />
              <div class="card-category">${s.category || 'Just Chatting'}</div>
            </div>
            <div class="card-details">
              <div class="card-txt">
                <div class="c-title">${s.title}</div>
                <div class="c-channel">${s.username}</div>
              </div>
            </div>
          </div>
        `).join("") : '<div class="empty-msg">내용이 없습니다.</div>';
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
          if (data.fatal) console.warn("HLS Fatal Error, stream might be offline.");
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
      else if (id === "btn-modal-switch") {
        const title = document.getElementById("modal-title")?.textContent;
        App.toggleModal(true, title === "로그인" ? "register" : "login");
      }
    });
    if (window.lucide) window.lucide.createIcons();
  });
})();
