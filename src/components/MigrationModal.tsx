import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Database, Terminal, Shield, ExternalLink, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MigrationStatus } from '../lib/migration-check';
import { getSupabaseConfig } from '../lib/supabase-config';

interface MigrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    status: MigrationStatus | null;
}

export function MigrationModal({ isOpen, onClose, status }: MigrationModalProps) {
    const { t } = useTranslation();
    const [isMigrating, setIsMigrating] = useState(false);
    const [migrationLogs, setMigrationLogs] = useState<string[]>([]);
    const [projectId, setProjectId] = useState('');
    const [accessToken, setAccessToken] = useState('');
    const logsEndRef = useRef<HTMLDivElement>(null);

    // Auto-detect project ID from Supabase URL if possible
    useEffect(() => {
        const config = getSupabaseConfig();
        const supabaseUrl = config?.url || import.meta.env.VITE_SUPABASE_URL;
        if (supabaseUrl) {
            try {
                const url = new URL(supabaseUrl);
                // Handle different hostname formats (e.g. projectref.supabase.co or custom domains)
                const parts = url.hostname.split('.');
                const projectRef = parts[0];
                setProjectId(projectRef);
            } catch (e) {
                console.error('Failed to parse Supabase URL for Project ID');
            }
        }
    }, [isOpen]);

    // Scroll logs to bottom
    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [migrationLogs]);

    const handleStartMigration = async () => {
        if (!projectId || !accessToken) return;

        setIsMigrating(true);
        setMigrationLogs([`🚀 Initializing migration for project: ${projectId}...`]);

        try {
            const response = await fetch('/api/migrate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, accessToken })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to start migration');
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error('Stream not available');

            const decoder = new TextDecoder();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const { type, data } = JSON.parse(line.substring(6));
                            if (type === 'stdout' || type === 'stderr' || type === 'info') {
                                setMigrationLogs(prev => [...prev, data]);
                            } else if (type === 'done') {
                                if (data === 'success') {
                                    setMigrationLogs(prev => [...prev, '✅ Migration completed successfully! Reloading in 3 seconds...']);
                                    setTimeout(() => window.location.reload(), 3000);
                                } else {
                                    setMigrationLogs(prev => [...prev, '❌ Migration failed. Please check logs above.']);
                                }
                            }
                        } catch (e) {
                            // Raw text fallback
                            setMigrationLogs(prev => [...prev, line]);
                        }
                    }
                }
            }
        } catch (err: any) {
            setMigrationLogs(prev => [...prev, `❌ Error: ${err.message}`]);
        } finally {
            setIsMigrating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[110] p-4 font-sans">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5 bg-gradient-to-r from-primary/5 to-transparent">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary border border-primary/20">
                            <Database size={22} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight">Database Migration</h2>
                            <p className="text-xs text-white/50 uppercase tracking-widest font-bold mt-0.5">Engine Update Required</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isMigrating}
                        className="p-2 hover:bg-white/5 rounded-lg transition-all text-white/40 hover:text-white disabled:opacity-20"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
                    <div className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-3">
                        <div className="flex items-start gap-3">
                            <div className="mt-1 text-primary">
                                <RefreshCw size={18} />
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm text-white font-medium">New schema version detected.</p>
                                <p className="text-xs text-white/60 leading-relaxed">
                                    Your application code (version <span className="text-primary font-mono">{status?.appTimestamp}</span>) requires database updates that haven't been applied to your current database (version <span className="text-fg/50 font-mono">{status?.dbTimestamp || 'unknown'}</span>).
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <div className="flex items-center h-5 px-1">
                                    <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Project ID</label>
                                </div>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/30">
                                        <Database size={14} />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Supabase Project ID"
                                        value={projectId}
                                        readOnly
                                        disabled={isMigrating}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white/50 cursor-not-allowed outline-none transition-all placeholder:text-white/20"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center h-5 px-1">
                                    <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Access Token</label>
                                    <a
                                        href="https://supabase.com/dashboard/account/tokens"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[10px] text-primary hover:underline flex items-center gap-1 font-bold"
                                    >
                                        GET TOKEN <ExternalLink size={10} />
                                    </a>
                                </div>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/30 group-focus-within:text-primary transition-colors">
                                        <Shield size={14} />
                                    </div>
                                    <input
                                        type="password"
                                        placeholder="sbp_..."
                                        value={accessToken}
                                        onChange={(e) => setAccessToken(e.target.value)}
                                        disabled={isMigrating}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:border-primary/40 focus:ring-1 focus:ring-primary/20 outline-none transition-all placeholder:text-white/20"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleStartMigration}
                            disabled={isMigrating || !projectId || !accessToken}
                            className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-30 disabled:hover:scale-100 uppercase tracking-widest text-xs"
                        >
                            {isMigrating ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    Migrating...
                                </>
                            ) : (
                                <>
                                    <Terminal className="w-4 h-4" />
                                    Execute Migration
                                </>
                            )}
                        </button>
                    </div>

                    {/* Console Output */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-white/40 uppercase tracking-widest ml-1">Execution Log</label>
                        <div className="bg-black/80 rounded-xl border border-white/5 p-4 h-48 overflow-y-auto font-mono text-[10px] leading-relaxed relative">
                            {migrationLogs.length === 0 ? (
                                <div className="text-white/20 italic flex flex-col items-center justify-center h-full gap-2">
                                    <Terminal size={24} className="opacity-10" />
                                    Ready to process...
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {migrationLogs.map((log, i) => (
                                        <div key={i} className="flex gap-2">
                                            <span className="text-white/10 select-none">{(i + 1).toString().padStart(3, '0')}</span>
                                            <span className={`
                                                ${log.includes('✅') || log.includes('SUCCESS') ? 'text-success' : ''}
                                                ${log.includes('❌') || log.includes('Error') ? 'text-error' : ''}
                                                ${log.includes('🚀') || log.includes('Starting') ? 'text-primary font-bold' : ''}
                                                ${!log.includes('✅') && !log.includes('❌') && !log.includes('🚀') ? 'text-white/70' : ''}
                                            `}>
                                                {log}
                                            </span>
                                        </div>
                                    ))}
                                    <div ref={logsEndRef} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Info */}
                <div className="px-6 py-4 bg-white/[0.02] border-t border-white/5 flex items-center gap-3">
                    <div className="text-warning">
                        <AlertTriangle size={16} />
                    </div>
                    <p className="text-[10px] text-white/40 leading-tight">
                        Migration will apply cumulative schema updates to your Supabase instance. Do not close this window during execution.
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
