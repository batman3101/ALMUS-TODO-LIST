#!/usr/bin/env node

/**
 * Firebase 데이터 백업 스크립트
 * 
 * 마이그레이션 전에 Firebase 데이터를 JSON 파일로 백업합니다.
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Firebase Admin 초기화
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
if (!serviceAccountPath || !fs.existsSync(serviceAccountPath)) {
  console.error('❌ Firebase 서비스 계정 파일을 찾을 수 없습니다.');
  console.log('FIREBASE_SERVICE_ACCOUNT_PATH 환경 변수를 설정해주세요.');
  process.exit(1);
}

const serviceAccount = require(path.resolve(serviceAccountPath));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// 백업할 컬렉션 목록
const collections = [
  'users',
  'teams',
  'team_members',
  'projects',
  'tasks',
  'comments',
  'notifications',
  'mentions',
  'permissions',
  'user_presence'
];

/**
 * 컬렉션 데이터를 백업하는 함수
 */
async function backupCollection(collectionName) {
  console.log(`📦 ${collectionName} 컬렉션 백업 중...`);
  
  try {
    const snapshot = await db.collection(collectionName).get();
    const documents = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      
      // Firestore Timestamp를 ISO 문자열로 변환
      const convertTimestamps = (obj) => {
        if (obj && typeof obj === 'object') {
          if (obj.constructor.name === 'Timestamp') {
            return obj.toDate().toISOString();
          }
          
          const newObj = {};
          for (const [key, value] of Object.entries(obj)) {
            if (Array.isArray(value)) {
              newObj[key] = value.map(convertTimestamps);
            } else if (value && typeof value === 'object') {
              newObj[key] = convertTimestamps(value);
            } else {
              newObj[key] = value;
            }
          }
          return newObj;
        }
        return obj;
      };
      
      documents.push({
        id: doc.id,
        data: convertTimestamps(data)
      });
    });
    
    console.log(`✅ ${collectionName}: ${documents.length}개 문서 백업 완료`);
    return documents;
    
  } catch (error) {
    console.error(`❌ ${collectionName} 백업 실패:`, error.message);
    return [];
  }
}

/**
 * 전체 백업 실행
 */
async function runBackup() {
  const startTime = Date.now();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  console.log('🗄️  Firebase 데이터 백업 시작...');
  console.log('시작 시간:', new Date().toLocaleString('ko-KR'));
  
  // 백업 디렉토리 생성
  const backupDir = path.join(__dirname, '..', 'backups', `firebase-backup-${timestamp}`);
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  const backupResults = {};
  let totalDocuments = 0;
  
  // 각 컬렉션 백업
  for (const collection of collections) {
    const documents = await backupCollection(collection);
    backupResults[collection] = documents;
    totalDocuments += documents.length;
    
    // 개별 컬렉션 파일로 저장
    const filePath = path.join(backupDir, `${collection}.json`);
    fs.writeFileSync(filePath, JSON.stringify(documents, null, 2));
  }
  
  // 전체 백업 파일 생성
  const fullBackupPath = path.join(backupDir, 'full-backup.json');
  const backupMetadata = {
    timestamp: new Date().toISOString(),
    totalCollections: collections.length,
    totalDocuments,
    collections: Object.keys(backupResults).map(name => ({
      name,
      documentCount: backupResults[name].length
    }))
  };
  
  const fullBackup = {
    metadata: backupMetadata,
    data: backupResults
  };
  
  fs.writeFileSync(fullBackupPath, JSON.stringify(fullBackup, null, 2));
  
  // 백업 완료 리포트
  const endTime = Date.now();
  const duration = Math.round((endTime - startTime) / 1000);
  
  console.log('\n📊 백업 완료 리포트');
  console.log('='.repeat(40));
  Object.entries(backupResults).forEach(([collection, documents]) => {
    console.log(`${collection.padEnd(15)} | ${documents.length.toString().padStart(4)}개 문서`);
  });
  console.log('='.repeat(40));
  console.log(`총 컬렉션     | ${collections.length}개`);
  console.log(`총 문서       | ${totalDocuments}개`);
  console.log(`소요 시간     | ${duration}초`);
  console.log(`백업 위치     | ${backupDir}`);
  
  console.log('\n✅ Firebase 데이터 백업이 완료되었습니다!');
  
  return backupDir;
}

// 스크립트 실행
if (require.main === module) {
  runBackup().then((backupPath) => {
    console.log(`\n📁 백업 파일 위치: ${backupPath}`);
    console.log('🔄 이제 마이그레이션을 실행할 수 있습니다.');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ 백업 실패:', error);
    process.exit(1);
  });
}

module.exports = { runBackup };