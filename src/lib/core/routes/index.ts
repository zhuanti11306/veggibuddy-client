import type { Component } from "svelte";

interface RouteProps {
    path?: string;
    params?: Record<string, string>;
    query?: Record<string, string>;
    children?: RouteEntry[];
};

export interface RouteEntry<T extends Record<string, any> = any> {
    path: string;
    getComponent: () => Promise<Component<RouteProps & T>>;
    getProps?: () => Promise<Record<string, any>>;
    children?: RouteEntry[];
    exact?: boolean;
}

export type RouteComponent<P extends Record<string, any> = {}> = Component<RouteProps & P>;

export type ComponentType<P extends Record<string, any> = {}> = 
    | (() => RouteComponent<P>) 
    | (() => Promise<{ default: RouteComponent<P> }>) 
    | (() => Promise<RouteComponent<P>>)
    | (() => Promise<any>); // [DBG] 添加對 Svelte 模組導入的支援，待解決。

export type PropsType<P extends Record<string, any> = {}> = P | (() => P | Promise<P>);

function wrap<P extends Record<string, any>>(component: ComponentType<P>): () => Promise<Component<RouteProps & P>> {
    return async () => {
        const mod = await component();
        // 處理 Svelte 模組導入
        if (mod && typeof mod === "object" && "default" in mod)
            return mod.default as Component<RouteProps & P>;
        // 處理直接的組件導入
        return mod as Component<RouteProps & P>;
    };
}

function wrapProps<P extends Record<string, any>>(props: PropsType<P>): () => Promise<P> {
    return async () => typeof props === "function" ? props() : props;
}

export function page(path: string, component: ComponentType<{}>, children?: RouteEntry[]): RouteEntry<{}>;
export function page<P extends Record<string, any>>(path: string, component: ComponentType<P>, props: PropsType<P>, children?: RouteEntry[]): RouteEntry<P>;

export function page(path: string, component: ComponentType<any>, propsOrchildren?: PropsType<any> | RouteEntry[], children?: RouteEntry[]): RouteEntry {
    const getComponent = wrap(component);
    if (propsOrchildren instanceof Array)
        return { path, getComponent, children: propsOrchildren };
    return { path, getComponent, getProps: wrapProps(propsOrchildren), children };
}

export function exactPage(path: string, component: ComponentType<{}>, children?: RouteEntry[]): RouteEntry<{}>;
export function exactPage<P extends Record<string, any>>(path: string, component: ComponentType<P>, props: PropsType<P>, children?: RouteEntry[]): RouteEntry<P>;

export function exactPage(path: string, component: ComponentType<any>, propsOrchildren?: PropsType<any> | RouteEntry[], children?: RouteEntry[]): RouteEntry {
    const getComponent = wrap(component);
    if (propsOrchildren instanceof Array)
        return { path, getComponent, exact: true, children: propsOrchildren };
    return { path, getComponent, getProps: wrapProps(propsOrchildren), exact: true, children };
}

export function index(component: ComponentType<{}>, children?: RouteEntry[]): RouteEntry<{}>;
export function index<P extends Record<string, any>>(component: ComponentType<{}>, props: PropsType<P>, children?: RouteEntry[]): RouteEntry<P>;

export function index(component: ComponentType<{}>, propsOrChildren?: PropsType<any> | RouteEntry[], children?: RouteEntry[]): RouteEntry {
    return exactPage("./", component, propsOrChildren as any, children);
}

export function fallback(component: Component<RouteProps>): RouteEntry<{}> {
    return { path: "*", getComponent: async () => component };
}

export { default } from "./component.svelte";