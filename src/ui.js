import { DISPLAY_WIDTH, DISPLAY_HEIGHT, USE_SOURCE_SIZE, configs, displaysIp } from "./config.js";
import { state } from "./state.js";
import { drawFitImage, processImageAndUpdateCanvas } from "./dither.js";
import { showCanvas, updateThumbnail } from "./canvas.js";
import { updateVoteIndicators } from "./voting.js";
import { hex2rgb } from "./math/space.js";
import { buildGamut, vertexDistance } from "./math/gamut.js"
import { getDitheredImageBin } from "./math/img2bin.js";
import { grayNormalized, laplacianNormalized } from "./math/process.js";

export function showToast(type, message) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => container.removeChild(toast), 300);
    }, 3000);
}

const sourceCanvas      = document.getElementById('sourceCanvas');
const srcViewCanvas     = document.querySelector('#sourceView canvas');
const mappedCanvas      = document.querySelector('#mappedView canvas');
const inGamutCanvas     = document.querySelector('#inGamutView canvas');
const inGamutMaskCanvas = document.querySelector('#inGamutMaskView canvas');
const distanceCanvas    = document.querySelector('#distanceView canvas');
const edgeCanvas        = document.querySelector('#edgeView canvas');
const differenceCanvas  = document.querySelector('#differenceView canvas');

export const VIEW_IDS = {
    DITHERED: 'ditheredView',
    SOURCE: 'sourceView',
    MAPPED: 'mappedView',
    IN_GAMUT: 'inGamutView',
    IN_GAMUT_MASK: 'inGamutMaskView',
    DISTANCE: 'distanceView',
    EDGE: 'edgeView',
    DIFFERENCE: 'differenceView',
};

const ALL_VIEWS = Object.values(VIEW_IDS);
let currentView = VIEW_IDS.DITHERED;

function isImageLoaded() {
    return state.images.length > 0;
}

function getCurrentImage() {
    return state.images[state.currentImageIndex]?.image;
}

function getCanvasSize(img) {
    if (USE_SOURCE_SIZE) {
        return { width: img.width, height: img.height };
    }
    return { width: DISPLAY_WIDTH, height: DISPLAY_HEIGHT };
}

export function showView(viewId) {
    if (!ALL_VIEWS.includes(viewId)) return;

    currentView = viewId;
    ALL_VIEWS.forEach((view) => document.getElementById(view).classList.toggle('hidden', view !== viewId));

    if (!isImageLoaded()) return;

    switch (viewId) {
        case VIEW_IDS.MAPPED:
            updateMappedView();
            break;
        case VIEW_IDS.IN_GAMUT:
            updateInGamutView();
            break;
        case VIEW_IDS.IN_GAMUT_MASK:
            updateInGamutMaskView();
            break;
        case VIEW_IDS.DISTANCE:
            updateDistanceView();
            break;
        case VIEW_IDS.EDGE:
            updateEdgeView();
            break;
        case VIEW_IDS.DIFFERENCE:
            updateDifferenceView();
            break;
    }
}

export function refreshCurrentView() {
    if (!isImageLoaded()) return;
    if (currentView === VIEW_IDS.DITHERED || currentView === VIEW_IDS.SOURCE) return;
    showView(currentView);
}

window.addEventListener('selectedAlgorithmChanged', refreshCurrentView);

// Redraws the source image and re-runs all dithering algorithms for the current image.
export function renderCurrentImage() {
    if (state.images.length === 0) return;

    const img = getCurrentImage();
    
    // Draw into the main source canvas
    const { width, height } = getCanvasSize(img);
    sourceCanvas.width  = width;
    sourceCanvas.height = height;
    drawFitImage(sourceCanvas.getContext('2d'), img, false, width, height);

    // Rebuild the source view panel (shown on spacebar hold)
    updateSourceView();

    // Run every algorithm and update its canvas + thumbnail
    configs.forEach((conf, index) => {
        const canvas  = state.canvasContainers[index].querySelector('canvas');
        const elapsed = processImageAndUpdateCanvas(img, conf, canvas);
        updateThumbnail(index, canvas, elapsed);
    });

    showCanvas(state.selectedAlgorithmIndex);
    refreshCurrentView();
    updateImageInfo();
    updateVoteIndicators();
}

