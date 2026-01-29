import React, { useState, useEffect } from 'react';
import { Chrome, Zap, Check, AlertCircle, X, Plus, Loader2, Search, FolderOpen, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

export type BrowserType = 'chrome' | 'firefox' | 'safari' | 'edge' | 'brave' | 'arc' | 'vivaldi' | 'opera' | 'opera-gx' | 'chromium';

export interface BrowserSource {
    browser: BrowserType;
    path: string;
    enabled: boolean;
    label: string;
}

interface BrowserPath {
    browser: BrowserType;
    path: string;
    found: boolean;
    valid?: boolean;
    error?: string;
}

interface BrowserSourceManagerProps {
    sources: BrowserSource[];
    onChange: (sources: BrowserSource[]) => void;
}

const BROWSER_INFO: Record<BrowserType, { icon: React.ReactElement; name: string; color: string }> = {
    chrome: { icon: <Chrome size={18} />, name: 'Google Chrome', color: 'text-yellow-500' },
    firefox: { icon: <Globe size={18} />, name: 'Mozilla Firefox', color: 'text-orange-500' },
    safari: { icon: <Globe size={18} />, name: 'Safari', color: 'text-blue-500' },
    edge: { icon: <Globe size={18} />, name: 'Microsoft Edge', color: 'text-cyan-500' },
    brave: { icon: <Zap size={18} />, name: 'Brave', color: 'text-orange-400' },
    arc: { icon: <Zap size={18} />, name: 'Arc', color: 'text-purple-500' },
    vivaldi: { icon: <Globe size={18} />, name: 'Vivaldi', color: 'text-red-500' },
    opera: { icon: <Globe size={18} />, name: 'Opera', color: 'text-red-400' },
    'opera-gx': { icon: <Zap size={18} />, name: 'Opera GX', color: 'text-pink-500' },
    chromium: { icon: <Chrome size={18} />, name: 'Chromium', color: 'text-blue-400' },
};

export function BrowserSourceManager({ sources, onChange }: BrowserSourceManagerProps) {
    const { t } = useTranslation();
    const [detecting, setDetecting] = useState(false);
    const [detectedPaths, setDetectedPaths] = useState<Record<BrowserType, BrowserPath>>({} as any);
    const [customPath, setCustomPath] = useState('');
    const [customBrowser, setCustomBrowser] = useState<BrowserType>('chrome');
    const [validating, setValidating] = useState(false);

    const handleDetect = async () => {
        setDetecting(true);
        try {
            const { data } = await axios.get('/api/browser-paths/detect');
            setDetectedPaths(data);
        } catch (err) {
            console.error('Detection failed:', err);
        } finally {
            setDetecting(false);
        }
    };

    const handleAddDetected = (browser: BrowserType) => {
        const detected = detectedPaths[browser];
        if (!detected || !detected.found || !detected.valid) return;

        const existing = sources.find(s => s.browser === browser && s.path === detected.path);
        if (existing) return;

        const newSource: BrowserSource = {
            browser,
            path: detected.path,
            enabled: true,
            label: `${BROWSER_INFO[browser].name} (${t('engine.auto_detected')})`,
        };

        onChange([...sources, newSource]);
    };

    const handleAddCustom = async () => {
        if (!customPath.trim()) return;

        setValidating(true);
        try {
            const { data } = await axios.post('/api/browser-paths/validate', { path: customPath });

            if (!data.valid) {
                alert(t('engine.invalid_path', { error: data.error || t('engine.not_a_browser_db') }));
                setValidating(false);
                return;
            }

            const newSource: BrowserSource = {
                browser: customBrowser,
                path: customPath,
                enabled: true,
                label: `${BROWSER_INFO[customBrowser].name} (${t('engine.custom')})`,
            };

            onChange([...sources, newSource]);
            setCustomPath('');
        } catch (err) {
            console.error('Validation failed:', err);
            alert(t('engine.validation_failed'));
        } finally {
            setValidating(false);
        }
    };

    const handleToggle = (index: number) => {
        const updated = [...sources];
        updated[index].enabled = !updated[index].enabled;
        onChange(updated);
    };

    const handleRemove = (index: number) => {
        onChange(sources.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-6">
            {/* Auto-Detection Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-widest text-fg/40 flex items-center gap-2">
                        <Search size={14} /> {t('engine.auto_detect_title')}
                    </label>
                    <button
                        onClick={handleDetect}
                        disabled={detecting}
                        className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-all flex items-center gap-2"
                    >
                        {detecting ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                        {detecting ? t('engine.scanning') : t('engine.scan_system')}
                    </button>
                </div>

                {Object.keys(detectedPaths).length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(Object.keys(BROWSER_INFO) as BrowserType[]).map(browser => {
                            const detected = detectedPaths[browser];
                            const info = BROWSER_INFO[browser];
                            const alreadyAdded = sources.some(s => s.browser === browser && s.path === detected?.path);

                            return (
                                <motion.div
                                    key={browser}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className={`glass p-4 rounded-xl border ${detected?.found && detected?.valid
                                        ? 'border-success/20 bg-success/5'
                                        : detected?.found
                                            ? 'border-error/20 bg-error/5'
                                            : 'border-border/10'
                                        }`}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className={info.color}>{info.icon}</div>
                                            <span className="text-sm font-bold">{info.name}</span>
                                        </div>
                                        {detected?.found && detected?.valid ? (
                                            <Check size={16} className="text-success" />
                                        ) : detected?.found ? (
                                            <AlertCircle size={16} className="text-error" />
                                        ) : (
                                            <X size={16} className="text-fg/20" />
                                        )}
                                    </div>

                                    {detected?.found ? (
                                        <>
                                            <p className="text-[10px] font-mono text-fg/40 truncate mb-2">{detected.path}</p>
                                            {detected.valid ? (
                                                <button
                                                    onClick={() => handleAddDetected(browser)}
                                                    disabled={alreadyAdded}
                                                    className={`w-full py-1.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${alreadyAdded
                                                        ? 'bg-fg/5 text-fg/30 cursor-not-allowed'
                                                        : 'bg-success/10 hover:bg-success/20 text-success'
                                                        }`}
                                                >
                                                    {alreadyAdded ? t('engine.already_added') : t('engine.add_source')}
                                                </button>
                                            ) : (
                                                <p className="text-[10px] text-error font-medium">{detected.error}</p>
                                            )}
                                        </>
                                    ) : (
                                        <p className="text-[10px] text-fg/30 italic">{t('engine.not_found')}</p>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Manual Path Input */}
            <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-widest text-fg/40 flex items-center gap-2">
                    <FolderOpen size={14} /> {t('engine.add_custom_path')}
                </label>
                <div className="glass p-4 rounded-xl space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                        <select
                            value={customBrowser}
                            onChange={(e) => setCustomBrowser(e.target.value as BrowserType)}
                            className="bg-black/20 border border-border/5 rounded-xl py-2 px-3 text-sm focus:border-primary/30 outline-none transition-all"
                        >
                            {(Object.keys(BROWSER_INFO) as BrowserType[]).map(browser => (
                                <option key={browser} value={browser}>{BROWSER_INFO[browser].name}</option>
                            ))}
                        </select>
                        <input
                            type="text"
                            value={customPath}
                            onChange={(e) => setCustomPath(e.target.value)}
                            placeholder={t('engine.custom_path_placeholder')}
                            className="col-span-2 bg-black/20 border border-border/5 rounded-xl py-2 px-3 text-sm focus:border-primary/30 outline-none transition-all"
                        />
                    </div>
                    <button
                        onClick={handleAddCustom}
                        disabled={!customPath.trim() || validating}
                        className="w-full py-2.5 bg-gradient-to-r from-primary to-accent text-white font-bold rounded-xl shadow-lg hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale"
                    >
                        {validating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                        {validating ? t('engine.validating') : t('engine.add_custom_source')}
                    </button>
                </div>
            </div>

            {/* Configured Sources List */}
            {sources.length > 0 && (
                <div className="space-y-3">
                    <label className="text-xs font-bold uppercase tracking-widest text-fg/40">
                        {t('engine.configured_sources', { count: sources.length })}
                    </label>
                    <div className="space-y-2">
                        <AnimatePresence>
                            {sources.map((source, index) => (
                                <motion.div
                                    key={`${source.browser}-${source.path}`}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className={`glass p-4 rounded-xl border border-border/10 flex items-center justify-between ${!source.enabled && 'opacity-50'
                                        }`}
                                >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className={BROWSER_INFO[source.browser].color}>
                                            {BROWSER_INFO[source.browser].icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold">{source.label}</p>
                                            <p className="text-[10px] font-mono text-fg/40 truncate">{source.path}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleToggle(index)}
                                            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${source.enabled
                                                ? 'bg-success/10 text-success'
                                                : 'bg-fg/5 text-fg/40'
                                                }`}
                                        >
                                            {source.enabled ? t('engine.enabled') : t('engine.disabled')}
                                        </button>
                                        <button
                                            onClick={() => handleRemove(index)}
                                            className="p-2 hover:bg-error/10 text-error rounded-lg transition-all"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            )}
        </div>
    );
}
