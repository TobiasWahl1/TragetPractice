import * as THREE from '../../99_Lib/three.module.min.js';

let menuGroup = null;
let boards = {
    difficulty: null,
    gameControl: null,
    highScore: null,
    extra: null
};
let highScore = 0;
let buttons = [];
let hoveredButton = null;
let currentInfoSlide = 0;
let infoSlideContent = null; // Will hold the text mesh for slide content

export function createVRMenuBoard(scene) {
    if (menuGroup) return menuGroup;

    menuGroup = new THREE.Group();
    scene.add(menuGroup);

    // Board 1: Difficulty Selection (right)
    boards.difficulty = createBoardWithPosts(
        'DIFFICULTY',
        [
            { name: 'EASY', value: 'easy', y: 0.2 },
            { name: 'MEDIUM', value: 'medium', y: -0.05 },
            { name: 'HARD', value: 'hard', y: -0.3 }
        ],
        3, -0.2, 1.5
    );
    boards.difficulty.rotation.y = -Math.PI / 2; // Face toward player spawn
    menuGroup.add(boards.difficulty);

    // Board 2: Game Control (middle)
    boards.gameControl = createBoardWithPosts(
        'GAME CONTROL',
        [
            { name: 'START GAME', value: 'start', y: 0.2 },
            { name: 'RESTART', value: 'restart', y: -0.05 },
            { name: 'EXIT VR', value: 'exit', y: -0.3 }
        ],
        3, -0.2, 3
    );
    boards.gameControl.rotation.y = -Math.PI / 2; // Face toward player spawn
    menuGroup.add(boards.gameControl);

    // Board 3: High Score (left)
    boards.highScore = createBoardWithPosts(
        'HIGH SCORE',
        [
            { name: 'Best: 0', value: 'highscore_display', y: 0.15, isReadOnly: true },
            { name: 'Current: 0', value: 'current_score_display', y: -0.15, isReadOnly: true }
        ],
        3, -0.2, 4.5
    );
    boards.highScore.rotation.y = -Math.PI / 2; // Face toward player spawn
    menuGroup.add(boards.highScore);

    // Board 4: Info Board with slides
    boards.extra = createBoardWithPosts(
        'HOW TO PLAY',
        [
            { name: '<', value: 'slide_prev', y: -0.45, isReadOnly: false },
            { name: '>', value: 'slide_next', y: -0.45, isReadOnly: false }
        ],
        -3, -0.2, 3
    );
    boards.extra.rotation.y = Math.PI / 2; // Face toward player spawn
    
    // Position navigation buttons at bottom corners
    const prevButton = buttons[buttons.length - 2];
    const nextButton = buttons[buttons.length - 1];
    prevButton.mesh.position.x = -0.35;
    prevButton.mesh.geometry = new THREE.PlaneGeometry(0.15, 0.15); // Smaller square buttons
    nextButton.mesh.position.x = 0.35;
    nextButton.mesh.geometry = new THREE.PlaneGeometry(0.15, 0.15); // Smaller square buttons
    
    // Create slide content display
    infoSlideContent = createInfoSlideDisplay();
    boards.extra.add(infoSlideContent);
    updateInfoSlide(0); // Show first slide
    
    menuGroup.add(boards.extra);

    menuGroup.userData.isMenu = true;
    return menuGroup;
}

function createBoardWithPosts(title, buttonConfigs, posX, posY, posZ) {
    const boardGroup = new THREE.Group();
    boardGroup.position.set(posX, posY, posZ);

    // Two wooden posts
    const postGeometry = new THREE.CylinderGeometry(0.04, 0.04, 1.4, 8);
    const postMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x654321,
        roughness: 0.9,
        metalness: 0.1
    });
    
    const post1 = new THREE.Mesh(postGeometry, postMaterial);
    post1.position.set(-0.45, -0.5, 0);
    post1.castShadow = true;
    boardGroup.add(post1);

    const post2 = new THREE.Mesh(postGeometry, postMaterial);
    post2.position.set(0.45, -0.5, 0);
    post2.castShadow = true;
    boardGroup.add(post2);

    // Wooden sign in the middle
    const signGeometry = new THREE.BoxGeometry(1.0, 1.2, 0.08);
    const signMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8B4513,
        roughness: 0.85,
        metalness: 0.1
    });
    const sign = new THREE.Mesh(signGeometry, signMaterial);
    sign.position.y = 0.2;
    sign.castShadow = true;
    sign.receiveShadow = true;
    boardGroup.add(sign);

    // Decorative frame around sign
    const frameGeometry = new THREE.BoxGeometry(1.05, 1.25, 0.06);
    const frameMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x654321,
        roughness: 0.95,
        metalness: 0.05
    });
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.position.set(0, 0.2, -0.05);
    boardGroup.add(frame);

    // Title text
    const titleCanvas = createTextCanvas(title, 512, 80, 'bold 32px Arial');
    const titleTexture = new THREE.CanvasTexture(titleCanvas);
    const titleMaterial = new THREE.MeshBasicMaterial({ map: titleTexture, transparent: true });
    const titleGeometry = new THREE.PlaneGeometry(0.85, 0.18);
    const titleMesh = new THREE.Mesh(titleGeometry, titleMaterial);
    titleMesh.position.set(0, 0.65, 0.05);
    boardGroup.add(titleMesh);

    // Create buttons on this board
    buttonConfigs.forEach(config => {
        const button = createButton(config.name, config.value, config.y, config.isReadOnly || false);
        boardGroup.add(button.mesh);
        buttons.push(button);
    });

    return boardGroup;
}

