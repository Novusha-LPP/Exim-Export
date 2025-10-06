import React from 'react';
import { Box, Typography, Pagination } from '@mui/material';

const AuditPagination = ({ pagination, activeTab, auditData, filters, handlePageChange, colorPalette }) => (
  pagination.totalPages > 1 && activeTab === 1 && (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3 }}>
      <Typography variant="body2" sx={{ color: colorPalette.darkBlue }}>
        Showing {auditData.length} of {pagination.totalItems} records
      </Typography>
      <Pagination
        count={pagination.totalPages}
        page={filters.page}
        onChange={handlePageChange}
        color="primary"
        sx={{
          '& .MuiPaginationItem-root': {
            color: colorPalette.primary,
            '&.Mui-selected': {
              backgroundColor: colorPalette.primary,
              color: 'white'
            }
          }
        }}
      />
    </Box>
  )
);

export default AuditPagination;
