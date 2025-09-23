import React, { useState, useEffect } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, updateProfile, signOut } from 'firebase/auth';
import { auth, db } from '../../services/firebase';
import { collection, doc, setDoc, updateDoc, serverTimestamp, getDocs, query, where, addDoc } from 'firebase/firestore';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

// Firebase config for secondary app
const firebaseConfig = {
  apiKey: "AIzaSyAdAVuZlyKeiIBsbAggBd9zxoWkVvgS7uw",
  authDomain: "teacher-attendance-dynamic-v.firebaseapp.com",
  projectId: "teacher-attendance-dynamic-v",
  storageBucket: "teacher-attendance-dynamic-v.firebasestorage.app",
  messagingSenderId: "339903120292",
  appId: "1:339903120292:web:ee3bcae530a0a64f2db731",
  measurementId: "G-SREH6MW6QB"
};

// Create secondary Firebase app for user creation (only needed for create mode)
let secondaryApp;
let secondaryAuth;

const initializeSecondaryApp = () => {
  const existingApp = getApps().find(app => app.name === 'userCreation');
  if (!existingApp) {
    secondaryApp = initializeApp(firebaseConfig, 'userCreation');
    secondaryAuth = getAuth(secondaryApp);
    console.log('Secondary Firebase app initialized for user creation');
  } else {
    secondaryApp = existingApp;
    secondaryAuth = getAuth(existingApp);
  }
};

