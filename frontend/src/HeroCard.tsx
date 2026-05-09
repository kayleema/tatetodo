import { useTranslation } from 'react-i18next';

export function HeroCard({ scheme }: { scheme: 'light' | 'dark' | 'parchment' }) {
    const { t } = useTranslation();

    return (
        <article>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                <img
                    src={scheme === 'dark' ? '/mascot-dark.svg' : '/mascot.svg'}
                    alt="TateTodo mascot"
                    style={{ height: '130px', flexShrink: 0 }}
                />
                <div>
                    <h3 style={{ marginBlockEnd: '12px' }}>{t('home.heroTitle')}</h3>
                    <p style={{ margin: 0 }}>{t('home.heroDesc')}</p>
                </div>
            </div>
        </article>
    );
}
