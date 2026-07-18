/**
 * scene.ts
 *
 * Three.jsの「シーン」を作成するファイル。
 * シーンとは、カメラ・球体・光源などを配置する3D空間そのものの土台のこと。
 * ここで作ったシーンに、他のファイルで作ったカメラや球体、光源を追加していく。
 *
 * このファイルではシーンの生成だけを担当し、
 * カメラの作成（camera.ts）や球体の作成（sphere.ts）は別のファイルで行う。
 */

import * as THREE from 'three'

/**
 * Three.jsのシーンを作成して返す。
 *
 * @returns 背景色を黒に設定したTHREE.Scene
 */
export function createScene(): THREE.Scene {
  // 3D空間そのものであるシーンを作成する。
  const scene = new THREE.Scene()

  // 背景色を黒にする。
  // 360度空間の外側が見えないよう、宇宙空間のような黒背景にしている。
  scene.background = new THREE.Color(0x000000)

  return scene
}
