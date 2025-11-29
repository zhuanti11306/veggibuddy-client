import { openDialog } from "$lib/core/dialogs";
import { goto } from "$lib/utils/history";

import PageLoad from "./page-load.svelte";

export function gotoWithPromise(promise: Promise<any>, path: string) {
    openDialog(PageLoad, { props: { promise } })
        .then(() => goto(path));
}