import React from 'react';
import { Fade, Card, Box, Typography, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Chip, IconButton, Tooltip, LinearProgress } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RefreshIcon from '@mui/icons-material/Refresh';
import { format } from 'date-fns';

const AuditTable = ({ auditData, loading, colorPalette, actionColors, expandedRow, toggleRowExpand, renderUserAvatar, renderChanges, fetchAuditTrail, fetchStats, job_no }) => (
  <Fade in={true}>
    <Card sx={{
      borderRadius: 2,
      background: 'white',
      border: `1px solid ${colorPalette.accent}`,
      overflow: 'hidden',
      boxShadow: '0 4px 12px rgba(25, 118, 210, 0.1)'
    }}>
      <Box sx={{
        p: 2,
        background: colorPalette.gradient,
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Typography variant="h6">Audit Trail Records</Typography>
        <Box>
          <Tooltip title="Refresh data">
            <IconButton
              sx={{ color: 'white' }}
              onClick={() => {
                fetchAuditTrail();
                if (!job_no) fetchStats();
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      {loading ? (
        <Box sx={{ p: 3 }}>
          <LinearProgress sx={{ mb: 2 }} />
          <Typography variant="body1" align="center" sx={{ color: colorPalette.primary }}>
            Loading audit trail data...
          </Typography>
        </Box>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: colorPalette.accent }}>
                <TableCell sx={{ color: colorPalette.primary, fontWeight: 'bold', width: '15%' }}>
                  Timestamp
                </TableCell>
                <TableCell sx={{ color: colorPalette.primary, fontWeight: 'bold', width: '15%' }}>
                  Action
                </TableCell>
                <TableCell sx={{ color: colorPalette.primary, fontWeight: 'bold', width: '20%' }}>
                  User
                </TableCell>
                <TableCell sx={{ color: colorPalette.primary, fontWeight: 'bold', width: '15%' }}>
                  Job No/Year
                </TableCell>
                <TableCell sx={{ color: colorPalette.primary, fontWeight: 'bold', width: '35%' }}>
                  Changes
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {auditData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" sx={{ color: colorPalette.primary }}>
                      No audit trail data found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                auditData.map((entry) => (
                  <React.Fragment key={entry._id}>
                    <TableRow
                      hover
                      sx={{
                        '&:hover': { backgroundColor: colorPalette.accent },
                        cursor: 'pointer'
                      }}
                      onClick={() => toggleRowExpand(entry._id)}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ color: colorPalette.textPrimary }}>
                          {format(new Date(entry.timestamp), 'dd MMM yyyy')}
                        </Typography>
                        <Typography variant="caption" sx={{ color: colorPalette.textSecondary }}>
                          {format(new Date(entry.timestamp), 'HH:mm:ss')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={entry.action}
                          size="small"
                          sx={{
                            backgroundColor: actionColors[entry.action] || colorPalette.primary,
                            color: 'white',
                            fontWeight: 'bold'
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {renderUserAvatar(entry.username)}
                          <Box sx={{ ml: 1.5 }}>
                            <Typography variant="body2" sx={{ color: colorPalette.textPrimary, fontWeight: 'bold' }}>
                              {entry.username}
                            </Typography>
                            <Typography variant="caption" sx={{ color: colorPalette.primary }}>
                              {entry.userRole}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: colorPalette.textPrimary }}>
                          {entry.job_no}/{entry.year}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: colorPalette.textPrimary }}>
                          {entry.changes[0]?.changeType} on {entry.changes[0]?.field}
                        </Typography>
                        <Typography variant="caption" sx={{ color: colorPalette.textSecondary }}>
                          {entry.changes.length} change{entry.changes.length > 1 ? 's' : ''}
                        </Typography>
                      </TableCell>
                    </TableRow>
                    {expandedRow === entry._id && (
                      <TableRow>
                        <TableCell colSpan={5} sx={{ backgroundColor: colorPalette.accent, py: 2, px: 4 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <ExpandMoreIcon sx={{ color: colorPalette.primary, mr: 1 }} />
                            <Typography variant="subtitle2" sx={{ color: colorPalette.primary }}>
                              Change Details
                            </Typography>
                          </Box>
                          {renderChanges(entry.changes, entry.timestamp)}
                          {entry.ipAddress && (
                            <Typography variant="caption" sx={{ mt: 2, display: 'block', color: colorPalette.textSecondary }}>
                              IP Address: {entry.ipAddress}
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Card>
  </Fade>
);

export default AuditTable;
