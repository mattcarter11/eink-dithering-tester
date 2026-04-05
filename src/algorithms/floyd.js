import { SPACE, hex2rgb } from "../math/space.js";
import { spectra } from "../config.js";
import { convertPalette, converPixel, closestIdx, WEIGHTS_FLOYD} from './helper.js'

/**
 * Floyd–Steinberg dithering with optional blue-noise pre-dithering.
 *
 * Blue noise works by adding a spatially-uniform high-frequency offset to each
 * pixel *before* quantization.  This breaks up the low-frequency error patterns
 * that FSD tends to create (the diagonal "worms") without sacrificing the
 * overall accuracy that pure ordered dithering lacks.
 *
 * The offset is scaled by `blueNoiseFactor` × one quantization step width so
 * that it nudges pixels across palette boundaries organically.
 *
 * @param {Uint8ClampedArray} data - RGB image data
 * @param {number} width - Image widht
 * @param {number} height - Image heigh
 * @param {number} factor - FSD error diffusion strength (0 = none, 1 = full)
 * @param {string[]} hexPalette - Pallete used to dither
 * @param {string} errSpace - Color space for error accumulation
 * @param {string} distSpace - Color space for nearest-color lookup
 */
export function dither(data, width, height, factor, hexPalette, errSpace, distSpace) {
    const spectraPalette = spectra.map(hex2rgb);
    const errPalette = convertPalette(hexPalette, errSpace);
    const distPalette = convertPalette(hexPalette, distSpace);

    // We pad to avoid bounds checking when distributing the error
    const paddedW = width + 2, paddedH = height + 1;

    // float32 buff for better speed
    const errBuff = new Float32Array(paddedW * paddedH * 3).fill(0)
    const errPixel = new Float32Array(3).fill(0);
    const distPixel = new Float32Array(3).fill(0)

    for (let y = 0; y < height; y++) {
        const row = y * width
        for (let x = 0; x < width; x++) {
            const dIdx = (row + x) * 4;

            // Get the image pixel in RGB
            errPixel[0] = data[dIdx];      // R
            errPixel[1] = data[dIdx + 1];  // G
            errPixel[2] = data[dIdx + 2];  // B

            // Convert to the error diffusion color space
            converPixel(errPixel, SPACE.RGB, errSpace);

            // Add the error from previous pixels
            if (factor > 0) {
                const eIdx = (y * paddedW + x) * 3;
                errPixel[0] += errBuff[eIdx];
                errPixel[1] += errBuff[eIdx+1];
                errPixel[2] += errBuff[eIdx+2];
                
                if (errSpace == SPACE.lRGB) {
                    errPixel[0] = Math.max(0, Math.min(1, errPixel[0]));
                    errPixel[1] = Math.max(0, Math.min(1, errPixel[1]));
                    errPixel[2] = Math.max(0, Math.min(1, errPixel[2]));
                }
            }

            // Calculate pixel for distance calculation (including error)
            distPixel[0] = errPixel[0]
            distPixel[1] = errPixel[1]
            distPixel[2] = errPixel[2]
            converPixel(distPixel, errSpace, distSpace);

            // Find closest color
            const paletteIdx = closestIdx(distSpace, distPixel, distPalette);
            const targetPixel = errPalette[paletteIdx];
            
            // Distribute the error to the next pixels
            if (factor > 0) { 
                const err0 = (errPixel[0] - targetPixel[0]) * factor;
                const err1 = (errPixel[1] - targetPixel[1]) * factor;
                const err2 = (errPixel[2] - targetPixel[2]) * factor;

                for (const w of WEIGHTS_FLOYD) {
                    const nx = x + w.dx;
                    const ny = y + w.dy;

                    const nIdx = (ny * paddedW + nx) * 3;
                    errBuff[nIdx] += err0 * w.w;
                    errBuff[nIdx+1] += err1 * w.w;
                    errBuff[nIdx+2] += err2 * w.w;
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