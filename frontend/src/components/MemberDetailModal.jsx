import React, { useState, useEffect } from 'react';
import { tasksAPI, projectsAPI, usersAPI } from '../api';
import { X, Plus, Trash2, Edit2, Calendar } from 'lucide-react';

export function MemberDetailModal({ member, onClose, onUpdated }) {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
    projectId: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');
        const [tasksRes, projectsRes, usersRes] = await Promise.all([
          tasksAPI.getAll(),
          projectsAPI.getAll(),
          usersAPI.getAll()
        ]);

        // Filter tasks assigned to this member - only TODO and IN_PROGRESS
        const memberTasks = (tasksRes.data.tasks || []).filter(
          t => t.assigned_to === member.id && (t.status === 'todo' || t.status === 'in_progress')
        );
        setTasks(memberTasks);
        setProjects(projectsRes.data.projects || []);
        setUsers(usersRes.data.users || []);
      } catch (err) {
        setError('Failed to load member details');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [member.id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!formData.projectId) {
      setError('Please select a project');
      return;
    }

    setSubmitting(true);
    try {
      await tasksAPI.create({
        title: formData.title,
        description: formData.description,
        projectId: parseInt(formData.projectId),
        priority: formData.priority,
        dueDate: formData.dueDate || null,
        assignedTo: member.id
      });

      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        dueDate: '',
        projectId: ''
      });
      setShowCreateTask(false);

      // Reload tasks
      const tasksRes = await tasksAPI.getAll();
      const memberTasks = (tasksRes.data.tasks || []).filter(
        t => t.assigned_to === member.id && (t.status === 'todo' || t.status === 'in_progress')
      );
      setTasks(memberTasks);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTask = async (taskId, updates) => {
    try {
      await tasksAPI.update(taskId, updates);
      // Reload tasks
      const tasksRes = await tasksAPI.getAll();
      const memberTasks = (tasksRes.data.tasks || []).filter(
        t => t.assigned_to === member.id && (t.status === 'todo' || t.status === 'in_progress')
      );
      setTasks(memberTasks);
    } catch (err) {
      setError('Failed to update task');
      console.error(err);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    try {
      await tasksAPI.delete(taskId);
      setTasks(tasks.filter(t => t.id !== taskId));
    } catch (err) {
      setError('Failed to delete task');
      console.error(err);
    }
  };

  const handleRemoveFromProject = async (projectId) => {
    if (!window.confirm('Remove this member from the project?')) return;

    try {
      await projectsAPI.removeMember(projectId, member.id);
      setProjects(projects.filter(p => p.id !== projectId));
    } catch (err) {
      setError('Failed to remove member from project');
      console.error(err);
    }
  };

  const memberProjects = projects.filter(p => {
    // Check if member is in this project (simplified check)
    return true; // In real app, would check project members
  });

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
          <div className="flex items-center justify-center h-96">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl my-8">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-200 sticky top-0 bg-white">
          <div>
            <h2 className="text-2xl font-bold text-slate-950">{member.name}</h2>
            <p className="text-sm text-slate-500">{member.email}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[calc(90vh-180px)] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Member Tasks Section */}
          <section>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-950">Active Tasks (To Do & In Progress)</h3>
              <button
                onClick={() => setShowCreateTask(!showCreateTask)}
                className="flex gap-2 items-center px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition"
              >
                <Plus size={16} />
                Add Task
              </button>
            </div>

            {/* Create Task Form */}
            {showCreateTask && (
              <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <form onSubmit={handleCreateTask} className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Project</label>
                    <select
                      name="projectId"
                      value={formData.projectId}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value="">Select a project</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Task Title</label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="Enter task title"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      rows={2}
                      placeholder="Enter task description"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                      <select
                        name="priority"
                        value={formData.priority}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                      <input
                        type="date"
                        name="dueDate"
                        value={formData.dueDate}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateTask(false)}
                      className="flex-1 px-3 py-2 text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-lg text-sm transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition disabled:opacity-50"
                    >
                      {submitting ? 'Creating...' : 'Create Task'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Tasks List */}
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <p>No active tasks assigned to this member</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map(task => (
                  <div key={task.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-950">{task.title}</h4>
                        {task.description && (
                          <p className="text-sm text-slate-600 mt-1">{task.description}</p>
                        )}
                      </div>
                      {task.status !== 'done' && (
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="text-slate-400 hover:text-red-600 transition ml-2"
                          title="Delete task"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 items-center text-sm">
                      {task.due_date && (
                        <div className="flex gap-1 items-center text-slate-600">
                          <Calendar size={14} />
                          {new Date(task.due_date).toLocaleDateString()}
                        </div>
                      )}

                      <select
                        value={task.status}
                        onChange={(e) => handleUpdateTask(task.id, { status: e.target.value })}
                        className={`px-2 py-1 rounded text-xs font-semibold cursor-pointer border-0 ${
                          task.status === 'todo' ? 'bg-gray-100 text-gray-800' :
                          task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}
                      >
                        <option value="todo">To Do</option>
                        <option value="in_progress">In Progress</option>
                        <option value="done">Done</option>
                      </select>

                      {task.priority && (
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          task.priority === 'high' ? 'bg-red-100 text-red-800' :
                          task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Project Membership Section */}
          <section>
            <h3 className="text-lg font-semibold text-slate-950 mb-4">Project Assignments</h3>
            {projects.length === 0 ? (
              <div className="text-center py-6 text-slate-500">
                <p>Member not assigned to any projects</p>
              </div>
            ) : (
              <div className="space-y-2">
                {projects.map(project => (
                  <div key={project.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div>
                      <p className="font-medium text-slate-950">{project.name}</p>
                      <p className="text-sm text-slate-500">{project.description || 'No description'}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveFromProject(project.id)}
                      className="text-red-600 hover:text-red-700 transition"
                      title="Remove from project"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 bg-slate-50 sticky bottom-0">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-950 rounded-lg font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
