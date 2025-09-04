import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

// Import database functions
import { 
  setupTeachersListener, 
  setupSectionsListener, 
  setupStudentsListener, 
  setupSubjectsListener,
  deleteTeacher,
  deleteStudent,
  toggleTeacherStatus,
  resetTeacherPassword,
  logActivity
} from '../services/database';

// Import modals (we'll create placeholders for now)
// import TeacherModal from '../components/admin/AddTeacherModal';

function AdminDashboard({ onLogout, currentUser }) {
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Data states
  const [teachers, setTeachers] = useState([]);
  const [sections, setSections] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Setup real-time listeners
  useEffect(() => {
    const unsubscribers = [];
    
    unsubscribers.push(setupTeachersListener(setTeachers));
    unsubscribers.push(setupSectionsListener(setSections));
    unsubscribers.push(setupStudentsListener(setStudents));
    unsubscribers.push(setupSubjectsListener(setSubjects));
    
    setIsLoading(false);
    
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, []);

  const handleDeleteTeacher = async (teacherId, teacherName) => {
    if (window.confirm(`Are you sure you want to delete ${teacherName}?`)) {
      try {
        await deleteTeacher(teacherId);
        await logActivity('teacher_deleted', `Teacher ${teacherName} deleted`, currentUser?.name || 'Admin', 'high');
        alert('Teacher deleted successfully!');
      } catch (error) {
        console.error('Error deleting teacher:', error);
        alert('Error deleting teacher. Please try again.');
      }
    }
  };

  const handleDeleteStudent = async (studentId, studentName) => {
    if (window.confirm(`Are you sure you want to delete ${studentName}?`)) {
      try {
        await deleteStudent(studentId);
        await logActivity('student_deleted', `Student ${studentName} deleted`, currentUser?.name || 'Admin', 'high');
        alert('Student deleted successfully!');
      } catch (error) {
        console.error('Error deleting student:', error);
        alert('Error deleting student. Please try again.');
      }
    }
  };

  const handleToggleTeacherStatus = async (teacherId, currentStatus, teacherName) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await toggleTeacherStatus(teacherId, newStatus);
      await logActivity('teacher_status_changed', `${teacherName} status changed to ${newStatus}`, currentUser?.name || 'Admin');
      alert(`Teacher ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`);
    } catch (error) {
      console.error('Error updating teacher status:', error);
      alert('Error updating teacher status. Please try again.');
    }
  };

  const handleResetPassword = async (teacher) => {
    if (window.confirm(`Reset password for ${teacher.name}? This will set their password to 'password123' and require them to change it on next login.`)) {
      try {
        await resetTeacherPassword(teacher.id, currentUser);
        await logActivity('teacher_password_reset', `Password reset for ${teacher.name}`, currentUser?.name || 'Admin');
        alert(`Password reset successful! New password: password123`);
      } catch (error) {
        console.error('Error resetting password:', error);
        alert('Error resetting password. Please try again.');
      }
    }
  };

  // Main Dashboard Page (shows both lists)
  const renderMainDashboard = () => (
    <div>
      {/* Quick Stats */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card bg-primary text-white">
            <div className="card-body text-center py-3">
              <h4>{teachers.filter(t => t.status === 'active').length}</h4>
              <small>Active Teachers</small>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-success text-white">
            <div className="card-body text-center py-3">
              <h4>{students.length}</h4>
              <small>Total Students</small>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-warning text-white">
            <div className="card-body text-center py-3">
              <h4>{sections.length}</h4>
              <small>Sections</small>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-info text-white">
            <div className="card-body text-center py-3">
              <h4>{subjects.filter(s => s.active !== false).length}</h4>
              <small>Active Subjects</small>
            </div>
          </div>
        </div>
      </div>

      {/* Students List */}
      <div className="card mb-4">
        <div className="card-header bg-white d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Students ({students.length})</h5>
          <button className="btn btn-success btn-sm">
            <i className="bi bi-plus me-1"></i>Add Student
          </button>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-3">Name</th>
                  <th>Student ID</th>
                  <th>Section</th>
                  <th>Email</th>
                  <th className="pe-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.slice(0, 10).map((student) => {
                  const studentSection = sections.find(s => s.id === student.sectionId);
                  return (
                    <tr key={student.id}>
                      <td className="ps-3">
                        <div className="fw-medium">{student.firstName} {student.lastName}</div>
                      </td>
                      <td>
                        <code className="text-primary">{student.studentId}</code>
                      </td>
                      <td>
                        <span className="badge bg-light text-dark">
                          {studentSection ? studentSection.name : 'Not assigned'}
                        </span>
                      </td>
                      <td>
                        <small className="text-muted">{student.email || 'N/A'}</small>
                      </td>
                      <td className="pe-3">
                        <div className="btn-group btn-group-sm">
                          <button className="btn btn-outline-info" title="View">
                            <i className="bi bi-eye"></i>
                          </button>
                          <button className="btn btn-outline-primary" title="Edit">
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button 
                            className="btn btn-outline-danger" 
                            title="Delete"
                            onClick={() => handleDeleteStudent(student.id, `${student.firstName} ${student.lastName}`)}
                          >
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
          {students.length > 10 && (
            <div className="card-footer text-center">
              <small className="text-muted">Showing 10 of {students.length} students</small>
            </div>
          )}
        </div>
      </div>

      {/* Teachers List */}
      <div className="card">
        <div className="card-header bg-white d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Teachers ({teachers.length})</h5>
          <button className="btn btn-primary btn-sm">
            <i className="bi bi-plus me-1"></i>Add Teacher
          </button>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-3">Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th className="pe-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((teacher) => (
                  <tr key={teacher.id}>
                    <td className="ps-3">
                      <div className="fw-medium">{teacher.name}</div>
                    </td>
                    <td>
                      <small className="text-muted">{teacher.email}</small>
                    </td>
                    <td>
                      <div>
                        {teacher.roles?.map(role => (
                          <span key={role} className={`badge me-1 ${
                            role === 'homeroom' ? 'bg-warning text-dark' : 'bg-info'
                          }`}>
                            {role === 'homeroom' ? 'Homeroom' : 'Subject'}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${
                        teacher.status === 'active' ? 'bg-success' : 'bg-secondary'
                      }`}>
                        {teacher.status || 'active'}
                      </span>
                    </td>
                    <td className="pe-3">
                      <div className="btn-group btn-group-sm">
                        <button className="btn btn-outline-primary" title="Edit">
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button 
                          className="btn btn-outline-warning" 
                          title="Reset Password"
                          onClick={() => handleResetPassword(teacher)}
                        >
                          <i className="bi bi-key"></i>
                        </button>
                        <button 
                          className={`btn ${teacher.status === 'active' ? 'btn-outline-warning' : 'btn-outline-success'}`}
                          title={teacher.status === 'active' ? 'Deactivate' : 'Activate'}
                          onClick={() => handleToggleTeacherStatus(teacher.id, teacher.status, teacher.name)}
                        >
                          <i className={`bi ${teacher.status === 'active' ? 'bi-pause' : 'bi-play'}`}></i>
                        </button>
                        <button 
                          className="btn btn-outline-danger" 
                          title="Delete"
                          onClick={() => handleDeleteTeacher(teacher.id, teacher.name)}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      {/* Sidebar */}
      <div className={`bg-dark text-white ${sidebarCollapsed ? '' : 'sidebar-expanded'}`} style={{
        width: sidebarCollapsed ? '60px' : '250px',
        transition: 'width 0.3s ease'
      }}>
        <div className="p-3">
          <div className="d-flex justify-content-between align-items-center">
            {!sidebarCollapsed && <h5 className="mb-0">Admin Panel</h5>}
            <button 
              className="btn btn-sm text-white"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              <i className={`bi bi-${sidebarCollapsed ? 'chevron-right' : 'chevron-left'}`}></i>
            </button>
          </div>
        </div>
        
        <nav className="nav flex-column px-2">
          <button
            className={`nav-link text-white text-start ${activePage === 'dashboard' ? 'bg-primary rounded' : ''}`}
            onClick={() => setActivePage('dashboard')}
          >
            <i className="bi bi-speedometer2 me-2"></i>
            {!sidebarCollapsed && 'Dashboard'}
          </button>
          
          <button
            className={`nav-link text-white text-start ${activePage === 'overview' ? 'bg-primary rounded' : ''}`}
            onClick={() => setActivePage('overview')}
          >
            <i className="bi bi-pie-chart me-2"></i>
            {!sidebarCollapsed && 'Overview'}
          </button>
          
          {!sidebarCollapsed && <small className="text-muted px-3 mt-2">MANAGEMENT</small>}
          
          <button
            className={`nav-link text-white text-start ${activePage === 'sections' ? 'bg-primary rounded' : ''}`}
            onClick={() => setActivePage('sections')}
          >
            <i className="bi bi-collection me-2"></i>
            {!sidebarCollapsed && 'Sections'}
          </button>
          
          <button
            className={`nav-link text-white text-start ${activePage === 'subjects' ? 'bg-primary rounded' : ''}`}
            onClick={() => setActivePage('subjects')}
          >
            <i className="bi bi-book me-2"></i>
            {!sidebarCollapsed && 'Subjects'}
          </button>
          
          <button
            className={`nav-link text-white text-start ${activePage === 'reports' ? 'bg-primary rounded' : ''}`}
            onClick={() => setActivePage('reports')}
          >
            <i className="bi bi-file-text me-2"></i>
            {!sidebarCollapsed && 'Reports'}
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-grow-1">
        {/* Header */}
        <div className="bg-white border-bottom shadow-sm">
          <div className="container-fluid py-3">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h4 className="mb-0">
                  {activePage === 'dashboard' && 'Dashboard'}
                  {activePage === 'overview' && 'Overview'}
                  {activePage === 'sections' && 'Sections Management'}
                  {activePage === 'subjects' && 'Subjects Management'}
                  {activePage === 'reports' && 'Reports'}
                </h4>
                <small className="text-muted">Welcome, {currentUser?.name || 'Admin'}</small>
              </div>
              <button className="btn btn-outline-secondary" onClick={onLogout}>
                <i className="bi bi-box-arrow-right me-1"></i>
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="container-fluid p-4">
          {isLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border" role="status"></div>
              <div className="mt-2">Loading...</div>
            </div>
          ) : (
            <>
              {activePage === 'dashboard' && renderMainDashboard()}
              {activePage === 'overview' && <div className="alert alert-info">Overview page - to be implemented</div>}
              {activePage === 'sections' && <div className="alert alert-info">Sections management - to be implemented</div>}
              {activePage === 'subjects' && <div className="alert alert-info">Subjects management - to be implemented</div>}
              {activePage === 'reports' && <div className="alert alert-info">Reports page - to be implemented</div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;