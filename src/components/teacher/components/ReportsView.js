// src/components/teacher/components/ReportsView.js
import React, { useState, useMemo } from 'react';

const ReportsView = ({ 
    students, 
    subjects, 
    attendanceData, 
    historicalData, 
    sectionData,
    subjectColors,
    selectedDate,
    setSelectedDate,
    currentWeekStart,
    setCurrentWeekStart
}) => {
    const [activeReportTab, setActiveReportTab] = useState('daily');
    const [dateRange, setDateRange] = useState({
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days ago
        end: new Date().toISOString().split('T')[0] // today
    });

    // Calculate daily summary for selected date
    const calculateDailySummary = () => {
        const dateData = attendanceData[selectedDate] || historicalData[selectedDate] || {};
        
        const summary = {
            totalStudents: students.length,
            subjectsTaken: 0,
            subjectsPending: 0,
            overallStats: {
                present: 0,
                absent: 0,
                late: 0,
                excused: 0
            },
            subjectBreakdown: []
        };

        subjects.forEach(subject => {
            const subjectData = dateData[subject.name];
            
            if (subjectData && subjectData.students && subjectData.students.length > 0) {
                summary.subjectsTaken++;
                
                const stats = {
                    present: subjectData.students.filter(s => s.status === 'present').length,
                    absent: subjectData.students.filter(s => s.status === 'absent').length,
                    late: subjectData.students.filter(s => s.status === 'late').length,
                    excused: subjectData.students.filter(s => s.status === 'excused').length
                };

                // Add to overall stats
                summary.overallStats.present += stats.present;
                summary.overallStats.absent += stats.absent;
                summary.overallStats.late += stats.late;
                summary.overallStats.excused += stats.excused;

                summary.subjectBreakdown.push({
                    subject: subject.name,
                    color: subject.color || '#6c757d',
                    stats,
                    total: stats.present + stats.absent + stats.late + stats.excused,
                    attendanceRate: Math.round(((stats.present + stats.late) / (stats.present + stats.absent + stats.late + stats.excused)) * 100) || 0,
                    takenBy: subjectData.teacherName,
                    time: subjectData.time
                });
            } else {
                summary.subjectsPending++;
                summary.subjectBreakdown.push({
                    subject: subject.name,
                    color: subject.color || '#6c757d',
                    stats: { present: 0, absent: 0, late: 0, excused: 0 },
                    total: 0,
                    attendanceRate: 0,
                    status: 'pending'
                });
            }
        });

        return summary;
    };

    // Calculate weekly trends
    const calculateWeeklyTrends = () => {
        const weekDates = [];
        const startDate = new Date(currentWeekStart);
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            weekDates.push(date.toISOString().split('T')[0]);
        }

        const weeklyData = weekDates.map(date => {
            const dateData = attendanceData[date] || historicalData[date] || {};
            const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
            
            let dayStats = { present: 0, absent: 0, late: 0, excused: 0, total: 0 };
            let subjectsTaken = 0;

            subjects.forEach(subject => {
                const subjectData = dateData[subject.name];
                if (subjectData && subjectData.students) {
                    subjectsTaken++;
                    subjectData.students.forEach(student => {
                        if (dayStats.hasOwnProperty(student.status)) {
                            dayStats[student.status]++;
                            dayStats.total++;
                        }
                    });
                }
            });

            return {
                date,
                dayName,
                dayNumber: new Date(date).getDate(),
                stats: dayStats,
                subjectsTaken,
                attendanceRate: dayStats.total > 0 ? Math.round(((dayStats.present + dayStats.late) / dayStats.total) * 100) : 0
            };
        });

        return weeklyData;
    };

    // Calculate student performance summary
    const calculateStudentPerformance = () => {
        return students.map(student => {
            let totalClasses = 0;
            let presentCount = 0;
            let absentCount = 0;
            let lateCount = 0;
            let behaviorFlags = 0;

            // Check all available dates
            const allDates = [...Object.keys(attendanceData), ...Object.keys(historicalData)];
            const uniqueDates = [...new Set(allDates)];

            uniqueDates.forEach(date => {
                const dateData = attendanceData[date] || historicalData[date] || {};
                
                subjects.forEach(subject => {
                    const subjectData = dateData[subject.name];
                    if (subjectData && subjectData.students) {
                        const studentRecord = subjectData.students.find(s => 
                            s.studentName === `${student.firstName} ${student.lastName}` ||
                            s.studentId === student.id
                        );
                        
                        if (studentRecord) {
                            totalClasses++;
                            if (studentRecord.status === 'present') presentCount++;
                            else if (studentRecord.status === 'absent') absentCount++;
                            else if (studentRecord.status === 'late') lateCount++;
                            
                            if (studentRecord.hasBehaviorIssue) behaviorFlags++;
                        }
                    }
                });
            });

            return {
                ...student,
                totalClasses,
                presentCount,
                absentCount,
                lateCount,
                behaviorFlags,
                attendanceRate: totalClasses > 0 ? Math.round(((presentCount + lateCount) / totalClasses) * 100) : 0,
                riskLevel: totalClasses > 0 ? (
                    (absentCount / totalClasses) > 0.2 ? 'high' :
                    (absentCount / totalClasses) > 0.1 ? 'medium' : 'low'
                ) : 'unknown'
            };
        }).sort((a, b) => a.attendanceRate - b.attendanceRate); // Sort by attendance rate (lowest first)
    };

    // Export functions
    const exportToPDF = () => {
        // This would integrate with a PDF library like jsPDF
        alert('PDF export functionality would be implemented here');
    };

    const exportToCSV = () => {
        const dailySummary = calculateDailySummary();
        let csvContent = "Subject,Present,Absent,Late,Excused,Total,Attendance Rate,Status\n";
        
        dailySummary.subjectBreakdown.forEach(item => {
            csvContent += `${item.subject},${item.stats.present},${item.stats.absent},${item.stats.late},${item.stats.excused},${item.total},${item.attendanceRate}%,${item.status || 'taken'}\n`;
        });
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_report_${selectedDate}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    // Get calculated data
    const dailySummary = calculateDailySummary();
    const weeklyTrends = calculateWeeklyTrends();
    const studentPerformance = calculateStudentPerformance();

    return (
        <div className="reports-view">
            {/* Header with Export Options */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="mb-0">
                    <i className="bi bi-bar-chart me-2"></i>
                    Attendance Reports
                </h5>
                <div className="btn-group btn-group-sm">
                    <button className="btn btn-outline-success" onClick={exportToCSV}>
                        <i className="bi bi-file-earmark-excel me-1"></i>CSV
                    </button>
                    <button className="btn btn-outline-danger" onClick={exportToPDF}>
                        <i className="bi bi-file-earmark-pdf me-1"></i>PDF
                    </button>
                </div>
            </div>

            {/* Report Type Tabs */}
            <div className="card border-0">
                <div className="card-header bg-light border-0">
                    <ul className="nav nav-tabs card-header-tabs">
                        <li className="nav-item">
                            <button 
                                className={`nav-link ${activeReportTab === 'daily' ? 'active' : ''}`}
                                onClick={() => setActiveReportTab('daily')}
                            >
                                <i className="bi bi-calendar-day me-1"></i>Daily Summary
                            </button>
                        </li>
                        <li className="nav-item">
                            <button 
                                className={`nav-link ${activeReportTab === 'weekly' ? 'active' : ''}`}
                                onClick={() => setActiveReportTab('weekly')}
                            >
                                <i className="bi bi-calendar-week me-1"></i>Weekly Trends
                            </button>
                        </li>
                        <li className="nav-item">
                            <button 
                                className={`nav-link ${activeReportTab === 'students' ? 'active' : ''}`}
                                onClick={() => setActiveReportTab('students')}
                            >
                                <i className="bi bi-people me-1"></i>Student Performance
                            </button>
                        </li>
                    </ul>
                </div>

                <div className="card-body">
                    {/* Daily Summary Report */}
                    {activeReportTab === 'daily' && (
                        <div className="daily-report">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h6>Daily Summary - {new Date(selectedDate).toLocaleDateString()}</h6>
                                <input
                                    type="date"
                                    className="form-control form-control-sm"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    style={{ width: '150px' }}
                                />
                            </div>

                            {/* Overall Stats Cards */}
                            <div className="row mb-4 g-2">
                                <div className="col-md-3">
                                    <div className="card border-0 bg-primary text-white">
                                        <div className="card-body text-center py-3">
                                            <h4>{dailySummary.totalStudents}</h4>
                                            <small>Total Students</small>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="card border-0 bg-success text-white">
                                        <div className="card-body text-center py-3">
                                            <h4>{dailySummary.overallStats.present}</h4>
                                            <small>Present</small>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="card border-0 bg-danger text-white">
                                        <div className="card-body text-center py-3">
                                            <h4>{dailySummary.overallStats.absent}</h4>
                                            <small>Absent</small>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="card border-0 bg-warning text-white">
                                        <div className="card-body text-center py-3">
                                            <h4>{dailySummary.subjectsTaken}/{subjects.length}</h4>
                                            <small>Subjects Taken</small>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Subject Breakdown Table */}
                            <div className="table-responsive">
                                <table className="table table-sm">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Subject</th>
                                            <th className="text-center">Present</th>
                                            <th className="text-center">Absent</th>
                                            <th className="text-center">Late</th>
                                            <th className="text-center">Excused</th>
                                            <th className="text-center">Total</th>
                                            <th className="text-center">Attendance Rate</th>
                                            <th>Taken By</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dailySummary.subjectBreakdown.map((item, index) => (
                                            <tr key={index}>
                                                <td>
                                                    <div className="d-flex align-items-center">
                                                        <div 
                                                            className="me-2"
                                                            style={{
                                                                width: '12px',
                                                                height: '12px',
                                                                backgroundColor: item.color,
                                                                borderRadius: '2px'
                                                            }}
                                                        ></div>
                                                        {item.subject}
                                                    </div>
                                                </td>
                                                <td className="text-center text-success">{item.stats.present}</td>
                                                <td className="text-center text-danger">{item.stats.absent}</td>
                                                <td className="text-center text-warning">{item.stats.late}</td>
                                                <td className="text-center text-info">{item.stats.excused}</td>
                                                <td className="text-center fw-bold">{item.total}</td>
                                                <td className="text-center">
                                                    <span className={`badge ${
                                                        item.attendanceRate >= 90 ? 'bg-success' :
                                                        item.attendanceRate >= 80 ? 'bg-warning' : 'bg-danger'
                                                    }`}>
                                                        {item.attendanceRate}%
                                                    </span>
                                                </td>
                                                <td>
                                                    <small className="text-muted">{item.takenBy || 'N/A'}</small>
                                                </td>
                                                <td>
                                                    {item.status === 'pending' ? (
                                                        <span className="badge bg-warning">Pending</span>
                                                    ) : (
                                                        <span className="badge bg-success">Taken</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Weekly Trends Report */}
                    {activeReportTab === 'weekly' && (
                        <div className="weekly-report">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h6>Weekly Trends</h6>
                                <div className="d-flex gap-2">
                                    <button 
                                        className="btn btn-outline-secondary btn-sm"
                                        onClick={() => {
                                            const newStart = new Date(currentWeekStart);
                                            newStart.setDate(newStart.getDate() - 7);
                                            setCurrentWeekStart(newStart.toISOString().split('T')[0]);
                                        }}
                                    >
                                        <i className="bi bi-chevron-left"></i>
                                    </button>
                                    <span className="align-self-center">
                                        Week of {new Date(currentWeekStart).toLocaleDateString()}
                                    </span>
                                    <button 
                                        className="btn btn-outline-secondary btn-sm"
                                        onClick={() => {
                                            const newStart = new Date(currentWeekStart);
                                            newStart.setDate(newStart.getDate() + 7);
                                            setCurrentWeekStart(newStart.toISOString().split('T')[0]);
                                        }}
                                    >
                                        <i className="bi bi-chevron-right"></i>
                                    </button>
                                </div>
                            </div>

                            <div className="table-responsive">
                                <table className="table table-sm">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Day</th>
                                            <th className="text-center">Present</th>
                                            <th className="text-center">Absent</th>
                                            <th className="text-center">Late</th>
                                            <th className="text-center">Excused</th>
                                            <th className="text-center">Attendance Rate</th>
                                            <th className="text-center">Subjects Taken</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {weeklyTrends.map((day, index) => (
                                            <tr key={index}>
                                                <td>
                                                    <div>
                                                        <div className="fw-bold">{day.dayName}</div>
                                                        <small className="text-muted">{day.dayNumber}</small>
                                                    </div>
                                                </td>
                                                <td className="text-center text-success">{day.stats.present}</td>
                                                <td className="text-center text-danger">{day.stats.absent}</td>
                                                <td className="text-center text-warning">{day.stats.late}</td>
                                                <td className="text-center text-info">{day.stats.excused}</td>
                                                <td className="text-center">
                                                    <span className={`badge ${
                                                        day.attendanceRate >= 90 ? 'bg-success' :
                                                        day.attendanceRate >= 80 ? 'bg-warning' : 'bg-danger'
                                                    }`}>
                                                        {day.attendanceRate}%
                                                    </span>
                                                </td>
                                                <td className="text-center">
                                                    <small>{day.subjectsTaken}/{subjects.length}</small>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Student Performance Report */}
                    {activeReportTab === 'students' && (
                        <div className="students-report">
                            <h6 className="mb-3">Student Performance Summary</h6>
                            
                            {/* Risk Level Summary */}
                            <div className="row mb-4 g-2">
                                <div className="col-md-3">
                                    <div className="card border-0 bg-success text-white">
                                        <div className="card-body text-center py-2">
                                            <h5>{studentPerformance.filter(s => s.riskLevel === 'low').length}</h5>
                                            <small>Low Risk </small>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="card border-0 bg-warning text-white">
                                        <div className="card-body text-center py-2">
                                            <h5>{studentPerformance.filter(s => s.riskLevel === 'medium').length}</h5>
                                            <small>Medium Risk </small>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="card border-0 bg-danger text-white">
                                        <div className="card-body text-center py-2">
                                            <h5>{studentPerformance.filter(s => s.riskLevel === 'high').length}</h5>
                                            <small>High Risk </small>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="card border-0 bg-secondary text-white">
                                        <div className="card-body text-center py-2">
                                            <h5>{studentPerformance.filter(s => s.behaviorFlags > 0).length}</h5>
                                            <small>Behavior Flags</small>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="table-responsive">
                                <table className="table table-sm">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Student</th>
                                            <th className="text-center">Total Classes</th>
                                            <th className="text-center">Present</th>
                                            <th className="text-center">Absent</th>
                                            <th className="text-center">Late</th>
                                            <th className="text-center">Attendance Rate</th>
                                            <th className="text-center">Behavior Flags</th>
                                            <th className="text-center">Risk Level</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {studentPerformance.map((student, index) => (
                                            <tr key={student.id}>
                                                <td>
                                                    <div>
                                                        <div className="fw-medium">{student.firstName} {student.lastName}</div>
                                                        <small className="text-muted">ID: {student.studentId || student.id}</small>
                                                    </div>
                                                </td>
                                                <td className="text-center">{student.totalClasses}</td>
                                                <td className="text-center text-success">{student.presentCount}</td>
                                                <td className="text-center text-danger">{student.absentCount}</td>
                                                <td className="text-center text-warning">{student.lateCount}</td>
                                                <td className="text-center">
                                                    <span className={`badge ${
                                                        student.attendanceRate >= 90 ? 'bg-success' :
                                                        student.attendanceRate >= 80 ? 'bg-warning' : 'bg-danger'
                                                    }`}>
                                                        {student.attendanceRate}%
                                                    </span>
                                                </td>
                                                <td className="text-center">
                                                    {student.behaviorFlags > 0 ? (
                                                        <span className="badge bg-warning text-dark">{student.behaviorFlags}</span>
                                                    ) : (
                                                        <span className="text-muted">0</span>
                                                    )}
                                                </td>
                                                <td className="text-center">
                                                    <span className={`badge ${
                                                        student.riskLevel === 'low' ? 'bg-success' :
                                                        student.riskLevel === 'medium' ? 'bg-warning' :
                                                        student.riskLevel === 'high' ? 'bg-danger' : 'bg-secondary'
                                                    }`}>
                                                        {student.riskLevel.toUpperCase()}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReportsView;