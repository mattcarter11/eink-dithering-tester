// Shared application state.
// All mutations go through the setters so consumers always get the current value
// by importing the `state` object directly (it's the same reference throughout).

export const state = {
    images:                [],
    votes:                 {},
    currentImageIndex:     0,
    selectedAlgorithmIndex: 0,
    canvasContainers:      [],
};

export function resetState() {
    state.images                 = [];
    state.votes                  = {};
    state.currentImageIndex      = 0;
    state.selectedAlgorithmIndex = 0;
    state.canvasContainers       = [];
}

export function setCurrentImage(index) {
    state.currentImageIndex = index;
}

export function setSelectedAlgorithm(index) {
    state.selectedAlgorithmIndex = index;
}

export function castVote(imageName, algorithmName) {
    state.votes[imageName] = algorithmName;
}

export function deleteVote(imageName) {
    delete state.votes[imageName];
}

export function addImage(entry) {
    state.images.push(entry);
}

export function sortImages() {
    state.images.sort((a, b) => a.name.localeCompare(b.name));
}

export function addCanvasContainer(container) {
    state.canvasContainers.push(container);
}

export function clearCanvasContainers() {
    state.canvasContainers = [];
}
