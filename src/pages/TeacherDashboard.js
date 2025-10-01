// src/components/TeacherDashboard.js - COMPLETE HAMBURGER MENU VERSION - PART 1
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
import { collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

import MonitorModal from './../components/teacher/MonitorModal';
import AttendanceModal from './../components/teacher/AttendanceModal';
import { testWithMockData } from '../components/teacher/utils/scheduleHelpers';

function TeacherDashboard({ onLogout, currentUser }) {
  const [sections, setSections] = useState([]);
  const [scheduleContext, setScheduleContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [showModal, setShowModal] = useState(false);
  
  // Monitor states
  const [selectedSectionForMonitor, setSelectedSectionForMonitor] = useState(null);
  const [showMonitorModal, setShowMonitorModal] = useState(false);
  const [monitorContext, setMonitorContext] = useState('homeroom');
  const [subjectColors, setSubjectColors] = useState({});
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceData, setAttendanceData] = useState({});

  // UI states
  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Setup real-time data
  // useEffect(() => {
  //   if (!currentUser?.uid && !currentUser?.email) {
  //     setLoading(false);
  //     return;
  //   }
    
  //   loadTeacherData();
    
  //   const unsubscribers = [];
  //   try {
  //     const sectionsListener = setupTeacherListeners(currentUser, async (result) => {
  //       if (result && result.sections) {
  //         setSections(result.sections);
  //         setScheduleContext(result.scheduleContext);
  //       } else {
  //         setSections(result || []);
  //       }
        
  //       const announcements = await getAdminAnnouncements();
  //       checkNotifications(result.sections || result || [], announcements);
  //     });
      
  //     unsubscribers.push(sectionsListener);
  //   } catch (error) {
  //     console.error('Error setting up listeners:', error);
  //   }

  //   return () => {
  //     unsubscribers.forEach(unsubscribe => {
  //       if (typeof unsubscribe === 'function') {
  //         unsubscribe();
  //       }
  //     });
  //   };
  // }, [currentUser]);

  useEffect(() => {
    if (!currentUser?.uid && !currentUser?.email) {
      setLoading(false);
      return;
    }
    
    loadTeacherData();
    
    const unsubscribers = [];
    
    try {
      // Listener 1: Sections
      const sectionsListener = setupTeacherListeners(currentUser, async (result) => {
        if (result && result.sections) {
          setSections(result.sections);
          setScheduleContext(result.scheduleContext);
        } else {
          setSections(result || []);
        }
        
        const announcements = await getAdminAnnouncements();
        checkNotifications(result.sections || result || [], announcements);
      });
      
      unsubscribers.push(sectionsListener);

      // ✅ NEW: Listener 2 - ATTENDANCE SYNC (ito yung kulang!)
      const today = new Date().toISOString().split('T')[0];
      const attendanceQuery = query(
        collection(db, 'attendance'),
        where('date', '==', today)
      );
      
      const attendanceListener = onSnapshot(attendanceQuery, async () => {
        console.log('🔔 Attendance updated by another teacher - syncing...');
        await loadTeacherData(); // Reload para makita ang bagong attendance
      });
      
      unsubscribers.push(attendanceListener);
      
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

  useEffect(() => {
    if (currentUser?.uid || currentUser?.email) {
      loadTeacherData();
    }
  }, [activeView]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarOpen && !event.target.closest('.sidebar') && !event.target.closest('.hamburger-btn')) {
        setSidebarOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [sidebarOpen]);

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
      
      setSubjectColors(colors);
    } catch (error) {
      console.error('Error loading subject colors:', error);
    }
  };

  // const loadTeacherData = async () => {
  //   try {
  //     setLoading(true);
      
  //     await loadSubjectColors();

  //     const showAllClasses = activeView === 'reports';
  //     const result = await getTeacherSections(currentUser, showAllClasses);
  //     const teacherSections = result.sections || result || [];
      
  //     if (result.scheduleContext) {
  //       setScheduleContext(result.scheduleContext);
  //     }
      
  //     const attendanceData = await getTodayAttendance();
  //     const announcements = await getAdminAnnouncements(); 

  //     const sectionsWithAttendance = teacherSections.map(section => {
  //       const sectionAttendance = attendanceData[section.sectionId];
  //       const subjectKey = section.isHomeroom ? 'homeroom' : section.subject?.toLowerCase().replace(/\s+/g, '-');
  //       const attendance = sectionAttendance?.[subjectKey];

  //       return {
  //         ...section,
  //         attendanceTaken: !!attendance,
  //         attendanceData: attendance,
  //         presentCount: attendance ? (attendance.students?.filter(s => s.status === 'present').length || 0) : 0,
  //         lateCount: attendance ? (attendance.students?.filter(s => s.status === 'late').length || 0) : 0,
  //         absentCount: attendance ? (attendance.students?.filter(s => s.status === 'absent').length || 0) : 0,
  //         excusedCount: attendance ? (attendance.students?.filter(s => s.status === 'excused').length || 0) : 0,
  //         enrolledCount: section.studentCount || section.sectionData?.currentEnrollment || 0,
  //         totalStudents: section.studentCount || section.sectionData?.currentEnrollment || 0
  //       };
  //     });
      
  //     setSections(sectionsWithAttendance);
  //     checkNotifications(sectionsWithAttendance, announcements);

  //   } catch (error) {
  //     console.error('Error loading teacher data:', error);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

 const loadTeacherData = async () => {
  try {
    setLoading(true);
    
    await loadSubjectColors();

    const showAllClasses = activeView === 'reports';
    const result = await getTeacherSections(currentUser, showAllClasses);
    const teacherSections = result.sections || result || [];
    
    if (result.scheduleContext) {
      setScheduleContext(result.scheduleContext);
    }
    
    const attendanceData = await getTodayAttendance();
    const announcements = await getAdminAnnouncements(); 

    console.group('🔍 TEACHER DASHBOARD DEBUG');
    console.log('Raw sections:', teacherSections);
    console.log('Raw attendance data:', attendanceData);
    console.groupEnd();

    const sectionsWithAttendance = teacherSections.map(section => {
      // ✅ FIXED: Direct subject key matching (no more nested structure)
      const subjectKey = section.isHomeroom ? 'Homeroom' : (section.subject || section.subjectName);
      const attendance = attendanceData[subjectKey];  // Direct access, no more sectionId nesting
      
      console.log(`🔍 Processing section: ${subjectKey}`, { section, attendance });
      
      // ✅ FIXED: Enhanced stats calculation
      let stats = {
        presentCount: 0,
        absentCount: 0,
        lateCount: 0,
        excusedCount: 0,
        enrolledCount: section.studentCount || section.sectionData?.currentEnrollment || 0,
        totalStudents: section.studentCount || section.sectionData?.currentEnrollment || 0,
        attendanceTaken: false
      };

      if (attendance && attendance.students) {
        stats.attendanceTaken = true;
        
        const studentRecords = attendance.students;
        console.log(`📊 Student records for ${subjectKey}:`, studentRecords.length, studentRecords);

        // Count each status
        studentRecords.forEach(student => {
          if (student && student.status) {
            const status = student.status.toLowerCase();
            switch (status) {
              case 'present':
                stats.presentCount++;
                break;
              case 'absent':
                stats.absentCount++;
                break;
              case 'late':
                stats.lateCount++;
                break;
              case 'excused':
                stats.excusedCount++;
                break;
              default:
                console.warn(`Unknown status: ${status} for student:`, student);
            }
          }
        });

        // ✅ Update total if we have actual attendance data
        const actualTotal = stats.presentCount + stats.absentCount + stats.lateCount + stats.excusedCount;
        if (actualTotal > 0) {
          stats.totalStudents = actualTotal;
        }

        console.log(`📈 Final stats for ${subjectKey}:`, stats);
      } else {
        console.log(`⚠️ No attendance data found for ${subjectKey}`);
      }
      
      return {
        ...section,
        ...stats,
        attendanceData: attendance
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
    
    if (activeView === 'dashboard') {
      const pendingCount = sectionsList.filter(s => !s.attendanceTaken && s.isScheduledToday !== false).length;
      if (pendingCount > 0) {
        alerts.push({
          type: 'warning',
          message: `You have ${pendingCount} scheduled classes with pending attendance`,
          icon: 'bi-exclamation-triangle',
          priority: 'high'
        });
      }
    }

    if (activeView === 'dashboard' && scheduleContext && scheduleContext.totalSubjectsFiltered > 0) {
      alerts.push({
        type: 'info',
        message: `${scheduleContext.totalSubjectsFiltered} of your subjects are not scheduled for today`,
        icon: 'bi-calendar-check',
        priority: 'low'
      });
    }

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

    alerts.push(...announcements);

    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    alerts.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    setNotifications(alerts);
  };

  const handleCardClick = (section) => {
    if (activeView === 'reports') {
      handleMonitorAttendance(section);
      return;
    }
    
    if (section.isScheduledToday === false) {
      handleMonitorAttendance(section);
      return;
    }
    
    if (section.isEmpty) {
      handleMonitorAttendance(section);
      return;
    }
    
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

  // Hamburger Sidebar Component
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
        {/* Sidebar Header */}
        <div className="p-4 border-bottom">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
              <div className="bg-primary rounded d-flex align-items-center justify-content-center me-3" 
                   style={{ width: '40px', height: '40px' }}>
                <i className="bi bi-mortarboard text-white fs-5"></i>
              </div>
              <div>
                <h6 className="mb-0 fw-bold">Attendance System</h6>
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

        {/* Navigation Menu */}
        <nav className="flex-grow-1 p-3">
          <div className="d-flex flex-column gap-2">
            {/* Dashboard */}
            <button
              className={`btn text-start d-flex align-items-center py-3 ${
                activeView === 'dashboard' 
                  ? 'btn-primary text-white' 
                  : 'btn-light text-dark'
              }`}
              style={{ borderRadius: '10px' }}
              onClick={() => {
                setActiveView('dashboard');
                setSidebarOpen(false);
              }}
            >
              <i className="bi bi-house-door fs-5 me-3"></i>
              <div>
                <div className="fw-medium">Dashboard</div>
                <small className={activeView === 'dashboard' ? 'text-white-50' : 'text-muted'}>
                  Today's classes & attendance
                </small>
              </div>
            </button>

            {/* Reports */}
            <button
              className={`btn text-start d-flex align-items-center py-3 ${
                activeView === 'reports' 
                  ? 'btn-success text-white' 
                  : 'btn-light text-dark'
              }`}
              style={{ borderRadius: '10px' }}
              onClick={() => {
                setActiveView('reports');
                setSidebarOpen(false);
              }}
            >
              <i className="bi bi-file-earmark-text fs-5 me-3"></i>
              <div>
                <div className="fw-medium">Reports</div>
                <small className={activeView === 'reports' ? 'text-white-50' : 'text-muted'}>
                  View all class data & history
                </small>
              </div>
            </button>

            {/* Analytics */}
            <button
              className="btn text-start d-flex align-items-center py-3 btn-light text-muted"
              style={{ borderRadius: '10px', opacity: 0.6 }}
              disabled
            >
              <i className="bi bi-graph-up fs-5 me-3"></i>
              <div>
                <div className="fw-medium d-flex align-items-center">
                  Analytics 
                  <span className="badge bg-secondary ms-2" style={{ fontSize: '0.7rem' }}>Soon</span>
                </div>
                <small className="text-muted">
                  Trends & insights
                </small>
              </div>
            </button>

            <hr className="my-3" />

            {/* Quick Actions */}
            <div className="mb-2">
              <small className="text-muted fw-bold text-uppercase" style={{ fontSize: '0.75rem' }}>
                Quick Actions
              </small>
            </div>

            <button
              className="btn btn-outline-primary text-start d-flex align-items-center py-2"
              style={{ borderRadius: '8px' }}
              onClick={() => {
                loadTeacherData();
                setSidebarOpen(false);
              }}
            >
              <i className="bi bi-arrow-clockwise me-3"></i>
              Refresh Data
            </button>
          </div>
        </nav>

        {/* User Profile */}
        <div className="border-top p-3">
          <div className="dropdown">
            <button 
              className="btn btn-light w-100 d-flex align-items-center text-start py-3"
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
                  {currentUser?.name?.split(' ').slice(0, 2).join(' ') || 'Teacher'}
                </div>
                <small className="text-muted">
                  {currentUser?.roles?.includes('homeroom') ? 'Homeroom' : 'Subject'} Teacher
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

  // Empty state component
  const EmptyStateWithScheduleContext = ({ scheduleContext, onRetry }) => {
    if (activeView === 'reports') {
      return (
        <div className="text-center py-5">
          <i className="bi bi-file-text display-4 text-muted"></i>
          <h5 className="mt-3">No Classes Available</h5>
          <p className="text-muted">
            You don't have any classes assigned to view reports for.
          </p>
          <div className="mt-4">
            <button className="btn btn-primary" onClick={onRetry}>
              <i className="bi bi-arrow-clockwise me-1"></i>
              Retry Loading Data
            </button>
          </div>
        </div>
      );
    }

    if (!scheduleContext || scheduleContext.totalSubjectsFiltered === 0) {
      return (
        <div className="text-center py-5">
          <i className="bi bi-calendar-x display-4 text-muted"></i>
          <h5 className="mt-3">No sections assigned</h5>
          <p className="text-muted">
            You don't have any sections assigned yet. Please contact your administrator.
          </p>
          <div className="mt-4">
            <button className="btn btn-primary" onClick={onRetry}>
              <i className="bi bi-arrow-clockwise me-1"></i>
              Retry Loading Data
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="text-center py-5">
        <i className="bi bi-calendar-day display-4 text-info"></i>
        <h5 className="mt-3">No classes scheduled for {scheduleContext.currentDay}</h5>
        <p className="text-muted">
          You have {scheduleContext.totalSubjectsFiltered} subject{scheduleContext.totalSubjectsFiltered !== 1 ? 's' : ''} assigned, 
          but none are scheduled for today.
        </p>
        
        <div className="mt-4">
          <button className="btn btn-outline-secondary" onClick={onRetry}>
            <i className="bi bi-arrow-clockwise me-1"></i>
            Refresh
          </button>
        </div>

        <div className="mt-3">
          <small className="text-muted">
            Tip: Use the "Reports" tab to view all your classes
          </small>
        </div>
      </div>
    );
  };

  const filteredSections = sections.filter(section =>
    section.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.subject?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const homeroomCount = sections.filter(s => s.isHomeroom).length;
  const subjectCount = sections.filter(s => !s.isHomeroom).length;
  const completedCount = sections.filter(s => s.attendanceTaken).length;

  // Helper functions
  const getScheduleDisplay = (section) => {
    if (section.isHomeroom || !section.scheduleDisplay) return null;
    return <span>{section.scheduleDisplay}</span>;
  };

  const getRoomDisplay = (section) => {
    if (section.isHomeroom) {
      const grade = section.sectionData?.gradeLevel || '';
      const sectionLetter = (section.sectionData?.sectionName || section.sectionData?.section || 'A').charAt(0);
      return `Room ${grade}${sectionLetter}1`;
    }
    return `Room ${section.roomNumber || 'TBD'}`;
  };

  const getHeaderClass = (section) => {
    if (section.isHomeroom) return 'bg-warning text-dark';
    
    if (activeView === 'dashboard' && section.isScheduledToday === false) {
      return 'bg-light text-muted';
    }
    
    const subjectColor = subjectColors[section.subject];
    if (subjectColor) {
      return 'text-white';
    }
    
    return 'bg-light text-dark';
  };

  const getHeaderStyle = (section) => {
    if (section.isHomeroom) return {};
    
    const subjectColor = subjectColors[section.subject];
    let style = {};
    
    if (subjectColor) {
      style.backgroundColor = subjectColor.hex;
    }
    
    if (activeView === 'dashboard' && section.isScheduledToday === false) {
      style.opacity = 0.7;
    }
    
    return style;
  };

  const getViewInfo = () => {
    switch (activeView) {
      case 'dashboard':
        return {
          title: 'Today\'s Classes',
          description: 'Take attendance for scheduled classes'
        };
      case 'reports':
        return {
          title: 'Class Reports',
          description: 'View attendance history for all classes'
        };
      case 'analytics':
        return {
          title: 'Analytics',
          description: 'Coming soon - attendance analytics and insights'
        };
      default:
        return {
          title: 'Dashboard',
          description: 'Manage your classes'
        };
    }
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

  const viewInfo = getViewInfo();

  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      {/* Hamburger Sidebar */}
      {renderHamburgerSidebar()}

      {/* Main Content */}
      <div className="flex-grow-1" style={{ backgroundColor: '#f8f9fa' }}>
        {/* Header with Hamburger */}
        <div className="bg-white border-bottom shadow-sm">
          <div className="container-fluid py-3">
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
                    {currentUser?.roles?.includes('homeroom') && (
                      <span className="badge bg-warning text-dark">Homeroom Teacher</span>
                    )}
                    {currentUser?.roles?.includes('subject') && (
                      <span className="badge bg-info">Subject Teacher</span>
                    )}
                    {scheduleContext && (
                      <span className="badge bg-light text-dark">
                        <i className="bi bi-calendar-week me-1"></i>
                        {scheduleContext.weekDisplay}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Notifications Only */}
              <div className="d-flex align-items-center me-4">
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
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="container-fluid py-4">
          {activeView === 'dashboard' ? (
            <>
              {/* Schedule banner */}
              {scheduleContext && (
                <div className="alert alert-info border-0 mb-4">
                  <div className="d-flex align-items-center">
                    <i className="bi bi-calendar-week me-2"></i>
                    <div>
                      <strong>Today's Schedule:</strong> 
                      {scheduleContext.weekDisplay} • {scheduleContext.currentDay.charAt(0).toUpperCase() + scheduleContext.currentDay.slice(1)}
                      {scheduleContext.totalSubjectsFiltered > 0 && (
                        <small className="text-muted ms-2">
                          ({scheduleContext.totalSubjectsFiltered} subjects not scheduled today - check Reports tab to view all)
                        </small>
                      )}
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

              {/* Sections Cards */}
              {filteredSections.length > 0 ? (
                <div className="row g-3">
                  {filteredSections.map((section, index) => {
                    const uniqueKey = section.isMultiSection 
                      ? `multi-${section.subject}-${section.actualSectionIds?.join('-') || index}`
                      : `single-${section.subject}-${section.sectionId || section.id || index}`;
                      
                    return (
                      <div className="col-md-6 col-lg-4" key={uniqueKey}>
                        <div
                          className={`card border-2 ${
                            section.attendanceTaken ? 'border-success' : 
                            section.isScheduledToday === false ? 'border-secondary' : 'border-warning'
                          }`}
                          onClick={() => handleCardClick(section)}
                          style={{ 
                            cursor: 'pointer',
                            opacity: section.isScheduledToday === false ? 0.8 : 1
                          }}
                        >
                          <div 
                            className={`card-header ${getHeaderClass(section)} p-3`}
                            style={getHeaderStyle(section)}
                          >
                            <div className="d-flex justify-content-between align-items-start">
                              <div className="flex-grow-1">
                                <h6 className="mb-1 fw-bold">
                                  {section.isHomeroom && <i className="bi bi-house-door me-1"></i>}
                                  {section.subject || section.name}
                                  {section.isScheduledToday === false && (
                                    <span className="badge bg-secondary ms-2 opacity-75">
                                      {activeView === 'reports' ? 'Click to View History' : 'Not Today'}
                                    </span>
                                  )}
                                </h6>
                                
                                <div className="small opacity-75 mt-1">
                                  <i className="bi bi-geo-alt me-1"></i>
                                  {getRoomDisplay(section)}
                                </div>
                              </div>

                              <div className="d-flex flex-column align-items-end gap-1">
                                {section.isHomeroom && (
                                  <span className="badge bg-light text-dark">
                                    <i className="bi bi-star-fill me-1"></i>
                                    YOUR HOMEROOM
                                  </span>
                                )}
                                
                                {section.isScheduledToday === false ? (
                                  <span className="badge bg-info">
                                    <i className="bi bi-bar-chart me-1"></i>
                                    View Data
                                  </span>
                                ) : (
                                  <span className={`badge ${section.attendanceTaken ? 'bg-success' : 'bg-secondary'}`}>
                                    <i className={`bi ${section.attendanceTaken ? 'bi-check-circle' : 'bi-clock'} me-1`}></i>
                                    {section.attendanceTaken ? 'Taken' : 'Pending'}
                                  </span>
                                )}
                                
                                {getScheduleDisplay(section) && (
                                  <div className="small opacity-75">
                                    <i className="bi bi-clock me-1"></i>
                                    {getScheduleDisplay(section)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="card-body p-3">
                            {section.isEmpty ? (
                              <>
                                <div className="text-center py-3">
                                  <i className="bi bi-people text-muted mb-2 d-block" style={{ fontSize: '2rem' }}></i>
                                  <small className="text-muted">
                                    No students enrolled
                                  </small>
                                  <div className="mt-2">
                                    <span className="badge bg-light text-dark">
                                      Subject assigned but no enrollments
                                    </span>
                                  </div>
                                </div>
                              </>
                            ) : section.isScheduledToday !== false ? (
                              <>
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
                              </>
                            ) : (
                              <>
                                <div className="text-center py-3">
                                  <i className="bi bi-bar-chart text-info mb-2 d-block" style={{ fontSize: '2rem' }}></i>
                                  <small className="text-muted">
                                    Click to view attendance history
                                  </small>
                                  <div className="mt-2">
                                    <span className="badge bg-light text-dark">
                                      {section.enrolledCount || 0} students enrolled
                                    </span>
                                  </div>
                                  <div className="mt-2">
                                    <small className="text-info">
                                      <i className="bi bi-cursor me-1"></i>
                                      Tap card to open monitor view
                                    </small>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyStateWithScheduleContext 
                  scheduleContext={scheduleContext}
                  onRetry={loadTeacherData}
                />
              )}
            </>
          ) : activeView === 'reports' ? (
            <>
              {/* Reports View */}
              <div className="alert alert-success border-0 mb-4">
                <div className="d-flex align-items-center">
                  <i className="bi bi-file-earmark-text me-2"></i>
                  <div>
                    <strong>Reports Mode:</strong> View attendance history and data for all your classes
                    <small className="d-block text-muted mt-1">
                      Click any class card to open the monitor view with detailed attendance history
                    </small>
                  </div>
                </div>
              </div>

              {/* Search and Stats for Reports */}
              <div className="row mb-4">
                <div className="col-md-6">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search all classes..."
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
                      <small className="text-muted">All Subjects</small>
                    </div>
                    <div className="text-center">
                      <div className="h5 mb-0 text-primary">{filteredSections.length}</div>
                      <small className="text-muted">Total Classes</small>
                    </div>
                  </div>
                </div>
              </div>

              {/* All Classes Cards for Reports */}
              {filteredSections.length > 0 ? (
                <div className="row g-3">
                  {filteredSections.map((section, index) => {
                    const uniqueKey = section.isMultiSection 
                      ? `reports-multi-${section.subject}-${section.actualSectionIds?.join('-') || index}`
                      : `reports-single-${section.subject}-${section.sectionId || section.id || index}`;
                      
                    return (
                      <div className="col-md-6 col-lg-4" key={uniqueKey}>
                        <div
                          className="card border-2 border-info"
                          onClick={() => handleCardClick(section)}
                          style={{ 
                            cursor: 'pointer',
                            background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)'
                          }}
                        >
                          <div 
                            className={`card-header ${getHeaderClass(section)} p-3`}
                            style={getHeaderStyle(section)}
                          >
                            <div className="d-flex justify-content-between align-items-start">
                              <div className="flex-grow-1">
                                <h6 className="mb-1 fw-bold">
                                  {section.isHomeroom && <i className="bi bi-house-door me-1"></i>}
                                  {section.subject || section.name}
                                  <span className="badge bg-info ms-2">
                                    <i className="bi bi-bar-chart me-1"></i>
                                    View History
                                  </span>
                                </h6>
                                
                                <div className="small opacity-75 mt-1">
                                  <i className="bi bi-geo-alt me-1"></i>
                                  {getRoomDisplay(section)}
                                </div>
                              </div>

                              <div className="d-flex flex-column align-items-end gap-1">
                                {section.isHomeroom && (
                                  <span className="badge bg-light text-dark">
                                    <i className="bi bi-star-fill me-1"></i>
                                    HOMEROOM
                                  </span>
                                )}
                                
                                <span className="badge bg-secondary">
                                  <i className="bi bi-calendar-week me-1"></i>
                                  All Time
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="card-body p-3">
                            {section.isEmpty ? (
                              <div className="text-center py-3">
                                <i className="bi bi-people text-muted mb-2 d-block" style={{ fontSize: '2rem' }}></i>
                                <small className="text-muted">No students enrolled</small>
                                <div className="mt-2">
                                  <span className="badge bg-light text-dark">
                                    Subject assigned but no enrollments
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-3">
                                <i className="bi bi-graph-up text-info mb-2 d-block" style={{ fontSize: '2rem' }}></i>
                                <small className="text-muted">
                                  Click to view detailed attendance reports
                                </small>
                                <div className="mt-2">
                                  <span className="badge bg-primary">
                                    {section.enrolledCount || 0} students
                                  </span>
                                </div>
                                <div className="mt-2">
                                  <small className="text-info">
                                    <i className="bi bi-cursor me-1"></i>
                                    Open comprehensive monitor
                                  </small>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyStateWithScheduleContext 
                  scheduleContext={scheduleContext}
                  onRetry={loadTeacherData}
                />
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
              <div className="mt-4">
                <button 
                  className="btn btn-outline-primary me-2"
                  onClick={() => setActiveView('dashboard')}
                >
                  <i className="bi bi-house-door me-1"></i>
                  Go to Dashboard
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={() => setActiveView('reports')}
                >
                  <i className="bi bi-file-earmark-text me-1"></i>
                  View Reports
                </button>
              </div>
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
                    <i className={`bi ${selectedSection.isHomeroom ? 'bi-house-door-fill' : 'bi-book-fill'} ${selectedSection.isHomeroom ? 'text-warning' : 'text-info'}`} style={{ fontSize: '2rem' }}></i>
                  </div>
                  <h5 className="modal-title mb-0" style={{ 
                    fontSize: '18px', 
                    fontWeight: '600',
                    color: '#333'
                  }}>
                    {selectedSection.isHomeroom ? 'Homeroom Options' : `${selectedSection.subject} Options`}
                  </h5>
                  {selectedSection.scheduleDisplay && (
                    <small className="text-muted">
                      <i className="bi bi-clock me-1"></i>
                      {selectedSection.scheduleDisplay}
                    </small>
                  )}
                  {selectedSection.isEmpty && (
                    <div className="mt-2">
                      <span className="badge bg-warning">No students enrolled</span>
                    </div>
                  )}
                  {selectedSection.isScheduledToday === false && !selectedSection.isEmpty && (
                    <div className="mt-2">
                      <span className="badge bg-secondary">Not scheduled today</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-body px-4 pb-4 pt-0">
                <div className="d-grid gap-3">
                  {selectedSection.isEmpty ? (
                    <div className="alert alert-info">
                      <i className="bi bi-info-circle me-2"></i>
                      This subject has no students enrolled yet. Contact administration to add students.
                    </div>
                  ) : selectedSection.isScheduledToday !== false ? (
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
                  ) : (
                    <button 
                      className="btn btn-outline-secondary py-3"
                      disabled
                      style={{ 
                        fontSize: '15px', 
                        fontWeight: '500',
                        borderRadius: '8px'
                      }}
                    >
                      <i className="bi bi-calendar-x me-2"></i>
                      No class scheduled today
                    </button>
                  )}
                  
                  {!selectedSection.isEmpty && (
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
                      {selectedSection.isScheduledToday === false 
                        ? `View Past ${selectedSection.subject} Attendance`
                        : selectedSection.isHomeroom 
                          ? 'Monitor All Subject Attendance' 
                          : `Monitor ${selectedSection.subject} Classes`
                      }
                    </button>
                  )}
                  
                  <button 
                    className="btn btn-secondary py-3"
                    onClick={() => setShowModal(false)}
                    style={{ 
                      fontSize: '15px', 
                      fontWeight: '500',
                      borderRadius: '8px'
                    }}
                  >
                    Close
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