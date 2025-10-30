import type { Component } from "svelte";

export interface DialogProps<T> {
    dialog: Dialog<T>;
    closeDialog: (reason?: string) => void;
}

export interface DialogOption {
    closeByKeyboard?: boolean;
    closeByOverlay?: boolean;
}

export class Dialog<T, P extends Record<string, any> = any> {
    public readonly id = crypto.randomUUID();

    public readonly component: Component<P & DialogProps<T>>;
    public readonly props: P;

    public readonly lifecycle: Promise<T | void>;
    private readonly resolveLifecycle: (result?: T) => void;

    public readonly closeByKeyboard;
    public readonly closeByOverlay;

    constructor(component: Component<P & DialogProps<T>>, props: P, options?: DialogOption) {
        this.component = component;
        this.props = props;

        this.closeByKeyboard = options?.closeByKeyboard ?? true;
        this.closeByOverlay = options?.closeByOverlay ?? true;

        const { promise, resolve } = Promise.withResolvers<T | void>();
        this.lifecycle = promise;
        this.resolveLifecycle = resolve;
    }

    public close(value: T): void {
        this.resolveLifecycle(value);
    }
}

export const dialogs = $state<Dialog<any>[]>([]);

export function openDialog<T>(component: Component<DialogProps<T>>, options?: DialogOption): Promise<T | void>;
export function openDialog<T, P extends Record<string, any>>(component: Component<P & DialogProps<T>>, options: DialogOption & { props: P }): Promise<T | void>;

export function openDialog<T, P extends Record<string, any>>(component: Component<P & DialogProps<T>>, options?: DialogOption & { props?: P }): Promise<T | void> {
    const props = options?.props ?? {} as P;
    const dialog = new Dialog<T, P>(component, props, options);
    dialogs.push(dialog);

    dialog.lifecycle.finally(() => popDialog(dialog));

    return dialog.lifecycle;
}

export function closeTopDialog(value?: unknown): void {
    const topDialog = peekTopDialog();
    topDialog?.close(value);
} 

export function peekTopDialog(): Dialog<unknown> | undefined {
    return dialogs.at(-1);
}

function indexOfDialog(dialog: Dialog<any, any>): number {
    return dialogs.findIndex(d => d === dialog);
}

function popDialog(dialog: Dialog<any, any>): void {
    const index = indexOfDialog(dialog);
    if (index === -1) return;

    if (index === dialogs.length - 1)
        dialogs.pop();

    dialogs.splice(index, 1);
}

export { default as Dialogs } from "./component.svelte";