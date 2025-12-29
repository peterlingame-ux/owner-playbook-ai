import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api/sportnanoapi": {
        target: "https://open.sportnanoapi.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/sportnanoapi/, ""),
        configure: (proxy, _options) => {
          proxy.on("proxyReq", (proxyReq, req, _res) => {
            // 确保请求头正确
            proxyReq.setHeader("Accept", "application/json");
          });
        },
      },
      // 代理本地 API 请求（用于解决 HTTPS 混合内容问题）
      // 注意：这个配置需要在 /api/sportnanoapi 之后，避免路径冲突
      "/api/competitions": {
        target: process.env.VITE_API_BASE_URL || "http://13.214.174.28:3000",
        changeOrigin: true,
        secure: false, // 允许自签名证书
        configure: (proxy, _options) => {
          proxy.on("proxyReq", (proxyReq, req, _res) => {
            proxyReq.setHeader("Accept", "application/json");
          });
        },
      },
      "/api/fixtures": {
        target: process.env.VITE_API_BASE_URL || "http://13.214.174.28:3000",
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on("proxyReq", (proxyReq, req, _res) => {
            proxyReq.setHeader("Accept", "application/json");
          });
        },
      },
      "/api/match": {
        target: process.env.VITE_API_BASE_URL || "http://13.214.174.28:3000",
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on("proxyReq", (proxyReq, req, _res) => {
            proxyReq.setHeader("Accept", "application/json");
          });
        },
      },
      "/api/odds": {
        target: process.env.VITE_API_BASE_URL || "http://13.214.174.28:3000",
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on("proxyReq", (proxyReq, req, _res) => {
            proxyReq.setHeader("Accept", "application/json");
          });
        },
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
