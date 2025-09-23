// src/services/teacherService.js - FIXED VERSION WITH REAL-TIME SUBJECT LOOKUP
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  getDocs,
  orderBy
} from 'firebase/firestore';
import { db } from './firebase';
import { ScheduleService } from './scheduleService';

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
    console.error('Error loading subject rooms:', error);
    return {};
  }
};

// UNIVERSAL FIX: Get teacher subjects from database in real-time
const getTeacherSubjectsFromDatabase = async (teacherId) => {
  try {
    console.log('🔍 Getting real-time subject assignments for teacher:', teacherId);
    
    const subjectsSnapshot = await getDocs(collection(db, 'subjects'));
    const teacherSubjects = [];
    
    subjectsSnapshot.forEach(doc => {
      const subjectData = doc.data();
      const assignedTeachers = subjectData.assignedTeachers || [];
      
      if (assignedTeachers.includes(teacherId) && subjectData.name) {
        teacherSubjects.push(subjectData.name);
        console.log(`✅ Teacher assigned to: ${subjectData.name}`);
      }
    });
    
    console.log(`📚 Real-time subjects found: ${teacherSubjects.length}`);
    return teacherSubjects;
    
  } catch (error) {
    console.error('Error getting teacher subjects from database:', error);
    return [];
  }
};

const generateRoomNumber = (sectionData, subject, subjectRooms = {}) => {
  if (subjectRooms[subject]) {
    return subjectRooms[subject];
  }
  
  if (subject === 'Homeroom') {
    const year = sectionData?.year || sectionData?.gradeLevel || 7;
    const sectionLetter = (sectionData?.section || sectionData?.sectionName || 'A').charAt(0);
    return `${year}${sectionLetter}1`;
  }
  
  return 'TBD';
};

