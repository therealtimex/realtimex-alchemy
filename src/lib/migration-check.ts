import { SupabaseClient } from '@supabase/supabase-js';

export const LATEST_MIGRATION_TIMESTAMP = import.meta.env.VITE_LATEST_MIGRATION_TIMESTAMP;
export const APP_VERSION = import.meta.env.VITE_APP_VERSION;

export interface MigrationStatus {
    needsMigration: boolean;
    appTimestamp: string;
    dbTimestamp: string | null;
    message: string;
}

export async function checkMigrationStatus(supabase: SupabaseClient): Promise<MigrationStatus> {
    try {
        const { data: dbTimestamp, error } = await supabase.rpc('get_latest_migration_timestamp');

        if (error) {
            console.warn('[MigrationCheck] Failed to get DB timestamp:', error.message);
            // If the RPC is missing, it's highly likely we need to run migrations to add it
            return {
                needsMigration: true,
                appTimestamp: LATEST_MIGRATION_TIMESTAMP,
                dbTimestamp: null,
                message: 'Database version verification function missing. Migration recommended.'
            };
        }

        const appTimestamp = LATEST_MIGRATION_TIMESTAMP;
        const needsMigration = dbTimestamp ? appTimestamp > dbTimestamp : true;

        return {
            needsMigration,
            appTimestamp,
            dbTimestamp,
            message: needsMigration
                ? `Update available: Database at ${dbTimestamp || 'initial'}, App at ${appTimestamp}`
                : 'Database is up to date.'
        };
    } catch (err) {
        console.error('[MigrationCheck] Error:', err);
        return {
            needsMigration: false,
            appTimestamp: LATEST_MIGRATION_TIMESTAMP,
            dbTimestamp: null,
            message: 'Check failed.'
        };
    }
}
