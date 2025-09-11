// src/services/teacherService.js - ENHANCED with Schedule Integration

import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  getDocs 
} from 'firebase/firestore';
import { db } from './firebase';
import { StudentFilteringService } from './studentFilteringService';
import { ScheduleService } from './scheduleService'; // NEW IMPORT

/**
 * ✅ ENHANCED: Teacher service with schedule-aware filtering
 * STRATEGY: Minimal changes to existing code, add schedule logic at the end
 */

// Keep all existing helper functions unchanged
const getTeacherProfile = async (currentUser) => {
  // [Existing code unchanged]
  try {


    const lookupMethods = [
      async () => {
        const teacherQuery = query(collection(db, 'users'), where('email', '==', currentUser.email));
        const snapshot = await getDocs(teacherQuery);
        return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
      },
      async () => {
        const allUsersSnapshot = await getDocs(collection(db, 'users'));
        let foundTeacher = null;
        
        allUsersSnapshot.forEach(doc => {
          const userData = doc.data();
          if (userData.email?.toLowerCase() === currentUser.email.toLowerCase()) {
            foundTeacher = { id: doc.id, ...userData };
          }
        });
        
        return foundTeacher;
      }
    ];

    for (const method of lookupMethods) {
      try {
        const teacherData = await method();
        if (teacherData) {
          return teacherData;
        }
      } catch (error) {
        console.warn('Lookup method failed:', error);
      }
    }

    throw new Error('Teacher profile not found in database');
  } catch (error) {
    console.error('Error getting teacher profile:', error);
    return null;
  }
};

// Keep existing helper functions unchanged
const getSubjectRooms = async () => {
  try {
    const subjectsSnapshot = await getDocs(collection(db, 'subjects'));
    const subjectRooms = {};
    
    subjectsSnapshot.forEach(doc => {
      const subjectData = doc.data();
      if (subjectData.name && subjectData.room) {
        subjectRooms[subjectData.name] = subjectData.room;
      }
    });
    
    return subjectRooms;
  } catch (error) {
    console.error('Error getting subject rooms:', error);
    return {};
  }
};

const generateRoomNumber = (sectionData, subject, subjectRooms = {}) => {
  if (subjectRooms[subject]) {
    return subjectRooms[subject];
  }
  
  if (subject === 'Homeroom') {
    const gradeLevel = sectionData.gradeLevel || 7;
    const sectionLetter = (sectionData.sectionName || sectionData.section || 'A').charAt(0);
    return `${gradeLevel}${sectionLetter}1`;
  }
  
  return 'TBD';
};

/**
 * ✅ ENHANCED: Main function with schedule integration
 */