export const getTeacherSections = async (currentUser, showAllClasses = false) => {
  try {
    console.log('🔍 Getting teacher sections for:', currentUser.email);
    console.log('📊 Show all classes mode:', showAllClasses);

    const currentWeek = ScheduleService.getCurrentWeek();
    const currentDay = ScheduleService.getCurrentDay();
    
    console.log('📅 Current schedule:', currentWeek, currentDay);

    const subjectRooms = await getSubjectRooms();

    // STEP 1: Get teacher data
    let teacherData = null;

    try {
      const teacherDocByEmail = await getDocs(query(collection(db, 'users'), where('email', '==', currentUser.email)));
      if (!teacherDocByEmail.empty) {
        teacherDocByEmail.forEach(doc => {
          teacherData = { id: doc.id, ...doc.data() };
        });
      }
    } catch (error) {
      console.error('Error getting teacher by email:', error);
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
        console.error('Error getting teacher by UID:', error);
      }
    }

    if (!teacherData) {
      console.error('❌ Teacher data not found');
      return { sections: [], scheduleContext: null };
    }

    console.log('👨‍🏫 Teacher data found:', teacherData.name || teacherData.email);

    // 🔥 FIXED: Get real-time subjects instead of cached ones
    const teacherRoles = teacherData.roles || [];
    const teacherSubjects = await getTeacherSubjectsFromDatabase(teacherData.id);
    const assignedSectionIds = teacherData.sections || [];
    const isHomeroomTeacher = teacherRoles.includes('homeroom');
    const tempSectionData = [];

    console.log('📚 Using real-time subjects:', teacherSubjects);

    // STEP 2: Get all sections and process assignments
    const sectionsSnapshot = await getDocs(collection(db, 'sections'));

    sectionsSnapshot.forEach(doc => {
      const sectionData = { id: doc.id, ...doc.data() };
      let isAssigned = false;
      let assignedSubjects = [];
      let isHomeroomSection = false;

      // Check homeroom assignment
      if (isHomeroomTeacher && teacherData.homeroomClass) {
        const sectionIdentifier = `${sectionData.year || sectionData.gradeLevel}-${sectionData.section || sectionData.sectionName}`;
        
        if (teacherData.homeroomClass === sectionIdentifier || teacherData.homeroomClass === doc.id) {
          isAssigned = true;
          isHomeroomSection = true;
          if (!assignedSubjects.includes('Homeroom')) {
            assignedSubjects.push('Homeroom');
          }
        }
      }

      // Check section assignments - NOW USES REAL-TIME SUBJECTS
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

      // Store section info if assigned
      if (isAssigned && assignedSubjects.length > 0) {
        tempSectionData.push({
          sectionId: doc.id,
          sectionData: sectionData,
          sectionIdentifier: `${sectionData.year || sectionData.gradeLevel}-${sectionData.section || sectionData.sectionName}`,
          allStudents: [],
          isHomeroomSection: isHomeroomSection,
          assignedSubjects: assignedSubjects
        });
      }
    });

    // Second pass: get students for assigned sections
    const studentPromises = tempSectionData.map(async (sectionInfo) => {
      const studentsQuery = query(collection(db, 'students'), where('sectionId', '==', sectionInfo.sectionId));
      const studentsSnapshot = await getDocs(studentsQuery);
      const students = [];
      studentsSnapshot.forEach(studentDoc => {
        students.push({
          id: studentDoc.id,
          ...studentDoc.data()
        });
      });
      return { ...sectionInfo, allStudents: students };
    });

    const completeSectionData = await Promise.all(studentPromises);

    // STEP 3: Subject grouping
    const subjectGroups = {};

    completeSectionData.forEach(sectionInfo => {
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
        
        // Student filtering
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
          const formattedSectionName = `Grade ${sectionData.year || sectionData.gradeLevel} - ${(sectionData.section || sectionData.sectionName || '').toUpperCase()}`;
          
          subjectGroups[subject].sectionsWithStudents.push({
            sectionId: sectionId,
            sectionData: sectionData,
            sectionName: formattedSectionName,
            year: sectionData.year || sectionData.gradeLevel,
            studentCount: studentsForThisSubject.length
          });
          
          studentsForThisSubject.forEach(student => {
            const exists = subjectGroups[subject].allEnrolledStudents.some(s => s.id === student.id);
            if (!exists) {
              subjectGroups[subject].allEnrolledStudents.push({
                ...student,
                sectionName: sectionData.section || sectionData.sectionName || 'N/A',
                year: sectionData.year || sectionData.gradeLevel || 'N/A',
                gradeLevel: sectionData.year || sectionData.gradeLevel || 'N/A',
                fromSection: formattedSectionName,
                fromSectionId: sectionId,
                displaySectionName: formattedSectionName,
                displayYear: sectionData.year || sectionData.gradeLevel,
                displaySection: (sectionData.section || sectionData.sectionName || '').toUpperCase()
              });
            }
          });
        }
      });
    });

    // STEP 4: Schedule filtering
    const filteredSubjectGroups = {};
    const subjectsSnapshot = await getDocs(collection(db, 'subjects'));
    const allSubjects = [];
    subjectsSnapshot.forEach(doc => {
      allSubjects.push({ id: doc.id, ...doc.data() });
    });

    let totalSubjectsFiltered = 0;
    let totalScheduledToday = 0;

    for (const [subjectName, group] of Object.entries(subjectGroups)) {
      if (group.isHomeroom) {
        filteredSubjectGroups[subjectName] = group;
        totalScheduledToday++;
        continue;
      }
      
      const subjectData = allSubjects.find(s => 
        s.name && s.name.toLowerCase() === subjectName.toLowerCase()
      );
      
      let isScheduledToday = false;
      let todaySchedule = [];
      
      if (subjectData && subjectData.schedule) {
        const weekSchedule = subjectData.schedule[currentWeek];
        if (weekSchedule) {
          const scheduleSlots = Array.isArray(weekSchedule) ? weekSchedule : [weekSchedule];
          
          todaySchedule = scheduleSlots.filter(slot => 
            slot.day && slot.day.toLowerCase() === currentDay.toLowerCase()
          );
          
          isScheduledToday = todaySchedule.length > 0;
        }
      }

      if (showAllClasses) {
        group.isScheduledToday = isScheduledToday;
        
        if (isScheduledToday) {
          const scheduleDisplay = ScheduleService.formatScheduleDisplay(todaySchedule);
          group.todaySchedule = todaySchedule;
          group.scheduleDisplay = scheduleDisplay;
          totalScheduledToday++;
        } else {
          group.scheduleDisplay = 'Not scheduled today';
        }
        
        filteredSubjectGroups[subjectName] = group;
      } else {
        if (isScheduledToday) {
          const scheduleDisplay = ScheduleService.formatScheduleDisplay(todaySchedule);
          
          group.isScheduledToday = true;
          group.todaySchedule = todaySchedule;
          group.scheduleDisplay = scheduleDisplay;
          
          filteredSubjectGroups[subjectName] = group;
          totalScheduledToday++;
        } else {
          totalSubjectsFiltered++;
        }
      }
    }

    // STEP 5: Create final sections array
    const sectionsData = [];

    Object.values(filteredSubjectGroups).forEach(group => {
      group.totalCount = group.allEnrolledStudents.length;
      
      const shouldInclude = group.totalCount > 0 || (showAllClasses && !group.isHomeroom);
      
      if (shouldInclude) {
        const firstSection = group.sectionsWithStudents[0];
        const roomNumber = generateRoomNumber(firstSection?.sectionData, group.subject, subjectRooms);
        
        const hasStudents = group.totalCount > 0;
        const defaultSectionId = `virtual-${group.subject.toLowerCase().replace(/\s+/g, '-')}`;
        
        const formattedSection = {
          sectionId: firstSection?.sectionId || defaultSectionId,
          title: group.isHomeroom 
            ? (firstSection?.sectionName || 'Homeroom')
            : group.subject,
          subject: group.subject,
          isHomeroom: group.isHomeroom,
          isHomeroomSection: group.isHomeroomSection,
          isMultiSection: group.sectionsWithStudents.length > 1,
          sectionsInfo: group.sectionsWithStudents,
          students: group.allEnrolledStudents.map(s => s.id),
          studentsData: group.allEnrolledStudents,
          studentCount: group.totalCount,
          sectionData: firstSection?.sectionData || {
            year: 'Mixed',
            section: 'Multiple',
            gradeLevel: 'Mixed',
            sectionName: 'Multiple'
          },
          assignedSubjects: [group.subject],
          
          name: group.isHomeroom 
            ? (firstSection?.sectionName || 'Homeroom')
            : group.subject,
          actualSectionIds: group.sectionsWithStudents.map(s => s.sectionId),
          year: firstSection?.sectionData?.year || firstSection?.sectionData?.gradeLevel || 'Mixed',
          gradeLevel: firstSection?.sectionData?.year || firstSection?.sectionData?.gradeLevel || 'Mixed',
          roomNumber: roomNumber,
          
          isScheduledToday: group.isScheduledToday !== false,
          todaySchedule: group.todaySchedule || [],
          scheduleDisplay: group.scheduleDisplay || '',
          currentWeek: currentWeek,
          currentDay: currentDay,
          
          isEmpty: !hasStudents,
          isVirtualSection: !hasStudents && showAllClasses
        };

        sectionsData.push(formattedSection);
        
        if (!hasStudents) {
          console.log(`📝 Including empty subject: ${group.subject} (showAllClasses enabled)`);
        }
      } else {
        console.log(`❌ Excluding ${group.subject}: ${group.totalCount} students, showAllClasses: ${showAllClasses}`);
      }
    });

    const result = {
      sections: sectionsData,
      scheduleContext: {
        currentWeek: currentWeek,
        currentDay: currentDay,
        weekDisplay: ScheduleService.getWeekDisplayText(),
        totalSubjectsFiltered: showAllClasses ? 0 : totalSubjectsFiltered,
        showingAllClasses: showAllClasses,
        totalSubjectsAvailable: Object.keys(subjectGroups).length,
        emptySubjectsShown: showAllClasses ? sectionsData.filter(s => s.isEmpty).length : 0,
        totalScheduledToday: totalScheduledToday,
        hasScheduledClasses: totalScheduledToday > 0
      }
    };

    console.log('✅ DEBUG: Final result:', result);
    console.log(`📊 Showing ${sectionsData.length} sections total`);
    console.log(`🗓️ Subjects scheduled today: ${totalScheduledToday}`);
    console.log(`📋 Subjects filtered out: ${totalSubjectsFiltered}`);

    return result;

  } catch (error) {
    console.error('❌ Error in enhanced getTeacherSections:', error);
    return { sections: [], scheduleContext: null };
  }
};

