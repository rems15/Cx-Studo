// src/components/auth/Login.js
import React, { useState } from 'react';
import AV from '../../services/leancloud';

const Login = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('admin@school.com'); // Pre-filled for testing
  const [password, setPassword] = useState('password123'); // Pre-filled for testing
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Forgot password states
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');

  const handleInputChange = (e) => {
    if (e.target.name === 'email') {
      setEmail(e.target.value);
    } else if (e.target.name === 'password') {
      setPassword(e.target.value);
    }
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      console.log('🔐 Attempting login for:', email);

      // Login with LeanCloud
      const user = await AV.User.logIn(email, password);
      
      console.log('✅ Login successful!', user);

      // Check if user is active
      const status = user.get('status');
      if (status !== 'active') {
        await AV.User.logOut();
        setError(`Your account has been ${status}. Please contact the administrator.`);
        setIsLoading(false);
        return;
      }

      // Prepare user data for the app
      const userData = {
        id: user.id,
        email: user.get('email'),
        username: user.get('username'),
        name: user.get('name'),
        userType: user.get('userType') || 'teacher',
        roles: user.get('roles') || ['teacher'],
        status: user.get('status'),
        sections: user.get('sections') || [],
        subjects: user.get('subjects') || [],
        homeroomClass: user.get('homeroomClass')
      };

      console.log('👤 User data prepared:', userData);

      // Call parent callback to handle successful login
      if (onLoginSuccess) {
        onLoginSuccess(userData);
      }

    } catch (error) {
      console.error('❌ Login failed:', error);
      
      // Handle different error types
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.code === 210) {
        errorMessage = 'Invalid email or password.';
      } else if (error.code === 219) {
        errorMessage = 'Login failed. Please check your credentials.';
      } else if (error.code === 101) {
        errorMessage = 'Invalid email or password.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle forgot password (LeanCloud version)
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    setError('');
    setForgotMessage('');

    if (!forgotEmail.trim()) {
      setError('Please enter your email address');
      setForgotLoading(false);
      return;
    }

    try {
      console.log('📧 Sending password reset email to:', forgotEmail);
      
      // LeanCloud password reset
      await AV.User.requestPasswordReset(forgotEmail);
      
      setForgotMessage(
        `Password reset email sent to ${forgotEmail}. ` +
        `Check your email and follow the instructions to reset your password.`
      );
      
      console.log('✅ Password reset email sent successfully');

    } catch (error) {
      console.error('❌ Password reset error:', error);
      
      if (error.code === 1) {
        setError(
          `No account found with email: ${forgotEmail}. ` +
          `If you're using a placeholder email like admin@school.com, please contact your admin for a password reset.`
        );
      } else {
        setError('Failed to send password reset email. Please try again.');
      }
    } finally {
      setForgotLoading(false);
    }
  };

  // Forgot Password View (no grey background)
  if (showForgotPassword) {
    return (
      <div className="container d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
        <div className="card shadow p-4" style={{ maxWidth: "500px", width: "100%" }}>
          <div className="text-center mb-4">
            <img 
              src="/images/cx-logo-1.jpg"
              alt="App Logo" 
              style={{ width: "48px", height: "48px" }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <h3 className="mb-2">Reset Password</h3>
            <p className="text-muted">Enter your email to receive reset instructions</p>
          </div>
          
          {error && (
            <div className="alert alert-danger" role="alert">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {error}
            </div>
          )}

          {forgotMessage && (
            <div className="alert alert-success" role="alert">
              <i className="bi bi-check-circle-fill me-2"></i>
              {forgotMessage}
            </div>
          )}
          
          <form onSubmit={handleForgotPassword}>
            <div className="mb-3">
              <label className="form-label">
                <i className="bi bi-envelope me-2"></i>Your Email Address
              </label>
              <input 
                type="email" 
                className="form-control" 
                value={forgotEmail} 
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="Enter your email address"
                disabled={forgotLoading}
                required
              />
              <small className="form-text text-muted">
                Enter the email associated with your account
              </small>
            </div>
            
            <button 
              type="submit" 
              className="btn btn-primary w-100 py-2 mb-3"
              disabled={forgotLoading}
            >
              {forgotLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                  Sending...
                </>
              ) : (
                <>
                  <i className="bi bi-envelope me-2"></i>
                  Send Reset Email
                </>
              )}
            </button>
          </form>

          <div className="text-center">
            <button 
              className="btn btn-link"
              onClick={() => setShowForgotPassword(false)}
            >
              <i className="bi bi-arrow-left me-1"></i>
              Back to Login
            </button>
          </div>

          <div className="mt-3 p-3 bg-light rounded">
            <small className="text-muted">
              <strong>Note:</strong> If you're using a test account (like admin@school.com), 
              password reset may not work. Contact your administrator for assistance.
            </small>
          </div>
        </div>
      </div>
    );
  }

  // Main Login View (your original design)
  return (
    <div className="container d-flex justify-content-center align-items-center" style={{ minHeight: "100vh", backgroundColor: "#f8f9fa" }}>
      <div className="card shadow p-4" style={{ maxWidth: "500px", width: "100%" }}>
        <div className="text-center mb-4">
          <img 
            src="/images/cx-logo-1.jpg"
            alt="App Logo" 
            style={{ width: "48px", height: "48px" }}
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
          <h3 className="mb-2">CX STUDO</h3>
          <p className="text-muted">Unified Attendance Tracking For Teachers</p>
        </div>
        
        {error && (
          <div className="alert alert-danger" role="alert">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            {error}
          </div>
        )}
        
        <form onSubmit={handleLogin}>
          <div className="mb-3">
            <label className="form-label">
              <i className="bi bi-envelope me-2"></i>Email Address
            </label>
            <input 
              type="email" 
              className="form-control" 
              name="email"
              value={email} 
              onChange={handleInputChange}
              placeholder="Enter your email"
              disabled={isLoading}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">
              <i className="bi bi-lock me-2"></i>Password
            </label>
            <input 
              type="password" 
              className="form-control" 
              name="password"
              value={password} 
              onChange={handleInputChange}
              placeholder="Enter your password"
              disabled={isLoading}
              required
            />
          </div>
          <button 
            type="submit" 
            className="btn btn-primary w-100 py-2"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                Signing in...
              </>
            ) : (
              <>
                <i className="bi bi-box-arrow-in-right me-2"></i>
                Sign In
              </>
            )}
          </button>
        </form>

        {/* Forgot password section */}
        <div className="text-center mt-3">
          <button 
            className="btn btn-link text-decoration-none"
            onClick={() => setShowForgotPassword(true)}
          >
            Forgot your password?
          </button>
        </div>

        <div className="mt-4 pt-3 border-top">
          <div className="text-center mt-2">
            <small className="text-muted">Default Password: <code>password123</code></small>
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: '15px', right: '15px' }}>
          <span className="badge bg-secondary px-2 py-1" style={{ fontSize: '0.7rem' }}>
            Version 3.0 - LeanCloud
          </span>
        </div>
      </div>
    </div>
  );
};

export default Login;