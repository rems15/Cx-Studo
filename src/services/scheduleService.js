// src/services/scheduleService.js - FIXED VERSION
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

/**
 * FIXED Schedule Service - Proper week and day detection
 */
export class ScheduleService {
  
  /**
   * FIXED: Proper week detection that matches Firebase structure
   */
  static getCurrentWeek() {
    const today = new Date();
    
    // FIXED: Use proper school calendar calculation
    const schoolStartDate = new Date('2024-09-02'); // Update this to your actual school start date
    
    const timeDiff = today.getTime() - schoolStartDate.getTime();
    const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const weeksSinceStart = Math.floor(daysDiff / 7);
    
    // FIXED: Return proper string format that matches Firebase
    const currentWeek = weeksSinceStart % 2 === 0 ? 'week1' : 'week2';
    
    console.log(`📊 Schedule Debug - Current Week: ${currentWeek}`);
    console.log(`📊 Days since school start: ${daysDiff}, Weeks: ${weeksSinceStart}`);
    
    return currentWeek;
  }
  
  /**
   * FIXED: Enhanced day detection with debugging
   */
  static getCurrentDay() {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = new Date();
    const currentDay = days[today.getDay()];
    
    console.log(`📅 Schedule Debug - Current Day: ${currentDay} (index: ${today.getDay()})`);
    console.log(`📅 Full date: ${today.toDateString()}`);
    
    return currentDay;
  }
  
  /**
   * STEP 3: Main function - filter subjects based on schedule
   * This is what we'll call from teacherService.js
   */
  static async filterSubjectsForToday(allSubjects) {
    try {
      const currentWeek = this.getCurrentWeek();
      const currentDay = this.getCurrentDay();
      
      console.log(`🔍 Filtering subjects for: ${currentWeek}, ${currentDay}`);
      
      const scheduledSubjects = [];
      
      for (const subject of allSubjects) {
        // Check if subject has schedule data
        if (subject.schedule && subject.schedule[currentWeek]) {
          const weekSchedule = subject.schedule[currentWeek];
          
          // Find today's schedule
          const todaySlots = weekSchedule.filter(slot => slot.day === currentDay);
          
          if (todaySlots.length > 0) {
            // Subject is scheduled today - add schedule info
            const enhancedSubject = {
              ...subject,
              isScheduledToday: true,
              todaySchedule: todaySlots,
              scheduleDisplay: this.formatScheduleDisplay(todaySlots)
            };
            
            scheduledSubjects.push(enhancedSubject);
            console.log(`✅ ${subject.name} scheduled for today`);
          } else {
            console.log(`❌ ${subject.name} NOT scheduled for ${currentDay}`);
          }
        } else {
          // Subject has no schedule data - include it anyway (backward compatibility)
          console.log(`⚠️ ${subject.name} has no schedule data`);
          scheduledSubjects.push({
            ...subject,
            isScheduledToday: false,
            scheduleDisplay: 'No schedule info'
          });
        }
      }
      
      // Sort by period time
      scheduledSubjects.sort((a, b) => {
        const aPeriod = a.todaySchedule?.[0]?.period || 999;
        const bPeriod = b.todaySchedule?.[0]?.period || 999;
        return aPeriod - bPeriod;
      });
      
      console.log(`🎯 Final scheduled subjects for today:`, scheduledSubjects.map(s => s.name));
      return scheduledSubjects;
      
    } catch (error) {
      console.error('Error filtering subjects:', error);
      return allSubjects; // Return all subjects if filtering fails
    }
  }
  
  /**
   * STEP 4: Format schedule for display on cards
   */
  static formatScheduleDisplay(scheduleSlots) {
    if (!scheduleSlots || scheduleSlots.length === 0) return '';
    
    return scheduleSlots.map(slot => slot.time).join(', ');
  }
  
  /**
   * FIXED: Get week display for header
   */
  static getWeekDisplayText() {
    const week = this.getCurrentWeek();
    const weekNumber = week === 'week1' ? '1' : '2';
    return `Week ${weekNumber}`;
  }
  
  /**
   * FIXED: Check if a specific subject is scheduled for today
   */
  static async isSubjectScheduledToday(subjectName) {
    try {
      const currentWeek = this.getCurrentWeek();
      const currentDay = this.getCurrentDay();
      
      console.log(`🔍 Checking ${subjectName} for ${currentWeek} ${currentDay}`);
      
      // Get subject from database
      const subjectsSnapshot = await getDocs(collection(db, 'subjects'));
      
      let subject = null;
      subjectsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.name === subjectName) {
          subject = { id: doc.id, ...data };
        }
      });
      
      if (!subject) {
        console.log(`❌ Subject "${subjectName}" not found in database`);
        return false;
      }
      
      if (!subject.schedule) {
        console.log(`❌ Subject "${subjectName}" has no schedule data`);
        return false;
      }
      
      const weekSchedule = subject.schedule[currentWeek];
      if (!weekSchedule) {
        console.log(`❌ Subject "${subjectName}" has no schedule for ${currentWeek}`);
        return false;
      }
      
      const isScheduled = weekSchedule.some(slot => slot.day === currentDay);
      
      if (isScheduled) {
        console.log(`✅ ${subjectName} IS scheduled for ${currentDay}`);
      } else {
        console.log(`❌ ${subjectName} is NOT scheduled for ${currentDay}`);
      }
      
      return isScheduled;
      
    } catch (error) {
      console.error('Error checking subject schedule:', error);
      return false;
    }
  }
  
  /**
   * STEP 7: Get schedule info for a specific subject today
   */
  static async getSubjectScheduleToday(subjectName) {
    try {
      const currentWeek = this.getCurrentWeek();
      const currentDay = this.getCurrentDay();
      
      const subjectsSnapshot = await getDocs(collection(db, 'subjects'));
      
      let subject = null;
      subjectsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.name === subjectName) {
          subject = { id: doc.id, ...data };
        }
      });
      
      if (!subject || !subject.schedule) {
        return [];
      }
      
      const weekSchedule = subject.schedule[currentWeek];
      if (!weekSchedule) {
        return [];
      }
      
      return weekSchedule.filter(slot => slot.day === currentDay);
      
    } catch (error) {
      console.error('Error getting subject schedule:', error);
      return [];
    }
  }

  /**
   * TESTING HELPER: Debug current schedule state
   */
  static debugCurrentSchedule() {
    console.group('🔍 SCHEDULE DEBUG');
    
    const today = new Date();
    const currentWeek = this.getCurrentWeek();
    const currentDay = this.getCurrentDay();
    
    console.log('📅 Today:', today.toDateString());
    console.log('📊 Detected Week:', currentWeek);
    console.log('📅 Detected Day:', currentDay);
    console.log('🎯 Expected: If today is Tuesday, Monday subjects (like MUN) should NOT show');
    
    console.groupEnd();
    
    return { currentWeek, currentDay };
  }
}