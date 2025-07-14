import { Color } from "@/utilities/style/color";
import { ImageSource } from "@/utilities/style/url";

export type Position = { x: number, y: number }
export type VerticalPosition = "top" | "center" | "bottom";
export type HorizontalPosition = "left" | "center" | "right";

export interface BackgroundStyle {
    color?: string | Color;
    image?: ImageSource;
    position?: Position | VerticalPosition | HorizontalPosition | `${VerticalPosition} ${HorizontalPosition}`;
    size?: "cover" | "contain";
    repeat?: "no-repeat" | "repeat" | "repeat-x" | "repeat-y";
}