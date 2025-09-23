// database.js - UPDATED FOR NEW SCHEMA (removed name, sectionName; gradeLevel → year)
import { getDoc, limit } from 'firebase/firestore';
import { 
  collection, 
  getDocs, 
  doc, 
  deleteDoc, 
  updateDoc, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  where,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

// UPDATED: Helper function to get section identifier
const getSectionIdentifier = (section) => {
  const year = section.year || section.gradeLevel || 'N/A';
  const sectionLetter = section.section || section.sectionName || 'X';
  return `${year}-${sectionLetter}`;
};

// TEACHER FUNCTIONS (Enhanced with new schema support)
export const getAllTeachers = async () => {
  const usersSnapshot = await getDocs(collection(db, 'users'));
  const teachersData = [];
  usersSnapshot.forEach(doc => {
    const userData = doc.data();
    if (userData.roles?.includes('homeroom') || userData.roles?.includes('subject')) {
      teachersData.push({
        id: doc.id,
        ...userData
      });
    }
  });
  return teachersData;
};

// Get all users (not just teachers) - for admin user management
export const getAllUsers = async () => {
  const usersSnapshot = await getDocs(collection(db, 'users'));
  const usersData = [];
  usersSnapshot.forEach(doc => {
    usersData.push({
      id: doc.id,
      ...doc.data()
    });
  });
  return usersData;
};

export const deleteTeacher = async (teacherId) => {
  await deleteDoc(doc(db, 'users', teacherId));
};

export const deleteUser = async (userId) => {
  await deleteDoc(doc(db, 'users', userId));
};

export const toggleTeacherStatus = async (teacherId, newStatus) => {
  await updateDoc(doc(db, 'users', teacherId), {
    status: newStatus,
    updatedAt: serverTimestamp()
  });
};

export const toggleUserStatus = async (userId, newStatus) => {
  await updateDoc(doc(db, 'users', userId), {
    status: newStatus,
    updatedAt: serverTimestamp()
  });
};

export const resetTeacherPassword = async (teacherId) => {
  await updateDoc(doc(db, 'users', teacherId), {
    mustChangePassword: true,
    passwordChanged: false,
    passwordResetAt: new Date().toISOString(),
    updatedAt: serverTimestamp()
  });
};

export const resetUserPassword = async (userId, resetBy = 'Admin') => {
  await updateDoc(doc(db, 'users', userId), {
    mustChangePassword: true,
    passwordChanged: false,
    passwordResetAt: new Date().toISOString(),
    passwordResetBy: resetBy,
    updatedAt: serverTimestamp()
  });
};

// SECTION FUNCTIONS (UPDATED for new schema)
export const getAllSections = async () => {
  const sectionsSnapshot = await getDocs(collection(db, 'sections'));
  const sectionsData = [];
  sectionsSnapshot.forEach(doc => {
    const sectionData = { id: doc.id, ...doc.data() };
    // UPDATED: Add computed identifier for backward compatibility
    sectionData.identifier = getSectionIdentifier(sectionData);
    sectionsData.push(sectionData);
  });
  return sectionsData;
};

export const deleteSection = async (sectionId) => {
  await deleteDoc(doc(db, 'sections', sectionId));
};

// UPDATED: Update section details with new schema
export const updateSection = async (sectionId, sectionData) => {
  // Remove old fields if they exist in the update data
  const { name, sectionName, gradeLevel, ...cleanData } = sectionData;
  
  // Ensure we're using the new schema fields
  const updatedData = {
    ...cleanData,
    updatedAt: serverTimestamp()
  };
  
  // Map old field names to new ones if provided
  if (gradeLevel && !cleanData.year) {
    updatedData.year = parseInt(gradeLevel);
  }
  
  await updateDoc(doc(db, 'sections', sectionId), updatedData);
};

// UPDATED: Get students by section with new schema support
export const getStudentsBySection = async (sectionId) => {
  const studentsQuery = query(
    collection(db, 'students'),
    where('sectionId', '==', sectionId)
  );
  const studentsSnapshot = await getDocs(studentsQuery);
  const studentsData = [];
  studentsSnapshot.forEach(doc => {
    studentsData.push({
      id: doc.id,
      ...doc.data()
    });
  });
  return studentsData;
};

// UPDATED: Get available students with new schema (using year instead of gradeLevel)
export const getAvailableStudents = async (yearLevel) => {
  const studentsQuery = query(
    collection(db, 'students'),
    where('year', '==', yearLevel)
  );
  
  let studentsSnapshot;
  try {
    studentsSnapshot = await getDocs(studentsQuery);
  } catch (error) {
    // Fallback to old gradeLevel field for backward compatibility
    console.log('Trying fallback to gradeLevel field...');
    const fallbackQuery = query(
      collection(db, 'students'),
      where('gradeLevel', '==', yearLevel)
    );
    studentsSnapshot = await getDocs(fallbackQuery);
  }
  
  const studentsData = [];
  studentsSnapshot.forEach(doc => {
    const studentData = doc.data();
    studentsData.push({
      id: doc.id,
      ...studentData
    });
  });
  return studentsData;
};

// Enroll students to section
export const enrollStudentsToSection = async (sectionId, studentIds) => {
  const promises = studentIds.map(studentId => 
    updateDoc(doc(db, 'students', studentId), {
      sectionId: sectionId,
      updatedAt: serverTimestamp()
    })
  );
  await Promise.all(promises);
  
  // Update section enrollment count
  const currentStudents = await getStudentsBySection(sectionId);
  await updateDoc(doc(db, 'sections', sectionId), {
    currentEnrollment: currentStudents.length,
    updatedAt: serverTimestamp()
  });
};

// Remove students from section
export const removeStudentsFromSection = async (studentIds) => {
  const promises = studentIds.map(studentId => 
    updateDoc(doc(db, 'students', studentId), {
      sectionId: null,
      updatedAt: serverTimestamp()
    })
  );
  await Promise.all(promises);
};

// STUDENT FUNCTIONS (Enhanced with new schema support)
export const getAllStudents = async () => {
  const studentsSnapshot = await getDocs(collection(db, 'students'));
  const studentsData = [];
  studentsSnapshot.forEach(doc => {
    const studentData = { id: doc.id, ...doc.data() };
    // UPDATED: Ensure year field is available (fallback to gradeLevel)
    if (!studentData.year && studentData.gradeLevel) {
      studentData.year = studentData.gradeLevel;
    }
    studentsData.push(studentData);
  });
  return studentsData;
};

export const deleteStudent = async (studentId) => {
  await deleteDoc(doc(db, 'students', studentId));
};

// UPDATED: Update student details with new schema
export const updateStudent = async (studentId, studentData) => {
  // Remove old fields if they exist in the update data
  const { gradeLevel, ...cleanData } = studentData;
  
  // Ensure we're using the new schema fields
  const updatedData = {
    ...cleanData,
    updatedAt: serverTimestamp()
  };
  
  // Map old field names to new ones if provided
  if (gradeLevel && !cleanData.year) {
    updatedData.year = parseInt(gradeLevel);
  }
  
  await updateDoc(doc(db, 'students', studentId), updatedData);
};

// SUBJECT FUNCTIONS (Unchanged)
export const getAllSubjects = async () => {
  const subjectsSnapshot = await getDocs(collection(db, 'subjects'));
  const subjectsData = [];
  subjectsSnapshot.forEach(doc => {
    subjectsData.push({
      id: doc.id,
      ...doc.data()
    });
  });
  return subjectsData;
};

export const deleteSubject = async (subjectId) => {
  await deleteDoc(doc(db, 'subjects', subjectId));
};

export const updateSubject = async (subjectId, subjectData) => {
  await updateDoc(doc(db, 'subjects', subjectId), {
    ...subjectData,
    updatedAt: serverTimestamp()
  });
};

// REAL-TIME LISTENERS (UPDATED for new schema)
export const setupUsersListener = (setUsers) => {
  return onSnapshot(collection(db, 'users'), (snapshot) => {
    const usersData = [];
    snapshot.forEach(doc => {
      usersData.push({
        id: doc.id,
        ...doc.data()
      });
    });
    setUsers(usersData);
  });
};

export const setupSectionsListener = (setSections) => {
  return onSnapshot(collection(db, 'sections'), (snapshot) => {
    const sectionsData = [];
    snapshot.forEach(doc => {
      const sectionData = { id: doc.id, ...doc.data() };
      // UPDATED: Add computed identifier for backward compatibility
      sectionData.identifier = getSectionIdentifier(sectionData);
      sectionsData.push(sectionData);
    });
    setSections(sectionsData);
  });
};

export const setupStudentsListener = (setStudents) => {
  return onSnapshot(collection(db, 'students'), (snapshot) => {
    const studentsData = [];
    snapshot.forEach(doc => {
      const studentData = { id: doc.id, ...doc.data() };
      // UPDATED: Ensure year field is available (fallback to gradeLevel)
      if (!studentData.year && studentData.gradeLevel) {
        studentData.year = studentData.gradeLevel;
      }
      studentsData.push(studentData);
    });
    setStudents(studentsData);
  });
};

export const setupSubjectsListener = (setSubjects) => {
  return onSnapshot(collection(db, 'subjects'), (snapshot) => {
    const subjectsData = [];
    snapshot.forEach(doc => {
      subjectsData.push({
        id: doc.id,
        ...doc.data()
      });
    });
    setSubjects(subjectsData);
  });
};

// ACTIVITY LOGGING (Unchanged)
export const logActivity = async (action, description, performedBy = 'System') => {
  try {
    await addDoc(collection(db, 'activityLog'), {
      action,
      description,
      performedBy,
      timestamp: new Date().toISOString(),
      severity: 'info'
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};

// UPDATED: Get recent activity with section name formatting
export const getRecentActivity = async (limitCount = 10) => {
  try {
    const activityQuery = query(
      collection(db, 'activityLog'),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    
    const activitySnapshot = await getDocs(activityQuery);
    const activities = [];
    
    activitySnapshot.forEach(doc => {
      const activityData = { id: doc.id, ...doc.data() };
      
      // UPDATED: Format section names in activity descriptions
      if (activityData.sectionName && activityData.sectionName.includes('-')) {
        // Already in new format, no changes needed
      } else if (activityData.sectionId) {
        // Try to get section data and update description
        // This would require an additional query, so we'll leave as-is for now
      }
      
      activities.push(activityData);
    });
    
    return activities;
  } catch (error) {
    console.error('Error getting recent activity:', error);
    return [];
  }
};

// UPDATED: Statistics functions with new schema support
export const getSectionStatistics = async () => {
  try {
    const sections = await getAllSections();
    const students = await getAllStudents();
    
    // UPDATED: Group by year instead of gradeLevel
    const yearGroups = {};
    sections.forEach(section => {
      const year = section.year || section.gradeLevel || 'Unknown';
      if (!yearGroups[year]) {
        yearGroups[year] = {
          year: year,
          sections: 0,
          totalCapacity: 0,
          totalEnrollment: 0
        };
      }
      yearGroups[year].sections++;
      yearGroups[year].totalCapacity += section.capacity || 0;
      yearGroups[year].totalEnrollment += section.currentEnrollment || 0;
    });
    
    return {
      totalSections: sections.length,
      totalStudents: students.length,
      totalCapacity: sections.reduce((sum, s) => sum + (s.capacity || 0), 0),
      totalEnrollment: sections.reduce((sum, s) => sum + (s.currentEnrollment || 0), 0),
      yearGroups: Object.values(yearGroups)
    };
  } catch (error) {
    console.error('Error getting section statistics:', error);
    return {
      totalSections: 0,
      totalStudents: 0,
      totalCapacity: 0,
      totalEnrollment: 0,
      yearGroups: []
    };
  }
};

// UPDATED: Search functions with new schema support
export const searchSections = async (searchTerm, filters = {}) => {
  try {
    let sectionsQuery = collection(db, 'sections');
    
    // Apply year filter if provided
    if (filters.year) {
      sectionsQuery = query(sectionsQuery, where('year', '==', parseInt(filters.year)));
    }
    
    const sectionsSnapshot = await getDocs(sectionsQuery);
    let sections = [];
    
    sectionsSnapshot.forEach(doc => {
      const sectionData = { id: doc.id, ...doc.data() };
      sectionData.identifier = getSectionIdentifier(sectionData);
      sections.push(sectionData);
    });
    
    // Apply text search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      sections = sections.filter(section => 
        section.identifier.toLowerCase().includes(searchLower) ||
        (section.room && section.room.toLowerCase().includes(searchLower))
      );
    }
    
    // Apply status filter
    if (filters.status) {
      sections = sections.filter(section => section.status === filters.status);
    }
    
    return sections;
  } catch (error) {
    console.error('Error searching sections:', error);
    return [];
  }
};

// UPDATED: Bulk operations with new schema support
export const bulkUpdateSections = async (sectionIds, updateData) => {
  try {
    const promises = sectionIds.map(sectionId => {
      // Remove old fields from update data
      const { name, sectionName, gradeLevel, ...cleanData } = updateData;
      
      const updatedData = {
        ...cleanData,
        updatedAt: serverTimestamp()
      };
      
      // Map old field names to new ones if provided
      if (gradeLevel && !cleanData.year) {
        updatedData.year = parseInt(gradeLevel);
      }
      
      return updateDoc(doc(db, 'sections', sectionId), updatedData);
    });
    
    await Promise.all(promises);
    return { success: true };
  } catch (error) {
    console.error('Error in bulk update:', error);
    return { success: false, error: error.message };
  }
};

export const bulkDeleteSections = async (sectionIds) => {
  try {
    const promises = sectionIds.map(sectionId => deleteDoc(doc(db, 'sections', sectionId)));
    await Promise.all(promises);
    return { success: true };
  } catch (error) {
    console.error('Error in bulk delete:', error);
    return { success: false, error: error.message };
  }
};

// Export all functions
export default {
  // Teachers
  getAllTeachers,
  getAllUsers,
  deleteTeacher,
  deleteUser,
  toggleTeacherStatus,
  toggleUserStatus,
  resetTeacherPassword,
  resetUserPassword,
  
  // Sections
  getAllSections,
  deleteSection,
  updateSection,
  getStudentsBySection,
  getAvailableStudents,
  enrollStudentsToSection,
  removeStudentsFromSection,
  
  // Students
  getAllStudents,
  deleteStudent,
  updateStudent,
  
  // Subjects
  getAllSubjects,
  deleteSubject,
  updateSubject,
  
  // Listeners
  setupUsersListener,
  setupSectionsListener,
  setupStudentsListener,
  setupSubjectsListener,
  
  // Activity & Stats
  logActivity,
  getRecentActivity,
  getSectionStatistics,
  searchSections,
  bulkUpdateSections,
  bulkDeleteSections,
  
  // Helpers
  getSectionIdentifier
};