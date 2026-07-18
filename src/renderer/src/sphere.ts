import * as THREE from 'three'

export function createSphere(): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(1, 64, 64)
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    wireframe: true,
    side: THREE.BackSide
  })

  return new THREE.Mesh(geometry, material)
}
