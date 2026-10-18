import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const viewer = document.querySelector("#viewer");
const statusEl = document.querySelector("#viewerStatus");
const shirtInput = document.querySelector("#shirtInput");
const pantsInput = document.querySelector("#pantsInput");
const shirtName = document.querySelector("#shirtName");
const pantsName = document.querySelector("#pantsName");
const resetButton = document.querySelector("#resetView");
const clearButton = document.querySelector("#clearTextures");

let scene;
let camera;
let renderer;
let controls;
let avatar;
let shirtMeshes = [];
let pantsMeshes = [];
let neutralMeshes = [];
let floorShadow;
let shirtTexture = null;
let pantsTexture = null;
let shirtObjectUrl = null;
let pantsObjectUrl = null;

const textureLoader = new THREE.TextureLoader();
const modelLoader = new GLTFLoader();
const modelUrl = new URL("./assets/models/roblox_model_blocky.glb", import.meta.url).href;

function setStatus(text, hidden = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle("is-hidden", hidden);
}

function createScene() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(32, viewer.clientWidth / viewer.clientHeight, 0.1, 100);
  camera.position.set(0, 1.35, 6.15);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setSize(viewer.clientWidth, viewer.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  viewer.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 4.4;
  controls.maxDistance = 7.4;
  controls.minPolarAngle = Math.PI * 0.22;
  controls.maxPolarAngle = Math.PI * 0.74;
  controls.target.set(0, 1.22, 0);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x7d9078, 2.25));

  const key = new THREE.DirectionalLight(0xffffff, 2.6);
  key.position.set(3, 5, 4);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xd7ffd8, 0.9);
  rim.position.set(-4, 3, -2);
  scene.add(rim);

  floorShadow = new THREE.Mesh(
    new THREE.CircleGeometry(1, 72),
    new THREE.MeshBasicMaterial({
      color: 0x263225,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    })
  );
  floorShadow.rotation.x = -Math.PI / 2;
  floorShadow.scale.set(1.45, 0.44, 1);
  floorShadow.position.set(0, 0.012, 0.1);
  scene.add(floorShadow);

  loadAvatar();
  animate();
}

function loadAvatar() {
  setStatus("Loading blocky model");

  modelLoader.load(
    modelUrl,
    (gltf) => {
      avatar = gltf.scene;
      avatar.name = "roblox-model-blocky";

      shirtMeshes = [];
      pantsMeshes = [];
      neutralMeshes = [];

      avatar.traverse((object) => {
        if (!object.isMesh) return;

        object.castShadow = false;
        object.receiveShadow = false;
        object.material = object.material.clone();
        object.material.map = null;
        object.material.color.set(0xffffff);
        object.material.emissive?.set(0x000000);
        object.material.roughness = 0.74;
        object.material.metalness = 0;
        object.material.side = THREE.FrontSide;

        const name = `${object.name} ${object.material.name}`.toLowerCase();
        if (name.includes("top") || name.includes("torso")) {
          shirtMeshes.push(object);
        } else if (name.includes("bot") || name.includes("leg")) {
          pantsMeshes.push(object);
        } else {
          neutralMeshes.push(object);
        }
      });

      fitAvatarToStage();
      scene.add(avatar);
      applyTextures();
      setStatus("", true);
    },
    undefined,
    (error) => {
      console.error(error);
      setStatus("Model fallback");
      createAvatar();
    }
  );
}

function createAvatar() {
  avatar = new THREE.Group();
  avatar.name = "code-built-r6-blocky-avatar";
  shirtMeshes = [];
  pantsMeshes = [];
  neutralMeshes = [];

  const skin = createMaterial(0xffffff);
  const shirt = createMaterial(0xffffff);
  const pants = createMaterial(0xffffff);

  addPart("Head", [0.86, 0.64, 0.86], [0, 2.72, 0], skin, neutralMeshes);
  addPart("Torso", [1.52, 1.42, 0.68], [0, 1.78, 0], shirt, shirtMeshes);
  addPart("Left Arm", [0.46, 1.42, 0.62], [-1.02, 1.78, 0], shirt, shirtMeshes);
  addPart("Right Arm", [0.46, 1.42, 0.62], [1.02, 1.78, 0], shirt, shirtMeshes);
  addPart("Left Leg", [0.58, 1.2, 0.62], [-0.36, 0.48, 0], pants, pantsMeshes);
  addPart("Right Leg", [0.58, 1.2, 0.62], [0.36, 0.48, 0], pants, pantsMeshes);

  avatar.scale.setScalar(0.66);
  avatar.position.y = 0.02;
  scene.add(avatar);
  setStatus("", true);
}

