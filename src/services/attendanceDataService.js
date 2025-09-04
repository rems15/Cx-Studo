// src/services/attendanceDataService.js - FINAL FIX FOR BEHAVIOR FLAGS
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { StudentFilteringService } from './studentFilteringService';

/**
 * Enhanced Attendance Data Service - WITH COMPLETE BEHAVIOR FLAG SUPPORT
 */
export class AttendanceDataService {
  
  /**
   * Load attendance data for a specific section and subject
   */
static async loadAttendanceData(section, currentUser, isFirebaseVersion = true) {
  try {
    console.group('🔍 SECTION OBJECT DEBUG');
    console.log('Full section object:', section);
    console.log('section.id:', section.id);
    console.log('section.sectionId:', section.sectionId);
    console.log('section.subject:', section.subject);
    console.log('section.isMultiSection:', section.isMultiSection);
    console.log('section.actualSectionIds:', section.actualSectionIds);
    console.log('section.sectionsInfo:', section.sectionsInfo);
    console.log('section.sectionsIncluded:', section.sectionsIncluded);
    console.groupEnd();

    console.log('🚀 Loading attendance data for:', {
      id: section.id,
      sectionId: section.sectionId,
      subject: section.subject,
      isHomeroom: section.isHomeroom,
      isMultiSection: section.isMultiSection,
      actualSectionIds: section.actualSectionIds
    });

    const result = {
      students: [],
      homeroomData: null,
      loading: false,
      error: null
    };

    const subject = section.subject || 'Homeroom';
    let students = [];

    const isMultiSection = section.isMultiSection || 
                          (section.sectionsInfo && section.sectionsInfo.length > 1) ||
                          (section.sectionsIncluded && section.sectionsIncluded.length > 1) ||
                          (section.actualSectionIds && section.actualSectionIds.length > 1);

    const sectionIds = section.actualSectionIds || 
                      section.sectionsInfo?.map(s => s.sectionId) ||
                      section.sectionsIncluded?.map(s => s.sectionId) ||
                      [section.sectionId || section.id];

    console.log('🔍 Multi-section detection:', {
      isMultiSection,
      sectionIds,
      sectionIdsLength: sectionIds.length
    });

    if (isMultiSection && sectionIds.length > 1) {
      console.log(`📋 Multi-section mode: checking ${sectionIds.length} sections`);
      
      for (const actualSectionId of sectionIds) {
        console.log(`  🔍 Getting students from section: ${actualSectionId}`);
        
        const sectionStudents = await StudentFilteringService.getStudentsForSubjectSection(
          actualSectionId, 
          subject, 
          section.isHomeroom || section.isHomeroomSection
        );
        
        console.log(`  📊 Found ${sectionStudents.length} students in section ${actualSectionId}`);
        if (sectionStudents.length > 0) {
          console.log(`  👥 Students: ${sectionStudents.map(s => s.firstName + ' ' + s.lastName).join(', ')}`);
        }
        students.push(...sectionStudents);
      }
      
      const uniqueStudents = students.filter((student, index, self) => 
        index === self.findIndex(s => s.id === student.id)
      );
      
      console.log(`✅ Multi-section total: ${uniqueStudents.length} unique students`);
      if (uniqueStudents.length > 0) {
        console.log(`👥 All students: ${uniqueStudents.map(s => s.firstName + ' ' + s.lastName).join(', ')}`);
      }
      result.students = uniqueStudents;
      
    } else {
      const sectionId = section.sectionId || section.id;
      console.log(`📋 Single section mode: ${sectionId}`);
      
      result.students = await StudentFilteringService.getStudentsForSubjectSection(
        sectionId, 
        subject, 
        section.isHomeroom || section.isHomeroomSection
      );
      
      console.log(`📊 Single section result: ${result.students.length} students`);
      if (result.students.length > 0) {
        console.log(`👥 Students: ${result.students.map(s => s.firstName + ' ' + s.lastName).join(', ')}`);
      }
    }

    console.log(`📊 Final result: ${result.students.length} students for ${subject}`);

    if (!section.isHomeroom && !section.isHomeroomSection) {
      const primarySectionId = section.sectionId || sectionIds?.[0] || section.id;
      result.homeroomData = await this.loadHomeroomAttendance(primarySectionId, result.students);
    }

    if (result.students.length === 0) {
      console.warn('⚠️ No students found - analyzing issue...');
      
      const primarySectionId = section.sectionId || sectionIds?.[0] || section.id;
      const sectionData = await this.getSectionInfo(primarySectionId);
      
      if (isMultiSection) {
        result.error = `No students found in any of the ${sectionIds?.length || 0} sections for ${subject}. This might indicate enrollment issues across multiple sections.`;
      } else if (sectionData && sectionData.currentEnrollment > 0) {
        result.error = `Expected ${sectionData.currentEnrollment} students in ${subject} but found none. Students may not be properly enrolled in this subject.`;
      } else {
        result.error = `No students are enrolled in ${subject}. Please check with your administrator.`;
      }
      
      console.error('❌ Student loading error:', result.error);
    }

    return result;

  } catch (error) {
    console.error('❌ Error loading attendance data:', error);
    return {
      students: [],
      homeroomData: null,
      loading: false,
      error: `Failed to load student data: ${error.message}`
    };
  }
}

