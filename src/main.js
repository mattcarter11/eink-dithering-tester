import { configs } from "./config.js";
import { INITIAL_IMAGES } from "./config.js";
import { state, resetState, addImage, sortImages, setCurrentImage, setSelectedAlgorithm } from "./state.js";
import { initializeCanvases, showCanvas } from "./canvas.js";
import { submitVote, clearVote, showResults, closeResults } from "./voting.js";
import {
    renderCurrentImage,
    updateImageList,
    updateImageInfo,
    setupSendButtons,
    showToast,
    showView,
    VIEW_IDS,
} from "./ui.js";

// Expose modal controls to inline HTML handlers
window.showResults    = showResults;
window.closeResults   = closeResults;
window.submitVote     = submitVote;
window.clearVote      = clearVote;
window.showShortcuts  = showShortcuts;
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

function setupFileInput() {
    document.getElementById('fileInput').addEventListener('change', (e) => {
        loadFiles(e.target.files);
    });
}

function setupDragDrop() {
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
}

function setupNavigationButtons() {
    document.getElementById('prevBtn').addEventListener('click', () => {
        const index = (state.selectedAlgorithmIndex - 1 + configs.length) % configs.length;
        showCanvas(index);
    });

    document.getElementById('nextBtn').addEventListener('click', () => {
        const index = (state.selectedAlgorithmIndex + 1) % configs.length;
        showCanvas(index);
    });
}

function handleKeyDown(e) {
    if (state.images.length === 0 || e.target.tagName === 'INPUT') return;

    const viewShortcutKeys = new Set([' ', 'D', 'd', 'F', 'f', 'E', 'e', 'R', 'r', 'T', 't', 'S', 's', 'G', 'g']);
    if (viewShortcutKeys.has(e.key) && e.repeat) return;

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
                setCurrentImage(state.currentImageIndex - 1);
                setSelectedAlgorithm(0);
                renderCurrentImage();
                updateImageList();
            }
            break;
        case 'ArrowDown':
            e.preventDefault();
            if (state.currentImageIndex < state.images.length - 1) {
                setCurrentImage(state.currentImageIndex + 1);
                setSelectedAlgorithm(0);
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
        case ' ':
            e.preventDefault();
            showView(VIEW_IDS.SOURCE);
            break;
        case 'S':
        case 's':
            e.preventDefault();
            document.querySelectorAll('canvas').forEach(c => c.classList.add('no_smooth'));
            break;
        case 'D':
        case 'd':
            e.preventDefault();
            showView(VIEW_IDS.DISTANCE);
            break;
        case 'F':
        case 'f':
            e.preventDefault();
            showView(VIEW_IDS.MAPPED);
            break;
        case 'G':
        case 'g':
            e.preventDefault();
            showView(VIEW_IDS.DIFFERENCE);
            break;
        case 'E':
        case 'e':
            e.preventDefault();
            showView(VIEW_IDS.EDGE);
            break;
        case 'R':
        case 'r':
            e.preventDefault();
            showView(VIEW_IDS.IN_GAMUT);
            break;
        case 'T':
        case 't':
            e.preventDefault();
            showView(VIEW_IDS.IN_GAMUT_MASK);
            break;
        default:
            if (/^[1-9]$/.test(e.key)) {
                e.preventDefault();
                const index = parseInt(e.key, 10) - 1;
                if (index < configs.length) showCanvas(index);
            }
    }
}

function handleKeyUp(e) {
    switch (e.key) {
        case 'S':
        case 's':
            e.preventDefault();
            document.querySelectorAll('canvas').forEach(c => c.classList.remove('no_smooth'));
            break;
        case ' ':
        case 'D':
        case 'd':
        case 'F':
        case 'f':
        case 'G':
        case 'g':
        case 'E':
        case 'e':
        case 'R':
        case 'r':
        case 'T':
        case 't':
            e.preventDefault();
            showView(VIEW_IDS.DITHERED);
            break;
    }
}

function setupKeyboardShortcuts() {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
}

function initializeApp() {
    setupFileInput();
    setupDragDrop();
    setupNavigationButtons();
    setupKeyboardShortcuts();
    updateImageInfo();
    setupSendButtons();
}

initializeApp();

// Load default images on page load
window.addEventListener('load', async () => {
    if (INITIAL_IMAGES.length === 0) return;

    const files = [];
    for (const imagePath of INITIAL_IMAGES) {
        try {
            const res = await fetch(imagePath);
            const blob = await res.blob();
            const fileName = imagePath.split('/').pop();
            const file = new File([blob], fileName, { type: blob.type });
            files.push(file);
        } catch (error) {
            console.error(`Failed to load initial image: ${imagePath}`, error);
        }
    }

    if (files.length > 0) {
        const dataTransfer = new DataTransfer();
        files.forEach(file => dataTransfer.items.add(file));
        document.getElementById('fileInput').files = dataTransfer.files;
        document.getElementById('fileInput').dispatchEvent(new Event('change', { bubbles: true }));
    }
});