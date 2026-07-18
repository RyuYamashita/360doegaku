import * as THREE from 'three'

export function addLights(scene: THREE.Scene): void {
  const light = new THREE.DirectionalLight(0xffffff, 2)
  light.position.set(3, 3, 3)
  scene.add(light)

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
  scene.add(ambientLight)
}
