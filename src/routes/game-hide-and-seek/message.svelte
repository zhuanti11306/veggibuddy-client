<script lang="ts">
    import { type DialogProps } from "$lib/core/dialogs";

    interface $$Props extends DialogProps<void> {
        message: string;
        style: "failure" | "success";
        orientation?: "portrait" | "landscape";
    }

    let { message, style, orientation = "landscape" }: $$Props = $props();
</script>

<style>

    .message {
        --gradient-dir: to right;
        background: linear-gradient(var(--gradient-dir), #0000, #00000080 20% 80%, #0000);

        flex-shrink: 0;
        text-align: center;
        color: #c0c0c0;

        padding: 2rem;

        p {
            margin: .5rem;
        }

        .content {
            font-size: 1.25rem;

            &.success {
                color: #debc4a;
            }

            &.failure {
                color: #ffffff;
            }
        }
        
        &.landscape {
            --graident-dir: to right;
            width: 100cqh;
            rotate: 90deg;
        }

        &.portrait {
            --gradient-dir: to bottom;
            width: 100cqw;
        }
    }
</style>

<div class="message {orientation}">
    <p class="content {style}">{message}</p>
    <p class="hint">點擊空白位置以關閉</p>
</div>
