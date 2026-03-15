import { SPACE } from "./math/space.js";
import { createConfig } from "./dither.js";

// --- Display ---

export const DISPLAY_WIDTH  = 480;
export const DISPLAY_HEIGHT = 800;
export const DITHER_FACTOR  = 0.8;

// --- Palettes ---

const rgb        = ['#000000', '#ffffff', '#0000ff', '#00ff00', '#ff0000', '#ffff00'];
const wenting    = ['#2e2c42', '#d3d6cd', '#316ac1', '#5c8a5b', '#b11d19', '#d9c701'];
const paperless  = ["#191E21", "#e8e8e8", "#2157ba", "#125f20", "#b21318", "#efde44"];
const photoframe = ["#020202", "#bec8c8", "#05409e", "#27663c", "#871300", "#cdca00"];
const full       = wenting.concat(rgb);
export const spectra = wenting;

export const palettes = {
    RGB: rgb,
    Wenting: wenting,
    Full: full,
    Paperless: paperless,
    Photoframe: photoframe,
}


// --- Configs ---

/* Notes:
 - Why not use RGB palette -> The image will be unsaturated
 - Why not dither in lRGB errSpace -> We loose gamma (human eye perception)
*/

export const configs = [

    /* D: RGB   E: RGB */
    // createConfig(wenting, SPACE.RGB, SPACE.RGB),
    // createConfig(wenting, SPACE.RGB, SPACE.RGB, true),

    // createConfig(full, SPACE.RGB, SPACE.RGB), // 👑 Full is best, it has more detail
    // createConfig(full, SPACE.RGB, SPACE.RGB, true), // 👑 Full is best, it has more detail

    /* D: CEILAB   E: any   CRA: off */
    createConfig(wenting, SPACE.CIELAB, SPACE.RGB), // Lost of detail because out of palette gammut pixels
    createConfig(wenting, SPACE.CIELAB, SPACE.lRGB), // Lost of detail because out of palette gammut pixels
    createConfig(wenting, SPACE.CIELAB, SPACE.lRGB), // Lost of detail because out of palette gammut pixels
    createConfig(wenting, SPACE.CIELAB, SPACE.CIELAB), // Lost of detail because out of palette gammut pixels
    createConfig(wenting, SPACE.CIELAB, SPACE.CIELAB), // Lost of detail because out of palette gammut pixels

    // createConfig(full, SPACE.CIELAB, SPACE.RGB), // 👑
    // createConfig(full, SPACE.CIELAB, SPACE.lRGB), // Blue shift -> it should best from what i've read
    // createConfig(full, SPACE.CIELAB, SPACE.CIELAB), // Blue shift


    /* D: OKLAB   E: any  CRA: off*/
    // createConfig(wenting, SPACE.OKLAB, SPACE.RGB),
    // createConfig(wenting, SPACE.OKLAB, SPACE.lRGB),
    // createConfig(wenting, SPACE.OKLAB, SPACE.OKLAB),

    // createConfig(full, SPACE.OKLAB, SPACE.RGB),
    // createConfig(full, SPACE.OKLAB, SPACE.lRGB),
    // createConfig(full, SPACE.OKLAB, SPACE.OKLAB),
];
