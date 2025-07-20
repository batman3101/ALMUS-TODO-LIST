import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSelector: React.FC = () => {
  const { i18n, t } = useTranslation();

  const handleLanguageChange = (language: string) => {
    i18n.changeLanguage(language);
  };

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-gray-600 dark:text-dark-600">{t('app.language')}:</span>
      <div className="flex bg-gray-100 dark:bg-dark-200 rounded-lg p-1 transition-colors duration-200">
        <button
          onClick={() => handleLanguageChange('ko')}
          className={`px-3 py-1 text-sm rounded-md transition-colors duration-200 ${
            i18n.language === 'ko'
              ? 'bg-white dark:bg-dark-50 text-gray-900 dark:text-dark-900 shadow-sm'
              : 'text-gray-600 dark:text-dark-600 hover:text-gray-900 dark:hover:text-dark-900'
          }`}
        >
          {t('language.korean')}
        </button>
        <button
          onClick={() => handleLanguageChange('vi')}
          className={`px-3 py-1 text-sm rounded-md transition-colors duration-200 ${
            i18n.language === 'vi'
              ? 'bg-white dark:bg-dark-50 text-gray-900 dark:text-dark-900 shadow-sm'
              : 'text-gray-600 dark:text-dark-600 hover:text-gray-900 dark:hover:text-dark-900'
          }`}
        >
          {t('language.vietnamese')}
        </button>
      </div>
    </div>
  );
};

export default LanguageSelector;
