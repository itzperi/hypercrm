const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const db = require('./db');
const aiService = require('./aiService');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'hyperwrike-crm-super-secret-key-12345';

app.use(cors());
app.use(express.json());

// Serve uploads if we have attachments (using a simple static server)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- AUTH MIDDLEWARE ---
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// Middleware to check specific module permissions
function checkPermission(module, action) {
  return async (req, res, next) => {
    try {
      const user = await db.getAsync('SELECT role, permissions FROM users WHERE id = ?', [req.user.id]);
      if (!user) return res.status(403).json({ error: 'User not found' });

      // SuperAdmin has full bypass
      if (user.role === 'SuperAdmin') {
        return next();
      }

      const permissions = JSON.parse(user.permissions || '{}');
      if (permissions[module] && permissions[module][action]) {
        return next();
      }

      return res.status(403).json({ error: `Permission denied: Cannot ${action} in ${module}` });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Permission verification failed' });
    }
  };
}

// Helper to push in-app notification
async function createNotification(userId, title, message) {
  try {
    await db.runAsync(
      `INSERT INTO notifications (user_id, title, message, read_status, created_at)
       VALUES (?, ?, ?, 0, datetime('now', 'localtime'))`,
      [userId, title, message]
    );
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
}

// --- AUTH ROUTES ---
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const user = await db.getAsync('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, department: user.department },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // If root super admin and password has not been changed
    const needsPasswordChange = (user.username === 'Peri' && user.first_login_done === 0);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        designation: user.designation,
        department: user.department,
        permissions: JSON.parse(user.permissions || '{}'),
        needsPasswordChange
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await db.runAsync(
      'UPDATE users SET password = ?, first_login_done = 1 WHERE id = ?',
      [hashedPassword, req.user.id]
    );

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- USER MANAGEMENT (Admins only) ---
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    // Only return salaries to Admin / SuperAdmin
    const isAdmin = (req.user.role === 'SuperAdmin' || req.user.role === 'Admin');
    const query = isAdmin 
      ? 'SELECT id, username, role, name, designation, department, reporting_manager_id, date_joined, salary, permissions, first_login_done FROM users'
      : 'SELECT id, username, role, name, designation, department, reporting_manager_id, date_joined, permissions FROM users';
    
    const users = await db.allAsync(query);
    const formatted = users.map(u => ({
      ...u,
      permissions: JSON.parse(u.permissions || '{}')
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', authenticateToken, async (req, res) => {
  if (req.user.role !== 'SuperAdmin' && req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Only admins can create users' });
  }

  const { username, password, role, name, designation, department, reporting_manager_id, salary, permissions } = req.body;
  
  if (!username || !password || !role || !name) {
    return res.status(400).json({ error: 'Required fields missing' });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const today = new Date().toISOString().split('T')[0];

    const result = await db.runAsync(
      `INSERT INTO users (username, password, role, name, designation, department, reporting_manager_id, date_joined, salary, permissions, first_login_done)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        username,
        hashedPassword,
        role,
        name,
        designation || '',
        department || '',
        reporting_manager_id || null,
        today,
        salary || 0.0,
        JSON.stringify(permissions || {})
      ]
    );

    res.json({ success: true, userId: result.lastID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'SuperAdmin' && req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Only admins can edit users' });
  }

  const { id } = req.params;
  const { name, designation, department, reporting_manager_id, salary, permissions, role } = req.body;

  try {
    const userToEdit = await db.getAsync('SELECT username, role FROM users WHERE id = ?', [id]);
    if (!userToEdit) return res.status(404).json({ error: 'User not found' });

    // Root super admin cannot be demoted or role changed
    if (userToEdit.username === 'Peri' && role && role !== 'SuperAdmin') {
      return res.status(400).json({ error: 'Cannot demote the Root Super Admin account' });
    }

    let query = `UPDATE users SET name = ?, designation = ?, department = ?, reporting_manager_id = ?, permissions = ?`;
    let params = [name, designation, department, reporting_manager_id || null, JSON.stringify(permissions || {})];

    if (req.user.role === 'SuperAdmin' || req.user.role === 'Admin') {
      query += `, salary = ?, role = ?`;
      params.push(salary || 0.0, role || userToEdit.role);
    }

    query += ` WHERE id = ?`;
    params.push(id);

    await db.runAsync(query, params);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'SuperAdmin') {
    return res.status(403).json({ error: 'Only SuperAdmin can delete users' });
  }

  const { id } = req.params;
  try {
    const userToDelete = await db.getAsync('SELECT username FROM users WHERE id = ?', [id]);
    if (!userToDelete) return res.status(404).json({ error: 'User not found' });

    if (userToDelete.username === 'Peri') {
      return res.status(400).json({ error: 'Cannot delete the Root Super Admin account' });
    }

    await db.runAsync('DELETE FROM users WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- REVENUE TRACKING ---
app.get('/api/revenue', authenticateToken, checkPermission('sales', 'view'), async (req, res) => {
  try {
    const revenue = await db.allAsync(
      `SELECT r.*, c.company as client_company, c.name as client_name, u.name as recorder_name 
       FROM revenue r
       LEFT JOIN clients c ON r.client_id = c.id
       LEFT JOIN users u ON r.recorded_by = u.id
       ORDER BY r.date DESC`
    );
    res.json(revenue);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/revenue', authenticateToken, checkPermission('sales', 'create'), async (req, res) => {
  const { amount, date, client_id, payment_method, invoice_ref, source } = req.body;
  if (!amount || !date) return res.status(400).json({ error: 'Amount and Date are required' });

  try {
    const result = await db.runAsync(
      `INSERT INTO revenue (amount, date, client_id, payment_method, invoice_ref, source, recorded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [amount, date, client_id || null, payment_method || '', invoice_ref || '', source || 'recurring', req.user.id]
    );

    // If linked client, trigger payment alert in-app
    if (client_id) {
      const client = await db.getAsync('SELECT name, account_owner_id FROM clients WHERE id = ?', [client_id]);
      if (client && client.account_owner_id) {
        await createNotification(
          client.account_owner_id, 
          'Payment Recorded', 
          `A payment of ${amount} has been logged for ${client.name}.`
        );
      }
    }

    res.json({ success: true, revenueId: result.lastID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- EXPENSE TRACKING ---
app.get('/api/expenses', authenticateToken, checkPermission('accounts', 'view'), async (req, res) => {
  try {
    const expenses = await db.allAsync(
      `SELECT e.*, u.name as recorder_name 
       FROM expenses e
       LEFT JOIN users u ON e.recorded_by = u.id
       ORDER BY e.date DESC`
    );
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/expenses', authenticateToken, checkPermission('accounts', 'create'), async (req, res) => {
  const { amount, date, category, paid_to } = req.body;
  if (!amount || !date || !category) return res.status(400).json({ error: 'Missing fields' });

  try {
    const result = await db.runAsync(
      `INSERT INTO expenses (amount, date, category, paid_to, recorded_by)
       VALUES (?, ?, ?, ?, ?)`,
      [amount, date, category, paid_to || '', req.user.id]
    );
    res.json({ success: true, expenseId: result.lastID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- CLIENT TRACKING ---
app.get('/api/clients', authenticateToken, checkPermission('sales', 'view'), async (req, res) => {
  try {
    // If user is client, only view self
    let clients;
    if (req.user.role === 'ClientPortal') {
      clients = await db.allAsync(
        `SELECT c.*, u.name as account_owner_name 
         FROM clients c
         LEFT JOIN users u ON c.account_owner_id = u.id
         WHERE c.portal_user_id = ?`, 
        [req.user.id]
      );
    } else {
      clients = await db.allAsync(
        `SELECT c.*, u.name as account_owner_name 
         FROM clients c
         LEFT JOIN users u ON c.account_owner_id = u.id`
      );
    }
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/clients', authenticateToken, checkPermission('sales', 'create'), async (req, res) => {
  const { name, company, country, status, account_owner_id, address, gstin, setup_fee, recurring_fee, contract_ref, start_date } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  try {
    // Check if we need to auto-create portal account
    let portalUserId = null;
    const clientCode = (company || name).substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'PRM');
    const portalUsername = `client_${clientCode.toLowerCase()}`;
    
    const existingUser = await db.getAsync('SELECT id FROM users WHERE username = ?', [portalUsername]);
    if (!existingUser) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Client@123', salt);
      const today = new Date().toISOString().split('T')[0];
      
      const permissions = JSON.stringify(DEFAULT_PERMISSIONS.ClientPortal);
      const newUser = await db.runAsync(
        `INSERT INTO users (username, password, role, name, designation, department, date_joined, permissions, first_login_done)
         VALUES (?, ?, 'ClientPortal', ?, 'Client Owner', 'Client', ?, ?, 1)`,
        [portalUsername, hashedPassword, name, today, permissions]
      );
      portalUserId = newUser.lastID;
    } else {
      portalUserId = existingUser.id;
    }

    const result = await db.runAsync(
      `INSERT INTO clients (name, company, country, status, account_owner_id, address, gstin, setup_fee, recurring_fee, contract_ref, start_date, portal_user_id, health)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'on-track')`,
      [name, company || '', country || 'India', status || 'Lead', account_owner_id || null, address || '', gstin || '', setup_fee || 0.0, recurring_fee || 0.0, contract_ref || '', start_date || '', portalUserId]
    );

    res.json({ success: true, clientId: result.lastID, portalUsername, portalPassword: 'Client@123' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/clients/:id', authenticateToken, checkPermission('sales', 'edit'), async (req, res) => {
  const { id } = req.params;
  const { name, company, country, status, account_owner_id, address, gstin, setup_fee, recurring_fee, contract_ref, start_date, health } = req.body;

  try {
    await db.runAsync(
      `UPDATE clients SET name = ?, company = ?, country = ?, status = ?, account_owner_id = ?, address = ?, gstin = ?, setup_fee = ?, recurring_fee = ?, contract_ref = ?, start_date = ?, health = ?
       WHERE id = ?`,
      [name, company, country, status, account_owner_id || null, address, gstin, setup_fee || 0.0, recurring_fee || 0.0, contract_ref, start_date, health || 'on-track', id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- DEVELOPMENT PROJECTS ---
app.get('/api/projects', authenticateToken, checkPermission('development', 'view'), async (req, res) => {
  try {
    let query = `
      SELECT p.*, c.name as client_name, c.company as client_company, pm.name as pm_name, ld.name as lead_dev_name 
      FROM projects p
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN users pm ON p.pm_id = pm.id
      LEFT JOIN users ld ON p.lead_dev_id = ld.id
    `;
    let params = [];

    // Filter project list for scoped developers/managers/clients
    if (req.user.role === 'ClientPortal') {
      query += ` WHERE c.portal_user_id = ?`;
      params.push(req.user.id);
    } else if (req.user.role === 'Employee' && req.user.department === 'Development') {
      // Employees see projects they are staffed on
      query += ` WHERE p.id IN (SELECT project_id FROM project_members WHERE user_id = ?)`;
      params.push(req.user.id);
    }

    const projects = await db.allAsync(query, params);
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects', authenticateToken, checkPermission('development', 'create'), async (req, res) => {
  const { name, client_id, current_phase, status, target_go_live, start_date, pm_id, lead_dev_id, members } = req.body;
  if (!name || !client_id) return res.status(400).json({ error: 'Name and Client ID are required' });

  try {
    const result = await db.runAsync(
      `INSERT INTO projects (name, client_id, current_phase, status, progress_percent, target_go_live, start_date, pm_id, lead_dev_id)
       VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?)`,
      [name, client_id, current_phase || 'Phase 1', status || 'Not Started', target_go_live || '', start_date || '', pm_id || null, lead_dev_id || null]
    );
    const projectId = result.lastID;

    // Add members to project
    const allMembers = [pm_id, lead_dev_id, ...(members || [])].filter(Boolean);
    const uniqueMembers = [...new Set(allMembers)];

    for (const memId of uniqueMembers) {
      await db.runAsync('INSERT OR IGNORE INTO project_members (project_id, user_id) VALUES (?, ?)', [projectId, memId]);
      await createNotification(memId, 'Assigned to Project', `You have been staffed on project "${name}".`);
    }

    res.json({ success: true, projectId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/projects/:id', authenticateToken, checkPermission('development', 'edit'), async (req, res) => {
  const { id } = req.params;
  const { name, current_phase, status, progress_percent, target_go_live, pm_id, lead_dev_id, members } = req.body;

  try {
    await db.runAsync(
      `UPDATE projects SET name = ?, current_phase = ?, status = ?, progress_percent = ?, target_go_live = ?, pm_id = ?, lead_dev_id = ?
       WHERE id = ?`,
      [name, current_phase, status, progress_percent || 0, target_go_live, pm_id || null, lead_dev_id || null, id]
    );

    if (members) {
      // Sync members
      await db.runAsync('DELETE FROM project_members WHERE project_id = ?', [id]);
      const allMembers = [pm_id, lead_dev_id, ...members].filter(Boolean);
      const uniqueMembers = [...new Set(allMembers)];
      
      for (const memId of uniqueMembers) {
        await db.runAsync('INSERT OR IGNORE INTO project_members (project_id, user_id) VALUES (?, ?)', [id, memId]);
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- WORK TRACKING / TASKS ---
// --- WORK TRACKING / TASKS ---
app.get('/api/tasks', authenticateToken, async (req, res) => {
  try {
    let query = `
      SELECT t.*, p.name as project_name, u1.name as assignee_name, u2.name as assigner_name 
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u1 ON t.assignee_id = u1.id
      LEFT JOIN users u2 ON t.assigner_id = u2.id
    `;
    let params = [];

    // Role filtering for task engine
    if (req.user.role === 'ClientPortal') {
      query += ` WHERE p.client_id = (SELECT id FROM clients WHERE portal_user_id = ?) AND t.approved = 1`;
      params.push(req.user.id);
    } else if (req.user.role === 'Employee') {
      // Managers see everything assigned by/to their staff, regular devs see their own
      if (req.user.department === 'Development' && (req.user.designation === 'Lead Developer' || req.user.designation === 'Project Manager')) {
        // PM / Lead Dev can see all tasks for projects they manage or tasks they assigned
        query += ` WHERE t.assignee_id = ? OR t.assigner_id = ? OR t.project_id IN (SELECT id FROM projects WHERE pm_id = ? OR lead_dev_id = ?)`;
        params.push(req.user.id, req.user.id, req.user.id, req.user.id);
      } else if (req.user.designation && (req.user.designation.includes('Lead') || req.user.designation.includes('Manager'))) {
        // Department managers can see tasks assigned to/by them
        query += ` WHERE t.assignee_id = ? OR t.assigner_id = ?`;
        params.push(req.user.id, req.user.id);
      } else {
        // Junior staff only see tasks assigned to them, or tasks they assigned
        query += ` WHERE (t.assignee_id = ? OR t.assigner_id = ?) AND t.approved = 1`;
        params.push(req.user.id, req.user.id);
      }
    }

    const tasks = await db.allAsync(query, params);
    const formatted = tasks.map(t => ({
      ...t,
      checklist: JSON.parse(t.checklist || '[]')
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tasks', authenticateToken, async (req, res) => {
  const { title, description, project_id, assignee_id, priority, due_date, status, type, checklist, approved } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  // Hierarchy rules validation
  // PM -> Lead Developer -> Junior Developer
  // Sales Lead -> Sales Executive
  // Marketing Lead -> Marketing Executive
  try {
    const creator = await db.getAsync('SELECT role, designation, department, permissions FROM users WHERE id = ?', [req.user.id]);
    if (!creator) return res.status(403).json({ error: 'User not found' });

    // Permissions check based on task type
    const taskType = type || 'Delivery';
    const moduleMap = {
      'Delivery': 'development',
      'Learning': 'learning',
      'Marketing': 'marketing',
      'Sales': 'sales',
      'Bug': 'development'
    };
    const targetModule = moduleMap[taskType] || 'development';
    const permissions = JSON.parse(creator.permissions || '{}');

    if (creator.role !== 'SuperAdmin' && creator.role !== 'Admin' && (!permissions[targetModule] || !permissions[targetModule].create)) {
      return res.status(403).json({ error: `Permission denied: Cannot create ${taskType} tasks.` });
    }

    const assignee = assignee_id ? await db.getAsync('SELECT designation, role, department FROM users WHERE id = ?', [assignee_id]) : null;

    if (assignee && creator.role !== 'SuperAdmin' && creator.role !== 'Admin') {
      // Junior cannot assign tasks to PM/Lead Dev
      const rank = {
        'Project Manager': 3,
        'Lead Developer': 2,
        'Junior Developer': 1,
        'Sales Lead': 2,
        'Sales Executive': 1,
        'Marketing Lead': 2,
        'Marketing Executive': 1
      };
      
      const creatorRank = rank[creator.designation] || 0;
      const assigneeRank = rank[assignee.designation] || 0;

      // Check hierarchy: creator must have higher rank or equal (lateral assignment)
      if (creatorRank < assigneeRank && creator.department === assignee.department) {
        return res.status(403).json({ error: 'Hierarchy Rule Violation: Cannot assign tasks upward.' });
      }
    }

    const taskApproved = approved !== undefined ? approved : 1;

    const result = await db.runAsync(
      `INSERT INTO tasks (title, description, project_id, assignee_id, assigner_id, priority, due_date, status, type, checklist, approved)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        description || '',
        project_id || null,
        assignee_id || null,
        req.user.id,
        priority || 'Medium',
        due_date || '',
        status || 'To Do',
        type || 'Delivery',
        JSON.stringify(checklist || []),
        taskApproved
      ]
    );

    if (assignee_id && taskApproved === 1) {
      await createNotification(assignee_id, 'New Task Assigned', `Task "${title}" has been assigned to you.`);
    }

    res.json({ success: true, taskId: result.lastID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/tasks/:id', authenticateToken, checkPermission('development', 'edit'), async (req, res) => {
  const { id } = req.params;
  const { title, description, assignee_id, priority, due_date, status, checklist, approved } = req.body;

  try {
    const task = await db.getAsync('SELECT * FROM tasks WHERE id = ?', [id]);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    // Handle task approval notification
    if (task.approved === 0 && approved === 1 && task.assignee_id) {
      await createNotification(task.assignee_id, 'Task Approved', `Auto-generated task "${task.title}" is now approved and active.`);
    }

    await db.runAsync(
      `UPDATE tasks SET title = ?, description = ?, assignee_id = ?, priority = ?, due_date = ?, status = ?, checklist = ?, approved = ?
       WHERE id = ?`,
      [
        title || task.title,
        description !== undefined ? description : task.description,
        assignee_id !== undefined ? assignee_id : task.assignee_id,
        priority || task.priority,
        due_date !== undefined ? due_date : task.due_date,
        status || task.status,
        checklist ? JSON.stringify(checklist) : task.checklist,
        approved !== undefined ? approved : task.approved,
        id
      ]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tasks/:id', authenticateToken, checkPermission('development', 'delete'), async (req, res) => {
  const { id } = req.params;
  try {
    await db.runAsync('DELETE FROM tasks WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- AI EXTRACTION BRIEF SERVICE ---
app.post('/api/ai/extract', authenticateToken, async (req, res) => {
  const { briefText } = req.body;
  if (!briefText) return res.status(400).json({ error: 'Brief text is required' });

  try {
    const extractedData = await aiService.extractClientInfo(briefText);
    res.json(extractedData);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Extraction failed: ' + e.message });
  }
});

// --- DOCUMENT GENERATION & ARCHIVE ---
app.get('/api/documents', authenticateToken, async (req, res) => {
  try {
    let docs;
    if (req.user.role === 'ClientPortal') {
      docs = await db.allAsync(
        `SELECT d.*, c.company as client_company, c.name as client_name 
         FROM documents d
         JOIN clients c ON d.client_id = c.id
         WHERE c.portal_user_id = ? 
         ORDER BY d.created_at DESC`,
        [req.user.id]
      );
    } else {
      docs = await db.allAsync(
        `SELECT d.*, c.company as client_company, c.name as client_name 
         FROM documents d
         LEFT JOIN clients c ON d.client_id = c.id
         ORDER BY d.created_at DESC`
      );
    }
    const formatted = docs.map(d => ({
      ...d,
      content: JSON.parse(d.content_json)
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/documents', authenticateToken, checkPermission('sales', 'create'), async (req, res) => {
  const { client_id, type, reference_no, content } = req.body;
  if (!type || !reference_no || !content) return res.status(400).json({ error: 'Missing document parameters' });

  try {
    const result = await db.runAsync(
      `INSERT INTO documents (client_id, type, reference_no, content_json, created_at)
       VALUES (?, ?, ?, ?, datetime('now', 'localtime'))`,
      [client_id || null, type, reference_no, JSON.stringify(content)]
    );

    // If client contract is signed, trigger project creation
    if (type === 'contract' && client_id) {
      await db.runAsync("UPDATE clients SET status = 'Contract Signed' WHERE id = ?", [client_id]);
      
      const client = await db.getAsync('SELECT * FROM clients WHERE id = ?', [client_id]);
      const projName = `${content.project?.title || 'Deliverables'} Implementation`;

      // Check if project already exists
      const existingProj = await db.getAsync('SELECT id FROM projects WHERE client_id = ?', [client_id]);
      if (!existingProj) {
        // Auto-create project
        const pmObj = await db.getAsync("SELECT id FROM users WHERE username = 'pm'");
        const leaddevObj = await db.getAsync("SELECT id FROM users WHERE username = 'leaddev'");
        
        const projResult = await db.runAsync(
          `INSERT INTO projects (name, client_id, current_phase, status, progress_percent, target_go_live, start_date, pm_id, lead_dev_id)
           VALUES (?, ?, 'Phase 1: Setup', 'In Progress', 5, ?, ?, ?, ?)`,
          [projName, client_id, content.project?.dueDate || '', client.start_date || '', pmObj?.id || 3, leaddevObj?.id || 4]
        );
        const projectId = projResult.lastID;

        // Add staffed members
        if (pmObj) await db.runAsync('INSERT OR IGNORE INTO project_members (project_id, user_id) VALUES (?, ?)', [projectId, pmObj.id]);
        if (leaddevObj) await db.runAsync('INSERT OR IGNORE INTO project_members (project_id, user_id) VALUES (?, ?)', [projectId, leaddevObj.id]);

        // Auto-generate pending tasks from timeline phases in contract
        if (content.phasedRollout && content.phasedRollout.length > 0) {
          for (const phaseItem of content.phasedRollout) {
            await db.runAsync(
              `INSERT INTO tasks (title, description, project_id, assignee_id, assigner_id, priority, due_date, status, type, approved)
               VALUES (?, ?, ?, ?, ?, 'Medium', '', 'To Do', 'Delivery', 0)`,
              [
                `Timeline Task: ${phaseItem.phase}`,
                phaseItem.detail,
                projectId,
                leaddevObj?.id || 4, // assign to Lead Dev pending PM approval
                pmObj?.id || 3
              ]
            );
          }
        }
        
        await createNotification(pmObj?.id || 3, 'Project Auto-Created', `Project "${projName}" created from Contract ${reference_no}. Please review pending tasks.`);
      }
    }

    res.json({ success: true, documentId: result.lastID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- LEADS / PIPELINE ---
app.get('/api/leads', authenticateToken, checkPermission('sales', 'view'), async (req, res) => {
  try {
    let leads;
    if (req.user.role === 'Employee' && req.user.department === 'Sales' && req.user.designation === 'Sales Executive') {
      // Executives see their own leads
      leads = await db.allAsync(
        `SELECT l.*, u.name as owner_name FROM leads l LEFT JOIN users u ON l.owner_id = u.id WHERE l.owner_id = ?`, 
        [req.user.id]
      );
    } else {
      leads = await db.allAsync(`SELECT l.*, u.name as owner_name FROM leads l LEFT JOIN users u ON l.owner_id = u.id`);
    }
    const formatted = leads.map(l => ({
      ...l,
      activity_log: JSON.parse(l.activity_log || '[]')
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/leads', authenticateToken, checkPermission('sales', 'create'), async (req, res) => {
  const { name, business_name, email, phone, status, channel, follow_up_date, owner_id } = req.body;
  if (!name) return res.status(400).json({ error: 'Lead name is required' });

  try {
    const initialLog = [{
      date: new Date().toISOString().split('T')[0],
      outcome: 'Lead Created',
      action: 'Initial Entry',
      next_follow_up: follow_up_date || ''
    }];

    const result = await db.runAsync(
      `INSERT INTO leads (name, business_name, email, phone, status, channel, follow_up_date, owner_id, activity_log)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        business_name || '',
        email || '',
        phone || '',
        status || 'New',
        channel || 'referral',
        follow_up_date || '',
        owner_id || req.user.id,
        JSON.stringify(initialLog)
      ]
    );

    res.json({ success: true, leadId: result.lastID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/leads/:id', authenticateToken, checkPermission('sales', 'edit'), async (req, res) => {
  const { id } = req.params;
  const { name, business_name, email, phone, status, channel, follow_up_date, owner_id, activity_log } = req.body;

  try {
    await db.runAsync(
      `UPDATE leads SET name = ?, business_name = ?, email = ?, phone = ?, status = ?, channel = ?, follow_up_date = ?, owner_id = ?, activity_log = ?
       WHERE id = ?`,
      [
        name,
        business_name,
        email,
        phone,
        status,
        channel,
        follow_up_date,
        owner_id,
        activity_log ? JSON.stringify(activity_log) : null,
        id
      ]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ATTENDANCE SHIFT (9:00 AM - 4:30 PM) ---
app.get('/api/attendance', authenticateToken, async (req, res) => {
  try {
    let rows;
    if (req.user.role === 'SuperAdmin' || req.user.role === 'Admin') {
      rows = await db.allAsync(
        `SELECT a.*, u.name, u.designation, u.department 
         FROM attendance a 
         JOIN users u ON a.user_id = u.id 
         ORDER BY a.date DESC`
      );
    } else {
      rows = await db.allAsync('SELECT * FROM attendance WHERE user_id = ? ORDER BY date DESC', [req.user.id]);
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/attendance/clock-in', authenticateToken, async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  
  // Format local time hh:mm:ss
  const clockInTime = now.toTimeString().split(' ')[0];

  // 9:00 AM window checking
  const hour = now.getHours();
  const minute = now.getMinutes();
  
  let status = 'Present';
  if (hour > 9 || (hour === 9 && minute > 15)) {
    status = 'Half-day'; // Late clock-in
  }

  try {
    const existing = await db.getAsync('SELECT id FROM attendance WHERE user_id = ? AND date = ?', [req.user.id, today]);
    if (existing) {
      return res.status(400).json({ error: 'Already clocked in today.' });
    }

    await db.runAsync(
      `INSERT INTO attendance (user_id, date, clock_in, status)
       VALUES (?, ?, ?, ?)`,
      [req.user.id, today, clockInTime, status]
    );

    res.json({ success: true, clockInTime, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/attendance/clock-out', authenticateToken, async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const clockOutTime = now.toTimeString().split(' ')[0];

  try {
    const record = await db.getAsync('SELECT * FROM attendance WHERE user_id = ? AND date = ?', [req.user.id, today]);
    if (!record) {
      return res.status(400).json({ error: 'Must clock-in first.' });
    }

    await db.runAsync(
      `UPDATE attendance SET clock_out = ? WHERE id = ?`,
      [clockOutTime, record.id]
    );

    res.json({ success: true, clockOutTime });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- LEAVE WORKFLOWS ---
app.get('/api/leaves', authenticateToken, async (req, res) => {
  try {
    let rows;
    if (req.user.role === 'SuperAdmin' || req.user.role === 'Admin') {
      rows = await db.allAsync(
        `SELECT l.*, u.name as user_name, u.designation, u.department 
         FROM leave_requests l 
         JOIN users u ON l.user_id = u.id 
         ORDER BY l.start_date DESC`
      );
    } else {
      rows = await db.allAsync('SELECT * FROM leave_requests WHERE user_id = ? ORDER BY start_date DESC', [req.user.id]);
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/leaves', authenticateToken, async (req, res) => {
  const { start_date, end_date, reason } = req.body;
  if (!start_date || !end_date) return res.status(400).json({ error: 'Start and End date are required' });

  try {
    const result = await db.runAsync(
      `INSERT INTO leave_requests (user_id, start_date, end_date, reason, status)
       VALUES (?, ?, ?, ?, 'Pending')`,
      [req.user.id, start_date, end_date, reason || '']
    );

    // Notify manager
    const user = await db.getAsync('SELECT name, reporting_manager_id FROM users WHERE id = ?', [req.user.id]);
    if (user && user.reporting_manager_id) {
      await createNotification(
        user.reporting_manager_id, 
        'Leave Request Submitted', 
        `${user.name} has requested leave from ${start_date} to ${end_date}.`
      );
    }

    res.json({ success: true, leaveId: result.lastID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/leaves/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'SuperAdmin' && req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Only admins can approve leaves.' });
  }

  const { id } = req.params;
  const { status } = req.body; // Approved or Rejected

  try {
    await db.runAsync(
      'UPDATE leave_requests SET status = ?, approved_by = ? WHERE id = ?',
      [status, req.user.id, id]
    );

    const leave = await db.getAsync('SELECT * FROM leave_requests WHERE id = ?', [id]);
    if (leave) {
      await createNotification(
        leave.user_id,
        `Leave Request ${status}`,
        `Your leave request from ${leave.start_date} to ${leave.end_date} has been ${status.toLowerCase()}.`
      );

      // If approved, block date on attendance
      if (status === 'Approved') {
        let current = new Date(leave.start_date);
        const end = new Date(leave.end_date);
        while (current <= end) {
          const dateStr = current.toISOString().split('T')[0];
          // Check if weekend
          const day = current.getDay();
          if (day !== 0 && day !== 6) { // skip Sat/Sun
            await db.runAsync(
              'INSERT OR REPLACE INTO attendance (user_id, date, status) VALUES (?, ?, ?)',
              [leave.user_id, dateStr, 'Leave']
            );
          }
          current.setDate(current.getDate() + 1);
        }
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- SCHEDULER & MEETINGS ---
app.get('/api/meetings', authenticateToken, checkPermission('scheduler', 'view'), async (req, res) => {
  try {
    const meetings = await db.allAsync(
      `SELECT m.*, p.name as project_name 
       FROM meetings m 
       LEFT JOIN projects p ON m.linked_project_id = p.id
       ORDER BY m.datetime ASC`
    );
    
    // Fetch attendees for each meeting
    const fullMeetings = [];
    for (const m of meetings) {
      const attendees = await db.allAsync(
        `SELECT u.id, u.name, u.role, u.designation 
         FROM meeting_attendees ma
         JOIN users u ON ma.user_id = u.id
         WHERE ma.meeting_id = ?`,
        [m.id]
      );
      fullMeetings.push({ ...m, attendees });
    }
    
    res.json(fullMeetings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/meetings', authenticateToken, checkPermission('scheduler', 'create'), async (req, res) => {
  const { title, datetime, duration, recurrence, meeting_type, notes, linked_project_id, attendees } = req.body;
  if (!title || !datetime) return res.status(400).json({ error: 'Title and Date/Time are required' });

  // 9:00 AM - 4:30 PM working hours enforcement
  const mtgTime = new Date(datetime);
  const hour = mtgTime.getHours();
  const minute = mtgTime.getMinutes();
  
  if (hour < 9 || hour > 16 || (hour === 16 && minute > 30)) {
    return res.status(400).json({ error: 'Meetings can only be scheduled within working hours (9:00 AM – 4:30 PM).' });
  }

  try {
    const result = await db.runAsync(
      `INSERT INTO meetings (title, datetime, duration, recurrence, meeting_type, notes, linked_project_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title, datetime, duration || 30, recurrence || 'one-off', meeting_type || 'internal', notes || '', linked_project_id || null]
    );
    const meetingId = result.lastID;

    // Attach attendees
    const uniqueAttendees = [...new Set([...(attendees || []), req.user.id])];
    for (const attId of uniqueAttendees) {
      await db.runAsync('INSERT INTO meeting_attendees (meeting_id, user_id) VALUES (?, ?)', [meetingId, attId]);
      await createNotification(attId, 'Meeting Scheduled', `Meeting "${title}" scheduled on ${datetime}.`);
    }

    // Auto-create chat notification if project linked
    if (linked_project_id) {
      await db.runAsync(
        `INSERT INTO messages (project_id, sender_id, body)
         VALUES (?, ?, ?)`,
        [linked_project_id, req.user.id, `📅 **Meeting Scheduled**: "${title}" is set for ${new Date(datetime).toLocaleString()}.`]
      );
    }

    res.json({ success: true, meetingId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/meetings/:id', authenticateToken, checkPermission('scheduler', 'edit'), async (req, res) => {
  const { id } = req.params;
  const { notes, what_discussed } = req.body;

  try {
    const mtg = await db.getAsync('SELECT * FROM meetings WHERE id = ?', [id]);
    if (!mtg) return res.status(404).json({ error: 'Meeting not found' });

    await db.runAsync(
      'UPDATE meetings SET notes = ?, what_discussed = ? WHERE id = ?',
      [notes || mtg.notes, what_discussed || mtg.what_discussed, id]
    );

    // If project-linked, push notes to project chat
    if (mtg.linked_project_id && what_discussed) {
      await db.runAsync(
        `INSERT INTO messages (project_id, sender_id, body)
         VALUES (?, ?, ?)`,
        [
          mtg.linked_project_id, 
          req.user.id, 
          `📝 **Meeting Summary (${mtg.title})**:\n${what_discussed}`
        ]
      );
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- IN-APP NOTIFICATIONS PANEL ---
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const rows = await db.allAsync(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50', 
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/notifications/read', authenticateToken, async (req, res) => {
  try {
    await db.runAsync('UPDATE notifications SET read_status = 1 WHERE user_id = ?', [req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- PROJECT TEAM CHAT ---
app.get('/api/messages/:projectId', authenticateToken, async (req, res) => {
  const { projectId } = req.params;
  try {
    const rows = await db.allAsync(
      `SELECT m.*, u.name as sender_name, u.role as sender_role, u.designation as sender_designation 
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.project_id = ?
       ORDER BY m.created_at ASC`,
      [projectId]
    );
    const formatted = rows.map(r => ({
      ...r,
      attachments: JSON.parse(r.attachments || '[]')
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/messages/:projectId', authenticateToken, async (req, res) => {
  const { projectId } = req.params;
  const { body, attachments } = req.body;
  if (!body) return res.status(400).json({ error: 'Body is required' });

  try {
    const result = await db.runAsync(
      `INSERT INTO messages (project_id, sender_id, body, attachments, pinned, created_at)
       VALUES (?, ?, ?, ?, 0, datetime('now', 'localtime'))`,
      [projectId, req.user.id, body, JSON.stringify(attachments || [])]
    );
    res.json({ success: true, messageId: result.lastID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/messages/:id/pin', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { pinned } = req.body; // 0 or 1
  try {
    await db.runAsync('UPDATE messages SET pinned = ? WHERE id = ?', [pinned ? 1 : 0, id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- MARKETING & CAMPAIGNS ---
app.get('/api/marketing/campaigns', authenticateToken, checkPermission('marketing', 'view'), async (req, res) => {
  try {
    const rows = await db.allAsync('SELECT * FROM campaigns ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/marketing/campaigns', authenticateToken, checkPermission('marketing', 'create'), async (req, res) => {
  const { name, channel, budget, start_date, end_date } = req.body;
  if (!name || !channel) return res.status(400).json({ error: 'Name and Channel are required' });

  try {
    const result = await db.runAsync(
      `INSERT INTO campaigns (name, channel, budget, start_date, end_date, leads_count, sales_count)
       VALUES (?, ?, ?, ?, ?, 0, 0)`,
      [name, channel, budget || 0.0, start_date || '', end_date || '']
    );
    res.json({ success: true, campaignId: result.lastID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/marketing/testimonials', authenticateToken, checkPermission('marketing', 'view'), async (req, res) => {
  try {
    const rows = await db.allAsync(
      `SELECT t.*, c.company as client_company, c.name as client_name 
       FROM testimonials t 
       JOIN clients c ON t.client_id = c.id`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/marketing/testimonials', authenticateToken, checkPermission('marketing', 'create'), async (req, res) => {
  const { client_id, text, status, published_url, website_updated } = req.body;
  if (!client_id) return res.status(400).json({ error: 'Client ID is required' });

  try {
    const result = await db.runAsync(
      `INSERT INTO testimonials (client_id, text, status, published_url, website_updated)
       VALUES (?, ?, ?, ?, ?)`,
      [client_id, text || '', status || 'Requested', published_url || '', website_updated ? 1 : 0]
    );
    res.json({ success: true, testimonialId: result.lastID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/marketing/testimonials/:id', authenticateToken, checkPermission('marketing', 'edit'), async (req, res) => {
  const { id } = req.params;
  const { text, status, published_url, website_updated } = req.body;

  try {
    await db.runAsync(
      `UPDATE testimonials SET text = ?, status = ?, published_url = ?, website_updated = ?
       WHERE id = ?`,
      [text, status, published_url, website_updated ? 1 : 0, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- SETTINGS PERMISSIONS MATRIX ---
app.put('/api/settings/permissions/:role', authenticateToken, async (req, res) => {
  if (req.user.role !== 'SuperAdmin' && req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Only admins can alter permissions matrices.' });
  }

  const { role } = req.params;
  const { permissions } = req.body; // JSON object

  try {
    await db.runAsync(
      'UPDATE users SET permissions = ? WHERE role = ? AND username != "Peri"',
      [JSON.stringify(permissions), role]
    );
    res.json({ success: true, message: `Permission template applied to all active ${role} users.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- CRON-EQUIVALENT BACKGROUND ESCALATION ENGINE ---
// Checks for overdue tasks and issues escalation alerts to managers.
async function runOverdueEscalations() {
  console.log('Running background check for overdue tasks...');
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Find tasks that are not done, have a due date past today, and haven't escalated yet
    const overdueTasks = await db.allAsync(
      `SELECT t.*, u1.name as assignee_name, u1.reporting_manager_id 
       FROM tasks t
       JOIN users u1 ON t.assignee_id = u1.id
       WHERE t.status != 'Done' AND t.due_date != '' AND t.due_date < ? AND t.approved = 1`,
      [today]
    );

    for (const task of overdueTasks) {
      if (task.reporting_manager_id) {
        // Send alert to manager
        const managerAlertMsg = `⚠️ OVERDUE ESCALATION: Task "${task.title}" assigned to ${task.assignee_name} was due on ${task.due_date} and is still incomplete.`;
        
        // Check if we already created an identical alert to avoid spamming
        const alreadyNotified = await db.getAsync(
          `SELECT id FROM notifications WHERE user_id = ? AND title = 'Overdue Escalation' AND message LIKE ?`,
          [task.reporting_manager_id, `%${task.title}%`]
        );

        if (!alreadyNotified) {
          await createNotification(task.reporting_manager_id, 'Overdue Escalation', managerAlertMsg);
          console.log(`Escalation triggered for Task ID: ${task.id} to manager ID: ${task.reporting_manager_id}`);
        }
      }
    }
  } catch (e) {
    console.error('Error running overdue escalations:', e);
  }
}

// Run checklist check every 30 minutes
setInterval(runOverdueEscalations, 30 * 60 * 1000);
// Run once immediately on startup
setTimeout(runOverdueEscalations, 10000);


// Serve Frontend production build if in prod
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`HyperCRM Backend API listening on http://localhost:${PORT}`);
});
