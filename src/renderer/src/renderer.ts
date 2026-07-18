import './style.css'
import { createScene } from './scene'
import { createCamera } from './camera'
import { createRenderer } from './renderer3d'
import { createSphere } from './sphere'
import { addLights } from './light'

const app = document.getElementById('app')

if (!app) {
  throw new Error('App element not found')
}

const scene = createScene()
const camera = createCamera()
const renderer = createRenderer()

app.appendChild(renderer.domElement)

const sphere = createSphere()
scene.add(sphere)

addLights(scene)

function animate(): void {
  requestAnimationFrame(animate)

  sphere.rotation.y += 0.003

  renderer.render(scene, camera)
}

animate()

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()

  renderer.setSize(window.innerWidth, window.innerHeight)
})
