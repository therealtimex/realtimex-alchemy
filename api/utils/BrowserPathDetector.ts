import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

export type BrowserType = 'chrome' | 'firefox' | 'safari' | 'edge' | 'brave' | 'arc' | 'custom';

export interface BrowserPath {
    browser: BrowserType;
    path: string;
    found: boolean;
    valid?: boolean;
    error?: string;
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
     * Get default browser history paths based on platform
     */
    private getDefaultPaths(): Record<BrowserType, string[]> {
        if (this.platform === 'darwin') {
            // macOS
            return {
                chrome: [
                    path.join(this.homeDir, 'Library/Application Support/Google/Chrome/Default/History'),
                    path.join(this.homeDir, 'Library/Application Support/Google/Chrome/Profile 1/History'),
                ],
                firefox: [
                    // Firefox uses profiles with random names
                    path.join(this.homeDir, 'Library/Application Support/Firefox/Profiles'),
                ],
                safari: [
                    path.join(this.homeDir, 'Library/Safari/History.db'),
                ],
                edge: [
                    path.join(this.homeDir, 'Library/Application Support/Microsoft Edge/Default/History'),
                ],
                brave: [
                    path.join(this.homeDir, 'Library/Application Support/BraveSoftware/Brave-Browser/Default/History'),
                ],
                arc: [
                    path.join(this.homeDir, 'Library/Application Support/Arc/User Data/Default/History'),
                ],
                custom: [],
            };
        } else if (this.platform === 'win32') {
            // Windows
            const appData = process.env.APPDATA || '';
            const localAppData = process.env.LOCALAPPDATA || '';
            return {
                chrome: [
                    path.join(localAppData, 'Google\\Chrome\\User Data\\Default\\History'),
                ],
                firefox: [
                    path.join(appData, 'Mozilla\\Firefox\\Profiles'),
                ],
                safari: [],
                edge: [
                    path.join(localAppData, 'Microsoft\\Edge\\User Data\\Default\\History'),
                ],
                brave: [
                    path.join(localAppData, 'BraveSoftware\\Brave-Browser\\User Data\\Default\\History'),
                ],
                arc: [],
                custom: [],
            };
        } else {
            // Linux
            return {
                chrome: [
                    path.join(this.homeDir, '.config/google-chrome/Default/History'),
                ],
                firefox: [
                    path.join(this.homeDir, '.mozilla/firefox'),
                ],
                safari: [],
                edge: [
                    path.join(this.homeDir, '.config/microsoft-edge/Default/History'),
                ],
                brave: [
                    path.join(this.homeDir, '.config/BraveSoftware/Brave-Browser/Default/History'),
                ],
                arc: [],
                custom: [],
            };
        }
    }

    /**
     * Find Firefox profile directories and locate places.sqlite
     */
    private findFirefoxHistory(profilesDir: string): string | null {
        try {
            if (!fs.existsSync(profilesDir)) return null;

            const profiles = fs.readdirSync(profilesDir);
            for (const profile of profiles) {
                if (profile.endsWith('.default') || profile.includes('default-release')) {
                    const historyPath = path.join(profilesDir, profile, 'places.sqlite');
                    if (fs.existsSync(historyPath)) {
                        return historyPath;
                    }
                }
            }
        } catch (err) {
            console.error('Error finding Firefox history:', err);
        }
        return null;
    }

    /**
     * Validate if a file is a valid SQLite database
     * Uses copy-to-temp to avoid "database is locked" errors when browser is open
     */
    validateSQLitePath(filePath: string): { valid: boolean; error?: string } {
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
                tableNames.includes('history_items');

            if (!hasHistoryTables) {
                return { valid: false, error: 'Not a browser history database' };
            }

            return { valid: true };
        } catch (err: any) {
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
     * Detect all available browser history paths
     */
    detectAll(): Record<BrowserType, BrowserPath> {
        const defaultPaths = this.getDefaultPaths();
        const results: Record<BrowserType, BrowserPath> = {} as any;

        for (const [browser, paths] of Object.entries(defaultPaths)) {
            if (browser === 'custom') continue;

            const browserType = browser as BrowserType;
            let foundPath: string | null = null;

            if (browserType === 'firefox' && paths.length > 0) {
                // Special handling for Firefox
                foundPath = this.findFirefoxHistory(paths[0]);
            } else {
                // Check each potential path
                for (const p of paths) {
                    if (fs.existsSync(p)) {
                        foundPath = p;
                        break;
                    }
                }
            }

            if (foundPath) {
                const validation = this.validateSQLitePath(foundPath);
                results[browserType] = {
                    browser: browserType,
                    path: foundPath,
                    found: true,
                    valid: validation.valid,
                    error: validation.error,
                };
            } else {
                results[browserType] = {
                    browser: browserType,
                    path: '',
                    found: false,
                };
            }
        }

        return results;
    }

    /**
     * Detect a specific browser's history path
     */
    detect(browser: BrowserType): BrowserPath {
        const all = this.detectAll();
        return all[browser] || { browser, path: '', found: false };
    }
}
