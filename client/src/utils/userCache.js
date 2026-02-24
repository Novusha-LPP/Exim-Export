import axios from "axios";

let cachedUserPromise = null;
let cachedUserData = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // Cache for 5 minutes

export const fetchUserWithCache = async (username) => {
    const now = Date.now();

    if (cachedUserData && now - lastFetchTime < CACHE_DURATION) {
        return cachedUserData;
    }

    if (cachedUserPromise) {
        return cachedUserPromise;
    }

    cachedUserPromise = axios
        .get(`${import.meta.env.VITE_API_STRING}/get-user/${username}`)
        .then((response) => {
            cachedUserData = response.data;
            lastFetchTime = Date.now();
            cachedUserPromise = null;
            return cachedUserData;
        })
        .catch((error) => {
            cachedUserPromise = null;
            throw error;
        });

    return cachedUserPromise;
};

export const clearUserCache = () => {
    cachedUserData = null;
    cachedUserPromise = null;
    lastFetchTime = 0;
};
