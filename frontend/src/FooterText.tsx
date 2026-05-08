import { useTranslation } from 'react-i18next';

export function FooterText() {
    const { t } = useTranslation();
    return <p><small>{t('footer.terms')}</small></p>;
}
