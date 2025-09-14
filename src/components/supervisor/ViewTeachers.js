// src/components/supervisor/ViewTeachers.js
import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

// Import supervisor services
import { getTeachersData } from '../../services/supervisorService';

function ViewTeachers({ currentUser }) {
  const [teachers, setTeachers] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, inactive
  const [filterRole, setFilterRole] = useState('all'); // all, homeroom, subject

  useEffect(() => {
    loadTeachersData();
  }, []);

  const loadTeachersData = async () => {
    try {
      setLoading(true);
      const data = await getTeachersData();
      setTeachers(data.teachers || []);
      setSections(data.sections || []);
    } catch (error) {
      console.error('Error loading teachers data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTeachers = teachers.filter(teacher => {
    // Search filter
    const matchesSearch = teacher.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         teacher.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status filter
    const matchesStatus = filterStatus === 'all' || teacher.status === filterStatus;
    
    // Role filter
    const matchesRole = filterRole === 'all' || 
                       (filterRole === 'homeroom' && teacher.roles?.includes('homeroom')) ||
                       (filterRole === 'subject' && teacher.roles?.includes('subject'));

    return matchesSearch && matchesStatus && matchesRole;
  });

  const getSectionName = (sectionId) => {
    const section = sections.find(s => s.id === sectionId);
    return section ? section.name : 'Unknown Section';
  };

  const getTeacherStats = (teacher) => {
    const assignedSections = teacher.sections?.length || 0;
    const assignedSubjects = teacher.subjects?.length || 0;
    return { assignedSections, assignedSubjects };
  };

  return (
    <div>
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <div className="row align-items-center">
                <div className="col-md-6">
                  <h5 className="mb-1">👨‍🏫 Teachers Overview</h5>
                  <small className="text-muted">View teacher information and assignments</small>
                </div>
                <div className="col-md-6 text-md-end">
                  <span className="badge bg-secondary px-3 py-2">
                    <i className="bi bi-eye me-1"></i>
                    Read Only Access
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="row mb-4">
        <div className="col-md-4 mb-3">
          <label className="form-label">🔍 Search Teachers</label>
          <input
            type="text"
            className="form-control"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="col-md-4 mb-3">
          <label className="form-label">📊 Filter by Status</label>
          <select 
            className="form-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
        <div className="col-md-4 mb-3">
          <label className="form-label">👥 Filter by Role</label>
          <select 
            className="form-select"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="homeroom">Homeroom Teachers</option>
            <option value="subject">Subject Teachers</option>
          </select>
        </div>
      </div>

      {/* Teachers List */}
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header bg-white">
              <h6 className="mb-0">
                <i className="bi bi-people me-2"></i>
                Teachers List ({filteredTeachers.length})
              </h6>
            </div>
            <div className="card-body p-0">
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="text-muted mt-3">Loading teachers data...</p>
                </div>
              ) : filteredTeachers.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="ps-3">Teacher</th>
                        <th>Roles</th>
                        <th>Homeroom</th>
                        <th>Subjects</th>
                        <th>Sections</th>
                        <th>Status</th>
                        <th className="pe-3">Last Login</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTeachers.map((teacher) => {
                        const stats = getTeacherStats(teacher);
                        const homeroomSection = teacher.homeroomClass ? 
                          getSectionName(teacher.homeroomClass) : null;

                        return (
                          <tr key={teacher.id}>
                            <td className="ps-3">
                              <div>
                                <div className="fw-medium">{teacher.name}</div>
                                <small className="text-muted">{teacher.email}</small>
                                {teacher.mustChangePassword && (
                                  <div className="mt-1">
                                    <span className="badge bg-warning text-dark">
                                      <i className="bi bi-exclamation-triangle me-1"></i>
                                      Password Reset Required
                                    </span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td>
                              <div className="d-flex flex-wrap gap-1">
                                {teacher.roles?.map(role => (
                                  <span 
                                    key={role} 
                                    className={`badge ${
                                      role === 'homeroom' ? 'bg-warning text-dark' : 'bg-primary'
                                    }`}
                                  >
                                    {role === 'homeroom' ? 'Homeroom' : 'Subject'}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td>
                              {teacher.roles?.includes('homeroom') ? (
                                homeroomSection ? (
                                  <span className="badge bg-warning bg-opacity-10 text-warning">
                                    <i className="bi bi-house-fill me-1"></i>
                                    {homeroomSection}
                                  </span>
                                ) : (
                                  <small className="text-muted">Not assigned</small>
                                )
                              ) : (
                                <small className="text-muted">—</small>
                              )}
                            </td>
                            <td>
                              {teacher.subjects && teacher.subjects.length > 0 ? (
                                <div>
                                  {teacher.subjects.slice(0, 2).map((subject, idx) => (
                                    <span key={idx} className="badge bg-info bg-opacity-10 text-info me-1 mb-1">
                                      {subject}
                                    </span>
                                  ))}
                                  {teacher.subjects.length > 2 && (
                                    <small className="text-muted">+{teacher.subjects.length - 2} more</small>
                                  )}
                                </div>
                              ) : (
                                <small className="text-muted">No subjects</small>
                              )}
                            </td>
                            <td>
                              {teacher.sections && teacher.sections.length > 0 ? (
                                <div>
                                  <span className="badge bg-light text-dark">
                                    {stats.assignedSections} sections
                                  </span>
                                  <div className="mt-1">
                                    {teacher.sections.slice(0, 2).map((sectionId, idx) => (
                                      <small key={idx} className="text-muted d-block">
                                        {getSectionName(sectionId)}
                                      </small>
                                    ))}
                                    {teacher.sections.length > 2 && (
                                      <small className="text-muted">+{teacher.sections.length - 2} more</small>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <small className="text-muted">No sections</small>
                              )}
                            </td>
                            <td>
                              <span className={`badge bg-${
                                teacher.status === 'active' ? 'success' : 'secondary'
                              }`}>
                                {teacher.status || 'Unknown'}
                              </span>
                            </td>
                            <td className="pe-3">
                              <small className="text-muted">
                                {teacher.lastLogin ? 
                                  new Date(teacher.lastLogin).toLocaleDateString() : 
                                  'Never'
                                }
                              </small>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-5">
                  <i className="bi bi-person-x fs-1 text-muted"></i>
                  <h6 className="mt-3 text-muted">No Teachers Found</h6>
                  <p className="text-muted">
                    {searchTerm ? 
                      `No teachers match "${searchTerm}"` : 
                      'No teachers available with current filters'
                    }
                  </p>
                  {searchTerm && (
                    <button 
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => setSearchTerm('')}
                    >
                      Clear Search
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="row mt-4">
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <h6 className="card-title">📊 Teacher Summary</h6>
              <div className="row text-center">
                <div className="col-6">
                  <h4 className="text-success">{teachers.filter(t => t.status === 'active').length}</h4>
                  <small className="text-muted">Active</small>
                </div>
                <div className="col-6">
                  <h4 className="text-secondary">{teachers.filter(t => t.status !== 'active').length}</h4>
                  <small className="text-muted">Inactive</small>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <h6 className="card-title">👥 Role Distribution</h6>
              <div className="row text-center">
                <div className="col-6">
                  <h4 className="text-warning">{teachers.filter(t => t.roles?.includes('homeroom')).length}</h4>
                  <small className="text-muted">Homeroom</small>
                </div>
                <div className="col-6">
                  <h4 className="text-primary">{teachers.filter(t => t.roles?.includes('subject')).length}</h4>
                  <small className="text-muted">Subject</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Note */}
      <div className="row mt-4">
        <div className="col-12">
          <div className="alert alert-info border-0">
            <i className="bi bi-info-circle me-2"></i>
            <strong>Note:</strong> You have read-only access to teacher information. 
            To make changes to teacher accounts, please contact an administrator.
          </div>
        </div>
      </div>
    </div>
  );
}

export default ViewTeachers;