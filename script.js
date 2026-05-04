import * as jscad from 'https://esm.sh/@jscad/modeling';
import { serialize } from 'https://esm.sh/@jscad/stl-serializer';

const { cuboid, cylinder } = jscad.primitives;
const { union, subtract } = jscad.booleans;
const { translate } = jscad.transforms;

let scene, camera, renderer, controls, currentMesh;

function init3DViewer() {
    const container = document.getElementById('viewer3d');
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xcbd5e1);

    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 50, 150);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight1.position.set(100, 100, 50);
    scene.add(directionalLight1);
    
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-100, -100, -50);
    scene.add(directionalLight2);

    window.addEventListener('resize', () => {
        if (!container.clientWidth) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });

    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();
}

window.loadSTL = function(url) {
    document.getElementById('viewerPlaceholder').style.display = 'none';
    
    const loader = new THREE.STLLoader();
    
    loader.load(url, function (geometry) {
        if (currentMesh) {
            scene.remove(currentMesh);
            currentMesh.geometry.dispose();
            currentMesh.material.dispose();
        }

        const material = new THREE.MeshStandardMaterial({ 
            color: 0x3b82f6, 
            roughness: 0.4,
            metalness: 0.1
        });
        
        geometry.computeVertexNormals();
        geometry.computeBoundingBox();
        const center = new THREE.Vector3();
        geometry.boundingBox.getCenter(center);
        geometry.translate(-center.x, -center.y, -center.z);
        
        currentMesh = new THREE.Mesh(geometry, material);
        
        const size = new THREE.Vector3();
        geometry.boundingBox.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        
        const fov = camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / Math.tan(fov / 2));
        cameraZ *= 1.3;
        
        camera.position.set(maxDim * 0.8, maxDim * 0.8, cameraZ);
        controls.target.set(0, 0, 0);
        controls.update();

        currentMesh.rotation.x = -Math.PI / 2;
        
        scene.add(currentMesh);
    }, undefined, function (error) {
        console.error('An error happened loading STL:', error);
    });
};

document.addEventListener('DOMContentLoaded', () => {
    init3DViewer();
    console.log("Imports loaded, 3D viewer initialized.");
    console.log("Production build ready for Vercel deployment");
});

document.getElementById('generateBtn').addEventListener('click', async () => {
    const description = document.getElementById('description').value.trim();
    const errorBox = document.getElementById('errorBox');
    const loading = document.getElementById('loading');
    const results = document.getElementById('results');
    const btn = document.getElementById('generateBtn');
    const loadingText = loading.querySelector('p');

    if (!description) {
        showError('Please enter a description first.');
        return;
    }

    errorBox.classList.add('hidden');
    results.classList.add('hidden');
    loadingText.textContent = "Parsing intent and generating geometry natively in browser...";
    loading.classList.remove('hidden');
    btn.disabled = true;

    console.log("Sending to LLM...");

    let params = {
        length: 100,
        width: 50,
        height: 80,
        thickness: 5,
        holeCount: 2
    };

    try {
        const response = await fetch('/api/parse', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ description })
        });

        if (response.ok) {
            const data = await response.json();
            params = data;
        } else {
            console.warn("API parsing failed, falling back to defaults.");
        }
    } catch (error) {
        console.error("Network or parsing error. Falling back to defaults.", error);
    } finally {
        console.log("Received params:", params);
        displaySingleResult(params);
        loading.classList.add('hidden');
        btn.disabled = false;
    }
});

function generateBracket(params) {
    console.log("Generating geometry...", params);
    const length = params.length || 100;
    const height = params.height || 80;
    const width = params.width || 50;
    const thickness = params.thickness || 5;
    
    const base = cuboid({ size: [length, width, thickness] });
    const translatedBase = translate([length/2, 0, thickness/2], base);
    
    const vert = cuboid({ size: [thickness, width, height] });
    const translatedVert = translate([thickness/2, 0, height/2], vert);

    let bracket = union(translatedBase, translatedVert);
    
    const holeCount = params.holeCount || 0;
    if (holeCount > 0) {
        const holeRadius = 5; // Default 5mm radius
        const spacing = (length - thickness) / (holeCount + 1);
        
        let holesToSubtract = [];
        for (let i = 1; i <= holeCount; i++) {
            let holeX = thickness + (spacing * i);
            let hole = cylinder({ radius: holeRadius, height: thickness * 4, segments: 32 });
            let translatedHole = translate([holeX, 0, 0], hole);
            holesToSubtract.push(translatedHole);
        }
        
        if (holesToSubtract.length > 0) {
            bracket = subtract(bracket, ...holesToSubtract);
        }
    }
    
    return bracket;
}

function exportSTL(geometry) {
    const rawData = serialize({ binary: true }, geometry);
    const blob = new Blob(rawData, { type: 'application/sla' });
    return URL.createObjectURL(blob);
}

function displaySingleResult(params) {
    const explanationBox = document.getElementById('explanationBox');
    const designsList = document.getElementById('designsList');
    const results = document.getElementById('results');

    explanationBox.classList.add('hidden');
    designsList.innerHTML = '';

    // NATIVELY GENERATE GEOMETRY IN BROWSER
    const geometry = generateBracket(params);
    const stlUrl = exportSTL(geometry);

    const card = document.createElement('div');
    card.className = 'design-card';

    card.innerHTML = `
        <h3>AI Generated Bracket</h3>
        <div class="cost">
            Dimensions: ${params.length}x${params.width}x${params.height} mm<br>
            Thickness: ${params.thickness} mm
        </div>
        <div class="links">
            <button class="preview-btn" onclick="window.loadSTL('${stlUrl}')">👁 Preview 3D</button>
            <a href="${stlUrl}" download="smart_bracket.stl" class="download-btn">Download STL</a>
        </div>
    `;
    designsList.appendChild(card);
    
    window.loadSTL(stlUrl);
    results.classList.remove('hidden');
}

function showError(msg) {
    const errorBox = document.getElementById('errorBox');
    errorBox.textContent = msg;
    errorBox.classList.remove('hidden');
}
