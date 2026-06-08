import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function FooterText() {
    const { t } = useTranslation();
    return (
        <p><small>
            {t('footer.terms')}{' '}
            <Link to="/terms">{t('footer.termsLink')}</Link>
            {' · '}
            <a href="/privacy.html">{t('footer.privacyLink')}</a>
            {' · '}
            <a href="mailto:skypattern@protonmail.com?subject=Abuse%20Report">{t('footer.reportAbuse')}</a>
        </small></p>
    );
}
