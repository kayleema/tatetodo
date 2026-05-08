import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import ja from './locales/ja.json';
import en from './locales/en.json';
import ko from './locales/ko.json';

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            ja: { translation: ja },
            en: { translation: en },
            ko: { translation: ko },
        },
        fallbackLng: 'en',
        supportedLngs: ['ja', 'en', 'ko'],
        load: 'languageOnly',
        interpolation: { escapeValue: false },
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
            lookupLocalStorage: 'lang',
        },
    });

i18n.on('languageChanged', (lng) => {
    document.documentElement.lang = lng;
});
document.documentElement.lang = i18n.language;

export default i18n;
