import * as THREE from '../../99_Lib/three.module.min.js';

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

// ---- VR HUD (Canvas Texture) ----
export function createVRHUD(camera) {
    // Create canvas for drawing HUD text
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    
    // Create plane mesh with canvas texture
    const material = new THREE.MeshBasicMaterial({ 
        map: texture, 
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        depthTest: false,
        depthWrite: false
    });
    const geometry = new THREE.PlaneGeometry(0.8, 0.2);
    const hudMesh = new THREE.Mesh(geometry, material);
    
    // Position in front and slightly below camera view
    hudMesh.position.set(0, -0.35, -1.2);
    hudMesh.renderOrder = 9999; // Render on top
    camera.add(hudMesh);
    
    return { mesh: hudMesh, canvas, ctx, texture };
}

export function updateVRHUD(vrHUD, score, timeLeft) {
    if (!vrHUD) return;
    
    const { ctx, canvas, texture } = vrHUD;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Background with slight transparency
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Border
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
    
    // Text styling
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    
    // Draw score
    ctx.fillText(`Score: ${score}`, 30, canvas.height / 2);
    
    // Draw time (right side)
    ctx.textAlign = 'right';
    ctx.fillText(`Time: ${Math.ceil(timeLeft)}s`, canvas.width - 30, canvas.height / 2);
    
    // Update texture
    texture.needsUpdate = true;
}

export function removeVRHUD(vrHUD, camera) {
    if (!vrHUD || !camera) return;
    
    camera.remove(vrHUD.mesh);
    vrHUD.mesh.geometry.dispose();
    vrHUD.mesh.material.dispose();
    vrHUD.texture.dispose();
}