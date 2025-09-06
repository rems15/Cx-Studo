// src/components/teacher/MonitorModal.js - ADDED REPORTS TAB
import React from 'react';
import { useMonitorData } from './hooks/useMonitorData';
import { useMonitorState } from './hooks/useMonitorState';
import { getContextConfig } from './utils/monitorHelpers';
import StudentsView from './components/StudentView';
import WeekView from './components/WeekView';
import ReportsView from './components/ReportsView'; // NEW IMPORT

const MonitorModal = ({ 
    currentUser, 
    sectionData,
    monitorContext,
    focusSubjects = [],
    onClose,
    subjectColors = {}
}) => {
    // HOOKS
    const { 
        students, 
        subjects, 
        attendanceData, 
        historicalData, 
        loading, 
        error 
    } = useMonitorData(sectionData, monitorContext, focusSubjects);

    // Force Students tab to be default and stay active
    const [activeView, setActiveView] = React.useState('students');
    const [searchTerm, setSearchTerm] = React.useState('');
    const [selectedDate, setSelectedDate] = React.useState(new Date().toISOString().split('T')[0]);

    // Week view states
    const [currentWeekStart, setCurrentWeekStart] = React.useState(() => {
        const today = new Date();
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return weekStart.toISOString().split('T')[0];
    });

    // CONFIG
    const config = getContextConfig(monitorContext, focusSubjects, subjectColors);

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

    // MAIN RENDER
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

                    {/* UPDATED TAB NAVIGATION WITH REPORTS */}
                    <div className="modal-body p-0">
                        {/* Better styled tabs */}
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
                           
                                    {/* NEW REPORTS TAB */}
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
                                <StudentsView 
                                    students={students}
                                    subjects={subjects}
                                    attendanceData={attendanceData}
                                    historicalData={historicalData}
                                    selectedDate={selectedDate}
                                    setSelectedDate={setSelectedDate}
                                    searchTerm={searchTerm}
                                    setSearchTerm={setSearchTerm}
                                    currentWeekStart={currentWeekStart}
                                />
                            )}
                            
                            {activeView === 'week' && (
                                <WeekView 
                                    subjects={subjects}
                                    historicalData={historicalData}
                                    currentWeekStart={currentWeekStart}
                                    setCurrentWeekStart={setCurrentWeekStart}
                                />
                            )}

                            {/* NEW REPORTS VIEW */}
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
                                        {students.length} students • {subjects.length} subjects
                                        {activeView === 'students' && selectedDate && (
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
        </div>
    );
};

export default MonitorModal;