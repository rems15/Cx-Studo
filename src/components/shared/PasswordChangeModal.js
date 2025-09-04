import React, { useState } from 'react';
import { auth, db } from '../../services/firebase'; // ← CHANGED: Updated path
import { updatePassword, signOut, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

const PasswordChangeModal = ({ user, onPasswordChanged }) => {
    const [passwords, setPasswords] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    });
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [validations, setValidations] = useState({
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
        special: false,
        match: false
    });

    // Safety check - if user is not available, show loading
    if (!user) {
        return (
            <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999 }}>
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-body text-center py-5">
                            <div className="spinner-border text-warning mb-3" role="status"></div>
                            <h5>Loading User Information...</h5>
                            <p className="text-muted">Please wait while we verify your account.</p>
                            <button 
                                className="btn btn-secondary mt-3" 
                                onClick={() => window.location.reload()}
                            >
                                Refresh Page
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Get user email safely
    const userEmail = user.email || user.providerData?.[0]?.email || 'No email found';

    // Password validation
    const validatePassword = (password) => {
        const newValidations = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
            match: passwords.confirmPassword === password && password.length > 0
        };
        setValidations(newValidations);
        return Object.values(newValidations).every(v => v);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setPasswords(prev => ({
            ...prev,
            [name]: value
        }));

        // Clear error when user starts typing
        if (error) {
            setError('');
        }

        if (name === 'newPassword') {
            validatePassword(value);
        }
        
        if (name === 'confirmPassword') {
            setValidations(prev => ({
                ...prev,
                match: value === passwords.newPassword && value.length > 0
            }));
        }
    };

    const togglePasswordVisibility = (field) => {
        setShowPasswords(prev => ({
            ...prev,
            [field]: !prev[field]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // VALIDATION CHECKS
            if (!user) {
                throw new Error('User information is missing. Please try logging in again.');
            }

            if (!userEmail || userEmail === 'No email found') {
                throw new Error('User email is missing. Please try logging in again.');
            }

            if (!passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword) {
                throw new Error('Please fill in all password fields');
            }

            if (!validatePassword(passwords.newPassword)) {
                throw new Error('New password does not meet all requirements');
            }

            if (passwords.newPassword !== passwords.confirmPassword) {
                throw new Error('New passwords do not match');
            }

            if (passwords.currentPassword === passwords.newPassword) {
                throw new Error('New password must be different from current password');
            }

            // STEP 1: Re-authenticate with current password
            const credential = EmailAuthProvider.credential(
                userEmail,
                passwords.currentPassword
            );
            
            await reauthenticateWithCredential(user, credential);
            
            // STEP 2: Update password in Firebase Auth
            await updatePassword(user, passwords.newPassword);

            // STEP 3: Update user document in Firestore
            if (user.uid) {
                const userDocRef = doc(db, 'users', user.uid);
                await updateDoc(userDocRef, {
                    passwordChanged: true,
                    mustChangePassword: false,
                    firstLoginCompleted: true,
                    lastPasswordChange: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
            }

            setSuccess(true);
            
            // Show success message and redirect after delay
            setTimeout(() => {
                if (onPasswordChanged) {
                    onPasswordChanged();
                } else {
                    // Fallback: sign out and reload
                    signOut(auth).then(() => {
                        window.location.reload();
                    });
                }
            }, 2000);

        } catch (error) {
            // Handle different Firebase error codes
            let errorMessage = 'Failed to change password. Please try again.';
            
            switch (error.code) {
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                    errorMessage = 'Current password is incorrect. Please check and try again.';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'New password is too weak. Please choose a stronger password.';
                    break;
                case 'auth/requires-recent-login':
                    errorMessage = 'Please log out and log in again before changing your password.';
                    break;
                case 'auth/user-not-found':
                    errorMessage = 'User account not found. Please try logging in again.';
                    break;
                case 'auth/network-request-failed':
                    errorMessage = 'Network error. Please check your connection and try again.';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Too many failed attempts. Please wait a few minutes and try again.';
                    break;
                default:
                    errorMessage = error.message || errorMessage;
            }
            
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleSkip = async () => {
        if (window.confirm('Are you sure you want to skip? You will be asked to change your password next time you log in.')) {
            try {
                await signOut(auth);
                window.location.reload(); // Reload to go back to login
            } catch (error) {
                setError('Error signing out. Please try again.');
            }
        }
    };

    const isFormValid = Object.values(validations).every(v => v) && 
                       passwords.currentPassword.length > 0;

    return (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999 }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header bg-warning text-dark">
                        <h5 className="modal-title">
                            <i className="bi bi-shield-lock me-2"></i>
                            Password Change Required
                        </h5>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            <div className="alert alert-warning" role="alert">
                                <i className="bi bi-exclamation-triangle me-2"></i>
                                <strong>Security Notice:</strong> You must change your default password before continuing to your dashboard.
                            </div>

                            {/* User Info Display */}
                            <div className="alert alert-info" role="alert">
                                <i className="bi bi-person me-2"></i>
                                <strong>Account:</strong> {userEmail}
                            </div>

                            {error && (
                                <div className="alert alert-danger alert-dismissible fade show" role="alert">
                                    <i className="bi bi-x-circle me-2"></i>
                                    {error}
                                    <button 
                                        type="button" 
                                        className="btn-close" 
                                        onClick={() => setError('')}
                                    ></button>
                                </div>
                            )}

                            {success && (
                                <div className="alert alert-success" role="alert">
                                    <i className="bi bi-check-circle me-2"></i>
                                    Password changed successfully! Redirecting to dashboard...
                                </div>
                            )}

                            {/* Current Password */}
                            <div className="mb-3">
                                <label className="form-label">
                                    <i className="bi bi-lock me-1"></i>
                                    Current Password *
                                </label>
                                <div className="input-group">
                                    <input
                                        type={showPasswords.current ? "text" : "password"}
                                        className="form-control"
                                        name="currentPassword"
                                        value={passwords.currentPassword}
                                        onChange={handleInputChange}
                                        placeholder="Enter your current password"
                                        required
                                        disabled={loading || success}
                                        autoComplete="current-password"
                                    />
                                    <button
                                        className="btn btn-outline-secondary"
                                        type="button"
                                        onClick={() => togglePasswordVisibility('current')}
                                        disabled={loading || success}
                                    >
                                        <i className={`bi bi-${showPasswords.current ? 'eye-slash' : 'eye'}`}></i>
                                    </button>
                                </div>
                                <small className="text-muted">Usually: password123 or the default password provided</small>
                            </div>

                            {/* New Password */}
                            <div className="mb-3">
                                <label className="form-label">
                                    <i className="bi bi-key me-1"></i>
                                    New Password *
                                </label>
                                <div className="input-group">
                                    <input
                                        type={showPasswords.new ? "text" : "password"}
                                        className="form-control"
                                        name="newPassword"
                                        value={passwords.newPassword}
                                        onChange={handleInputChange}
                                        placeholder="Enter your new secure password"
                                        required
                                        disabled={loading || success}
                                        autoComplete="new-password"
                                    />
                                    <button
                                        className="btn btn-outline-secondary"
                                        type="button"
                                        onClick={() => togglePasswordVisibility('new')}
                                        disabled={loading || success}
                                    >
                                        <i className={`bi bi-${showPasswords.new ? 'eye-slash' : 'eye'}`}></i>
                                    </button>
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div className="mb-3">
                                <label className="form-label">
                                    <i className="bi bi-key-fill me-1"></i>
                                    Confirm New Password *
                                </label>
                                <div className="input-group">
                                    <input
                                        type={showPasswords.confirm ? "text" : "password"}
                                        className="form-control"
                                        name="confirmPassword"
                                        value={passwords.confirmPassword}
                                        onChange={handleInputChange}
                                        placeholder="Re-enter your new password"
                                        required
                                        disabled={loading || success}
                                        autoComplete="new-password"
                                    />
                                    <button
                                        className="btn btn-outline-secondary"
                                        type="button"
                                        onClick={() => togglePasswordVisibility('confirm')}
                                        disabled={loading || success}
                                    >
                                        <i className={`bi bi-${showPasswords.confirm ? 'eye-slash' : 'eye'}`}></i>
                                    </button>
                                </div>
                            </div>

                            {/* Password Requirements */}
                            {passwords.newPassword && (
                                <div className="card bg-light mb-3">
                                    <div className="card-body p-3">
                                        <h6 className="card-title mb-2">Password Requirements:</h6>
                                        <div className="row">
                                            <div className="col-md-6">
                                                <div className={`small mb-1 ${validations.length ? 'text-success' : 'text-danger'}`}>
                                                    <i className={`bi bi-${validations.length ? 'check-circle-fill' : 'x-circle'} me-1`}></i>
                                                    At least 8 characters
                                                </div>
                                                <div className={`small mb-1 ${validations.uppercase ? 'text-success' : 'text-danger'}`}>
                                                    <i className={`bi bi-${validations.uppercase ? 'check-circle-fill' : 'x-circle'} me-1`}></i>
                                                    One uppercase letter
                                                </div>
                                                <div className={`small mb-1 ${validations.lowercase ? 'text-success' : 'text-danger'}`}>
                                                    <i className={`bi bi-${validations.lowercase ? 'check-circle-fill' : 'x-circle'} me-1`}></i>
                                                    One lowercase letter
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className={`small mb-1 ${validations.number ? 'text-success' : 'text-danger'}`}>
                                                    <i className={`bi bi-${validations.number ? 'check-circle-fill' : 'x-circle'} me-1`}></i>
                                                    One number
                                                </div>
                                                <div className={`small mb-1 ${validations.special ? 'text-success' : 'text-danger'}`}>
                                                    <i className={`bi bi-${validations.special ? 'check-circle-fill' : 'x-circle'} me-1`}></i>
                                                    One special character
                                                </div>
                                                <div className={`small mb-1 ${validations.match ? 'text-success' : 'text-danger'}`}>
                                                    <i className={`bi bi-${validations.match ? 'check-circle-fill' : 'x-circle'} me-1`}></i>
                                                    Passwords match
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Strength indicator */}
                                        <div className="mt-2">
                                            <div className="d-flex justify-content-between mb-1">
                                                <small>Strength:</small>
                                                <small>
                                                    {Object.values(validations).filter(v => v).length <= 2 && 'Weak'}
                                                    {Object.values(validations).filter(v => v).length > 2 && 
                                                     Object.values(validations).filter(v => v).length <= 4 && 'Medium'}
                                                    {Object.values(validations).filter(v => v).length > 4 && 'Strong'}
                                                </small>
                                            </div>
                                            <div className="progress" style={{ height: '6px' }}>
                                                <div 
                                                    className={`progress-bar ${
                                                        Object.values(validations).filter(v => v).length <= 2 ? 'bg-danger' :
                                                        Object.values(validations).filter(v => v).length <= 4 ? 'bg-warning' :
                                                        'bg-success'
                                                    }`}
                                                    style={{ width: `${Math.min(100, (Object.values(validations).filter(v => v).length / 6) * 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button 
                                type="button" 
                                className="btn btn-outline-secondary" 
                                onClick={handleSkip}
                                disabled={loading || success}
                            >
                                <i className="bi bi-skip-end me-1"></i>
                                Skip for Now
                            </button>
                            <button 
                                type="submit" 
                                className="btn btn-primary"
                                disabled={loading || success || !isFormValid}
                            >
                                {loading ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2"></span>
                                        Changing...
                                    </>
                                ) : success ? (
                                    <>
                                        <i className="bi bi-check-circle me-2"></i>
                                        Success!
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-shield-check me-2"></i>
                                        Change Password
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default PasswordChangeModal;