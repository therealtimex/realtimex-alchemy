import React, { useState, useEffect } from 'react';
import { User, Shield, Save, Camera, Volume2, VolumeX, Key, Loader2, Database, RefreshCw, CheckCircle, ExternalLink, Trash2, AlertCircle, LogOut } from 'lucide-react';
import { getSupabaseConfig, clearSupabaseConfig, getConfigSource } from '../lib/supabase-config';
import { checkMigrationStatus, type MigrationStatus } from '../lib/migration-check';
import { SetupWizard } from './SetupWizard';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';

export function AccountSettings() {
    const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'supabase'>('profile');
    const [loading, setLoading] = useState(false);

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <header className="px-8 py-6 border-b border-border/10">
                <h2 className="text-2xl font-bold tracking-tight">Account Configuration</h2>
                <p className="text-sm text-fg/50 font-medium">Manage your Alchemist profile and essence links.</p>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Internal Sidebar */}
                <aside className="w-64 border-r border-border/10 p-4 space-y-1">
                    <TabButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<User size={18} />} label="Profile" />
                    <TabButton active={activeTab === 'security'} onClick={() => setActiveTab('security')} icon={<Shield size={18} />} label="Security" />
                    <TabButton active={activeTab === 'supabase'} onClick={() => setActiveTab('supabase')} icon={<Database size={18} />} label="Supabase" />
                </aside>

                {/* Content */}
                <main className="flex-1 overflow-y-auto custom-scrollbar p-8">
                    {activeTab === 'profile' && <ProfileSection />}
                    {activeTab === 'security' && <SecuritySection />}
                    {activeTab === 'supabase' && <SupabaseSection />}
                </main>
            </div>
        </div>
    );
}

