import axios from "axios";

/**
 * Enterprise Axios Configuration
 * Automatically synchronizes authentication state across all HTTP requests.
 * Evaluates synchronously at module load time before any React component mounts.
 */

// Initialize default headers from localStorage if available
try {
  const initialUser = JSON.parse(localStorage.getItem("exim_user") || "null");
  if (initialUser?.token) {
    axios.defaults.headers.common["Authorization"] = `Bearer ${initialUser.token}`;
  }
  if (initialUser?.username) {
    axios.defaults.headers.common["username"] = initialUser.username;
    axios.defaults.headers.common["x-username"] = initialUser.username;
  }
} catch (e) {
  // Ignore initial read error
}

// Request Interceptor: Injects verified JWT token and user headers dynamically
axios.interceptors.request.use(
  (config) => {
    try {
      const raw = localStorage.getItem("exim_user");
      if (raw) {
        const user = JSON.parse(raw);
        if (user) {
          config.headers = config.headers || {};

          // Cryptographic JWT Bearer Token
          if (user.token) {
            config.headers["Authorization"] = `Bearer ${user.token}`;
            if (config.headers.set) {
              config.headers.set("Authorization", `Bearer ${user.token}`);
            }
          }

          // User identity & Role headers
          if (user.username) {
            config.headers["username"] = user.username;
            config.headers["x-username"] = user.username;
            if (config.headers.set) {
              config.headers.set("username", user.username);
              config.headers.set("x-username", user.username);
            }
          }

          if (user._id || user.id) {
            const uid = user._id || user.id;
            config.headers["user-id"] = uid;
            if (config.headers.set) {
              config.headers.set("user-id", uid);
            }
          }

          if (user.role) {
            config.headers["user-role"] = user.role;
            config.headers["x-user-role"] = user.role;
            if (config.headers.set) {
              config.headers.set("user-role", user.role);
              config.headers.set("x-user-role", user.role);
            }
          }
        }
      }
    } catch (e) {
      // Gracefully continue even if localStorage access fails
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handles token lifecycle and session expiration
axios.interceptors.response.use(
  (response) => {
    // If the server returns a refreshed or new token, update stored session
    if (response?.data?.token && typeof response.data.token === "string") {
      try {
        const raw = localStorage.getItem("exim_user");
        if (raw) {
          const user = JSON.parse(raw);
          if (user && user.token !== response.data.token) {
            user.token = response.data.token;
            localStorage.setItem("exim_user", JSON.stringify(user));
            axios.defaults.headers.common["Authorization"] = `Bearer ${user.token}`;
          }
        }
      } catch (e) {
        // ignore
      }
    }
    return response;
  },
  (error) => {
    const isAuthEndpoint = error.config?.url?.includes("/login");
    const isTokenExpired =
      error.response?.data?.message?.includes("Invalid or expired token");

    if (
      error.response &&
      error.response.status === 401 &&
      !isAuthEndpoint &&
      isTokenExpired
    ) {
      console.warn("Session expired. Clearing session and redirecting to login.");
      localStorage.removeItem("exim_user");
      window.location.href = "/";
    }

    return Promise.reject(error);
  }
);

// Global Fetch Interceptor: transparently injects auth headers into native window.fetch calls
if (typeof window !== "undefined" && window.fetch) {
  const nativeFetch = window.fetch;
  window.fetch = async (input, init = {}) => {
    try {
      const raw = localStorage.getItem("exim_user");
      if (raw) {
        const user = JSON.parse(raw);
        if (user) {
          let headers;
          if (init && init.headers) {
            headers = new Headers(init.headers);
          } else if (input instanceof Request) {
            headers = new Headers(input.headers);
          } else {
            headers = new Headers();
          }

          if (user.token && !headers.has("Authorization")) {
            headers.set("Authorization", `Bearer ${user.token}`);
          }
          if (user.username && !headers.has("username")) {
            headers.set("username", user.username);
            headers.set("x-username", user.username);
          }
          if ((user._id || user.id) && !headers.has("user-id")) {
            headers.set("user-id", user._id || user.id);
          }
          if (user.role && !headers.has("user-role")) {
            headers.set("user-role", user.role);
            headers.set("x-user-role", user.role);
          }

          if (input instanceof Request) {
            const newRequest = new Request(input, { ...init, headers });
            return nativeFetch(newRequest);
          } else {
            return nativeFetch(input, { ...init, headers });
          }
        }
      }
    } catch (e) {
      // Graceful fallback to native fetch
    }
    return nativeFetch(input, init);
  };
}

export default axios;
