<script lang="ts">
    import type { Snippet } from "svelte";
    import { slide } from "svelte/transition";

    import ButtonList from "./button-list.svelte";

    interface $$Props {
        children?: Snippet<[toggle: () => void]>;
        shortcuts?: Snippet<[toggle: () => void]>;
        showShortcuts?: boolean;
        activateShortcuts?: boolean;
        position: "top-right" | "bottom-right" | "bottom-left";
    } 

    let {position, children, shortcuts, showShortcuts = $bindable(false), activateShortcuts = true}: $$Props = $props();

    function toggleShortcuts() {
        showShortcuts = !showShortcuts;
    }
</script>

<style>
    .shortcut-list {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--button-gap, .5rem);
        padding: .25rem;
        margin: -.25rem;
        border-radius: .5rem;
        background-color: #00000020;
    }
</style>

<ButtonList {position}>
    {#if shortcuts && showShortcuts && activateShortcuts}
        <div class="shortcut-list" transition:slide={{ duration: 250, axis: "y" }}>
            {@render shortcuts(toggleShortcuts)}
        </div>
    {/if}
    {@render children?.(toggleShortcuts)}
</ButtonList>