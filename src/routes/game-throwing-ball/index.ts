import { SceneId } from "$lib/config";
import { gotoWithPromise } from "$lib/core/page-loading";
import { assets } from "$lib/services";

export { default } from "./page.svelte";

export function gotoThrowingBall() {
    // App 已經預載過此路由元件，無需重複載入
    // const promise = Promise.all([
    //     import("$routes/game-throwing-ball"),
    //     assets.loadSceneAssets(SceneId.throwingBallGame)
    // ]);

    const promise = assets.loadSceneAssets(SceneId.throwingBallGame);
    gotoWithPromise(promise, "/game/throwing-ball");
}