function createInfoSlideDisplay() {
    // Create a text display for slide content
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const texture = new THREE.CanvasTexture(canvas);
    
    const material = new THREE.MeshBasicMaterial({ 
        map: texture, 
        transparent: true 
    });
    const geometry = new THREE.PlaneGeometry(0.9, 0.9);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, 0.1, 0.05);
    
    mesh.userData.canvas = canvas;
    mesh.userData.texture = texture;
    
    return mesh;
}

function getSlideContent(slideIndex) {
    const slides = [
        {
            title: 'CONTROLS',
            lines: [
                'Left Joystick:',
                '  Move Forward/Back/Left/Right',
                '',
                'Right Joystick:',
                '  Rotate Camera',
                '',
                'Right Trigger:',
                '  Pick up Rifle / Shoot'
            ]
        },
        {
            title: 'GAME RULES',
            lines: [
                '1. Select Difficulty',
                '   (Easy/Medium/Hard)',
                '',
                '2. Pick up the Rifle',
                '',
                '3. Point at START GAME',
                '   and pull trigger',
                '',
                '4. Shoot targets to score!',
                '   You have 30 seconds'
            ]
        }
    ];
    
    return slides[slideIndex] || slides[0];
}

function updateInfoSlide(slideIndex) {
    if (!infoSlideContent) return;
    
    const totalSlides = 2;
    currentInfoSlide = ((slideIndex % totalSlides) + totalSlides) % totalSlides;
    
    const canvas = infoSlideContent.userData.canvas;
    const ctx = canvas.getContext('2d');
    const slide = getSlideContent(currentInfoSlide);
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw slide title
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 42px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(slide.title, canvas.width / 2, 60);
    
    // Draw slide content
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '28px Arial';
    ctx.textAlign = 'left';
    
    let yPos = 120;
    slide.lines.forEach(line => {
        ctx.fillText(line, 60, yPos);
        yPos += 36;
    });
    
    // Draw slide indicator
    ctx.fillStyle = '#888888';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${currentInfoSlide + 1} / ${totalSlides}`, canvas.width / 2, canvas.height - 30);
    
    // Update texture
    infoSlideContent.userData.texture.needsUpdate = true;
}

function createButton(label, value, yPos, isReadOnly = false) {
    const canvas = createTextCanvas(label, 512, 128, 'bold 36px Arial', '#FFD700', '#8B4513');
    const texture = new THREE.CanvasTexture(canvas);
    
    const geometry = new THREE.PlaneGeometry(0.8, 0.18);
    const material = new THREE.MeshBasicMaterial({ 
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, yPos, 0.05);
    
    return {
        mesh,
        canvas,
        texture,
        value,
        label,
        isHovered: false,
        isSelected: false,
        isReadOnly
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
    
    // Background
    if (button.isSelected) {
        ctx.fillStyle = hovered ? '#90C880' : '#6B8E5C'; // Green when selected
    } else {
        ctx.fillStyle = hovered ? '#D4A259' : '#8B4513'; // Orange hover or brown default
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Border
    if (button.isSelected) {
        ctx.strokeStyle = hovered ? '#90EE90' : '#76B868';
        ctx.lineWidth = 10;
    } else {
        ctx.strokeStyle = hovered ? '#FFD700' : '#654321';
        ctx.lineWidth = hovered ? 10 : 6;
    }
    ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
    
    // Text - brighter if hovered or selected
    if (button.isSelected) {
        ctx.fillStyle = '#FFFFFF'; // White text when selected
    } else {
        ctx.fillStyle = hovered ? '#FFF700' : '#FFD700';
    }
    ctx.font = 'bold 36px Arial';
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
        // Handle slide navigation
        if (hoveredButton.value === 'slide_prev') {
            updateInfoSlide(currentInfoSlide - 1);
            return null; // Don't pass to app.mjs
        } else if (hoveredButton.value === 'slide_next') {
            updateInfoSlide(currentInfoSlide + 1);
            return null; // Don't pass to app.mjs
        }
        return hoveredButton.value;
    }

    return null;
}

export function updateMenuRaycastFromCamera(camera, pointerNDC, clicked = false) {
    if (!menuGroup || !menuGroup.visible) return null;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointerNDC, camera);

    const buttonMeshes = buttons.map(b => b.mesh);
    const intersects = raycaster.intersectObjects(buttonMeshes, false);

    let newHovered = null;
    if (intersects.length > 0) {
        const hitMesh = intersects[0].object;
        newHovered = buttons.find(b => b.mesh === hitMesh);
    }

    if (newHovered !== hoveredButton) {
        if (hoveredButton) {
            updateButtonVisual(hoveredButton, false);
        }
        if (newHovered) {
            updateButtonVisual(newHovered, true);
        }
        hoveredButton = newHovered;
    }

    if (clicked && hoveredButton && !hoveredButton.isReadOnly) {
        if (hoveredButton.value === 'slide_prev') {
            updateInfoSlide(currentInfoSlide - 1);
            return null;
        } else if (hoveredButton.value === 'slide_next') {
            updateInfoSlide(currentInfoSlide + 1);
            return null;
        }
        return hoveredButton.value;
    }

    return null;
}

export function setButtonSelected(value, selected = true) {
    // Find button by value and set its selected state
    const button = buttons.find(b => b.value === value);
    if (button) {
        button.isSelected = selected;
        updateButtonVisual(button, button.isHovered);
    }
}

export function clearDifficultySelection() {
    // Clear selection from all difficulty buttons
    buttons.forEach(btn => {
        if (btn.value === 'easy' || btn.value === 'medium' || btn.value === 'hard') {
            btn.isSelected = false;
            updateButtonVisual(btn, btn.isHovered);
        }
    });
}

export function updateMenuState(state, currentScore = 0) {
    // State can be: 'menu', 'playing', or 'gameover'
    if (!menuGroup) return;
    
    // Keep all boards visible at all times
    boards.difficulty.visible = true;
    boards.gameControl.visible = true;
    boards.highScore.visible = true;
    boards.extra.visible = true;
    
    // Update button visibility based on state
    buttons.forEach(btn => {
        if (state === 'menu') {
            btn.mesh.visible = true;
            if (btn.value === 'start') {
                btn.label = 'START GAME';
                updateButtonVisual(btn, btn.isHovered);
            }
        } else if (state === 'playing') {
            // During gameplay: hide START GAME, keep everything else visible
            if (btn.value === 'start') {
                btn.mesh.visible = false;
            } else if (btn.value === 'restart') {
                btn.mesh.visible = true;
                btn.label = 'RESTART';
                updateButtonVisual(btn, btn.isHovered);
            } else {
                btn.mesh.visible = true;
            }
        } else if (state === 'gameover') {
            // Game over: hide START, show RESTART
            if (btn.value === 'start') {
                btn.mesh.visible = false;
            } else if (btn.value === 'restart') {
                btn.mesh.visible = true;
                btn.label = 'RESTART';
                updateButtonVisual(btn, btn.isHovered);
            } else {
                btn.mesh.visible = true;
            }
            
            // Update highscore if current score is better
            if (currentScore > highScore) {
                highScore = currentScore;
            }
        }
    });
    
    // Update score displays
    updateScoreDisplays(currentScore);
}

export function updateScoreDisplays(currentScore) {
    // Update current score display
    const currentScoreButton = buttons.find(b => b.value === 'current_score_display');
    if (currentScoreButton) {
        currentScoreButton.label = `Current: ${currentScore}`;
        updateButtonVisual(currentScoreButton, false);
    }
    
    // Update high score display
    const highScoreButton = buttons.find(b => b.value === 'highscore_display');
    if (highScoreButton) {
        highScoreButton.label = `Best: ${highScore}`;
        updateButtonVisual(highScoreButton, false);
    }
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