  /**
   * Load homeroom attendance for the day
   */
 static async loadHomeroomAttendance(sectionId, students = []) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const studentSectionIds = students.length > 0 
      ? [...new Set(students.map(student => 
          student.sectionId || student.fromSectionId || student.displaySectionId
        ).filter(Boolean))]
      : [sectionId];
    
    console.log('🏠 Loading homeroom data for sections:', studentSectionIds);
    
    const allHomeroomData = [];
    
    for (const secId of studentSectionIds) {
      const homeroomQuery = query(
        collection(db, 'attendance'),
        where('date', '==', today),
        where('sectionId', '==', secId),
        where('isHomeroom', '==', true)
      );

      const homeroomSnapshot = await getDocs(homeroomQuery);
      
      if (!homeroomSnapshot.empty) {
        homeroomSnapshot.forEach(doc => {
          const data = { id: doc.id, ...doc.data() };
          console.log(`📊 Found homeroom for section ${secId}:`, data.students?.length, 'students');
          allHomeroomData.push(data);
        });
      } else {
        console.log(`❌ No homeroom found for section ${secId}`);
      }
    }
    
    if (allHomeroomData.length === 0) {
      return null;
    }
    
    const combinedData = {
      students: [],
      teacherName: '',
      takenAt: '',
      sections: allHomeroomData.length
    };
    
    allHomeroomData.forEach(hrData => {
      if (hrData.students) {
        combinedData.students.push(...hrData.students);
      }
      if (hrData.teacherName && !combinedData.teacherName) {
        combinedData.teacherName = hrData.teacherName;
      }
      if (hrData.createdAt && !combinedData.takenAt) {
        combinedData.takenAt = hrData.createdAt.toDate?.()?.toLocaleTimeString() || 'Unknown time';
      }
    });
    
    console.log('✅ Combined homeroom data:', {
      totalStudents: combinedData.students.length,
      teacherName: combinedData.teacherName,
      sections: combinedData.sections
    });
    
