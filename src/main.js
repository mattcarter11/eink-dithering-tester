import { configs } from "./config.js";
import { state, resetState, addImage, sortImages } from "./state.js";
import { initializeCanvases, showCanvas } from "./canvas.js";
import { submitVote, clearVote, showResults, closeResults } from "./voting.js";
import { renderCurrentImage, updateImageList, updateImageInfo, setupSendButtons, showToast } from "./ui.js";

// Expose modal controls to inline HTML handlers
window.showResults  = showResults;
window.closeResults = closeResults;
window.submitVote   = submitVote;
window.clearVote    = clearVote;
window.showShortcuts = showShortcuts;
window.closeShortcuts = closeShortcuts;

function showShortcuts() {
    document.getElementById('shortcutsModal').classList.add('active');
}

function closeShortcuts() {
    document.getElementById('shortcutsModal').classList.remove('active');
}


// ─── File loading helper ──────────────────────────────────────────────────────

function loadFiles(files) {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));

    if (imageFiles.length === 0) {
        showToast('error', 'No image files found!');
        return;
    }

    resetState();
    initializeCanvases();

    let loadedCount = 0;
    imageFiles.forEach(file => {
        const img  = new Image();
        img.onload = () => {
            addImage({ name: file.name, image: img });
            if (++loadedCount === imageFiles.length) {
                sortImages();
                renderCurrentImage();
                updateImageList();
            }
        };
        img.src = URL.createObjectURL(file);
    });
}

// ─── File input ───────────────────────────────────────────────────────────────

document.getElementById('fileInput').addEventListener('change', (e) => {
    loadFiles(e.target.files);
});

// ─── Drag and drop ────────────────────────────────────────────────────────────

const dropOverlay = document.getElementById('dropOverlay');

document.addEventListener('dragenter', (e) => {
    if (e.dataTransfer && Array.from(e.dataTransfer.items).some(i => i.kind === 'file' && i.type.startsWith('image/'))) {
        e.preventDefault();
        dropOverlay.classList.add('active');
    }
});

document.addEventListener('dragover', (e) => {
    e.preventDefault();
});

document.addEventListener('dragleave', (e) => {
    // Only hide overlay when leaving the window entirely
    if (!e.relatedTarget || e.relatedTarget === document.documentElement) {
        dropOverlay.classList.remove('active');
    }
});

document.addEventListener('drop', (e) => {
    e.preventDefault();
    dropOverlay.classList.remove('active');
    if (e.dataTransfer?.files?.length) {
        loadFiles(e.dataTransfer.files);
    }
});

// ─── Prev / Next buttons ──────────────────────────────────────────────────────

document.getElementById('prevBtn').addEventListener('click', () => {
    const index = (state.selectedAlgorithmIndex - 1 + configs.length) % configs.length;
    showCanvas(index);
});

document.getElementById('nextBtn').addEventListener('click', () => {
    const index = (state.selectedAlgorithmIndex + 1) % configs.length;
    showCanvas(index);
});

// ─── Keyboard shortcuts ───────────────────────────────────────────────────────

window.addEventListener('keydown', (e) => {
    if (state.images.length === 0 || e.target.tagName === 'INPUT') return;

    switch (e.key) {
        case 'Escape':
            e.preventDefault();
            closeResults();
            closeShortcuts();
            break;
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
        case 'A':
        case 'a':
            e.preventDefault();
            showView('mappedView');
            break;
        case 'S':
        case 's':
            e.preventDefault();
            document.querySelectorAll('canvas').forEach(e => e.classList.add('no_smooth'));
            break;
        case 'D':
        case 'd':
            e.preventDefault();
            showView('inGammutView');
            break;
        case ' ':
            e.preventDefault();
            showView('sourceView');
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
    switch (e.key) {
        case 'S':
        case 's':
            e.preventDefault();
            document.querySelectorAll('canvas').forEach(e => e.classList.remove('no_smooth'));
            break;
        case 'A':
        case 'a':
        case 'D':
        case 'd':
        case ' ':
            e.preventDefault();
            showView('ditheredView');
            break;
    }
});

function showView(id) {
    document.getElementById('ditheredView').classList.add('hidden');
    document.getElementById('sourceView').classList.add('hidden');
    document.getElementById('mappedView').classList.add('hidden');
    document.getElementById('inGammutView').classList.add('hidden');
    document.getElementById(id).classList.remove('hidden');
}

// ─── Init ─────────────────────────────────────────────────────────────────────

updateImageInfo();
setupSendButtons();

// Load default image on page load
window.addEventListener('load', () => {
    fetch('test-imgs/rainbow_granger.png')
        .then(res => res.blob())
        .then(blob => {
            const file = new File([blob], 'rainbow_granger.png', { type: 'image/png' });
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            document.getElementById('fileInput').files = dataTransfer.files;
            document.getElementById('fileInput').dispatchEvent(new Event('change', { bubbles: true }));
        });
});