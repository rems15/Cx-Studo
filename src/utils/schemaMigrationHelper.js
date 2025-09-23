// src/utils/schemaMigrationHelper.js - Complete migration utility for schema updates
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  writeBatch,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  addDoc,
  getDoc
} from 'firebase/firestore';
import { db } from '../services/firebase';

/**
 * MIGRATION HELPER: Migrate sections from old schema to new schema
 * Removes 'name' and 'sectionName' fields and renames 'gradeLevel' to 'year'
 */
export const migrateSectionsSchema = async () => {
  console.log('🔄 Starting sections schema migration...');
  
  try {
    const sectionsSnapshot = await getDocs(collection(db, 'sections'));
    const batch = writeBatch(db);
    let migratedCount = 0;
    let skippedCount = 0;
    
    sectionsSnapshot.forEach(docSnapshot => {
      const sectionData = docSnapshot.data();
      const sectionRef = doc(db, 'sections', docSnapshot.id);
      
      // Check if migration is needed
      const needsMigration = 
        (sectionData.gradeLevel && !sectionData.year) ||
        sectionData.name ||
        sectionData.sectionName;
      
      if (needsMigration) {
        const updates = {};
        let migrationDetails = [];
        
        // 1. Rename gradeLevel to year
        if (sectionData.gradeLevel && !sectionData.year) {
          updates.year = parseInt(sectionData.gradeLevel);
          migrationDetails.push(`gradeLevel → year (${sectionData.gradeLevel})`);
        }
        
        // 2. Ensure section field exists (use sectionName as fallback)
        if (!sectionData.section && sectionData.sectionName) {
          updates.section = sectionData.sectionName.toUpperCase();
          migrationDetails.push(`sectionName → section (${sectionData.sectionName})`);
        }
        
        // 3. Remove old fields by setting them to null (Firestore deletes null fields)
        if (sectionData.name) {
          updates.name = null;
          migrationDetails.push('removed name field');
        }
        if (sectionData.sectionName && updates.section) {
          updates.sectionName = null;
          migrationDetails.push('removed sectionName field');
        }
        if (sectionData.gradeLevel && updates.year) {
          updates.gradeLevel = null;
          migrationDetails.push('removed gradeLevel field');
        }
        
        // Add migration metadata
        updates.migratedAt = serverTimestamp();
        updates.migrationVersion = '2.0';
        updates.migrationDetails = migrationDetails;
        
        batch.update(sectionRef, updates);
        migratedCount++;
        
        const identifier = `${updates.year || sectionData.year || sectionData.gradeLevel}-${updates.section || sectionData.section || sectionData.sectionName}`;
        console.log(`📝 Queued migration for section: ${identifier} (${migrationDetails.join(', ')})`);
      } else {
        skippedCount++;
      }
    });
    
    if (migratedCount > 0) {
      await batch.commit();
      console.log(`✅ Successfully migrated ${migratedCount} sections, skipped ${skippedCount}`);
    } else {
      console.log('ℹ️ No sections need migration');
    }
    
    return { success: true, migratedCount, skippedCount };
    
  } catch (error) {
    console.error('❌ Error during sections migration:', error);
    return { success: false, error: error.message, migratedCount: 0, skippedCount: 0 };
  }
};

/**
 * MIGRATION HELPER: Migrate students schema (gradeLevel to year)
 */
export const migrateStudentsSchema = async () => {
  console.log('🔄 Starting students schema migration...');
  
  try {
    const studentsSnapshot = await getDocs(collection(db, 'students'));
    const batch = writeBatch(db);
    let migratedCount = 0;
    let skippedCount = 0;
    
    studentsSnapshot.forEach(docSnapshot => {
      const studentData = docSnapshot.data();
      const studentRef = doc(db, 'students', docSnapshot.id);
      
      // Check if migration is needed
      if (studentData.gradeLevel && !studentData.year) {
        const updates = {
          year: parseInt(studentData.gradeLevel),
          gradeLevel: null, // Remove old field
          migratedAt: serverTimestamp(),
          migrationVersion: '2.0',
          migrationDetails: [`gradeLevel → year (${studentData.gradeLevel})`]
        };
        
        batch.update(studentRef, updates);
        migratedCount++;
        
        console.log(`📝 Queued migration for student: ${studentData.firstName} ${studentData.lastName} (Grade ${studentData.gradeLevel} → Year ${studentData.gradeLevel})`);
      } else {
        skippedCount++;
      }
    });
    
    if (migratedCount > 0) {
      await batch.commit();
      console.log(`✅ Successfully migrated ${migratedCount} students, skipped ${skippedCount}`);
    } else {
      console.log('ℹ️ No students need migration');
    }
    
    return { success: true, migratedCount, skippedCount };
    
  } catch (error) {
    console.error('❌ Error during students migration:', error);
    return { success: false, error: error.message, migratedCount: 0, skippedCount: 0 };
  }
};

