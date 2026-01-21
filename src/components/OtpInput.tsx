import React, { useRef, useState, KeyboardEvent, ClipboardEvent } from "react";

interface OtpInputProps {
    length?: number;
    value: string;
    onChange: (value: string) => void;
    onComplete?: (value: string) => void;
    disabled?: boolean;
    error?: boolean;
}

export function OtpInput({
    length = 6,
    value,
    onChange,
    onComplete,
    disabled = false,
    error = false,
}: OtpInputProps) {
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

    const handleChange = (index: number, inputValue: string) => {
        const digit = inputValue.replace(/[^0-9]/g, "");

        if (digit.length === 0) {
            const valArray = value.split('');
            if (index < valArray.length) {
                valArray.splice(index, 1);
            }
            const updatedValue = valArray.join('');
            onChange(updatedValue);
            if (index > 0) {
                inputRefs.current[index - 1]?.focus();
            }
            return;
        }

        const newChars = [...value];
        newChars[index] = digit[0];
        const resultingStr = newChars.join("");
        onChange(resultingStr);

        if (index < length - 1 && digit !== "") {
            inputRefs.current[index + 1]?.focus();
        }

        if (resultingStr.length === length && onComplete) {
            onComplete(resultingStr);
        }
    };

    const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !value[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        } else if (e.key === "ArrowLeft" && index > 0) {
            inputRefs.current[index - 1]?.focus();
        } else if (e.key === "ArrowRight" && index < length - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData("text/plain");
        const digits = pastedData.replace(/[^0-9]/g, "").slice(0, length);
        onChange(digits);

        const nextIndex = Math.min(digits.length, length - 1);
        inputRefs.current[nextIndex]?.focus();

        if (digits.length === length && onComplete) {
            onComplete(digits);
        }
    };

    return (
        <div className="flex gap-2 justify-center">
            {Array.from({ length }).map((_, index) => (
                <input
                    key={index}
                    ref={(el) => {
                        inputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={value[index] || ""}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    onFocus={() => setFocusedIndex(index)}
                    onBlur={() => setFocusedIndex(null)}
                    disabled={disabled}
                    className={`
                        w-10 h-10 sm:w-12 sm:h-12 text-center text-lg font-black
                        bg-black/20 border border-border/50 rounded-xl outline-none transition-all
                        ${error ? 'border-error/50 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'focus:border-primary/50'}
                        ${focusedIndex === index ? 'border-primary/50 bg-black/40 scale-105' : ''}
                        disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                    aria-label={`Digit ${index + 1}`}
                />
            ))}
        </div>
    );
}