function updateSourceView() {
    const img = getCurrentImage();
    const { width, height } = getCanvasSize(img);
    srcViewCanvas.width  = width;
    srcViewCanvas.height = height;
    drawFitImage(srcViewCanvas.getContext('2d'), img, false, width, height);
}

export function updateMappedView() {
    const img = getCurrentImage();
    const config = configs[state.selectedAlgorithmIndex];
    processImageAndUpdateCanvas(img, config, mappedCanvas, true);
}

export function updateInGamutView() {
    const img = getCurrentImage();
    const palette = configs[state.selectedAlgorithmIndex].palette.map(hex2rgb);
    const gamut = buildGamut(palette);

    const { width, height } = getCanvasSize(img);
    inGamutCanvas.width  = width;
    inGamutCanvas.height = height;
    const ctx = inGamutCanvas.getContext('2d');
    drawFitImage(ctx, img, false, width, height);

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        if (!gamut.isInside([r, g, b])) {
            data[i]     = 0;
            data[i + 1] = 0;
            data[i + 2] = 0;
        }
    }

    ctx.putImageData(imageData, 0, 0);
}

// In-gamut mask: white = inside gamut, black = outside gamut
export function updateInGamutMaskView() {
    const img = getCurrentImage();
    const palette = configs[state.selectedAlgorithmIndex].palette.map(hex2rgb);
    const gamut = buildGamut(palette);

    const { width, height } = getCanvasSize(img);
    inGamutMaskCanvas.width  = width;
    inGamutMaskCanvas.height = height;
    const ctx = inGamutMaskCanvas.getContext('2d');
    drawFitImage(ctx, img, false, width, height);

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        if (gamut.isInside([r, g, b])) {
            // In gamut → white
            data[i]     = 255;
            data[i + 1] = 255;
            data[i + 2] = 255;
        } else {
            // Out of gamut → black
            data[i]     = 0;
            data[i + 1] = 0;
            data[i + 2] = 0;
        }
    }

    ctx.putImageData(imageData, 0, 0);
}

// Distance view: green = close to palette colors, red = far from palette colors
export function updateDistanceView() {
    const img = getCurrentImage();
    const palette = configs[state.selectedAlgorithmIndex].palette.map(hex2rgb);

    const { width, height } = getCanvasSize(img);
    distanceCanvas.width  = width;
    distanceCanvas.height = height;
    const ctx = distanceCanvas.getContext('2d');
    drawFitImage(ctx, img, false, width, height);

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // First pass: collect all distances to find the range
    const distances = new Float32Array(data.length / 4);
    let maxDist = 0;

    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const dist = vertexDistance([r, g, b], palette);
        distances[j] = dist;
        if (dist > maxDist) maxDist = dist;
    }

    // Second pass: map distance to green→red gradient
    // Smaller distance = closer to palette colors = greener
    // Larger distance = farther from palette colors = redder
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
        const dist = distances[j];
        const normalizedDist = maxDist > 0 ? dist / maxDist : 0;

        // Interpolate from green (0) to red (1)
        const red = Math.round(normalizedDist * 255);
        const green = Math.round((1 - normalizedDist) * 255);

        data[i]     = red;
        data[i + 1] = green;
        data[i + 2] = 0;
    }

    ctx.putImageData(imageData, 0, 0);
}

// Edge detection using a Laplacian filter on the source image
export function updateEdgeView() {
    const img = getCurrentImage();

    const { width, height } = getCanvasSize(img);
    edgeCanvas.width  = width;
    edgeCanvas.height = height;
    const ctx = edgeCanvas.getContext('2d');
    drawFitImage(ctx, img, false, width, height);

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Calculate Laplacian for edge detection
    const gray = grayNormalized(data, width, height);
    const laplacian = laplacianNormalized(gray, width, height);

    // Normalize and scale to 0-255 range for visualization
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < laplacian.length; i++) {
        min = Math.min(min, laplacian[i]);
        max = Math.max(max, laplacian[i]);
    }

    const range = max - min || 1; // Avoid division by zero

    for (let i = 0; i < laplacian.length; i++) {
        const normalized = (laplacian[i] - min) / range;
        const value = Math.floor(normalized * 255);

        const pixelIdx = i * 4;
        data[pixelIdx]     = value; // R
        data[pixelIdx + 1] = value; // G
        data[pixelIdx + 2] = value; // B
        data[pixelIdx + 3] = 255;   // A
    }

    ctx.putImageData(imageData, 0, 0);
}

