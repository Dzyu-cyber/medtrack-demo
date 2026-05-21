import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  
  const [role, setRole] = useState('doctor'); // 'doctor' or 'patient'
  const [doctorMode, setDoctorMode] = useState('login'); // 'login' or 'register'
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    if (user) {
      navigate(role === 'doctor' ? '/doctor' : '/patient', { replace: true });
    }
  }, [user, navigate, role]);

  // Interactive Simulator States
  const [simAspirin, setSimAspirin] = useState(false);
  const [simVitamin, setSimVitamin] = useState(false);


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
          login(data, rememberMe);
          navigate(role === 'doctor' ? '/doctor' : '/patient', { replace: true });
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Operation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Live Simulator Computations
  const takenCount = (simAspirin ? 1 : 0) + (simVitamin ? 1 : 0);
  const progressPercent = Math.round((takenCount / 2) * 100);
  const strokeDashoffset = 251.2 - (251.2 * progressPercent) / 100;

  return (
    <div className="landing-container">
      {/* Navigation Header */}
      <header className="landing-nav">
        <a href="#hero" className="brand" onClick={(e) => { e.preventDefault(); scrollToSection('hero'); }}>
          <div className="brand-icon">💊</div>
          <span>MedTrack</span>
        </a>
        <nav className="landing-nav-links">
          <a href="#about" className="landing-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('about'); }}>About</a>
          <a href="#workflow" className="landing-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('workflow'); }}>How It Works</a>
          <a href="#simulator" className="landing-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('simulator'); }}>Live Demo</a>
          <a href="#features" className="landing-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('features'); }}>Functionality</a>
          <a href="#portal" className="landing-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('portal'); }}>Access Portal</a>
        </nav>
        <button className="btn btn-primary" onClick={() => scrollToSection('portal')}>
          Access Portal 🔐
        </button>
      </header>

      {/* Hero Section */}
      <section id="hero" className="landing-section hero-grid">
        <div className="hero-content">
          <h1 className="hero-title">
            Smart Medication <br />
            <span>Monitoring Simplified</span>
          </h1>
          <p className="hero-desc">
            MedTrack is a real-time supervision dashboard bridging the gap between doctors and patients. Monitor compliance metrics, log daily dosages with a single click, and receive instant websocket alerts.
          </p>
          <div className="hero-ctas">
            <button className="btn-premium-primary" onClick={() => scrollToSection('portal')}>
              Get Started Now 🚀
            </button>
          </div>
        </div>
        
        {/* Floating Mockup Smartphone */}
        <div className="hero-mockup-wrapper">
          <div className="phone-container">
            {/* Phone Speaker/Camera Notch */}
            <div className="phone-notch"></div>
            
            {/* Phone Screen Contents */}
            <div className="phone-screen">
              {/* App Status Header */}
              <div className="phone-header">
                <div>
                  <span className="phone-greeting">Good morning,</span>
                  <h3 className="phone-patient-name">Alice Johnson 👋</h3>
                </div>
                <div className="phone-status-badge">Connected</div>
              </div>

              {/* Progress Ring Card */}
              <div className="phone-progress-card">
                <div className="progress-ring-wrapper">
                  <svg className="progress-svg" viewBox="0 0 100 100">
                    <circle className="progress-bg-ring" cx="50" cy="50" r="40" />
                    <circle className="progress-fill-ring" cx="50" cy="50" r="40" />
                  </svg>
                  <div className="progress-text-center">
                    <span className="progress-percentage">75%</span>
                    <span className="progress-sub">Taken Today</span>
                  </div>
                </div>
                <div className="progress-stats">
                  <div className="stat-pill">3 of 4 Doses</div>
                  <div className="stat-pill delay">Next: 8:00 PM</div>
                </div>
              </div>

              {/* Quick Log Feed */}
              <div className="phone-med-list">
                <span className="phone-list-label">Today's Schedule</span>
                
                {/* Med Item 1 */}
                <div className="phone-med-item taken">
                  <div className="phone-med-icon">💊</div>
                  <div style={{ flex: 1 }}>
                    <h5 className="phone-med-title">Aspirin (100mg)</h5>
                    <span className="phone-med-time">Logged at 8:15 AM</span>
                  </div>
                  <div className="phone-check-indicator">✓</div>
                </div>

                {/* Med Item 2 */}
                <div className="phone-med-item active-log">
                  <div className="phone-med-icon">💊</div>
                  <div style={{ flex: 1 }}>
                    <h5 className="phone-med-title">Multivitamin</h5>
                    <span className="phone-med-time">Scheduled for 2:00 PM</span>
                  </div>
                  <button className="phone-log-btn" type="button" onClick={() => scrollToSection('portal')}>Log Dose</button>
                </div>
              </div>

              {/* Status footer inside screen */}
              <div className="phone-footer-status">
                <span className="live-socket-indicator"></span>
                <span>Real-Time Sync Active</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="landing-section" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="about-section-header">
          <span className="section-subtitle">Why MedTrack</span>
          <h2 className="section-title">Bridging Supervision & Daily Care</h2>
        </div>
        <div className="about-grid">
          <div className="about-card">
            <div className="about-icon">📈</div>
            <h3>98% Adherence Rate</h3>
            <p>Clinical studies show that real-time monitoring and immediate visual compliance feedback increases medication adherence by up to 40%.</p>
          </div>
          <div className="about-card">
            <div className="about-icon">⚡</div>
            <h3>Sub-Second Syncing</h3>
            <p>Our custom backend is powered by integrated sockets, propagating patient updates straight to their assigned doctor’s screens instantly.</p>
          </div>
          <div className="about-card">
            <div className="about-icon">🔒</div>
            <h3>Clinical Compliance</h3>
            <p>All data records are securely saved on standard databases using trusted cryptographic authentication schemas to guarantee safety.</p>
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section id="workflow" className="landing-section" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="about-section-header">
          <span className="section-subtitle">Process Flow</span>
          <h2 className="section-title">How MedTrack Works</h2>
        </div>
        <div className="workflow-grid">
          <div className="workflow-card">
            <div className="workflow-number">1</div>
            <h3>Doctor Assigns Schedule</h3>
            <p>Clinicians input custom patient prescriptions, timing intervals, and dosage limits directly into their cloud supervisor dashboard.</p>
          </div>
          <div className="workflow-card">
            <div className="workflow-number">2</div>
            <h3>Patient Logs Intake</h3>
            <p>Patients receive simple notifications on their mobile web terminal and record their daily dosages with a single click.</p>
          </div>
          <div className="workflow-card">
            <div className="workflow-number">3</div>
            <h3>Real-Time Analytics</h3>
            <p>Compliance percentages are re-calculated instantly. Doctors receive instant WebSocket notifications on missed morning doses.</p>
          </div>
        </div>
      </section>

      {/* Interactive Adherence Simulator Section */}
      <section id="simulator" className="landing-section" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="about-section-header">
          <span className="section-subtitle">Try It Out</span>
          <h2 className="section-title">Interactive Compliance Simulator</h2>
        </div>
        
        <div className="simulator-container">
          <div className="sim-controls">
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '10px' }}>Log Mock Doses</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '16px', lineHeight: '1.5' }}>
              Experience the ease of our logging flow. Take these virtual medications to see the progress ring update and watch how data is synchronized instantly.
            </p>
            
            {/* Pill Row 1 */}
            <div className={`sim-pill-row ${simAspirin ? 'taken' : 'active'}`}>
              <div className="sim-pill-info">
                <div className="sim-pill-icon">💊</div>
                <div>
                  <span className="sim-pill-name">Aspirin (100mg)</span>
                  <span className="sim-pill-time">Morning Dosage — Scheduled 8:00 AM</span>
                </div>
              </div>
              <button 
                type="button"
                className={`sim-log-btn ${simAspirin ? 'taken-btn' : ''}`}
                onClick={() => setSimAspirin(true)}
                disabled={simAspirin}
              >
                {simAspirin ? '✓ Logged' : 'Log Dose'}
              </button>
            </div>

            {/* Pill Row 2 */}
            <div className={`sim-pill-row ${simVitamin ? 'taken' : 'active'}`}>
              <div className="sim-pill-info">
                <div className="sim-pill-icon">☀️</div>
                <div>
                  <span className="sim-pill-name">Vitamin D3</span>
                  <span className="sim-pill-time">Afternoon Dosage — Scheduled 1:00 PM</span>
                </div>
              </div>
              <button 
                type="button"
                className={`sim-log-btn ${simVitamin ? 'taken-btn' : ''}`}
                onClick={() => setSimVitamin(true)}
                disabled={simVitamin}
              >
                {simVitamin ? '✓ Logged' : 'Log Dose'}
              </button>
            </div>
          </div>

          <div className="sim-results">
            <span className="sim-results-title">Live App Status</span>
            
            <div className="progress-ring-wrapper">
              <svg className="progress-svg" viewBox="0 0 100 100">
                <circle className="progress-bg-ring" cx="50" cy="50" r="40" />
                <circle 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  fill="none"
                  stroke="var(--teal)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray="251.2"
                  style={{ 
                    strokeDashoffset: strokeDashoffset, 
                    transition: 'stroke-dashoffset 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' 
                  }}
                />
              </svg>
              <div className="progress-text-center">
                <span className="progress-percentage">{progressPercent}%</span>
                <span className="progress-sub">Compliance</span>
              </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', gap: '8px' }}>
              <div className="stat-pill">{takenCount} of 2 Taken</div>
              {progressPercent === 100 ? (
                <div className="stat-pill" style={{ background: 'rgba(0, 255, 188, 0.15)', color: '#00ffbc', border: '1px solid rgba(0, 255, 188, 0.3)' }}>Perfect Day! 🎉</div>
              ) : (
                <div className="stat-pill delay">Doses Remaining</div>
              )}
            </div>

            {(simAspirin || simVitamin) && (
              <button 
                type="button"
                className="sim-reset-btn"
                onClick={() => { setSimAspirin(false); setSimVitamin(false); }}
              >
                Reset Simulation 🔄
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Functionality & Features Section */}
      <section id="features" className="landing-section" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="features-grid">
          <div>
            <span className="section-subtitle">Advanced Capabilities</span>
            <h2 className="section-title" style={{ marginBottom: '24px' }}>Intuitive Tools For Seamless Tracking</h2>
            <p className="hero-desc" style={{ marginBottom: '32px' }}>
              MedTrack contains tailored portals designed with user experience at their core. Both doctors and patients get access to key details without any bloat.
            </p>
            <div className="hero-ctas">
              <button className="btn-premium-primary" onClick={() => scrollToSection('portal')}>
                Sign In To Try It Out 🔐
              </button>
            </div>
          </div>
          
          <div className="features-list">
            <div className="feature-item">
              <div className="feature-number">01</div>
              <div className="feature-info">
                <h4>Doctor Dashboard Overview</h4>
                <p>Add unlimited patients, assign customized medications, and track their adherence trends on a clean and powerful workspace grid.</p>
              </div>
            </div>
            
            <div className="feature-item">
              <div className="feature-number">02</div>
              <div className="feature-info">
                <h4>Patient Quick-Log Interface</h4>
                <p>No tedious forms. Patients log their medication intakes with a simple tap on their dashboard, automatically recalculating logs.</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-number">03</div>
              <div className="feature-info">
                <h4>Interactive Compliance Meter</h4>
                <p>Calculates and renders a beautiful percentage bar dynamically representing medication log trends for any selected day.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Glassmorphic Portal Section */}
      <section id="portal" className="portal-section">
        <div className="portal-header">
          <span className="section-subtitle" style={{ color: '#00ffbc' }}>Auth Gateway</span>
          <h2 className="section-title" style={{ fontSize: '2.5rem' }}>Secure Portal Access</h2>
          <p style={{ color: '#94a3b8', marginTop: '8px' }}>Log in to view your patient logs or oversee clinical compliance</p>
        </div>
        
        {/* Render Original Login Card */}
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
            <div className="login-tabs" style={{ background: 'rgba(255,255,255,0.03)', marginTop: '-15px', marginBottom: '25px', padding: '3px' }}>
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

            {!(role === 'doctor' && doctorMode === 'register') && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--teal)', cursor: 'pointer' }}
                />
                <label htmlFor="remember-me" style={{ color: '#cbd5e1', fontSize: '0.85rem', cursor: 'pointer', margin: 0, textTransform: 'none', letterSpacing: 'normal', fontWeight: '500' }}>
                  Remember me on this device
                </label>
              </div>
            )}

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
            <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.85rem', color: '#94a3b8' }}>
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
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>© 2026 MedTrack Healthcare Inc. All rights reserved. Created with 💚 for patients & clinicians.</p>
      </footer>
    </div>
  );
}
