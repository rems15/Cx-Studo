// src/components/teacher/components/StudentView.js - UPDATED WITH FIXED TOGGLE LOGIC
import React, { useState, useMemo } from 'react';
import { calculateOverallStudentSummary } from '../utils/monitorCalculations';
import { getScheduledSubjectsForDate } from '../utils/scheduleHelpers';

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
    monitorContext,
    sectionData,
    // NEW: Props from parent MonitorModal for shared state
    showAllSubjects: propShowAllSubjects,
    setShowAllSubjects: propSetShowAllSubjects, 
    parentView = 'students'
}) => {
    const [sortBy, setSortBy] = useState('name');
    const [sortDirection, setSortDirection] = useState('asc');
    const [selectedCell, setSelectedCell] = useState(null);
    const [selectedStudent, setSelectedStudent] = useState(null);
    
    // FALLBACK: Create local state if props aren't provided (backward compatibility)
    const [localShowAllSubjects, setLocalShowAllSubjects] = useState(false);
    const showAllSubjects = propShowAllSubjects !== undefined ? propShowAllSubjects : localShowAllSubjects;
    const setShowAllSubjects = propSetShowAllSubjects || setLocalShowAllSubjects;

    // Get grade level from section data or students
    const getGradeLevel = () => {
        if (sectionData?.gradeLevel) {
            return sectionData.gradeLevel;
        }
        
        if (students.length > 0) {
            const studentGrade = students[0]?.gradeLevel || students[0]?.year;
            if (studentGrade) {
                return studentGrade;
            }
        }
        
        return null;
    };

    const currentGrade = getGradeLevel();

    // Helper functions for enrollment checking
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

    // Get subjects that students are actually enrolled in for this grade
    const getSubjectsForGrade = (allSubjects, gradeLevel, studentsData) => {
        console.log('🎯 Filtering subjects for grade:', gradeLevel);
        
        // Always include Homeroom
        const gradeSubjects = allSubjects.filter(subject => subject.name === 'Homeroom');
        
        // Get unique subjects that students are actually enrolled in
        const enrolledSubjects = new Set();
        
        studentsData.forEach(student => {
            // Check all enrollment fields
            if (student.subjectEnrollments && Array.isArray(student.subjectEnrollments)) {
                student.subjectEnrollments.forEach(enrollment => {
                    const subjectName = enrollment.subjectName || enrollment.subject || enrollment.name;
                    if (subjectName) {
                        enrolledSubjects.add(subjectName);
                    }
                });
            }
            
            if (student.selectedSubjects && Array.isArray(student.selectedSubjects)) {
                student.selectedSubjects.forEach(subjectName => {
                    if (subjectName) {
                        enrolledSubjects.add(subjectName);
                    }
                });
            }
            
            if (student.subjects && Array.isArray(student.subjects)) {
                student.subjects.forEach(subjectName => {
                    if (subjectName) {
                        enrolledSubjects.add(subjectName);
                    }
                });
            }
            
            if (student.subject) {
                enrolledSubjects.add(student.subject);
            }
        });
        
        // Add subjects that students are enrolled in
        allSubjects.forEach(subject => {
            if (subject.name !== 'Homeroom' && enrolledSubjects.has(subject.name)) {
                gradeSubjects.push(subject);
            }
        });
        
        console.log('✅ Grade subjects found:', gradeSubjects.map(s => s.name));
        return gradeSubjects;
    };

    // 🔧 FIXED: Corrected toggle logic - DEFAULT TO SCHEDULED SUBJECTS
    const displaySubjects = useMemo(() => {
        console.log('🎛️ Subject Filtering - Toggle:', showAllSubjects, 'Context:', monitorContext);
        console.log('📚 Total subjects available:', subjects.length, subjects.map(s => s.name));
        
        // For subject teachers - they see all their subjects by default
        if (monitorContext === 'subject') {
            console.log('👨‍🏫 Subject teacher - showing all subjects');
            return subjects;
        }
        
        // For homeroom teachers - FIXED LOGIC
        if (monitorContext === 'homeroom') {
            
            // ✅ DEFAULT STATE: Toggle OFF (false) = Show SCHEDULED subjects only (DEFAULT BEHAVIOR)
         if (!showAllSubjects) {
    console.log('📅 DEFAULT: Toggle OFF - showing SCHEDULED subjects only');
    try {
        const scheduledSubjects = getScheduledSubjectsForDate(subjects, selectedDate);
        
        // FIXED: Add proper validation
        if (scheduledSubjects.length > 0 && scheduledSubjects.length < subjects.length * 0.5) {
            // Only accept if result is less than 50% of total subjects
            console.log('⏰ Scheduled subjects found:', scheduledSubjects.map(s => s.name));
            return scheduledSubjects;
        } else {
            console.warn('⚠️ Schedule filtering returned too many subjects:', scheduledSubjects.length, 'out of', subjects.length);
        }
    } catch (error) {
        console.warn('⚠️ Schedule filtering failed:', error);
    }
    
    // Fallback when toggle is OFF - show minimal subjects
    const homeroomOnly = subjects.filter(s => s.name === 'Homeroom');
    console.log('🏠 Schedule fallback - homeroom only');
    return homeroomOnly;
}
            
            // ✅ Toggle ON (true) = Show ALL grade subjects (EXPANDED VIEW)
            console.log('🔛 Toggle ON - showing ALL Grade subjects');
            
            if (currentGrade && students.length > 0) {
                const gradeSubjects = getSubjectsForGrade(subjects, currentGrade, students);
                
                if (gradeSubjects.length > 1) { // More than just Homeroom
                    console.log('📚 Grade subjects found:', gradeSubjects.map(s => s.name));
                    return gradeSubjects;
                }
            }
            
            // Fallback - show all subjects when toggle is ON
            console.log('🔄 Fallback - showing all subjects');
            return subjects;
        }
        
        // Final fallback for other contexts
        return subjects;
    }, [subjects, selectedDate, showAllSubjects, monitorContext, currentGrade, students]);

    // Helper functions for student record matching
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

    const checkBehaviorFlag = (studentRecord) => {
        const behaviorFields = [
            'hasBehaviorIssue', 'hasFlag', 'behaviorFlag', 'flagged',
            'behavior_issue', 'has_behavior_issue', 'behaviorIssues',
            'disciplinary', 'conduct_issue'
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

    // NEW: Merit flag check function
    const checkMeritFlag = (studentRecord) => {
        const meritFields = [
            'hasMerit', 'merit', 'meritFlag', 'hasGoodBehavior', 'excellence',
            'has_merit', 'meritAwarded', 'goodBehavior', 'exemplary'
        ];

        for (const field of meritFields) {
            if (studentRecord[field] === true || studentRecord[field] === 'true' || studentRecord[field] === 1) {
                return true;
            }
        }

        if (studentRecord.notes && typeof studentRecord.notes === 'string') {
            const meritKeywords = ['merit', 'excellent', 'outstanding', 'exemplary', 'good behavior', 'recognition'];
            const hasKeyword = meritKeywords.some(keyword => 
                studentRecord.notes.toLowerCase().includes(keyword)
            );
            
            if (hasKeyword) {
                return true;
            }
        }

        return false;
    };

    const getRoomDisplay = (subject) => {
        if (subject.name === 'Homeroom' || subject.code === 'HR') {
            return '';
        }
        
        if (subject.room) {
            return subject.room;
        }
        
        return 'Room TBA';
    };

    const getRoomTooltip = (subject) => {
        if (subject.name === 'Homeroom' || subject.code === 'HR') {
            return `${subject.name} - Main classroom`;
        }
        
        if (subject.room) {
            return `${subject.name} - ${subject.room}`;
        }
        
        return `${subject.name} - Room assignment pending`;
    };

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return 'Unknown time';
        
        try {
            let date;
            
            if (timestamp.toDate && typeof timestamp.toDate === 'function') {
                date = timestamp.toDate();
            } else if (typeof timestamp === 'string') {
                date = new Date(timestamp);
            } else if (timestamp instanceof Date) {
                date = timestamp;
            } else {
                return 'Unknown time';
            }

            const timeStr = date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
            
            const dateStr = date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            });
            
            return `${timeStr} on ${dateStr}`;
        } catch (error) {
            console.error('Error formatting timestamp:', error);
            return 'Unknown time';
        }
    };

    const getAttendanceCell = (student, subject) => {
        const subjectData = dateAttendanceData[subject.name];
        
        const isEnrolled = checkStudentEnrollment(student, subject);
        
        if (!isEnrolled) {
            return { 
                type: 'not-enrolled', 
                display: '', 
                className: 'text-muted',
                tooltip: 'Not enrolled in this subject'
            };
        }

        if (!subjectData || !subjectData.students || subjectData.students.length === 0) {
            return { 
                type: 'pending', 
                display: '⏳', 
                className: 'text-warning',
                tooltip: 'Attendance pending - not taken yet'
            };
        }

        const studentRecord = findStudentRecord(student, subjectData.students);

        if (!studentRecord) {
            return { 
                type: 'pending', 
                display: '⏳', 
                className: 'text-warning',
                tooltip: 'Student record not found - attendance may be pending'
            };
        }

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
        
        const hasBehaviorIssue = checkBehaviorFlag(studentRecord);
        const hasMerit = checkMeritFlag(studentRecord);
        
        if (hasBehaviorIssue) {
            display += '🚩';
        }
        
        if (hasMerit) {
            display += '⭐';
        }
        
        if (studentRecord.notes && studentRecord.notes.trim()) {
            display += '📝';
        }
        
        return {
            type: 'taken',
            display,
            className,
            tooltip: `${studentRecord.status?.charAt(0).toUpperCase() + studentRecord.status?.slice(1)}${studentRecord.notes ? ` - ${studentRecord.notes}` : ''}${hasBehaviorIssue ? ' (Behavior Issue)' : ''}${hasMerit ? ' (Merit Awarded)' : ''}`,
            record: studentRecord,
            hasBehaviorFlag: hasBehaviorIssue,
            hasMeritFlag: hasMerit,
            subjectMetadata: subjectData
        };
    };

    const dateAttendanceData = attendanceData[selectedDate] || historicalData[selectedDate] || {};

    const getSummaryStats = () => {
        return calculateOverallStudentSummary(students, displaySubjects, { [selectedDate]: dateAttendanceData });
    };

    const stats = getSummaryStats();

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
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayString = `${year}-${month}-${day}`;
        console.log('Setting today to:', todayString);
        setSelectedDate(todayString);
    };

    const goToYesterday = () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const year = yesterday.getFullYear();
        const month = String(yesterday.getMonth() + 1).padStart(2, '0');
        const day = String(yesterday.getDate()).padStart(2, '0');
        const yesterdayString = `${year}-${month}-${day}`;
        setSelectedDate(yesterdayString);
    };

    const isToday = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayString = `${year}-${month}-${day}`;
        return selectedDate === todayString;
    };

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
                                                            {cell.hasBehaviorFlag && (
                                                                <span className="ms-2">🚩</span>
                                                            )}
                                                            {cell.hasMeritFlag && (
                                                                <span className="ms-2">⭐</span>
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
            {/* ENHANCED Header Controls */}
            <div className="row mb-3 align-items-center">
                <div className="col-md-6">
                    <div className="d-flex align-items-center gap-2">
                        <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Search students..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ width: '200px' }}
                        />
                        
                        {/* TOGGLE: Only for homeroom teachers - FIXED LABELS */}
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
                                    <small>
                                        {showAllSubjects ? 
                                            `Show all Grade ${currentGrade || 'student'} subjects (${displaySubjects.length})` : 
                                            `Show scheduled subjects only (${displaySubjects.length})`
                                        }
                                    </small>
                                </label>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="col-md-6">
                    {/* Date Picker Section */}
                    <div className="d-flex align-items-center justify-content-md-end gap-2">
                        <input
                            type="date"
                            className="form-control form-control-sm"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            style={{ width: '140px' }}
                            title="Select specific date"
                        />
                        
                        <div className="btn-group btn-group-sm">
                            <button 
                                className={`btn ${isToday() ? 'btn-primary' : 'btn-outline-primary'}`}
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
            </div>

            {/* IMPROVED Context indicators */}
            {monitorContext === 'subject' && (
                <div className="alert alert-info alert-dismissible border-0 py-2 mb-3">
                    <small>
                        <i className="bi bi-person-badge me-1"></i>
                        <strong>Subject Teacher View:</strong> Showing all {displaySubjects.length} subjects automatically.
                    </small>
                </div>
            )}

            {monitorContext === 'homeroom' && currentGrade && (
                <div className={`alert ${showAllSubjects ? 'alert-success' : 'alert-primary'} alert-dismissible border-0 py-2 mb-3`}>
                    <small>
                        <i className="bi bi-mortarboard me-1"></i>
                        <strong>Grade {currentGrade} Homeroom View:</strong> 
                        {showAllSubjects ? (
                            <span> Showing all {displaySubjects.length} subjects for Grade {currentGrade}</span>
                        ) : (
                            <span> Showing subjects scheduled for today only ({displaySubjects.length} subjects)</span>
                        )}
                    </small>
                </div>
            )}

            {/* DEBUG INFO - Show when there might be an issue */}
            {displaySubjects.length > 20 && !showAllSubjects && (
                <div className="alert alert-warning alert-dismissible border-0 py-2 mb-3">
                    <small>
                        <i className="bi bi-exclamation-triangle me-1"></i>
                        <strong>Debug:</strong> Showing {displaySubjects.length} subjects when scheduled filtering should show fewer. 
                        Check schedule data or toggle to "Show all subjects" for full view.
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

            {/* Updated Legend with Merit Flag */}
            <div className="card border-0 bg-light mb-3">
                <div className="card-body p-2">
                    <div className="row">
                        <div className="col-md-6">
                            <small className="fw-bold text-muted">STATUS:</small>
                            <div className="d-flex gap-2 mt-1 flex-wrap">
                                <span><span className="text-success">✅</span> Present</span>
                                <span><span className="text-danger">❌</span> Absent</span>
                                <span><span className="text-warning">⏰</span> Late</span>
                                <span><span className="text-info">🆔</span> Excused</span>
                                <span><span className="text-warning">⏳</span> Pending</span>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <small className="fw-bold text-muted">INDICATORS:</small>
                            <div className="d-flex gap-2 mt-1 flex-wrap">
                                <span>🚩 Behavior</span>
                                <span>⭐ Merit</span>
                                <span>📝 Notes</span>
                                <span><em className="text-muted">(blank) Not Enrolled</em></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Table */}
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
                                        {student.year || 'N/A'}-{student.section || student.sectionName || 'N/A'}
                                    </small>
                                </td>
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
                    {monitorContext === 'homeroom' && !showAllSubjects && displaySubjects.length < subjects.length && (
                        <span className="text-info"> • Showing scheduled subjects only</span>
                    )}
                    {monitorContext === 'homeroom' && showAllSubjects && (
                        <span className="text-success"> • Showing all grade subjects</span>
                    )}
                    {monitorContext === 'subject' && (
                        <span className="text-info"> • Subject teacher view (all subjects)</span>
                    )}
                </small>
                <small className="text-muted">
                    Last updated: {new Date().toLocaleTimeString()}
                </small>
            </div>

            {/* ENHANCED Cell Detail Modal with Timestamp */}
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
                                                    {selectedCell.cell.hasMeritFlag && (
                                                        <span className="badge bg-success me-1">⭐ Merit</span>
                                                    )}
                                                    {selectedCell.cell.record.notes && (
                                                        <span className="badge bg-info">📝 Notes</span>
                                                    )}
                                                    {!selectedCell.cell.hasBehaviorFlag && !selectedCell.cell.hasMeritFlag && !selectedCell.cell.record.notes && (
                                                        <span className="text-muted">None</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Timestamp Section */}
                                        <div className="row mb-3">
                                            <div className="col-6">
                                                <strong>Recorded:</strong>
                                                <div className="text-muted">
                                                    <i className="bi bi-clock me-1"></i>
                                                    {selectedCell.cell.subjectMetadata?.time || 
                                                     formatTimestamp(selectedCell.cell.record.recordedAt || 
                                                                   selectedCell.cell.record.timestamp ||
                                                                   selectedCell.cell.subjectMetadata?.createdAt)}
                                                </div>
                                            </div>
                                            <div className="col-6">
                                                <strong>Taken by:</strong>
                                                <div className="text-muted">
                                                    <i className="bi bi-person me-1"></i>
                                                    {selectedCell.cell.subjectMetadata?.takenBy || 
                                                     selectedCell.cell.record.recordedBy ||
                                                     selectedCell.cell.record.teacherName ||
                                                     'Unknown'}
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

                                        {/* Additional metadata if available */}
                                        {(selectedCell.cell.record.recordedAt || selectedCell.cell.record.lastModified) && (
                                            <div className="mt-3">
                                                <small className="text-muted">
                                                    <i className="bi bi-info-circle me-1"></i>
                                                    Last updated: {formatTimestamp(selectedCell.cell.record.lastModified || selectedCell.cell.record.recordedAt)}
                                                </small>
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