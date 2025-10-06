import React from 'react';
import { Box, Grid, Card, CardContent, Typography, Zoom, Fade, LinearProgress } from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import PersonIcon from '@mui/icons-material/Person';
import VisibilityIcon from '@mui/icons-material/Visibility';

const AuditSummaryPanel = ({ stats, statsLoading, colorPalette, actionColors }) => (
  statsLoading ? (
    <Box sx={{ p: 3, textAlign: 'center' }}>
      <LinearProgress />
      <Typography variant="body2" sx={{ mt: 2, color: colorPalette.primary }}>
        Loading statistics...
      </Typography>
    </Box>
  ) : (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={3}>
        <Zoom in={true}>
          <Card sx={{
            background: colorPalette.cardGradient,
            border: `1px solid ${colorPalette.accent}`,
            borderRadius: 2,
            boxShadow: '0 4px 12px rgba(25, 118, 210, 0.1)'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <DescriptionIcon sx={{ color: colorPalette.primary, mr: 1 }} />
                <Typography variant="h6" sx={{ color: colorPalette.darkBlue }}>
                  Total Actions
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ color: colorPalette.primary, fontWeight: 'bold' }}>
                {stats?.summary?.totalActions || 0}
              </Typography>
              <Typography variant="body2" sx={{ color: colorPalette.darkBlue, mt: 1 }}>
                Across all projects
              </Typography>
            </CardContent>
          </Card>
        </Zoom>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Zoom in={true} style={{ transitionDelay: '100ms' }}>
          <Card sx={{
            background: colorPalette.cardGradient,
            border: `1px solid ${colorPalette.accent}`,
            borderRadius: 2,
            boxShadow: '0 4px 12px rgba(25, 118, 210, 0.1)'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PersonIcon sx={{ color: colorPalette.primary, mr: 1 }} />
                <Typography variant="h6" sx={{ color: colorPalette.darkBlue }}>
                  Active Users
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ color: colorPalette.primary, fontWeight: 'bold' }}>
                {stats?.summary?.totalUsers || 0}
              </Typography>
              <Typography variant="body2" sx={{ color: colorPalette.darkBlue, mt: 1 }}>
                In the last 30 days
              </Typography>
            </CardContent>
          </Card>
        </Zoom>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Zoom in={true} style={{ transitionDelay: '200ms' }}>
          <Card sx={{
            background: colorPalette.cardGradient,
            border: `1px solid ${colorPalette.accent}`,
            borderRadius: 2,
            boxShadow: '0 4px 12px rgba(25, 118, 210, 0.1)'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <DescriptionIcon sx={{ color: colorPalette.primary, mr: 1 }} />
                <Typography variant="h6" sx={{ color: colorPalette.darkBlue }}>
                  Documents
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ color: colorPalette.primary, fontWeight: 'bold' }}>
                {stats?.summary?.totalDocuments || 0}
              </Typography>
              <Typography variant="body2" sx={{ color: colorPalette.darkBlue, mt: 1 }}>
                Modified this year
              </Typography>
            </CardContent>
          </Card>
        </Zoom>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Zoom in={true} style={{ transitionDelay: '300ms' }}>
          <Card sx={{
            background: colorPalette.cardGradient,
            border: `1px solid ${colorPalette.accent}`,
            borderRadius: 2,
            boxShadow: '0 4px 12px rgba(25, 118, 210, 0.1)'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <VisibilityIcon sx={{ color: colorPalette.primary, mr: 1 }} />
                <Typography variant="h6" sx={{ color: colorPalette.darkBlue }}>
                  Most Active
                </Typography>
              </Box>
              <Typography variant="h5" sx={{ color: colorPalette.primary, fontWeight: 'bold' }}>
                {stats?.topUsers?.length > 0 ? stats.topUsers[0]._id : 'N/A'}
              </Typography>
              <Typography variant="body2" sx={{ color: colorPalette.darkBlue, mt: 1 }}>
                {stats?.topUsers?.length > 0 ? `${stats.topUsers[0].count} actions` : ''}
              </Typography>
            </CardContent>
          </Card>
        </Zoom>
      </Grid>
    </Grid>
  )
);

export default AuditSummaryPanel;
