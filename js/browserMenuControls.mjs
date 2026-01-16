import * as THREE from '../../99_Lib/three.module.min.js';
import { updateMenuRaycastFromCamera } from './vrMenu.mjs';

export function initBrowserMenuControls(renderer, camera, onAction) {
    const pointerNDC = new THREE.Vector2();
    let rafId = null;

    function updatePointerFromEvent(event) {
        const rect = renderer.domElement.getBoundingClientRect();
        pointerNDC.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointerNDC.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    function getActivePointer() {
        if (document.pointerLockElement === renderer.domElement) {
            return { x: 0, y: 0 };
        }
        return { x: pointerNDC.x, y: pointerNDC.y };
    }

    function onPointerMove(event) {
        if (renderer.xr.isPresenting) return;
        if (document.pointerLockElement !== renderer.domElement) {
            updatePointerFromEvent(event);
        }
    }

    function onClick(event) {
        if (renderer.xr.isPresenting) return;
        if (document.pointerLockElement !== renderer.domElement) {
            updatePointerFromEvent(event);
        }
        const activePointer = getActivePointer();
        const action = updateMenuRaycastFromCamera(camera, activePointer, true);
        if (action && onAction) {
            onAction(action);
        }
    }

    function tick() {
        if (!renderer.xr.isPresenting) {
            const activePointer = getActivePointer();
            updateMenuRaycastFromCamera(camera, activePointer, false);
        }
        rafId = requestAnimationFrame(tick);
    }

    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('click', onClick);
    tick();

    return () => {
        renderer.domElement.removeEventListener('pointermove', onPointerMove);
        renderer.domElement.removeEventListener('click', onClick);
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
    };
}
