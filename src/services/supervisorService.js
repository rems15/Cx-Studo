// supervisorService.js - UPDATED FOR NEW SCHEMA (removed name, sectionName; gradeLevel → year)
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from './firebase';

// UPDATED: Helper function to get section identifier
const getSectionIdentifier = (section) => {
  const year = section.year || section.gradeLevel || 'N/A';
  const sectionLetter = section.section || section.sectionName || 'X';
  return `${year}-${sectionLetter}`;
};

// UPDATED: Helper function to get section display name
const getSectionDisplayName = (section) => {
  const year = section.year || section.gradeLevel || 'Unknown';
  const sectionLetter = (section.section || section.sectionName || '').toUpperCase();
  return `Grade ${year} - ${sectionLetter}`;
};

/**
 * UPDATED: Get attendance data for a specific date with new schema support
 */
export const getAttendanceData = async (selectedDate) => {
  try {
    console.log('📊 Loading attendance data for:', selectedDate);
    
    const attendanceQuery = query(
      collection(db, 'attendance'),
      where('date', '==', selectedDate)
    );
    
    const attendanceSnapshot = await getDocs(attendanceQuery);
    const attendanceRecords = [];

    // Get sections data for reference
    const sectionsSnapshot = await getDocs(collection(db, 'sections'));
    const sectionsMap = {};
    sectionsSnapshot.forEach(doc => {
      const sectionData = doc.data();
      sectionsMap[doc.id] = {
        id: doc.id,
        ...sectionData,
        identifier: getSectionIdentifier(sectionData),
        displayName: getSectionDisplayName(sectionData)
      };
    });

    attendanceSnapshot.forEach(doc => {
      const data = doc.data();
      
      // UPDATED: Handle section information with new schema
      let sectionInfo = null;
      let sectionDisplayName = 'Unknown Section';
      
      // Try to get section info from multiple sources
      if (data.sectionId) {
        if (Array.isArray(data.sectionId)) {
          // Multi-section case
          const sectionNames = data.sectionId
            .map(id => sectionsMap[id]?.identifier || id)
            .join(' + ');
          sectionDisplayName = sectionNames;
        } else {
          // Single section case
          sectionInfo = sectionsMap[data.sectionId];
          sectionDisplayName = sectionInfo?.displayName || sectionInfo?.identifier || data.sectionId;
        }
      } else if (data.sectionData) {
        // Use embedded section data
        if (Array.isArray(data.sectionData)) {
          // Multi-section embedded data
          const sectionNames = data.sectionData
            .map(s => getSectionIdentifier(s))
            .join(' + ');
          sectionDisplayName = sectionNames;
        } else {
          // Single section embedded data
          sectionDisplayName = getSectionDisplayName(data.sectionData);
        }
      } else if (data.sectionName) {
        // Fallback to legacy sectionName field
        sectionDisplayName = data.sectionName;
      }

      // Calculate attendance statistics
      const students = data.students || {};
      const studentRecords = Object.values(students);
      
      const totalStudents = studentRecords.length;
      const presentCount = studentRecords.filter(s => s.status === 'present').length;
      const absentCount = studentRecords.filter(s => s.status === 'absent').length;
      const lateCount = studentRecords.filter(s => s.status === 'late').length;
      const excusedCount = studentRecords.filter(s => s.status === 'excused').length;
      
      const attendanceRate = totalStudents > 0 ? 
        Math.round((presentCount / totalStudents) * 100) : 0;

      attendanceRecords.push({
        id: doc.id,
        sectionName: sectionDisplayName,
        sectionIdentifier: sectionInfo?.identifier || sectionDisplayName,
        subjectName: data.subjectName || data.subject || 'Unknown Subject',
        isHomeroom: data.isHomeroom || false,
        isMultiSection: data.isMultiSection || false,
        takenBy: data.takenByName || data.takenBy || 'Unknown',
        time: data.timestamp || data.time,
        totalStudents,
        presentCount,
        absentCount,
        lateCount,
        excusedCount,
        attendanceRate,
        students: students,
        sectionInfo: sectionInfo
      });
    });

    console.log(`✅ Loaded ${attendanceRecords.length} attendance records`);
    return attendanceRecords;

  } catch (error) {
    console.error('Error getting attendance data:', error);
    return [];
  }
};

/**
 * UPDATED: Get attendance statistics for a specific date
 */
