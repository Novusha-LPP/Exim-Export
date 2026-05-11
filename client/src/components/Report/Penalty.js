import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  parse, isValid, isWithinInterval, getYear, getMonth, getQuarter
} from 'date-fns';
import './Penalty.css';
import BillingPending from './BillingPending';
import MonthlyContainers from './monthlyContainers';

const Penalty = () => {
  // Basic state for the report tab
  const [activeReport, setActiveReport] = useState('monthly-container');

  // Filter State
  const [filterType, setFilterType] = useState('month');

  // Custom Filter Values
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3));

  // Fine report state
  const [fineData, setFineData] = useState([]);
  const [fineLoading, setFineLoading] = useState(false);

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Exporter filter state
  const [selectedExporter, setSelectedExporter] = useState('');
  const [exporterSearchInput, setExporterSearchInput] = useState('');
  const [showExporterSuggestions, setShowExporterSuggestions] = useState(false);

  // Generate years for dropdown
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, i) => currentYear - 5 + i);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const apiBase = import.meta.env.VITE_API_STRING;

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await axios.get(`${apiBase}/report/exporter-reports`, { withCredentials: true });
        setData(response.data);
      } catch (error) {
        console.error("Error fetching reports:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  // Fetch fine data when fine report tab is active
  useEffect(() => {
    if (activeReport === 'fine') {
      fetchFineData();
    }
  }, [activeReport]);

  const fetchFineData = async () => {
    setFineLoading(true);
    try {
      const response = await axios.get(`${apiBase}/report/fine`, { withCredentials: true });
      if (response.data.success) {
        setFineData(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching fine report:", error);
    } finally {
      setFineLoading(false);
    }
  };



  const filterByTime = (items) => {
    return items.filter(item => {
      // Use sb_date instead of be_date for export context
      const dateStr = item.sb_date || item.be_date;
      if (!dateStr) return false;

      let date = parse(dateStr, 'dd-MM-yyyy', new Date());

      if (!isValid(date)) {
        date = parse(dateStr, 'yyyy-MM-dd', new Date());
      }

      if (!isValid(date)) {
        date = new Date(dateStr);
      }

      if (!isValid(date)) return false;

      if (filterType === 'date-range') {
        if (!dateRange.start || !dateRange.end) return true;
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        end.setHours(23, 59, 59, 999);
        return isWithinInterval(date, { start, end });
      } else if (filterType === 'month') {
        return getMonth(date) === parseInt(selectedMonth) && getYear(date) === parseInt(selectedYear);
      } else if (filterType === 'quarter') {
        return getQuarter(date) === parseInt(selectedQuarter) && getYear(date) === parseInt(selectedYear);
      } else if (filterType === 'year') {
        return getYear(date) === parseInt(selectedYear);
      }
      return true;
    });
  };

  const getFilteredData = () => {
    return filterByTime(data);
  };

  const currentData = getFilteredData();

  // Get unique exporters for dropdown
  const getUniqueExporters = () => {
    const exporters = new Set();
    currentData.forEach(item => {
      if (item.exporter) {
        exporters.add(item.exporter);
      }
    });
    return Array.from(exporters).sort();
  };

  // Group Data for Exporter Wise Report
  const getExporterContainerData = () => {
    const grouped = {};
    let total20 = 0;
    let total40 = 0;
    let totalSB = 0;

    const dataToProcess = selectedExporter
      ? currentData.filter(item => item.exporter === selectedExporter)
      : currentData;

    dataToProcess.forEach(item => {
      const exporter = item.exporter || 'Unknown';
      if (!grouped[exporter]) {
        grouped[exporter] = {
          name: exporter,
          sbCount: 0,
          count20: 0,
          count40: 0
        };
      }

      grouped[exporter].sbCount += 1;
      grouped[exporter].count20 += (item.fcl20 || 0);
      grouped[exporter].count40 += (item.fcl40 || 0);

      totalSB += 1;
      total20 += (item.fcl20 || 0);
      total40 += (item.fcl40 || 0);
    });

    return {
      rows: Object.values(grouped).sort((a, b) => b.sbCount - a.sbCount),
      summary: { totalSB, total20, total40 }
    };
  };

  const renderContent = () => {
    if (activeReport === 'billing') {
      return <div className="billing-wrapper"><BillingPending /></div>;
    }

    if (activeReport === 'monthly-container') {
      return <MonthlyContainers />;
    }

    // Filter Controls
    const FilterSection = () => (
      <div className="nucleus-filter-section" style={{ marginBottom: '20px' }}>
        <div className="filter-row custom-filter-row" style={{ marginTop: 0, paddingLeft: 0, background: 'transparent' }}>
          <div className="filter-type-selector">
            <span className="filter-label" style={{ minWidth: 'auto', marginRight: '10px' }}>Filter Period:</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="nucleus-select"
            >
              <option value="month">Month Wise</option>
              <option value="quarter">Quarter Wise</option>
              <option value="year">Year Wise</option>
              <option value="date-range">Date Range</option>
              <option value="all">Unfiltered (All Time)</option>
            </select>
          </div>

          {filterType === 'date-range' && (
            <div className="custom-inputs">
              <input
                type="date"
                className="nucleus-input"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              />
              <span style={{ color: '#6b7280' }}>to</span>
              <input
                type="date"
                className="nucleus-input"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              />
            </div>
          )}

          {filterType === 'month' && (
            <div className="custom-inputs">
              <select
                className="nucleus-select"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <select
                className="nucleus-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          )}

          {filterType === 'quarter' && (
            <div className="custom-inputs">
              <select
                className="nucleus-select"
                value={selectedQuarter}
                onChange={(e) => setSelectedQuarter(e.target.value)}
              >
                <option value="1">Q1 (Jan - Mar)</option>
                <option value="2">Q2 (Apr - Jun)</option>
                <option value="3">Q3 (Jul - Sep)</option>
                <option value="4">Q4 (Oct - Dec)</option>
              </select>
              <select
                className="nucleus-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          )}

          {filterType === 'year' && (
            <div className="custom-inputs">
              <select
                className="nucleus-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>
    );

    if (activeReport === 'exporter-container') {
      const { rows, summary } = getExporterContainerData();
      const uniqueExporters = getUniqueExporters();

      const filteredExporters = uniqueExporters.filter(exporter =>
        exporter.toLowerCase().includes(exporterSearchInput.toLowerCase())
      );

      const handleExporterInputChange = (e) => {
        const value = e.target.value;
        setExporterSearchInput(value);
        setShowExporterSuggestions(true);
        if (!value) {
          setSelectedExporter('');
        }
      };

      const handleExporterSelect = (exporter) => {
        setSelectedExporter(exporter);
        setExporterSearchInput(exporter);
        setShowExporterSuggestions(false);
      };

      const handleClearExporter = () => {
        setSelectedExporter('');
        setExporterSearchInput('');
        setShowExporterSuggestions(false);
      };

      return (
        <div className="report-content">
          <h2 className="report-title">Exporter Wise SB Report</h2>
          <FilterSection />

          {/* Exporter Search Filter */}
          <div className="nucleus-filter-section" style={{ marginBottom: '20px', marginTop: '-10px' }}>
            <div className="filter-row custom-filter-row" style={{ marginTop: 0, paddingLeft: 0, background: 'transparent' }}>
              <div className="filter-type-selector" style={{ position: 'relative' }}>
                <span className="filter-label" style={{ minWidth: 'auto', marginRight: '10px' }}>Search Exporter:</span>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <input
                    type="text"
                    value={exporterSearchInput}
                    onChange={handleExporterInputChange}
                    onFocus={() => setShowExporterSuggestions(true)}
                    placeholder="Type to search exporters..."
                    className="nucleus-input"
                    style={{ minWidth: '300px', paddingRight: '30px' }}
                  />
                  {exporterSearchInput && (
                    <button
                      onClick={handleClearExporter}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#6b7280',
                        fontSize: '18px',
                        padding: '0 4px'
                      }}
                    >
                      ×
                    </button>
                  )}

                  {showExporterSuggestions && exporterSearchInput && filteredExporters.length > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: 'white',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        marginTop: '4px',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                        zIndex: 1000
                      }}
                    >
                      {filteredExporters.map((exporter, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleExporterSelect(exporter)}
                          style={{
                            padding: '10px 12px',
                            cursor: 'pointer',
                            borderBottom: idx < filteredExporters.length - 1 ? '1px solid #f3f4f6' : 'none',
                            transition: 'background 0.15s',
                            fontSize: '14px'
                          }}
                          onMouseEnter={(e) => e.target.style.background = '#f3f4f6'}
                          onMouseLeave={(e) => e.target.style.background = 'white'}
                        >
                          {exporter}
                        </div>
                      ))}
                    </div>
                  )}

                  {showExporterSuggestions && exporterSearchInput && filteredExporters.length === 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: 'white',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        marginTop: '4px',
                        padding: '10px 12px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                        zIndex: 1000,
                        color: '#6b7280',
                        fontSize: '14px'
                      }}
                    >
                      No exporters found
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="summary-cards-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <div className="summary-card" style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #3b82f6' }}>
              <div style={{ color: '#6b7280', fontSize: '14px' }}>Total Shipping Bills</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{summary.totalSB}</div>
            </div>
            <div className="summary-card" style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #10b981' }}>
              <div style={{ color: '#6b7280', fontSize: '14px' }}>Total 20ft Containers</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{summary.total20}</div>
            </div>
            <div className="summary-card" style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ color: '#6b7280', fontSize: '14px' }}>Total 40ft Containers</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{summary.total40}</div>
            </div>
          </div>

          <div className="nucleus-table-wrapper">
            <table className="nucleus-table">
              <thead>
                <tr>
                  <th>Exporter Name</th>
                  <th>Number of Shipping Bills</th>
                  <th>20 Feet Count</th>
                  <th>40 Feet Count</th>
                </tr>
              </thead>
              <tbody>
                {rows.length > 0 ? (
                  rows.map((row, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 500 }}>{row.name}</td>
                      <td>{row.sbCount}</td>
                      <td>{row.count20}</td>
                      <td>{row.count40}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: '#6b7280', padding: '30px' }}>
                      No records found for the selected period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // Fine Report (export-oriented)
    if (activeReport === 'fine') {
      if (fineLoading) {
        return <div style={{ padding: '20px', color: '#6b7280' }}>Loading fine report data...</div>;
      }

      // Filter fine data by time
      const filteredFineData = filterByTime(fineData);

      const totalAmount = filteredFineData.reduce((sum, item) => {
        return sum + (parseFloat(item.amount) || 0);
      }, 0);

      const formattedAmount = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
      }).format(totalAmount);

      return (
        <div className="report-content">
          <h2 className="report-title">Fine Report</h2>

          <div className="nucleus-stats-card" style={{ marginBottom: '20px' }}>
            <div className="stats-text">
              Total <span className="highlight-val">{filteredFineData.length}</span> fine entries.
              Total Amount: <span className="highlight-val" style={{ color: '#d97706' }}>{formattedAmount}</span>
            </div>
          </div>

          <FilterSection />

          <div className="nucleus-table-wrapper">
            <table className="nucleus-table">
              <thead>
                <tr>
                  <th>Job No</th>
                  <th>SB No</th>
                  <th>SB Date</th>
                  <th>Exporter</th>
                  <th>Type of Fine</th>
                  <th>Accountability</th>
                  <th>Amount (INR)</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {filteredFineData.length > 0 ? (
                  filteredFineData.map((item, idx) => (
                    <tr key={item._id || idx}>
                      <td style={{ fontWeight: 500 }}>{item.job_no}</td>
                      <td>{item.sb_no || '-'}</td>
                      <td>{item.sb_date || '-'}</td>
                      <td>{item.exporter || '-'}</td>
                      <td>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 600,
                          background: item.fineType === 'Challan' ? '#fef3c7'
                            : item.fineType === 'Fine by Officer' ? '#fce7f3'
                              : item.fineType === 'Notesheet Amount' ? '#dbeafe'
                                : '#f3f4f6',
                          color: item.fineType === 'Challan' ? '#92400e'
                            : item.fineType === 'Fine by Officer' ? '#9d174d'
                              : item.fineType === 'Notesheet Amount' ? '#1e40af'
                                : '#374151',
                        }}>
                          {item.fineType || '-'}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 600,
                          background: item.accountability === 'By Us' ? '#fee2e2' : item.accountability === 'By Exporter' ? '#dcfce7' : '#f3f4f6',
                          color: item.accountability === 'By Us' ? '#991b1b' : item.accountability === 'By Exporter' ? '#166534' : '#6b7280',
                        }}>
                          {item.accountability || '-'}
                        </span>
                      </td>
                      <td className="amount-cell fine-amount">
                        {item.amount ? `₹${Number(item.amount).toLocaleString('en-IN')}` : '-'}
                      </td>
                      <td>{item.remarks || <span style={{ color: '#9ca3af', fontSize: '12px' }}>-</span>}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', color: '#6b7280', padding: '30px' }}>
                      No fine records found for the selected period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (loading) {
      return <div style={{ padding: '20px', color: '#6b7280' }}>Loading report data...</div>;
    }

    return null;
  };

  return (
    <div className="penalty-page-container">

      {/* SIDEBAR */}
      <div className="reports-sidebar">
        <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb', fontWeight: 'bold', fontSize: '18px', color: '#111827' }}>
          Reports Hub
        </div>
        <div className="sidebar-menu" style={{ padding: '10px' }}>
          <div
            className={`sidebar-item ${activeReport === 'monthly-container' ? 'active' : ''}`}
            onClick={() => setActiveReport('monthly-container')}
          >
            Monthly Container
          </div>
          <div
            className={`sidebar-item ${activeReport === 'exporter-container' ? 'active' : ''}`}
            onClick={() => setActiveReport('exporter-container')}
          >
            Exporter Wise SB's
          </div>
          <div
            className={`sidebar-item ${activeReport === 'fine' ? 'active' : ''}`}
            onClick={() => setActiveReport('fine')}
          >
            Fine Report
          </div>
          <div
            className={`sidebar-item ${activeReport === 'billing' ? 'active' : ''}`}
            onClick={() => setActiveReport('billing')}
          >
            Billing Pending
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="nucleus-main-content">
        {renderContent()}
      </div>
    </div>
  );
};

export default Penalty;