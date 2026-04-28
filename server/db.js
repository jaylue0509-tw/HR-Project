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
  `);

  return db;
}
