// src/components/teacher/utils/monitorCalculations.js - FIXED to match your working code
export const calculateTodaysSummary = (subjects, attendanceData) => {
    console.group('🔍 TODAY SUMMARY DEBUG - Step by Step');
    
    // Step 1: Verify inputs
    console.log('📊 Input validation:');
    console.log('  - Subjects count:', subjects?.length || 0);
    console.log('  - Subjects list:', subjects?.map(s => `${s.name} (${s.code})`) || []);
    console.log('  - AttendanceData type:', typeof attendanceData);
    console.log('  - AttendanceData keys:', Object.keys(attendanceData || {}));
    console.log('  - Is attendanceData array?', Array.isArray(attendanceData));
    
    // Step 2: Check data structure
    const dataStructure = {};
    Object.keys(attendanceData || {}).forEach(key => {
        const value = attendanceData[key];
        dataStructure[key] = {
            type: Array.isArray(value) ? 'array' : typeof value,
            length: Array.isArray(value) ? value.length : 'N/A',
            sample: Array.isArray(value) ? value[0] : value
        };
    });
    console.log('📈 Data structure analysis:', dataStructure);
    
    // Safety check
    if (!subjects || !Array.isArray(subjects) || !attendanceData) {
        console.error('❌ Invalid inputs for summary calculation');
        console.groupEnd();
        return [];
    }
    
    const summary = [];
    
    // Step 3: Process each subject
    subjects.forEach((subject, index) => {
        console.log(`\n🔍 Processing Subject ${index + 1}: ${subject.name}`);
        
        // 🔧 FIXED: Direct access with exact name matching
        const subjectAttendance = attendanceData[subject.name];
        
        console.log(`  📊 Raw data for "${subject.name}":`, {
            exists: subjectAttendance !== undefined,
            type: Array.isArray(subjectAttendance) ? 'array' : typeof subjectAttendance,
            length: Array.isArray(subjectAttendance) ? subjectAttendance.length : 'N/A'
        });
        
        // 🔧 FIXED: Ensure we have a valid array
        let students = [];
        
        if (Array.isArray(subjectAttendance)) {
            students = subjectAttendance;
        } else if (subjectAttendance && typeof subjectAttendance === 'object' && Array.isArray(subjectAttendance.students)) {
            // Handle nested structure if it exists
            students = subjectAttendance.students;
            console.log('  📝 Used nested .students array');
        } else {
            console.log('  ⚠️ No valid attendance data found');
        }
        
        console.log(`  👥 Final students array: ${students.length} students`);
        if (students.length > 0) {
            console.log('  📄 Sample student:', students[0]);
        }
        
        // 🔧 FIXED: Calculate stats with validation
        const presentCount = students.filter(s => s?.status === 'present').length;
        const lateCount = students.filter(s => s?.status === 'late').length;
        const absentCount = students.filter(s => s?.status === 'absent').length;
        const excusedCount = students.filter(s => s?.status === 'excused').length;
        const totalTaken = students.length;
        
        console.log(`  📈 Calculated stats:`, {
            present: presentCount,
            late: lateCount,
            absent: absentCount,
            excused: excusedCount,
            total: totalTaken
        });
        
        // 🔧 FIXED: Get metadata from students
        let takenBy = 'Unknown';
        let time = 'Unknown time';
        
        if (students.length > 0) {
            const firstStudent = students[0];
            takenBy = firstStudent?.teacherName || 'Unknown';
            
            if (firstStudent?.timestamp) {
                try {
                    time = new Date(firstStudent.timestamp).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                    });
                } catch (e) {
                    console.warn('  ⚠️ Error parsing timestamp:', firstStudent.timestamp);
                }
            }
        }
        
        console.log(`  ℹ️ Metadata: ${takenBy} at ${time}`);
        
        // 🔧 FIXED: Create subject summary
        const subjectSummary = {
            subject: subject.name,
            code: subject.code || subject.name.substring(0, 3).toUpperCase(),
            color: subject.color || '#6c757d',
            presentCount,
            lateCount,
            absentCount,
            excusedCount,
            totalTaken,
            attendanceRate: totalTaken > 0 ? Math.round(((presentCount + lateCount) / totalTaken) * 100) : 0,
            takenBy,
            time,
            status: totalTaken > 0 ? 'taken' : 'not-taken' // THIS IS THE KEY FIELD
        };
        
        console.log(`  ✅ Final summary for ${subject.name}:`, {
            status: subjectSummary.status,
            rate: subjectSummary.attendanceRate,
            takenBy: subjectSummary.takenBy
        });
        
        summary.push(subjectSummary);
    });
    
    console.log('\n📊 COMPLETE SUMMARY:');
    summary.forEach(s => {
        console.log(`  ${s.subject}: ${s.status} (${s.attendanceRate}%) - ${s.totalTaken} students`);
    });
    
    console.groupEnd();
    return summary;
};

