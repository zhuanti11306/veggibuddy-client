<script lang="ts">
    import { CoinId, ItemId } from '$lib/config';
    import { openDialog } from '$lib/core/dialogs';
    import { assets, game } from '$lib/services';
    import ItemModal from './item-modal.svelte';

    const marketItems = game.getMarketItems();
    const userCurrency = $derived(
        game.userItems[CoinId.coin]?.quantity ?? 0
    );

</script>

<style>
    main {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        background-color: #a3691e;
    }

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

    header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem;
        background-color: #ffb969;
        /* border-bottom: .25rem solid #e4820a; */
    }

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
        scrollbar-color: #955200 transparent;
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
        border: 0;
        background-color: transparent;
        transition: .25s background-color;
        cursor: pointer;
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
        /* padding: 1rem; */
        border: 3px solid #ffaa00;
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
        padding: 1rem;
        background-color: #ffb969;
        border-top: .25rem solid #e4820a;

        display: flex;
        align-items: center;
        justify-content: flex-end;
    }

    .currency-icon {
        width: 1.5rem;
        height: 1.5rem;
    }

    .currency-amount {
        display: flex;
        gap: .25rem;
        align-items: center;
        font-size: 1.25rem;
        padding: .25rem .5rem;
        border-radius: .5rem;
        background-color: #00000020;
    }
</style>

<main>
    <header>
        <h1 class="label">菜菜商店</h1>
        <button class="back" onclick={() => history.back()}>
            <img src={assets.uiAssets.back.src} alt="back">
        </button>
    </header>

    {#await marketItems}
        <div class="loading">載入中……</div>
    {:then items} 
        <div class="list-container">
            <div class="list">
                {#each items as item}
                    <button class="item" onclick={() => openDialog(ItemModal, { props: { item } })}>
                    <!-- <button class="item"> -->
                        <img 
                            class="item-image" 
                            src={assets.getItemIcon(item.itemId)?.src} 
                            onerror={e => e.preventDefault()} 
                            alt={item.name}
                        >
                        <p class="label">&dollar;{item.price.amount}</p>
                    </button>
                {/each}
                {#each Array.from({ length: Math.max(0, 24 - game.marketItems.length) })}
                    <div class="empty-item">
                        <div class="empty-item-img"></div>
                    </div>
                {/each}
            </div>
        </div>
    {/await}

    <footer>
        <span class="currency-amount label">
            <img class="currency-icon" src={assets.getItemIcon(ItemId.coin).src} alt="">
            &dollar;{userCurrency}
        </span>
    </footer>
</main>