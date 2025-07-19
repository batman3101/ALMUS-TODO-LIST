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

i18n.use(initReactI18next).init({
  resources,
  lng: 'ko', // 기본 언어
  fallbackLng: 'ko',
  interpolation: {
    escapeValue: false, // React는 이미 XSS를 방지하므로 false
  },
  react: {
    useSuspense: false, // Suspense 사용하지 않음
  },
});

export default i18n;
