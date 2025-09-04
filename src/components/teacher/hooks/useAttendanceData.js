// src/components/teacher/hooks/useAttendanceData.js
import { useState, useEffect } from 'react';
import { AttendanceDataService } from '../../../services/attendanceDataService';

/**
 * Enhanced useAttendanceData hook with better error handling and logging
 */
export const useAttendanceData = (section, currentUser, isFirebaseVersion = true) => {
  const [students, setStudents] = useState([]);
  const [homeroomData, setHomeroomData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Debug logging
  useEffect(() => {
    console.group('useAttendanceData - Section Data');
    console.log('Section:', section);
    console.log('Current User:', currentUser);
    console.log('Is Firebase Version:', isFirebaseVersion);
    console.groupEnd();
  }, [section, currentUser, isFirebaseVersion]);

  useEffect(() => {
    if (!section) {
      setLoading(false);
      setError('No section provided');
      return;
    }

    loadData();
  }, [section, currentUser]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Starting data load for section:', section.subject || section.name);

      // Use the enhanced service
      const result = await AttendanceDataService.loadAttendanceData(
        section, 
        currentUser, 
        isFirebaseVersion
      );

      console.log('Data load result:', {
        studentsCount: result.students.length,
        hasHomeroomData: !!result.homeroomData,
        hasError: !!result.error
      });

      // Set the data
      setStudents(result.students);
      setHomeroomData(result.homeroomData);
      
      if (result.error) {
        setError(result.error);
      }

      // Additional validation
      if (result.students.length === 0) {
        console.warn('No students loaded - checking section data...');
        
        // Try to provide helpful error message
        const sectionName = section.name || `${section.subject} - Grade ${section.gradeLevel}`;
        const expectedCount = section.studentCount || section.enrolledCount || 0;
        
        if (expectedCount > 0) {
          setError(
            `Expected ${expectedCount} students in ${sectionName}, but none were found. ` +
            'This usually means students are not properly enrolled in this subject. ' +
            'Please check with your administrator.'
          );
        } else {
          setError(`No students are enrolled in ${sectionName}.`);
        }
      }

    } catch (err) {
      console.error('Error in loadData:', err);
      setError(`Failed to load attendance data: ${err.message}`);
      setStudents([]);
      setHomeroomData(null);
    } finally {
      setLoading(false);
    }
  };

  const saveAttendance = async (attendanceRecords) => {
    try {
      console.log('Saving attendance records:', attendanceRecords);
      
      if (!attendanceRecords || Object.keys(attendanceRecords).length === 0) {
        throw new Error('No attendance records to save');
      }

      const result = await AttendanceDataService.saveAttendance(
        section, 
        attendanceRecords, 
        students, 
        currentUser
      );

      console.log('Save result:', result);
      return result;

    } catch (error) {
      console.error('Error saving attendance:', error);
      throw error;
    }
  };

  const refetch = () => {
    console.log('Refetching attendance data...');
    loadData();
  };

  // Helper function to get debug info
  const getDebugInfo = () => {
    return {
      sectionId: section?.sectionId || section?.id,
      subject: section?.subject,
      isHomeroom: section?.isHomeroom,
      studentsCount: students.length,
      expectedCount: section?.studentCount || section?.enrolledCount,
      hasHomeroomData: !!homeroomData,
      currentError: error
    };
  };

  return {
    students,
    homeroomData,
    loading,
    error,
    saveAttendance,
    refetch,
    getDebugInfo
  };
};