import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "es2020",
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
        // 支持 SSE 流式传输
        configure: (proxy, _options) => {
          proxy.on("proxyReq", (proxyReq, req) => {
            // 对于 SSE 请求，设置正确的请求头
            // 注意：req.url 是原始 URL（带 /api 前缀）
            if (req.url?.includes("/api/streams/") || req.url === "/api/agent") {
              proxyReq.setHeader("Accept", "text/event-stream");
              proxyReq.setHeader("Cache-Control", "no-cache");
              console.log("[vite proxy] SSE request:", req.url);
            }
          });
          proxy.on("proxyRes", (proxyRes, req) => {
            // 确保 SSE 响应的 Content-Type 正确
            // 注意：req.url 是原始 URL（带 /api 前缀）
            if (req.url?.includes("/api/streams/") || req.url === "/api/agent") {
              // 强制设置正确的响应头
              proxyRes.headers["content-type"] = "text/event-stream; charset=utf-8";
              proxyRes.headers["cache-control"] = "no-cache";
              proxyRes.headers["connection"] = "keep-alive";
              proxyRes.headers["x-accel-buffering"] = "no"; // 禁用 Nginx 缓冲（如果使用）
              console.log("[vite proxy] SSE response headers set for:", req.url);
            }
          });
        },
        // 禁用缓冲以支持流式传输
        ws: false,
      },
    },
  },
});

