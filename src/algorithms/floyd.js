import { weightsFloyd, hex2rgb, rgb2lrgb, rgb2cielab, rgb2oklab, lrgb2cielab, lrgb2oklab, closestLabIdx, closestRGBIdx } from "./math.js";
import { SPACE, wenting } from "../config.js";

function convertPalette(hexPalette, space) {
    switch (space) {
        case SPACE.lRGB:
            return hexPalette.map(hex => { const p = hex2rgb(hex); rgb2lrgb(p[0], p[1], p[2], p); return p;});
        case SPACE.CIELAB:
            return hexPalette.map(hex => { const p = hex2rgb(hex); rgb2cielab(p[0], p[1], p[2], p); return p;});
        case SPACE.OKLAB:
            return hexPalette.map(hex => { const p = hex2rgb(hex); rgb2oklab(p[0], p[1], p[2], p); return p;});
        default:
            return hexPalette.map(hex2rgb);
    }
}

function converPixel(pixel, fromSpace, toSpace) {
    if (fromSpace == toSpace) return;

    switch (fromSpace) {
        case SPACE.RGB:
            switch (toSpace) {
                case SPACE.lRGB: rgb2lrgb(pixel[0], pixel[1], pixel[2], pixel); return;
                case SPACE.CIELAB: rgb2cielab(pixel[0], pixel[1], pixel[2], pixel); return;
                case SPACE.OKLAB: rgb2oklab(pixel[0], pixel[1], pixel[2], pixel); return;
            }
        case SPACE.lRGB:
            switch (toSpace) {
                case SPACE.CIELAB: lrgb2cielab(pixel[0], pixel[1], pixel[2], pixel); return;
                case SPACE.OKLAB: lrgb2oklab(pixel[0], pixel[1], pixel[2], pixel); return;
            }
    }

    throw Error(`From ${fromSpace} to ${toSpace} not supported`);
}

export function dither(data, width, height, factor, palette, errSpace, distSpace, useCRA) {
    const spectraPalette = wenting.map(hex2rgb);
    const errPalette = convertPalette(palette, errSpace);
    const distPalette = convertPalette(palette, distSpace);

    // We pad to avoid bounds checking when distributing the error
    const paddedW = width + 2, paddedH = height + 1;

    // float32 buff for better speed
    const errBuff = new Float32Array(paddedW * paddedH * 3).fill(0)
    const pixel = new Float32Array(3).fill(0);
    const distPixel = new Float32Array(3).fill(0)

    for (let y = 0; y < height; y++) {
        const row = y * width
        for (let x = 0; x < width; x++) {
            const dIdx = (row + x) * 4;

            // Get the image pixel in RGB
            pixel[0] = data[dIdx];      // R
            pixel[1] = data[dIdx + 1];  // G
            pixel[2] = data[dIdx + 2];  // B

            // Convert to the error diffusion color space
            converPixel(pixel, SPACE.RGB, errSpace);

            // Add the error from previous pixels
            if (factor > 0) {
                const eIdx = (y * paddedW + x) * 3;
                pixel[0] += errBuff[eIdx];
                pixel[1] += errBuff[eIdx+1];
                pixel[2] += errBuff[eIdx+2];

                if (errSpace == SPACE.lRGB) {
                    pixel[0] = Math.max(0, Math.min(1, pixel[0]));
                    pixel[1] = Math.max(0, Math.min(1, pixel[1]));
                    pixel[2] = Math.max(0, Math.min(1, pixel[2]));
                }
            }


            // Calculate pixel for distance calculation (including error)
            distPixel[0] = pixel[0]
            distPixel[1] = pixel[1]
            distPixel[2] = pixel[2]
            converPixel(distPixel, errSpace, distSpace);

            // Find closest color
            const distRGB = distSpace == SPACE.RGB || distSpace == SPACE.lRGB;
            const paletteIdx = distRGB ? closestRGBIdx(distPixel, distPalette) : closestLabIdx(distPixel, distPalette, useCRA);
            const difPixel = errPalette[paletteIdx];
            
            // Distribute the error to the next pixels
            if (factor > 0) { 
                const err0 = (pixel[0] - difPixel[0]) * factor;
                const err1 = (pixel[1] - difPixel[1]) * factor;
                const err2 = (pixel[2] - difPixel[2]) * factor;

                for (const w of weightsFloyd) {
                    const nx = x + w.dx;
                    const ny = y + w.dy;

                    const nIdx = (ny * paddedW + nx) * 3;
                    errBuff[nIdx] += err0 * w.weight;
                    errBuff[nIdx+1] += err1 * w.weight;
                    errBuff[nIdx+2] += err2 * w.weight;
                }
            }

            // Update pixel to real color
            const spectraPixel = spectraPalette[paletteIdx % 6];
            data[dIdx] = spectraPixel[0];
            data[dIdx + 1] = spectraPixel[1];
            data[dIdx + 2] = spectraPixel[2];
        }
    }

}