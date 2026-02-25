import { configs } from "./config.js";
import { state, castVote, deleteVote } from "./state.js";
import { carousleThumbs } from "./canvas.js";
import { updateImageList, updateImageInfo, renderCurrentImage } from "./ui.js";

// Highlights the thumbnail that matches the current image's vote (if any).
export function updateVoteIndicators() {
    if (state.images.length === 0) return;

    const votedAlgorithmName = state.votes[state.images[state.currentImageIndex].name];

    Array.from(carousleThumbs.children).forEach((wrapper, index) => {
        const isVoted = configs[index].name === votedAlgorithmName;
        wrapper.classList.toggle('voted-algorithm', isVoted);
        wrapper.querySelector('canvas').classList.toggle('voted-algorithm', isVoted);
    });
}

// Records the selected algorithm as the vote for the current image,
// then advances to the next image automatically.
export function submitVote() {
    if (state.images.length === 0) return;

    const imageName     = state.images[state.currentImageIndex].name;
    const algorithmName = configs[state.selectedAlgorithmIndex].name;

    castVote(imageName, algorithmName);
    updateVoteIndicators();
    updateImageList();
    updateImageInfo();

    if (state.currentImageIndex < state.images.length - 1) {
        state.currentImageIndex      = state.currentImageIndex + 1;
        state.selectedAlgorithmIndex = 0;
        renderCurrentImage();
        updateImageList();
    }
}

// Removes the vote for the current image.
export function clearVote() {
    if (state.images.length === 0) return;

    deleteVote(state.images[state.currentImageIndex].name);
    updateVoteIndicators();
    updateImageList();
    updateImageInfo();
}

// Renders the results modal with a bar chart of vote counts.
export function showResults() {
    const modal       = document.getElementById('resultsModal');
    const resultsData = document.getElementById('resultsData');

    const counts = Object.fromEntries(configs.map(a => [a.name, 0]));
    Object.values(state.votes).forEach(name => counts[name]++);

    const total = Object.keys(state.votes).length;
    resultsData.innerHTML = '';

    if (total === 0) {
        resultsData.innerHTML = '<div style="color: #666; text-align: center; padding: 20px;">No votes yet. Start comparing images!</div>';
        modal.classList.add('active');
        return;
    }

    const table = document.createElement('div');
    table.className = 'results-table';

    Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .forEach(([algoName, count]) => {
            const percentage = Math.round((count / total) * 100);

            const row = document.createElement('div');
            row.className = 'results-row';

            const nameCell = document.createElement('div');
            nameCell.className = 'results-name';
            nameCell.textContent = algoName;

            const bar  = document.createElement('div');
            bar.className = 'result-bar';

            const fill = document.createElement('div');
            fill.className = 'result-bar-fill';
            fill.style.width = `${percentage}%`;

            if (count > 0) {
                fill.classList.add('has-content');
                fill.textContent = `${count} votes (${percentage}%)`;
            } else {
                bar.title = '0 votes';
            }

            bar.appendChild(fill);

            const barCell = document.createElement('div');
            barCell.className = 'results-bar-cell';
            barCell.appendChild(bar);

            row.append(nameCell, barCell);
            table.appendChild(row);
        });

    resultsData.appendChild(table);
    modal.classList.add('active');
}

export function closeResults() {
    document.getElementById('resultsModal').classList.remove('active');
}