/**
 * MIGRATION HELPER: Update teacher homeroom assignments to use new identifiers
 */
export const migrateTeacherAssignments = async () => {
  console.log('🔄 Starting teacher assignments migration...');
  
  try {
    // Get all sections first to create old-to-new mapping
    const sectionsSnapshot = await getDocs(collection(db, 'sections'));
    const sectionMappings = {};
    
    sectionsSnapshot.forEach(doc => {
      const sectionData = doc.data();
      const newYear = sectionData.year || sectionData.gradeLevel;
      const newSection = sectionData.section || sectionData.sectionName;
      const newIdentifier = `${newYear}-${newSection}`;
      
      // Create mappings for old possible identifiers
      if (sectionData.gradeLevel && sectionData.sectionName) {
        const oldIdentifier = `${sectionData.gradeLevel}-${sectionData.sectionName}`;
        sectionMappings[oldIdentifier] = newIdentifier;
      }
      if (sectionData.name) {
        sectionMappings[sectionData.name] = newIdentifier;
      }
      
      // Also map the section ID to the new identifier
      sectionMappings[doc.id] = newIdentifier;
    });
    
    // Get teachers with homeroom assignments
    const teachersQuery = query(
      collection(db, 'users'),
      where('roles', 'array-contains', 'homeroom')
    );
    const teachersSnapshot = await getDocs(teachersQuery);
    
    const batch = writeBatch(db);
    let migratedCount = 0;
    let skippedCount = 0;
    
    teachersSnapshot.forEach(docSnapshot => {
      const teacherData = docSnapshot.data();
      const teacherRef = doc(db, 'users', docSnapshot.id);
      
      let needsMigration = false;
      const updates = {};
      const migrationDetails = [];
      
      // Update homeroomClass if it needs migration
      if (teacherData.homeroomClass && sectionMappings[teacherData.homeroomClass]) {
        const newIdentifier = sectionMappings[teacherData.homeroomClass];
        
        if (teacherData.homeroomClass !== newIdentifier) {
          needsMigration = true;
          updates.homeroomClass = newIdentifier;
          migrationDetails.push(`homeroom assignment: ${teacherData.homeroomClass} → ${newIdentifier}`);
        }
      }
      
      if (needsMigration) {
        updates.migratedAt = serverTimestamp();
        updates.migrationVersion = '2.0';
        updates.migrationDetails = migrationDetails;
        
        batch.update(teacherRef, updates);
        migratedCount++;
        
        console.log(`📝 Queued migration for teacher: ${teacherData.name} (${migrationDetails.join(', ')})`);
      } else {
        skippedCount++;
      }
    });
    
    if (migratedCount > 0) {
      await batch.commit();
      console.log(`✅ Successfully migrated ${migratedCount} teacher assignments, skipped ${skippedCount}`);
    } else {
      console.log('ℹ️ No teacher assignments need migration');
    }
    
    return { success: true, migratedCount, skippedCount };
    
  } catch (error) {
    console.error('❌ Error during teacher assignments migration:', error);
    return { success: false, error: error.message, migratedCount: 0, skippedCount: 0 };
  }
};

/**
 * MIGRATION HELPER: Update attendance records to use new section schema
 */
