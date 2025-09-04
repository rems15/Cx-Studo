// src/services/studentFilteringService.js - TARGETED FIX
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

/**
 * TARGETED FIX for Music enrollment issue
 * Based on the student data structure shown in the console
 */
export class StudentFilteringService {
  
  /**
   * Get students for a specific section and subject - FIXED VERSION
   */
  static async getStudentsForSubjectSection(sectionId, subject, isHomeroomSection = false) {
    try {
      console.log(`🔍 FILTERING: Section ${sectionId}, Subject: ${subject}`);
      
      // Get all students in the section first
      const allSectionStudents = await this.getAllSectionStudents(sectionId);
      console.log(`📋 Found ${allSectionStudents.length} total students in section`);
      
      if (allSectionStudents.length === 0) {
        console.warn(`❌ No students found in section ${sectionId}`);
        return [];
      }

      // For homeroom, return all students
      if (subject === 'Homeroom' || isHomeroomSection) {
        console.log(`🏠 Homeroom mode: returning all ${allSectionStudents.length} students`);
        return allSectionStudents;
      }

      // FOR SUBJECT CLASSES - Apply the fixed filtering logic
      console.log(`🎯 Filtering for subject: ${subject}`);
      console.log(`📊 Sample student data:`, allSectionStudents[0]);
      
      const filteredStudents = this.applyEnhancedSubjectFilter(allSectionStudents, subject);
      
      console.log(`✅ Filtered result: ${filteredStudents.length} students enrolled in ${subject}`);
      
      // If no students found, log detailed debug info
      if (filteredStudents.length === 0) {
        console.group(`🔍 DEBUG: No students found for ${subject}`);
        this.debugEnrollmentData(allSectionStudents, subject);
        console.groupEnd();
      }

      return filteredStudents;

    } catch (error) {
      console.error('❌ Error in getStudentsForSubjectSection:', error);
      return [];
    }
  }

  static async getStudentsForMultiSection(sectionIds, subject, isHomeroomSection = false) {
  try {
    console.log(`🔍 MULTI-SECTION FILTERING: ${sectionIds.length} sections for ${subject}`);
    
    let allStudents = [];
    
    // Get students from ALL section IDs
    for (const sectionId of sectionIds) {
      const sectionStudents = await this.getStudentsForSubjectSection(sectionId, subject, isHomeroomSection);
      console.log(`  📋 Section ${sectionId}: ${sectionStudents.length} students`);
      allStudents.push(...sectionStudents);
    }
    
    // Remove duplicates (in case a student is in multiple sections)
    const uniqueStudents = allStudents.filter((student, index, self) => 
      index === self.findIndex(s => s.id === student.id)
    );
    
    console.log(`✅ Multi-section result: ${uniqueStudents.length} unique students`);
    return uniqueStudents;
    
  } catch (error) {
    console.error('❌ Error in multi-section filtering:', error);
    return [];
  }
}

