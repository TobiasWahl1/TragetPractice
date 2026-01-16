import { updateScoreHUD, updateTimeHUD } from './hudManager.mjs';

export let score = 0;
export let timeLeft = 60; // 60 Sekunden Spielzeit
export let isGameActive = true;
let onGameEndCallback = null;

// Getter functions to access current values
export function getScore() {
    return score;
}

export function getTimeLeft() {
    return timeLeft;
}

export function getIsGameActive() {
    return isGameActive;
}

export function setGameEndCallback(callback) {
    onGameEndCallback = callback;
}

export function resetGame(duration = 60) {
    score = 0;
    timeLeft = duration;
    isGameActive = true;
    updateScoreHUD(score);
    updateTimeHUD(timeLeft);
}

export function addPoints(amount) {
    if (!isGameActive) return;
    score += amount;
    updateScoreHUD(score);
}

export function processTimer(deltaTime) {
    if (!isGameActive) return;

    timeLeft -= deltaTime;
    if (timeLeft <= 0) {
        timeLeft = 0;
        isGameActive = false;
		
        // Notify callback (e.g., to update VR menu)
        if (onGameEndCallback) {
            onGameEndCallback(score);
        }
    }
    updateTimeHUD(timeLeft);
}