import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ko from '../locales/ko.json';
import vi from '../locales/vi.json';

const resources = {
  ko: {
    translation: ko,
  },
  vi: {
    translation: vi,
  },
};

// 브라우저 언어 감지 및 베트남 우선 설정
const detectInitialLanguage = () => {
  // 1. localStorage에 저장된 언어가 있으면 사용
  const savedLanguage = localStorage.getItem('language');
  if (savedLanguage && ['ko', 'vi'].includes(savedLanguage)) {
    return savedLanguage;
  }
  
  // 2. 브라우저 언어 감지
  const browserLanguage = navigator.language.toLowerCase();
  
  // 베트남어 우선 감지 (vi, vi-VN, vi-vn 등)
  if (browserLanguage.startsWith('vi')) {
    return 'vi';
  }
  
  // 한국어 감지 (ko, ko-KR, ko-kr 등)
  if (browserLanguage.startsWith('ko')) {
    return 'ko';
  }
  
  // 3. 기본값은 베트남어 (주요 사용자층 고려)
  return 'vi';
};

i18n.use(initReactI18next).init({
  resources,
  lng: detectInitialLanguage(),
  fallbackLng: 'vi', // 폴백도 베트남어로 변경
  interpolation: {
    escapeValue: false, // React는 이미 XSS를 방지하므로 false
  },
  react: {
    useSuspense: false, // Suspense 사용하지 않음
  },
});

// 언어 변경시 localStorage에 저장
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('language', lng);
});

export default i18n;
