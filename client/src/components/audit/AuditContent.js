import React from 'react';
import StatsCards from './StatsCards';
import AuditCharts from './AuditCharts';
import AuditPagination from './AuditPagination';

const AuditContent = ({
  stats,
  colorPalette,
  glassMorphismCard,
  AnimatedCounter,
  StatusIndicator,
  statsLoading,
  LoadingSkeleton,
  alpha,
  pagination,
  activeTab,
  auditData,
  filters,
  handlePageChange,
  userFilter
}) => (
  <>
    <StatsCards
      stats={stats}
      colorPalette={colorPalette}
      glassMorphismCard={glassMorphismCard}
      AnimatedCounter={AnimatedCounter}
      StatusIndicator={StatusIndicator}
    />
    <AuditCharts
      userFilter={userFilter}
      filters={filters}
      colorPalette={colorPalette}
      glassMorphismCard={glassMorphismCard}
      LoadingSkeleton={LoadingSkeleton}
      alpha={alpha}
    />
    <AuditPagination
      pagination={pagination}
      activeTab={activeTab}
      auditData={auditData}
      filters={filters}
      handlePageChange={handlePageChange}
      colorPalette={colorPalette}
    />
  </>
);

export default AuditContent;