// Dithering error heatmap: shows difference between dithered and source pixels
export function updateDifferenceView() {
    const img = getCurrentImage();
    const config = configs[state.selectedAlgorithmIndex];

    const { width, height } = getCanvasSize(img);
    differenceCanvas.width  = width;
    differenceCanvas.height = height;
    const ctx = differenceCanvas.getContext('2d');

    // Get the dithered image
    processImageAndUpdateCanvas(img, config, differenceCanvas, false);

    const ditheredData = ctx.getImageData(0, 0, width, height);
    const ditheredPixels = ditheredData.data;

    // Get the source image data
    const sourceCtx = document.createElement('canvas').getContext('2d');
    sourceCtx.canvas.width = width;
    sourceCtx.canvas.height = height;
    drawFitImage(sourceCtx, img, false, width, height);
    const sourceData = sourceCtx.getImageData(0, 0, width, height);
    const sourcePixels = sourceData.data;

    // Calculate differences
    const differences = new Float32Array(ditheredPixels.length / 4);
    let maxDiff = 0;

    for (let i = 0, j = 0; i < ditheredPixels.length; i += 4, j++) {
        const dr = ditheredPixels[i] - sourcePixels[i];
        const dg = ditheredPixels[i + 1] - sourcePixels[i + 1];
        const db = ditheredPixels[i + 2] - sourcePixels[i + 2];
        const diff = Math.sqrt(dr * dr + dg * dg + db * db);
        differences[j] = diff;
        if (diff > maxDiff) maxDiff = diff;
    }

    // Create heatmap: blue = low error, red = high error
    for (let i = 0, j = 0; i < ditheredPixels.length; i += 4, j++) {
        const normalizedDiff = maxDiff > 0 ? differences[j] / maxDiff : 0;

        // Blue to red gradient
        const red = Math.round(normalizedDiff * 255);
        const blue = Math.round((1 - normalizedDiff) * 255);

        ditheredPixels[i]     = red;   // R
        ditheredPixels[i + 1] = 0;     // G
        ditheredPixels[i + 2] = blue;  // B
        ditheredPixels[i + 3] = 255;   // A
    }

    ctx.putImageData(ditheredData, 0, 0);
}

// Rebuilds the image list sidebar, marking the active image and any voted ones.
export function updateImageList() {
    const list = document.getElementById('imageList');
    list.innerHTML = '';

    state.images.forEach((img, index) => {
        const item = document.createElement('div');
        item.className = 'image-item';
        item.classList.toggle('active', index === state.currentImageIndex);
        item.classList.toggle('voted', !!state.votes[img.name]);

        const name = document.createElement('div');
        name.className = 'image-name';
        name.textContent = img.name;
        item.appendChild(name);

        if (state.votes[img.name]) {
            const indicator = document.createElement('div');
            indicator.className = 'vote-indicator';
            indicator.textContent = '✓';
            item.appendChild(indicator);
        }

        item.addEventListener('click', () => {
            state.currentImageIndex = index;
            renderCurrentImage();
            updateImageList();
        });

        list.appendChild(item);
    });
}

// Updates the "Image X/Y | Voted: N/M" status line.
export function updateImageInfo() {
    const info = document.getElementById('imageInfo');
    info.textContent = state.images.length === 0
        ? ''
        : `Image ${state.currentImageIndex + 1}/${state.images.length} | Voted: ${Object.keys(state.votes).length}/${state.images.length}`;
}

export function setupSendButtons() {
    const sendButtons = document.getElementById('sendButtons');
    sendButtons.innerHTML = '';

    displaysIp.forEach(ip => {
        const button = document.createElement('button');
        button.textContent = `${ip}`;
        button.onclick = () => sendToDisplay(ip);
        sendButtons.appendChild(button);
    });
}

async function sendToDisplay(ip) {
    const canvas = state.canvasContainers[state.selectedAlgorithmIndex].querySelector('canvas');
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const bin = getDitheredImageBin(data, canvas.width, canvas.height);

    try {
        await fetch(`http://${ip}/api/display/preview`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/octet-stream'
            },
            body: bin,
            mode: 'no-cors'
        });
        showToast('success', `Sent to ${ip}`);
    } catch (error) {
        showToast('error', `Error sending to ${ip}: ${error.message}`);
    }
}