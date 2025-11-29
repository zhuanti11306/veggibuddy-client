import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
// import basicSSL from "@vitejs/plugin-basic-ssl";
// import { visualizer } from "rollup-plugin-visualizer"; 

// https://vite.dev/config/
export default defineConfig({
    base: "/",

    plugins: [
        svelte(),
        // basicSSL(),
        // visualizer()
    ],

    server: {
        headers: {
            "Cross-Origin-Opener-Policy": "same-origin",
            "Cross-Origin-Embedder-Policy": "require-corp",
        },
    },

    css: {
        transformer: "lightningcss",
        lightningcss: {
            targets: {
                chrome: 120,
                safari: 16,
                firefox: 115
            }
        }
    },

    build: {
        cssMinify: "lightningcss",

        target: "esnext",
        rollupOptions: {
            output: {
                manualChunks(id) {
                    // 將 node_modules 中的大型套件獨立打包，避免阻塞主執行緒
                    if (id.includes('node_modules')) {
                        if (id.includes('firebase')) return 'firebase';
                        if (id.includes('@ffmpeg')) return 'ffmpeg';

                        // 其他 node_modules 打包成 vendor
                        return 'vendor';
                    }

                    if (id.includes('src/lib/core/dialogs')) {
                        return 'dialogs';
                    }
                }
            }
        }
    },

    optimizeDeps: {
        exclude: [
            "@ffmpeg/ffmpeg",
            "@ffmpeg/utils"
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
