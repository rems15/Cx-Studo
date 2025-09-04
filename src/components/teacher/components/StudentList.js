// src/components/teacher/components/StudentList.js
import React from 'react';
import { getStatusButtonClass, getStatusIcon, formatStudentName } from '../utils/attendanceHelpers';

const StudentList = ({
    students,
    attendanceRecords,
    onStatusChange,
    onNotesChange,
    isHomeroom,
    homeroomData
}) => {
    const statusOptions = [
        { value: 'present', label: 'Present', icon: 'bi-check-circle' },
        { value: 'absent', label: 'Absent', icon: 'bi-x-circle' },
        { value: 'late', label: 'Late', icon: 'bi-clock' },
        { value: 'excused', label: 'Excused', icon: 'bi-shield-check' }
    ];

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
        <div className="student-list">
            {/* Info alerts */}
            {!isHomeroom && !homeroomData && (
                <div className="alert alert-warning border-0 py-2 mb-3">
                    <small>
                        Homeroom attendance hasn't been taken yet. Students will default to "Present" status.
                    </small>
                </div>
            )}

            {!isHomeroom && homeroomData && (
                <div className="alert alert-info border-0 py-2 mb-3">
                    <small>
                        Homeroom attendance loaded! Taken by {homeroomData.teacherName}. 
                        You can now update attendance status for your subject.
                    </small>
                </div>
            )}

            {/* Student list */}
            <div className="list-group">
                {students.map((student, index) => {
                    const record = attendanceRecords[student.id] || { status: 'present', notes: '' };
                    
                    return (
                        <div key={student.id} className="list-group-item">
                            <div className="d-flex align-items-start">
                                <div className="me-2 mt-1">
                                    <span className="badge bg-light text-dark">{index + 1}</span>
                                </div>
                                
                                <div className="flex-grow-1">
                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                        <div>
                                            <h6 className="mb-0">{formatStudentName(student)}</h6>
                                            <small className="text-muted">ID: {student.studentId || student.id}</small>
                                        </div>
                                        
                                        <div className="btn-group" role="group">
                                            {statusOptions.map(option => (
                                                <button
                                                    key={option.value}
                                                    type="button"
                                                    className={getStatusButtonClass(option.value, record.status)}
                                                    onClick={() => onStatusChange(student.id, option.value)}
                                                    title={option.label}
                                                >
                                                    <i className={`bi ${option.icon}`}></i>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    {/* Notes input */}
                                    <div className="mt-2">
                                        <input
                                            type="text"
                                            className="form-control form-control-sm"
                                            placeholder="Add notes (optional)..."
                                            value={record.notes || ''}
                                            onChange={(e) => onNotesChange(student.id, e.target.value)}
                                            maxLength={500}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default StudentList;