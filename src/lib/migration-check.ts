import type { SupabaseClient } from '@supabase/supabase-js';

export const APP_VERSION = '1.0.0'; // Fallback if env not set
export const LATEST_MIGRATION_TIMESTAMP = import.meta.env.VITE_LATEST_MIGRATION_TIMESTAMP || '0';

export function compareSemver(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const num1 = parts1[i] || 0;
        const num2 = parts2[i] || 0;

        if (num1 > num2) return 1;
        if (num1 < num2) return -1;
    }

    return 0;
}

export interface DatabaseMigrationInfo {
    version: string | null;
    latestMigrationTimestamp: string | null;
}

export async function getDatabaseMigrationInfo(
    supabase: SupabaseClient,
): Promise<DatabaseMigrationInfo> {
    try {
        const { data, error } = await supabase.rpc('get_latest_migration_timestamp');

        if (error) {
            if ((error as any).code === '42883') {
                return { version: null, latestMigrationTimestamp: '0' };
            }
            return { version: null, latestMigrationTimestamp: null };
        }

        return {
            version: APP_VERSION,
            latestMigrationTimestamp: data || null,
        };
    } catch (error) {
        return { version: null, latestMigrationTimestamp: null };
    }
}

export interface MigrationStatus {
    needsMigration: boolean;
    appVersion: string;
    dbVersion: string | null;
    latestMigrationTimestamp: string | null;
    message: string;
}

export async function checkMigrationStatus(
    supabase: SupabaseClient,
): Promise<MigrationStatus> {
    const appVersion = APP_VERSION;
    const appMigrationTimestamp = LATEST_MIGRATION_TIMESTAMP;
    const dbInfo = await getDatabaseMigrationInfo(supabase);

    if (dbInfo.latestMigrationTimestamp && dbInfo.latestMigrationTimestamp.trim() !== '') {
        const appTimestamp = appMigrationTimestamp;
        const dbTimestamp = dbInfo.latestMigrationTimestamp;

        if (appTimestamp > dbTimestamp) {
            return {
                needsMigration: true,
                appVersion,
                dbVersion: dbInfo.version,
                latestMigrationTimestamp: dbTimestamp,
                message: `New migrations available. Database is at ${dbTimestamp}, app has ${appTimestamp}.`,
            };
        } else {
            return {
                needsMigration: false,
                appVersion,
                dbVersion: dbInfo.version,
                latestMigrationTimestamp: dbTimestamp,
                message: `Database schema is up-to-date.`,
            };
        }
    }

    return {
        needsMigration: true,
        appVersion,
        dbVersion: null,
        latestMigrationTimestamp: null,
        message: `Database schema unknown. Migration required.`,
    };
}
