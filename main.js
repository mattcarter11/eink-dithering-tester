import { ditherImage, replaceColors } from "./epdoptimize/src/index.js";
import { ditherImageLab, ditherImageLabOld, ditherImageMine } from "./src/dither.js";

const width = 480;
const height = 800;
const factor = 0.9;

const pureRGB = ['#000000', '#ffffff', '#0000ff', '#00ff00', '#ff0000', '#ffff00'];
const wenting = ['#2e2c42', '#d3d6cd', '#316ac1', '#5c8a5b', '#b11d19', '#d9c701'];
const paperless = ["#191E21", "#e8e8e8", "#2157ba", "#125f20", "#b21318", "#efde44"];
const wentingSqrt = wenting.concat(wenting); 
const wentingRGB = wenting.concat(pureRGB); 
const paperlessRGB = paperless.concat(pureRGB);
const paperlessSqrt = paperless.concat(paperless);

const discarted = [
    { name: "Mine - 🎨 RGB",                type: 'mine', palette: pureRGB, mapTo: wenting }, // 0 Votes, Mine Tewak RBG better
    { name: "Mine - 🎨 Paperless",          type: 'mine', palette: paperlessRGB, mapTo: wenting }, // 0 Votes - Yellowish...
    { name: "Mine - 🎨 Paperless + RBG",    type: 'mine', palette: paperlessRGB, mapTo: wentingSqrt }, // 0 Votes - Yellowish...
    { name: "Mine - 🎨 Wenting",            type: 'mine', palette: wenting, mapTo: wenting }, // Only 2 votes
    
    { name: "Paperless - 🎨 RGB",               type: 'paperless', palette: pureRGB, mapTo: paperless }, // 0 Votes, Mine Tewak RBG better
    { name: "Paperless - 🎨 Paperless",         type: 'paperless', palette: paperless,  mapTo: wenting },
    { name: "Paperless - 🎨 Paperless + RGB",   type: 'paperless', palette: paperlessRGB,  mapTo: wentingSqrt },
    { name: "Paperless - 🎨 Wenting",           type: 'paperless', palette: wenting,  mapTo: wenting },
    { name: "Paperless - 🎨 Wenting + RGB",     type: 'paperless', palette: wentingRGB, mapTo: wentingSqrt }, // Equal to Paperless - Wenting

    { name: "Paperless Tweak - 🎨 RGB",     type: 'paperless', palette: pureRGB, tweak: true, mapTo: paperless }, // 0 Votes, Mine Tewak RBG better
    
    { name: "Tweak Lab - 🎨 RGB",           type: 'lab', tweak: true,  palette: pureRGB, mapTo: wenting }, // Since we remap rgb, all LAB gains are lost and gets very gray
];

const algorithms = [
    { name: "Mine Tweak - 🎨 RGB",          type: 'mine', tweak: true,  palette: pureRGB, mapTo: wenting },
    { name: "Mine - 🎨 Wenting + RBG",      type: 'mine', tweak: false, palette: wentingRGB, mapTo: wentingSqrt },
    { name: "Lab - 🎨 RGB",                 type: 'lab', tweak: false, palette: pureRGB, mapTo: wenting },
    { name: "Lab Old - 🎨 RGB",             type: 'labOld', tweak: false, palette: pureRGB, mapTo: wenting },
    // { name: "Lab - 🎨 Wenting",             type: 'lab', tweak: false, palette: wenting, mapTo: wenting },
    // { name: "Lab Old - 🎨 Wenting",         type: 'labOld', tweak: false, palette: wenting, mapTo: wenting },
    { name: "Lab - 🎨 Wenting + RBG",       type: 'lab', tweak: false, palette: wentingRGB, mapTo: wentingSqrt },
    { name: "Lab Old - 🎨 Wenting + RBG",   type: 'labOld', tweak: false, palette: wentingRGB, mapTo: wentingSqrt },
    // { name: "Lab - 🎨 Paperless",           type: 'lab', tweak: false, palette: paperless, mapTo: wenting },
    // { name: "Lab Old - 🎨 Paperless",           type: 'labOld', tweak: false, palette: paperless, mapTo: wenting },
    // { name: "Lab - 🎨 Paperless + RBG",     type: 'lab', tweak: false, palette: paperlessRGB, mapTo: wentingSqrt },
    // { name: "Lab Old- 🎨 Paperless + RBG",     type: 'labOld', tweak: false, palette: paperlessRGB, mapTo: wentingSqrt },

];

