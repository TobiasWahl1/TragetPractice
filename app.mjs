import * as THREE from '../99_Lib/three.module.min.js';
import { processTimer, addPoints, resetGame, isGameActive } from './js/gameLogic.mjs';
import { initHUD } from './js/hudManager.mjs';
import { spawnTargets, updateTargets, hitTarget, resetTargets, getTargets } from './js/targets.mjs';
import { createRifle, shoot, attachRifle } from './js/rifle.mjs';
import { initControls, updateControls, updateVRControls } from './js/controls.mjs';
import { initWebXR } from './js/webxr.mjs';

// VR movement config handled in controls.mjs

let lastTime = Date.now();
let difficulty = 'medium';
const targetCount = 8;
const roundDurationSeconds = 60;
let gameStarted = false;

window.onload = async function () {
    // Show difficulty menu
    const difficultyMenu = document.getElementById('difficulty-menu');
    const difficultyButtons = document.querySelectorAll('.difficulty-btn');
    
    // Initialize HUD (hidden until game starts)
    initHUD();
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
    scene.add(playerRig);

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
    scene.add(floor);
    
    //Player Stand
    const standGeometry = new THREE.BoxGeometry(10, 0.8, 0.3);
    const stand = new THREE.Mesh(standGeometry, new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9, metalness: 0.1 }));
    stand.position.set(0, -0.6, 0.85);
    stand.castShadow = true;
    stand.receiveShadow = true;
    scene.add(stand);
    
    //Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    this.document.body.appendChild(renderer.domElement);

    initControls(camera, renderer.domElement, { onShoot: handleShoot, movementRoot: playerRig });
    initWebXR(renderer);

    // Adjust rig offsets when VR sessions start/end
    renderer.xr.addEventListener('sessionstart', () => {
        playerRig.position.set(0, -1, 1.8); // Start further back in VR
        playerRig.scale.setScalar(0.85);   // Slightly reduce perceived user scale
        camera.position.set(0, 0, 0);      // Headset tracking provides the eye height
    });

    renderer.xr.addEventListener('sessionend', () => {
        playerRig.position.set(0, 0, 2.5);
        playerRig.scale.setScalar(1);
        camera.position.set(0, 0.3, 0);
    });

    // VR controllers (Meta Quest standard) - add to the player rig for proper positioning
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
            difficultyMenu.style.display = 'none';
            startGame();
        });
    });

    function startGame() {
        gameStarted = true;
        resetGame(roundDurationSeconds);
        spawnTargets(scene, difficulty, targetCount);
    }

    function render(){
        // Calculate delta time
        const currentTime = Date.now();
        const deltaTime = (currentTime - lastTime) / 1000;
        lastTime = currentTime;

        if (gameStarted && isGameActive) {
            processTimer(deltaTime);
            updateTargets(deltaTime, difficulty);
        }

        if (gameStarted) {
            updateControls(deltaTime, { enableDesktop: !renderer.xr.isPresenting });
            
            // Desktop bounds
            if (!renderer.xr.isPresenting) {
                playerRig.position.x = THREE.MathUtils.clamp(playerRig.position.x, -4.5, 4.5);
                playerRig.position.z = THREE.MathUtils.clamp(playerRig.position.z, 0.95, 6.0);
            } else {
                updateVRControls(deltaTime, renderer.xr.getSession(), camera, playerRig, {
                    moveSpeed: 1.8,
                    deadZone: 0.15,
                    rotateSpeed: 2.0,
                    bounds: { xMin: -4.5, xMax: 4.5, zMin: 0.9, zMax: 6.0 }
                });
            }
        }

        renderer.render(scene, camera);
    }
    renderer.setAnimationLoop(render);

    function handleShoot() {
        if (!gameStarted || !isGameActive) return;

        // If not holding the rifle, try to pick it up first
        if (!rifle.userData.isHeld) {
            tryPickUpRifle();
            return;
        }

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
        if (!gameStarted || !isGameActive) return;
        if (!rifle.userData.isHeld) {
            tryPickUpRifleVR();
            return;
        }
        const hitTargetMesh = shoot(scene, camera, rifle, getTargets());
        if (hitTargetMesh && hitTarget(hitTargetMesh)) addPoints(10);
    }

    function tryPickUpRifle() {
        // Raycast from camera center to grab rifle within short distance
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir).normalize();
        camera.getWorldPosition(_tmpVecDesktop);
        const raycaster = new THREE.Raycaster(_tmpVecDesktop, dir, 0, 2.0);
        const hit = raycaster.intersectObject(rifle, false)[0];
        if (hit) {
            attachRifle(rifle, camera);
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