export const getAttendanceStats = async (selectedDate) => {
  try {
    const attendanceData = await getAttendanceData(selectedDate);
    
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;
    let totalExcused = 0;
    let totalStudents = 0;

    attendanceData.forEach(record => {
      totalPresent += record.presentCount;
      totalAbsent += record.absentCount;
      totalLate += record.lateCount;
      totalExcused += record.excusedCount;
      totalStudents += record.totalStudents;
    });

    const attendanceRate = totalStudents > 0 ? 
      Math.round((totalPresent / totalStudents) * 100) : 0;

    return {
      totalPresent,
      totalAbsent,
      totalLate,
      totalExcused,
      attendanceRate,
      totalRecords: attendanceData.length,
      totalStudents
    };

  } catch (error) {
    console.error('Error getting attendance stats:', error);
    return {
      totalPresent: 0,
      totalAbsent: 0,
      totalLate: 0,
      totalExcused: 0,
      attendanceRate: 0,
      totalRecords: 0,
      totalStudents: 0
    };
  }
};

/**
 * UPDATED: Get teachers data with sections and subjects using new schema
 */
export const getTeachersData = async () => {
  try {
    console.log('🔍 Loading teachers data...');

    // Get all teachers
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const teachers = [];
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      if (userData.roles?.includes('homeroom') || userData.roles?.includes('subject')) {
        teachers.push({ id: doc.id, ...userData });
      }
    });

    // Get all sections for reference
    let sections = [];
    try {
      const sectionsSnapshot = await getDocs(collection(db, 'sections'));
      sectionsSnapshot.forEach(doc => {
        const sectionData = { id: doc.id, ...doc.data() };
        sectionData.identifier = getSectionIdentifier(sectionData);
        sectionData.displayName = getSectionDisplayName(sectionData);
        sections.push(sectionData);
      });
    } catch (error) {
      console.error('Error loading sections:', error);
    }

    // UPDATED: Process teacher assignments with new schema
    const processedTeachers = teachers.map(teacher => {
      const assignedSections = [];
      
      // Check homeroom assignments
      if (teacher.roles?.includes('homeroom') && teacher.homeroomClass) {
        const homeroomSection = sections.find(section => 
          getSectionIdentifier(section) === teacher.homeroomClass
        );
        if (homeroomSection) {
          assignedSections.push({
            id: homeroomSection.id,
            identifier: homeroomSection.identifier,
            displayName: homeroomSection.displayName,
            type: 'homeroom',
            year: homeroomSection.year || homeroomSection.gradeLevel,
            section: homeroomSection.section || homeroomSection.sectionName
          });
        }
      }

      // Check section assignments by ID
      if (teacher.sections && Array.isArray(teacher.sections)) {
        teacher.sections.forEach(sectionId => {
          const section = sections.find(s => s.id === sectionId);
          if (section && !assignedSections.find(as => as.id === sectionId)) {
            assignedSections.push({
              id: section.id,
              identifier: section.identifier,
              displayName: section.displayName,
              type: 'subject',
              year: section.year || section.gradeLevel,
              section: section.section || section.sectionName
            });
          }
        });
      }

      // Check subject teacher assignments
      sections.forEach(section => {
        if (section.subjectTeachers && section.subjectTeachers.includes(teacher.id)) {
          if (!assignedSections.find(as => as.id === section.id)) {
            assignedSections.push({
              id: section.id,
              identifier: section.identifier,
              displayName: section.displayName,
              type: 'subject',
              year: section.year || section.gradeLevel,
              section: section.section || section.sectionName
            });
          }
        }
      });

      return {
        ...teacher,
        assignedSections,
        sectionCount: assignedSections.length,
        subjectCount: teacher.subjects?.length || 0
      };
    });

    console.log(`✅ Processed ${processedTeachers.length} teachers`);
    return processedTeachers;

  } catch (error) {
    console.error('Error getting teachers data:', error);
    return [];
  }
};

/**
 * UPDATED: Get students data with section information using new schema
 */
