import * as THREE from '../99_Lib/three.module.min.js';
import { processTimer } from './js/gameLogic.mjs';
import { initHUD } from './js/hudManager.mjs';

const halfPI = Math.PI / 2;
let lastTime = Date.now();

window.onload = async function () {
    // Initialize HUD
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
    camera.position.set(0, 0, 1);
    scene.add(camera);

    //Objekt
    const cube = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.1, 0.1),
        new THREE.MeshStandardMaterial({ color: 0xff3333, roughness: 0.7, metalness: 0.0, })
    )
    scene.add(cube);

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
    
    function render(){
        // Calculate delta time
        const currentTime = Date.now();
        const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
        lastTime = currentTime;

        // Update timer
        processTimer(deltaTime);

        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;
        renderer.render(scene, camera);
    }
    renderer.setAnimationLoop(render);
}