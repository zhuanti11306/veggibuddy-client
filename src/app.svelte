<script lang="ts">
    import Routes, { index, page } from "$lib/core/routes";
    import Dialogs from "$lib/core/dialogs";

    function oncontextmenu(event: MouseEvent) {
        if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
            return;
        event.preventDefault();
    }
</script>

<svelte:window on:contextmenu={oncontextmenu} />

<Routes preload="all" routes={[
    index(() => import("$routes/main-menu")),
    page("game", () => import("$routes/game"), [
        index(() => import("$routes/game-main")),
        page("chat", () => import("$routes/game-chat")),
        page("shop", () => import("$routes/game-shop")),
        page("backpack", () => import("$routes/game-backpack")),
    ]),
]}/>

<Dialogs />