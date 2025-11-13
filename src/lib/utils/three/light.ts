import { Color } from "three";

export function wattToIntensity(watt: number, efficiency: number | "incandescent" | "led" = "led"): number {
    switch (efficiency) {
        case "incandescent":
            efficiency = 17;
            break;
        case "led":
            efficiency = 90;
            break;
    }
    
    return watt * efficiency / Math.PI / 4;
}

export function temperatureColor(kelvin: number): Color {
    const temp = kelvin / 100;

    let r: number, g: number, b: number;

    // Calculate Red
    if (temp <= 66) {
        r = 255;
    } else {
        r = temp - 60;
        r = 329.698727446 * Math.pow(r, -0.1332047592);
        if (r < 0) r = 0;
        if (r > 255) r = 255;
    }

    // Calculate Green
    if (temp <= 66) {
        g = temp;
        g = 99.4708025861 * Math.log(g) - 161.1195681661;
    } else {
        g = temp - 60;
        g = 288.1221695283 * Math.pow(g, -0.0755148492);
    }
    if (g < 0) g = 0;
    if (g > 255) g = 255;

    // Calculate Blue
    if (temp >= 66) {
        b = 255;
    } else {
        if (temp <= 19) {
            b = 0;
        } else {
            b = temp - 10;
            b = 138.5177312231 * Math.log(b) - 305.0447927307;
            if (b < 0) b = 0;
            if (b > 255) b = 255;
        }
    }

    return new Color(r / 255, g / 255, b / 255);
}