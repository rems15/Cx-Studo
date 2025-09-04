// src/components/teacher/components/StudentAttendanceList.js - WITH DEBUG LOGGING
import React, { useState } from 'react';
import { getHomeroomStatusBadge, getStatusOptions } from '../utils/attendanceHelpers';

const StudentAttendanceList = ({ 
    students, 
    attendanceRecords, 
    onStatusChange, 
    onNotesChange, 
    onBehaviorChange,
    homeroomData, 
    isHomeroom, 
    viewMode 
}) => {
    const [sortBy, setSortBy] = useState('name');
    const [sortDirection, setSortDirection] = useState('asc');

    const statusOptions = getStatusOptions();

    // Get homeroom status for a student
    const getHomeroomStatus = (student) => {
        if (!homeroomData?.students) return null;
        return homeroomData.students.find(s => 
            s.studentName === `${student.firstName} ${student.lastName}` ||
            s.studentId === student.id
        );
    };

    // Format grade and section
    const formatGradeSection = (student) => {
        const grade = student.gradeLevel || 'N/A';
        const section = student.section || student.sectionName || 'N/A';
        return `Grade ${grade} - ${section}`;
    };

    // Sort functionality
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

    // Sort students
    const sortedStudents = [...students].sort((a, b) => {
        let aValue, bValue;
        
        switch (sortBy) {
            case 'name':
                aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
                bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
                break;
            case 'gradeSection':
                aValue = `${a.gradeLevel || 0}-${a.section || a.sectionName || ''}`;
                bValue = `${b.gradeLevel || 0}-${b.section || b.sectionName || ''}`;
                break;
            case 'status':
                aValue = attendanceRecords[a.id]?.status || 'present';
                bValue = attendanceRecords[b.id]?.status || 'present';
                break;
            case 'homeroomStatus':
                const homeroomA = getHomeroomStatus(a);
                const homeroomB = getHomeroomStatus(b);
                aValue = homeroomA?.status || 'not-taken';
                bValue = homeroomB?.status || 'not-taken';
                break;
            default:
                return 0;
        }
        
        const comparison = aValue.toString().localeCompare(bValue.toString());
        return sortDirection === 'asc' ? comparison : -comparison;
    });

    // Status Buttons Component
    const StatusButtons = ({ studentId, currentStatus }) => {
        return (
            <div className="btn-group btn-group-sm" role="group">
                {statusOptions.map(option => (
                    <button
                        key={option.value}
                        type="button"
                        className={`btn ${currentStatus === option.value 
                            ? `btn-${option.color}` 
                            : `btn-outline-${option.color}`
                        }`}
                        onClick={() => onStatusChange(studentId, option.value)}
                        title={option.label}
                        style={{ minWidth: '32px' }}
                    >
                        {option.value.charAt(0).toUpperCase()}
                    </button>
                ))}
            </div>
        );
    };

    // Base Attendance (Homeroom) Status Display - Only for subject teachers
    const BaseAttendanceDisplay = ({ student }) => {
        const homeroomStatus = getHomeroomStatus(student);
        
        if (!homeroomStatus) {
            return (
                <div className="text-center">
                    <span className="badge bg-light text-muted">Not Taken</span>
                </div>
            );
        }

        const colors = {
            present: 'success',
            absent: 'danger', 
            late: 'warning',
            excused: 'info'
        };

        const color = colors[homeroomStatus.status] || 'secondary';

        return (
            <div className="text-center">
                <span className={`badge bg-${color}`}>
                    {homeroomStatus.status.charAt(0).toUpperCase() + homeroomStatus.status.slice(1)}
                </span>
                {homeroomStatus.notes && (
                    <div className="small text-muted mt-1" title={homeroomStatus.notes}>
                        <i className="bi bi-chat-text"></i>
                    </div>
                )}
            </div>
        );
    };

    if (students.length === 0) {
        return (
            <div className="text-center py-5">
                <i className="bi bi-people fs-1 text-muted d-block mb-3"></i>
                <h5 className="text-muted">No Students Found</h5>
                <p className="text-muted">
                    {isHomeroom 
                        ? "No students are enrolled in this homeroom section."
                        : "No students are enrolled in this subject."
                    }
                </p>
            </div>
        );
    }

    return (
        <div className="attendance-table">
            <div className="table-responsive">
                <table className="table table-sm table-hover">
                    <thead className="table-light sticky-top">
                        <tr>
                            <th style={{ width: '50px' }}>#</th>
                            <th 
                                style={{ cursor: 'pointer', minWidth: '200px' }}
                                onClick={() => handleSort('name')}
                            >
                                Student Name
                                <i className={`bi ${getSortIcon('name')} ms-2`}></i>
                            </th>
                            <th 
                                style={{ cursor: 'pointer', width: '160px' }}
                                onClick={() => handleSort('gradeSection')}
                            >
                                Grade & Section
                                <i className={`bi ${getSortIcon('gradeSection')} ms-2`}></i>
                            </th>
                            {/* Only show Base Attendance for subject teachers */}
                            {!isHomeroom && (
                                <th 
                                    style={{ cursor: 'pointer', width: '130px' }}
                                    onClick={() => handleSort('homeroomStatus')}
                                >
                                    Homeroom
                                    <i className={`bi ${getSortIcon('homeroomStatus')} ms-2`}></i>
                                </th>
                            )}
                            <th 
                                style={{ cursor: 'pointer', width: '200px' }}
                                onClick={() => handleSort('status')}
                            >
                                {isHomeroom ? 'Homeroom Status' : 'Subject Status'}
                                <i className={`bi ${getSortIcon('status')} ms-2`}></i>
                            </th>
                            <th style={{ minWidth: '250px' }}>Notes</th>
                            <th style={{ width: '80px', textAlign: 'center' }}>Behavior</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedStudents.map((student, index) => {
                            const record = attendanceRecords[student.id] || { 
                                status: 'present', 
                                notes: '', 
                                hasBehaviorIssue: false 
                            };
                            
                            return (
                                <tr 
                                    key={student.id}
                                    className={record.hasBehaviorIssue ? 'table-warning' : ''}
                                >
                                    <td className="text-center">
                                        <span className="badge bg-secondary">{index + 1}</span>
                                    </td>
                                    
                                    <td>
                                        <div className="d-flex align-items-center">
                                            <div>
                                                <div className="fw-medium">
                                                    {student.firstName} {student.lastName}
                                                    {record.hasBehaviorIssue && (
                                                        <i className="bi bi-flag-fill text-warning ms-2" 
                                                           title="Behavior issue flagged"></i>
                                                    )}
                                                </div>
                                                
                                            </div>
                                        </div>
                                    </td>
                                    
                                    <td>
                                        <span className="badge bg-light text-dark">
                                            {formatGradeSection(student)}
                                        </span>
                                    </td>
                                    
                                    {/* Only show Base Attendance column for subject teachers */}
                                    {!isHomeroom && (
                                        <td>
                                            <BaseAttendanceDisplay student={student} />
                                        </td>
                                    )}
                                    
                                    <td>
                                        <StatusButtons
                                            studentId={student.id}
                                            currentStatus={record.status}
                                        />
                                    </td>
                                    
                                    <td>
                                        <input
                                            type="text"
                                            className="form-control form-control-sm"
                                            placeholder={isHomeroom ? "Add homeroom notes..." : "Add subject notes..."}
                                            value={record.notes || ''}
                                            onChange={(e) => onNotesChange(student.id, e.target.value)}
                                            maxLength={500}
                                        />
                                    </td>
                                    
                                    {/* ✅ ENHANCED BEHAVIOR CHECKBOX WITH DEBUG LOGGING */}
                                    <td className="text-center">
                                        <div className="form-check d-flex justify-content-center">
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                checked={record.hasBehaviorIssue || false}
                                                onChange={(e) => {
                                                    const studentName = `${student.firstName} ${student.lastName}`;
                                                    const isChecked = e.target.checked;
                                                    
                                                    // ✅ DEBUG LOGGING
                                                    console.log(`🚩 BEHAVIOR CHECKBOX CLICKED:`);
                                                    console.log(`   Student: ${studentName}`);
                                                    console.log(`   ID: ${student.id}`);
                                                    console.log(`   Checked: ${isChecked}`);
                                                    console.log(`   Current record:`, record);
                                                    console.log(`   onBehaviorChange exists:`, !!onBehaviorChange);
                                                    
                                                    // Call the handler
                                                    if (onBehaviorChange) {
                                                        onBehaviorChange(student.id, isChecked);
                                                    } else {
                                                        console.error(`❌ onBehaviorChange handler is missing!`);
                                                    }
                                                }}
                                                title="Check if student has behavior issues"
                                            />
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            
            {/* Table Summary */}
            <div className="mt-2">
                <small className="text-muted">
                    Showing {sortedStudents.length} students • 
                    Sorted by {sortBy} ({sortDirection === 'asc' ? 'ascending' : 'descending'}) •
                    Click column headers to sort
                    {!isHomeroom && (
                        homeroomData ? (
                            <span className="text-success ms-2">• Base attendance loaded</span>
                        ) : (
                            <span className="text-warning ms-2">• Base attendance not available</span>
                        )
                    )}
                </small>
            </div>
        </div>
    );
};

export default StudentAttendanceList;