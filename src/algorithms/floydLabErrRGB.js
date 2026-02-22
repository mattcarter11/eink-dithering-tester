import { hex2rgb, rgbToLab, closestColorIdxLab, weightsFloyd, spectraPalette } from "./common.js";

export function ditherFloydLabErrRGB(data, width, height, hexPalette, factor) {
    const rgbPalette = hexPalette.map(hex2rgb);
    const labPalette = rgbPalette.map(([r,g,b]) => rgbToLab(r, g, b))

    // Separate error buffers of float32 for better speed
    const errBufR = new Float32Array(width * height).fill(0)
    const errBufG = new Float32Array(width * height).fill(0)
    const errBufB = new Float32Array(width * height).fill(0)
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const errIdx = y * width + x
            const idx = errIdx * 4;
            
            const r = data[idx] + errBufR[errIdx];
            const g = data[idx + 1] + errBufG[errIdx];
            const b = data[idx + 2] + errBufB[errIdx];

            // Calculate newPixel
            const labPixel = rgbToLab(r, g, b);
            const paletteIdx = closestColorIdxLab(labPixel, labPalette);
            const mappedPixel = rgbPalette[paletteIdx];

            // Distribute the error to the next pixels
            const errR = (r - mappedPixel[0]) * factor;
            const errG = (g - mappedPixel[1]) * factor;
            const errB = (b - mappedPixel[2]) * factor;

            for (const { dx, dy, weight } of weightsFloyd) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    const neighborErrIdx = ny * width + nx;
                    errBufR[neighborErrIdx] += errR * weight;
                    errBufG[neighborErrIdx] += errG * weight;
                    errBufB[neighborErrIdx] += errB * weight;
                }
            }

            // Update pixel to real color
            const spectraPixel = spectraPalette[paletteIdx % 6];
            data[idx] = spectraPixel[0];
            data[idx + 1] = spectraPixel[1];
            data[idx + 2] = spectraPixel[2];
        }
    }
}