// src/components/teacher/hooks/useMonitorData.js - COMPLETE FIXED VERSION
import { useState, useEffect } from 'react';
import { db } from '../../../services/firebase';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { StudentFilteringService } from '../../../services/studentFilteringService';

export const useMonitorData = (sectionData, monitorContext, focusSubjects, selectedDate) => {
    const [students, setStudents] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [attendanceData, setAttendanceData] = useState({});
    const [historicalData, setHistoricalData] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [unsubscribers, setUnsubscribers] = useState([]);

    useEffect(() => {
        if (sectionData) {
            initializeData();
        }

        return () => {
            unsubscribers.forEach(unsub => {
                if (typeof unsub === 'function') unsub();
            });
        };
    }, [sectionData, monitorContext, focusSubjects, selectedDate]);

    const initializeData = async () => {
        try {
            setLoading(true);
            setError(null);

            unsubscribers.forEach(unsub => {
                if (typeof unsub === 'function') unsub();
            });

            await Promise.all([
                loadStudents(),
                loadSubjects(),
                setupTodaysAttendanceListener(),
                loadHistoricalAttendance()
            ]);

        } catch (err) {
            console.error('Error initializing monitor data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const loadStudents = async () => {
        try {
            let finalStudentsList = [];

            if (sectionData.isMultiSection && sectionData.sectionsInfo) {
                console.log('📚 Loading multi-section students for context:', monitorContext);
                
                if (monitorContext === 'subject' && focusSubjects.length > 0) {
                    for (const sectionInfo of sectionData.sectionsInfo) {
                        for (const subject of focusSubjects) {
                            const subjectStudents = await StudentFilteringService.getStudentsForSubjectSection(
                                sectionInfo.sectionId,
                                subject,
                                false
                            );
                            
                            subjectStudents.forEach(student => {
                                if (!finalStudentsList.find(s => s.id === student.id)) {
                                    finalStudentsList.push({
                                        ...student,
                                        enrolledSubjects: focusSubjects
                                    });
                                }
                            });
                        }
                    }
                } else {
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
                const sectionId = sectionData.sectionId || sectionData.id;
                
                if (monitorContext === 'subject' && focusSubjects.length > 0) {
                    for (const subject of focusSubjects) {
                        const subjectStudents = await StudentFilteringService.getStudentsForSubjectSection(
                            sectionId,
                            subject,
                            false
                        );
                        
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

            finalStudentsList.sort((a, b) => {
                const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
                const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
                return nameA.localeCompare(nameB);
            });

            console.log(`✅ Loaded ${finalStudentsList.length} students`);
            setStudents(finalStudentsList);
            
        } catch (err) {
            throw new Error(`Failed to load students: ${err.message}`);
        }
    };

    const loadSubjects = async () => {
        try {
            const subjectsSnapshot = await getDocs(collection(db, 'subjects'));
            const subjectsMap = {};
            
            subjectsSnapshot.forEach(doc => {
                const data = doc.data();
                subjectsMap[data.name] = {
                    id: doc.id,
                    ...data
                };
            });

            const subjectsList = [];

            // Always add Homeroom first
            subjectsList.push({
                id: 'homeroom',
                name: 'Homeroom',
                code: 'HR',
                color: '#ffc107',
                room: 'Homeroom'
            });

            if (monitorContext === 'homeroom' && sectionData.allSubjects) {
                sectionData.allSubjects.forEach(subjectName => {
                    if (subjectName !== 'Homeroom') {
                        const subjectInfo = subjectsMap[subjectName];
                        subjectsList.push({
                            id: subjectInfo?.id || subjectName.toLowerCase().replace(/\s+/g, '-'),
                            name: subjectName,
                            code: subjectInfo?.code || subjectName.substring(0, 3).toUpperCase(),
                            color: subjectInfo?.color || '#6c757d',
                            room: subjectInfo?.room || 'TBA',
                        });
                    }
                });
            }

            if (focusSubjects && focusSubjects.length > 0) {
                focusSubjects.forEach(subjectName => {
                    if (subjectName !== 'Homeroom') {
                        const subjectInfo = subjectsMap[subjectName];
                        
                        const alreadyExists = subjectsList.some(s => s.name === subjectName);
                        if (!alreadyExists) {
                            subjectsList.push({
                                id: subjectInfo?.id || subjectName.toLowerCase().replace(/\s+/g, '-'),
                                name: subjectName,
                                code: subjectInfo?.code || subjectName.substring(0, 3).toUpperCase(),
                                color: subjectInfo?.color || '#6c757d',
                                room: subjectInfo?.room || 'TBA',
                            });
                        }
                    }
                });
            }

            console.log('📋 Loaded subjects:', subjectsList);
            setSubjects(subjectsList);
            
        } catch (err) {
            throw new Error(`Failed to load subjects: ${err.message}`);
        }
    };

    const setupTodaysAttendanceListener = () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            console.log('🔄 Setting up REAL-TIME listener for:', today);
            
            const attendanceQuery = query(
                collection(db, 'attendance'),
                where('date', '==', today)
            );
            
            const unsubscribe = onSnapshot(
                attendanceQuery,
                (attendanceSnapshot) => {
                    console.log(`🔔 REAL-TIME UPDATE: ${attendanceSnapshot.size} attendance records`);
                    
                    const todayData = {};
                    
                    attendanceSnapshot.forEach(doc => {
                        const data = doc.data();
                        
                        if (!data.students || !Array.isArray(data.students) || data.students.length === 0) {
                            return;
                        }
                        
                        const subjectName = data.isHomeroom ? 'Homeroom' : data.subject;
                        
                        if (!todayData[subjectName]) {
                            todayData[subjectName] = {
                                students: [],
                                takenBy: data.teacherName || 'Unknown',
                                time: data.createdAt?.toDate?.()?.toLocaleTimeString() || 
                                    data.updatedAt?.toDate?.()?.toLocaleTimeString() || 'Unknown'
                            };
                        }
                        
                        const processedStudents = data.students.map(s => ({
                            ...s,
                            hasBehaviorIssue: s.hasBehaviorIssue || s.hasFlag || s.behaviorFlag || false,
                            hasMerit: s.hasMerit || s.merit || s.meritFlag || false
                        }));
                        
                        todayData[subjectName].students.push(...processedStudents);
                    });
                    
                    console.log('✅ Real-time data keys:', Object.keys(todayData));
                    setAttendanceData({ [today]: todayData });
                },
                (error) => {
                    console.error('❌ Real-time listener error:', error);
                }
            );
                
            setUnsubscribers(prev => [...prev, unsubscribe]);
            
        } catch (err) {
            console.error('❌ Error setting up real-time listener:', err);
        }
    };

    const loadHistoricalAttendance = async () => {
        try {
            if (!selectedDate) {
                console.log('⚠️ No selected date, loading current week only');
                await loadWeeklyAttendance();
                return;
            }

            const requestedDate = new Date(selectedDate + 'T12:00:00');
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const isToday = selectedDate === today.toISOString().split('T')[0];
            
            console.log(`📅 Loading historical data for: ${selectedDate} (${isToday ? 'TODAY' : 'PAST DATE'})`);

            if (isToday) {
                await loadWeeklyAttendance();
            } else {
                await loadSpecificDateAttendance(selectedDate);
                await loadWeeklyAttendance(requestedDate);
            }
            
        } catch (err) {
            console.error('❌ Error loading historical attendance:', err);
            setHistoricalData({});
        }
    };

    const loadSpecificDateAttendance = async (dateString) => {
        try {
            console.log(`🔍 Loading attendance for specific date: ${dateString}`);
            
            const attendanceQuery = query(
                collection(db, 'attendance'),
                where('date', '==', dateString)
            );

            const snapshot = await getDocs(attendanceQuery);
            const dayData = {};
            
            snapshot.forEach(doc => {
                const data = doc.data();
                
                if (data.students && Array.isArray(data.students) && data.students.length > 0) {
                    const subjectName = data.isHomeroom ? 'Homeroom' : data.subject;
                    
                    if (!dayData[subjectName]) {
                        dayData[subjectName] = {
                            students: [],
                            takenBy: data.teacherName || 'Unknown',
                            time: data.createdAt?.toDate?.()?.toLocaleTimeString() || 'Unknown'
                        };
                    }
                    
                    dayData[subjectName].students.push(...data.students);
                }
            });

            console.log(`✅ Loaded ${Object.keys(dayData).length} subjects for ${dateString}`);
            
            setHistoricalData(prev => ({
                ...prev,
                [dateString]: dayData
            }));
            
        } catch (err) {
            console.error('❌ Error loading specific date:', err);
        }
    };

    const loadWeeklyAttendance = async (customDate = null) => {
        try {
            const weekStart = customDate ? getWeekStart(customDate) : getWeekStart();
            const weekDates = getWeekDates(weekStart);
            const weeklyData = {};
            
            console.log('📅 Loading weekly attendance for:', weekDates);

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
                        const subjectName = data.isHomeroom ? 'Homeroom' : data.subject;
                        
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
            setHistoricalData(prev => ({
                ...prev,
                ...weeklyData
            }));
            
        } catch (err) {
            console.error('❌ Error loading weekly attendance:', err);
        }
    };

    const getWeekStart = (date = null) => {
        const targetDate = date || new Date();
        const weekStart = new Date(targetDate);
        weekStart.setDate(targetDate.getDate() - targetDate.getDay());
        return weekStart.toISOString().split('T')[0];
    };

    const getWeekDates = (startDate) => {
        const dates = [];
        const start = new Date(startDate + 'T12:00:00');
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