// Sound synthesis utilities for UX feedback
// Ported from email-automator

class SoundEffects {
    private audioContext: AudioContext | null = null;
    private enabled: boolean = true;

    constructor() {
        // Initialize AudioContext lazily on first use
    }

    private getAudioContext(): AudioContext {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        return this.audioContext;
    }

    setEnabled(enabled: boolean) {
        this.enabled = enabled;
    }

    isEnabled(): boolean {
        return this.enabled;
    }

    private playTone(frequency: number, duration: number, volume: number = 0.3) {
        if (!this.enabled) return;

        try {
            const ctx = this.getAudioContext();
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.frequency.value = frequency;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(volume, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + duration);
        } catch (error) {
            console.warn('[Sound] Failed to play tone:', error);
        }
    }

    private playSequence(notes: Array<{ freq: number; duration: number; delay: number }>, volume: number = 0.3) {
        if (!this.enabled) return;

        let currentDelay = 0;
        notes.forEach(note => {
            setTimeout(() => {
                this.playTone(note.freq, note.duration, volume);
            }, currentDelay);
            currentDelay += note.delay;
        });
    }

    // Soft ascending chime for sync start
    syncStart() {
        this.playSequence([
            { freq: 261.63, duration: 0.15, delay: 0 },    // C4
            { freq: 329.63, duration: 0.15, delay: 100 },  // E4
            { freq: 392.00, duration: 0.2, delay: 100 }    // G4
        ], 0.2);
    }

    // Bright notification for signal found
    signalFound() {
        this.playSequence([
            { freq: 392.00, duration: 0.1, delay: 0 },     // G4
            { freq: 523.25, duration: 0.15, delay: 80 }    // C5
        ], 0.25);
    }

    // Success tone for sync complete
    syncComplete() {
        this.playSequence([
            { freq: 261.63, duration: 0.12, delay: 0 },    // C4
            { freq: 329.63, duration: 0.12, delay: 80 },   // E4
            { freq: 392.00, duration: 0.12, delay: 80 },   // G4
            { freq: 523.25, duration: 0.2, delay: 80 }     // C5
        ], 0.2);
    }

    // Alert tone for errors
    error() {
        this.playSequence([
            { freq: 329.63, duration: 0.15, delay: 0 },    // E4
            { freq: 261.63, duration: 0.2, delay: 100 }    // C4
        ], 0.3);
    }

    // Soft click for UI interactions
    click() {
        this.playTone(440, 0.05, 0.15);
    }
}

// Singleton instance
export const soundEffects = new SoundEffects();
