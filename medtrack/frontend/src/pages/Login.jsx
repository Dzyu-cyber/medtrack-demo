import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState('doctor');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await axios.post('http://localhost:3001/api/auth/login', { name, code, role });
      if (data.success) {
        login(data);
        navigate(role === 'doctor' ? '/doctor' : '/patient', { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
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

        <div className="login-tabs">
          <button
            id="tab-doctor"
            className={`login-tab${role === 'doctor' ? ' active' : ''}`}
            onClick={() => { setRole('doctor'); setError(''); }}
            type="button"
          >🩺 Doctor</button>
          <button
            id="tab-patient"
            className={`login-tab${role === 'patient' ? ' active' : ''}`}
            onClick={() => { setRole('patient'); setError(''); }}
            type="button"
          >👤 Patient</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="login-name">Full Name</label>
            <input
              id="login-name"
              type="text"
              placeholder={role === 'doctor' ? 'Dr. Priya Rao' : 'Ravi Kumar'}
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoComplete="off"
            />
          </div>
          <div className="form-group">
            <label htmlFor="login-code">
              {role === 'doctor' ? 'Doctor Code' : 'Phone Number'}
            </label>
            <input
              id="login-code"
              type={role === 'patient' ? 'tel' : 'text'}
              placeholder={role === 'doctor' ? 'DR001' : '9876543210'}
              value={code}
              onChange={e => setCode(e.target.value)}
              required
            />
          </div>
          {error && <div className="login-error">⚠️ {error}</div>}
          <button id="login-submit" className="login-submit" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : `Sign in as ${role === 'doctor' ? 'Doctor' : 'Patient'}`}
          </button>
        </form>

        <div className="login-hint">
          <div className="login-hint-row">🩺 <strong>Doctor:</strong> Dr. Priya Rao / DR001</div>
          <div className="login-hint-row">👤 <strong>Patient:</strong> Ravi Kumar / 9876543210</div>
          <div className="login-hint-row">👤 <strong>Patient:</strong> Sunita Devi / 9823456789</div>
        </div>
      </div>
    </div>
  );
}
