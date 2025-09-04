// src/components/teacher/components/AttendanceHeader.js
import React from 'react';

const AttendanceHeader = ({ 
    config, 
    currentDate, 
    studentsCount, 
    onClose, 
    onDebug 
}) => {
    return (
        <div className="modal-header py-2 text-white" style={{ background: config.headerColor }}>
            <div className="flex-grow-1">
                <h6 className="modal-title mb-0">
                    <i className={`bi ${config.icon} me-2`}></i>
                    {config.title}
                </h6>
                <div className="d-flex align-items-center mt-1">
                    <small className="opacity-75 me-3">
                        {config.subtitle} • {currentDate}
                    </small>
                    {studentsCount === 0 && (
                        <button 
                            className="btn btn-warning btn-sm"
                            onClick={onDebug}
                            title="No students found - click to debug"
                        >
                            <i className="bi bi-bug me-1"></i>Debug
                        </button>
                    )}
                </div>
            </div>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
        </div>
    );
};

export default AttendanceHeader;