// export const getTodayAttendance = async () => {
//   try {
//     const today = new Date().toISOString().split('T')[0];
    
//     const attendanceQuery = query(
//       collection(db, 'attendance'),
//       where('date', '==', today)
//     );
    
//     const attendanceSnapshot = await getDocs(attendanceQuery);
//     const attendanceData = {};
    
//     attendanceSnapshot.forEach(doc => {
//       const data = doc.data();
//       const sectionId = data.sectionId;
//       const subject = data.subject;
//       const isHomeroom = data.isHomeroom || data.subject === 'Homeroom';
      
//       if (!attendanceData[sectionId]) {
//         attendanceData[sectionId] = {};
//       }
      
//       const key = isHomeroom ? 'homeroom' : subject.toLowerCase().replace(/\s+/g, '-');
//       attendanceData[sectionId][key] = {
//         docId: doc.id,
//         takenBy: data.teacherName,
//         time: data.createdAt?.toDate?.() ? data.createdAt.toDate().toLocaleTimeString() : 
//               data.updatedAt?.toDate?.() ? data.updatedAt.toDate().toLocaleTimeString() : 'Unknown'
//       };
//     });
    
//     return attendanceData;
//   } catch (error) {
//     console.error('Error getting today attendance:', error);
//     return {};
//   }
// };

