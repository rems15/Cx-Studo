// src/components/teacher/utils/scheduleHelpers.js

/**
 * Smart subject filtering based on selected date and school schedule
 * Filters subjects to show only those scheduled for the selected date
 */

/**
 * Main function: Get subjects scheduled for a specific date
 * @param {Array} allSubjects - All subjects from the database
 * @param {string} selectedDate - Date in YYYY-MM-DD format
 * @returns {Array} Filtered subjects for that date
 */
export const getScheduledSubjectsForDate = (allSubjects, selectedDate) => {
  console.log('🗓️ Getting scheduled subjects for:', selectedDate);
  console.log('📚 All subjects:', allSubjects.map(s => s.name));

  // For non-today dates, show all subjects (fallback)
  const today = new Date().toISOString().split('T')[0];
  const isToday = selectedDate === today;
  
  if (!isToday) {
    console.log('📅 Not today - showing all subjects');
    return allSubjects;
  }

  // Get current week and day for filtering
  const currentWeek = getCurrentWeek(new Date());
  const currentDay = getCurrentDay(new Date());
  
  console.log(`📊 Current schedule: ${currentWeek}, ${currentDay}`);

  // Filter subjects scheduled for today
  const scheduledSubjects = [];

  // Always include Homeroom first
  const homeroomSubject = allSubjects.find(s => s.name === 'Homeroom');
  if (homeroomSubject) {
    scheduledSubjects.push(homeroomSubject);
  }

  // Filter other subjects based on schedule
  allSubjects.forEach(subject => {
    // Skip homeroom (already added)
    if (subject.name === 'Homeroom') return;

    // Check if subject is scheduled today
    if (isSubjectScheduledToday(subject, currentWeek, currentDay)) {
      scheduledSubjects.push(subject);
      console.log(`✅ ${subject.name} is scheduled today`);
    } else {
      console.log(`⏸️ ${subject.name} is NOT scheduled today`);
    }
  });

  console.log('🎯 Final scheduled subjects:', scheduledSubjects.map(s => s.name));
  return scheduledSubjects;
};

/**
 * Determine current week (Week 1 or Week 2)
 * Based on your alternating schedule system
 */
export const getCurrentWeek = (date = new Date()) => {
  // TODO: Adjust this date to match your actual school start date
  const schoolStartDate = new Date('2024-09-02'); // First Monday of school year
  
  // Calculate weeks since school started
  const timeDiff = date.getTime() - schoolStartDate.getTime();
  const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  const weeksSinceStart = Math.floor(daysDiff / 7);
  
  // Alternate between week1 and week2
  const currentWeek = weeksSinceStart % 2 === 0 ? 'week1' : 'week2';
  
  console.log(`📆 School started: ${schoolStartDate.toDateString()}`);
  console.log(`📊 Days since start: ${daysDiff}, Week: ${currentWeek}`);
  
  return currentWeek;
};

/**
 * Get current day name
 */
export const getCurrentDay = (date = new Date()) => {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[date.getDay()];
};

/**
 * Check if a subject is scheduled for today
 * Uses database schedule data from subjects collection
 * Based on your Firebase structure: schedule.week1[{day, period, time}]
 */
export const isSubjectScheduledToday = (subject, currentWeek, currentDay) => {
  // Always show Homeroom
  if (subject.name === 'Homeroom') return true;

  // Check if subject has schedule data from database
  if (subject.schedule && subject.schedule[currentWeek] && Array.isArray(subject.schedule[currentWeek])) {
    const todaySchedule = subject.schedule[currentWeek].find(slot => 
      slot.day?.toLowerCase() === currentDay.toLowerCase()
    );
    
    if (todaySchedule) {
      console.log(`✅ ${subject.name} scheduled for ${currentWeek} ${currentDay}:`, {
        period: todaySchedule.period,
        time: todaySchedule.time,
        room: subject.room
      });
      return true;
    }
  }

  // If no schedule data, assume subject is not scheduled today
  console.log(`❌ ${subject.name} not scheduled for ${currentWeek} ${currentDay}`);
  return false;
};

/**
 * Utility function to get today's scheduled subjects (shorthand)
 */
export const getTodaysScheduledSubjects = (allSubjects) => {
  const today = new Date().toISOString().split('T')[0];
  return getScheduledSubjectsForDate(allSubjects, today);
};

/**
 * Get a human-readable description of the current schedule
 */
export const getCurrentScheduleInfo = () => {
  const currentWeek = getCurrentWeek();
  const currentDay = getCurrentDay();
  
  return {
    week: currentWeek,
    day: currentDay,
    displayText: `${currentWeek.charAt(0).toUpperCase() + currentWeek.slice(1)}, ${currentDay.charAt(0).toUpperCase() + currentDay.slice(1)}`
  };
};

/**
 * Debug function to analyze schedule patterns
 */
