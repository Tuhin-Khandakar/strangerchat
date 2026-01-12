import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'db', 'moderation.db');
const db = new Database(dbPath);

console.log('Running migration...');

try {
  // Add enabled column to banned_words
  try {
    db.prepare('ALTER TABLE banned_words ADD COLUMN enabled INTEGER DEFAULT 1').run();
    console.log('Added enabled column to banned_words');
  } catch (err) {
    if (!err.message.includes('duplicate column name')) {
      throw err;
    }
    console.log('Column enabled already exists in banned_words');
  }

  // Update severity to integer
  // SQLite has dynamic typing, but we should standardize data
  // 'medium' -> 2, 'high' -> 3, else 1
  db.prepare("UPDATE banned_words SET severity = 2 WHERE severity = 'medium'").run();
  db.prepare("UPDATE banned_words SET severity = 3 WHERE severity = 'high'").run();
  // Set default for others to 1
  db.prepare('UPDATE banned_words SET severity = 1 WHERE severity NOT IN (1, 2, 3)').run();

  console.log('Migration complete');
} catch (err) {
  console.error('Migration failed:', err);
}
