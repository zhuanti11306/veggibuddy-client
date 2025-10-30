<script lang="ts">
    import Routes, { index, page } from "$lib/core/routes";
    import Dialogs from "$lib/core/dialogs";
</script>

<Routes routes={[
    index(() => import("./routes/main-menu")),
    page("game", () => import("./routes/game"), [
        index(() => import("./routes/game-main")),
        page("shop", () => import("./routes/game-shop")),
        page("backpack", () => import("./routes/game-backpack")),
    ]),
]}/>

<Dialogs />