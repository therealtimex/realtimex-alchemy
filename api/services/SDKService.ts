import { RealtimeXSDK, ProvidersResponse } from '@realtimex/sdk';
import os from 'os';
import path from 'path';

/**
 * Circuit Breaker State
 */
enum CircuitState {
    CLOSED = 'CLOSED',     // Normal operation
    OPEN = 'OPEN',         // Failing, don't attempt
    HALF_OPEN = 'HALF_OPEN' // Testing if recovered
}

/**
 * Centralized SDK Service with Circuit Breaker and Retry Logic
 * Manages RealTimeX SDK initialization and provides singleton access
 */
export class SDKService {
    private static instance: RealtimeXSDK | null = null;

    // Retry state
    private static initAttempts = 0;
    private static lastInitAttempt = 0;
    private static readonly MAX_INIT_ATTEMPTS = 5;
    private static readonly INIT_BACKOFF_MS = [1000, 2000, 4000, 8000, 8000]; // Exponential backoff

    // Circuit breaker state
    private static circuitState: CircuitState = CircuitState.CLOSED;
    private static consecutiveFailures = 0;
    private static readonly FAILURE_THRESHOLD = 3;
    private static readonly CIRCUIT_RESET_TIMEOUT = 30000; // 30s
    private static lastFailureTime = 0;

    // Request deduplication
    private static chatProvidersPromise: Promise<ProvidersResponse> | null = null;
    private static embedProvidersPromise: Promise<ProvidersResponse> | null = null;

    // Cache for default providers (avoid repeated SDK calls)
    private static defaultChatProvider: { provider: string; model: string } | null = null;
    private static defaultEmbedProvider: { provider: string; model: string } | null = null;

    // Default provider/model configuration
    static readonly DEFAULT_LLM_PROVIDER = 'realtimexai';
    static readonly DEFAULT_LLM_MODEL = 'gpt-4o-mini';
    static readonly DEFAULT_EMBED_PROVIDER = 'realtimexai';
    static readonly DEFAULT_EMBED_MODEL = 'text-embedding-3-small';

    // Standardized timeouts
    private static readonly PING_TIMEOUT_MS = 10000; // 10s
    private static readonly PROVIDER_TIMEOUT_MS = 60000; // 60s (matches backend)

    /**
     * Initialize SDK with required permissions and retry logic
     * Safe to call multiple times - implements exponential backoff
     */
    static initialize(): RealtimeXSDK | null {
        // Check if we should retry based on backoff
        if (this.instance) {
            return this.instance;
        }

        const now = Date.now();
        const timeSinceLastAttempt = now - this.lastInitAttempt;

        // If we've hit max attempts, check if enough time has passed to reset
        if (this.initAttempts >= this.MAX_INIT_ATTEMPTS) {
            if (timeSinceLastAttempt < this.INIT_BACKOFF_MS[this.MAX_INIT_ATTEMPTS - 1]) {
                console.log(`[SDKService] Max init attempts reached. Retry in ${Math.ceil((this.INIT_BACKOFF_MS[this.MAX_INIT_ATTEMPTS - 1] - timeSinceLastAttempt) / 1000)}s`);
                return null;
            }
            // Reset after backoff period
            console.log('[SDKService] Resetting init attempts after backoff period');
            this.initAttempts = 0;
        }

        // Check backoff for current attempt
        if (this.initAttempts > 0) {
            const backoffTime = this.INIT_BACKOFF_MS[Math.min(this.initAttempts - 1, this.INIT_BACKOFF_MS.length - 1)];
            if (timeSinceLastAttempt < backoffTime) {
                console.log(`[SDKService] Init backoff active. Retry in ${Math.ceil((backoffTime - timeSinceLastAttempt) / 1000)}s`);
                return null;
            }
        }

        this.initAttempts++;
        this.lastInitAttempt = now;

        console.log(`[SDKService] Initializing SDK (attempt ${this.initAttempts}/${this.MAX_INIT_ATTEMPTS})...`);

        try {
            this.instance = new RealtimeXSDK({
                realtimex: {
                    // @ts-ignore - Dev Mode feature
                    apiKey: 'SXKX93J-QSWMB04-K9E0GRE-J5DA8J0'
                },
                permissions: [
                    'api.agents',       // List agents
                    'api.workspaces',   // List workspaces
                    'api.threads',      // List threads
                    'webhook.trigger',  // Trigger agents
                    'activities.read',  // Read activities
                    'activities.write', // Write activities
                    'llm.chat',         // Chat completion
                    'llm.embed',        // Generate embeddings
                    'llm.providers',    // List LLM providers (chat, embed)
                    'vectors.read',     // Query vectors
                    'vectors.write',    // Store vectors
                    'tts.generate',     // Generate speech from text
                    'tts.providers',    // List TTS providers
                ],
            });

            console.log('[SDKService] RealTimeX SDK initialized successfully');

            // Verify connection with Desktop App (with timeout)
            this.withTimeout(
                // @ts-ignore - Dev Mode feature
                this.instance.ping(),
                this.PING_TIMEOUT_MS,
                'Ping timed out'
            )
                .then((status: any) => {
                    console.log('[SDKService] Desktop App Connection: OK', status);
                    this.recordSuccess(); // Reset circuit breaker
                })
                .catch((err: any) => {
                    console.warn('[SDKService] Desktop App ping failed:', err.message);
                    this.recordFailure();
                });

            // Reset init attempts on successful creation
            this.initAttempts = 0;
            return this.instance;

        } catch (error: any) {
            console.error(`[SDKService] Failed to initialize SDK (attempt ${this.initAttempts}):`, error.message);
            this.instance = null;
            this.recordFailure();
            return null;
        }
    }

