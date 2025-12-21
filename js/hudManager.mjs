const scoreElement = document.getElementById('score-value');
const timeElement = document.getElementById('time-value');
const messageBox = document.getElementById('message-box');
const finalScoreDisplay = document.getElementById('final-score');

export function initHUD() {
    updateScoreHUD(0);
    updateTimeHUD(60);
}

export function updateScoreHUD(score) {
    if (scoreElement) scoreElement.textContent = score;
}

export function updateTimeHUD(seconds) {
    if (timeElement) timeElement.textContent = Math.ceil(seconds);
}

export function showEndScreen(finalScore) {
    if (messageBox) {
        messageBox.style.display = 'block';
        finalScoreDisplay.textContent = `Punkte: ${finalScore}`;
    }
}