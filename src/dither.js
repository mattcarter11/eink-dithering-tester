function hex2rgb(hex) {
  hex = hex.replace('#','');
  return [
    parseInt(hex.slice(0,2),16),
    parseInt(hex.slice(2,4),16),
    parseInt(hex.slice(4,6),16)
  ];
}

function closestColorIdxLab(pixel, palette) {
    let minDist = Infinity;
    let closestIndex = 0;

    for (let i = 0; i < palette.length; i++) {
        const color = palette[i];
        const dL = color[0] - pixel[0], dA = color[1] - pixel[1], dB = color[2] - pixel[2];
        const dist = dL*dL + dA*dA + dB*dB;

        if (dist < minDist) {
            minDist = dist;
            closestIndex = i;
        }
    }

    return closestIndex;
}

function closestColorIdx(pixel, palette) {
    let minDist = Infinity;
    let closestIndex = 0;

    for (let i = 0; i < palette.length; i++) {
        const color = palette[i];
        const dR = color[0] - pixel[0], dG = color[1] - pixel[1], dB = color[2] - pixel[2];
        const dist = dR*dR + dG*dG + dB*dB;

        if (dist < minDist) {
            minDist = dist;
            closestIndex = i;
        }
    }

    return closestIndex;
}

function rgbToLab(r, g, b) {
    // https://kaizoudou.com/from-rgb-to-lab-color-space/

    // Normalize RGB values
    r /= 255;
    g /= 255;
    b /= 255;

    // Apply Gamma Correction - sRGB to Linear RGB
    r = (r > 0.04045) ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = (g > 0.04045) ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = (b > 0.04045) ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

    // Linear RGB to XYZ
    let x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
    let y = (r * 0.2126729 + g * 0.7151522 + b * 0.0721750) / 1.00000;
    let z = (r * 0.0193339 + g * 0.1191920 + b * 0.9503041) / 1.08883;

    // L*a*b* values (using D65 illuminant)
    x = (x > 0.008856) ? Math.pow(x, 1 / 3) : (7.787 * x) + 16 / 116;
    y = (y > 0.008856) ? Math.pow(y, 1 / 3) : (7.787 * y) + 16 / 116;
    z = (z > 0.008856) ? Math.pow(z, 1 / 3) : (7.787 * z) + 16 / 116;

    const lab = [
        (116 * y) - 16,
        500 * (x - y),
        200 * (y - z)
    ];

    return lab;
}

// Floyd-Steinberg error diffusion
const weights = [
    { dx: 1, dy: 0, weight: 7 / 16 },
    { dx: -1, dy: 1, weight: 3 / 16 },
    { dx: 0, dy: 1, weight: 5 / 16 },
    { dx: 1, dy: 1, weight: 1 / 16 }
];

export function ditherImageLab(inputCanvas, outputCanvas, hexPalette, factor) {
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
            const errL = labPixel[0] - newPixel[0];
            const errA = labPixel[1] - newPixel[1];
            const errB = labPixel[2] - newPixel[2];

            // Calculate new pixel
            const rgbPixel = rgbPalette[paletteIdx];
            data[idx] = rgbPixel[0];
            data[idx + 1] = rgbPixel[1];
            data[idx + 2] = rgbPixel[2];

            for (const { dx, dy, weight } of weights) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    const neighborErrIdx = ny * width + nx;
                    errBufL[neighborErrIdx] += errL * weight * factor;
                    errBufA[neighborErrIdx] += errA * weight * factor;
                    errBufB[neighborErrIdx] += errB * weight * factor;
                }
            }
        }
    }

    outputCanvas.width = width;
    outputCanvas.height = height;
    outputCanvas.getContext('2d').putImageData(imageData, 0, 0);
}

