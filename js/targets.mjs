import * as THREE from '../../99_Lib/three.module.min.js';

const targets = [];
const bounds = { x: 4.5, y: 1.5, z: 3.5 };

const difficultySettings = {
	easy: { speed: 0.8, jitter: 0, baseDir: new THREE.Vector3(1, 0, 0) },
	medium: { speed: 1.4, jitter: 0.8 },
	hard: { speed: 2.2, jitter: 1.6 }
};

export function spawnTargets(scene, difficulty = 'easy', count = 8) {
	resetTargets(scene);

	const settings = difficultySettings[difficulty] || difficultySettings.easy;

	for (let i = 0; i < count; i++) {
		const target = createTargetMesh();
		target.position.set(
			THREE.MathUtils.randFloatSpread(bounds.x),
			THREE.MathUtils.randFloat(0.3, 1.2),
			-THREE.MathUtils.randFloat(2.0, bounds.z)
		);

		const initialDir = settings.baseDir ? settings.baseDir.clone() : randomDirection();
		target.userData.velocity = initialDir.multiplyScalar(settings.speed);
		target.userData.isHit = false;
		target.userData.respawnTimer = 0;
		scene.add(target);
		targets.push(target);
	}
	return targets;
}

export function updateTargets(deltaTime, difficulty = 'easy') {
	const settings = difficultySettings[difficulty] || difficultySettings.easy;

	for (const target of targets) {
		// Handle respawn timer
		if (target.userData.isHit) {
			target.userData.respawnTimer -= deltaTime;
			if (target.userData.respawnTimer <= 0) {
				respawnTarget(target, settings);
			}
			continue;
		}

		const vel = target.userData.velocity;

		if (settings.jitter > 0) {
			vel.x += (Math.random() - 0.5) * settings.jitter * deltaTime;
			vel.z += (Math.random() - 0.5) * settings.jitter * deltaTime;
			const maxSpeed = settings.speed * 1.4;
			vel.clampLength(0, maxSpeed);
		}

		target.position.addScaledVector(vel, deltaTime);

		if (Math.abs(target.position.x) > bounds.x) {
			target.position.x = Math.sign(target.position.x) * bounds.x;
			vel.x *= -1;
		}

		if (Math.abs(target.position.z) > bounds.z) {
			target.position.z = Math.sign(target.position.z) * bounds.z;
			vel.z *= -1;
		}
	}
}

export function hitTarget(target) {
	if (target.userData.isHit) return false;
	
	target.userData.isHit = true;
	target.userData.respawnTimer = 3.0; // 3 seconds
	target.visible = false;
	return true;
}

export function removeTarget(target, scene) {
	const idx = targets.indexOf(target);
	if (idx !== -1) {
		scene.remove(target);
		target.geometry.dispose();
		target.material.dispose();
		targets.splice(idx, 1);
	}
}

export function resetTargets(scene) {
	for (const t of targets) {
		scene.remove(t);
		t.geometry.dispose();
		t.material.dispose();
	}
	targets.length = 0;
}

export function getTargets() {
	return targets.filter(t => !t.userData.isHit);
}

function respawnTarget(target, settings) {
	target.userData.isHit = false;
	target.visible = true;
	
	// Respawn at random position
	target.position.set(
		THREE.MathUtils.randFloatSpread(bounds.x),
		THREE.MathUtils.randFloat(0.3, 1.2),
		-THREE.MathUtils.randFloat(2.0, bounds.z)
	);
	
	// Reset velocity
	const initialDir = settings.baseDir ? settings.baseDir.clone() : randomDirection();
	target.userData.velocity = initialDir.multiplyScalar(settings.speed);
}

function createTargetMesh() {
	const geometry = new THREE.CylinderGeometry(0.12, 0.12, 0.15, 24);
	const material = new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.6, metalness: 0.2 });
	const mesh = new THREE.Mesh(geometry, material);
	mesh.castShadow = true;
	mesh.receiveShadow = true;
	return mesh;
}

function randomDirection() {
	const dir = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5);
	dir.normalize();
	return dir;
}