let images = [];
let currentImageIndex = 0;
let selectedAlgorithmIndex = 0;
let votes = {};
let canvasContainers = [];
const thumbContainer = document.getElementById('carouselThumbs');
const ditheredDiv = document.getElementById('dithered');
const sourcePreview = document.getElementById('sourcePreview');
const sourceCanvas = document.getElementById('sourceCanvas');
const sourceCtx = sourceCanvas.getContext('2d');

function createCanvasContainer(title) {
    const container = document.createElement('div');
    container.className = 'canvas-container';
    if (canvasContainers.length === 0) container.classList.add('active');

    const h3 = document.createElement('p');
    h3.textContent = title;
    container.appendChild(h3);

    const canvas = document.createElement('canvas');
    container.appendChild(canvas);

    ditheredDiv.appendChild(container);

    const thumb = document.createElement('canvas');
    thumb.width = width / 8;
    thumb.height = height / 8;
    
    const thumbWrapper = document.createElement('div');
    thumbWrapper.className = 'thumbnail-wrapper';
    thumbWrapper.appendChild(thumb);
    thumbContainer.appendChild(thumbWrapper);

    const index = canvasContainers.length;
    thumb.addEventListener('click', () => showCanvas(index));

    canvasContainers.push(container);
    return canvas;
}

function showCanvas(index) {
    selectedAlgorithmIndex = index;
    canvasContainers.forEach((c, i) => c.classList.toggle('active', i === index));
    Array.from(thumbContainer.children).forEach((wrapper, i) => {
        const canvas = wrapper.querySelector('canvas');
        canvas.classList.toggle('selected', i === index);
    });
}

function updateVotedIndicators() {
    if (images.length === 0) return;
    
    const imageName = images[currentImageIndex].name;
    const votedAlgorithmName = votes[imageName];
    
    Array.from(thumbContainer.children).forEach((wrapper, index) => {
        const algoName = algorithms[index].name;
        const isVoted = votedAlgorithmName === algoName;
        wrapper.classList.toggle('voted-algorithm', isVoted);
        wrapper.querySelector('canvas').classList.toggle('voted-algorithm', isVoted);
    });
}

function processImage(img, algorithm, outputCanvas) {
    const inputCanvas = document.createElement('canvas');
    inputCanvas.width = width;
    inputCanvas.height = height;
    const ctx = inputCanvas.getContext('2d');
    
    // Calculate scale to fit (not fill)
    const scaleW = width / img.width;
    const scaleH = height / img.height;
    const scale = Math.min(scaleW, scaleH);
    
    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;
    const x = (width - scaledWidth) / 2;
    const y = (height - scaledHeight) / 2;
    
    if (algorithm.tweak) {
        ctx.filter = 'saturate(1.15) contrast(1.05)';
    }
    ctx.drawImage(img, 0, 0, img.width, img.height, x, y, scaledWidth, scaledHeight);
    
    const t0 = performance.now();

    switch (algorithm.type) {

        case 'mine': ditherImageMine(inputCanvas, outputCanvas, algorithm.palette, factor); break;
        case 'lab': ditherImageLab(inputCanvas, outputCanvas, algorithm.palette, factor); break;
        case 'labOld': ditherImageLabOld(inputCanvas, outputCanvas, algorithm.palette, factor, algorithm.clamp); break;
        case 'paperless': ditherImage(inputCanvas, outputCanvas, { algorithm: "floydSteinberg", palette: algorithm.palette }); break
        default: break;
    }

    // Apply color mapping if needed
    if (algorithm.mapTo) {
        replaceColors(outputCanvas, outputCanvas, { 
            originalColors: algorithm.palette, 
            replaceColors: algorithm.mapTo 
        });
    }

    return performance.now() - t0;
}

