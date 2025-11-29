
interface Settings {
    sound: boolean;
    music: boolean;
}

const settingsRaw = localStorage.getItem("veggibuddy-settings");

const settings: Settings = $state(
    settingsRaw
        ? JSON.parse(settingsRaw)
        : { sound: true, music: true }
);

const settingsProxyHandler = {
    set(target: Settings, prop: keyof Settings, value: boolean) {
        target[prop] = value;
        localStorage.setItem("veggibuddy-settings", JSON.stringify(target));
        return true;
    }
};

export default new Proxy(settings, settingsProxyHandler);

