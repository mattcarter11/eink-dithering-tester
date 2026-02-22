import { hex2rgb, rgbToLab, closestColorIdxLab, weightsFloyd, spectraPalette } from "./common.js";

export function ditherFloydLab(inputCanvas, outputCanvas, hexPalette, factor) {
    const rgbPalette = hexPalette.map(hex2rgb)
    const labPalette = rgbPalette.map(([r,g,b]) => rgbToLab(r, g, b))
    const width = inputCanvas.width;
    const height = inputCanvas.height;

    // Process data
    const tmpCtx = inputCanvas.getContext('2d');
    const imageData = tmpCtx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Separate error buffers of float32 for better speed
    const errBufL = new Float32Array(width * height).fill(0)
    const errBufA = new Float32Array(width * height).fill(0)
    const errBufB = new Float32Array(width * height).fill(0)
    
    // Floyd-Steinberg error diffusion
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const errIdx = y * width + x
            const idx = errIdx * 4;
            
            const r = data[idx], g = data[idx + 1], b = data[idx + 2];

            const labPixel = rgbToLab(r, g, b);

            // Add error for previous pixels
            labPixel[0] += errBufL[errIdx];
            labPixel[1] += errBufA[errIdx];
            labPixel[2] += errBufB[errIdx];

            // Calculate newPixel
            const paletteIdx = closestColorIdxLab(labPixel, labPalette);

            // Distribute the error to the next pixels
            const newPixel = labPalette[paletteIdx];
            const errL = (labPixel[0] - newPixel[0]) * factor;
            const errA = (labPixel[1] - newPixel[1]) * factor;
            const errB = (labPixel[2] - newPixel[2]) * factor;

            for (const { dx, dy, weight } of weightsFloyd) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    const neighborErrIdx = ny * width + nx;
                    errBufL[neighborErrIdx] += errL * weight;
                    errBufA[neighborErrIdx] += errA * weight;
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

    outputCanvas.width = width;
    outputCanvas.height = height;
    outputCanvas.getContext('2d').putImageData(imageData, 0, 0);
}