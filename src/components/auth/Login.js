import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../services/firebase";
import PasswordChangeModal from "../shared/PasswordChangeModal";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (!email || !password) {
      setError("Please enter both email and password");
      setIsLoading(false);
      return;
    }
 
    try {
      // 1. Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // 2. Get user data from Firestore
      const userDocRef = doc(db, "users", firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();

        // 3. Check if user is active
        if (!userData.status || userData.status.toLowerCase().trim() !== 'active') {
          setError("Your account has been deactivated. Please contact the administrator.");
          await auth.signOut();
          setIsLoading(false);
          return;
        }

        // 4. Check if password change is required (ONE TIME)
        if (userData.mustChangePassword && !userData.passwordChanged) {
          setCurrentUser(firebaseUser);
          setShowPasswordChange(true);
          setIsLoading(false);
          return;
        }

        // 5. Normal login - go to dashboard
        const userProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: userData.name,
          roles: userData.roles || [],
          sections: userData.sections || [],
          gradeLevels: userData.gradeLevels || [],
          subjects: userData.subjects || [],
          homeroomClass: userData.homeroomClass || '',
          status: userData.status
        };

        onLogin(userProfile);
      } else {
        setError("User profile not found. Please contact the administrator.");
        await auth.signOut();
      }
    } catch (error) {
      // Handle Firebase Auth errors
      switch (error.code) {
        case 'auth/user-not-found':
          setError("No account found with this email address.");
          break;
        case 'auth/wrong-password':
          setError("Incorrect password. Please try again.");
          break;
        case 'auth/invalid-email':
          setError("Please enter a valid email address.");
          break;
        case 'auth/invalid-credential':
          setError("Invalid email or password. Please try again.");
          break;
        case 'auth/too-many-requests':
          setError("Too many failed attempts. Please try again later.");
          break;
        default:
          setError("Login failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChanged = () => {
    setShowPasswordChange(false);
    setCurrentUser(null);
    window.location.reload();
  };

  // Show password change modal if needed
  if (showPasswordChange && currentUser) {
    return (
      <PasswordChangeModal 
        user={currentUser}
        onPasswordChanged={handlePasswordChanged}
      />
    );
  }

  return (
    <div className="container d-flex justify-content-center align-items-center" style={{ minHeight: "100vh", backgroundColor: "#f8f9fa" }}>
      <div className="card shadow p-4" style={{ maxWidth: "500px", width: "100%" }}>
        <div className="text-center mb-4">
          <div className="bg-primary bg-opacity-10 rounded-circle p-3 d-inline-flex mb-3">
            <i className="bi bi-mortarboard-fill text-primary fs-2"></i>
          </div>
          <h3 className="mb-2">School Attendance System</h3>
        </div>
        
        {error && (
          <div className="alert alert-danger" role="alert">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">
              <i className="bi bi-envelope me-2"></i>Email Address
            </label>
            <input 
              type="email" 
              className="form-control" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
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
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
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

        
        <div className="text-center mt-3">
          <small className="text-muted">
            Forgot your password? Please contact the admin for password reset.
          </small>
        </div>

        
        <div className="mt-4 pt-3 border-top">
          <div className="text-center mt-2">
            <small className="text-muted">Default Password: <code>password123</code></small>
          </div>
        </div>

       
            <div style={{ position: 'absolute', bottom: '15px', right: '15px' }}>
                <span className="badge bg-secondary px-2 py-1" style={{ fontSize: '0.7rem' }}>
                Version 2.0
                </span>
            </div>
        
      </div>
    </div>
  );
}