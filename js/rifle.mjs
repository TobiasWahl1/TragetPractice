import * as THREE from '../../99_Lib/three.module.min.js';

const laserDurationMs = 120;
let rifleMesh = null;

export function createRifle(parent) {
	if (rifleMesh) return rifleMesh;

	const geometry = new THREE.CylinderGeometry(0.03, 0.03, 0.6, 12);
	geometry.rotateX(Math.PI / 2);
	const material = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.6, metalness: 0.3 });
	rifleMesh = new THREE.Mesh(geometry, material);
	rifleMesh.castShadow = true;
	rifleMesh.receiveShadow = true;
	rifleMesh.position.set(0.12, -0.18, -0.6); // keep weapon in view, slightly right/down
	parent.add(rifleMesh);
	return rifleMesh;
}

export function shoot(scene, camera, rifle, targetMeshes) {
	const origin = rifle
		? rifle.localToWorld(new THREE.Vector3(0, 0, -0.35))
		: camera.getWorldPosition(new THREE.Vector3());
	const direction = new THREE.Vector3();
	camera.getWorldDirection(direction).normalize();

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
