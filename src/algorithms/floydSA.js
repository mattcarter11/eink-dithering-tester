// TODO: WIP testing


import { SPACE, hex2rgb } from "../math/space.js";
import { spectra } from "../config.js";
import { convertPalette, converPixel, closestIdx, WEIGHTS_FLOYD } from './helper.js'
import { grayNormalized, laplacianNormalized, localStdDev, globalStdDev } from '../math/process.js'

/**
 * Calculate gain parameter K[x,y] for low contrast preservation
 * K = (C / Σ) * (|σ - σ_max| / (σ_max - σ_min)) + C
 * 
 * @param {number} localStd - Local standard deviation at current pixel
 * @param {number} globalStd - Global standard deviation of entire image
 * @param {number} minStd - Global minimum of local standard deviations
 * @param {number} maxStd - Global maximum of local standard deviations
 * @param {number} C - Scale factor (default 5)
 * @returns {number} Gain parameter
 */
function calculateGain(localStd, globalStd, minStd, maxStd, C = 5) {
    if (maxStd === minStd) return C / globalStd + C;
    const normalized = Math.abs(localStd - maxStd) / (maxStd - minStd);
    return (C / globalStd) * normalized + C;
}

/**
 * Generate Gaussian random noise (Box-Muller transform)
 * @param {number} stdDev - Standard deviation
 * @returns {number} Gaussian noise value
 */
function gaussianNoise(stdDev) {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * stdDev;
}

/**
 * Laplacian-based structure-aware error diffusion dithering
 * 
 * Based on paper: "Laplacian Based Structure-Aware Error Diffusion" (ICIP 2010)
 * 
 * @param {Uint8ClampedArray} data - RGB image data
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {number} factor - Error diffusion strength (0 = none, 1 = full)
 * @param {string[]} hexPalette - Palette used for dithering
 * @param {string} errSpace - Color space for error accumulation
 * @param {string} distSpace - Color space for nearest-color lookup
 * @param {Object} options - Additional options
 * @param {number} options.C - Scale factor for gain (default: 5)
 * @param {number} options.laplacianMax - Max Laplacian normalized value for clipping (default: 0.5)
 * @param {number} options.noiseStd - Standard deviation for Gaussian noise (default: 0.1)
 * @param {number} options.radius - Radius for local std dev (default: 5, gives 11x11 window)
 */
export function ditherStructureAware(data, width, height, factor, hexPalette, errSpace, distSpace, options = {}) {
    const {
        C = 0.15,
        laplacianMax = 0.5,
        noiseStd = 0.1,
        radius = 5
    } = options;
    
    const spectraPalette = spectra.map(hex2rgb);
    const errPalette = convertPalette(hexPalette, errSpace);
    const distPalette = convertPalette(hexPalette, distSpace);
    
    // Step 1
    const gray = grayNormalized(data, width, height);
    const laplacian = laplacianNormalized(gray, width, height, laplacianMax);
    const globalStd = globalStdDev(gray, width, height);
    const localStdMap = localStdDev(gray, width, height, radius);
    
    // Step 2: Find global min/max of local standard deviations (as per paper)
    let globalMinStd = Infinity;
    let globalMaxStd = -Infinity;
    for (let i = 0; i < width * height; i++) {
        const std = localStdMap[i];
        if (std < globalMinStd) globalMinStd = std;
        if (std > globalMaxStd) globalMaxStd = std;
    }
    
    // Step 3: Error diffusion buffers (padded to avoid bounds checking)
    const paddedW = width + 2;
    const paddedH = height + 1;
    const errBuff = new Float32Array(paddedW * paddedH * 3).fill(0);
    const errPixel = new Float32Array(3);
    const distPixel = new Float32Array(3);
    
    // Step 4: Main processing loop
    for (let y = 0; y < height; y++) {
        const row = y * width;
           
        for (let x = 0; x < width; x++) {
            const dIdx = (row + x) * 4;
            const pixelIdx = y * width + x;
            
            // Get pixel and convert to error space
            errPixel[0] = data[dIdx];
            errPixel[1] = data[dIdx + 1];
            errPixel[2] = data[dIdx + 2];
            converPixel(errPixel, SPACE.RGB, errSpace);
            
            // Add accumulated error from previous pixels
            if (factor > 0) {
                const eIdx = (y * paddedW + x) * 3;
                errPixel[0] += errBuff[eIdx];
                errPixel[1] += errBuff[eIdx + 1];
                errPixel[2] += errBuff[eIdx + 2];
                
                // Clamp if in linear RGB space
                if (errSpace === SPACE.lRGB) {
                    errPixel[0] = Math.max(0, Math.min(1, errPixel[0]));
                    errPixel[1] = Math.max(0, Math.min(1, errPixel[1]));
                    errPixel[2] = Math.max(0, Math.min(1, errPixel[2]));
                }
            }
            
            // === Threshold modulation (structure-aware) ===
            const localStd = localStdMap[pixelIdx];
            const gain = calculateGain(localStd, globalStd, globalMinStd, globalMaxStd, C);
            const T_s = gain * laplacian[pixelIdx];
            const T_A = 0; //gaussianNoise(noiseStd);
            const threshold = T_s + T_A;
            
            // Apply threshold modulation to the pixel
            const modulatedPixel = [
                errPixel[0] + threshold,
                errPixel[1] + threshold,
                errPixel[2] + threshold
            ];
            
            // Convert to distance space and find closest color
            distPixel[0] = modulatedPixel[0];
            distPixel[1] = modulatedPixel[1];
            distPixel[2] = modulatedPixel[2];
            converPixel(distPixel, errSpace, distSpace);
            
            const paletteIdx = closestIdx(distSpace, distPixel, distPalette);
            const difPixel = errPalette[paletteIdx];
            
            // Distribute quantization error to future pixels
            if (factor > 0) {
                const err0 = (errPixel[0] - difPixel[0]) * factor;
                const err1 = (errPixel[1] - difPixel[1]) * factor;
                const err2 = (errPixel[2] - difPixel[2]) * factor;
                
                for (const w of WEIGHTS_FLOYD) {
                    let dx = w.dx;
                    const nx = x + dx;
                    const ny = y + w.dy;
                    
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        const nIdx = (ny * paddedW + nx) * 3;
                        errBuff[nIdx] += err0 * w.w;
                        errBuff[nIdx + 1] += err1 * w.w;
                        errBuff[nIdx + 2] += err2 * w.w;
                    }
                }
            }
            
            // Write output pixel
            const spectraPixel = spectraPalette[paletteIdx % 6];
            data[dIdx] = spectraPixel[0];
            data[dIdx + 1] = spectraPixel[1];
            data[dIdx + 2] = spectraPixel[2];
        }
    }
}