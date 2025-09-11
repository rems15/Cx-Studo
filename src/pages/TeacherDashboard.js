// src/components/TeacherDashboard.js - FIXED VERSION WITH COLORS
import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

// Import teacher services
import { 
  getTeacherSections,
  getTodayAttendance,
  setupTeacherListeners,
  getAdminAnnouncements
} from '../services/teacherService';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

import MonitorModal from './../components/teacher/MonitorModal';
import AttendanceModal from './../components/teacher/AttendanceModal';

function TeacherDashboard({ onLogout, currentUser }) {
  const [sections, setSections] = useState([]);
  const [scheduleContext, setScheduleContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Monitor states
  const [selectedSectionForMonitor, setSelectedSectionForMonitor] = useState(null);
  const [showMonitorModal, setShowMonitorModal] = useState(false);
  const [monitorContext, setMonitorContext] = useState('homeroom');
  const [subjectColors, setSubjectColors] = useState({});
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceData, setAttendanceData] = useState({});
  const [activeView, setActiveView] = useState('dashboard');

  // Setup real-time data
  useEffect(() => {
    if (!currentUser?.uid && !currentUser?.email) {
      setLoading(false);
      return;
    }
    
    // Get initial data
    loadTeacherData();
    
    // Setup real-time listeners
    const unsubscribers = [];
    try {
      const sectionsListener = setupTeacherListeners(currentUser, async (result) => {
        // Handle new data structure from enhanced teacher service
        if (result && result.sections) {
          setSections(result.sections);
          setScheduleContext(result.scheduleContext);
        } else {
          // Fallback for old format
          setSections(result || []);
        }
        
        const announcements = await getAdminAnnouncements();
        checkNotifications(result.sections || result || [], announcements);
      });
      
      unsubscribers.push(sectionsListener);
    } catch (error) {
      console.error('Error setting up listeners:', error);
    }

    return () => {
      unsubscribers.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
    };
  }, [currentUser]);

  const loadSubjectColors = async () => {
    try {
      const subjectsSnapshot = await getDocs(collection(db, 'subjects'));
      const colors = {};
      
      subjectsSnapshot.forEach(doc => {
        const subjectData = doc.data();
        if (subjectData.name && subjectData.color) {
          colors[subjectData.name] = {
            hex: subjectData.color,
            bg: subjectData.color,
            light: subjectData.color + '20'
          };
        }
      });
      
      console.log('Loaded subject colors:', colors);
      setSubjectColors(colors);
    } catch (error) {
      console.error('Error loading subject colors:', error);
    }
  };


  const loadTeacherData = async () => {
    try {
      setLoading(true);
      
      await loadSubjectColors();

      // Get enhanced teacher sections with schedule filtering
      const result = await getTeacherSections(currentUser);
      const teacherSections = result.sections || result || [];
      
      // Store schedule context if available
      if (result.scheduleContext) {
        setScheduleContext(result.scheduleContext);
      }
      
      // Get today's attendance data
      const attendanceData = await getTodayAttendance();
      const announcements = await getAdminAnnouncements(); 

      // Combine section data with attendance status
      const sectionsWithAttendance = teacherSections.map(section => {
        const sectionAttendance = attendanceData[section.sectionId];
        const subjectKey = section.isHomeroom ? 'homeroom' : section.subject?.toLowerCase().replace(/\s+/g, '-');
        const attendance = sectionAttendance?.[subjectKey];

        return {
          ...section,
          attendanceTaken: !!attendance,
          attendanceData: attendance,
          presentCount: attendance ? (attendance.students?.filter(s => s.status === 'present').length || 0) : 0,
          lateCount: attendance ? (attendance.students?.filter(s => s.status === 'late').length || 0) : 0,
          absentCount: attendance ? (attendance.students?.filter(s => s.status === 'absent').length || 0) : 0,
          excusedCount: attendance ? (attendance.students?.filter(s => s.status === 'excused').length || 0) : 0,
          enrolledCount: section.studentCount || section.sectionData?.currentEnrollment || 0,
          totalStudents: section.studentCount || section.sectionData?.currentEnrollment || 0
        };
      });
      
      setSections(sectionsWithAttendance);
      checkNotifications(sectionsWithAttendance, announcements);

    } catch (error) {
      console.error('Error loading teacher data:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkNotifications = (sectionsList, announcements = []) => {
    const alerts = [];
    
    // 1. Pending attendance notifications
    const pendingCount = sectionsList.filter(s => !s.attendanceTaken).length;
    if (pendingCount > 0) {
      alerts.push({
        type: 'warning',
        message: `You have ${pendingCount} classes with pending attendance`,
        icon: 'bi-exclamation-triangle',
        priority: 'high'
      });
    }

    // 2. Schedule-based notifications
    if (scheduleContext && scheduleContext.totalSubjectsFiltered > 0) {
      alerts.push({
        type: 'info',
        message: `${scheduleContext.totalSubjectsFiltered} subjects were filtered out (not scheduled for today)`,
        icon: 'bi-calendar-check',
        priority: 'low'
      });
    }

    // 3. Student absence/late threshold warnings
    sectionsList.forEach(section => {
      if (section.attendanceTaken && section.attendanceData) {
        const students = section.attendanceData.students || [];
        
        students.forEach(student => {
          const absentCount = (student.monthlyAbsences || 0);
          const lateCount = (student.monthlyLates || 0);
          const totalIssues = absentCount + lateCount;
          const threshold = 5;
          
          if (totalIssues >= threshold) {
            alerts.push({
              type: 'danger',
              message: `Student ${student.name} in ${section.subject || 'HR'} has ${totalIssues} absences/lates`,
              icon: 'bi-exclamation-triangle-fill',
              priority: 'critical'
            });
          }
        });
      }
    });

    // 4. Add admin announcements
    alerts.push(...announcements);

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    alerts.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    setNotifications(alerts);
  };

  const handleCardClick = (section) => {
    setSelectedSection(section);
    setShowModal(true);
  };

  const handleTakeAttendance = () => {
    setShowModal(false);  
    setShowAttendanceModal(true);
  };

  const handleMonitorAttendance = (section) => {
    setSelectedSectionForMonitor(section);
    setMonitorContext(section.isHomeroom ? 'homeroom' : 'subject');
    setShowModal(false);
    setShowMonitorModal(true);
  };

  const filteredSections = sections.filter(section =>
    section.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.subject?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const homeroomCount = sections.filter(s => s.isHomeroom).length;
  const subjectCount = sections.filter(s => !s.isHomeroom).length;
  const completedCount = sections.filter(s => s.attendanceTaken).length;

  // Helper function to render schedule badge
  const getScheduleDisplay = (section) => {
    if (section.isHomeroom || !section.scheduleDisplay) return null;
    return (
      <span>
        {section.scheduleDisplay}
      </span>
    );
  };

  // Helper function to get room display
  const getRoomDisplay = (section) => {
    if (section.isHomeroom) {
      const grade = section.sectionData?.gradeLevel || '';
      const sectionLetter = (section.sectionData?.sectionName || section.sectionData?.section || 'A').charAt(0);
      return `Room ${grade}${sectionLetter}1`;
    }
    return `Room ${section.roomNumber || 'TBD'}`;
  };

  // Helper function to get header class based on subject
const getHeaderClass = (section) => {
  if (section.isHomeroom) return 'bg-warning text-dark';
  
  // For subjects with colors, use white text
  const subjectColor = subjectColors[section.subject];
  if (subjectColor) {
    return 'text-white';
  }
  
  return 'bg-light text-dark';
};

const getHeaderStyle = (section) => {
  if (section.isHomeroom) return {};
  
  const subjectColor = subjectColors[section.subject];
  if (subjectColor) {
    console.log(`Applying color for ${section.subject}:`, subjectColor.hex);
    return { backgroundColor: subjectColor.hex };
  }
  return {};
};

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status"></div>
          <h5>Loading Your Sections...</h5>
          <p className="text-muted">Setting up attendance tracking...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      {/* Sidebar Navigation */}
      <div className={`bg-light border-end ${sidebarCollapsed ? '' : 'sidebar-expanded'}`} style={{
        width: sidebarCollapsed ? '60px' : '200px',
        transition: 'width 0.3s ease'
      }}>
        <div className="p-3">
          <div className="d-flex justify-content-between align-items-center">
            {!sidebarCollapsed && <h6 className="mb-0 text-muted">MENU</h6>}
            <button 
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              <i className={`bi bi-${sidebarCollapsed ? 'chevron-right' : 'chevron-left'}`}></i>
            </button>
          </div>
        </div>
        
        <nav className="nav flex-column px-2">
          <button 
            className={`nav-link text-start ${activeView === 'dashboard' ? 'bg-primary text-white' : 'text-muted'} rounded mb-2`}
            onClick={() => setActiveView('dashboard')}
          >
            <i className="bi bi-house me-2"></i>
            {!sidebarCollapsed && 'Dashboard'}
          </button>

          <button 
            className={`nav-link text-start ${activeView === 'analytics' ? 'bg-primary text-white' : 'text-muted'} rounded mb-2`}
            onClick={() => setActiveView('analytics')}
          >
            <i className="bi bi-bar-chart me-2"></i>
            {!sidebarCollapsed && 'Analytics'}
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-grow-1" style={{ backgroundColor: '#f8f9fa' }}>
        {/* Header */}
        <div className="bg-white border-bottom shadow-sm">
          <div className="container-fluid py-3">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h4 className="mb-0">Teacher Dashboard - XYZ International School</h4>
                <div className="d-flex gap-2 mt-1 align-items-center">
                  <small className="text-muted">Welcome {currentUser?.name || currentUser?.email}</small>
                  {currentUser?.roles?.includes('homeroom') && (
                    <span className="badge bg-warning text-dark">Homeroom Teacher</span>
                  )}
                  {currentUser?.roles?.includes('subject') && (
                    <span className="badge bg-info">Subject Teacher</span>
                  )}
                  {/* NEW: Schedule context display */}
                  {scheduleContext && (
                    <span className="badge bg-light text-dark">
                      <i className="bi bi-calendar-week me-1"></i>
                      {scheduleContext.weekDisplay}
                    </span>
                  )}
                </div>
              </div>
              <div className="d-flex align-items-center gap-2">
                {/* Notification bell */}
                <div className="dropdown">
                  <button 
                    className="btn btn-outline-secondary position-relative" 
                    data-bs-toggle="dropdown"
                    title={notifications.length > 0 ? `${notifications.length} notifications` : 'No notifications'}
                  >
                    <i className="bi bi-bell"></i>
                    {notifications.length > 0 && (
                      <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                        {notifications.length}
                      </span>
                    )}
                  </button>
                  
                  <div className="dropdown-menu dropdown-menu-end" style={{ minWidth: '350px', maxHeight: '400px', overflowY: 'auto' }}>
                    {notifications.length > 0 ? (
                      <>
                        <div className="dropdown-header">
                          <strong>Notifications</strong>
                          <small className="text-muted ms-2">({notifications.length} items)</small>
                        </div>
                        <div className="dropdown-divider"></div>
                        
                        {notifications.map((notif, index) => (
                          <div key={index} className="dropdown-item-text p-2">
                            <div className={`alert alert-${notif.type} mb-1 py-2`} style={{ fontSize: '13px' }}>
                              <div className="d-flex align-items-start">
                                <i className={`bi ${notif.icon} me-2 mt-1`} style={{ fontSize: '14px' }}></i>
                                <div className="flex-grow-1">
                                  <div dangerouslySetInnerHTML={{ __html: notif.message }}></div>
                                  {notif.priority === 'critical' && (
                                    <small className="badge bg-danger mt-1">Action Required</small>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        <div className="dropdown-divider"></div>
                        <div className="dropdown-item text-center">
                          <small className="text-muted">
                            <i className="bi bi-arrow-clockwise me-1"></i>
                            Auto-refreshes every 30 seconds
                          </small>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="dropdown-header">
                          <strong>Notifications</strong>
                        </div>
                        <div className="dropdown-divider"></div>
                        <div className="dropdown-item-text text-center py-4">
                          <i className="bi bi-check-circle text-success mb-2" style={{ fontSize: '2rem' }}></i>
                          <div>
                            <strong>All Clear!</strong>
                          </div>
                          <small className="text-muted">No notifications at this time</small>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <button className="btn btn-outline-secondary" onClick={onLogout}>
                  <i className="bi bi-box-arrow-right me-1"></i>
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="container-fluid py-4">
          {activeView === 'dashboard' ? (
            <>
              {/* Schedule info banner */}
              {scheduleContext && (
                <div className="alert alert-info border-0 mb-4">
                  <div className="row align-items-center">
                    <div className="col-md-8">
                      <div className="d-flex align-items-center">
                        <i className="bi bi-calendar-week me-2"></i>
                        <div>
                          <strong>Schedule Context:</strong> 
                          {scheduleContext.weekDisplay} • {scheduleContext.currentDay.charAt(0).toUpperCase() + scheduleContext.currentDay.slice(1)}
                          {scheduleContext.totalSubjectsFiltered > 0 && (
                            <small className="text-muted ms-2">
                              ({scheduleContext.totalSubjectsFiltered} subjects not scheduled today)
                            </small>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="col-md-4 text-md-end">
                      <small className="text-muted">
                        <i className="bi bi-info-circle me-1"></i>
                        Only showing today's scheduled classes
                      </small>
                    </div>
                  </div>
                </div>
              )}

              {/* Search and Stats */}
              <div className="row mb-4">
                <div className="col-md-6">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search sections..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="col-md-6">
                  <div className="d-flex justify-content-md-end mt-2 mt-md-0 gap-4">
                    <div className="text-center">
                      <div className="h5 mb-0 text-warning">{homeroomCount}</div>
                      <small className="text-muted">Homeroom</small>
                    </div>
                    <div className="text-center">
                      <div className="h5 mb-0 text-info">{subjectCount}</div>
                      <small className="text-muted">Subject Classes</small>
                    </div>
                    <div className="text-center">
                      <div className="h5 mb-0 text-success">{completedCount}</div>
                      <small className="text-muted">Completed</small>
                    </div>
                  </div>
                </div>
              </div>

              {/* ✅ FIXED: Sections Cards with Unique Keys */}
              {filteredSections.length > 0 ? (
                <div className="row g-3">
                  {filteredSections.map((section, index) => {
                    // Generate a truly unique key that won't conflict
                    const uniqueKey = section.isMultiSection 
                      ? `multi-${section.subject}-${section.actualSectionIds?.join('-') || index}`
                      : `single-${section.subject}-${section.sectionId || section.id || index}`;
                      
                    return (
                      <div className="col-md-6 col-lg-4" key={uniqueKey}>
                        <div
                          className={`card border-2 ${section.attendanceTaken ? 'border-success' : 'border-warning'}`}
                          onClick={() => handleCardClick(section)}
                          style={{ cursor: 'pointer' }}
                        >
                          {/* Enhanced Card Header with Dynamic Colors */}
                          <div 
                            className={`card-header ${getHeaderClass(section)} p-3`}
                            style={getHeaderStyle(section)}
                          >
                            <div className="d-flex justify-content-between align-items-start">
                              {/* LEFT SIDE - Subject Title and Room */}
                              <div className="flex-grow-1">
                                <h6 className="mb-1 fw-bold">
                                  {section.isHomeroom && <i className="bi bi-house-door me-1"></i>}
                                  {section.subject || section.name}
                                </h6>
                                
                                {/* Room info */}
                                <div className="small opacity-75 mt-1">
                                  <i className="bi bi-geo-alt me-1"></i>
                                  {getRoomDisplay(section)}
                                </div>
                              </div>

                              {/* RIGHT SIDE - Status Badges */}
                              <div className="d-flex flex-column align-items-end gap-1">
                                {section.isHomeroom && (
                                  <span className="badge bg-light text-dark">
                                    <i className="bi bi-star-fill me-1"></i>
                                    YOUR HOMEROOM
                                  </span>
                                )}
                                <span className={`badge ${section.attendanceTaken ? 'bg-success' : 'bg-secondary'}`}>
                                  <i className={`bi ${section.attendanceTaken ? 'bi-check-circle' : 'bi-clock'} me-1`}></i>
                                  {section.attendanceTaken ? 'Taken' : 'Pending'}
                                </span>
                                {getScheduleDisplay(section) && (
                                  <div className="small opacity-75">
                                    <i className="bi bi-clock me-1"></i>
                                    {getScheduleDisplay(section)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Card Body */}
                          <div className="card-body p-3">
                            <div className="row text-center mb-3 g-1">
                              <div className="col">
                                <div className="h6 mb-0 text-success">{section.presentCount || 0}</div>
                                <small className="text-muted" style={{ fontSize: '10px' }}>Present</small>
                              </div>
                              <div className="col">
                                <div className="h6 mb-0 text-warning">{section.lateCount || 0}</div>
                                <small className="text-muted" style={{ fontSize: '10px' }}>Late</small>
                              </div>
                              <div className="col">
                                <div className="h6 mb-0 text-danger">{section.absentCount || 0}</div>
                                <small className="text-muted" style={{ fontSize: '10px' }}>Absent</small>
                              </div>
                              <div className="col">
                                <div className="h6 mb-0 text-info">{section.excusedCount || 0}</div>
                                <small className="text-muted" style={{ fontSize: '10px' }}>Excused</small>
                              </div>
                              <div className="col">
                                <div className="h6 mb-0 text-primary">{section.enrolledCount || 0}</div>
                                <small className="text-muted" style={{ fontSize: '10px' }}>Enrolled</small>
                              </div>
                            </div>

                            {section.attendanceTaken && section.attendanceData ? (
                              <div className="alert alert-success py-2 mb-3">
                                <small>
                                  <i className="bi bi-check-circle me-1"></i>
                                  <strong>Taken at:</strong> {section.attendanceData.time}<br />
                                  <strong>By:</strong> {section.attendanceData.takenBy}
                                </small>
                              </div>
                            ) : (
                              <div className="alert alert-warning py-2 mb-3">
                                <small>
                                  <i className="bi bi-clock me-1"></i>
                                  Waiting for attendance to be taken
                                </small>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Enhanced Empty state with schedule context */
                <div className="text-center py-5">
                  <i className="bi bi-calendar-x display-4 text-muted"></i>
                  <h5 className="mt-3">
                    {sections.length === 0 
                      ? "No sections assigned" 
                      : scheduleContext 
                        ? `No classes scheduled for ${scheduleContext.currentDay}` 
                        : "No sections found"
                    }
                  </h5>
                  <p className="text-muted">
                    {sections.length === 0 
                      ? "You don't have any sections assigned yet. Please contact your administrator."
                      : scheduleContext 
                        ? `Enjoying a free period on ${scheduleContext.weekDisplay}!`
                        : "Try adjusting your search terms"
                    }
                  </p>

                  {sections.length === 0 && (
                    <div className="mt-4">
                      <button className="btn btn-primary" onClick={loadTeacherData}>
                        <i className="bi bi-arrow-clockwise me-1"></i>
                        Retry Loading Data
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            // Analytics Placeholder
            <div className="text-center py-5">
              <i className="bi bi-bar-chart-line display-4 text-primary"></i>
              <h3 className="mt-3">Analytics Coming Soon</h3>
              <p className="text-muted">
                This feature is currently being built. In the future, you'll be able to view trends, student attendance summaries, and more!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal for section actions */}
      {showModal && selectedSection && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '380px' }}>
            <div className="modal-content" style={{ 
              borderRadius: '12px',
              border: 'none',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
            }}>
              <div className="modal-header bg-white border-0 text-center py-4">
                <div className="w-100">
                  <div className="mb-3">
                    <i className="bi bi-house-door-fill text-warning" style={{ fontSize: '2rem' }}></i>
                  </div>
                  <h5 className="modal-title mb-0" style={{ 
                    fontSize: '18px', 
                    fontWeight: '600',
                    color: '#333'
                  }}>
                    {selectedSection.isHomeroom ? 'Homeroom Options' : `${selectedSection.subject} Options`}
                  </h5>
                  {/* Show schedule info in modal */}
                  {selectedSection.scheduleDisplay && (
                    <small className="text-muted">
                      <i className="bi bi-clock me-1"></i>
                      {selectedSection.scheduleDisplay}
                    </small>
                  )}
                </div>
              </div>

              <div className="modal-body px-4 pb-4 pt-0">
                <div className="d-grid gap-3">
                  <button 
                    className="btn btn-warning py-3"
                    onClick={handleTakeAttendance}
                    style={{ 
                      fontSize: '15px', 
                      fontWeight: '500',
                      borderRadius: '8px'
                    }}
                  >
                    <i className="bi bi-clipboard-check me-2"></i>
                    {selectedSection.isHomeroom ? 'Take Homeroom Attendance' : `Take ${selectedSection.subject} Attendance`}
                  </button>
                  
                  <button 
                    className="btn btn-info py-3"
                    onClick={() => handleMonitorAttendance(selectedSection)}
                    style={{ 
                      fontSize: '15px', 
                      fontWeight: '500',
                      borderRadius: '8px'
                    }}
                  >
                    <i className="bi bi-bar-chart me-2"></i>
                    {selectedSection.isHomeroom ? 'Monitor All Subject Attendance' : `Monitor ${selectedSection.subject} Classes`}
                  </button>
                  
                  <button 
                    className="btn btn-secondary py-3"
                    onClick={() => setShowModal(false)}
                    style={{ 
                      fontSize: '15px', 
                      fontWeight: '500',
                      borderRadius: '8px'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Modal */}
      {showAttendanceModal && selectedSection && (
        <AttendanceModal
          section={selectedSection}
          attendanceData={attendanceData}
          setAttendanceData={setAttendanceData}
          currentUser={currentUser}
          onClose={() => {
            setShowAttendanceModal(false);
            setSelectedSection(null);
            loadTeacherData();
          }}
          subjectColors={subjectColors}
          isFirebaseVersion={true}
        />
      )}

      {/* Monitor Modal */}
      {showMonitorModal && selectedSectionForMonitor && (
        <MonitorModal
          currentUser={currentUser}
          sectionData={selectedSectionForMonitor}
          monitorContext={monitorContext}
          focusSubjects={
            monitorContext === 'homeroom' 
              ? []
              : [selectedSectionForMonitor.subject]
          }
          onClose={() => {
            setShowMonitorModal(false);
            setSelectedSectionForMonitor(null);
            setMonitorContext('homeroom');
          }}
          subjectColors={subjectColors}
        />
      )}
    </div>
  );
}

export default TeacherDashboard;