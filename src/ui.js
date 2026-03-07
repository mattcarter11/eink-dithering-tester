import { DISPLAY_WIDTH, DISPLAY_HEIGHT, configs } from "./config.js";
import { state } from "./state.js";
import { drawFitImage, processImage } from "./dither.js";
import { showCanvas, updateThumbnail } from "./canvas.js";
import { updateVoteIndicators } from "./voting.js";

const sourcePreview = document.getElementById('sourcePreview');
const mappedPreview = document.getElementById('mappedPreview');
const sourceCanvas  = document.getElementById('sourceCanvas');
const sourceCtx     = sourceCanvas.getContext('2d');

// Redraws the source image and re-runs all dithering algorithms for the current image.
export function renderCurrentImage() {
    if (state.images.length === 0) return;

    const img = state.images[state.currentImageIndex].image;

    // Draw into the main source canvas
    sourceCanvas.width  = DISPLAY_WIDTH;
    sourceCanvas.height = DISPLAY_HEIGHT;
    sourceCtx.clearRect(0, 0, DISPLAY_WIDTH, DISPLAY_HEIGHT);
    drawFitImage(sourceCtx, img);

    // Rebuild the source preview panel (shown on spacebar hold)
    const previewCanvas = document.createElement('canvas');
    previewCanvas.width  = DISPLAY_WIDTH;
    previewCanvas.height = DISPLAY_HEIGHT;
    drawFitImage(previewCanvas.getContext('2d'), img);

    sourcePreview.innerHTML = '';
    const previewTitle = document.createElement('p');
    previewTitle.textContent = 'Source Image';
    sourcePreview.appendChild(previewTitle);
    sourcePreview.appendChild(previewCanvas);

    updateMappedPreview();

    // Run every algorithm and update its canvas + thumbnail
    configs.forEach((conf, index) => {
        const canvas  = state.canvasContainers[index].querySelector('canvas');
        const elapsed = processImage(img, conf, canvas);
        updateThumbnail(index, canvas, elapsed);
    });

    showCanvas(state.selectedAlgorithmIndex);
    updateImageInfo();
    updateVoteIndicators();
}

export function updateMappedPreview() {
    // Rebuild the mapped preview panel (shown on shift hold)
    const mappedCanvas = document.createElement('canvas');
    mappedCanvas.width  = DISPLAY_WIDTH;
    mappedCanvas.height = DISPLAY_HEIGHT;

    const img = state.images[state.currentImageIndex].image;
    drawFitImage(mappedCanvas.getContext('2d'), img);

    mappedPreview.innerHTML = '';
    const mappedTitle = document.createElement('p');
    mappedTitle.textContent = 'Mapped Image (no dithering)';
    mappedPreview.appendChild(mappedTitle);
    mappedPreview.appendChild(mappedCanvas);

    processImage(img, configs[state.selectedAlgorithmIndex], mappedCanvas, true);
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
