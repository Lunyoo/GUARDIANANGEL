import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig, PluginOption } from "vite";

// Avoid Node-specific globals to keep TS happy without @types/node
const projectRoot = '.'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': `/src`
    }
  },
  server: {
    // Prevent HMR reload storms caused by WhatsApp auth/session files and logs changing constantly
    watch: {
      ignored: [
        // Ignore the entire backend folder to avoid client reloads from auth session churn & logs
        'backend/**',
        '**/backend/**',
        // Specific dot-auth/session dirs (in case of symlinks or alternate paths)
        '**/backend/.wa-auth/**',
        '**/backend/.wwebjs_auth/**',
        '**/.wwebjs_auth/**',
        // Logs and tmp
        '**/backend/logs/**',
        '**/backend/**/logs/**',
        '**/backend/tmp/**',
        '**/backend/**/tmp/**',
        // SQLite files
        '**/*.db',
        '**/*.db-*',
        // Fallback guard via function matcher
        ((path: string) => /\/backend\//.test(path) || /backend\/.+/.test(path)) as unknown as string,
      ] as unknown as any,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
