import { updateScoreHUD, updateTimeHUD, showEndScreen } from './hudManager.mjs';

export let score = 0;
export let timeLeft = 60; // 60 Sekunden Spielzeit
export let isGameActive = true;

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
        showEndScreen(score);
    }
    updateTimeHUD(timeLeft);
}