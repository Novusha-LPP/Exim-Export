import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';

export const useCharges = (parentId, parentModule) => {
    const [charges, setCharges] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchCharges = useCallback(async () => {
        if (!parentId || !parentModule) return;
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_STRING}/charges`, {
                params: { parentId, parentModule }
            });
            if (res.data.success) {
                setCharges(res.data.data);
            }
        } catch (err) {
            setError(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    }, [parentId, parentModule]);

    useEffect(() => {
        fetchCharges();
    }, [fetchCharges]);

    const addChargesBulk = async (newCharges) => {
        if (!import.meta.env.VITE_API_STRING) {
            // Provide a graceful fallback in strict dev environments missing env
            console.error("REACT_APP_API_STRING is missing");
        }
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_STRING}/charges/bulk`, { charges: newCharges });
            if (res.data.success) {
                await fetchCharges();
                return { success: true, data: res.data.data };
            }
        } catch (err) {
            return { success: false, error: err.response?.data?.message || err.message };
        }
    };

    const updateCharge = async (id, updateData) => {
        try {
            const res = await axios.put(`${import.meta.env.VITE_API_STRING}/charges/${id}`, updateData);
            if (res.data.success) {
                await fetchCharges();
                return { success: true, data: res.data.data };
            }
        } catch (err) {
            return { success: false, error: err.response?.data?.message || err.message };
        }
    };

    const deleteCharge = async (id) => {
        try {
            const res = await axios.delete(`${import.meta.env.VITE_API_STRING}/charges/${id}`);
            if (res.data.success) {
                await fetchCharges();
                return { success: true };
            }
        } catch (err) {
            return { success: false, error: err.response?.data?.message || err.message };
        }
    };

    return {
        charges,
        loading,
        error,
        fetchCharges,
        addChargesBulk,
        updateCharge,
        deleteCharge
    };
};
