export function CheckIcon({ size = '1em' }: { size?: string | number }) {
    return (
        <svg
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            style={{ width: size, height: size, verticalAlign: '-0.15em', display: 'inline-block', flexShrink: 0 }}
        >
            <rect x="1.5" y="1.5" width="13.5" height="13.5" rx="3" fill="var(--primary-bg)" stroke="var(--primary-border)" strokeWidth="1.5" />
            <polyline points="4,8.5 7,11.5 12.5,5" stroke="var(--primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}
