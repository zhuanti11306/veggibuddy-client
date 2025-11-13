<script lang="ts">
    import Routes, { index, page } from "$lib/core/routes";
    import Dialogs from "$lib/core/dialogs";
</script>

<Routes preload="all" routes={[
    index(() => import("./routes/main-menu")),
    page("game", () => import("./routes/game"), [
        index(() => import("./routes/game-main")),
        page("chat", () => import("./routes/game-chat")),
        page("shop", () => import("./routes/game-shop")),
        page("backpack", () => import("./routes/game-backpack")),
    ]),
]}/>

<Dialogs />