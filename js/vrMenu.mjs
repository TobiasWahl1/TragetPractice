import * as THREE from '../../99_Lib/three.module.min.js';

let menuGroup = null;
let buttons = [];
let hoveredButton = null;

export function createVRMenuBoard(scene) {
    if (menuGroup) return menuGroup;

    menuGroup = new THREE.Group();
    // Position as a world object (behind the stand, off to the side)
    menuGroup.position.set(-3, 0.5, 1.5);
    menuGroup.rotation.y = Math.PI / 6; // Angle it slightly toward player
    scene.add(menuGroup);

    // Wooden post/stand
    const postGeometry = new THREE.CylinderGeometry(0.08, 0.08, 2, 8);
    const postMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x654321,
        roughness: 0.9,
        metalness: 0.1
    });
    const post = new THREE.Mesh(postGeometry, postMaterial);
    post.position.y = -1;
    post.castShadow = true;
    menuGroup.add(post);

    // Main wooden board
    const boardGeometry = new THREE.BoxGeometry(2.2, 2.5, 0.12);
    const boardMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8B4513,
        roughness: 0.85,
        metalness: 0.1
    });
    const board = new THREE.Mesh(boardGeometry, boardMaterial);
    board.position.y = 0.2;
    board.castShadow = true;
    board.receiveShadow = true;
    menuGroup.add(board);

    // Decorative frame
    const frameGeometry = new THREE.BoxGeometry(2.3, 2.6, 0.1);
    const frameMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x654321,
        roughness: 0.95,
        metalness: 0.05
    });
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.position.set(0, 0.2, -0.07);
    menuGroup.add(frame);

    // Title
    const titleCanvas = createTextCanvas('SHOOTING GALLERY', 512, 100, 'bold 42px Arial');
    const titleTexture = new THREE.CanvasTexture(titleCanvas);
    const titleMaterial = new THREE.MeshBasicMaterial({ map: titleTexture, transparent: true });
    const titleGeometry = new THREE.PlaneGeometry(1.8, 0.28);
    const titleMesh = new THREE.Mesh(titleGeometry, titleMaterial);
    titleMesh.position.set(0, 1.1, 0.07);
    menuGroup.add(titleMesh);

    // Create buttons
    buttons = [];
    const buttonConfigs = [
        { name: 'EASY', value: 'easy', y: 0.55 },
        { name: 'MEDIUM', value: 'medium', y: 0.15 },
        { name: 'HARD', value: 'hard', y: -0.25 },
        { name: 'START GAME', value: 'start', y: -0.75 },
        { name: 'EXIT VR', value: 'exit', y: -1.15 }
    ];

    buttonConfigs.forEach(config => {
        const button = createButton(config.name, config.value, config.y);
        menuGroup.add(button.mesh);
        buttons.push(button);
    });

    menuGroup.userData.isMenu = true;
    return menuGroup;
}

function createButton(label, value, yPos) {
    const canvas = createTextCanvas(label, 512, 128, 'bold 48px Arial', '#FFD700', '#8B4513');
    const texture = new THREE.CanvasTexture(canvas);
    
    const geometry = new THREE.PlaneGeometry(1.6, 0.28);
    const material = new THREE.MeshBasicMaterial({ 
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, yPos, 0.07);
    
    return {
        mesh,
        canvas,
        texture,
        value,
        label,
        isHovered: false
    };
}

function createTextCanvas(text, width, height, font, textColor = '#FFFFFF', bgColor = null) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    // Background
    if (bgColor) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, width, height);
    }
    
    // Border
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, width - 6, height - 6);
    
    // Text
    ctx.fillStyle = textColor;
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width / 2, height / 2);
    
    return canvas;
}

function updateButtonVisual(button, hovered) {
    const canvas = button.canvas;
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Background - highlight if hovered
    ctx.fillStyle = hovered ? '#D4A259' : '#8B4513';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Border - thicker if hovered
    ctx.strokeStyle = hovered ? '#FFD700' : '#654321';
    ctx.lineWidth = hovered ? 10 : 6;
    ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
    
    // Text - brighter if hovered
    ctx.fillStyle = hovered ? '#FFF700' : '#FFD700';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(button.label, canvas.width / 2, canvas.height / 2);
    
    button.texture.needsUpdate = true;
    button.isHovered = hovered;
}

export function updateVRMenuRaycast(controller, clicked = false) {
    if (!menuGroup || !menuGroup.visible) return null;

    // Create raycaster from controller
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    
    const raycaster = new THREE.Raycaster();
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

    // Check intersection with buttons
    const buttonMeshes = buttons.map(b => b.mesh);
    const intersects = raycaster.intersectObjects(buttonMeshes, false);

    // Update hover states
    let newHovered = null;
    if (intersects.length > 0) {
        const hitMesh = intersects[0].object;
        newHovered = buttons.find(b => b.mesh === hitMesh);
    }

    // Update visuals if hover changed
    if (newHovered !== hoveredButton) {
        if (hoveredButton) {
            updateButtonVisual(hoveredButton, false);
        }
        if (newHovered) {
            updateButtonVisual(newHovered, true);
        }
        hoveredButton = newHovered;
    }

    // If clicked, return the action value of the hovered button
    if (clicked && hoveredButton) {
        return hoveredButton.value;
    }

    return null;
}

export function getHoveredButton() {
    return hoveredButton;
}

export function resetMenuButtons() {
    if (!menuGroup) return;
    buttons.forEach(btn => updateButtonVisual(btn, false));
    hoveredButton = null;
}

export function updateMenuState(state, finalScore = 0) {
    // State can be: 'menu', 'playing', or 'gameover'
    if (!menuGroup) return;
    
    buttons.forEach(btn => {
        const mesh = btn.mesh;
        
        if (state === 'menu') {
            // Show all buttons: EASY, MEDIUM, HARD, START GAME, EXIT VR
            mesh.visible = true;
            if (btn.value === 'start') {
                btn.label = 'START GAME';
                updateButtonVisual(btn, btn.isHovered);
            }
        } else if (state === 'playing') {
            // During gameplay: hide difficulty buttons, show only EXIT VR
            if (btn.value === 'easy' || btn.value === 'medium' || btn.value === 'hard' || btn.value === 'start') {
                mesh.visible = false;
            } else {
                mesh.visible = true;
            }
        } else if (state === 'gameover') {
            // Game over: hide difficulty buttons, show RESTART and EXIT VR
            if (btn.value === 'easy' || btn.value === 'medium' || btn.value === 'hard') {
                mesh.visible = false;
            } else if (btn.value === 'start') {
                mesh.visible = true;
                btn.label = `RESTART (Score: ${finalScore})`;
                btn.value = 'restart';
                updateButtonVisual(btn, btn.isHovered);
            } else {
                mesh.visible = true;
            }
        }
    });
}

export function removeVRMenuBoard(scene) {
    if (!menuGroup) return;
    
    // Dispose all geometries and materials
    menuGroup.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
            if (child.material.map) child.material.map.dispose();
            child.material.dispose();
        }
    });
    
    scene.remove(menuGroup);
    menuGroup = null;
    buttons = [];
    hoveredButton = null;
}
