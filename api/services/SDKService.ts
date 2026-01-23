import { RealtimeXSDK } from '@realtimex/sdk';

/**
 * Centralized SDK Service
 * Manages RealTimeX SDK initialization and provides singleton access
 */
export class SDKService {
    private static instance: RealtimeXSDK | null = null;
    private static initAttempted = false;

    /**
     * Initialize SDK with required permissions
     * Safe to call multiple times - returns existing instance
     */
    static initialize(): RealtimeXSDK {
        if (!this.instance && !this.initAttempted) {
            this.initAttempted = true;

            try {
                this.instance = new RealtimeXSDK({
                    permissions: [
                        // LLM
                        'llm.chat',
                        'llm.providers',
                        // Embedding
                        'llm.embed',
                        // Vectors
                        'vectors.read',
                        'vectors.write',
                    ],
                });

                console.log('[SDKService] RealTimeX SDK initialized successfully');
            } catch (error: any) {
                console.warn('[SDKService] Failed to initialize SDK:', error.message);
                this.instance = null;
            }
        }

        return this.instance!;
    }

    /**
     * Get SDK instance (initializes if needed)
     */
    static getSDK(): RealtimeXSDK | null {
        if (!this.instance && !this.initAttempted) {
            this.initialize();
        }
        return this.instance;
    }

    /**
     * Check if SDK is available and working
     */
    static async isAvailable(): Promise<boolean> {
        try {
            const sdk = this.getSDK();
            if (!sdk) return false;

            // Try to fetch providers as a health check
            await sdk.llm.getProviders();
            return true;
        } catch (error) {
            console.warn('[SDKService] SDK not available:', error);
            return false;
        }
    }

    /**
     * Get dynamic port from SDK (or fallback)
     */
    static async getPort(fallback: number = 3018): Promise<number> {
        try {
            const sdk = this.getSDK();
            if (!sdk) return fallback;

            const port = await sdk.port.getPort();
            console.log(`[SDKService] Using SDK port: ${port}`);
            return port;
        } catch (error) {
            console.log(`[SDKService] SDK port not available, using fallback: ${fallback}`);
            return fallback;
        }
    }

    /**
     * Reset SDK instance (for testing)
     */
    static reset(): void {
        this.instance = null;
        this.initAttempted = false;
    }
}
