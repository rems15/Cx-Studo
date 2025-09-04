// src/components/teacher/components/HomeroomStatusBanner.js
import React from 'react';

const HomeroomStatusBanner = ({ section, homeroomData }) => {
    // Don't show banner for homeroom sections or when no homeroom data
    if (section.isHomeroom || !homeroomData) return null;

    const presentCount = homeroomData.students?.filter(s => s.status === 'present').length || 0;
    const absentCount = homeroomData.students?.filter(s => s.status === 'absent').length || 0;
    const lateCount = homeroomData.students?.filter(s => s.status === 'late').length || 0;
    const excusedCount = homeroomData.students?.filter(s => s.status === 'excused').length || 0;

    return (
        <div className="alert alert-info border-0 rounded-0 mb-0">
            <div className="d-flex align-items-center">
                <i className="bi bi-info-circle me-2"></i>
                <div className="flex-grow-1">
                    <strong>Homeroom Base Status Loaded</strong>
                    <div className="small">
                        Taken by {homeroomData.teacherName}. 
                        You can now update attendance for {section.subject}.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomeroomStatusBanner;