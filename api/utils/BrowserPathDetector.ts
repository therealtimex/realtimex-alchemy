import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

export type BrowserType = 'chrome' | 'firefox' | 'safari' | 'edge' | 'brave' | 'arc' | 'vivaldi' | 'opera' | 'opera-gx' | 'chromium' | 'custom';

export interface BrowserPath {
    browser: BrowserType;
    path: string;
    found: boolean;
    valid?: boolean;
    error?: string;
    needsPermission?: boolean;
}

export interface BrowserSource {
    browser: BrowserType;
    path: string;
    enabled: boolean;
    label: string;
}

export class BrowserPathDetector {
    private platform: string;
    private homeDir: string;

    constructor() {
        this.platform = os.platform();
        this.homeDir = os.homedir();
    }

    /**
     * Get base data directories for browsers based on platform
     */
    private getBaseDataDirs(): Record<BrowserType, string[]> {
        if (this.platform === 'darwin') {
            return {
                chrome: [path.join(this.homeDir, 'Library/Application Support/Google/Chrome')],
                firefox: [path.join(this.homeDir, 'Library/Application Support/Firefox/Profiles')],
                safari: [path.join(this.homeDir, 'Library/Safari')],
                edge: [path.join(this.homeDir, 'Library/Application Support/Microsoft Edge')],
                brave: [path.join(this.homeDir, 'Library/Application Support/BraveSoftware/Brave-Browser')],
                arc: [path.join(this.homeDir, 'Library/Application Support/Arc/User Data')],
                vivaldi: [path.join(this.homeDir, 'Library/Application Support/Vivaldi')],
                opera: [path.join(this.homeDir, 'Library/Application Support/com.operasoftware.Opera')],
                'opera-gx': [path.join(this.homeDir, 'Library/Application Support/com.operasoftware.OperaGX')],
                chromium: [path.join(this.homeDir, 'Library/Application Support/Chromium')],
                custom: [],
            };
        } else if (this.platform === 'win32') {
            const appData = process.env.APPDATA || '';
            const localAppData = process.env.LOCALAPPDATA || '';
            return {
                chrome: [path.join(localAppData, 'Google\\Chrome\\User Data')],
                firefox: [path.join(appData, 'Mozilla\\Firefox\\Profiles')],
                safari: [],
                edge: [path.join(localAppData, 'Microsoft\\Edge\\User Data')],
                brave: [path.join(localAppData, 'BraveSoftware\\Brave-Browser\\User Data')],
                arc: [],
                vivaldi: [path.join(localAppData, 'Vivaldi\\User Data')],
                opera: [path.join(appData, 'Opera Software\\Opera Stable')],
                'opera-gx': [path.join(appData, 'Opera Software\\Opera GX Stable')],
                chromium: [path.join(localAppData, 'Chromium\\User Data')],
                custom: [],
            };
        } else {
            return {
                chrome: [path.join(this.homeDir, '.config/google-chrome')],
                firefox: [path.join(this.homeDir, '.mozilla/firefox')],
                safari: [],
                edge: [path.join(this.homeDir, '.config/microsoft-edge')],
                brave: [path.join(this.homeDir, '.config/BraveSoftware/Brave-Browser')],
                arc: [],
                vivaldi: [path.join(this.homeDir, '.config/vivaldi')],
                opera: [path.join(this.homeDir, '.config/opera')],
                'opera-gx': [path.join(this.homeDir, '.config/opera-gx')],
                chromium: [path.join(this.homeDir, '.config/chromium')],
                custom: [],
            };
        }
    }

