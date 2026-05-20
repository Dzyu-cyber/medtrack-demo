import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const [role, setRole] = useState('doctor'); // 'doctor' or 'patient'
  const [doctorMode, setDoctorMode] = useState('login'); // 'login' or 'register'
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRoleChange = (selectedRole) => {
    setRole(selectedRole);
    setError('');
    setSuccess('');
    setUsername('');
    setPassword('');
    setDoctorMode('login');
  };

  const handleDoctorModeChange = (mode) => {
    setDoctorMode(mode);
    setError('');
    setSuccess('');
    setUsername('');
    setPassword('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

    try {
      if (role === 'doctor' && doctorMode === 'register') {
        // Register Doctor
        const { data } = await axios.post(`${apiUrl}/api/auth/register-doctor`, {
          username: username.trim(),
          password
        });
        if (data.success) {
          setSuccess('Account created successfully! Please sign in.');
          setDoctorMode('login');
          setUsername('');
          setPassword('');
        }
      } else {
        // Login Doctor or Patient
        const { data } = await axios.post(`${apiUrl}/api/auth/login`, {
          username: username.trim(),
          password,
          role
        });
        if (data.success) {
          login(data);
          navigate(role === 'doctor' ? '/doctor' : '/patient', { replace: true });
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Operation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-brand-icon">💊</div>
          <h1>MedTrack</h1>
          <p>Real-time medication monitoring</p>
        </div>

        {/* Role Selection Tabs */}
        <div className="login-tabs">
          <button
            id="tab-doctor"
            className={`login-tab${role === 'doctor' ? ' active' : ''}`}
            onClick={() => handleRoleChange('doctor')}
            type="button"
          >🩺 Doctor</button>
          <button
            id="tab-patient"
            className={`login-tab${role === 'patient' ? ' active' : ''}`}
            onClick={() => handleRoleChange('patient')}
            type="button"
          >👤 Patient</button>
        </div>

        {/* Inner Auth Mode Tabs (Only for Doctor) */}
        {role === 'doctor' && (
          <div className="login-tabs" style={{ background: '#f0f4f8', marginTop: '-15px', marginBottom: '25px', padding: '3px' }}>
            <button
              id="mode-doctor-login"
              className={`login-tab${doctorMode === 'login' ? ' active' : ''}`}
              style={{ fontSize: '0.85rem', padding: '6px' }}
              onClick={() => handleDoctorModeChange('login')}
              type="button"
            >🔑 Sign In</button>
            <button
              id="mode-doctor-register"
              className={`login-tab${doctorMode === 'register' ? ' active' : ''}`}
              style={{ fontSize: '0.85rem', padding: '6px' }}
              onClick={() => handleDoctorModeChange('register')}
              type="button"
            >📝 Register</button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="login-username">Username</label>
            <input
              id="login-username"
              type="text"
              placeholder={role === 'doctor' ? 'Enter doctor username' : 'Enter patient username'}
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoComplete="off"
            />
          </div>
          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {success && <div className="login-success" style={{
            background: 'var(--teal-bg)',
            border: '1px solid var(--teal)',
            borderRadius: '8px',
            padding: '10px 14px',
            fontSize: '0.875rem',
            color: 'var(--teal-dark)',
            marginTop: '14px',
            marginBottom: '14px'
          }}>✓ {success}</div>}

          {error && <div className="login-error" style={{ marginBottom: '14px' }}>⚠️ {error}</div>}

          <button id="login-submit" className="login-submit" type="submit" disabled={loading}>
            {loading ? 'Processing…' : (
              role === 'doctor'
                ? (doctorMode === 'register' ? 'Create Doctor Account' : 'Sign in as Doctor')
                : 'Sign in as Patient'
            )}
          </button>
        </form>

        {role === 'doctor' && doctorMode === 'login' && (
          <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.85rem', color: 'var(--gray-600)' }}>
            New to MedTrack?{' '}
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); handleDoctorModeChange('register'); }}
              style={{ color: 'var(--teal)', fontWeight: '600', textDecoration: 'none' }}
            >
              Register here
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
