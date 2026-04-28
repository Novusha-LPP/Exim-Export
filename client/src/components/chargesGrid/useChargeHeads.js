import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';

export const useChargeHeads = () => {
    const [chargeHeads, setChargeHeads] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchChargeHeads = useCallback(async (searchQuery = '') => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_STRING}/charge-heads`, {
                params: { search: searchQuery }
            });
            if (res.data.success) {
                setChargeHeads(res.data.data);
            }
        } catch (err) {
            setError(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const addChargeHead = async (name, category, hsnCode, chargeType, isPbMandatory, tdsCategory) => {
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_STRING}/charge-heads`, { 
                name, category, hsnCode, chargeType, isPbMandatory, tdsCategory 
            });
            if (res.data.success) {
                await fetchChargeHeads();
                return { success: true, data: res.data.data };
            }
        } catch (err) {
            return { success: false, error: err.response?.data?.message || err.message };
        }
    };

    const updateChargeHead = async (id, name, category, hsnCode, chargeType, isPbMandatory, tdsCategory) => {
        try {
            const res = await axios.put(`${import.meta.env.VITE_API_STRING}/charge-heads/${id}`, { 
                name, category, hsnCode, chargeType, isPbMandatory, tdsCategory 
            });
            if (res.data.success) {
                await fetchChargeHeads();
                return { success: true, data: res.data.data };
            }
        } catch (err) {
            return { success: false, error: err.response?.data?.message || err.message };
        }
    };

    const deleteChargeHead = async (id) => {
        try {
            const res = await axios.delete(`${import.meta.env.VITE_API_STRING}/charge-heads/${id}`);
            if (res.data.success) {
                await fetchChargeHeads();
                return { success: true };
            }
        } catch (err) {
            return { success: false, error: err.response?.data?.message || err.message };
        }
    };

    return {
        chargeHeads,
        loading,
        error,
        fetchChargeHeads,
        addChargeHead,
        updateChargeHead,
        deleteChargeHead
    };
};
