// src/hooks/useAttendanceState.js - FIXED VERSION
// ✅ REMOVED homeroom data inheritance for subject teachers
// Subject teachers should start with BLANK attendance

import { useState, useEffect, useMemo } from 'react';

export const useAttendanceState = (students, homeroomData, filters = {}) => {
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [saving, setSaving] = useState(false);

  // Ensure students is always an array
  const safeStudents = Array.isArray(students) ? students : [];

  // Initialize attendance records when students change
  useEffect(() => {
    if (safeStudents.length > 0) {
      initializeAttendanceRecords();
    }
  }, [safeStudents]); // ✅ REMOVED homeroomData dependency

  // ✅ FIXED: Always start with blank data - no homeroom inheritance
  const initializeAttendanceRecords = () => {
   
    
    const initialRecords = {};
    
    safeStudents.forEach(student => {
      // ✅ ALWAYS START BLANK - No inheritance from homeroom
      initialRecords[student.id] = {
        status: 'present',           // ✅ Default status
        notes: '',                   // ✅ Blank notes  
        hasBehaviorIssue: false,     // ✅ No behavior flags
        hasMerit: false,             // ✅ No merit by default
        timestamp: new Date().toISOString()
      };
    });
    

    
    setAttendanceRecords(initialRecords);
  };

  // Status change handler
  const handleStatusChange = (studentId, status) => {
   
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: { 
        ...prev[studentId], 
        status: status,
        lastModified: new Date().toISOString()
      }
    }));
  };

  // Notes change handler
  const handleNotesChange = (studentId, notes) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: { 
        ...prev[studentId], 
        notes: notes,
        lastModified: new Date().toISOString()
      }
    }));
  };

  // Behavior flag change handler
  const handleBehaviorChange = (studentId, hasBehaviorIssue) => {
    
    setAttendanceRecords(prev => {
      const updatedRecords = {
        ...prev,
        [studentId]: { 
          ...prev[studentId], 
          hasBehaviorIssue: hasBehaviorIssue,
          lastModified: new Date().toISOString()
        }
      };
      
      // Debug log the updated record
      
      return updatedRecords;
    });
  };

  // Filter students based on current filters
  const filteredStudents = useMemo(() => {
    let filtered = safeStudents;

    // Search term filter
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(student =>
        `${student.firstName} ${student.lastName}`.toLowerCase().includes(term) ||
        student.studentId?.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (filters.statusFilter && filters.statusFilter !== 'all') {
      filtered = filtered.filter(student => {
        const record = attendanceRecords[student.id];
        return record?.status === filters.statusFilter;
      });
    }

    // Grade filter
    if (filters.gradeFilter && filters.gradeFilter !== 'all') {
      filtered = filtered.filter(student => 
        student.gradeLevel?.toString() === filters.gradeFilter
      );
    }

    // Sort students
    if (filters.sortBy) {
      filtered.sort((a, b) => {
        switch (filters.sortBy) {
          case 'name':
            return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
          case 'grade':
            return (a.gradeLevel || 0) - (b.gradeLevel || 0);
          case 'section':
            return (a.sectionName || a.section || '').localeCompare(b.sectionName || b.section || '');
          default:
            return 0;
        }
      });
    }

    return filtered;
  }, [safeStudents, attendanceRecords, filters]);

  // Memoized statistics
  const stats = useMemo(() => {
    const records = Object.values(attendanceRecords);
    return {
      total: records.length,
      present: records.filter(r => r.status === 'present').length,
      absent: records.filter(r => r.status === 'absent').length,
      late: records.filter(r => r.status === 'late').length,
      excused: records.filter(r => r.status === 'excused').length,
      withNotes: records.filter(r => r.notes && r.notes.trim()).length,
      withFlags: records.filter(r => r.hasBehaviorIssue).length
    };
  }, [attendanceRecords]);

  return {
    attendanceRecords,
    setAttendanceRecords,
    handleStatusChange,
    handleNotesChange,
    handleBehaviorChange,
    filteredStudents,
    saving,
    setSaving,
    stats
  };
};