export const getTeacherSections = async (currentUser) => {
  try {
    
    // STEP 1: Get teacher data (unchanged)
    let teacherData = null;

    try {
      const teacherDocByEmail = await getDocs(query(collection(db, 'users'), where('email', '==', currentUser.email)));
      if (!teacherDocByEmail.empty) {
        teacherDocByEmail.forEach(doc => {
          teacherData = { id: doc.id, ...doc.data() };
        });
      }
    } catch (error) {
    }

    if (!teacherData && currentUser.uid) {
      try {
        const teacherDocByUid = await getDocs(query(collection(db, 'users'), where('uid', '==', currentUser.uid)));
        if (!teacherDocByUid.empty) {
          teacherDocByUid.forEach(doc => {
            teacherData = { id: doc.id, ...doc.data() };
          });
        }
      } catch (error) {
      }
    }

    if (!teacherData) {
      try {
        const allUsersSnapshot = await getDocs(collection(db, 'users'));
        allUsersSnapshot.forEach(doc => {
          const userData = doc.data();
          if (userData.email === currentUser.email || userData.uid === currentUser.uid) {
            teacherData = { id: doc.id, ...userData };
          }
        });
      } catch (error) {
      }
    }

    if (!teacherData) {
      return [];
    }

    // STEP 2: Get subject rooms (unchanged)
    const subjectRooms = await getSubjectRooms();

    // ✅ NEW: Get schedule context
    const currentWeek = ScheduleService.getCurrentWeek();
    const currentDay = ScheduleService.getCurrentDay();

    // STEP 3: Process sections (mostly unchanged)
    const sectionsSnapshot = await getDocs(collection(db, 'sections'));
    const teacherRoles = teacherData.roles || [];
    const teacherSubjects = teacherData.subjects || [];
    const assignedSectionIds = teacherData.sections || [];
    const isHomeroomTeacher = teacherRoles.includes('homeroom');
    const homeroomClass = teacherData.homeroomClass;

    const tempSectionData = [];

    for (const doc of sectionsSnapshot.docs) {
      const sectionData = { id: doc.id, ...doc.data() };
      let isAssigned = false;
      let assignedSubjects = [];
      let isHomeroomSection = false;

      // Check homeroom assignment (unchanged)
      if (isHomeroomTeacher && homeroomClass) {
        const sectionIdentifier = `${sectionData.gradeLevel}-${sectionData.sectionName || sectionData.section}`;
        const homeroomIdentifier = homeroomClass;
        
        if (homeroomIdentifier === sectionIdentifier) {
          isAssigned = true;
          assignedSubjects.push('Homeroom');
          isHomeroomSection = true;
        }
      }

      // Check section assignments (unchanged)
      if (assignedSectionIds.includes(doc.id)) {
        isAssigned = true;
        if (teacherSubjects && teacherSubjects.length > 0) {
          assignedSubjects = [...new Set([...assignedSubjects, ...teacherSubjects])];
        }
      }

      if (sectionData.homeroomTeacherId === teacherData.id) {
        isAssigned = true;
        isHomeroomSection = true;
        if (!assignedSubjects.includes('Homeroom')) {
          assignedSubjects.push('Homeroom');
        }
      }

      if (sectionData.subjectTeachers && sectionData.subjectTeachers.includes(teacherData.id)) {
        isAssigned = true;
        if (teacherSubjects && teacherSubjects.length > 0) {
          assignedSubjects = [...new Set([...assignedSubjects, ...teacherSubjects])];
        }
      }

      // Get students (unchanged)
      if (isAssigned && assignedSubjects.length > 0) {
        let allSectionStudents = [];
        try {
          const studentsQuery = query(collection(db, 'students'), where('sectionId', '==', doc.id));
          const studentsSnapshot = await getDocs(studentsQuery);
          studentsSnapshot.forEach(studentDoc => {
            allSectionStudents.push({
              id: studentDoc.id,
              ...studentDoc.data()
            });
          });
        } catch (error) {
          console.error('Error fetching students:', error);
        }

        tempSectionData.push({
          sectionId: doc.id,
          sectionData: sectionData,
          sectionIdentifier: `${sectionData.gradeLevel}-${sectionData.sectionName || sectionData.section}`,
          allStudents: allSectionStudents,
          isHomeroomSection: isHomeroomSection,
          assignedSubjects: assignedSubjects
        });
      }
    }

    // STEP 4: Subject grouping (mostly unchanged)
    const subjectGroups = {};

    tempSectionData.forEach(sectionInfo => {
      const { assignedSubjects, allStudents, sectionData, sectionId, isHomeroomSection } = sectionInfo;
      
      assignedSubjects.forEach(subject => {
        if (!subjectGroups[subject]) {
          subjectGroups[subject] = {
            subject: subject,
            isHomeroom: subject === 'Homeroom',
            isHomeroomSection: isHomeroomSection && subject === 'Homeroom',
            sectionsWithStudents: [],
            allEnrolledStudents: [],
            totalCount: 0
          };
        }
        
        // Student filtering (unchanged)
        let studentsForThisSubject = [];
        
        if (subject === 'Homeroom') {
          if (isHomeroomSection) {
            studentsForThisSubject = allStudents;
          }
        } else {
          studentsForThisSubject = allStudents.filter(student => {
            if (student.subjectEnrollments && Array.isArray(student.subjectEnrollments)) {
              return student.subjectEnrollments.some(enrollment => 
                enrollment.subjectName?.toLowerCase() === subject.toLowerCase()
              );
            }
            if (student.selectedSubjects && Array.isArray(student.selectedSubjects)) {
              return student.selectedSubjects.some(selectedSubject =>
                selectedSubject?.toLowerCase() === subject.toLowerCase()
              );
            }
            if (student.subjects && Array.isArray(student.subjects)) {
              return student.subjects.some(s => s?.toLowerCase() === subject.toLowerCase());
            }
            if (student.subject) {
              return student.subject?.toLowerCase() === subject.toLowerCase();
            }
            return false;
          });
        }
        
        if (studentsForThisSubject.length > 0) {
          const formattedSectionName = `Grade ${sectionData.gradeLevel} - ${(sectionData.sectionName || sectionData.section || '').toUpperCase()}`;
          
          subjectGroups[subject].sectionsWithStudents.push({
            sectionId: sectionId,
            sectionData: sectionData,
            sectionName: formattedSectionName,
            gradeLevel: sectionData.gradeLevel,
            studentCount: studentsForThisSubject.length
          });
          
          studentsForThisSubject.forEach(student => {
            const exists = subjectGroups[subject].allEnrolledStudents.some(s => s.id === student.id);
            if (!exists) {
              subjectGroups[subject].allEnrolledStudents.push({
                ...student,
                sectionName: sectionData.sectionName || sectionData.section || 'N/A',
                gradeLevel: sectionData.gradeLevel || 'N/A',
                fromSection: formattedSectionName,
                fromSectionId: sectionId,
                displaySectionName: formattedSectionName,
                displayGradeLevel: sectionData.gradeLevel,
                displaySection: (sectionData.sectionName || sectionData.section || '').toUpperCase()
              });
            }
          });
        }
      });
    });

    // ✅ NEW: Apply schedule filtering to subject groups
    
    const filteredSubjectGroups = {};
    
    for (const [subjectName, group] of Object.entries(subjectGroups)) {
      // Always include homeroom sections
      if (group.isHomeroom) {
        filteredSubjectGroups[subjectName] = group;
        continue;
      }
      
      // For subject classes, check if scheduled today
      const isScheduledToday = await ScheduleService.isSubjectScheduledToday(subjectName);
      
      if (isScheduledToday) {
        // Get schedule info for today
        const todaySchedule = await ScheduleService.getSubjectScheduleToday(subjectName);
        const scheduleDisplay = ScheduleService.formatScheduleDisplay(todaySchedule);
        
        // Add schedule info to the group
        group.isScheduledToday = true;
        group.todaySchedule = todaySchedule;
        group.scheduleDisplay = scheduleDisplay;
        
        filteredSubjectGroups[subjectName] = group;
      }
    }

    // STEP 5: Convert to final format (enhanced with schedule info)
    const sectionsData = [];

    Object.values(filteredSubjectGroups).forEach(group => {
      group.totalCount = group.allEnrolledStudents.length;
      
      if (group.totalCount > 0) {
        const firstSection = group.sectionsWithStudents[0];
        const roomNumber = generateRoomNumber(firstSection?.sectionData, group.subject, subjectRooms);
        
        const formattedSection = {
          sectionId: firstSection?.sectionId || `multi-${group.subject.toLowerCase().replace(/\s+/g, '-')}`,
          title: group.isHomeroom 
            ? firstSection?.sectionName || 'Homeroom'
            : group.subject,
          subject: group.subject,
          isHomeroom: group.isHomeroom,
          isHomeroomSection: group.isHomeroomSection,
          isMultiSection: group.sectionsWithStudents.length > 1,
          sectionsInfo: group.sectionsWithStudents,
          students: group.allEnrolledStudents.map(s => s.id),
          studentsData: group.allEnrolledStudents,
          studentCount: group.totalCount,
          sectionData: firstSection?.sectionData || {},
          assignedSubjects: [group.subject],
          
          // Enhanced fields for compatibility
          name: group.isHomeroom 
            ? firstSection?.sectionName || 'Homeroom'
            : group.subject,
          actualSectionIds: group.sectionsWithStudents.map(s => s.sectionId),
          gradeLevel: firstSection?.gradeLevel,
          roomNumber: roomNumber,
          
          // ✅ NEW: Schedule information
          isScheduledToday: group.isScheduledToday || false,
          todaySchedule: group.todaySchedule || [],
          scheduleDisplay: group.scheduleDisplay || '',
          currentWeek: currentWeek,
          currentDay: currentDay
        };

        sectionsData.push(formattedSection);
      }
    });

    sectionsData.forEach(section => {
      if (section.isHomeroom) {
        console.log(`🏠 ${section.subject}: ${section.studentCount} students`);
      } else {
        console.log(`📚 ${section.subject}: ${section.studentCount} students (${section.scheduleDisplay || 'No schedule'})`);
      }
    });

    // ✅ NEW: Add schedule context to result
    const result = {
      sections: sectionsData,
      scheduleContext: {
        currentWeek: currentWeek,
        currentDay: currentDay,
        weekDisplay: ScheduleService.getWeekDisplayText(),
        totalSubjectsFiltered: Object.keys(subjectGroups).length - sectionsData.filter(s => !s.isHomeroom).length
      }
    };

    return result;

  } catch (error) {
    console.error('Error in enhanced getTeacherSections:', error);
    return { sections: [], scheduleContext: null };
  }
};

