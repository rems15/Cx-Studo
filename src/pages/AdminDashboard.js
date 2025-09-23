import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

// Import database functions
import { 
  setupUsersListener, 
  setupSectionsListener, 
  setupStudentsListener, 
  setupSubjectsListener,
  deleteTeacher,
  deleteStudent,
  toggleTeacherStatus,
  resetTeacherPassword,
  logActivity
} from '../services/database';

// Import Firebase functions for password reset and delete operations
import { doc, updateDoc, deleteDoc, addDoc, collection } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../services/firebase';

// Import modals
import StudentModal from '../components/admin/StudentModal';
import UserModal from '../components/admin/UserModal';
import SubjectModal from '../components/admin/SubjectModal';
import SectionModal from '../components/admin/SectionModal';

// Import management views
import StudentsView from '../components/admin/StudentView';
import UsersView from '../components/admin/UsersView';
import SubjectsView from '../components/admin/SubjectsView';
import SectionView from '../components/admin/SectionView';

function AdminDashboard({ onLogout, currentUser }) {
  // Navigation state
  const [activeTab, setActiveTab] = useState('overview');

  // Modal states
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  
  // Edit states
  const [selectedItem, setSelectedItem] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Data states
  const [students, setStudents] = useState([]);
  const [users, setUsers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [sections, setSections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Setup real-time listeners
  useEffect(() => {
    const unsubscribers = [];
    
    unsubscribers.push(setupUsersListener(setUsers));
    unsubscribers.push(setupSectionsListener(setSections));
    unsubscribers.push(setupStudentsListener(setStudents));
    unsubscribers.push(setupSubjectsListener(setSubjects));
    
    setIsLoading(false);
    
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, []);

  // Handler functions
  const handleAddStudent = () => {
    setSelectedItem(null);
    setIsEditMode(false);
    setShowStudentModal(true);
  };

  const handleAddUser = () => {
    setSelectedItem(null);
    setIsEditMode(false);
    setShowUserModal(true);
  };

  const handleAddSubject = () => {
    setSelectedItem(null);
    setIsEditMode(false);
    setShowSubjectModal(true);
  };

  const handleAddSection = () => {
    setSelectedItem(null);
    setIsEditMode(false);
    setShowSectionModal(true);
  };

  const handleEditStudent = (student) => {
    setSelectedItem(student);
    setIsEditMode(true);
    setShowStudentModal(true);
  };

  const handleEditUser = (user) => {
    setSelectedItem(user);
    setIsEditMode(true);
    setShowUserModal(true);
  };

  const handleEditSubject = (subject) => {
    setSelectedItem(subject);
    setIsEditMode(true);
    setShowSubjectModal(true);
  };

  const handleEditSection = (section) => {
    setSelectedItem(section);
    setIsEditMode(true);
    setShowSectionModal(true);
  };

  // UPDATED: Fixed password reset function
  const handleResetUserPassword = async (user) => {
    // Check if the user has a real email
    const hasRealEmail = user.email && !user.email.includes('@school.com') && !user.email.includes('fake');
    
    if (!hasRealEmail) {
      // For fake emails, show manual reset instructions
      const tempPassword = 'password123'; // Fixed password instead of random
      
      const result = window.confirm(
        `Cannot send email to fake address: ${user.email}\n\n` +
        `Manual Password Reset Required:\n` +
        `1. Contact user directly\n` +
        `2. Provide temporary password: ${tempPassword}\n` +
        `3. User must change password on next login\n\n` +
        `Record this reset?`
      );

      if (result) {
        try {
          // Update Firestore to track the reset
          await updateDoc(doc(db, 'users', user.id), {
            mustChangePassword: true,
            temporaryPassword: tempPassword,
            passwordResetAt: new Date().toISOString(),
            passwordResetBy: currentUser.name,
            resetMethod: 'manual_admin',
            updatedAt: new Date().toISOString()
          });

          // Log the activity
          await addDoc(collection(db, 'activityLog'), {
            action: 'manual_password_reset',
            description: `Manual password reset for ${user.name} by admin`,
            performedBy: currentUser.name || currentUser.email,
            userId: user.id,
            userName: user.name,
            timestamp: new Date().toISOString(),
            severity: 'medium'
          });

          alert(
            `Password Reset Recorded\n\n` +
            `User: ${user.name}\n` +
            `Temporary Password: ${tempPassword}\n\n` +
            `Please provide this to the user securely.`
          );
        } catch (error) {
          console.error('Error recording password reset:', error);
          alert('Failed to record password reset. Please try again.');
        }
      }
      return;
    }

    // For real emails, use Firebase's built-in reset
    const confirmReset = window.confirm(
      `Send password reset email to ${user.name}?\n\n` +
      `This will send a reset link to: ${user.email}\n` +
      `The user will need to check their email and follow the link to set a new password.\n\n` +
      `Continue?`
    );

    if (!confirmReset) return;

    try {
      await sendPasswordResetEmail(auth, user.email);
      
      // Update metadata in Firestore
      await updateDoc(doc(db, 'users', user.id), {
        passwordResetEmailSentAt: new Date().toISOString(),
        passwordResetBy: currentUser.name || currentUser.email,
        updatedAt: new Date().toISOString()
      });

      await addDoc(collection(db, 'activityLog'), {
        action: 'password_reset_email_sent',
        description: `Password reset email sent to ${user.name} by admin`,
        performedBy: currentUser.name || currentUser.email,
        userId: user.id,
        userName: user.name,
        timestamp: new Date().toISOString(),
        severity: 'medium'
      });

      alert(
        `Password Reset Email Sent!\n\n` +
        `User: ${user.name}\n` +
        `Email: ${user.email}\n\n` +
        `The user will receive an email with instructions to reset their password.`
      );

    } catch (error) {
      console.error('Error sending password reset email:', error);
      alert('Failed to send password reset email. Please try again.');
    }
  };

  const handleDeleteStudent = async (studentId, studentName) => {
    if (window.confirm(`Delete student ${studentName}?\n\nThis action cannot be undone.`)) {
      try {
        await deleteStudent(studentId);
        await logActivity('student_deleted', `Student ${studentName} deleted by admin`, currentUser?.name || 'Admin');
        alert('Student deleted successfully!');
      } catch (error) {
        console.error('Error deleting student:', error);
        alert('Error deleting student. Please try again.');
      }
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (window.confirm(`Delete user ${userName}?\n\nThis action cannot be undone.`)) {
      try {
        await deleteTeacher(userId);
        await logActivity('user_deleted', `User ${userName} deleted by admin`, currentUser?.name || 'Admin');
        alert('User deleted successfully!');
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Error deleting user. Please try again.');
      }
    }
  };

  const handleDeleteSubject = async (subjectId, subjectName) => {
    if (window.confirm(`Delete subject ${subjectName}?\n\nThis will remove it from all students and teachers.`)) {
      try {
        await deleteDoc(doc(db, 'subjects', subjectId));
        await logActivity('subject_deleted', `Subject ${subjectName} deleted by admin`, currentUser?.name || 'Admin');
        alert('Subject deleted successfully!');
      } catch (error) {
        console.error('Error deleting subject:', error);
        alert('Error deleting subject. Please try again.');
      }
    }
  };

  const handleDeleteSection = async (sectionId, sectionName) => {
    if (window.confirm(`Delete section ${sectionName}?\n\nStudents in this section will need to be reassigned.`)) {
      try {
        await deleteDoc(doc(db, 'sections', sectionId));
        await logActivity('section_deleted', `Section ${sectionName} deleted by admin`, currentUser?.name || 'Admin');
        alert('Section deleted successfully!');
      } catch (error) {
        console.error('Error deleting section:', error);
        alert('Error deleting section. Please try again.');
      }
    }
  };

  const handleCloseModals = () => {
    setShowStudentModal(false);
    setShowUserModal(false);
    setShowSubjectModal(false);
    setShowSectionModal(false);
    setSelectedItem(null);
    setIsEditMode(false);
  };

  const handleSubjectAdded = () => {
    console.log('Subject operation completed successfully!');
    setShowSubjectModal(false);
    setSelectedItem(null);
    setIsEditMode(false);
  };

  // Vertical sidebar component
  const renderVerticalSidebar = () => (
    <div className="d-flex flex-column bg-white border-end" style={{ width: '80px', minHeight: '100vh' }}>
      {/* Logo/Brand at top */}
      <div className="p-3 text-center border-bottom">
        <div className="bg-primary rounded d-flex align-items-center justify-content-center" 
             style={{ width: '40px', height: '40px', margin: '0 auto' }}>
          <i className="bi bi-mortarboard text-white fs-5"></i>
        </div>
      </div>

      {/* Navigation Icons */}
      <nav className="flex-grow-1 py-3">
        <div className="d-flex flex-column align-items-center gap-2">
          {/* Overview */}
          <button
            className={`btn btn-sm border-0 rounded-3 d-flex align-items-center justify-content-center ${
              activeTab === 'overview' ? 'btn-primary text-white' : 'btn-light text-muted'
            }`}
            style={{ width: '50px', height: '50px' }}
            onClick={() => setActiveTab('overview')}
            title="Overview"
          >
            <i className="bi bi-house fs-5"></i>
          </button>

          {/* Students */}
          <button
            className={`btn btn-sm border-0 rounded-3 d-flex align-items-center justify-content-center ${
              activeTab === 'students' ? 'btn-primary text-white' : 'btn-light text-muted'
            }`}
            style={{ width: '50px', height: '50px' }}
            onClick={() => setActiveTab('students')}
            title="Students"
          >
            <i className="bi bi-people fs-5"></i>
          </button>

          {/* Users */}
          <button
            className={`btn btn-sm border-0 rounded-3 d-flex align-items-center justify-content-center ${
              activeTab === 'users' ? 'btn-success text-white' : 'btn-light text-muted'
            }`}
            style={{ width: '50px', height: '50px' }}
            onClick={() => setActiveTab('users')}
            title="Users"
          >
            <i className="bi bi-person-badge fs-5"></i>
          </button>

          {/* Subjects */}
          <button
            className={`btn btn-sm border-0 rounded-3 d-flex align-items-center justify-content-center ${
              activeTab === 'subjects' ? 'btn-warning text-white' : 'btn-light text-muted'
            }`}
            style={{ width: '50px', height: '50px' }}
            onClick={() => setActiveTab('subjects')}
            title="Subjects"
          >
            <i className="bi bi-book fs-5"></i>
          </button>

          {/* Sections */}
          <button
            className={`btn btn-sm border-0 rounded-3 d-flex align-items-center justify-content-center ${
              activeTab === 'sections' ? 'btn-info text-white' : 'btn-light text-muted'
            }`}
            style={{ width: '50px', height: '50px' }}
            onClick={() => setActiveTab('sections')}
            title="Sections"
          >
            <i className="bi bi-grid-3x3-gap fs-5"></i>
          </button>

          {/* Attendance */}
          <button
            className={`btn btn-sm border-0 rounded-3 d-flex align-items-center justify-content-center ${
              activeTab === 'attendance' ? 'btn-success text-white' : 'btn-light text-muted'
            }`}
            style={{ width: '50px', height: '50px' }}
            onClick={() => setActiveTab('attendance')}
            title="Attendance"
          >
            <i className="bi bi-clipboard-check fs-5"></i>
          </button>

          {/* Reports */}
          <button
            className={`btn btn-sm border-0 rounded-3 d-flex align-items-center justify-content-center ${
              activeTab === 'reports' ? 'btn-secondary text-white' : 'btn-light text-muted'
            }`}
            style={{ width: '50px', height: '50px' }}
            onClick={() => setActiveTab('reports')}
            title="Reports"
          >
            <i className="bi bi-file-text fs-5"></i>
          </button>
        </div>
      </nav>

      {/* User info at bottom */}
      <div className="border-top p-2">
        <div className="dropdown">
          <button 
            className="btn btn-light w-100 d-flex flex-column align-items-center text-decoration-none border-0 py-2"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            <div className="bg-secondary rounded-circle d-flex align-items-center justify-content-center mb-1" 
                 style={{ width: '32px', height: '32px' }}>
              <i className="bi bi-person text-white"></i>
            </div>
            <small className="text-muted" style={{ fontSize: '0.7rem', lineHeight: '1' }}>
              {currentUser?.name?.split(' ')[0] || 'Admin'}
            </small>
          </button>
          <ul className="dropdown-menu dropdown-menu-end">
            <li><h6 className="dropdown-header">Account</h6></li>
            <li><a className="dropdown-item" href="#"><i className="bi bi-person me-2"></i>Profile</a></li>
            <li><a className="dropdown-item" href="#"><i className="bi bi-gear me-2"></i>Settings</a></li>
            <li><hr className="dropdown-divider"></hr></li>
            <li>
              <button className="dropdown-item text-danger" onClick={onLogout}>
                <i className="bi bi-box-arrow-right me-2"></i>Sign out
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );

// Updated renderOverview function for AdminDashboard.js
// This fixes the sections display to work with the new schema

const renderOverview = () => (
  <div>
    {/* Statistics Cards Row */}
    <div className="row g-3 mb-4">
      <div className="col-md-3">
        <div className="card border-0 text-white" style={{ backgroundColor: '#4285f4' }}>
          <div className="card-body text-center py-4">
            <h2 className="mb-1">{students.length}</h2>
            <p className="mb-0">Students</p>
          </div>
        </div>
      </div>
      <div className="col-md-3">
        <div className="card border-0 text-white" style={{ backgroundColor: '#34a853' }}>
          <div className="card-body text-center py-4">
            <h2 className="mb-1">{users.length}</h2>
            <p className="mb-0">Users</p>
          </div>
        </div>
      </div>
      <div className="col-md-3">
        <div className="card border-0 text-white" style={{ backgroundColor: '#fbbc04' }}>
          <div className="card-body text-center py-4">
            <h2 className="mb-1">{subjects.length}</h2>
            <p className="mb-0">Subjects</p>
          </div>
        </div>
      </div>
      <div className="col-md-3">
        <div className="card border-0 text-white" style={{ backgroundColor: '#1aa8e8' }}>
          <div className="card-body text-center py-4">
            <h2 className="mb-1">{sections.length}</h2>
            <p className="mb-0">Sections</p>
          </div>
        </div>
      </div>
    </div>

    {/* Action Cards Row */}
    <div className="row g-3 mb-4">
      <div className="col-md-3">
        <div className="card border-0 text-white" style={{ backgroundColor: '#4285f4' }}>
          <div className="card-body text-center py-3">
            <i className="bi bi-person-plus fs-3 mb-2"></i>
            <h6 className="mb-2">Add Student</h6>
            <button className="btn btn-light btn-sm" onClick={handleAddStudent}>
              <i className="bi bi-plus me-1"></i>Add
            </button>
          </div>
        </div>
      </div>
      <div className="col-md-3">
        <div className="card border-0 text-white" style={{ backgroundColor: '#34a853' }}>
          <div className="card-body text-center py-3">
            <i className="bi bi-person-badge fs-3 mb-2"></i>
            <h6 className="mb-2">Add User</h6>
            <button className="btn btn-light btn-sm" onClick={handleAddUser}>
              <i className="bi bi-plus me-1"></i>Add
            </button>
          </div>
        </div>
      </div>
      <div className="col-md-3">
        <div className="card border-0 text-white" style={{ backgroundColor: '#fbbc04' }}>
          <div className="card-body text-center py-3">
            <i className="bi bi-book fs-3 mb-2"></i>
            <h6 className="mb-2">Add Subject</h6>
            <button className="btn btn-light btn-sm" onClick={handleAddSubject}>
              <i className="bi bi-plus me-1"></i>Add
            </button>
          </div>
        </div>
      </div>
      <div className="col-md-3">
        <div className="card border-0 text-white" style={{ backgroundColor: '#1aa8e8' }}>
          <div className="card-body text-center py-3">
            <i className="bi bi-grid fs-3 mb-2"></i>
            <h6 className="mb-2">Add Section</h6>
            <button className="btn btn-light btn-sm" onClick={handleAddSection}>
              <i className="bi bi-plus me-1"></i>Add
            </button>
          </div>
        </div>
      </div>
    </div>

    <div className="row g-3">
      {/* Recent Students */}
      <div className="col-md-6">
        <div className="card">
          <div className="card-header bg-white d-flex justify-content-between align-items-center">
            <h6 className="mb-0">Recent Students ({students.length})</h6>
            <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('students')}>
              <i className="bi bi-plus me-1"></i>Add
            </button>
          </div>
          <div className="card-body p-0">
            {students.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Name</th>
                      <th>Section</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.slice(0, 4).map((student) => (
                      <tr key={student.id}>
                        <td>
                          <div className="fw-medium">{student.name}</div>
                          <small className="text-muted">{student.studentId}</small>
                        </td>
                        <td>
                          <span className="badge bg-primary">{student.section}</span>
                        </td>
                        <td>
                          <div className="btn-group btn-group-sm">
                            <button className="btn btn-outline-primary" onClick={() => handleEditStudent(student)}>
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button className="btn btn-outline-info">
                              <i className="bi bi-eye"></i>
                            </button>
                            <button className="btn btn-outline-danger" onClick={() => handleDeleteStudent(student.id, student.name)}>
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-4">
                <i className="bi bi-people fs-3 text-muted"></i>
                <p className="text-muted mb-2">No students yet</p>
                <button className="btn btn-primary btn-sm" onClick={handleAddStudent}>
                  Add First Student
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Users */}
      <div className="col-md-6">
        <div className="card">
          <div className="card-header bg-white d-flex justify-content-between align-items-center">
            <h6 className="mb-0">Recent Users ({users.length})</h6>
            <button className="btn btn-success btn-sm" onClick={() => setActiveTab('users')}>
              <i className="bi bi-plus me-1"></i>Add
            </button>
          </div>
          <div className="card-body p-0">
            {users.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Roles</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.slice(0, 4).map((user) => (
                      <tr key={user.id}>
                        <td>
                          <div className="fw-medium">{user.name}</div>
                        </td>
                        <td>
                          <small className="text-muted">{user.email}</small>
                        </td>
                        <td>
                          <div>
                            {user.roles?.map((role, index) => (
                              <span key={index} className={`badge me-1 ${
                                role === 'admin' ? 'bg-danger' : 
                                role === 'supervisor' ? 'bg-secondary' : 
                                role === 'homeroom' ? 'bg-info' : 'bg-warning'
                              }`}>
                                {role}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <div className="btn-group btn-group-sm">
                            <button className="btn btn-outline-primary" onClick={() => handleEditUser(user)}>
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button className="btn btn-outline-warning">
                              <i className="bi bi-key"></i>
                            </button>
                            <button className="btn btn-outline-danger" onClick={() => handleDeleteUser(user.id, user.name)}>
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-4">
                <i className="bi bi-person-badge fs-3 text-muted"></i>
                <p className="text-muted mb-2">No users yet</p>
                <button className="btn btn-success btn-sm" onClick={handleAddUser}>
                  Add First User
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Subjects */}
      <div className="col-md-6">
        <div className="card">
          <div className="card-header bg-white d-flex justify-content-between align-items-center">
            <h6 className="mb-0">Recent Subjects ({subjects.length})</h6>
            <button className="btn btn-warning btn-sm" onClick={() => setActiveTab('subjects')}>
              <i className="bi bi-plus me-1"></i>Add
            </button>
          </div>
          <div className="card-body p-0">
            {subjects.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Subject</th>
                      <th>Code</th>
                      <th>Room</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.slice(0, 5).map((subject) => (
                      <tr key={subject.id}>
                        <td>
                          <div className="d-flex align-items-center">
                            <span className={`badge ${subject.code === 'MATSP1' ? 'bg-success' : 'bg-primary'} me-2`}>
                              {subject.code}
                            </span>
                            <div className="fw-medium">{subject.name}</div>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${subject.code === 'MATSP1' ? 'bg-success' : 'bg-primary'}`}>
                            {subject.code}
                          </span>
                        </td>
                        <td>
                          <small className="text-muted">{subject.room || 'TBA'}</small>
                        </td>
                        <td>
                          <div className="btn-group btn-group-sm">
                            <button className="btn btn-outline-primary" onClick={() => handleEditSubject(subject)}>
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button className="btn btn-outline-danger" onClick={() => handleDeleteSubject(subject.id, subject.name)}>
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-4">
                <i className="bi bi-book fs-3 text-muted"></i>
                <p className="text-muted mb-2">No subjects yet</p>
                <button className="btn btn-warning btn-sm" onClick={handleAddSubject}>
                  Add First Subject
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Sections - FIXED FOR NEW SCHEMA */}
      <div className="col-md-6">
        <div className="card">
          <div className="card-header bg-white d-flex justify-content-between align-items-center">
            <h6 className="mb-0">Recent Sections ({sections.length})</h6>
            <button className="btn btn-info btn-sm" onClick={() => setActiveTab('sections')}>
              <i className="bi bi-plus me-1"></i>Add
            </button>
          </div>
          <div className="card-body p-0">
            {sections.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Section</th>
                      <th>Capacity</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sections.slice(0, 5).map((section) => {
                      // Construct section name from new schema
                    const sectionName = section.name || 
                    (section.year && section.section ? `${section.year}-${section.section}` : 
                    section.section || 'Unknown Section');
                                        
                      return (
                        <tr key={section.id}>
                          <td>
                            <div className="fw-medium">{sectionName}</div>
                          </td>
                          <td>
                            <small className="text-muted">
                              {section.currentEnrollment || 0}/{section.capacity || 0}
                            </small>
                            {section.capacity && (
                              <div className="progress mt-1" style={{ height: '3px' }}>
                                <div 
                                  className={`progress-bar ${
                                    (section.currentEnrollment / section.capacity) >= 0.9 ? 'bg-danger' :
                                    (section.currentEnrollment / section.capacity) >= 0.7 ? 'bg-warning' : 'bg-success'
                                  }`}
                                  style={{ 
                                    width: `${Math.min(100, (section.currentEnrollment / section.capacity) * 100)}%` 
                                  }}
                                ></div>
                              </div>
                            )}
                          </td>
                          <td>
                            <span className={`badge ${
                              section.status === 'active' ? 'bg-success' : 'bg-secondary'
                            }`}>
                              {section.status || 'active'}
                            </span>
                          </td>
                          <td>
                            <div className="btn-group btn-group-sm">
                              <button className="btn btn-outline-primary" onClick={() => handleEditSection(section)}>
                                <i className="bi bi-pencil"></i>
                              </button>
                              <button className="btn btn-outline-info">
                                <i className="bi bi-eye"></i>
                              </button>
                              <button className="btn btn-outline-danger" onClick={() => handleDeleteSection(section.id, sectionName)}>
                                <i className="bi bi-trash"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-4">
                <i className="bi bi-grid fs-3 text-muted"></i>
                <p className="text-muted mb-2">No sections yet</p>
                <button className="btn btn-info btn-sm" onClick={handleAddSection}>
                  Add First Section
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Connected Status */}
    <div className="position-fixed bottom-0 end-0 m-3">
      <div className="badge bg-success">
        <i className="bi bi-wifi me-1"></i>
        Connected
      </div>
    </div>
  </div>
);

  // Placeholder render functions for other tabs
  const renderStudents = () => (
    <StudentsView
      students={students}
      sections={sections}
      subjects={subjects}
      onAddStudent={handleAddStudent}
      onEditStudent={handleEditStudent}
      onDeleteStudent={handleDeleteStudent}
      loading={isLoading}
    />
  );

  const renderUsers = () => (
    <UsersView
      users={users}
      subjects={subjects}
      onAddUser={handleAddUser}
      onEditUser={handleEditUser}
      onDeleteUser={handleDeleteUser}
      onResetPassword={handleResetUserPassword}
      loading={isLoading}
    />
  );

  const renderSubjects = () => (
    <SubjectsView
      subjects={subjects}
      onAddSubject={handleAddSubject}
      onEditSubject={handleEditSubject}
      onDeleteSubject={handleDeleteSubject}
      loading={isLoading}
    />
  );

  const renderSections = () => (
    <SectionView
      sections={sections}
      students={students}
      onAddSection={handleAddSection}
      onEditSection={handleEditSection}
      onDeleteSection={handleDeleteSection}
      loading={isLoading}
    />
  );

  const renderAttendance = () => (
    <div className="alert alert-info">
      <i className="bi bi-info-circle me-2"></i>
      Attendance management view - to be implemented in next step
    </div>
  );

  const renderReports = () => (
    <div className="alert alert-info">
      <i className="bi bi-info-circle me-2"></i>
      Reports view - to be implemented in next step
    </div>
  );

  // Main component return
  return (
    <div className="d-flex min-vh-100 bg-light">
      {/* Vertical Sidebar */}
      {renderVerticalSidebar()}

      {/* Main Content Area */}
      <div className="flex-grow-1">
        {/* Header */}
        <div className="bg-white border-bottom py-3 px-4">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h4 className="mb-0">
                {activeTab === 'overview' && 'Dashboard Overview'}
                {activeTab === 'students' && 'Students Management'}
                {activeTab === 'users' && 'Users Management'}
                {activeTab === 'subjects' && 'Subjects Management'}
                {activeTab === 'sections' && 'Sections Management'}
                {activeTab === 'attendance' && 'Attendance Management'}
                {activeTab === 'reports' && 'Reports & Analytics'}
              </h4>
              <nav aria-label="breadcrumb">
                <ol className="breadcrumb mb-0 small">
                  <li className="breadcrumb-item text-muted">Admin</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                  </li>
                </ol>
              </nav>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-4">
          {isLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary mb-3"></div>
              <h5>Loading dashboard...</h5>
              <p className="text-muted">Please wait while we fetch your data</p>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && renderOverview()}
              {activeTab === 'students' && renderStudents()}
              {activeTab === 'users' && renderUsers()}
              {activeTab === 'subjects' && renderSubjects()}
              {activeTab === 'sections' && renderSections()}
              {activeTab === 'attendance' && renderAttendance()}
              {activeTab === 'reports' && renderReports()}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {showStudentModal && (
        <StudentModal
          show={showStudentModal}
          onClose={handleCloseModals}
          sections={sections}
          student={selectedItem}
          isEdit={isEditMode}
          onSave={handleCloseModals}
        />
      )}

      {showUserModal && (
        <UserModal
          show={showUserModal}
          onClose={handleCloseModals}
          user={selectedItem}
          isEdit={isEditMode}
        />
      )}

      {showSubjectModal && (
        <SubjectModal
          isOpen={showSubjectModal}
          onClose={handleCloseModals}
          onSubjectSaved={handleSubjectAdded}
          subject={selectedItem}
        />
      )}

      {showSectionModal && (
        <SectionModal
          show={showSectionModal}
          onClose={handleCloseModals}
          section={selectedItem}
          isEdit={isEditMode}
        />
      )}
    </div>
  );
};

export default AdminDashboard;