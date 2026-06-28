import React, {useRef, useEffect, forwardRef, TextareaHTMLAttributes, useImperativeHandle, useCallback} from 'react';

type AutofitTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

const AutofitTextarea = forwardRef<HTMLTextAreaElement, AutofitTextareaProps>(
    (props: AutofitTextareaProps, ref) => {
        const textareaRef = useRef<HTMLTextAreaElement>(null);

        useImperativeHandle(ref, () => textareaRef.current!, []);

        // Function to calculate and adjust the height
        const adjustHeight = useCallback(() => {
            const textarea = textareaRef.current;
            if (textarea) {
                // 1. Reset height to 'auto' so it can shrink if text is deleted
                textarea.style.height = 'auto';
                // 2. Set height to scrollHeight (plus a tiny bit if you have borders)
                textarea.style.height = `${textarea.scrollHeight - 8}px`;
            }
        }, []);

        // re-fit when the WIDTH changes (text rewraps -> height changes)
        useEffect(() => {
            const el = textareaRef.current;
            if (!el) return;
            let prevWidth = el.offsetWidth;
            const ro = new ResizeObserver(() => {
                const width = el.offsetWidth;
                if (width !== prevWidth) {     // ignore our own height mutations
                    prevWidth = width;
                    adjustHeight();
                }
            });
            ro.observe(el);
            return () => ro.disconnect();
        }, [adjustHeight]);

        // Adjust height on initial mount and whenever the value changes from the outside
        useEffect(() => {
            adjustHeight();
        }, [props.value]);

        // Intercept the native onChange to trigger resize on typing
        const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            adjustHeight();
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
                    overflow: 'hidden', // Hides scrollbars for a cleaner look
                    ...props.style
                }}
            />
        );
    });

export default AutofitTextarea;