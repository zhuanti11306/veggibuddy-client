<script lang="ts">
    import { signOut } from "$lib/apis/auth";
    import { type DialogProps } from "$lib/core/dialogs";
    import { settings } from "$lib/services";
    import { goto } from "$lib/utils/history";

    let { dialog }: DialogProps<void> = $props();
</script>

<style>
    .modal {
        padding: 1rem;
        border: 3px solid #ffaa43;
        background-color: #c86e00;
        border-radius: .5rem;
        position: relative;

        display: flex;
        flex-direction: column;
        gap: .5rem;
    }

    .title {
        position: absolute;
        bottom: 100%;
        width: 2em;
        left: 50%;
        transform: translateX(-50%);
        margin: 0 0 .5rem 0;
        
        text-align: center;
        font-size: 1.5rem;
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

    button {
        cursor: pointer;
        font-size: 1rem;
        padding: .5rem 1rem;
        border: none;
        border-radius: .25rem;
        background-color: #ffaa43;
    }
</style>

<div class="modal">
    <h1 class="title">選單</h1>
    <button type="button" onclick={() => settings.sound = !settings.sound}>音效：{settings.sound ? "開" : "關"}</button>
    <!-- <button type="button" onclick={() => settings.music = !settings.music}>音樂：{settings.music ? "開" : "關"}</button> -->
    <button type="button" onclick={() => (dialog.close(), signOut(), goto("/"))}>登出</button>
    <button type="button" onclick={() => dialog.close()}>關閉選單</button>
</div>