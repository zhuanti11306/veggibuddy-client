<script lang="ts">
    import { signInWithEmailAndPassword, signInWithGoogle } from "$lib/apis/auth";
    import { assets } from "$lib/services";
    import type { DialogProps } from "$lib/core/dialogs";

    const { dialog }: DialogProps<void> = $props();

    let stage1 = $state<HTMLFormElement | null>(null);
    let stage2 = $state<HTMLFormElement | null>(null);
        
    let stage2Loading = $state<string | undefined>(undefined);
    let stage2Error = $state<string | undefined>(undefined);

    let loginData = $state({ email: "", password: "" });

    async function handleGoogleSignIn() {
        try {
            await signInWithGoogle();
            dialog.close();
        } catch (error) {
            console.error("Google 登入失敗：", error);
        }
    }

    function handleSubmitStage1(event: SubmitEvent) {
        event.preventDefault();
        if (!stage1) return;

        const formData = new FormData(stage1);
        const email = loginData.email = formData.get("email") as string;

        if (!email || !stage2) return;

        stage2.reset(); // 清除密碼欄位
        stage2.scrollIntoView({ behavior: "smooth" });

    }

    async function handleSubmitStage2(event: SubmitEvent) {
        event.preventDefault();
        if (!stage2) return;

        const formData = new FormData(stage2);
        const password = loginData.password = formData.get("password") as string;

        if (!password)
            return;

        try {
            stage2Loading = "載入中……";
            stage2Error = undefined;

            await signInWithEmailAndPassword(loginData.email, loginData.password);
        } catch (error) {
            stage2Error = "登入失敗，請檢查您的電子郵件和密碼是否正確。";
        } finally {
            stage2Loading = undefined;
        }
    }

    function prevStage(currentStage: number) {        
        switch (currentStage) {
            case 1:
                dialog.close();
                break;
            case 2:
                stage1?.scrollIntoView({ behavior: "smooth" });
                break;
        }
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

        .divider {
            width: calc(100% - 2rem);
            margin: 1rem auto;
            border: none;
            border-top: 1px solid #c0c0c0;
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
        }

        &.secondary {
            border: 1px solid #808080;
            background-color: white;

            &:hover {
                background-color: #f0f0f0;
            }
        }

        img {
            display: block;
            height: 1em;
        }
    }

    .loading-text, .error-text {
        font-size: .875rem;
        margin-bottom: .5rem;
        text-align: center;

        &.error-text {
            color: red;
        }

        &.loading-text {
            color: #333;
        }

        &:empty {
            display: none;
        }
    }
</style>

<div class="dialog">
    <div class="stages">
        <div class="stage-container">
            <form bind:this={stage1} class="stage" onsubmit={handleSubmitStage1}>
                <h1>註冊或登入</h1>
                <label class="input-slot">
                    <span>電子郵件</span>
                    <input type="email" name="email" class="input" placeholder="請輸入使用者帳戶電子郵件" autocomplete="email" required>
                </label>
                <div class="spacer"></div>
                <button type="submit" class="button primary">下一步</button>
                <button type="button" class="button secondary" onclick={() => prevStage(1)}>取消</button>
                <hr class="divider">
                <button type="button" class="button secondary" onclick={handleGoogleSignIn}>
                    <img src={assets.getMainScreenAsset("googleIcon").src} alt="Google Icon" /> 使用 Google 登入
                </button>
            </form>
            <form bind:this={stage2} class="stage" onsubmit={handleSubmitStage2}>
                <h1>帳戶密碼</h1>
                <label class="input-slot">
                    <span>密碼</span>
                    <input type="password" name="password" class="input" placeholder="請輸入使用者密碼" autocomplete="new-password" required>
                </label>
                <div class="spacer"></div>
                <p class="error-text">{stage2Error}</p>
                <p class="loading-text">{stage2Loading}</p>
                <button type="submit" class="button primary">下一步</button>
                <button type="button" class="button secondary" onclick={() => prevStage(2)}>上一步</button>
            </form>
        </div>
    </div>
</div>
