const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, '../hypercrm.db');
const schemaPath = path.resolve(__dirname, 'schema.sql');

console.log(`Connecting to SQLite database at: ${dbPath}`);
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection failed:', err);
  } else {
    console.log('Connected to SQLite database successfully.');
  }
});

// Helper for running queries with async/await
db.runAsync = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    this.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

db.getAsync = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    this.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

db.allAsync = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    this.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Default permissions matrix for different roles
const DEFAULT_PERMISSIONS = {
  SuperAdmin: {
    sales: { view: true, create: true, edit: true, delete: true, approve: true },
    development: { view: true, create: true, edit: true, delete: true, approve: true },
    accounts: { view: true, create: true, edit: true, delete: true, approve: true },
    attendance: { view: true, create: true, edit: true, delete: true, approve: true },
    scheduler: { view: true, create: true, edit: true, delete: true, approve: true },
    marketing: { view: true, create: true, edit: true, delete: true, approve: true },
    learning: { view: true, create: true, edit: true, delete: true, approve: true },
    settings: { view: true, create: true, edit: true, delete: true, approve: true }
  },
  Admin: {
    sales: { view: true, create: true, edit: true, delete: true, approve: true },
    development: { view: true, create: true, edit: true, delete: true, approve: true },
    accounts: { view: true, create: true, edit: true, delete: true, approve: true },
    attendance: { view: true, create: true, edit: true, delete: true, approve: true },
    scheduler: { view: true, create: true, edit: true, delete: true, approve: true },
    marketing: { view: true, create: true, edit: true, delete: true, approve: true },
    learning: { view: true, create: true, edit: true, delete: true, approve: true },
    settings: { view: true, create: true, edit: true, delete: false, approve: true }
  },
  PM: {
    sales: { view: true, create: false, edit: false, delete: false, approve: false },
    development: { view: true, create: true, edit: true, delete: true, approve: true },
    accounts: { view: false, create: false, edit: false, delete: false, approve: false },
    attendance: { view: true, create: true, edit: true, delete: false, approve: false },
    scheduler: { view: true, create: true, edit: true, delete: true, approve: true },
    marketing: { view: false, create: false, edit: false, delete: false, approve: false },
    learning: { view: true, create: true, edit: true, delete: false, approve: false },
    settings: { view: false, create: false, edit: false, delete: false, approve: false }
  },
  LeadDeveloper: {
    sales: { view: false, create: false, edit: false, delete: false, approve: false },
    development: { view: true, create: true, edit: true, delete: false, approve: true },
    accounts: { view: false, create: false, edit: false, delete: false, approve: false },
    attendance: { view: true, create: true, edit: true, delete: false, approve: false },
    scheduler: { view: true, create: true, edit: true, delete: false, approve: false },
    marketing: { view: false, create: false, edit: false, delete: false, approve: false },
    learning: { view: true, create: true, edit: true, delete: false, approve: false },
    settings: { view: false, create: false, edit: false, delete: false, approve: false }
  },
  JuniorDeveloper: {
    sales: { view: false, create: false, edit: false, delete: false, approve: false },
    development: { view: true, create: false, edit: false, delete: false, approve: false },
    accounts: { view: false, create: false, edit: false, delete: false, approve: false },
    attendance: { view: true, create: false, edit: false, delete: false, approve: false },
    scheduler: { view: true, create: true, edit: false, delete: false, approve: false },
    marketing: { view: false, create: false, edit: false, delete: false, approve: false },
    learning: { view: true, create: false, edit: false, delete: false, approve: false },
    settings: { view: false, create: false, edit: false, delete: false, approve: false }
  },
  SalesExecutive: {
    sales: { view: true, create: true, edit: true, delete: false, approve: false },
    development: { view: false, create: false, edit: false, delete: false, approve: false },
    accounts: { view: false, create: false, edit: false, delete: false, approve: false },
    attendance: { view: true, create: false, edit: false, delete: false, approve: false },
    scheduler: { view: true, create: true, edit: true, delete: false, approve: false },
    marketing: { view: true, create: false, edit: false, delete: false, approve: false },
    learning: { view: true, create: false, edit: false, delete: false, approve: false },
    settings: { view: false, create: false, edit: false, delete: false, approve: false }
  },
  MarketingExecutive: {
    sales: { view: false, create: false, edit: false, delete: false, approve: false },
    development: { view: false, create: false, edit: false, delete: false, approve: false },
    accounts: { view: false, create: false, edit: false, delete: false, approve: false },
    attendance: { view: true, create: false, edit: false, delete: false, approve: false },
    scheduler: { view: true, create: true, edit: false, delete: false, approve: false },
    marketing: { view: true, create: true, edit: true, delete: false, approve: false },
    learning: { view: true, create: false, edit: false, delete: false, approve: false },
    settings: { view: false, create: false, edit: false, delete: false, approve: false }
  },
  ClientPortal: {
    sales: { view: false, create: false, edit: false, delete: false, approve: false },
    development: { view: true, create: false, edit: false, delete: false, approve: false },
    accounts: { view: false, create: false, edit: false, delete: false, approve: false },
    attendance: { view: false, create: false, edit: false, delete: false, approve: false },
    scheduler: { view: true, create: false, edit: false, delete: false, approve: false },
    marketing: { view: false, create: false, edit: false, delete: false, approve: false },
    learning: { view: false, create: false, edit: false, delete: false, approve: false },
    settings: { view: false, create: false, edit: false, delete: false, approve: false }
  }
};

