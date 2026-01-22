import React from 'react';
import { Grid, TextField, FormControl, InputLabel, Select, MenuItem, Button, CircularProgress, InputAdornment, Autocomplete } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import { priorityFilter } from '../../utils/filterUtils';

const AuditFilters = ({
  filters,
  setFilters,
  handleDateChange,
  user,
  userFilter,
  handleUserFilterChange,
  userList,
  refreshing,
  fetchAuditTrail,
  fetchStats,
  colorPalette,
  handleResetFilters
}) => {
  // Helper: Check if any filter is applied (except page/limit)
  const isAnyFilterApplied = () => {
    const { action, username, field, fromDate, toDate, search } = filters;
    // For admin, only consider date filter if username is selected
    const hasUser = user.role === 'Admin' && username;
    const hasDate = hasUser && (fromDate || toDate);
    return Boolean(
      action || field || search || (user.role === 'Admin' ? (hasUser || hasDate) : (fromDate || toDate))
    );
  };

  // Modified reset handler: clear username for admin
  const onReset = () => {
    setFilters({
      page: 1,
      limit: 10,
      action: '',
      username: user.role === 'Admin' ? '' : user.username,
      field: '',
      fromDate: '',
      toDate: '',
      groupBy: 'day',
      search: ''
    });
    if (typeof handleResetFilters === 'function') handleResetFilters();
    // After reset, fetch stats for all users
    if (user.role === 'Admin') {
      fetchStats && fetchStats();
    }
  };

  // When filters change, if no filter is applied, fetch stats for all users (admin)
  React.useEffect(() => {
    // For admin: if no user is selected, ignore date filter and show stats for all time (all users)
    if (user.role === 'Admin' && (!filters.username || !isAnyFilterApplied())) {
      fetchStats && fetchStats();
    }
    // eslint-disable-next-line
  }, [filters]);

  return (
    <Grid container spacing={1} alignItems="center" sx={{ mb: 2 }}>
      <Grid item xs={12} sm={3} md={2}>
        <TextField
          fullWidth
          label="Search"
          value={filters.search}
          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: colorPalette.textSecondary, fontSize: 18 }} />
              </InputAdornment>
            )
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 1.5,
              backgroundColor: colorPalette.primary + '04',
              '&:hover': {
                backgroundColor: colorPalette.primary + '08'
              }
            }
          }}
        />
      </Grid>
      <Grid item xs={12} sm={2} md={2}>
        <FormControl fullWidth size="small">
          <InputLabel>Action Type</InputLabel>
          <Select
            value={filters.action}
            label="Action Type"
            onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value }))}
            sx={{
              borderRadius: 1.5,
              backgroundColor: colorPalette.primary + '04'
            }}
          >
            <MenuItem value="">All Actions</MenuItem>
            <MenuItem value="CREATE">Create</MenuItem>
            <MenuItem value="UPDATE">Update</MenuItem>
            <MenuItem value="DELETE">Delete</MenuItem>
            <MenuItem value="VIEW">View</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={2} md={2}>
        <TextField
          fullWidth
          label="From Date"
          type="date"
          value={filters.fromDate}
          onChange={(e) => handleDateChange('fromDate', e.target.value)}
          size="small"
          InputLabelProps={{ shrink: true }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 1.5,
              backgroundColor: colorPalette.primary + '04'
            }
          }}
        />
      </Grid>
      <Grid item xs={12} sm={2} md={2}>
        <TextField
          fullWidth
          label="To Date"
          type="date"
          value={filters.toDate}
          onChange={(e) => handleDateChange('toDate', e.target.value)}
          size="small"
          InputLabelProps={{ shrink: true }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 1.5,
              backgroundColor: colorPalette.primary + '04'
            }
          }}
        />
      </Grid>
      {user.role === 'Admin' && (
        <Grid item xs={12} sm={2} md={2}>
          <Autocomplete
            fullWidth
            freeSolo
            size="small"
            options={userList?.filter(u => u && u.label).map((user) => user.label) || []}
            value={userList?.find(u => u && u.value === userFilter)?.label || ""}
            filterOptions={(options, { inputValue }) =>
              priorityFilter(options, inputValue)
            }
            onInputChange={(event, newValue) => {
              if (newValue === null || newValue === undefined) {
                handleUserFilterChange({ target: { value: "" } });
                return;
              }
              // Find the user object that matches the label
              const selectedUser = userList?.find(u => u && u.label === newValue);
              const userValue = selectedUser ? selectedUser.value : newValue;
              handleUserFilterChange({ target: { value: userValue || "" } });
            }}
            onChange={(event, newValue) => {
              if (newValue === null || newValue === undefined) {
                handleUserFilterChange({ target: { value: "" } });
                return;
              }
              // Handle selection from dropdown
              const selectedUser = userList?.find(u => u && u.label === newValue);
              const userValue = selectedUser ? selectedUser.value : newValue;
              handleUserFilterChange({ target: { value: userValue || "" } });
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="User"
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1.5,
                    backgroundColor: colorPalette.primary + '04'
                  }
                }}
              />
            )}
            renderOption={(props, option) => (
              <li {...props} key={option || 'empty'}>
                {option || 'No label'}
              </li>
            )}
          />
        </Grid>
      )}
      <Grid item xs={12} sm={2} md={2}>
        <FormControl fullWidth size="small" disabled={!(filters.fromDate && filters.toDate)}>
          <InputLabel>Group By</InputLabel>
          <Select
            value={filters.groupBy || ''}
            label="Group By"
            onChange={e => setFilters(prev => ({ ...prev, groupBy: e.target.value }))}
            sx={{
              borderRadius: 1.5,
              backgroundColor: colorPalette.primary + '04'
            }}
          >
            <MenuItem value="hour">Hour</MenuItem>
            <MenuItem value="day">Day</MenuItem>
            <MenuItem value="week">Week</MenuItem>
            <MenuItem value="month">Month</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={6} sm={1} md={1}>
        <Button
          variant="outlined"
          startIcon={refreshing ? null : <RefreshIcon sx={{ fontSize: 16 }} />}
          onClick={() => {
            fetchAuditTrail();
            fetchStats();
          }}
          size="small"
          sx={{
            borderRadius: 1.5,
            textTransform: 'none',
            borderColor: colorPalette.primary,
            color: colorPalette.primary,
            minWidth: 80,
            height: 40,
            fontSize: '0.8rem',
            '&:hover': {
              borderColor: colorPalette.primary,
              backgroundColor: colorPalette.primary + '04'
            }
          }}
        >
          {refreshing ? <CircularProgress size={16} /> : 'Refresh'}
        </Button>
      </Grid>
      <Grid item xs={6} sm={1} md={1}>
        <Button
          onClick={onReset}
          variant="outlined"
          size="small"
          sx={{
            borderRadius: 1.5,
            textTransform: 'none',
            borderColor: colorPalette.primary,
            color: colorPalette.primary,
            minWidth: 70,
            height: 40,
            fontSize: '0.8rem',
            '&:hover': {
              borderColor: colorPalette.primary,
              backgroundColor: colorPalette.primary + '04'
            }
          }}
        >
          Reset
        </Button>
      </Grid>
    </Grid>
  );
};

export default AuditFilters;