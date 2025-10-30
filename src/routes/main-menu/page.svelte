<script lang="ts">
    import { fade } from "svelte/transition";

    import { mainScreenAssets } from "$lib/services/assets";
    import { assets, game } from "$lib/services";
    import { getCurrentUser } from "$lib/apis/auth";

    import { goto } from "$lib/utils/history";
    import { openDialog } from "$lib/core/dialogs";
    
    import { showingLoadingScreen } from ".";
    import LoginDialog from "./login-dialog.svelte";
    import SetupDialog from "./user-setup-dialog.svelte";

    let loading = $state<string | undefined>(undefined);

    async function fetchUserData() {
        loading = "正在載入使用者資料……";
        
        const isUserInitialized = await game.userLogin();
        console.log("[DBG] isUserInitialized:", isUserInitialized);

        if (!isUserInitialized) {
            // 使用者尚未初始化，打開初始化對話框
            await openDialog<void>(SetupDialog, { closeByOverlay: false, closeByKeyboard: false });
        }

        loading = "正在載入遊戲資料……";

        await Promise.all([
            game.runDailyRoutine(),
            assets.loadUIIcons()
        ]);
    }

    async function onclick() {
        if (loading)
            return; // 防止重複點擊

        let currentUser = getCurrentUser();

        if (currentUser instanceof Promise ) {
            loading = "正在檢查登入狀態...";
            currentUser = await getCurrentUser();
            loading = undefined;
        }

        // 檢查使用者是否已登入，若未登入則打開登入對話框
        if (currentUser === null) {
            await openDialog(LoginDialog);
        }

        // 再次檢查使用者狀態，若已登入則進入遊戲主畫面
        if (currentUser !== null) {
            await fetchUserData();
            goto("/game");
        }
    }
    
    async function onkeydown(e: KeyboardEvent) {
        if (!loading && (e.key === "Enter" || e.key === " "))
            await onclick();
    }
</script>

<style>
    .loading {
        position: absolute;
        top: 0;
        left: 0;
        background-color: black;
        color: white;
        width: 100%;
        height: 100%;

        display: flex;
        align-items: center;
        justify-content: center;

        font-size: 1rem;
        line-height: 2;
        text-align: center;

        z-index: 2;
    }

    .loading-text {
        position: absolute;
        right: 2rem;
        bottom: 2rem;
        font-size: 1rem;
        font-weight: bold;
    }

    .main {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;

        background-color: rgb(159, 234, 255);

        width: 100%;
        height: 100%;
        padding: 2rem;

        text-align: center;

        cursor: pointer;

        z-index: 1;
    }

    .brand {
        margin-block: 2rem;
        width: 100%;
    }

    .hint {
        font-size: 1rem;
        font-weight: bold;
        color: white;
        text-shadow:
            -2px 0px 0 black,
            2px 0px 0 black,
            0px -2px 0 black,
            0px 2px 0 black,
            calc(sqrt(2) * -1px) calc(sqrt(2) * -1px) 0 black,
            calc(sqrt(2) * -1px) calc(sqrt(2) * 1px) 0 black,
            calc(sqrt(2) * 1px) calc(sqrt(2) * -1px) 0 black,
            calc(sqrt(2) * 1px) calc(sqrt(2) * 1px) 0 black;
    }

    .element {
        width: 100%;
        position: absolute;
        bottom: 0;
        z-index: -1;
    }
</style>

{#await showingLoadingScreen}
    <div class="loading" transition:fade>
        <p>
            此應用仍在開發中，<br />
            功能可能不完整或有錯誤<br />
            歡迎隨時回報問題！:D<br />
        </p>
        {#await showingLoadingScreen.assetLoading}
            <p class="loading-text" transition:fade>載入中...</p>
        {/await}
    </div>
{:then} 
    <div class="main" {onclick} {onkeydown} role="button" tabindex="-1">
        <img class="brand" src={mainScreenAssets.title.src} alt="菜菜小伙伴" />
        <img class="element" src={mainScreenAssets.mainScreen.src} alt="元素1" />
        <p class="hint">{loading ?? "點擊任意位置開始"}</p>
    </div>
{/await}