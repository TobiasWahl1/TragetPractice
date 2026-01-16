import * as THREE from '../../99_Lib/three.module.min.js';
import { RGBELoader } from '../../99_Lib/jsm/loaders/RGBELoader.js';

const textureLoader = new THREE.TextureLoader();
const rgbeLoader = new RGBELoader();


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
            console.error('Error loading HDR sky:', error);
        }
    );
}

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
                console.error('Error loading grass texture:', error);
            }
        );
    } catch (error) {
        console.error('Error applying grass texture:', error);
    }
}

export function createSkyDome(scene, camera) {
    try {
        console.log('Creating sky dome...');
        
        // Try to load HDR texture
        createHDRSkyDome(scene, camera);
        
        console.log('Sky dome creation initiated');
        return null;
    } catch (error) {
        console.error('Error creating sky dome:', error);
        return null;
    }
}

export function updateSkyDomePosition() {
    // Sky background is now handled by scene.background, no update needed
}

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
