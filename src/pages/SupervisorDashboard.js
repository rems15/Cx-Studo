// src/pages/SupervisorDashboard.js
// Using your existing database structure and services

import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

import ViewAttendance from '../components/supervisor/ViewAttendance';
import ViewReports from '../components/supervisor/ViewReports';
import ViewTeachers from '../components/supervisor/ViewTeachers';

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
    attendanceToday: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('overview');

  useEffect(() => {
    loadSupervisorData();
  }, []);

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
        attendanceToday: attendanceRate
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

  const renderOverview = () => (
    <div>


      {/* Stats Cards */}
      <div className="row mb-4">
        <div className="col-md-3 col-sm-6 mb-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center">
              <div className="d-flex align-items-center justify-content-center mb-2">
                <div className="bg-primary bg-opacity-10 rounded-circle p-3">
                  <i className="bi bi-people-fill fs-4 text-primary"></i>
                </div>
              </div>
              <h3 className="mb-1">{stats.activeTeachers}/{stats.totalTeachers}</h3>
              <small className="text-muted">Active Teachers</small>
            </div>
          </div>
        </div>

        <div className="col-md-3 col-sm-6 mb-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center">
              <div className="d-flex align-items-center justify-content-center mb-2">
                <div className="bg-success bg-opacity-10 rounded-circle p-3">
                  <i className="bi bi-diagram-3-fill fs-4 text-success"></i>
                </div>
              </div>
              <h3 className="mb-1">{stats.totalSections}</h3>
              <small className="text-muted">Total Sections</small>
            </div>
          </div>
        </div>

        <div className="col-md-3 col-sm-6 mb-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center">
              <div className="d-flex align-items-center justify-content-center mb-2">
                <div className="bg-info bg-opacity-10 rounded-circle p-3">
                  <i className="bi bi-person-badge-fill fs-4 text-info"></i>
                </div>
              </div>
              <h3 className="mb-1">{stats.totalStudents}</h3>
              <small className="text-muted">Total Students</small>
            </div>
          </div>
        </div>

        <div className="col-md-3 col-sm-6 mb-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center">
              <div className="d-flex align-items-center justify-content-center mb-2">
                <div className="bg-warning bg-opacity-10 rounded-circle p-3">
                  <i className="bi bi-calendar-check-fill fs-4 text-warning"></i>
                </div>
              </div>
              <h3 className="mb-1">{stats.attendanceToday}%</h3>
              <small className="text-muted">Attendance Today</small>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header bg-white">
              <h6 className="mb-0">
                <i className="bi bi-clock-history me-2"></i>
                Recent Activity
              </h6>
            </div>
            <div className="card-body">
              {recentActivity.length > 0 ? (
                <div className="list-group list-group-flush">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="list-group-item border-0 px-0">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <small className="fw-medium">{activity.description}</small>
                          <div className="text-muted small">
                            <i className="bi bi-person me-1"></i>
                            {activity.performedBy} • {activity.timestamp}
                          </div>
                        </div>
                        <span className="badge bg-success bg-opacity-10 text-success">
                          {activity.action}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <i className="bi bi-clock-history fs-1 text-muted"></i>
                  <p className="text-muted mt-2">No recent activity to display</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderQuickActions = () => (
    <div className="row">
      <div className="col-md-4 mb-3">
        <div className="card h-100">
          <div className="card-body text-center">
            <i className="bi bi-calendar-check display-4 text-primary mb-3"></i>
            <h5 className="card-title">View Attendance</h5>
            <p className="card-text text-muted">
              View today's attendance records
            </p>
            <button 
              className="btn btn-primary"
              onClick={() => setCurrentView('attendance')}
            >
              <i className="bi bi-eye me-1"></i>
              View Records
            </button>
          </div>
        </div>
      </div>

      <div className="col-md-4 mb-3">
        <div className="card h-100">
          <div className="card-body text-center">
            <i className="bi bi-people display-4 text-success mb-3"></i>
            <h5 className="card-title">Teachers</h5>
            <p className="card-text text-muted">
              View teacher information
            </p>
            <button 
              className="btn btn-success"
              onClick={() => setCurrentView('teachers')}
            >
              <i className="bi bi-eye me-1"></i>
              View Teachers
            </button>
          </div>
        </div>
      </div>

      <div className="col-md-4 mb-3">
        <div className="card h-100">
          <div className="card-body text-center">
            <i className="bi bi-diagram-3 display-4 text-info mb-3"></i>
            <h5 className="card-title">Sections</h5>
            <p className="card-text text-muted">
              View section information
            </p>
            <button 
              className="btn btn-info"
              onClick={() => setCurrentView('sections')}
            >
              <i className="bi bi-eye me-1"></i>
              View Sections
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCurrentView = () => {
    if (loading) {
      return (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted mt-3">Loading supervisor dashboard...</p>
        </div>
      );
    }

    switch (currentView) {
  case 'attendance':
    return <ViewAttendance currentUser={currentUser} />;
  case 'teachers':
    return <ViewTeachers currentUser={currentUser} />;
  case 'reports':
    return <ViewReports currentUser={currentUser} />;
      default:
        return (
          <>
            {renderOverview()}
            <div className="row mt-4">
              <div className="col-12">
                <h5>Quick Actions</h5>
                {renderQuickActions()}
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h4 className="mb-1">Supervisor Portal</h4>
              <small className="text-muted">
                <i className="bi bi-calendar3 me-1"></i>
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </small>
              <span className="badge bg-light text-dark px-3 py-2">
                    <i className="bi bi-shield-check me-1"></i>
                    View Only Access
                  </span>
            </div>
            <button className="btn btn-outline-secondary" onClick={onLogout}>
              <i className="bi bi-box-arrow-right me-2"></i>
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="row mb-4">
        <div className="col-12">
          <ul className="nav nav-pills bg-light rounded p-2">
            <li className="nav-item">
              <button 
                className={`nav-link ${currentView === 'overview' ? 'active' : ''}`}
                onClick={() => setCurrentView('overview')}
              >
                <i className="bi bi-speedometer2 me-2"></i>
                Overview
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${currentView === 'attendance' ? 'active' : ''}`}
                onClick={() => setCurrentView('attendance')}
              >
                <i className="bi bi-calendar-check me-2"></i>
                Attendance
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${currentView === 'teachers' ? 'active' : ''}`}
                onClick={() => setCurrentView('teachers')}
              >
                <i className="bi bi-people me-2"></i>
                Teachers
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${currentView === 'sections' ? 'active' : ''}`}
                onClick={() => setCurrentView('sections')}
              >
                <i className="bi bi-diagram-3 me-2"></i>
                Students
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* Main Content */}
      <div className="row">
        <div className="col-12">
          {renderCurrentView()}
        </div>
      </div>

      
    </div>
  );
}

export default SupervisorDashboard;