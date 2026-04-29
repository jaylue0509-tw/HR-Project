import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'database.sqlite');

export async function setupDB() {
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      email TEXT PRIMARY KEY,
      name TEXT,
      company TEXT,
      department TEXT,
      title TEXT,
      supervisorName TEXT,
      supervisorEmail TEXT
    );

    CREATE TABLE IF NOT EXISTS assessments (
      userEmail TEXT PRIMARY KEY,
      status TEXT,
      submittedAt TEXT,
      data TEXT,
      computed TEXT,
      supervisorReview TEXT,
      FOREIGN KEY(userEmail) REFERENCES users(email)
    );

    CREATE TABLE IF NOT EXISTS hr_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      canImport INTEGER DEFAULT 1,
      canExport INTEGER DEFAULT 1,
      canManageAccounts INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now'))
    );
  `);

  // Seed default admin account if no accounts exist
  const count = await db.get('SELECT COUNT(*) as cnt FROM hr_accounts');
  if (count.cnt === 0) {
    await db.run(
      `INSERT INTO hr_accounts (name, email, password, canImport, canExport, canManageAccounts)
       VALUES ('系統管理員', 'admin@hr.com', 'admin1234', 1, 1, 1)`
    );
    console.log('🔑 Default HR admin created: admin@hr.com / admin1234');
  }

  return db;
}
