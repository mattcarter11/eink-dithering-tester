import { DISPLAY_WIDTH, DISPLAY_HEIGHT, DITHER_FACTOR, palettes } from "./config.js";
import { dither } from "./algorithms/floyd.js";


// Returns { width, height, x, y } to fit `img` inside the display, centered.
function getScaledDimensions(img) {
    const scale = Math.max(DISPLAY_WIDTH / img.width, DISPLAY_HEIGHT / img.height);
    return {
        width:  img.width  * scale,
        height: img.height * scale,
        x: (DISPLAY_WIDTH  - img.width  * scale) / 2,
        y: (DISPLAY_HEIGHT - img.height * scale) / 2,
    };
}

// Draws `img` centered and fitted into `ctx`, optionally with a contrast/saturation boost.
export function drawFitImage(ctx, img, preboost = false) {
    const { width, height, x, y } = getScaledDimensions(img);
    if (preboost) ctx.filter = 'saturate(1.15) contrast(1.05)';
    ctx.drawImage(img, 0, 0, img.width, img.height, x, y, width, height);
    ctx.filter = 'none';
}

// Runs the dithering algorithm described by `algorithm` on `img` and writes
// the result to `outputCanvas`. Returns the elapsed time in ms.
export function processImageAndUpdateCanvas(img, config, outputCanvas, noDither = false) {
    outputCanvas.width  = DISPLAY_WIDTH;
    outputCanvas.height = DISPLAY_HEIGHT;
    const ctx = outputCanvas.getContext('2d');

    // Pre process data
    drawFitImage(ctx, img, config.preboost);
    
    const t0 = performance.now();

    const imageData = ctx.getImageData(0, 0, DISPLAY_WIDTH, DISPLAY_HEIGHT);
    const data = imageData.data;

    const factor = noDither ? 0 : DITHER_FACTOR;

    dither(data, DISPLAY_WIDTH, DISPLAY_HEIGHT, factor, config.palette, config.errSpace, config.distSpace);
    
    ctx.putImageData(imageData, 0, 0);

    return performance.now() - t0;
}


export function createConfig(palette, distSpace, errSpace, preboost = false) {
    const paletteName = Object.keys(palettes).find(k => palettes[k] === palette);
    let name = `E: ${errSpace}  D: ${distSpace} - 🎨 ${paletteName}`
    
    let mods = [];
    if (preboost) mods.push('⬆️');
    if (mods.length) name += ' - ' + mods.join(' & ');

    return { name, palette, errSpace, distSpace, preboost };
}