import * as THREE from '../../99_Lib/three.module.min.js';

export function createSceneGraph(aspect) {
    const scene = new THREE.Scene();
    const world = new THREE.Group();
    scene.add(world);

    // Lights
    scene.add(new THREE.HemisphereLight(0x808080, 0x606060));
    const light = new THREE.DirectionalLight(0xffffff);
    light.position.set(0, 2, 0);
    scene.add(light);

    // Player rig manages camera offset for desktop and VR
    const playerRig = new THREE.Group();
    playerRig.position.set(0, 0, 2.5); // Desktop start offset behind the stand
    playerRig.scale.setScalar(1);
    world.add(playerRig);

    // Camera
    const camera = new THREE.PerspectiveCamera(70, aspect, 0.1, 100);
    camera.position.set(0, 0.3, 0); // Local eye height relative to the rig
    playerRig.add(camera);

    // Floor
    const width = 0.1;
    const box = new THREE.BoxGeometry(10, width, 30, 10, 1, 10);
    const floor = new THREE.Mesh(box, new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.8, metalness: 0.2 }));
    floor.position.y = -1;
    floor.receiveShadow = true;
    floor.userData.physics = { mass: 0 };
    floor.name = 'floor';
    world.add(floor);

    // Player stand
    const standGeometry = new THREE.BoxGeometry(10, 0.8, 0.3);
    const stand = new THREE.Mesh(standGeometry, new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9, metalness: 0.1 }));
    stand.position.set(0, -0.6, 0.85);
    stand.castShadow = true;
    stand.receiveShadow = true;
    world.add(stand);

    return { scene, world, playerRig, camera, floor, stand, light };
}
