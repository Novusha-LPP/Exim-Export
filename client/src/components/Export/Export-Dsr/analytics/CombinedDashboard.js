import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import PulseNav from './PulseNav';
import { useAnalytics } from './AnalyticsContext';
import { motion, useSpring, useTransform } from 'framer-motion';
import './ESanchitTV.css';

const AnimatedNumber = ({ value }) => {
    const numericValue = Number(value) || 0;
    const spring = useSpring(0, { mass: 1, stiffness: 50, damping: 15 });
    const display = useTransform(spring, (current) => Math.round(Number(current) || 0));
    useEffect(() => { spring.set(numericValue); }, [numericValue, spring]);
    return <motion.span>{display}</motion.span>;
};

const getStatusMessage = (value, severity) => {
    if (severity === 'green') {
        const msgs = ["All Clear!", "Great job!", "Zero pending!", "Mission Success!"];
        return msgs[value % msgs.length];
    }
    if (severity === 'amber') {
        const msgs = ["Pickup speed!", "Almost there!", "Keep moving!", "Final stretch!"];
        return msgs[value % msgs.length];
    }
    return "Action Required";
};

const PulseCard = ({ title, value }) => {
    let severity = 'green';
    
    if (title === "Created Today") {
        severity = value > 0 ? 'green' : 'amber';
    } else {
        severity = value === 0 ? 'green' : value <= 10 ? 'amber' : 'red';
    }
    
    const statusMsg = getStatusMessage(value, severity);

    return (
        <motion.div
            className={`tv-pulse-card tv-severity-${severity}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div className="tv-card-label">{title}</div>
            <div className={`tv-card-number tv-number-${severity}`}>
                <AnimatedNumber value={value} />
            </div>
            <div className="tv-card-status">
                {severity === 'green' && <span className="tv-icon">🏆</span>}
                {severity === 'amber' && <span className="tv-icon">⚡</span>}
                {severity === 'red' && <span className="tv-icon">🚨</span>}
                {statusMsg}
            </div>
        </motion.div>
    );
};

const CombinedDashboard = () => {
    const navigate = useNavigate();
    const { exporter } = useAnalytics();
    const [summary, setSummary] = useState({
        totalPending: 0,
        handover: 0,
        billing: 0,
        ops: 0,
        createdToday: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPulse = async () => {
            setLoading(true);
            try {
                const response = await axios.get(`${import.meta.env.VITE_API_STRING}/export-analytics/pulse`, {
                    params: { exporter }
                });
                if (response.data.success) {
                    setSummary(response.data.summary);
                }
            } catch (error) {
                console.error("Pulse fetch error:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchPulse();
        const interval = setInterval(fetchPulse, 30000); // refresh every 30s
        return () => clearInterval(interval);
    }, [exporter]);

    if (loading && summary.totalPending === 0) {
        return (
            <div className="tv-dashboard-wrapper">
                <button className="tv-exit-btn" onClick={() => navigate('/')}>← Exit</button>
                <div className="tv-loading">INITIALIZING PULSE...</div>
            </div>
        );
    }

    return (
        <div className="tv-dashboard-wrapper tv-combined-dashboard">
            <button className="tv-exit-btn" onClick={() => navigate('/')}>← Exit</button>
            <PulseNav />

            <div className="tv-combined-container">
                <motion.div 
                    className="tv-combined-header"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <h1>ALVISION — PULSE OVERVIEW</h1>
                    <p>Real-time monitoring across all modules</p>
                </motion.div>
                
                <div className="tv-combined-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
                    <PulseCard title="TOTAL PENDING JOBS" value={summary.totalPending} />
                    <PulseCard title="HANDOVER PENDING" value={summary.handover} />
                    <PulseCard title="BILLING PENDING" value={summary.billing} />
                    <PulseCard title="OPERATIONS PENDING" value={summary.ops} />
                    <PulseCard title="CREATED TODAY" value={summary.createdToday} />
                </div>
            </div>
        </div>
    );
};

export default CombinedDashboard;
