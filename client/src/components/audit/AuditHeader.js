import React from 'react';
import { Box, Typography } from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';

const AuditHeader = ({ colorPalette }) => (
  <Box sx={{ 
    background: `linear-gradient(135deg, ${colorPalette.primary}22 0%, ${colorPalette.secondary}22 100%)`,
    borderRadius: 3,
    p: 2.5,
    mb: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }}>
    <Typography variant="h5" sx={{ 
      fontWeight: 700,
      color: colorPalette.textPrimary,
      display: 'flex',
      alignItems: 'center',
      gap: 1
    }}>
      <SecurityIcon sx={{ color: colorPalette.primary, fontSize: 28 }} />
      Audit Trail Dashboard
    </Typography>
  </Box>
);

export default AuditHeader;