// SubjectsView.js - Simplified Subjects Management Interface (Table Only)
import React, { useState, useMemo } from 'react';

const SubjectsView = ({
  subjects,
  onAddSubject,
  onEditSubject,
  onDeleteSubject,
  onViewSubject,
  loading = false
}) => {
  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [selectedSubjects, setSelectedSubjects] = useState([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); // Fixed at 10 items per page

  // Filter and sort subjects
  const filteredAndSortedSubjects = useMemo(() => {
    let filtered = subjects.filter(subject => {
      // Search filter
      const searchMatch = searchTerm === '' || 
        subject.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        subject.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        subject.room?.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      const statusMatch = statusFilter === 'all' || 
        (statusFilter === 'active' && subject.active !== false) ||
        (statusFilter === 'inactive' && subject.active === false);

      return searchMatch && statusMatch;
    });

    // Sort subjects
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name?.toLowerCase() || '';
          bValue = b.name?.toLowerCase() || '';
          break;
        case 'code':
          aValue = a.code?.toLowerCase() || '';
          bValue = b.code?.toLowerCase() || '';
          break;
        case 'room':
          aValue = a.room?.toLowerCase() || '';
          bValue = b.room?.toLowerCase() || '';
          break;
        case 'teachers':
          aValue = a.assignedTeachers?.length || 0;
          bValue = b.assignedTeachers?.length || 0;
          break;
        default:
          aValue = a[sortBy] || '';
          bValue = b[sortBy] || '';
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [subjects, searchTerm, statusFilter, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedSubjects.length / itemsPerPage);
  const paginatedSubjects = filteredAndSortedSubjects.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Selection handlers
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedSubjects(paginatedSubjects.map(s => s.id));
    } else {
      setSelectedSubjects([]);
    }
  };

  const handleSelectSubject = (subjectId, checked) => {
    if (checked) {
      setSelectedSubjects(prev => [...prev, subjectId]);
    } else {
      setSelectedSubjects(prev => prev.filter(id => id !== subjectId));
    }
  };

  // Bulk actions
  const handleBulkDelete = () => {
    if (selectedSubjects.length === 0) return;
    
    const confirmMessage = `Delete ${selectedSubjects.length} selected subjects?\n\nThis action cannot be undone.`;
    if (window.confirm(confirmMessage)) {
      selectedSubjects.forEach(subjectId => {
        const subject = subjects.find(s => s.id === subjectId);
        if (subject) {
          onDeleteSubject(subjectId, subject.name);
        }
      });
      setSelectedSubjects([]);
    }
  };

  const handleBulkStatusToggle = (newStatus) => {
    if (selectedSubjects.length === 0) return;
    
    const action = newStatus ? 'activate' : 'deactivate';
    const confirmMessage = `${action.charAt(0).toUpperCase() + action.slice(1)} ${selectedSubjects.length} selected subjects?`;
    
    if (window.confirm(confirmMessage)) {
      selectedSubjects.forEach(subjectId => {
        const subject = subjects.find(s => s.id === subjectId);
        if (subject) {
          // You'll need to add this function to handle status toggle
          // onToggleSubjectStatus(subjectId, newStatus);
        }
      });
      setSelectedSubjects([]);
    }
  };

  // Helper functions
  const getStatusColor = (active) => {
    return active !== false ? 'bg-success' : 'bg-secondary';
  };

  const getStatusText = (active) => {
    return active !== false ? 'Active' : 'Inactive';
  };

  // Add sort helper function
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-warning mb-3"></div>
        <h5>Loading Subjects...</h5>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h5 className="mb-1">Subjects Management</h5>
          <small className="text-muted">
            {filteredAndSortedSubjects.length} of {subjects.length} subjects
            {selectedSubjects.length > 0 && ` • ${selectedSubjects.length} selected`}
          </small>
        </div>
        <div className="d-flex gap-2">
          {selectedSubjects.length > 0 && (
            <div className="btn-group">
              <button className="btn btn-outline-success btn-sm" onClick={() => handleBulkStatusToggle(true)}>
                <i className="bi bi-check-circle me-1"></i>Activate ({selectedSubjects.length})
              </button>
              <button className="btn btn-outline-secondary btn-sm" onClick={() => handleBulkStatusToggle(false)}>
                <i className="bi bi-x-circle me-1"></i>Deactivate ({selectedSubjects.length})
              </button>
              <button className="btn btn-outline-danger btn-sm" onClick={handleBulkDelete}>
                <i className="bi bi-trash me-1"></i>Delete Selected ({selectedSubjects.length})
              </button>
            </div>
          )}
          <button className="btn btn-warning" onClick={onAddSubject}>
            <i className="bi bi-plus-lg me-1"></i>Add Subject
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-3">
        <div className="card-body py-3">
          <div className="row g-3">
            <div className="col-md-6">
              <div className="input-group input-group-sm">
                <span className="input-group-text">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search subjects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="col-md-3">
              <select
                className="form-select form-select-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            
            <div className="col-md-3">
              <select
                className="form-select form-select-sm"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="name">Sort by Name</option>
                <option value="code">Sort by Code</option>
                <option value="room">Sort by Room</option>
                <option value="teachers">Sort by Teachers</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {filteredAndSortedSubjects.length === 0 ? (
        <div className="text-center py-5">
          <i className="bi bi-book fs-1 text-muted mb-3"></i>
          <h5 className="text-muted">
            {subjects.length === 0 ? 'No Subjects Yet' : 'No Subjects Match Your Filters'}
          </h5>
          <p className="text-muted mb-3">
            {subjects.length === 0 
              ? 'Add your first subject to get started with subject management.'
              : 'Try adjusting your search terms or filters to find subjects.'
            }
          </p>
          {subjects.length === 0 && (
            <button className="btn btn-warning" onClick={onAddSubject}>
              <i className="bi bi-plus-lg me-1"></i>Add First Subject
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Table View */}
          <div className="card">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light sticky-top">
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={paginatedSubjects.length > 0 && selectedSubjects.length === paginatedSubjects.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    </th>
                    <th 
                      className="cursor-pointer user-select-none"
                      onClick={() => handleSort('name')}
                    >
                      Subject {sortBy === 'name' && (
                        <i className={`bi bi-arrow-${sortOrder === 'asc' ? 'up' : 'down'} ms-1`}></i>
                      )}
                    </th>
                    <th 
                      className="cursor-pointer user-select-none"
                      onClick={() => handleSort('code')}
                    >
                      Code {sortBy === 'code' && (
                        <i className={`bi bi-arrow-${sortOrder === 'asc' ? 'up' : 'down'} ms-1`}></i>
                      )}
                    </th>
                    <th 
                      className="cursor-pointer user-select-none"
                      onClick={() => handleSort('room')}
                    >
                      Room {sortBy === 'room' && (
                        <i className={`bi bi-arrow-${sortOrder === 'asc' ? 'up' : 'down'} ms-1`}></i>
                      )}
                    </th>
                    <th 
                      className="cursor-pointer user-select-none"
                      onClick={() => handleSort('teachers')}
                    >
                      Teachers {sortBy === 'teachers' && (
                        <i className={`bi bi-arrow-${sortOrder === 'asc' ? 'up' : 'down'} ms-1`}></i>
                      )}
                    </th>
                    <th>Status</th>
                    <th style={{ width: '120px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSubjects.map(subject => (
                    <tr key={subject.id}>
                      <td>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={selectedSubjects.includes(subject.id)}
                          onChange={(e) => handleSelectSubject(subject.id, e.target.checked)}
                        />
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="me-2">
                            <div 
                              className="rounded d-flex align-items-center justify-content-center text-white fw-bold"
                              style={{ 
                                width: '32px', 
                                height: '32px', 
                                fontSize: '12px',
                                backgroundColor: subject.color || '#6c757d'
                              }}
                            >
                              {subject.code?.substring(0, 2) || subject.name?.substring(0, 2) || '??'}
                            </div>
                          </div>
                          <div>
                            <div className="fw-medium">{subject.name || 'Unknown Subject'}</div>
                            {subject.description && (
                              <small className="text-muted">{subject.description}</small>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge bg-primary" style={{ fontSize: '0.8em' }}>
                          {subject.code || 'N/A'}
                        </span>
                      </td>
                      <td>
                        <small className="text-muted">{subject.room || 'Not assigned'}</small>
                      </td>
                      <td>
                        <span className="badge bg-info" style={{ fontSize: '0.8em' }}>
                          {subject.assignedTeachers?.length || 0} teachers
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${getStatusColor(subject.active)}`} style={{ fontSize: '0.8em' }}>
                          {getStatusText(subject.active)}
                        </span>
                      </td>
                      <td>
                        <div className="btn-group" role="group">
                          <button
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => onEditSubject(subject)}
                            title="Edit Subject"
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          {onViewSubject && (
                            <button
                              className="btn btn-outline-info btn-sm"
                              onClick={() => onViewSubject(subject)}
                              title="View Details"
                            >
                              <i className="bi bi-eye"></i>
                            </button>
                          )}
                          <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => onDeleteSubject(subject.id, subject.name)}
                            title="Delete Subject"
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <div>
                <small className="text-muted">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                  {Math.min(currentPage * itemsPerPage, filteredAndSortedSubjects.length)} of{' '}
                  {filteredAndSortedSubjects.length} subjects
                </small>
              </div>
              
              <nav>
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <button 
                      className="page-link"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </button>
                  </li>
                  
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    const pageNum = Math.max(1, Math.min(currentPage - 2 + i, totalPages - 4 + i));
                    return (
                      <li key={`page-${pageNum}-${i}`} className={`page-item ${currentPage === pageNum ? 'active' : ''}`}>
                        <button 
                          className="page-link"
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </button>
                      </li>
                    );
                  })}
                  
                  <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                    <button 
                      className="page-link"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SubjectsView;