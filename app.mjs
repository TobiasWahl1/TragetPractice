import * as THREE from '../99_Lib/three.module.min.js';
import { processTimer, addPoints, resetGame, setGameEndCallback, getScore, getTimeLeft, getIsGameActive } from './js/gameLogic.mjs';
import { initHUD, createVRHUD, updateVRHUD, removeVRHUD } from './js/hudManager.mjs';
import { spawnTargets, updateTargets, hitTarget, resetTargets, getTargets } from './js/targets.mjs';
import { createRifle, shoot, attachRifle } from './js/rifle.mjs';
import { initControls, updateControls, updateVRControls } from './js/controls.mjs';
import { initWebXR } from './js/webxr.mjs';
import { createVRMenuBoard, updateVRMenuRaycast, updateMenuState, setButtonSelected, clearDifficultySelection, updateScoreDisplays } from './js/vrMenu.mjs';
import { initializeTextures, updateSkyDomePosition } from './js/textureManager.mjs';

let lastTime = Date.now();
let difficulty = 'medium';
const targetCount = 8;
const roundDurationSeconds = 60;
let gameStarted = false;

window.onload = async function () {
    // Show difficulty menu (Browser)
    const difficultyMenu = document.getElementById('difficulty-menu');
    const difficultyButtons = document.querySelectorAll('.difficulty-btn');
    
    // Initialize HUD
    initHUD();
    
    // Start game function (shared by desktop and VR)
    function startGame() {
        gameStarted = true;
        resetGame(roundDurationSeconds);
        spawnTargets(scene, difficulty, targetCount);
        if (difficultyMenu) {
            difficultyMenu.style.display = 'none';
        }
    }
    
    //Szene
    const scene = new THREE.Scene();
    const world = new THREE.Group();
    scene.add(world);

    //Lichter
    scene.add(new THREE.HemisphereLight(0x808080, 0x606060));
    const light = new THREE.DirectionalLight(0xffffff);
    light.position.set(0, 2, 0);
    scene.add(light);

    // Player rig manages camera offset for desktop and VR
    const playerRig = new THREE.Group();
    playerRig.position.set(0, 0, 2.5); // Desktop start offset behind the stand
    playerRig.scale.setScalar(1);
    world.add(playerRig);

    //Kamera
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0.3, 0); // Local eye height relative to the rig
    playerRig.add(camera);

    //Rifle spawn (placed on stand)
    const rifle = createRifle(scene);

    //Floor
    const width = 0.1;
    const box = new THREE.BoxGeometry(10, width, 30, 10, 1, 10);
    const floor = new THREE.Mesh(box, new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.8, metalness: 0.2 }));
    floor.position.y = -1;
    floor.receiveShadow = true;
    floor.userData.physics = {mass: 0};
    floor.name = "floor";
    world.add(floor);
    
    // Initialize textures (grass floor + sky dome) - works for both VR and Browser
    initializeTextures(scene, floor, camera);
    
    //Player Stand
    const standGeometry = new THREE.BoxGeometry(10, 0.8, 0.3);
    const stand = new THREE.Mesh(standGeometry, new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9, metalness: 0.1 }));
    stand.position.set(0, -0.6, 0.85);
    stand.castShadow = true;
    stand.receiveShadow = true;
    world.add(stand);
    
    //Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    this.document.body.appendChild(renderer.domElement);

    initControls(camera, renderer.domElement, { onShoot: handleShoot, movementRoot: playerRig });
    initWebXR(renderer);

    // Create VR menu board (persistent world object)
    let vrMenuBoard = null;
    let vrHUD = null;
    let inVR = false;

    // Create VR menu boards immediately so they are visible in browser too
    vrMenuBoard = createVRMenuBoard(scene);
    updateMenuState('menu'); // Show initial state: difficulty selection + START GAME

    // Adjust rig offsets when VR sessions start/end
    renderer.xr.addEventListener('sessionstart', () => {
        playerRig.position.set(0, -1, 1.8); // Start further back in VR
        playerRig.scale.setScalar(0.85);   // Slightly reduce perceived user scale
        camera.position.set(0, 0, 0);      // Headset tracking provides the eye height
        
        // Use existing VR menu board
        inVR = true;
        updateMenuState('menu'); // Ensure initial state when entering VR
        
        // Create VR HUD
        vrHUD = createVRHUD(camera);
        
        // Set up game end callback for VR
        setGameEndCallback((finalScore) => {
            if (inVR) {
                updateMenuState('gameover', finalScore);
            }
        });
    });

    renderer.xr.addEventListener('sessionend', () => {
        playerRig.position.set(0, 0, 2.5);
        playerRig.scale.setScalar(1);
        camera.position.set(0, 0.3, 0);
        
        // Keep VR menu board visible in browser
        
        // Remove VR HUD
        if (vrHUD) {
            removeVRHUD(vrHUD, camera);
            vrHUD = null;
        }
        
        inVR = false;
    });

    // VR controllers - add to the player rig for proper positioning
    const controllerRight = renderer.xr.getController(1);
    const controllerRightGrip = renderer.xr.getControllerGrip(1);
    const controllerRay = buildRayHelper();
    controllerRight.add(controllerRay);
    controllerRight.addEventListener('selectstart', onVRSelectStart);
    controllerRight.addEventListener('select', onVRSelect);
    controllerRight.addEventListener('connected', (event) => {
        controllerRight.userData.handedness = event.data.handedness;
        controllerRight.userData.gamepad = event.data.gamepad || null;
    });
    controllerRight.addEventListener('disconnected', () => {
        controllerRight.userData.gamepad = null;
    });
    playerRig.add(controllerRight);
    playerRig.add(controllerRightGrip);

    const controllerLeft = renderer.xr.getController(0);
    const controllerLeftGrip = renderer.xr.getControllerGrip(0);
    controllerLeft.addEventListener('connected', (event) => {
        controllerLeft.userData.handedness = event.data.handedness;
        controllerLeft.userData.gamepad = event.data.gamepad || null;
    });
    controllerLeft.addEventListener('disconnected', () => {
        controllerLeft.userData.gamepad = null;
    });
    playerRig.add(controllerLeft);
    playerRig.add(controllerLeftGrip);

    // Wait for difficulty selection
    difficultyButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            difficulty = btn.dataset.difficulty;
            startGame();
        });
    });

    function render(){
        // Calculate delta time
        const currentTime = Date.now();
        const deltaTime = (currentTime - lastTime) / 1000;
        lastTime = currentTime;

        if (gameStarted && getIsGameActive()) {
            processTimer(deltaTime);
            updateTargets(deltaTime, difficulty);
        }

        // Update VR menu raycasting (even when game not started)
        if (renderer.xr.isPresenting && vrMenuBoard) {
            updateVRMenuRaycast(controllerRight);
        }

        // Enable VR movement
        if (renderer.xr.isPresenting) {
            // VR movement always enabled to navigate to menu
            updateVRControls(deltaTime, renderer.xr.getSession(), camera, playerRig, {
                moveSpeed: 1.8,
                deadZone: 0.15,
                rotateSpeed: 2.0,
                bounds: { xMin: -4.5, xMax: 4.5, zMin: 0.9, zMax: 6.0 }
            });
        } else if (gameStarted) {
            // Desktop controls only when game started
            updateControls(deltaTime, { enableDesktop: true });
            playerRig.position.x = THREE.MathUtils.clamp(playerRig.position.x, -4.5, 4.5);
            playerRig.position.z = THREE.MathUtils.clamp(playerRig.position.z, 0.95, 6.0);
        }

        // Update VR HUD during gameplay
        if (renderer.xr.isPresenting && vrHUD && gameStarted) {
            updateVRHUD(vrHUD, getScore(), getTimeLeft());
        }

        // Update VR score displays continuously
        if (renderer.xr.isPresenting && vrMenuBoard && gameStarted) {
            updateScoreDisplays(getScore());
        }
        
        // Update sky dome position to follow camera
        updateSkyDomePosition();

        renderer.render(scene, camera);
    }
    renderer.setAnimationLoop(render);

    function handleShoot() {
        // Allow rifle pickup anytime, but only shooting when game is active
        if (!rifle.userData.isHeld) {
            tryPickUpRifle();
            return;
        }
        
        // Only allow shooting during active gameplay
        if (!gameStarted || !getIsGameActive()) return;

        const hitTargetMesh = shoot(scene, camera, rifle, getTargets());
        if (hitTargetMesh) {
            if (hitTarget(hitTargetMesh)) {
                addPoints(10);
            }
        }
    }

    function onVRSelectStart() {
        if (!gameStarted || !isGameActive) return;
        if (!rifle.userData.isHeld) {
            tryPickUpRifleVR();
        }
    }

    function onVRSelect() {
        // First check if we clicked a menu button
        if (inVR && vrMenuBoard) {
            const buttonAction = updateVRMenuRaycast(controllerRight, true); // true = clicked
            if (buttonAction) {
                handleMenuAction(buttonAction);
                return;
            }
        }
        
        // Allow rifle pickup anytime
        if (!rifle.userData.isHeld) {
            tryPickUpRifleVR();
            return;
        }
        
        // Only allow shooting during active gameplay
        if (!gameStarted || !getIsGameActive()) return;
        
        const hitTargetMesh = shoot(scene, camera, rifle, getTargets());
        if (hitTargetMesh && hitTarget(hitTargetMesh)) addPoints(10);
    }

    function handleMenuAction(action) {
        switch(action) {
            case 'easy':
            case 'medium':
            case 'hard':
                difficulty = action;
                console.log('Difficulty set to:', difficulty);
                // Clear previous selection and highlight the selected difficulty
                clearDifficultySelection();
                setButtonSelected(action, true);
                // If game is already running, restart with new difficulty
                if (gameStarted && getIsGameActive()) {
                    gameStarted = true;
                    resetGame(roundDurationSeconds);
                    resetTargets();
                    spawnTargets(scene, difficulty, targetCount);
                    updateMenuState('playing', getScore());
                }
                break;
            case 'start':
                if (!gameStarted) {
                    // Check if rifle is picked up before starting
                    if (!rifle.userData.isHeld) {
                        console.log('Please pick up the rifle first!');
                        return;
                    }
                    startGame();
                    updateMenuState('playing', 0); // Start with 0 score
                }
                break;
            case 'restart':
                // Check if rifle is picked up before restarting
                if (!rifle.userData.isHeld) {
                    console.log('Please pick up the rifle first!');
                    return;
                }
                gameStarted = true;
                resetGame(roundDurationSeconds);
                resetTargets();
                spawnTargets(scene, difficulty, targetCount);
                updateMenuState('playing', 0);
                break;
            case 'exit':
                // Exit VR session
                const session = renderer.xr.getSession();
                if (session) {
                    session.end();
                }
                break;
        }
    }

    function tryPickUpRifle() {
        // Raycast from camera center to grab rifle within short distance
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir).normalize();
        camera.getWorldPosition(_tmpVecDesktop);
        const raycaster = new THREE.Raycaster(_tmpVecDesktop, dir, 0, 2.0);
        const hit = raycaster.intersectObject(rifle, false)[0];
        if (hit) {
            // Attach with offset so rifle is visible in front of camera view
            attachRifle(rifle, camera, new THREE.Vector3(0.2, -0.3, -0.6));
        }
    }

    function tryPickUpRifleVR() {
        const origin = new THREE.Vector3();
        const dir = new THREE.Vector3(0, 0, -1);
        controllerRight.getWorldPosition(origin);
        controllerRight.getWorldQuaternion(_tmpQuatVR);
        dir.applyQuaternion(_tmpQuatVR).normalize();
        
        const raycaster = new THREE.Raycaster(origin, dir, 0, 1.0);
        const hit = raycaster.intersectObject(rifle, false)[0];
            if (hit) {
                // Attach to the controller (target ray space) so orientation matches blue ray
                attachRifle(rifle, controllerRight, new THREE.Vector3(0, 0, 0));
        }
    }
    
}

const _tmpQuatVR = new THREE.Quaternion();
const _tmpVecDesktop = new THREE.Vector3();

function buildRayHelper() {
    const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -1)
    ]);
    const material = new THREE.LineBasicMaterial({ color: 0x00ffff });
    const line = new THREE.Line(geometry, material);
    line.scale.z = 2;
    return line;
}