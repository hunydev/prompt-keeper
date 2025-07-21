// PWA 아이콘 생성 스크립트
// 이 스크립트는 기존 로고를 다양한 크기로 변환합니다.

// 필요한 아이콘 크기들
const iconSizes = [
  { size: 192, name: 'pwa-192x192.png' },
  { size: 512, name: 'pwa-512x512.png' },
  { size: 180, name: 'apple-touch-icon.png' },
];

console.log('PWA 아이콘 생성을 위한 안내:');
console.log('');
console.log('다음 크기의 아이콘들이 필요합니다:');
iconSizes.forEach(icon => {
  console.log(`- ${icon.name} (${icon.size}x${icon.size}px)`);
});
console.log('');
console.log('온라인 도구를 사용하여 아이콘을 생성하세요:');
console.log('1. https://realfavicongenerator.net/ 방문');
console.log('2. logo.png 파일 업로드');
console.log('3. PWA 설정에서 필요한 크기들 선택');
console.log('4. 생성된 파일들을 public 폴더에 저장');
console.log('');
console.log('또는 다음 명령어로 ImageMagick을 사용할 수 있습니다:');
console.log('');
iconSizes.forEach(icon => {
  console.log(`magick public/logo.png -resize ${icon.size}x${icon.size} public/${icon.name}`);
});
