import * as THREE from '../../99_Lib/three.module.min.js';

let cameraRef = null;
let domRef = null;
let onShootCb = null;
let movementRoot = null;

const state = {
	moveForward: false,
	moveBackward: false,
	moveLeft: false,
	moveRight: false,
	yaw: 0,
	pitch: 0,
	aim: false,
	defaultFov: 70,
	aimFov: 55,
	speed: 2.5,
	sensitivity: 0.0025
};

export function initControls(camera, domElement, { onShoot, movementRoot: root } = {}) {
	cameraRef = camera;
	domRef = domElement;
	onShootCb = onShoot;
	movementRoot = root ?? null;

	state.yaw = camera.rotation.y;
	state.pitch = camera.rotation.x;
	state.defaultFov = camera.fov;

	domElement.addEventListener('mousedown', onMouseDown);
	domElement.addEventListener('mouseup', onMouseUp);
	domElement.addEventListener('mousemove', onMouseMove);
	domElement.addEventListener('contextmenu', e => e.preventDefault());

	window.addEventListener('keydown', onKeyDown);
	window.addEventListener('keyup', onKeyUp);
	document.addEventListener('pointerlockchange', onPointerLockChange);
}

export function updateControls(deltaTime, { enableDesktop = true } = {}) {
	if (!cameraRef || !enableDesktop) return;

	const targetFov = state.aim ? state.aimFov : state.defaultFov;
	cameraRef.fov += (targetFov - cameraRef.fov) * 0.15;
	cameraRef.updateProjectionMatrix();

	applyRotation();
	applyMovement(deltaTime);
}

// ---- VR joystick locomotion & snap rotation ----
const _vrForward = new THREE.Vector3();
const _vrRight = new THREE.Vector3();
const _vrMove = new THREE.Vector3();

function getAxes2D(source) {
	if (!source.gamepad || !source.gamepad.axes || source.gamepad.axes.length < 2) return null;
	const axes = source.gamepad.axes;
	// Prefer last two axes if available
	if (axes.length >= 4) {
		return { x: axes[2], y: axes[3], raw: axes };
	}
	return { x: axes[0], y: axes[1], raw: axes };
}

export function updateVRControls(deltaTime, session, camera, rig, {
	moveSpeed = 1.8,
	deadZone = 0.15,
	rotateSpeed = 2.0,
	bounds = { xMin: -4.5, xMax: 4.5, zMin: 0.9, zMax: 6.0 }
} = {}) {
	if (!session || !camera || !rig) return;

	for (const source of session.inputSources) {
		if (!source.gamepad) continue;

		// Left hand: locomotion
		if (source.handedness === 'left') {
			const axes = getAxes2D(source);
			if (!axes) continue;

			let { x: axisX, y: axisY } = axes;
			const magnitude = Math.hypot(axisX, axisY);
			if (magnitude >= deadZone) {
				const normalized = Math.min(1, (magnitude - deadZone) / (1 - deadZone));
				axisX = (axisX / magnitude) * normalized;
				axisY = (axisY / magnitude) * normalized;

				// Use rig rotation (body direction) instead of camera (head direction)
				const rigRotation = rig.rotation.y;
				const cosR = Math.cos(rigRotation);
				const sinR = Math.sin(rigRotation);
				
				_vrForward.set(-sinR, 0, -cosR).normalize();
				_vrRight.set(cosR, 0, -sinR).normalize();

				_vrMove.set(0, 0, 0);
				_vrMove.addScaledVector(_vrRight, axisX);
				_vrMove.addScaledVector(_vrForward, -axisY);
				if (_vrMove.lengthSq() > 1) _vrMove.normalize();

				rig.position.addScaledVector(_vrMove, moveSpeed * deltaTime);
			}
		}

		// Right hand: yaw rotation
		if (source.handedness === 'right' && source.gamepad && source.gamepad.axes && source.gamepad.axes.length >= 2) {
			const axes = source.gamepad.axes;
			const rotateX = axes.length >= 4 ? axes[2] : axes[0];
			if (Math.abs(rotateX) > deadZone) {
				rig.rotation.y -= rotateX * rotateSpeed * deltaTime;
			}
		}
	}

	// Clamp bounds post movement
	rig.position.x = THREE.MathUtils.clamp(rig.position.x, bounds.xMin, bounds.xMax);
	rig.position.z = THREE.MathUtils.clamp(rig.position.z, bounds.zMin, bounds.zMax);
}

function onMouseDown(event) {
	if (!domRef) return;
	if (event.button === 0) {
		if (!isLocked()) {
			domRef.requestPointerLock();
		} else if (onShootCb) {
			onShootCb();
		}
	} else if (event.button === 2) {
		state.aim = true;
		if (!isLocked()) domRef.requestPointerLock();
	}
}

function onMouseUp(event) {
	if (event.button === 2) {
		state.aim = false;
	}
}

function onMouseMove(event) {
	if (!isLocked()) return;
	state.yaw -= event.movementX * state.sensitivity;
	state.pitch -= event.movementY * state.sensitivity;
	const limit = Math.PI / 2 - 0.05;
	state.pitch = Math.max(-limit, Math.min(limit, state.pitch));
}

function onKeyDown(event) {
	switch (event.code) {
		case 'KeyW': state.moveForward = true; break;
		case 'KeyS': state.moveBackward = true; break;
		case 'KeyA': state.moveLeft = true; break;
		case 'KeyD': state.moveRight = true; break;
	}
}

function onKeyUp(event) {
	switch (event.code) {
		case 'KeyW': state.moveForward = false; break;
		case 'KeyS': state.moveBackward = false; break;
		case 'KeyA': state.moveLeft = false; break;
		case 'KeyD': state.moveRight = false; break;
	}
}

function applyRotation() {
	cameraRef.rotation.set(state.pitch, state.yaw, 0, 'YXZ');
}

function applyMovement(deltaTime) {
	const dir = new THREE.Vector3();
	cameraRef.getWorldDirection(dir);
	dir.y = 0;
	dir.normalize();

	const right = new THREE.Vector3().crossVectors(dir, cameraRef.up).normalize();

	const move = new THREE.Vector3();
	if (state.moveForward) move.add(dir);
	if (state.moveBackward) move.sub(dir);
	if (state.moveLeft) move.sub(right);
	if (state.moveRight) move.add(right);

	if (move.lengthSq() > 0) {
		move.normalize().multiplyScalar(state.speed * deltaTime);
		if (movementRoot) {
			movementRoot.position.add(move);
		} else {
			cameraRef.position.add(move);
		}
	}
}

function onPointerLockChange() {
	if (!isLocked()) {
		state.aim = false;
	}
}

function isLocked() {
	return document.pointerLockElement === domRef;
}
