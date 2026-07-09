export function Mascot({ size = '2.5em', className }: { size?: string | number; className?: string }) {
    return (
        <svg
            viewBox="0 0 64 64"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            className={`mascot ${className ?? ''}`.trim()}
            style={{ width: size, height: size, display: 'inline-block', flexShrink: 0 }}
        >
            {/* little antenna */}
            <line x1="32" y1="11" x2="32" y2="16" stroke="var(--primary-border)" strokeWidth="2" strokeLinecap="round" />
            <circle cx="32" cy="8" r="3" fill="var(--primary)" />

            {/* nub arms */}
            <ellipse cx="8" cy="40" rx="4" ry="5.5" fill="var(--bg-surface)" stroke="var(--primary-border)" strokeWidth="2" transform="rotate(-20 8 40)" />
            <ellipse cx="56" cy="40" rx="4" ry="5.5" fill="var(--bg-surface)" stroke="var(--primary-border)" strokeWidth="2" transform="rotate(20 56 40)" />

            {/* mochi body */}
            <ellipse cx="32" cy="37" rx="25" ry="23" fill="var(--bg-surface)" stroke="var(--primary-border)" strokeWidth="2.5" />

            {/* blush cheeks */}
            <ellipse cx="17" cy="41" rx="4.2" ry="2.8" fill="var(--error-border)" opacity="0.35" />
            <ellipse cx="47" cy="41" rx="4.2" ry="2.8" fill="var(--error-border)" opacity="0.35" />

            {/* eyes */}
            <circle cx="22" cy="35" r="3.2" fill="var(--color-text)" />
            <circle cx="42" cy="35" r="3.2" fill="var(--color-text)" />
            <circle cx="23" cy="33.7" r="0.9" fill="var(--bg-surface)" />
            <circle cx="43" cy="33.7" r="0.9" fill="var(--bg-surface)" />

            {/* smile */}
            <path d="M26 44 Q32 49 38 44" stroke="var(--color-text)" strokeWidth="2" strokeLinecap="round" fill="none" />

            {/* check badge, tying back to the app's checkmark branding */}
            <circle cx="32" cy="52" r="6.5" fill="var(--primary-bg)" stroke="var(--primary-border)" strokeWidth="1.4" />
            <polyline points="29,52 31.5,54.5 35.5,49" stroke="var(--primary)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
    );
}