    /**
     * Get SDK instance (initializes if needed)
     */
    static getSDK(): RealtimeXSDK | null {
        if (!this.instance) {
            this.initialize();
        }
        return this.instance;
    }

    /**
     * Check if SDK is available and working
     * Uses circuit breaker pattern to avoid overwhelming failed SDK
     */
    static async isAvailable(): Promise<boolean> {
        // Check circuit breaker
        if (this.circuitState === CircuitState.OPEN) {
            const timeSinceFailure = Date.now() - this.lastFailureTime;
            if (timeSinceFailure < this.CIRCUIT_RESET_TIMEOUT) {
                console.log(`[SDKService] Circuit OPEN. Retry in ${Math.ceil((this.CIRCUIT_RESET_TIMEOUT - timeSinceFailure) / 1000)}s`);
                return false;
            }
            // Try to recover
            console.log('[SDKService] Circuit transitioning to HALF_OPEN');
            this.circuitState = CircuitState.HALF_OPEN;
        }

        try {
            const sdk = this.getSDK();
            if (!sdk) {
                console.log('[SDKService] SDK instance is null');
                return false;
            }

            // Use ping with timeout for fast health check
            try {
                // @ts-ignore - Dev Mode feature
                await this.withTimeout(sdk.ping(), this.PING_TIMEOUT_MS, 'Ping timed out');
                console.log('[SDKService] SDK is available (ping successful)');
                this.recordSuccess();
                return true;
            } catch (pingError: any) {
                console.warn('[SDKService] Ping failed:', pingError.message);
                this.recordFailure();
                return false;
            }
        } catch (error: any) {
            console.error('[SDKService] SDK availability check failed:', error.message);
            this.recordFailure();
            return false;
        }
    }

    /**
     * Record successful SDK operation (resets circuit breaker)
     */
    private static recordSuccess(): void {
        if (this.circuitState !== CircuitState.CLOSED) {
            console.log('[SDKService] Circuit breaker CLOSED (recovered)');
        }
        this.consecutiveFailures = 0;
        this.circuitState = CircuitState.CLOSED;
    }

    /**
     * Record failed SDK operation (increments circuit breaker)
     */
    private static recordFailure(): void {
        this.consecutiveFailures++;
        this.lastFailureTime = Date.now();

        if (this.consecutiveFailures >= this.FAILURE_THRESHOLD) {
            if (this.circuitState !== CircuitState.OPEN) {
                console.error(`[SDKService] Circuit breaker OPEN (${this.consecutiveFailures} consecutive failures)`);
            }
            this.circuitState = CircuitState.OPEN;
        }
    }