// Keep other existing functions unchanged
export const getTodayAttendance = async () => {
  // [Existing code unchanged]
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const attendanceQuery = query(
      collection(db, 'attendance'),
      where('date', '==', today)
    );
    
    const attendanceSnapshot = await getDocs(attendanceQuery);
    const attendanceData = {};
    
    attendanceSnapshot.forEach(doc => {
      const data = doc.data();
      const sectionId = data.sectionId;
      const subject = data.subject;
      const isHomeroom = data.isHomeroom || data.subject === 'Homeroom';
      
      if (!attendanceData[sectionId]) {
        attendanceData[sectionId] = {};
      }
      
      const key = isHomeroom ? 'homeroom' : subject.toLowerCase().replace(/\s+/g, '-');
      attendanceData[sectionId][key] = {
        docId: doc.id,
        takenBy: data.teacherName,
        time: data.createdAt?.toDate?.() ? data.createdAt.toDate().toLocaleTimeString() : 
              data.updatedAt?.toDate?.() ? data.updatedAt.toDate().toLocaleTimeString() : 'Unknown',
        students: data.students || [],
        presentCount: (data.students || []).filter(s => s.status === 'present').length,
        lateCount: (data.students || []).filter(s => s.status === 'late').length,
        absentCount: (data.students || []).filter(s => s.status === 'absent').length,
        excusedCount: (data.students || []).filter(s => s.status === 'excused').length,
        totalStudents: (data.students || []).length,
        timestamp: data.updatedAt || data.createdAt
      };
    });

    return attendanceData;

  } catch (error) {
    console.error('Error getting attendance data:', error);
    return {};
  }
};

