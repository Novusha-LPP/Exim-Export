import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import PulseNav from './PulseNav';
import { useAnalytics } from './AnalyticsContext';
import { motion } from 'framer-motion';
import './ESanchitTV.css';

const GenericPulseTV = ({ metric, title }) => {
    const navigate = useNavigate();
    const { exporter } = useAnalytics();
    const [value, setValue] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPulse = async () => {
            try {
                const response = await axios.get(`${import.meta.env.VITE_API_STRING}/export-analytics/pulse`, {
                    params: { exporter }
                });
                if (response.data.success) {
                    setValue(response.data.summary[metric] || 0);
                }
            } catch (error) {
                console.error("Pulse fetch error:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchPulse();
        const interval = setInterval(fetchPulse, 30000);
        return () => clearInterval(interval);
    }, [exporter, metric]);

    const severity = value === 0 ? 'green' : value <= 10 ? 'amber' : 'red';

    if (loading && value === 0) {
        return (
            <div className="tv-dashboard-wrapper">
                <button className="tv-exit-btn" onClick={() => navigate('/')}>← Exit</button>
                <div className="tv-loading">INITIALIZING {title} PULSE...</div>
            </div>
        );
    }

    return (
        <div className={`tv-dashboard-wrapper tv-severity-${severity}`}>
            <button className="tv-exit-btn" onClick={() => navigate('/')}>← Exit</button>
            <PulseNav />

            <div className="tv-center">
                <motion.div 
                    className="tv-label"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    {title}
                </motion.div>

                <div className="tv-radar-ring"></div>
                {severity === 'amber' && <div className="tv-radar-ping"></div>}
                
                <motion.div 
                    className={`tv-number tv-number-${severity}`}
                    key={value}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 100 }}
                >
                    {value}
                </motion.div>

                <motion.div 
                    className="tv-subtitle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                >
                    PENDING
                </motion.div>
                
                {severity === 'green' && (
                    <motion.div 
                        className="tv-celebration-msg"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                    >
                        MISSION ACCOMPLISHED
                    </motion.div>
                )}
            </div>

            {severity === 'red' && (
                <div className="tv-ember-container">
                    {[...Array(20)].map((_, i) => (
                        <div 
                            key={i} 
                            className="tv-ember"
                            style={{
                                left: `${Math.random() * 100}%`,
                                width: `${Math.random() * 10 + 5}px`,
                                height: `${Math.random() * 10 + 5}px`,
                                backgroundColor: '#ef4444',
                                animationDuration: `${Math.random() * 2 + 2}s`,
                                animationDelay: `${Math.random() * 2}s`
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default GenericPulseTV;
