// UsersView.js - Simplified Users Management Interface (Table Only)
import React, { useState, useMemo } from 'react';

const UsersView = ({
  users,
  subjects,
  onAddUser,
  onEditUser,
  onDeleteUser,
  onResetPassword,
  onViewUser,
  loading = false
}) => {
  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [userTypeFilter, setUserTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [selectedUsers, setSelectedUsers] = useState([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); // Fixed at 10 items per page

  // Filter and sort users
  const filteredAndSortedUsers = useMemo(() => {
    let filtered = users.filter(user => {
      // Search filter
      const searchMatch = searchTerm === '' || 
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase());

      // Role filter - more flexible checking
      const roleMatch = roleFilter === 'all' || 
        (user.roles && Array.isArray(user.roles) && user.roles.includes(roleFilter)) ||
        (user.roles && typeof user.roles === 'string' && user.roles === roleFilter);

      // Status filter
      const statusMatch = statusFilter === 'all' || 
        (statusFilter === 'active' && user.status !== 'inactive' && user.status !== 'suspended') ||
        (statusFilter === 'inactive' && user.status === 'inactive') ||
        (statusFilter === 'suspended' && user.status === 'suspended');

      // User type filter - check both userType and roles
      const userTypeMatch = userTypeFilter === 'all' || 
        user.userType === userTypeFilter ||
        (userTypeFilter === 'supervisor' && user.roles && user.roles.includes('supervisor')) ||
        (userTypeFilter === 'admin' && user.roles && user.roles.includes('admin'));

      return searchMatch && roleMatch && statusMatch && userTypeMatch;
    });

    // Sort users
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name?.toLowerCase() || '';
          bValue = b.name?.toLowerCase() || '';
          break;
        case 'email':
          aValue = a.email?.toLowerCase() || '';
          bValue = b.email?.toLowerCase() || '';
          break;
        case 'userType':
          aValue = a.userType || '';
          bValue = b.userType || '';
          break;
        case 'roles':
          aValue = a.roles?.length || 0;
          bValue = b.roles?.length || 0;
          break;
        case 'subjects':
          aValue = a.subjects?.length || 0;
          bValue = b.subjects?.length || 0;
          break;
        case 'lastLogin':
          aValue = a.lastLogin ? new Date(a.lastLogin) : new Date(0);
          bValue = b.lastLogin ? new Date(b.lastLogin) : new Date(0);
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
  }, [users, searchTerm, roleFilter, statusFilter, userTypeFilter, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedUsers.length / itemsPerPage);
  const paginatedUsers = filteredAndSortedUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Get unique values for filters
  const availableRoles = [...new Set(users.flatMap(u => u.roles || []))].sort();
  const userTypes = [...new Set(users.map(u => u.userType).filter(Boolean))].sort();

  // Selection handlers
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedUsers(paginatedUsers.map(u => u.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleSelectUser = (userId, checked) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  // Bulk actions
  const handleBulkDelete = () => {
    if (selectedUsers.length === 0) return;
    
    const confirmMessage = `Delete ${selectedUsers.length} selected users?\n\nThis action cannot be undone.`;
    if (window.confirm(confirmMessage)) {
      selectedUsers.forEach(userId => {
        const user = users.find(u => u.id === userId);
        if (user) {
          onDeleteUser(userId, user.name);
        }
      });
      setSelectedUsers([]);
    }
  };

  const handleBulkPasswordReset = () => {
    if (selectedUsers.length === 0) return;
    
    const confirmMessage = `Reset passwords for ${selectedUsers.length} selected users?\n\nAll passwords will be reset to: password123`;
    if (window.confirm(confirmMessage)) {
      selectedUsers.forEach(userId => {
        const user = users.find(u => u.id === userId);
        if (user) {
          onResetPassword(user);
        }
      });
      setSelectedUsers([]);
    }
  };

  // Helper functions
  const getRoleColor = (role) => {
    const colors = {
      admin: 'bg-danger',
      homeroom: 'bg-warning text-dark',
      subject: 'bg-primary',
      supervisor: 'bg-info',
      teacher: 'bg-success'
    };
    return colors[role] || 'bg-secondary';
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-success',
      inactive: 'bg-secondary',
      suspended: 'bg-danger'
    };
    return colors[status] || 'bg-success';
  };

  const getUserTypeColor = (userType) => {
    const colors = {
      teacher: 'bg-primary',
      admin: 'bg-danger',
      supervisor: 'bg-warning',
      staff: 'bg-info'
    };
    return colors[userType] || 'bg-secondary';
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
        <div className="spinner-border text-success mb-3"></div>
        <h5>Loading Users...</h5>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h5 className="mb-1">Users Management</h5>
          <small className="text-muted">
            {filteredAndSortedUsers.length} of {users.length} users
            {selectedUsers.length > 0 && ` • ${selectedUsers.length} selected`}
          </small>
        </div>
        <div className="d-flex gap-2">
          {selectedUsers.length > 0 && (
            <div className="btn-group">
              <button className="btn btn-outline-warning btn-sm" onClick={handleBulkPasswordReset}>
                <i className="bi bi-key me-1"></i>Reset Passwords ({selectedUsers.length})
              </button>
              <button className="btn btn-outline-danger btn-sm" onClick={handleBulkDelete}>
                <i className="bi bi-trash me-1"></i>Delete Selected ({selectedUsers.length})
              </button>
            </div>
          )}
          <button className="btn btn-success" onClick={onAddUser}>
            <i className="bi bi-plus-lg me-1"></i>Add User
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-3">
        <div className="card-body py-3">
          <div className="row g-3">
            <div className="col-md-3">
              <div className="input-group input-group-sm">
                <span className="input-group-text">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="col-md-3">
              <select
                className="form-select form-select-sm"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="all">All Roles</option>
                <option value="admin">Administrator</option>
                <option value="supervisor">Supervisor</option>
                <option value="homeroom">Homeroom Teacher</option>
                <option value="subject">Subject Teacher</option>
                {availableRoles.map(role => 
                  !['admin', 'supervisor', 'homeroom', 'subject'].includes(role) && (
                    <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>
                  )
                )}
              </select>
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
                <option value="suspended">Suspended</option>
              </select>
            </div>
            
            <div className="col-md-3">
              <select
                className="form-select form-select-sm"
                value={userTypeFilter}
                onChange={(e) => setUserTypeFilter(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="admin">Administrator</option>
                <option value="supervisor">Supervisor</option>
                <option value="teacher">Teacher</option>
                <option value="staff">Staff</option>
                {userTypes.map(type => 
                  !['admin', 'supervisor', 'teacher', 'staff'].includes(type) && (
                    <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                  )
                )}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {filteredAndSortedUsers.length === 0 ? (
        <div className="text-center py-5">
          <i className="bi bi-person-badge fs-1 text-muted mb-3"></i>
          <h5 className="text-muted">
            {users.length === 0 ? 'No Users Yet' : 'No Users Match Your Filters'}
          </h5>
          <p className="text-muted mb-3">
            {users.length === 0 
              ? 'Add your first user to get started with user management.'
              : 'Try adjusting your search terms or filters to find users.'
            }
          </p>
          {users.length === 0 && (
            <button className="btn btn-success" onClick={onAddUser}>
              <i className="bi bi-plus-lg me-1"></i>Add First User
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
                        checked={paginatedUsers.length > 0 && selectedUsers.length === paginatedUsers.length}
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
                      onClick={() => handleSort('email')}
                    >
                      Email {sortBy === 'email' && (
                        <i className={`bi bi-arrow-${sortOrder === 'asc' ? 'up' : 'down'} ms-1`}></i>
                      )}
                    </th>
                    <th>Type</th>
                    <th 
                      className="cursor-pointer user-select-none"
                      onClick={() => handleSort('roles')}
                    >
                      Roles {sortBy === 'roles' && (
                        <i className={`bi bi-arrow-${sortOrder === 'asc' ? 'up' : 'down'} ms-1`}></i>
                      )}
                    </th>
                    <th 
                      className="cursor-pointer user-select-none"
                      onClick={() => handleSort('subjects')}
                    >
                      Subjects {sortBy === 'subjects' && (
                        <i className={`bi bi-arrow-${sortOrder === 'asc' ? 'up' : 'down'} ms-1`}></i>
                      )}
                    </th>
                    <th>Status</th>
                    <th 
                      className="cursor-pointer user-select-none"
                      onClick={() => handleSort('lastLogin')}
                    >
                      Last Login {sortBy === 'lastLogin' && (
                        <i className={`bi bi-arrow-${sortOrder === 'asc' ? 'up' : 'down'} ms-1`}></i>
                      )}
                    </th>
                    <th style={{ width: '140px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.map(user => (
                    <tr key={user.id}>
                      <td>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={selectedUsers.includes(user.id)}
                          onChange={(e) => handleSelectUser(user.id, e.target.checked)}
                        />
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="me-2">
                            <div className={`${getUserTypeColor(user.userType)} text-white rounded-circle d-flex align-items-center justify-content-center`} 
                                 style={{ width: '32px', height: '32px', fontSize: '14px', fontWeight: 'bold' }}>
                              {user.name?.[0]?.toUpperCase() || '?'}
                            </div>
                          </div>
                          <div>
                            <div className="fw-medium">{user.name || 'Unknown'}</div>
                            {user.mustChangePassword && (
                              <small className="text-warning">
                                <i className="bi bi-exclamation-triangle me-1"></i>
                                Password reset required
                              </small>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="text-muted small">{user.email}</div>
                      </td>
                      <td>
                        <span className={`badge ${getUserTypeColor(user.userType)}`}>
                          {user.userType || 'Unknown'}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex flex-wrap gap-1">
                          {user.roles?.map(role => (
                            <span key={role} className={`badge ${getRoleColor(role)}`} style={{ fontSize: '0.7em' }}>
                              {role.toUpperCase()}
                            </span>
                          ))}
                          {!user.roles?.length && (
                            <small className="text-muted">No roles</small>
                          )}
                        </div>
                      </td>
                      <td>
                        {user.subjects?.length ? (
                          <div className="d-flex flex-wrap gap-1">
                            {user.subjects.slice(0, 2).map(subjectName => {
                              const subject = subjects.find(s => s.name === subjectName);
                              return (
                                <span key={subjectName} className="badge" style={{ 
                                  backgroundColor: subject?.color || '#6c757d',
                                  color: 'white',
                                  fontSize: '0.7em'
                                }}>
                                  {subject?.code || subjectName.substring(0, 4)}
                                </span>
                              );
                            })}
                            {user.subjects.length > 2 && (
                              <span className="badge bg-secondary" style={{ fontSize: '0.7em' }}>
                                +{user.subjects.length - 2}
                              </span>
                            )}
                          </div>
                        ) : (
                          <small className="text-muted">None</small>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${getStatusColor(user.status)}`}>
                          {user.status || 'Active'}
                        </span>
                      </td>
                      <td>
                        <small className="text-muted">
                          {user.lastLogin 
                            ? new Date(user.lastLogin).toLocaleDateString()
                            : 'Never'
                          }
                        </small>
                      </td>
                      <td>
                        <div className="btn-group" role="group">
                          <button
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => onEditUser(user)}
                            title="Edit User"
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            className="btn btn-outline-warning btn-sm"
                            onClick={() => onResetPassword(user)}
                            title="Reset Password"
                          >
                            <i className="bi bi-key"></i>
                          </button>
                          {onViewUser && (
                            <button
                              className="btn btn-outline-info btn-sm"
                              onClick={() => onViewUser(user)}
                              title="View Details"
                            >
                              <i className="bi bi-eye"></i>
                            </button>
                          )}
                          <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => onDeleteUser(user.id, user.name)}
                            title="Delete User"
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
                  {Math.min(currentPage * itemsPerPage, filteredAndSortedUsers.length)} of{' '}
                  {filteredAndSortedUsers.length} users
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

export default UsersView;