export const debugScheduleForSubject = (subjectName, allSubjects) => {
  console.group(`🔍 DEBUG: Schedule for ${subjectName}`);
  
  const subject = allSubjects.find(s => s.name === subjectName);
  if (!subject) {
    console.log('❌ Subject not found');
    console.groupEnd();
    return;
  }

  const currentWeek = getCurrentWeek();
  const currentDay = getCurrentDay();
  
  console.log('Subject data:', subject);
  console.log('Current week:', currentWeek);
  console.log('Current day:', currentDay);
  console.log('Is scheduled today:', isSubjectScheduledToday(subject, currentWeek, currentDay));
  
  // Test all days for current week
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  console.log(`Schedule for ${currentWeek}:`);
  days.forEach(day => {
    const isScheduled = isSubjectScheduledToday(subject, currentWeek, day);
    console.log(`  ${day}: ${isScheduled ? '✅' : '❌'}`);
  });
  
  console.groupEnd();
};

/**
 * Get all subjects scheduled for a specific week
 */
export const getSubjectsForWeek = (allSubjects, weekType = null) => {
  const targetWeek = weekType || getCurrentWeek();
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  
  const weekSchedule = {};
  
  days.forEach(day => {
    weekSchedule[day] = allSubjects.filter(subject => 
      isSubjectScheduledToday(subject, targetWeek, day)
    );
  });
  
  return {
    week: targetWeek,
    schedule: weekSchedule,
    totalSubjects: new Set(Object.values(weekSchedule).flat().map(s => s.name)).size
  };
};

/**
 * 🧪 TEST FUNCTION - Test schedule helpers with your actual subjects
 * Call this in your component to verify the logic works
 */
export const testScheduleHelpers = (allSubjects) => {
  console.group('🧪 TESTING SCHEDULE HELPERS');
  
  // Log current date/time info
  const now = new Date();
  const currentWeek = getCurrentWeek(now);
  const currentDay = getCurrentDay(now);
  
  console.log('📅 Current date:', now.toDateString());
  console.log('📊 Current week:', currentWeek);
  console.log('📅 Current day:', currentDay);
  
  // Log all subjects
  console.log('\n📚 All subjects loaded:');
  allSubjects.forEach((subject, index) => {
    console.log(`  ${index + 1}. ${subject.name} (${subject.code}) - Room ${subject.room}`);
    if (subject.schedule) {
      console.log(`     Schedule:`, subject.schedule);
    } else {
      console.log('     ⚠️ No schedule data');
    }
  });
  
  // Test today's filtering
  console.log(`\n🎯 Testing scheduled subjects for TODAY (${currentWeek}, ${currentDay}):`);
  const todaysSubjects = getScheduledSubjectsForDate(allSubjects, now.toISOString().split('T')[0]);
  
  console.log('✅ Subjects scheduled for today:');
  todaysSubjects.forEach((subject, index) => {
    console.log(`  ${index + 1}. ${subject.name} (${subject.code})`);
  });
  
  if (todaysSubjects.length === 0) {
    console.log('  ❌ No subjects scheduled for today');
  }
  
  // Test each subject individually
  console.log('\n🔍 Individual subject analysis:');
  allSubjects.forEach(subject => {
    const isScheduled = isSubjectScheduledToday(subject, currentWeek, currentDay);
    console.log(`  ${subject.name}: ${isScheduled ? '✅ SCHEDULED' : '❌ NOT SCHEDULED'}`);
  });
  
  // Test different days
  console.log('\n📅 Testing other days this week:');
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  days.forEach(day => {
    const daySubjects = allSubjects.filter(subject => 
      isSubjectScheduledToday(subject, currentWeek, day)
    );
    console.log(`  ${day}: ${daySubjects.map(s => s.name).join(', ') || 'No subjects'}`);
  });
  
  // Test both weeks
  console.log('\n📊 Testing Week1 vs Week2:');
  ['week1', 'week2'].forEach(week => {
    console.log(`\n  ${week.toUpperCase()}:`);
    days.forEach(day => {
      const weekDaySubjects = allSubjects.filter(subject => 
        isSubjectScheduledToday(subject, week, day)
      );
      if (weekDaySubjects.length > 0) {
        console.log(`    ${day}: ${weekDaySubjects.map(s => s.name).join(', ')}`);
      }
    });
  });
  
  console.groupEnd();
  
  // Return summary for easy access
  return {
    currentWeek,
    currentDay,
    todaysSubjects: todaysSubjects.map(s => s.name),
    totalSubjectsToday: todaysSubjects.length,
    allSubjectsCount: allSubjects.length
  };
};

/**
 * 🧪 QUICK TEST - Test with mock data matching your database structure
 * Use this if you want to test without loading actual data first
 */
export const testWithMockData = () => {
  // Mock data matching your database structure
  const mockSubjects = [
    {
      name: 'Homeroom',
      code: 'HR',
      room: 'HR01',
      // No schedule needed - always shows
    },
    {
      name: 'Music',
      code: 'MS401',
      room: '501',
      schedule: {
        week1: [
          { day: 'monday', period: 2, time: '9:05-9:50' },
          { day: 'friday', period: 8, time: '14:45-15:30' }
        ],
        week2: [
          { period: 5, time: '12:15-13:00' } // No day specified - should not show
        ]
      }
    },
    {
      name: 'Badminton',
      code: 'BM101',
      room: 'BM105',
      schedule: {
        week1: [
          { day: 'monday', period: 2 }
        ],
        week2: [
          { day: 'monday', period: 4 }
        ]
      }
    }
  ];
  
  console.log('🧪 TESTING WITH MOCK DATA');
  return testScheduleHelpers(mockSubjects);
};