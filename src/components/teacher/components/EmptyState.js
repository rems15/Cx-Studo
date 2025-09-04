// src/components/teacher/components/EmptyState.js
import React from 'react';

const EmptyState = ({ section, onDebug }) => {
    return (
        <div className="p-4 text-center py-5">
            <i className="bi bi-people fs-1 text-muted d-block mb-3"></i>
            <h5 className="text-muted">No Students Found</h5>
            <p className="text-muted mb-4">
                {section.isHomeroom 
                    ? "No students are enrolled in this homeroom section."
                    : `No students are enrolled in ${section.subject}.`
                }
            </p>
            
            <div className="d-flex justify-content-center gap-2">
                <button className="btn btn-warning" onClick={onDebug}>
                    <i className="bi bi-bug me-2"></i>Debug This Issue
                </button>
            </div>
        </div>
    );
};

export default EmptyState;