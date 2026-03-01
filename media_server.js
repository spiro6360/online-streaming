const NodeMediaServer = require('node-media-server');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');
const axios = require('axios');

// Supabase 설정
const SX_URL = 'https://swfntarctmeinyftddtx.supabase.co';
const SX_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm50YXJjdG1laW55ZnRkZHR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzY0MjcsImV4cCI6MjA4Nzg1MjQyN30.KrgHiEPqCXPnVNIMK1AIiuoUT1iQc4K2w1SX4RHpWVE';

// 썸네일 저장 경로 설정
const thumbnailDir = path.join(__dirname, 'thumbnails');
if (!fs.existsSync(thumbnailDir)) {
  fs.mkdirSync(thumbnailDir);
}

const config = {
  rtmp: {
    port: 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60
  },
  http: {
    port: 8000,
    allow_origin: '*',
    mediaroot: './media',
  },
  trans: {
    ffmpeg: '/usr/bin/ffmpeg',
    tasks: [
      {
        app: 'live',
        hls: true,
        hlsFlags: '[hls_time=2:hls_list_size=3:hls_flags=delete_segments]',
        hlsKeep: false
      }
    ]
  }
};

const nms = new NodeMediaServer(config);

// DB 상태 업데이트 함수
async function updateDBStatus(streamKey, status) {
  try {
    await axios.post(`${SX_URL}/rest/v1/rpc/update_stream_status_by_key`, 
      { p_stream_key: streamKey, p_status: status },
      { headers: { 'apikey': SX_KEY, 'Authorization': `Bearer ${SX_KEY}` } }
    );
    console.log(`[DB] ${streamKey}의 방송 상태가 ${status}(으)로 업데이트 되었습니다.`);
  } catch (error) {
    console.error(`[DB 에러] 상태 업데이트 실패: ${error.message}`);
  }
}

// 썸네일 생성 함수
function generateThumbnail(streamKey) {
  const inputUrl = `rtmp://localhost/live/${streamKey}`;
  const outputName = `${streamKey}.jpg`;
  const outputPath = path.join(thumbnailDir, outputName);

  setTimeout(() => {
    console.log(`[썸네일] ${streamKey}의 썸네일 생성 중...`);
    const cmd = `${config.trans.ffmpeg} -i ${inputUrl} -ss 00:00:01 -vframes 1 -y ${outputPath}`;
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.error(`[썸네일] 에러: ${err.message}`);
        return;
      }
      console.log(`[썸네일] 저장 완료: ${outputPath}`);
    });
  }, 5000);
}

nms.on('prePublish', (id, StreamPath, args) => {
  console.log('[노드 미디어 이벤트: 방송 시작]', `id=${id} 경로=${StreamPath}`);
  const streamKey = StreamPath.split('/').pop();
  
  // 1. 방송 시작 상태 업데이트
  updateDBStatus(streamKey, 'live');
  
  // 2. 썸네일 생성
  generateThumbnail(streamKey);
});

nms.on('donePublish', (id, StreamPath, args) => {
  console.log('[노드 미디어 이벤트: 방송 종료]', `id=${id} 경로=${StreamPath}`);
  const streamKey = StreamPath.split('/').pop();
  
  // 3. 방송 종료 상태 업데이트
  updateDBStatus(streamKey, 'off');
});

nms.run();

// 썸네일 서버
const thumbnailServer = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.url.startsWith('/thumbnails/')) {
    const filePath = path.join(__dirname, req.url);
    if (fs.existsSync(filePath)) {
      res.writeHead(200, { 'Content-Type': 'image/jpeg' });
      fs.createReadStream(filePath).pipe(res);
      return;
    }
  }
  res.writeHead(404);
  res.end();
});

thumbnailServer.listen(8001, () => {
  console.log('[StreamX] 썸네일 서버가 8001 포트에서 실행 중입니다.');
});