export const migrateAttendanceSchema = async () => {
  console.log('🔄 Starting attendance schema migration...');
  
  try {
    // Get all sections first to create a mapping
    const sectionsSnapshot = await getDocs(collection(db, 'sections'));
    const sectionsMap = {};
    
    sectionsSnapshot.forEach(doc => {
      const sectionData = doc.data();
      const year = sectionData.year || sectionData.gradeLevel;
      const section = sectionData.section || sectionData.sectionName;
      const identifier = `${year}-${section}`;
      
      sectionsMap[doc.id] = {
        id: doc.id,
        year: year,
        section: section,
        identifier: identifier,
        displayName: `Grade ${year} - ${section}`
      };
    });
    
    // Get attendance records
    const attendanceSnapshot = await getDocs(collection(db, 'attendance'));
    const batch = writeBatch(db);
    let migratedCount = 0;
    let skippedCount = 0;
    
    attendanceSnapshot.forEach(docSnapshot => {
      const attendanceData = docSnapshot.data();
      const attendanceRef = doc(db, 'attendance', docSnapshot.id);
      
      let needsMigration = false;
      const updates = {};
      const migrationDetails = [];
      
      // Update sectionData if it contains old schema
      if (attendanceData.sectionData) {
        if (Array.isArray(attendanceData.sectionData)) {
          // Multi-section case
          const updatedSectionData = attendanceData.sectionData.map(sectionInfo => {
            if (sectionInfo.gradeLevel || sectionInfo.sectionName || sectionInfo.name) {
              needsMigration = true;
              migrationDetails.push('updated multi-section data');
              return {
                id: sectionInfo.id,
                year: sectionInfo.year || sectionInfo.gradeLevel,
                section: sectionInfo.section || sectionInfo.sectionName,
                displayName: `Grade ${sectionInfo.year || sectionInfo.gradeLevel} - ${sectionInfo.section || sectionInfo.sectionName}`
              };
            }
            return sectionInfo;
          });
          if (needsMigration) {
            updates.sectionData = updatedSectionData;
          }
        } else {
          // Single section case
          if (attendanceData.sectionData.gradeLevel || attendanceData.sectionData.sectionName || attendanceData.sectionData.name) {
            needsMigration = true;
            migrationDetails.push('updated section data');
            updates.sectionData = {
              id: attendanceData.sectionData.id,
              year: attendanceData.sectionData.year || attendanceData.sectionData.gradeLevel,
              section: attendanceData.sectionData.section || attendanceData.sectionData.sectionName,
              displayName: `Grade ${attendanceData.sectionData.year || attendanceData.sectionData.gradeLevel} - ${attendanceData.sectionData.section || attendanceData.sectionData.sectionName}`
            };
          }
        }
      }
      
      // Update sectionName to use new identifier format
      if (attendanceData.sectionId && sectionsMap[attendanceData.sectionId]) {
        const sectionInfo = sectionsMap[attendanceData.sectionId];
        if (attendanceData.sectionName !== sectionInfo.displayName) {
          needsMigration = true;
          updates.sectionName = sectionInfo.displayName;
          migrationDetails.push('updated section name format');
        }
      }
      
      if (needsMigration) {
        updates.migratedAt = serverTimestamp();
        updates.migrationVersion = '2.0';
        updates.migrationDetails = migrationDetails;
        
        batch.update(attendanceRef, updates);
        migratedCount++;
        
        console.log(`📝 Queued migration for attendance record: ${attendanceData.date} - ${attendanceData.subjectName} (${migrationDetails.join(', ')})`);
      } else {
        skippedCount++;
      }
    });
    
    if (migratedCount > 0) {
      await batch.commit();
      console.log(`✅ Successfully migrated ${migratedCount} attendance records, skipped ${skippedCount}`);
    } else {
      console.log('ℹ️ No attendance records need migration');
    }
    
    return { success: true, migratedCount, skippedCount };
    
  } catch (error) {
    console.error('❌ Error during attendance migration:', error);
    return { success: false, error: error.message, migratedCount: 0, skippedCount: 0 };
  }
};

/**
 * VALIDATION HELPER: Check data integrity after migration
 */
export const validateMigration = async () => {
  console.log('🔍 Validating migration results...');
  
  try {
    const issues = [];
    const warnings = [];
    
    // Check sections
    const sectionsSnapshot = await getDocs(collection(db, 'sections'));
    sectionsSnapshot.forEach(doc => {
      const sectionData = doc.data();
      
      // Check for missing required fields
      if (!sectionData.year) {
        issues.push(`Section ${doc.id}: Missing 'year' field`);
      }
      if (!sectionData.section) {
        issues.push(`Section ${doc.id}: Missing 'section' field`);
      }
      
      // Check for old fields that should be removed
      if (sectionData.gradeLevel) {
        warnings.push(`Section ${doc.id}: Still has 'gradeLevel' field`);
      }
      if (sectionData.sectionName) {
        warnings.push(`Section ${doc.id}: Still has 'sectionName' field`);
      }
      if (sectionData.name) {
        warnings.push(`Section ${doc.id}: Still has 'name' field`);
      }
    });
    
    // Check students
    const studentsSnapshot = await getDocs(collection(db, 'students'));
    studentsSnapshot.forEach(doc => {
      const studentData = doc.data();
      
      if (!studentData.year) {
        issues.push(`Student ${doc.id}: Missing 'year' field`);
      }
      if (studentData.gradeLevel) {
        warnings.push(`Student ${doc.id}: Still has 'gradeLevel' field`);
      }
    });
    
    if (issues.length === 0 && warnings.length === 0) {
      console.log('✅ Migration validation passed - no issues found');
      return { success: true, issues: [], warnings: [] };
    } else {
      if (issues.length > 0) {
        console.log(`❌ Migration validation found ${issues.length} critical issues:`);
        issues.forEach(issue => console.log(`  - ${issue}`));
      }
      if (warnings.length > 0) {
        console.log(`⚠️ Migration validation found ${warnings.length} warnings:`);
        warnings.forEach(warning => console.log(`  - ${warning}`));
      }
      return { success: false, issues, warnings };
    }
    
  } catch (error) {
    console.error('❌ Error during validation:', error);
    return { success: false, error: error.message };
  }
};

