// src/services/teacherService.js - FIXED using your proven logic
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  getDocs 
} from 'firebase/firestore';
import { db } from './firebase';
import { StudentFilteringService } from './studentFilteringService';

/**
 * ✅ FIXED: Uses your proven simple logic that works perfectly
 * No complex role-based branching, just simple subject grouping
 */

// Helper functions (unchanged)
const getTeacherProfile = async (currentUser) => {
  try {
    console.log('Looking up teacher profile for:', currentUser.email);

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
          console.log('Found teacher profile:', { id: teacherData.id, email: teacherData.email });
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

/**
 * ✅ YOUR EXACT WORKING LOGIC - No modifications needed
 */
// Helper function to get subject rooms from database
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
    
    console.log('Loaded subject rooms:', subjectRooms);
    return subjectRooms;
  } catch (error) {
    console.error('Error getting subject rooms:', error);
    return {};
  }
};

// Helper function to generate room numbers
const generateRoomNumber = (sectionData, subject, subjectRooms = {}) => {
  // First check if we have room data from subjects collection
  if (subjectRooms[subject]) {
    return subjectRooms[subject];
  }
  
  // For homeroom, generate based on grade and section
  if (subject === 'Homeroom') {
    const gradeLevel = sectionData.gradeLevel || 7;
    const sectionLetter = (sectionData.sectionName || sectionData.section || 'A').charAt(0);
    return `${gradeLevel}${sectionLetter}1`;
  }
  
  return 'TBD';
};

export const getTeacherSections = async (currentUser) => {
  try {
    console.log('=== TEACHER SECTIONS (Your Working Logic) ===');
    console.log('Looking for teacher with:', {
      email: currentUser.email,
      uid: currentUser.uid,
      name: currentUser.name
    });

    // Step 1: Get teacher profile (your exact logic)
    let teacherData = null;

    try {
      const teacherDocByEmail = await getDocs(query(collection(db, 'users'), where('email', '==', currentUser.email)));
      if (!teacherDocByEmail.empty) {
        teacherDocByEmail.forEach(doc => {
          teacherData = { id: doc.id, ...doc.data() };
        });
      }
    } catch (error) {
      console.log('Email query failed:', error);
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
        console.log('UID query failed:', error);
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
        console.log('Manual search failed:', error);
      }
    }

    if (!teacherData) {
      console.log('No teacher data found');
      return [];
    }

    // Step 1.5: Get subject rooms from database
    const subjectRooms = await getSubjectRooms();

    // Step 2: Process sections (your exact logic)
    const sectionsSnapshot = await getDocs(collection(db, 'sections'));
    const teacherRoles = teacherData.roles || [];
    const teacherSubjects = teacherData.subjects || [];
    const assignedSectionIds = teacherData.sections || [];
    const isHomeroomTeacher = teacherRoles.includes('homeroom');
    const homeroomClass = teacherData.homeroomClass;

    const tempSectionData = []; // Your variable name

    for (const doc of sectionsSnapshot.docs) {
      const sectionData = { id: doc.id, ...doc.data() };
      let isAssigned = false;
      let assignedSubjects = [];
      let isHomeroomSection = false;

      // Check homeroom assignment (your exact logic)
      if (isHomeroomTeacher && homeroomClass) {
        const sectionIdentifier = `${sectionData.gradeLevel}-${sectionData.sectionName || sectionData.section}`;
        const homeroomIdentifier = homeroomClass;
        
        if (homeroomIdentifier === sectionIdentifier) {
          isAssigned = true;
          assignedSubjects.push('Homeroom');
          isHomeroomSection = true;
        }
      }

      // Check section assignments (your exact logic)
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

      // Get students (your exact logic)
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

    // Step 3: YOUR EXACT GROUPING LOGIC (The magic that prevents duplicates)
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
        
        // Student filtering (enhanced with better logic)
        let studentsForThisSubject = [];
        
        if (subject === 'Homeroom') {
          if (isHomeroomSection) {
            studentsForThisSubject = allStudents;
          }
        } else {
          // Use enhanced filtering for subject classes
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

    // Step 4: Convert to final format (your exact logic)
    const sectionsData = [];

    Object.values(subjectGroups).forEach(group => {
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
          
          // Enhanced fields for compatibility (including room number)
          name: group.isHomeroom 
            ? firstSection?.sectionName || 'Homeroom'
            : group.subject,
          actualSectionIds: group.sectionsWithStudents.map(s => s.sectionId),
          gradeLevel: firstSection?.gradeLevel,
          roomNumber: roomNumber // Add room number here
        };

        sectionsData.push(formattedSection);
      }
    });

    console.log('=== Final Results (Your Working Logic) ===');
    sectionsData.forEach(section => {
      console.log(`${section.subject}: ${section.studentCount} students (${section.title})`);
    });

    return sectionsData;

  } catch (error) {
    console.error('Error in getTeacherSections:', error);
    return [];
  }
};

// Export other functions (same as your old code)
export const getTodayAttendance = async () => {
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
          console.log('Refreshing teacher data...');
          
          const sections = await getTeacherSections(currentUser);
          const attendanceData = await getTodayAttendance();
          
          const sectionsArray = Array.isArray(sections) ? sections : [];
          
          const sectionsWithAttendance = sectionsArray.map(section => {
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
          
          console.log(`Refreshed: ${sectionsWithAttendance.length} sections`);
          callback(sectionsWithAttendance);
          
        } catch (error) {
          console.error('Error refreshing data:', error);
          callback([]);
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