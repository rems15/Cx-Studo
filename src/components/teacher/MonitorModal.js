// src/components/teacher/MonitorModal.js - COMPLETE FIXED VERSION
import React, { useState } from 'react';
import { useMonitorData } from './hooks/useMonitorData';
import { getContextConfig } from './utils/monitorHelpers';
import StudentView from './components/StudentView';

const MonitorModal = ({ 
    currentUser, 
    sectionData,
    monitorContext,
    focusSubjects = [],
    onClose,
    subjectColors = {}
}) => {
    // FIXED: Basic state with proper date initialization
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDate, setSelectedDate] = useState(() => {
        // FIXED: Proper date calculation to avoid timezone issues
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        console.log('MonitorModal initializing with date:', `${year}-${month}-${day}`);
        return `${year}-${month}-${day}`;
    });
    const [activeTab, setActiveTab] = useState('students');
    
    // CORRECTED: Only create toggle state for homeroom teachers
    const [showAllSubjects, setShowAllSubjects] = useState(false);

    // Load data using existing hook
    const { 
        students, 
        subjects, 
        attendanceData, 
        historicalData, 
        loading, 
        error 
    } = useMonitorData(sectionData, monitorContext, focusSubjects);

    // Get configuration for header styling
    const config = getContextConfig(monitorContext, focusSubjects, subjectColors);

    // Calculate performance data
    const calculatePerformanceData = () => {
        if (!students || students.length === 0) return [];
        
        return students.map(student => {
            const studentAttendance = attendanceData || {};
            let totalClasses = 0, presentCount = 0, absentCount = 0, lateCount = 0;
            let behaviorFlags = 0, meritPoints = 0;

            // Count across all subjects
            Object.values(studentAttendance).forEach(subjectData => {
                if (Array.isArray(subjectData)) {
                    const record = subjectData.find(r => r.id === student.id || r.studentId === student.id);
                    if (record) {
                        totalClasses++;
                        if (record.status === 'present') presentCount++;
                        if (record.status === 'absent') absentCount++;
                        if (record.status === 'late') lateCount++;
                        if (record.hasBehaviorIssue || record.hasFlag || record.behaviorFlag) behaviorFlags++;
                        if (record.hasMerit || record.merit || record.meritFlag) meritPoints++;
                    }
                }
            });

            const attendanceRate = totalClasses > 0 ? Math.round(((presentCount + lateCount) / totalClasses) * 100) : 0;
            
            let riskLevel = 'LOW';
            if (attendanceRate < 70 || absentCount > 5 || behaviorFlags > 2) riskLevel = 'HIGH';
            else if (attendanceRate < 85 || absentCount > 2 || lateCount > 3 || behaviorFlags > 0) riskLevel = 'MEDIUM';

            return { ...student, totalClasses, presentCount, absentCount, lateCount, behaviorFlags, meritPoints, attendanceRate, riskLevel };
        });
    };

    // LOADING STATE
    if (loading) {
        return (
            <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <div className="modal-dialog modal-fullscreen-sm-down modal-xl">
                    <div className="modal-content">
                        <div className="modal-body text-center py-5">
                            <div className="spinner-border text-primary mb-3"></div>
                            <h5>Loading Attendance Data...</h5>
                            <p className="text-muted">Fetching student attendance records...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ERROR STATE
    if (error) {
        return (
            <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <div className="modal-dialog modal-lg">
                    <div className="modal-content">
                        <div className="modal-header bg-danger text-white">
                            <h5 className="modal-title">
                                <i className="bi bi-exclamation-triangle me-2"></i>
                                Error Loading Attendance
                            </h5>
                            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
                        </div>
                        <div className="modal-body">
                            <div className="alert alert-danger border-0">
                                <p className="mb-0">{error}</p>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={onClose}>Close</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // FIXED: Get current date in long format for header
    const currentDateFormatted = (() => {
        const date = new Date(selectedDate + 'T12:00:00');
        return date.toLocaleDateString('en-US', {
            month: 'long', 
            day: 'numeric', 
            year: 'numeric'
        });
    })();

    // MAIN RENDER - With tabs
    return (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-fullscreen-sm-down modal-xl">
                <div className="modal-content">
                    {/* SIMPLIFIED HEADER */}
                    <div className="modal-header py-3 text-white" style={{ background: config.headerColor }}>
                        <div>
                            <h5 className="modal-title mb-1">
                                <i className={`bi ${config.icon} me-2`}></i>
                                Attendance Monitor
                            </h5>
                            <div className="d-flex align-items-center gap-3">
                                <small className="opacity-75">
                                    {sectionData.name || `${sectionData.gradeLevel}-${sectionData.sectionName}`}
                                </small>
                                {sectionData.isMultiSection && (
                                    <small className="opacity-75">
                                        • {sectionData.sectionsInfo?.length} sections combined
                                    </small>
                                )}
                                <small className="opacity-75">
                                    • {currentDateFormatted}
                                </small>
                            </div>
                        </div>
                        <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
                    </div>

                    {/* CONTENT AREA - With tabs */}
                    <div className="modal-body p-4" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                        {/* Tab navigation */}
                        <ul className="nav nav-tabs mb-3">
                            <li className="nav-item">
                                <button 
                                    className={`nav-link ${activeTab === 'students' ? 'active' : ''}`} 
                                    onClick={() => setActiveTab('students')}
                                >
                                    <i className="bi bi-people me-2"></i>Students
                                </button>
                            </li>
                            <li className="nav-item">
                                <button 
                                    className={`nav-link ${activeTab === 'performance' ? 'active' : ''}`} 
                                    onClick={() => setActiveTab('performance')}
                                >
                                    <i className="bi bi-graph-up me-2"></i>Performance Monitor
                                </button>
                            </li>
                        </ul>

                        {/* Students Tab - FIXED: Added missing props */}
                        {activeTab === 'students' && (
                            <>
                                {students.length > 0 ? (
                                    <StudentView 
                                        students={students}
                                        subjects={subjects}
                                        attendanceData={attendanceData}
                                        historicalData={historicalData}
                                        selectedDate={selectedDate}
                                        setSelectedDate={setSelectedDate}
                                        searchTerm={searchTerm}
                                        setSearchTerm={setSearchTerm}
                                        monitorContext={monitorContext}
                                        sectionData={sectionData}
                                        {...(monitorContext === 'homeroom' && {
                                            showAllSubjects: showAllSubjects,
                                            setShowAllSubjects: setShowAllSubjects
                                        })}
                                    />
                                ) : (
                                    <div className="text-center py-5">
                                        <i className="bi bi-people display-4 text-muted mb-3"></i>
                                        <h5 className="text-muted">No Students Found</h5>
                                        <p className="text-muted">
                                            {monitorContext === 'subject' 
                                                ? `No students are enrolled in ${focusSubjects.join(', ')}`
                                                : 'No students found in this section'
                                            }
                                        </p>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Performance Tab */}
                        {activeTab === 'performance' && (
                            <div>
                                {(() => {
                                    const performanceData = calculatePerformanceData();
                                    const lowRisk = performanceData.filter(s => s.riskLevel === 'LOW').length;
                                    const mediumRisk = performanceData.filter(s => s.riskLevel === 'MEDIUM').length;
                                    const highRisk = performanceData.filter(s => s.riskLevel === 'HIGH').length;
                                    const totalBehavior = performanceData.reduce((sum, s) => sum + s.behaviorFlags, 0);
                                    const totalMerit = performanceData.reduce((sum, s) => sum + s.meritPoints, 0);

                                    return (
                                        <>
                                            {/* Summary Cards */}
                                            <div className="row mb-4">
                                                <div className="col-md-2">
                                                    <div className="card bg-success text-white text-center">
                                                        <div className="card-body p-2">
                                                            <div className="h4 mb-0">{lowRisk}</div>
                                                            <small>Low Risk</small>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="col-md-2">
                                                    <div className="card bg-warning text-white text-center">
                                                        <div className="card-body p-2">
                                                            <div className="h4 mb-0">{mediumRisk}</div>
                                                            <small>Medium Risk</small>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="col-md-2">
                                                    <div className="card bg-danger text-white text-center">
                                                        <div className="card-body p-2">
                                                            <div className="h4 mb-0">{highRisk}</div>
                                                            <small>High Risk</small>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="col-md-2">
                                                    <div className="card bg-dark text-white text-center">
                                                        <div className="card-body p-2">
                                                            <div className="h4 mb-0">{totalBehavior}</div>
                                                            <small>🚩 Behavior</small>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="col-md-2">
                                                    <div className="card bg-primary text-white text-center">
                                                        <div className="card-body p-2">
                                                            <div className="h4 mb-0">{totalMerit}</div>
                                                            <small>⭐ Merit</small>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="col-md-2">
                                                    <div className="card bg-info text-white text-center">
                                                        <div className="card-body p-2">
                                                            <div className="h4 mb-0">
                                                                {performanceData.length > 0 ? Math.round(performanceData.reduce((sum, s) => sum + s.attendanceRate, 0) / performanceData.length) : 0}%
                                                            </div>
                                                            <small>Avg Attendance</small>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Performance Table */}
                                            <div className="table-responsive">
                                                <table className="table table-hover table-sm">
                                                    <thead className="table-light">
                                                        <tr>
                                                            <th>Student</th>
                                                            <th className="text-center">Classes</th>
                                                            <th className="text-center">Present</th>
                                                            <th className="text-center">Absent</th>
                                                            <th className="text-center">Late</th>
                                                            <th className="text-center">Attendance</th>
                                                            <th className="text-center">🚩</th>
                                                            <th className="text-center">⭐</th>
                                                            <th className="text-center">Risk</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {performanceData.map(student => (
                                                            <tr key={student.id} className={student.riskLevel === 'HIGH' ? 'table-danger' : student.riskLevel === 'MEDIUM' ? 'table-warning' : ''}>
                                                                <td>
                                                                    <div className="fw-medium">{student.firstName} {student.lastName}</div>
                                                                    <small className="text-muted">ID: {student.studentId || student.id}</small>
                                                                </td>
                                                                <td className="text-center">{student.totalClasses}</td>
                                                                <td className="text-center"><span className="text-success fw-bold">{student.presentCount}</span></td>
                                                                <td className="text-center"><span className={student.absentCount > 0 ? 'text-danger fw-bold' : ''}>{student.absentCount}</span></td>
                                                                <td className="text-center"><span className={student.lateCount > 0 ? 'text-warning fw-bold' : ''}>{student.lateCount}</span></td>
                                                                <td className="text-center">
                                                                    <span className={`fw-bold ${student.attendanceRate >= 90 ? 'text-success' : student.attendanceRate >= 75 ? 'text-warning' : 'text-danger'}`}>
                                                                        {student.attendanceRate}%
                                                                    </span>
                                                                </td>
                                                                <td className="text-center">
                                                                    {student.behaviorFlags > 0 ? <span className="badge bg-warning text-dark">{student.behaviorFlags}</span> : <span className="text-muted">0</span>}
                                                                </td>
                                                                <td className="text-center">
                                                                    {student.meritPoints > 0 ? <span className="badge bg-primary">{student.meritPoints}</span> : <span className="text-muted">0</span>}
                                                                </td>
                                                                <td className="text-center">
                                                                    <span className={`badge ${student.riskLevel === 'HIGH' ? 'bg-danger' : student.riskLevel === 'MEDIUM' ? 'bg-warning' : 'bg-success'}`}>
                                                                        {student.riskLevel}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>

                                                {performanceData.length === 0 && (
                                                    <div className="text-center py-4">
                                                        <i className="bi bi-people text-muted" style={{ fontSize: '3rem' }}></i>
                                                        <div className="mt-2">
                                                            <h6>No performance data available</h6>
                                                            <small className="text-muted">Take attendance to see student performance tracking</small>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        )}
                    </div>

                    {/* SIMPLIFIED FOOTER */}
                    <div className="modal-footer py-2 bg-light border-top">
                        <div className="d-flex justify-content-between align-items-center w-100">
                            <div className="d-flex align-items-center gap-3">
                                {/* Live indicator */}
                                <span className="badge bg-success">
                                    <i className="bi bi-broadcast me-1"></i> Live Data
                                </span>
                                
                                {/* Summary info */}
                                <small className="text-muted">
                                    {students.length} students • {subjects.length} subjects
                                </small>
                                
                                {/* Context info */}
                                {monitorContext === 'subject' && focusSubjects.length > 0 && (
                                    <small className="text-info">
                                        Focused on: {focusSubjects.join(', ')}
                                    </small>
                                )}
                            </div>
                            
                            <div className="d-flex gap-2">
                                {/* Refresh button */}
                                <button 
                                    className="btn btn-outline-primary btn-sm"
                                    onClick={() => window.location.reload()}
                                    title="Refresh data"
                                >
                                    <i className="bi bi-arrow-clockwise"></i>
                                </button>
                                
                                {/* Close button */}
                                <button 
                                    className="btn btn-secondary btn-sm"
                                    onClick={onClose}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MonitorModal;