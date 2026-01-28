import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Languages, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const languages = [
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'ko', label: '한국어', flag: '🇰🇷' },
    { code: 'ja', label: '日本語', flag: '🇯🇵' },
    { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' }
];

export function LanguageSwitcher({
    collapsed = false,
    position = 'bottom'
}: {
    collapsed?: boolean;
    position?: 'top' | 'bottom';
}) {
    const { i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLanguageChange = (code: string) => {
        i18n.changeLanguage(code);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-xs font-medium text-fg/70 ${collapsed ? 'justify-center px-1.5' : ''}`}
                title={collapsed ? currentLanguage.label : undefined}
            >
                {!collapsed && <Languages size={14} className="text-primary" />}
                <span>{currentLanguage.flag}</span>
                {!collapsed && (
                    <>
                        <span className="hidden sm:inline">{currentLanguage.label}</span>
                        <ChevronDown size={12} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                    </>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className={`absolute ${collapsed ? 'left-0' : 'right-0'} ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} w-48 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-[9999] overflow-y-auto max-h-[280px] scrollbar-thin scrollbar-thumb-white/10`}
                    >
                        <div className="py-1">
                            {languages.map((lang) => (
                                <button
                                    key={lang.code}
                                    onClick={() => handleLanguageChange(lang.code)}
                                    className="flex items-center justify-between w-full px-4 py-2.5 text-xs text-left hover:bg-white/5 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <span>{lang.flag}</span>
                                        <span className={lang.code === i18n.language ? 'text-primary font-bold' : 'text-fg/70'}>
                                            {lang.label}
                                        </span>
                                    </div>
                                    {lang.code === i18n.language && <Check size={14} className="text-primary" />}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