function fitAvatarToStage() {
  const box = new THREE.Box3().setFromObject(avatar);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const desiredHeight = 2.55;
  const scale = desiredHeight / Math.max(size.y, 0.001);
  avatar.scale.setScalar(scale);
  avatar.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
}

function createMaterial(color) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.72,
    metalness: 0,
    transparent: true,
    alphaTest: 0.01,
    side: THREE.FrontSide,
  });
}

function addPart(name, size, position, material, bucket) {
  const geometry = new THREE.BoxGeometry(size[0], size[1], size[2]);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(position[0], position[1], position[2]);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  avatar.add(mesh);
  bucket.push(mesh);
}

function disposeTexture(texture) {
  if (texture) texture.dispose();
}

function loadTexture(file, type) {
  if (!file) return;

  const previousUrl = type === "shirt" ? shirtObjectUrl : pantsObjectUrl;
  if (previousUrl) URL.revokeObjectURL(previousUrl);

  const url = URL.createObjectURL(file);

  if (type === "shirt") {
    shirtObjectUrl = url;
    shirtName.textContent = file.name;
    disposeTexture(shirtTexture);
  } else {
    pantsObjectUrl = url;
    pantsName.textContent = file.name;
    disposeTexture(pantsTexture);
  }

  setStatus("Applying texture");
  textureLoader.load(
    url,
    (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.flipY = false;
      texture.needsUpdate = true;

      if (type === "shirt") {
        shirtTexture = texture;
      } else {
        pantsTexture = texture;
      }

      applyTextures();
      setStatus("", true);
    },
    undefined,
    (error) => {
      console.error(error);
      setStatus("Texture failed");
    }
  );
}

function applyTextures() {
  if (!avatar) return;

  shirtMeshes.forEach((mesh) => setMeshTexture(mesh, shirtTexture, 0xffffff));
  pantsMeshes.forEach((mesh) => setMeshTexture(mesh, pantsTexture, 0xffffff));
  neutralMeshes.forEach((mesh) => setMeshTexture(mesh, null, 0xffffff));
}

function setMeshTexture(mesh, texture, fallbackColor) {
  mesh.material.map = texture || null;
  mesh.material.color.set(texture ? 0xffffff : fallbackColor);
  mesh.material.needsUpdate = true;
}

function clearTextures() {
  disposeTexture(shirtTexture);
  disposeTexture(pantsTexture);
  shirtTexture = null;
  pantsTexture = null;

  if (shirtObjectUrl) URL.revokeObjectURL(shirtObjectUrl);
  if (pantsObjectUrl) URL.revokeObjectURL(pantsObjectUrl);
  shirtObjectUrl = null;
  pantsObjectUrl = null;

  shirtInput.value = "";
  pantsInput.value = "";
  shirtName.textContent = "PNG, JPG, WEBP";
  pantsName.textContent = "PNG, JPG, WEBP";
  applyTextures();
}

function resetView() {
  controls.reset();
  camera.position.set(0, 1.35, 6.15);
  controls.target.set(0, 1.22, 0);
  controls.update();
}

function wireDropZone(label, input, type) {
  input.addEventListener("change", () => loadTexture(input.files[0], type));

  ["dragenter", "dragover"].forEach((eventName) => {
    label.addEventListener(eventName, (event) => {
      event.preventDefault();
      label.classList.add("is-dragging");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    label.addEventListener(eventName, (event) => {
      event.preventDefault();
      label.classList.remove("is-dragging");
    });
  });

  label.addEventListener("drop", (event) => {
    const file = event.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) loadTexture(file, type);
  });
}

function resize() {
  if (!renderer || !camera) return;
  const width = viewer.clientWidth;
  const height = viewer.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

wireDropZone(document.querySelector("#shirtDrop"), shirtInput, "shirt");
wireDropZone(document.querySelector("#pantsDrop"), pantsInput, "pants");
resetButton.addEventListener("click", resetView);
clearButton.addEventListener("click", clearTextures);
window.addEventListener("resize", resize);

createScene();
