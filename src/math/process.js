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



/**
 * Optimized local standard deviation using running sums
 * This matches scipy.ndimage.uniform_filter performance characteristics
 * 
 * @param {Float32Array} grayData - Image data (grayscale normalized to [0, 1])
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {number} radius - Radius of the window (window size = radius*2 + 1)
 * @returns {Float32Array} Local standard deviation map
 */
export function localStdDev(grayData, width, height, radius) {
    const result = new Float32Array(width * height);
    const windowSize = radius * 2 + 1;
    
    // Step 1: Horizontal running sums
    const horizSum = new Float32Array(width * height);
    const horizSumSq = new Float32Array(width * height);
    
    for (let y = 0; y < height; y++) {
        let sum = 0;
        let sumSq = 0;
        const rowStart = y * width;
        
        // Initial window
        for (let x = 0; x <= radius && x < width; x++) {
            const val = grayData[rowStart + x];
            sum += val;
            sumSq += val * val;
        }
        
        horizSum[rowStart] = sum;
        horizSumSq[rowStart] = sumSq;
        
        // Slide horizontally
        for (let x = 1; x < width; x++) {
            const removeIdx = x - 1;
            const addIdx = x + radius;
            
            const removeVal = grayData[rowStart + removeIdx];
            sum -= removeVal;
            sumSq -= removeVal * removeVal;
            
            if (addIdx < width) {
                const addVal = grayData[rowStart + addIdx];
                sum += addVal;
                sumSq += addVal * addVal;
            }
            
            horizSum[rowStart + x] = sum;
            horizSumSq[rowStart + x] = sumSq;
        }
    }
    
    // Step 2: Vertical running sums
    for (let x = 0; x < width; x++) {
        let sum = 0;
        let sumSq = 0;
        
        // Initial window
        for (let y = 0; y <= radius && y < height; y++) {
            const idx = y * width + x;
            sum += horizSum[idx];
            sumSq += horizSumSq[idx];
        }
        
        const actualWidth = Math.min(width, windowSize);
        let actualHeight = Math.min(height, radius + 1);
        let pixelCount = actualWidth * actualHeight;
        
        let mean = sum / pixelCount;
        let variance = (sumSq / pixelCount) - (mean * mean);
        result[x] = Math.sqrt(Math.max(0, variance));
        
        // Slide vertically
        for (let y = 1; y < height; y++) {
            const removeIdx = (y - 1) * width + x;
            const addIdx = (y + radius) * width + x;
            
            sum -= horizSum[removeIdx];
            sumSq -= horizSumSq[removeIdx];
            
            if (y + radius < height) {
                sum += horizSum[addIdx];
                sumSq += horizSumSq[addIdx];
                actualHeight = Math.min(height - y, radius + 1);
                pixelCount = actualWidth * actualHeight;
            }
            
            mean = sum / pixelCount;
            variance = (sumSq / pixelCount) - (mean * mean);
            result[y * width + x] = Math.sqrt(Math.max(0, variance));
        }
    }
    
    return result;
}

/**
 * Calculate global standard deviation of an image
 * @param {Float32Array} grayData - Image data (grayscale normalized to [0, 1])
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {number} Global standard deviation
 */
export function globalStdDev(grayData, width, height) {
    let sum = 0;
    let sumSq = 0;
    const total = width * height;
    
    for (let i = 0; i < total; i++) {
        const val = grayData[i];
        sum += val;
        sumSq += val * val;
    }
    
    const mean = sum / total;
    const variance = (sumSq / total) - (mean * mean);
    return Math.sqrt(variance);
}