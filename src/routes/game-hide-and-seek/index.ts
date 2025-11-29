import { SceneId } from "$lib/config";
import { gotoWithPromise } from "$lib/core/page-loading";
import { assets } from "$lib/services";

export { default } from "./page.svelte";

export function gotoHideAndSeek() {
    // App 已經預載過此路由元件，無需重複載入
    // const promise = Promise.all([
    //     import("$routes/game-hide-and-seek"),
    //     assets.loadSceneAssets(SceneId.hideNSeekGame)
    // ]);

    const promise = assets.loadSceneAssets(SceneId.hideNSeekGame);
    gotoWithPromise(promise, "/game/hide-and-seek");
}