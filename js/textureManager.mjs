import * as THREE from '../../99_Lib/three.module.min.js';
import { RGBELoader } from '../../99_Lib/jsm/loaders/RGBELoader.js';

const textureLoader = new THREE.TextureLoader();
const rgbeLoader = new RGBELoader();
let skyDomeReference = null; // Store reference to sky dome for updating

/**
 * Create a procedural grass texture locally
 */
function createProceduralGrassTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Base grass color
    ctx.fillStyle = '#2d5016';
    ctx.fillRect(0, 0, 512, 512);
    
    // Add grass blade texture variation
    for (let i = 0; i < 5000; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const width = Math.random() * 3 + 1;
        const height = Math.random() * 8 + 2;
        
        // Vary grass colors
        const greenVariation = Math.floor(Math.random() * 40) - 20;
        const baseGreen = 80 + greenVariation;
        const baseRed = 45 + greenVariation * 0.5;
        const baseBlue = 22 + greenVariation * 0.5;
        
        ctx.fillStyle = `rgb(${baseRed}, ${baseGreen}, ${baseBlue})`;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.random() * Math.PI);
        ctx.fillRect(-width / 2, 0, width, height);
        ctx.restore();
    }
    
    // Add dirt spots for variation
    for (let i = 0; i < 200; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const radius = Math.random() * 15 + 5;
        
        ctx.fillStyle = `rgba(139, 90, 43, ${Math.random() * 0.3})`;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    return new THREE.CanvasTexture(canvas);
}

/**
 * Create procedural normal map for grass
 */
function createProceduralGrassNormalMap() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Base normal map (neutral blue-gray)
    ctx.fillStyle = '#8080ff';
    ctx.fillRect(0, 0, 512, 512);
    
    // Add subtle normal variation to simulate grass texture
    const imageData = ctx.getImageData(0, 0, 512, 512);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        // Add some variation to create grass texture appearance
        const noise = Math.random() * 20 - 10;
        data[i + 0] = Math.max(0, Math.min(255, 128 + noise)); // R
        data[i + 1] = Math.max(0, Math.min(255, 128 + noise)); // G
        data[i + 2] = 255; // B (always high for normals pointing up)
        data[i + 3] = 255; // A
    }
    
    ctx.putImageData(imageData, 0, 0);
    return new THREE.CanvasTexture(canvas);
}

/**
 * Create procedural roughness map
 */
function createProceduralRoughnessMap() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Create perlin-like noise for roughness variation
    ctx.fillStyle = '#d0d0d0';
    ctx.fillRect(0, 0, 512, 512);
    
    // Add variation
    const imageData = ctx.getImageData(0, 0, 512, 512);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        // Grass is fairly rough
        const roughness = Math.random() * 60 + 180;
        data[i + 0] = roughness;
        data[i + 1] = roughness;
        data[i + 2] = roughness;
        data[i + 3] = 255;
    }
    
    ctx.putImageData(imageData, 0, 0);
    return new THREE.CanvasTexture(canvas);
}


//Create sky dome from HDR texture

function createHDRSkyDome(scene, camera) {
    console.log('Loading HDR sky texture from local file...');
    
    rgbeLoader.load(
        './textures/farm_field_puresky_1k.hdr',
        (texture) => {
            console.log('HDR sky texture loaded successfully');
            texture.mapping = THREE.EquirectangularReflectionMapping;
            scene.background = texture;
            scene.environment = texture;
        },
        undefined,
        (error) => {
            console.error('Error loading HDR sky, using fallback:', error);
            createFallbackSkyDome(scene, camera);
        }
    );
}

function createFallbackSkyDome(scene, camera) {
    // Fallback: use scene background with a canvas texture gradient
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Create a vertical gradient (blue at top, lighter at horizon)
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#87CEEB');     // Sky blue at top
    gradient.addColorStop(0.5, '#B0E0E6');   // Powder blue in middle
    gradient.addColorStop(1, '#E0F6FF');     // Very light blue at bottom
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
    
    const skyTexture = new THREE.CanvasTexture(canvas);
    scene.background = skyTexture;
    
    console.log('Sky background set');
    return null;
}

/**
 * Apply grass texture to floor
 */
export function applyGrassTexture(floorMesh) {
    console.log('Applying grass texture from local file...');
    
    try {
        // Load the local grass texture
        textureLoader.load(
            './textures/forrest_ground_01_diff_1k.png',
            (grassDiffuse) => {
                console.log('Grass texture loaded successfully');
                
                // Set repeat for tiling
                grassDiffuse.repeat.set(4, 4);
                grassDiffuse.wrapS = THREE.RepeatWrapping;
                grassDiffuse.wrapT = THREE.RepeatWrapping;
                
                // Create grass material with the loaded texture
                const grassMaterial = new THREE.MeshStandardMaterial({
                    map: grassDiffuse,
                    color: new THREE.Color(0.6, 0.7, 0.5), // Darken the base color
                    roughness: 0.9, // Increased roughness for more matte look
                    metalness: 0
                });
                
                floorMesh.material = grassMaterial;
                floorMesh.castShadow = true;
                floorMesh.receiveShadow = true;
            },
            undefined,
            (error) => {
                console.error('Error loading grass texture, using fallback:', error);
                // Fallback to procedural texture
                const grassDiffuse = createProceduralGrassTexture();
                grassDiffuse.repeat.set(8, 6);
                grassDiffuse.wrapS = THREE.RepeatWrapping;
                grassDiffuse.wrapT = THREE.RepeatWrapping;
                
                const grassMaterial = new THREE.MeshStandardMaterial({
                    map: grassDiffuse,
                    roughness: 0.8,
                    metalness: 0
                });
                floorMesh.material = grassMaterial;
            }
        );
    } catch (error) {
        console.error('Error applying grass texture:', error);
    }
}

/**
 * Create sky dome and add to scene
 * Uses local HDR texture if available, otherwise fallback to gradient
 */
export function createSkyDome(scene, camera) {
    try {
        console.log('Creating sky dome...');
        
        // Try to load HDR texture
        createHDRSkyDome(scene, camera);
        
        console.log('Sky dome creation initiated');
        return null;
    } catch (error) {
        console.error('Error creating sky dome:', error);
        createFallbackSkyDome(scene, camera);
        return null;
    }
}

/**
 * Update sky dome position to follow camera
 * Not needed anymore since we use scene.background
 */
export function updateSkyDomePosition() {
    // Sky background is now handled by scene.background, no update needed
}

/**
 * Initialize all textures in the scene
 * Call this after creating the scene and floor
 */
export async function initializeTextures(scene, floorMesh, camera) {
    console.log('Initializing textures...');
    
    try {
        // Create sky dome immediately (synchronously)
        createSkyDome(scene, camera);
        
        // Apply grass texture asynchronously (doesn't block rendering)
        applyGrassTexture(floorMesh);
        
        console.log('Texture initialization started');
    } catch (error) {
        console.error('Error initializing textures:', error);
    }
}

/**
 * Load an HDR texture for sky
 * Alternative method that provides more realistic sky
 */
export async function loadHDRSky(scene) {
    try {
        // This requires RGBELoader from Three.js
        console.log('HDR sky loading would require RGBELoader import');
        // For now, fallback sky dome is used
    } catch (error) {
        console.error('Error loading HDR sky:', error);
    }
}
