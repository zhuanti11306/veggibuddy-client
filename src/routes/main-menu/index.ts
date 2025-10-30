
import { writable } from "svelte/store";

import { assets } from "$lib/services";
import { sleep } from "$lib/utils/sleep";

// UI 狀態管理
interface UIState {
    isLoading: boolean;
    loadingMessage: string | null;
    notifications: Notification[];
}

interface Notification {
    id: string;
    type: "success" | "error" | "warning" | "info";
    message: string;
    duration?: number;
}

function createUIStore() {
    const { subscribe, set, update } = writable<UIState>({
        isLoading: false,
        loadingMessage: null,
        notifications: []
    });

    return {
        subscribe,

        setLoading: (isLoading: boolean, message?: string) => {
            update(state => ({
                ...state,
                isLoading,
                loadingMessage: isLoading ? (message ?? null) : null
            }));
        },

        addNotification: (notification: Omit<Notification, "id">) => {
            const id = crypto.randomUUID();
            const newNotification: Notification = {
                ...notification,
                id,
                duration: notification.duration ?? 5000
            };

            update(state => ({
                ...state,
                notifications: [...state.notifications, newNotification]
            }));

            // 自動移除通知
            if (newNotification.duration && newNotification.duration > 0) {
                setTimeout(() => {
                    update(state => ({
                        ...state,
                        notifications: state.notifications.filter(n => n.id !== id)
                    }));
                }, newNotification.duration);
            }

            return id;
        },

        removeNotification: (id: string) => {
            update(state => ({
                ...state,
                notifications: state.notifications.filter(n => n.id !== id)
            }));
        },

        clearNotifications: () => {
            update(state => ({
                ...state,
                notifications: []
            }));
        }
    };
}

export const uiState = createUIStore();

const assetLoading = Promise.all([assets.loadMainScreenIcons(), sleep(1500)]);
const hintShowing = sleep(3000);

export const showingLoadingScreen = Object.assign(Promise.all([assetLoading, hintShowing]), { assetLoading });

export { default } from "./page.svelte";