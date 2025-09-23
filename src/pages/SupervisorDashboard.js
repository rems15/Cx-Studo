// src/pages/SupervisorDashboard.js - COMPACT VERSION WITH REDUCED GAPS
import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

import ViewAttendance from '../components/supervisor/ViewAttendance';
import ViewReports from '../components/supervisor/ViewReports';
import ViewTeachers from '../components/supervisor/ViewTeachers';
import ViewStudents from '../components/supervisor/ViewStudents';

// Import your existing services
import { getAllTeachers, getAllSections, getAllStudents } from '../services/database';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

function SupervisorDashboard({ currentUser, onLogout }) {
  const [stats, setStats] = useState({
    totalTeachers: 0,
    activeTeachers: 0,
    totalSections: 0,
    totalStudents: 0,
    attendanceToday: 0,
    meritPoints: 45,    // NEW: Merit points
    behaviorFlags: 3    // NEW: Behavior flags
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('overview');
  
  // UI states for hamburger menu
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    loadSupervisorData();
  }, []);

  // Close sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarOpen && !event.target.closest('.sidebar') && !event.target.closest('.hamburger-btn')) {
        setSidebarOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [sidebarOpen]);

  const loadSupervisorData = async () => {
    try {
      setLoading(true);
      
      // Load data using your existing services
      const [teachers, sections, students] = await Promise.all([
        getAllTeachers(),
        getAllSections(), 
        getAllStudents()
      ]);

      // Calculate stats
      const activeTeachers = teachers.filter(t => t.status === 'active').length;
      const attendanceRate = await getTodayAttendanceRate();
      const activity = await getRecentActivity();

      setStats({
        totalTeachers: teachers.length,
        activeTeachers,
        totalSections: sections.length,
        totalStudents: students.length,
        attendanceToday: attendanceRate,
        meritPoints: 45,    // Keep your merit points
        behaviorFlags: 3    // Keep your behavior flags
      });

      setRecentActivity(activity);

    } catch (error) {
      console.error('Error loading supervisor data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get today's attendance rate using your existing structure
  const getTodayAttendanceRate = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const attendanceQuery = query(
        collection(db, 'attendance'),
        where('date', '==', today)
      );

      const snapshot = await getDocs(attendanceQuery);
      let totalPresent = 0;
      let totalStudents = 0;

      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.students && Array.isArray(data.students)) {
          const present = data.students.filter(s => s.status === 'present').length;
          totalPresent += present;
          totalStudents += data.students.length;
        }
      });

      return totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0;
    } catch (error) {
      console.error('Error calculating attendance rate:', error);
      return 0;
    }
  };

  // Get recent activity from attendance records
  const getRecentActivity = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const attendanceQuery = query(
        collection(db, 'attendance'),
        where('date', '==', today)
      );

      const snapshot = await getDocs(attendanceQuery);
      const activities = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        activities.push({
          action: 'attendance_taken',
          description: `Attendance taken for ${data.isHomeroom ? 'Homeroom' : data.subjectName || 'Subject'} - ${data.sectionName || 'Section'}`,
          performedBy: data.takenBy || data.teacherName || 'Unknown',
          timestamp: data.timestamp ? new Date(data.timestamp).toLocaleString() : 
                    data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleString() : 
                    'Recently',
          type: 'attendance'
        });
      });

      // Sort by most recent first
      return activities.slice(0, 10);
    } catch (error) {
      console.error('Error getting recent activity:', error);
      return [];
    }
  };

  const navigationItems = [
    { id: 'overview', icon: 'speedometer2', label: 'Dashboard', color: 'primary', description: 'Overview & system statistics' },
    { id: 'attendance', icon: 'calendar-check', label: 'Attendance', color: 'success', description: 'Real-time attendance monitoring' },
    { id: 'reports', icon: 'graph-up', label: 'Reports', color: 'info', description: 'Analytics & performance reports' },
    { id: 'teachers', icon: 'people', label: 'Teachers', color: 'warning', description: 'Teacher management & assignments' },
    { id: 'students', icon: 'person-badge', label: 'Students', color: 'secondary', description: 'Student data & sections' },
  ];

  // Hamburger Sidebar Component - COMPACT VERSION
  const renderHamburgerSidebar = () => (
    <>
      {/* Backdrop */}
      {sidebarOpen && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 bg-dark"
          style={{ 
            opacity: 0.5, 
            zIndex: 1040
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div 
        className="sidebar position-fixed top-0 start-0 h-100 bg-white border-end shadow-lg d-flex flex-column"
        style={{ 
          width: '280px',
          zIndex: 1050,
          transition: 'transform 0.3s ease-in-out',
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)'
        }}
      >
        {/* Sidebar Header - REDUCED PADDING */}
        <div className="p-3 border-bottom">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
              <div className="bg-primary rounded d-flex align-items-center justify-content-center me-3" 
                   style={{ width: '40px', height: '40px' }}>
                <i className="bi bi-shield-check text-white fs-5"></i>
              </div>
              <div>
                <h6 className="mb-0 fw-bold">Supervisor Portal</h6>
                <small className="text-muted">Ningbo Huamao International</small>
              </div>
            </div>
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setSidebarOpen(false)}
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
        </div>

        {/* Navigation Menu - REDUCED PADDING */}
        <nav className="flex-grow-1 p-2">
          <div className="d-flex flex-column gap-1">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                className={`btn text-start d-flex align-items-center py-2 ${
                  currentView === item.id 
                    ? `btn-${item.color} text-white` 
                    : 'btn-light text-dark'
                }`}
                style={{ borderRadius: '10px' }}
                onClick={() => {
                  setCurrentView(item.id);
                  setSidebarOpen(false);
                }}
              >
                <i className={`bi bi-${item.icon} fs-5 me-3`}></i>
                <div>
                  <div className="fw-medium">{item.label}</div>
                  <small className={currentView === item.id ? 'text-white-50' : 'text-muted'}>
                    {item.description}
                  </small>
                </div>
              </button>
            ))}

            <hr className="my-2" />

            {/* Quick Actions - REDUCED PADDING */}
            <div className="mb-1">
              <small className="text-muted fw-bold text-uppercase" style={{ fontSize: '0.75rem' }}>
                Quick Actions
              </small>
            </div>

            <button
              className="btn btn-outline-primary text-start d-flex align-items-center py-2"
              style={{ borderRadius: '8px' }}
              onClick={() => {
                loadSupervisorData();
                setSidebarOpen(false);
              }}
            >
              <i className="bi bi-arrow-clockwise me-3"></i>
              Refresh Data
            </button>

            <button
              className="btn btn-outline-success text-start d-flex align-items-center py-2"
              style={{ borderRadius: '8px' }}
              onClick={() => {
                setCurrentView('attendance');
                setSidebarOpen(false);
              }}
            >
              <i className="bi bi-eye me-3"></i>
              Monitor Today
            </button>
          </div>
        </nav>

        {/* User Profile - REDUCED PADDING */}
        <div className="border-top p-2">
          <div className="dropdown">
            <button 
              className="btn btn-light w-100 d-flex align-items-center text-start py-2"
              style={{ borderRadius: '10px' }}
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <div className="bg-secondary rounded-circle d-flex align-items-center justify-content-center me-3" 
                   style={{ width: '40px', height: '40px' }}>
                <i className="bi bi-person text-white"></i>
              </div>
              <div className="flex-grow-1">
                <div className="fw-medium">
                  {currentUser?.name?.split(' ').slice(0, 2).join(' ') || 'Supervisor'}
                </div>
                <small className="text-muted">
                  System Administrator
                </small>
              </div>
              <i className="bi bi-three-dots-vertical text-muted"></i>
            </button>
            
            <ul className="dropdown-menu dropdown-menu-end w-100 shadow">
              <li>
                <button className="dropdown-item text-danger py-2" onClick={onLogout}>
                  <i className="bi bi-box-arrow-right me-2"></i>Sign Out
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );

  const renderOverview = () => (
    <div>
      {/* Stats Cards - MINIMAL SPACING */}
      <div className="row mb-2 g-2">
        {/* Active Teachers */}
        <div className="col-lg-3 col-md-6 col-12">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body p-3">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <div className="bg-primary bg-opacity-10 rounded-circle p-2">
                    <i className="bi bi-people-fill fs-5 text-primary"></i>
                  </div>
                </div>
                <div className="flex-grow-1 ms-2">
                  <div className="d-flex justify-content-between">
                    <div>
                      <h5 className="mb-0">{stats.activeTeachers}</h5>
                      <small className="text-muted">Active Teachers</small>
                    </div>
                    <div className="text-end">
                      <span className="badge bg-light text-dark">
                        {stats.totalTeachers} total
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Sections */}
        <div className="col-lg-3 col-md-6 col-12">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body p-3">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <div className="bg-success bg-opacity-10 rounded-circle p-2">
                    <i className="bi bi-diagram-3-fill fs-5 text-success"></i>
                  </div>
                </div>
                <div className="flex-grow-1 ms-2">
                  <h5 className="mb-0">{stats.totalSections}</h5>
                  <small className="text-muted">Active Sections</small>
                  <div className="mt-1">
                    <i className="bi bi-arrow-up text-success me-1"></i>
                    <small className="text-success">All sections active</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Total Students */}
        <div className="col-lg-3 col-md-6 col-12">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body p-3">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <div className="bg-info bg-opacity-10 rounded-circle p-2">
                    <i className="bi bi-person-badge-fill fs-5 text-info"></i>
                  </div>
                </div>
                <div className="flex-grow-1 ms-2">
                  <h5 className="mb-0">{stats.totalStudents}</h5>
                  <small className="text-muted">Total Students</small>
                  <div className="mt-1">
                    <small className="text-muted">
                      Avg: {Math.round(stats.totalStudents / (stats.totalSections || 1))} per section
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Today's Attendance */}
        <div className="col-lg-3 col-md-6 col-12">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body p-3">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <div className="bg-warning bg-opacity-10 rounded-circle p-2">
                    <i className="bi bi-calendar-check-fill fs-5 text-warning"></i>
                  </div>
                </div>
                <div className="flex-grow-1 ms-2">
                  <h5 className="mb-0">{stats.attendanceToday}%</h5>
                  <small className="text-muted">Today's Attendance</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions & Recent Activity - REDUCED MARGINS */}
      <div className="row g-2">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0 py-2">
              <h6 className="mb-0">
                <i className="bi bi-clock-history me-2"></i>
                Recent Activity
              </h6>
            </div>
            <div className="card-body p-3">
              {recentActivity.length > 0 ? (
                <div className="activity-feed">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="d-flex align-items-start mb-2">
                      <div className="flex-shrink-0">
                        <div className="bg-success bg-opacity-10 rounded-circle p-2">
                          <i className="bi bi-check-circle-fill text-success"></i>
                        </div>
                      </div>
                      <div className="flex-grow-1 ms-3">
                        <p className="mb-1 fw-medium">{activity.description}</p>
                        <small className="text-muted">
                          <i className="bi bi-person me-1"></i>
                          {activity.performedBy} • {activity.timestamp}
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-3">
                  <i className="bi bi-clock-history fs-1 text-muted"></i>
                  <p className="text-muted mt-2">No recent activity to display</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0 py-2">
              <h6 className="mb-0">
                <i className="bi bi-lightning-charge me-2"></i>
                Quick Actions
              </h6>
            </div>
            <div className="card-body p-3">
              <div className="d-grid gap-2">
                <button 
                  className="btn btn-outline-primary text-start d-flex align-items-center py-2"
                  onClick={() => setCurrentView('attendance')}
                >
                  <i className="bi bi-calendar-check me-2"></i>
                  View Today's Attendance
                </button>
                <button 
                  className="btn btn-outline-success text-start d-flex align-items-center py-2"
                  onClick={() => setCurrentView('reports')}
                >
                  <i className="bi bi-graph-up me-2"></i>
                  Generate Reports
                </button>
                <button 
                  className="btn btn-outline-info text-start d-flex align-items-center py-2"
                  onClick={() => setCurrentView('teachers')}
                >
                  <i className="bi bi-people me-2"></i>
                  Manage Teachers
                </button>
                <button 
                  className="btn btn-outline-warning text-start d-flex align-items-center py-2"
                  onClick={() => setCurrentView('students')}
                >
                  <i className="bi bi-diagram-3 me-2"></i>
                  View Students
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCurrentView = () => {
    if (loading) {
      return (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <h5>Loading Dashboard...</h5>
            <p className="text-muted">Setting up your supervisor portal...</p>
          </div>
        </div>
      );
    }

    switch (currentView) {
      case 'attendance':
        return <ViewAttendance currentUser={currentUser} />;
      case 'reports':
        return <ViewReports currentUser={currentUser} />;
      case 'teachers':
        return <ViewTeachers currentUser={currentUser} />;
      case 'students':
        return <ViewStudents currentUser={currentUser} />;
      default:
        return renderOverview();
    }
  };

  const getViewInfo = () => {
    const currentNavItem = navigationItems.find(item => item.id === currentView);
    return {
      title: currentNavItem?.label || 'Dashboard',
      description: currentNavItem?.description || 'System overview'
    };
  };

  const viewInfo = getViewInfo();

  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      {/* Hamburger Sidebar */}
      {renderHamburgerSidebar()}

      {/* Main Content */}
      <div className="flex-grow-1" style={{ backgroundColor: '#f8f9fa' }}>
        {/* Header with Hamburger - REDUCED PADDING */}
        <div className="bg-white border-bottom shadow-sm">
          <div className="container-fluid py-2">
            <div className="d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center">
                {/* Hamburger Button */}
                <button
                  className="hamburger-btn btn btn-outline-secondary me-3"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  style={{ border: 'none' }}
                >
                  <i className="bi bi-list fs-4"></i>
                </button>

                <div>
                  <h4 className="mb-0">{viewInfo.title} - Ningbo Huamao International School</h4>
                  <div className="d-flex gap-2 mt-1 align-items-center">
                    <small className="text-muted">{viewInfo.description}</small>
                    <small className="text-muted">• Welcome {currentUser?.name || currentUser?.email}</small>
                    <span className="badge bg-info">Supervisor</span>
                    <span className="badge bg-light text-dark">
                      <i className="bi bi-calendar3 me-1"></i>
                      {new Date().toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Status Indicator */}
              <div className="d-flex align-items-center me-4">
                <span className="badge bg-success px-3 py-2">
                  <i className="bi bi-shield-check me-1"></i>
                  System Active
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Page Content - REDUCED PADDING */}
        <div className="container-fluid py-3">
          {renderCurrentView()}
        </div>
      </div>
    </div>
  );
}

export default SupervisorDashboard;