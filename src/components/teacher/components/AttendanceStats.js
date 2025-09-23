// src/components/teacher/components/AttendanceStats.js - FIXED VERSION
import React from 'react';

const AttendanceStats = ({ attendanceRecords, students = [] }) => {
    console.log('🔍 AttendanceStats Debug:', {
        attendanceRecords,
        attendanceRecordsType: typeof attendanceRecords,
        attendanceRecordsKeys: attendanceRecords ? Object.keys(attendanceRecords) : [],
        studentsCount: students.length
    });

    const calculateStats = () => {
        const stats = {
            present: 0,
            absent: 0,
            late: 0,
            excused: 0,
            total: 0
        };

        // ✅ FIXED: Handle empty or undefined attendanceRecords
        if (!attendanceRecords) {
            console.warn('⚠️ No attendanceRecords provided');
            return stats;
        }

        // ✅ FIXED: Handle different data structures
        let records = [];
        
        if (Array.isArray(attendanceRecords)) {
            // If it's already an array
            records = attendanceRecords;
            stats.total = records.length;
        } else if (attendanceRecords && typeof attendanceRecords === 'object') {
            // If it's an object of records
            records = Object.values(attendanceRecords);
            stats.total = Object.keys(attendanceRecords).length;
        } else {
            console.warn('⚠️ Invalid attendanceRecords format:', attendanceRecords);
            return stats;
        }

        console.log('📊 Processing records:', records.length, records);

        // ✅ FIXED: More robust status counting with validation
        records.forEach((record, index) => {
            console.log(`Record ${index}:`, record);
            
            if (record && record.status) {
                const status = record.status.toLowerCase().trim();
                console.log(`Status found: "${status}"`);
                
                // Count each status
                switch (status) {
                    case 'present':
                        stats.present++;
                        break;
                    case 'absent':
                        stats.absent++;
                        break;
                    case 'late':
                        stats.late++;
                        break;
                    case 'excused':
                        stats.excused++;
                        break;
                    default:
                        console.warn(`Unknown status: "${status}"`);
                }
            } else {
                console.warn('Record missing status:', record);
            }
        });

        // ✅ FALLBACK: If no records but we have students, show message
        if (stats.total === 0 && students.length > 0) {
            console.log('📊 No attendance records found, but students exist:', students.length);
            stats.total = students.length;
            // Don't default to present - let it show 0s to indicate attendance not taken
        }

        // Calculate attendance rate
        const attendedCount = stats.present + stats.late;
        stats.attendanceRate = stats.total > 0 ? 
            Math.round((attendedCount / stats.total) * 100) : 0;

        console.log('📈 Final calculated stats:', stats);
        return stats;
    };

    const stats = calculateStats();

    // ✅ FIXED: Always show component but with different messages
    if (stats.total === 0) {
        return (
            <div className="attendance-stats mb-3">
                <div className="card border-0 bg-warning bg-opacity-10">
                    <div className="card-body p-3">
                        <h6 className="card-title mb-2 text-warning">
                            <i className="bi bi-exclamation-triangle me-2"></i>
                            No Attendance Data
                        </h6>
                        <small className="text-muted">
                            {students.length > 0 
                                ? `${students.length} students enrolled - attendance not taken yet`
                                : 'No students or attendance records found'
                            }
                        </small>
                    </div>
                </div>
            </div>
        );
    }

    // ✅ Check if all stats are zero (attendance taken but all students marked as something else)
    const totalMarked = stats.present + stats.absent + stats.late + stats.excused;
    
    return (
        <div className="attendance-stats mb-3">
            <div className="card border-0 bg-light">
                <div className="card-body p-3">
                    <h6 className="card-title mb-2">
                        <i className="bi bi-bar-chart me-2"></i>
                        Attendance Summary
                        <small className="text-muted ms-2">
                            ({stats.total} total • {totalMarked} marked)
                        </small>
                    </h6>
                    
                    {/* ✅ Show warning if numbers don't add up */}
                    {totalMarked !== stats.total && totalMarked > 0 && (
                        <div className="alert alert-warning py-1 px-2 mb-2" role="alert">
                            <small>
                                <i className="bi bi-exclamation-triangle me-1"></i>
                                Data mismatch: {totalMarked} students marked, {stats.total} expected
                            </small>
                        </div>
                    )}
                    
                    <div className="row text-center g-1">
                        <div className="col">
                            <div className={`h5 mb-0 ${stats.present > 0 ? 'text-success' : 'text-muted'}`}>
                                {stats.present}
                            </div>
                            <small className="text-muted">Present</small>
                        </div>
                        <div className="col">
                            <div className={`h5 mb-0 ${stats.absent > 0 ? 'text-danger' : 'text-muted'}`}>
                                {stats.absent}
                            </div>
                            <small className="text-muted">Absent</small>
                        </div>
                        <div className="col">
                            <div className={`h5 mb-0 ${stats.late > 0 ? 'text-warning' : 'text-muted'}`}>
                                {stats.late}
                            </div>
                            <small className="text-muted">Late</small>
                        </div>
                        <div className="col">
                            <div className={`h5 mb-0 ${stats.excused > 0 ? 'text-info' : 'text-muted'}`}>
                                {stats.excused}
                            </div>
                            <small className="text-muted">Excused</small>
                        </div>
                        <div className="col">
                            <div className="h5 mb-0 text-primary">{stats.attendanceRate}%</div>
                            <small className="text-muted">Rate</small>
                        </div>
                    </div>

                    {/* ✅ DEBUG INFO (remove in production) */}
                    {process.env.NODE_ENV === 'development' && (
                        <details className="mt-2">
                            <summary className="small text-muted">Debug Info</summary>
                            <pre className="small mt-1 bg-light p-1" style={{fontSize: '10px'}}>
                                {JSON.stringify({
                                    attendanceRecordsType: typeof attendanceRecords,
                                    recordsCount: attendanceRecords ? Object.keys(attendanceRecords).length : 0,
                                    studentsCount: students.length,
                                    calculatedStats: stats,
                                    totalMarked,
                                    firstRecord: attendanceRecords ? Object.values(attendanceRecords)[0] : null
                                }, null, 2)}
                            </pre>
                        </details>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AttendanceStats;