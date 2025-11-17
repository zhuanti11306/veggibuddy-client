<script lang="ts">
    import { assets, game, interact } from "$lib/services";
    import { longpress } from "$lib/utils/actions/longpress";
    import { goto } from "$lib/utils/history";
    
    import ButtonList from "./button-list.svelte";
    import ButtonListWithShortcut from "./button-list-with-shortcut.svelte";
    import GameInfo from "./game-info.svelte";
    import { ItemId } from "$lib/config";
    import { onMount } from "svelte";

    $effect(() => {
        game.runDailyRoutine();
    });

    let foodCount = $derived(
        (game.userItems[ItemId.generalFood]?.quantity ?? 0) +
        (game.userItems[ItemId.premiumFood]?.quantity ?? 0)
    );

    onMount(() => {
        interact.startRandomEventLoop();
        return () => interact.stopRandomEventLoop();
    });
</script>

<style>
    main {
        width: 100%;
        height: 100%;
        padding: .5rem;
        
        display: grid;
        grid: auto 1fr auto / auto 1fr auto;

        pointer-events: none;
    }

    .button {
        display: block;
        width: 4.5rem;
        height: 5rem;
        padding: 0;
        position: relative;

        background-color: transparent;
        border: 0;

        cursor: pointer;
        pointer-events: all;

        img {
            width: 100%;
            aspect-ratio: 1;
            object-fit: contain;
        }

        .label {
            position: absolute;
            bottom: 0;
            width: 100%;
            left: 0;
            text-align: center;
            font-size: 1.25rem;
            font-weight: bold;
            color: black;
            text-shadow:
                -2px 0px 0 white,
                2px 0px 0 white,
                0px -2px 0 white,
                0px 2px 0 white,
                calc(sqrt(2) * -1px) calc(sqrt(2) * -1px) 0 white,
                calc(sqrt(2) * -1px) calc(sqrt(2) * 1px) 0 white,
                calc(sqrt(2) * 1px) calc(sqrt(2) * -1px) 0 white,
                calc(sqrt(2) * 1px) calc(sqrt(2) * 1px) 0 white;
        }
    }

    .shortcut-button {
        width: 4rem;
        height: 5rem;
    }
</style>

<main>
    <GameInfo />

    <ButtonList position="top-right">
        <button type="button" class="button">
            <img src={assets.uiAssets.settings.src} alt="設定" draggable="false">
            <span class="label">設定</span>
        </button>
    </ButtonList>

    <ButtonList position="bottom-left">
        <button type="button" class="button" onclick={() => goto("./shop")}>
            <img src={assets.uiAssets.shop.src} alt="商店" draggable="false">
            <span class="label">商店</span>
        </button>
    </ButtonList>

    <ButtonListWithShortcut position="bottom-right">
        {#snippet shortcuts()}
            <button type="button" class="button shortcut-button" onclick={() => foodCount > 0 && game.shortcutFeedPet()}>
                <img src={assets.uiAssets.feed.src} alt="餵食" draggable="false">
                <span class="label">餵食 {foodCount}</span>
            </button>

            <button type="button" class="button shortcut-button" onclick={() => goto("./chat")}>
                <img src={assets.uiAssets.chat.src} alt="對話" draggable="false" style="padding: .25rem;">
                <span class="label">對話</span>
            </button>
        {/snippet}

        {#snippet children(onlongpress)}
            <!-- onlongpress 是切換快捷顯示的函數 -->
            <button type="button" class="button" use:longpress={{ onclick: () => goto("./backpack"), onlongpress }}>
                <img src={assets.uiAssets.inventory.src} alt="背包" draggable="false">
                <span class="label">背包</span>
            </button>
        {/snippet}
    </ButtonListWithShortcut>
</main>