  /**
   * ENHANCED subject filtering that handles your exact data structure
   */
  static applyEnhancedSubjectFilter(students, targetSubject) {
    console.log(`🔍 Applying enhanced filter for: ${targetSubject}`);
    
    const enrolledStudents = students.filter(student => {
      const studentName = `${student.firstName} ${student.lastName}`;
      console.log(`\n👤 Checking student: ${studentName}`);
      
      // Strategy 1: Check subjectEnrollments array (MOST COMMON)
      if (student.subjectEnrollments && Array.isArray(student.subjectEnrollments)) {
        console.log(`  📚 subjectEnrollments:`, student.subjectEnrollments);
        
        const enrolledInSubject = student.subjectEnrollments.some(enrollment => {
          const subjectName = enrollment.subjectName || enrollment.subject || enrollment.name;
          console.log(`    🔍 Checking enrollment subject: "${subjectName}" vs target: "${targetSubject}"`);
          
          if (subjectName) {
            const match = this.compareSubjectNames(subjectName, targetSubject);
            if (match) {
              console.log(`    ✅ MATCH FOUND in subjectEnrollments!`);
              return true;
            }
          }
          return false;
        });
        
        if (enrolledInSubject) {
          console.log(`  ✅ ${studentName} enrolled via subjectEnrollments`);
          return true;
        }
      }

      // Strategy 2: Check selectedSubjects array (ID-based enrollment)
      if (student.selectedSubjects && Array.isArray(student.selectedSubjects)) {
        console.log(`  🎯 selectedSubjects (IDs):`, student.selectedSubjects);
        
        // This requires looking up subject IDs, but for now we'll do a basic check
        // In your case, Music might be stored as an ID like "6M9C4xNHX2EhnUmv5VH"
        const hasSelectedSubjects = student.selectedSubjects.length > 0;
        if (hasSelectedSubjects) {
          console.log(`  📝 Student has selectedSubjects - will check against subject database`);
          // We'll enhance this in the next step to resolve IDs to names
        }
      }

      // Strategy 3: Check direct subjects array (name-based)
      if (student.subjects && Array.isArray(student.subjects)) {
        console.log(`  📋 subjects array:`, student.subjects);
        
        const enrolledInSubject = student.subjects.some(subjectName => {
          const match = this.compareSubjectNames(subjectName, targetSubject);
          if (match) {
            console.log(`    ✅ MATCH FOUND in subjects array!`);
            return true;
          }
          return false;
        });
        
        if (enrolledInSubject) {
          console.log(`  ✅ ${studentName} enrolled via subjects array`);
          return true;
        }
      }

      // Strategy 4: Check direct subject field
      if (student.subject) {
        console.log(`  📖 direct subject field: "${student.subject}"`);
        
        const match = this.compareSubjectNames(student.subject, targetSubject);
        if (match) {
          console.log(`  ✅ ${studentName} enrolled via direct subject field`);
          return true;
        }
      }

      console.log(`  ❌ ${studentName} NOT enrolled in ${targetSubject}`);
      return false;
    });

    console.log(`🎯 Filter result: ${enrolledStudents.length}/${students.length} students enrolled`);
    return enrolledStudents;
  }

  /**
   * ENHANCED subject name comparison
   */
  static compareSubjectNames(subject1, subject2) {
    if (!subject1 || !subject2) return false;
    
    const normalize = (str) => str.toString().toLowerCase().trim().replace(/\s+/g, ' ');
    const normalized1 = normalize(subject1);
    const normalized2 = normalize(subject2);
    
    console.log(`    🔄 Comparing: "${normalized1}" === "${normalized2}"`);
    return normalized1 === normalized2;
  }

  /**
   * Get all students in a section
   */
  static async getAllSectionStudents(sectionId) {
    try {
      const studentsQuery = query(
        collection(db, 'students'), 
        where('sectionId', '==', sectionId)
      );
      
      const studentsSnapshot = await getDocs(studentsQuery);
      const students = [];
      
      studentsSnapshot.forEach(doc => {
        const studentData = { id: doc.id, ...doc.data() };
        students.push(studentData);
      });

      return students;
    } catch (error) {
      console.error('❌ Error getting section students:', error);
      return [];
    }
  }

