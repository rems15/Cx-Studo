// src/components/supervisor/ViewAttendance.js
import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

// Import supervisor services
import { getAttendanceData, getAttendanceStats } from '../../services/supervisorService';

function ViewAttendance({ currentUser }) {
  const [attendanceData, setAttendanceData] = useState([]);
  const [stats, setStats] = useState({
    totalPresent: 0,
    totalAbsent: 0,
    totalLate: 0,
    totalExcused: 0,
    attendanceRate: 0
  });
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // all, homeroom, subject

  useEffect(() => {
    loadAttendanceData();
  }, [selectedDate]);

  const loadAttendanceData = async () => {
    try {
      setLoading(true);
      const data = await getAttendanceData(selectedDate);
      const statsData = await getAttendanceStats(selectedDate);
      
      setAttendanceData(data);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading attendance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = attendanceData.filter(record => {
    if (filter === 'all') return true;
    if (filter === 'homeroom') return record.isHomeroom;
    if (filter === 'subject') return !record.isHomeroom;
    return true;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'present': return 'success';
      case 'absent': return 'danger';
      case 'late': return 'warning';
      case 'excused': return 'info';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present': return 'bi-check-circle-fill';
      case 'absent': return 'bi-x-circle-fill';
      case 'late': return 'bi-clock-fill';
      case 'excused': return 'bi-info-circle-fill';
      default: return 'bi-question-circle';
    }
  };

  return (
    <div>
      {/* Header Controls */}
      <div className="row mb-4">
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <h6 className="card-title mb-3">📅 Select Date</h6>
              <input
                type="date"
                className="form-control"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <h6 className="card-title mb-3">🔍 Filter View</h6>
              <select 
                className="form-select"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All Classes</option>
                <option value="homeroom">Homeroom Only</option>
                <option value="subject">Subject Classes Only</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header bg-white">
              <h6 className="mb-0">
                <i className="bi bi-bar-chart-fill me-2"></i>
                Attendance Summary for {new Date(selectedDate).toLocaleDateString()}
              </h6>
            </div>
            <div className="card-body">
              <div className="row text-center">
                <div className="col-md-3 col-6 mb-3">
                  <div className="border rounded p-3">
                    <h4 className="text-success mb-1">{stats.totalPresent}</h4>
                    <small className="text-muted">Present</small>
                  </div>
                </div>
                <div className="col-md-3 col-6 mb-3">
                  <div className="border rounded p-3">
                    <h4 className="text-danger mb-1">{stats.totalAbsent}</h4>
                    <small className="text-muted">Absent</small>
                  </div>
                </div>
                <div className="col-md-3 col-6 mb-3">
                  <div className="border rounded p-3">
                    <h4 className="text-warning mb-1">{stats.totalLate}</h4>
                    <small className="text-muted">Late</small>
                  </div>
                </div>
                <div className="col-md-3 col-6 mb-3">
                  <div className="border rounded p-3">
                    <h4 className="text-info mb-1">{stats.totalExcused}</h4>
                    <small className="text-muted">Excused</small>
                  </div>
                </div>
              </div>
              
              <div className="text-center mt-3">
                <div className="progress" style={{ height: '8px' }}>
                  <div 
                    className="progress-bar bg-success" 
                    style={{ width: `${stats.attendanceRate}%` }}
                  ></div>
                </div>
                <small className="text-muted mt-2 d-block">
                  Overall Attendance Rate: <strong>{stats.attendanceRate}%</strong>
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Data */}
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header bg-white d-flex justify-content-between align-items-center">
              <h6 className="mb-0">
                <i className="bi bi-list-check me-2"></i>
                Attendance Records ({filteredData.length})
              </h6>
              <span className="badge bg-secondary">READ ONLY</span>
            </div>
            <div className="card-body p-0">
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="text-muted mt-3">Loading attendance data...</p>
                </div>
              ) : filteredData.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="ps-3">Class/Section</th>
                        <th>Teacher</th>
                        <th>Time Taken</th>
                        <th>Students</th>
                        <th>Present</th>
                        <th>Absent</th>
                        <th>Late</th>
                        <th className="pe-3">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((record, index) => (
                        <tr key={index}>
                          <td className="ps-3">
                            <div>
                              <div className="fw-medium">
                                {record.isHomeroom ? (
                                  <>
                                    <i className="bi bi-house-fill text-primary me-1"></i>
                                    {record.sectionName} (Homeroom)
                                  </>
                                ) : (
                                  <>
                                    <i className="bi bi-book text-info me-1"></i>
                                    {record.subjectName} - {record.sectionName}
                                  </>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            <small className="text-muted">{record.takenBy || 'Unknown'}</small>
                          </td>
                          <td>
                            <small className="text-muted">
                              {record.time ? new Date(record.time).toLocaleTimeString() : 'Not taken'}
                            </small>
                          </td>
                          <td>
                            <span className="badge bg-light text-dark">
                              {record.totalStudents || 0}
                            </span>
                          </td>
                          <td>
                            <span className={`badge bg-success bg-opacity-10 text-success`}>
                              {record.presentCount || 0}
                            </span>
                          </td>
                          <td>
                            <span className={`badge bg-danger bg-opacity-10 text-danger`}>
                              {record.absentCount || 0}
                            </span>
                          </td>
                          <td>
                            <span className={`badge bg-warning bg-opacity-10 text-warning`}>
                              {record.lateCount || 0}
                            </span>
                          </td>
                          <td className="pe-3">
                            <div className="d-flex align-items-center">
                              <div 
                                className="progress me-2" 
                                style={{ width: '60px', height: '8px' }}
                              >
                                <div 
                                  className="progress-bar bg-success" 
                                  style={{ width: `${record.attendanceRate || 0}%` }}
                                ></div>
                              </div>
                              <small className="text-muted">
                                {record.attendanceRate || 0}%
                              </small>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-5">
                  <i className="bi bi-calendar-x fs-1 text-muted"></i>
                  <h6 className="mt-3 text-muted">No Attendance Data</h6>
                  <p className="text-muted">
                    No attendance records found for {new Date(selectedDate).toLocaleDateString()}
                  </p>
                  <small className="text-muted">
                    Try selecting a different date or check if attendance has been taken.
                  </small>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Note */}
      <div className="row mt-4">
        <div className="col-12">
          <div className="alert alert-info border-0">
            <i className="bi bi-info-circle me-2"></i>
            <strong>Note:</strong> You have read-only access to attendance data. 
            To make changes, please contact a teacher or administrator.
          </div>
        </div>
      </div>
    </div>
  );
}

export default ViewAttendance;