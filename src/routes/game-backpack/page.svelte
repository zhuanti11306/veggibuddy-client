<script lang="ts">
    import { openDialog } from "$lib/core/dialogs";
    import { assets, game } from "$lib/services";
    import ItemModal from "./item-modal.svelte";

    // import type { UserItem } from "$lib/apis";
    // import { closeDialog, closeDialogByComponent, openDialog } from "$lib/components/dialog";
    // import { game } from "$lib/game";
    // import { uiAssets, itemIcons } from "$lib/services/icon.service";
    // import { userItems, isGameLoading } from "$lib/stores";
    // import { formatQuantity } from "$lib/utils";
    // import { safeExecute } from "$lib/utils/error";
    // import { logger } from "$lib/utils/logger";
    // import ItemModal from "./item-modal.svelte";

    // // 使用 store 中的用戶物品
    // const items = $derived($userItems);
    // const loading = $derived($isGameLoading);

    // let error: string | null = $state(null);

    // // 載入用戶物品
    // async function loadUserItems() {
    //     const result = await safeExecute(async () => {
    //         await game.getUserItems();
    //     });
        
    //     if (!result.success) {
    //         error = result.error.message;
    //         logger.error('InventoryPage', '載入用戶物品失敗', result.error);
    //     }
    // }

    // // 初始載入
    // loadUserItems();

    const userItems = game.getUserItems();
</script>

<style>
    h1 {
        margin: 0;
    }

    .label {
        margin: 0;
        font-weight: bold;
        text-shadow: 
            -2px  0px 0 white,
                2px  0px 0 white,
                0px -2px 0 white,
                0px  2px 0 white,
            calc(sqrt(2) * -1px) calc(sqrt(2) * -1px) 0 white,
            calc(sqrt(2) * -1px) calc(sqrt(2) *  1px) 0 white,
            calc(sqrt(2) *  1px) calc(sqrt(2) * -1px) 0 white,
            calc(sqrt(2) *  1px) calc(sqrt(2) *  1px) 0 white;
    }

    main {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        background-color: #425fb7;
    }

    header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background-color: #73a2e8;
        padding: 1rem;
        background-image: repeating-linear-gradient(
            to right, #ffffff80 0px, #ffffff80 3px,
            transparent 3px, transparent 9px,
            #ffffff80 9px, #ffffff80 12px);
        background-repeat: repeat-x;
        background-size: auto 3px;
        background-position: center calc(100% - 3px);
    }

    /* .back-button {
        display: block;
        padding: .5rem;
        border: 0;
        background: transparent;
        cursor: pointer;
    } */

    .back {
        cursor: pointer;
        border: none;
        background-color: transparent;
        padding: 0;

        img {
            width: 2rem;
            height: 2rem;
            object-fit: contain;
        }
    }

    .loading {
    /* .error { */
        flex-grow: 1;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    /* .error {
        color: red;
    } */

    .list-container {
        flex-basis: 0;
        flex-grow: 1;
        overflow: auto;
        padding: 1rem .5rem 1rem 1rem;
        scrollbar-width: thin;
        scrollbar-color: #223a83 transparent;
        scrollbar-gutter: stable;
    }

    .list {
        display: grid;
        grid: auto-flow 1fr / repeat(auto-fill, minmax(120px, 1fr));
    }

    .item {
        display: flex;
        flex-direction: column;
        gap: .5rem;
        padding: .5rem;
        transition: .25s background-color;
        cursor: pointer;
        border: 0;
        background-color: transparent;
        position: relative;

        p {
            position: absolute;
            bottom: 1rem;
            right: .75rem;
            padding-right: .25rem;
            left: 1rem;
            text-align: right;
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            font-size: 1.25rem;
        }

        &:hover {
            background: rgba(0, 0, 0, 0.05);
        }

        &:active {
            background: rgba(0, 0, 0, 0.1);
        }
    }

    .item-image {
        display: block;
        width: 100%;
        aspect-ratio: 1;
        border: 3px dashed #c0c0c0;
        border-radius: .5rem;
        background-color: #00000020;
        object-fit: contain;
    }

    .empty-item {
        display: flex;
        flex-direction: column;
        gap: .5rem;
        padding: .5rem;
        border: 0;
        background-color: transparent;
    }

    .empty-item-img {
        display: block;
        width: 100%;
        aspect-ratio: 1;
        border-radius: .5rem;
        background-color: #00000020;
    }

    footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background-color: #73a2e8;
        padding: 1rem;
        background-image: repeating-linear-gradient(
            to right, #ffffff80 0px, #ffffff80 3px,
            transparent 3px, transparent 9px,
            #ffffff80 9px, #ffffff80 12px);
        background-repeat: repeat-x;
        background-size: auto 3px;
        background-position: center 3px;
    }
</style>

<main>
    <header>
        <h1 class="label">我的背包</h1>
        <button class="back" onclick={() => history.back()}>
            <img src={assets.uiAssets.back.src} alt="back">
        </button>
    </header>

    {#await userItems}
        <div class="loading">載入中……</div>
    {:then} 
        <div class="list-container">
            <div class="list">
                {#each Object.values(game.userItems) as item}
                    <button class="item" onclick={() => openDialog(ItemModal, { props: { item } })}>
                    <!-- <button class="item" > -->
                        <img 
                            class="item-image" 
                            src={assets.getItemIcon(item.itemId)?.src ?? ""} 
                            onerror={e => e.preventDefault()} 
                            alt={item.name}
                        >
                        <!-- <p class="label">&times;{formatQuantity(item.quantity)}</p> -->
                        <p class="label">&times;{item.quantity}</p>
                    </button>
                {/each}
                {#each Array.from({ length: Math.max(0, 24 - (Object.keys(game.userItems).length ?? 0)) }) as slot}
                    <div class="empty-item">
                        <div class="empty-item-img"></div>
                    </div>
                {/each}
            </div>
        </div>
    {/await}

    <!-- {#if loading}
        <div class="loading">載入中……</div>
    {:else if error}
        <div class="error">載入失敗: {error}</div>
    {:else}
        <div class="list-container">
            <div class="list">
                {#each items as item}
                    <button class="item" onclick={() => openDialog(itemModal, item)}>
                        <img 
                            class="item-image" 
                            src={itemIcons[item.itemId]?.src ?? ""} 
                            onerror={e => e.preventDefault()} 
                            alt={item.name}
                        >
                        <p class="label">&times;{formatQuantity(item.quantity)}</p>
                    </button>
                {/each}
                {#each Array.from({ length: Math.max(0, 24 - items.length) }) as slot}
                    <div class="empty-item">
                        <div class="empty-item-img"></div>
                    </div>
                {/each}
            </div>
        </div>
    {/if} -->

    <footer></footer>
</main>