// Game state
let gameActive = false;
let soundOn = true;
const gameMenu = document.querySelector('.game-menu');
const canvas = document.getElementById('game-canvas');
const decisionScreen = document.querySelector('.decision-screen');
const winScreen = document.querySelector('.win-screen');
const loseScreen = document.querySelector('.lose-screen');

// Variables for tailgater timing and delta time
let lastTailgaterTime = 0;
let tailgaterInterval = 8000; // Start with 8 seconds between tailgaters
let lastTime = 0;
let difficulty = 0; // Difficulty level from 0 to 1 (0 = easy, 1 = impossible)
let difficultyUpdateTime = 0; // Time of last difficulty update

// Difficulty settings
const difficultySettings = {
    initialTailgaterInterval: 8000, // 8 seconds at start
    finalTailgaterInterval: 1000,   // 1 second at max difficulty
    initialTailgaterSpeed: 24,      // Initial tailgater speed
    finalTailgaterSpeed: 40,        // Max tailgater speed
    initialLaneChangeSpeed: 15,     // Initial lane change speed
    finalLaneChangeSpeed: 25,       // Max lane change speed
    maxDifficultyTime: 90000,       // 90 seconds to reach max difficulty
    multiSpawnThreshold: 0.7,       // When difficulty > 0.7, chance for multiple tailgaters
    targetPlayerThreshold: 0.5      // When difficulty > 0.5, tailgaters target player's lane
};

// Button event listeners
document.getElementById('start-game').addEventListener('click', startGame);
document.getElementById('how-to-play').addEventListener('click', showHowToPlay);
document.getElementById('call-lawyer').addEventListener('click', () => showWinScreen());
document.getElementById('self-handle').addEventListener('click', () => showLoseScreen());
document.getElementById('play-again-win').addEventListener('click', resetGame);
document.getElementById('play-again-lose').addEventListener('click', resetGame);
document.getElementById('toggle-sound').addEventListener('click', toggleSound);
document.getElementById('toggle-fullscreen').addEventListener('click', toggleFullscreen);

function startGame() {
    gameActive = true;
    gameMenu.style.display = 'none';
    hud.style.display = 'block';
    gameStartTime = Date.now();
    lastTailgaterTime = Date.now();
    difficulty = 0; // Reset difficulty
    difficultyUpdateTime = Date.now(); // Initialize difficulty update time
    // Ensure canvas is properly sized when game starts
    resizeCanvas();
    // Start the game immediately
}

function showHowToPlay() {
    alert('Use arrow keys to drive. Avoid other cars. If you crash, you\'ll need to decide whether to call Mike Brown Law or handle it yourself!');
}

function showDecisionScreen() {
    decisionScreen.style.display = 'flex';
}

function showWinScreen() {
    decisionScreen.style.display = 'none';
    winScreen.style.display = 'flex';
}

function showLoseScreen() {
    decisionScreen.style.display = 'none';
    loseScreen.style.display = 'flex';
}

function resetGame() {
    winScreen.style.display = 'none';
    loseScreen.style.display = 'none';
    gameMenu.style.display = 'flex';
    hud.style.display = 'none';
    gameActive = false;

    // Reset player position and speed
    player.position.set(0, 0.25, 0);
    playerSpeed = 0;
    score = 0;
    
    // Reset difficulty
    difficulty = 0;
    tailgaterInterval = difficultySettings.initialTailgaterInterval;
    timeDisplay.style.color = '#ffffff'; // Reset time display color
    
    // Reset traffic cars
    trafficCars.forEach(car => scene.remove(car.mesh));
    trafficCars.length = 0;
    for (let i = 0; i < 20; i++) {
        spawnTrafficCar(20 + i * 20);
    }
    
    // Ensure canvas is properly sized
    resizeCanvas();
}

