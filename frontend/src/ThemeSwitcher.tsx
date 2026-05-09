import { useColorScheme } from './useColorScheme.ts';
import { useTranslation } from 'react-i18next';

export function ThemeSwitcher() {
    const { scheme, setScheme } = useColorScheme();
    const { t } = useTranslation();

    return (
        <select value={scheme} onChange={e => setScheme(e.target.value as any)}
                style={{ font: 'inherit', fontSize: '0.9em', padding: '1px 4px', cursor: 'pointer',
                         background: 'transparent', border: 'none', color: 'inherit' }}>
            <option value="light">{t('footer.lightMode')}</option>
            <option value="dark">{t('footer.darkMode')}</option>
            <option value="parchment">{t('footer.parchmentMode')}</option>
        </select>
    );
}
