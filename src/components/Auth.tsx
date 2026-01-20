import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { Mail, Lock, UserPlus, LogIn, Github } from 'lucide-react';

export default function Auth({ onAuthSuccess }: { onAuthSuccess: () => void }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = isSignUp
                ? await supabase.auth.signUp({ email, password })
                : await supabase.auth.signInWithPassword({ email, password });

            if (error) throw error;
            onAuthSuccess();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center p-8 h-full bg-gradient-to-t from-bg to-bg/50">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md glass p-8 space-y-8"
            >
                <div className="text-center space-y-2">
                    <h2 className="text-3xl font-black italic tracking-tighter">
                        {isSignUp ? 'JOIN THE CIRCLE' : 'ALCHEMIST LOGIN'}
                    </h2>
                    <p className="text-xs text-fg/40 font-mono tracking-widest uppercase">
                        Transmute your data into intelligence
                    </p>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-fg/30 ml-1">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-fg/20" size={16} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-black/20 border border-border/50 rounded-xl py-3 pl-10 pr-4 text-sm focus:border-primary/50 outline-none transition-all"
                                placeholder="alchemist@example.com"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-fg/30 ml-1">Complexity Key</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-fg/20" size={16} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-black/20 border border-border/50 rounded-xl py-3 pl-10 pr-4 text-sm focus:border-primary/50 outline-none transition-all"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-xs text-error font-medium bg-error/10 p-3 rounded-lg border border-error/20"
                        >
                            {error}
                        </motion.p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-gradient-to-r from-primary to-accent text-white font-bold rounded-xl shadow-lg glow-primary hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                        {isSignUp ? <UserPlus size={18} /> : <LogIn size={18} />}
                        {isSignUp ? 'INITIALIZE ACCOUNT' : 'UNSEAL ENGINE'}
                    </button>
                </form>

                <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/30"></div></div>
                    <div className="relative flex justify-center text-[10px] uppercase font-bold text-fg/20 bg-transparent px-2">OR</div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <button className="flex items-center justify-center gap-2 py-3 glass hover:bg-surface text-sm font-semibold transition-all">
                        <Github size={18} /> Continue with GitHub
                    </button>
                </div>

                <p className="text-center text-xs text-fg/40">
                    {isSignUp ? 'Already an Alchemist?' : 'New to Alchemy?'} {' '}
                    <button
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="text-primary font-bold hover:underline"
                    >
                        {isSignUp ? 'Login instead' : 'Create an account'}
                    </button>
                </p>
            </motion.div>
        </div>
    );
}
