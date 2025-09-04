// src/components/teacher/components/AttendanceStats.js
import React from 'react';

const AttendanceStats = ({ attendanceRecords }) => {
    const calculateStats = () => {
        const stats = {
            present: 0,
            absent: 0,
            late: 0,
            excused: 0,
            total: Object.keys(attendanceRecords).length
        };

        Object.values(attendanceRecords).forEach(record => {
            if (record.status && stats.hasOwnProperty(record.status)) {
                stats[record.status]++;
            }
        });

        stats.attendanceRate = stats.total > 0 ? 
            Math.round(((stats.present + stats.late) / stats.total) * 100) : 0;

        return stats;
    };

    const stats = calculateStats();

    if (stats.total === 0) {
        return null;
    }

    return (
        <div className="attendance-stats mb-3">
            <div className="card border-0 bg-light">
                <div className="card-body p-3">
                    <h6 className="card-title mb-2">
                        <i className="bi bi-bar-chart me-2"></i>
                        Attendance Summary
                    </h6>
                    
                    <div className="row text-center g-1">
                        <div className="col">
                            <div className="h5 mb-0 text-success">{stats.present}</div>
                            <small className="text-muted">Present</small>
                        </div>
                        <div className="col">
                            <div className="h5 mb-0 text-danger">{stats.absent}</div>
                            <small className="text-muted">Absent</small>
                        </div>
                        <div className="col">
                            <div className="h5 mb-0 text-warning">{stats.late}</div>
                            <small className="text-muted">Late</small>
                        </div>
                        <div className="col">
                            <div className="h5 mb-0 text-info">{stats.excused}</div>
                            <small className="text-muted">Excused</small>
                        </div>
                        <div className="col">
                            <div className="h5 mb-0 text-primary">{stats.attendanceRate}%</div>
                            <small className="text-muted">Rate</small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AttendanceStats;