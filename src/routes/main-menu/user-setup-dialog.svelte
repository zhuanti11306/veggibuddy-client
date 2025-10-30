<script lang="ts">
    import type { Pet } from "$lib/config";
    import { game } from "$lib/services";
    import type { DialogProps } from "$lib/core/dialogs";

    const { dialog }: DialogProps<void> = $props();

    let stageElements = $state<HTMLElement[]>([]);
    let loading = $state<boolean>(false);

    let nickname = $state<string>("");
    let pet = $state<{ name: string, type: Pet } | null>(null);

    function handleNicknameInput(event: Event) {
        const target = event.target as HTMLInputElement;
        nickname = target.value;
    }

    function handlePetInput(event: Event) {
        const target = event.target as HTMLInputElement;
        
        const petNames = {
            carrot: "蘿蔔",
            mushroom: "香菇"
        };

        pet = { name: petNames[target.value as keyof typeof petNames], type: target.value as Pet };
    }

    async function handleFinish() {
        loading = true;

        await game.setupAccount(nickname, pet!.type);
        
        dialog.close();
    }

    function preventDisable(callback: () => void) {
        return (event: MouseEvent) => {
            const button = event.currentTarget as HTMLButtonElement;
            if (button.disabled) return;
            callback();
        };
    }

    function toStage(stageNumber: number) {
        const stage = stageElements[stageNumber - 1];
        stage?.scrollIntoView({ behavior: "smooth" });
    }
</script>

<style>
    .dialog {
        width: calc(100% - 2rem);
        height: calc(100% - 2rem);
        border-radius: .5rem;
        background-color: white;
        padding: 2rem;
    }

    .stages {
        width: 100%;
        height: 100%;
        overflow: hidden;

        scroll-behavior: smooth;
    }

    .stage-container {
        width: 100%;
        height: 100%;
        display: flex;
        gap: 1rem;
    }

    .stage {
        width: 100%;
        height: 100%;
        flex-shrink: 0;

        display: flex;
        flex-direction: column;
        
        h1 {
            margin: 0;
            margin-bottom: 1rem;
            font-size: 1.5rem;
            font-weight: bold;
        }

        .spacer {
            flex-grow: 1;
        }
    }

    .input-slot {
        display: flex;
        flex-direction: column;
        margin-bottom: .5rem;
        gap: .25rem;

        span {
            font-size: .875rem;
            color: #333;
            line-height: 1.5;
        }

        .input {
            display: block;
            height: 2.5rem;
            padding: 0 1rem;
            border: 1px solid #ccc;
            border-radius: .25rem;
        }
    }

    .button {

        height: 2.5rem;
        border: none;
        border-radius: .25rem;
        margin-bottom: .5rem;

        display: flex;
        align-items: center;
        justify-content: center;
        gap: .5rem;
        
        font-size: 1rem;
        cursor: pointer;
        transition: background-color .25s;

        &.primary {
            background-color: #007bff;
            color: white;

            &:hover {
                background-color: #0069d9;
            }

            &:disabled {
                background-color: #a0c8ff;
                cursor: not-allowed;
            }
        }

        &.secondary {
            border: 1px solid #808080;
            background-color: white;

            &:hover {
                background-color: #f0f0f0;
            }
        }
    }
</style>

<div class="dialog">
    <div class="stages">
        <div class="stage-container">
            <div class="stage" bind:this={stageElements[0]}>
                <h1>事前準備</h1>
                <p>在我們開始之前，告訴我你的名字吧！不需要告訴我你的真實姓名，而是給讓我知道我應該怎麼稱呼你。</p>
                <label class="input-slot">
                    <span>暱稱</span>
                    <input class="input" name="nickname" type="text" placeholder="請輸入您的暱稱" autocomplete="nickname" oninput={handleNicknameInput} />
                </label>
                <div class="spacer"></div>
                <button class="button primary" disabled={!nickname} onclick={preventDisable(() => toStage(2))}>下一步</button>
            </div>
            <div class="stage" bind:this={stageElements[1]}>
                <h1>選擇寵物</h1>
                <p>選擇一隻與你合拍的小夥伴吧！在之後的每一天，你們將會一起交流、一起成長。</p>
                <label class="input-slot">
                    <span>寵物</span>
                    <select class="input" name="pet" oninput={handlePetInput}>
                        <option value="" disabled selected>請選擇您的寵物</option>
                        <option value="carrot">蘿蔔</option>
                        <option value="mushroom">香菇</option>
                    </select>
                </label>
                <div class="spacer"></div>
                <button class="button primary" disabled={!pet} onclick={preventDisable(() => toStage(3))}>下一步</button>
                <button class="button secondary" onclick={() => toStage(1)}>上一步</button>
            </div>
            <div class="stage" bind:this={stageElements[2]}>
                <h1>最終確認</h1>
                <p>最後，讓我們三思而行。<strong>{nickname}</strong>，我將會如此稱呼你，而你選擇的<strong>{pet?.name}</strong>將會是你的夥伴。<br>
                    沒有問題的話，我們就可以出發啦。</p>
                <div class="spacer"></div>
                <button class="button primary" disabled={loading || !nickname || !pet} onclick={preventDisable(handleFinish)}>完成</button>
                <button class="button secondary" onclick={() => toStage(2)}>返回</button>
            </div>
        </div>
    </div>
</div>
