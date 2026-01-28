import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, UserPlus, LogIn, KeyRound, ArrowLeft } from 'lucide-react';
import { OtpInput } from './OtpInput';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './LanguageSwitcher';

interface AuthProps {
    onAuthSuccess: () => void;
    isInitialized?: boolean;
}

export default function Auth({ onAuthSuccess, isInitialized = true }: AuthProps) {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(!isInitialized);
    const [error, setError] = useState<string | null>(null);

    // OTP State
    const [loginMode, setLoginMode] = useState<'password' | 'otp'>('password');
    const [otpStep, setOtpStep] = useState<'email' | 'verify'>('email');
    const [otp, setOtp] = useState('');

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            first_name: firstName,
                            last_name: lastName,
                            full_name: `${firstName} ${lastName}`.trim()
                        }
                    }
                });
                if (error) throw error;
                onAuthSuccess();
            } else if (loginMode === 'password') {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                onAuthSuccess();
            } else if (loginMode === 'otp') {
                if (otpStep === 'email') {
                    const { error } = await supabase.auth.signInWithOtp({
                        email,
                        options: { shouldCreateUser: false }
                    });
                    if (error) throw error;
                    setOtpStep('verify');
                } else {
                    await handleVerifyOtp();
                }
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase.auth.verifyOtp({
                email,
                token: otp,
                type: 'magiclink'
            });
            if (error) throw error;
            if (!data.session) throw new Error('Failed to create session');
            onAuthSuccess();
        } catch (err: any) {
            setError(err.message || t('auth.invalid_code'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center p-8 h-full bg-gradient-to-t from-bg to-bg/50">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-xl glass p-12 space-y-10 relative"
            >
                <div className="absolute top-4 right-4 z-50">
                    <LanguageSwitcher position="bottom" />
                </div>
                <div className="text-center space-y-2 pt-2">
                    <h2 className="text-3xl font-black italic tracking-tighter uppercase">
                        {!isInitialized && isSignUp
                            ? t('auth.title_init')
                            : isSignUp ? t('auth.title_join') : (loginMode === 'otp' ? t('auth.title_mystic') : t('auth.title_login'))}
                    </h2>
                    <p className="text-xs text-fg/40 font-mono tracking-widest uppercase">
                        {!isInitialized && isSignUp
                            ? t('auth.desc_init')
                            : loginMode === 'otp'
                                ? (otpStep === 'email' ? t('auth.desc_mystic_email') : t('auth.desc_mystic_code'))
                                : t('auth.desc_login')}
                    </p>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
                    <AnimatePresence mode="wait">
                        {isSignUp && (
                            <motion.div
                                key="signup-fields"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="grid grid-cols-2 gap-4 overflow-hidden"
                            >
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-fg/30 ml-1">{t('auth.first_name')}</label>
                                    <input
                                        type="text"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        className="w-full bg-black/20 border border-border/20 rounded-xl py-3 px-4 text-sm focus:border-primary/50 outline-none transition-all"
                                        placeholder={t('auth.first_name_placeholder')}
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-fg/30 ml-1">{t('auth.last_name')}</label>
                                    <input
                                        type="text"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        className="w-full bg-black/20 border border-border/20 rounded-xl py-3 px-4 text-sm focus:border-primary/50 outline-none transition-all"
                                        placeholder={t('auth.last_name_placeholder')}
                                        required
                                    />
                                </div>
                            </motion.div>
                        )}

                        {loginMode === 'otp' && otpStep === 'verify' ? (
                            <motion.div
                                key="otp-verify"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6 py-4"
                            >
                                <div className="flex justify-center">
                                    <OtpInput
                                        value={otp}
                                        onChange={setOtp}
                                        length={6}
                                        onComplete={(code) => {
                                            setOtp(code);
                                            // Auto-verify if needed, or just let them click
                                        }}
                                        error={!!error}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setOtpStep('email')}
                                    className="w-full text-[10px] font-bold uppercase text-primary/40 hover:text-primary transition-colors tracking-widest"
                                >
                                    {t('auth.change_email')}
                                </button>
                                <button
                                    type="button"
                                    disabled={loading || otp.length !== 6}
                                    onClick={handleVerifyOtp}
                                    className="w-full py-4 bg-gradient-to-r from-primary to-accent text-white font-bold rounded-xl shadow-lg glow-primary hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <LogIn size={18} />}
                                    {t('auth.verify_code')}
                                </button>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="base-login"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="space-y-4"
                            >
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-fg/30 ml-1">{t('auth.email_address')}</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-fg/20" size={16} />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full bg-black/20 border border-border/20 rounded-xl py-3 pl-10 pr-4 text-sm focus:border-primary/50 outline-none transition-all"
                                            placeholder={t('auth.email_placeholder')}
                                            required
                                        />
                                    </div>
                                </div>

                                {(isSignUp || loginMode === 'password') && (
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase text-fg/30 ml-1">{t('auth.complexity_key')}</label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-fg/20" size={16} />
                                            <input
                                                type="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="w-full bg-black/20 border border-border/20 rounded-xl py-3 pl-10 pr-4 text-sm focus:border-primary/50 outline-none transition-all"
                                                placeholder={t('auth.password_placeholder')}
                                                required
                                            />
                                        </div>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-4 bg-gradient-to-r from-primary to-accent text-white font-bold rounded-xl shadow-lg glow-primary hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                    {isSignUp ? <UserPlus size={18} /> : <LogIn size={18} />}
                                    {isSignUp ? t('auth.init_account') : (loginMode === 'otp' ? t('auth.send_code') : t('auth.unseal_engine'))}
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </form>

                {
                    error && loginMode === 'password' && (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-xs text-error font-medium bg-error/10 p-3 rounded-lg border border-error/10"
                        >
                            {error}
                        </motion.p>
                    )
                }

                <div className="space-y-4">
                    {!isSignUp && (
                        <div className="flex flex-col gap-2">
                            {loginMode === 'password' ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setLoginMode('otp');
                                        setOtpStep('email');
                                        setError(null);
                                    }}
                                    className="w-full flex items-center justify-center gap-2 py-3 glass hover:bg-surface text-xs font-bold uppercase tracking-widest transition-all text-fg/40 hover:text-primary"
                                >
                                    <KeyRound size={16} /> {t('auth.sign_in_code')}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setLoginMode('password');
                                        setError(null);
                                    }}
                                    className="w-full flex items-center justify-center gap-2 py-3 glass hover:bg-surface text-xs font-bold uppercase tracking-widest transition-all text-fg/40 hover:text-primary"
                                >
                                    <ArrowLeft size={16} /> {t('auth.sign_in_password')}
                                </button>
                            )}
                        </div>
                    )}

                    <p className="text-center text-xs text-fg/40">
                        {isSignUp ? t('auth.already_alchemist') : t('auth.new_to_alchemy')} {' '}
                        <button
                            onClick={() => {
                                setIsSignUp(!isSignUp);
                                setLoginMode('password');
                                setError(null);
                            }}
                            className="text-primary font-bold hover:underline"
                        >
                            {isSignUp ? t('auth.login_instead') : t('auth.create_account')}
                        </button>
                    </p>
                </div>
            </motion.div >
        </div >
    );
}
