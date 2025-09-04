// src/components/teacher/utils/attendanceHelpers.js - UPDATED
export const getAttendanceConfig = (section, subjectColors) => {
    const isHomeroom = section.isHomeroom || section.subject === 'Homeroom';
    
    if (isHomeroom) {
        return {
            title: 'Take Homeroom Attendance',
            subtitle: `${section.name || `Grade ${section.gradeLevel}-${section.sectionName}`}`,
            headerColor: 'linear-gradient(135deg, #ffc107 0%, #ff8c00 100%)',
            icon: 'bi-house-door'
        };
    } else {
        const subjectColor = subjectColors[section.subject];
        return {
            title: `Take ${section.subject} Attendance`,
            subtitle: `${section.name || `Grade ${section.gradeLevel}-${section.sectionName}`}`,
            headerColor: subjectColor ? 
                `linear-gradient(135deg, ${subjectColor.bg} 0%, ${subjectColor.bg}dd 100%)` :
                'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            icon: 'bi-journal-text'
        };
    }
};

// NEW: Format long date (September 2, 2025)
export const formatLongDate = (date) => {
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    return new Intl.DateTimeFormat('en-US', options).format(date);
};

// NEW: Get status options with enhanced data
export const getStatusOptions = () => [
    { value: 'present', label: 'Present', icon: 'bi-check-circle', color: 'success' },
    { value: 'absent', label: 'Absent', icon: 'bi-x-circle', color: 'danger' },
    { value: 'late', label: 'Late', icon: 'bi-clock', color: 'warning' },
    { value: 'excused', label: 'Excused', icon: 'bi-shield-check', color: 'info' }
];

// NEW: Get homeroom status badge styling
export const getHomeroomStatusBadge = (status) => {
    const statusMap = {
        present: { className: 'badge bg-success', text: 'Present' },
        absent: { className: 'badge bg-danger', text: 'Absent' },
        late: { className: 'badge bg-warning text-dark', text: 'Late' },
        excused: { className: 'badge bg-info', text: 'Excused' }
    };
    return statusMap[status] || { className: 'badge bg-secondary', text: 'Unknown' };
};

export const getStatusButtonClass = (status, currentStatus) => {
    const baseClass = 'btn btn-sm me-1';
    const statusClasses = {
        present: 'btn-success',
        absent: 'btn-danger',
        late: 'btn-warning',
        excused: 'btn-info'
    };
    
    if (status === currentStatus) {
        return `${baseClass} ${statusClasses[status]}`;
    } else {
        return `${baseClass} btn-outline-${statusClasses[status].replace('btn-', '')}`;
    }
};

export const getStatusIcon = (status) => {
    const icons = {
        present: 'bi-check-circle',
        absent: 'bi-x-circle',
        late: 'bi-clock',
        excused: 'bi-shield-check'
    };
    return icons[status] || 'bi-question-circle';
};

export const getStatusBadgeClass = (status) => {
    const badgeClasses = {
        present: 'bg-success',
        absent: 'bg-danger',
        late: 'bg-warning text-dark',
        excused: 'bg-info'
    };
    return `badge ${badgeClasses[status] || 'bg-secondary'}`;
};

export const formatStudentName = (student) => {
    return `${student.firstName || ''} ${student.lastName || ''}`.trim();
};

export const shouldShowHomeroomAlert = (isHomeroom, homeroomData) => {
    return !isHomeroom && !homeroomData;
};

export const shouldShowSubjectAlert = (isHomeroom, homeroomData) => {
    return !isHomeroom && homeroomData;
};