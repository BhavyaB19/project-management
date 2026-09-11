import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'DEVELOPER',
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (isSignUp) {
      if (!formData.name.trim()) {
        setError('Please enter your full name.');
        return;
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match.');
        return;
      }

      try {
        const { data } = await axios.post('http://localhost:3000/api/auth/register', {
          email: formData.email.trim(),
          password: formData.password,
          name: formData.name.trim(),
          role: formData.role,
        }, { withCredentials: true });

        localStorage.setItem('token', data.data.accessToken);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        navigate('/dashboard');
      } catch (err) {
        setError(err.response?.data?.message || 'Registration failed.');
      }
    } else {
      try {
        const { data } = await axios.post('http://localhost:3000/api/auth/login', {
          email: formData.email.trim(),
          password: formData.password,
        }, { withCredentials: true });

        localStorage.setItem('token', data.data.accessToken);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        navigate('/dashboard');
      } catch (err) {
        setError(err.response?.data?.message || 'Invalid email or password.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans text-slate-800">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          Project Management Portal
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          {isSignUp ? 'Create your employee account' : 'Sign in with your organizational credentials'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 sm:rounded-lg sm:px-10">
          {/* Tab Selection */}
          <div className="flex border-b border-slate-200 mb-6">
            <button
              type="button"
              onClick={() => { setIsSignUp(false); setError(''); }}
              className={`flex-1 py-2 text-sm font-semibold text-center border-b-2 transition-colors ${
                !isSignUp
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsSignUp(true); setError(''); }}
              className={`flex-1 py-2 text-sm font-semibold text-center border-b-2 transition-colors ${
                isSignUp
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Sign Up
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
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
                    placeholder="John Doe"
                    className="w-full px-3 py-2 border border-slate-300 rounded bg-white text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
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
                    className="w-full px-3 py-2 border border-slate-300 rounded bg-white text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
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
                placeholder="name@company.com"
                className="w-full px-3 py-2 border border-slate-300 rounded bg-white text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
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
                className="w-full px-3 py-2 border border-slate-300 rounded bg-white text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
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
                  className="w-full px-3 py-2 border border-slate-300 rounded bg-white text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer"
              >
                {isSignUp ? 'Create Account' : 'Sign In'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center text-xs text-slate-600 border-t border-slate-100 pt-4">
            {isSignUp ? (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setIsSignUp(false); setError(''); }}
                  className="font-medium text-blue-600 hover:underline inline-block"
                >
                  Sign in here
                </button>
              </p>
            ) : (
              <p>
                Need a new account?{' '}
                <button
                  type="button"
                  onClick={() => { setIsSignUp(true); setError(''); }}
                  className="font-medium text-blue-600 hover:underline inline-block"
                >
                  Register here
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;