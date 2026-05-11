import React, { useEffect, useState } from 'react';
import { adminAPI, projectsAPI, usersAPI } from '../api';
import { useAuth } from '../AuthContext';
import { AlertCircle, BarChart3, Briefcase, CheckCircle2, Clock3, Users, Plus } from 'lucide-react';
import { MemberDetailModal } from '../components/MemberDetailModal';
import { AddMemberModal } from '../components/AddMemberModal';

function StatCard({ label, value, icon: Icon, tone }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
        </div>
        <div className={`rounded-2xl p-3 ${tone}`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

export function AdminDashboardPage() {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState(null);
  const [projects, setProjects] = useState([]);
  const [showAddProjectMember, setShowAddProjectMember] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [overviewRes, projectsRes] = await Promise.all([
          adminAPI.getOverview(),
          projectsAPI.getAll()
        ]);
        setOverview(overviewRes.data);
        setProjects(projectsRes.data.projects || []);
      } catch (err) {
        setError('Unable to load admin overview. Make sure PostgreSQL and demo seed data are available.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-lg">Loading admin portal...</div>;
  }

  const summary = overview?.summary || {};
  const users = summary.users || {};
  const summaryProjects = summary.projects || {};
  const tasks = summary.tasks || {};

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-[32px] bg-slate-950 px-6 py-8 text-white shadow-[0_30px_80px_rgba(15,23,42,0.22)]">
          <p className="text-sm uppercase tracking-[0.24em] text-slate-300">Admin Portal</p>
          <h1 className="mt-3 text-4xl font-bold">Welcome, {user?.name}</h1>
          <p className="mt-3 max-w-2xl text-slate-300">
            View team health, monitor task flow, and inspect member performance from one central place.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 shrink-0" size={18} />
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Users" value={users.total_users ?? 0} icon={Users} tone="bg-blue-100 text-blue-700" />
          <StatCard label="Projects" value={projects.total_projects ?? 0} icon={Briefcase} tone="bg-emerald-100 text-emerald-700" />
          <StatCard label="Total Tasks" value={tasks.total_tasks ?? 0} icon={BarChart3} tone="bg-violet-100 text-violet-700" />
          <StatCard label="Overdue" value={tasks.overdue_count ?? 0} icon={Clock3} tone="bg-rose-100 text-rose-700" />
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-950">Team Performance</h2>
                <p className="text-sm text-slate-500">Sample data for admin review</p>
              </div>
              <CheckCircle2 className="text-emerald-600" size={22} />
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="py-3 pr-4 font-medium">Member</th>
                    <th className="py-3 pr-4 font-medium">Assigned</th>
                    <th className="py-3 pr-4 font-medium">Completed</th>
                    <th className="py-3 pr-4 font-medium">In Progress</th>
                    <th className="py-3 pr-4 font-medium">Overdue</th>
                  </tr>
                </thead>
                <tbody>
                  {(overview?.team_performance || []).map((member) => (
                    <tr 
                      key={member.id}
                      onClick={() => setSelectedMember(member)}
                      className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50 cursor-pointer transition"
                    >
                      <td className="py-4 pr-4">
                        <p className="font-semibold text-slate-950 hover:text-blue-600">{member.name}</p>
                        <p className="text-xs text-slate-500">{member.email}</p>
                      </td>
                      <td className="py-4 pr-4">{member.total_assigned}</td>
                      <td className="py-4 pr-4">{member.completed}</td>
                      <td className="py-4 pr-4">{member.in_progress}</td>
                      <td className="py-4 pr-4">{member.overdue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-950">Recent Activity</h2>
                <p className="text-sm text-slate-500">Latest updates across the workspace</p>
              </div>
            </div>
            <div className="space-y-4">
              {(overview?.recent_activity || []).map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
                  <p className="font-semibold text-slate-950">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.project_name}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {item.assigned_to_name || 'Unassigned'} · {item.status.replace('_', ' ')} · {new Date(item.updated_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex justify-between items-center mb-5">
            <div>
              <h2 className="text-xl font-bold text-slate-950">Project Management</h2>
              <p className="text-sm text-slate-500">Manage team members across projects</p>
            </div>
            <button
              onClick={() => {
                setSelectedProjectId(projects[0]?.id || null);
                setShowAddProjectMember(true);
              }}
              className="flex gap-2 items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
            >
              <Plus size={18} />
              Add Member to Project
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p>No projects available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {projects.map(project => (
                <div key={project.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-slate-950">{project.name}</h3>
                      <p className="text-sm text-slate-600">{project.description || 'No description'}</p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedProjectId(project.id);
                        setShowAddProjectMember(true);
                      }}
                      className="flex gap-1 items-center px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition"
                    >
                      <Plus size={14} />
                      Add Member
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Member Detail Modal */}
        {selectedMember && (
          <MemberDetailModal
            member={selectedMember}
            onClose={() => setSelectedMember(null)}
            onUpdated={() => {
              // Reload overview data
              adminAPI.getOverview().then(res => setOverview(res.data)).catch(console.error);
            }}
          />
        )}

        {/* Add Member to Project Modal */}
        {showAddProjectMember && selectedProjectId && (
          <AddMemberModal
            projectId={selectedProjectId}
            onClose={() => {
              setShowAddProjectMember(false);
              setSelectedProjectId(null);
            }}
            onAdded={() => {
              setShowAddProjectMember(false);
              setSelectedProjectId(null);
              // Reload data
              adminAPI.getOverview().then(res => setOverview(res.data)).catch(console.error);
              projectsAPI.getAll().then(res => setProjects(res.data.projects || [])).catch(console.error);
            }}
          />
        )}
      </div>
    </div>
  );
}
