// src/components/supervisor/ViewAttendance.js - COMPLETE WITH UPDATED SCHEMA SUPPORT
import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';


function ViewAttendance({ currentUser }) {
  const [attendanceData, setAttendanceData] = useState([]);
  const [sections, setSections] = useState([]);
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState({
    totalPresent: 0,
    totalAbsent: 0,
    totalLate: 0,
    totalExcused: 0,
    attendanceRate: 0,
    totalClasses: 0,
    totalStudents: 0
  });
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all',
    search: '',
    year: 'all'
  });
  const [sortBy, setSortBy] = useState('time');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    loadAttendanceData();
  }, [selectedDate]);

  // Helper function to get section identifier using new schema
  const getSectionIdentifier = (section) => {
    const year = section.year || section.gradeLevel || 'N/A';
    const sectionLetter = section.section || section.sectionName || 'X';
    return `${year}-${sectionLetter}`;
  };

  // Helper function to get section display name using new schema
  const getSectionDisplayName = (section) => {
    const year = section.year || section.gradeLevel || 'Unknown';
    const sectionLetter = (section.section || section.sectionName || '').toUpperCase();
    return `Grade ${year} - ${sectionLetter}`;
  };

  const loadAttendanceData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await loadSectionsAndStudents();
      await loadAttendanceRecords();
      await calculateStats();
      
    } catch (error) {
      console.error('Error loading attendance data:', error);
      setError('Failed to load attendance data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadSectionsAndStudents = async () => {
    try {
      const sectionsSnapshot = await getDocs(collection(db, 'sections'));
      const sectionsData = [];
      sectionsSnapshot.forEach(doc => {
        const sectionData = { id: doc.id, ...doc.data() };
        
        sectionData.identifier = getSectionIdentifier(sectionData);
        sectionData.displayName = getSectionDisplayName(sectionData);
        
        if (!sectionData.gradeLevel && sectionData.year) {
          sectionData.gradeLevel = sectionData.year;
        }
        if (!sectionData.name) {
          sectionData.name = sectionData.displayName;
        }
        
        sectionsData.push(sectionData);
      });
      setSections(sectionsData);

      const studentsSnapshot = await getDocs(collection(db, 'students'));
      const studentsData = [];
      studentsSnapshot.forEach(doc => {
        const studentData = { id: doc.id, ...doc.data() };
        
        if (!studentData.year && studentData.gradeLevel) {
          studentData.year = studentData.gradeLevel;
        }
        if (!studentData.gradeLevel && studentData.year) {
          studentData.gradeLevel = studentData.year;
        }
        
        studentsData.push(studentData);
      });
      setStudents(studentsData);
    } catch (error) {
      console.error('Error loading sections and students:', error);
    }
  };

  const getSectionInfo = (sectionId, sectionName) => {
    if (sectionId) {
      const section = sections.find(s => s.id === sectionId);
      if (section) {
        const identifier = getSectionIdentifier(section);
        const displayName = getSectionDisplayName(section);
        const year = section.year || section.gradeLevel || 'Unknown';
        
        return {
          name: displayName,
          identifier: identifier,
          year: year,
          gradeLevel: year,
          displayName: displayName,
          section: section
        };
      }
    }
    
    if (sectionName) {
      const section = sections.find(s => {
        const sectionIdentifier = getSectionIdentifier(s);
        return sectionIdentifier === sectionName ||
               s.name === sectionName || 
               s.sectionName === sectionName ||
               s.section === sectionName;
      });
      
      if (section) {
        const identifier = getSectionIdentifier(section);
        const displayName = getSectionDisplayName(section);
        const year = section.year || section.gradeLevel || 'Unknown';
        
        return {
          name: displayName,
          identifier: identifier,
          year: year,
          gradeLevel: year,
          displayName: displayName,
          section: section
        };
      }
    }
    
    const fallbackName = sectionName || 'Unknown Section';
    return {
      name: fallbackName,
      identifier: fallbackName,
      year: null,
      gradeLevel: null,
      displayName: fallbackName,
      section: null
    };
  };

  const getStudentInfo = (student) => {
    const studentData = students.find(s => 
      s.id === student.studentId || 
      s.studentId === student.studentId ||
      (s.firstName && s.lastName && 
       `${s.firstName} ${s.lastName}` === student.studentName)
    );
    
    if (studentData) {
      return {
        name: `${studentData.firstName} ${studentData.lastName}`,
        studentId: studentData.studentId || studentData.id,
        ...student
      };
    }
    
    return {
      name: student.studentName || `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Unknown Student',
      studentId: student.studentId || student.id || 'No ID',
      ...student
    };
  };

  const loadAttendanceRecords = async () => {
    try {
      const attendanceQuery = query(
        collection(db, 'attendance'),
        where('date', '==', selectedDate)
      );

      const snapshot = await getDocs(attendanceQuery);
      const records = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        
        if (data && (data.students || data.studentData)) {
          const sectionInfo = getSectionInfo(data.sectionId, data.sectionName);
          const students = data.students || data.studentData || {};
          const studentRecords = Array.isArray(students) ? students : Object.values(students);
          
          const totalStudents = studentRecords.length;
          const presentCount = studentRecords.filter(s => s && s.status === 'present').length;
          const absentCount = studentRecords.filter(s => s && s.status === 'absent').length;
          const lateCount = studentRecords.filter(s => s && s.status === 'late').length;
          const excusedCount = studentRecords.filter(s => s && s.status === 'excused').length;
          
          const attendanceRate = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

          records.push({
            id: doc.id,
            sectionId: data.sectionId,
            sectionName: sectionInfo.name,
            sectionDisplayName: sectionInfo.displayName,
            sectionIdentifier: sectionInfo.identifier,
            gradeLevel: sectionInfo.gradeLevel,
            year: sectionInfo.year,
            subjectName: data.subjectName || data.subject || 'Subject',
            isHomeroom: Boolean(data.isHomeroom),
            isMultiSection: Boolean(data.isMultiSection),
            teacherName: data.takenByName || data.takenBy || data.teacherName || data.teacherId || 'Unknown Teacher',
            timestamp: data.timestamp || (data.createdAt && data.createdAt.seconds ? data.createdAt.seconds * 1000 : Date.now()),
            totalStudents,
            presentCount,
            absentCount,
            lateCount,
            excusedCount,
            attendanceRate,
            status: 'taken',
            students: studentRecords.map(student => getStudentInfo(student)),
            rawData: data
          });
        }
      });

      records.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setAttendanceData(records);
    } catch (error) {
      console.error('Error loading attendance records:', error);
      setAttendanceData([]);
      throw error;
    }
  };

  const calculateStats = async () => {
    try {
      const attendanceQuery = query(
        collection(db, 'attendance'),
        where('date', '==', selectedDate)
      );

      const snapshot = await getDocs(attendanceQuery);
      let totalPresent = 0;
      let totalAbsent = 0;
      let totalLate = 0;
      let totalExcused = 0;
      let totalStudents = 0;
      let totalClasses = 0;

      snapshot.forEach(doc => {
        const data = doc.data();
        if (data && (data.students || data.studentData)) {
          totalClasses++;
          const students = data.students || data.studentData || {};
          const studentRecords = Array.isArray(students) ? students : Object.values(students);
          const validStudents = studentRecords.filter(s => s && s.status);
          
          totalStudents += validStudents.length;
          totalPresent += validStudents.filter(s => s.status === 'present').length;
          totalAbsent += validStudents.filter(s => s.status === 'absent').length;
          totalLate += validStudents.filter(s => s.status === 'late').length;
          totalExcused += validStudents.filter(s => s.status === 'excused').length;
        }
      });

      const attendanceRate = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0;

      setStats({
        totalPresent,
        totalAbsent,
        totalLate,
        totalExcused,
        attendanceRate,
        totalClasses,
        totalStudents
      });
    } catch (error) {
      console.error('Error calculating stats:', error);
      throw error;
    }
  };

  const getFilteredAndSortedData = () => {
    let filtered = attendanceData.filter(record => {
      if (filters.type === 'homeroom' && !record.isHomeroom) return false;
      if (filters.type === 'subject' && record.isHomeroom) return false;
      
      if (filters.year && filters.year !== 'all') {
        if (!record.year || record.year.toString() !== filters.year) return false;
      }
      
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matches = 
          (record.sectionName || '').toLowerCase().includes(searchLower) ||
          (record.sectionDisplayName || '').toLowerCase().includes(searchLower) ||
          (record.sectionIdentifier || '').toLowerCase().includes(searchLower) ||
          (record.subjectName || '').toLowerCase().includes(searchLower) ||
          (record.teacherName || '').toLowerCase().includes(searchLower);
        if (!matches) return false;
      }

      return true;
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rate':
          return b.attendanceRate - a.attendanceRate;
        case 'section':
          return (a.sectionIdentifier || a.sectionName || '').localeCompare(b.sectionIdentifier || b.sectionName || '');
        case 'year':
          return (a.year || 0) - (b.year || 0);
        case 'time':
        default:
          return (b.timestamp || 0) - (a.timestamp || 0);
      }
    });

    return filtered;
  };

  const getAvailableYears = () => {
    const years = [...new Set(sections.map(s => s.year || s.gradeLevel).filter(Boolean))];
    return years.sort((a, b) => a - b);
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'present': return 'bg-success';
      case 'absent': return 'bg-danger';
      case 'late': return 'bg-warning text-dark';
      case 'excused': return 'bg-info';
      default: return 'bg-secondary';
    }
  };

  const getAttendanceRateColor = (rate) => {
    if (rate >= 90) return 'success';
    if (rate >= 80) return 'warning';
    if (rate >= 70) return 'info';
    return 'danger';
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Unknown';
    try {
      return new Date(timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    } catch (error) {
      return 'Invalid time';
    }
  };

  const formatDate = (date) => {
    try {
      return new Date(date).toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const handleRecordClick = (record) => {
    setSelectedRecord(record);
    setShowDetailModal(true);
  };

  const renderStatsCards = () => (
    <div className="row mb-3 g-2">
      <div className="col-lg-3 col-md-6">
        <div className="card border-0 shadow-sm h-100">
          <div className="card-body p-3">
            <div className="d-flex align-items-center">
              <div className="flex-shrink-0">
                <div className="bg-success bg-opacity-10 rounded-circle p-2">
                  <i className="bi bi-person-check-fill fs-5 text-success"></i>
                </div>
              </div>
              <div className="flex-grow-1 ms-2">
                <h4 className="mb-0">{stats.totalPresent}</h4>
                <small className="text-muted">Present</small>
                <div className="text-success small">
                  <i className="bi bi-arrow-up me-1"></i>
                  {stats.attendanceRate}% rate
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="col-lg-3 col-md-6">
        <div className="card border-0 shadow-sm h-100">
          <div className="card-body p-3">
            <div className="d-flex align-items-center">
              <div className="flex-shrink-0">
                <div className="bg-danger bg-opacity-10 rounded-circle p-2">
                  <i className="bi bi-person-x-fill fs-5 text-danger"></i>
                </div>
              </div>
              <div className="flex-grow-1 ms-2">
                <h4 className="mb-0">{stats.totalAbsent}</h4>
                <small className="text-muted">Absent</small>
                <div className="text-muted small">
                  {stats.totalStudents > 0 ? Math.round((stats.totalAbsent / stats.totalStudents) * 100) : 0}% of total
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="col-lg-3 col-md-6">
        <div className="card border-0 shadow-sm h-100">
          <div className="card-body p-3">
            <div className="d-flex align-items-center">
              <div className="flex-shrink-0">
                <div className="bg-warning bg-opacity-10 rounded-circle p-2">
                  <i className="bi bi-clock-fill fs-5 text-warning"></i>
                </div>
              </div>
              <div className="flex-grow-1 ms-2">
                <h4 className="mb-0">{stats.totalLate}</h4>
                <small className="text-muted">Late</small>
                <div className="text-warning small">
                  <i className="bi bi-exclamation-triangle me-1"></i>
                  Needs attention
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="col-lg-3 col-md-6">
        <div className="card border-0 shadow-sm h-100">
          <div className="card-body p-3">
            <div className="d-flex align-items-center">
              <div className="flex-shrink-0">
                <div className="bg-info bg-opacity-10 rounded-circle p-2">
                  <i className="bi bi-calendar-check fs-5 text-info"></i>
                </div>
              </div>
              <div className="flex-grow-1 ms-2">
                <h4 className="mb-0">{stats.totalClasses}</h4>
                <small className="text-muted">Classes Taken</small>
                <div className="text-info small">
                  {stats.totalStudents} total students
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderFiltersAndControls = () => (
    <div className="card border-0 shadow-sm mb-3">
      <div className="card-body p-3">
        <div className="row align-items-end g-2">
          <div className="col-md-2">
            <label className="form-label small text-muted">SELECT DATE</label>
            <input
              type="date"
              className="form-control"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="col-md-2">
            <label className="form-label small text-muted">CLASS TYPE</label>
            <select 
              className="form-select"
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
            >
              <option value="all">All Classes</option>
              <option value="homeroom">Homeroom Only</option>
              <option value="subject">Subject Classes</option>
            </select>
          </div>

          <div className="col-md-2">
            <label className="form-label small text-muted">YEAR LEVEL</label>
            <select 
              className="form-select"
              value={filters.year}
              onChange={(e) => setFilters(prev => ({ ...prev, year: e.target.value }))}
            >
              <option value="all">All Years</option>
              {getAvailableYears().map(year => (
                <option key={year} value={year}>Year {year}</option>
              ))}
            </select>
          </div>

          <div className="col-md-3">
            <label className="form-label small text-muted">SEARCH</label>
            <div className="input-group">
              <span className="input-group-text border-end-0 bg-white">
                <i className="bi bi-search text-muted"></i>
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Search sections, subjects, teachers..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>
          </div>

          <div className="col-md-3">
            <label className="form-label small text-muted">SORT BY</label>
            <select 
              className="form-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="time">Latest First</option>
              <option value="rate">By Attendance Rate</option>
              <option value="section">By Section</option>
              <option value="year">By Year Level</option>
            </select>
          </div>
        </div>

        <div className="mt-2 pt-2 border-top">
          <small className="text-muted me-3">QUICK FILTERS:</small>
          <div className="btn-group btn-group-sm">
            <button 
              className="btn btn-outline-secondary"
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            >
              Today
            </button>
            <button 
              className="btn btn-outline-secondary"
              onClick={() => {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                setSelectedDate(yesterday.toISOString().split('T')[0]);
              }}
            >
              Yesterday
            </button>
            <button 
              className="btn btn-outline-secondary"
              onClick={() => setFilters({ type: 'all', status: 'all', search: '', year: 'all' })}
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTableView = (filteredData) => (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-white border-0 py-2">
        <div className="d-flex justify-content-between align-items-center">
          <h6 className="mb-0">
            <i className="bi bi-list-check me-2"></i>
            Attendance Records ({filteredData.length})
          </h6>
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-light text-dark">
              {formatDate(selectedDate)}
            </span>
            <span className="badge bg-secondary">READ ONLY</span>
          </div>
        </div>
      </div>
      <div className="card-body p-0">
        {filteredData.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-3">Class Information</th>
                  <th>Year</th>
                  <th>Teacher</th>
                  <th>Time Taken</th>
                  <th>Students</th>
                  <th>Breakdown</th>
                  <th className="pe-3">Rate</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((record) => (
                  <tr 
                    key={record.id} 
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleRecordClick(record)}
                    className="table-row-hover"
                  >
                    <td className="ps-3">
                      <div>
                        <div className="fw-medium d-flex align-items-center">
                          {record.isHomeroom ? (
                            <>
                              <i className="bi bi-house-fill text-warning me-2"></i>
                              <span>{record.sectionDisplayName}</span>
                              <span className="badge bg-warning bg-opacity-10 text-warning ms-2">Homeroom</span>
                            </>
                          ) : (
                            <>
                              <i className="bi bi-book text-info me-2"></i>
                              <span>{record.subjectName}</span>
                            </>
                          )}
                          {record.isMultiSection && (
                            <span className="badge bg-info bg-opacity-10 text-info ms-2">Multi</span>
                          )}
                        </div>
                        {!record.isHomeroom && (
                          <small className="text-muted">
                            Section: {record.sectionDisplayName || record.sectionIdentifier}
                          </small>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="badge bg-primary">
                        Year {record.year || 'N/A'}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex align-items-center">
                        <div className="bg-secondary bg-opacity-10 rounded-circle p-1 me-2">
                          <i className="bi bi-person text-secondary"></i>
                        </div>
                        <small className="fw-medium">{record.teacherName}</small>
                      </div>
                    </td>
                    <td>
                      <small className="text-muted">{formatTime(record.timestamp)}</small>
                    </td>
                    <td>
                      <span className="badge bg-light text-dark fw-medium">
                        {record.totalStudents}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex gap-1 flex-wrap">
                        <span className="badge bg-success bg-opacity-10 text-success">
                          {record.presentCount} P
                        </span>
                        <span className="badge bg-danger bg-opacity-10 text-danger">
                          {record.absentCount} A
                        </span>
                        {record.lateCount > 0 && (
                          <span className="badge bg-warning bg-opacity-10 text-warning">
                            {record.lateCount} L
                          </span>
                        )}
                        {record.excusedCount > 0 && (
                          <span className="badge bg-info bg-opacity-10 text-info">
                            {record.excusedCount} E
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="pe-3">
                      <div className="d-flex align-items-center">
                        <div 
                          className="progress me-2" 
                          style={{ width: '60px', height: '8px' }}
                        >
                          <div 
                            className={`progress-bar bg-${getAttendanceRateColor(record.attendanceRate)}`}
                            style={{ width: `${record.attendanceRate}%` }}
                          ></div>
                        </div>
                        <small className={`fw-medium text-${getAttendanceRateColor(record.attendanceRate)}`}>
                          {record.attendanceRate}%
                        </small>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-4">
            <i className="bi bi-calendar-x fs-1 text-muted"></i>
            <h6 className="mt-3 text-muted">No Attendance Records Found</h6>
            <p className="text-muted">
              No attendance has been taken for {formatDate(selectedDate)}
              {filters.search && ` matching "${filters.search}"`}
              {filters.year !== 'all' && ` for Year ${filters.year}`}
            </p>
            <div className="mt-3">
              {filters.search && (
                <button 
                  className="btn btn-outline-secondary btn-sm me-2"
                  onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
                >
                  <i className="bi bi-x me-1"></i>
                  Clear Search
                </button>
              )}
              {filters.year !== 'all' && (
                <button 
                  className="btn btn-outline-secondary btn-sm me-2"
                  onClick={() => setFilters(prev => ({ ...prev, year: 'all' }))}
                >
                  <i className="bi bi-x me-1"></i>
                  Clear Year Filter
                </button>
              )}
              <button 
                className="btn btn-outline-primary btn-sm"
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              >
                <i className="bi bi-calendar-today me-1"></i>
                View Today
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <h5>Loading Attendance Data...</h5>
          <p className="text-muted">Please wait while we fetch the attendance records</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger">
        <i className="bi bi-exclamation-triangle me-2"></i>
        {error}
        <button 
          className="btn btn-outline-danger btn-sm ms-3"
          onClick={loadAttendanceData}
        >
          <i className="bi bi-arrow-clockwise me-1"></i>
          Retry
        </button>
      </div>
    );
  }

  const filteredData = getFilteredAndSortedData();

  return (
    <div>
      {renderStatsCards()}
      {renderFiltersAndControls()}
      {renderTableView(filteredData)}
      
      <div className="row mt-3">
        <div className="col-12">
          <div className="alert alert-info border-0 d-flex align-items-center mb-0">
            <i className="bi bi-info-circle fs-5 me-3"></i>
            <div>
              <strong>Supervisor View:</strong> You have read-only access to attendance data. 
              All records are automatically updated when teachers submit attendance. 
              Contact system administrators for any data corrections.
              {sections.length > 0 && (
                <div className="mt-1">
                  <small className="text-muted">
                    Schema Status: {sections.some(s => s.year) ? 'Updated Schema Detected' : 'Legacy Schema Active'} | 
                    Total Sections: {sections.length} | 
                    Available Years: {getAvailableYears().join(', ') || 'None'}
                  </small>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ViewAttendance;