export const getStudentsData = async () => {
  try {
    console.log('🔍 Loading students data...');

    // Get all students
    const studentsSnapshot = await getDocs(collection(db, 'students'));
    const students = [];
    studentsSnapshot.forEach(doc => {
      const studentData = { id: doc.id, ...doc.data() };
      // UPDATED: Ensure year field is available (fallback to gradeLevel)
      if (!studentData.year && studentData.gradeLevel) {
        studentData.year = studentData.gradeLevel;
      }
      students.push(studentData);
    });

    // Get all sections for reference
    const sectionsSnapshot = await getDocs(collection(db, 'sections'));
    const sectionsMap = {};
    sectionsSnapshot.forEach(doc => {
      const sectionData = { id: doc.id, ...doc.data() };
      sectionData.identifier = getSectionIdentifier(sectionData);
      sectionData.displayName = getSectionDisplayName(sectionData);
      sectionsMap[doc.id] = sectionData;
    });

    // UPDATED: Process students with section information
    const processedStudents = students.map(student => {
      let sectionInfo = null;
      
      if (student.sectionId && sectionsMap[student.sectionId]) {
        sectionInfo = sectionsMap[student.sectionId];
      }

      return {
        ...student,
        sectionInfo,
        sectionIdentifier: sectionInfo?.identifier || 'Unassigned',
        sectionDisplayName: sectionInfo?.displayName || 'No Section Assigned',
        yearLevel: student.year || student.gradeLevel || 'Unknown'
      };
    });

    console.log(`✅ Processed ${processedStudents.length} students`);
    return processedStudents;

  } catch (error) {
    console.error('Error getting students data:', error);
    return [];
  }
};

/**
 * UPDATED: Get sections data with enrollment statistics
 */
export const getSectionsData = async () => {
  try {
    console.log('🔍 Loading sections data...');

    const sectionsSnapshot = await getDocs(collection(db, 'sections'));
    const sections = [];
    
    for (const doc of sectionsSnapshot.docs) {
      const sectionData = { id: doc.id, ...doc.data() };
      
      // Add computed fields
      sectionData.identifier = getSectionIdentifier(sectionData);
      sectionData.displayName = getSectionDisplayName(sectionData);
      sectionData.yearLevel = sectionData.year || sectionData.gradeLevel || 'Unknown';
      
      // Calculate enrollment percentage
      const enrollment = sectionData.currentEnrollment || 0;
      const capacity = sectionData.capacity || 1;
      sectionData.enrollmentPercentage = Math.round((enrollment / capacity) * 100);
      
      // Get actual student count
      try {
        const studentsQuery = query(
          collection(db, 'students'),
          where('sectionId', '==', doc.id)
        );
        const studentsSnapshot = await getDocs(studentsQuery);
        sectionData.actualStudentCount = studentsSnapshot.size;
        
        // Update enrollment if it's different
        if (sectionData.actualStudentCount !== enrollment) {
          sectionData.enrollmentMismatch = true;
        }
      } catch (error) {
        console.error(`Error counting students for section ${doc.id}:`, error);
        sectionData.actualStudentCount = enrollment;
      }
      
      sections.push(sectionData);
    }

    console.log(`✅ Processed ${sections.length} sections`);
    return sections;

  } catch (error) {
    console.error('Error getting sections data:', error);
    return [];
  }
};

/**
 * UPDATED: Get attendance reports with new schema support
 */
