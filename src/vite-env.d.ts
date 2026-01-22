/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_LATEST_MIGRATION_TIMESTAMP: string;
    readonly VITE_APP_VERSION: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
