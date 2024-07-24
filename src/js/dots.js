import * as THREE from 'three';
import {GUI} from 'dat.gui';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass';
import {GlitchPass} from 'three/examples/jsm/postprocessing/GlitchPass';
import objects from './lib'

const points = objects.points;
const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

const params = {
    red: 1.0,
    green: 1.0,
    blue: 1.0,
    threshold: 0.5,
    strength: 0.5,
    radius: 0.8
}
renderer.outputColorSpace = THREE.SRGBColorSpace;

const renderScene = new RenderPass(scene, camera);

const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight));
bloomPass.threshold = params.threshold;
bloomPass.strength = params.strength;
bloomPass.radius = params.radius;

const bloomComposer = new EffectComposer(renderer);
bloomComposer.addPass(renderScene);
bloomComposer.addPass(bloomPass);

const outputPass = new OutputPass();
bloomComposer.addPass(outputPass);

camera.position.set(0, -2, 14);
camera.lookAt(0, 0, 0);
// jбьект

function generateCubePositions(size, particlesPerSide) {
    const positions = [];
    const uvs = [];
    const sides = [
        [1, 0, 0], [-1, 0, 0],  // right, left
        [0, 1, 0], [0, -1, 0],  // top, bottom
        [0, 0, 1], [0, 0, -1]   // front, back
    ];

    for (let s = 0; s < 6; s++) {
        const [ax, ay, az] = sides[s];
        for (let i = 0; i < particlesPerSide; i++) {
            for (let j = 0; j < particlesPerSide; j++) {
                const u = i / (particlesPerSide - 1);
                const v = j / (particlesPerSide - 1);
                let x = ax === 0 ? (u - 0.5) * size : ax * size / 2;
                let y = ay === 0 ? (v - 0.5) * size : ay * size / 2;
                let z = az === 0 ? ((ax !== 0 ? u : v) - 0.5) * size : az * size / 2;
                
                positions.push(x, y, z);
                uvs.push(u, v);
            }
        }
    }

    return { positions: new Float32Array(positions), uvs: new Float32Array(uvs) };
}

// Генерируем позиции и UV координаты
const { positions, uvs } = generateCubePositions(CUBE_SIZE, PARTICLES_PER_SIDE);

// Создаем геометрию
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

// Создаем текстуру для позиций (пока просто случайные значения)
const positionTexture = new THREE.DataTexture(
    new Float32Array(PARTICLES_PER_SIDE * PARTICLES_PER_SIDE * 4).map(() => Math.random()),
    PARTICLES_PER_SIDE,
    PARTICLES_PER_SIDE,
    THREE.RGBAFormat,
    THREE.FloatType
);
positionTexture.needsUpdate = true;

// Шейдеры
const vertexShader = `
    attribute vec2 uv;
    uniform float cubeSize;
    uniform sampler2D texturePosition;
    uniform float whiteNodesRatio;

    varying float vBrightness;
    varying vec3 vPosition;

    void main() {
        vec4 positionInfo = texture2D(texturePosition, uv);
        vec3 pos = position + positionInfo.xyz * 0.1; // Small displacement based on texture
        float brightness = positionInfo.w;

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        vBrightness = brightness * whiteNodesRatio;
        vPosition = pos;

        gl_Position = projectionMatrix * mvPosition;
    }
`;

const fragmentShader = `
    varying float vBrightness;
    varying vec3 vPosition;

    uniform float whiteRatio;
    uniform float cubeSize;

    void main() {
        vec3 outgoingLight = vec3(1.0);

        // Calculate edge glow
        float edgeGlow = 1.0 - max(abs(vPosition.x), max(abs(vPosition.y), abs(vPosition.z))) / (cubeSize * 0.5);
        edgeGlow = pow(edgeGlow, 3.0);

        outgoingLight = vec3(0.05) + vBrightness * (1.0 - whiteRatio * 0.65);
        outgoingLight += vec3(edgeGlow * 0.5); // Add edge glow

        gl_FragColor = vec4(outgoingLight, 1.0);
    }
`;

// Создаем материал
const material = new THREE.ShaderMaterial({
    uniforms: {
        texturePosition: { value: positionTexture },
        whiteNodesRatio: { value: 1.0 },
        whiteRatio: { value: 1.0 },
        cubeSize: { value: CUBE_SIZE }
    },
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    wireframe: true
});

// Создаем меш и добавляем его в сцену
const mesh = new THREE.Points(geometry, material);
scene.add(mesh);
// обьект //


// Добавляем освещение
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(1, 1, 1);
scene.add(directionalLight);

// Добавляем тени
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

directionalLight.castShadow = true;
mesh.castShadow = true;
mesh.receiveShadow = true;












const clock = new THREE.Clock();
function animate() {
    // camera.position.x += (mouseX - camera.position.x) * .05;
    // camera.position.y += (-mouseY - camera.position.y) * 0.5;
    camera.lookAt(scene.position);
    uniforms.u_time.value = clock.getElapsedTime();
    // uniforms.u_frequency.value = analyser.getAverageFrequency() / 2;
    
    // Добавляем вращение куба
    mesh.rotation.x += 0.005;
    mesh.rotation.y += 0.005;
    
    bloomComposer.render();
    requestAnimationFrame(animate);
}
animate();

window.addEventListener('resize', function() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    bloomComposer.setSize(window.innerWidth, window.innerHeight);
});
