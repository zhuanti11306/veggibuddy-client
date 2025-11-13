<script lang="ts">
    import { assets, type MarketItem } from "$lib/services";
    import { type DialogProps } from "$lib/core/dialogs";

    interface $$Props extends DialogProps<void> {
        item: MarketItem;
        quantity: number;
    }

    let { item, quantity }: $$Props = $props();
</script>

<style>
    .success-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        padding: 2rem 1rem;
        text-align: center;
        background-image: linear-gradient(to bottom, #00000000, #00000080 10% 90%, #00000000);
        backdrop-filter: blur(2px);
        width: 100%;
        color: white;
    }

    .item-display {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
    }

    .item-image {
        width: 120px;
        height: 120px;
        object-fit: contain;
        border-radius: 8px;
    }

    .item-info {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .item-name {
        font-size: 1.25rem;
    }

    .hint {
        color: #eabd27;
    }
</style>

<div class="success-content">
    <div class="item-display">
        <img 
            class="item-image" 
            src={assets.getItemIcon(item.itemId)?.src ?? ""} 
            alt={item.name}
            onerror={e => e.preventDefault()}
        >
        
        <div class="item-info">
            <div class="item-name">獲得：{item.name} &times; {quantity}</div>
        </div>
    </div>
    
    <p class="hint">點擊空白位置以關閉</p>
</div>