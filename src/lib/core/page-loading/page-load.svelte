<script lang="ts">
    import type { DialogProps } from "$lib/core/dialogs";
    import { onMount } from "svelte";
    import { fade } from "svelte/transition";

    interface $$Props extends DialogProps<void> {
        promise: Promise<void>;
        direction?: "landscape" | "portrait";
    }

    let { closeDialog, promise, direction = "portrait" }: $$Props = $props();

    onMount(() => {
        let close: (() => void) | null = closeDialog;
        promise.then(() => closeDialog?.());
        return () => close = null;
    });
</script>

<style>
    div {
        width: 100%;
        height: 100%;
        background-color: black;
        z-index: 5;
    }
</style>

<div transition:fade></div>