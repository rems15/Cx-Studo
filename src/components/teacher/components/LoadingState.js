// src/components/teacher/components/LoadingState.js
import React from 'react';

const LoadingState = ({ section }) => {
    return (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-fullscreen-sm-down modal-lg">
                <div className="modal-content">
                    <div className="modal-body text-center py-5">
                        <div className="spinner-border text-primary mb-3"></div>
                        <h5>Loading Students...</h5>
                        <p className="text-muted">Setting up attendance for {section.subject || 'Homeroom'}...</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoadingState;