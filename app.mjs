import * as THREE from '../99_Lib/three.module.min.js';
import { processTimer, addPoints, resetGame, isGameActive } from './js/gameLogic.mjs';
import { initHUD } from './js/hudManager.mjs';
import { spawnTargets, updateTargets, removeTarget, resetTargets, getTargets } from './js/targets.mjs';
import { createRifle, shoot } from './js/rifle.mjs';
import { initControls, updateControls } from './js/controls.mjs';

const halfPI = Math.PI / 2;
let lastTime = Date.now();
const difficulty = 'medium';
const targetCount = 8;
const roundDurationSeconds = 60;

window.onload = async function () {
    // Initialize HUD
    initHUD();
    resetGame(roundDurationSeconds);
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
    camera.position.set(0, 0, 1);
    scene.add(camera);

    //Rifle spawn (attached to camera so it stays in view)
    const rifle = createRifle(camera);

    //Targets
    spawnTargets(scene, difficulty, targetCount);

    //Floor
    const width = 0.1;
    const box = new THREE.BoxGeometry(10, width, 10, 10, 1, 10);
    const floor = new THREE.Mesh(box, new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.8, metalness: 0.2 }));
    floor.position.y = -1;
    floor.receiveShadow = true;
    floor.userData.physics = {mass: 0};
    floor.name = "floor";
    scene.add(floor);

    //Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    this.document.body.appendChild(renderer.domElement);

    initControls(camera, renderer.domElement, { onShoot: handleShoot });

    function render(){
        // Calculate delta time
        const currentTime = Date.now();
        const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
        lastTime = currentTime;

        if (isGameActive) {
            processTimer(deltaTime);
            updateTargets(deltaTime, difficulty);
        }

        updateControls(deltaTime);

        renderer.render(scene, camera);
    }
    renderer.setAnimationLoop(render);

    function handleShoot() {
        if (!isGameActive) return;
        const hitTarget = shoot(scene, camera, rifle, getTargets());
        if (hitTarget) {
            removeTarget(hitTarget, scene);
            addPoints(10);
        }
    }
}