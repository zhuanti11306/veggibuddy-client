export interface Drawable {
    update?(deltatime: number): void;
    render(): void;
    loadResources?(): Promise<void>;
    unloadResources?(): Promise<void>;
}