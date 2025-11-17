<script lang="ts">
    import type { DialogProps } from "$lib/core/dialogs";
    import { assets, game, type UserItem } from "$lib/services";
    import { fade } from "svelte/transition";
    import { itemFunctions } from ".";

    interface $$Props extends DialogProps<void> {
        item: UserItem;
    }

    let { item, closeDialog }: $$Props = $props();

    const userOwned = $derived(game.userItems[item.itemId]?.quantity ?? 0);
    
    let isLoading = $state(false);

    function runFunction(use: () => Promise<void> | void, close?: boolean) {
        const task = use();
        if (task instanceof Promise) {
            isLoading = true;
            task.finally(() => {
                isLoading = false;
                if (close) closeDialog();
            });
        } else {
            if (close) closeDialog();
        }
    }
</script>

<style>
    .container {
        width: calc(100% - 2rem);
        max-width: 450px;
        padding: .75rem;
        border: 3px solid #73a2e8;
        border-radius: .75rem;
        background-color: #425fb7;
        
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

    .item-functions {
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

    .btn {
        flex-grow: 1;
        padding: .5rem 1rem;
        border: 0;
        border-radius: .25rem;
        background-color: #73a2e8;
        margin: .25rem .5rem;
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
            </div>
            <div class="item-owned">已擁有：{userOwned} 個</div>
        </div>
        <div class="item-functions">
            {#each itemFunctions[item.itemId] as { name, use, close } }
                <button type="button" class="btn" onclick={() => runFunction(use, close)}>{name}</button>
            {/each}
        </div>
    </div>
    <div class="item-description">{item.description}</div>

    {#if isLoading}
        <div class="loading" transition:fade={{ duration: 250}}>請稍候...</div>
    {/if}
</div>