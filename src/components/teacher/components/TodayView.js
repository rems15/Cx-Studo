// src/components/teacher/components/TodayView.js - Enhanced with Debug

import React from 'react';
import { calculateTodaysSummary, debugAttendanceData } from '../utils/monitorCalculations';

const TodayView = ({ subjects, attendanceData, monitorContext, focusSubjects, sectionData, subjectColors }) => {
    // 🔧 ENHANCED DEBUG - Step by step analysis
    console.group('🔍 TODAYVIEW ENHANCED DEBUG');
    
    // Step 1: Raw data inspection
    console.log('📊 Raw inputs:');
    console.log('  - attendanceData type:', typeof attendanceData);
    console.log('  - attendanceData keys:', Object.keys(attendanceData || {}));
    console.log('  - subjects count:', subjects?.length);
    console.log('  - subjects names:', subjects?.map(s => s.name));
    
    // Step 2: Detailed data structure analysis
    if (attendanceData) {
        Object.keys(attendanceData).forEach(key => {
            const data = attendanceData[key];
            console.log(`📈 "${key}":`, {
                type: Array.isArray(data) ? 'array' : typeof data,
                length: Array.isArray(data) ? data.length : 'N/A',
                sample: Array.isArray(data) && data.length > 0 ? data[0] : data
            });
            
            // Special check for Music
            if (key === 'Music' || key.toLowerCase().includes('music')) {
                console.log(`🎵 MUSIC DATA FOUND:`, data);
            }
        });
    }
    
    // Step 3: Run debug helper
    debugAttendanceData(attendanceData, subjects);
    
    // Step 4: Test direct access
    console.log('🔍 Direct access tests:');
    subjects?.forEach(subject => {
        const directAccess = attendanceData?.[subject.name];
        console.log(`  ${subject.name}: ${directAccess ? '✅ FOUND' : '❌ MISSING'} (${Array.isArray(directAccess) ? directAccess.length + ' items' : typeof directAccess})`);
    });
    
    console.groupEnd();
    
    // Calculate summary with enhanced debugging
    const summary = calculateTodaysSummary(subjects, attendanceData);
    
    // 🔧 POST-CALCULATION DEBUG
    console.group('📊 POST-CALCULATION ANALYSIS');
    summary.forEach(item => {
        console.log(`${item.subject}: ${item.status} (${item.totalTaken} students, ${item.attendanceRate}%)`);
        
        if (item.status === 'not-taken' && item.subject === 'Music') {
            console.error('🚨 MUSIC ISSUE: Status is "not-taken" but should have data!');
            console.log('🔍 Investigating Music data...');
            console.log('  - Raw Music data:', attendanceData?.Music);
            console.log('  - Music array check:', Array.isArray(attendanceData?.Music));
            console.log('  - Music length:', attendanceData?.Music?.length);
        }
    });
    console.groupEnd();
    
    return (
        <div className="today-view">
            {/* Debug Panel - Remove in production */}
            <div className="alert alert-info border-0 mb-3" style={{ fontSize: '12px' }}>
                <strong>Debug Info:</strong> 
                Data keys: [{Object.keys(attendanceData || {}).join(', ')}] | 
                Subjects: [{subjects?.map(s => s.name).join(', ')}]
                {summary.find(s => s.subject === 'Music') && (
                    <div>Music Status: {summary.find(s => s.subject === 'Music').status} ({summary.find(s => s.subject === 'Music').totalTaken} students)</div>
                )}
            </div>

            {monitorContext === 'subject' && (
                <div className="alert border-0 py-2 mb-3" style={{ 
                    background: `linear-gradient(135deg, ${focusSubjects[0] ? subjectColors[focusSubjects[0]]?.light || '#e7f1ff' : '#e7f1ff'} 0%, #ffffff 100%)`,
                    borderLeft: `4px solid ${focusSubjects[0] ? subjectColors[focusSubjects[0]]?.bg || '#007bff' : '#007bff'}`
                }}>
                    <small>
                        <strong>Subject Focus:</strong> Monitoring {focusSubjects.join(', ')} for this section
                        {sectionData.isMultiSection && (
                            <span className="text-info ms-1">
                                • Combined from {sectionData.sectionsInfo?.length} sections
                            </span>
                        )}
                    </small>
                </div>
            )}

            <div className="row g-2">
                {summary.map((subjectSummary, index) => (
                    <div key={index} className="col-md-6">
                        <div 
                            className={`card border-0 shadow-sm h-100 ${subjectSummary.status === 'not-taken' && subjectSummary.subject === 'Music' ? 'border-danger' : ''}`}
                            style={{ borderLeft: `4px solid ${subjectSummary.color}` }}
                        >
                            <div className="card-body p-3">
                                <div className="d-flex justify-content-between align-items-start mb-2">
                                    <div>
                                        <h6 className="card-title mb-1">
                                            <span 
                                                className="badge me-2"
                                                style={{ 
                                                    backgroundColor: subjectSummary.color,
                                                    color: 'white'
                                                }}
                                            >
                                                {subjectSummary.code}
                                            </span>
                                            {subjectSummary.subject}
                                            {/* Debug indicator */}
                                            {subjectSummary.status === 'not-taken' && subjectSummary.subject === 'Music' && (
                                                <span className="badge bg-danger ms-2">DEBUG</span>
                                            )}
                                        </h6>
                                        <small className="text-muted">
                                            {subjectSummary.status === 'taken' 
                                                ? `Updated by ${subjectSummary.takenBy} at ${subjectSummary.time}`
                                                : 'Not taken yet'
                                            }
                                        </small>
                                    </div>
                                    <span className={`badge ${subjectSummary.status === 'taken' ? 'bg-success' : 'bg-secondary'}`}>
                                        {subjectSummary.attendanceRate}%
                                    </span>
                                </div>
                                
                                {subjectSummary.status === 'taken' && (
                                    <div className="row text-center mt-2">
                                        <div className="col-3">
                                            <div className="h6 mb-0 text-success">{subjectSummary.presentCount}</div>
                                            <small className="text-muted">Present</small>
                                        </div>
                                        <div className="col-3">
                                            <div className="h6 mb-0 text-danger">{subjectSummary.absentCount}</div>
                                            <small className="text-muted">Absent</small>
                                        </div>
                                        <div className="col-3">
                                            <div className="h6 mb-0 text-warning">{subjectSummary.lateCount}</div>
                                            <small className="text-muted">Late</small>
                                        </div>
                                        <div className="col-3">
                                            <div className="h6 mb-0 text-info">{subjectSummary.excusedCount}</div>
                                            <small className="text-muted">Excused</small>
                                        </div>
                                    </div>
                                )}
                                
                                {/* Debug info for problematic subjects */}
                                {subjectSummary.status === 'not-taken' && subjectSummary.subject === 'Music' && (
                                    <div className="mt-2 p-2 bg-light rounded">
                                        <small>
                                            <strong>Debug:</strong> Raw data exists but not processed correctly.<br/>
                                            Check console for detailed analysis.
                                        </small>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TodayView;