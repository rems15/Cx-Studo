// src/services/scheduleService.js - NEW FILE
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Schedule Service - Handles week detection and schedule-aware filtering
 */
export class ScheduleService {
  
  /**
   * Determine if current date is Week 1 or Week 2
   */
  static getCurrentWeek() {
    try {
      // For testing scenario - you can replace this with dynamic logic later
      const semesterStartDate = new Date('2025-01-13'); // Monday of Week 1
      const today = new Date();
      
      // Calculate days since semester start
      const daysDiff = Math.floor((today - semesterStartDate) / (1000 * 60 * 60 * 24));
      
      // Calculate week number (0-based, then convert to 1-based)
      const weekNumber = Math.floor(daysDiff / 7);
      
      // Alternating weeks: even weeks = Week 1, odd weeks = Week 2
      const currentWeek = (weekNumber % 2) + 1;
      
      console.log(`📅 Schedule Service: Today is Week ${currentWeek}`);
      console.log(`📊 Debug: Days since start: ${daysDiff}, Week number: ${weekNumber}`);
      
      return currentWeek;
      
    } catch (error) {
      console.error('❌ Error calculating current week:', error);
      return 1; // Default to Week 1
    }
  }
  
  /**
   * Get current day name (monday, tuesday, etc.)
   */
  static getCurrentDay() {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = new Date();
    return days[today.getDay()];
  }
  
  /**
   * Get subjects scheduled for today based on current week
   */
  static async getScheduledSubjectsForToday() {
    try {
      const currentWeek = this.getCurrentWeek();
      const currentDay = this.getCurrentDay();
      
      console.log(`🔍 Getting subjects for Week ${currentWeek}, ${currentDay}`);
      
      // Get all active subjects with schedule data
      const subjectsSnapshot = await getDocs(
        query(collection(db, 'subjects'), where('active', '==', true))
      );
      
      const scheduledSubjects = [];
      
      subjectsSnapshot.forEach(doc => {
        const subjectData = { id: doc.id, ...doc.data() };
        
        // Check if subject has schedule data
        if (subjectData.schedule && subjectData.schedule[`week${currentWeek}`]) {
          const weekSchedule = subjectData.schedule[`week${currentWeek}`];
          
          // Check if subject is scheduled for today
          const todaySchedule = weekSchedule.filter(slot => slot.day === currentDay);
          
          if (todaySchedule.length > 0) {
            // Add schedule info to subject
            subjectData.todaySchedule = todaySchedule;
            subjectData.scheduledToday = true;
            
            console.log(`✅ ${subjectData.name} is scheduled today:`, todaySchedule);
            scheduledSubjects.push(subjectData);
          }
        }
      });
      
      // Sort subjects by first period time
      scheduledSubjects.sort((a, b) => {
        const aPeriod = a.todaySchedule[0]?.period || 999;
        const bPeriod = b.todaySchedule[0]?.period || 999;
        return aPeriod - bPeriod;
      });
      
      console.log(`📋 Found ${scheduledSubjects.length} subjects scheduled for today`);
      return scheduledSubjects;
      
    } catch (error) {
      console.error('❌ Error getting scheduled subjects:', error);
      return [];
    }
  }
  
  /**
   * Check if a specific subject is scheduled for today
   */
  static async isSubjectScheduledToday(subjectName) {
    const scheduledSubjects = await this.getScheduledSubjectsForToday();
    return scheduledSubjects.some(subject => subject.name === subjectName);
  }
  
  /**
   * Get schedule info for a specific subject today
   */
  static async getSubjectScheduleToday(subjectName) {
    const scheduledSubjects = await this.getScheduledSubjectsForToday();
    const subject = scheduledSubjects.find(s => s.name === subjectName);
    return subject?.todaySchedule || [];
  }
  
  /**
   * Get all subjects (for subject teachers - no filtering)
   */
  static async getAllActiveSubjects() {
    try {
      const subjectsSnapshot = await getDocs(
        query(collection(db, 'subjects'), where('active', '==', true))
      );
      
      const subjects = [];
      subjectsSnapshot.forEach(doc => {
        subjects.push({ id: doc.id, ...doc.data() });
      });
      
      return subjects;
      
    } catch (error) {
      console.error('❌ Error getting all subjects:', error);
      return [];
    }
  }
  
  /**
   * Format schedule info for display
   */
  static formatScheduleInfo(scheduleSlots) {
    if (!scheduleSlots || scheduleSlots.length === 0) return '';
    
    return scheduleSlots.map(slot => 
      `Period ${slot.period} (${slot.time})`
    ).join(', ');
  }
  
  /**
   * Debug function - log current schedule state
   */
  static async debugScheduleState() {
    console.group('🔧 SCHEDULE DEBUG STATE');
    
    const currentWeek = this.getCurrentWeek();
    const currentDay = this.getCurrentDay();
    const scheduledSubjects = await this.getScheduledSubjectsForToday();
    
    console.log('📅 Current Week:', currentWeek);
    console.log('📅 Current Day:', currentDay);
    console.log('📚 Scheduled Subjects Today:', scheduledSubjects.length);
    
    scheduledSubjects.forEach(subject => {
      console.log(`  📖 ${subject.name}:`, subject.todaySchedule);
    });
    
    console.groupEnd();
  }
}