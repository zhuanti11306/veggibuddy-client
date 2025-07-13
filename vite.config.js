import { defineConfig } from "vite";
import basicSSL from "@vitejs/plugin-basic-ssl";
import arraybuffer from "vite-plugin-arraybuffer";

export default defineConfig({
    base: "veggibuddy-client",

    build: {
        target: "esnext",
        minify: "terser",

        rollupOptions: {
            input: {
                "index": "./index.html",
                "test/index": "./test/index.html",
                "test/triangle": "./test/triangle.html",
                "test/image": "./test/image.html",
                "test/gltf": "./test/gltf.html",
            }
        }
    },

    resolve: {
        alias: {
            "@": "/src",
        }
    },

    plugins: [
        // 啟用 HTTPS 以使得非本機設備運行需要安全上下文的功能
        basicSSL(),
        arraybuffer(),
    ]
});