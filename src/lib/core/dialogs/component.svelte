<script lang="ts">
    import { fade } from "svelte/transition";
    import { dialogs, peekTopDialog } from ".";

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === "Escape" && dialogs.length > 0) {
            event.preventDefault();
            event.stopPropagation();
            
            const topDialog = peekTopDialog();
            if (topDialog && topDialog.closeByKeyboard)
                topDialog.close(void 0);
        }
    }

    function handleOverlayClick(event: MouseEvent, dialog: any) {
        if (event.target === event.currentTarget) {
            if (dialog.closeByOverlay)
                dialog.close(void 0);
        }
    }
</script>

<style>
    .backdrop {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        
        display: flex;
        justify-content: center;
        align-items: center;

        background-color: rgba(0, 0, 0, 0.125);

        z-index: 1000;
    }

    .backdrop:first-of-type {
        background-color: rgba(0, 0, 0, 0.5);
    }
</style>

<svelte:window on:keydown={handleKeydown} />

{#each dialogs as dialog (dialog.id)}
{@const DialogComponent = dialog.component}

<div class="backdrop"
    onclick={e => e.target === e.currentTarget && handleOverlayClick(e, dialog)}
    role="presentation"
    transition:fade={{ duration: 250 }}
>
    <DialogComponent {...dialog.props} />
</div>
{/each}