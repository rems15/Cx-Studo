import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../services/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

const StudentModal = ({ 
  show, 
  onClose, 
  sections = [], 
  student = null,    // NEW: For edit mode
  isEdit = false,    // NEW: Edit mode flag
  onSave            // NEW: Success callback
}) => {
  const [formData, setFormData] = useState({
    studentId: '',
    firstName: '',
    lastName: '',
    year: '',
    section: '',
    sectionId: '',
    selectedSubjects: []
  });
  
  const [availableSubjects, setAvailableSubjects] = useState([]); 
  const [activeStep, setActiveStep] = useState(1);  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  // NEW: Search and filter states for subjects
  const [subjectSearchTerm, setSubjectSearchTerm] = useState('');
  const [subjectSortBy, setSubjectSortBy] = useState('name'); // 'name', 'code', 'room'
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);

  // Generate student ID
  const generateStudentId = () => {
    const year = new Date().getFullYear();
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `STU${year}${randomNum}`;
  };

  // Load subjects when modal opens
  useEffect(() => {
    if (show) {
      loadSubjects();
      
      // NEW: Handle edit mode initialization
      if (isEdit && student) {
        console.log('EDIT MODE: Populating form with student data', student);
        populateFormForEdit(student);
      } else {
        // Create mode: Reset form
        resetForm();
      }
    }
  }, [show, isEdit, student]);

  // NEW: Reset search when modal opens/closes
  useEffect(() => {
    if (show) {
      setSubjectSearchTerm('');
      setShowSelectedOnly(false);
    }
  }, [show]);

  // NEW: Populate form for edit mode
  const populateFormForEdit = (studentData) => {
    setFormData({
      studentId: studentData.studentId || '',
      firstName: studentData.firstName || '',
      lastName: studentData.lastName || '',
      year: studentData.year?.toString() || studentData.gradeLevel?.toString() || '',
      section: studentData.section || '',
      sectionId: studentData.sectionId || '',
      selectedSubjects: studentData.selectedSubjects || []
    });
    
    console.log('Form populated with:', {
      name: `${studentData.firstName} ${studentData.lastName}`,
      year: studentData.year || studentData.gradeLevel,
      section: studentData.section,
      subjects: studentData.selectedSubjects?.length || 0
    });
  };

  // NEW: Reset form for create mode
  const resetForm = () => {
    setFormData({
      studentId: generateStudentId(),
      firstName: '',
      lastName: '',
      year: '',
      section: '',
      sectionId: '',
      selectedSubjects: []
    });
    setActiveStep(1);
    setErrors({});
    setSubjectSearchTerm('');
    setShowSelectedOnly(false);
  };

  // NEW: Filtered and sorted subjects based on search and sort criteria
  const filteredAndSortedSubjects = useMemo(() => {
    let filtered = [...availableSubjects];

    // Apply search filter
    if (subjectSearchTerm.trim()) {
      const searchLower = subjectSearchTerm.toLowerCase();
      filtered = filtered.filter(subject => 
        subject.name?.toLowerCase().includes(searchLower) ||
        subject.code?.toLowerCase().includes(searchLower) ||
        subject.room?.toLowerCase().includes(searchLower)
      );
    }

    // Apply "show selected only" filter
    if (showSelectedOnly) {
      filtered = filtered.filter(subject => 
        formData.selectedSubjects.includes(subject.id)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (subjectSortBy) {
        case 'code':
          aValue = a.code?.toLowerCase() || '';
          bValue = b.code?.toLowerCase() || '';
          break;
        case 'room':
          aValue = a.room?.toLowerCase() || '';
          bValue = b.room?.toLowerCase() || '';
          break;
        case 'name':
        default:
          aValue = a.name?.toLowerCase() || '';
          bValue = b.name?.toLowerCase() || '';
      }
      
      return aValue.localeCompare(bValue);
    });

    return filtered;
  }, [availableSubjects, subjectSearchTerm, subjectSortBy, showSelectedOnly, formData.selectedSubjects]);

  const loadSubjects = async () => {
    try {
      const subjectsSnapshot = await getDocs(
        query(collection(db, 'subjects'), where('active', '==', true))
      );
      const subjectsList = [];
      subjectsSnapshot.forEach(doc => {
        subjectsList.push({
          id: doc.id,
          ...doc.data()
        });
      });
      setAvailableSubjects(subjectsList.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error('Error loading subjects:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSectionChange = (e) => {
    const selectedSectionId = e.target.value;
    const selectedSection = sections.find(s => s.id === selectedSectionId);
    
    setFormData(prev => ({
      ...prev,
      sectionId: selectedSectionId,
      section: selectedSection ? (selectedSection.section || selectedSection.sectionName) : '',
      // Keep the user's manually selected year, but sync with section if year wasn't set
      year: prev.year || (selectedSection ? selectedSection.gradeLevel?.toString() : '')
    }));
  };

  const handleSubjectToggle = (subjectId) => {
    setFormData(prev => ({
      ...prev,
      selectedSubjects: prev.selectedSubjects.includes(subjectId)
        ? prev.selectedSubjects.filter(id => id !== subjectId)
        : [...prev.selectedSubjects, subjectId]
    }));
  };

  const handleSelectAllSubjects = () => {
    // Select all from filtered results
    const filteredSubjectIds = filteredAndSortedSubjects.map(subject => subject.id);
    setFormData(prev => ({
      ...prev,
      selectedSubjects: [...new Set([...prev.selectedSubjects, ...filteredSubjectIds])]
    }));
  };

  const handleClearAllSubjects = () => {
    if (showSelectedOnly || subjectSearchTerm.trim()) {
      // Clear only filtered subjects
      const filteredSubjectIds = filteredAndSortedSubjects.map(subject => subject.id);
      setFormData(prev => ({
        ...prev,
        selectedSubjects: prev.selectedSubjects.filter(id => !filteredSubjectIds.includes(id))
      }));
    } else {
      // Clear all subjects
      setFormData(prev => ({
        ...prev,
        selectedSubjects: []
      }));
    }
  };

  // NEW: Quick search handler
  const handleSubjectSearch = (e) => {
    setSubjectSearchTerm(e.target.value);
  };

  // NEW: Clear search
  const clearSearch = () => {
    setSubjectSearchTerm('');
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.year) {
      newErrors.year = 'Year is required';
    }

    if (!formData.section) {
      newErrors.section = 'Section is required';
    }

    if (formData.selectedSubjects.length === 0) {
      newErrors.selectedSubjects = 'Please select at least one subject';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Create subject enrollments array
      const subjectEnrollments = formData.selectedSubjects.map(subjectId => {
        const subject = availableSubjects.find(s => s.id === subjectId);
        return {
          subjectId: subjectId,
          subjectName: subject?.name || '',
          subjectCode: subject?.code || '',
          enrolledAt: new Date().toISOString()
        };
      });

      const studentData = {
        studentId: formData.studentId,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        fullName: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
        year: parseInt(formData.year),
        section: formData.section,
        sectionId: formData.sectionId,
        selectedSubjects: formData.selectedSubjects, // Array of subject IDs
        subjectEnrollments: subjectEnrollments, // Detailed enrollment info
        status: 'active',
        updatedAt: serverTimestamp()
      };

      if (isEdit && student?.id) {
        // UPDATE existing student
        console.log('UPDATING student with ID:', student.id);
        await updateDoc(doc(db, 'students', student.id), studentData);
        
        // Log activity
        await addDoc(collection(db, 'activityLog'), {
          action: 'student_updated',
          studentId: student.id,
          studentName: studentData.fullName,
          description: `Student ${studentData.fullName} updated (${formData.selectedSubjects.length} subjects enrolled)`,
          performedBy: 'Admin',
          timestamp: new Date().toISOString(),
          severity: 'low'
        });

        alert(`Student Updated Successfully!\n\nName: ${studentData.fullName}\nSection: ${formData.year}-${formData.section}\nSubjects: ${subjectEnrollments.length} enrolled`);
      } else {
        // CREATE new student
        console.log('CREATING new student');
        studentData.createdAt = serverTimestamp();
        studentData.attendanceRecords = [];
        
        const docRef = await addDoc(collection(db, 'students'), studentData);
        
        // Update section enrollment count
        const sectionToUpdate = sections.find(s => s.id === formData.sectionId);
        if (sectionToUpdate) {
          await updateDoc(doc(db, 'sections', formData.sectionId), {
            currentEnrollment: (sectionToUpdate.currentEnrollment || 0) + 1
          });
        }
        
        // Log activity
        await addDoc(collection(db, 'activityLog'), {
          action: 'student_added',
          studentId: docRef.id,
          studentName: studentData.fullName,
          description: `New student ${studentData.fullName} added to ${formData.year}-${formData.section} with ${formData.selectedSubjects.length} subjects`,
          performedBy: 'Admin',
          timestamp: new Date().toISOString(),
          severity: 'low'
        });

        alert(`Student Added Successfully!\n\nName: ${studentData.fullName}\nSection: ${formData.year}-${formData.section}\nSubjects: ${subjectEnrollments.length} enrolled`);
      }
      
      // Reset form and close
      resetForm();
      onSave && onSave();
      onClose();
    } catch (error) {
      console.error('Error saving student:', error);
      alert('Error saving student. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  // FIXED: Group sections by year for better organization - handle both string and number types
  const sectionsByYear = sections.reduce((acc, section) => {
    const year = parseInt(section.gradeLevel) || parseInt(section.year) || section.gradeLevel;
    if (!acc[year]) acc[year] = [];
    acc[year].push(section);
    return acc;
  }, {});

  // Generate modal title
  const modalTitle = isEdit 
    ? `Edit Student: ${student?.firstName || ''} ${student?.lastName || ''}`.trim()
    : 'Add New Student';

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title">
              <i className={`bi bi-${isEdit ? 'pencil' : 'person-plus'} me-2`}></i>
              {modalTitle}
            </h5>
            <button 
              type="button" 
              className="btn-close btn-close-white" 
              onClick={onClose}
              disabled={loading}
            ></button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {/* Step Indicator */}
              <div className="d-flex justify-content-center mb-4">
                <div className="d-flex align-items-center">
                  <div className={`rounded-circle ${activeStep >= 1 ? 'bg-primary text-white' : 'bg-light text-muted'} d-flex align-items-center justify-content-center me-2`} 
                       style={{ width: '30px', height: '30px' }}>
                    1
                  </div>
                  <small className="me-3">Basic Info</small>
                  <div className={`rounded-circle ${activeStep >= 2 ? 'bg-primary text-white' : 'bg-light text-muted'} d-flex align-items-center justify-content-center me-2`} 
                       style={{ width: '30px', height: '30px' }}>
                    2
                  </div>
                  <small>Subject Selection</small>
                </div>
              </div>

              {/* NEW: Edit Mode Banner */}
              {isEdit && (
                <div className="alert alert-info py-2 mb-3">
                  <small>
                    <i className="bi bi-info-circle me-1"></i>
                    <strong>Edit Mode:</strong> You can update student information and subject enrollments.
                  </small>
                </div>
              )}

              {/* Step 1: Basic Information */}
              {activeStep === 1 && (
                <div>
                  <h6 className="text-muted mb-3">Student Information</h6>
                  
                  {/* Student ID (Read-only) */}
                  <div className="mb-3">
                    <label className="form-label">
                      <i className="bi bi-card-text me-1"></i>
                      Student ID
                    </label>
                    <input
                      type="text"
                      className="form-control bg-light"
                      value={formData.studentId}
                      readOnly
                    />
                    <small className="text-muted">
                      {isEdit ? 'Cannot be changed' : 'Auto-generated ID'}
                    </small>
                  </div>

                  {/* Student Name */}
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label">
                        First Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-control ${errors.firstName ? 'is-invalid' : ''}`}
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        placeholder="Enter first name"
                        disabled={loading}
                      />
                      {errors.firstName && <div className="invalid-feedback">{errors.firstName}</div>}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">
                        Last Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-control ${errors.lastName ? 'is-invalid' : ''}`}
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        placeholder="Enter last name"
                        disabled={loading}
                      />
                      {errors.lastName && <div className="invalid-feedback">{errors.lastName}</div>}
                    </div>
                  </div>

                  {/* Year and Section */}
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label">
                        Year/Grade <span className="text-danger">*</span>
                      </label>
                      <select
                        className={`form-select ${errors.year ? 'is-invalid' : ''}`}
                        name="year"
                        value={formData.year}
                        onChange={handleInputChange}
                        disabled={loading}
                      >
                        <option value="">Select Year</option>
                        {[7, 8, 9, 10, 11, 12].map(year => (
                          <option key={year} value={year}>Year {year}</option>
                        ))}
                      </select>
                      {errors.year && <div className="invalid-feedback">{errors.year}</div>}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">
                        Section <span className="text-danger">*</span>
                      </label>
                      <select
                        className={`form-select ${errors.section ? 'is-invalid' : ''}`}
                        value={formData.sectionId}
                        onChange={handleSectionChange}
                        disabled={loading || !formData.year}
                      >
                        <option value="">
                          {formData.year ? 'Select Section' : 'Select year first'}
                        </option>
                        {Object.keys(sectionsByYear)
                          .filter(year => !formData.year || parseInt(year) === parseInt(formData.year))
                          .sort()
                          .map(year => (
                            <optgroup key={year} label={`Year ${year}`}>
                              {sectionsByYear[year].map(section => (
                                <option key={section.id} value={section.id}>
                                  Section {section.section || section.sectionName} 
                                  ({section.currentEnrollment || 0}/{section.capacity} students)
                                </option>
                              ))}
                            </optgroup>
                          ))}
                      </select>
                      {errors.section && <div className="invalid-feedback">{errors.section}</div>}
                    </div>
                  </div>

                  {/* Student Preview */}
                  {(formData.firstName || formData.lastName) && (
                    <div className="alert alert-info">
                      <h6 className="alert-heading">Student Preview</h6>
                      <div className="row">
                        <div className="col-md-6">
                          <small>
                            <strong>Name:</strong> {formData.firstName} {formData.lastName}<br/>
                            <strong>Year:</strong> {formData.year ? `Year ${formData.year}` : 'Not selected'}
                          </small>
                        </div>
                        <div className="col-md-6">
                          <small>
                            <strong>Section:</strong> {formData.section || 'Not selected'}<br/>
                            <strong>Student ID:</strong> {formData.studentId}
                          </small>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* No Sections Warning */}
                  {sections.length === 0 && (
                    <div className="alert alert-warning">
                      <i className="bi bi-exclamation-triangle me-2"></i>
                      <strong>No sections available!</strong><br/>
                      <small>Create sections first before adding students.</small>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Subject Selection with Enhanced Search and Filtering */}
              {activeStep === 2 && (
                <div>
                  {/* Header with Search and Controls */}
                  <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6 className="text-muted mb-0">Subject Enrollment</h6>
                      <div className="d-flex gap-2">
                        <button 
                          type="button" 
                          className="btn btn-sm btn-outline-primary"
                          onClick={handleSelectAllSubjects}
                          disabled={loading || filteredAndSortedSubjects.length === 0}
                        >
                          <i className="bi bi-check-all me-1"></i>
                          Select All {subjectSearchTerm || showSelectedOnly ? 'Filtered' : ''}
                        </button>
                        <button 
                          type="button" 
                          className="btn btn-sm btn-outline-secondary"
                          onClick={handleClearAllSubjects}
                          disabled={loading}
                        >
                          <i className="bi bi-x me-1"></i>
                          Clear {subjectSearchTerm || showSelectedOnly ? 'Filtered' : 'All'}
                        </button>
                      </div>
                    </div>

                    {/* NEW: Search and Filter Controls */}
                    <div className="row g-3 mb-3">
                      {/* Search Input */}
                      <div className="col-md-6">
                        <div className="input-group">
                          <span className="input-group-text">
                            <i className="bi bi-search"></i>
                          </span>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Search subjects by name, code, or room..."
                            value={subjectSearchTerm}
                            onChange={handleSubjectSearch}
                            disabled={loading}
                          />
                          {subjectSearchTerm && (
                            <button 
                              className="btn btn-outline-secondary" 
                              type="button"
                              onClick={clearSearch}
                              disabled={loading}
                            >
                              <i className="bi bi-x"></i>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Sort By */}
                      <div className="col-md-3">
                        <select
                          className="form-select"
                          value={subjectSortBy}
                          onChange={(e) => setSubjectSortBy(e.target.value)}
                          disabled={loading}
                        >
                          <option value="name">Sort by Name</option>
                          <option value="code">Sort by Code</option>
                          <option value="room">Sort by Room</option>
                        </select>
                      </div>

                      {/* Show Selected Only Toggle */}
                      <div className="col-md-3">
                        <div className="form-check form-switch h-100 d-flex align-items-center">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id="showSelectedOnly"
                            checked={showSelectedOnly}
                            onChange={(e) => setShowSelectedOnly(e.target.checked)}
                            disabled={loading}
                          />
                          <label className="form-check-label ms-2" htmlFor="showSelectedOnly">
                            Selected Only
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Results Info */}
                    <div className="d-flex justify-content-between align-items-center">
                      <small className="text-muted">
                        {filteredAndSortedSubjects.length} of {availableSubjects.length} subjects
                        {subjectSearchTerm && ` matching "${subjectSearchTerm}"`}
                        {showSelectedOnly && ' (selected only)'}
                      </small>
                      <small className="text-muted">
                        {formData.selectedSubjects.length} selected
                      </small>
                    </div>
                  </div>

                  {/* Subject Selection List */}
                  <div className={`border rounded p-3 mb-3 ${errors.selectedSubjects ? 'border-danger' : ''}`} 
                       style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {filteredAndSortedSubjects.length > 0 ? (
                      <div className="row g-2">
                        {filteredAndSortedSubjects.map(subject => (
                          <div key={subject.id} className="col-md-6">
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id={`subject-${subject.id}`}
                                checked={formData.selectedSubjects.includes(subject.id)}
                                onChange={() => handleSubjectToggle(subject.id)}
                                disabled={loading}
                              />
                              <label className="form-check-label d-flex align-items-center" htmlFor={`subject-${subject.id}`}>
                                <span 
                                  className="badge me-2"
                                  style={{ 
                                    backgroundColor: subject.color || '#6c757d',
                                    color: 'white',
                                    fontSize: '0.7em'
                                  }}
                                >
                                  {subject.code}
                                </span>
                                <div>
                                  <div>{subject.name}</div>
                                  <small className="text-muted">Room: {subject.room}</small>
                                </div>
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-3">
                        {subjectSearchTerm ? (
                          <>
                            <i className="bi bi-search text-muted fs-3 mb-2"></i>
                            <p className="text-muted mb-2">No subjects found matching "{subjectSearchTerm}"</p>
                            <small className="text-muted">
                              Try adjusting your search terms or{' '}
                              <button 
                                type="button" 
                                className="btn btn-link btn-sm p-0" 
                                onClick={clearSearch}
                              >
                                clear search
                              </button>
                            </small>
                          </>
                        ) : showSelectedOnly ? (
                          <>
                            <i className="bi bi-check-circle text-muted fs-3 mb-2"></i>
                            <p className="text-muted mb-2">No subjects selected yet</p>
                            <small className="text-muted">
                              <button 
                                type="button" 
                                className="btn btn-link btn-sm p-0" 
                                onClick={() => setShowSelectedOnly(false)}
                              >
                                Show all subjects
                              </button>
                              {' '}to start selecting
                            </small>
                          </>
                        ) : (
                          <>
                            <i className="bi bi-book text-muted fs-3 mb-2"></i>
                            <p className="text-muted mb-2">No subjects available</p>
                            <small className="text-muted">
                              Admin needs to add subjects first in the Subjects section
                            </small>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {errors.selectedSubjects && (
                    <div className="text-danger mb-3">
                      <small>{errors.selectedSubjects}</small>
                    </div>
                  )}

                  {/* Selected Subjects Summary */}
                  {formData.selectedSubjects.length > 0 && (
                    <div className="alert alert-info">
                      <h6 className="alert-heading">
                        <i className="bi bi-check-circle me-2"></i>
                        Selected Subjects ({formData.selectedSubjects.length})
                      </h6>
                      <div className="d-flex flex-wrap gap-1">
                        {formData.selectedSubjects.map(subjectId => {
                          const subject = availableSubjects.find(s => s.id === subjectId);
                          return (
                            <span 
                              key={subjectId}
                              className="badge"
                              style={{ 
                                backgroundColor: subject?.color || '#6c757d',
                                color: 'white'
                              }}
                            >
                              {subject?.code || subjectId}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Student Summary */}
                  <div className="alert alert-secondary">
                    <h6 className="alert-heading">Student Summary</h6>
                    <small>
                      <strong>Name:</strong> {formData.firstName} {formData.lastName}<br/>
                      <strong>Section:</strong> {formData.year}-{formData.section}<br/>
                      <strong>Subjects:</strong> {formData.selectedSubjects.length} selected<br/>
                      <strong>Mode:</strong> {isEdit ? 'Editing existing student' : 'Creating new student'}
                    </small>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Footer */}
            <div className="modal-footer">
              {activeStep === 1 ? (
                <>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={onClose}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    onClick={() => setActiveStep(2)}
                    disabled={!formData.firstName || !formData.lastName || !formData.year || !formData.section}
                  >
                    Next: Select Subjects
                  </button>
                </>
              ) : (
                <>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setActiveStep(1)}
                    disabled={loading}
                  >
                    <i className="bi bi-arrow-left me-1"></i>
                    Back
                  </button>
                  <div className="d-flex gap-2">
                    <button 
                      type="button" 
                      className="btn btn-outline-secondary"
                      onClick={onClose}
                      disabled={loading}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="btn btn-primary" 
                      disabled={loading || formData.selectedSubjects.length === 0}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          {isEdit ? 'Updating...' : 'Adding Student...'}
                        </>
                      ) : (
                        <>
                          <i className={`bi bi-${isEdit ? 'check-lg' : 'plus-lg'} me-2`}></i>
                          {isEdit ? 'Update Student' : 'Add Student'}
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StudentModal;