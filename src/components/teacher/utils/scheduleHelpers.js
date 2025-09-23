// src/components/teacher/utils/scheduleHelpers.js - FIXED DATE COMPARISON

/**
 * Main function: Get subjects scheduled for a specific date
 * @param {Array} allSubjects - All subjects from the database
 * @param {string} selectedDate - Date in YYYY-MM-DD format
 * @returns {Array} Filtered subjects for that date
 */
export const getScheduledSubjectsForDate = (allSubjects, selectedDate) => {
  console.log('🗓️ Getting scheduled subjects for:', selectedDate);
  console.log('📚 All subjects:', allSubjects.map(s => s.name));

  // FIXED: Better date comparison that handles timezone issues
  const today = new Date();
  const todayString = today.getFullYear() + '-' + 
    String(today.getMonth() + 1).padStart(2, '0') + '-' + 
    String(today.getDate()).padStart(2, '0');
  
  const isToday = selectedDate === todayString;
  
  console.log('📅 Date comparison:', {
    selectedDate,
    todayString,
    isToday,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });
  
  // OPTION 1: Remove the "today only" restriction entirely
  // Always attempt to filter based on schedule data regardless of date
  
  // OPTION 2: Keep the today check but with better date handling
  if (!isToday) {
    console.log('📅 Not today - but attempting schedule filtering anyway');
    // Instead of returning all subjects, try to filter based on day of week
    return getScheduledSubjectsForAnyDate(allSubjects, selectedDate);
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
 * NEW: Handle schedule filtering for any date (not just today)
 */
export const getScheduledSubjectsForAnyDate = (allSubjects, selectedDate) => {
  console.log('📅 Filtering subjects for any date:', selectedDate);
  
  // Convert selectedDate to day of week
  const date = new Date(selectedDate + 'T12:00:00'); // Add time to avoid timezone issues
  const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];
  
  // Calculate which week this date falls in (you may need to adjust this)
  const weekType = getCurrentWeek(date);
  
  console.log(`📊 Schedule for ${selectedDate}: ${weekType}, ${dayName}`);

  const scheduledSubjects = [];

  // Always include Homeroom
  const homeroomSubject = allSubjects.find(s => s.name === 'Homeroom');
  if (homeroomSubject) {
    scheduledSubjects.push(homeroomSubject);
  }

  // Filter subjects based on their schedule for this day
  allSubjects.forEach(subject => {
    if (subject.name === 'Homeroom') return;

    if (isSubjectScheduledToday(subject, weekType, dayName)) {
      scheduledSubjects.push(subject);
      console.log(`✅ ${subject.name} is scheduled for ${dayName}`);
    }
  });

  console.log('🎯 Scheduled subjects for', selectedDate, ':', scheduledSubjects.map(s => s.name));
  
  // Return at least homeroom if no other subjects found
  return scheduledSubjects.length > 0 ? scheduledSubjects : (homeroomSubject ? [homeroomSubject] : []);
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

// ALTERNATIVE: Simplified version that always attempts filtering
export const getScheduledSubjectsForDateSimple = (allSubjects, selectedDate) => {
  console.log('🗓️ Getting scheduled subjects for:', selectedDate);
  
  // Convert date to day of week
  const date = new Date(selectedDate + 'T12:00:00');
  const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];
  const weekType = getCurrentWeek(date);
  
  console.log(`📅 Filtering for: ${weekType} ${dayName}`);

  const scheduledSubjects = [];
  
  // Always include Homeroom
  const homeroom = allSubjects.find(s => s.name === 'Homeroom');
  if (homeroom) scheduledSubjects.push(homeroom);

  // Add subjects scheduled for this day
  allSubjects.forEach(subject => {
    if (subject.name === 'Homeroom') return;
    
    // Check schedule
    if (subject.schedule?.[weekType]?.some(slot => slot.day?.toLowerCase() === dayName)) {
      scheduledSubjects.push(subject);
    }
  });

  console.log('📚 Found subjects:', scheduledSubjects.map(s => s.name));
  
  // If no subjects found (weekend?), return homeroom only
  return scheduledSubjects.length > 0 ? scheduledSubjects : (homeroom ? [homeroom] : []);
};

/**
 * Utility function to get today's scheduled subjects (shorthand)
 */
export const getTodaysScheduledSubjects = (allSubjects) => {
  const today = new Date();
  const todayString = today.getFullYear() + '-' + 
    String(today.getMonth() + 1).padStart(2, '0') + '-' + 
    String(today.getDate()).padStart(2, '0');
  return getScheduledSubjectsForDate(allSubjects, todayString);
};