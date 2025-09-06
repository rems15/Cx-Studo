// src/components/teacher/utils/monitorCalculations.js - UPDATED WITH NEW FUNCTIONS

export const calculateTodaysSummary = (subjects, attendanceData) => {
    const today = new Date().toISOString().split('T')[0];
    const todayData = attendanceData[today] || {};
    
    const summary = [];
    subjects.forEach(subject => {
        // Check if attendance was taken for this subject
        const subjectAttendance = todayData[subject.name];
        const students = subjectAttendance?.students || [];
        
        const presentCount = students.filter(s => s.status === 'present').length;
        const lateCount = students.filter(s => s.status === 'late').length;
        const absentCount = students.filter(s => s.status === 'absent').length;
        const excusedCount = students.filter(s => s.status === 'excused').length;
        const totalTaken = students.length;
        
        summary.push({
            subject: subject.name,
            code: subject.code,
            color: subject.color,
            colorScheme: subject.colorScheme,
            presentCount,
            lateCount,
            absentCount,
            excusedCount,
            totalTaken,
            attendanceRate: totalTaken > 0 ? Math.round(((presentCount + lateCount) / totalTaken) * 100) : 0,
            takenBy: subjectAttendance?.takenBy,
            time: subjectAttendance?.time,
            status: totalTaken > 0 ? 'taken' : 'not-taken'  // This is the key line
        });
    });
    
    return summary;
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
    return weekDates.map(date => {
        const dateData = historicalData[date] || {};
        const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
        const dayNumber = new Date(date).getDate();
        
        return {
            date,
            dayName,
            dayNumber,
            subjects: subjects.map(subject => {
                const subjectData = dateData[subject.name];
                const totalStudents = subjectData?.students?.length || 0;
                const presentCount = subjectData?.students?.filter(s => s.status === 'present' || s.status === 'late').length || 0;
                
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
        const dateData = historicalData[date] || {};
        const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
        const dayNumber = new Date(date).getDate();
        
        const subjectStatuses = subjects.map(subject => {
            const subjectData = dateData[subject.name];
            const studentRecord = subjectData?.students?.find(s => 
                selectedStudent && s.studentName === `${selectedStudent.firstName} ${selectedStudent.lastName}`
            );
            
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
    const today = new Date().toISOString().split('T')[0];
    const todayData = attendanceData[today] || {};
    
    return students.map(student => {
        let presentSubjects = 0;
        let totalSubjects = 0;
        
        subjects.forEach(subject => {
            const subjectData = todayData[subject.name];
            const studentRecord = subjectData?.students?.find(s => 
                s.studentName === `${student.firstName} ${student.lastName}`
            );
            
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

// ✅ NEW: Calculate overall student summary for StudentsView
export const calculateOverallStudentSummary = (students, subjects, attendanceData) => {
    const selectedDate = Object.keys(attendanceData)[0]; // Get the selected date
    const dateData = attendanceData[selectedDate] || {};
    
    const summary = {
        total: students.length,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        pending: 0
    };
    
    // Get homeroom data for overall stats
    const homeroomData = dateData['Homeroom'];
    if (homeroomData && homeroomData.students) {
        homeroomData.students.forEach(record => {
            if (record.status === 'present') summary.present++;
            else if (record.status === 'absent') summary.absent++;
            else if (record.status === 'late') summary.late++;
            else if (record.status === 'excused') summary.excused++;
        });
    }
    
    // Count pending subjects (subjects without attendance data)
    subjects.forEach(subject => {
        const subjectData = dateData[subject.name];
        if (!subjectData || !subjectData.students || subjectData.students.length === 0) {
            summary.pending++;
        }
    });
    
    return summary;
};