async function initDatabase() {
  console.log('Initializing database tables...');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  // Split SQLite commands by semicolon and execute them sequentially
  const commands = schemaSql.split(';').map(cmd => cmd.trim()).filter(cmd => cmd.length > 0);
  
  for (const command of commands) {
    try {
      await db.runAsync(command);
    } catch (e) {
      console.error(`Error running command:\n${command}\n`, e);
      throw e;
    }
  }
  console.log('Database tables verified/created successfully.');

  // Seed default accounts
  await seedUsers();
}

async function seedUsers() {
  try {
    const superAdmin = await db.getAsync("SELECT * FROM users WHERE username = 'Peri'");
    if (superAdmin) {
      console.log("Seed data already initialized.");
      return;
    }

    console.log("Seeding core user roles and accounts...");

    // Seed list
    const seeds = [
      {
        username: 'Peri',
        password: 'Peri@007',
        role: 'SuperAdmin',
        name: 'Peri (Root Admin)',
        designation: 'Chief Executive Officer',
        department: 'Development',
        salary: 250000,
        first_login_done: 1, // Force password reset on first login bypassed
        permissions: JSON.stringify(DEFAULT_PERMISSIONS.SuperAdmin)
      },
      {
        username: 'admin',
        password: 'Admin@123',
        role: 'Admin',
        name: 'Sridhar (HR & Admin)',
        designation: 'Operations Director',
        department: 'HR',
        salary: 80000,
        first_login_done: 1,
        permissions: JSON.stringify(DEFAULT_PERMISSIONS.Admin)
      },
      {
        username: 'pm',
        password: 'PM@123',
        role: 'Employee',
        name: 'Karthik PM',
        designation: 'Project Manager',
        department: 'Development',
        salary: 95000,
        first_login_done: 1,
        permissions: JSON.stringify(DEFAULT_PERMISSIONS.PM)
      },
      {
        username: 'leaddev',
        password: 'Lead@123',
        role: 'Employee',
        name: 'Arun Dev',
        designation: 'Lead Developer',
        department: 'Development',
        salary: 75000,
        first_login_done: 1,
        permissions: JSON.stringify(DEFAULT_PERMISSIONS.LeadDeveloper)
      },
      {
        username: 'jrdev',
        password: 'Jr@123',
        role: 'Employee',
        name: 'Divya Dev',
        designation: 'Junior Developer',
        department: 'Development',
        salary: 40000,
        first_login_done: 1,
        permissions: JSON.stringify(DEFAULT_PERMISSIONS.JuniorDeveloper)
      },
      {
        username: 'saleslead',
        password: 'Sales@123',
        role: 'Employee',
        name: 'Rajesh Sales',
        designation: 'Sales Lead',
        department: 'Sales',
        salary: 60000,
        first_login_done: 1,
        permissions: JSON.stringify(DEFAULT_PERMISSIONS.SalesExecutive)
      },
      {
        username: 'salesexec',
        password: 'Sales@456',
        role: 'Employee',
        name: 'Nisha Sales',
        designation: 'Sales Executive',
        department: 'Sales',
        salary: 35000,
        first_login_done: 1,
        permissions: JSON.stringify(DEFAULT_PERMISSIONS.SalesExecutive)
      },
      {
        username: 'marketingexec',
        password: 'Mark@123',
        role: 'Employee',
        name: 'Tarun Marketing',
        designation: 'Marketing Executive',
        department: 'Marketing',
        salary: 38000,
        first_login_done: 1,
        permissions: JSON.stringify(DEFAULT_PERMISSIONS.MarketingExecutive)
      }
    ];

    const today = new Date().toISOString().split('T')[0];
    
    // Insert users
    for (const u of seeds) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(u.password, salt);

      await db.runAsync(
        `INSERT INTO users (username, password, role, name, designation, department, salary, date_joined, permissions, first_login_done)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [u.username, hashedPassword, u.role, u.name, u.designation, u.department, u.salary, today, u.permissions, u.first_login_done]
      );
    }

    console.log("Successfully seeded users.");

    // Update managers
    const periUser = await db.getAsync("SELECT id FROM users WHERE username = 'Peri'");
    const pmUser = await db.getAsync("SELECT id FROM users WHERE username = 'pm'");
    const leaddevUser = await db.getAsync("SELECT id FROM users WHERE username = 'leaddev'");
    const salesleadUser = await db.getAsync("SELECT id FROM users WHERE username = 'saleslead'");

    if (periUser && pmUser && leaddevUser && salesleadUser) {
      // PM reports to Peri
      await db.runAsync("UPDATE users SET reporting_manager_id = ? WHERE id = ?", [periUser.id, pmUser.id]);
      // Lead Dev reports to PM
      await db.runAsync("UPDATE users SET reporting_manager_id = ? WHERE id = ?", [pmUser.id, leaddevUser.id]);
      // Jr Dev reports to Lead Dev
      await db.runAsync("UPDATE users SET reporting_manager_id = ? WHERE username = 'jrdev'", [leaddevUser.id]);
      // Sales Lead reports to Peri
      await db.runAsync("UPDATE users SET reporting_manager_id = ? WHERE id = ?", [periUser.id, salesleadUser.id]);
      // Sales Exec reports to Sales Lead
      await db.runAsync("UPDATE users SET reporting_manager_id = ? WHERE username = 'salesexec'", [salesleadUser.id]);
      // Marketing Exec reports to Peri
      await db.runAsync("UPDATE users SET reporting_manager_id = ? WHERE username = 'marketingexec'", [periUser.id]);
    }

    console.log("No test metadata seeded. Starting with a clean database.");
    
    console.log("Seeding complete!");

  } catch (error) {
    console.error("Error seeding users database:", error);
  }
}

// Initialise DB when loaded
db.serialize(() => {
  initDatabase().catch(err => {
    console.error('Failed to initialize database tables:', err);
  });
});

module.exports = db;
