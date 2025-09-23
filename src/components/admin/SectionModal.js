// SectionModal.js - YOUR OLD UI WITH NEW SCHEMA (year instead of gradeLevel, no name/sectionName)
import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp, getDocs } from 'firebase/firestore';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

const SectionModal = ({ 
  show, 
  onClose, 
  section = null,
  isEdit = false
}) => {
  const [formData, setFormData] = useState({
    year: '', // CHANGED: gradeLevel → year
    section: '',
    capacity: 40,
    homeroomTeacherId: '',
    subjectTeachers: [],
    status: 'active'
  });
  
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showTeacherSelection, setShowTeacherSelection] = useState(false);

  // Fetch teachers and initialize form
  useEffect(() => {
    if (show) {
      fetchTeachers();
      
      // Handle edit mode initialization
      if (isEdit && section) {
        console.log('EDIT MODE: Populating form with section data', section);
        populateFormForEdit(section);
      } else {
        // Create mode: Reset form
        resetForm();
      }
    }
  }, [show, isEdit, section]);

  // UPDATED: Populate form for edit mode - handle both old and new schema
  const populateFormForEdit = (sectionData) => {
    setFormData({
      year: (sectionData.year || sectionData.gradeLevel)?.toString() || '', // UPDATED: Handle both
      section: sectionData.section || sectionData.sectionName || '',
      capacity: sectionData.capacity || 40,
      homeroomTeacherId: sectionData.homeroomTeacherId || '',
      subjectTeachers: sectionData.subjectTeachers || [],
      status: sectionData.status || 'active'
    });
    
    console.log('Section form populated with:', {
      identifier: `${sectionData.year || sectionData.gradeLevel}-${sectionData.section || sectionData.sectionName}`,
      year: sectionData.year || sectionData.gradeLevel,
      section: sectionData.section || sectionData.sectionName,
      capacity: sectionData.capacity,
      enrollment: sectionData.currentEnrollment,
      status: sectionData.status
    });
  };

  // Reset form for create mode
  const resetForm = () => {
    setFormData({
      year: '', // CHANGED: gradeLevel → year
      section: '',
      capacity: 40,
      homeroomTeacherId: '',
      subjectTeachers: [],
      status: 'active'
    });
    setErrors({});
    setShowTeacherSelection(false);
  };

  const fetchTeachers = async () => {
    setTeachersLoading(true);
    try {
      const teachersSnapshot = await getDocs(collection(db, 'users'));
      const teachersList = [];
      
      teachersSnapshot.forEach(doc => {
        const teacherData = doc.data();
        if (teacherData.userType === 'teacher' || teacherData.roles?.includes('teacher') || teacherData.roles?.includes('homeroom') || teacherData.roles?.includes('subject')) {
          teachersList.push({
            id: doc.id,
            name: teacherData.name || 'Unknown Teacher',
            email: teacherData.email || '',
            roles: teacherData.roles || [],
            status: teacherData.status || 'active'
          });
        }
      });
      
      setTeachers(teachersList.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error('Error fetching teachers:', error);
    } finally {
      setTeachersLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleTeacherSelection = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubjectTeacherToggle = (teacherId) => {
    setFormData(prev => {
      const currentTeachers = prev.subjectTeachers;
      if (currentTeachers.includes(teacherId)) {
        return {
          ...prev,
          subjectTeachers: currentTeachers.filter(id => id !== teacherId)
        };
      } else {
        return {
          ...prev,
          subjectTeachers: [...currentTeachers, teacherId]
        };
      }
    });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.year) { // CHANGED: gradeLevel → year
      newErrors.year = 'Year level is required';
    }

    if (!formData.section.trim()) {
      newErrors.section = 'Section is required';
    } else if (!/^[A-Za-z0-9]+$/.test(formData.section.trim())) {
      newErrors.section = 'Section must contain only letters and numbers';
    }

    if (formData.capacity < 1 || formData.capacity > 100) {
      newErrors.capacity = 'Capacity must be between 1 and 100';
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
      // UPDATED: Generate section identifier using year-section format
      const sectionIdentifier = `${formData.year}-${formData.section.toUpperCase()}`;
      
      // UPDATED: Use new schema fields only
      const sectionData = {
        year: parseInt(formData.year), // CHANGED: gradeLevel → year
        section: formData.section.toUpperCase(), // Keep section field
        capacity: parseInt(formData.capacity),
        status: formData.status,
        updatedAt: serverTimestamp()
        // REMOVED: name, sectionName fields
      };

      // Add homeroom teacher if selected
      if (formData.homeroomTeacherId) {
        sectionData.homeroomTeacherId = formData.homeroomTeacherId;
      }

      // Add subject teachers if selected
      if (formData.subjectTeachers.length > 0) {
        sectionData.subjectTeachers = formData.subjectTeachers;
      }

      if (isEdit && section?.id) {
        // UPDATE existing section
        console.log('UPDATING section with ID:', section.id);
        
        // Don't update currentEnrollment in edit mode - preserve existing value
        sectionData.currentEnrollment = section.currentEnrollment;
        
        await updateDoc(doc(db, 'sections', section.id), sectionData);
        
        // Log activity
        await addDoc(collection(db, 'activityLog'), {
          action: 'section_updated',
          sectionId: section.id,
          sectionName: sectionIdentifier, // UPDATED: Use new identifier format
          description: `Section ${sectionIdentifier} updated (capacity: ${formData.capacity})`,
          performedBy: 'Admin',
          timestamp: new Date().toISOString(),
          severity: 'low'
        });

        alert(`Section Updated Successfully!\n\nIdentifier: ${sectionIdentifier}\nCapacity: ${formData.capacity}\nStatus: ${formData.status}\nEnrollment: ${section.currentEnrollment}/${formData.capacity}`);
      } else {
        // CREATE new section
        console.log('CREATING new section');
        sectionData.createdAt = serverTimestamp();
        sectionData.currentEnrollment = 0;
        
        const docRef = await addDoc(collection(db, 'sections'), sectionData);
        
        // Log activity
        await addDoc(collection(db, 'activityLog'), {
          action: 'section_created',
          sectionId: docRef.id,
          sectionName: sectionIdentifier, // UPDATED: Use new identifier format
          description: `New section ${sectionIdentifier} created with capacity ${formData.capacity}`,
          performedBy: 'Admin',
          timestamp: new Date().toISOString(),
          severity: 'low'
        });

        alert(`Section Created Successfully!\n\nIdentifier: ${sectionIdentifier}\nCapacity: ${formData.capacity}\nStatus: Active\nReady for student enrollment`);
      }
      
      // Reset form and close
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error saving section:', error);
      alert('Error saving section. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  // UPDATED: Generate preview using year-section format
  const generatedName = formData.year && formData.section 
    ? `${formData.year}-${formData.section.toUpperCase()}`
    : '';

  const selectedSubjectTeachers = teachers.filter(teacher => 
    formData.subjectTeachers.includes(teacher.id)
  );

  const homeroomTeacher = teachers.find(teacher => teacher.id === formData.homeroomTeacherId);

  // Generate modal title
  const modalTitle = isEdit 
    ? `Edit Section: ${(section?.year || section?.gradeLevel)}-${section?.section || section?.sectionName}` // UPDATED: Handle both schemas
    : 'Add New Section';

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header bg-info text-white">
            <h5 className="modal-title">
              <i className={`bi bi-${isEdit ? 'pencil' : 'collection'} me-2`}></i>
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
              {/* Edit Mode Banner */}
              {isEdit && (
                <div className="alert alert-info py-2 mb-3">
                  <small>
                    <i className="bi bi-info-circle me-1"></i>
                    <strong>Edit Mode:</strong> You can update section details, capacity, and teacher assignments. 
                    Current enrollment: <strong>{section?.currentEnrollment || 0} students</strong>
                  </small>
                </div>
              )}

              {/* Section Information */}
              <div className="mb-4">
                <h6 className="text-muted mb-3 border-bottom pb-2">Section Information</h6>
                
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label">
                      Year Level <span className="text-danger">*</span>
                    </label>
                    <select
                      className={`form-select ${errors.year ? 'is-invalid' : ''}`}
                      name="year"
                      value={formData.year}
                      onChange={handleInputChange}
                      disabled={loading}
                    >
                      <option value="">Select Year Level</option>
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
                    <input
                      type="text"
                      className={`form-control ${errors.section ? 'is-invalid' : ''}`}
                      name="section"
                      value={formData.section}
                      onChange={handleInputChange}
                      placeholder="e.g., A, B, C, Special"
                      maxLength={10}
                      style={{ textTransform: 'uppercase' }}
                      disabled={loading}
                    />
                    {errors.section && <div className="invalid-feedback">{errors.section}</div>}
                    <small className="text-muted">Letters and numbers only</small>
                  </div>
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label">
                      Capacity <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      className={`form-control ${errors.capacity ? 'is-invalid' : ''}`}
                      name="capacity"
                      value={formData.capacity}
                      onChange={handleInputChange}
                      min="1"
                      max="100"
                      disabled={loading}
                    />
                    {errors.capacity && <div className="invalid-feedback">{errors.capacity}</div>}
                    <small className="text-muted">Maximum number of students</small>
                  </div>

                  {/* Status field for edit mode */}
                  {isEdit && (
                    <div className="col-md-6">
                      <label className="form-label">
                        Status
                      </label>
                      <select
                        className="form-select"
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        disabled={loading}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="full">Full</option>
                      </select>
                      <small className="text-muted">Section availability status</small>
                    </div>
                  )}
                </div>

                {/* Teacher Assignments */}
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label">
                      Homeroom Teacher
                    </label>
                    <select
                      className="form-select"
                      name="homeroomTeacherId"
                      value={formData.homeroomTeacherId}
                      onChange={handleTeacherSelection}
                      disabled={loading || teachersLoading}
                    >
                      <option value="">Select Homeroom Teacher</option>
                      {teachers.map(teacher => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.name} ({teacher.email})
                          {teacher.roles?.includes('homeroom') && ' - HR'}
                          {teacher.status === 'inactive' && ' - Inactive'}
                        </option>
                      ))}
                    </select>
                    <small className="text-muted">Optional - can be assigned later</small>
                    {homeroomTeacher && (
                      <div className="mt-1">
                        <small className="text-success">
                          <i className="bi bi-check-circle me-1"></i>
                          Selected: {homeroomTeacher.name}
                        </small>
                      </div>
                    )}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">
                      Subject Teachers
                    </label>
                    
                    {/* Selected teachers display */}
                    {selectedSubjectTeachers.length > 0 && (
                      <div className="mb-2">
                        <small className="text-success">
                          <strong>Selected ({selectedSubjectTeachers.length}): </strong>
                          {selectedSubjectTeachers.map(teacher => teacher.name).join(', ')}
                        </small>
                      </div>
                    )}

                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm w-100"
                      onClick={() => setShowTeacherSelection(!showTeacherSelection)}
                      disabled={loading || teachersLoading}
                    >
                      <i className="bi bi-plus-circle me-2"></i>
                      {showTeacherSelection ? 'Hide Teachers' : 'Add Subject Teachers'}
                    </button>

                    {/* Teacher selection panel */}
                    {showTeacherSelection && (
                      <div className="mt-2 p-3 border rounded">
                        <h6 className="text-muted mb-2">Select Subject Teachers:</h6>
                        {teachersLoading ? (
                          <div className="text-center">
                            <div className="spinner-border spinner-border-sm" role="status">
                              <span className="visually-hidden">Loading teachers...</span>
                            </div>
                            <small className="text-muted ms-2">Loading teachers...</small>
                          </div>
                        ) : (
                          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                            {teachers.map(teacher => (
                              <div key={teacher.id} className="form-check">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  id={`teacher-${teacher.id}`}
                                  checked={formData.subjectTeachers.includes(teacher.id)}
                                  onChange={() => handleSubjectTeacherToggle(teacher.id)}
                                  disabled={loading}
                                />
                                <label className="form-check-label small" htmlFor={`teacher-${teacher.id}`}>
                                  <div className="d-flex justify-content-between align-items-center">
                                    <span>
                                      {teacher.name} ({teacher.email})
                                    </span>
                                    <div>
                                      {teacher.roles?.map(role => (
                                        <span key={role} className={`badge me-1 ${
                                          role === 'admin' ? 'bg-danger' : 
                                          role === 'homeroom' ? 'bg-warning text-dark' : 
                                          role === 'subject' ? 'bg-primary' : 'bg-info'
                                        }`} style={{ fontSize: '0.6em' }}>
                                          {role.toUpperCase()}
                                        </span>
                                      ))}
                                      {teacher.status === 'inactive' && (
                                        <span className="badge bg-secondary" style={{ fontSize: '0.6em' }}>
                                          INACTIVE
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </label>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <small className="text-muted">Optional - can add multiple teachers</small>
                  </div>
                </div>

                {/* Section Preview */}
                {generatedName && (
                  <div className="alert alert-info">
                    <h6 className="alert-heading">
                      <i className="bi bi-eye me-2"></i>
                      Section Preview
                    </h6>
                    <div className="row">
                      <div className="col-md-6">
                        <small>
                          <strong>Section Identifier:</strong> {generatedName}<br/>
                          <strong>Year Level:</strong> Year {formData.year}<br/>
                          <strong>Section:</strong> {formData.section.toUpperCase()}
                        </small>
                      </div>
                      <div className="col-md-6">
                        <small>
                          <strong>Capacity:</strong> {formData.capacity} students<br/>
                          <strong>Current Enrollment:</strong> {isEdit ? section?.currentEnrollment || 0 : 0} students<br/>
                          <strong>Status:</strong> {formData.status}
                        </small>
                      </div>
                    </div>
                    {homeroomTeacher && (
                      <div className="mt-2">
                        <small>
                          <strong>Homeroom Teacher:</strong> {homeroomTeacher.name}
                        </small>
                      </div>
                    )}
                    {selectedSubjectTeachers.length > 0 && (
                      <div className="mt-1">
                        <small>
                          <strong>Subject Teachers:</strong> {selectedSubjectTeachers.length} assigned
                        </small>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Quick Setup Options - Only show in create mode */}
              {!isEdit && (
                <div className="mb-4">
                  <h6 className="text-muted mb-3 border-bottom pb-2">Quick Setup</h6>
                  
                  <div className="row g-2">
                    {/* Common section letters */}
                    <div className="col-12 mb-2">
                      <small className="text-muted">Common sections:</small>
                    </div>
                    {['A', 'B', 'C', 'D', 'E'].map(letter => (
                      <div key={letter} className="col-auto">
                        <button
                          type="button"
                          className={`btn btn-sm ${formData.section === letter ? 'btn-primary' : 'btn-outline-primary'}`}
                          onClick={() => setFormData(prev => ({ ...prev, section: letter }))}
                          disabled={loading}
                        >
                          {letter}
                        </button>
                      </div>
                    ))}
                    
                    {/* Special sections */}
                    <div className="col-12 mt-2 mb-2">
                      <small className="text-muted">Special sections:</small>
                    </div>
                    {['SPECIAL', 'HONORS', 'STEM'].map(special => (
                      <div key={special} className="col-auto">
                        <button
                          type="button"
                          className={`btn btn-sm ${formData.section === special ? 'btn-warning' : 'btn-outline-warning'}`}
                          onClick={() => setFormData(prev => ({ ...prev, section: special }))}
                          disabled={loading}
                        >
                          {special}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Info Alert */}
              <div className="alert alert-success border-0">
                <h6 className="alert-heading">
                  <i className="bi bi-info-circle me-2"></i>
                  {isEdit ? 'Section Management' : 'What happens next?'}
                </h6>
                <small>
                  {isEdit ? (
                    <ul className="mb-0 mt-1">
                      <li>Section details will be updated</li>
                      <li>Teacher assignments will be synchronized</li>
                      <li>Existing student enrollments will be preserved</li>
                      <li>Capacity changes will be validated against current enrollment</li>
                    </ul>
                  ) : (
                    <ul className="mb-0 mt-1">
                      <li>Students can be assigned to this section</li>
                      <li>Teachers can be assigned as homeroom or subject teachers</li>
                      <li>Attendance can be taken for this section</li>
                      <li>Reports can be generated for this section</li>
                    </ul>
                  )}
                </small>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-info" 
                disabled={loading || !formData.year || !formData.section}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    {isEdit ? 'Updating Section...' : 'Creating Section...'}
                  </>
                ) : ( 
                  <>
                    <i className={`bi bi-${isEdit ? 'check-lg' : 'plus-lg'} me-2`}></i>
                    {isEdit ? 'Update Section' : 'Create Section'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SectionModal;