    return combinedData;

  } catch (error) {
    console.error('Error loading homeroom attendance:', error);
    return null;
  }
}

  /**
   * Get section information
   */
  static async getSectionInfo(sectionId) {
    try {
      const sectionDoc = await getDocs(
        query(collection(db, 'sections'), where('__name__', '==', sectionId))
      );
      
      if (!sectionDoc.empty) {
        return { id: sectionDoc.docs[0].id, ...sectionDoc.docs[0].data() };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting section info:', error);
      return null;
    }
  }

  /**
   * ✅ FIXED: Save attendance with COMPLETE behavior flag support
   */
  static async saveAttendance(section, attendanceRecords, students, currentUser) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const sectionId = section.sectionId || section.id;

      console.log('💾 SAVING ATTENDANCE WITH BEHAVIOR FLAGS');
      console.log('📋 Attendance records being saved:', attendanceRecords);

      // Count behavior flags before saving
      const behaviorFlaggedStudents = Object.entries(attendanceRecords)
        .filter(([_, record]) => record.hasBehaviorIssue === true);
      
      if (behaviorFlaggedStudents.length > 0) {
        console.log('🚩 Students with behavior flags:', behaviorFlaggedStudents.map(([id, record]) => {
          const student = students.find(s => s.id === id);
          return student ? `${student.firstName} ${student.lastName}` : id;
        }));
      }

      const validation = this.validateAttendanceRecords(attendanceRecords, students);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // ✅ FIXED: Include behavior flags in student records
      const attendanceDoc = {
        sectionId: sectionId,
        subject: section.subject || 'Homeroom',
        isHomeroom: section.isHomeroom || false,
        date: today,
        students: Object.entries(attendanceRecords).map(([studentId, record]) => {
          const student = students.find(s => s.id === studentId);
          
          // ✅ COMPLETE BEHAVIOR FLAG PRESERVATION
          const studentRecord = {
            studentId: studentId,
            studentName: `${student?.firstName || ''} ${student?.lastName || ''}`.trim(),
            status: record.status,
            notes: record.notes || '',
            
            // ✅ BEHAVIOR FLAGS - Multiple field names for compatibility
            hasBehaviorIssue: record.hasBehaviorIssue || false,
            hasFlag: record.hasBehaviorIssue || false,
            behaviorFlag: record.hasBehaviorIssue || false,
            flagged: record.hasBehaviorIssue || false,
            
            // Student metadata
            gradeLevel: student?.gradeLevel,
            section: student?.section || student?.sectionName,
            
            // Tracking metadata
            recordedAt: new Date().toISOString(),
            recordedBy: currentUser?.name || currentUser?.email
          };

          // Debug logging for behavior flags
          if (record.hasBehaviorIssue) {
            console.log(`🚩 SAVING BEHAVIOR FLAG for: ${studentRecord.studentName}`);
            console.log(`   hasBehaviorIssue: ${studentRecord.hasBehaviorIssue}`);
            console.log(`   hasFlag: ${studentRecord.hasFlag}`);
            console.log(`   behaviorFlag: ${studentRecord.behaviorFlag}`);
            console.log(`   flagged: ${studentRecord.flagged}`);
          }

          return studentRecord;
        }),
        teacherName: currentUser?.name || currentUser?.email,
        teacherId: currentUser?.uid,
        createdAt: new Date(),
        updatedAt: new Date(),
        totalStudents: students.length,
        recordsSubmitted: Object.keys(attendanceRecords).length,
        completionRate: Math.round((Object.keys(attendanceRecords).length / students.length) * 100)
      };

      // Final check: Count behavior flags in the document being saved
      const finalBehaviorCount = attendanceDoc.students.filter(s => s.hasBehaviorIssue === true).length;
      console.log(`📊 Final behavior flag count in document: ${finalBehaviorCount}`);

      const existingQuery = query(
        collection(db, 'attendance'),
        where('date', '==', today),
        where('sectionId', '==', sectionId),
        where('subject', '==', section.subject || 'Homeroom')
      );

      const existingSnapshot = await getDocs(existingQuery);
      
      if (!existingSnapshot.empty) {
        const existingDoc = existingSnapshot.docs[0];
        await updateDoc(doc(db, 'attendance', existingDoc.id), attendanceDoc);
        console.log('✅ UPDATED existing attendance record with behavior flags');
      } else {
        const docRef = await addDoc(collection(db, 'attendance'), attendanceDoc);
        console.log('✅ CREATED new attendance record with behavior flags:', docRef.id);
      }

      // Success confirmation
      if (finalBehaviorCount > 0) {
        console.log(`🎉 SUCCESS: Saved ${finalBehaviorCount} behavior flags to Firebase!`);
      }

      return { success: true, message: 'Attendance saved successfully with behavior flags' };

    } catch (error) {
      console.error('❌ Error saving attendance:', error);
      throw new Error(`Failed to save attendance: ${error.message}`);
    }
  }

  /**
   * ✅ ENHANCED: Validate attendance records including behavior flags
   */
  static validateAttendanceRecords(attendanceRecords, students) {
    const errors = [];
    const validStatuses = ['present', 'absent', 'late', 'excused'];

    if (!attendanceRecords || Object.keys(attendanceRecords).length === 0) {
      errors.push('No attendance records provided');
    }

    Object.entries(attendanceRecords).forEach(([studentId, record]) => {
      if (!record.status) {
        errors.push(`Missing status for student ${studentId}`);
      } else if (!validStatuses.includes(record.status)) {
        errors.push(`Invalid status "${record.status}" for student ${studentId}`);
      }

      if (record.notes && record.notes.length > 500) {
        errors.push(`Notes too long for student ${studentId}`);
      }

      // ✅ VALIDATE BEHAVIOR FLAG
      if (record.hasBehaviorIssue !== undefined && typeof record.hasBehaviorIssue !== 'boolean') {
        errors.push(`Invalid behavior flag for student ${studentId} - must be boolean`);
      }
    });

    const recordedStudentIds = new Set(Object.keys(attendanceRecords));
    const missingStudents = students.filter(student => !recordedStudentIds.has(student.id));
    
    if (missingStudents.length > 0) {
      console.warn(`Missing attendance for ${missingStudents.length} students`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      completionRate: students.length > 0 ? (recordedStudentIds.size / students.length) * 100 : 0
    };
  }

  /**
   * ✅ ENHANCED: Initialize attendance state with behavior flag support
   */
  static initializeAttendanceFromHomeroom(students, homeroomData) {
    const initialRecords = {};
    
    students.forEach(student => {
      let defaultStatus = 'present';
      let defaultNotes = '';
      let defaultBehaviorIssue = false; // ✅ Initialize behavior flag
      
      if (homeroomData?.students?.length > 0) {
        const homeroomRecord = homeroomData.students.find(s => 
          s.studentName === `${student.firstName} ${student.lastName}` ||
          s.studentId === student.id ||
          s.studentId === student.studentId
        );
        
        if (homeroomRecord) {
          defaultStatus = homeroomRecord.status || 'present';
          defaultNotes = homeroomRecord.notes || '';
          
          // ✅ INHERIT BEHAVIOR FLAGS FROM HOMEROOM
          defaultBehaviorIssue = homeroomRecord.hasBehaviorIssue || 
                                homeroomRecord.hasFlag || 
                                homeroomRecord.behaviorFlag || 
                                homeroomRecord.flagged || 
                                false;
                                
          if (defaultBehaviorIssue) {
            console.log(`🚩 Inherited behavior flag from homeroom for: ${student.firstName} ${student.lastName}`);
          }
        }
      }
      
      initialRecords[student.id] = {
        status: defaultStatus,
        notes: defaultNotes,
        hasBehaviorIssue: defaultBehaviorIssue, // ✅ Include behavior flag
        timestamp: new Date().toISOString()
      };
    });
    
    return initialRecords;
  }
}