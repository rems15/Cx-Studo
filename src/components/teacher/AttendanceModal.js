// src/components/teacher/AttendanceModal.js - FIXED BEHAVIOR FLAGS
import React, { useState } from 'react';
import { useAttendanceData } from './hooks/useAttendanceData';
import { useAttendanceState } from './hooks/useAttendanceState';
import { getAttendanceConfig, formatLongDate } from './utils/attendanceHelpers';
import AttendanceHeader from './components/AttendanceHeader';
import AttendanceStats from './components/AttendanceStats';
import BulkActions from './components/BulkActions';
import FilterPanel from './components/FilterPanel';
import StudentAttendanceList from './components/StudentAttendanceList';
import HomeroomStatusBanner from './components/HomeroomStatusBanner';
import EnrollmentDebugModal from './debug/EnrollmentDebugModal';
import LoadingState from './components/LoadingState';
import ErrorState from './components/ErrorState';
import EmptyState from './components/EmptyState';

const AttendanceModal = ({
    section,
    attendanceData,
    setAttendanceData,
    currentUser,
    onClose,
    subjectColors = {},
    isFirebaseVersion = true
}) => {
    // Debug state
    const [showDebugModal, setShowDebugModal] = useState(false);
    
    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [homeroomFilter, setHomeroomFilter] = useState('all');
    const [gradeFilter, setGradeFilter] = useState('all');
    const [sortBy, setSortBy] = useState('name');
    const [viewMode, setViewMode] = useState('compact');

    // HOOKS
    const {
        students,
        homeroomData,
        loading,
        error,
        saveAttendance,
        getDebugInfo
    } = useAttendanceData(section, currentUser, isFirebaseVersion);

    const {
        attendanceRecords,
        setAttendanceRecords,
        saving,
        setSaving,
        filteredStudents
    } = useAttendanceState(students, homeroomData, {
        searchTerm,
        statusFilter,
        homeroomFilter,
        gradeFilter,
        sortBy
    });

    // CONFIG
    const config = getAttendanceConfig(section, subjectColors);
    const currentDate = formatLongDate(new Date());

    // ✅ FIXED: Status change handler
const handleStatusChange = (studentId, status) => {
    console.log(`📝 Status change: ${studentId} → ${status}`);
    
    // Validate inputs
    if (!studentId) {
        console.error('❌ Invalid studentId:', studentId);
        return;
    }
    
    if (!['present', 'absent', 'late', 'excused'].includes(status)) {
        console.error('❌ Invalid status:', status);
        return;
    }
    
    setAttendanceRecords(prev => {
        const updated = {
            ...prev,
            [studentId]: { 
                ...prev[studentId], 
                status: status,
                // Preserve existing data
                notes: prev[studentId]?.notes || '',
                hasBehaviorIssue: prev[studentId]?.hasBehaviorIssue || false,
                timestamp: new Date().toISOString()
            }
        };
        
        console.log(`✅ Updated record for ${studentId}:`, updated[studentId]);
        return updated;
    });
};

const handleBulkUpdate = (newAttendanceRecords) => {
    console.log('📝 Bulk updating attendance records:', newAttendanceRecords);
    setAttendanceRecords(newAttendanceRecords);
};

    // ✅ FIXED: Notes change handler
    const handleNotesChange = (studentId, notes) => {
        console.log(`📝 Notes change: ${studentId} → ${notes}`);
        setAttendanceRecords(prev => ({
            ...prev,
            [studentId]: { 
                ...prev[studentId], 
                notes: notes 
            }
        }));
    };

    // ✅ FIXED: Behavior change handler with debugging
    const handleBehaviorChange = (studentId, hasBehaviorIssue) => {
        console.log(`🚩 BEHAVIOR FLAG CHANGE: Student ${studentId} → ${hasBehaviorIssue ? 'FLAGGED' : 'CLEARED'}`);
        
        setAttendanceRecords(prev => {
            const updatedRecords = {
                ...prev,
                [studentId]: { 
                    ...prev[studentId], 
                    hasBehaviorIssue: hasBehaviorIssue  // ✅ This is the key field!
                }
            };
            
            // Debug log the updated record
            console.log(`📋 Updated record for ${studentId}:`, updatedRecords[studentId]);
            
            return updatedRecords;
        });
    };

    const handleMeritChange = (studentId, hasMerit) => {
    setAttendanceRecords(prev => ({
        ...prev,
        [studentId]: { 
            ...prev[studentId], 
            hasMerit: hasMerit  // ✅ Add merit field
                }
            }));
        };

    // ✅ ENHANCED: Save handler with behavior flag logging
    const handleSave = async () => {
        try {
            setSaving(true);
            
            // Debug: Log all behavior flags before saving
            console.group('💾 SAVING ATTENDANCE WITH BEHAVIOR FLAGS');
            console.log('All attendance records:', attendanceRecords);
            
            const studentsWithFlags = Object.entries(attendanceRecords)
                .filter(([_, record]) => record.hasBehaviorIssue === true)
                .map(([studentId, record]) => {
                    const student = students.find(s => s.id === studentId);
                    return {
                        studentId,
                        studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
                        record
                    };
                });
            
            if (studentsWithFlags.length > 0) {
                console.log('🚩 Students with behavior flags to save:', studentsWithFlags);
            } else {
                console.log('ℹ️ No behavior flags to save');
            }
            console.groupEnd();
            
            // Save attendance
            await saveAttendance(attendanceRecords);
            
            // Update parent component data
            setAttendanceData(prev => ({ ...prev, [section.sectionId]: attendanceRecords }));
            
            console.log('✅ Attendance saved successfully!');
            onClose();
            
        } catch (err) {
            console.error('❌ Save failed:', err);
            alert(`Failed to save attendance: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleDebugClick = () => {
        console.log('Debug Info:', getDebugInfo());
        setShowDebugModal(true);
    };

    // Filter props
    const filterProps = {
        searchTerm, setSearchTerm,
        statusFilter, setStatusFilter,
        homeroomFilter, setHomeroomFilter,
        gradeFilter, setGradeFilter,
        sortBy, setSortBy,
        viewMode, setViewMode,
        students,
        filteredStudents,
        homeroomData
    };

    // RENDER STATES
    if (loading) {
        return <LoadingState section={section} />;
    }

    if (error) {
        return (
            <ErrorState 
                error={error} 
                onClose={onClose} 
                onDebug={handleDebugClick}
            />
        );
    }

    // MAIN RENDER
    return (
        <>
            <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <div className="modal-dialog modal-fullscreen-sm-down modal-xl">
                    <div className="modal-content">
                        <AttendanceHeader 
                            config={config}
                            currentDate={currentDate}
                            studentsCount={students.length}
                            onClose={onClose}
                            onDebug={handleDebugClick}
                        />

                        <div className="modal-body p-0">
                            {students.length > 0 ? (
                                <>
                                    <HomeroomStatusBanner 
                                        section={section}
                                        homeroomData={homeroomData}
                                    />

                                    <div className="p-3">
                                        <AttendanceStats attendanceRecords={attendanceRecords} />
                                        
                                        <BulkActions 
                                            students={filteredStudents}
                                            attendanceRecords={attendanceRecords}
                                            onUpdateAttendance={handleBulkUpdate}
                                        />

                                        <FilterPanel {...filterProps} />

                                        {/* ✅ PASS ALL HANDLERS INCLUDING BEHAVIOR */}
                                        <StudentAttendanceList
                                            students={filteredStudents}
                                            attendanceRecords={attendanceRecords}
                                            onStatusChange={handleStatusChange}
                                            onNotesChange={handleNotesChange}
                                            onBehaviorChange={handleBehaviorChange}  // ✅ KEY: This must be passed!
                                            onMeritChange={handleMeritChange}
                                            homeroomData={homeroomData}
                                            isHomeroom={section.isHomeroom}
                                            viewMode={viewMode}
                                        />
                                    </div>
                                </>
                            ) : (
                                <EmptyState 
                                    section={section}
                                    onDebug={handleDebugClick}
                                />
                            )}
                        </div>

                        {/* FOOTER */}
                        <div className="modal-footer py-2">
                            <div className="me-auto">
                                <small className="text-muted">
                                    {filteredStudents.length !== students.length ? (
                                        <>Filtered: {filteredStudents.length} / {students.length}</>
                                    ) : (
                                        <>Students: {students.length}</>
                                    )}
                                    {section.studentCount && section.studentCount !== students.length && (
                                        <span className="text-warning ms-1">
                                            (Expected: {section.studentCount})
                                        </span>
                                    )}
                                    {/* ✅ SHOW BEHAVIOR FLAG COUNT */}
                                    {Object.values(attendanceRecords).filter(r => r.hasBehaviorIssue).length > 0 && (
                                        <span className="text-danger ms-2">
                                            🚩 {Object.values(attendanceRecords).filter(r => r.hasBehaviorIssue).length} flagged
                                        </span>
                                    )}
                                </small>
                            </div>
                            <button className="btn btn-secondary" onClick={onClose} disabled={saving}>
                                Cancel
                            </button>
                            <button 
                                className="btn btn-primary" 
                                onClick={handleSave}
                                disabled={saving || students.length === 0}
                            >
                                {saving ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2"></span>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-check-circle me-2"></i>
                                        Save Attendance
                                        {/* ✅ SHOW FLAG COUNT ON SAVE BUTTON */}
                                        {Object.values(attendanceRecords).filter(r => r.hasBehaviorIssue).length > 0 && (
                                            <span className="badge bg-warning text-dark ms-2">
                                                🚩 {Object.values(attendanceRecords).filter(r => r.hasBehaviorIssue).length}
                                            </span>
                                        )}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Debug Modal */}
            {showDebugModal && (
                <EnrollmentDebugModal 
                    section={section}
                    onClose={() => setShowDebugModal(false)}
                />
            )}
        </>
    );
};

export default AttendanceModal;