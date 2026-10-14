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

            // Automatically persist refreshed/generated token
            if (response.data?.token) {
                try {
                    const local = JSON.parse(localStorage.getItem("exim_user") || "{}");
                    localStorage.setItem(
                        "exim_user",
                        JSON.stringify({ ...local, ...response.data })
                    );
                    axios.defaults.headers.common["Authorization"] = `Bearer ${response.data.token}`;
                } catch (e) {
                    // ignore storage errors
                }
            }

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