export function ditherImageLabOld(inputCanvas, outputCanvas, hexPalette, factor, clamp) {
    const rgbPalette = hexPalette.map(hex2rgb)
    const labPalette = rgbPalette.map(([r,g,b]) => rgbToLab(r, g, b))
    const width = inputCanvas.width;
    const height = inputCanvas.height;

    // Process data
    const tmpCtx = inputCanvas.getContext('2d');
    const imageData = tmpCtx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Separate error buffers of float32 for better speed
    const errBufR = new Float32Array(width * height).fill(0)
    const errBufG = new Float32Array(width * height).fill(0)
    const errBufB = new Float32Array(width * height).fill(0)
    
    // Floyd-Steinberg error diffusion
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const errIdx = y * width + x
            const idx = errIdx * 4;
            
            let r = data[idx] + errBufR[errIdx];
            let g = data[idx + 1] + errBufG[errIdx];
            let b = data[idx + 2] + errBufB[errIdx];

            if (clamp) {
                r = Math.max(0, Math.min(255, r));
                g = Math.max(0, Math.min(255, g));
                b = Math.max(0, Math.min(255, b));
            }

            // Calculate newPixel
            const labPixel = rgbToLab(r, g, b);
            const paletteIdx = closestColorIdxLab(labPixel, labPalette);

            // Distribute the error to the next pixels
            const mappedPixel = rgbPalette[paletteIdx];
            const errR = r - mappedPixel[0];
            const errG = g - mappedPixel[1];
            const errB = b - mappedPixel[2];
            
            // Calculate new pixel
            const newPixel = rgbPalette[paletteIdx];
            data[idx] = newPixel[0];
            data[idx + 1] = newPixel[1];
            data[idx + 2] = newPixel[2];

            for (const { dx, dy, weight } of weights) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    const neighborErrIdx = ny * width + nx;
                    errBufR[neighborErrIdx] += errR * weight * factor;
                    errBufG[neighborErrIdx] += errG * weight * factor;
                    errBufB[neighborErrIdx] += errB * weight * factor;
                }
            }
        }
    }

    outputCanvas.width = width;
    outputCanvas.height = height;
    outputCanvas.getContext('2d').putImageData(imageData, 0, 0);
}

export function ditherImageMine(inputCanvas, outputCanvas, hexPalette, factor) {
    const palette = hexPalette.map(hex2rgb);
    const width = inputCanvas.width;
    const height = inputCanvas.height;

    // Process data
    const tmpCtx = inputCanvas.getContext('2d');
    const imageData = tmpCtx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Separate error buffers of float32 for better speed
    const errBufR = new Float32Array(width * height).fill(0)
    const errBufG = new Float32Array(width * height).fill(0)
    const errBufB = new Float32Array(width * height).fill(0)
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = (y * width + x) * 4;
            
            const pixel = [
                data[index],        // R
                data[index + 1],    // G
                data[index + 2]     // B
            ];

            // Acomulated error for previous pixels
            const errIndex = (y * width + x)
            const pixelWithErr = [
                pixel[0] + errBufR[errIndex],
                pixel[1] + errBufG[errIndex],
                pixel[2] + errBufB[errIndex]
            ];
            
            // Update the pixel in the image data
            const paletteIdx = closestColorIdx(pixelWithErr, palette);
            
            // Distribute the error to the next pixels
            const newPixel = palette[paletteIdx];
            const quantError = [
                pixelWithErr[0] - newPixel[0],
                pixelWithErr[1] - newPixel[1],
                pixelWithErr[2] - newPixel[2]
            ];

            // Calculate new pixel
            data[index] = newPixel[0];
            data[index + 1] = newPixel[1];
            data[index + 2] = newPixel[2];

            for (const { dx, dy, weight } of weights) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    const neighborErrIdx = ny * width + nx;
                    errBufR[neighborErrIdx] += quantError[0] * weight * factor;
                    errBufG[neighborErrIdx] += quantError[1] * weight * factor;
                    errBufB[neighborErrIdx] += quantError[2] * weight * factor;
                }
            }
        }
    }

    outputCanvas.width = width;
    outputCanvas.height = height;
    outputCanvas.getContext('2d').putImageData(imageData, 0, 0);
}