    /**
     * Get chat providers with request deduplication
     * Prevents parallel requests from triggering multiple SDK calls
     */
    static async getChatProviders(): Promise<ProvidersResponse> {
        // Return in-flight request if exists
        if (this.chatProvidersPromise) {
            console.log('[SDKService] Returning in-flight chat providers request');
            return this.chatProvidersPromise;
        }

        const sdk = this.getSDK();
        if (!sdk) {
            throw new Error('RealTimeX SDK not available');
        }

        // Create new request with deduplication
        this.chatProvidersPromise = this.withTimeout<ProvidersResponse>(
            sdk.llm.chatProviders(),
            this.PROVIDER_TIMEOUT_MS,
            'Chat providers fetch timed out'
        ).finally(() => {
            // Clear promise after completion (success or error)
            this.chatProvidersPromise = null;
        });

        return this.chatProvidersPromise;
    }

    /**
     * Get embed providers with request deduplication
     * Prevents parallel requests from triggering multiple SDK calls
     */
    static async getEmbedProviders(): Promise<ProvidersResponse> {
        // Return in-flight request if exists
        if (this.embedProvidersPromise) {
            console.log('[SDKService] Returning in-flight embed providers request');
            return this.embedProvidersPromise;
        }

        const sdk = this.getSDK();
        if (!sdk) {
            throw new Error('RealTimeX SDK not available');
        }

        // Create new request with deduplication
        this.embedProvidersPromise = this.withTimeout<ProvidersResponse>(
            sdk.llm.embedProviders(),
            this.PROVIDER_TIMEOUT_MS,
            'Embed providers fetch timed out'
        ).finally(() => {
            // Clear promise after completion (success or error)
            this.embedProvidersPromise = null;
        });

        return this.embedProvidersPromise;
    }

    /**
     * Get default chat provider/model from SDK dynamically
     * Caches result to avoid repeated SDK calls
     */
    static async getDefaultChatProvider(): Promise<{ provider: string; model: string }> {
        // Return cached if available
        if (this.defaultChatProvider) {
            return this.defaultChatProvider;
        }

        try {
            const { providers } = await this.getChatProviders();

            if (!providers || providers.length === 0) {
                throw new Error('No LLM providers available. Please configure a provider in RealTimeX Desktop.');
            }

            // Find first provider with available models
            for (const p of providers) {
                if (p.models && p.models.length > 0) {
                    this.defaultChatProvider = {
                        provider: p.provider,
                        model: p.models[0].id
                    };
                    console.log(`[SDKService] Default chat provider: ${this.defaultChatProvider.provider}/${this.defaultChatProvider.model}`);
                    return this.defaultChatProvider;
                }
            }

            throw new Error('No LLM models available. Please configure a model in RealTimeX Desktop.');
        } catch (error: any) {
            console.error('[SDKService] Failed to get default chat provider:', error.message);
            throw error;
        }
    }

    /**
     * Get default embedding provider/model from SDK dynamically
     * Caches result to avoid repeated SDK calls
     */
    static async getDefaultEmbedProvider(): Promise<{ provider: string; model: string }> {
        // Return cached if available
        if (this.defaultEmbedProvider) {
            return this.defaultEmbedProvider;
        }

        try {
            const { providers } = await this.getEmbedProviders();

            if (!providers || providers.length === 0) {
                throw new Error('No embedding providers available. Please configure a provider in RealTimeX Desktop.');
            }

            // Find first provider with available models
            for (const p of providers) {
                if (p.models && p.models.length > 0) {
                    this.defaultEmbedProvider = {
                        provider: p.provider,
                        model: p.models[0].id
                    };
                    console.log(`[SDKService] Default embed provider: ${this.defaultEmbedProvider.provider}/${this.defaultEmbedProvider.model}`);
                    return this.defaultEmbedProvider;
                }
            }

            throw new Error('No embedding models available. Please configure a model in RealTimeX Desktop.');
        } catch (error: any) {
            console.error('[SDKService] Failed to get default embed provider:', error.message);
            throw error;
        }
    }