/**
 * ANALYSIS HELPER: Analyze current schema state
 */
export const analyzeSchemaState = async () => {
  console.log('🔍 Analyzing current schema state...');
  
  try {
    const analysis = {
      sections: { total: 0, migrated: 0, legacy: 0 },
      students: { total: 0, migrated: 0, legacy: 0 }
    };
    
    // Analyze sections
    const sectionsSnapshot = await getDocs(collection(db, 'sections'));
    sectionsSnapshot.forEach(doc => {
      const data = doc.data();
      analysis.sections.total++;
      
      if (data.migrationVersion === '2.0' || (data.year && !data.gradeLevel)) {
        analysis.sections.migrated++;
      } else {
        analysis.sections.legacy++;
      }
    });
    
    // Analyze students
    const studentsSnapshot = await getDocs(collection(db, 'students'));
    studentsSnapshot.forEach(doc => {
      const data = doc.data();
      analysis.students.total++;
      
      if (data.migrationVersion === '2.0' || (data.year && !data.gradeLevel)) {
        analysis.students.migrated++;
      } else {
        analysis.students.legacy++;
      }
    });
    
    // Calculate percentages
    analysis.sections.migratedPercent = analysis.sections.total > 0 ? 
      Math.round((analysis.sections.migrated / analysis.sections.total) * 100) : 0;
    analysis.students.migratedPercent = analysis.students.total > 0 ? 
      Math.round((analysis.students.migrated / analysis.students.total) * 100) : 0;
    
    console.log('📊 Schema Analysis Results:');
    console.log(`  Sections: ${analysis.sections.migrated}/${analysis.sections.total} migrated (${analysis.sections.migratedPercent}%)`);
    console.log(`  Students: ${analysis.students.migrated}/${analysis.students.total} migrated (${analysis.students.migratedPercent}%)`);
    
    return analysis;
    
  } catch (error) {
    console.error('❌ Error during schema analysis:', error);
    return { error: error.message };
  }
};

/**
 * MAIN MIGRATION FUNCTION: Run all migrations in sequence
 */
export const runFullMigration = async () => {
  console.log('🚀 Starting full schema migration...');
  
  try {
    const results = {
      analysis: await analyzeSchemaState(),
      sections: await migrateSectionsSchema(),
      students: await migrateStudentsSchema(),
      teachers: await migrateTeacherAssignments(),
      attendance: await migrateAttendanceSchema(),
      validation: await validateMigration()
    };
    
    const totalMigrated = 
      (results.sections.migratedCount || 0) + 
      (results.students.migratedCount || 0) + 
      (results.attendance.migratedCount || 0) + 
      (results.teachers.migratedCount || 0);
    
    console.log(`🎉 Migration completed!`);
    console.log(`📊 Migration Summary:`);
    console.log(`  - Sections: ${results.sections.migratedCount || 0} migrated`);
    console.log(`  - Students: ${results.students.migratedCount || 0} migrated`);
    console.log(`  - Teacher Assignments: ${results.teachers.migratedCount || 0} migrated`);
    console.log(`  - Attendance Records: ${results.attendance.migratedCount || 0} migrated`);
    console.log(`  - Total Records Migrated: ${totalMigrated}`);
    
    if (results.validation.success) {
      console.log('✅ All validations passed');
    } else {
      console.log(`⚠️ Validation found issues`);
    }
    
    return results;
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return { success: false, error: error.message };
  }
};

// Export all functions
export default {
  migrateSectionsSchema,
  migrateStudentsSchema,
  migrateAttendanceSchema,
  migrateTeacherAssignments,
  validateMigration,
  runFullMigration,
  analyzeSchemaState
};