function ProfileSection() {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [soundEnabled, setSoundEnabled] = useState(true);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        setEmail(user.email || '');

        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

        if (profile) {
            setFirstName(profile.first_name || '');
            setLastName(profile.last_name || '');
            setAvatarUrl(profile.avatar_url);
        }

        // Fetch sound preference
        const { data: settings } = await supabase
            .from('alchemy_settings')
            .select('sound_enabled')
            .eq('user_id', user.id)
            .maybeSingle();

        if (settings) {
            setSoundEnabled(settings.sound_enabled ?? true);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase
            .from('profiles')
            .upsert({
                id: user.id,
                first_name: firstName,
                last_name: lastName,
                full_name: firstName && lastName ? `${firstName} ${lastName}` : (firstName || lastName || null)
            });

        // Save sound preference
        await supabase
            .from('alchemy_settings')
            .update({ sound_enabled: soundEnabled })
            .eq('user_id', user.id);

        setIsSaving(false);
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/avatar-${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', user.id);

            setAvatarUrl(publicUrl);
        } catch (error) {
            console.error('Avatar upload failed:', error);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <section className="flex items-start gap-8">
                <div className="relative group">
                    <div className="w-32 h-32 rounded-3xl bg-surface border border-border/20 flex items-center justify-center overflow-hidden shadow-xl">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <User size={48} className="text-fg/20" />
                        )}
                    </div>
                    <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-3xl">
                        <Camera size={24} className="text-white" />
                        <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={isUploading} />
                    </label>
                    {isUploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-3xl">
                            <Loader2 size={24} className="text-primary animate-spin" />
                        </div>
                    )}
                </div>

                <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <InputGroup label="First Name" value={firstName} onChange={setFirstName} placeholder="Zosimos" />
                        <InputGroup label="Last Name" value={lastName} onChange={setLastName} placeholder="of Panopolis" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-fg/30 ml-1">Email Address (Locked)</label>
                        <input
                            type="email"
                            value={email}
                            readOnly
                            className="w-full bg-black/10 border border-border/10 rounded-xl py-3 px-4 text-sm text-fg/40 cursor-not-allowed"
                        />
                    </div>
                </div>
            </section>

            {/* Sound Effects Toggle */}
            <section className="glass p-6 space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                    {soundEnabled ? <Volume2 size={20} className="text-primary" /> : <VolumeX size={20} className="text-fg/40" />}
                    Sound Effects
                </h3>
                <p className="text-xs text-fg/40">Enable audio feedback for sync events and signal discoveries.</p>

                <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`w-full p-4 rounded-xl border-2 transition-all ${soundEnabled
                        ? 'bg-primary/10 border-primary/30 text-primary'
                        : 'bg-surface border-border/20 text-fg/40'
                        }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">
                            {soundEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                        {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                    </div>
                </button>
            </section>

            {/* Logout Section */}
            <section className="glass p-6 space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                    <LogOut size={20} className="text-error" />
                    Sign Out
                </h3>
                <p className="text-xs text-fg/40">End your current session and return to the login screen.</p>

                <button
                    onClick={() => supabase.auth.signOut()}
                    className="w-full p-4 rounded-xl border-2 bg-error/10 border-error/30 text-error hover:bg-error hover:text-white transition-all"
                >
                    <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">Logout</span>
                        <LogOut size={18} />
                    </div>
                </button>
            </section>

            <div className="flex justify-end pt-4 border-t border-border/10">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-6 py-3 bg-gradient-to-r from-primary to-accent text-white font-bold rounded-xl shadow-lg glow-primary hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
                >
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    Preserve Profile
                </button>
            </div>
        </div>
    );
}

function SecuritySection() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleUpdatePassword = async () => {
        if (!password || password !== confirmPassword) {
            setError('Complexity keys do not match.');
            return;
        }
        if (password.length < 8) {
            setError('Entropy too low. Minimum 8 characters.');
            return;
        }

        setIsSaving(true);
        setError(null);
        setSuccess(false);

        const { error } = await supabase.auth.updateUser({ password });

        if (error) {
            setError(error.message);
        } else {
            setSuccess(true);
            setPassword('');
            setConfirmPassword('');
        }
        setIsSaving(false);
    };

    return (
        <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="glass p-6 space-y-6">
                <h3 className="text-lg font-bold flex items-center gap-2">
                    <Key size={20} className="text-error" /> Update Entropy Key
                </h3>

                <div className="space-y-4">
                    <InputGroup label="New Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
                    <InputGroup label="Confirm Password" type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="••••••••" />
                </div>

                {error && <p className="text-xs text-error font-mono bg-error/5 p-3 rounded-lg border border-error/10">{error}</p>}
                {success && <p className="text-xs text-success font-mono bg-success/5 p-3 rounded-lg border border-success/10">Key rotation successful.</p>}

                <div className="flex justify-end pt-2">
                    <button
                        onClick={handleUpdatePassword}
                        disabled={isSaving}
                        className="px-6 py-3 bg-error/10 text-error hover:bg-error hover:text-white font-bold rounded-xl border border-error/20 transition-all flex items-center gap-2"
                    >
                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Shield size={18} />}
                        Rotate Key
                    </button>
                </div>
            </div>
        </div>
    );
}

function SupabaseSection() {
    const [showWizard, setShowWizard] = useState(false);
    const [migrationInfo, setMigrationInfo] = useState<MigrationStatus | null>(null);
    const config = getSupabaseConfig();
    const source = getConfigSource();

    useEffect(() => {
        if (config) {
            checkMigrationStatus(supabase).then(setMigrationInfo);
        }
    }, []);

    const handleClearConfig = () => {
        if (confirm('Sever connection to this essence? This will reset local resonance.')) {
            clearSupabaseConfig();
            window.location.reload();
        }
    };

    return (
        <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <section className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Database size={20} className="text-primary" /> Essence Resonance
                        </h3>
                        <p className="text-xs text-fg/40 font-medium">Bring Your Own Keys (BYOK) for intelligence persistence.</p>
                    </div>
                </div>

                <div className="glass p-8 space-y-8">
                    {config ? (
                        <>
                            <div className="flex items-start gap-4 p-4 glass bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                                <CheckCircle className="w-6 h-6 text-emerald-500 mt-1" />
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <p className="font-bold text-fg italic uppercase tracking-tighter">Established Link</p>
                                        {migrationInfo?.latestMigrationTimestamp && (
                                            <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                                v{migrationInfo.latestMigrationTimestamp}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs font-mono text-fg/40 break-all">{config.url}</p>
                                </div>
                            </div>

                            {source === 'env' && (
                                <div className="flex items-center gap-3 p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                                    <AlertCircle size={16} className="text-amber-500" />
                                    <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest leading-none">
                                        Active from environment variables. UI override enabled.
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setShowWizard(true)}
                                    className="px-4 py-3 glass hover:bg-surface text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                >
                                    <RefreshCw size={14} /> Realign Link
                                </button>
                                {source === 'ui' && (
                                    <button
                                        onClick={handleClearConfig}
                                        className="px-4 py-3 glass border-error/10 hover:bg-error/10 text-error/60 hover:text-error text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                    >
                                        <Trash2 size={14} /> Sever Link
                                    </button>
                                )}
                            </div>

                            <div className="space-y-1 pt-4 border-t border-border/10">
                                <label className="text-[9px] font-bold uppercase tracking-widest text-fg/20 ml-1">Anon Secret Fragment</label>
                                <div className="p-3 bg-black/20 rounded-xl font-mono text-[11px] text-fg/30 break-all border border-white/5">
                                    {config.anonKey.substring(0, 32)}...
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
                            <Database size={48} className="text-fg/10" />
                            <div className="space-y-2">
                                <p className="font-bold italic uppercase tracking-tighter">No Essence Resonance</p>
                                <p className="text-xs text-fg/40 max-w-[240px]">The Alchemist requires a cloud core to store intelligence fragments.</p>
                            </div>
                            <button
                                onClick={() => setShowWizard(true)}
                                className="px-8 py-3 bg-primary text-white font-bold rounded-xl shadow-lg glow-primary hover:scale-[1.02] transition-all uppercase tracking-widest text-xs"
                            >
                                Initiate Link
                            </button>
                        </div>
                    )}
                </div>
            </section>

            <SetupWizard open={showWizard} onComplete={() => setShowWizard(false)} canClose={true} />
        </div>
    );
}

function TabButton({ active, icon, label, onClick }: { active: boolean, icon: React.ReactElement, label: string, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active
                ? 'glass bg-primary/10 text-primary border-primary/20 shadow-sm'
                : 'text-fg/40 hover:bg-surface hover:text-fg'
                }`}
        >
            {active ? React.cloneElement(icon, { className: 'text-primary' }) : icon}
            <span className="font-semibold text-sm">{label}</span>
        </button>
    );
}

function InputGroup({ label, value, onChange, placeholder, type = 'text' }: { label: string, value: string, onChange: (v: string) => void, placeholder: string, type?: string }) {
    return (
        <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-fg/30 ml-1">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-black/20 border border-border/20 rounded-xl py-3 px-4 text-sm focus:border-primary/50 outline-none transition-all"
                placeholder={placeholder}
            />
        </div>
    );
}

function ProviderOption({ active, label, icon, onClick }: { active: boolean, label: string, icon: string, onClick: () => void }) {
    return (
        <div
            onClick={onClick}
            className={`glass p-4 text-center cursor-pointer transition-all ${active ? 'border-primary bg-primary/5 shadow-inner' : 'opacity-40 hover:opacity-100'}`}
        >
            <div className="text-2xl mb-2">{icon}</div>
            <div className="text-[10px] font-bold uppercase tracking-tighter">{label}</div>
        </div>
    );
}
