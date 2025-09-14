// src/components/teacher/components/StudentsView.js - Updated with Smart Filtering + monitorContext
import React, { useState, useMemo } from 'react';
import { calculateOverallStudentSummary } from '../utils/monitorCalculations';
import { getScheduledSubjectsForDate, testScheduleHelpers } from '../utils/scheduleHelpers';


const StudentView = ({ 
    students, 
    subjects, 
    attendanceData, 
    historicalData, 
    selectedDate,
    setSelectedDate,
    searchTerm, 
    setSearchTerm, 
    currentWeekStart,
    monitorContext  // NEW: Added prop
}) => {
    const [sortBy, setSortBy] = useState('name');
    const [sortDirection, setSortDirection] = useState('asc');
    const [selectedCell, setSelectedCell] = useState(null);
    const [selectedStudent, setSelectedStudent] = useState(null);
    
    // NEW: Smart filtering state
    const [showAllSubjects, setShowAllSubjects] = useState(false);

    // ADD THIS for debugging (remove later):
    React.useEffect(() => {
        if (subjects.length > 0) {
            console.log('🔥 LIVE DATA - Subjects loaded:', subjects.map(s => ({
                name: s.name,
                schedule: s.schedule
            })));
        }
    }, [subjects]);

    // ✅ UPDATED: Smart subject filtering with monitorContext
    const displaySubjects = useMemo(() => {
        // If manually toggled to show all, always show all
        if (showAllSubjects) {
            return subjects;
        }
        
        // ✅ NEW: For subject teachers, show all subjects by default
        // Only homeroom teachers get smart filtering
        if (monitorContext === 'subject') {
            return subjects; // Show all subjects for subject teachers
        }
        
        // Smart filtering only for homeroom teachers (show today's scheduled subjects)
        return getScheduledSubjectsForDate(subjects, selectedDate);
    }, [subjects, selectedDate, showAllSubjects, monitorContext]);

    // Get attendance data for selected date
    const dateAttendanceData = attendanceData[selectedDate] || historicalData[selectedDate] || {};

    // Helper functions - MOVED TO TOP LEVEL
    const getRoomDisplay = (subject) => {
        // Special case for Homeroom - don't show room
        if (subject.name === 'Homeroom' || subject.code === 'HR') {
            return ''; // Show nothing for homeroom
        }
        
        // For other subjects, show room if available
        if (subject.room) {
            return `Room ${subject.room}`;
        }
        
        // If no room data, show "TBA" (To Be Assigned)
        return 'Room TBA';
    };

    const getRoomTooltip = (subject) => {
        if (subject.name === 'Homeroom' || subject.code === 'HR') {
            return `${subject.name} - Main classroom`;
        }
        
        if (subject.room) {
            return `${subject.name} - Room ${subject.room}`;
        }
        
        return `${subject.name} - Room assignment pending`;
    };

    // Enhanced behavior flag detection
    const getAttendanceCell = (student, subject) => {
        const subjectData = dateAttendanceData[subject.name];
        
        // Check if student is enrolled in this subject
        const isEnrolled = checkStudentEnrollment(student, subject);
        
        if (!isEnrolled) {
            return { 
                type: 'not-enrolled', 
                display: '', 
                className: 'text-muted',
                tooltip: 'Not enrolled in this subject'
            };
        }

        // Check if attendance was taken for this subject
        if (!subjectData || !subjectData.students || subjectData.students.length === 0) {
            return { 
                type: 'pending', 
                display: '⏳', 
                className: 'text-warning',
                tooltip: 'Attendance pending - not taken yet'
            };
        }

        // Enhanced: Multiple ways to find student record
        const studentRecord = findStudentRecord(student, subjectData.students);

        if (!studentRecord) {
            return { 
                type: 'pending', 
                display: '⏳', 
                className: 'text-warning',
                tooltip: 'Student record not found - attendance may be pending'
            };
        }

        // Attendance taken - show status with icons
        const statusIcons = {
            present: '✅',
            absent: '❌', 
            late: '⏰',
            excused: '🆔'
        };
        
        const statusColors = {
            present: 'text-success',
            absent: 'text-danger',
            late: 'text-warning', 
            excused: 'text-info'
        };
        
        let display = statusIcons[studentRecord.status] || '❓';
        let className = statusColors[studentRecord.status] || 'text-secondary';
        
        // Enhanced: Multiple behavior flag checks
        const hasBehaviorIssue = checkBehaviorFlag(studentRecord);
        if (hasBehaviorIssue) {
            display += '🚩';
        }
        
        // Add notes indicator
        if (studentRecord.notes && studentRecord.notes.trim()) {
            display += '📝';
        }
        
        return {
            type: 'taken',
            display,
            className,
            tooltip: `${studentRecord.status?.charAt(0).toUpperCase() + studentRecord.status?.slice(1)}${studentRecord.notes ? ` - ${studentRecord.notes}` : ''}${hasBehaviorIssue ? ' (Behavior Issue)' : ''}`,
            record: studentRecord,
            hasBehaviorFlag: hasBehaviorIssue
        };
    };

    // Enhanced student record matching
    const findStudentRecord = (student, attendanceStudents) => {
        // Try multiple matching strategies
        const strategies = [
            // Strategy 1: Exact name match
            (s) => s.studentName === `${student.firstName} ${student.lastName}`,
            
            // Strategy 2: Student ID match
            (s) => s.studentId === student.id || s.studentId === student.studentId,
            
            // Strategy 3: Reverse name match
            (s) => s.studentName === `${student.lastName}, ${student.firstName}`,
            
            // Strategy 4: Case insensitive name match
            (s) => s.studentName?.toLowerCase() === `${student.firstName} ${student.lastName}`.toLowerCase(),
            
            // Strategy 5: Partial name match (first name only)
            (s) => s.studentName?.toLowerCase().includes(student.firstName.toLowerCase()),
            
            // Strategy 6: Student number/ID variations
            (s) => s.studentNumber === student.studentId || s.student_id === student.id
        ];

        for (const strategy of strategies) {
            const record = attendanceStudents.find(strategy);
            if (record) {
                return record;
            }
        }
        
        return null;
    };

    // Enhanced behavior flag detection
    const checkBehaviorFlag = (studentRecord) => {
        // Check all possible behavior flag fields
        const behaviorFields = [
            'hasBehaviorIssue',
            'hasFlag',
            'behaviorFlag', 
            'flagged',
            'behavior_issue',
            'has_behavior_issue',
            'behaviorIssues',
            'disciplinary',
            'conduct_issue'
        ];

        for (const field of behaviorFields) {
            if (studentRecord[field] === true || studentRecord[field] === 'true' || studentRecord[field] === 1) {
                return true;
            }
        }

        // Check for behavior in notes (common pattern)
        if (studentRecord.notes && typeof studentRecord.notes === 'string') {
            const behaviorKeywords = ['behavior', 'disruptive', 'misconduct', 'inappropriate', 'discipline', 'warned'];
            const hasKeyword = behaviorKeywords.some(keyword => 
                studentRecord.notes.toLowerCase().includes(keyword)
            );
            
            if (hasKeyword) {
                return true;
            }
        }

        return false;
    };

    // Check if student is enrolled in subject
    const checkStudentEnrollment = (student, subject) => {
        // For homeroom, all students are enrolled
        if (subject.name === 'Homeroom') {
            return true;
        }

        // Check subjectEnrollments array
        if (student.subjectEnrollments && Array.isArray(student.subjectEnrollments)) {
            const enrolled = student.subjectEnrollments.some(enrollment => {
                const subjectName = enrollment.subjectName || enrollment.subject || enrollment.name;
                return subjectName && subjectName.toLowerCase() === subject.name.toLowerCase();
            });
            if (enrolled) return true;
        }

        // Check selectedSubjects array
        if (student.selectedSubjects && Array.isArray(student.selectedSubjects)) {
            const enrolled = student.selectedSubjects.some(selectedSubject =>
                selectedSubject && selectedSubject.toLowerCase() === subject.name.toLowerCase()
            );
            if (enrolled) return true;
        }

        // Check subjects array
        if (student.subjects && Array.isArray(student.subjects)) {
            const enrolled = student.subjects.some(s => 
                s && s.toLowerCase() === subject.name.toLowerCase()
            );
            if (enrolled) return true;
        }

        // Check direct subject field
        if (student.subject && student.subject.toLowerCase() === subject.name.toLowerCase()) {
            return true;
        }

        return false;
    };

    // Get summary stats using displaySubjects (filtered subjects)
    const getSummaryStats = () => {
        return calculateOverallStudentSummary(students, displaySubjects, { [selectedDate]: dateAttendanceData });
    };

    const stats = getSummaryStats();

    // Filter and sort students
    const filteredAndSortedStudents = useMemo(() => {
        let filtered = students.filter(student =>
            `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (student.studentId && student.studentId.toString().includes(searchTerm))
        );

        return filtered.sort((a, b) => {
            let aValue, bValue;
            
            if (sortBy === 'name') {
                aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
                bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
            } else if (sortBy === 'studentId') {
                aValue = a.studentId || a.id;
                bValue = b.studentId || b.id;
            } else if (sortBy === 'section') {
                aValue = `${a.gradeLevel || 0}-${a.section || a.sectionName || ''}`;
                bValue = `${b.gradeLevel || 0}-${b.section || b.sectionName || ''}`;
            }
            
            const comparison = aValue.toString().localeCompare(bValue.toString());
            return sortDirection === 'asc' ? comparison : -comparison;
        });
    }, [students, searchTerm, sortBy, sortDirection]);

    const handleSort = (column) => {
        if (sortBy === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortDirection('asc');
        }
    };

    const getSortIcon = (column) => {
        if (sortBy !== column) return 'bi-arrow-down-up';
        return sortDirection === 'asc' ? 'bi-arrow-up' : 'bi-arrow-down';
    };

    const handleCellClick = (student, subject) => {
        const cell = getAttendanceCell(student, subject);
        if (cell.type !== 'not-enrolled') {
            setSelectedCell({
                student: `${student.firstName} ${student.lastName}`,
                studentId: student.studentId || student.id,
                subject: subject.name,
                cell: cell,
                date: selectedDate
            });
        }
    };

    // Handle student name click
    const handleStudentClick = (student) => {
        setSelectedStudent(student);
    };

    // Quick date navigation
    const goToToday = () => {
        setSelectedDate(new Date().toISOString().split('T')[0]);
    };

    const goToYesterday = () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        setSelectedDate(yesterday.toISOString().split('T')[0]);
    };

    const isToday = selectedDate === new Date().toISOString().split('T')[0];

    // Student Detail View
    if (selectedStudent) {
        return (
            <div className="student-detail-view">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                        <h5 className="mb-0">
                            <i className="bi bi-person-circle me-2"></i>
                            {selectedStudent.firstName} {selectedStudent.lastName}
                        </h5>
                        <small className="text-muted">
                            ID: {selectedStudent.studentId || selectedStudent.id} • 
                            Grade {selectedStudent.gradeLevel || 'N/A'}-{selectedStudent.section || selectedStudent.sectionName || 'N/A'}
                        </small>
                    </div>
                    <button 
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => setSelectedStudent(null)}
                    >
                        <i className="bi bi-arrow-left me-1"></i>Back to List
                    </button>
                </div>

                {/* Student's Subject Attendance */}
                <div className="card">
                    <div className="card-header">
                        <h6 className="mb-0">Subject Attendance - {new Date(selectedDate).toLocaleDateString()}</h6>
                    </div>
                    <div className="card-body">
                        <div className="row g-2">
                            {displaySubjects.map(subject => {
                                const cell = getAttendanceCell(selectedStudent, subject);
                                const isEnrolled = cell.type !== 'not-enrolled';
                                
                                return (
                                    <div key={subject.id} className="col-md-6">
                                        <div className={`card border-0 ${isEnrolled ? 'bg-light' : 'bg-light opacity-50'}`}>
                                            <div className="card-body p-3">
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <div>
                                                        <h6 className="mb-1">
                                                            <span 
                                                                className="badge me-2"
                                                                style={{ 
                                                                    backgroundColor: subject.color,
                                                                    color: 'white'
                                                                }}
                                                            >
                                                                {subject.code}
                                                            </span>
                                                            {subject.name}
                                                            {/* Show behavior flag in student detail */}
                                                            {cell.hasBehaviorFlag && (
                                                                <span className="ms-2">🚩</span>
                                                            )}
                                                        </h6>
                                                        {!isEnrolled && (
                                                            <small className="text-muted">Not enrolled</small>
                                                        )}
                                                    </div>
                                                    <div className="text-center">
                                                        {isEnrolled ? (
                                                            <span 
                                                                className={`fs-4 ${cell.className}`}
                                                                title={cell.tooltip}
                                                            >
                                                                {cell.display}
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted">—</span>
                                                        )}
                                                    </div>
                                                </div>
                                                {cell.record?.notes && (
                                                    <div className="mt-2">
                                                        <small className="text-muted">
                                                            <i className="bi bi-chat-text me-1"></i>
                                                            {cell.record.notes}
                                                        </small>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="students-view">
            {/* Header Controls */}
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
                    
                    {/* ✅ NEW: Smart subject toggle - only show for homeroom teachers */}
                    {monitorContext === 'homeroom' && (
                        <div className="form-check form-switch">
                            <input
                                className="form-check-input"
                                type="checkbox"
                                id="showAllSubjects"
                                checked={showAllSubjects}
                                onChange={(e) => setShowAllSubjects(e.target.checked)}
                            />
                            <label className="form-check-label" htmlFor="showAllSubjects">
                                <small>Show all subjects</small>
                            </label>
                        </div>
                    )}
                </div>
                
                <div className="d-flex align-items-center gap-2">
                    <input
                        type="date"
                        className="form-control form-control-sm"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        style={{ width: '140px' }}
                    />
                    <div className="btn-group btn-group-sm">
                        <button 
                            className={`btn ${isToday ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={goToToday}
                        >
                            Today
                        </button>
                        <button 
                            className="btn btn-outline-secondary"
                            onClick={goToYesterday}
                        >
                            Yesterday
                        </button>
                    </div>
                </div>
            </div>

            {/* ✅ NEW: Context indicator */}
            {monitorContext === 'subject' && (
                <div className="alert alert-info alert-dismissible border-0 py-2 mb-3">
                    <small>
                        <i className="bi bi-info-circle me-1"></i>
                        <strong>Subject Teacher View:</strong> Showing all subjects automatically. 
                        Use the "Show scheduled only" toggle if you need to filter.
                    </small>
                </div>
            )}

    
            {monitorContext === 'homeroom' && showAllSubjects && (
                <div className="mb-2">
                    <small className="text-muted">
                        Showing all {subjects.length} subjects
                        <button 
                            className="btn btn-link btn-sm p-0 ms-2"
                            onClick={() => setShowAllSubjects(false)}
                        >
                            Show scheduled only
                        </button>
                    </small>
                </div>
            )}

            {/* Summary Stats */}
            <div className="row mb-3 g-2">
                <div className="col">
                    <div className="card border-0 bg-light">
                        <div className="card-body p-2 text-center">
                            <div className="h6 mb-0 text-primary">{stats.total}</div>
                            <small className="text-muted">Students</small>
                        </div>
                    </div>
                </div>
                <div className="col">
                    <div className="card border-0 bg-light">
                        <div className="card-body p-2 text-center">
                            <div className="h6 mb-0 text-success">{stats.present}</div>
                            <small className="text-muted">Present</small>
                        </div>
                    </div>
                </div>
                <div className="col">
                    <div className="card border-0 bg-light">
                        <div className="card-body p-2 text-center">
                            <div className="h6 mb-0 text-danger">{stats.absent}</div>
                            <small className="text-muted">Absent</small>
                        </div>
                    </div>
                </div>
                <div className="col">
                    <div className="card border-0 bg-light">
                        <div className="card-body p-2 text-center">
                            <div className="h6 mb-0 text-warning">{stats.late}</div>
                            <small className="text-muted">Late</small>
                        </div>
                    </div>
                </div>
                <div className="col">
                    <div className="card border-0 bg-light">
                        <div className="card-body p-2 text-center">
                            <div className="h6 mb-0 text-warning">{stats.pending}</div>
                            <small className="text-muted">Pending</small>
                        </div>
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="card border-0 bg-light mb-3">
                <div className="card-body p-2">
                    <div className="row">
                        <div className="col-md-7">
                            <small className="fw-bold text-muted">STATUS:</small>
                            <div className="d-flex gap-2 mt-1 flex-wrap">
                                <span><span className="text-success">✅</span> Present</span>
                                <span><span className="text-danger">❌</span> Absent</span>
                                <span><span className="text-warning">⏰</span> Late</span>
                                <span><span className="text-info">🆔</span> Excused</span>
                                <span><span className="text-warning">⏳</span> Pending</span>
                            </div>
                        </div>
                        <div className="col-md-5">
                            <small className="fw-bold text-muted">INDICATORS:</small>
                            <div className="d-flex gap-2 mt-1 flex-wrap">
                                <span>🚩 Behavior</span>
                                <span>📝 Notes</span>
                                <span><em className="text-muted">(blank) Not Enrolled</em></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Compact Table Layout - NOW USES displaySubjects (filtered) */}
            <div className="table-responsive">
                <table className="table table-sm table-hover" style={{ width: 'auto' }}>
                    <thead className="table-light sticky-top">
                        <tr>
                            <th style={{ width: '40px' }}>#</th>
                            <th 
                                style={{ cursor: 'pointer', minWidth: '200px', maxWidth: '250px' }}
                                onClick={() => handleSort('name')}
                            >
                                Student Name
                                <i className={`bi ${getSortIcon('name')} ms-1`}></i>
                            </th>
                            <th 
                                style={{ cursor: 'pointer', width: '120px' }}
                                onClick={() => handleSort('section')}
                            >
                                Grade/Section
                                <i className={`bi ${getSortIcon('section')} ms-1`}></i>
                            </th>
                            {/* NOW RENDERS displaySubjects (filtered) INSTEAD OF subjects */}
                            {displaySubjects.map(subject => (
                                <th 
                                    key={subject.id} 
                                    className="text-center"
                                    style={{ 
                                        width: '90px',
                                        backgroundColor: (subject.color || '#6c757d') + '20',
                                        borderLeft: `3px solid ${subject.color || '#6c757d'}`,
                                        padding: '8px 4px'
                                    }}
                                    title={getRoomTooltip(subject)}
                                >
                                    <div 
                                        className="badge text-white fw-bold mb-1"
                                        style={{ 
                                            backgroundColor: subject.color || '#6c757d',
                                            fontSize: '10px',
                                            display: 'block'
                                        }}
                                    >
                                        {subject.code}
                                    </div>
                                    <div 
                                        className="text-muted"
                                        style={{ 
                                            fontSize: '9px',
                                            fontWeight: '500'
                                        }}
                                    >
                                        {getRoomDisplay(subject)}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAndSortedStudents.map((student, index) => (
                            <tr key={student.id}>
                                <td className="text-center">
                                    <span className="badge bg-secondary">{index + 1}</span>
                                </td>
                                <td>
                                    <div 
                                        className="fw-medium text-primary" 
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => handleStudentClick(student)}
                                        title="Click to view student details"
                                    >
                                        {student.firstName} {student.lastName}
                                        <i className="bi bi-box-arrow-up-right ms-1" style={{ fontSize: '10px' }}></i>
                                    </div>
                                    <div>
                                        <small className="text-muted" style={{ fontSize: '10px' }}>
                                            ID: {student.studentId || student.id}
                                        </small>
                                    </div>
                                </td>
                                <td>
                                    <small className="text-muted">
                                        {student.gradeLevel || 'N/A'}-{student.section || student.sectionName || 'N/A'}
                                    </small>
                                </td>
                                {/* NOW RENDERS displaySubjects (filtered) INSTEAD OF subjects */}
                                {displaySubjects.map(subject => {
                                    const cell = getAttendanceCell(student, subject);
                                    return (
                                        <td 
                                            key={subject.id}
                                            className="text-center"
                                            style={{ 
                                                cursor: cell.type !== 'not-enrolled' ? 'pointer' : 'default',
                                                fontSize: '16px',
                                                backgroundColor: (subject.color || '#6c757d') + '08',
                                                padding: '8px 4px'
                                            }}
                                            onClick={() => handleCellClick(student, subject)}
                                            title={cell.tooltip || ''}
                                        >
                                            <span className={cell.className}>
                                                {cell.display}
                                            </span>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Footer Info */}
            <div className="d-flex justify-content-between align-items-center mt-2">
                <small className="text-muted">
                    Showing {filteredAndSortedStudents.length} of {students.length} students for {new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    {searchTerm && ` • Filtered by "${searchTerm}"`}
                    {/* ✅ NEW: Show subject filter info */}
                    {monitorContext === 'homeroom' && !showAllSubjects && displaySubjects.length < subjects.length && (
                        <span className="text-info"> • Showing scheduled subjects only</span>
                    )}
                    {monitorContext === 'subject' && (
                        <span className="text-info"> • Subject teacher view (all subjects)</span>
                    )}
                </small>
                <small className="text-muted">
                    Last updated: {new Date().toLocaleTimeString()}
                </small>
            </div>

            {/* Cell Detail Modal - unchanged */}
            {selectedCell && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h6 className="modal-title">
                                    <i className="bi bi-person-circle me-2"></i>
                                    {selectedCell.student} - {selectedCell.subject}
                                </h6>
                                <button 
                                    type="button" 
                                    className="btn-close"
                                    onClick={() => setSelectedCell(null)}
                                ></button>
                            </div>
                            <div className="modal-body">
                                <div className="row mb-3">
                                    <div className="col-6">
                                        <strong>Date:</strong>
                                        <div className="text-muted">
                                            {new Date(selectedCell.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                        </div>
                                    </div>
                                    <div className="col-6">
                                        <strong>Student ID:</strong>
                                        <div className="text-muted">
                                            <code>{selectedCell.studentId}</code>
                                        </div>
                                    </div>
                                </div>

                                {selectedCell.cell.type === 'pending' ? (
                                    <div className="alert alert-warning">
                                        <i className="bi bi-clock me-2"></i>
                                        Attendance has not been taken for this subject yet.
                                    </div>
                                ) : selectedCell.cell.record ? (
                                    <>
                                        <div className="row mb-3">
                                            <div className="col-6">
                                                <strong>Status:</strong>
                                                <div className="mt-1">
                                                    <span className={`badge bg-${
                                                        selectedCell.cell.record.status === 'present' ? 'success' :
                                                        selectedCell.cell.record.status === 'absent' ? 'danger' :
                                                        selectedCell.cell.record.status === 'late' ? 'warning' : 'info'
                                                    }`}>
                                                        {selectedCell.cell.record.status?.charAt(0).toUpperCase() + selectedCell.cell.record.status?.slice(1)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="col-6">
                                                <strong>Flags:</strong>
                                                <div className="mt-1">
                                                    {selectedCell.cell.hasBehaviorFlag && (
                                                        <span className="badge bg-warning text-dark me-1">🚩 Behavior</span>
                                                    )}
                                                    {selectedCell.cell.record.notes && (
                                                        <span className="badge bg-info">📝 Notes</span>
                                                    )}
                                                    {!selectedCell.cell.hasBehaviorFlag && !selectedCell.cell.record.notes && (
                                                        <span className="text-muted">None</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        {selectedCell.cell.record.notes && (
                                            <div className="mt-3">
                                                <strong>Notes:</strong>
                                                <div className="alert alert-light mt-1 mb-0">
                                                    {selectedCell.cell.record.notes}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="alert alert-info">
                                        <i className="bi bi-info-circle me-2"></i>
                                        No detailed information available.
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button 
                                    className="btn btn-secondary"
                                    onClick={() => setSelectedCell(null)}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentView;