-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL, -- SuperAdmin, Admin, Employee, ClientPortal
  name TEXT NOT NULL,
  designation TEXT, -- PM, Lead Developer, Junior Developer, Sales Executive, etc.
  department TEXT, -- Development, Sales, Marketing, Accounts, HR
  reporting_manager_id INTEGER,
  date_joined TEXT,
  salary REAL DEFAULT 0.0,
  permissions TEXT, -- JSON string representing permission matrix toggles
  first_login_done INTEGER DEFAULT 0, -- 0 = force password change
  FOREIGN KEY (reporting_manager_id) REFERENCES users(id)
);

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  company TEXT,
  country TEXT, -- India, US, UK, Other
  status TEXT DEFAULT 'Lead', -- Lead, Proposal Sent, Contract Signed, Active, Paused, Churned
  account_owner_id INTEGER,
  address TEXT,
  gstin TEXT,
  setup_fee REAL DEFAULT 0.0,
  recurring_fee REAL DEFAULT 0.0,
  contract_ref TEXT,
  start_date TEXT,
  portal_user_id INTEGER, -- Link to user account
  health TEXT DEFAULT 'on-track', -- on-track, at-risk, overdue-payment
  FOREIGN KEY (account_owner_id) REFERENCES users(id),
  FOREIGN KEY (portal_user_id) REFERENCES users(id)
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  client_id INTEGER NOT NULL,
  current_phase TEXT, -- Week 1-2, Phase 1, etc.
  status TEXT DEFAULT 'Not Started', -- Not Started, In Progress, Blocked, Done, Paused
  progress_percent INTEGER DEFAULT 0,
  target_go_live TEXT,
  start_date TEXT,
  pm_id INTEGER,
  lead_dev_id INTEGER,
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (pm_id) REFERENCES users(id),
  FOREIGN KEY (lead_dev_id) REFERENCES users(id)
);

-- Project Members (many-to-many relationship)
CREATE TABLE IF NOT EXISTS project_members (
  project_id INTEGER,
  user_id INTEGER,
  PRIMARY KEY (project_id, user_id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  project_id INTEGER,
  assignee_id INTEGER,
  assigner_id INTEGER,
  priority TEXT DEFAULT 'Medium', -- Low, Medium, High, Critical
  due_date TEXT,
  status TEXT DEFAULT 'To Do', -- To Do, In Progress, Blocked, Done
  type TEXT DEFAULT 'Delivery', -- Delivery, Sales, Marketing, Learning
  checklist TEXT, -- JSON string of checklist items
  approved INTEGER DEFAULT 1, -- 0 = pending approval for auto-generated tasks, 1 = approved
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (assignee_id) REFERENCES users(id),
  FOREIGN KEY (assigner_id) REFERENCES users(id)
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER,
  type TEXT NOT NULL, -- proposal, contract, invoice, sow
  reference_no TEXT UNIQUE NOT NULL,
  content_json TEXT NOT NULL, -- JSON payload of the document fields
  file_url TEXT, -- Path to saved static HTML or PDF
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- Revenue table
CREATE TABLE IF NOT EXISTS revenue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  client_id INTEGER,
  payment_method TEXT, -- Bank Transfer, Stripe, UPI, cash, other
  invoice_ref TEXT,
  source TEXT DEFAULT 'recurring', -- setup, recurring, other
  recorded_by INTEGER,
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (recorded_by) REFERENCES users(id)
);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  category TEXT NOT NULL, -- salary, tools/software, hosting, marketing spend, office, other
  paid_to TEXT,
  recorded_by INTEGER,
  FOREIGN KEY (recorded_by) REFERENCES users(id)
);

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  business_name TEXT,
  email TEXT,
  phone TEXT,
  status TEXT DEFAULT 'New', -- New, Contacted, In Discussion, Converted, Lost
  channel TEXT, -- referral, outbound, inbound web, cold call, event, partner
  follow_up_date TEXT,
  owner_id INTEGER,
  activity_log TEXT, -- JSON array of activity records
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

-- Meetings table
CREATE TABLE IF NOT EXISTS meetings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  datetime TEXT NOT NULL,
  duration INTEGER DEFAULT 30, -- minutes
  recurrence TEXT DEFAULT 'one-off', -- one-off, daily, weekly
  meeting_type TEXT DEFAULT 'internal', -- standup, status, client-checkin, other
  notes TEXT,
  what_discussed TEXT, -- Summary from transcript/notes
  linked_project_id INTEGER,
  FOREIGN KEY (linked_project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Meeting Attendees
CREATE TABLE IF NOT EXISTS meeting_attendees (
  meeting_id INTEGER,
  user_id INTEGER,
  PRIMARY KEY (meeting_id, user_id),
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  clock_in TEXT,
  clock_out TEXT,
  status TEXT DEFAULT 'Absent', -- Present, Absent, Half-day, Leave
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Leave Requests table
CREATE TABLE IF NOT EXISTS leave_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'Pending', -- Pending, Approved, Rejected
  approved_by INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  channel TEXT NOT NULL, -- Instagram, LinkedIn, X, YouTube, lead-gen, brand, retargeting
  budget REAL DEFAULT 0.0,
  start_date TEXT,
  end_date TEXT,
  leads_count INTEGER DEFAULT 0,
  sales_count INTEGER DEFAULT 0
);

-- Testimonials table
CREATE TABLE IF NOT EXISTS testimonials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  text TEXT,
  status TEXT DEFAULT 'Requested', -- Requested, Received, Published
  published_url TEXT,
  website_updated INTEGER DEFAULT 0, -- 0 = manual checkbox check, 1 = updated
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- Chat Messages (Project-level chat)
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  sender_id INTEGER NOT NULL,
  body TEXT NOT NULL,
  attachments TEXT, -- JSON array of file details
  pinned INTEGER DEFAULT 0, -- 0 = normal, 1 = pinned
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read_status INTEGER DEFAULT 0, -- 0 = unread, 1 = read
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
