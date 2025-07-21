export function getSessionId(): string | undefined {
  const match = document.cookie.match(/(?:^|; )session_id=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

export function setSessionId(id: string): void {
  const expires = 'Fri, 31 Dec 9999 23:59:59 GMT';
  document.cookie = `session_id=${encodeURIComponent(id)}; expires=${expires}; path=/; SameSite=Lax`;
}

// ID와 PW를 조합하여 해시 코드 생성
export async function generateSessionIdFromCredentials(username: string, password: string): Promise<string> {
  const combined = `${username}:${password}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(combined);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  // 32자리로 자르기
  return hashHex.substring(0, 32);
}

// 사용자 인증 정보 저장 (로컬 스토리지에 해시된 형태로)
export function saveUserCredentials(username: string): void {
  localStorage.setItem('username', username);
}

// 저장된 사용자명 가져오기
export function getSavedUsername(): string | null {
  return localStorage.getItem('username');
}

// 사용자 인증 정보 삭제
export function clearUserCredentials(): void {
  localStorage.removeItem('username');
  document.cookie = 'session_id=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax';
}

// 기존 랜덤 세션 ID 생성 함수 (마이그레이션용)
export function generateRandomSessionId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 32; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}
