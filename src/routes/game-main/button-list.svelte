<script lang="ts">
    import type { Snippet } from "svelte";

    interface $$Props {
        children?: Snippet;
        position: "top-right" | "bottom-right" | "bottom-left";
    } 

    const {position, children}: $$Props = $props();
</script>

<style>
    .button-list {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--button-gap, .5rem);

        &.top-right {
            grid-area: 1 / 3 / 2 / 4;
            justify-content: flex-start;
        }

        &.bottom-right {
            grid-area: 3 / 3 / 4 / 4;
            justify-content: flex-end;
        }

        &.bottom-left {
            grid-area: 3 / 1 / 4 / 2;
            justify-content: flex-end;
        }
    }
</style>

<div class="button-list {position}">
    {@render children?.()}
</div>