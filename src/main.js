import { configs } from "./config.js";
import { state, resetState, addImage, sortImages } from "./state.js";
import { initializeCanvases, showCanvas } from "./canvas.js";
import { submitVote, clearVote, showResults, closeResults } from "./voting.js";
import { renderCurrentImage, updateImageList, updateImageInfo } from "./ui.js";

// Expose modal controls to inline HTML handlers
window.showResults  = showResults;
window.closeResults = closeResults;
window.submitVote   = submitVote;
window.clearVote    = clearVote;

// --- File input ---

document.getElementById('fileInput').addEventListener('change', (e) => {
    const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));

    if (files.length === 0) {
        alert('No image files found!');
        return;
    }

    resetState();
    initializeCanvases();

    let loadedCount = 0;
    files.forEach(file => {
        const img  = new Image();
        img.onload = () => {
            addImage({ name: file.name, image: img });
            if (++loadedCount === files.length) {
                sortImages();
                renderCurrentImage();
                updateImageList();
            }
        };
        img.src = URL.createObjectURL(file);
    });
});

// --- Prev / Next buttons ---

document.getElementById('prevBtn').addEventListener('click', () => {
    const index = (state.selectedAlgorithmIndex - 1 + configs.length) % configs.length;
    showCanvas(index);
});

document.getElementById('nextBtn').addEventListener('click', () => {
    const index = (state.selectedAlgorithmIndex + 1) % configs.length;
    showCanvas(index);
});

// --- Keyboard shortcuts ---
let heldKey = null;

window.addEventListener('keydown', (e) => {
    if (heldKey !== null) return;
  
    heldKey = e.key;

    if (state.images.length === 0 || e.target.tagName === 'INPUT') return;

    switch (e.key) {
        case 'ArrowLeft': {
            e.preventDefault();
            const index = (state.selectedAlgorithmIndex - 1 + configs.length) % configs.length;
            showCanvas(index);
            break;
        }
        case 'ArrowRight': {
            e.preventDefault();
            const index = (state.selectedAlgorithmIndex + 1) % configs.length;
            showCanvas(index);
            break;
        }
        case 'ArrowUp':
            e.preventDefault();
            if (state.currentImageIndex > 0) {
                state.currentImageIndex      -= 1;
                state.selectedAlgorithmIndex  = 0;
                renderCurrentImage();
                updateImageList();
            }
            break;
        case 'ArrowDown':
            e.preventDefault();
            if (state.currentImageIndex < state.images.length - 1) {
                state.currentImageIndex      += 1;
                state.selectedAlgorithmIndex  = 0;
                renderCurrentImage();
                updateImageList();
            }
            break;
        case 'Enter':
            e.preventDefault();
            submitVote();
            break;
        case 'Delete':
            e.preventDefault();
            clearVote();
            break;
        case 'Shift':
            e.preventDefault();
            document.getElementById('dithered').classList.add('hidden');
            document.getElementById('sourcePreview').classList.add('hidden');
            document.getElementById('mappedPreview').classList.remove('hidden');
            break;
        case ' ':
            e.preventDefault();
            document.getElementById('dithered').classList.add('hidden');
            document.getElementById('sourcePreview').classList.remove('hidden');
            document.getElementById('mappedPreview').classList.add('hidden');
            break;
        default:
            if (/^[1-9]$/.test(e.key)) {
                e.preventDefault();
                const index = parseInt(e.key, 10) - 1;
                if (index < configs.length) showCanvas(index);
            }
    }
});

window.addEventListener('keyup', (e) => {
    if (heldKey === null || heldKey !== e.key) return;
    
    switch (e.key) {
        case 'Shift':
        case ' ':
            e.preventDefault();
            document.getElementById('dithered').classList.remove('hidden');
            document.getElementById('sourcePreview').classList.add('hidden');
            document.getElementById('mappedPreview').classList.add('hidden');
            break;
    }
    heldKey = null;
});

// --- Init ---

updateImageInfo();
