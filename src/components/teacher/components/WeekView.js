// src/components/teacher/components/WeekView.js
import React from 'react';
import { calculateWeekData } from '../utils/monitorCalculations';

const WeekView = ({ subjects, historicalData, currentWeekStart, setCurrentWeekStart }) => {
    const weekData = calculateWeekData(subjects, historicalData, currentWeekStart);

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

    return (
        <div className="week-view">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <button 
                    className="btn btn-outline-secondary btn-sm"
                    onClick={goToPreviousWeek}
                >
                    <i className="bi bi-chevron-left"></i>
                </button>
                
                <h6 className="mb-0">
                    Week of {new Date(currentWeekStart).toLocaleDateString()}
                </h6>
                
                <button 
                    className="btn btn-outline-secondary btn-sm"
                    onClick={goToNextWeek}
                >
                    <i className="bi bi-chevron-right"></i>
                </button>
            </div>

            <div className="table-responsive">
                <table className="table table-sm">
                    <thead>
                        <tr>
                            <th style={{ width: '100px' }}>Day</th>
                            {subjects.map(subject => (
                                <th key={subject.id} className="text-center" style={{ minWidth: '80px' }}>
                                    <div 
                                        className="badge mb-1"
                                        style={{ backgroundColor: subject.color, color: 'white' }}
                                    >
                                        {subject.code}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {weekData.map((day, dayIndex) => (
                            <tr key={dayIndex}>
                                <td>
                                    <div className="fw-bold">{day.dayName}</div>
                                    <small className="text-muted">{day.dayNumber}</small>
                                </td>
                                {day.subjects.map((subject, subIndex) => (
                                    <td key={subIndex} className="text-center">
                                        {subject.status === 'taken' ? (
                                            <span 
                                                className="badge"
                                                style={{
                                                    backgroundColor: subject.color,
                                                    color: 'white'
                                                }}
                                            >
                                                {subject.attendanceRate}%
                                            </span>
                                        ) : (
                                            <span className="text-muted">—</span>
                                        )}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default WeekView;