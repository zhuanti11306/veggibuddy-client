import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import basicSSL from "@vitejs/plugin-basic-ssl";

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        basicSSL(),
        svelte()
    ],

    server: {
        headers: {
            "Cross-Origin-Opener-Policy": "same-origin",
            "Cross-Origin-Embedder-Policy": "require-corp",
        },
    },
    optimizeDeps: {
        exclude: [
            "@ffmpeg/ffmpeg"
        ]
    },

    resolve: {
        alias: {
            "$lib": "/src/lib",
            "$assets": "/src/assets",
            "$routes": "/src/routes"
        }
    }
});
