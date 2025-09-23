// src/components/supervisor/ViewReports.js
import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';

function ViewReports({ currentUser }) {
  const [reportData, setReportData] = useState({
    overallStats: {},
    sectionReports: [],
    teacherReports: [],
    trends: []
  });
  const [loading, setLoading] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState('overview');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [filters, setFilters] = useState({
    section: 'all',
    teacher: 'all',
    minRate: 0
  });

  useEffect(() => {
    loadReportsData();
  }, [dateRange]);

  const loadReportsData = async () => {
    try {
      setLoading(true);
      
      const [overallStats, sectionReports, teacherReports, trends] = await Promise.all([
        calculateOverallStats(),
        generateSectionReports(),
        generateTeacherReports(),
        generateTrendData()
      ]);

      setReportData({
        overallStats,
        sectionReports,
        teacherReports,
        trends
      });
    } catch (error) {
      console.error('Error loading reports data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateOverallStats = async () => {
    try {
      const attendanceQuery = query(
        collection(db, 'attendance'),
        where('date', '>=', dateRange.start),
        where('date', '<=', dateRange.end)
      );

      const snapshot = await getDocs(attendanceQuery);
      let totalPresent = 0;
      let totalAbsent = 0;
      let totalLate = 0;
      let totalExcused = 0;
      let totalStudents = 0;
      let totalClasses = 0;
      const dailyRates = [];

      // Group by date for trend calculation
      const dailyData = {};
      
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.students && Array.isArray(data.students)) {
          totalClasses++;
          const classTotal = data.students.length;
          const present = data.students.filter(s => s.status === 'present').length;
          const absent = data.students.filter(s => s.status === 'absent').length;
          const late = data.students.filter(s => s.status === 'late').length;
          const excused = data.students.filter(s => s.status === 'excused').length;

          totalStudents += classTotal;
          totalPresent += present;
          totalAbsent += absent;
          totalLate += late;
          totalExcused += excused;

          // Daily aggregation
          if (!dailyData[data.date]) {
            dailyData[data.date] = { present: 0, total: 0 };
          }
          dailyData[data.date].present += present;
          dailyData[data.date].total += classTotal;
        }
      });

      // Calculate daily rates
      Object.keys(dailyData).forEach(date => {
        const dayData = dailyData[date];
        const rate = dayData.total > 0 ? Math.round((dayData.present / dayData.total) * 100) : 0;
        dailyRates.push({ date, rate });
      });

      const averageAttendance = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0;
      const averageDailyRate = dailyRates.length > 0 
        ? Math.round(dailyRates.reduce((sum, day) => sum + day.rate, 0) / dailyRates.length)
        : 0;

      return {
        averageAttendance,
        averageDailyRate,
        totalPresent,
        totalAbsent,
        totalLate,
        totalExcused,
        totalStudents,
        totalClasses,
        totalDays: Object.keys(dailyData).length,
        bestDay: dailyRates.reduce((best, current) => current.rate > best.rate ? current : best, { rate: 0 }),
        worstDay: dailyRates.reduce((worst, current) => current.rate < worst.rate ? current : worst, { rate: 100 })
      };
    } catch (error) {
      console.error('Error calculating overall stats:', error);
      return {};
    }
  };

  const generateSectionReports = async () => {
    try {
      const attendanceQuery = query(
        collection(db, 'attendance'),
        where('date', '>=', dateRange.start),
        where('date', '<=', dateRange.end)
      );

      const snapshot = await getDocs(attendanceQuery);
      const sectionStats = {};

      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.students && Array.isArray(data.students) && data.sectionName) {
          const sectionName = data.sectionName;
          
          if (!sectionStats[sectionName]) {
            sectionStats[sectionName] = {
              sectionName,
              totalPresent: 0,
              totalAbsent: 0,
              totalLate: 0,
              totalExcused: 0,
              totalStudents: 0,
              classesTaken: 0,
              dates: new Set(),
              isHomeroom: data.isHomeroom || false,
              subjects: new Set()
            };
          }

          const stats = sectionStats[sectionName];
          stats.totalPresent += data.students.filter(s => s.status === 'present').length;
          stats.totalAbsent += data.students.filter(s => s.status === 'absent').length;
          stats.totalLate += data.students.filter(s => s.status === 'late').length;
          stats.totalExcused += data.students.filter(s => s.status === 'excused').length;
          stats.totalStudents += data.students.length;
          stats.classesTaken++;
          stats.dates.add(data.date);
          
          if (data.subjectName) {
            stats.subjects.add(data.subjectName);
          }
        }
      });

      return Object.values(sectionStats).map(section => {
        const attendanceRate = section.totalStudents > 0 
          ? Math.round((section.totalPresent / section.totalStudents) * 100) 
          : 0;
        
        return {
          ...section,
          attendanceRate,
          activeDays: section.dates.size,
          subjects: Array.from(section.subjects),
          averageStudentsPerClass: section.classesTaken > 0 
            ? Math.round(section.totalStudents / section.classesTaken) 
            : 0,
          trend: Math.random() > 0.5 ? 'up' : 'down' // TODO: Calculate actual trend
        };
      }).sort((a, b) => b.attendanceRate - a.attendanceRate);
    } catch (error) {
      console.error('Error generating section reports:', error);
      return [];
    }
  };

  const generateTeacherReports = async () => {
    try {
      const attendanceQuery = query(
        collection(db, 'attendance'),
        where('date', '>=', dateRange.start),
        where('date', '<=', dateRange.end)
      );

      const snapshot = await getDocs(attendanceQuery);
      const teacherStats = {};

      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.students && Array.isArray(data.students)) {
          const teacherName = data.takenBy || data.teacherName || 'Unknown Teacher';
          
          if (!teacherStats[teacherName]) {
            teacherStats[teacherName] = {
              teacherName,
              totalPresent: 0,
              totalAbsent: 0,
              totalLate: 0,
              totalStudents: 0,
              classesTaken: 0,
              sections: new Set(),
              subjects: new Set(),
              homeroomClasses: 0,
              subjectClasses: 0
            };
          }

          const stats = teacherStats[teacherName];
          stats.totalPresent += data.students.filter(s => s.status === 'present').length;
          stats.totalAbsent += data.students.filter(s => s.status === 'absent').length;
          stats.totalLate += data.students.filter(s => s.status === 'late').length;
          stats.totalStudents += data.students.length;
          stats.classesTaken++;
          
          if (data.sectionName) stats.sections.add(data.sectionName);
          if (data.subjectName) stats.subjects.add(data.subjectName);
          
          if (data.isHomeroom) {
            stats.homeroomClasses++;
          } else {
            stats.subjectClasses++;
          }
        }
      });

      return Object.values(teacherStats).map(teacher => {
        const averageRate = teacher.totalStudents > 0 
          ? Math.round((teacher.totalPresent / teacher.totalStudents) * 100) 
          : 0;
        
        return {
          ...teacher,
          averageRate,
          sectionsCount: teacher.sections.size,
          subjectsCount: teacher.subjects.size,
          sections: Array.from(teacher.sections),
          subjects: Array.from(teacher.subjects)
        };
      }).filter(teacher => teacher.classesTaken > 0)
        .sort((a, b) => b.averageRate - a.averageRate);
    } catch (error) {
      console.error('Error generating teacher reports:', error);
      return [];
    }
  };

  const generateTrendData = async () => {
    try {
      const days = getDatesInRange(dateRange.start, dateRange.end);
      const trends = [];

      for (const date of days) {
        const dayQuery = query(
          collection(db, 'attendance'),
          where('date', '==', date)
        );

        const snapshot = await getDocs(dayQuery);
        let present = 0;
        let absent = 0;
        let late = 0;
        let total = 0;
        let classes = 0;

        snapshot.forEach(doc => {
          const data = doc.data();
          if (data.students && Array.isArray(data.students)) {
            classes++;
            present += data.students.filter(s => s.status === 'present').length;
            absent += data.students.filter(s => s.status === 'absent').length;
            late += data.students.filter(s => s.status === 'late').length;
            total += data.students.length;
          }
        });

        const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0;

        trends.push({
          date,
          present,
          absent,
          late,
          total,
          classes,
          attendanceRate,
          dayOfWeek: new Date(date).toLocaleDateString('en-US', { weekday: 'short' })
        });
      }

      // Add trend direction
      trends.forEach((day, index) => {
        if (index > 0) {
          const prevRate = trends[index - 1].attendanceRate;
          day.trendDirection = day.attendanceRate > prevRate ? 'up' : 
                             day.attendanceRate < prevRate ? 'down' : 'same';
        } else {
          day.trendDirection = 'same';
        }
      });

      return trends;
    } catch (error) {
      console.error('Error generating trend data:', error);
      return [];
    }
  };

  const getDatesInRange = (startDate, endDate) => {
    const dates = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let date = start; date <= end; date.setDate(date.getDate() + 1)) {
      dates.push(date.toISOString().split('T')[0]);
    }
    
    return dates;
  };

  const getFilteredSections = () => {
    return reportData.sectionReports.filter(section => {
      if (filters.section !== 'all' && section.sectionName !== filters.section) return false;
      if (section.attendanceRate < filters.minRate) return false;
      return true;
    });
  };

  const getFilteredTeachers = () => {
    return reportData.teacherReports.filter(teacher => {
      if (filters.teacher !== 'all' && teacher.teacherName !== filters.teacher) return false;
      if (teacher.averageRate < filters.minRate) return false;
      return true;
    });
  };

  const renderOverview = () => {
    const { overallStats } = reportData;
    
    return (
      <div>
        {/* Key Metrics */}
        <div className="row mb-4">
          <div className="col-lg-3 col-md-6 mb-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-shrink-0">
                    <div className="bg-primary bg-opacity-10 rounded-circle p-3">
                      <i className="bi bi-graph-up fs-4 text-primary"></i>
                    </div>
                  </div>
                  <div className="flex-grow-1 ms-3">
                    <h3 className="mb-0">{overallStats.averageAttendance || 0}%</h3>
                    <small className="text-muted">Overall Average</small>
                    <div className="text-primary small">
                      <i className="bi bi-calendar-check me-1"></i>
                      {overallStats.totalDays} days tracked
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-3 col-md-6 mb-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-shrink-0">
                    <div className="bg-success bg-opacity-10 rounded-circle p-3">
                      <i className="bi bi-people-fill fs-4 text-success"></i>
                    </div>
                  </div>
                  <div className="flex-grow-1 ms-3">
                    <h3 className="mb-0">{overallStats.totalPresent || 0}</h3>
                    <small className="text-muted">Total Present</small>
                    <div className="text-success small">
                      <i className="bi bi-arrow-up me-1"></i>
                      {Math.round(((overallStats.totalPresent || 0) / (overallStats.totalStudents || 1)) * 100)}% rate
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-3 col-md-6 mb-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-shrink-0">
                    <div className="bg-info bg-opacity-10 rounded-circle p-3">
                      <i className="bi bi-calendar-event fs-4 text-info"></i>
                    </div>
                  </div>
                  <div className="flex-grow-1 ms-3">
                    <h3 className="mb-0">{overallStats.totalClasses || 0}</h3>
                    <small className="text-muted">Classes Tracked</small>
                    <div className="text-info small">
                      <i className="bi bi-people me-1"></i>
                      {Math.round((overallStats.totalStudents || 0) / (overallStats.totalClasses || 1))} avg/class
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-3 col-md-6 mb-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-shrink-0">
                    <div className="bg-warning bg-opacity-10 rounded-circle p-3">
                      <i className="bi bi-exclamation-triangle fs-4 text-warning"></i>
                    </div>
                  </div>
                  <div className="flex-grow-1 ms-3">
                    <h3 className="mb-0">{overallStats.totalAbsent || 0}</h3>
                    <small className="text-muted">Total Absent</small>
                    <div className="text-warning small">
                      <i className="bi bi-arrow-down me-1"></i>
                      Needs attention
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Insights */}
        <div className="row mb-4">
          <div className="col-md-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white border-0">
                <h6 className="mb-0">
                  <i className="bi bi-trophy me-2 text-success"></i>
                  Best Performance Day
                </h6>
              </div>
              <div className="card-body text-center">
                <h4 className="text-success">{overallStats.bestDay?.rate || 0}%</h4>
                <p className="text-muted mb-0">
                  {overallStats.bestDay?.date ? 
                    new Date(overallStats.bestDay.date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'short', 
                      day: 'numeric' 
                    }) : 'No data'
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white border-0">
                <h6 className="mb-0">
                  <i className="bi bi-graph-up me-2 text-info"></i>
                  Daily Average
                </h6>
              </div>
              <div className="card-body text-center">
                <h4 className="text-info">{overallStats.averageDailyRate || 0}%</h4>
                <p className="text-muted mb-0">Across all tracked days</p>
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white border-0">
                <h6 className="mb-0">
                  <i className="bi bi-exclamation-circle me-2 text-warning"></i>
                  Lowest Performance
                </h6>
              </div>
              <div className="card-body text-center">
                <h4 className="text-warning">{overallStats.worstDay?.rate || 0}%</h4>
                <p className="text-muted mb-0">
                  {overallStats.worstDay?.date ? 
                    new Date(overallStats.worstDay.date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'short', 
                      day: 'numeric' 
                    }) : 'No data'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section and Teacher Performance */}
        <div className="row">
          <div className="col-lg-6 mb-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white border-0">
                <h6 className="mb-0">
                  <i className="bi bi-diagram-3 me-2"></i>
                  Top Performing Sections
                </h6>
              </div>
              <div className="card-body">
                {reportData.sectionReports.slice(0, 5).map((section, index) => (
                  <div key={index} className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <div className="fw-medium">{section.sectionName}</div>
                      <small className="text-muted">
                        {section.classesTaken} classes • {section.activeDays} days
                      </small>
                    </div>
                    <div className="text-end">
                      <span className={`badge bg-${
                        section.attendanceRate >= 90 ? 'success' : 
                        section.attendanceRate >= 80 ? 'warning' : 'danger'
                      }`}>
                        {section.attendanceRate}%
                      </span>
                      <div>
                        <i className={`bi ${
                          section.trend === 'up' ? 'bi-trend-up text-success' :
                          section.trend === 'down' ? 'bi-trend-down text-danger' :
                          'bi-dash text-muted'
                        }`}></i>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="col-lg-6 mb-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white border-0">
                <h6 className="mb-0">
                  <i className="bi bi-people me-2"></i>
                  Teacher Performance Summary
                </h6>
              </div>
              <div className="card-body">
                {reportData.teacherReports.slice(0, 5).map((teacher, index) => (
                  <div key={index} className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <div className="fw-medium">{teacher.teacherName}</div>
                      <small className="text-muted">
                        {teacher.sectionsCount} sections • {teacher.classesTaken} classes
                      </small>
                    </div>
                    <div className="text-end">
                      <span className={`badge bg-${
                        teacher.averageRate >= 90 ? 'success' : 
                        teacher.averageRate >= 80 ? 'warning' : 'danger'
                      }`}>
                        {teacher.averageRate}%
                      </span>
                      <div>
                        <small className="text-muted">
                          {teacher.homeroomClasses + teacher.subjectClasses} total
                        </small>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTrends = () => (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-white border-0">
        <h6 className="mb-0">
          <i className="bi bi-graph-up-arrow me-2"></i>
          Daily Attendance Trends
        </h6>
      </div>
      <div className="card-body">
        {reportData.trends && reportData.trends.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-hover">
              <thead className="table-light">
                <tr>
                  <th>Date</th>
                  <th>Day</th>
                  <th>Classes</th>
                  <th>Students</th>
                  <th>Present</th>
                  <th>Absent</th>
                  <th>Late</th>
                  <th>Rate</th>
                  <th>Trend</th>
                </tr>
              </thead>
              <tbody>
                {reportData.trends.map((day, index) => (
                  <tr key={index}>
                    <td>
                      <small className="fw-medium">
                        {new Date(day.date).toLocaleDateString()}
                      </small>
                    </td>
                    <td>
                      <span className="badge bg-light text-dark">
                        {day.dayOfWeek}
                      </span>
                    </td>
                    <td>{day.classes}</td>
                    <td>{day.total}</td>
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
                            className="progress-bar bg-primary" 
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
  );

  const renderDetailedAnalysis = () => (
    <div>
      <div className="row mb-4">
        {/* Filters */}
        <div className="col-md-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="row">
                <div className="col-md-3">
                  <label className="form-label small text-muted">FILTER BY SECTION</label>
                  <select 
                    className="form-select"
                    value={filters.section}
                    onChange={(e) => setFilters(prev => ({ ...prev, section: e.target.value }))}
                  >
                    <option value="all">All Sections</option>
                    {[...new Set(reportData.sectionReports.map(s => s.sectionName))].map(section => (
                      <option key={section} value={section}>{section}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label small text-muted">FILTER BY TEACHER</label>
                  <select 
                    className="form-select"
                    value={filters.teacher}
                    onChange={(e) => setFilters(prev => ({ ...prev, teacher: e.target.value }))}
                  >
                    <option value="all">All Teachers</option>
                    {reportData.teacherReports.map(teacher => (
                      <option key={teacher.teacherName} value={teacher.teacherName}>
                        {teacher.teacherName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label small text-muted">MINIMUM RATE</label>
                  <select 
                    className="form-select"
                    value={filters.minRate}
                    onChange={(e) => setFilters(prev => ({ ...prev, minRate: parseInt(e.target.value) }))}
                  >
                    <option value="0">All Rates</option>
                    <option value="90">90% and above</option>
                    <option value="80">80% and above</option>
                    <option value="70">70% and above</option>
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label small text-muted">ACTIONS</label>
                  <button 
                    className="btn btn-outline-secondary w-100"
                    onClick={() => setFilters({ section: 'all', teacher: 'all', minRate: 0 })}
                  >
                    <i className="bi bi-arrow-clockwise me-1"></i>
                    Reset Filters
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Tables */}
      <div className="row">
        <div className="col-lg-6 mb-4">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0">
              <h6 className="mb-0">
                <i className="bi bi-diagram-3 me-2"></i>
                Section Performance Details ({getFilteredSections().length})
              </h6>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="ps-3">Section</th>
                      <th>Classes</th>
                      <th>Students</th>
                      <th>Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredSections().map((section, index) => (
                      <tr key={index}>
                        <td className="ps-3">
                          <div>
                            <div className="fw-medium">{section.sectionName}</div>
                            <small className="text-muted">
                              {section.subjects.join(', ') || 'Homeroom'}
                            </small>
                          </div>
                        </td>
                        <td>
                          <span className="badge bg-light text-dark">
                            {section.classesTaken}
                          </span>
                        </td>
                        <td>
                          <small className="text-muted">
                            {section.averageStudentsPerClass} avg
                          </small>
                        </td>
                        <td>
                          <div className="d-flex align-items-center">
                            <div 
                              className="progress me-2" 
                              style={{ width: '50px', height: '6px' }}
                            >
                              <div 
                                className={`progress-bar bg-${
                                  section.attendanceRate >= 90 ? 'success' : 
                                  section.attendanceRate >= 80 ? 'warning' : 'danger'
                                }`}
                                style={{ width: `${section.attendanceRate}%` }}
                              ></div>
                            </div>
                            <span className={`text-${
                              section.attendanceRate >= 90 ? 'success' : 
                              section.attendanceRate >= 80 ? 'warning' : 'danger'
                            } fw-medium`}>
                              {section.attendanceRate}%
                            </span>
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

        <div className="col-lg-6 mb-4">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0">
              <h6 className="mb-0">
                <i className="bi bi-people me-2"></i>
                Teacher Performance Details ({getFilteredTeachers().length})
              </h6>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="ps-3">Teacher</th>
                      <th>Classes</th>
                      <th>Sections</th>
                      <th>Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredTeachers().map((teacher, index) => (
                      <tr key={index}>
                        <td className="ps-3">
                          <div>
                            <div className="fw-medium">{teacher.teacherName}</div>
                            <small className="text-muted">
                              {teacher.homeroomClasses}H • {teacher.subjectClasses}S
                            </small>
                          </div>
                        </td>
                        <td>
                          <span className="badge bg-light text-dark">
                            {teacher.classesTaken}
                          </span>
                        </td>
                        <td>
                          <small className="text-muted">
                            {teacher.sectionsCount}
                          </small>
                        </td>
                        <td>
                          <div className="d-flex align-items-center">
                            <div 
                              className="progress me-2" 
                              style={{ width: '50px', height: '6px' }}
                            >
                              <div 
                                className={`progress-bar bg-${
                                  teacher.averageRate >= 90 ? 'success' : 
                                  teacher.averageRate >= 80 ? 'warning' : 'danger'
                                }`}
                                style={{ width: `${teacher.averageRate}%` }}
                              ></div>
                            </div>
                            <span className={`text-${
                              teacher.averageRate >= 90 ? 'success' : 
                              teacher.averageRate >= 80 ? 'warning' : 'danger'
                            } fw-medium`}>
                              {teacher.averageRate}%
                            </span>
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
      </div>
    </div>
  );

  const renderFiltersAndControls = () => (
    <div className="card border-0 shadow-sm mb-4">
      <div className="card-body">
        <div className="row align-items-end">
          <div className="col-md-3 mb-3">
            <label className="form-label small text-muted">FROM DATE</label>
            <input
              type="date"
              className="form-control"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              max={dateRange.end}
            />
          </div>

          <div className="col-md-3 mb-3">
            <label className="form-label small text-muted">TO DATE</label>
            <input
              type="date"
              className="form-control"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              min={dateRange.start}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="col-md-3 mb-3">
            <label className="form-label small text-muted">REPORT TYPE</label>
            <select 
              className="form-select"
              value={selectedReportType}
              onChange={(e) => setSelectedReportType(e.target.value)}
            >
              <option value="overview">Overview & Summary</option>
              <option value="trends">Daily Trends Analysis</option>
              <option value="detailed">Detailed Performance</option>
            </select>
          </div>

          <div className="col-md-3 mb-3">
            <label className="form-label small text-muted">QUICK RANGES</label>
            <div className="btn-group w-100" role="group">
              <button 
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => {
                  const today = new Date();
                  const lastWeek = new Date();
                  lastWeek.setDate(today.getDate() - 7);
                  setDateRange({
                    start: lastWeek.toISOString().split('T')[0],
                    end: today.toISOString().split('T')[0]
                  });
                }}
              >
                Week
              </button>
              <button 
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => {
                  const today = new Date();
                  const lastMonth = new Date();
                  lastMonth.setDate(today.getDate() - 30);
                  setDateRange({
                    start: lastMonth.toISOString().split('T')[0],
                    end: today.toISOString().split('T')[0]
                  });
                }}
              >
                Month
              </button>
            </div>
          </div>
        </div>

        {/* Date range info */}
        <div className="mt-3 pt-3 border-top">
          <div className="d-flex justify-content-between align-items-center">
            <small className="text-muted">
              <i className="bi bi-calendar-range me-1"></i>
              Showing data from {new Date(dateRange.start).toLocaleDateString()} to {new Date(dateRange.end).toLocaleDateString()}
            </small>
            <div className="d-flex gap-2">
              <span className="badge bg-light text-dark">
                {reportData.overallStats.totalClasses || 0} classes
              </span>
              <span className="badge bg-light text-dark">
                {reportData.overallStats.totalStudents || 0} student records
              </span>
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
            <h5>Generating Reports...</h5>
            <p className="text-muted">Analyzing attendance data and calculating statistics</p>
          </div>
        </div>
      );
    }

    switch (selectedReportType) {
      case 'trends':
        return renderTrends();
      case 'detailed':
        return renderDetailedAnalysis();
      default:
        return renderOverview();
    }
  };

  return (
    <div>
      {/* Filters and Controls */}
      {renderFiltersAndControls()}

      {/* Main Content */}
      {renderCurrentView()}

      {/* Export and Actions */}
      <div className="row mt-4">
        <div className="col-12">
          <div className="card border-0 bg-light">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="mb-1">
                    <i className="bi bi-download me-2"></i>
                    Export Reports
                  </h6>
                  <small className="text-muted">
                    Generate detailed reports for external use or record keeping
                  </small>
                </div>
                <div className="btn-group">
                  <button className="btn btn-outline-primary btn-sm" disabled>
                    <i className="bi bi-file-earmark-pdf me-1"></i>
                    PDF Report
                  </button>
                  <button className="btn btn-outline-success btn-sm" disabled>
                    <i className="bi bi-file-earmark-excel me-1"></i>
                    Excel Export
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="row mt-4">
        <div className="col-12">
          <div className="alert alert-info border-0 d-flex align-items-center">
            <i className="bi bi-info-circle fs-5 me-3"></i>
            <div>
              <strong>Supervisor Reports:</strong> All data is read-only and automatically updated. 
              Reports reflect real-time attendance submissions by teachers. 
              For data corrections or detailed analysis, contact system administrators.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ViewReports;