// src/components/supervisor/ViewStudents.js
import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';

function ViewStudents({ currentUser }) {
  const [students, setStudents] = useState([]);
  const [sections, setSections] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // View and filter states
  const [viewMode, setViewMode] = useState('sections'); // sections, students, analytics
  const [filters, setFilters] = useState({
    search: '',
    section: 'all',
    grade: 'all',
    attendance: 'all', // all, high, medium, low
    sortBy: 'section' // section, name, grade, attendance
  });
  
  // Modal states
  const [selectedSection, setSelectedSection] = useState(null);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [attendanceData, setAttendanceData] = useState({ records: [], stats: {} });
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  
  // Statistics
  const [studentStats, setStudentStats] = useState({
    total: 0,
    byGrade: {},
    bySections: {},
    averagePerSection: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedStudent && showStudentModal) {
      loadStudentAttendanceData();
    }
  }, [selectedStudent, showStudentModal]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [studentsData, sectionsData, teachersData] = await Promise.all([
        loadStudents(),
        loadSections(),
        loadTeachers()
      ]);
      
      setStudents(studentsData);
      setSections(sectionsData);
      setTeachers(teachersData);
      calculateStudentStats(studentsData, sectionsData);
      
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'students'));
      const studentsData = [];
      
      snapshot.forEach(doc => {
        studentsData.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return studentsData;
    } catch (error) {
      console.error('Error loading students:', error);
      return [];
    }
  };

  const loadSections = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'sections'));
      const sectionsData = [];
      
      snapshot.forEach(doc => {
        sectionsData.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return sectionsData;
    } catch (error) {
      console.error('Error loading sections:', error);
      return [];
    }
  };

  const loadTeachers = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const teachersData = [];
      
      snapshot.forEach(doc => {
        const userData = doc.data();
        if (userData.roles && (userData.roles.includes('homeroom') || userData.roles.includes('subject'))) {
          teachersData.push({
            id: doc.id,
            ...userData
          });
        }
      });
      
      return teachersData;
    } catch (error) {
      console.error('Error loading teachers:', error);
      return [];
    }
  };

  const calculateStudentStats = (studentsData, sectionsData) => {
    const stats = {
      total: studentsData.length,
      byGrade: {},
      bySections: {},
      averagePerSection: 0
    };

    // Calculate by grade
    studentsData.forEach(student => {
      const section = sectionsData.find(s => s.id === student.sectionId);
      if (section) {
        const grade = `Grade ${section.gradeLevel}`;
        stats.byGrade[grade] = (stats.byGrade[grade] || 0) + 1;
        stats.bySections[section.id] = (stats.bySections[section.id] || 0) + 1;
      }
    });

    stats.averagePerSection = sectionsData.length > 0 ? Math.round(studentsData.length / sectionsData.length) : 0;
    
    setStudentStats(stats);
  };

  const getHomeroomTeacher = (sectionId) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section || !section.homeroomTeacher) {
      return 'No homeroom teacher assigned';
    }
    
    const teacher = teachers.find(t => t.id === section.homeroomTeacher);
    return teacher ? teacher.name : section.homeroomTeacher;
  };

  const getSectionData = () => {
    const sectionsWithStudents = sections.map(section => {
      const sectionStudents = students.filter(s => s.sectionId === section.id);
      return {
        ...section,
        studentCount: sectionStudents.length,
        students: sectionStudents,
        homeroomTeacher: getHomeroomTeacher(section.id)
      };
    });

    // Apply filters
    let filtered = sectionsWithStudents.filter(section => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matches = 
          section.name.toLowerCase().includes(searchLower) ||
          section.homeroomTeacher.toLowerCase().includes(searchLower);
        if (!matches) return false;
      }
      
      if (filters.grade !== 'all' && section.gradeLevel !== parseInt(filters.grade)) return false;
      
      return true;
    });

    // Sort sections
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'grade':
          return a.gradeLevel - b.gradeLevel;
        case 'students':
          return b.studentCount - a.studentCount;
        case 'section':
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return filtered;
  };

  const getFilteredStudents = () => {
    let filtered = students.filter(student => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matches = 
          `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchLower) ||
          student.studentId?.toLowerCase().includes(searchLower) ||
          student.email?.toLowerCase().includes(searchLower);
        if (!matches) return false;
      }
      
      if (filters.section !== 'all' && student.sectionId !== filters.section) return false;
      
      const section = sections.find(s => s.id === student.sectionId);
      if (filters.grade !== 'all' && section && section.gradeLevel !== parseInt(filters.grade)) return false;
      
      return true;
    });

    // Sort students
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'name':
          return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
        case 'grade':
          const sectionA = sections.find(s => s.id === a.sectionId);
          const sectionB = sections.find(s => s.id === b.sectionId);
          return (sectionA?.gradeLevel || 0) - (sectionB?.gradeLevel || 0);
        case 'section':
        default:
          const sectionNameA = sections.find(s => s.id === a.sectionId)?.name || '';
          const sectionNameB = sections.find(s => s.id === b.sectionId)?.name || '';
          return sectionNameA.localeCompare(sectionNameB);
      }
    });

    return filtered;
  };

  const loadStudentAttendanceData = async () => {
    if (!selectedStudent) return;
    
    try {
      setLoadingAttendance(true);
      const attendanceQuery = query(
        collection(db, 'attendance'),
        orderBy('date', 'desc'),
        limit(30)
      );
      
      const snapshot = await getDocs(attendanceQuery);
      const studentAttendance = [];
      let totalPresent = 0;
      let totalAbsent = 0;
      let totalLate = 0;
      let totalExcused = 0;
      let totalRecords = 0;

      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.students && Array.isArray(data.students)) {
          const studentRecord = data.students.find(s => 
            s.studentId === selectedStudent.studentId || 
            s.id === selectedStudent.id ||
            s.studentName === `${selectedStudent.firstName} ${selectedStudent.lastName}`
          );
          
          if (studentRecord) {
            studentAttendance.push({
              date: data.date,
              subject: data.isHomeroom ? 'Homeroom' : (data.subjectName || 'Subject'),
              status: studentRecord.status,
              time: data.timestamp ? new Date(data.timestamp).toLocaleTimeString() : 'N/A',
              teacher: data.takenBy || 'Unknown'
            });

            totalRecords++;
            switch (studentRecord.status) {
              case 'present': totalPresent++; break;
              case 'absent': totalAbsent++; break;
              case 'late': totalLate++; break;
              case 'excused': totalExcused++; break;
            }
          }
        }
      });

      const attendanceRate = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0;
      
      setAttendanceData({
        records: studentAttendance,
        stats: {
          attendanceRate,
          totalPresent,
          totalAbsent,
          totalLate,
          totalExcused,
          totalRecords
        }
      });
      
    } catch (error) {
      console.error('Error loading student attendance:', error);
      setAttendanceData({ records: [], stats: {} });
    } finally {
      setLoadingAttendance(false);
    }
  };

  const handleSectionClick = (section) => {
    setSelectedSection(section);
    setShowSectionModal(true);
  };

  const handleStudentClick = (student) => {
    const section = sections.find(s => s.id === student.sectionId);
    setSelectedStudent({ ...student, section });
    setShowStudentModal(true);
  };

  const renderStatsCards = () => (
    <div className="row mb-4">
      <div className="col-lg-3 col-md-6 mb-3">
        <div className="card border-0 shadow-sm h-100">
          <div className="card-body text-center">
            <div className="bg-primary bg-opacity-10 rounded-circle p-3 mx-auto mb-2" style={{ width: '60px', height: '60px' }}>
              <i className="bi bi-people-fill fs-4 text-primary"></i>
            </div>
            <h3 className="mb-0">{studentStats.total}</h3>
            <small className="text-muted">Total Students</small>
          </div>
        </div>
      </div>

      <div className="col-lg-3 col-md-6 mb-3">
        <div className="card border-0 shadow-sm h-100">
          <div className="card-body text-center">
            <div className="bg-success bg-opacity-10 rounded-circle p-3 mx-auto mb-2" style={{ width: '60px', height: '60px' }}>
              <i className="bi bi-diagram-3-fill fs-4 text-success"></i>
            </div>
            <h3 className="mb-0">{sections.length}</h3>
            <small className="text-muted">Active Sections</small>
          </div>
        </div>
      </div>

      <div className="col-lg-3 col-md-6 mb-3">
        <div className="card border-0 shadow-sm h-100">
          <div className="card-body text-center">
            <div className="bg-info bg-opacity-10 rounded-circle p-3 mx-auto mb-2" style={{ width: '60px', height: '60px' }}>
              <i className="bi bi-calculator fs-4 text-info"></i>
            </div>
            <h3 className="mb-0">{studentStats.averagePerSection}</h3>
            <small className="text-muted">Avg per Section</small>
          </div>
        </div>
      </div>

      <div className="col-lg-3 col-md-6 mb-3">
        <div className="card border-0 shadow-sm h-100">
          <div className="card-body text-center">
            <div className="bg-warning bg-opacity-10 rounded-circle p-3 mx-auto mb-2" style={{ width: '60px', height: '60px' }}>
              <i className="bi bi-mortarboard-fill fs-4 text-warning"></i>
            </div>
            <h3 className="mb-0">{Object.keys(studentStats.byGrade).length}</h3>
            <small className="text-muted">Grade Levels</small>
          </div>
        </div>
      </div>
    </div>
  );

  const renderFiltersAndControls = () => (
    <div className="card border-0 shadow-sm mb-4">
      <div className="card-body">
        <div className="row align-items-end">
          <div className="col-md-3 mb-3">
            <label className="form-label small text-muted">SEARCH</label>
            <div className="input-group">
              <span className="input-group-text border-end-0 bg-white">
                <i className="bi bi-search text-muted"></i>
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Search students, sections..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>
          </div>

          <div className="col-md-2 mb-3">
            <label className="form-label small text-muted">SECTION</label>
            <select 
              className="form-select"
              value={filters.section}
              onChange={(e) => setFilters(prev => ({ ...prev, section: e.target.value }))}
            >
              <option value="all">All Sections</option>
              {sections.map(section => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-2 mb-3">
            <label className="form-label small text-muted">GRADE</label>
            <select 
              className="form-select"
              value={filters.grade}
              onChange={(e) => setFilters(prev => ({ ...prev, grade: e.target.value }))}
            >
              <option value="all">All Grades</option>
              {[...new Set(sections.map(s => s.gradeLevel))].sort().map(grade => (
                <option key={grade} value={grade}>
                  Grade {grade}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-2 mb-3">
            <label className="form-label small text-muted">SORT BY</label>
            <select 
              className="form-select"
              value={filters.sortBy}
              onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
            >
              <option value="section">By Section</option>
              <option value="name">By Name</option>
              <option value="grade">By Grade</option>
              {viewMode === 'sections' && <option value="students">By Student Count</option>}
            </select>
          </div>

          <div className="col-md-3 mb-3">
            <label className="form-label small text-muted">VIEW MODE</label>
            <div className="btn-group w-100" role="group">
              <button
                type="button"
                className={`btn ${viewMode === 'sections' ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setViewMode('sections')}
              >
                <i className="bi bi-diagram-3 me-1"></i>
                Sections
              </button>
              <button
                type="button"
                className={`btn ${viewMode === 'students' ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setViewMode('students')}
              >
                <i className="bi bi-people me-1"></i>
                Students
              </button>
            </div>
          </div>
        </div>

        {/* Quick filters */}
        <div className="mt-3 pt-3 border-top">
          <small className="text-muted me-3">QUICK FILTERS:</small>
          <div className="btn-group btn-group-sm">
            {Object.keys(studentStats.byGrade).map(grade => (
              <button 
                key={grade}
                className="btn btn-outline-secondary"
                onClick={() => setFilters(prev => ({ ...prev, grade: grade.replace('Grade ', '') }))}
              >
                {grade} ({studentStats.byGrade[grade]})
              </button>
            ))}
            <button 
              className="btn btn-outline-secondary"
              onClick={() => setFilters({ search: '', section: 'all', grade: 'all', sortBy: 'section' })}
            >
              Clear All
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSectionsView = () => {
    const sectionsData = getSectionData();
    
    return (
      <div className="row">
        {sectionsData.map((section) => (
          <div key={section.id} className="col-lg-6 col-xl-4 mb-4">
            <div 
              className="card border-0 shadow-sm h-100"
              style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
              onClick={() => handleSectionClick(section)}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div className="card-header bg-gradient text-white" 
                   style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <h6 className="mb-1">
                      <i className="bi bi-diagram-3 me-2"></i>
                      {section.name}
                    </h6>
                    <small className="opacity-75">
                      Grade {section.gradeLevel}
                    </small>
                  </div>
                  <span className="badge bg-light text-dark">
                    <i className="bi bi-people me-1"></i>
                    {section.studentCount}
                  </span>
                </div>
              </div>

              <div className="card-body">
                <div className="row mb-3">
                  <div className="col-6 border-end">
                    <div className="text-center">
                      <i className="bi bi-person-workspace text-primary d-block mb-1"></i>
                      <small className="text-muted d-block">Homeroom Teacher</small>
                      <div className="fw-medium small">{section.homeroomTeacher}</div>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="text-center">
                      <i className="bi bi-door-open text-success d-block mb-1"></i>
                      <small className="text-muted d-block">Room</small>
                      <div className="fw-medium small">{section.room || 'Not assigned'}</div>
                    </div>
                  </div>
                </div>

                <div className="d-flex justify-content-between align-items-center">
                  <small className="text-muted">
                    <i className="bi bi-people me-1"></i>
                    {section.studentCount} students enrolled
                  </small>
                  <i className="bi bi-arrow-right text-muted"></i>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderStudentsView = () => {
    const studentsData = getFilteredStudents();
    
    return (
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-0">
          <div className="d-flex justify-content-between align-items-center">
            <h6 className="mb-0">
              <i className="bi bi-people me-2"></i>
              Students List ({studentsData.length})
            </h6>
            <span className="badge bg-secondary">READ ONLY</span>
          </div>
        </div>
        <div className="card-body p-0">
          {studentsData.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-3">Student</th>
                    <th>Student ID</th>
                    <th>Section</th>
                    <th>Grade</th>
                    <th className="pe-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {studentsData.map((student) => {
                    const section = sections.find(s => s.id === student.sectionId);
                    return (
                      <tr key={student.id}>
                        <td className="ps-3">
                          <div className="d-flex align-items-center">
                            <div className="bg-primary bg-opacity-10 rounded-circle p-2 me-3">
                              <i className="bi bi-person text-primary"></i>
                            </div>
                            <div>
                              <div className="fw-medium">
                                {student.firstName} {student.lastName}
                              </div>
                              <small className="text-muted">{student.email || 'No email'}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <code className="text-primary">{student.studentId}</code>
                        </td>
                        <td>
                          <span className="badge bg-info bg-opacity-10 text-info">
                            {section?.name || 'No section'}
                          </span>
                        </td>
                        <td>
                          <span className="badge bg-warning bg-opacity-10 text-warning">
                            Grade {section?.gradeLevel || 'N/A'}
                          </span>
                        </td>
                        <td className="pe-3">
                          <button 
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => handleStudentClick(student)}
                          >
                            <i className="bi bi-eye me-1"></i>
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-5">
              <i className="bi bi-person-x fs-1 text-muted"></i>
              <h6 className="mt-3 text-muted">No Students Found</h6>
              <p className="text-muted">
                {filters.search ? 
                  `No students match "${filters.search}"` : 
                  'No students available with current filters'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSectionModal = () => {
    if (!selectedSection) return null;

    return (
      <div className={`modal fade ${showSectionModal ? 'show' : ''}`} 
           style={{ display: showSectionModal ? 'block' : 'none' }}
           tabIndex="-1">
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                <i className="bi bi-diagram-3 me-2"></i>
                {selectedSection.name} - Student Details
              </h5>
              <button type="button" className="btn-close" 
                      onClick={() => setShowSectionModal(false)}></button>
            </div>
            <div className="modal-body">
              {/* Section Info */}
              <div className="card mb-3">
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-3">
                      <strong>Grade Level:</strong>
                      <p className="mb-0">Grade {selectedSection.gradeLevel}</p>
                    </div>
                    <div className="col-md-3">
                      <strong>Room:</strong>
                      <p className="mb-0">{selectedSection.room || 'Not assigned'}</p>
                    </div>
                    <div className="col-md-6">
                      <strong>Homeroom Teacher:</strong>
                      <p className="mb-0">{selectedSection.homeroomTeacher}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Students List */}
              <h6>Enrolled Students ({selectedSection.students.length})</h6>
              {selectedSection.students.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead className="table-light">
                      <tr>
                        <th>Student Name</th>
                        <th>Student ID</th>
                        <th>Email</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSection.students.map((student) => (
                        <tr key={student.id}>
                          <td>
                            <div className="fw-medium">
                              {student.firstName} {student.lastName}
                            </div>
                          </td>
                          <td>
                            <code className="text-primary">{student.studentId}</code>
                          </td>
                          <td>
                            <small className="text-muted">
                              {student.email || 'No email'}
                            </small>
                          </td>
                          <td>
                            <button 
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => {
                                handleStudentClick(student);
                                setShowSectionModal(false);
                              }}
                            >
                              <i className="bi bi-eye me-1"></i>
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-4">
                  <i className="bi bi-person-x fs-1 text-muted"></i>
                  <p className="text-muted">No students enrolled in this section</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <span className="badge bg-secondary me-auto">
                <i className="bi bi-eye me-1"></i>
                Read Only Access
              </span>
              <button type="button" className="btn btn-secondary" 
                      onClick={() => setShowSectionModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderStudentModal = () => {
    if (!selectedStudent) return null;

    const getStatusBadgeClass = (status) => {
      switch (status) {
        case 'present': return 'bg-success';
        case 'absent': return 'bg-danger';
        case 'late': return 'bg-warning text-dark';
        case 'excused': return 'bg-info';
        default: return 'bg-secondary';
      }
    };

    const getTrendInfo = () => {
      if (attendanceData.records.length < 3) return { direction: 'same', text: 'Insufficient data', class: 'text-muted' };
      
      const recent = attendanceData.records.slice(0, 5);
      const presentCount = recent.filter(r => r.status === 'present').length;
      const percentage = (presentCount / recent.length) * 100;
      
      if (percentage >= 80) return { direction: 'up', text: 'Good attendance', class: 'text-success' };
      if (percentage >= 60) return { direction: 'same', text: 'Average attendance', class: 'text-warning' };
      return { direction: 'down', text: 'Needs improvement', class: 'text-danger' };
    };

    const trend = getTrendInfo();

    return (
      <div className={`modal fade ${showStudentModal ? 'show' : ''}`} 
           style={{ display: showStudentModal ? 'block' : 'none' }}
           tabIndex="-1">
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                <i className="bi bi-person-circle me-2"></i>
                {selectedStudent.firstName} {selectedStudent.lastName}
              </h5>
              <button type="button" className="btn-close" 
                      onClick={() => setShowStudentModal(false)}></button>
            </div>
            <div className="modal-body">
              {/* Basic Info */}
              <div className="row mb-4">
                <div className="col-md-6">
                  <h6 className="text-muted mb-2">Personal Information</h6>
                  <ul className="list-unstyled">
                    <li><strong>Name:</strong> {selectedStudent.firstName} {selectedStudent.lastName}</li>
                    <li><strong>Email:</strong> {selectedStudent.email || 'Not provided'}</li>
                    <li><strong>Student ID:</strong> <code className="text-primary">{selectedStudent.studentId}</code></li>
                  </ul>
                </div>
                <div className="col-md-6">
                  <h6 className="text-muted mb-2">Academic Information</h6>
                  <ul className="list-unstyled">
                    <li><strong>Section:</strong> {selectedStudent.section?.name || 'Not assigned'}</li>
                    <li><strong>Grade Level:</strong> Grade {selectedStudent.section?.gradeLevel || 'N/A'}</li>
                    <li><strong>Homeroom Teacher:</strong> {getHomeroomTeacher(selectedStudent.section?.id)}</li>
                  </ul>
                </div>
              </div>

              {/* Attendance Analysis */}
              <div className="card">
                <div className="card-header bg-primary text-white">
                  <h6 className="mb-0">
                    <i className="bi bi-calendar-check me-2"></i>
                    Attendance Analysis
                  </h6>
                </div>
                <div className="card-body">
                  {loadingAttendance ? (
                    <div className="text-center py-3">
                      <div className="spinner-border spinner-border-sm text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      <p className="text-muted mt-2 mb-0">Loading attendance data...</p>
                    </div>
                  ) : (
                    <>
                      {/* Stats Overview */}
                      <div className="row text-center mb-4">
                        <div className="col-3">
                          <div className="border rounded p-2">
                            <h4 className={`mb-1 ${attendanceData.stats.attendanceRate >= 90 ? 'text-success' : 
                              attendanceData.stats.attendanceRate >= 80 ? 'text-warning' : 'text-danger'}`}>
                              {attendanceData.stats.attendanceRate || 0}%
                            </h4>
                            <small className="text-muted">Attendance Rate</small>
                          </div>
                        </div>
                        <div className="col-3">
                          <div className="border rounded p-2">
                            <h4 className="text-success mb-1">{attendanceData.stats.totalPresent || 0}</h4>
                            <small className="text-muted">Present</small>
                          </div>
                        </div>
                        <div className="col-3">
                          <div className="border rounded p-2">
                            <h4 className="text-danger mb-1">{attendanceData.stats.totalAbsent || 0}</h4>
                            <small className="text-muted">Absent</small>
                          </div>
                        </div>
                        <div className="col-3">
                          <div className="border rounded p-2">
                            <h4 className="text-warning mb-1">{attendanceData.stats.totalLate || 0}</h4>
                            <small className="text-muted">Late</small>
                          </div>
                        </div>
                      </div>

                      {/* Attendance Trend */}
                      <div className="row mb-4">
                        <div className="col-md-6">
                          <h6 className="text-muted mb-2">Recent Trend</h6>
                          <div className="d-flex align-items-center">
                            <i className={`bi bi-trend-${trend.direction} ${trend.class} me-2 fs-5`}></i>
                            <div>
                              <div className={`fw-medium ${trend.class}`}>{trend.text}</div>
                              <small className="text-muted">Based on last 5 records</small>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <h6 className="text-muted mb-2">Total Records</h6>
                          <div className="d-flex align-items-center">
                            <i className="bi bi-calendar-week text-info me-2 fs-5"></i>
                            <div>
                              <div className="fw-medium">{attendanceData.stats.totalRecords || 0} classes tracked</div>
                              <small className="text-muted">Last 30 days</small>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Recent Attendance Records */}
                      <h6 className="text-muted mb-2">Recent Attendance History</h6>
                      {attendanceData.records.length > 0 ? (
                        <div className="table-responsive">
                          <table className="table table-sm">
                            <thead className="table-light">
                              <tr>
                                <th>Date</th>
                                <th>Subject/Class</th>
                                <th>Status</th>
                                <th>Time</th>
                                <th>Teacher</th>
                              </tr>
                            </thead>
                            <tbody>
                              {attendanceData.records.slice(0, 10).map((record, index) => (
                                <tr key={index}>
                                  <td>
                                    <small className="fw-medium">
                                      {new Date(record.date).toLocaleDateString()}
                                    </small>
                                  </td>
                                  <td>
                                    <small>{record.subject}</small>
                                  </td>
                                  <td>
                                    <span className={`badge ${getStatusBadgeClass(record.status)}`}>
                                      {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                                    </span>
                                  </td>
                                  <td>
                                    <small className="text-muted">{record.time}</small>
                                  </td>
                                  <td>
                                    <small className="text-muted">{record.teacher}</small>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          
                          {attendanceData.records.length > 10 && (
                            <div className="text-center mt-2">
                              <small className="text-muted">
                                Showing 10 of {attendanceData.records.length} records
                              </small>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <i className="bi bi-calendar-x text-muted fs-1"></i>
                          <p className="text-muted mt-2 mb-0">No attendance records found</p>
                          <small className="text-muted">This student may not have recent attendance data</small>
                        </div>
                      )}

                      {/* Performance Insights */}
                      {attendanceData.records.length > 0 && (
                        <div className="mt-4 p-3 bg-light rounded">
                          <h6 className="text-muted mb-2">Performance Insights</h6>
                          <div className="row">
                            <div className="col-md-6">
                              <small className="text-muted">Most Common Status:</small>
                              <div>
                                {attendanceData.stats.totalPresent >= Math.max(
                                  attendanceData.stats.totalAbsent, 
                                  attendanceData.stats.totalLate, 
                                  attendanceData.stats.totalExcused
                                ) ? (
                                  <span className="badge bg-success">Usually Present</span>
                                ) : attendanceData.stats.totalAbsent >= Math.max(
                                  attendanceData.stats.totalPresent,
                                  attendanceData.stats.totalLate,
                                  attendanceData.stats.totalExcused
                                ) ? (
                                  <span className="badge bg-danger">Often Absent</span>
                                ) : (
                                  <span className="badge bg-warning text-dark">Mixed Pattern</span>
                                )}
                              </div>
                            </div>
                            <div className="col-md-6">
                              <small className="text-muted">Attendance Level:</small>
                              <div>
                                {attendanceData.stats.attendanceRate >= 95 ? (
                                  <span className="badge bg-success">Excellent</span>
                                ) : attendanceData.stats.attendanceRate >= 90 ? (
                                  <span className="badge bg-success">Good</span>
                                ) : attendanceData.stats.attendanceRate >= 80 ? (
                                  <span className="badge bg-warning text-dark">Fair</span>
                                ) : (
                                  <span className="badge bg-danger">Needs Attention</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <span className="badge bg-secondary me-auto">
                <i className="bi bi-eye me-1"></i>
                Read Only Access
              </span>
              <button type="button" className="btn btn-secondary" 
                      onClick={() => setShowStudentModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <h5>Loading Students Data...</h5>
          <p className="text-muted">Fetching student information and sections</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Stats Overview */}
      {renderStatsCards()}

      {/* Filters and Controls */}
      {renderFiltersAndControls()}

      {/* Main Content */}
      {viewMode === 'sections' ? renderSectionsView() : renderStudentsView()}

      {/* Modals */}
      {showSectionModal && renderSectionModal()}
      {showStudentModal && renderStudentModal()}

      {/* Modal Backdrops */}
      {showSectionModal && (
        <div className="modal-backdrop fade show" 
             onClick={() => setShowSectionModal(false)}></div>
      )}
      
      {showStudentModal && (
        <div className="modal-backdrop fade show" 
             onClick={() => setShowStudentModal(false)}></div>
      )}

      {/* Summary Footer */}
      <div className="row mt-4">
        <div className="col-12">
          <div className="alert alert-info border-0 d-flex align-items-center">
            <i className="bi bi-info-circle fs-5 me-3"></i>
            <div>
              <strong>Student Management:</strong> You have read-only access to student information and attendance data. 
              All records are automatically updated when teachers submit attendance. 
              For student enrollment changes or data corrections, contact administrators.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ViewStudents;