  /**
   * Debug function to analyze enrollment patterns
   */
  static debugEnrollmentData(students, targetSubject) {
    console.log(`\n🔍 ENROLLMENT DEBUG for ${targetSubject}:`);
    console.log(`👥 Total students: ${students.length}`);
    
    students.forEach((student, index) => {
      console.log(`\n👤 Student ${index + 1}: ${student.firstName} ${student.lastName}`);
      console.log(`  📧 Email: ${student.email}`);
      console.log(`  🆔 ID: ${student.studentId}`);
      console.log(`  🎓 Grade: ${student.gradeLevel}`);
      console.log(`  🏫 Section: ${student.sectionName}`);
      
      console.log(`  📚 Enrollment Data:`);
      console.log(`    - subjectEnrollments:`, student.subjectEnrollments);
      console.log(`    - selectedSubjects:`, student.selectedSubjects);  
      console.log(`    - subjects:`, student.subjects);
      console.log(`    - subject:`, student.subject);
      
      // Check each field for target subject
      let foundIn = [];
      
      if (student.subjectEnrollments?.some(e => 
        this.compareSubjectNames(e.subjectName || e.subject, targetSubject))) {
        foundIn.push('subjectEnrollments');
      }
      
      if (student.subjects?.some(s => this.compareSubjectNames(s, targetSubject))) {
        foundIn.push('subjects array');
      }
      
      if (this.compareSubjectNames(student.subject, targetSubject)) {
        foundIn.push('direct subject');
      }
      
      console.log(`  🎯 Found "${targetSubject}" in: [${foundIn.join(', ')}]`);
    });
  }

  /**
   * Enhanced version that resolves subject IDs to names
   * This will be called if the basic filtering fails
   */
  static async getStudentsWithIdResolution(sectionId, subject, isHomeroomSection = false) {
    try {
      console.log(`🔍 ID RESOLUTION: Checking ${subject} with ID lookup`);
      
      // Get all students
      const allStudents = await this.getAllSectionStudents(sectionId);
      
      // Get all subjects to create ID-to-name mapping
      const subjectsMap = await this.getSubjectsMapping();
      console.log(`📖 Subjects mapping:`, subjectsMap);
      
      const enrolledStudents = allStudents.filter(student => {
        // Check selectedSubjects with ID resolution
        if (student.selectedSubjects && Array.isArray(student.selectedSubjects)) {
          const resolvedSubjects = student.selectedSubjects.map(id => subjectsMap[id]).filter(Boolean);
          console.log(`👤 ${student.firstName}: selectedSubjects resolved to:`, resolvedSubjects);
          
          if (resolvedSubjects.some(name => this.compareSubjectNames(name, subject))) {
            return true;
          }
        }
        
        return false;
      });
      
      console.log(`✅ ID Resolution result: ${enrolledStudents.length} students`);
      return enrolledStudents;
      
    } catch (error) {
      console.error('❌ Error in ID resolution:', error);
      return [];
    }
  }

  /**
   * Get subjects ID-to-name mapping
   */
  static async getSubjectsMapping() {
    try {
      const subjectsSnapshot = await getDocs(collection(db, 'subjects'));
      const mapping = {};
      
      subjectsSnapshot.forEach(doc => {
        const data = doc.data();
        mapping[doc.id] = data.name;
      });
      
      return mapping;
    } catch (error) {
      console.error('❌ Error getting subjects mapping:', error);
      return {};
    }
  }
}

/**
 * MAIN EXPORT - Enhanced version with fallback strategies
 */
export const filterStudentsBySubject = async (subject, sectionId, isHomeroomSection = false) => {
  console.log(`\n🚀 STARTING ENHANCED STUDENT FILTERING`);
  console.log(`📋 Section: ${sectionId}`);
  console.log(`📚 Subject: ${subject}`);
  console.log(`🏠 Is Homeroom: ${isHomeroomSection}`);
  
  // Try basic filtering first
  let students = await StudentFilteringService.getStudentsForSubjectSection(
    sectionId, 
    subject, 
    isHomeroomSection
  );
  
  // If no students found and it's not homeroom, try ID resolution
  if (students.length === 0 && !isHomeroomSection && subject !== 'Homeroom') {
    console.log(`🔄 No students found with basic filtering, trying ID resolution...`);
    students = await StudentFilteringService.getStudentsWithIdResolution(
      sectionId, 
      subject, 
      isHomeroomSection
    );
  }
  
  console.log(`\n🎯 FINAL RESULT: ${students.length} students enrolled in ${subject}`);
  return students;
};