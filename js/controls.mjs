import * as THREE from '../../99_Lib/three.module.min.js';

let cameraRef = null;
let domRef = null;
let onShootCb = null;

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

export function initControls(camera, domElement, { onShoot } = {}) {
	cameraRef = camera;
	domRef = domElement;
	onShootCb = onShoot;

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

export function updateControls(deltaTime) {
	if (!cameraRef) return;

	const targetFov = state.aim ? state.aimFov : state.defaultFov;
	cameraRef.fov += (targetFov - cameraRef.fov) * 0.15;
	cameraRef.updateProjectionMatrix();

	applyRotation();
	applyMovement(deltaTime);
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
		cameraRef.position.add(move);
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
