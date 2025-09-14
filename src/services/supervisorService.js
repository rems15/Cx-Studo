// src/services/supervisor/supervisorService.js
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  where, 
  limit 
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Get supervisor dashboard statistics
 */
export const getSupervisorStats = async () => {
  try {
    console.log('🔍 Loading supervisor stats...');

    // Get teachers count
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const teachers = [];
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      if (userData.roles?.includes('homeroom') || userData.roles?.includes('subject')) {
        teachers.push({ id: doc.id, ...userData });
      }
    });

    const activeTeachers = teachers.filter(t => t.status === 'active').length;

    // Get sections count
    let totalSections = 0;
    try {
      const sectionsSnapshot = await getDocs(collection(db, 'sections'));
      totalSections = sectionsSnapshot.size;
    } catch (error) {
      console.log('No sections collection found');
    }

    // Get students count
    let totalStudents = 0;
    try {
      const studentsSnapshot = await getDocs(collection(db, 'students'));
      totalStudents = studentsSnapshot.size;
    } catch (error) {
      console.log('No students collection found');
    }

    // Get today's attendance rate
    const today = new Date().toISOString().split('T')[0];
    const attendanceToday = await calculateTodayAttendanceRate(today);

    return {
      totalTeachers: teachers.length,
      activeTeachers,
      totalSections,
      totalStudents,
      attendanceToday
    };

  } catch (error) {
    console.error('Error getting supervisor stats:', error);
    return {
      totalTeachers: 0,
      activeTeachers: 0,
      totalSections: 0,
      totalStudents: 0,
      attendanceToday: 0
    };
  }
};

/**
 * Get recent activity for supervisor dashboard
 */
export const getRecentActivity = async () => {
  try {
    console.log('🔍 Loading recent activity...');

    // Get recent attendance submissions
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const recentDates = [today, yesterday];
    const activities = [];

    for (const date of recentDates) {
      const attendanceQuery = query(
        collection(db, 'attendance'),
        where('date', '==', date),
        orderBy('timestamp', 'desc'),
        limit(10)
      );

      try {
        const snapshot = await getDocs(attendanceQuery);
        snapshot.forEach(doc => {
          const data = doc.data();
          activities.push({
            action: 'attendance_taken',
            description: `Attendance taken for ${data.isHomeroom ? 'Homeroom' : data.subjectName} - ${data.sectionName}`,
            performedBy: data.takenBy || 'Unknown',
            timestamp: data.timestamp ? new Date(data.timestamp).toLocaleString() : new Date().toLocaleString(),
            type: 'attendance'
          });
        });
      } catch (error) {
        console.log(`No attendance found for ${date}`);
      }
    }

    // Sort by timestamp (most recent first)
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return activities.slice(0, 15); // Return top 15 recent activities

  } catch (error) {
    console.error('Error getting recent activity:', error);
    return [];
  }
};

/**
 * Get attendance data for a specific date
 */
export const getAttendanceData = async (selectedDate) => {
  try {
    console.log('🔍 Loading attendance data for:', selectedDate);

    const attendanceQuery = query(
      collection(db, 'attendance'),
      where('date', '==', selectedDate)
    );

    const snapshot = await getDocs(attendanceQuery);
    const attendanceRecords = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      
      if (data.students && Array.isArray(data.students) && data.students.length > 0) {
        const totalStudents = data.students.length;
        const presentCount = data.students.filter(s => s.status === 'present').length;
        const absentCount = data.students.filter(s => s.status === 'absent').length;
        const lateCount = data.students.filter(s => s.status === 'late').length;
        const excusedCount = data.students.filter(s => s.status === 'excused').length;
        
        const attendanceRate = totalStudents > 0 ? 
          Math.round((presentCount / totalStudents) * 100) : 0;

        attendanceRecords.push({
          id: doc.id,
          sectionName: data.sectionName || 'Unknown Section',
          subjectName: data.subjectName || 'Unknown Subject',
          isHomeroom: data.isHomeroom || false,
          takenBy: data.takenBy || 'Unknown',
          time: data.timestamp || data.time,
          totalStudents,
          presentCount,
          absentCount,
          lateCount,
          excusedCount,
          attendanceRate,
          students: data.students
        });
      }
    });

    return attendanceRecords;

  } catch (error) {
    console.error('Error getting attendance data:', error);
    return [];
  }
};

/**
 * Get attendance statistics for a specific date
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
      attendanceRate
    };

  } catch (error) {
    console.error('Error getting attendance stats:', error);
    return {
      totalPresent: 0,
      totalAbsent: 0,
      totalLate: 0,
      totalExcused: 0,
      attendanceRate: 0
    };
  }
};

/**
 * Get teachers data with sections and subjects
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
        sections.push({ id: doc.id, ...doc.data() });
      });
    } catch (error) {
      console.log('No sections collection found');
    }

    return { teachers, sections };

  } catch (error) {
    console.error('Error getting teachers data:', error);
    return { teachers: [], sections: [] };
  }
};

/**
 * Get reports data for a date range
 */
