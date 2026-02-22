import { pWenting } from "./../config.js";

export const spectraPalette = pWenting.map(hex2rgb);

export function hex2rgb(hex) {
  hex = hex.replace('#','');
  return [
    parseInt(hex.slice(0,2),16),
    parseInt(hex.slice(2,4),16),
    parseInt(hex.slice(4,6),16)
  ];
}

export function closestColorIdxLab(pixel, palette) {
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

export function closestColorIdxRGB(pixel, palette) {
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

export function rgbToLab(r, g, b) {
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
export const weightsFloyd = [
    { dx: 1, dy: 0, weight: 7 / 16 },
    { dx: -1, dy: 1, weight: 3 / 16 },
    { dx: 0, dy: 1, weight: 5 / 16 },
    { dx: 1, dy: 1, weight: 1 / 16 }
];