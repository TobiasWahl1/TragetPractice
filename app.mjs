import * as THREE from '../99_Lib/three.module.min.js';

const halfPI = Math.PI / 2;

window.onload = async function () {
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
    const box = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.1, 0.1),
        new THREE.MeshStandardMaterial({ color: 0xff3333, roughness: 0.7, metalness: 0.0, })
    )
    scene.add(box);

    //Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    this.document.body.appendChild(renderer.domElement);
    
    function render(){
        box.rotation.x += 0.01;
        box.rotation.y += 0.01;
        renderer.render(scene, camera);
    }
    renderer.setAnimationLoop(render);
}