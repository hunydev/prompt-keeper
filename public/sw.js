// 서비스 워커 - PWA 설치 지원용 (오프라인 캐싱 없음)
const CACHE_NAME = 'prompt-keeper-v1';

// 설치 이벤트 - 기본적인 설치만 처리
self.addEventListener('install', (event) => {
  console.log('Service Worker: Install');
  // 즉시 활성화
  self.skipWaiting();
});

// 활성화 이벤트
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activate');
  // 즉시 클라이언트 제어
  event.waitUntil(self.clients.claim());
});

// 페치 이벤트 - 네트워크 우선 (오프라인 캐싱 없음)
self.addEventListener('fetch', (event) => {
  // 단순히 네트워크 요청을 그대로 전달
  event.respondWith(fetch(event.request));
});

// PWA 설치 프롬프트 관련 메시지 처리
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
