import React, { useState, useEffect } from 'react';
import { Kanban, List, CheckSquare, Plus, Edit, ThumbsUp, Calendar, Trash2 } from 'lucide-react';

export default function WorkTrackingModule({ user, showToast }) {
  const [viewMode, setViewMode] = useState('kanban'); // kanban | list | approvals
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);

  // Form states
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    project_id: '',
    assignee_id: '',
    priority: 'Medium',
    due_date: '',
    type: 'Delivery'
  });

  // Editing state
  const [editingTask, setEditingTask] = useState(null);

  const headers = {
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  };

  const loadData = () => {
    fetch('/api/tasks', { headers }).then(res => res.ok ? res.json() : []).then(data => setTasks(Array.isArray(data) ? data : []));
    fetch('/api/projects', { headers }).then(res => res.ok ? res.json() : []).then(data => setProjects(Array.isArray(data) ? data : []));
    fetch('/api/users', { headers }).then(res => res.ok ? res.json() : []).then(data => setUsers(Array.isArray(data) ? data.filter(u => u.role !== 'ClientPortal') : []));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateTask = (e) => {
    e.preventDefault();
    fetch('/api/tasks', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...taskForm,
        approved: 1 // manually created tasks are auto-approved
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) showToast(data.error, 'error');
        else {
          showToast('Task assigned successfully');
          loadData();
          setTaskForm({ title: '', description: '', project_id: '', assignee_id: '', priority: 'Medium', due_date: '', type: 'Delivery' });
        }
      });
  };

  const handleUpdateStatus = (taskId, newStatus) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        ...task,
        status: newStatus
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) showToast(data.error, 'error');
        else {
          showToast(`Task status updated to ${newStatus}`);
          loadData();
        }
      });
  };

  const handleApproveTask = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        ...task,
        approved: 1
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) showToast(data.error, 'error');
        else {
          showToast('Auto-generated task approved!');
          loadData();
        }
      });
  };

  const handleEditTaskSubmit = (e) => {
    e.preventDefault();
    fetch(`/api/tasks/${editingTask.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(editingTask)
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) showToast(data.error, 'error');
        else {
          showToast('Task updated successfully');
          setEditingTask(null);
          loadData();
        }
      });
  };

  const handleDeleteTask = (id) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    fetch(`/api/tasks/${id}`, {
      method: 'DELETE',
      headers
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) showToast(data.error, 'error');
        else {
          showToast('Task deleted successfully');
          loadData();
        }
      });
  };

  // Filter tasks based on approval
  const activeTasks = tasks.filter(t => t.approved === 1);
  const pendingTasks = tasks.filter(t => t.approved === 0);

  // Group active tasks for Kanban
  const kanbanColumns = {
    'To Do': activeTasks.filter(t => t.status === 'To Do'),
    'In Progress': activeTasks.filter(t => t.status === 'In Progress'),
    'Blocked': activeTasks.filter(t => t.status === 'Blocked'),
    'Done': activeTasks.filter(t => t.status === 'Done')
  };

  // Determine if user can approve tasks
  const isManager = (user.role === 'SuperAdmin' || user.role === 'Admin' || user.designation === 'Project Manager' || user.designation === 'Lead Developer');

  return (
    <div className="crm-page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800 }}>Work Tracking Task Engine</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px' }}>
            Assign and monitor tasks, approve auto-generated items, and track completion progress.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className={`btn ${viewMode === 'kanban' ? 'primary' : 'secondary'}`} onClick={() => setViewMode('kanban')}>
            <Kanban size={14} /> Kanban Board
          </button>
          <button className={`btn ${viewMode === 'list' ? 'primary' : 'secondary'}`} onClick={() => setViewMode('list')}>
            <List size={14} /> List View
          </button>
          {isManager && (
            <button className={`btn ${viewMode === 'approvals' ? 'gold' : 'secondary'}`} onClick={() => setViewMode('approvals')}>
              <ThumbsUp size={14} /> Approvals Queue ({pendingTasks.length})
            </button>
          )}
        </div>
      </div>

      {/* --- KANBAN BOARD VIEW --- */}
      {viewMode === 'kanban' && (
        <div className="dashboard-row" style={{ gridTemplateColumns: '3fr 1.2fr', alignItems: 'flex-start' }}>
          {/* Columns */}
          <div className="kanban-board">
            {Object.entries(kanbanColumns).map(([colName, colTasks]) => (
              <div key={colName} className="kanban-col">
                <div className="kanban-col-header">
                  <span>{colName}</span>
                  <span>({colTasks.length})</span>
                </div>
                <div className="kanban-card-list">
                  {colTasks.map(t => (
                    <div key={t.id} className={`kanban-card prio-${t.priority}`}>
                      <h4>{t.title}</h4>
                      <p>{t.description || 'No description provided.'}</p>
                      
                      {/* State status changer dropdown */}
                      <select 
                        value={t.status} 
                        onChange={e => handleUpdateStatus(t.id, e.target.value)}
                        style={{ padding: '4px', fontSize: '11px', marginBottom: '8px', backgroundColor: 'var(--bg-card)', width: '100%' }}
                      >
                        <option>To Do</option>
                        <option>In Progress</option>
                        <option>Blocked</option>
                        <option>Done</option>
                      </select>

                      <div className="kanban-card-meta">
                        <span className="due">{t.due_date || 'No due date'}</span>
                        <span className="who">{t.assignee_name || 'Unassigned'}</span>
                      </div>

                      <div style={{ display: 'flex', gap: '6px', marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                        <button 
                          className="btn secondary" 
                          style={{ padding: '4px 6px', fontSize: '10px', flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }} 
                          onClick={() => setEditingTask(t)}
                        >
                          <Edit size={10} /> Edit
                        </button>
                        <button 
                          className="btn danger" 
                          style={{ padding: '4px 6px', fontSize: '10px', flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }} 
                          onClick={() => handleDeleteTask(t.id)}
                        >
                          <Trash2 size={10} /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Right sidebar: task assigner */}
          <div className="panel-card">
            <div className="panel-card-title gold">Assign Task (Hierarchical)</div>
            <form onSubmit={handleCreateTask}>
              <div className="form-group">
                <label>Task Title</label>
                <input type="text" required value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea rows="3" value={taskForm.description} onChange={e => setTaskForm({...taskForm, description: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Linked Project</label>
                <select required value={taskForm.project_id} onChange={e => setTaskForm({...taskForm, project_id: e.target.value})}>
                  <option value="">Select project...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Assignee Staff</label>
                <select required value={taskForm.assignee_id} onChange={e => setTaskForm({...taskForm, assignee_id: e.target.value})}>
                  <option value="">Select assignee...</option>
                  {users.filter(u => u.role !== 'ClientPortal').map(u => <option key={u.id} value={u.id}>{u.name} ({u.designation})</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Priority</label>
                  <select value={taskForm.priority} onChange={e => setTaskForm({...taskForm, priority: e.target.value})}>
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                    <option>Critical</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Department Type</label>
                  <select value={taskForm.type} onChange={e => setTaskForm({...taskForm, type: e.target.value})}>
                    <option value="Delivery">Development</option>
                    <option value="Sales">Sales</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Learning">Learning</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Due Date</label>
                <input type="date" required value={taskForm.due_date} onChange={e => setTaskForm({...taskForm, due_date: e.target.value})} />
              </div>
              <button className="btn gold" style={{ width: '100%' }}>Create &amp; Assign</button>
            </form>
          </div>
        </div>
      )}

      {/* --- LIST VIEW --- */}
      {viewMode === 'list' && (
        <div className="panel-card">
          <div className="crm-table-wrapper">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Task Title</th>
                  <th>Project Name</th>
                  <th>Assignee</th>
                  <th>Priority</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeTasks.map(t => (
                  <tr key={t.id}>
                    <td>{t.title}</td>
                    <td>{t.project_name || 'General Operations'}</td>
                    <td>{t.assignee_name || 'Unassigned'}</td>
                    <td><span className={`badge ${t.priority === 'High' || t.priority === 'Critical' ? 'danger' : 'info'}`}>{t.priority}</span></td>
                    <td className="mono">{t.due_date || '—'}</td>
                    <td><span className={`badge ${t.status === 'Done' ? 'success' : 'warning'}`}>{t.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          className="btn secondary" 
                          style={{ padding: '4px 6px', fontSize: '11px' }} 
                          onClick={() => setEditingTask(t)}
                        >
                          <Edit size={12} />
                        </button>
                        <button 
                          className="btn danger" 
                          style={{ padding: '4px 6px', fontSize: '11px' }} 
                          onClick={() => handleDeleteTask(t.id)}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- APPROVALS QUEUE --- */}
      {viewMode === 'approvals' && (
        <div className="panel-card">
          <div className="panel-card-title">Pending Draft Tasks Approvals Queue</div>
          <p style={{ color: 'var(--text-muted)', fontSize: '12.5px', marginBottom: '15px' }}>
            These tasks were auto-generated from Timeline Phases in the client's SOW contract. Verify owners and scopes before approving them.
          </p>

          <div className="crm-table-wrapper">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Draft Task Title</th>
                  <th>Detail Scope</th>
                  <th>Suggest Owner</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingTasks.map(t => (
                  <tr key={t.id}>
                    <td>{t.title}</td>
                    <td>{t.description}</td>
                    <td>{t.assignee_name}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button className="btn primary" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => handleApproveTask(t.id)}>
                          Approve
                        </button>
                        <button className="btn secondary" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => setEditingTask(t)}>
                          Edit
                        </button>
                        <button className="btn danger" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => handleDeleteTask(t.id)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {pendingTasks.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '20px 0' }}>No pending tasks in approval queue.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EDIT TASK MODAL */}
      {editingTask && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '450px' }}>
            <div className="modal-title">Edit Task: {editingTask.title}</div>
            <form onSubmit={handleEditTaskSubmit}>
              <div className="form-group">
                <label>Task Title</label>
                <input 
                  type="text" 
                  required 
                  value={editingTask.title} 
                  onChange={e => setEditingTask({...editingTask, title: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea 
                  rows="3" 
                  value={editingTask.description || ''} 
                  onChange={e => setEditingTask({...editingTask, description: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label>Linked Project</label>
                <select 
                  required 
                  value={editingTask.project_id || ''} 
                  onChange={e => setEditingTask({...editingTask, project_id: e.target.value})}
                >
                  <option value="">Select project...</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Assignee Staff</label>
                <select 
                  required 
                  value={editingTask.assignee_id || ''} 
                  onChange={e => setEditingTask({...editingTask, assignee_id: e.target.value})}
                >
                  <option value="">Select assignee...</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.designation})</option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Priority</label>
                  <select 
                    value={editingTask.priority || 'Medium'} 
                    onChange={e => setEditingTask({...editingTask, priority: e.target.value})}
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                    <option>Critical</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Department Type</label>
                  <select 
                    value={editingTask.type || 'Delivery'} 
                    onChange={e => setEditingTask({...editingTask, type: e.target.value})}
                  >
                    <option value="Delivery">Development</option>
                    <option value="Sales">Sales</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Learning">Learning</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Status</label>
                  <select 
                    value={editingTask.status || 'To Do'} 
                    onChange={e => setEditingTask({...editingTask, status: e.target.value})}
                  >
                    <option>To Do</option>
                    <option>In Progress</option>
                    <option>Blocked</option>
                    <option>Done</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Due Date</label>
                  <input 
                    type="date" 
                    required 
                    value={editingTask.due_date || ''} 
                    onChange={e => setEditingTask({...editingTask, due_date: e.target.value})} 
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn secondary" onClick={() => setEditingTask(null)}>Cancel</button>
                <button className="btn primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
