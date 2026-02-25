import { DISPLAY_WIDTH, DISPLAY_HEIGHT, configs } from "./config.js";
import { state, addCanvasContainer, clearCanvasContainers, setSelectedAlgorithm } from "./state.js";

const carousleThumbs = document.getElementById('carouselThumbs');
const ditheredDiv    = document.getElementById('dithered');

// Creates a canvas container + matching thumbnail for one algorithm, appends
// both to the DOM, and registers the thumb click handler.
function createCanvasContainer(title) {
    const container = document.createElement('div');
    container.className = 'canvas-container';
    if (state.canvasContainers.length === 0) container.classList.add('active');

    const label = document.createElement('p');
    label.textContent = title;
    container.appendChild(label);

    const canvas = document.createElement('canvas');
    container.appendChild(canvas);
    ditheredDiv.appendChild(container);

    const thumb = document.createElement('canvas');
    thumb.width  = DISPLAY_WIDTH  / 8;
    thumb.height = DISPLAY_HEIGHT / 8;

    const thumbWrapper = document.createElement('div');
    thumbWrapper.className = 'thumbnail-wrapper';
    thumbWrapper.appendChild(thumb);
    carousleThumbs.appendChild(thumbWrapper);

    const index = state.canvasContainers.length;
    thumb.addEventListener('click', () => showCanvas(index));

    addCanvasContainer(container);
    return canvas;
}

// Tears down all canvas containers and thumbnails, then rebuilds from scratch.
export function initializeCanvases() {
    clearCanvasContainers();
    ditheredDiv.innerHTML    = '';
    carousleThumbs.innerHTML = '';
    configs.forEach(algo => createCanvasContainer(algo.name));
}

// Makes the canvas at `index` visible and deactivates all others.
export function showCanvas(index) {
    setSelectedAlgorithm(index);
    state.canvasContainers.forEach((c, i) => c.classList.toggle('active', i === index));
    Array.from(carousleThumbs.children).forEach((wrapper, i) => {
        wrapper.querySelector('canvas').classList.toggle('selected', i === index);
    });
}

// Copies `sourceCanvas` into the thumbnail at `index` and updates its timing label.
export function updateThumbnail(index, sourceCanvas, elapsedMs) {
    const thumbWrapper = carousleThumbs.children[index];
    const thumb        = thumbWrapper.querySelector('canvas');
    const thumbCtx     = thumb.getContext('2d');
    thumbCtx.clearRect(0, 0, thumb.width, thumb.height);
    thumbCtx.drawImage(sourceCanvas, 0, 0, thumb.width, thumb.height);

    let timeLabel = thumbWrapper.querySelector('.thumb-time');
    if (!timeLabel) {
        timeLabel = document.createElement('div');
        timeLabel.className = 'thumb-time';
        thumbWrapper.appendChild(timeLabel);
    }
    timeLabel.textContent = `${elapsedMs.toFixed(0)}ms`;
}

export { carousleThumbs };
