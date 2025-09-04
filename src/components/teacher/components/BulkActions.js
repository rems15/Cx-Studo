// src/components/teacher/components/BulkActions.js
import React from 'react';

const BulkActions = ({ students, onMarkAll, attendanceRecords }) => {
    const handleMarkAll = (status) => {
        students.forEach(student => {
            onMarkAll(student.id, status);
        });
    };

    const getCurrentCounts = () => {
        const counts = { present: 0, absent: 0, late: 0, excused: 0 };
        
        Object.values(attendanceRecords).forEach(record => {
            if (record.status && counts.hasOwnProperty(record.status)) {
                counts[record.status]++;
            }
        });
        
        return counts;
    };

    const counts = getCurrentCounts();

    return (
        <div className="bulk-actions mb-3">
            <div className="card border-0 bg-light">
                <div className="card-body p-3">
                    <h6 className="card-title mb-2">
                        <i className="bi bi-lightning me-2"></i>
                        Quick Actions
                    </h6>
                    
                    <div className="d-flex gap-2 flex-wrap">
                        <button 
                            className="btn btn-success btn-sm"
                            onClick={() => handleMarkAll('present')}
                            disabled={students.length === 0}
                        >
                            <i className="bi bi-check-circle me-1"></i>
                            Mark All Present
                            {counts.present > 0 && (
                                <span className="badge bg-light text-success ms-1">{counts.present}</span>
                            )}
                        </button>
                        
                        <button 
                            className="btn btn-danger btn-sm"
                            onClick={() => handleMarkAll('absent')}
                            disabled={students.length === 0}
                        >
                            <i className="bi bi-x-circle me-1"></i>
                            Mark All Absent
                            {counts.absent > 0 && (
                                <span className="badge bg-light text-danger ms-1">{counts.absent}</span>
                            )}
                        </button>
                        
                        <button 
                            className="btn btn-warning btn-sm"
                            onClick={() => handleMarkAll('late')}
                            disabled={students.length === 0}
                        >
                            <i className="bi bi-clock me-1"></i>
                            Mark All Late
                            {counts.late > 0 && (
                                <span className="badge bg-light text-warning ms-1">{counts.late}</span>
                            )}
                        </button>
                        
                        <button 
                            className="btn btn-info btn-sm"
                            onClick={() => handleMarkAll('excused')}
                            disabled={students.length === 0}
                        >
                            <i className="bi bi-shield-check me-1"></i>
                            Mark All Excused
                            {counts.excused > 0 && (
                                <span className="badge bg-light text-info ms-1">{counts.excused}</span>
                            )}
                        </button>
                    </div>
                    
                    <small className="text-muted mt-2 d-block">
                        <i className="bi bi-info-circle me-1"></i>
                        Total students: {students.length}
                    </small>
                </div>
            </div>
        </div>
    );
};

export default BulkActions;