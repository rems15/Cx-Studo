import { 
  collection, 
  getDocs, 
  doc, 
  deleteDoc, 
  updateDoc, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  where 
} from 'firebase/firestore';
import { db } from './firebase';

// TEACHER FUNCTIONS
export const getAllTeachers = async () => {
  const usersSnapshot = await getDocs(collection(db, 'users'));
  const teachersData = [];
  usersSnapshot.forEach(doc => {
    const userData = doc.data();
    if (userData.roles?.includes('homeroom') || userData.roles?.includes('subject')) {
      teachersData.push({
        id: doc.id,
        ...userData
      });
    }
  });
  return teachersData;
};

export const deleteTeacher = async (teacherId) => {
  await deleteDoc(doc(db, 'users', teacherId));
};

export const toggleTeacherStatus = async (teacherId, newStatus) => {
  await updateDoc(doc(db, 'users', teacherId), {
    status: newStatus,
    updatedAt: new Date().toISOString()
  });
};

export const resetTeacherPassword = async (teacherId) => {
  await updateDoc(doc(db, 'users', teacherId), {
    mustChangePassword: true,
    passwordChanged: false,
    passwordResetAt: new Date().toISOString()
  });
};

// SECTION FUNCTIONS
export const getAllSections = async () => {
  const sectionsSnapshot = await getDocs(collection(db, 'sections'));
  const sectionsData = [];
  sectionsSnapshot.forEach(doc => {
    sectionsData.push({
      id: doc.id,
      ...doc.data()
    });
  });
  return sectionsData;
};

export const deleteSection = async (sectionId) => {
  await deleteDoc(doc(db, 'sections', sectionId));
};

// STUDENT FUNCTIONS
export const getAllStudents = async () => {
  const studentsSnapshot = await getDocs(collection(db, 'students'));
  const studentsData = [];
  studentsSnapshot.forEach(doc => {
    studentsData.push({
      id: doc.id,
      ...doc.data()
    });
  });
  return studentsData;
};

export const deleteStudent = async (studentId) => {
  await deleteDoc(doc(db, 'students', studentId));
};

// SUBJECT FUNCTIONS
export const getAllSubjects = async () => {
  const subjectsSnapshot = await getDocs(query(collection(db, 'subjects'), orderBy('name')));
  const subjectsData = [];
  subjectsSnapshot.forEach(doc => {
    subjectsData.push({
      id: doc.id,
      ...doc.data()
    });
  });
  return subjectsData;
};

export const toggleSubjectStatus = async (subjectId, active) => {
  await updateDoc(doc(db, 'subjects', subjectId), {
    active: active,
    updatedAt: new Date()
  });
};

// REAL-TIME LISTENERS
export const setupTeachersListener = (callback) => {
  return onSnapshot(collection(db, 'users'), (snapshot) => {
    const teachersData = [];
    snapshot.forEach(doc => {
      const userData = doc.data();
      if (userData.roles?.includes('homeroom') || userData.roles?.includes('subject')) {
        teachersData.push({
          id: doc.id,
          ...userData
        });
      }
    });
    callback(teachersData);
  });
};

export const setupSectionsListener = (callback) => {
  return onSnapshot(collection(db, 'sections'), (snapshot) => {
    const sectionsData = [];
    snapshot.forEach(doc => {
      sectionsData.push({
        id: doc.id,
        ...doc.data()
      });
    });
    callback(sectionsData);
  });
};

export const setupStudentsListener = (callback) => {
  return onSnapshot(collection(db, 'students'), (snapshot) => {
    const studentsData = [];
    snapshot.forEach(doc => {
      studentsData.push({
        id: doc.id,
        ...doc.data()
      });
    });
    callback(studentsData);
  });
};

export const setupSubjectsListener = (callback) => {
  return onSnapshot(query(collection(db, 'subjects'), orderBy('name')), (snapshot) => {
    const subjectsData = [];
    snapshot.forEach(doc => {
      subjectsData.push({
        id: doc.id,
        ...doc.data()
      });
    });
    callback(subjectsData);
  });
};

// ACTIVITY LOGGING
export const logActivity = async (action, description, performedBy, severity = 'medium') => {
  await addDoc(collection(db, 'activityLog'), {
    action,
    description,
    performedBy,
    timestamp: new Date().toISOString(),
    severity
  });
};