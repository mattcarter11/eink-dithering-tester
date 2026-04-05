import { DISPLAY_WIDTH, DISPLAY_HEIGHT, USE_SOURCE_SIZE, DITHER_FACTOR, palettes } from "./config.js";
import { dither } from "./algorithms/floyd.js";

// Returns the render canvas dimensions for `img`.
function getCanvasDimensions(img) {
    if (USE_SOURCE_SIZE) {
        return { width: img.width, height: img.height };
    }
    return { width: DISPLAY_WIDTH, height: DISPLAY_HEIGHT };
}

// Returns { width, height, x, y } to fit `img` inside the target canvas, centered.
function getScaledDimensions(img, canvasWidth, canvasHeight) {
    const scale = Math.max(canvasWidth / img.width, canvasHeight / img.height);
    return {
        width:  img.width  * scale,
        height: img.height * scale,
        x: (canvasWidth - img.width  * scale) / 2,
        y: (canvasHeight - img.height * scale) / 2,
    };
}

// Draws `img` centered and fitted into `ctx`, optionally with a contrast/saturation boost.
export function drawFitImage(ctx, img, preboost = false, canvasWidth = DISPLAY_WIDTH, canvasHeight = DISPLAY_HEIGHT) {
    const { width, height, x, y } = getScaledDimensions(img, canvasWidth, canvasHeight);
    if (preboost) ctx.filter = 'saturate(1.15) contrast(1.05)';
    ctx.drawImage(img, 0, 0, img.width, img.height, x, y, width, height);
    ctx.filter = 'none';
}

// Runs the dithering algorithm described by `algorithm` on `img` and writes
// the result to `outputCanvas`. Returns the elapsed time in ms.
export function processImageAndUpdateCanvas(img, config, outputCanvas, noDither = false) {
    const { width, height } = getCanvasDimensions(img);
    outputCanvas.width  = width;
    outputCanvas.height = height;
    const ctx = outputCanvas.getContext('2d');

    // Pre process data
    drawFitImage(ctx, img, config.preboost, width, height);
    
    const t0 = performance.now();

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const factor = noDither ? 0 : DITHER_FACTOR;

    dither(data, width, height, factor, config.palette, config.errSpace, config.distSpace);
    
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