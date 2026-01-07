import * as THREE from '../99_Lib/three.module.min.js';
import { processTimer, addPoints, resetGame, isGameActive } from './js/gameLogic.mjs';
import { initHUD } from './js/hudManager.mjs';
import { spawnTargets, updateTargets, hitTarget, resetTargets, getTargets } from './js/targets.mjs';
import { createRifle, shoot } from './js/rifle.mjs';
import { initControls, updateControls } from './js/controls.mjs';
import { initWebXR } from './js/webxr.mjs';

const halfPI = Math.PI / 2;
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

    //Kamera
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 1.5);
    scene.add(camera);

    //Rifle spawn
    const rifle = createRifle(camera);

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
    this.document.body.appendChild(renderer.domElement);

    initControls(camera, renderer.domElement, { onShoot: handleShoot });
    initWebXR(renderer);

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
            updateControls(deltaTime);
            
            // Keep player behind the stand
            if (camera.position.z < 1.2) {
                camera.position.z = 1.2;
            }
            // Keep player in bounds
            camera.position.x = Math.max(-4.5, Math.min(4.5, camera.position.x));
            camera.position.z = Math.max(1.2, camera.position.z);
        }

        renderer.render(scene, camera);
    }
    renderer.setAnimationLoop(render);

    function handleShoot() {
        if (!gameStarted || !isGameActive) return;
        const hitTargetMesh = shoot(scene, camera, rifle, getTargets());
        if (hitTargetMesh) {
            if (hitTarget(hitTargetMesh)) {
                addPoints(10);
            }
        }
    }
}