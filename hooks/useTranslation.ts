import { Language } from '../types';
import { t } from '../locales';

export const useTranslation = (language: Language = 'ru') => {
  return (path: string): string => {
    try {
      return t(language || 'ru', path);
    } catch (error) {
      console.error('Translation hook error:', error);
      return path;
    }
  };
};

