import { updateScoreHUD, updateTimeHUD, showEndScreen } from './hudManager.mjs';

let score = 0;
let timeLeft = 60; 
let gameActive = true;

export function addPoints(amount) {
    if (!gameActive) return;
    score += amount;
    updateScoreHUD(score);
}

export function updateTimer(deltaTime) {
    if (!gameActive) return;

    timeLeft -= deltaTime;
    if (timeLeft <= 0) {
        timeLeft = 0;
        gameActive = false;
        showEndScreen(score);
    }
    updateTimeHUD(timeLeft);
}

export function isGameActive() {
    return gameActive;
}