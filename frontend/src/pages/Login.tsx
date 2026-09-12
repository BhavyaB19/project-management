import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import type { Role } from '../types/index.ts';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'DEVELOPER' as Role,
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError('');
  };

  const fillDemoAccount = (email: string, role: Role) => {
    setIsSignUp(false);
    setFormData({
      name: '',
      email,
      password: 'Password123!',
      confirmPassword: '',
      role,
    });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.password) {
      setError('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);

    if (isSignUp) {
      if (!formData.name.trim()) {
        setError('Please enter your full name.');
        setIsSubmitting(false);
        return;
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters long.');
        setIsSubmitting(false);
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match.');
        setIsSubmitting(false);
        return;
      }

      try {
        await register({
          email: formData.email.trim(),
          password: formData.password,
          name: formData.name.trim(),
          role: formData.role,
        });
        navigate('/dashboard');
      } catch (err: any) {
        console.error('[Register error]:', err);
        const errorMsg =
          err.response?.data?.error?.message ||
          err.response?.data?.message ||
          (err.code === 'ERR_NETWORK' || !err.response
            ? 'Cannot connect to backend server at http://localhost:3000. Please ensure your backend is running (run "npm run dev" in the backend directory).'
            : 'Registration failed.');
        setError(errorMsg);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      try {
        await login({
          email: formData.email.trim(),
          password: formData.password,
        });
        navigate('/dashboard');
      } catch (err: any) {
        console.error('[Login error]:', err);
        const errorMsg =
          err.response?.data?.error?.message ||
          err.response?.data?.message ||
          (err.code === 'ERR_NETWORK' || !err.response
            ? 'Cannot connect to backend server at http://localhost:3000. Please ensure your backend is running (run "npm run dev" in the backend directory).'
            : 'Invalid email or password.');
        setError(errorMsg);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans text-slate-800">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-md mx-auto mb-3">
          V
        </div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          Project Management Portal
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          {isSignUp
            ? 'Create your employee account'
            : 'Sign in with your organizational credentials'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 sm:rounded-xl sm:px-10">
          {/* Tab Selection */}
          <div className="flex border-b border-slate-200 mb-6">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false);
                setError('');
              }}
              className={`flex-1 py-2 text-sm font-semibold text-center border-b-2 transition-colors cursor-pointer ${
                !isSignUp
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(true);
                setError('');
              }}
              className={`flex-1 py-2 text-sm font-semibold text-center border-b-2 transition-colors cursor-pointer ${
                isSignUp
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Sign Up
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg leading-relaxed">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required={isSignUp}
                    placeholder="Jane Developer"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Role / Department <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 cursor-pointer"
                  >
                    <option value="DEVELOPER">Developer</option>
                    <option value="PROJECT_MANAGER">Project Manager</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Work Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="name@velozity.com"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
              />
            </div>

            {isSignUp && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required={isSignUp}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                />
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-50 transition-colors"
              >
                {isSubmitting
                  ? 'Processing...'
                  : isSignUp
                  ? 'Create Account'
                  : 'Sign In'}
              </button>
            </div>
          </form>

          {/* Seed Demo Accounts Shortcut */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 text-center">
              Quick-Fill Seeded Accounts
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillDemoAccount('admin@velozity.com', 'ADMIN')}
                className="px-2 py-1.5 rounded-lg border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-medium transition-colors text-center cursor-pointer"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount('pm1@velozity.com', 'PROJECT_MANAGER')}
                className="px-2 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-medium transition-colors text-center cursor-pointer"
              >
                PM
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount('dev1@velozity.com', 'DEVELOPER')}
                className="px-2 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-medium transition-colors text-center cursor-pointer"
              >
                Developer
              </button>
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-2">
              Password is <span className="font-mono font-medium text-slate-600">Password123!</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;