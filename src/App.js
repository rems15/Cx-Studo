import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './services/firebase'
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

// Import Components
import Login from './components/auth/Login';
import AdminDashboard from './pages/AdminDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import SupervisorDashboard from './pages/SupervisorDashboard';



function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authChecked, setAuthChecked] = useState(false);
    const [firebaseUser, setFirebaseUser] = useState(null); // Track Firebase user separately

    useEffect(() => {
        
        
        const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
            
            setFirebaseUser(fbUser); // Store Firebase user
            
            if (fbUser) {
                
                
                try {
                    // Load user profile from Firestore
                    const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
                    
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        
                        
                        // 🔐 CRITICAL: Check if password change is required
                        if (userData.mustChangePassword && !userData.passwordChanged) {
                            
                            // Don't set user profile yet - let Login.js handle password change
                            setUser(null);
                        } else {
                            // Password is OK, create full user profile
                            const userProfile = {
                                uid: fbUser.uid,
                                email: fbUser.email,
                                name: userData.name || fbUser.displayName,
                                roles: userData.roles || [],
                                userType: userData.userType || 'teacher',
                                sections: userData.sections || [],
                                gradeLevels: userData.gradeLevels || [],
                                subjects: userData.subjects || [],
                                homeroomClass: userData.homeroomClass || '',
                                status: userData.status || 'active'
                            };
                            
                            
                            setUser(userProfile);
                        }
                    } else {
                        setUser(null);
                    }
                } catch (error) {
                    // Let Login.js handle any errors
                    setUser(null);
                }
            } else {
                
                setUser(null);
            }
            
            setLoading(false);
            setAuthChecked(true);
        });

        return () => unsubscribe();
    }, []);

    // This function is called by Login.js after successful login/password change
    const handleLogin = (userProfile) => {
        setUser(userProfile);
    };

    const handleLogout = async () => {
        try {
            
            await signOut(auth);
            setUser(null);
            setFirebaseUser(null);
        } catch (error) {
            console.error('❌ App: Logout error:', error);
        }
    };

    // Show loading while checking auth
    if (!authChecked || loading) {
        return (
            <div className="d-flex justify-content-center align-items-center min-vh-100">
                <div className="text-center">
                    <div className="spinner-border text-primary mb-3" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="text-muted">Loading School Attendance System...</p>
                    <small className="text-muted d-block">
                        {loading ? 'Checking authentication...' : 'Setting up your dashboard...'}
                    </small>
                </div>
            </div>
        );
    }

    // Show login if:
    // 1. No Firebase user at all, OR
    // 2. Firebase user exists but no complete user profile (password change needed, etc.)
    if (!user || (firebaseUser && !user)) {    
        return <Login onLogin={handleLogin} />;
    }

    // Show appropriate dashboard based on complete user profile

    const isAdmin = user.email?.includes('admin') || user.roles?.includes('admin');
    const isSupervisor = user.roles?.includes('supervisor') || user.userType === 'supervisor'; // ✅ ADD THIS LINE

    if (isAdmin) {
        console.log('👑 App: Showing AdminDashboard');
        return (
            <AdminDashboard 
                currentUser={user} 
                onLogout={handleLogout}
            />
        );
    } else if (isSupervisor) { // ✅ ADD THIS ENTIRE BLOCK
        console.log('👁️ App: Showing SupervisorDashboard');
        return (
            <SupervisorDashboard 
                currentUser={user}
                onLogout={handleLogout}
            />
        );
    } else {
       
        return (
            <TeacherDashboard 
                currentUser={user}
                onLogout={handleLogout}
            />
        );
    }
}

export default App;