function renderCurrentImage() {
    if (images.length === 0) return;

    const img = images[currentImageIndex].image;
    
    // Draw source image (fit, not fill)
    const scaleW = width / img.width;
    const scaleH = height / img.height;
    const scale = Math.min(scaleW, scaleH);
    
    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;
    const x = (width - scaledWidth) / 2;
    const y = (height - scaledHeight) / 2;
    
    sourceCanvas.width = width;
    sourceCanvas.height = height;
    sourceCtx.clearRect(0, 0, width, height);
    sourceCtx.drawImage(img, 0, 0, img.width, img.height, x, y, scaledWidth, scaledHeight);

    // Create source preview for spacebar
    const previewCanvas = document.createElement('canvas');
    previewCanvas.width = width;
    previewCanvas.height = height;
    const previewCtx = previewCanvas.getContext('2d');
    previewCtx.clearRect(0, 0, width, height);
    previewCtx.drawImage(img, 0, 0, img.width, img.height, x, y, scaledWidth, scaledHeight);
    
    sourcePreview.innerHTML = '';
    const previewTitle = document.createElement('p');
    previewTitle.textContent = 'Source Image';
    sourcePreview.appendChild(previewTitle);
    sourcePreview.appendChild(previewCanvas);

    // Process all dithering algorithms
    algorithms.forEach((algo, index) => {
        const canvas = canvasContainers[index].querySelector('canvas');
        const elapsed = processImage(img, algo, canvas);
        
        // Update thumbnail
        const thumbWrapper = thumbContainer.children[index];
        const thumb = thumbWrapper.querySelector('canvas');
        const thumbCtx = thumb.getContext('2d');
        thumbCtx.clearRect(0, 0, thumb.width, thumb.height);
        thumbCtx.drawImage(canvas, 0, 0, thumb.width, thumb.height);

        // Time part
        let timeLabel = thumbWrapper.querySelector('.thumb-time');
        if (!timeLabel) {
            timeLabel = document.createElement('div');
            timeLabel.className = 'thumb-time';
            thumbWrapper.appendChild(timeLabel);
        }
        timeLabel.textContent = `${elapsed.toFixed(0)}ms`;
    });

    showCanvas(selectedAlgorithmIndex);
    updateImageInfo();
    updateVotedIndicators();
}

function initializeCanvases() {
    canvasContainers = [];
    ditheredDiv.innerHTML = '';
    thumbContainer.innerHTML = '';
    
    algorithms.forEach(algo => {
        createCanvasContainer(algo.name);
    });
}

function updateImageList() {
    const list = document.getElementById('imageList');
    list.innerHTML = '';

    images.forEach((img, index) => {
        const item = document.createElement('div');
        item.className = 'image-item';
        if (index === currentImageIndex) {
            item.classList.add('active');
        }
        if (votes[img.name]) {
            item.classList.add('voted');
        }

        const name = document.createElement('div');
        name.className = 'image-name';
        name.textContent = img.name;
        item.appendChild(name);

        if (votes[img.name]) {
            const indicator = document.createElement('div');
            indicator.className = 'vote-indicator';
            indicator.textContent = '✓';
            item.appendChild(indicator);
        }

        item.addEventListener('click', () => {
            currentImageIndex = index;
            renderCurrentImage();
            updateImageList();
        });

        list.appendChild(item);
    });
}

function updateImageInfo() {
    const info = document.getElementById('imageInfo');
    if (images.length === 0) {
        info.textContent = '';
    } else {
        const votedCount = Object.keys(votes).length;
        info.textContent = `Image ${currentImageIndex + 1}/${images.length} | Voted: ${votedCount}/${images.length}`;
    }
}

function submitVote() {
    if (images.length === 0) return;
    
    const imageName = images[currentImageIndex].name;
    const algorithmName = algorithms[selectedAlgorithmIndex].name;
    
    votes[imageName] = algorithmName;
    updateVotedIndicators();
    updateImageList();
    updateImageInfo();

    // Move to next image if available
    if (currentImageIndex < images.length - 1) {
        currentImageIndex++;
        selectedAlgorithmIndex = 0;
        renderCurrentImage();
        updateImageList();
    }
}

function clearVote() {
    if (images.length === 0) return;
    
    const imageName = images[currentImageIndex].name;
    delete votes[imageName];
    updateVotedIndicators();
    updateImageList();
    updateImageInfo();
}

window.submitVote = submitVote;
window.clearVote = clearVote;

