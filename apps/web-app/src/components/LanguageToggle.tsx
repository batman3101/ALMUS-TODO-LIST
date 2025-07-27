import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageToggle: React.FC = () => {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLanguage = i18n.language === 'ko' ? 'vi' : 'ko';
    i18n.changeLanguage(newLanguage);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="
        relative inline-flex items-center justify-center 
        w-10 h-10 rounded-lg
        bg-gray-100 hover:bg-gray-200 
        dark:bg-dark-100 dark:hover:bg-dark-200
        text-gray-600 dark:text-dark-600
        transition-all duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
        dark:focus:ring-offset-dark-50
      "
      aria-label={`Switch to ${i18n.language === 'ko' ? 'Vietnamese' : 'Korean'}`}
      title={`Switch to ${i18n.language === 'ko' ? 'Vietnamese' : 'Korean'}`}
    >
      {/* Korean Flag/Text (KO) */}
      <div
        className={`
          absolute inset-0 flex items-center justify-center transition-all duration-300
          ${
            i18n.language === 'ko'
              ? 'opacity-100 rotate-0 scale-100'
              : 'opacity-0 rotate-90 scale-75'
          }
        `}
      >
        <span className="text-xs font-bold">KO</span>
      </div>

      {/* Vietnamese Flag/Text (VI) */}
      <div
        className={`
          absolute inset-0 flex items-center justify-center transition-all duration-300
          ${
            i18n.language === 'vi'
              ? 'opacity-100 rotate-0 scale-100'
              : 'opacity-0 -rotate-90 scale-75'
          }
        `}
      >
        <span className="text-xs font-bold">VI</span>
      </div>
    </button>
  );
};

export default LanguageToggle;
