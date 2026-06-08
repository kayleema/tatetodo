import {ColorScheme, useColorScheme} from './useColorScheme.ts';
import {useTranslation} from 'react-i18next';

export function ThemeSwitcher() {
    const {scheme, setScheme} = useColorScheme();
    const {t} = useTranslation();

    return (
        <select value={scheme} onChange={e => setScheme(e.target.value as ColorScheme)} className="secondary">
            <option value="light">{t('footer.lightMode')}</option>
            <option value="dark">{t('footer.darkMode')}</option>
            <option value="parchment">{t('footer.parchmentMode')}</option>
            <option value="hacker">{t('footer.hackerMode')}</option>
            <option value="sakura">{t('footer.sakuraMode')}</option>
            <option value="neon">{t('footer.neonMode')}</option>
        </select>
    );
}
