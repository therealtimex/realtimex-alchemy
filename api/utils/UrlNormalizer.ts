/**
 * URL Normalizer - Strips tracking parameters and normalizes URLs for deduplication
 */

// Common tracking parameters to strip
const TRACKING_PARAMS = new Set([
    // Google Analytics / Ads
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
    'gclid', 'gclsrc', 'dclid',

    // Facebook
    'fbclid', 'fb_action_ids', 'fb_action_types', 'fb_source', 'fb_ref',

    // Twitter/X
    'twclid', 's', 't', // Twitter share params

    // Microsoft/Bing
    'msclkid',

    // Email marketing
    'mc_cid', 'mc_eid', // Mailchimp
    'oly_enc_id', 'oly_anon_id', // Omeda
    '_hsenc', '_hsmi', 'hsCtaTracking', // HubSpot

    // Analytics & tracking
    '_ga', '_gl', // Google Analytics
    'ref', 'ref_src', 'ref_url', // Referrer tracking
    'source', 'src',
    'campaign', 'medium',

    // Social sharing
    'share', 'shared', 'via',

    // Session/user tracking
    'sessionid', 'session_id', 'sid',
    'userid', 'user_id', 'uid',
    'token', 'auth',

    // Misc tracking
    'pk_campaign', 'pk_kwd', 'pk_source', // Piwik/Matomo
    'zanpid', // Zanox
    'irclickid', // Impact Radius
    'affiliate', 'affiliate_id', 'aff_id',
    'clickid', 'click_id',
    'trk', 'tracking', 'track',
]);

// Parameters that might be tracking but context-dependent (be more careful)
const SUSPICIOUS_PARAMS = new Set([
    'id', 'ref', 'source', 'from', 'origin',
]);

export class UrlNormalizer {
    /**
     * Normalize a URL by stripping tracking parameters and standardizing format
     */
    static normalize(url: string): string {
        try {
            const parsed = new URL(url);

            // 1. Lowercase the hostname
            parsed.hostname = parsed.hostname.toLowerCase();

            // 2. Remove default ports
            if (parsed.port === '80' || parsed.port === '443') {
                parsed.port = '';
            }

            // 3. Remove trailing slash from path (except root)
            if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
                parsed.pathname = parsed.pathname.slice(0, -1);
            }

            // 4. Remove fragment/hash
            parsed.hash = '';

            // 5. Strip tracking parameters
            const cleanParams = new URLSearchParams();
            parsed.searchParams.forEach((value, key) => {
                const lowerKey = key.toLowerCase();
                if (!TRACKING_PARAMS.has(lowerKey)) {
                    cleanParams.set(key, value);
                }
            });

            // 6. Sort remaining params for consistent ordering
            const sortedParams = new URLSearchParams();
            const keys = Array.from(cleanParams.keys()).sort();
            for (const key of keys) {
                sortedParams.set(key, cleanParams.get(key)!);
            }

            parsed.search = sortedParams.toString() ? `?${sortedParams.toString()}` : '';

            return parsed.toString();
        } catch {
            // If URL parsing fails, return original
            return url;
        }
    }

    /**
     * Extract the canonical URL (domain + path, no params)
     * Useful for aggressive deduplication
     */
    static getCanonical(url: string): string {
        try {
            const parsed = new URL(url);
            parsed.hostname = parsed.hostname.toLowerCase();
            parsed.search = '';
            parsed.hash = '';

            // Remove trailing slash
            if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
                parsed.pathname = parsed.pathname.slice(0, -1);
            }

            return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
        } catch {
            return url;
        }
    }

    /**
     * Get a fingerprint for deduplication (hash of normalized URL)
     */
    static getFingerprint(url: string): string {
        const normalized = this.normalize(url);
        // Simple hash for dedup - not cryptographic, just for comparison
        let hash = 0;
        for (let i = 0; i < normalized.length; i++) {
            const char = normalized.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString(36);
    }

    /**
     * Check if two URLs are effectively the same (after normalization)
     */
    static areSameUrl(url1: string, url2: string): boolean {
        return this.normalize(url1) === this.normalize(url2);
    }

    /**
     * Extract domain from URL
     */
    static getDomain(url: string): string {
        try {
            const parsed = new URL(url);
            return parsed.hostname.toLowerCase();
        } catch {
            return '';
        }
    }

    /**
     * Check if URL matches common non-content patterns
     */
    static isLikelyNonContent(url: string): boolean {
        try {
            const parsed = new URL(url);
            const path = parsed.pathname.toLowerCase();

            // Common non-content paths
            const nonContentPaths = [
                '/login', '/signin', '/sign-in', '/signup', '/sign-up', '/register',
                '/logout', '/signout', '/sign-out',
                '/auth', '/oauth', '/callback', '/sso',
                '/cart', '/checkout', '/basket', '/bag',
                '/account', '/profile', '/settings', '/preferences',
                '/admin', '/dashboard', '/manage',
                '/api/', '/graphql', '/_next/', '/__',
                '/search', '/results',
            ];

            for (const nonContent of nonContentPaths) {
                if (path.startsWith(nonContent) || path.includes(nonContent)) {
                    return true;
                }
            }

            // Non-content file extensions
            const nonContentExtensions = [
                '.json', '.xml', '.js', '.css', '.map',
                '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp',
                '.woff', '.woff2', '.ttf', '.eot',
                '.pdf', '.zip', '.gz',
            ];

            for (const ext of nonContentExtensions) {
                if (path.endsWith(ext)) {
                    return true;
                }
            }

            return false;
        } catch {
            return false;
        }
    }
}
