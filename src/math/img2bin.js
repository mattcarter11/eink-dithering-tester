import { hex2rgb } from './space.js';
import { spectra } from '../config.js'

const palette = spectra.map(hex2rgb);
const paletteToNibble = [ 0x0, 0x1, 0x2, 0x3, 0x5, 0x6 ];

export function getDitheredImageBin(data, width, height) {
    const flippedData = new Uint8ClampedArray(data.length);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const srcIndex = (y * width + x) * 4;
            const destX = y;
            const destY = width - 1 - x;
            const destIndex = (destY * height + destX) * 4;

            flippedData[destIndex] = data[srcIndex];
            flippedData[destIndex + 1] = data[srcIndex + 1];
            flippedData[destIndex + 2] = data[srcIndex + 2];
            flippedData[destIndex + 3] = data[srcIndex + 3];
        }
    }
    data = flippedData;

    const binArray = new Uint8Array(width * height / 2);

    for (let i = 0, j = 0; i < data.length; i += 8, j++) {
        const highNibble = rgbToNibble(data[i], data[i + 1], data[i + 2]);
        const lowNibble = rgbToNibble(data[i + 4], data[i + 5], data[i + 6]);
        binArray[j] = (highNibble << 4) | lowNibble;
    }

    return binArray;
}

function rgbToNibble(r, g, b) {
    for (let i = 0; i < palette.length; i++) {
        const color = palette[i];
        if (r == color[0] && g == color[1] && b == color[2]) {
            return paletteToNibble[i];
        }
    }
    throw Error(`Color ${r}, ${g}, ${b} not found in palette`);
}