import { motion } from 'framer-motion';

interface SwitchProps {
    id?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    size?: 'sm' | 'md' | 'lg';
    label?: string;
}

export function Switch({ id, checked, onChange, disabled = false, size = 'md', label }: SwitchProps) {
    const sizes = {
        sm: { width: 32, height: 18, dot: 14, padding: 2 },
        md: { width: 44, height: 24, dot: 18, padding: 3 },
        lg: { width: 56, height: 32, dot: 24, padding: 4 }
    };

    const config = sizes[size];

    return (
        <div className="flex items-center gap-2">
            <button
                type="button"
                id={id}
                role="switch"
                aria-checked={checked}
                disabled={disabled}
                onClick={() => !disabled && onChange(!checked)}
                className={`
                    relative flex items-center transition-colors duration-200 outline-none
                    ${checked ? 'bg-primary' : 'bg-surface-light/30 dark:bg-black/40'}
                    ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-opacity-80'}
                    rounded-full border border-border/10
                `}
                style={{
                    width: config.width,
                    height: config.height,
                    padding: config.padding
                }}
            >
                <motion.div
                    className="bg-white rounded-full shadow-sm"
                    animate={{
                        x: checked ? config.width - config.dot - config.padding * 2 : 0
                    }}
                    transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30
                    }}
                    style={{
                        width: config.dot,
                        height: config.dot
                    }}
                />
            </button>
            {label && (
                <label
                    htmlFor={id}
                    className={`text-xs font-medium cursor-pointer select-none transition-colors ${checked ? 'text-fg' : 'text-fg/50'}`}
                >
                    {label}
                </label>
            )}
        </div>
    );
}
