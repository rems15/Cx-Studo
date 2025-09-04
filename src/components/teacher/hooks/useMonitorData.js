// src/components/teacher/hooks/useMonitorData.js - FIXED ATTENDANCE LOADING
import { useState, useEffect } from 'react';
import { db } from '../../../services/firebase';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { StudentFilteringService } from '../../../services/studentFilteringService';

export const useMonitorData = (sectionData, monitorContext, focusSubjects) => {
    const [students, setStudents] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [attendanceData, setAttendanceData] = useState({});
    const [historicalData, setHistoricalData] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (sectionData) {
            initializeData();
        }
    }, [sectionData, monitorContext, focusSubjects]);

    const initializeData = async () => {
        try {
            setLoading(true);
            setError(null);

            await Promise.all([
                loadStudents(),
                loadSubjects(),
                loadTodaysAttendance(),
                loadWeeklyAttendance()
            ]);

        } catch (err) {
            console.error('Error initializing monitor data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // ✅ FIXED: Filter students by subject enrollment for subject teachers
    const loadStudents = async () => {
        try {
            let finalStudentsList = [];

            if (sectionData.isMultiSection && sectionData.sectionsInfo) {
                // Multi-section loading
                console.log('📚 Loading multi-section students for context:', monitorContext);
                
                if (monitorContext === 'subject' && focusSubjects.length > 0) {
                    // ✅ Subject teacher: Filter students by enrollment in focus subjects
                    for (const sectionInfo of sectionData.sectionsInfo) {
                        for (const subject of focusSubjects) {
                            console.log(`🔍 Getting ${subject} students from section ${sectionInfo.sectionId}`);
                            
                            const subjectStudents = await StudentFilteringService.getStudentsForSubjectSection(
                                sectionInfo.sectionId,
                                subject,
                                false // Not homeroom
                            );
                            
                            console.log(`📊 Found ${subjectStudents.length} students enrolled in ${subject}`);
                            
                            // Add students (avoiding duplicates)
                            subjectStudents.forEach(student => {
                                if (!finalStudentsList.find(s => s.id === student.id)) {
                                    finalStudentsList.push({
                                        ...student,
                                        enrolledSubjects: focusSubjects // Add context
                                    });
                                }
                            });
                        }
                    }
                } else {
                    // Homeroom teacher: Get all students
                    const allStudentsPromises = sectionData.sectionsInfo.map(sectionInfo => {
                        return getDocs(query(
                            collection(db, 'students'),
                            where('sectionId', '==', sectionInfo.sectionId)
                        ));
                    });

                    const allStudentsSnapshots = await Promise.all(allStudentsPromises);
                    allStudentsSnapshots.forEach(snapshot => {
                        snapshot.forEach(doc => {
                            const studentData = { id: doc.id, ...doc.data() };
                            if (!finalStudentsList.find(s => s.id === studentData.id)) {
                                finalStudentsList.push(studentData);
                            }
                        });
                    });
                }
            } else {
                // Single section loading
                const sectionId = sectionData.sectionId || sectionData.id;
                console.log('📚 Loading single section students:', sectionId, 'Context:', monitorContext);
                
                if (monitorContext === 'subject' && focusSubjects.length > 0) {
                    // ✅ Subject teacher: Filter by subject enrollment
                    for (const subject of focusSubjects) {
                        console.log(`🔍 Getting ${subject} students from section ${sectionId}`);
                        
                        const subjectStudents = await StudentFilteringService.getStudentsForSubjectSection(
                            sectionId,
                            subject,
                            false // Not homeroom
                        );
                        
                        console.log(`📊 Found ${subjectStudents.length} students enrolled in ${subject}`);
                        
                        // Add students (avoiding duplicates)
                        subjectStudents.forEach(student => {
                            if (!finalStudentsList.find(s => s.id === student.id)) {
                                finalStudentsList.push({
                                    ...student,
                                    enrolledSubjects: focusSubjects
                                });
                            }
                        });
                    }
                } else {
                    // Homeroom teacher: Get all students in section
                    const studentsQuery = query(
                        collection(db, 'students'),
                        where('sectionId', '==', sectionId)
                    );
                    const studentsSnapshot = await getDocs(studentsQuery);
                    studentsSnapshot.forEach(doc => {
                        finalStudentsList.push({ id: doc.id, ...doc.data() });
                    });
                }
            }

            console.log(`✅ Final students list: ${finalStudentsList.length} students`);
            setStudents(finalStudentsList);
            
        } catch (err) {
            console.error('❌ Error loading students:', err);
            throw new Error(`Failed to load students: ${err.message}`);
        }
    };

    const loadSubjects = async () => {
        try {
            const subjectsList = [];

            if (monitorContext === 'homeroom') {
                // Load all subjects from database
                const subjectsSnapshot = await getDocs(collection(db, 'subjects'));
                subjectsSnapshot.forEach(doc => {
                    const subjectData = doc.data();
                    subjectsList.push({
                        id: doc.id,
                        name: subjectData.name,
                        code: subjectData.code || subjectData.name.substring(0, 3).toUpperCase(),
                        color: subjectData.color || '#6c757d'
                    });
                });

                // Add Homeroom at the beginning
                subjectsList.unshift({
                    id: 'homeroom',
                    name: 'Homeroom',
                    code: 'HR',
                    color: '#ffc107'
                });
            } else {
                // Subject teacher - get actual codes from database
                subjectsList.push({
                    id: 'homeroom',
                    name: 'Homeroom',
                    code: 'HR',
                    color: '#ffc107'
                });

                // Get actual subject data from database for focus subjects
                const subjectsSnapshot = await getDocs(collection(db, 'subjects'));
                const subjectsMap = {};
                
                subjectsSnapshot.forEach(doc => {
                    const subjectData = doc.data();
                    subjectsMap[subjectData.name] = {
                        id: doc.id,
                        code: subjectData.code || subjectData.name.substring(0, 3).toUpperCase(),
                        color: subjectData.color || '#6c757d',
                        ...subjectData
                    };
                });

                // Add focus subjects with database codes
                focusSubjects.forEach(subjectName => {
                    const subjectInfo = subjectsMap[subjectName];
                    
                    subjectsList.push({
                        id: subjectInfo?.id || subjectName.toLowerCase().replace(/\s+/g, '-'),
                        name: subjectName,
                        code: subjectInfo?.code || subjectName.substring(0, 3).toUpperCase(),
                        color: subjectInfo?.color || '#6c757d'
                    });
                });
            }

            console.log('📋 Loaded subjects:', subjectsList);
            setSubjects(subjectsList);
            
        } catch (err) {
            throw new Error(`Failed to load subjects: ${err.message}`);
        }
    };

    // ✅ COMPLETELY FIXED: Simple and clear attendance loading
   // FIXED loadTodaysAttendance function - PRESERVES BEHAVIOR FLAGS
const loadTodaysAttendance = async () => {
    try {
        const today = new Date().toISOString().split('T')[0];
        console.log('📅 Loading attendance for:', today);
        
        // Get all attendance records for today
        const attendanceQuery = query(
            collection(db, 'attendance'),
            where('date', '==', today)
        );
        
        const attendanceSnapshot = await getDocs(attendanceQuery);
        console.log(`📊 Found ${attendanceSnapshot.size} total attendance records for today`);
        
        // Process attendance by subject
        const todayData = {};
        
        attendanceSnapshot.forEach(doc => {
            const data = doc.data();
            
            // Skip records without students
            if (!data.students || !Array.isArray(data.students) || data.students.length === 0) {
                return;
            }
            
            // Get subject name
            const subjectName = data.isHomeroom ? 'Homeroom' : (data.subject || 'Unknown');
            
            // Initialize subject data if not exists
            if (!todayData[subjectName]) {
                todayData[subjectName] = {
                    students: [],
                    takenBy: data.teacherName || 'Unknown',
                    time: data.createdAt?.toDate?.()?.toLocaleTimeString() || 
                          data.updatedAt?.toDate?.()?.toLocaleTimeString() || 'Unknown'
                };
            }
            
            // ✅ FIXED: Preserve ALL student data including behavior flags
            const processedStudents = data.students.map(student => {
                // ✅ Keep ALL original fields from database
                const processedStudent = {
                    ...student, // This preserves hasBehaviorIssue, hasFlag, behaviorFlag, etc.
                    
                    // Add metadata
                    teacherName: data.teacherName || 'Unknown',
                    timestamp: data.createdAt?.toDate?.()?.toISOString() || 
                              data.updatedAt?.toDate?.()?.toISOString(),
                    sectionId: data.sectionId,
                    docId: doc.id,
                    
                    // ✅ ENSURE behavior flags are explicitly preserved
                    hasBehaviorIssue: student.hasBehaviorIssue || false,
                    hasFlag: student.hasFlag || student.hasBehaviorIssue || false,
                    behaviorFlag: student.behaviorFlag || student.hasBehaviorIssue || false,
                    flagged: student.flagged || student.hasBehaviorIssue || false
                };
                
                // Debug log behavior flags
                if (processedStudent.hasBehaviorIssue || processedStudent.hasFlag || processedStudent.behaviorFlag) {
                    console.log(`🚩 LOADED behavior flag for: ${processedStudent.studentName}`);
                    console.log(`   hasBehaviorIssue: ${processedStudent.hasBehaviorIssue}`);
                    console.log(`   hasFlag: ${processedStudent.hasFlag}`);
                    console.log(`   behaviorFlag: ${processedStudent.behaviorFlag}`);
                }
                
                return processedStudent;
            });
            
            // Add students to subject
            todayData[subjectName].students.push(...processedStudents);
            
            console.log(`📚 ${subjectName}: ${processedStudents.length} students from section ${data.sectionId}`);
            
            // Debug: Count behavior flags in this subject
            const flaggedCount = processedStudents.filter(s => 
                s.hasBehaviorIssue || s.hasFlag || s.behaviorFlag
            ).length;
            
            if (flaggedCount > 0) {
                console.log(`🚩 ${subjectName}: ${flaggedCount} students with behavior flags`);
            }
        });
        
        console.log('✅ Final attendance data structure:', Object.keys(todayData));
        console.log('📊 Attendance summary:');
        Object.entries(todayData).forEach(([subject, data]) => {
            const flaggedStudents = data.students.filter(s => 
                s.hasBehaviorIssue || s.hasFlag || s.behaviorFlag
            );
            
            console.log(`  ${subject}: ${data.students.length} students, taken by ${data.takenBy}`);
            if (flaggedStudents.length > 0) {
                console.log(`    🚩 ${flaggedStudents.length} students with behavior flags:`, 
                    flaggedStudents.map(s => s.studentName)
                );
            }
        });
        
        // Set data in the format expected by StudentsView
        setAttendanceData({ [today]: todayData });
        
    } catch (err) {
        console.error('❌ Error loading today attendance:', err);
        setAttendanceData({});
    }
};

    // ✅ FIXED: Simplified weekly attendance loading
    const loadWeeklyAttendance = async () => {
        try {
            const weekStart = getWeekStart();
            const weekDates = getWeekDates(weekStart);
            const weeklyData = {};
            
            console.log('📅 Loading weekly attendance for dates:', weekDates);

            for (const date of weekDates) {
                const attendanceQuery = query(
                    collection(db, 'attendance'),
                    where('date', '==', date)
                );

                const snapshot = await getDocs(attendanceQuery);
                const dayData = {};
                
                snapshot.forEach(doc => {
                    const data = doc.data();
                    
                    if (data.students && Array.isArray(data.students) && data.students.length > 0) {
                        const subjectName = data.isHomeroom ? 'Homeroom' : (data.subject || 'Unknown');
                        
                        if (!dayData[subjectName]) {
                            dayData[subjectName] = {
                                students: [],
                                takenBy: data.teacherName || 'Unknown'
                            };
                        }
                        
                        dayData[subjectName].students.push(...data.students);
                    }
                });

                weeklyData[date] = dayData;
            }

            console.log('✅ Loaded weekly data for', Object.keys(weeklyData).length, 'dates');
            setHistoricalData(weeklyData);
            
        } catch (err) {
            console.error('❌ Error loading weekly attendance:', err);
            setHistoricalData({});
        }
    };

    // Helper functions
    const getWeekStart = () => {
        const today = new Date();
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return weekStart.toISOString().split('T')[0];
    };

    const getWeekDates = (startDate) => {
        const dates = [];
        const start = new Date(startDate);
        for (let i = 0; i < 7; i++) {
            const date = new Date(start);
            date.setDate(start.getDate() + i);
            dates.push(date.toISOString().split('T')[0]);
        }
        return dates;
    };

    return {
        students,
        subjects,
        attendanceData,
        historicalData,
        loading,
        error,
        refetch: initializeData
    };
};