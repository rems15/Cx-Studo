// src/components/supervisor/ViewTeachers.js
import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';

function ViewTeachers({ currentUser }) {
  const [teachers, setTeachers] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all', // all, active, inactive
    role: 'all', // all, homeroom, subject, supervisor
    section: 'all',
    sortBy: 'name' // name, status, role, lastLogin
  });
  const [viewMode, setViewMode] = useState('table'); // table, cards
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [teacherStats, setTeacherStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    homeroom: 0,
    subject: 0,
    supervisor: 0
  });

  useEffect(() => {
    loadTeachersData();
  }, []);

  const loadTeachersData = async () => {
    try {
      setLoading(true);
      
      const [teachersData, sectionsData, subjectsData] = await Promise.all([
        loadTeachers(),
        loadSections(),
        loadSubjects()
      ]);
      
      setTeachers(teachersData);
      setSections(sectionsData);
      setSubjects(subjectsData);
      calculateStats(teachersData);
      
    } catch (error) {
      console.error('Error loading teachers data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTeachers = async () => {
    try {
      const usersQuery = query(
        collection(db, 'users'),
        orderBy('name', 'asc')
      );
      
      const snapshot = await getDocs(usersQuery);
      const teachersData = [];
      
      snapshot.forEach(doc => {
        const userData = doc.data();
        // Filter only users with teaching roles
        if (userData.roles && (
          userData.roles.includes('homeroom') || 
          userData.roles.includes('subject') || 
          userData.roles.includes('supervisor')
        )) {
          teachersData.push({
            id: doc.id,
            ...userData,
            displayRoles: userData.roles || [],
            assignedSections: userData.sections || [],
            assignedSubjects: userData.subjects || [],
            homeroomClass: userData.homeroomClass || null
          });
        }
      });
      
      return teachersData;
    } catch (error) {
      console.error('Error loading teachers:', error);
      return [];
    }
  };

  const loadSections = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'sections'));
      const sectionsData = [];
      
      snapshot.forEach(doc => {
        sectionsData.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return sectionsData;
    } catch (error) {
      console.error('Error loading sections:', error);
      return [];
    }
  };

  const loadSubjects = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'subjects'));
      const subjectsData = [];
      
      snapshot.forEach(doc => {
        subjectsData.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return subjectsData;
    } catch (error) {
      console.error('Error loading subjects:', error);
      return [];
    }
  };

  const calculateStats = (teachersData) => {
    const stats = {
      total: teachersData.length,
      active: teachersData.filter(t => t.status === 'active').length,
      inactive: teachersData.filter(t => t.status !== 'active').length,
      homeroom: teachersData.filter(t => t.displayRoles.includes('homeroom')).length,
      subject: teachersData.filter(t => t.displayRoles.includes('subject')).length,
      supervisor: teachersData.filter(t => t.displayRoles.includes('supervisor')).length
    };
    setTeacherStats(stats);
  };

  const getFilteredAndSortedTeachers = () => {
    let filtered = teachers.filter(teacher => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matches = 
          teacher.name?.toLowerCase().includes(searchLower) ||
          teacher.email?.toLowerCase().includes(searchLower);
        if (!matches) return false;
      }
      
      // Status filter
      if (filters.status !== 'all' && teacher.status !== filters.status) return false;
      
      // Role filter
      if (filters.role !== 'all' && !teacher.displayRoles.includes(filters.role)) return false;
      
      // Section filter
      if (filters.section !== 'all') {
        const hasSection = teacher.assignedSections.includes(filters.section) ||
                          teacher.homeroomClass === filters.section;
        if (!hasSection) return false;
      }
      
      return true;
    });

    // Sort data
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'status':
          return (a.status || 'inactive').localeCompare(b.status || 'inactive');
        case 'role':
          return (a.displayRoles[0] || '').localeCompare(b.displayRoles[0] || '');
        case 'lastLogin':
          const aLogin = a.lastLogin || 0;
          const bLogin = b.lastLogin || 0;
          return bLogin - aLogin;
        case 'name':
        default:
          return (a.name || '').localeCompare(b.name || '');
      }
    });

    return filtered;
  };

  const getSectionName = (sectionId) => {
    const section = sections.find(s => s.id === sectionId);
    return section ? section.name : sectionId;
  };

  const getSubjectName = (subjectId) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject ? subject.name : subjectId;
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'homeroom': return 'warning';
      case 'subject': return 'primary';
      case 'supervisor': return 'info';
      case 'admin': return 'success';
      default: return 'secondary';
    }
  };

  const handleTeacherClick = (teacher) => {
    setSelectedTeacher(teacher);
    setShowDetailModal(true);
  };

  const renderStatsCards = () => (
    <div className="row mb-4">
      <div className="col-lg-2 col-md-4 col-6 mb-3">
        <div className="card border-0 shadow-sm h-100">
          <div className="card-body text-center">
            <div className="bg-primary bg-opacity-10 rounded-circle p-2 mx-auto mb-2" style={{ width: '50px', height: '50px' }}>
              <i className="bi bi-people-fill fs-5 text-primary"></i>
            </div>
            <h4 className="mb-0">{teacherStats.total}</h4>
            <small className="text-muted">Total Teachers</small>
          </div>
        </div>
      </div>

      <div className="col-lg-2 col-md-4 col-6 mb-3">
        <div className="card border-0 shadow-sm h-100">
          <div className="card-body text-center">
            <div className="bg-success bg-opacity-10 rounded-circle p-2 mx-auto mb-2" style={{ width: '50px', height: '50px' }}>
              <i className="bi bi-check-circle-fill fs-5 text-success"></i>
            </div>
            <h4 className="mb-0">{teacherStats.active}</h4>
            <small className="text-muted">Active</small>
          </div>
        </div>
      </div>

      <div className="col-lg-2 col-md-4 col-6 mb-3">
        <div className="card border-0 shadow-sm h-100">
          <div className="card-body text-center">
            <div className="bg-warning bg-opacity-10 rounded-circle p-2 mx-auto mb-2" style={{ width: '50px', height: '50px' }}>
              <i className="bi bi-house-fill fs-5 text-warning"></i>
            </div>
            <h4 className="mb-0">{teacherStats.homeroom}</h4>
            <small className="text-muted">Homeroom</small>
          </div>
        </div>
      </div>

      <div className="col-lg-2 col-md-4 col-6 mb-3">
        <div className="card border-0 shadow-sm h-100">
          <div className="card-body text-center">
            <div className="bg-info bg-opacity-10 rounded-circle p-2 mx-auto mb-2" style={{ width: '50px', height: '50px' }}>
              <i className="bi bi-book-fill fs-5 text-info"></i>
            </div>
            <h4 className="mb-0">{teacherStats.subject}</h4>
            <small className="text-muted">Subject</small>
          </div>
        </div>
      </div>

      <div className="col-lg-2 col-md-4 col-6 mb-3">
        <div className="card border-0 shadow-sm h-100">
          <div className="card-body text-center">
            <div className="bg-secondary bg-opacity-10 rounded-circle p-2 mx-auto mb-2" style={{ width: '50px', height: '50px' }}>
              <i className="bi bi-eye-fill fs-5 text-secondary"></i>
            </div>
            <h4 className="mb-0">{teacherStats.supervisor}</h4>
            <small className="text-muted">Supervisors</small>
          </div>
        </div>
      </div>

      <div className="col-lg-2 col-md-4 col-6 mb-3">
        <div className="card border-0 shadow-sm h-100">
          <div className="card-body text-center">
            <div className="bg-danger bg-opacity-10 rounded-circle p-2 mx-auto mb-2" style={{ width: '50px', height: '50px' }}>
              <i className="bi bi-person-x-fill fs-5 text-danger"></i>
            </div>
            <h4 className="mb-0">{teacherStats.inactive}</h4>
            <small className="text-muted">Inactive</small>
          </div>
        </div>
      </div>
    </div>
  );

  const renderFiltersAndControls = () => (
    <div className="card border-0 shadow-sm mb-4">
      <div className="card-body">
        <div className="row align-items-end">
          <div className="col-md-3 mb-3">
            <label className="form-label small text-muted">SEARCH TEACHERS</label>
            <div className="input-group">
              <span className="input-group-text border-end-0 bg-white">
                <i className="bi bi-search text-muted"></i>
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Search by name or email..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>
          </div>

          <div className="col-md-2 mb-3">
            <label className="form-label small text-muted">STATUS</label>
            <select 
              className="form-select"
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          <div className="col-md-2 mb-3">
            <label className="form-label small text-muted">ROLE</label>
            <select 
              className="form-select"
              value={filters.role}
              onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
            >
              <option value="all">All Roles</option>
              <option value="homeroom">Homeroom</option>
              <option value="subject">Subject</option>
              <option value="supervisor">Supervisor</option>
            </select>
          </div>

          <div className="col-md-2 mb-3">
            <label className="form-label small text-muted">SECTION</label>
            <select 
              className="form-select"
              value={filters.section}
              onChange={(e) => setFilters(prev => ({ ...prev, section: e.target.value }))}
            >
              <option value="all">All Sections</option>
              {sections.map(section => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-3 mb-3">
            <label className="form-label small text-muted">SORT & VIEW</label>
            <div className="d-flex gap-2">
              <select 
                className="form-select"
                value={filters.sortBy}
                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
              >
                <option value="name">By Name</option>
                <option value="status">By Status</option>
                <option value="role">By Role</option>
                <option value="lastLogin">By Last Login</option>
              </select>
              
              <div className="btn-group" role="group">
                <button
                  type="button"
                  className={`btn ${viewMode === 'table' ? 'btn-primary' : 'btn-outline-secondary'} btn-sm`}
                  onClick={() => setViewMode('table')}
                  title="Table View"
                >
                  <i className="bi bi-table"></i>
                </button>
                <button
                  type="button"
                  className={`btn ${viewMode === 'cards' ? 'btn-primary' : 'btn-outline-secondary'} btn-sm`}
                  onClick={() => setViewMode('cards')}
                  title="Card View"
                >
                  <i className="bi bi-grid-3x3-gap"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick filters */}
        <div className="mt-3 pt-3 border-top">
          <small className="text-muted me-3">QUICK FILTERS:</small>
          <div className="btn-group btn-group-sm">
            <button 
              className="btn btn-outline-secondary"
              onClick={() => setFilters(prev => ({ ...prev, status: 'active', role: 'all' }))}
            >
              Active Teachers
            </button>
            <button 
              className="btn btn-outline-warning"
              onClick={() => setFilters(prev => ({ ...prev, role: 'homeroom', status: 'all' }))}
            >
              Homeroom Only
            </button>
            <button 
              className="btn btn-outline-primary"
              onClick={() => setFilters(prev => ({ ...prev, role: 'subject', status: 'all' }))}
            >
              Subject Only
            </button>
            <button 
              className="btn btn-outline-secondary"
              onClick={() => setFilters({ search: '', status: 'all', role: 'all', section: 'all', sortBy: 'name' })}
            >
              Clear All
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTableView = (filteredTeachers) => (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-white border-0">
        <div className="d-flex justify-content-between align-items-center">
          <h6 className="mb-0">
            <i className="bi bi-people me-2"></i>
            Teachers List ({filteredTeachers.length})
          </h6>
          <span className="badge bg-secondary">READ ONLY</span>
        </div>
      </div>
      <div className="card-body p-0">
        {filteredTeachers.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-3">Teacher</th>
                  <th>Roles</th>
                  <th>Homeroom</th>
                  <th>Assignments</th>
                  <th>Status</th>
                  <th className="pe-3">Last Login</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeachers.map((teacher) => (
                  <tr key={teacher.id} style={{ cursor: 'pointer' }} onClick={() => handleTeacherClick(teacher)}>
                    <td className="ps-3">
                      <div className="d-flex align-items-center">
                        <div className="bg-primary bg-opacity-10 rounded-circle p-2 me-3">
                          <i className="bi bi-person text-primary"></i>
                        </div>
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
                      </div>
                    </td>
                    <td>
                      <div className="d-flex flex-wrap gap-1">
                        {teacher.displayRoles.map(role => (
                          <span 
                            key={role} 
                            className={`badge bg-${getRoleColor(role)}`}
                          >
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      {teacher.homeroomClass ? (
                        <span className="badge bg-warning bg-opacity-10 text-warning">
                          <i className="bi bi-house-fill me-1"></i>
                          {getSectionName(teacher.homeroomClass)}
                        </span>
                      ) : (
                        <small className="text-muted">Not assigned</small>
                      )}
                    </td>
                    <td>
                      <div>
                        {teacher.assignedSections.length > 0 && (
                          <div className="mb-1">
                            <small className="text-muted">Sections:</small>
                            <div>
                              {teacher.assignedSections.slice(0, 2).map(sectionId => (
                                <span key={sectionId} className="badge bg-info bg-opacity-10 text-info me-1">
                                  {getSectionName(sectionId)}
                                </span>
                              ))}
                              {teacher.assignedSections.length > 2 && (
                                <small className="text-muted">+{teacher.assignedSections.length - 2} more</small>
                              )}
                            </div>
                          </div>
                        )}
                        {teacher.assignedSubjects.length > 0 && (
                          <div>
                            <small className="text-muted">Subjects:</small>
                            <div>
                              {teacher.assignedSubjects.slice(0, 2).map(subjectId => (
                                <span key={subjectId} className="badge bg-primary bg-opacity-10 text-primary me-1">
                                  {getSubjectName(subjectId)}
                                </span>
                              ))}
                              {teacher.assignedSubjects.length > 2 && (
                                <small className="text-muted">+{teacher.assignedSubjects.length - 2} more</small>
                              )}
                            </div>
                          </div>
                        )}
                        {teacher.assignedSections.length === 0 && teacher.assignedSubjects.length === 0 && (
                          <small className="text-muted">No assignments</small>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`badge bg-${teacher.status === 'active' ? 'success' : 'secondary'}`}>
                        {teacher.status || 'Inactive'}
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
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-5">
            <i className="bi bi-person-x fs-1 text-muted"></i>
            <h6 className="mt-3 text-muted">No Teachers Found</h6>
            <p className="text-muted">
              {filters.search ? 
                `No teachers match "${filters.search}"` : 
                'No teachers available with current filters'
              }
            </p>
            <div className="mt-3">
              {filters.search && (
                <button 
                  className="btn btn-outline-secondary btn-sm me-2"
                  onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
                >
                  <i className="bi bi-x me-1"></i>
                  Clear Search
                </button>
              )}
              <button 
                className="btn btn-outline-primary btn-sm"
                onClick={() => setFilters({ search: '', status: 'all', role: 'all', section: 'all', sortBy: 'name' })}
              >
                <i className="bi bi-arrow-clockwise me-1"></i>
                Reset Filters
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderCardView = (filteredTeachers) => (
    <div className="row">
      {filteredTeachers.map((teacher) => (
        <div key={teacher.id} className="col-lg-4 col-md-6 mb-4">
          <div 
            className="card border-0 shadow-sm h-100" 
            style={{ cursor: 'pointer' }}
            onClick={() => handleTeacherClick(teacher)}
          >
            <div className="card-header bg-white border-0">
              <div className="d-flex justify-content-between align-items-start">
                <div className="d-flex align-items-center">
                  <div className="bg-primary bg-opacity-10 rounded-circle p-2 me-3">
                    <i className="bi bi-person text-primary fs-5"></i>
                  </div>
                  <div>
                    <h6 className="mb-0">{teacher.name}</h6>
                    <small className="text-muted">{teacher.email}</small>
                  </div>
                </div>
                <span className={`badge bg-${teacher.status === 'active' ? 'success' : 'secondary'}`}>
                  {teacher.status || 'Inactive'}
                </span>
              </div>
            </div>
            <div className="card-body">
              {/* Roles */}
              <div className="mb-3">
                <small className="text-muted d-block mb-1">Roles</small>
                <div className="d-flex flex-wrap gap-1">
                  {teacher.displayRoles.map(role => (
                    <span 
                      key={role} 
                      className={`badge bg-${getRoleColor(role)}`}
                    >
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </span>
                  ))}
                </div>
              </div>

              {/* Homeroom */}
              {teacher.homeroomClass && (
                <div className="mb-3">
                  <small className="text-muted d-block mb-1">Homeroom Class</small>
                  <span className="badge bg-warning bg-opacity-10 text-warning">
                    <i className="bi bi-house-fill me-1"></i>
                    {getSectionName(teacher.homeroomClass)}
                  </span>
                </div>
              )}

              {/* Assignments */}
              {(teacher.assignedSections.length > 0 || teacher.assignedSubjects.length > 0) && (
                <div className="mb-3">
                  <small className="text-muted d-block mb-1">Assignments</small>
                  <div>
                    <small className="text-muted">
                      {teacher.assignedSections.length} sections, {teacher.assignedSubjects.length} subjects
                    </small>
                  </div>
                </div>
              )}

              {/* Last Login */}
              <div className="border-top pt-2">
                <small className="text-muted">
                  <i className="bi bi-clock me-1"></i>
                  Last login: {teacher.lastLogin ? 
                    new Date(teacher.lastLogin).toLocaleDateString() : 
                    'Never'
                  }
                </small>
              </div>

              {teacher.mustChangePassword && (
                <div className="mt-2">
                  <span className="badge bg-warning text-dark">
                    <i className="bi bi-exclamation-triangle me-1"></i>
                    Password Reset Required
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderDetailModal = () => {
    if (!selectedTeacher) return null;

    return (
      <div className={`modal fade ${showDetailModal ? 'show' : ''}`} 
           style={{ display: showDetailModal ? 'block' : 'none' }}
           tabIndex="-1">
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                <i className="bi bi-person-circle me-2"></i>
                {selectedTeacher.name}
              </h5>
              <button type="button" className="btn-close" 
                      onClick={() => setShowDetailModal(false)}></button>
            </div>
            <div className="modal-body">
              {/* Basic Info */}
              <div className="row mb-4">
                <div className="col-md-6">
                  <h6 className="text-muted mb-2">Personal Information</h6>
                  <ul className="list-unstyled">
                    <li><strong>Name:</strong> {selectedTeacher.name}</li>
                    <li><strong>Email:</strong> {selectedTeacher.email}</li>
                    <li><strong>Status:</strong> 
                      <span className={`badge bg-${selectedTeacher.status === 'active' ? 'success' : 'secondary'} ms-2`}>
                        {selectedTeacher.status || 'Inactive'}
                      </span>
                    </li>
                    <li><strong>Last Login:</strong> {selectedTeacher.lastLogin ? 
                      new Date(selectedTeacher.lastLogin).toLocaleString() : 'Never'}</li>
                  </ul>
                </div>
                <div className="col-md-6">
                  <h6 className="text-muted mb-2">System Information</h6>
                  <ul className="list-unstyled">
                    <li><strong>User ID:</strong> <code className="text-primary">{selectedTeacher.id}</code></li>
                    <li><strong>Password Status:</strong> 
                      {selectedTeacher.mustChangePassword ? 
                        <span className="badge bg-warning text-dark ms-2">Reset Required</span> :
                        <span className="badge bg-success ms-2">OK</span>
                      }
                    </li>
                    <li><strong>Account Created:</strong> {selectedTeacher.createdAt ? 
                      new Date(selectedTeacher.createdAt.seconds * 1000).toLocaleDateString() : 'Unknown'}</li>
                  </ul>
                </div>
              </div>

              {/* Roles & Responsibilities */}
              <div className="card mb-4">
                <div className="card-header bg-primary text-white">
                  <h6 className="mb-0">
                    <i className="bi bi-award me-2"></i>
                    Roles & Responsibilities
                  </h6>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-6">
                      <h6 className="text-muted mb-2">Assigned Roles</h6>
                      <div className="d-flex flex-wrap gap-2 mb-3">
                        {selectedTeacher.displayRoles.map(role => (
                          <span 
                            key={role} 
                            className={`badge bg-${getRoleColor(role)} px-3 py-2`}
                          >
                            <i className={`bi ${
                              role === 'homeroom' ? 'bi-house-fill' :
                              role === 'subject' ? 'bi-book-fill' :
                              role === 'supervisor' ? 'bi-eye-fill' :
                              'bi-shield-fill'
                            } me-2`}></i>
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    {selectedTeacher.homeroomClass && (
                      <div className="col-md-6">
                        <h6 className="text-muted mb-2">Homeroom Assignment</h6>
                        <div className="bg-warning bg-opacity-10 p-3 rounded">
                          <div className="d-flex align-items-center">
                            <i className="bi bi-house-fill text-warning fs-4 me-3"></i>
                            <div>
                              <div className="fw-bold text-warning">
                                {getSectionName(selectedTeacher.homeroomClass)}
                              </div>
                              <small className="text-muted">Primary homeroom responsibility</small>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Assignments */}
              <div className="row">
                {selectedTeacher.assignedSections.length > 0 && (
                  <div className="col-md-6 mb-4">
                    <div className="card">
                      <div className="card-header bg-info text-white">
                        <h6 className="mb-0">
                          <i className="bi bi-diagram-3 me-2"></i>
                          Section Assignments ({selectedTeacher.assignedSections.length})
                        </h6>
                      </div>
                      <div className="card-body">
                        <div className="list-group list-group-flush">
                          {selectedTeacher.assignedSections.map(sectionId => {
                            const section = sections.find(s => s.id === sectionId);
                            return (
                              <div key={sectionId} className="list-group-item border-0 px-0">
                                <div className="d-flex align-items-center">
                                  <i className="bi bi-diagram-3-fill text-info me-2"></i>
                                  <div>
                                    <div className="fw-medium">{getSectionName(sectionId)}</div>
                                    {section && (
                                      <small className="text-muted">
                                        Grade {section.gradeLevel} • Room {section.room || 'TBD'}
                                      </small>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedTeacher.assignedSubjects.length > 0 && (
                  <div className="col-md-6 mb-4">
                    <div className="card">
                      <div className="card-header bg-primary text-white">
                        <h6 className="mb-0">
                          <i className="bi bi-book me-2"></i>
                          Subject Assignments ({selectedTeacher.assignedSubjects.length})
                        </h6>
                      </div>
                      <div className="card-body">
                        <div className="list-group list-group-flush">
                          {selectedTeacher.assignedSubjects.map(subjectId => {
                            const subject = subjects.find(s => s.id === subjectId);
                            return (
                              <div key={subjectId} className="list-group-item border-0 px-0">
                                <div className="d-flex align-items-center">
                                  <i className="bi bi-book-fill text-primary me-2"></i>
                                  <div>
                                    <div className="fw-medium">{getSubjectName(subjectId)}</div>
                                    {subject && subject.description && (
                                      <small className="text-muted">{subject.description}</small>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {(selectedTeacher.assignedSections.length === 0 && selectedTeacher.assignedSubjects.length === 0 && !selectedTeacher.homeroomClass) && (
                <div className="alert alert-warning">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  <strong>No Assignments:</strong> This teacher has no current section or subject assignments.
                </div>
              )}

              {/* Additional Information */}
              <div className="card">
                <div className="card-header bg-light">
                  <h6 className="mb-0">
                    <i className="bi bi-info-circle me-2"></i>
                    Additional Information
                  </h6>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-4 text-center">
                      <div className="border-end">
                        <h4 className="text-primary mb-1">{selectedTeacher.assignedSections.length + selectedTeacher.assignedSubjects.length}</h4>
                        <small className="text-muted">Total Assignments</small>
                      </div>
                    </div>
                    <div className="col-md-4 text-center">
                      <div className="border-end">
                        <h4 className="text-success mb-1">{selectedTeacher.displayRoles.length}</h4>
                        <small className="text-muted">Active Roles</small>
                      </div>
                    </div>
                    <div className="col-md-4 text-center">
                      <h4 className={`${selectedTeacher.status === 'active' ? 'text-success' : 'text-danger'} mb-1`}>
                        {selectedTeacher.status === 'active' ? 'ACTIVE' : 'INACTIVE'}
                      </h4>
                      <small className="text-muted">Account Status</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <span className="badge bg-secondary me-auto">
                <i className="bi bi-eye me-1"></i>
                Read Only Access
              </span>
              <button type="button" className="btn btn-secondary" 
                      onClick={() => setShowDetailModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <h5>Loading Teachers Data...</h5>
          <p className="text-muted">Fetching teacher information and assignments</p>
        </div>
      </div>
    );
  }

  const filteredTeachers = getFilteredAndSortedTeachers();

  return (
    <div>
      {/* Stats Overview */}
      {renderStatsCards()}

      {/* Filters and Controls */}
      {renderFiltersAndControls()}

      {/* Main Content */}
      {viewMode === 'table' ? renderTableView(filteredTeachers) : renderCardView(filteredTeachers)}

      {/* Detail Modal */}
      {showDetailModal && renderDetailModal()}

      {/* Modal Backdrop */}
      {showDetailModal && (
        <div className="modal-backdrop fade show" 
             onClick={() => setShowDetailModal(false)}></div>
      )}

      {/* Summary Footer */}
      <div className="row mt-4">
        <div className="col-12">
          <div className="alert alert-info border-0 d-flex align-items-center">
            <i className="bi bi-info-circle fs-5 me-3"></i>
            <div>
              <strong>Supervisor View:</strong> You have read-only access to teacher information. 
              All data is automatically updated when teachers log in and system administrators make changes. 
              Contact administrators for account modifications, role changes, or assignment updates.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ViewTeachers;