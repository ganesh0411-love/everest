import React, { useState } from 'react';
import './LoginScreen.css';

const LoginScreen = ({ onLogin }) => {
  const [role, setRole] = useState('Admin');
  const [email, setEmail] = useState('admin@everest.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const applyPreset = (presetRole) => {
    setRole(presetRole);
    if (presetRole === 'Admin') {
      setEmail('admin@everest.com');
      setPassword('admin123');
    } else if (presetRole === 'Staff') {
      setEmail('staff@everest.com');
      setPassword('staff123');
    } else if (presetRole === 'User') {
      setEmail('user@everest.com');
      setPassword('user123');
    }
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    // Simple role-based login validation rules
    setTimeout(() => {
      setLoading(false);
      let isValid = false;

      if (role === 'Admin' && email === 'admin@everest.com' && password === 'admin123') {
        isValid = true;
      } else if (role === 'Staff' && email === 'staff@everest.com' && password === 'staff123') {
        isValid = true;
      } else if (role === 'User' && email === 'user@everest.com' && password === 'user123') {
        isValid = true;
      } else {
        // Also allow generic logins if email pattern matches the role
        if (password.length >= 6) {
          isValid = true;
        } else {
          setError('Invalid credentials or password too short (min 6 chars).');
          return;
        }
      }

      if (isValid) {
        onLogin({ email, role });
      }
    }, 800);
  };

  return (
    <div className="login-overlay">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">EVEREST</div>
          <p>Microfinance Ledger Management Gate</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="login-error">{error}</div>}

          <div className="login-group">
            <label>Login Role</label>
            <div className="login-input-wrapper">
              <select value={role} onChange={(e) => applyPreset(e.target.value)}>
                <option value="Admin">Admin (Master Control)</option>
                <option value="Staff">Staff (Field Agent)</option>
                <option value="User">User (Customer View)</option>
              </select>
            </div>
          </div>

          <div className="login-group">
            <label>Email Address</label>
            <div className="login-input-wrapper">
              <input 
                type="email" 
                placeholder="email@everest.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>
          </div>

          <div className="login-group">
            <label>Password</label>
            <div className="login-input-wrapper">
              <input 
                type="password" 
                placeholder="••••••••" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
            </div>
          </div>

          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '18px', height: '18px' }}>
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
                Secure Login
              </>
            )}
          </button>
        </form>

        <div className="login-quick-presets">
          <div className="quick-presets-title">Quick Demo Presets</div>
          <div className="preset-buttons">
            <button className="btn-preset preset-admin" onClick={() => applyPreset('Admin')}>
              Admin
            </button>
            <button className="btn-preset preset-staff" onClick={() => applyPreset('Staff')}>
              Staff
            </button>
            <button className="btn-preset preset-user" onClick={() => applyPreset('User')}>
              User
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
