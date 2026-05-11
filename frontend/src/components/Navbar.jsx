import React from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, Home } from 'lucide-react';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <button
            onClick={() => navigate(user?.role === 'admin' ? '/admin' : '/dashboard')}
            className="flex items-center gap-2 text-gray-900 hover:text-gray-700 font-semibold text-xl"
          >
            <Home size={24} />
            Task Manager
          </button>
          <div className="flex items-center gap-4">
            <span className="text-gray-700">
              {user?.name}
              {user?.role ? ` • ${user.role}` : ''}
            </span>
            {user?.role === 'admin' && (
              <button
                onClick={() => navigate('/admin')}
                className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-blue-700 transition hover:bg-blue-100"
              >
                Admin Portal
              </button>
            )}
            {user?.role !== 'admin' && (
              <button
                onClick={() => navigate('/dashboard')}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-slate-700 transition hover:bg-slate-50"
              >
                Member Portal
              </button>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
            >
              <LogOut size={20} />
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
