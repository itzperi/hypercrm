import React, { useState, useEffect } from 'react';
import { BookOpen, GraduationCap, ThumbsUp, Calendar, Edit, Trash2 } from 'lucide-react';

export default function LearningModule({ user, showToast }) {
  const [learningTasks, setLearningTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  
  // Assign Learning Form
  const [learnForm, setLearnForm] = useState({ title: '', description: '', assignee_id: '', due_date: '' });
  
  // Reflection Dialog
  const [selectedTask, setSelectedTask] = useState(null);
  const [reflectionText, setReflectionText] = useState('');

  // Editing state
  const [editingLearningTask, setEditingLearningTask] = useState(null);

  const headers = {
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  };

  const loadData = () => {
    fetch('/api/tasks', { headers })
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        const learnings = list.filter(t => t.type === 'Learning');
        setLearningTasks(learnings);
      });

    fetch('/api/users', { headers })
      .then(res => res.ok ? res.json() : [])
      .then(data => setEmployees(Array.isArray(data) ? data.filter(u => u.role !== 'ClientPortal') : []));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAssignLearning = (e) => {
    e.preventDefault();
    fetch('/api/tasks', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...learnForm,
        type: 'Learning',
        approved: 1
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) showToast(data.error, 'error');
        else {
          showToast('Learning task assigned successfully');
          loadData();
          setLearnForm({ title: '', description: '', assignee_id: '', due_date: '' });
        }
      });
  };

  const handleCompleteLearning = (e) => {
    e.preventDefault();
    if (!selectedTask) return;

    fetch(`/api/tasks/${selectedTask.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        ...selectedTask,
        status: 'Done',
        description: `${selectedTask.description}\n\nReflection Note: ${reflectionText}`
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) showToast(data.error, 'error');
        else {
          showToast('Learning task completed!');
          loadData();
          setSelectedTask(null);
          setReflectionText('');
        }
      });
  };

  const handleDeleteLearningTask = (id) => {
    if (!window.confirm("Are you sure you want to delete this learning task?")) return;
    fetch(`/api/tasks/${id}`, {
      method: 'DELETE',
      headers
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) showToast(data.error, 'error');
        else {
          showToast('Learning task deleted successfully');
          loadData();
        }
      });
  };

  const handleEditLearningTaskSubmit = (e) => {
    e.preventDefault();
    fetch(`/api/tasks/${editingLearningTask.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        ...editingLearningTask,
        type: 'Learning'
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) showToast(data.error, 'error');
        else {
          showToast('Learning task updated successfully');
          setEditingLearningTask(null);
          loadData();
        }
      });
  };

  const isCEO = (user.role === 'SuperAdmin' || user.designation === 'Chief Executive Officer');

  return (
    <div className="crm-page-container">
      <div style={{ marginBottom: '25px' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800 }}>Employee Learning &amp; Skill Development</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px' }}>
          Weekly reading assignments, tutorials, and certification objectives assigned by leadership.
        </p>
      </div>

      <div className="dashboard-row" style={{ gridTemplateColumns: isCEO ? '2fr 1fr' : '1fr' }}>
        
        {/* LEFT COLUMN: Study Tasks */}
        <div>
          <div className="panel-card">
            <div className="panel-card-title">Assigned Reading &amp; Skill Targets</div>
            
            <div className="learning-goals-grid">
              {learningTasks.map(task => (
                <div key={task.id} className="learning-goal-card">
                  <div className="learning-goal-info">
                    <h4 style={{ color: task.status === 'Done' ? 'var(--text-dim)' : 'var(--text-main)', textDecoration: task.status === 'Done' ? 'line-through' : 'none' }}>
                      {task.title}
                    </h4>
                    <p>{task.description}</p>
                    <div style={{ display: 'flex', gap: '15px', fontSize: '10px', color: 'var(--text-dim)', marginTop: '8px' }}>
                      <span>Assignee: <strong style={{ color: 'var(--lime-bright)' }}>{task.assignee_name}</strong></span>
                      <span>Due: {task.due_date}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {task.status === 'Done' ? (
                      <span className="badge success">Completed</span>
                    ) : (
                      <button className="btn primary" onClick={() => {
                        setSelectedTask(task);
                        setReflectionText('');
                      }}>
                        Mark Completed
                      </button>
                    )}
                    {isCEO && (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button 
                          className="btn secondary" 
                          style={{ padding: '4px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center' }}
                          onClick={() => setEditingLearningTask(task)}
                        >
                          <Edit size={12} />
                        </button>
                        <button 
                          className="btn danger" 
                          style={{ padding: '4px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center' }}
                          onClick={() => handleDeleteLearningTask(task.id)}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {learningTasks.length === 0 && (
                <div style={{ padding: '30px 0', color: 'var(--text-dim)', textAlign: 'center' }}>
                  No learning tasks assigned.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Assign Study Task (CEO/CTO only) */}
        {isCEO && (
          <div>
            <div className="panel-card">
              <div className="panel-card-title gold">Assign Learning Target</div>
              <form onSubmit={handleAssignLearning}>
                <div className="form-group">
                  <label>Learning Goal / Reading Title</label>
                  <input type="text" required value={learnForm.title} onChange={e => setLearnForm({...learnForm, title: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Goal Syllabus / Guidelines</label>
                  <textarea rows="4" placeholder="List courses, papers, or documentation guidelines..." value={learnForm.description} onChange={e => setLearnForm({...learnForm, description: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Assignee Employee</label>
                  <select required value={learnForm.assignee_id} onChange={e => setLearnForm({...learnForm, assignee_id: e.target.value})}>
                    <option value="">Select employee...</option>
                    {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} ({emp.designation})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Due Date</label>
                  <input type="date" required value={learnForm.due_date} onChange={e => setLearnForm({...learnForm, due_date: e.target.value})} />
                </div>
                <button className="btn gold" style={{ width: '100%' }}>Assign Target</button>
              </form>
            </div>
          </div>
        )}

      </div>

      {/* --- DIALOG: SUBMIT REFLECTION NOTE --- */}
      {selectedTask && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-title">Complete Goal: {selectedTask.title}</div>
            <form onSubmit={handleCompleteLearning}>
              <div className="form-group">
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: '1.45' }}>
                  Provide a brief summary reflection note or key takeaway points after completing this study module.
                </p>
                <label>Reflection Takeaway Note</label>
                <textarea required rows="5" placeholder="What did you learn from this tutorial?" value={reflectionText} onChange={e => setReflectionText(e.target.value)} />
              </div>
              
              <div className="form-actions">
                <button type="button" className="btn secondary" onClick={() => setSelectedTask(null)}>Cancel</button>
                <button className="btn primary">Submit Reflection &amp; Complete</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT LEARNING TASK MODAL --- */}
      {editingLearningTask && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '450px' }}>
            <div className="modal-title">Edit Learning Target</div>
            <form onSubmit={handleEditLearningTaskSubmit}>
              <div className="form-group">
                <label>Learning Goal / Reading Title</label>
                <input 
                  type="text" 
                  required 
                  value={editingLearningTask.title} 
                  onChange={e => setEditingLearningTask({...editingLearningTask, title: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label>Goal Syllabus / Guidelines</label>
                <textarea 
                  rows="4" 
                  value={editingLearningTask.description} 
                  onChange={e => setEditingLearningTask({...editingLearningTask, description: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label>Assignee Employee</label>
                <select 
                  required 
                  value={editingLearningTask.assignee_id || ''} 
                  onChange={e => setEditingLearningTask({...editingLearningTask, assignee_id: e.target.value})}
                >
                  <option value="">Select employee...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.designation})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Due Date</label>
                <input 
                  type="date" 
                  required 
                  value={editingLearningTask.due_date || ''} 
                  onChange={e => setEditingLearningTask({...editingLearningTask, due_date: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select 
                  value={editingLearningTask.status || 'To Do'} 
                  onChange={e => setEditingLearningTask({...editingLearningTask, status: e.target.value})}
                >
                  <option value="To Do">Pending / To Do</option>
                  <option value="Done">Completed / Done</option>
                </select>
              </div>
              <div className="form-actions">
                <button type="button" className="btn secondary" onClick={() => setEditingLearningTask(null)}>Cancel</button>
                <button className="btn primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
