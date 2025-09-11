// src/components/teacher/components/StudentsView.js - ENHANCED WITH TIMESTAMPS
import React, { useState, useMemo } from 'react';
import { calculateOverallStudentSummary } from '../utils/monitorCalculations';

const StudentView = ({ 
    students, 
    subjects, 
    attendanceData, 
    historicalData, 
    selectedDate,
    setSelectedDate,
    searchTerm, 
    setSearchTerm, 
    currentWeekStart 
}) => {
    const [sortBy, setSortBy] = useState('name');
    const [sortDirection, setSortDirection] = useState('asc');
    const [selectedCell, setSelectedCell] = useState(null);
    const [selectedStudent, setSelectedStudent] = useState(null);

    // Get attendance data for selected date
    const dateAttendanceData = attendanceData[selectedDate] || historicalData[selectedDate] || {};

    // ✅ NEW: Enhanced date formatting function
    const formatNiceDate = (dateString) => {
        const date = new Date(dateString);
        const options = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        };
        return date.toLocaleDateString('en-US', options);
    };

    // ✅ NEW: Format timestamp for display
    const formatTimestamp = (timestamp) => {
        if (!timestamp) return 'Unknown time';
        
        try {
            let date;
            
            // Handle different timestamp formats
            if (timestamp.toDate && typeof timestamp.toDate === 'function') {
                // Firestore timestamp
                date = timestamp.toDate();
            } else if (typeof timestamp === 'string') {
                date = new Date(timestamp);
            } else if (timestamp instanceof Date) {
                date = timestamp;
            } else {
                return 'Unknown time';
            }
            
            // Format as "2:30 PM"
            return date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
        } catch (error) {
            console.error('Error formatting timestamp:', error);
            return 'Unknown time';
        }
    };

    // Helper functions
    const getRoomDisplay = (subject) => {
        if (subject.name === 'Homeroom' || subject.code === 'HR') {
            return '';
        }
        
        if (subject.room) {
            return `Room ${subject.room}`;
        }
        
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

        // ✅ NEW: Enhanced tooltip with timestamp
        let tooltip = `${studentRecord.status?.charAt(0).toUpperCase() + studentRecord.status?.slice(1)}`;
        
        // Add timestamp info to tooltip
        if (subjectData.teacherName) {
            tooltip += ` - Taken by ${subjectData.teacherName}`;
        }
        
        if (subjectData.time) {
            tooltip += ` at ${subjectData.time}`;
        } else if (subjectData.timestamp) {
            tooltip += ` at ${formatTimestamp(subjectData.timestamp)}`;
        }
        
        if (studentRecord.notes) {
            tooltip += ` - ${studentRecord.notes}`;
        }
        
        if (hasBehaviorIssue) {
            tooltip += ' (Behavior Issue)';
        }
        
        return {
            type: 'taken',
            display,
            className,
            tooltip,
            record: studentRecord,
            hasBehaviorFlag: hasBehaviorIssue,
            // ✅ NEW: Include timestamp data
            timestamp: subjectData.time || formatTimestamp(subjectData.timestamp),
            takenBy: subjectData.teacherName
        };
    };

    // Enhanced student record matching
    const findStudentRecord = (student, attendanceStudents) => {
        const strategies = [
            (s) => s.studentName === `${student.firstName} ${student.lastName}`,
            (s) => s.studentId === student.id || s.studentId === student.studentId,
            (s) => s.studentName === `${student.lastName}, ${student.firstName}`,
            (s) => s.studentName?.toLowerCase() === `${student.firstName} ${student.lastName}`.toLowerCase(),
            (s) => s.studentName?.toLowerCase().includes(student.firstName.toLowerCase()),
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
        if (subject.name === 'Homeroom') {
            return true;
        }

        if (student.subjectEnrollments && Array.isArray(student.subjectEnrollments)) {
            const enrolled = student.subjectEnrollments.some(enrollment => {
                const subjectName = enrollment.subjectName || enrollment.subject || enrollment.name;
                return subjectName && subjectName.toLowerCase() === subject.name.toLowerCase();
            });
            if (enrolled) return true;
        }

        if (student.selectedSubjects && Array.isArray(student.selectedSubjects)) {
            const enrolled = student.selectedSubjects.some(selectedSubject =>
                selectedSubject && selectedSubject.toLowerCase() === subject.name.toLowerCase()
            );
            if (enrolled) return true;
        }

        if (student.subjects && Array.isArray(student.subjects)) {
            const enrolled = student.subjects.some(s => 
                s && s.toLowerCase() === subject.name.toLowerCase()
            );
            if (enrolled) return true;
        }

        if (student.subject && student.subject.toLowerCase() === subject.name.toLowerCase()) {
            return true;
        }

        return false;
    };

    // Get summary stats
    const getSummaryStats = () => {
        return calculateOverallStudentSummary(students, subjects, { [selectedDate]: dateAttendanceData });
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

    const handleStudentClick = (student) => {
        setSelectedStudent(student);
    };

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
                        <h6 className="mb-0">Subject Attendance - {formatNiceDate(selectedDate)}</h6>
                    </div>
                    <div className="card-body">
                        <div className="row g-2">
                            {subjects.map(subject => {
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
                                                            {cell.hasBehaviorFlag && (
                                                                <span className="ms-2">🚩</span>
                                                            )}
                                                        </h6>
                                                        {!isEnrolled && (
                                                            <small className="text-muted">Not enrolled</small>
                                                        )}
                                                        {/* ✅ NEW: Show timestamp in student detail */}
                                                        {isEnrolled && cell.type === 'taken' && cell.timestamp && (
                                                            <div>
                                                                <small className="text-muted">
                                                                    <i className="bi bi-clock me-1"></i>
                                                                    Taken at {cell.timestamp}
                                                                    {cell.takenBy && ` by ${cell.takenBy}`}
                                                                </small>
                                                            </div>
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

            {/* ✅ NEW: Enhanced Legend with timestamp info */}
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
                    {/* ✅ NEW: Add timestamp info to legend */}
                    <div className="mt-2 pt-2 border-top">
                        <small className="text-muted">
                            <i className="bi bi-info-circle me-1"></i>
                            Hover over attendance symbols to see timestamps and teacher info
                        </small>
                    </div>
                </div>
            </div>

            {/* Compact Table Layout */}
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
                            {subjects.map(subject => (
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
                                {subjects.map(subject => {
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

            {/* ✅ NEW: Enhanced Footer Info with better date */}
            <div className="d-flex justify-content-between align-items-center mt-2">
                <small className="text-muted">
                    Showing {filteredAndSortedStudents.length} of {students.length} students for {formatNiceDate(selectedDate)}
                    {searchTerm && ` • Filtered by "${searchTerm}"`}
                </small>
                <small className="text-muted">
                    Last updated: {new Date().toLocaleTimeString()}
                </small>
            </div>

            {/* Enhanced Cell Detail Modal */}
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
                                            {formatNiceDate(selectedCell.date)}
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

                                        {/* ✅ NEW: Add timestamp section */}
                                        {(selectedCell.cell.timestamp || selectedCell.cell.takenBy) && (
                                            <div className="row mb-3">
                                                <div className="col-12">
                                                    <strong>Attendance Details:</strong>
                                                    <div className="mt-1">
                                                        {selectedCell.cell.timestamp && (
                                                            <div className="text-muted">
                                                                <i className="bi bi-clock me-1"></i>
                                                                Taken at: {selectedCell.cell.timestamp}
                                                            </div>
                                                        )}
                                                        {selectedCell.cell.takenBy && (
                                                            <div className="text-muted">
                                                                <i className="bi bi-person me-1"></i>
                                                                Taken by: {selectedCell.cell.takenBy}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

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