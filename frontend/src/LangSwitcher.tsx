import { useTranslation } from 'react-i18next';

const LANGS = [
    { code: 'ja', key: 'lang.ja' },
    { code: 'en', key: 'lang.en' },
    { code: 'ko', key: 'lang.ko' },
] as const;

export function LangSwitcher() {
    const { t, i18n } = useTranslation();
    return (
        <>
            {LANGS.map(({ code, key }, i) => (
                <span key={code}>
                    {i > 0 && ' · '}
                    {i18n.language === code
                        ? <strong className="linkSpacing">{t(key)}</strong>
                        : <a href="#" onClick={e => { e.preventDefault(); i18n.changeLanguage(code); }}>{t(key)}</a>
                    }
                </span>
            ))}
        </>
    );
}
