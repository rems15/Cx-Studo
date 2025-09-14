// src/components/supervisor/ViewReports.js
import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

// Import supervisor services
import { getReportsData, getAttendanceTrends } from '../../services/supervisorService';

function ViewReports({ currentUser }) {
  const [reportData, setReportData] = useState({
    weeklyStats: {},
    monthlyStats: {},
    sectionReports: [],
    teacherReports: []
  });
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState('overview'); // overview, weekly, monthly, trends
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadReportsData();
  }, [dateRange]);

  const loadReportsData = async () => {
    try {
      setLoading(true);
      const data = await getReportsData(dateRange.start, dateRange.end);
      const trendsData = await getAttendanceTrends(dateRange.start, dateRange.end);
      
      setReportData(data);
      setTrends(trendsData);
    } catch (error) {
      console.error('Error loading reports data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderOverview = () => (
    <div className="row">
      {/* Overall Stats */}
      <div className="col-12 mb-4">
        <div className="card">
          <div className="card-header bg-white">
            <h6 className="mb-0">
              <i className="bi bi-graph-up me-2"></i>
              Overall Statistics
            </h6>
          </div>
          <div className="card-body">
            <div className="row text-center">
              <div className="col-md-3 col-6 mb-3">
                <div className="border rounded p-3">
                  <h3 className="text-primary mb-1">{reportData.monthlyStats.averageAttendance || 0}%</h3>
                  <small className="text-muted">Average Attendance</small>
                </div>
              </div>
              <div className="col-md-3 col-6 mb-3">
                <div className="border rounded p-3">
                  <h3 className="text-success mb-1">{reportData.monthlyStats.totalPresent || 0}</h3>
                  <small className="text-muted">Total Present</small>
                </div>
              </div>
              <div className="col-md-3 col-6 mb-3">
                <div className="border rounded p-3">
                  <h3 className="text-danger mb-1">{reportData.monthlyStats.totalAbsent || 0}</h3>
                  <small className="text-muted">Total Absent</small>
                </div>
              </div>
              <div className="col-md-3 col-6 mb-3">
                <div className="border rounded p-3">
                  <h3 className="text-warning mb-1">{reportData.monthlyStats.totalLate || 0}</h3>
                  <small className="text-muted">Total Late</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section Performance */}
      <div className="col-md-6 mb-4">
        <div className="card h-100">
          <div className="card-header bg-white">
            <h6 className="mb-0">
              <i className="bi bi-diagram-3 me-2"></i>
              Section Performance
            </h6>
          </div>
          <div className="card-body">
            {reportData.sectionReports && reportData.sectionReports.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Section</th>
                      <th>Rate</th>
                      <th>Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.sectionReports.slice(0, 8).map((section, index) => (
                      <tr key={index}>
                        <td>
                          <small className="fw-medium">{section.sectionName}</small>
                        </td>
                        <td>
                          <span className={`badge bg-${
                            section.attendanceRate >= 90 ? 'success' : 
                            section.attendanceRate >= 80 ? 'warning' : 'danger'
                          } bg-opacity-10 text-${
                            section.attendanceRate >= 90 ? 'success' : 
                            section.attendanceRate >= 80 ? 'warning' : 'danger'
                          }`}>
                            {section.attendanceRate}%
                          </span>
                        </td>
                        <td>
                          <i className={`bi ${
                            section.trend === 'up' ? 'bi-trend-up text-success' :
                            section.trend === 'down' ? 'bi-trend-down text-danger' :
                            'bi-dash text-muted'
                          }`}></i>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-4">
                <i className="bi bi-bar-chart fs-1 text-muted"></i>
                <p className="text-muted mt-2">No section data available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Teacher Performance */}
      <div className="col-md-6 mb-4">
        <div className="card h-100">
          <div className="card-header bg-white">
            <h6 className="mb-0">
              <i className="bi bi-people me-2"></i>
              Teacher Attendance Rates
            </h6>
          </div>
          <div className="card-body">
            {reportData.teacherReports && reportData.teacherReports.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Teacher</th>
                      <th>Classes</th>
                      <th>Avg Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.teacherReports.slice(0, 8).map((teacher, index) => (
                      <tr key={index}>
                        <td>
                          <small className="fw-medium">{teacher.teacherName}</small>
                        </td>
                        <td>
                          <small className="text-muted">{teacher.classCount}</small>
                        </td>
                        <td>
                          <span className={`badge bg-${
                            teacher.averageRate >= 90 ? 'success' : 
                            teacher.averageRate >= 80 ? 'warning' : 'danger'
                          } bg-opacity-10 text-${
                            teacher.averageRate >= 90 ? 'success' : 
                            teacher.averageRate >= 80 ? 'warning' : 'danger'
                          }`}>
                            {teacher.averageRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-4">
                <i className="bi bi-person-check fs-1 text-muted"></i>
                <p className="text-muted mt-2">No teacher data available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderTrends = () => (
    <div className="row">
      <div className="col-12">
        <div className="card">
          <div className="card-header bg-white">
            <h6 className="mb-0">
              <i className="bi bi-graph-up-arrow me-2"></i>
              Attendance Trends
            </h6>
          </div>
          <div className="card-body">
            {trends && trends.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead className="table-light">
                    <tr>
                      <th>Date</th>
                      <th>Total Students</th>
                      <th>Present</th>
                      <th>Absent</th>
                      <th>Late</th>
                      <th>Rate</th>
                      <th>Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trends.map((day, index) => (
                      <tr key={index}>
                        <td>
                          <small className="fw-medium">
                            {new Date(day.date).toLocaleDateString()}
                          </small>
                        </td>
                        <td>{day.totalStudents}</td>
                        <td>
                          <span className="badge bg-success bg-opacity-10 text-success">
                            {day.present}
                          </span>
                        </td>
                        <td>
                          <span className="badge bg-danger bg-opacity-10 text-danger">
                            {day.absent}
                          </span>
                        </td>
                        <td>
                          <span className="badge bg-warning bg-opacity-10 text-warning">
                            {day.late}
                          </span>
                        </td>
                        <td>
                          <div className="d-flex align-items-center">
                            <div 
                              className="progress me-2" 
                              style={{ width: '60px', height: '8px' }}
                            >
                              <div 
                                className="progress-bar bg-success" 
                                style={{ width: `${day.attendanceRate}%` }}
                              ></div>
                            </div>
                            <small>{day.attendanceRate}%</small>
                          </div>
                        </td>
                        <td>
                          <i className={`bi ${
                            day.trendDirection === 'up' ? 'bi-arrow-up text-success' :
                            day.trendDirection === 'down' ? 'bi-arrow-down text-danger' :
                            'bi-dash text-muted'
                          }`}></i>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-5">
                <i className="bi bi-graph-up fs-1 text-muted"></i>
                <h6 className="mt-3 text-muted">No Trend Data</h6>
                <p className="text-muted">Not enough data to show trends for the selected period</p>
              </div>
            )}
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
          <p className="text-muted mt-3">Loading reports data...</p>
        </div>
      );
    }

    switch (selectedReportType) {
      case 'trends':
        return renderTrends();
      default:
        return renderOverview();
    }
  };

  return (
    <div>
      {/* Header Controls */}
      <div className="row mb-4">
        <div className="col-md-8">
          <div className="card">
            <div className="card-body">
              <h6 className="card-title mb-3">📊 Reports & Analytics</h6>
              <div className="row">
                <div className="col-md-6">
                  <label className="form-label">From Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    max={dateRange.end}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">To Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    min={dateRange.start}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card">
            <div className="card-body">
              <h6 className="card-title mb-3">🔍 Report Type</h6>
              <select 
                className="form-select"
                value={selectedReportType}
                onChange={(e) => setSelectedReportType(e.target.value)}
              >
                <option value="overview">Overview & Summary</option>
                <option value="trends">Daily Trends</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {renderCurrentView()}

      {/* Note */}
      <div className="row mt-4">
        <div className="col-12">
          <div className="alert alert-info border-0">
            <i className="bi bi-info-circle me-2"></i>
            <strong>Note:</strong> All reports are read-only. Data is updated in real-time based on teacher attendance submissions.
          </div>
        </div>
      </div>
    </div>
  );
}

export default ViewReports;