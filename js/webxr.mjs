import * as THREE from '../../99_Lib/three.module.min.js';

let xrSession = null;
let xrRefSpace = null;

export async function initWebXR(renderer) {
    const btn = document.getElementById('webxr-btn');
    
    // Check if WebXR is supported
    if (!navigator.xr) {
        console.warn('WebXR not supported');
        btn.disabled = true;
        btn.textContent = 'VR Not Supported';
        return false;
    }

    // Check for immersive-vr support
    try {
        const isSupported = await navigator.xr.isSessionSupported('immersive-vr');
        if (isSupported) {
            btn.addEventListener('click', () => onWebXRButtonClick(renderer));
            btn.style.display = 'flex';
            return true;
        } else {
            console.warn('immersive-vr not supported');
            btn.disabled = true;
            btn.textContent = 'VR Not Supported';
        }
    } catch (e) {
        console.warn('WebXR session not supported:', e);
        btn.disabled = true;
        btn.textContent = 'VR Not Supported';
    }
    return false;
}

async function onWebXRButtonClick(renderer) {
    const btn = document.getElementById('webxr-btn');
    
    if (xrSession) {
        await xrSession.end();
        xrSession = null;
        btn.textContent = 'Enter VR';
    } else {
        try {
            const session = await navigator.xr.requestSession('immersive-vr', {
                optionalFeatures: ['local-floor', 'bounded-floor']
            });
            await onSessionStarted(session, renderer);
            btn.textContent = 'Exit VR';
        } catch (e) {
            console.error('Failed to start WebXR session:', e);
        }
    }
}

async function onSessionStarted(session, renderer) {
    xrSession = session;
    
    const gl = renderer.getContext('webgl2') || renderer.getContext('webgl');
    await gl.makeXRCompatible();
    
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType('local-floor');
    xrRefSpace = await session.requestReferenceSpace('local-floor');
    await renderer.xr.setSession(session);
    
    // Set up session event listeners
    session.addEventListener('end', onSessionEnded);
}

function onSessionEnded() {
    xrSession = null;
    document.getElementById('webxr-btn').textContent = 'Enter VR';
}

export function getXRSession() {
    return xrSession;
}

export function getXRRefSpace() {
    return xrRefSpace;
}

export function isXRActive() {
    return xrSession !== null;
}
