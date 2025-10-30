<script lang="ts">
    import type { Component } from "svelte";

    import { getCurrentRoute, PathTestResult, resolve, testPath } from "$lib/utils/history";
    
    import type { RouteEntry } from ".";
    import Routes from "./component.svelte";

    interface $$Props {
        load?: Component;
        error?: Component;
        routes: RouteEntry[];
        base?: string;
        fallback?: Component;
    }

    const { load, error, routes, base = "/", fallback }: $$Props = $props();

    let route = $state(getCurrentRoute());

    const {currentRoute, params, query} = $derived.by(() => {
        const { path, query } = route;

        let candidate = null as null | {
            currentRoute: RouteEntry | null;
            params: Record<string, string>;
        };

        for (const route of routes) {
            const entirePattern = resolve(base, route.path).path;
            const { params, result: matchResult } = testPath(path, entirePattern);

            if (matchResult >= PathTestResult.Partial) { // 部分或完全符合
                if (matchResult === PathTestResult.Exact) // 完全符合
                    return { currentRoute: route, params, query };
                if (!candidate && !route.exact) // 優先選擇完全符合的路由
                    candidate = { currentRoute: route, params: {} };
            }
        }
        
        if (!candidate)
            console.warn(`[WRN] No route matched for path: ${path.join("/")}`);

        return { ...candidate, path, query };
    });
</script>

<svelte:window on:hashchange={() => route = getCurrentRoute()} />

{#if currentRoute}
    {#await Promise.all([currentRoute.getComponent(), currentRoute.getProps?.()])}
        {#if load}
            {@const LoadComponent = load}
            <LoadComponent />
        {/if}
    {:then [RouteComponent, routeProps]}
        <RouteComponent {params} {query} {...routeProps} >
            {#if currentRoute.children}
                <Routes {load} {error} {fallback} routes={currentRoute.children} base={"/" + resolve(base, currentRoute.path).path.join("/")} />
            {/if}
        </RouteComponent>
    {:catch err}
        {#if error}
            {@const ErrorComponent = error}
            <ErrorComponent {err} />
        {/if}
    {/await}
{:else}
    {#if fallback}
        {@const FallbackComponent = fallback}
        <FallbackComponent />
    {/if}
{/if}