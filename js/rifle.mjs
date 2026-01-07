import * as THREE from '../../99_Lib/three.module.min.js';

const laserDurationMs = 120;
let rifleMesh = null;
const _tmpQuat = new THREE.Quaternion();

export function createRifle(scene) {
    if (rifleMesh) return rifleMesh;

    // Cylinder: Radius oben, unten, Höhe
    const geometry = new THREE.CylinderGeometry(0.02, 0.03, 0.6, 12);
    geometry.rotateX(Math.PI / 2);
    geometry.translate(0, 0, -0.25); 

    const material = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.6, metalness: 0.5 });
    rifleMesh = new THREE.Mesh(geometry, material);
    rifleMesh.castShadow = true;
    rifleMesh.receiveShadow = true;

    rifleMesh.position.set(0.2, -0.2, 0.8);
    rifleMesh.userData.isHeld = false;
    scene.add(rifleMesh);
    return rifleMesh;
}

export function attachRifle(rifle, holder, offset = new THREE.Vector3(0, 0, 0)) {
    if (!rifle || !holder) return;
    
    holder.add(rifle);
    rifle.rotation.set(0, 0, 0); 
    rifle.position.copy(offset);
    rifle.userData.isHeld = true;
}

export function detachRifle(rifle, scene) {
	if (!rifle || !scene) return;
	const worldPos = new THREE.Vector3();
	rifle.getWorldPosition(worldPos);
	const worldQuat = new THREE.Quaternion();
	rifle.getWorldQuaternion(worldQuat);
	scene.attach(rifle);
	rifle.position.copy(worldPos);
	rifle.quaternion.copy(worldQuat);
	rifle.userData.isHeld = false;
}

export function shoot(scene, camera, rifle, targetMeshes) {
	const origin = rifle && rifle.parent
		? rifle.localToWorld(new THREE.Vector3(0, 0, -0.35))
		: camera.getWorldPosition(new THREE.Vector3());
	const direction = new THREE.Vector3(0, 0, -1);
	if (rifle && rifle.parent) {
		rifle.getWorldQuaternion(_tmpQuat);
		direction.applyQuaternion(_tmpQuat).normalize();
	} else {
		camera.getWorldDirection(direction).normalize();
	}

	const raycaster = new THREE.Raycaster(origin, direction, 0, 50);
	const intersections = raycaster.intersectObjects(targetMeshes, false);
	const firstHit = intersections.length > 0 ? intersections[0] : null;

	const hitDistance = firstHit ? firstHit.distance : 30;
	drawLaser(scene, origin, direction, hitDistance);

	return firstHit ? firstHit.object : null;
}

function drawLaser(scene, origin, direction, distance) {
	const endPoint = origin.clone().addScaledVector(direction, distance);
	const geometry = new THREE.BufferGeometry().setFromPoints([origin, endPoint]);
	const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
	const line = new THREE.Line(geometry, material);
	scene.add(line);

	setTimeout(() => {
		scene.remove(line);
		geometry.dispose();
		material.dispose();
	}, laserDurationMs);
}