const UserModal = ({ 
  show, 
  onClose, 
  user = null,      // NEW: For edit mode
  isEdit = false    // NEW: Edit mode flag
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    roles: [],
    subjects: [],
    userType: 'teacher',
    status: 'active'
  });
  
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Initialize when modal opens
  useEffect(() => {
    if (show) {
      if (!isEdit) {
        // Only initialize secondary app for create mode
        initializeSecondaryApp();
      }
      loadSubjects();
      
      // NEW: Handle edit mode initialization
      if (isEdit && user) {
        console.log('EDIT MODE: Populating form with user data', user);
        populateFormForEdit(user);
      } else {
        // Create mode: Reset form
        resetForm();
      }
    }
  }, [show, isEdit, user]);

  // NEW: Populate form for edit mode
  const populateFormForEdit = (userData) => {
    setFormData({
      name: userData.name || '',
      email: userData.email || '',
      roles: userData.roles || [],
      subjects: userData.subjects || [],
      userType: userData.userType || 'teacher',
      status: userData.status || 'active'
    });
    
    console.log('User form populated with:', {
      name: userData.name,
      email: userData.email,
      roles: userData.roles?.length || 0,
      subjects: userData.subjects?.length || 0,
      userType: userData.userType,
      status: userData.status
    });
  };

  // NEW: Reset form for create mode
  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      roles: [],
      subjects: [],
      userType: 'teacher',
      status: 'active'
    });
    setErrors({});
  };

  // Load available subjects from database
  const loadSubjects = async () => {
    try {
      const subjectsSnapshot = await getDocs(collection(db, 'subjects'));
      const subjectsList = [];
      subjectsSnapshot.forEach(doc => {
        const subjectData = doc.data();
        if (subjectData.active !== false) {
          subjectsList.push({
            id: doc.id,
            name: subjectData.name,
            code: subjectData.code || '',
            color: subjectData.color || '#007bff'
          });
        }
      });
      setAvailableSubjects(subjectsList.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error('Error loading subjects:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleRoleToggle = (role) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role]
    }));
  };

  const handleSubjectToggle = (subjectName) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subjectName)
        ? prev.subjects.filter(s => s !== subjectName)
        : [...prev.subjects, subjectName]
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (formData.roles.length === 0) {
      newErrors.roles = 'Please select at least one role';
    }

    if (formData.roles.includes('subject') && formData.subjects.length === 0 && availableSubjects.length > 0) {
      newErrors.subjects = 'Please select at least one subject for subject teachers';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // NEW: Handle password reset (for edit mode)
  const handlePasswordReset = async () => {
    if (!isEdit || !user) return;

    const confirmReset = window.confirm(
      `Reset Password for ${formData.name}?\n\n` +
      `This will:\n` +
      `• Reset password to: password123\n` +
      `• Force password change on next login\n` +
      `• User will be notified of password reset\n\n` +
      `Continue?`
    );

    if (!confirmReset) return;

    try {
      setLoading(true);

      // Update user document to require password change
      await updateDoc(doc(db, 'users', user.id), {
        mustChangePassword: true,
        passwordChanged: false,
        passwordResetAt: new Date().toISOString(),
        passwordResetBy: 'Admin',
        updatedAt: serverTimestamp()
      });

      // Log activity
      await addDoc(collection(db, 'activityLog'), {
        action: 'password_reset_by_admin',
        description: `Password reset for ${formData.name} by admin`,
        performedBy: 'Admin',
        userId: user.id,
        userName: formData.name,
        timestamp: new Date().toISOString(),
        severity: 'medium'
      });

      alert(
        `Password Reset Successful!\n\n` +
        `User: ${formData.name}\n` +
        `Email: ${formData.email}\n` +
        `New Password: password123\n\n` +
        `The user will be required to change this password on their next login.`
      );

    } catch (error) {
      console.error('Error resetting password:', error);
      alert('Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      if (isEdit && user?.id) {
        // UPDATE existing user
        console.log('UPDATING user with ID:', user.id);
        
        const userData = {
          name: formData.name.trim(),
          roles: formData.roles,
          subjects: formData.subjects,
          userType: formData.userType,
          status: formData.status,
          updatedAt: serverTimestamp()
        };

        // NOTE: Email is not updated in edit mode for security reasons
        await updateDoc(doc(db, 'users', user.id), userData);

        // SYNC: Update subject documents with assigned teacher
        if (formData.subjects.length > 0) {
          console.log('Syncing subject documents...');
          
          for (const subjectName of formData.subjects) {
            try {
              // Find the subject document
              const subjectsQuery = query(
                collection(db, 'subjects'), 
                where('name', '==', subjectName)
              );
              const subjectsSnapshot = await getDocs(subjectsQuery);
              
              if (!subjectsSnapshot.empty) {
                const subjectDoc = subjectsSnapshot.docs[0];
                const subjectData = subjectDoc.data();
                const currentTeachers = subjectData.assignedTeachers || [];
                
                // Add this teacher if not already assigned
                if (!currentTeachers.includes(user.id)) {
                  const updatedTeachers = [...currentTeachers, user.id];
                  
                  await updateDoc(doc(db, 'subjects', subjectDoc.id), {
                    assignedTeachers: updatedTeachers,
                    updatedAt: new Date()
                  });
                  
                  console.log(`Added teacher to ${subjectName}`);
                }
              }
            } catch (error) {
              console.error(`Error updating subject ${subjectName}:`, error);
            }
          }
        }

        // Log activity
        await addDoc(collection(db, 'activityLog'), {
          action: 'user_updated',
          userId: user.id,
          userName: formData.name,
          description: `User ${formData.name} updated (${formData.roles.join(', ')})`,
          performedBy: 'Admin',
          timestamp: new Date().toISOString(),
          severity: 'low'
        });

        alert(`User Updated Successfully!\n\nName: ${formData.name}\nRoles: ${formData.roles.join(', ')}\nSubjects: ${formData.subjects.join(', ')}`);
        
      } else {
        // CREATE new user
        console.log('CREATING new user');
        const defaultPassword = 'password123';

        // Create user account with secondary Firebase app
        const userCredential = await createUserWithEmailAndPassword(
          secondaryAuth,
          formData.email,
          defaultPassword
        );

        const newUser = userCredential.user;

        // Update user profile
        await updateProfile(newUser, {
          displayName: formData.name
        });

        // Create user document in Firestore
        const secondaryDb = getFirestore(secondaryApp);
        
        const userData = {
          uid: newUser.uid,
          email: formData.email,
          name: formData.name.trim(),
          roles: formData.roles,
          subjects: formData.subjects,
          userType: formData.userType,
          status: formData.status,
          firstLoginCompleted: false,
          passwordChanged: false,
          mustChangePassword: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastLogin: null
        };

        // Use the secondary app's Firestore instance
        await setDoc(doc(secondaryDb, 'users', newUser.uid), userData);

        // SYNC: Update subject documents with assigned teacher
        if (formData.subjects.length > 0) {
          console.log('Syncing subject documents...');
          
          for (const subjectName of formData.subjects) {
            try {
              console.log(`Adding teacher ${newUser.uid} to subject ${subjectName}`);
              
              // Find the subject document
              const subjectsQuery = query(
                collection(db, 'subjects'), 
                where('name', '==', subjectName)
              );
              const subjectsSnapshot = await getDocs(subjectsQuery);
              
              if (!subjectsSnapshot.empty) {
                const subjectDoc = subjectsSnapshot.docs[0];
                const subjectData = subjectDoc.data();
                const currentTeachers = subjectData.assignedTeachers || [];
                
                // Add this teacher if not already assigned
                if (!currentTeachers.includes(newUser.uid)) {
                  const updatedTeachers = [...currentTeachers, newUser.uid];
                  
                  await updateDoc(doc(db, 'subjects', subjectDoc.id), {
                    assignedTeachers: updatedTeachers,
                    updatedAt: new Date()
                  });
                  
                  console.log(`Added teacher to ${subjectName}`);
                }
              } else {
                console.log(`Subject ${subjectName} not found in database`);
              }
            } catch (error) {
              console.error(`Error updating subject ${subjectName}:`, error);
            }
          }
        }

        // Sign out from secondary app
        await signOut(secondaryAuth);

        alert(`User Created Successfully!\n\nEmail: ${formData.email}\nPassword: ${defaultPassword}\nRoles: ${formData.roles.join(', ')}\nSubjects: ${formData.subjects.join(', ')}\n\nUser must change password on first login.`);
      }
      
      // Reset form and close
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error saving user:', error);
      if (error.code === 'auth/email-already-in-use') {
        setErrors({ email: 'This email is already registered' });
      } else if (error.code === 'auth/weak-password') {
        setErrors({ submit: 'Password should be at least 6 characters' });
      } else if (error.code === 'auth/invalid-email') {
        setErrors({ email: 'Invalid email address' });
      } else {
        setErrors({ submit: 'Failed to save user account: ' + error.message });
      }
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  // Generate modal title
  const modalTitle = isEdit 
    ? `Edit User: ${user?.name || 'Unknown'}` 
    : 'Add New User';

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header bg-success text-white">
            <h5 className="modal-title">
              <i className={`bi bi-${isEdit ? 'pencil' : 'person-badge'} me-2`}></i>
              {modalTitle}
            </h5>
            <button 
              type="button" 
              className="btn-close btn-close-white" 
              onClick={onClose}
              disabled={loading}
            ></button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {errors.submit && (
                <div className="alert alert-danger">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  {errors.submit}
                </div>
              )}

              {/* NEW: Edit Mode Banner with Password Reset */}
              {isEdit && (
                <div className="alert alert-info d-flex justify-content-between align-items-center py-2 mb-3">
                  <div>
                    <small>
                      <i className="bi bi-info-circle me-1"></i>
                      <strong>Edit Mode:</strong> You can update user information and roles. Email cannot be changed for security.
                    </small>
                  </div>
                  <button 
                    type="button" 
                    className="btn btn-warning btn-sm"
                    onClick={handlePasswordReset}
                    disabled={loading}
                  >
                    <i className="bi bi-key me-1"></i>
                    Reset Password
                  </button>
                </div>
              )}

              {/* Basic Information */}
              <div className="mb-4">
                <h6 className="text-muted mb-3 border-bottom pb-2">Basic Information</h6>
                
                <div className="mb-3">
                  <label className="form-label">
                    Full Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Ms. Sarah Johnson"
                    disabled={loading}
                  />
                  {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                </div>

                <div className="mb-3">
                  <label className="form-label">
                    Email Address <span className="text-danger">*</span>
                  </label>
                  <input
                    type="email"
                    className={`form-control ${errors.email ? 'is-invalid' : (isEdit ? 'bg-light' : '')}`}
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="user@school.com"
                    disabled={loading || isEdit} // NEW: Disable email in edit mode
                    readOnly={isEdit}
                  />
                  {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                  <small className="text-muted">
                    {isEdit ? 'Email cannot be changed for security reasons' : 'This will be used for login'}
                  </small>
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label">
                      User Type <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      name="userType"
                      value={formData.userType}
                      onChange={handleInputChange}
                      disabled={loading}
                    >
                      <option value="teacher">Teacher</option>
                      <option value="admin">Administrator</option>
                      <option value="staff">Staff Member</option>
                    </select>
                  </div>

                  {/* NEW: Status field for edit mode */}
                  {isEdit && (
                    <div className="col-md-6">
                      <label className="form-label">
                        Status
                      </label>
                      <select
                        className="form-select"
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        disabled={loading}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="suspended">Suspended</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* User Roles */}
              <div className="mb-4">
                <h6 className="text-muted mb-3 border-bottom pb-2">User Roles</h6>
                
                <div className={`border rounded p-3 ${errors.roles ? 'border-danger' : ''}`}>
                  <div className="row g-3">
                    <div className="col-md-4">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="roleAdmin"
                          checked={formData.roles.includes('admin')}
                          onChange={() => handleRoleToggle('admin')}
                          disabled={loading}
                        />
                        <label className="form-check-label" htmlFor="roleAdmin">
                          <span className="badge bg-danger me-2">ADMIN</span>
                          Administrator
                          <br />
                          <small className="text-muted">Full system access</small>
                        </label>
                      </div>
                    </div>

                    <div className="col-md-4">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="roleHomeroom"
                          checked={formData.roles.includes('homeroom')}
                          onChange={() => handleRoleToggle('homeroom')}
                          disabled={loading}
                        />
                        <label className="form-check-label" htmlFor="roleHomeroom">
                          <span className="badge bg-warning text-dark me-2">HOMEROOM</span>
                          Homeroom Teacher
                          <br />
                          <small className="text-muted">Class management, homeroom attendance</small>
                        </label>
                      </div>
                    </div>

                    <div className="col-md-4">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="roleSubject"
                          checked={formData.roles.includes('subject')}
                          onChange={() => handleRoleToggle('subject')}
                          disabled={loading}
                        />
                        <label className="form-check-label" htmlFor="roleSubject">
                          <span className="badge bg-primary me-2">SUBJECT</span>
                          Subject Teacher
                          <br />
                          <small className="text-muted">Subject-specific teaching and attendance</small>
                        </label>
                      </div>
                    </div>

                    <div className="col-md-4">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="roleSupervisor"
                          checked={formData.roles.includes('supervisor')}
                          onChange={() => handleRoleToggle('supervisor')}
                          disabled={loading}
                        />
                        <label className="form-check-label" htmlFor="roleSupervisor">
                          <span className="badge bg-info me-2">SUPER</span>
                          Supervisor
                          <br />
                          <small className="text-muted">View-only access</small>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                {errors.roles && (
                  <div className="text-danger mt-1">
                    <small>{errors.roles}</small>
                  </div>
                )}
                <small className="text-muted">Users can have multiple roles</small>
              </div>

              {/* Subject Assignment Section */}
              {formData.roles.includes('subject') && (
                <div className="mb-4">
                  <h6 className="text-muted mb-3 border-bottom pb-2">Subject Assignment</h6>
                  
                  {availableSubjects.length > 0 ? (
                    <div className={`border rounded p-3 ${errors.subjects ? 'border-danger' : ''}`} style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      <div className="row g-2">
                        {availableSubjects.map(subject => (
                          <div key={subject.id} className="col-md-6">
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id={`subject-${subject.id}`}
                                checked={formData.subjects.includes(subject.name)}
                                onChange={() => handleSubjectToggle(subject.name)}
                                disabled={loading}
                              />
                              <label className="form-check-label" htmlFor={`subject-${subject.id}`}>
                                <span 
                                  className="badge me-2" 
                                  style={{ backgroundColor: subject.color, color: 'white' }}
                                >
                                  {subject.code}
                                </span>
                                {subject.name}
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="alert alert-warning">
                      <i className="bi bi-exclamation-triangle me-2"></i>
                      <strong>No subjects available!</strong><br/>
                      <small>
                        Add subjects first in the "Subjects" tab before assigning them to teachers.
                        You can still create this user account and assign subjects later.
                      </small>
                    </div>
                  )}
                  
                  {errors.subjects && (
                    <div className="text-danger mt-1">
                      <small>{errors.subjects}</small>
                    </div>
                  )}
                  
                  {formData.subjects.length > 0 && (
                    <small className="text-muted">
                      Selected subjects: {formData.subjects.join(', ')}
                    </small>
                  )}
                </div>
              )}

              {/* Password Info - Only show in create mode */}
              {!isEdit && (
                <div className="alert alert-info">
                  <h6 className="alert-heading">
                    <i className="bi bi-key me-2"></i>
                    Default Login Credentials
                  </h6>
                  <div className="row">
                    <div className="col-md-6">
                      <small>
                        <strong>Email:</strong> {formData.email || 'Will be as entered'}<br/>
                        <strong>Password:</strong> password123
                      </small>
                    </div>
                    <div className="col-md-6">
                      <small>
                        <strong>Status:</strong> Must change password on first login<br/>
                        <strong>Access:</strong> Based on selected roles
                      </small>
                    </div>
                  </div>
                </div>
              )}

              {/* User Summary */}
              {(formData.name || formData.email || formData.roles.length > 0) && (
                <div className="alert alert-success">
                  <h6 className="alert-heading">User Summary</h6>
                  <small>
                    <strong>Name:</strong> {formData.name || 'Not set'}<br/>
                    <strong>Email:</strong> {formData.email || 'Not set'}<br/>
                    <strong>Type:</strong> {formData.userType}<br/>
                    <strong>Status:</strong> {formData.status}<br/>
                    <strong>Roles:</strong> {formData.roles.length > 0 ? formData.roles.join(', ') : 'None selected'}<br/>
                    {formData.subjects.length > 0 && (
                      <><strong>Subjects:</strong> {formData.subjects.join(', ')}<br/></>
                    )}
                    <strong>Mode:</strong> {isEdit ? 'Editing existing user' : 'Creating new user'}
                  </small>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-success" 
                disabled={loading || !formData.name || !formData.email || formData.roles.length === 0}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    {isEdit ? 'Updating & Syncing...' : 'Creating & Syncing...'}
                  </>
                ) : (
                  <>
                    <i className={`bi bi-${isEdit ? 'check-lg' : 'person-plus'} me-2`}></i>
                    {isEdit ? 'Update User' : 'Create User'}
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

export default UserModal;