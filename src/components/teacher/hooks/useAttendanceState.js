// src/components/teacher/hooks/useAttendanceState.js - FIXED BEHAVIOR FLAGS
import { useState, useEffect, useMemo } from 'react';

export const useAttendanceState = (students, homeroomData, filters = {}) => {
    const [attendanceRecords, setAttendanceRecords] = useState({});
    const [notes, setNotes] = useState({});
    const [saving, setSaving] = useState(false);

    // Ensure students is always an array
    const safeStudents = Array.isArray(students) ? students : [];

    // Initialize attendance records when students or homeroom data changes
    useEffect(() => {
        if (safeStudents.length > 0) {
            initializeAttendanceRecords();
        }
    }, [safeStudents, homeroomData]);

    // ✅ ENHANCED: Initialize with behavior flag support
    const initializeAttendanceRecords = () => {
        const initialRecords = {};
        
        safeStudents.forEach(student => {
            // Default to homeroom status or 'present'
            let defaultStatus = 'present';
            let defaultNotes = '';
            let defaultBehaviorIssue = false; // ✅ NEW: Initialize behavior flag
            
            if (homeroomData && Array.isArray(homeroomData.students)) {
                const homeroomRecord = homeroomData.students.find(s => 
                    s.studentName === `${student.firstName} ${student.lastName}` ||
                    s.studentId === student.id
                );
                
                if (homeroomRecord) {
                    defaultStatus = homeroomRecord.status || 'present';
                    defaultNotes = homeroomRecord.notes || '';
                    
                    // ✅ NEW: Check multiple behavior flag fields
                    defaultBehaviorIssue = homeroomRecord.hasBehaviorIssue || 
                                          homeroomRecord.hasFlag || 
                                          homeroomRecord.behaviorFlag || 
                                          homeroomRecord.flagged || 
                                          false;
                                          
                    if (defaultBehaviorIssue) {
                        console.log(`🚩 Loading behavior flag for: ${student.firstName} ${student.lastName}`);
                    }
                }
            }
            
            initialRecords[student.id] = {
                status: defaultStatus,
                notes: defaultNotes,
                hasBehaviorIssue: defaultBehaviorIssue // ✅ NEW: Include behavior flag
            };
        });
        
        console.log('📋 Initialized attendance records with behavior flags:', initialRecords);
        setAttendanceRecords(initialRecords);
    };

    // Memoized filtered students to avoid unnecessary re-renders
    const filteredStudents = useMemo(() => {
        if (!Array.isArray(safeStudents) || safeStudents.length === 0) {
            return [];
        }

        let filtered = [...safeStudents];

        // Apply search filter
        if (filters.searchTerm) {
            const searchLower = filters.searchTerm.toLowerCase();
            filtered = filtered.filter(student => 
                `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchLower) ||
                (student.studentId && student.studentId.toString().includes(searchLower)) ||
                (student.id && student.id.toString().includes(searchLower))
            );
        }

        // Apply status filter
        if (filters.statusFilter && filters.statusFilter !== 'all') {
            filtered = filtered.filter(student => {
                const record = attendanceRecords[student.id];
                return record && record.status === filters.statusFilter;
            });
        }

        // ✅ NEW: Apply behavior filter
        if (filters.behaviorFilter && filters.behaviorFilter !== 'all') {
            filtered = filtered.filter(student => {
                const record = attendanceRecords[student.id];
                if (filters.behaviorFilter === 'flagged') {
                    return record && record.hasBehaviorIssue === true;
                } else if (filters.behaviorFilter === 'clean') {
                    return record && record.hasBehaviorIssue !== true;
                }
                return true;
            });
        }

        // Apply homeroom filter (for subject classes)
        if (filters.homeroomFilter && filters.homeroomFilter !== 'all' && homeroomData && Array.isArray(homeroomData.students)) {
            filtered = filtered.filter(student => {
                const homeroomRecord = homeroomData.students.find(s => 
                    s.studentName === `${student.firstName} ${student.lastName}` ||
                    s.studentId === student.id
                );
                
                if (filters.homeroomFilter === 'present') {
                    return homeroomRecord && homeroomRecord.status === 'present';
                } else if (filters.homeroomFilter === 'absent') {
                    return homeroomRecord && homeroomRecord.status === 'absent';
                } else if (filters.homeroomFilter === 'late') {
                    return homeroomRecord && homeroomRecord.status === 'late';
                } else if (filters.homeroomFilter === 'excused') {
                    return homeroomRecord && homeroomRecord.status === 'excused';
                }
                
                return true;
            });
        }

        // Apply grade filter
        if (filters.gradeFilter && filters.gradeFilter !== 'all') {
            filtered = filtered.filter(student => 
                student.gradeLevel && student.gradeLevel.toString() === filters.gradeFilter
            );
        }

        // Apply sorting
        if (filters.sortBy) {
            filtered.sort((a, b) => {
                switch (filters.sortBy) {
                    case 'name':
                        const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
                        const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
                        return nameA.localeCompare(nameB);
                    
                    case 'status':
                        const recordA = attendanceRecords[a.id];
                        const recordB = attendanceRecords[b.id];
                        const statusA = recordA ? recordA.status : 'present';
                        const statusB = recordB ? recordB.status : 'present';
                        return statusA.localeCompare(statusB);
                    
                    case 'grade':
                        return (a.gradeLevel || 0) - (b.gradeLevel || 0);
                    
                    case 'section':
                        const sectionA = a.section || a.sectionName || '';
                        const sectionB = b.section || b.sectionName || '';
                        return sectionA.localeCompare(sectionB);
                    
                    // ✅ NEW: Sort by behavior flag
                    case 'behavior':
                        const behaviorA = attendanceRecords[a.id]?.hasBehaviorIssue || false;
                        const behaviorB = attendanceRecords[b.id]?.hasBehaviorIssue || false;
                        return behaviorB - behaviorA; // Flagged students first
                    
                    default:
                        return 0;
                }
            });
        }

        return filtered;
    }, [safeStudents, attendanceRecords, filters, homeroomData]);

    const bulkMarkAll = (status) => {
        if (!Array.isArray(safeStudents)) return;
        
        const newRecords = { ...attendanceRecords };
        safeStudents.forEach(student => {
            if (student && student.id) {
                newRecords[student.id] = {
                    ...(newRecords[student.id] || {}),
                    status: status
                };
            }
        });
        setAttendanceRecords(newRecords);
    };

    // ✅ NEW: Bulk behavior actions
    const bulkSetBehaviorFlag = (hasBehaviorIssue) => {
        if (!Array.isArray(safeStudents)) return;
        
        const newRecords = { ...attendanceRecords };
        safeStudents.forEach(student => {
            if (student && student.id) {
                newRecords[student.id] = {
                    ...(newRecords[student.id] || {}),
                    hasBehaviorIssue: hasBehaviorIssue
                };
            }
        });
        setAttendanceRecords(newRecords);
        
        console.log(`🚩 Bulk ${hasBehaviorIssue ? 'set' : 'cleared'} behavior flags for all students`);
    };

    // ✅ ENHANCED: Include behavior stats
    const getAttendanceStats = () => {
        const stats = {
            present: 0,
            absent: 0,
            late: 0,
            excused: 0,
            behaviorFlagged: 0, // ✅ NEW: Behavior flag count
            total: safeStudents.length
        };

        Object.values(attendanceRecords || {}).forEach(record => {
            if (record && record.status && stats.hasOwnProperty(record.status)) {
                stats[record.status]++;
            }
            
            // ✅ NEW: Count behavior flags
            if (record && record.hasBehaviorIssue === true) {
                stats.behaviorFlagged++;
            }
        });

        stats.attendanceRate = stats.total > 0 ? 
            Math.round(((stats.present + stats.late) / stats.total) * 100) : 0;

        return stats;
    };

    // Debug function
    const getDebugInfo = () => {
        const behaviorFlaggedStudents = Object.entries(attendanceRecords || {})
            .filter(([_, record]) => record.hasBehaviorIssue === true)
            .map(([studentId, _]) => {
                const student = safeStudents.find(s => s.id === studentId);
                return student ? `${student.firstName} ${student.lastName}` : studentId;
            });

        return {
            studentsCount: safeStudents.length,
            filteredCount: filteredStudents.length,
            attendanceRecordsCount: Object.keys(attendanceRecords || {}).length,
            hasHomeroomData: !!homeroomData,
            filters: filters,
            currentRecords: attendanceRecords,
            behaviorFlaggedStudents: behaviorFlaggedStudents, // ✅ NEW: Debug info
            behaviorFlagCount: behaviorFlaggedStudents.length
        };
    };

    return {
        attendanceRecords: attendanceRecords || {},
        setAttendanceRecords,
        notes: notes || {},
        setNotes,
        saving: saving || false,
        setSaving,
        filteredStudents: filteredStudents || [],
        bulkMarkAll,
        bulkSetBehaviorFlag, // ✅ NEW: Bulk behavior actions
        getAttendanceStats,
        getDebugInfo
    };
};