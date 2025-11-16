<script lang="ts">
    import { ItemId } from "$lib/config";
    import { openDialog, type DialogProps } from "$lib/core/dialogs";
    import { assets, game, type MarketItem } from "$lib/services";
    import { fade } from "svelte/transition";
    import SuccessModal from "./success-modal.svelte";

    interface $$Props extends DialogProps<void> {
        item: MarketItem;
    }

    let { item, closeDialog }: $$Props = $props();

    const userCurrency = $derived(game.userItems[ItemId.coin]?.quantity ?? 0);
    const alreadyOwned = $derived(game.userItems[item.itemId]?.quantity ?? 0);
    
    let quantity = $state(1);
    const maxQuantity = $derived(Math.min(Math.floor(userCurrency / item.price.amount), 99));

    const ableToBuy = $derived(maxQuantity >= quantity);

    let isLoading = $state(false);

    async function onsubmit(event: SubmitEvent) {
        event.preventDefault();

        if (!ableToBuy) return;

        isLoading = true;
        await game.purchaseItem(item, quantity);
        isLoading = false;
        await openDialog(SuccessModal, { props: { item, quantity } });
    }
</script>

<style>
    .container {
        width: calc(100% - 2rem);
        max-width: 450px;
        padding: .75rem;
        border: 3px solid #ffaa00;
        border-radius: .75rem;
        background-color: #955200;
        
        position: relative;
        overflow: hidden;
    }

    .item-info {
        display: grid;
        grid: 1fr auto / auto 1fr;
    }

    .item-image {
        grid-area: 1 / 1 / 3 / 2;

        width: 8rem;
        height: 8rem;
        padding: 1rem;
        border-radius: .5rem;

        display: block;
        background-color: #00000030;
        object-fit: contain;
    }

    .item-detail {
        grid-area: 1 / 2 / 2 / 3;
        padding: 0 .5rem;
        display: flex;
        flex-direction: column;
    }

    .item-label {
        padding-left: .5rem;

        display: flex;
        align-items: center;
        justify-content: space-between;
        
        font-size: 1.25rem;
        font-weight: bold;
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

    .item-owned {
        color: white;
        font-size: .875rem;
        text-align: right;
    }

    .item-description {
        margin-top: .5rem;
        padding: .5rem;
        background-color: #00000020;
        border-radius: .5rem;

        color: white;
        font-size: 1rem;
        line-height: 1.25;
        white-space: pre-wrap;
    }

    .item-purchase {
        grid-area: 2 / 2 / 3 / 3;
        padding: 0 .5rem;

        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        align-items: center;

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

    .purchase-quantity-range {
        flex-grow: 1;
    }

    .purchase-quantity {
        width: calc-size(auto, size + 4px);
        padding: 0 .25rem;
        border: 0;
        background: none;
        margin-left: -.25rem;
        margin-right: -1.5rem;

        font-size: 1.25rem;
        field-sizing: content;
        text-align: center;
        text-shadow: inherit;
    }

    .btn-list {
        display: flex;
        width: 100%;
        gap: .25rem;
        padding: .25rem .5rem;
    }

    .btn {
        flex-grow: 1;
        flex-basis: 0;

        border: 0;
        background-color: #ffaa00;
    }

    .loading {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: #00000080;

        display: flex;
        justify-content: center;
        align-items: center;

        color: white;
        font-size: 1.5rem;
        font-weight: bold;
    }
</style>

<div class="container">
    <div class="item-info">
        <img class="item-image" src={assets.getItemIcon(item.itemId).src} alt={item.name} />
        <div class="item-detail">
            <div class="item-label">
                {item.name}
                <span></span>
                ${item.price.amount}
            </div>
            <div class="item-owned">已擁有：{alreadyOwned} 個</div>
        </div>
        <form class="item-purchase" {onsubmit}>
            <input class="purchase-quantity-range" type="range" min={1} max={maxQuantity} bind:value={quantity} disabled={!ableToBuy} />
            &times;<input class="purchase-quantity" type="number" min={1} max={maxQuantity} bind:value={quantity} disabled={!ableToBuy} />
            <div class="btn-list">
                <button type="button" class="btn" onclick={() => closeDialog()}>取消</button>
                <button type="submit" class="btn" disabled={!ableToBuy}>購買</button>
            </div>
        </form>
    </div>
    <div class="item-description">{item.description}</div>

    {#if isLoading}
        <div class="loading" transition:fade={{ duration: 250}}>請稍候...</div>
    {/if}
</div>