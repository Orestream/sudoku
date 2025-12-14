// vite.config.ts
import { sveltekit } from "file:///mnt/c/Users/robin/Programming/Test/frontend/node_modules/@sveltejs/kit/src/exports/vite/index.js";
import { defineConfig } from "file:///mnt/c/Users/robin/Programming/Test/frontend/node_modules/vite/dist/node/index.js";
var vite_config_default = defineConfig({
  plugins: [
    sveltekit({
      inspector: false
    })
  ],
  server: {
    fs: {
      allow: ["."]
    },
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvbW50L2MvVXNlcnMvcm9iaW4vUHJvZ3JhbW1pbmcvVGVzdC9mcm9udGVuZFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL21udC9jL1VzZXJzL3JvYmluL1Byb2dyYW1taW5nL1Rlc3QvZnJvbnRlbmQvdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL21udC9jL1VzZXJzL3JvYmluL1Byb2dyYW1taW5nL1Rlc3QvZnJvbnRlbmQvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBzdmVsdGVraXQgfSBmcm9tICdAc3ZlbHRlanMva2l0L3ZpdGUnO1xuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG5cdHBsdWdpbnM6IFtcblx0XHRzdmVsdGVraXQoe1xuXHRcdFx0aW5zcGVjdG9yOiBmYWxzZVxuXHRcdH0pXG5cdF0sXG5cdHNlcnZlcjoge1xuXHRcdGZzOiB7XG5cdFx0XHRhbGxvdzogWycuJ11cblx0XHR9LFxuXHRcdHByb3h5OiB7XG5cdFx0XHQnL2FwaSc6IHtcblx0XHRcdFx0dGFyZ2V0OiAnaHR0cDovL2xvY2FsaG9zdDo4MDgwJyxcblx0XHRcdFx0Y2hhbmdlT3JpZ2luOiB0cnVlXG5cdFx0XHR9XG5cdFx0fVxuXHR9XG59KTtcblxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFzVCxTQUFTLGlCQUFpQjtBQUNoVixTQUFTLG9CQUFvQjtBQUU3QixJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMzQixTQUFTO0FBQUEsSUFDUixVQUFVO0FBQUEsTUFDVCxXQUFXO0FBQUEsSUFDWixDQUFDO0FBQUEsRUFDRjtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ1AsSUFBSTtBQUFBLE1BQ0gsT0FBTyxDQUFDLEdBQUc7QUFBQSxJQUNaO0FBQUEsSUFDQSxPQUFPO0FBQUEsTUFDTixRQUFRO0FBQUEsUUFDUCxRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsTUFDZjtBQUFBLElBQ0Q7QUFBQSxFQUNEO0FBQ0QsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
