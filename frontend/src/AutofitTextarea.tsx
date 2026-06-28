import React, { useRef, useEffect, forwardRef, TextareaHTMLAttributes, useImperativeHandle, useCallback } from 'react';

type AutofitTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

const AutofitTextarea = forwardRef<HTMLTextAreaElement, AutofitTextareaProps>(
    (props: AutofitTextareaProps, ref) => {
        const textareaRef = useRef<HTMLTextAreaElement>(null);

        useImperativeHandle(ref, () => textareaRef.current!, []);

        // Function to calculate and adjust layout dimensions dynamically
        const adjustSize = useCallback(() => {
            const textarea = textareaRef.current;
            if (!textarea) return;

            // Detect if the component is currently rendered vertically
            const computedStyle = window.getComputedStyle(textarea);
            const isVertical = computedStyle.writingMode.startsWith('vertical-');

            if (isVertical) {
                // VERTICAL MODE: Auto-fit width, reset height changes
                textarea.style.height = ''; // Let standard CSS/classes handle height
                textarea.style.width = 'auto';
                // Offset calculation (adjust padding/borders if necessary)
                textarea.style.width = `${textarea.scrollWidth}px`;
            } else {
                // HORIZONTAL MODE: Auto-fit height, reset width changes
                textarea.style.width = '';
                textarea.style.height = 'auto';
                textarea.style.height = `${textarea.scrollHeight - 8}px`;
            }
        }, []);

        // Track dimension changes depending on layout direction
        useEffect(() => {
            const el = textareaRef.current;
            if (!el) return;

            let prevWidth = el.offsetWidth;
            let prevHeight = el.offsetHeight;

            const ro = new ResizeObserver(() => {
                const computedStyle = window.getComputedStyle(el);
                const isVertical = computedStyle.writingMode.startsWith('vertical-');

                if (isVertical) {
                    // In vertical mode, changing the HEIGHT causes text to re-wrap, changing width
                    const height = el.offsetHeight;
                    if (height !== prevHeight) {
                        prevHeight = height;
                        adjustSize();
                    }
                } else {
                    // In horizontal mode, changing the WIDTH causes text to re-wrap, changing height
                    const width = el.offsetWidth;
                    if (width !== prevWidth) {
                        prevWidth = width;
                        adjustSize();
                    }
                }
            });

            ro.observe(el);
            return () => ro.disconnect();
        }, [adjustSize]);

        // Adjust size on initial mount and whenever value updates externally
        useEffect(() => {
            adjustSize();
        }, [props.value, adjustSize]);

        const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            adjustSize();
            if (props.onChange) {
                props.onChange(e);
            }
        };

        return (
            <textarea
                {...props}
                ref={textareaRef}
                onChange={handleChange}
                rows={1}
                style={{
                    resize: 'none',
                    overflow: 'hidden', 
                    ...props.style
                }}
            />
        );
    }
);

export default AutofitTextarea;