    /**
     * Detect all available browser history paths across all profiles
     */
    detectAll(): Record<string, BrowserPath> {
        const baseDirs = this.getBaseDataDirs();
        const results: Record<string, BrowserPath> = {};

        for (const [browser, dirs] of Object.entries(baseDirs)) {
            if (browser === 'custom') continue;
            const browserType = browser as BrowserType;

            for (const baseDir of dirs) {
                if (!fs.existsSync(baseDir)) continue;

                if (browserType === 'safari') {
                    // Safari is usually just one file
                    const safariPath = path.join(baseDir, 'History.db');
                    if (fs.existsSync(safariPath)) {
                        const validation = this.validateSQLitePath(safariPath);

                        // Include Safari even if validation fails due to permissions
                        // User can grant Full Disk Access and it will work
                        results['safari_default'] = {
                            browser: 'safari',
                            path: safariPath,
                            found: true,
                            valid: validation.valid || validation.needsPermission || false,
                            error: validation.error
                        };
                    }
                    continue;
                }

                if (browserType === 'firefox') {
                    // Firefox profile scanning
                    try {
                        const profiles = fs.readdirSync(baseDir);
                        for (const profileName of profiles) {
                            const profilePath = path.join(baseDir, profileName);
                            const historyPath = path.join(profilePath, 'places.sqlite');

                            if (fs.existsSync(historyPath)) {
                                const validation = this.validateSQLitePath(historyPath);
                                if (validation.valid) {
                                    results[`firefox_${profileName}`] = {
                                        browser: 'firefox',
                                        path: historyPath,
                                        found: true,
                                        ...validation
                                    };
                                }
                            }
                        }
                    } catch (e) {
                        console.error(`Error scanning Firefox profiles in ${baseDir}:`, e);
                    }
                    continue;
                }

                // Chromium-based (Chrome, Edge, Brave, Arc)
                try {
                    const profileEntries = fs.readdirSync(baseDir);
                    for (const entryName of profileEntries) {
                        // Profiles are usually "Default" or "Profile X"
                        if (entryName === 'Default' || entryName.startsWith('Profile ')) {
                            const historyPath = path.join(baseDir, entryName, 'History');
                            if (fs.existsSync(historyPath)) {
                                const validation = this.validateSQLitePath(historyPath);
                                if (validation.valid) {
                                    results[`${browserType}_${entryName.toLowerCase().replace(' ', '_')}`] = {
                                        browser: browserType,
                                        path: historyPath,
                                        found: true,
                                        ...validation
                                    };
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.error(`Error scanning ${browserType} profiles in ${baseDir}:`, e);
                }
            }
        }

        return results;
    }

    /**
     * Helper to convert detected paths to ready-to-use BrowserSources
     */
    getAutoDetectedSources(): BrowserSource[] {
        const detected = this.detectAll();
        return Object.entries(detected)
            .filter(([_, info]) => info.valid)
            .map(([key, info]) => {
                let label = '';
                const browserName = info.browser.charAt(0).toUpperCase() + info.browser.slice(1);

                // Extract profile name for label
                if (key.includes('_')) {
                    const profilePart = key.split('_').slice(1).join(' ');
                    const profileLabel = profilePart.charAt(0).toUpperCase() + profilePart.slice(1);
                    label = `${browserName} (${profileLabel})`;
                } else {
                    label = `${browserName} (Default)`;
                }

                return {
                    browser: info.browser,
                    path: info.path,
                    enabled: true,
                    label
                };
            });
    }

    /**
     * Validate if a file is a valid SQLite database
     * Uses copy-to-temp to avoid "database is locked" errors when browser is open
     */
    validateSQLitePath(filePath: string): { valid: boolean; error?: string; needsPermission?: boolean } {
        let tempPath: string | null = null;

        try {
            if (!fs.existsSync(filePath)) {
                return { valid: false, error: 'File does not exist' };
            }

            const stats = fs.statSync(filePath);
            if (!stats.isFile()) {
                return { valid: false, error: 'Path is not a file' };
            }

            // Copy to temp file to avoid database lock issues
            const tempDir = os.tmpdir();
            tempPath = path.join(tempDir, `history_validate_${uuidv4()}.db`);
            fs.copyFileSync(filePath, tempPath);

            // Try to open the temp copy as SQLite database
            const db = new Database(tempPath, { readonly: true });

            // Check if it has expected tables (moz_places for Firefox, urls for Chrome/others)
            const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as any[];
            const tableNames = tables.map((t: any) => t.name);

            db.close();

            const hasHistoryTables =
                tableNames.includes('urls') ||
                tableNames.includes('moz_places') ||
                tableNames.includes('history_items') ||
                tableNames.includes('history_visits'); // Safari uses history_items and history_visits

            if (!hasHistoryTables) {
                return { valid: false, error: 'Not a browser history database' };
            }

            return { valid: true };
        } catch (err: any) {
            // Special handling for Safari permission errors on macOS
            if (err.code === 'EPERM' && filePath.includes('Safari')) {
                return {
                    valid: false,
                    error: 'Permission denied. Grant Full Disk Access to Terminal/App in System Settings → Privacy & Security',
                    needsPermission: true
                };
            }
            return { valid: false, error: err.message || 'Invalid SQLite database' };
        } finally {
            // Clean up temp file
            if (tempPath && fs.existsSync(tempPath)) {
                try {
                    fs.unlinkSync(tempPath);
                } catch {
                    // Ignore cleanup errors
                }
            }
        }
    }

    /**
     * Detect a specific browser's history path (Legacy support)
     */
    detect(browser: BrowserType): BrowserPath {
        const all = this.detectAll();
        // Return first valid profile for this browser if exists
        const match = Object.values(all).find(p => p.browser === browser && p.valid);
        return match || { browser, path: '', found: false };
    }

    /**
     * Backwards-compatible method: Returns one path per browser type (first valid profile found)
     * Used by legacy UI components that expect Record<BrowserType, BrowserPath>
     */
    detectFirstPerBrowser(): Record<BrowserType, BrowserPath> {
        const all = this.detectAll();
        const result: Record<BrowserType, BrowserPath> = {} as any;

        const browserTypes: BrowserType[] = ['chrome', 'firefox', 'safari', 'edge', 'brave', 'arc'];

        for (const browserType of browserTypes) {
            // Find first valid path for this browser type
            const match = Object.values(all).find(p => p.browser === browserType && p.valid);

            if (match) {
                result[browserType] = match;
            } else {
                result[browserType] = {
                    browser: browserType,
                    path: '',
                    found: false
                };
            }
        }

        return result;
    }
}
