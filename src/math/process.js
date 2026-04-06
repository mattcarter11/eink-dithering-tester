/** Convert image to grayscale and normalized [0, 1] range 
 * @param {Uint8ClampedArray} data - Image data (RGBA)
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {Float32Array} Grayscale image data normalized to [0, 1]
 */
export function grayNormalized(data, width, height) {
    const gray = new Float32Array(width * height);
    
    // Convert to grayscale using luminance formula
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            // Standard luminance: 0.299R + 0.587G + 0.114B
            gray[y * width + x] = (0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]) / 255;
        }
    }

    return gray;
}

/**
 * Calculate standard 3x3 Laplacian of the image for structural information
 * Kernel: [0, -1, 0; -1, 4, -1; 0, -1, 0]
 * 
 * @param {Float32Array} grayData - Image data (grayscale normalized to [0, 1])
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {number} clipValue - Maximum absolute value for Laplacian (0.5 by default)
 * @returns {Float32Array} Laplacian filtered image 
 */
export function laplacianNormalized(grayData, width, height, clipValue = 0.5) {
    /*Apply standard 3x3 Laplacian kernel
        [ 0, -1,  0]
        [-1,  4, -1]
        [ 0, -1,  0]
    */

    const laplacian = new Float32Array(width * height);
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            laplacian[y * width + x] =
                4 * grayData[y * width + x]
                - grayData[(y - 1) * width + x]
                - grayData[(y + 1) * width + x]
                - grayData[y * width + (x - 1)]
                - grayData[y * width + (x + 1)]
        }
    }
    
    return laplacian.map(v => Math.max(-clipValue, Math.min(clipValue, v)));
}