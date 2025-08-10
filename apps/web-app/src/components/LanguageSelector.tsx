import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSelector: React.FC = () => {
  const { i18n, t } = useTranslation();

  const handleLanguageChange = (language: string) => {
    i18n.changeLanguage(language);
  };

  return (
    <div className="flex items-center space-x-2">
      {/* 데스크톱에서는 라벨 표시, 모바일에서는 숨김 */}
      <span className="hidden sm:inline text-sm text-gray-600 dark:text-dark-600">
        {t('app.language')}:
      </span>

      {/* 모바일 최적화 버튼 그룹 */}
      <div className="flex bg-gray-100 dark:bg-dark-200 rounded-lg p-1 transition-colors duration-200">
        {/* 베트남어 버튼 (주요 사용자이므로 먼저 배치) */}
        <button
          onClick={() => handleLanguageChange('vi')}
          className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 min-w-[60px] sm:min-w-[80px] ${
            i18n.language === 'vi'
              ? 'bg-white dark:bg-dark-50 text-gray-900 dark:text-dark-900 shadow-sm ring-1 ring-gray-200 dark:ring-dark-400'
              : 'text-gray-600 dark:text-dark-600 hover:text-gray-900 dark:hover:text-dark-900 hover:bg-gray-50 dark:hover:bg-dark-100'
          }`}
          title={t('language.vietnamese')}
        >
          <span className="sm:hidden">🇻🇳</span>
          <span className="hidden sm:inline">{t('language.vietnamese')}</span>
        </button>

        {/* 한국어 버튼 */}
        <button
          onClick={() => handleLanguageChange('ko')}
          className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 min-w-[60px] sm:min-w-[80px] ${
            i18n.language === 'ko'
              ? 'bg-white dark:bg-dark-50 text-gray-900 dark:text-dark-900 shadow-sm ring-1 ring-gray-200 dark:ring-dark-400'
              : 'text-gray-600 dark:text-dark-600 hover:text-gray-900 dark:hover:text-dark-900 hover:bg-gray-50 dark:hover:bg-dark-100'
          }`}
          title={t('language.korean')}
        >
          <span className="sm:hidden">🇰🇷</span>
          <span className="hidden sm:inline">{t('language.korean')}</span>
        </button>
      </div>
    </div>
  );
};

export default LanguageSelector;