function toggleSound() {
    soundOn = !soundOn;
    document.getElementById('toggle-sound').textContent = soundOn ? 'SOUND: ON' : 'SOUND: OFF';
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

// Three.js setup
const scene = new THREE.Scene();
// Replace simple background with skybox
const createSkybox = () => {
    // Create a gradient sky instead of using CubeTexture
    const vertexShader = `
        varying vec3 vWorldPosition;
        void main() {
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;
    
    const fragmentShader = `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
            float h = normalize(vWorldPosition + offset).y;
            gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
    `;
    
    // Create shader material with more blue-dominant sunset colors
    const uniforms = {
        topColor: { value: new THREE.Color(0x0D47A1) },  // Deep navy blue at top
        bottomColor: { value: new THREE.Color(0x90CAF9) }, // Light blue with just a hint of pink at horizon
        offset: { value: 10 },
        exponent: { value: 0.5 }  // Slightly softer transition
    };
    
    const skyGeo = new THREE.SphereGeometry(1000, 32, 15);
    const skyMat = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        side: THREE.BackSide
    });
    
    const sky = new THREE.Mesh(skyGeo, skyMat)
    sky.position.set(0, 0, 900);
    scene.add(sky);
    
    // Add a sun
    const sunGeometry = new THREE.CircleGeometry(40, 32);
    // Update the sun to a softer yellow
    const sunMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xFFF176, // Soft yellow
        transparent: true,
        opacity: 0.8
    });
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sun.position.set(-200, 100, -500);
    sun.lookAt(0, 0, 0);
    scene.add(sun);
    
    // Add sun rays/glow
    const glowGeometry = new THREE.CircleGeometry(60, 32);
    // And a more subtle glow
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFCC80, // Soft orange glow
        transparent: true,
        opacity: 0.4
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.copy(sun.position);
    glow.lookAt(0, 0, 0);
    scene.add(glow);
};
createSkybox();

const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 2000); // Initial aspect ratio will be updated
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game-canvas'), antialias: true });

// Function to handle responsive canvas
function resizeCanvas() {
    const canvas = renderer.domElement;
    const gameContainer = document.querySelector('.game-container');
    
    // Get the computed dimensions of the container
    const containerRect = gameContainer.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;
    
    // Update renderer size to match container
    renderer.setSize(containerWidth, containerHeight, false);
    
    // Update camera aspect ratio
    camera.aspect = containerWidth / containerHeight;
    camera.updateProjectionMatrix();
}

// Initial resize
resizeCanvas();

// Add window resize event listener
window.addEventListener('resize', resizeCanvas);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Add California sunset lighting
const ambientLight = new THREE.AmbientLight(0xffd580, 0.6); // Warm ambient light
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffb347, 1.0); // Orange-ish sunlight
directionalLight.position.set(-10, 15, 10);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;
directionalLight.shadow.camera.left = -20;
directionalLight.shadow.camera.right = 20;
directionalLight.shadow.camera.top = 20;
directionalLight.shadow.camera.bottom = -20;
scene.add(directionalLight);

// Road
const roadGeometry = new THREE.PlaneGeometry(10, 10000);
const roadMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x333333,
    roughness: 0.8,
    metalness: 0.2
});
const road = new THREE.Mesh(roadGeometry, roadMaterial);
road.rotation.x = -Math.PI / 2;
road.receiveShadow = true;
scene.add(road);

// Add road markings
const addRoadMarkings = () => {
    for (let i = 0; i < 100; i++) {
        const markingGeometry = new THREE.PlaneGeometry(0.2, 2);
        const markingMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const marking = new THREE.Mesh(markingGeometry, markingMaterial);
        marking.rotation.x = -Math.PI / 2;
        marking.position.set(0, 0.01, i * 20);
        scene.add(marking);
    }
};
addRoadMarkings();

// Add beach sand on both sides of the road
const createBeachTerrain = () => {
    // Right side (beach side) - from player's perspective
    const beachGeometry = new THREE.PlaneGeometry(50, 10000);
    const beachMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xf2d2a9, // Sand color
        roughness: 1.0,
        metalness: 0.0
    });
    const rightBeach = new THREE.Mesh(beachGeometry, beachMaterial);
    rightBeach.rotation.x = -Math.PI / 2;
    rightBeach.position.set(-25, -0.1, 0);
    rightBeach.receiveShadow = true;
    scene.add(rightBeach);
    
    // Left side (mountain/hill side) - from player's perspective
    const leftTerrainGeometry = new THREE.PlaneGeometry(100, 10000);
    const leftTerrainMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x4CAF50, // Darker earth color for hills
        roughness: 1.0,
        metalness: 0.0
    });
    const leftTerrain = new THREE.Mesh(leftTerrainGeometry, leftTerrainMaterial);
    leftTerrain.rotation.x = -Math.PI / 2;
    leftTerrain.position.set(55, -0.1, 0);
    leftTerrain.receiveShadow = true;
    scene.add(leftTerrain);
};
createBeachTerrain();

// Add ocean
const createOcean = () => {
    // Make ocean only appear on the right side (negative x) by adjusting width and position
    const oceanGeometry = new THREE.PlaneGeometry(500, 10000);
    const oceanMaterial = new THREE.MeshStandardMaterial({
        color: 0x00BFFF, // Deep Sky Blue - more vibrant Caribbean color
        roughness: 0.0,
        metalness: 0.3,
        transparent: true,
        opacity: 0.9,
        emissive: 0x0088cc,
        emissiveIntensity: 0.2
    });
    const ocean = new THREE.Mesh(oceanGeometry, oceanMaterial);
    ocean.rotation.x = -Math.PI / 2;
    // Position the ocean further to the right (negative x) so it doesn't appear on the left
    ocean.position.set(-250, -0.5, 0);
    scene.add(ocean);
    
    return { animateWaves: () => {} }; // Empty function as placeholder
};
const ocean = createOcean();

// Add distant mountains
const createMountains = () => {
    // Create a mountain range using a series of triangular prisms
    for (let i = 0; i < 15; i++) {
        const height = 20 + Math.random() * 30;
        const width = 40 + Math.random() * 60;
        
        // Create a simple mountain shape
        const mountainGeometry = new THREE.ConeGeometry(width, height, 4);
        const mountainMaterial = new THREE.MeshStandardMaterial({
            color: 0x6A5ACD, // slate blue
            roughness: 1.0,
            metalness: 0.0
        });
        
        const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
        
        // Position mountains on the left side from player's perspective
        const xPos = 150 + Math.random() * 100;
        const zPos = i * 200 - 1000 + Math.random() * 200;
        
        mountain.position.set(xPos, height/2 - 5, zPos);
        mountain.castShadow = true;
        scene.add(mountain);
    }
};
createMountains();

// Add billboards
const createBillboards = () => {
    // Create a function to make a billboard
    const makeBillboard = (text, x, z, rotation = 0) => {
        // Billboard structure
        const postGeometry = new THREE.BoxGeometry(0.5, 5, 0.5);
        const postMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const post = new THREE.Mesh(postGeometry, postMaterial);
        post.position.y = 2.5;
        post.castShadow = true;
        
        const boardGeometry = new THREE.BoxGeometry(8, 4, 0.2);
        const boardMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const board = new THREE.Mesh(boardGeometry, boardMaterial);
        board.position.y = 6;
        board.castShadow = true;
        
        // Create a canvas for the text
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const context = canvas.getContext('2d');
        
        // Fill with background color
        context.fillStyle = '#4169E1'; // Royal blue
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add a border
        context.strokeStyle = '#FFD700'; // Gold
        context.lineWidth = 10;
        context.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
        
        // Add text
        context.fillStyle = '#FFFFFF';
        context.font = 'bold 40px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        // Split text into lines
        const lines = text.split('\n');
        const lineHeight = 50;
        
        lines.forEach((line, i) => {
            context.fillText(line, canvas.width / 2, canvas.height / 2 - ((lines.length - 1) * lineHeight / 2) + i * lineHeight);
        });
        
        // Use the canvas as a texture
        const texture = new THREE.CanvasTexture(canvas);
        
        // Create a billboard group
        const billboard = new THREE.Group();
        billboard.add(post);
        billboard.add(board);
        
        // Add front text
        const frontTextMaterial = new THREE.MeshBasicMaterial({ map: texture });
        const frontTextGeometry = new THREE.PlaneGeometry(7.8, 3.8);
        const frontTextMesh = new THREE.Mesh(frontTextGeometry, frontTextMaterial);
        frontTextMesh.position.set(0, 6, 0.11);
        billboard.add(frontTextMesh);
        
        // Add back text (same texture)
        const backTextMaterial = new THREE.MeshBasicMaterial({ map: texture });
        const backTextGeometry = new THREE.PlaneGeometry(7.8, 3.8);
        const backTextMesh = new THREE.Mesh(backTextGeometry, backTextMaterial);
        backTextMesh.position.set(0, 6, -0.11);
        backTextMesh.rotation.y = Math.PI; // Rotate 180 degrees to face the opposite direction
        billboard.add(backTextMesh);
        
        // Position and rotate the billboard
        billboard.position.set(x, 0, z);
        
        // Make billboards perpendicular to the road
        if (x < 0) {
            billboard.rotation.y = 0; // For left side
        } else {
            billboard.rotation.y = Math.PI; // For right side, rotate 180 degrees
        }
        
        scene.add(billboard);
    };
    
    // Add billboards along the road
    makeBillboard("MIKE BROWN LAW\nFENDER BENDER DEFENDER", 15, 100);
    makeBillboard("OCEAN VIEW\nBEACH ACCESS AHEAD", -15, 300);
    makeBillboard("ACCIDENT?\nCALL MIKE BROWN", 15, 500);
    makeBillboard("PACIFIC COAST\nHIGHWAY", -15, 700);
    makeBillboard("CRYSTAL COVE\n2 MILES AHEAD", -15, 900);
};
createBillboards();

// Create a car model function
function createCarModel(color, isPlayerCar = false) {
    // Create a group to hold all car parts
    const carGroup = new THREE.Group();
    
    // Car body - main chassis
    const bodyGeometry = new THREE.BoxGeometry(1, 0.4, 2);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
        color: color,
        metalness: 0.7,
        roughness: 0.3
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.2;
    carGroup.add(body);
    
    // Car top/cabin
    const cabinGeometry = new THREE.BoxGeometry(0.8, 0.3, 1);
    const cabinMaterial = new THREE.MeshStandardMaterial({ 
        color: isPlayerCar ? 0x333333 : 0x444444,
        metalness: 0.5,
        roughness: 0.5
    });
    const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
    cabin.position.set(0, 0.55, -0.1);
    carGroup.add(cabin);
    
    // Windshield
    const windshieldGeometry = new THREE.BoxGeometry(0.7, 0.25, 0.1);
    const windshieldMaterial = new THREE.MeshStandardMaterial({
        color: 0x88ccff,
        transparent: true,
        opacity: 0.7,
        metalness: 0.9,
        roughness: 0.1
    });
    const windshield = new THREE.Mesh(windshieldGeometry, windshieldMaterial);
    windshield.position.set(0, 0.55, 0.4);
    carGroup.add(windshield);
    
    // Wheels
    const wheelGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 16);
    const wheelMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x111111,
        metalness: 0.5,
        roughness: 0.7
    });
    
    // Wheel rim material
    const rimMaterial = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        metalness: 0.9,
        roughness: 0.1
    });
    
    // Function to create a wheel with rim
    function createWheel(x, y, z) {
        const wheelGroup = new THREE.Group();
        
        // Tire
        const tire = new THREE.Mesh(wheelGeometry, wheelMaterial);
        tire.rotation.z = Math.PI / 2;
        wheelGroup.add(tire);
        
        // Rim/hubcap
        const rimGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.11, 8);
        const rim = new THREE.Mesh(rimGeometry, rimMaterial);
        rim.rotation.z = Math.PI / 2;
        wheelGroup.add(rim);
        
        wheelGroup.position.set(x, y, z);
        return wheelGroup;
    }
    
    // Front left wheel
    const wheelFL = createWheel(0.6, 0.2, 0.7);
    carGroup.add(wheelFL);
    
    // Front right wheel
    const wheelFR = createWheel(-0.6, 0.2, 0.7);
    carGroup.add(wheelFR);
    
    // Rear left wheel
    const wheelRL = createWheel(0.6, 0.2, -0.7);
    carGroup.add(wheelRL);
    
    // Rear right wheel
    const wheelRR = createWheel(-0.6, 0.2, -0.7);
    carGroup.add(wheelRR);
    
    // Store wheels for animation
    carGroup.wheels = [wheelFL, wheelFR, wheelRL, wheelRR];
    
    // Headlights
    if (isPlayerCar) {
        const headlightGeometry = new THREE.BoxGeometry(0.2, 0.1, 0.05);
        const headlightMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffcc,
            emissive: 0xffffcc,
            emissiveIntensity: 1
        });
        
        const headlightLeft = new THREE.Mesh(headlightGeometry, headlightMaterial);
        headlightLeft.position.set(0.4, 0.25, 1);
        carGroup.add(headlightLeft);
        
        const headlightRight = new THREE.Mesh(headlightGeometry, headlightMaterial);
        headlightRight.position.set(-0.4, 0.25, 1);
        carGroup.add(headlightRight);
    }
    
    // Taillights
    const taillightGeometry = new THREE.BoxGeometry(0.2, 0.1, 0.05);
    const taillightMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 0.5
    });
    
    const taillightLeft = new THREE.Mesh(taillightGeometry, taillightMaterial);
    taillightLeft.position.set(0.4, 0.25, -1);
    carGroup.add(taillightLeft);
    
    const taillightRight = new THREE.Mesh(taillightGeometry, taillightMaterial);
    taillightRight.position.set(-0.4, 0.25, -1);
    carGroup.add(taillightRight);
    
    // Add bumpers
    const frontBumperGeometry = new THREE.BoxGeometry(1, 0.2, 0.1);
    const bumperMaterial = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        metalness: 0.8,
        roughness: 0.2
    });
    const frontBumper = new THREE.Mesh(frontBumperGeometry, bumperMaterial);
    frontBumper.position.set(0, 0.15, 1);
    carGroup.add(frontBumper);
    
    const rearBumperGeometry = new THREE.BoxGeometry(1, 0.2, 0.1);
    const rearBumper = new THREE.Mesh(rearBumperGeometry, bumperMaterial);
    rearBumper.position.set(0, 0.15, -1);
    carGroup.add(rearBumper);
    
    // License plates
    const licensePlateGeometry = new THREE.PlaneGeometry(0.4, 0.2);
    const frontLicenseMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffffff,
        side: THREE.DoubleSide
    });
    const frontLicense = new THREE.Mesh(licensePlateGeometry, frontLicenseMaterial);
    frontLicense.position.set(0, 0.25, 1.01);
    carGroup.add(frontLicense);
    
    const rearLicenseMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffffcc,
        side: THREE.DoubleSide
    });
    const rearLicense = new THREE.Mesh(licensePlateGeometry, rearLicenseMaterial);
    rearLicense.position.set(0, 0.25, -1.01);
    carGroup.add(rearLicense);
    
    // Add a grille to the front (for more detail)
    if (isPlayerCar) {
        const grilleGeometry = new THREE.PlaneGeometry(0.6, 0.15);
        const grilleMaterial = new THREE.MeshStandardMaterial({
            color: 0x111111,
            metalness: 0.9,
            roughness: 0.3,
            side: THREE.DoubleSide
        });
        const grille = new THREE.Mesh(grilleGeometry, grilleMaterial);
        grille.position.set(0, 0.3, 1.01);
        carGroup.add(grille);
    }
    
    return carGroup;
}

// Player car
const player = createCarModel(0xff0000, true);
player.position.set(0, 0.25, 0);
scene.add(player);

// Traffic cars
const trafficCars = [];
function spawnTrafficCar(z) {
    const carColors = [0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff, 0xffffff];
    const randomColor = carColors[Math.floor(Math.random() * carColors.length)];
    const car = createCarModel(randomColor);
    const lane = Math.floor(Math.random() * 3) - 1;
    car.position.set(lane * 2, 0.25, z);
    scene.add(car);
    trafficCars.push({ mesh: car, speed: 6 + Math.random() * 6, isTailgater: false });
}
for (let i = 0; i < 20; i++) {
    spawnTrafficCar(20 + i * 20);
}

function spawnTailgater() {
    // Determine which lane to spawn in based on difficulty
    let lane;
    
    if (difficulty > difficultySettings.targetPlayerThreshold) {
        // As difficulty increases, tailgaters are more likely to spawn in player's lane
        const playerLane = Math.round(player.position.x / 2);
        const targetPlayerChance = Math.min(0.8, 0.4 + (difficulty - 0.5) * 0.8); // 40% to 80% chance to target player
        
        if (Math.random() < targetPlayerChance) {
            // Target player's lane
            lane = playerLane;
        } else {
            // Random lane
            lane = Math.floor(Math.random() * 3) - 1;
        }
    } else {
        // Random lane at lower difficulties
        lane = Math.floor(Math.random() * 3) - 1;
    }
    
    const x = lane * 2;
    const z = player.position.z - 20;
    
    // Calculate tailgater speed based on difficulty
    const tailgaterSpeed = difficultySettings.initialTailgaterSpeed + 
        (difficultySettings.finalTailgaterSpeed - difficultySettings.initialTailgaterSpeed) * difficulty;
        
    // Calculate lane change speed based on difficulty
    const laneChangeSpeed = difficultySettings.initialLaneChangeSpeed + 
        (difficultySettings.finalLaneChangeSpeed - difficultySettings.initialLaneChangeSpeed) * difficulty;
    
    // Create the tailgater car
    const car = createCarModel(0xff3300);
    car.position.set(x, 0.25, z);
    scene.add(car);
    
    trafficCars.push({ 
        mesh: car, 
        speed: tailgaterSpeed, 
        isTailgater: true,
        targetLane: lane,
        changingLane: false,
        laneChangeDirection: 0,
        laneChangeSpeed: laneChangeSpeed,
        passed: false, // Track if this tailgater has been passed
        spawnTime: Date.now() // Track when this tailgater was spawned
    });
    
    // At higher difficulties, spawn multiple tailgaters at once
    if (difficulty > difficultySettings.multiSpawnThreshold) {
        const multiSpawnChance = (difficulty - difficultySettings.multiSpawnThreshold) * 2; // 0% to 60% chance
        
        if (Math.random() < multiSpawnChance) {
            // Spawn a second tailgater in a different lane after a short delay
            setTimeout(() => {
                if (gameActive) {
                    const secondLane = (lane + (Math.random() > 0.5 ? 1 : -1)) % 3;
                    const adjustedLane = secondLane > 1 ? -1 : (secondLane < -1 ? 1 : secondLane);
                    
                    const secondCar = createCarModel(0xff3300);
                    secondCar.position.set(adjustedLane * 2, 0.25, player.position.z - 25);
                    scene.add(secondCar);
                    
                    trafficCars.push({ 
                        mesh: secondCar, 
                        speed: tailgaterSpeed * 1.1, // Slightly faster
                        isTailgater: true,
                        targetLane: adjustedLane,
                        changingLane: false,
                        laneChangeDirection: 0,
                        laneChangeSpeed: laneChangeSpeed,
                        passed: false,
                        spawnTime: Date.now()
                    });
                }
            }, 500); // Spawn second tailgater after 0.5 seconds
        }
    }
}

// Scenery
function createPalmTree(x, z) {
    // Create a group for the palm tree
    const palmTree = new THREE.Group();
    
    // Improved trunk
    const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 4, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8B4513,
        roughness: 0.9,
        metalness: 0.1
    });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 2;
    trunk.castShadow = true;
    palmTree.add(trunk);
    
    // Create palm fronds (leaves)
    const createPalmFrond = (angle, tilt) => {
        const frondGroup = new THREE.Group();
        
        // Stem of the frond
        const stemGeometry = new THREE.CylinderGeometry(0.05, 0.1, 2.5, 5);
        const stemMaterial = new THREE.MeshStandardMaterial({ color: 0x7B5D3A });
        const stem = new THREE.Mesh(stemGeometry, stemMaterial);
        stem.position.y = 1.25;
        stem.rotation.x = tilt;
        stem.castShadow = true;
        frondGroup.add(stem);
        
        // Leaf part
        const leafGeometry = new THREE.ConeGeometry(0.7, 2, 4);
        const leafMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x2E8B57,
            roughness: 0.8,
            metalness: 0.2
        });
        const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
        leaf.scale.z = 0.2;
        leaf.position.y = 2.5;
        leaf.rotation.x = tilt - Math.PI/2;
        leaf.castShadow = true;
        frondGroup.add(leaf);
        
        frondGroup.rotation.y = angle;
        return frondGroup;
    };
    
    // Add multiple fronds in a circle
    const frondCount = 7;
    for (let i = 0; i < frondCount; i++) {
        const angle = (i / frondCount) * Math.PI * 2;
        const tilt = Math.PI / 4; // 45 degrees tilt
        const frond = createPalmFrond(angle, tilt);
        frond.position.y = 4;
        palmTree.add(frond);
    }
    
    // Add coconuts
    const coconutGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const coconutMaterial = new THREE.MeshStandardMaterial({ color: 0x654321 });
    
    for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2;
        const coconut = new THREE.Mesh(coconutGeometry, coconutMaterial);
        coconut.position.set(
            Math.cos(angle) * 0.3,
            3.8,
            Math.sin(angle) * 0.3
        );
        coconut.castShadow = true;
        palmTree.add(coconut);
    }
    
    palmTree.position.set(x, 0, z);
    scene.add(palmTree);
    
    return palmTree;
}

// Add more palm trees and vary their positions
const palmTrees = [];
for (let i = 0; i < 40; i++) {
    // Right side (beach side) - more trees - from player's perspective
    if (Math.random() < 0.7) {
        const x = -10 - Math.random() * 20;
        const z = i * 50 - 500 + Math.random() * 100;
        palmTrees.push(createPalmTree(x, z));
    }
    
    // Left side (fewer trees) - from player's perspective
    if (Math.random() < 0.3) {
        const x = 15 + Math.random() * 10;
        const z = i * 70 - 500 + Math.random() * 100;
        palmTrees.push(createPalmTree(x, z));
    }
}

// Add beach props
const createBeachProps = () => {
    // Beach umbrella function
    const createBeachUmbrella = (x, z) => {
        const umbrellaGroup = new THREE.Group();
        
        // Pole
        const poleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 3, 8);
        const poleMaterial = new THREE.MeshStandardMaterial({ color: 0xC0C0C0 });
        const pole = new THREE.Mesh(poleGeometry, poleMaterial);
        pole.position.y = 1.5;
        pole.castShadow = true;
        umbrellaGroup.add(pole);
        
        // Umbrella top
        const topGeometry = new THREE.ConeGeometry(2, 0.5, 16, 1, true);
        const topMaterial = new THREE.MeshStandardMaterial({ 
            color: Math.random() > 0.5 ? 0xFF6347 : 0x4169E1,
            side: THREE.DoubleSide
        });
        const top = new THREE.Mesh(topGeometry, topMaterial);
        top.position.y = 3;
        top.castShadow = true;
        umbrellaGroup.add(top);
        
        umbrellaGroup.position.set(x, 0, z);
        scene.add(umbrellaGroup);
    };
    
    // Add some umbrellas along the beach
    for (let i = 0; i < 15; i++) {
        const x = -15 - Math.random() * 20;
        const z = i * 150 - 500 + Math.random() * 100;
        createBeachUmbrella(x, z);
    }
    
    // Add some beach towels
    const createBeachTowel = (x, z) => {
        const towelGeometry = new THREE.PlaneGeometry(2, 4);
        const towelMaterial = new THREE.MeshStandardMaterial({ 
            color: [0xFF6347, 0x4169E1, 0xFFD700, 0x32CD32][Math.floor(Math.random() * 4)],
            side: THREE.DoubleSide
        });
        const towel = new THREE.Mesh(towelGeometry, towelMaterial);
        towel.rotation.x = -Math.PI / 2;
        towel.position.set(x, 0.01, z);
        scene.add(towel);
    };
    
    // Add towels near umbrellas
    for (let i = 0; i < 20; i++) {
        const x = -15 - Math.random() * 20;
        const z = i * 120 - 500 + Math.random() * 100;
        createBeachTowel(x, z);
    }
};
createBeachProps();

// Add lifeguard towers
const createLifeguardTowers = () => {
    for (let i = 0; i < 5; i++) {
        const towerGroup = new THREE.Group();
        
        // Base/platform
        const baseGeometry = new THREE.BoxGeometry(3, 0.5, 3);
        const baseMaterial = new THREE.MeshStandardMaterial({ color: 0xD2B48C });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = 0.25;
        base.castShadow = true;
        towerGroup.add(base);
        
        // Supports/legs
        for (let j = 0; j < 4; j++) {
            const legGeometry = new THREE.CylinderGeometry(0.1, 0.1, 3, 6);
            const legMaterial = new THREE.MeshStandardMaterial({ color: 0xA0522D });
            const leg = new THREE.Mesh(legGeometry, legMaterial);
            
            const xPos = ((j % 2) * 2 - 1) * 1.2;
            const zPos = (Math.floor(j / 2) * 2 - 1) * 1.2;
            
            leg.position.set(xPos, 1.75, zPos);
            leg.castShadow = true;
            towerGroup.add(leg);
        }
        
        // Tower cabin
        const cabinGeometry = new THREE.BoxGeometry(2.5, 2, 2.5);
        const cabinMaterial = new THREE.MeshStandardMaterial({ color: 0xFF4500 });
        const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
        cabin.position.y = 3.5;
        cabin.castShadow = true;
        towerGroup.add(cabin);
        
        // Roof
        const roofGeometry = new THREE.ConeGeometry(2, 1, 4);
        const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x8B0000 });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.y = 5;
        roof.rotation.y = Math.PI / 4;
        roof.castShadow = true;
        towerGroup.add(roof);
        
        // Position the tower
        const x = -40 - Math.random() * 10;
        const z = i * 500;
        towerGroup.position.set(x, 0, z);
        
        scene.add(towerGroup);
    }
};
createLifeguardTowers();

// Add simple building blocks on the left side of the road
const createSimpleBuildings = () => {
    // Create buildings along the left side of the road
    for (let i = 0; i < 20; i++) {
        // Determine building type
        const buildingType = Math.floor(Math.random() * 3); // 0: house, 1: shop, 2: office
        
        // Position buildings on the left side of the road with some spacing
        // Road is at x=0 with width 10, so we start at x=7 (edge of road + small gap)
        const xPos = 9 + Math.random() * 10;
        // Space buildings along the road with some randomness
        const zPos = i * 50 - 500 + Math.random() * 30;
        
        // Create different types of buildings
        if (buildingType === 0) {
            // House
            createHouse(xPos, zPos);
        } else if (buildingType === 1) {
            // Shop
            createShop(xPos, zPos);
        } else {
            // Office building
            createOfficeBuilding(xPos, zPos);
        }
    }
    
    // Function to create a house
    function createHouse(x, z) {
        const buildingGroup = new THREE.Group();
        
        // Random house dimensions
        const width = 4 + Math.random() * 2;
        const height = 2.5 + Math.random() * 1;
        const depth = 4 + Math.random() * 2;
        
        // Main house structure
        const houseGeometry = new THREE.BoxGeometry(width, height, depth);
        
        // Random house colors (pastel)
        const houseColors = [0xF5F5DC, 0xFFE4C4, 0xFFDAB9, 0xEEE8AA, 0xF0E68C, 0xE0FFFF, 0xB0E0E6];
        const houseColor = houseColors[Math.floor(Math.random() * houseColors.length)];
        
        const houseMaterial = new THREE.MeshStandardMaterial({
            color: houseColor,
            roughness: 0.8,
            metalness: 0.1
        });
        
        const house = new THREE.Mesh(houseGeometry, houseMaterial);
        house.position.y = height / 2;
        house.castShadow = true;
        house.receiveShadow = true;
        buildingGroup.add(house);
        
        // Add a pitched roof
        const roofHeight = 1.5;
        const roofGeometry = new THREE.ConeGeometry(width * 0.7, roofHeight, 4);
        
        // Roof colors (darker than house)
        const roofColors = [0x8B4513, 0xA52A2A, 0xCD5C5C, 0x8B0000, 0x800000];
        const roofColor = roofColors[Math.floor(Math.random() * roofColors.length)];
        
        const roofMaterial = new THREE.MeshStandardMaterial({
            color: roofColor,
            roughness: 0.9,
            metalness: 0.1
        });
        
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.y = height + roofHeight / 2;
        roof.rotation.y = Math.PI / 4; // Rotate 45 degrees
        roof.castShadow = true;
        buildingGroup.add(roof);
        
        // Add windows
        const windowSize = 0.5;
        const windowGeometry = new THREE.PlaneGeometry(windowSize, windowSize);
        const windowMaterial = new THREE.MeshStandardMaterial({
            color: 0x87CEEB,
            roughness: 0.3,
            metalness: 0.8,
            emissive: 0x555555,
            emissiveIntensity: 0.2
        });
        
        // Front windows - more windows with better spacing
        for (let wx = -width/3; wx <= width/3; wx += width/3) {
            for (let wy = height/4; wy <= height*0.7; wy += height/3) {
                const window = new THREE.Mesh(windowGeometry, windowMaterial);
                window.position.set(wx, wy, depth/2 + 0.01);
                window.castShadow = false;
                buildingGroup.add(window);
            }
        }
        
        // Side windows - more windows with better spacing
        for (let wz = -depth/3; wz <= depth/3; wz += depth/3) {
            for (let wy = height/4; wy <= height*0.7; wy += height/3) {
                const window = new THREE.Mesh(windowGeometry, windowMaterial);
                window.position.set(width/2 + 0.01, wy, wz);
                window.rotation.y = Math.PI / 2;
                window.castShadow = false;
                buildingGroup.add(window);
                
                const window2 = new THREE.Mesh(windowGeometry, windowMaterial);
                window2.position.set(-width/2 - 0.01, wy, wz);
                window2.rotation.y = Math.PI / 2;
                buildingGroup.add(window2);
            }
        }
        
        // Add a door with frame
        const doorWidth = 0.8;
        const doorHeight = 1.5;
        
        // Door frame
        const frameWidth = doorWidth + 0.1;
        const frameHeight = doorHeight + 0.1;
        const frameGeometry = new THREE.PlaneGeometry(frameWidth, frameHeight);
        const frameMaterial = new THREE.MeshStandardMaterial({
            color: 0xD2B48C,
            roughness: 0.8,
            metalness: 0.2
        });
        
        const doorFrame = new THREE.Mesh(frameGeometry, frameMaterial);
        doorFrame.position.set(0, doorHeight/2, depth/2 + 0.005);
        doorFrame.castShadow = false;
        buildingGroup.add(doorFrame);
        
        // Door
        const doorGeometry = new THREE.PlaneGeometry(doorWidth, doorHeight);
        const doorMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513,
            roughness: 0.8,
            metalness: 0.2
        });
        
        const door = new THREE.Mesh(doorGeometry, doorMaterial);
        door.position.set(0, doorHeight/2, depth/2 + 0.01);
        door.castShadow = false;
        buildingGroup.add(door);
        
        // Add doorknob
        const knobGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const knobMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFD700,
            metalness: 0.9,
            roughness: 0.1
        });
        
        const doorknob = new THREE.Mesh(knobGeometry, knobMaterial);
        doorknob.position.set(doorWidth/3, doorHeight/2, depth/2 + 0.06);
        buildingGroup.add(doorknob);
        
        // Add steps/porch
        const stepsWidth = doorWidth * 1.5;
        const stepsDepth = 0.5;
        const stepsGeometry = new THREE.BoxGeometry(stepsWidth, 0.2, stepsDepth);
        const stepsMaterial = new THREE.MeshStandardMaterial({
            color: 0xA9A9A9,
            roughness: 1.0,
            metalness: 0.0
        });
        
        const steps = new THREE.Mesh(stepsGeometry, stepsMaterial);
        steps.position.set(0, 0.1, depth/2 + stepsDepth/2);
        steps.castShadow = true;
        steps.receiveShadow = true;
        buildingGroup.add(steps);
        
        // Add a chimney (50% chance)
        if (Math.random() > 0.5) {
            const chimneyWidth = 0.4;
            const chimneyHeight = 1;
            const chimneyGeometry = new THREE.BoxGeometry(chimneyWidth, chimneyHeight, chimneyWidth);
            const chimneyMaterial = new THREE.MeshStandardMaterial({
                color: 0x8B4513,
                roughness: 1.0,
                metalness: 0.0
            });
            
            const chimney = new THREE.Mesh(chimneyGeometry, chimneyMaterial);
            chimney.position.set(width/3, height + chimneyHeight/2 + 0.5, 0);
            chimney.castShadow = true;
            buildingGroup.add(chimney);
        }
        
        // Position the house
        buildingGroup.position.set(x, 0, z);
        
        // Rotate to face the road (z-axis)
        buildingGroup.rotation.y = -Math.PI/2; // Rotate 180 degrees to face the road
        
        // Add slight random rotation for variety, but keep facing generally toward the road
        buildingGroup.rotation.y += (Math.random() * 0.2 - 0.1);
        
        scene.add(buildingGroup);
    }
    
    // Function to create a shop
    function createShop(x, z) {
        const buildingGroup = new THREE.Group();
        
        // Shop dimensions
        const width = 5 + Math.random() * 2;
        const height = 3 + Math.random() * 1;
        const depth = 4 + Math.random() * 2;
        
        // Main shop structure
        const shopGeometry = new THREE.BoxGeometry(width, height, depth);
        
        // Shop colors
        const shopColors = [0xE6E6FA, 0xFFE4E1, 0xFFEFD5, 0xF0FFF0, 0xF5FFFA];
        const shopColor = shopColors[Math.floor(Math.random() * shopColors.length)];
        
        const shopMaterial = new THREE.MeshStandardMaterial({
            color: shopColor,
            roughness: 0.7,
            metalness: 0.2
        });
        
        const shop = new THREE.Mesh(shopGeometry, shopMaterial);
        shop.position.y = height / 2;
        shop.castShadow = true;
        shop.receiveShadow = true;
        buildingGroup.add(shop);
        
        // Add a flat roof
        const roofGeometry = new THREE.BoxGeometry(width + 0.5, 0.2, depth + 0.5);
        const roofMaterial = new THREE.MeshStandardMaterial({
            color: 0x696969,
            roughness: 0.8,
            metalness: 0.3
        });
        
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.y = height + 0.1;
        roof.castShadow = true;
        buildingGroup.add(roof);
        
        // Add a storefront with large windows
        const storefrontWidth = width * 0.8;
        const storefrontHeight = height * 0.6;
        const storefrontGeometry = new THREE.PlaneGeometry(storefrontWidth, storefrontHeight);
        const storefrontMaterial = new THREE.MeshStandardMaterial({
            color: 0xADD8E6,
            transparent: true,
            opacity: 0.7,
            roughness: 0.1,
            metalness: 0.9,
            emissive: 0x555555,
            emissiveIntensity: 0.3
        });
        
        const storefront = new THREE.Mesh(storefrontGeometry, storefrontMaterial);
        storefront.position.set(0, storefrontHeight/2 + 0.5, depth/2 + 0.01);
        buildingGroup.add(storefront);
        
        // Add a door
        const doorWidth = 1.2;
        const doorHeight = 2;
        const doorGeometry = new THREE.PlaneGeometry(doorWidth, doorHeight);
        const doorMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513,
            roughness: 0.8,
            metalness: 0.2
        });
        
        const door = new THREE.Mesh(doorGeometry, doorMaterial);
        door.position.set(0, doorHeight/2, depth/2 + 0.02);
        buildingGroup.add(door);
        
        // Add a shop sign
        const signWidth = width * 0.7;
        const signHeight = 0.8;
        const signGeometry = new THREE.BoxGeometry(signWidth, signHeight, 0.2);
        
        // Random sign colors
        const signColors = [0xFF6347, 0x4169E1, 0x32CD32, 0xFFD700, 0xFF69B4];
        const signColor = signColors[Math.floor(Math.random() * signColors.length)];
        
        const signMaterial = new THREE.MeshStandardMaterial({
            color: signColor,
            roughness: 0.5,
            metalness: 0.5,
            emissive: signColor,
            emissiveIntensity: 0.2
        });
        
        const sign = new THREE.Mesh(signGeometry, signMaterial);
        sign.position.set(0, height + 0.5, depth/2 + 0.3);
        sign.castShadow = true;
        buildingGroup.add(sign);
        
        // Position the shop
        buildingGroup.position.set(x, 0, z);
        
        // Face the shop toward the road
        buildingGroup.rotation.y = -Math.PI/2; // Rotate 180 degrees to face the road
        
        scene.add(buildingGroup);
    }
    
    // Function to create an office building
    function createOfficeBuilding(x, z) {
        const buildingGroup = new THREE.Group();
        
        // Office building dimensions
        const width = 5 + Math.random() * 3;
        const height = 6 + Math.random() * 4;
        const depth = 5 + Math.random() * 3;
        
        // Main office structure
        const officeGeometry = new THREE.BoxGeometry(width, height, depth);
        
        // Office colors (more corporate)
        const officeColors = [0xD3D3D3, 0xA9A9A9, 0xC0C0C0, 0xDCDCDC, 0xF5F5F5];
        const officeColor = officeColors[Math.floor(Math.random() * officeColors.length)];
        
        const officeMaterial = new THREE.MeshStandardMaterial({
            color: officeColor,
            roughness: 0.5,
            metalness: 0.5
        });
        
        const office = new THREE.Mesh(officeGeometry, officeMaterial);
        office.position.y = height / 2;
        office.castShadow = true;
        office.receiveShadow = true;
        buildingGroup.add(office);
        
        // Add a flat roof
        const roofGeometry = new THREE.BoxGeometry(width, 0.3, depth);
        const roofMaterial = new THREE.MeshStandardMaterial({
            color: 0x2F4F4F,
            roughness: 0.8,
            metalness: 0.2
        });
        
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.y = height + 0.15;
        roof.castShadow = true;
        buildingGroup.add(roof);
        
        // Add windows (grid pattern)
        const windowSize = 0.6;
        const windowSpacing = 1.2;
        const windowGeometry = new THREE.PlaneGeometry(windowSize, windowSize);
        const windowMaterial = new THREE.MeshStandardMaterial({
            color: 0x87CEEB,
            roughness: 0.1,
            metalness: 0.9,
            emissive: 0x555555,
            emissiveIntensity: 0.3
        });
        
        // Front windows
        for (let wx = -width/2 + windowSize; wx < width/2; wx += windowSpacing) {
            for (let wy = windowSize; wy < height; wy += windowSpacing) {
                const window = new THREE.Mesh(windowGeometry, windowMaterial);
                window.position.set(wx, wy, depth/2 + 0.01);
                buildingGroup.add(window);
            }
        }
        
        // Side windows
        for (let wz = -depth/2 + windowSize; wz < depth/2; wz += windowSpacing) {
            for (let wy = windowSize; wy < height; wy += windowSpacing) {
                const window = new THREE.Mesh(windowGeometry, windowMaterial);
                window.position.set(width/2 + 0.01, wy, wz);
                window.rotation.y = Math.PI / 2;
                buildingGroup.add(window);
                
                const window2 = new THREE.Mesh(windowGeometry, windowMaterial);
                window2.position.set(-width/2 - 0.01, wy, wz);
                window2.rotation.y = Math.PI / 2;
                buildingGroup.add(window2);
            }
        }
        
        // Add entrance
        const entranceWidth = 1.5;
        const entranceHeight = 2;
        const entranceDepth = 0.5;
        
        const entranceGeometry = new THREE.BoxGeometry(entranceWidth, entranceHeight, entranceDepth);
        const entranceMaterial = new THREE.MeshStandardMaterial({
            color: 0x696969,
            roughness: 0.5,
            metalness: 0.7
        });
        
        const entrance = new THREE.Mesh(entranceGeometry, entranceMaterial);
        entrance.position.set(0, entranceHeight/2, depth/2 + entranceDepth/2);
        entrance.castShadow = true;
        buildingGroup.add(entrance);
        
        // Add door
        const doorWidth = 1;
        const doorHeight = 1.8;
        const doorGeometry = new THREE.PlaneGeometry(doorWidth, doorHeight);
        const doorMaterial = new THREE.MeshStandardMaterial({
            color: 0x696969,
            roughness: 0.2,
            metalness: 0.8,
            emissive: 0x555555,
            emissiveIntensity: 0.1
        });
        
        const door = new THREE.Mesh(doorGeometry, doorMaterial);
        door.position.set(0, doorHeight/2, depth/2 + entranceDepth + 0.01);
        buildingGroup.add(door);
        
        // Position the office building
        buildingGroup.position.set(x, 0, z);
        
        // Face the building toward the road
        buildingGroup.rotation.y = -Math.PI/2; // Rotate 180 degrees to face the road
        
        scene.add(buildingGroup);
    }
};
createSimpleBuildings();

// Add particle systems for beach environment
const createParticleSystems = () => {
    // Simplified - no particles
    return { animateParticles: () => {} }; // Empty function as placeholder
};
const particles = createParticleSystems();

// Controls
const keys = { left: false, right: false, up: false, down: false };
let playerSpeed = 0;
let score = 0;
let gameStartTime = 0;
const hud = document.querySelector('.hud');
const speedDisplay = document.querySelector('.speed');
const scoreDisplay = document.querySelector('.score');
const timeDisplay = document.querySelector('.time');

function updateHUD() {
    // Update speed with flashing at max speed
    const speedMph = Math.round(playerSpeed * 3.95); // Convert to MPH (79 MPH at max speed of 20)
    speedDisplay.textContent = `SPEED: ${speedMph} MPH 🚗`;
    if (playerSpeed >= 19) { // Near max speed
        speedDisplay.classList.add('flash');
    } else {
        speedDisplay.classList.remove('flash');
    }

    // Update score
    scoreDisplay.textContent = `SCORE: ${score}`;

    // Update time and add difficulty indicator
    const currentTime = Date.now();
    const elapsedSeconds = Math.floor((currentTime - gameStartTime) / 1000);
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    
    // Add difficulty indicator based on current level
    let difficultyIndicator = '';
    if (difficulty > 0.9) {
        difficultyIndicator = ' ⚠️⚠️⚠️'; // Triple warning at near-impossible
    } else if (difficulty > 0.7) {
        difficultyIndicator = ' ⚠️⚠️'; // Double warning at very hard
    } else if (difficulty > 0.5) {
        difficultyIndicator = ' ⚠️'; // Single warning at medium-hard
    }
    
    timeDisplay.textContent = `TIME: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}${difficultyIndicator}`;
}

function addPoints(points) {
    score += points;
    scoreDisplay.classList.add('flash');
    setTimeout(() => scoreDisplay.classList.remove('flash'), 200);
}

window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') keys.left = true;
    if (e.key === 'ArrowRight') keys.right = true;
    if (e.key === 'ArrowUp') keys.up = true;
    if (e.key === 'ArrowDown') keys.down = true;
});
window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft') keys.left = false;
    if (e.key === 'ArrowRight') keys.right = false;
    if (e.key === 'ArrowUp') keys.up = false;
    if (e.key === 'ArrowDown') keys.down = false;
});

// Add simple clouds that are visible from the player's perspective but spread widely
const createSimpleClouds = () => {
    const clouds = [];
    
    // Create more clouds (12-15) to spread across a wider area
    const cloudCount = 12 + Math.floor(Math.random() * 4);
    
    for (let i = 0; i < cloudCount; i++) {
        // Create a simple cloud using just 3-4 spheres
        const cloud = new THREE.Group();
        
        // Simple white material
        const cloudMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.8
        });
        
        // Create 3-4 overlapping spheres for each cloud
        const puffCount = 3 + Math.floor(Math.random() * 2);
        for (let j = 0; j < puffCount; j++) {
            const radius = 2 + Math.random() * 1.5;
            const geometry = new THREE.SphereGeometry(radius, 8, 8);
            const puff = new THREE.Mesh(geometry, cloudMaterial);
            
            // Position each puff slightly offset from center
            puff.position.set(
                (j - puffCount/2) * 1.5,
                Math.random() * 0.5,
                Math.random() * 0.5
            );
            
            cloud.add(puff);
        }
        
        // Determine if cloud should be on left (buildings) or right (ocean) side
        let xPos;
        if (Math.random() < 0.5) {
            // Right side (ocean side) - spread widely
            xPos = -40 - Math.random() * 80;
        } else {
            // Left side (buildings side) - spread widely
            xPos = 40 + Math.random() * 80;
        }
        
        // Position clouds in the sky where they'll be visible from the car
        // Place them high up and at varying distances ahead
        cloud.position.set(
            xPos,  // Spread far to the sides
            30 + Math.random() * 20,   // Higher in the sky
            -200 + i * 150 + Math.random() * 100  // Staggered ahead and behind
        );
        
        // Scale the cloud - larger for distant clouds
        const scale = 4 + Math.random() * 4;
        cloud.scale.set(scale, scale * 0.7, scale); // Slightly flatter clouds
        
        scene.add(cloud);
        clouds.push(cloud);
    }
    
    // Return a simple animation function
    return {
        animateClouds: (delta, playerZ) => {
            clouds.forEach(cloud => {
                // Move clouds very slowly to the side for subtle effect
                cloud.position.x += 0.05 * delta;
                
                // If cloud moves too far, reset to the other side
                if (cloud.position.x > 120) {
                    cloud.position.x = -120;
                }
                
                // Keep clouds distributed ahead and behind the player as they move
                if (cloud.position.z < playerZ - 500) {
                    cloud.position.z = playerZ + 500 + Math.random() * 200;
                } else if (cloud.position.z > playerZ + 700) {
                    cloud.position.z = playerZ - 300 - Math.random() * 200;
                }
            });
        }
    };
};

const simpleClouds = createSimpleClouds();

// Game loop
function animate(timestamp = 0) {
    const delta = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    requestAnimationFrame(animate);

    // Check if canvas size needs to be updated
    const canvas = renderer.domElement;
    const gameContainer = document.querySelector('.game-container');
    const containerRect = gameContainer.getBoundingClientRect();
    
    if (canvas.width !== containerRect.width || canvas.height !== containerRect.height) {
        resizeCanvas();
    }

    if (!gameActive) {
        // Even when game is not active, render the scene
        renderer.render(scene, camera);
        return;
    }
    
    // Calculate difficulty based on elapsed time
    const elapsedTime = Date.now() - gameStartTime;
    difficulty = Math.min(1.0, elapsedTime / difficultySettings.maxDifficultyTime);
    
    // Update tailgater interval based on difficulty
    tailgaterInterval = difficultySettings.initialTailgaterInterval - 
        (difficultySettings.initialTailgaterInterval - difficultySettings.finalTailgaterInterval) * difficulty;
    
    // Visual feedback for increasing difficulty (update every 10 seconds)
    if (Date.now() - difficultyUpdateTime > 10000) {
        difficultyUpdateTime = Date.now();
        
        // Flash HUD when difficulty increases
        if (difficulty > 0.3) {
            speedDisplay.classList.add('flash');
            scoreDisplay.classList.add('flash');
            timeDisplay.classList.add('flash');
            
            setTimeout(() => {
                speedDisplay.classList.remove('flash');
                scoreDisplay.classList.remove('flash');
                timeDisplay.classList.remove('flash');
            }, 500);
        }
        
        // Change HUD color based on difficulty
        if (difficulty > 0.7) {
            // Red for high difficulty
            timeDisplay.style.color = '#ff3333';
        } else if (difficulty > 0.4) {
            // Yellow for medium difficulty
            timeDisplay.style.color = '#ffff33';
        }
    }

    // Player movement
    const laneChangeSpeed = 10; // units per second
    if (keys.left) player.position.x += laneChangeSpeed * delta;
    if (keys.right) player.position.x -= laneChangeSpeed * delta;
    player.position.x = Math.max(-4, Math.min(4, player.position.x));

    const acceleration = 10; // units per second squared
    const maxSpeed = 20; // units per second
    if (keys.up) playerSpeed += acceleration * delta;
    if (keys.down) playerSpeed -= acceleration * delta;
    playerSpeed = Math.max(0, Math.min(maxSpeed, playerSpeed));
    player.position.z += playerSpeed * delta;

    // Animate player car wheels
    if (player.wheels) {
        const wheelRotationSpeed = playerSpeed * 2; // Rotation speed based on car speed
        player.wheels.forEach(wheel => {
            // Rotate around the wheel's local X axis
            wheel.children.forEach(part => {
                part.rotation.x += wheelRotationSpeed * delta;
            });
        });
    }

    // Camera follow
    camera.position.set(player.position.x, player.position.y + 2, player.position.z - 5);
    camera.lookAt(player.position);

    // Traffic movement
    trafficCars.forEach(car => {
        // Move car forward
        car.mesh.position.z += car.speed * delta;
        
        // Animate traffic car wheels
        if (car.mesh.wheels) {
            const wheelRotationSpeed = car.speed * 2;
            car.mesh.wheels.forEach(wheel => {
                // Rotate around the wheel's local X axis
                wheel.children.forEach(part => {
                    part.rotation.x += wheelRotationSpeed * delta;
                });
            });
        }
        
        if (car.isTailgater) {
            // Check for obstacles ahead (other cars)
            let obstacleAhead = false;
            let obstacleDistance = 0;
            let obstacleLane = 0;
            
            // Check if tailgater has passed the player and award points
            if (car.mesh.position.z > player.position.z && !car.passed && playerSpeed > 0) {
                // Add points for avoiding aggressive driver
                addPoints(50);
                car.passed = true;
            }
            
            // Look for obstacles in front of tailgater
            trafficCars.forEach(otherCar => {
                if (otherCar !== car && !otherCar.isTailgater) {
                    const distance = otherCar.mesh.position.z - car.mesh.position.z;
                    const xDiff = Math.abs(otherCar.mesh.position.x - car.mesh.position.x);
                    
                    // If car is ahead and in same lane (or close to it) and within detection range
                    if (distance > 0 && distance < 10 && xDiff < 1.5) {
                        obstacleAhead = true;
                        obstacleDistance = distance;
                        obstacleLane = Math.round(otherCar.mesh.position.x / 2);
                    }
                }
            });
            
            // Handle lane changing for obstacle avoidance
            if (obstacleAhead && !car.changingLane) {
                // Decide which lane to change to
                const currentLane = Math.round(car.mesh.position.x / 2);
                let newLane;
                
                // Try to find an open lane
                if (currentLane === 0) {
                    // In middle lane, randomly choose left or right
                    newLane = Math.random() < 0.5 ? -1 : 1;
                } else if (currentLane === -1) {
                    // In left lane, try middle or right
                    const middleBlocked = trafficCars.some(otherCar => 
                        Math.abs(otherCar.mesh.position.x) < 1 && 
                        Math.abs(otherCar.mesh.position.z - car.mesh.position.z) < 5
                    );
                    newLane = middleBlocked ? 1 : 0;
                } else {
                    // In right lane, try middle or left
                    const middleBlocked = trafficCars.some(otherCar => 
                        Math.abs(otherCar.mesh.position.x) < 1 && 
                        Math.abs(otherCar.mesh.position.z - car.mesh.position.z) < 5
                    );
                    newLane = middleBlocked ? -1 : 0;
                }
                
                car.targetLane = newLane;
                car.changingLane = true;
                car.laneChangeDirection = newLane > currentLane ? 1 : -1;
            }
            
            // Handle lane changing movement
            if (car.changingLane) {
                const targetX = car.targetLane * 2;
                const moveAmount = car.laneChangeDirection * car.laneChangeSpeed * delta;
                car.mesh.position.x += moveAmount;
                
                // Check if we've reached or passed the target lane
                if ((car.laneChangeDirection > 0 && car.mesh.position.x >= targetX) ||
                    (car.laneChangeDirection < 0 && car.mesh.position.x <= targetX)) {
                    car.mesh.position.x = targetX; // Snap to exact lane position
                    car.changingLane = false;
                }
            }
            
            // At high difficulty, make tailgaters more aggressive by targeting player's lane
            if (difficulty > 0.6 && !car.changingLane && Math.random() < 0.05) {
                const playerLane = Math.round(player.position.x / 2);
                const currentLane = Math.round(car.mesh.position.x / 2);
                
                if (playerLane !== currentLane) {
                    car.targetLane = playerLane;
                    car.changingLane = true;
                    car.laneChangeDirection = playerLane > currentLane ? 1 : -1;
                }
            }
            
            // Reset tailgater if it gets too far ahead
            if (car.mesh.position.z > player.position.z + 50) {
                car.mesh.position.z = player.position.z - 500;
                const lane = Math.floor(Math.random() * 3) - 1;
                car.mesh.position.x = lane * 2;
                car.targetLane = lane;
                car.changingLane = false;
                car.passed = false; // Reset passed status for reuse
            }
        } else {
            // Regular traffic car logic
            // Check if player has passed this car
            if (car.mesh.position.z < player.position.z && !car.passed && playerSpeed > 0) {
                // Add points for passing regular car
                addPoints(10);
                car.passed = true;
            }
            
            // Reposition car if it's too far behind
            if (car.mesh.position.z < player.position.z - 50) {
                car.mesh.position.z = player.position.z + 500;
                const lane = Math.floor(Math.random() * 3) - 1;
                car.mesh.position.x = lane * 2;
                car.passed = false; // Reset passed status for reuse
            }
        }
    });

    // Spawn tailgater based on dynamic interval
    if (gameActive && Date.now() - lastTailgaterTime > tailgaterInterval) {
        spawnTailgater();
        lastTailgaterTime = Date.now();
        
        // At high difficulty, chance to spawn additional tailgaters in quick succession
        if (difficulty > 0.8 && Math.random() < 0.3) {
            // Schedule another tailgater to spawn very soon
            setTimeout(() => {
                if (gameActive) {
                    spawnTailgater();
                    lastTailgaterTime = Date.now();
                }
            }, 500 + Math.random() * 1000); // 0.5-1.5 seconds later
        }
    }

    // Collision check (rear-end only) - updated for car models
    trafficCars.forEach(car => {
        // Calculate distance between cars for collision detection
        const distanceZ = Math.abs(car.mesh.position.z - player.position.z);
        const distanceX = Math.abs(car.mesh.position.x - player.position.x);
        
        // Check if car is behind player and close enough for collision
        if (car.mesh.position.z < player.position.z && distanceZ < 1.5 && distanceX < 1.2) {
            showDecisionScreen();
            playerSpeed = 0;
            gameActive = false;
        }
    });

    updateHUD();

    // Animate simple clouds - pass player position to keep clouds ahead
    if (gameActive) {
        simpleClouds.animateClouds(delta, player.position.z);
    }

    renderer.render(scene, camera);
}

// Set initial camera position
camera.position.set(0, 3, -6);
camera.lookAt(0, 0, 0);

// Initial render
renderer.render(scene, camera);

animate();