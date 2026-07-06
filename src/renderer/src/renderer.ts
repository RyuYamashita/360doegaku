import * as THREE from 'three'
import './style.css'

const app = document.getElementById('app')

if (!app) {
  throw new Error('App element not found')
}

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x000000)

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)

camera.position.z = 3

const renderer = new THREE.WebGLRenderer({
  antialias: true
})

renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(window.devicePixelRatio)

app.appendChild(renderer.domElement)

const geometry = new THREE.SphereGeometry(1, 64, 64)
const material = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  wireframe: true
})

const sphere = new THREE.Mesh(geometry, material)
scene.add(sphere)

const light = new THREE.DirectionalLight(0xffffff, 2)
light.position.set(3, 3, 3)
scene.add(light)

const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
scene.add(ambientLight)

function animate(): void {
  requestAnimationFrame(animate)

  sphere.rotation.y += 0.01

  renderer.render(scene, camera)
}

animate()

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()

  renderer.setSize(window.innerWidth, window.innerHeight)
})
