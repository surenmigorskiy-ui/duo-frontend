import { Language } from '../types';
import { ru } from './ru';
import { en } from './en';
import { uz } from './uz';
import { es } from './es';
import { de } from './de';
import { fr } from './fr';
import { zh } from './zh';
import { ja } from './ja';
import { ko } from './ko';
import { pt } from './pt';

// Проверяем, что все переводы загружены
const allTranslations = {
  ru,
  en,
  uz,
  es,
  de,
  fr,
  zh,
  ja,
  ko,
  pt,
};

export const translations: { [key in Language]: typeof ru } = allTranslations;

export type TranslationKey = keyof typeof ru;
export type TranslationPath = string; // Например, 'dashboard.title' или 'common.save'

export const t = (lang: Language, path: TranslationPath): string => {
  try {
    if (!path) return '';
    
    const keys = path.split('.');
    let value: any = translations[lang] || translations.ru;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key as keyof typeof value];
      } else {
        // Fallback на русский, если ключ не найден
        value = translations.ru;
        for (const k of keys) {
          if (value && typeof value === 'object' && k in value) {
            value = value[k as keyof typeof value];
          } else {
            console.warn(`Translation key not found: ${path}`);
            return path; // Возвращаем путь, если не найдено
          }
        }
        break;
      }
    }
    
    return typeof value === 'string' ? value : path;
  } catch (error) {
    console.error('Translation error:', error, 'path:', path, 'lang:', lang);
    return path;
  }
};

