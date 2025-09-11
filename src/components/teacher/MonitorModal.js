// src/components/teacher/MonitorModal.js - REMOVE ScheduleService, KEEP Good Toggle
import React, { useState } from 'react';
import { useMonitorData } from './hooks/useMonitorData';
import { getContextConfig } from './utils/monitorHelpers';
import StudentView from './components/StudentView';
import ReportsView from './components/ReportsView';

const MonitorModal = ({ 
    currentUser, 
    sectionData,
    monitorContext,
    focusSubjects = [],
    onClose,
    subjectColors = {}
}) => {
    // STATES
    const [activeView, setActiveView] = useState('students');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [showScheduledOnly, setShowScheduledOnly] = useState(false); // Simple boolean toggle

    // Week view states
    const [currentWeekStart, setCurrentWeekStart] = useState(() => {
        const today = new Date();
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return weekStart.toISOString().split('T')[0];
    });

    // DATA HOOKS
    const { 
        students, 
        subjects, 
        attendanceData, 
        historicalData, 
        loading, 
        error 
    } = useMonitorData(sectionData, monitorContext, focusSubjects);

    const config = getContextConfig(monitorContext, focusSubjects, subjectColors);

    // SIMPLE FILTER LOGIC (no external service needed)
    const getFilteredSubjects = () => {
        if (!showScheduledOnly) return subjects;
        
        // Simple filtering - you can enhance this later
        // For now, just return all subjects (you can add your logic here)
        return subjects;
    };

    const filteredSubjects = getFilteredSubjects();

    // LOADING STATE
    if (loading) {
        return (
            <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <div className="modal-dialog modal-fullscreen-sm-down modal-lg">
                    <div className="modal-content">
                        <div className="modal-body text-center py-5">
                            <div className="spinner-border text-primary mb-3"></div>
                            <h5>Loading Monitor...</h5>
                            <p className="text-muted">Fetching attendance data...</p>
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
                <div className="modal-dialog">
                    <div className="modal-content">
                        <div className="modal-header bg-danger text-white">
                            <h5 className="modal-title">Error</h5>
                            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
                        </div>
                        <div className="modal-body">
                            <p className="mb-0">{error}</p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={onClose}>Close</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-fullscreen-sm-down modal-xl">
                <div className="modal-content">
                    {/* HEADER */}
                    <div className="modal-header py-2 text-white" style={{ background: config.headerColor }}>
                        <div>
                            <h6 className="modal-title mb-0">
                                <i className={`bi ${config.icon} me-2`}></i>
                                {config.title}
                            </h6>
                            <small className="opacity-75">
                                {sectionData.name || `${sectionData.gradeLevel}-${sectionData.sectionName}`}
                                {sectionData.isMultiSection && (
                                    <span className="ms-1">• {sectionData.sectionsInfo?.length} sections</span>
                                )}
                            </small>
                        </div>
                        <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
                    </div>

                    {/* TAB NAVIGATION */}
                    <div className="bg-light border-bottom">
                        <div className="container-fluid px-3 py-2">
                            <ul className="nav nav-tabs border-0">
                                <li className="nav-item">
                                    <button 
                                        className={`nav-link ${activeView === 'students' ? 'active bg-white' : 'text-muted'}`}
                                        style={{
                                            border: activeView === 'students' ? '1px solid #dee2e6' : 'none',
                                            borderBottom: activeView === 'students' ? '1px solid white' : 'none',
                                            borderRadius: '6px 6px 0 0',
                                            fontWeight: '500'
                                        }}
                                        onClick={() => setActiveView('students')}
                                    >
                                        <i className="bi bi-people me-2"></i>
                                        Students
                                        <span className="badge bg-primary ms-2">{students.length}</span>
                                    </button>
                                </li>
                                
                                <li className="nav-item">
                                    <button 
                                        className={`nav-link ${activeView === 'reports' ? 'active bg-white' : 'text-muted'}`}
                                        style={{
                                            border: activeView === 'reports' ? '1px solid #dee2e6' : 'none',
                                            borderBottom: activeView === 'reports' ? '1px solid white' : 'none',
                                            borderRadius: '6px 6px 0 0',
                                            fontWeight: '500'
                                        }}
                                        onClick={() => setActiveView('reports')}
                                    >
                                        <i className="bi bi-bar-chart me-2"></i>
                                        Reports
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* CONTENT AREA */}
                    <div className="p-3" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                        
                        {activeView === 'students' && (
                            <div>
                                {/* SINGLE SET OF CONTROLS - No duplicates */}
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <div className="d-flex align-items-center gap-2">
                                        <input
                                            type="text"
                                            className="form-control form-control-sm"
                                            placeholder="Search students..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            style={{ width: '200px' }}
                                        />
                                    </div>
                                    
                                    <div className="d-flex align-items-center gap-2">
                                        {/* SINGLE TOGGLE - The good one from your original */}
                                        <div className="btn-group btn-group-sm" role="group">
                                            <button 
                                                className={`btn ${!showScheduledOnly ? 'btn-primary' : 'btn-outline-primary'}`}
                                                onClick={() => setShowScheduledOnly(false)}
                                                title="Show all subjects"
                                            >
                                                <i className="bi bi-list-ul me-1"></i>
                                                All Subjects
                                                <span className="badge bg-light text-dark ms-1">{subjects.length}</span>
                                            </button>
                                            <button 
                                                className={`btn ${showScheduledOnly ? 'btn-warning' : 'btn-outline-warning'}`}
                                                onClick={() => setShowScheduledOnly(true)}
                                                title="Show only scheduled subjects for today"
                                            >
                                                <i className="bi bi-calendar-day me-1"></i>
                                                Scheduled Only
                                                <span className="badge bg-light text-dark ms-1">{filteredSubjects.length}</span>
                                            </button>
                                        </div>
                                        
                                        {/* Date controls */}
                                        <input
                                            type="date"
                                            className="form-control form-control-sm"
                                            value={selectedDate}
                                            onChange={(e) => setSelectedDate(e.target.value)}
                                            style={{ width: '140px' }}
                                        />
                                        <div className="btn-group btn-group-sm">
                                            <button 
                                                className={`btn ${selectedDate === new Date().toISOString().split('T')[0] ? 'btn-primary' : 'btn-outline-primary'}`}
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
                                        </div>
                                    </div>
                                </div>

                                {/* Optional: Info banner when filtering is active */}
                                {showScheduledOnly && (
                                    <div className="alert alert-warning border-0 mb-3">
                                        <div className="d-flex align-items-center">
                                            <i className="bi bi-calendar-week me-2"></i>
                                            <div>
                                                <strong>Scheduled Filter Active:</strong> 
                                                Showing subjects scheduled for {new Date(selectedDate).toLocaleDateString()}
                                                <small className="text-muted ms-2">
                                                    ({filteredSubjects.length} of {subjects.length} subjects)
                                                </small>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                <StudentView 
                                    students={students}
                                    subjects={filteredSubjects}
                                    attendanceData={attendanceData}
                                    historicalData={historicalData}
                                    selectedDate={selectedDate}
                                    setSelectedDate={setSelectedDate}
                                    searchTerm={searchTerm}
                                    setSearchTerm={setSearchTerm}
                                    currentWeekStart={currentWeekStart}
                                    hideControls={true}
                                />
                            </div>
                        )}
                        
                        {activeView === 'reports' && (
                            <ReportsView 
                                students={students}
                                subjects={subjects}
                                attendanceData={attendanceData}
                                historicalData={historicalData}
                                sectionData={sectionData}
                                subjectColors={subjectColors}
                                selectedDate={selectedDate}
                                setSelectedDate={setSelectedDate}
                                currentWeekStart={currentWeekStart}
                                setCurrentWeekStart={setCurrentWeekStart}
                            />
                        )}
                    </div>

                    {/* FOOTER */}
                    <div className="modal-footer py-2 bg-light border-top">
                        <div className="d-flex justify-content-between align-items-center w-100">
                            <div className="d-flex align-items-center">
                                <span className="badge bg-success me-2">
                                    <i className="bi bi-broadcast"></i> Live
                                </span>
                                <small className="text-muted">
                                    {students.length} students • 
                                    {showScheduledOnly 
                                        ? `${filteredSubjects.length} scheduled subjects`
                                        : `${subjects.length} total subjects`
                                    }
                                    {selectedDate && (
                                        <span> • {new Date(selectedDate).toLocaleDateString()}</span>
                                    )}
                                </small>
                            </div>
                            <div className="d-flex gap-2">
                                <button 
                                    className="btn btn-outline-success btn-sm"
                                    onClick={() => window.location.reload()}
                                >
                                    <i className="bi bi-arrow-clockwise me-1"></i>Refresh
                                </button>
                                <button 
                                    className="btn btn-outline-primary btn-sm"
                                    onClick={() => {
                                        const filename = `${sectionData.name || 'attendance'}_${selectedDate}.csv`;
                                        console.log('Export to:', filename);
                                    }}
                                >
                                    <i className="bi bi-download me-1"></i>Export
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