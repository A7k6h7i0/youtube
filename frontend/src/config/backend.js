const defaultBackendURL = import.meta.env.DEV ? "http://localhost:3000" : "/api";

export const backendURL =
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  defaultBackendURL;
