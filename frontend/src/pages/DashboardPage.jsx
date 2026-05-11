import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { projectsAPI, tasksAPI } from '../api';
import { Plus, Calendar, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { CreateProjectModal } from '../components/CreateProjectModal';
import { Link } from 'react-router-dom';

const demoProjects = [
  {
    id: 1,
    name: 'Q2 Product Launch',
    description: 'Launch assets, timeline, and final release prep',
    created_at: new Date().toISOString()
  }
];

const demoTasks = [
  { id: 1, title: 'Prepare launch timeline', project_name: 'Q2 Product Launch', status: 'done', due_date: new Date().toISOString() },
  { id: 2, title: 'Design campaign assets', project_name: 'Q2 Product Launch', status: 'in_progress', due_date: new Date().toISOString() },
  { id: 3, title: 'Review landing page copy', project_name: 'Q2 Product Launch', status: 'todo', due_date: new Date().toISOString() }
];

export function DashboardPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [projectsRes, tasksRes] = await Promise.all([
          projectsAPI.getAll(),
          tasksAPI.getMyTasks()
        ]);
        
        setProjects(projectsRes.data.projects || []);
        setMyTasks(tasksRes.data.tasks || []);
        setStats(tasksRes.data);
      } catch (err) {
        setError('Showing demo data because the database is offline');
        setProjects(demoProjects);
        setMyTasks(demoTasks);
        setStats({ overdue_count: 1 });
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleProjectCreated = () => {
    setShowCreateProject(false);
    // Reload projects
    projectsAPI.getAll().then(res => setProjects(res.data.projects || [])).catch(console.error);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Member Dashboard</h1>
            <p className="text-gray-600">Welcome, {user?.name}</p>
          </div>
          <button
            onClick={() => setShowCreateProject(true)}
            className="flex gap-2 items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
          >
            <Plus size={20} />
            New Project
          </button>
        </div>
      </header>

      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-2">
          <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">My Tasks</p>
                <p className="text-3xl font-bold text-gray-900">{myTasks.length}</p>
              </div>
              <Clock className="text-blue-500" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Completed</p>
                <p className="text-3xl font-bold text-gray-900">{myTasks.filter(t => t.status === 'done').length}</p>
              </div>
              <CheckCircle className="text-green-500" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Overdue</p>
                <p className="text-3xl font-bold text-red-600">{stats?.overdue_count || 0}</p>
              </div>
              <AlertCircle className="text-red-500" size={32} />
            </div>
          </div>
        </div>

        {/* Projects Grid */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Projects</h2>
          {projects.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-600 mb-4">No projects yet</p>
              <button
                onClick={() => setShowCreateProject(true)}
                className="inline-flex gap-2 items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
              >
                <Plus size={20} />
                Create Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map(project => (
                <Link key={project.id} to={`/projects/${project.id}`} className="block">
                  <div className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 cursor-pointer h-full">
                    <h3 className="font-semibold text-lg text-gray-900 mb-2">{project.name}</h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{project.description || 'No description'}</p>
                    <div className="text-xs text-gray-500">
                      Created {new Date(project.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* My Tasks */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">My Tasks</h2>
          {myTasks.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-600">No tasks assigned to you</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Task</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {myTasks.map(task => (
                      <tr key={task.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">{task.title}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{task.project_name}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            task.status === 'done' ? 'bg-green-100 text-green-800' :
                            task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {task.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {showCreateProject && (
        <CreateProjectModal onClose={() => setShowCreateProject(false)} onCreated={handleProjectCreated} />
      )}
    </div>
  );
}
