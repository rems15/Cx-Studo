import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDocs, 
  query, 
  where,
  serverTimestamp
} from 'firebase/firestore';

const SubjectModal = ({ 
  isOpen, 
  onClose, 
  subject = null, 
  onSubjectSaved 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    color: '#007bff',
    room: '',
    status: 'active'
  });
  
  const [schedule, setSchedule] = useState({
    week1: [],
    week2: []
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Predefined color options for subjects
  const colorOptions = [
    { name: 'Blue', value: '#007bff' },
    { name: 'Green', value: '#28a745' },
    { name: 'Red', value: '#dc3545' },
    { name: 'Orange', value: '#fd7e14' },
    { name: 'Purple', value: '#6f42c1' },
    { name: 'Teal', value: '#20c997' },
    { name: 'Pink', value: '#e83e8c' },
    { name: 'Indigo', value: '#6610f2' }
  ];

  // Initialize form when modal opens or subject changes
  useEffect(() => {
    if (isOpen) {
      if (subject) {
        // Edit mode - populate form with existing subject data
        console.log('EDIT MODE: Populating form with subject data', subject);
        setFormData({
          name: subject.name || '',
          code: subject.code || '',
          description: subject.description || '',
          color: subject.color || '#007bff',
          room: subject.room || '',
          status: subject.active === false ? 'inactive' : 'active'
        });
        
        // Load existing schedule if present
        setSchedule({
          week1: subject.schedule?.week1 || [],
          week2: subject.schedule?.week2 || []
        });
      } else {
        // Add mode - reset form
        resetForm();
      }
      setErrors({});
    }
  }, [isOpen, subject]);

  // NEW: Reset form for create mode
  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      color: '#007bff',
      room: '',
      status: 'active'
    });
    setSchedule({
      week1: [],
      week2: []
    });
    setErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Schedule management functions
  const addScheduleEntry = (week) => {
    const newEntry = {
      day: '',
      period: '1',
      time: '8:00 - 8:45'
    };
    setSchedule(prev => ({
      ...prev,
      [week]: [...prev[week], newEntry]
    }));
  };

  const updateScheduleEntry = (week, index, field, value) => {
    setSchedule(prev => ({
      ...prev,
      [week]: prev[week].map((entry, i) => {
        if (i === index) {
          const updatedEntry = { ...entry, [field]: value };
          
          if (field === 'period' && value) {
            const numericValue = parseInt(value);
            updatedEntry.period = isNaN(numericValue) ? '' : numericValue;
          }
          
          return updatedEntry;
        }
        return entry;
      })
    }));
  };

  const removeScheduleEntry = (week, index) => {
    setSchedule(prev => ({
      ...prev,
      [week]: prev[week].filter((_, i) => i !== index)
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Subject name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Subject name must be at least 2 characters long';
    }
    
    if (!formData.code.trim()) {
      newErrors.code = 'Subject code is required';
    } else if (!/^[A-Z0-9]{2,8}$/.test(formData.code.trim().toUpperCase())) {
      newErrors.code = 'Subject code must be 2-8 uppercase letters/numbers';
    }

    if (!formData.room.trim()) {
      newErrors.room = 'Room is required';
    }

    const allScheduleEntries = [...schedule.week1, ...schedule.week2];
    const hasIncompleteEntries = allScheduleEntries.some(entry => 
      (entry.day && !entry.period && !entry.time) ||
      (!entry.day && entry.period && !entry.time) ||
      (!entry.day && !entry.period && entry.time)
    );

    if (hasIncompleteEntries) {
      newErrors.schedule = 'Please complete all schedule entries or remove empty ones';
    }

    return newErrors;
  };

  const checkSubjectExists = async (name, code, excludeDocId = null) => {
    try {
      const subjectsRef = collection(db, 'subjects');
      
      const nameQuery = query(subjectsRef, where('name', '==', name.trim()));
      const nameSnapshot = await getDocs(nameQuery);
      
      const codeQuery = query(subjectsRef, where('code', '==', code.trim().toUpperCase()));
      const codeSnapshot = await getDocs(codeQuery);
      
      if (excludeDocId) {
        const nameDuplicate = nameSnapshot.docs.some(doc => doc.id !== excludeDocId);
        const codeDuplicate = codeSnapshot.docs.some(doc => doc.id !== excludeDocId);
        return { name: nameDuplicate, code: codeDuplicate };
      }
      
      return { 
        name: !nameSnapshot.empty, 
        code: !codeSnapshot.empty 
      };
    } catch (error) {
      console.error('Error checking subject existence:', error);
      return { name: false, code: false };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    setLoading(true);

    try {
      const duplicates = await checkSubjectExists(
        formData.name,
        formData.code,
        subject?.id
      );
      
      const duplicateErrors = {};
      if (duplicates.name) {
        duplicateErrors.name = 'A subject with this name already exists';
      }
      if (duplicates.code) {
        duplicateErrors.code = 'A subject with this code already exists';
      }
      
      if (Object.keys(duplicateErrors).length > 0) {
        setErrors(duplicateErrors);
        setLoading(false);
        return;
      }

      // Clean schedule data
      const cleanSchedule = {
        week1: schedule.week1
          .filter(entry => {
            const hasDay = entry.day && typeof entry.day === 'string' && entry.day.trim() !== '';
            const hasPeriod = entry.period !== '' && entry.period !== null && entry.period !== undefined;
            const hasTime = entry.time && typeof entry.time === 'string' && entry.time.trim() !== '';
            return hasDay && hasPeriod && hasTime;
          })
          .map(entry => ({
            day: entry.day.trim().toLowerCase(),
            period: parseInt(entry.period),
            time: entry.time.trim()
          })),
        week2: schedule.week2
          .filter(entry => {
            const hasDay = entry.day && typeof entry.day === 'string' && entry.day.trim() !== '';
            const hasPeriod = entry.period !== '' && entry.period !== null && entry.period !== undefined;
            const hasTime = entry.time && typeof entry.time === 'string' && entry.time.trim() !== '';
            return hasDay && hasPeriod && hasTime;
          })
          .map(entry => ({
            day: entry.day.trim().toLowerCase(),
            period: parseInt(entry.period),
            time: entry.time.trim()
          }))
      };

      // Prepare subject data
      const subjectData = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        description: formData.description.trim() || null,
        color: formData.color,
        room: formData.room.trim(),
        schedule: cleanSchedule,
        active: formData.status === 'active',
        updatedAt: serverTimestamp()
      };

      if (subject) {
        // Update existing subject
        console.log('UPDATING subject with ID:', subject.id);
        const subjectRef = doc(db, 'subjects', subject.id);
        
        // Preserve existing assignedTeachers when updating
        subjectData.assignedTeachers = subject.assignedTeachers || [];
        
        await updateDoc(subjectRef, subjectData);

        // Log activity
        await addDoc(collection(db, 'activityLog'), {
          action: 'subject_updated',
          subjectId: subject.id,
          subjectName: subjectData.name,
          description: `Subject ${subjectData.name} updated (${subjectData.code})`,
          performedBy: 'Admin',
          timestamp: new Date().toISOString(),
          severity: 'low'
        });

        alert(`Subject Updated Successfully!\n\nName: ${subjectData.name}\nCode: ${subjectData.code}\nRoom: ${subjectData.room}\nStatus: ${formData.status}`);
      } else {
        // Add new subject
        console.log('CREATING new subject');
        subjectData.createdAt = serverTimestamp();
        subjectData.assignedTeachers = []; // Initialize empty - teachers will be assigned via UserModal
        
        const docRef = await addDoc(collection(db, 'subjects'), subjectData);

        // Log activity
        await addDoc(collection(db, 'activityLog'), {
          action: 'subject_created',
          subjectId: docRef.id,
          subjectName: subjectData.name,
          description: `New subject ${subjectData.name} created (${subjectData.code})`,
          performedBy: 'Admin',
          timestamp: new Date().toISOString(),
          severity: 'low'
        });

        alert(`Subject Created Successfully!\n\nName: ${subjectData.name}\nCode: ${subjectData.code}\nRoom: ${subjectData.room}\nTeachers can now be assigned via User Management.`);
      }

      if (onSubjectSaved) {
        onSubjectSaved();
      }

      resetForm();
      onClose();
      
    } catch (error) {
      console.error('Error saving subject:', error);
      setErrors({ 
        submit: 'Failed to save subject. Please try again.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  if (!isOpen) return null;

  const dayOptions = [
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' }
  ];

  // Generate modal title  
  const modalTitle = subject 
    ? `Edit Subject: ${subject.name || 'Unknown'}` 
    : 'Add New Subject';

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header bg-warning text-dark">
            <h5 className="modal-title">
              <i className={`bi bi-${subject ? 'pencil' : 'book'} me-2`}></i>
              {modalTitle}
            </h5>
            <button 
              type="button" 
              className="btn-close" 
              onClick={handleClose}
              disabled={loading}
            ></button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {errors.submit && (
                <div className="alert alert-danger">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  {errors.submit}
                </div>
              )}

              {/* NEW: Edit Mode Banner */}
              {subject && (
                <div className="alert alert-info py-2 mb-3">
                  <small>
                    <i className="bi bi-info-circle me-1"></i>
                    <strong>Edit Mode:</strong> You can update subject information, schedule, and status. 
                    Assigned teachers: <strong>{subject.assignedTeachers?.length || 0}</strong>
                  </small>
                </div>
              )}

              {/* Basic Information */}
              <div className="mb-4">
                <h6 className="text-muted mb-3 border-bottom pb-2">Basic Information</h6>
                
                <div className="row g-3">
                  <div className="col-md-8">
                    <label className="form-label">Subject Name *</label>
                    <input
                      type="text"
                      className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="e.g., Mathematics, Science, English"
                      disabled={loading}
                    />
                    {errors.name && (
                      <div className="invalid-feedback">{errors.name}</div>
                    )}
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">Subject Code *</label>
                    <input
                      type="text"
                      className={`form-control ${errors.code ? 'is-invalid' : ''}`}
                      name="code"
                      value={formData.code}
                      onChange={handleInputChange}
                      placeholder="e.g., MATH101"
                      style={{ textTransform: 'uppercase' }}
                      maxLength={8}
                      disabled={loading}
                    />
                    {errors.code && (
                      <div className="invalid-feedback">{errors.code}</div>
                    )}
                  </div>
                </div>

                <div className="row g-3 mt-2">
                  <div className="col-md-8">
                    <label className="form-label">Room *</label>
                    <input
                      type="text"
                      className={`form-control ${errors.room ? 'is-invalid' : ''}`}
                      name="room"
                      value={formData.room}
                      onChange={handleInputChange}
                      placeholder="e.g., Room 101, Lab A, Gymnasium"
                      disabled={loading}
                    />
                    {errors.room && (
                      <div className="invalid-feedback">{errors.room}</div>
                    )}
                  </div>

                  {/* NEW: Status field for edit mode */}
                  <div className="col-md-4">
                    <label className="form-label">Status</label>
                    <select
                      className="form-select"
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      disabled={loading}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                    <small className="text-muted">Subject availability</small>
                  </div>
                </div>
              </div>

              {/* Schedule Section */}
              <div className="mb-4">
                <h6 className="text-muted mb-3 border-bottom pb-2">
                  Class Schedule <small className="text-muted">(Optional)</small>
                </h6>
                
                {errors.schedule && (
                  <div className="alert alert-danger py-2">
                    <small>{errors.schedule}</small>
                  </div>
                )}

                {/* Week 1 */}
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <label className="form-label mb-0">Week 1</label>
                    <button 
                      type="button" 
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => addScheduleEntry('week1')}
                      disabled={loading}
                    >
                      <i className="bi bi-plus me-1"></i>Add Time
                    </button>
                  </div>
                  
                  {schedule.week1.length === 0 ? (
                    <div className="text-center py-3 bg-light rounded">
                      <small className="text-muted">No schedule for Week 1</small>
                    </div>
                  ) : (
                    <div className="border rounded p-3">
                      {schedule.week1.map((entry, index) => (
                        <div key={index} className="row g-2 mb-2">
                          <div className="col-md-4">
                            <select
                              className="form-select form-select-sm"
                              value={entry.day}
                              onChange={(e) => updateScheduleEntry('week1', index, 'day', e.target.value)}
                              disabled={loading}
                            >
                              <option value="">Select Day</option>
                              {dayOptions.map(day => (
                                <option key={day.value} value={day.value}>{day.label}</option>
                              ))}
                            </select>
                          </div>
                          <div className="col-md-3">
                            <input
                              type="number"
                              className="form-control form-control-sm"
                              placeholder="Period"
                              value={entry.period}
                              onChange={(e) => updateScheduleEntry('week1', index, 'period', e.target.value)}
                              min="1"
                              max="10"
                              disabled={loading}
                            />
                          </div>
                          <div className="col-md-4">
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              placeholder="8:00-8:45"
                              value={entry.time}
                              onChange={(e) => updateScheduleEntry('week1', index, 'time', e.target.value)}
                              disabled={loading}
                            />
                          </div>
                          <div className="col-md-1">
                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => removeScheduleEntry('week1', index)}
                              disabled={loading}
                            >
                              <i className="bi bi-x"></i>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Week 2 */}
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <label className="form-label mb-0">Week 2</label>
                    <button 
                      type="button" 
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => addScheduleEntry('week2')}
                      disabled={loading}
                    >
                      <i className="bi bi-plus me-1"></i>Add Time
                    </button>
                  </div>
                  
                  {schedule.week2.length === 0 ? (
                    <div className="text-center py-3 bg-light rounded">
                      <small className="text-muted">No schedule for Week 2</small>
                    </div>
                  ) : (
                    <div className="border rounded p-3">
                      {schedule.week2.map((entry, index) => (
                        <div key={index} className="row g-2 mb-2">
                          <div className="col-md-4">
                            <select
                              className="form-select form-select-sm"
                              value={entry.day}
                              onChange={(e) => updateScheduleEntry('week2', index, 'day', e.target.value)}
                              disabled={loading}
                            >
                              <option value="">Select Day</option>
                              {dayOptions.map(day => (
                                <option key={day.value} value={day.value}>{day.label}</option>
                              ))}
                            </select>
                          </div>
                          <div className="col-md-3">
                            <input
                              type="number"
                              className="form-control form-control-sm"
                              placeholder="Period"
                              value={entry.period}
                              onChange={(e) => updateScheduleEntry('week2', index, 'period', e.target.value)}
                              min="1"
                              max="10"
                              disabled={loading}
                            />
                          </div>
                          <div className="col-md-4">
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              placeholder="8:00-8:45"
                              value={entry.time}
                              onChange={(e) => updateScheduleEntry('week2', index, 'time', e.target.value)}
                              disabled={loading}
                            />
                          </div>
                          <div className="col-md-1">
                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => removeScheduleEntry('week2', index)}
                              disabled={loading}
                            >
                              <i className="bi bi-x"></i>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Color Selection */}
              <div className="mb-3">
                <label className="form-label">Color Theme</label>
                <div className="d-flex flex-wrap gap-2">
                  {colorOptions.map(color => (
                    <button
                      key={color.value}
                      type="button"
                      className={`btn btn-sm ${formData.color === color.value ? 'btn-dark' : 'btn-light'}`}
                      style={{ 
                        backgroundColor: color.value,
                        color: 'white',
                        border: formData.color === color.value ? '2px solid #000' : '1px solid #ddd',
                        minWidth: '60px'
                      }}
                      onClick={() => handleInputChange({ 
                        target: { name: 'color', value: color.value } 
                      })}
                      disabled={loading}
                    >
                      {color.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="mb-3">
                <label className="form-label">Description</label>
                <textarea
                  className="form-control"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="2"
                  placeholder="Brief description of the subject (optional)"
                  disabled={loading}
                />
              </div>

              {/* Preview */}
              <div className="mb-3">
                <label className="form-label">Preview</label>
                <div className="p-3 bg-light rounded">
                  <div className="d-flex align-items-center mb-2">
                    <span 
                      className="badge me-2"
                      style={{ 
                        backgroundColor: formData.color,
                        color: 'white',
                        fontSize: '0.9em'
                      }}
                    >
                      {formData.code || 'CODE'}
                    </span>
                    <strong>{formData.name || 'Subject Name'}</strong>
                    {formData.room && (
                      <span className="badge bg-secondary ms-2">
                        <i className="bi bi-geo-alt me-1"></i>
                        {formData.room}
                      </span>
                    )}
                    <span className={`badge ms-2 ${
                      formData.status === 'active' ? 'bg-success' : 'bg-secondary'
                    }`}>
                      {formData.status}
                    </span>
                  </div>
                  {formData.description && (
                    <div className="text-muted small mb-2">
                      {formData.description}
                    </div>
                  )}
                  <div className="small">
                    <strong>Week 1:</strong> {schedule.week1.length} classes, 
                    <strong> Week 2:</strong> {schedule.week2.length} classes
                  </div>
                  <div className="text-info small mt-2">
                    <i className="bi bi-info-circle me-1"></i>
                    {subject ? 
                      `${subject.assignedTeachers?.length || 0} teachers currently assigned` :
                      'Teachers will be assigned to this subject when creating user accounts'
                    }
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-warning text-dark"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    {subject ? 'Updating...' : 'Adding...'}
                  </>
                ) : (
                  <>
                    <i className={`bi bi-${subject ? 'check-lg' : 'plus-lg'} me-2`}></i>
                    {subject ? 'Update Subject' : 'Add Subject'}
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

export default SubjectModal;