<script lang="ts">
    import Routes, { index, page } from "$lib/core/routes";
    import Dialogs from "$lib/core/dialogs";

    function oncontextmenu(event: MouseEvent) {
        if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
            return;
        event.preventDefault();
    }

    function onerror(event: Event) {
        console.error("[ERR] Uncaught error:", event);
    }
</script>

<svelte:window {oncontextmenu} {onerror} />

<Routes
    routes={[
        index(() => import("$routes/main-menu")),
        page("game", () => import("$routes/game"), [
            index(() => import("$routes/game-main")),
            page("chat", () => import("$routes/game-chat")),
            page("shop", () => import("$routes/game-shop")),
            page("backpack", () => import("$routes/game-backpack")),
        ]),
        page("game/throwing-ball", () => import("$routes/game-throwing-ball")),
        page("game/throwing-ball/old", () => import("$routes/game-throwing-ball/page.old.svelte")),
        page("game/hide-and-seek", () => import("$routes/game-hide-and-seek/page.svelte")),
        page("game/hide-and-seek/old", () => import("$routes/game-hide-and-seek")),
    ]}
/>

<Dialogs />