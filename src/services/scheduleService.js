// src/services/scheduleService.js - SIMPLIFIED APPROACH
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

/**
 * SIMPLE Schedule Service - Focus on core functionality first
 */
export class ScheduleService {
  
  /**
   * STEP 1: Basic week detection (simplified for testing)
   */
  static getCurrentWeek() {
    // For now, let's use a simple approach for testing
    // Later we can make this more sophisticated
    
    const today = new Date();
    const weekNumber = Math.floor(today.getDate() / 7); // Simple calculation for testing
    const currentWeek = (weekNumber % 2) + 1; // Alternates between 1 and 2
    
    
    return currentWeek;
  }
  
  /**
   * STEP 2: Get current day name
   */
  static getCurrentDay() {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[new Date().getDay()];
  }
  
  /**
   * STEP 3: Main function - filter subjects based on schedule
   * This is what we'll call from teacherService.js
   */
  static async filterSubjectsForToday(allSubjects) {
    try {
      const currentWeek = this.getCurrentWeek();
      const currentDay = this.getCurrentDay();
      

      
      const scheduledSubjects = [];
      
      for (const subject of allSubjects) {
        // Check if subject has schedule data
        if (subject.schedule && subject.schedule[`week${currentWeek}`]) {
          const weekSchedule = subject.schedule[`week${currentWeek}`];
          
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

          } else {
 
          }
        } else {
          // Subject has no schedule data - include it anyway (backward compatibility)

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
      
    
      return scheduledSubjects;
      
    } catch (error) {

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
   * STEP 5: Get week display for header
   */
  static getWeekDisplayText() {
    const week = this.getCurrentWeek();
    return `Week ${week} Schedule`;
  }
  
  /**
   * STEP 6: Check if a specific subject is scheduled for today
   */
  static async isSubjectScheduledToday(subjectName) {
    try {
      const currentWeek = this.getCurrentWeek();
      const currentDay = this.getCurrentDay();
      

      
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
  
        return false;
      }
      
      if (!subject.schedule) {
 
        return false;
      }
      
      const weekSchedule = subject.schedule[`week${currentWeek}`];
      if (!weekSchedule) {

        return false;
      }
      
      const isScheduled = weekSchedule.some(slot => slot.day === currentDay);

      
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
      
      const weekSchedule = subject.schedule[`week${currentWeek}`];
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
   * TESTING HELPER: Log current state
   */

}