export const getAttendanceReports = async (dateRange, filters = {}) => {
  try {
    console.log('📈 Generating attendance reports for:', dateRange);
    
    const { startDate, endDate } = dateRange;
    const reports = [];
    
    // Get attendance data for date range
    const attendanceQuery = query(
      collection(db, 'attendance'),
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );
    
    const attendanceSnapshot = await getDocs(attendanceQuery);
    
    // Get sections for reference
    const sectionsSnapshot = await getDocs(collection(db, 'sections'));
    const sectionsMap = {};
    sectionsSnapshot.forEach(doc => {
      const sectionData = { id: doc.id, ...doc.data() };
      sectionData.identifier = getSectionIdentifier(sectionData);
      sectionData.displayName = getSectionDisplayName(sectionData);
      sectionsMap[doc.id] = sectionData;
    });
    
    // Process attendance records
    const attendanceBySection = {};
    
    attendanceSnapshot.forEach(doc => {
      const data = doc.data();
      
      // UPDATED: Handle section identification with new schema
      let sectionKey = 'unknown';
      let sectionDisplayName = 'Unknown Section';
      
      if (data.sectionId) {
        if (Array.isArray(data.sectionId)) {
          // Multi-section case
          sectionKey = data.sectionId.join('-');
          const sectionNames = data.sectionId
            .map(id => sectionsMap[id]?.identifier || id)
            .join(' + ');
          sectionDisplayName = sectionNames;
        } else {
          // Single section case
          sectionKey = data.sectionId;
          const sectionInfo = sectionsMap[data.sectionId];
          sectionDisplayName = sectionInfo?.displayName || sectionInfo?.identifier || data.sectionId;
        }
      }
      
      if (!attendanceBySection[sectionKey]) {
        attendanceBySection[sectionKey] = {
          sectionId: data.sectionId,
          sectionName: sectionDisplayName,
          isMultiSection: Array.isArray(data.sectionId),
          records: [],
          totalDays: 0,
          totalPresent: 0,
          totalAbsent: 0,
          totalLate: 0,
          totalExcused: 0,
          averageAttendanceRate: 0
        };
      }
      
      const sectionRecord = attendanceBySection[sectionKey];
      const students = data.students || {};
      const studentRecords = Object.values(students);
      
      const dayStats = {
        date: data.date,
        subject: data.subjectName || data.subject,
        totalStudents: studentRecords.length,
        present: studentRecords.filter(s => s.status === 'present').length,
        absent: studentRecords.filter(s => s.status === 'absent').length,
        late: studentRecords.filter(s => s.status === 'late').length,
        excused: studentRecords.filter(s => s.status === 'excused').length,
        attendanceRate: studentRecords.length > 0 ? 
          Math.round((studentRecords.filter(s => s.status === 'present').length / studentRecords.length) * 100) : 0
      };
      
      sectionRecord.records.push(dayStats);
      sectionRecord.totalDays++;
      sectionRecord.totalPresent += dayStats.present;
      sectionRecord.totalAbsent += dayStats.absent;
      sectionRecord.totalLate += dayStats.late;
      sectionRecord.totalExcused += dayStats.excused;
    });
    
    // Calculate averages and create final reports
    Object.values(attendanceBySection).forEach(sectionData => {
      if (sectionData.totalDays > 0) {
        const totalStudentDays = sectionData.totalPresent + sectionData.totalAbsent + 
                                sectionData.totalLate + sectionData.totalExcused;
        sectionData.averageAttendanceRate = totalStudentDays > 0 ? 
          Math.round((sectionData.totalPresent / totalStudentDays) * 100) : 0;
        
        // Apply filters
        let includeSection = true;
        
        if (filters.year) {
          // Extract year from section name or ID
          const sectionInfo = sectionsMap[sectionData.sectionId];
          const sectionYear = sectionInfo?.year || sectionInfo?.gradeLevel;
          if (sectionYear !== parseInt(filters.year)) {
            includeSection = false;
          }
        }
        
        if (filters.minAttendanceRate) {
          if (sectionData.averageAttendanceRate < filters.minAttendanceRate) {
            includeSection = false;
          }
        }
        
        if (includeSection) {
          reports.push(sectionData);
        }
      }
    });
    
    // Sort by attendance rate (lowest first to highlight issues)
    reports.sort((a, b) => a.averageAttendanceRate - b.averageAttendanceRate);
    
    console.log(`✅ Generated ${reports.length} attendance reports`);
    return reports;

  } catch (error) {
    console.error('Error generating attendance reports:', error);
    return [];
  }
};

/**
 * UPDATED: Get dashboard statistics with new schema support
 */