// Replace your getTodayAttendance function in teacherService.js with this:

export const getTodayAttendance = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    console.log('🔍 Loading attendance for date:', today);
    
    const attendanceQuery = query(
      collection(db, 'attendance'),
      where('date', '==', today)
    );
    
    const attendanceSnapshot = await getDocs(attendanceQuery);
    const attendanceData = {};
    
    console.log(`📊 Found ${attendanceSnapshot.size} attendance records`);
    
    attendanceSnapshot.forEach(doc => {
      const data = doc.data();
      console.log('📋 Processing record:', doc.id, data);
      
      // Determine the subject key to match your dashboard
      const subjectKey = data.isHomeroom ? 'Homeroom' : (data.subjectName || data.subject);
      
      if (!subjectKey) {
        console.warn('⚠️ No subject key found for record:', doc.id);
        return;
      }
      
      // ✅ CRITICAL FIX: Include the actual student data
      let students = [];
      
      if (Array.isArray(data.students)) {
        students = data.students;
      } else if (data.students && typeof data.students === 'object') {
        // Convert object to array
        students = Object.values(data.students);
      } else if (data.studentData) {
        // Handle legacy field
        students = Array.isArray(data.studentData) ? data.studentData : Object.values(data.studentData);
      }
      
      console.log(`👥 Found ${students.length} students for ${subjectKey}`);
      
      // Store with the COMPLETE data structure your dashboard needs
      attendanceData[subjectKey] = {
        docId: doc.id,
        students: students,  // ✅ CRITICAL: Include student records
        takenBy: data.takenByName || data.takenBy || data.teacherName || 'Unknown',
        teacherName: data.takenByName || data.takenBy || data.teacherName || 'Unknown',
        time: data.timestamp ? new Date(data.timestamp).toLocaleTimeString() :
              data.createdAt?.toDate?.() ? data.createdAt.toDate().toLocaleTimeString() : 
              data.updatedAt?.toDate?.() ? data.updatedAt.toDate().toLocaleTimeString() : 
              'Unknown time',
        timestamp: data.timestamp || 
                  (data.createdAt?.toDate?.() ? data.createdAt.toDate().getTime() : Date.now()),
        sectionId: data.sectionId,
        sectionName: data.sectionName,
        subjectName: data.subjectName || data.subject,
        isHomeroom: data.isHomeroom || false
      };
      
      console.log(`✅ Stored attendance for ${subjectKey}:`, {
        students: students.length,
        takenBy: attendanceData[subjectKey].takenBy,
        time: attendanceData[subjectKey].time
      });
    });
    
    console.log('📤 Final attendance data keys:', Object.keys(attendanceData));
    return attendanceData;
    
  } catch (error) {
    console.error('❌ Error getting today attendance:', error);
    return {};
  }
};

export const getAdminAnnouncements = async () => {
  try {
    const announcementsQuery = query(
      collection(db, 'announcements'),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(announcementsQuery);
    const announcements = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      announcements.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date()
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
    const unsubscribe = onSnapshot(
      collection(db, 'sections'),
      (snapshot) => {
        console.log('📡 Sections updated, refreshing teacher data...');
        getTeacherSections(currentUser).then(result => {
          if (callback) callback(result);
        });
      },
      (error) => {
        console.error('Error in sections listener:', error);
      }
    );
    
    return unsubscribe;
  } catch (error) {
    console.error('Error setting up teacher listeners:', error);
    return () => {};
  }
};