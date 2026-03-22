import { DISPLAY_WIDTH, DISPLAY_HEIGHT, configs, displaysIp } from "./config.js";
import { state } from "./state.js";
import { drawFitImage, processImageAndUpdateCanvas } from "./dither.js";
import { showCanvas, updateThumbnail } from "./canvas.js";
import { updateVoteIndicators } from "./voting.js";
import { hex2rgb } from "./math/space.js";
import { buildGamut } from "./math/gamut.js"
import { getDitheredImageBin } from "./math/img2bin.js";

const sourceCanvas  = document.getElementById('sourceCanvas');
const srcViewCanvas = document.querySelector('#sourceView canvas');
const mappedCanvas = document.querySelector('#mappedView canvas');
const inGammutCanvas = document.querySelector('#inGammutView canvas');

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
    updateImageInfo();
    updateVoteIndicators();
}

function updateSourceView() {
    srcViewCanvas.width  = DISPLAY_WIDTH;
    srcViewCanvas.height = DISPLAY_HEIGHT;

    const img = state.images[state.currentImageIndex].image;
    drawFitImage(srcViewCanvas.getContext('2d'), img);
}

export function updateMappedView() {
    const img = state.images[state.currentImageIndex].image;
    const config = configs[state.selectedAlgorithmIndex];
    processImageAndUpdateCanvas(img, config, mappedCanvas, true);
}

export function updateInGamutView() {
    const img = state.images[state.currentImageIndex].image;
    const palette = configs[state.selectedAlgorithmIndex].palette.map(hex2rgb);
    const gamut = buildGamut(palette);

    inGammutCanvas.width  = DISPLAY_WIDTH;
    inGammutCanvas.height = DISPLAY_HEIGHT;
    const ctx = inGammutCanvas.getContext('2d');
    drawFitImage(ctx, img);

    const imageData = ctx.getImageData(0, 0, inGammutCanvas.width, inGammutCanvas.height);
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
        alert(`Sent to ${ip}`);
    } catch (error) {
        alert(`Error sending to ${ip}: ${error.message}`);
    }
}