export const getReportsData = async (startDate, endDate) => {
  try {
    console.log('🔍 Loading reports data from', startDate, 'to', endDate);

    // Generate date range
    const dates = getDatesBetween(startDate, endDate);
    
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;
    let totalExcused = 0;
    let totalRecords = 0;

    const sectionStats = {};
    const teacherStats = {};

    // Process each date
    for (const date of dates) {
      const dayData = await getAttendanceData(date);
      
              dayData.forEach(record => {
        // Overall stats
        totalPresent += record.presentCount;
        totalAbsent += record.absentCount;
        totalLate += record.lateCount;
        totalExcused += record.excusedCount;
        totalRecords++;

        // Section stats
        const sectionKey = record.sectionName;
        if (!sectionStats[sectionKey]) {
          sectionStats[sectionKey] = {
            sectionName: record.sectionName,
            totalPresent: 0,
            totalStudents: 0,
            records: 0
          };
        }
        sectionStats[sectionKey].totalPresent += record.presentCount;
        sectionStats[sectionKey].totalStudents += record.totalStudents;
        sectionStats[sectionKey].records++;

        // Teacher stats
        const teacherKey = record.takenBy;
        if (teacherKey && teacherKey !== 'Unknown') {
          if (!teacherStats[teacherKey]) {
            teacherStats[teacherKey] = {
              teacherName: record.takenBy,
              totalPresent: 0,
              totalStudents: 0,
              classCount: 0
            };
          }
          teacherStats[teacherKey].totalPresent += record.presentCount;
          teacherStats[teacherKey].totalStudents += record.totalStudents;
          teacherStats[teacherKey].classCount++;
        }
      });
    }

    // Calculate averages and rates
    const totalStudents = totalPresent + totalAbsent + totalLate + totalExcused;
    const averageAttendance = totalStudents > 0 ? 
      Math.round((totalPresent / totalStudents) * 100) : 0;

    // Process section reports
    const sectionReports = Object.values(sectionStats).map(section => {
      const attendanceRate = section.totalStudents > 0 ? 
        Math.round((section.totalPresent / section.totalStudents) * 100) : 0;
      
      return {
        ...section,
        attendanceRate,
        trend: Math.random() > 0.5 ? 'up' : 'down' // TODO: Calculate actual trend
      };
    }).sort((a, b) => b.attendanceRate - a.attendanceRate);

    // Process teacher reports
    const teacherReports = Object.values(teacherStats).map(teacher => {
      const averageRate = teacher.totalStudents > 0 ? 
        Math.round((teacher.totalPresent / teacher.totalStudents) * 100) : 0;
      
      return {
        ...teacher,
        averageRate
      };
    }).sort((a, b) => b.averageRate - a.averageRate);

    return {
      monthlyStats: {
        averageAttendance,
        totalPresent,
        totalAbsent,
        totalLate,
        totalExcused
      },
      sectionReports,
      teacherReports
    };

  } catch (error) {
    console.error('Error getting reports data:', error);
    return {
      monthlyStats: {
        averageAttendance: 0,
        totalPresent: 0,
        totalAbsent: 0,
        totalLate: 0,
        totalExcused: 0
      },
      sectionReports: [],
      teacherReports: []
    };
  }
};

/**
 * Get attendance trends for a date range
 */
export const getAttendanceTrends = async (startDate, endDate) => {
  try {
    console.log('🔍 Loading attendance trends from', startDate, 'to', endDate);

    const dates = getDatesBetween(startDate, endDate);
    const trends = [];

    for (const date of dates) {
      const dayData = await getAttendanceData(date);
      
      let present = 0;
      let absent = 0;
      let late = 0;
      let totalStudents = 0;

      dayData.forEach(record => {
        present += record.presentCount;
        absent += record.absentCount;
        late += record.lateCount;
        totalStudents += record.totalStudents;
      });

      const attendanceRate = totalStudents > 0 ? 
        Math.round((present / totalStudents) * 100) : 0;

      trends.push({
        date,
        present,
        absent,
        late,
        totalStudents,
        attendanceRate,
        trendDirection: trends.length > 0 ? 
          (attendanceRate > trends[trends.length - 1].attendanceRate ? 'up' : 
           attendanceRate < trends[trends.length - 1].attendanceRate ? 'down' : 'same') : 'same'
      });
    }

    return trends;

  } catch (error) {
    console.error('Error getting attendance trends:', error);
    return [];
  }
};

// Helper functions

/**
 * Calculate today's attendance rate
 */
const calculateTodayAttendanceRate = async (date) => {
  try {
    const attendanceData = await getAttendanceData(date);
    const stats = await getAttendanceStats(date);
    return stats.attendanceRate;
  } catch (error) {
    return 0;
  }
};

/**
 * Get array of dates between start and end date
 */
const getDatesBetween = (startDate, endDate) => {
  const dates = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    dates.push(new Date(date).toISOString().split('T')[0]);
  }
  
  return dates;
};