    /**
     * Resolve LLM provider/model - use settings if available, otherwise use defaults
     */
    static async resolveChatProvider(settings: { llm_provider?: string; llm_model?: string }): Promise<{ provider: string; model: string }> {
        // If both provider and model are set in settings, use them
        if (settings.llm_provider && settings.llm_model) {
            return { provider: settings.llm_provider, model: settings.llm_model };
        }

        // Try to get from SDK discovery first
        try {
            return await this.getDefaultChatProvider();
        } catch (error) {
            // Fallback to hardcoded defaults if SDK discovery fails
            console.log(`[SDKService] Using default LLM: ${this.DEFAULT_LLM_PROVIDER}/${this.DEFAULT_LLM_MODEL}`);
            return { provider: this.DEFAULT_LLM_PROVIDER, model: this.DEFAULT_LLM_MODEL };
        }
    }

    /**
     * Resolve embedding provider/model - use settings if available, otherwise use defaults
     */
    static async resolveEmbedProvider(settings: { embedding_provider?: string; embedding_model?: string }): Promise<{ provider: string; model: string }> {
        // If both provider and model are set in settings, use them
        if (settings.embedding_provider && settings.embedding_model) {
            return { provider: settings.embedding_provider, model: settings.embedding_model };
        }

        // Try to get from SDK discovery first
        try {
            return await this.getDefaultEmbedProvider();
        } catch (error) {
            // Fallback to hardcoded defaults if SDK discovery fails
            console.log(`[SDKService] Using default embedding: ${this.DEFAULT_EMBED_PROVIDER}/${this.DEFAULT_EMBED_MODEL}`);
            return { provider: this.DEFAULT_EMBED_PROVIDER, model: this.DEFAULT_EMBED_MODEL };
        }
    }

    /**
     * Clear provider cache (useful when providers change)
     */
    static clearProviderCache(): void {
        this.defaultChatProvider = null;
        this.defaultEmbedProvider = null;
        this.chatProvidersPromise = null;
        this.embedProvidersPromise = null;
        console.log('[SDKService] Provider cache cleared');
    }

    /**
     * Reset SDK instance and state (for testing or manual retry)
     */
    static reset(): void {
        this.instance = null;
        this.initAttempts = 0;
        this.lastInitAttempt = 0;
        this.circuitState = CircuitState.CLOSED;
        this.consecutiveFailures = 0;
        this.lastFailureTime = 0;
        this.clearProviderCache();
        console.log('[SDKService] Full reset completed');
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
     * Helper to wrap a promise with a timeout
     */
    static async withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
        let timeoutHandle: any;
        const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutHandle = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
        });

        try {
            const result = await Promise.race([promise, timeoutPromise]);
            return result as T;
        } finally {
            clearTimeout(timeoutHandle);
        }
    }

    /**
     * Trigger a Desktop Agent via Webhook
     * Use this to delegate tasks to the RealTimeX Desktop app
     */
    static async triggerAgent(event: string, payload: any): Promise<void> {
        const sdk = this.getSDK();
        if (!sdk) {
            throw new Error('RealTimeX SDK not linked. Cannot trigger desktop agent.');
        }

        console.log(`[SDKService] Triggering Agent Event: ${event}`);

        // Use the existing webhook trigger capability
        // @ts-ignore - internal SDK method
        await sdk.webhook.trigger(event, payload);
    }

    /**
     * Get the App Data Directory from the SDK
     * Used for constructing absolute system paths for the "Drop Zone"
     */
    static async getAppDataDir(): Promise<string> {
        const sdk = this.getSDK();
        if (!sdk) {
            throw new Error('RealTimeX SDK not linked. Cannot get app data dir.');
        }

        try {
            return await sdk.getAppDataDir();
        } catch (error) {
            console.warn('[SDKService] getAppDataDir failed, using fallback path');
            // Cross-platform fallback: ~/RealTimeX/Alchemy/data
            return path.join(os.homedir(), 'RealTimeX', 'Alchemy', 'data');
        }
    }

    /**
     * Get SDK status for debugging
     */
    static getStatus(): {
        initialized: boolean;
        initAttempts: number;
        circuitState: CircuitState;
        consecutiveFailures: number;
        lastFailureTime: number;
        hasCache: boolean;
    } {
        return {
            initialized: this.instance !== null,
            initAttempts: this.initAttempts,
            circuitState: this.circuitState,
            consecutiveFailures: this.consecutiveFailures,
            lastFailureTime: this.lastFailureTime,
            hasCache: this.defaultChatProvider !== null || this.defaultEmbedProvider !== null
        };
    }
}
