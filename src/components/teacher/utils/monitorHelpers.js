// src/components/teacher/utils/monitorHelpers.js

export const getContextConfig = (monitorContext, focusSubjects, subjectColors) => {
    const getSubjectGradient = (subject) => {
        const color = subjectColors[subject];
        if (color?.bg) {
            return `linear-gradient(135deg, ${color.bg} 0%, ${color.bg}dd 100%)`;
        }
        return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    };

    const configs = {
        homeroom: {
            title: 'Homeroom Monitor',
            headerColor: 'linear-gradient(135deg, #ffc107 0%, #ff8c00 100%)',
            icon: 'bi-house-door'
        },
        subject: {
            title: `${focusSubjects.join(' & ')} Monitor`,
            headerColor: getSubjectGradient(focusSubjects[0]),
            icon: 'bi-journal-text'
        },
        admin: {
            title: 'Admin Monitor',
            headerColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            icon: 'bi-shield-check'
        }
    };
    
    return configs[monitorContext] || configs.homeroom;
};

export const getWeekDates = (startDate) => {
    const dates = [];
    const start = new Date(startDate);
    for (let i = 0; i < 7; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
};

export const getStatusBadgeClass = (status) => {
    switch (status) {
        case 'present': return 'bg-success';
        case 'absent': return 'bg-danger';
        case 'late': return 'bg-warning text-dark';
        case 'excused': return 'bg-info';
        default: return 'bg-light text-muted';
    }
};

export const getStatusIcon = (status) => {
    switch (status) {
        case 'present': return '✓';
        case 'absent': return '✗';
        case 'late': return '⏰';
        case 'excused': return '📋';
        default: return '·';
    }
};

export const exportToCSV = (students, subjects, attendanceData, sectionData) => {
    const today = new Date().toISOString().split('T')[0];
    const sectionName = sectionData.name || `${sectionData.gradeLevel}-${sectionData.sectionName}`;
    const todayData = attendanceData[today] || {};
    
    let csvContent = "Student Name,";
    subjects.forEach(subject => {
        csvContent += `${subject.name} Status,${subject.name} Notes,`;
    });
    csvContent += "\n";

    students.forEach(student => {
        csvContent += `"${student.firstName} ${student.lastName}",`;
        
        subjects.forEach(subject => {
            const subjectData = todayData[subject.name];
            const studentRecord = subjectData?.students?.find(s => 
                s.studentName === `${student.firstName} ${student.lastName}`
            );
            
            const status = studentRecord?.status || 'Not Taken';
            const notes = studentRecord?.notes || '';
            csvContent += `"${status}","${notes}",`;
        });
        csvContent += "\n";
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${sectionName}_attendance_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};