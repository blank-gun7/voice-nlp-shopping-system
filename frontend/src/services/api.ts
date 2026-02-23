// Full implementation in Phase 6.
// Stub placed here so type-imports resolve during development.

const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const api = {
  async health(): Promise<boolean> {
    try {
      return (await fetch(`${BASE}/api/health`)).ok;
    } catch {
      return false;
    }
  },
};