export const getAdminAnnouncements = async () => {
  // [Existing code unchanged]
  try {
    const today = new Date().toISOString().split('T')[0];
    const announcementsQuery = query(
      collection(db, 'announcements'),
      where('targetAudience', 'in', ['all', 'teachers']),
      where('isActive', '==', true),
      where('startDate', '<=', today),
      where('endDate', '>=', today)
    );
    
    const snapshot = await getDocs(announcementsQuery);
    const announcements = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      announcements.push({
        type: data.priority === 'high' ? 'warning' : 'info',
        message: data.message,
        icon: data.priority === 'high' ? 'bi-exclamation-triangle' : 'bi-info-circle',
        priority: data.priority || 'medium',
        createdAt: data.createdAt
      });
    });
    
    return announcements;
  } catch (error) {
    console.error('Error getting announcements:', error);
    return [];
  }
};

export const setupTeacherListeners = (currentUser, callback) => {
  // [Existing code unchanged but needs to handle new return format]
  try {
    const unsubscribers = [];
    let isRefreshing = false;

    let refreshTimeout;
    const refreshData = async () => {
      if (isRefreshing) return;
      
      clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(async () => {
        try {
          isRefreshing = true;
          
          const result = await getTeacherSections(currentUser);
          const sections = result.sections || [];
          const attendanceData = await getTodayAttendance();
          
          const sectionsWithAttendance = sections.map(section => {
            const sectionAttendance = attendanceData[section.sectionId];
            const subjectKey = section.isHomeroom ? 'homeroom' : section.subject.toLowerCase().replace(/\s+/g, '-');
            const attendance = sectionAttendance?.[subjectKey];
            
            const students = attendance?.students || [];
            
            return {
              ...section,
              attendanceTaken: !!attendance,
              attendanceData: attendance,
              presentCount: students.filter(s => s.status === 'present').length,
              lateCount: students.filter(s => s.status === 'late').length,
              absentCount: students.filter(s => s.status === 'absent').length,
              excusedCount: students.filter(s => s.status === 'excused').length,
              enrolledCount: section.studentCount || 0,
              totalStudents: section.studentCount || 0,
              attendanceTime: attendance?.time,
              attendanceTakenBy: attendance?.takenBy
            };
          });
          
          
          // ✅ NEW: Pass schedule context to callback
          callback({
            sections: sectionsWithAttendance,
            scheduleContext: result.scheduleContext
          });
          
        } catch (error) {
          console.error('Error refreshing data:', error);
          callback({ sections: [], scheduleContext: null });
        } finally {
          isRefreshing = false;
        }
      }, 1000);
    };

    // Set up listeners
    const sectionsListener = onSnapshot(collection(db, 'sections'), refreshData);
    unsubscribers.push(sectionsListener);

    const today = new Date().toISOString().split('T')[0];
    const attendanceListener = onSnapshot(
      query(collection(db, 'attendance'), where('date', '==', today)),
      refreshData
    );
    unsubscribers.push(attendanceListener);

    const studentsListener = onSnapshot(collection(db, 'students'), refreshData);
    unsubscribers.push(studentsListener);

    // Initial data load
    refreshData();

    return () => {
      clearTimeout(refreshTimeout);
      unsubscribers.forEach(unsubscriber => {
        if (typeof unsubscriber === 'function') {
          unsubscriber();
        }
      });
    };

  } catch (error) {
    console.error('Error setting up teacher listeners:', error);
    return () => {};
  }
};