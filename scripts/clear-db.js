const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, '../hypercrm.db');
const db = new sqlite3.Database(dbPath);

const tables = [
  'clients', 'projects', 'project_members', 'tasks', 'documents', 
  'revenue', 'expenses', 'leads', 'meetings', 'meeting_attendees', 
  'attendance', 'leave_requests', 'campaigns', 'testimonials', 
  'messages', 'notifications', 'users'
];

db.serialize(() => {
  console.log('Clearing all SQLite tables to remove dummy data...');
  
  // Disable foreign keys temporarily for truncation
  db.run('PRAGMA foreign_keys = OFF');

  for (const table of tables) {
    db.run(`DELETE FROM ${table}`, (err) => {
      if (err) {
        console.error(`Error clearing table ${table}:`, err);
      } else {
        console.log(`Table ${table} cleared successfully.`);
      }
    });
  }

  db.run('PRAGMA foreign_keys = ON', (err) => {
    if (!err) {
      console.log('Finished clearing database. Server will re-seed system users on next request or restart.');
    }
  });
});
