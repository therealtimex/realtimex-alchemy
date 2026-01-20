import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const CONFIG = {
    PORT: process.env.PORT || 3000,
    OLLAMA_HOST: process.env.OLLAMA_HOST || 'http://localhost:11434',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    AGENT_BROWSER_API_KEY: process.env.AGENT_BROWSER_API_KEY,
    DATA_DIR: path.join(process.cwd(), 'data'),
    MAX_HISTORY_ITEMS: 50,
    RETENTION_DAYS: 30,
};

export const BROWSER_PATHS: Record<string, Record<string, string>> = {
    darwin: {
        chrome: path.join(process.env.HOME || '', 'Library/Application Support/Google/Chrome/Default/History'),
        edge: path.join(process.env.HOME || '', 'Library/Application Support/Microsoft Edge/Default/History'),
        brave: path.join(process.env.HOME || '', 'Library/Application Support/BraveSoftware/Brave-Browser/Default/History'),
        safari: path.join(process.env.HOME || '', 'Library/Safari/History.db'),
    },
    win32: {
        chrome: path.join(process.env.LOCALAPPDATA || '', 'Google/Chrome/User Data/Default/History'),
        edge: path.join(process.env.LOCALAPPDATA || '', 'Microsoft/Edge/User Data/Default/History'),
        brave: path.join(process.env.LOCALAPPDATA || '', 'BraveSoftware/Brave-Browser/User Data/Default/History'),
    },
    linux: {
        chrome: path.join(process.env.HOME || '', '.config/google-chrome/Default/History'),
        brave: path.join(process.env.HOME || '', '.config/BraveSoftware/Brave-Browser/Default/History'),
    }
};