export const getDashboardStats = async () => {
  try {
    console.log('📊 Loading dashboard statistics...');
    
    const today = new Date().toISOString().split('T')[0];
    
    // Get today's attendance stats
    const todayStats = await getAttendanceStats(today);
    
    // Get total counts
    const [teachersData, studentsData, sectionsData] = await Promise.all([
      getTeachersData(),
      getStudentsData(),
      getSectionsData()
    ]);
    
    // Calculate additional stats
    const activeTeachers = teachersData.filter(t => t.status === 'active').length;
    const activeSections = sectionsData.filter(s => s.status !== 'inactive').length;
    const enrolledStudents = studentsData.filter(s => s.sectionId).length;
    const unassignedStudents = studentsData.filter(s => !s.sectionId).length;
    
    // UPDATED: Calculate year-wise distribution
    const yearDistribution = {};
    sectionsData.forEach(section => {
      const year = section.year || section.gradeLevel || 'Unknown';
      if (!yearDistribution[year]) {
        yearDistribution[year] = {
          year: year,
          sections: 0,
          students: 0,
          capacity: 0
        };
      }
      yearDistribution[year].sections++;
      yearDistribution[year].students += section.currentEnrollment || 0;
      yearDistribution[year].capacity += section.capacity || 0;
    });
    
    // Calculate overall enrollment rate
    const totalCapacity = sectionsData.reduce((sum, s) => sum + (s.capacity || 0), 0);
    const totalEnrollment = sectionsData.reduce((sum, s) => sum + (s.currentEnrollment || 0), 0);
    const overallEnrollmentRate = totalCapacity > 0 ? 
      Math.round((totalEnrollment / totalCapacity) * 100) : 0;
    
    const stats = {
      // Basic counts
      totalTeachers: teachersData.length,
      activeTeachers,
      totalSections: sectionsData.length,
      activeSections,
      totalStudents: studentsData.length,
      enrolledStudents,
      unassignedStudents,
      
      // Attendance (today)
      attendanceToday: todayStats.attendanceRate,
      attendanceRecordsToday: todayStats.totalRecords,
      studentsMarkedToday: todayStats.totalStudents,
      
      // Enrollment
      totalCapacity,
      totalEnrollment,
      overallEnrollmentRate,
      
      // Distribution
      yearDistribution: Object.values(yearDistribution),
      
      // Additional metrics
      averageSectionSize: activeSections > 0 ? Math.round(totalEnrollment / activeSections) : 0,
      teacherToStudentRatio: activeTeachers > 0 ? Math.round(enrolledStudents / activeTeachers) : 0,
      sectionUtilization: overallEnrollmentRate
    };
    
    console.log('✅ Dashboard statistics loaded:', stats);
    return stats;

  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    return {
      totalTeachers: 0,
      activeTeachers: 0,
      totalSections: 0,
      activeSections: 0,
      totalStudents: 0,
      enrolledStudents: 0,
      unassignedStudents: 0,
      attendanceToday: 0,
      attendanceRecordsToday: 0,
      studentsMarkedToday: 0,
      totalCapacity: 0,
      totalEnrollment: 0,
      overallEnrollmentRate: 0,
      yearDistribution: [],
      averageSectionSize: 0,
      teacherToStudentRatio: 0,
      sectionUtilization: 0
    };
  }
};

/**
 * UPDATED: Get recent activity with new schema formatting
 */
export const getRecentActivity = async (limit = 10) => {
  try {
    const activityQuery = query(
      collection(db, 'activityLog'),
      orderBy('timestamp', 'desc'),
      limit(limit)
    );
    
    const activitySnapshot = await getDocs(activityQuery);
    const activities = [];
    
    activitySnapshot.forEach(doc => {
      const activityData = { id: doc.id, ...doc.data() };
      
      // UPDATED: Format section names in descriptions for new schema
      if (activityData.description && activityData.sectionName) {
        // Update old format descriptions to new format if needed
        activityData.description = activityData.description.replace(
          /Grade \d+ - [A-Z]/g, 
          activityData.sectionName
        );
      }
      
      activities.push(activityData);
    });
    
    return activities;
  } catch (error) {
    console.error('Error getting recent activity:', error);
    return [];
  }
};

/**
 * UPDATED: Search functionality with new schema support
 */
export const searchData = async (searchTerm, type = 'all') => {
  try {
    const results = {
      teachers: [],
      students: [],
      sections: []
    };
    
    const searchLower = searchTerm.toLowerCase();
    
    if (type === 'all' || type === 'teachers') {
      const teachers = await getTeachersData();
      results.teachers = teachers.filter(teacher => 
        teacher.name?.toLowerCase().includes(searchLower) ||
        teacher.email?.toLowerCase().includes(searchLower) ||
        teacher.subjects?.some(subject => subject.toLowerCase().includes(searchLower))
      );
    }
    
    if (type === 'all' || type === 'students') {
      const students = await getStudentsData();
      results.students = students.filter(student => 
        student.firstName?.toLowerCase().includes(searchLower) ||
        student.lastName?.toLowerCase().includes(searchLower) ||
        student.email?.toLowerCase().includes(searchLower) ||
        student.studentId?.toLowerCase().includes(searchLower) ||
        student.sectionIdentifier?.toLowerCase().includes(searchLower)
      );
    }
    
    if (type === 'all' || type === 'sections') {
      const sections = await getSectionsData();
      results.sections = sections.filter(section => 
        section.identifier?.toLowerCase().includes(searchLower) ||
        section.displayName?.toLowerCase().includes(searchLower) ||
        section.yearLevel?.toString().includes(searchLower)
      );
    }
    
    return results;
  } catch (error) {
    console.error('Error searching data:', error);
    return { teachers: [], students: [], sections: [] };
  }
};

// Export all functions
export default {
  getAttendanceData,
  getAttendanceStats,
  getTeachersData,
  getStudentsData,
  getSectionsData,
  getAttendanceReports,
  getDashboardStats,
  getRecentActivity,
  searchData,
  getSectionIdentifier,
  getSectionDisplayName
};