import React, { useState, useEffect } from 'react';
import { 
  FolderGit2, 
  ListTodo, 
  BarChart4, 
  Bug, 
  MessageSquare, 
  Clock, 
  Pin,
  Send,
  CalendarDays,
  Plus
} from 'lucide-react';

export default function DevelopmentModule({ user, showToast, triggerAddProject }) {
  const [activeTab, setActiveTab] = useState('projects');
  
  // States
  const [projects, setProjects] = useState([]);
  const [selectedProj, setSelectedProj] = useState(null);
  
  // Sub-tab specific states
  const [tasks, setTasks] = useState([]); // deliverables
  const [messages, setMessages] = useState([]); // chat
  const [newMsg, setNewMsg] = useState('');
  const [issues, setIssues] = useState([]);
  const [activityFeed, setActivityFeed] = useState([]);

  // Form states
  const [issueForm, setIssueForm] = useState({ title: '', severity: 'Medium', description: '' });

  const headers = {
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  };

  useEffect(() => {
    fetch('/api/projects', { headers })
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        setProjects(data);
        if (data.length > 0) {
          setSelectedProj(data[0]);
        }
      });
  }, []);

  useEffect(() => {
    if (!selectedProj) return;
    loadProjectDetails();
  }, [selectedProj]);

  const loadProjectDetails = () => {
    const pId = selectedProj.id;
    // Load deliverables and bugs
    fetch('/api/tasks', { headers })
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        const projTasks = data.filter(t => t.project_id === pId);
        setTasks(projTasks.filter(t => t.type !== 'Bug'));
        setIssues(projTasks.filter(t => t.type === 'Bug'));
        
        // Load project messages
        fetch(`/api/messages/${pId}`, { headers })
          .then(res => res.ok ? res.json() : [])
          .then(msgs => {
            setMessages(msgs);
            
            // Build dynamic project activity audit feed
            const feed = [];
            if (selectedProj.start_date) {
              feed.push({
                id: 'start',
                text: `Project initialized and started on ${selectedProj.start_date}`,
                time: selectedProj.start_date + ' 09:00'
              });
            }
            
            // Add tasks status updates to feed
            projTasks.forEach(t => {
              feed.push({
                id: `task-${t.id}-${t.status}`,
                text: `Task "${t.title}" status is now "${t.status}" (Assigned: ${t.assignee_name || 'Unassigned'})`,
                time: t.due_date ? t.due_date + ' 12:00' : selectedProj.start_date + ' 12:00'
              });
            });

            // Add messages to feed
            msgs.forEach(m => {
              feed.push({
                id: `msg-${m.id}`,
                text: `${m.sender_name} posted a message: "${m.body.length > 50 ? m.body.substring(0, 50) + '...' : m.body}"`,
                time: m.created_at
              });
            });

            // Sort newest first
            feed.sort((a, b) => new Date(b.time) - new Date(a.time));
            setActivityFeed(feed.slice(0, 8));
          });
      });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMsg.trim() || !selectedProj) return;

    fetch(`/api/messages/${selectedProj.id}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ body: newMsg })
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) showToast(data.error, 'error');
        else {
          setNewMsg('');
          loadProjectDetails();
        }
      });
  };

  const handlePinMessage = (msgId, isPinned) => {
    fetch(`/api/messages/${msgId}/pin`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ pinned: !isPinned })
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) showToast(data.error, 'error');
        else {
          showToast(isPinned ? 'Message unpinned' : 'Message pinned to discussion');
          loadProjectDetails();
        }
      });
  };

  const handleScheduleInlineMeeting = () => {
    if (!selectedProj) return;
    
    // Auto-book a weekly group call for tomorrow 10:00 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    fetch('/api/meetings', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: `Weekly Status Call — ${selectedProj.name}`,
        datetime: tomorrow.toISOString().replace('Z', ''),
        duration: 30,
        recurrence: 'weekly',
        meeting_type: 'status',
        notes: `Auto-scheduled status sync meeting for ${selectedProj.name}.`,
        linked_project_id: selectedProj.id
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) showToast(data.error, 'error');
        else {
          showToast('Weekly Sync Meeting scheduled at 10:00 AM');
          loadProjectDetails();
        }
      });
  };

  const handleIssueSubmit = (e) => {
    e.preventDefault();
    fetch('/api/tasks', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: issueForm.title,
        description: issueForm.description,
        project_id: selectedProj.id,
        priority: issueForm.severity,
        type: 'Bug',
        approved: 1,
        status: 'To Do'
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) showToast(data.error, 'error');
        else {
          showToast('Bug / Issue logged successfully');
          loadProjectDetails();
          setIssueForm({ title: '', severity: 'Medium', description: '' });
        }
      });
  };

  const handleResolveIssue = (issueId) => {
    const issueObj = issues.find(i => i.id === issueId);
    if (!issueObj) return;

    fetch(`/api/tasks/${issueId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        ...issueObj,
        status: 'Done'
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) showToast(data.error, 'error');
        else {
          showToast('Issue marked as resolved');
          loadProjectDetails();
        }
      });
  };

  return (
    <div className="crm-page-container" style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '25px', padding: '20px' }}>
      
      {/* LEFT PROJECT LIST COLUMN */}
      <div style={{ borderRight: '1px solid var(--border-color)', paddingRight: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0, letterSpacing: '0.5px' }}>Projects</h3>
          {user.role !== 'ClientPortal' && (
            <button className="btn primary" style={{ padding: '4px 8px', fontSize: '10px', display: 'inline-flex', alignItems: 'center', gap: '2px' }} onClick={triggerAddProject}>
              <Plus size={10} /> Add
            </button>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {projects.map(p => (
            <div
              key={p.id}
              onClick={() => setSelectedProj(p)}
              style={{
                padding: '12px 14px',
                borderRadius: '6px',
                backgroundColor: selectedProj?.id === p.id ? 'var(--lime-soft)' : 'var(--bg-card)',
                border: `1px solid ${selectedProj?.id === p.id ? 'var(--lime-bright)' : 'var(--border-color)'}`,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '13px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={p.name}>
                {p.name}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Progress: {p.progress_percent}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT DETAILED WORKSPACE VIEW */}
      <div>
        {selectedProj ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800 }}>{selectedProj.name}</h2>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Client: {selectedProj.client_company} ({selectedProj.client_name}) · Target Go-Live: {selectedProj.target_go_live}
                </div>
              </div>
              <span className="badge success">{selectedProj.status}</span>
            </div>

            <div className="crm-tabs">
              <button className={`tab-btn ${activeTab === 'projects' ? 'active' : ''}`} onClick={() => setActiveTab('projects')}><FolderGit2 size={14} /> Scope Info</button>
              <button className={`tab-btn ${activeTab === 'tasks' ? 'active' : ''}`} onClick={() => setActiveTab('tasks')}><ListTodo size={14} /> Deliverables</button>
              <button className={`tab-btn ${activeTab === 'gantt' ? 'active' : ''}`} onClick={() => setActiveTab('gantt')}><BarChart4 size={14} /> Timeline</button>
              <button className={`tab-btn ${activeTab === 'bugs' ? 'active' : ''}`} onClick={() => setActiveTab('bugs')}><Bug size={14} /> Issue Tracker</button>
              <button className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}><MessageSquare size={14} /> Team Chat</button>
            </div>

            {/* --- SUBTAB: SCOPE INFO --- */}
            {activeTab === 'projects' && (
              <div className="dashboard-row">
                <div className="panel-card">
                  <div className="panel-card-title">Project Context &amp; Details</div>
                  <div style={{ fontSize: '13.5px', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div><strong>Project Name:</strong> {selectedProj.name}</div>
                    <div><strong>Current Phase:</strong> {selectedProj.current_phase || 'Phase 1: Procurement'}</div>
                    <div><strong>Lead Dev Staffed:</strong> {selectedProj.lead_dev_name || 'Arun Dev'}</div>
                    <div><strong>Project Manager:</strong> {selectedProj.pm_name || 'Karthik PM'}</div>
                    <div style={{ borderBottom: '1px solid var(--border-color)', margin: '10px 0' }}></div>
                    <div><strong>Brief Details:</strong></div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                      Deployment of conversational AI, review reply systems, and structured scraping pipelines as defined in SOW.
                    </p>
                  </div>
                </div>

                <div className="panel-card">
                  <div className="panel-card-title gold">Activity Feed (Audit Trail)</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {activityFeed.map(feed => (
                      <div key={feed.id} style={{ display: 'flex', gap: '10px' }}>
                        <Clock size={14} style={{ color: 'var(--gold-bright)', marginTop: '3px', flexShrink: 0 }} />
                        <div style={{ fontSize: '12px' }}>
                          <div>{feed.text}</div>
                          <span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>{feed.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* --- SUBTAB: DELIVERABLES --- */}
            {activeTab === 'tasks' && (
              <div className="panel-card">
                <div className="panel-card-title">Project Deliverables Status</div>
                <div className="crm-table-wrapper">
                  <table className="crm-table">
                    <thead>
                      <tr>
                        <th>Deliverable Title</th>
                        <th>Assigned Staff</th>
                        <th>Priority</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.map(t => (
                        <tr key={t.id}>
                          <td>{t.title}</td>
                          <td>{t.assignee_name || 'Unassigned'}</td>
                          <td><span className={`badge ${t.priority === 'High' ? 'danger' : 'info'}`}>{t.priority}</span></td>
                          <td>
                            <span className={`badge ${t.status === 'Done' ? 'success' : t.status === 'In Progress' ? 'warning' : 'info'}`}>
                              {t.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {tasks.length === 0 && (
                        <tr>
                          <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-dim)' }}>No deliverables synced for this project.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* --- SUBTAB: GANTT CHART --- */}
            {activeTab === 'gantt' && (
              <div className="gantt-chart">
                <div className="panel-card-title" style={{ border: 'none', margin: 0 }}>Project Implementation Timeline</div>
                
                <div className="gantt-row">
                  <span className="gantt-row-title">Phase 1: Onboarding &amp; Twilio</span>
                  <div className="gantt-bar-container">
                    <div className="gantt-bar done" style={{ left: '0%', width: '35%' }}>Week 1–2 (Complete)</div>
                  </div>
                </div>

                <div className="gantt-row">
                  <span className="gantt-row-title">Phase 2: Conversation Logic</span>
                  <div className="gantt-bar-container">
                    <div className="gantt-bar" style={{ left: '35%', width: '40%' }}>Week 3–4 (In Progress)</div>
                  </div>
                </div>

                <div className="gantt-row">
                  <span className="gantt-row-title">Phase 3: Integration &amp; Live UAT</span>
                  <div className="gantt-bar-container">
                    <div className="gantt-bar blocked" style={{ left: '75%', width: '25%' }}>Week 5 (Blocked)</div>
                  </div>
                </div>
              </div>
            )}

            {/* --- SUBTAB: BUGS/ISSUES --- */}
            {activeTab === 'bugs' && (
              <div className="dashboard-row">
                <div className="panel-card">
                  <div className="panel-card-title">Active Issues Board</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {issues.map(iss => (
                      <div key={iss.id} style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '14px', backgroundColor: 'var(--bg-card-alt)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <h4 style={{ fontWeight: 600 }}>{iss.title}</h4>
                          <span className={`badge ${iss.priority === 'Critical' ? 'danger' : iss.priority === 'High' ? 'danger' : 'warning'}`}>{iss.priority}</span>
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.45', marginBottom: '10px' }}>{iss.description}</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: 'var(--text-dim)' }}>
                          <span>Reported by: {iss.assigner_name || 'System'}</span>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span>Status: <span style={{ color: iss.status === 'Done' ? 'var(--lime-bright)' : 'var(--alert)', fontWeight: 600 }}>{iss.status === 'Done' ? 'Resolved' : 'Active'}</span></span>
                            {iss.status !== 'Done' && (
                              <button 
                                className="btn primary" 
                                style={{ padding: '2px 6px', fontSize: '9px' }} 
                                onClick={() => handleResolveIssue(iss.id)}
                              >
                                Resolve
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {issues.length === 0 && (
                      <div style={{ padding: '20px 0', color: 'var(--text-dim)', textAlign: 'center', fontSize: '12.5px' }}>
                        No issues reported for this project.
                      </div>
                    )}
                  </div>
                </div>

                <div className="panel-card">
                  <div className="panel-card-title gold">Log Issue / Bug</div>
                  <form onSubmit={handleIssueSubmit}>
                    <div className="form-group">
                      <label>Issue Title</label>
                      <input type="text" required value={issueForm.title} onChange={e => setIssueForm({...issueForm, title: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label>Severity</label>
                      <select value={issueForm.severity} onChange={e => setIssueForm({...issueForm, severity: e.target.value})}>
                        <option>Low</option>
                        <option>Medium</option>
                        <option>High</option>
                        <option>Critical</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Description &amp; Steps to Reproduce</label>
                      <textarea required rows="4" value={issueForm.description} onChange={e => setIssueForm({...issueForm, description: e.target.value})} />
                    </div>
                    <button className="btn gold" style={{ width: '100%' }}>Submit Issue</button>
                  </form>
                </div>
              </div>
            )}

            {/* --- SUBTAB: CHAT MODULE --- */}
            {activeTab === 'chat' && (
              <div className="chat-container">
                <div className="chat-header">
                  <div>
                    <h3># {selectedProj.name} Chat Channel</h3>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Staffed Members Discussion Board</span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn secondary" style={{ padding: '6px 12px', fontSize: '11.5px' }} onClick={handleScheduleInlineMeeting}>
                      <CalendarDays size={14} /> Schedule Status Meeting
                    </button>
                  </div>
                </div>

                {/* Pin Message banner if pinned message exists */}
                {messages.some(m => m.pinned === 1) && (
                  <div className="chat-pinned-box">
                    <Pin size={14} style={{ transform: 'rotate(45deg)' }} />
                    <div style={{ flex: 1 }}>
                      <strong>Pinned message:</strong> {messages.find(m => m.pinned === 1).body}
                    </div>
                  </div>
                )}

                <div className="chat-message-list">
                  {messages.map(msg => (
                    <div key={msg.id} className={`chat-msg ${msg.sender_id === user.id ? 'self' : ''}`}>
                      <div className="chat-msg-sender">
                        <span>{msg.sender_name}</span>
                        <span className="desig">{msg.sender_designation}</span>
                      </div>
                      <div className="chat-msg-bubble">
                        {msg.body}
                        <button 
                          style={{ background: 'none', border: 'none', color: msg.pinned ? 'var(--gold-bright)' : 'var(--text-dim)', cursor: 'pointer', float: 'right', marginLeft: '10px', marginTop: '2px' }}
                          onClick={() => handlePinMessage(msg.id, msg.pinned === 1)}
                        >
                          <Pin size={10} style={{ transform: 'rotate(45deg)' }} />
                        </button>
                      </div>
                      <span className="chat-msg-time">
                        {new Date(msg.created_at || Date.now()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSendMessage} className="chat-input-bar">
                  <input 
                    type="text" 
                    required 
                    placeholder="Type message or paste meeting notes..."
                    value={newMsg}
                    onChange={e => setNewMsg(e.target.value)}
                  />
                  <button className="btn primary"><Send size={14} /> Send</button>
                </form>
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text-dim)' }}>
            Select an active project on the left to start.
          </div>
        )}
      </div>
    </div>
  );
}
