// src/components/teacher/debug/EnrollmentDebugModal.js
import React, { useState, useEffect } from 'react';
import { StudentFilteringService } from '../../../services/studentFilteringService';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../services/firebase';

const EnrollmentDebugModal = ({ section, onClose }) => {
  const [debugData, setDebugData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (section) {
      loadDebugData();
    }
  }, [section]);

  const loadDebugData = async () => {
    try {
      setLoading(true);
      
      const sectionId = section.sectionId || section.id;
      const subject = section.subject || 'Homeroom';
      
      // Get all section students
      const allStudents = await StudentFilteringService.getAllSectionStudents(sectionId);
      
      // Get filtered students
      const filteredStudents = await StudentFilteringService.getStudentsForSubjectSection(
        sectionId, 
        subject, 
        section.isHomeroom
      );

      // Get section data
      const sectionData = await getSectionData(sectionId);
      
      // Get subjects list
      const subjects = await getSubjectsList();
      
      // Analyze enrollment patterns
      const enrollmentAnalysis = analyzeEnrollmentPatterns(allStudents, subject);

      setDebugData({
        sectionId,
        subject,
        isHomeroom: section.isHomeroom,
        allStudents,
        filteredStudents,
        sectionData,
        subjects,
        enrollmentAnalysis,
        expectedCount: section.studentCount || section.enrolledCount || sectionData?.currentEnrollment || 0
      });

    } catch (error) {
      console.error('Error loading debug data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSectionData = async (sectionId) => {
    try {
      const sectionQuery = query(collection(db, 'sections'), where('__name__', '==', sectionId));
      const snapshot = await getDocs(sectionQuery);
      return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    } catch (error) {
      console.error('Error getting section data:', error);
      return null;
    }
  };

  const getSubjectsList = async () => {
    try {
      const subjectsSnapshot = await getDocs(collection(db, 'subjects'));
      const subjects = [];
      subjectsSnapshot.forEach(doc => {
        subjects.push({ id: doc.id, ...doc.data() });
      });
      return subjects;
    } catch (error) {
      console.error('Error getting subjects:', error);
      return [];
    }
  };

  const analyzeEnrollmentPatterns = (students, targetSubject) => {
    const patterns = {
      hasSubjectEnrollments: 0,
      hasSelectedSubjects: 0,
      hasSubjectsArray: 0,
      hasDirectSubject: 0,
      enrolledInTarget: 0,
      commonSubjects: {},
      enrollmentFields: new Set()
    };

    students.forEach(student => {
      // Check different enrollment fields
      if (student.subjectEnrollments?.length > 0) {
        patterns.hasSubjectEnrollments++;
        patterns.enrollmentFields.add('subjectEnrollments');
        
        student.subjectEnrollments.forEach(enrollment => {
          const subject = enrollment.subjectName || enrollment.subject;
          if (subject) {
            patterns.commonSubjects[subject] = (patterns.commonSubjects[subject] || 0) + 1;
            if (subject.toLowerCase() === targetSubject.toLowerCase()) {
              patterns.enrolledInTarget++;
            }
          }
        });
      }

      if (student.selectedSubjects?.length > 0) {
        patterns.hasSelectedSubjects++;
        patterns.enrollmentFields.add('selectedSubjects');
        
        student.selectedSubjects.forEach(subject => {
          if (subject) {
            patterns.commonSubjects[subject] = (patterns.commonSubjects[subject] || 0) + 1;
            if (subject.toLowerCase() === targetSubject.toLowerCase()) {
              patterns.enrolledInTarget++;
            }
          }
        });
      }

      if (student.subjects?.length > 0) {
        patterns.hasSubjectsArray++;
        patterns.enrollmentFields.add('subjects');
        
        student.subjects.forEach(subject => {
          if (subject) {
            patterns.commonSubjects[subject] = (patterns.commonSubjects[subject] || 0) + 1;
            if (subject.toLowerCase() === targetSubject.toLowerCase()) {
              patterns.enrolledInTarget++;
            }
          }
        });
      }

      if (student.subject) {
        patterns.hasDirectSubject++;
        patterns.enrollmentFields.add('subject');
        
        patterns.commonSubjects[student.subject] = (patterns.commonSubjects[student.subject] || 0) + 1;
        if (student.subject.toLowerCase() === targetSubject.toLowerCase()) {
          patterns.enrolledInTarget++;
        }
      }
    });

    return patterns;
  };

  if (loading) {
    return (
      <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-body text-center py-5">
              <div className="spinner-border text-primary mb-3"></div>
              <h5>Analyzing Enrollment Data...</h5>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!debugData) {
    return (
      <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5>Debug Error</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body">
              <div className="alert alert-danger">Failed to load debug data.</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
      <div className="modal-dialog modal-xl">
        <div className="modal-content">
          <div className="modal-header bg-info text-white">
            <h5 className="modal-title">
              <i className="bi bi-bug me-2"></i>
              Student Enrollment Debug - {debugData.subject}
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>

          <div className="modal-body p-0">
            {/* Tab Navigation */}
            <div className="d-flex border-bottom">
              <div className="btn-group w-100" role="group">
                {['overview', 'students', 'enrollment', 'recommendations'].map(tab => (
                  <button
                    key={tab}
                    className={`btn ${activeTab === tab ? 'btn-info' : 'btn-outline-info'} btn-sm`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="row g-4">
                  <div className="col-md-6">
                    <div className="card">
                      <div className="card-header">
                        <h6 className="mb-0">Section Information</h6>
                      </div>
                      <div className="card-body">
                        <table className="table table-sm">
                          <tbody>
                            <tr>
                              <td><strong>Section ID:</strong></td>
                              <td><code>{debugData.sectionId}</code></td>
                            </tr>
                            <tr>
                              <td><strong>Subject:</strong></td>
                              <td>{debugData.subject}</td>
                            </tr>
                            <tr>
                              <td><strong>Is Homeroom:</strong></td>
                              <td>{debugData.isHomeroom ? 'Yes' : 'No'}</td>
                            </tr>
                            <tr>
                              <td><strong>Expected Students:</strong></td>
                              <td>{debugData.expectedCount}</td>
                            </tr>
                            <tr>
                              <td><strong>Total in Section:</strong></td>
                              <td>{debugData.allStudents.length}</td>
                            </tr>
                            <tr>
                              <td><strong>Filtered Result:</strong></td>
                              <td className={debugData.filteredStudents.length === 0 ? 'text-danger' : 'text-success'}>
                                {debugData.filteredStudents.length}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="card">
                      <div className="card-header">
                        <h6 className="mb-0">Enrollment Analysis</h6>
                      </div>
                      <div className="card-body">
                        <table className="table table-sm">
                          <tbody>
                            <tr>
                              <td>Students with subjectEnrollments:</td>
                              <td>{debugData.enrollmentAnalysis.hasSubjectEnrollments}</td>
                            </tr>
                            <tr>
                              <td>Students with selectedSubjects:</td>
                              <td>{debugData.enrollmentAnalysis.hasSelectedSubjects}</td>
                            </tr>
                            <tr>
                              <td>Students with subjects array:</td>
                              <td>{debugData.enrollmentAnalysis.hasSubjectsArray}</td>
                            </tr>
                            <tr>
                              <td>Students with direct subject:</td>
                              <td>{debugData.enrollmentAnalysis.hasDirectSubject}</td>
                            </tr>
                            <tr className="table-primary">
                              <td><strong>Enrolled in {debugData.subject}:</strong></td>
                              <td><strong>{debugData.enrollmentAnalysis.enrolledInTarget}</strong></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Students Tab */}
              {activeTab === 'students' && (
                <div>
                  <h6>All Students in Section ({debugData.allStudents.length})</h6>
                  <div className="table-responsive">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>ID</th>
                          <th>Subject Enrollments</th>
                          <th>Selected Subjects</th>
                          <th>Subjects Array</th>
                          <th>Direct Subject</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {debugData.allStudents.map(student => {
                          const isEnrolled = debugData.filteredStudents.some(s => s.id === student.id);
                          return (
                            <tr key={student.id} className={isEnrolled ? 'table-success' : 'table-warning'}>
                              <td>{student.firstName} {student.lastName}</td>
                              <td><code>{student.studentId || student.id}</code></td>
                              <td>
                                {student.subjectEnrollments?.map(e => e.subjectName || e.subject).join(', ') || 'None'}
                              </td>
                              <td>
                                {student.selectedSubjects?.join(', ') || 'None'}
                              </td>
                              <td>
                                {student.subjects?.join(', ') || 'None'}
                              </td>
                              <td>
                                {student.subject || 'None'}
                              </td>
                              <td>
                                <span className={`badge ${isEnrolled ? 'bg-success' : 'bg-warning'}`}>
                                  {isEnrolled ? 'Enrolled' : 'Not Enrolled'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Enrollment Tab */}
              {activeTab === 'enrollment' && (
                <div>
                  <h6>Subject Enrollment Summary</h6>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="card">
                        <div className="card-header">
                          <h6>Enrollment Fields Found</h6>
                        </div>
                        <div className="card-body">
                          {Array.from(debugData.enrollmentAnalysis.enrollmentFields).map(field => (
                            <span key={field} className="badge bg-info me-2 mb-2">{field}</span>
                          ))}
                          {debugData.enrollmentAnalysis.enrollmentFields.size === 0 && (
                            <div className="alert alert-warning">
                              No enrollment fields found in student data.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="card">
                        <div className="card-header">
                          <h6>Common Subjects</h6>
                        </div>
                        <div className="card-body">
                          {Object.entries(debugData.enrollmentAnalysis.commonSubjects)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 10)
                            .map(([subject, count]) => (
                              <div key={subject} className="d-flex justify-content-between mb-1">
                                <span className={subject === debugData.subject ? 'fw-bold text-primary' : ''}>
                                  {subject}
                                </span>
                                <span className="badge bg-secondary">{count}</span>
                              </div>
                            ))
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Recommendations Tab */}
              {activeTab === 'recommendations' && (
                <div>
                  <h6>Recommendations</h6>
                  <div className="row g-3">
                    {debugData.filteredStudents.length === 0 && (
                      <div className="col-12">
                        <div className="alert alert-danger">
                          <h6><i className="bi bi-exclamation-triangle me-2"></i>Issue Detected</h6>
                          <p>No students are enrolled in {debugData.subject}, but {debugData.allStudents.length} students are in the section.</p>
                          
                          <h6>Possible Solutions:</h6>
                          <ul>
                            <li>Check if students have proper subject enrollment data</li>
                            <li>Verify the subject name matches exactly (case-sensitive)</li>
                            <li>Ensure students are enrolled in the correct subjects</li>
                            <li>Contact your administrator to update student enrollments</li>
                          </ul>
                        </div>
                      </div>
                    )}

                    <div className="col-md-6">
                      <div className="card">
                        <div className="card-header">
                          <h6>Data Quality Check</h6>
                        </div>
                        <div className="card-body">
                          <ul className="list-unstyled">
                            <li className={debugData.allStudents.length > 0 ? 'text-success' : 'text-danger'}>
                              <i className={`bi bi-${debugData.allStudents.length > 0 ? 'check' : 'x'}-circle me-2`}></i>
                              Students found in section: {debugData.allStudents.length}
                            </li>
                            <li className={debugData.enrollmentAnalysis.enrollmentFields.size > 0 ? 'text-success' : 'text-warning'}>
                              <i className={`bi bi-${debugData.enrollmentAnalysis.enrollmentFields.size > 0 ? 'check' : 'exclamation'}-circle me-2`}></i>
                              Enrollment fields present: {debugData.enrollmentAnalysis.enrollmentFields.size}
                            </li>
                            <li className={debugData.enrollmentAnalysis.enrolledInTarget > 0 ? 'text-success' : 'text-danger'}>
                              <i className={`bi bi-${debugData.enrollmentAnalysis.enrolledInTarget > 0 ? 'check' : 'x'}-circle me-2`}></i>
                              Students enrolled in {debugData.subject}: {debugData.enrollmentAnalysis.enrolledInTarget}
                            </li>
                            <li className={debugData.subjects.length > 0 ? 'text-success' : 'text-warning'}>
                              <i className={`bi bi-${debugData.subjects.length > 0 ? 'check' : 'exclamation'}-circle me-2`}></i>
                              Total subjects in database: {debugData.subjects.length}
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="card">
                        <div className="card-header">
                          <h6>Quick Actions</h6>
                        </div>
                        <div className="card-body">
                          <button 
                            className="btn btn-primary btn-sm me-2 mb-2"
                            onClick={() => {
                              console.log('=== ENROLLMENT DEBUG DATA ===');
                              console.log('Section:', debugData.sectionData);
                              console.log('All Students:', debugData.allStudents);
                              console.log('Filtered Students:', debugData.filteredStudents);
                              console.log('Analysis:', debugData.enrollmentAnalysis);
                              console.log('=== END DEBUG DATA ===');
                              alert('Debug data logged to console. Press F12 to view.');
                            }}
                          >
                            <i className="bi bi-terminal me-1"></i>
                            Log to Console
                          </button>
                          
                          <button 
                            className="btn btn-info btn-sm me-2 mb-2"
                            onClick={() => {
                              const data = {
                                section: debugData.sectionData,
                                subject: debugData.subject,
                                allStudents: debugData.allStudents.length,
                                filteredStudents: debugData.filteredStudents.length,
                                analysis: debugData.enrollmentAnalysis
                              };
                              navigator.clipboard.writeText(JSON.stringify(data, null, 2));
                              alert('Debug data copied to clipboard');
                            }}
                          >
                            <i className="bi bi-clipboard me-1"></i>
                            Copy Data
                          </button>

                          <button 
                            className="btn btn-warning btn-sm mb-2"
                            onClick={loadDebugData}
                          >
                            <i className="bi bi-arrow-clockwise me-1"></i>
                            Refresh Data
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <div className="me-auto">
              <small className="text-muted">
                This tool helps diagnose student enrollment issues. Share the debug data with your administrator if needed.
              </small>
            </div>
            <button className="btn btn-secondary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnrollmentDebugModal;