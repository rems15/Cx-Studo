// src/utils/dateUtils.js
export const formatLongDate = (date) => {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(date);
};

export const formatShortDate = (date) => {
    return new Intl.DateTimeFormat('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
    }).format(date);
};

export const formatTime = (date) => {
    return new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    }).format(date);
};

export const getCurrentDateString = () => {
    return new Date().toISOString().split('T')[0];
};