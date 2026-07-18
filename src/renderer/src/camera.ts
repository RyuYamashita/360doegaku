/**
 * camera.ts
 *
 * Three.jsで使用するカメラを作成するファイル。
 * カメラは、3D空間のどの位置から、どの方向を見るかを決める役割を持つ。
 *
 * このファイルではカメラの生成だけを担当し、
 * シーンへの追加や毎フレームの描画は別のファイル（renderer.ts）で行う。
 */

import * as THREE from 'three'

/**
 * Three.jsのカメラを作成して返す。
 *
 * 360doegakuでは、球体の内側にカメラを置き、
 * ユーザーが360度空間の内部にいるように見せている。
 *
 * @returns 球体の中心に配置したTHREE.PerspectiveCamera
 */
export function createCamera(): THREE.PerspectiveCamera {
  // PerspectiveCamera（透視投影カメラ）を作成する。
  // 引数は順に「視野角（FOV）」「画面の縦横比」「近くの描画限界」「遠くの描画限界」。
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)

  // カメラの位置を原点(0, 0, 0)に置く。
  // 球体の中心とカメラの位置を合わせることで、球体の内側からの視点になる。
  camera.position.set(0, 0, 0)

  // カメラが見る方向を(0, 0, -1)に向ける。
  // 向きを指定しないと、球体の内側の面がどちらを向いても見えないことがあるため必要な設定。
  camera.lookAt(0, 0, -1)

  return camera
}
