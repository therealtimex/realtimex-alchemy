import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './i18n/locales/en.json';
import fr from './i18n/locales/fr.json';
import es from './i18n/locales/es.json';
import ko from './i18n/locales/ko.json';
import ja from './i18n/locales/ja.json';
import vi from './i18n/locales/vi.json';

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: en },
            fr: { translation: fr },
            es: { translation: es },
            ko: { translation: ko },
            ja: { translation: ja },
            vi: { translation: vi }
        },
        supportedLngs: ['en', 'fr', 'es', 'ko', 'ja', 'vi'],
        fallbackLng: 'en',
        load: 'languageOnly', // Only load 'en' if 'en-US' is detected
        interpolation: {
            escapeValue: false // react already safes from xss
        },
        detection: {
            order: ['querystring', 'localStorage', 'navigator'],
            caches: ['localStorage'],
            lookupLocalStorage: 'i18nextLng' // Default but good to be explicit
        }
    });

export default i18n;
