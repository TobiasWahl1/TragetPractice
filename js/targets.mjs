import * as THREE from '../../99_Lib/three.module.min.js';

const targets = [];
// Target booth area constraints
const bounds = { 
	xMin: -3.5, xMax: 3.5,     // Left-right range
	yMin: 0.2, yMax: 1.5,       // Up-down range
	zMin: -8, zMax: -5          // Far end of floor (away from player)
};

// Colors for targets
const vibrantColors = [
	0xff0000,  // Bright Red
	0x00ff00,  // Bright Green
	0x0099ff,  // Bright Blue
	0xffff00,  // Bright Yellow
	0xff00ff,  // Magenta
	0x00ffff,  // Cyan
	0xff6600,  // Orange
	0xff0099   // Hot Pink
];

const difficultySettings = {
	easy: { speed: 0.8, jitter: 0, baseDir: new THREE.Vector3(1, 0, 0) },
	medium: { speed: 1.4, jitter: 0.8 },
	hard: { speed: 2.8, jitter: 2.0, moveAllAxes: true }
};

export function spawnTargets(scene, difficulty = 'easy', count = 8) {
	resetTargets(scene);

	const settings = difficultySettings[difficulty] || difficultySettings.easy;

	for (let i = 0; i < count; i++) {
		const target = createTargetMesh();
		target.position.set(
			THREE.MathUtils.randFloat(bounds.xMin, bounds.xMax),
			THREE.MathUtils.randFloat(bounds.yMin, bounds.yMax),
			THREE.MathUtils.randFloat(bounds.zMin, bounds.zMax)
		);

		const initialDir = settings.baseDir ? settings.baseDir.clone() : randomDirection(!!settings.moveAllAxes);
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
			if (settings.moveAllAxes) {
				vel.y += (Math.random() - 0.5) * settings.jitter * deltaTime;
			}
			const maxSpeed = settings.speed * 1.4;
			vel.clampLength(0, maxSpeed);
		}

		target.position.addScaledVector(vel, deltaTime);

		// Constrain to target booth bounds
		if (target.position.x < bounds.xMin) {
			target.position.x = bounds.xMin;
			vel.x *= -1;
		} else if (target.position.x > bounds.xMax) {
			target.position.x = bounds.xMax;
			vel.x *= -1;
		}

		if (target.position.y < bounds.yMin) {
			target.position.y = bounds.yMin;
			vel.y *= -1;
		} else if (target.position.y > bounds.yMax) {
			target.position.y = bounds.yMax;
			vel.y *= -1;
		}

		if (target.position.z < bounds.zMin) {
			target.position.z = bounds.zMin;
			vel.z *= -1;
		} else if (target.position.z > bounds.zMax) {
			target.position.z = bounds.zMax;
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
	
	// Respawn at random position in booth area
	target.position.set(
		THREE.MathUtils.randFloat(bounds.xMin, bounds.xMax),
		THREE.MathUtils.randFloat(bounds.yMin, bounds.yMax),
		THREE.MathUtils.randFloat(bounds.zMin, bounds.zMax)
	);
	
	// Reset velocity
	const initialDir = settings.baseDir ? settings.baseDir.clone() : randomDirection(!!settings.moveAllAxes);
	target.userData.velocity = initialDir.multiplyScalar(settings.speed);
}

function createTargetMesh() {
	const geometry = new THREE.CylinderGeometry(0.12, 0.12, 0.15, 24);
	// Choose a random vibrant color
	const color = vibrantColors[Math.floor(Math.random() * vibrantColors.length)];
	const material = new THREE.MeshStandardMaterial({ 
		color: color, 
		roughness: 0.5, 
		metalness: 0.3,
		emissive: color,
		emissiveIntensity: 0.2
	});
	const mesh = new THREE.Mesh(geometry, material);
	mesh.castShadow = true;
	mesh.receiveShadow = true;
	return mesh;
}

function randomDirection(includeY = false) {
	const dir = new THREE.Vector3(
		Math.random() - 0.5,
		includeY ? Math.random() - 0.5 : 0,
		Math.random() - 0.5
	);
	dir.normalize();
	return dir;
}
