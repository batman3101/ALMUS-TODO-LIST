const fs = require('fs');
const path = require('path');

// 소스 및 대상 경로
const srcDir = path.join(__dirname, '..', 'apps', 'web-app', 'dist');
const destDir = path.join(__dirname, '..', 'dist');

// dist 디렉토리가 존재하지 않으면 생성
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// 파일 복사 함수
function copyRecursive(src, dest) {
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest);
    }
    fs.readdirSync(src).forEach(file => {
      copyRecursive(path.join(src, file), path.join(dest, file));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

// 파일 복사 실행
try {
  console.log('Copying build files...');
  copyRecursive(srcDir, destDir);
  console.log('Build files copied successfully!');
} catch (error) {
  console.error('Error copying files:', error);
  process.exit(1);
}