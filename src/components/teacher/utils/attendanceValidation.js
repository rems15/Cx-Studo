// src/components/teacher/utils/attendanceValidation.js

export const validateAttendanceRecord = (record) => {
    const errors = [];
    
    if (!record.status) {
        errors.push('Status is required');
    }
    
    if (!['present', 'absent', 'late', 'excused'].includes(record.status)) {
        errors.push('Invalid status value');
    }
    
    if (record.notes && record.notes.length > 500) {
        errors.push('Notes cannot exceed 500 characters');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

export const validateAllRecords = (attendanceRecords, students) => {
    const allErrors = [];
    let validCount = 0;
    
    students.forEach(student => {
        const record = attendanceRecords[student.id];
        if (record) {
            const validation = validateAttendanceRecord(record);
            if (validation.isValid) {
                validCount++;
            } else {
                allErrors.push({
                    studentId: student.id,
                    studentName: `${student.firstName} ${student.lastName}`,
                    errors: validation.errors
                });
            }
        } else {
            allErrors.push({
                studentId: student.id,
                studentName: `${student.firstName} ${student.lastName}`,
                errors: ['Missing attendance record']
            });
        }
    });
    
    return {
        isValid: allErrors.length === 0,
        validCount,
        totalCount: students.length,
        errors: allErrors
    };
};

export const hasRequiredAttendance = (attendanceRecords, minPercentage = 1) => {
    const totalRecords = Object.keys(attendanceRecords).length;
    const recordsWithStatus = Object.values(attendanceRecords).filter(r => r.status).length;
    
    if (totalRecords === 0) return false;
    
    const percentage = (recordsWithStatus / totalRecords) * 100;
    return percentage >= minPercentage;
};