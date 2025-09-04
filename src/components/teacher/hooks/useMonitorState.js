// src/components/teacher/hooks/useMonitorState.js
import { useState } from 'react';

export const useMonitorState = () => {
    // UI VIEW STATE
    const [activeView, setActiveView] = useState('today');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    // WEEK NAVIGATION STATE
    const [currentWeekStart, setCurrentWeekStart] = useState(() => {
        const today = new Date();
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return weekStart.toISOString().split('T')[0];
    });

    // MODAL STATE
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportFormat, setExportFormat] = useState('csv');

    // HELPER FUNCTIONS
    const goToPreviousWeek = () => {
        const newStart = new Date(currentWeekStart);
        newStart.setDate(newStart.getDate() - 7);
        setCurrentWeekStart(newStart.toISOString().split('T')[0]);
    };

    const goToNextWeek = () => {
        const newStart = new Date(currentWeekStart);
        newStart.setDate(newStart.getDate() + 7);
        setCurrentWeekStart(newStart.toISOString().split('T')[0]);
    };

    const goToToday = () => {
        const today = new Date();
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        setCurrentWeekStart(weekStart.toISOString().split('T')[0]);
        setActiveView('today');
    };

    const resetStudentView = () => {
        setSelectedStudent(null);
        setSearchTerm('');
    };

    return {
        // View state
        activeView,
        setActiveView,
        selectedDate,
        setSelectedDate,
        selectedStudent,
        setSelectedStudent,
        searchTerm,
        setSearchTerm,
        
        // Week navigation
        currentWeekStart,
        setCurrentWeekStart,
        goToPreviousWeek,
        goToNextWeek,
        goToToday,
        
        // Export state
        showExportModal,
        setShowExportModal,
        exportFormat,
        setExportFormat,
        
        // Helper functions
        resetStudentView
    };
};