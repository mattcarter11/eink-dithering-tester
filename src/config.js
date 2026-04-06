import { SPACE } from "./math/space.js";
import { createConfig } from "./dither.js";

// --- Display ---

export const DISPLAY_WIDTH    = 480;
export const DISPLAY_HEIGHT   = 800;
export const USE_SOURCE_SIZE  = false;
export const DITHER_FACTOR    = 0.85;

// --- Palettes ---

const rgb        = ['#000000', '#ffffff', '#ffff00', '#ff0000', '#0000ff', '#00ff00'];
const wenting    = ['#2e2c42', '#d3d6cd', '#d9c701', '#b11d19', '#316ac1', '#5c8a5b'];

const paperless  = ["#191E21", "#e8e8e8", "#efde44", "#b21318", "#2157ba", "#125f20"];
const photoframe = ["#020202", "#bec8c8", "#cdca00", "#871300", "#05409e", "#27663c"];
const full       = wenting.concat(rgb);
export const spectra = wenting;

export const palettes = {
    RGB: rgb,
    Wenting: wenting,
    Full: full,
    Paperless: paperless,
    Photoframe: photoframe,
}


// --- Initial Images ---

export const INITIAL_IMAGES = [
    'test-imgs/rainbow_granger.png'
    // 'test-imgs/land sized.png',
    // 'test-imgs/arcane sized.png',
    // 'test-imgs/land crop.png',
    // 'test-imgs/land crop 2.png',
];


// --- Configs ---

/* Notes:
 - Why not use RGB palette -> The image will be unsaturated
 - Why not dither in lRGB errSpace -> We loose gamma (human eye perception)
*/

export const configs = [

    /* D: RGB   E: RGB */
    createConfig(rgb, SPACE.RGB, SPACE.RGB, true),
    createConfig(rgb, SPACE.RGB, SPACE.lRGB),

    createConfig(full, SPACE.RGB, SPACE.RGB), // 👑 Full is best, it has more detail (but sometimes wenting is better)
    createConfig(full, SPACE.RGB, SPACE.lRGB), // 👑 Full is best, it has more detail (but sometimes wenting is better)

    /* D: CEILAB */
    // createConfig(wenting, SPACE.CIELAB, SPACE.RGB), 
    // createConfig(wenting, SPACE.CIELAB, SPACE.lRGB), 
    // createConfig(wenting, SPACE.CIELAB, SPACE.CIELAB), 

    createConfig(full, SPACE.CIELAB, SPACE.RGB), // 👑
    createConfig(full, SPACE.CIELAB, SPACE.lRGB), // Blue shift -> it should best from what i've read
    // createConfig(full, SPACE.CIELAB, SPACE.CIELAB), // Blue shift


    /* D: OKLAB */
    // createConfig(wenting, SPACE.OKLAB, SPACE.RGB),
    // createConfig(wenting, SPACE.OKLAB, SPACE.lRGB),
    // createConfig(wenting, SPACE.OKLAB, SPACE.OKLAB),

    // createConfig(full, SPACE.OKLAB, SPACE.RGB),
    // createConfig(full, SPACE.OKLAB, SPACE.lRGB),
    // createConfig(full, SPACE.OKLAB, SPACE.OKLAB),
];


// --- Displays ---
export const displaysIp = ['192.168.1.177', '192.168.1.182']