window.showResults = function() {
    const modal = document.getElementById('resultsModal');
    const resultsData = document.getElementById('resultsData');
    
    // Count votes per algorithm
    const counts = {};
    algorithms.forEach(algo => counts[algo.name] = 0);
    
    Object.values(votes).forEach(algoName => {
        counts[algoName]++;
    });

    const total = Object.keys(votes).length;
    
    resultsData.innerHTML = '';
    
    // Sort by vote count
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    
    if (total === 0) {
        resultsData.innerHTML = '<div style="color: #666; text-align: center; padding: 20px;">No votes yet. Start comparing images!</div>';
        modal.classList.add('active');
        return;
    }

    const table = document.createElement('div');
    table.className = 'results-table';
    
    sorted.forEach(([algoName, count]) => {
        const row = document.createElement('div');
        row.className = 'results-row';
        
        const nameCell = document.createElement('div');
        nameCell.className = 'results-name';
        nameCell.textContent = algoName;
        row.appendChild(nameCell);
        
        const barCell = document.createElement('div');
        barCell.className = 'results-bar-cell';
        
        const bar = document.createElement('div');
        bar.className = 'result-bar';
        const fill = document.createElement('div');
        fill.className = 'result-bar-fill';
        const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
        fill.style.width = `${percentage}%`;
        
        if (count > 0) {
            fill.classList.add('has-content');
            fill.textContent = `${count} votes (${percentage}%)`;
        } else {
            bar.title = '0 votes';
        }
        
        bar.appendChild(fill);
        barCell.appendChild(bar);
        row.appendChild(barCell);
        
        table.appendChild(row);
    });
    
    resultsData.appendChild(table);
    modal.classList.add('active');
};

window.closeResults = function() {
    document.getElementById('resultsModal').classList.remove('active');
};

document.getElementById('fileInput').addEventListener('change', (e) => {
    const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
    
    if (files.length === 0) {
        alert('No image files found!');
        return;
    }

    images = [];
    votes = {};
    currentImageIndex = 0;
    selectedAlgorithmIndex = 0;

    initializeCanvases();

    let loaded = 0;
    files.forEach(file => {
        const img = new Image();
        img.onload = () => {
            images.push({ name: file.name, image: img });
            loaded++;
            
            if (loaded === files.length) {
                images.sort((a, b) => a.name.localeCompare(b.name));
                renderCurrentImage();
                updateImageList();
            }
        };
        img.src = URL.createObjectURL(file);
    });
});

document.getElementById('prevBtn').addEventListener('click', () => {
    selectedAlgorithmIndex = (selectedAlgorithmIndex - 1 + algorithms.length) % algorithms.length;
    showCanvas(selectedAlgorithmIndex);
});

document.getElementById('nextBtn').addEventListener('click', () => {
    selectedAlgorithmIndex = (selectedAlgorithmIndex + 1) % algorithms.length;
    showCanvas(selectedAlgorithmIndex);
});

window.addEventListener('keydown', (e) => {
    if (images.length === 0) return;
    if (e.target.tagName === 'INPUT') return;

    if (e.key === 'ArrowLeft') {
        e.preventDefault();
        selectedAlgorithmIndex = (selectedAlgorithmIndex - 1 + algorithms.length) % algorithms.length;
        showCanvas(selectedAlgorithmIndex);
    } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        selectedAlgorithmIndex = (selectedAlgorithmIndex + 1) % algorithms.length;
        showCanvas(selectedAlgorithmIndex);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (currentImageIndex > 0) {
            currentImageIndex--;
            selectedAlgorithmIndex = 0;
            renderCurrentImage();
            updateImageList();
        }
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (currentImageIndex < images.length - 1) {
            currentImageIndex++;
            selectedAlgorithmIndex = 0;
            renderCurrentImage();
            updateImageList();
        }
    } else if (e.key === 'Enter') {
        e.preventDefault();
        submitVote();
    } else if (e.key === 'Delete') {
        e.preventDefault();
        clearVote();
    } else if (e.key === ' ') {
        e.preventDefault();
        sourcePreview.classList.add('active');
        ditheredDiv.classList.add('hidden');
    } else if (/^[1-9]$/.test(e.key)) {
        e.preventDefault();
        const index = parseInt(e.key, 10) - 1;
        if (index < algorithms.length) {
            showCanvas(index);
        }
    }
});

window.addEventListener('keyup', (e) => {
    if (e.key === ' ') {
        e.preventDefault();
        sourcePreview.classList.remove('active');
        ditheredDiv.classList.remove('hidden');
    }
});

updateImageInfo();