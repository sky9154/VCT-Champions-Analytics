import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";


export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "VITE_");
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || "http://127.0.0.1:8591";

  return {
    plugins: [react()],
    server: {
      host: "127.0.0.1",
      port: 5577,
      strictPort: true,
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true
        }
      }
    }
  };
});