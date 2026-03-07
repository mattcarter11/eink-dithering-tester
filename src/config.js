import { SPACE } from "./math/space.js";
import { createConfig } from "./dither.js";

// --- Display ---

export const DISPLAY_WIDTH  = 480;
export const DISPLAY_HEIGHT = 800;
export const DITHER_FACTOR  = 0.8;

// --- Palettes ---

const rgb       = ['#000000', '#ffffff', '#0000ff', '#00ff00', '#ff0000', '#ffff00'];
const wenting   = ['#2e2c42', '#d3d6cd', '#316ac1', '#5c8a5b', '#b11d19', '#d9c701'];
const full      = wenting.concat(rgb);
const paperless = ["#191E21", "#e8e8e8", "#2157ba", "#125f20", "#b21318", "#efde44"];
const photoframe= ["#020202", "#bec8c8", "#05409e", "#27663c", "#871300", "#cdca00"];

export const palettes = {
    RGB: rgb,
    Wenting: wenting,
    Full: full,
    Paperless: paperless,
    Photoframe: photoframe,
}

export { wenting }

// --- Configs ---

export const configs = [
    
    /* D: RGB   E: RGB */
    // createConfig(rgb, SPACE.RGB, SPACE.RGB), // Full is best
    // createConfig(rgb, SPACE.RGB, SPACE.RGB, true ), // Full is best

    // createConfig(wenting, SPACE.RGB, SPACE.RGB), // Full is best
    // createConfig(wenting, SPACE.RGB, SPACE.RGB, true), // Full is best

    // createConfig(full, SPACE.RGB, SPACE.RGB), // 👑
    // createConfig(full, SPACE.RGB, SPACE.RGB, true), // 👑


    /* D: CEILAB   E: any   CRA: off */
    createConfig(rgb, SPACE.CIELAB, SPACE.RGB), // Unsaturated because its not the real palette
    // createConfig(rgb, SPACE.CIELAB, SPACE.lRGB), // Unsaturated because its not the real palette
    // createConfig(rgb, SPACE.CIELAB, SPACE.CIELAB), // Unsaturated because its not the real palette
    
    createConfig(wenting, SPACE.CIELAB, SPACE.RGB), // Lost of detail because out of palette gammut pixels
    // createConfig(wenting, SPACE.CIELAB, SPACE.lRGB), // Lost of detail because out of palette gammut pixels
    // createConfig(wenting, SPACE.CIELAB, SPACE.CIELAB), // Lost of detail because out of palette gammut pixels

    createConfig(full, SPACE.CIELAB, SPACE.RGB), // 👑
    // createConfig(full, SPACE.CIELAB, SPACE.lRGB), // Blue shift -> it should best from what i've read
    // createConfig(full, SPACE.CIELAB, SPACE.CIELAB), // Blue shift


    /* D: CEILAB   E: any   CRA: on */
    // createConfig(full, SPACE.CIELAB, SPACE.RGB, false, true), // 👑
    // createConfig(full, SPACE.CIELAB, SPACE.lRGB, false, true), // Blue shift -> it should best from what i've read
    // createConfig(full, SPACE.CIELAB, SPACE.CIELAB, false, true), // Blue shift


    /* D: OKLAB   E: any  CRA: off*/
    // createConfig(full, SPACE.OKLAB, SPACE.RGB),
    // createConfig(full, SPACE.OKLAB, SPACE.lRGB),
    // createConfig(full, SPACE.OKLAB, SPACE.OKLAB),


    /* D: OKLAB   E: any  CRA: off*/
    // createConfig(full, SPACE.OKLAB, SPACE.RGB, false, true),
    // createConfig(full, SPACE.OKLAB, SPACE.lRGB, false, true),
    // createConfig(full, SPACE.OKLAB, SPACE.OKLAB, false, true),
];
