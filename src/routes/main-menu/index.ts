import { assets } from "$lib/services";
import { sleep } from "$lib/utils/async/sleep";

const assetLoading = Promise.all([assets.loadMainScreenIcons(), sleep(1500)]);
const hintShowing = sleep(3000);

export const showingLoadingScreen = Object.assign(Promise.all([assetLoading, hintShowing]), { assetLoading });

export { default } from "./page.svelte";