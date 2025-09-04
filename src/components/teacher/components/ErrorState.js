// src/components/teacher/components/ErrorState.js
import React from 'react';

const ErrorState = ({ error, onClose, onDebug }) => {
    return (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-lg">
                <div className="modal-content">
                    <div className="modal-header bg-danger text-white">
                        <h5 className="modal-title">
                            <i className="bi bi-exclamation-triangle me-2"></i>
                            Student Loading Error
                        </h5>
                        <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
                    </div>
                    <div className="modal-body">
                        <div className="alert alert-danger border-0 mb-3">
                            <h6><i className="bi bi-x-circle me-2"></i>Problem Detected</h6>
                            <p className="mb-0">{error}</p>
                        </div>
                        <div className="d-flex gap-2">
                            <button className="btn btn-warning" onClick={onDebug}>
                                <i className="bi bi-bug me-2"></i>Debug Tool
                            </button>
                            <button className="btn btn-secondary" onClick={onClose}>Close</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ErrorState;