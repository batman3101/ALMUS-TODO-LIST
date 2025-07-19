interface TranslationResponse {
  data: {
    translations: Array<{
      translatedText: string;
      detectedSourceLanguage?: string;
    }>;
  };
}

interface TranslationCache {
  [key: string]: {
    translatedText: string;
    timestamp: number;
  };
}

// 번역 캐시 (메모리 기반)
const translationCache: TranslationCache = {};
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24시간

/**
 * Google Translation API를 사용하여 텍스트를 번역합니다.
 * @param text 번역할 텍스트
 * @param targetLanguage 대상 언어 (예: 'vi', 'ko')
 * @param sourceLanguage 원본 언어 (선택사항)
 * @returns 번역된 텍스트
 */
export const translateText = async (
  text: string,
  targetLanguage: string,
  sourceLanguage?: string
): Promise<string> => {
  if (!text.trim()) {
    return text;
  }

  // 캐시 키 생성
  const cacheKey = `${text}_${targetLanguage}_${sourceLanguage || 'auto'}`;
  const now = Date.now();

  // 캐시에서 확인
  if (
    translationCache[cacheKey] &&
    now - translationCache[cacheKey].timestamp < CACHE_DURATION
  ) {
    return translationCache[cacheKey].translatedText;
  }

  try {
    // Google Translation API 호출
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${process.env.REACT_APP_GOOGLE_TRANSLATE_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          target: targetLanguage,
          source: sourceLanguage || 'auto',
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Translation API error: ${response.status}`);
    }

    const data: TranslationResponse = await response.json();
    const translatedText = data.data.translations[0]?.translatedText || text;

    // 캐시에 저장
    translationCache[cacheKey] = {
      translatedText,
      timestamp: now,
    };

    return translatedText;
  } catch (error) {
    console.error('Translation failed:', error);
    // 번역 실패 시 원본 텍스트 반환
    return text;
  }
};

/**
 * 캐시를 정리합니다 (오래된 항목 제거)
 */
export const clearTranslationCache = (): void => {
  const now = Date.now();
  Object.keys(translationCache).forEach(key => {
    if (now - translationCache[key].timestamp > CACHE_DURATION) {
      delete translationCache[key];
    }
  });
};

/**
 * 특정 언어로 번역된 텍스트를 가져옵니다.
 * @param text 원본 텍스트
 * @param targetLanguage 대상 언어
 * @returns 번역된 텍스트 또는 원본 텍스트
 */
export const getTranslatedText = async (
  text: string,
  targetLanguage: string
): Promise<string> => {
  if (targetLanguage === 'ko') {
    return text; // 한국어는 번역하지 않음
  }

  return await translateText(text, targetLanguage);
};
