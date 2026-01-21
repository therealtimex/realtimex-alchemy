
import sqlite3 from 'better-sqlite3';
import path from 'path';

const historyPath = '/Users/ledangtrung/rtGit/realtimex-ai-app-agents/realtimex-alchemy/data/chrome/History';
const db = new sqlite3(historyPath, { readonly: true });

try {
    const count = db.prepare('SELECT count(*) as count FROM urls').get();
    console.log('Total URLs:', count.count);

    const recent = db.prepare('SELECT url, title, last_visit_time FROM urls ORDER BY last_visit_time DESC LIMIT 5').all();
    console.log('Most recent entries:', recent);
    
    // Check timestamp format (Chrome is microseconds since 1601)
    const now = Date.now();
    const chromeEpoch = 11644473600000;
    const nowChrome = (now + chromeEpoch) * 1000;
    
    console.log('Current Time (Chrome Format):', nowChrome);
    console.log('Comparison:', recent[0].last_visit_time < nowChrome ? 'Recent < Now (Correct)' : 'Future timestamp?');

} catch (err) {
    console.error('Error reading history:', err);
} finally {
    db.close();
}
