// SectionView.js - UPDATED FOR NEW SCHEMA (removed name, sectionName; gradeLevel → year)
import React, { useState, useMemo } from 'react';

const SectionView = ({
  sections,
  students,
  onAddSection,
  onEditSection,
  onDeleteSection,
  onViewSection,
  onManageStudents,
  loading = false
}) => {
  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('identifier'); // UPDATED: Default sort by identifier
  const [sortOrder, setSortOrder] = useState('asc');
  const [selectedSections, setSelectedSections] = useState([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // UPDATED: Helper function to generate section identifier
  const getSectionIdentifier = (section) => {
    const year = section.year || section.gradeLevel || 'N/A';
    const sectionLetter = section.section || 'X';
    return `${year}-${sectionLetter}`;
  };

  // UPDATED: Helper function to get display name for search and display
  const getSectionDisplayName = (section) => {
    return getSectionIdentifier(section);
  };

  // Filter and sort sections
  const filteredAndSortedSections = useMemo(() => {
    let filtered = sections.filter(section => {
      // UPDATED: Search filter using identifier instead of name/sectionName
      const identifier = getSectionIdentifier(section);
      const searchMatch = searchTerm === '' || 
        identifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        section.room?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        section.teacher?.toLowerCase().includes(searchTerm.toLowerCase());

      // UPDATED: Grade filter using year instead of gradeLevel
      const gradeMatch = gradeFilter === 'all' || 
        section.year?.toString() === gradeFilter ||
        section.gradeLevel?.toString() === gradeFilter; // Fallback for old data

      // Status filter (unchanged)
      const statusMatch = statusFilter === 'all' || 
        (statusFilter === 'active' && section.status !== 'inactive') ||
        (statusFilter === 'inactive' && section.status === 'inactive');

      return searchMatch && gradeMatch && statusMatch;
    });

    // UPDATED: Sort sections
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'identifier':
          aValue = getSectionIdentifier(a).toLowerCase();
          bValue = getSectionIdentifier(b).toLowerCase();
          break;
        case 'year':
          aValue = a.year || a.gradeLevel || 0;
          bValue = b.year || b.gradeLevel || 0;
          break;
        case 'section':
          aValue = (a.section || '').toLowerCase();
          bValue = (b.section || '').toLowerCase();
          break;
        case 'capacity':
          aValue = a.capacity || 0;
          bValue = b.capacity || 0;
          break;
        case 'enrollment':
          aValue = a.currentEnrollment || 0;
          bValue = b.currentEnrollment || 0;
          break;
        case 'room':
          aValue = a.room?.toLowerCase() || '';
          bValue = b.room?.toLowerCase() || '';
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
  }, [sections, searchTerm, gradeFilter, statusFilter, sortBy, sortOrder]);

  // UPDATED: Get unique year levels from sections
  const availableYears = [...new Set(sections.map(s => s.year || s.gradeLevel).filter(Boolean))].sort();

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedSections.length / itemsPerPage);
  const paginatedSections = filteredAndSortedSections.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Selection handlers
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedSections(paginatedSections.map(s => s.id));
    } else {
      setSelectedSections([]);
    }
  };

  const handleSelectSection = (sectionId, checked) => {
    if (checked) {
      setSelectedSections(prev => [...prev, sectionId]);
    } else {
      setSelectedSections(prev => prev.filter(id => id !== sectionId));
    }
  };

  // Bulk actions
  const handleBulkDelete = () => {
    if (selectedSections.length === 0) return;
    
    const confirmMessage = `Delete ${selectedSections.length} selected sections?\n\nThis action cannot be undone and students will need to be reassigned.`;
    if (window.confirm(confirmMessage)) {
      selectedSections.forEach(sectionId => {
        const section = sections.find(s => s.id === sectionId);
        if (section) {
          const identifier = getSectionIdentifier(section);
          onDeleteSection(sectionId, identifier);
        }
      });
      setSelectedSections([]);
    }
  };

  const handleBulkStatusToggle = (newStatus) => {
    if (selectedSections.length === 0) return;
    
    const action = newStatus === 'active' ? 'activate' : 'deactivate';
    const confirmMessage = `${action.charAt(0).toUpperCase() + action.slice(1)} ${selectedSections.length} selected sections?`;
    
    if (window.confirm(confirmMessage)) {
      selectedSections.forEach(sectionId => {
        const section = sections.find(s => s.id === sectionId);
        if (section) {
          // Assuming you have an onUpdateSectionStatus function
          // onUpdateSectionStatus(sectionId, newStatus);
        }
      });
      setSelectedSections([]);
    }
  };

  // UPDATED: Get enrollment percentage
  const getEnrollmentPercentage = (section) => {
    if (!section.capacity) return 0;
    return Math.round(((section.currentEnrollment || 0) / section.capacity) * 100);
  };

  // UPDATED: Get enrollment status class
  const getEnrollmentStatusClass = (percentage) => {
    if (percentage >= 90) return 'text-danger';
    if (percentage >= 75) return 'text-warning';
    return 'text-success';
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (column) => {
    if (sortBy !== column) return 'bi-chevron-expand';
    return sortOrder === 'asc' ? 'bi-chevron-up' : 'bi-chevron-down';
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading sections...</span>
        </div>
        <p className="mt-2 text-muted">Loading sections...</p>
      </div>
    );
  }

  return (
    <div className="sections-management">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-1">
            <i className="bi bi-building me-2"></i>
            Sections Management
          </h4>
          <p className="text-muted mb-0">
            Manage class sections, enrollment, and teacher assignments
          </p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={onAddSection}
        >
          <i className="bi bi-plus-circle me-2"></i>
          Add Section
        </button>
      </div>

      {/* Filters and Search */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            {/* Search */}
            <div className="col-md-4">
              <label className="form-label">Search Sections</label>
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by identifier (e.g., 7-A)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* UPDATED: Year Filter */}
            <div className="col-md-3">
              <label className="form-label">Year Level</label>
              <select
                className="form-select"
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
              >
                <option value="all">All Years</option>
                {availableYears.map(year => (
                  <option key={year} value={year}>Year {year}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="col-md-3">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* UPDATED: Sort Options */}
            <div className="col-md-2">
              <label className="form-label">Sort By</label>
              <select
                className="form-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="identifier">Identifier</option>
                <option value="year">Year Level</option>
                <option value="section">Section</option>
                <option value="capacity">Capacity</option>
                <option value="enrollment">Enrollment</option>
              </select>
            </div>
          </div>

          {/* Results Summary */}
          <div className="mt-3 pt-3 border-top">
            <div className="row">
              <div className="col-md-6">
                <small className="text-muted">
                  Showing {paginatedSections.length} of {filteredAndSortedSections.length} sections
                  {searchTerm && ` matching "${searchTerm}"`}
                </small>
              </div>
              <div className="col-md-6 text-end">
                {selectedSections.length > 0 && (
                  <div className="btn-group">
                    <button 
                      className="btn btn-sm btn-outline-danger"
                      onClick={handleBulkDelete}
                    >
                      <i className="bi bi-trash me-1"></i>
                      Delete ({selectedSections.length})
                    </button>
                    <button 
                      className="btn btn-sm btn-outline-success"
                      onClick={() => handleBulkStatusToggle('active')}
                    >
                      <i className="bi bi-check-circle me-1"></i>
                      Activate
                    </button>
                    <button 
                      className="btn btn-sm btn-outline-warning"
                      onClick={() => handleBulkStatusToggle('inactive')}
                    >
                      <i className="bi bi-x-circle me-1"></i>
                      Deactivate
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sections Table */}
      <div className="card">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: '50px' }}>
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={selectedSections.length === paginatedSections.length && paginatedSections.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </th>
                  <th 
                    className="sortable-header"
                    onClick={() => handleSort('identifier')}
                    style={{ cursor: 'pointer' }}
                  >
                    Section Identifier
                    <i className={`bi ${getSortIcon('identifier')} ms-1`}></i>
                  </th>
                  <th 
                    className="sortable-header"
                    onClick={() => handleSort('year')}
                    style={{ cursor: 'pointer' }}
                  >
                    Year Level
                    <i className={`bi ${getSortIcon('year')} ms-1`}></i>
                  </th>
                  <th 
                    className="sortable-header"
                    onClick={() => handleSort('capacity')}
                    style={{ cursor: 'pointer' }}
                  >
                    Capacity
                    <i className={`bi ${getSortIcon('capacity')} ms-1`}></i>
                  </th>
                  <th 
                    className="sortable-header"
                    onClick={() => handleSort('enrollment')}
                    style={{ cursor: 'pointer' }}
                  >
                    Enrollment
                    <i className={`bi ${getSortIcon('enrollment')} ms-1`}></i>
                  </th>
                  <th>Status</th>
                  <th>Teachers</th>
                  <th style={{ width: '150px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSections.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-4">
                      <div className="text-muted">
                        <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                        {searchTerm || gradeFilter !== 'all' || statusFilter !== 'all' 
                          ? 'No sections match your filters' 
                          : 'No sections created yet'
                        }
                      </div>
                      {!searchTerm && gradeFilter === 'all' && statusFilter === 'all' && (
                        <button 
                          className="btn btn-primary mt-2"
                          onClick={onAddSection}
                        >
                          <i className="bi bi-plus-circle me-2"></i>
                          Create First Section
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  paginatedSections.map(section => {
                    const identifier = getSectionIdentifier(section);
                    const enrollmentPercentage = getEnrollmentPercentage(section);
                    const enrollmentClass = getEnrollmentStatusClass(enrollmentPercentage);
                    
                    return (
                      <tr key={section.id}>
                        <td>
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={selectedSections.includes(section.id)}
                            onChange={(e) => handleSelectSection(section.id, e.target.checked)}
                          />
                        </td>
                        <td>
                          <div className="fw-semibold">{identifier}</div>
                          <small className="text-muted">
                            Year {section.year || section.gradeLevel} - Section {section.section}
                          </small>
                        </td>
                        <td>
                          <span className="badge bg-primary">
                            Year {section.year || section.gradeLevel}
                          </span>
                        </td>
                        <td>
                          <span className="fw-semibold">{section.capacity || 0}</span>
                          <small className="text-muted"> students</small>
                        </td>
                        <td>
                          <div className={`fw-semibold ${enrollmentClass}`}>
                            {section.currentEnrollment || 0} / {section.capacity || 0}
                          </div>
                          <div className="progress mt-1" style={{ height: '4px' }}>
                            <div 
                              className={`progress-bar ${
                                enrollmentPercentage >= 90 ? 'bg-danger' :
                                enrollmentPercentage >= 75 ? 'bg-warning' : 'bg-success'
                              }`}
                              style={{ width: `${enrollmentPercentage}%` }}
                            ></div>
                          </div>
                          <small className="text-muted">{enrollmentPercentage}% full</small>
                        </td>
                        <td>
                          <span className={`badge ${
                            section.status === 'active' ? 'bg-success' : 'bg-secondary'
                          }`}>
                            {section.status || 'active'}
                          </span>
                        </td>
                        <td>
                          <div className="d-flex flex-column gap-1">
                            {section.homeroomTeacherId && (
                              <small className="text-primary">
                                <i className="bi bi-house-door me-1"></i>
                                Homeroom assigned
                              </small>
                            )}
                            {section.subjectTeachers && section.subjectTeachers.length > 0 && (
                              <small className="text-info">
                                <i className="bi bi-person-badge me-1"></i>
                                {section.subjectTeachers.length} subject teacher{section.subjectTeachers.length !== 1 ? 's' : ''}
                              </small>
                            )}
                            {!section.homeroomTeacherId && (!section.subjectTeachers || section.subjectTeachers.length === 0) && (
                              <small className="text-muted">
                                <i className="bi bi-person-x me-1"></i>
                                No teachers assigned
                              </small>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="btn-group" role="group">
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => onViewSection(section)}
                              title="View Details"
                            >
                              <i className="bi bi-eye"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-outline-warning"
                              onClick={() => onEditSection(section)}
                              title="Edit Section"
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-outline-info"
                              onClick={() => onManageStudents(section)}
                              title="Manage Students"
                            >
                              <i className="bi bi-people"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => {
                                const confirmMessage = `Delete section ${identifier}?\n\nThis will remove the section and unassign all students. This action cannot be undone.`;
                                if (window.confirm(confirmMessage)) {
                                  onDeleteSection(section.id, identifier);
                                }
                              }}
                              title="Delete Section"
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="card-footer">
            <div className="d-flex justify-content-between align-items-center">
              <div className="text-muted">
                Page {currentPage} of {totalPages}
              </div>
              <nav>
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <button 
                      className="page-link"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    >
                      First
                    </button>
                  </li>
                  <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <button 
                      className="page-link"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </button>
                  </li>
                  
                  {/* Page numbers */}
                  {[...Array(Math.min(5, totalPages))].map((_, index) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = index + 1;
                    } else if (currentPage <= 3) {
                      pageNum = index + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + index;
                    } else {
                      pageNum = currentPage - 2 + index;
                    }
                    
                    return (
                      <li key={pageNum} className={`page-item ${currentPage === pageNum ? 'active' : ''}`}>
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
                  <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                    <button 
                      className="page-link"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      Last
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="row mt-4">
        <div className="col-md-3">
          <div className="card text-center">
            <div className="card-body">
              <i className="bi bi-building fs-1 text-primary mb-2"></i>
              <h5 className="card-title">{sections.length}</h5>
              <p className="card-text text-muted">Total Sections</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-center">
            <div className="card-body">
              <i className="bi bi-check-circle fs-1 text-success mb-2"></i>
              <h5 className="card-title">{sections.filter(s => s.status !== 'inactive').length}</h5>
              <p className="card-text text-muted">Active Sections</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-center">
            <div className="card-body">
              <i className="bi bi-people fs-1 text-info mb-2"></i>
              <h5 className="card-title">{sections.reduce((total, s) => total + (s.currentEnrollment || 0), 0)}</h5>
              <p className="card-text text-muted">Total Students</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-center">
            <div className="card-body">
              <i className="bi bi-graph-up fs-1 text-warning mb-2"></i>
              <h5 className="card-title">
                {sections.length > 0 
                  ? Math.round(sections.reduce((total, s) => total + getEnrollmentPercentage(s), 0) / sections.length)
                  : 0
                }%
              </h5>
              <p className="card-text text-muted">Avg. Enrollment</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SectionView;