// 🔧 ADDITIONAL: Debug helper function
export const debugAttendanceData = (attendanceData, subjects) => {
    console.group('🔧 ATTENDANCE DATA DEBUG HELPER');
    
    console.log('Raw attendanceData:', attendanceData);
    
    // Check each subject
    subjects?.forEach(subject => {
        console.log(`\n🔍 ${subject.name}:`);
        console.log('  - Direct access:', attendanceData?.[subject.name]);
        console.log('  - Type:', typeof attendanceData?.[subject.name]);
        console.log('  - Is array:', Array.isArray(attendanceData?.[subject.name]));
        
        // Check for common variations
        const variations = [
            subject.name,
            subject.name.toLowerCase(),
            subject.name.toUpperCase(),
            subject.code,
            subject.id
        ];
        
        variations.forEach(variation => {
            if (attendanceData?.[variation]) {
                console.log(`  - Found via "${variation}":`, attendanceData[variation]);
            }
        });
    });
    
    console.groupEnd();
};

export const calculateWeekData = (subjects, historicalData, startDate) => {
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

    const weekDates = getWeekDates(startDate);
    console.log('📅 Week data calculation for:', weekDates);
    
    return weekDates.map(date => {
        // Your working code structure: historicalData = { "2025-09-01": { Music: [...], Homeroom: [...] } }
        const dateData = historicalData[date] || {};
        const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
        const dayNumber = new Date(date).getDate();
        
        console.log(`📊 ${dayName} ${dayNumber} (${date}):`, Object.keys(dateData));
        
        return {
            date,
            dayName,
            dayNumber,
            subjects: subjects.map(subject => {
                // Direct array access like your working code
                const subjectData = dateData[subject.name] || [];
                const totalStudents = Array.isArray(subjectData) ? subjectData.length : 0;
                const presentCount = Array.isArray(subjectData) 
                    ? subjectData.filter(s => s.status === 'present' || s.status === 'late').length 
                    : 0;
                
                return {
                    name: subject.name,
                    code: subject.code,
                    color: subject.color,
                    status: totalStudents > 0 ? 'taken' : 'not-taken',
                    attendanceRate: totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0
                };
            })
        };
    });
};

export const calculateStudentWeekData = (selectedStudent, subjects, historicalData, startDate) => {
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

    const weekDates = getWeekDates(startDate);
    return weekDates.map(date => {
        // Your working code structure
        const dateData = historicalData[date] || {};
        const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
        const dayNumber = new Date(date).getDate();
        
        const subjectStatuses = subjects.map(subject => {
            // Direct array access
            const subjectData = dateData[subject.name] || [];
            const studentRecord = Array.isArray(subjectData) 
                ? subjectData.find(s => 
                    selectedStudent && s.studentName === `${selectedStudent.firstName} ${selectedStudent.lastName}`
                  )
                : null;
            
            return {
                subject: subject.name,
                code: subject.code,
                color: subject.color,
                status: studentRecord?.status || 'not-taken',
                notes: studentRecord?.notes || '',
                hasFlag: studentRecord?.hasFlag || false
            };
        });
        
        return {
            date,
            dayName,
            dayNumber,
            subjects: subjectStatuses
        };
    });
};

export const calculateStudentStats = (students, subjects, attendanceData) => {
    // Your working code uses flat structure - direct access
    console.log('📊 Student stats calculation - attendanceData:', attendanceData);
    
    return students.map(student => {
        let presentSubjects = 0;
        let totalSubjects = 0;
        
        subjects.forEach(subject => {
            // Direct access to subject data (flat structure)
            const subjectData = attendanceData[subject.name] || [];
            const studentRecord = Array.isArray(subjectData)
                ? subjectData.find(s => s.studentName === `${student.firstName} ${student.lastName}`)
                : null;
            
            if (studentRecord) {
                totalSubjects++;
                if (studentRecord.status === 'present' || studentRecord.status === 'late') {
                    presentSubjects++;
                }
            }
        });
        
        const attendanceRate = totalSubjects > 0 ? Math.round((presentSubjects / totalSubjects) * 100) : 0;
        
        return {
            ...student,
            presentSubjects,
            totalSubjects,
            attendanceRate
        };
    });
};