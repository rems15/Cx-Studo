import React from 'react';

const BulkActions = ({ students, attendanceRecords, onUpdateAttendance }) => {
    // ✅ MINIMAL: Simple mark all function - no alerts, no loading states
    const markAllStudents = (status) => {
        if (!students || students.length === 0) return;
        
        // Create new attendance records for all students
        const newRecords = { ...attendanceRecords };
        
        students.forEach(student => {
            newRecords[student.id] = {
                ...newRecords[student.id], // Keep existing data
                status: status,            // Update status
                timestamp: new Date().toISOString()
            };
        });

        // Update the attendance records
        onUpdateAttendance(newRecords);
    };

    // Count current statuses
    const counts = {
        present: 0,
        absent: 0,
        late: 0,
        excused: 0
    };

    Object.values(attendanceRecords || {}).forEach(record => {
        if (record?.status && counts.hasOwnProperty(record.status)) {
            counts[record.status]++;
        }
    });

    return (
        <div className="mb-3">
            <div className="d-flex gap-2 flex-wrap">
                {/* Mark All Present */}
                <button 
                    className="btn btn-success btn-sm"
                    onClick={() => markAllStudents('present')}
                    disabled={!students?.length}
                >
                    ✓ Present
                    {counts.present > 0 && (
                        <span className="badge bg-light text-success ms-1">
                            {counts.present}
                        </span>
                    )}
                </button>

                {/* Mark All Absent */}
                <button 
                    className="btn btn-danger btn-sm"
                    onClick={() => markAllStudents('absent')}
                    disabled={!students?.length}
                >
                    ✗ Absent
                    {counts.absent > 0 && (
                        <span className="badge bg-light text-danger ms-1">
                            {counts.absent}
                        </span>
                    )}
                </button>

                {/* Mark All Late */}
                <button 
                    className="btn btn-warning btn-sm"
                    onClick={() => markAllStudents('late')}
                    disabled={!students?.length}
                >
                    ⏰ Late
                    {counts.late > 0 && (
                        <span className="badge bg-light text-warning ms-1">
                            {counts.late}
                        </span>
                    )}
                </button>

                {/* Mark All Excused */}
                <button 
                    className="btn btn-info btn-sm"
                    onClick={() => markAllStudents('excused')}
                    disabled={!students?.length}
                >
                    ⚪ Excused
                    {counts.excused > 0 && (
                        <span className="badge bg-light text-info ms-1">
                            {counts.excused}
                        </span>
                    )}
                </button>
            </div>

            {/* Minimal Status Display */}
            <small className="text-muted d-block mt-2">
                {students?.length || 0} students • 
                {counts.present} present • 
                {counts.absent} absent • 
                {counts.late} late • 
                {counts.excused} excused
            </small>
        </div>
    );
};

export default BulkActions;