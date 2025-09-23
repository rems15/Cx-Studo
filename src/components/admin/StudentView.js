// StudentsView.js - Simplified Students Management Interface (Table Only)
import React, { useState, useMemo } from 'react';

const StudentView = ({
  students,
  sections,
  subjects,
  onAddStudent,
  onEditStudent,
  onDeleteStudent,
  onViewStudent,
  loading = false
}) => {
  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [selectedStudents, setSelectedStudents] = useState([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Filter and sort students
  const filteredAndSortedStudents = useMemo(() => {
    let filtered = students.filter(student => {
      // Search filter
      const searchMatch = searchTerm === '' || 
        `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.studentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email?.toLowerCase().includes(searchTerm.toLowerCase());

      // Grade filter
      const gradeMatch = gradeFilter === 'all' || student.year?.toString() === gradeFilter;

      // Section filter
      const sectionMatch = sectionFilter === 'all' || student.section === sectionFilter;

      // Status filter
      const statusMatch = statusFilter === 'all' || 
        (statusFilter === 'active' && student.status !== 'inactive') ||
        (statusFilter === 'inactive' && student.status === 'inactive');

      return searchMatch && gradeMatch && sectionMatch && statusMatch;
    });

    // Sort students
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
          bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;
        case 'studentId':
          aValue = a.studentId || '';
          bValue = b.studentId || '';
          break;
        case 'grade':
          aValue = a.year || 0;
          bValue = b.year || 0;
          break;
        case 'section':
          aValue = `${a.year}-${a.section}`.toLowerCase();
          bValue = `${b.year}-${b.section}`.toLowerCase();
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
  }, [students, searchTerm, gradeFilter, sectionFilter, statusFilter, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedStudents.length / itemsPerPage);
  const paginatedStudents = filteredAndSortedStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Get unique values for filters
  const grades = [...new Set(students.map(s => s.year).filter(Boolean))].sort();
  const sectionsForFilter = [...new Set(students.map(s => s.section).filter(Boolean))].sort();

  // Selection handlers
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedStudents(paginatedStudents.map(s => s.id));
    } else {
      setSelectedStudents([]);
    }
  };

  const handleSelectStudent = (studentId, checked) => {
    if (checked) {
      setSelectedStudents(prev => [...prev, studentId]);
    } else {
      setSelectedStudents(prev => prev.filter(id => id !== studentId));
    }
  };

  // Bulk actions
  const handleBulkDelete = () => {
    if (selectedStudents.length === 0) return;
    
    const confirmMessage = `Delete ${selectedStudents.length} selected students?\n\nThis action cannot be undone.`;
    if (window.confirm(confirmMessage)) {
      selectedStudents.forEach(studentId => {
        const student = students.find(s => s.id === studentId);
        if (student) {
          onDeleteStudent(studentId, `${student.firstName} ${student.lastName}`);
        }
      });
      setSelectedStudents([]);
    }
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
        <div className="spinner-border text-primary mb-3"></div>
        <h5>Loading Students...</h5>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h5 className="mb-1">Students Management</h5>
          <small className="text-muted">
            {filteredAndSortedStudents.length} of {students.length} students
            {selectedStudents.length > 0 && ` • ${selectedStudents.length} selected`}
          </small>
        </div>
        <div className="d-flex gap-2">
          {selectedStudents.length > 0 && (
            <button className="btn btn-outline-danger btn-sm" onClick={handleBulkDelete}>
              <i className="bi bi-trash me-1"></i>Delete Selected ({selectedStudents.length})
            </button>
          )}
          <button className="btn btn-primary" onClick={onAddStudent}>
            <i className="bi bi-plus-lg me-1"></i>Add Student
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-3">
        <div className="card-body py-3">
          <div className="row g-3">
            <div className="col-md-4">
              <div className="input-group input-group-sm">
                <span className="input-group-text">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="col-md-2">
              <select
                className="form-select form-select-sm"
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
              >
                <option value="all">All Grades</option>
                {grades.map(grade => (
                  <option key={grade} value={grade}>Year {grade}</option>
                ))}
              </select>
            </div>
            
            <div className="col-md-2">
              <select
                className="form-select form-select-sm"
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
              >
                <option value="all">All Sections</option>
                {sectionsForFilter.map(section => (
                  <option key={section} value={section}>Section {section}</option>
                ))}
              </select>
            </div>
            
            <div className="col-md-2">
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
            
            <div className="col-md-2">
              <select
                className="form-select form-select-sm"
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {filteredAndSortedStudents.length === 0 ? (
        <div className="text-center py-5">
          <i className="bi bi-people fs-1 text-muted mb-3"></i>
          <h5 className="text-muted">
            {students.length === 0 ? 'No Students Yet' : 'No Students Match Your Filters'}
          </h5>
          <p className="text-muted mb-3">
            {students.length === 0 
              ? 'Add your first student to get started with student management.'
              : 'Try adjusting your search terms or filters to find students.'
            }
          </p>
          {students.length === 0 && (
            <button className="btn btn-primary" onClick={onAddStudent}>
              <i className="bi bi-plus-lg me-1"></i>Add First Student
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
                        checked={paginatedStudents.length > 0 && selectedStudents.length === paginatedStudents.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    </th>
                    <th 
                      className="cursor-pointer user-select-none"
                      onClick={() => handleSort('name')}
                    >
                      Name {sortBy === 'name' && (
                        <i className={`bi bi-arrow-${sortOrder === 'asc' ? 'up' : 'down'} ms-1`}></i>
                      )}
                    </th>
                    <th 
                      className="cursor-pointer user-select-none"
                      onClick={() => handleSort('studentId')}
                    >
                      Student ID {sortBy === 'studentId' && (
                        <i className={`bi bi-arrow-${sortOrder === 'asc' ? 'up' : 'down'} ms-1`}></i>
                      )}
                    </th>
                    <th 
                      className="cursor-pointer user-select-none"
                      onClick={() => handleSort('section')}
                    >
                      Section {sortBy === 'section' && (
                        <i className={`bi bi-arrow-${sortOrder === 'asc' ? 'up' : 'down'} ms-1`}></i>
                      )}
                    </th>
                    <th>Subjects</th>
                    <th>Status</th>
                    <th style={{ width: '120px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedStudents.map(student => (
                    <tr key={student.id}>
                      <td>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={selectedStudents.includes(student.id)}
                          onChange={(e) => handleSelectStudent(student.id, e.target.checked)}
                        />
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="me-2">
                            <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" 
                                 style={{ width: '32px', height: '32px', fontSize: '14px', fontWeight: 'bold' }}>
                              {student.firstName?.[0]}{student.lastName?.[0]}
                            </div>
                          </div>
                          <div>
                            <div className="fw-medium">{student.firstName} {student.lastName}</div>
                            {student.email && (
                              <small className="text-muted">{student.email}</small>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <code className="bg-light px-2 py-1 rounded">{student.studentId}</code>
                      </td>
                      <td>
                        <span className="badge bg-info text-dark">
                          Year {student.year}-{student.section}
                        </span>
                      </td>
                      <td>
                        {student.selectedSubjects?.length ? (
                          <div className="d-flex flex-wrap gap-1">
                            {student.selectedSubjects.slice(0, 2).map(subjectId => {
                              const subject = subjects.find(s => s.id === subjectId);
                              return (
                                <span key={subjectId} className="badge" style={{ 
                                  backgroundColor: subject?.color || '#6c757d',
                                  color: 'white',
                                  fontSize: '0.7em'
                                }}>
                                  {subject?.code || 'N/A'}
                                </span>
                              );
                            })}
                            {student.selectedSubjects.length > 2 && (
                              <span className="badge bg-secondary" style={{ fontSize: '0.7em' }}>
                                +{student.selectedSubjects.length - 2}
                              </span>
                            )}
                          </div>
                        ) : (
                          <small className="text-muted">None</small>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${
                          student.status === 'inactive' ? 'bg-secondary' : 'bg-success'
                        }`}>
                          {student.status === 'inactive' ? 'Inactive' : 'Active'}
                        </span>
                      </td>
                      <td>
                        <div className="btn-group" role="group">
                          <button
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => onEditStudent(student)}
                            title="Edit Student"
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          {onViewStudent && (
                            <button
                              className="btn btn-outline-info btn-sm"
                              onClick={() => onViewStudent(student)}
                              title="View Details"
                            >
                              <i className="bi bi-eye"></i>
                            </button>
                          )}
                          <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => onDeleteStudent(student.id, `${student.firstName} ${student.lastName}`)}
                            title="Delete Student"
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
                  {Math.min(currentPage * itemsPerPage, filteredAndSortedStudents.length)} of{' '}
                  {filteredAndSortedStudents.length} students
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
                </ul>
              </nav>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StudentView;