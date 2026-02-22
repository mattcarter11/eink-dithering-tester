import { DISPLAY_WIDTH, DISPLAY_HEIGHT, DITHER_FACTOR, ALGORITHM_TYPES } from "./config.js";
import { ditherFloydRGB } from "./algorithms/floydRGB.js";
import { ditherFloydLab } from "./algorithms/floydLab.js";
import { ditherFloydLabErrRGB } from "./algorithms/floydLabErrRGB.js";

// Returns { width, height, x, y } to fit `img` inside the display, centered.
export function getScaledDimensions(img) {
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
export function processImage(img, conf, outputCanvas) {
    const inputCanvas = document.createElement('canvas');
    inputCanvas.width  = DISPLAY_WIDTH;
    inputCanvas.height = DISPLAY_HEIGHT;
    const ctx = inputCanvas.getContext('2d');

    // Pre process data
    drawFitImage(ctx, img, conf.preboost );
    
    const t0 = performance.now();

    const imageData = ctx.getImageData(0, 0, DISPLAY_WIDTH, DISPLAY_HEIGHT);
    const data = imageData.data;

    switch (conf.type) {
        case ALGORITHM_TYPES.floydRGB:        ditherFloydRGB(data, DISPLAY_WIDTH, DISPLAY_HEIGHT, conf.palette, DITHER_FACTOR); break;
        case ALGORITHM_TYPES.floydLab:        ditherFloydLab(data, DISPLAY_WIDTH, DISPLAY_HEIGHT, conf.palette, DITHER_FACTOR); break;
        case ALGORITHM_TYPES.floydLabErrRGB:  ditherFloydLabErrRGB(data, DISPLAY_WIDTH, DISPLAY_HEIGHT, conf.palette, DITHER_FACTOR); break;
    }
    
    outputCanvas.width = DISPLAY_WIDTH;
    outputCanvas.height = DISPLAY_HEIGHT;
    outputCanvas.getContext('2d').putImageData(imageData, 0, 0);

    return performance.now() - t0;
}
