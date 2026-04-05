import { DISPLAY_WIDTH, DISPLAY_HEIGHT, configs, displaysIp } from "./config.js";
import { state } from "./state.js";
import { drawFitImage, processImageAndUpdateCanvas } from "./dither.js";
import { showCanvas, updateThumbnail } from "./canvas.js";
import { updateVoteIndicators } from "./voting.js";
import { hex2rgb } from "./math/space.js";
import { buildGamut, gamutDistance } from "./math/gamut.js"
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

export const VIEW_IDS = {
    DITHERED: 'ditheredView',
    SOURCE: 'sourceView',
    MAPPED: 'mappedView',
    IN_GAMUT: 'inGamutView',
    IN_GAMUT_MASK: 'inGamutMaskView',
    DISTANCE: 'distanceView',
    EDGE: 'edgeView',
};

const ALL_VIEWS = Object.values(VIEW_IDS);
let currentView = VIEW_IDS.DITHERED;

function isImageLoaded() {
    return state.images.length > 0;
}

function getCurrentImage() {
    return state.images[state.currentImageIndex]?.image;
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

    const img = state.images[state.currentImageIndex].image;
    
    // Draw into the main source canvas
    sourceCanvas.width  = DISPLAY_WIDTH;
    sourceCanvas.height = DISPLAY_HEIGHT;
    drawFitImage(sourceCanvas.getContext('2d'), img);

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
    srcViewCanvas.width  = DISPLAY_WIDTH;
    srcViewCanvas.height = DISPLAY_HEIGHT;

    const img = getCurrentImage();
    drawFitImage(srcViewCanvas.getContext('2d'), img);
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

    inGamutCanvas.width  = DISPLAY_WIDTH;
    inGamutCanvas.height = DISPLAY_HEIGHT;
    const ctx = inGamutCanvas.getContext('2d');
    drawFitImage(ctx, img);

    const imageData = ctx.getImageData(0, 0, inGamutCanvas.width, inGamutCanvas.height);
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

    inGamutMaskCanvas.width  = DISPLAY_WIDTH;
    inGamutMaskCanvas.height = DISPLAY_HEIGHT;
    const ctx = inGamutMaskCanvas.getContext('2d');
    drawFitImage(ctx, img);

    const imageData = ctx.getImageData(0, 0, inGamutMaskCanvas.width, inGamutMaskCanvas.height);
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

// Distance view: green = inside gamut, red = outside gamut, brightness indicates how close/far from gamut boundary
export function updateDistanceView() {
    const img = getCurrentImage();
    const palette = configs[state.selectedAlgorithmIndex].palette.map(hex2rgb);
    const { planes } = buildGamut(palette);

    distanceCanvas.width  = DISPLAY_WIDTH;
    distanceCanvas.height = DISPLAY_HEIGHT;
    const ctx = distanceCanvas.getContext('2d');
    drawFitImage(ctx, img);

    const imageData = ctx.getImageData(0, 0, distanceCanvas.width, distanceCanvas.height);
    const data = imageData.data;

    // First pass: collect all distances to find the range
    const distances = new Float32Array(data.length / 4);
    let maxDist = 0;

    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const dist = gamutDistance([r, g, b], planes);
        distances[j] = dist;
        if (dist > maxDist) maxDist = dist;
    }

    // Second pass: map distance to green→red gradient
    // Pixels inside gamut (dist <= 0): green shades, darker when closer to the gamut boundary
    // Pixels outside gamut (dist > 0): red shades, brighter when further from the gamut boundary
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
        const dist = distances[j];

        if (dist <= 0) {
            // Inside gamut: green channel, brightness inversely proportional to closeness
            // dist is negative (more negative = deeper inside), 0 = on boundary
            const closeness = maxDist > 0 ? Math.min(1, -dist / maxDist) : 0;
            // Darker green = closer to the gamut boundary / deeper inside gamut
            const green = Math.round(255 - closeness * 175);
            data[i]     = 0;
            data[i + 1] = green;
            data[i + 2] = 0;
        } else {
            // Outside gamut: red channel, brightness based on how far out
            const farness = maxDist > 0 ? Math.min(1, dist / maxDist) : 0;
            // Brighter red = further outside gamut
            const red = Math.round(80 + farness * 175);
            data[i]     = red;
            data[i + 1] = 0;
            data[i + 2] = 0;
        }
    }

    ctx.putImageData(imageData, 0, 0);
}

// Edge detection using a Laplacian filter on the source image
export function updateEdgeView() {
    const img = getCurrentImage();

    edgeCanvas.width  = DISPLAY_WIDTH;
    edgeCanvas.height = DISPLAY_HEIGHT;
    const ctx = edgeCanvas.getContext('2d');
    drawFitImage(ctx, img);

    const imageData = ctx.getImageData(0, 0, DISPLAY_WIDTH, DISPLAY_HEIGHT);
    const data = imageData.data;

    // Calculate Laplacian for edge detection
    const gray = grayNormalized(data, DISPLAY_WIDTH, DISPLAY_HEIGHT);
    const laplacian = laplacianNormalized(gray, DISPLAY_WIDTH, DISPLAY_HEIGHT);

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