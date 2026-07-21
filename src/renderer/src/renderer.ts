/**
 * renderer.ts
 *
 * 360doegakuの描画処理のエントリーポイント（起動時に最初に実行されるファイル）。
 * scene.ts / camera.ts / renderer3d.ts / sphere.ts / light.ts で作った部品を
 * すべて組み立てて、実際に画面へ表示するところまでを担当する。
 *
 * 処理の流れは以下の順番で進む。
 * 1. シーンを作成する
 * 2. カメラを作成する
 * 3. WebGLレンダラーを作成する
 * 4. レンダラーのCanvasを画面（#app要素）へ追加する
 * 5. 球体を作成してシーンへ追加する
 * 6. 光源をシーンへ追加する
 * 7. OrbitControls（視点操作）を作成する
 * 8. Raycaster（マウスポインターと球体の交差判定）を準備する
 * 9. アニメーションループを開始し、毎フレーム描画する
 * 10. ウィンドウサイズが変わったときの処理を登録する
 */

import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { createScene } from './scene'
import { createCamera } from './camera'
import { createRenderer } from './renderer3d'
import { createSphere } from './sphere'
import { addLights } from './light'

/**
 * 視点操作用のOrbitControlsを作成する。
 *
 * 将来ブラシ描画など別の操作モードへ切り替えやすいように、
 * OrbitControlsの生成と設定をこの関数へ独立させている
 * （呼び出しをやめる、enableRotateなどを切り替える、といった変更がしやすくなる）。
 *
 * @param targetCamera 視点操作の対象となるカメラ
 * @param domElement マウス・ホイール操作を受け取るCanvas要素
 * @returns 設定済みのOrbitControls
 */
function createOrbitControls(
  targetCamera: ReturnType<typeof createCamera>,
  domElement: HTMLElement
): OrbitControls {
  const controls = new OrbitControls(targetCamera, domElement)

  // カメラの位置は camera.ts の設計どおり(0, 0, 0)のまま維持したい。
  // しかしOrbitControlsの注視点(target)がカメラと完全に同じ位置だと、
  // カメラ〜注視点の距離が0になり、回転の向きを計算できず視点操作が働かない。
  // そのため、camera.tsで設定した初期の向き(0, 0, -1)と同じ方向へ、
  // ごくわずかな距離だけ離した点をtargetにする。
  // これにより、カメラは球体の中心付近に留まったまま見回せるようになる。
  controls.target.set(0, 0, -0.01)

  // 左ドラッグで視点を回転できるようにする。
  controls.enableRotate = true
  // マウスホイールでズームできるようにする。
  controls.enableZoom = true
  // 右ドラッグによるパン移動は禁止する。
  controls.enablePan = false

  // ドラッグを離した後、視点の動きが少しだけ滑らかに収まるようにする。
  // 値を明示することで、Three.js更新による既定値変更の影響を受けないようにする。
  controls.enableDamping = true
  controls.dampingFactor = 0.05

  // ズームでカメラがtargetから離れすぎると、球体（半径1）の外へ出てしまい、
  // 内側だけを描画しているBackSideの面が見えなくなってしまう。
  // そのため、targetからの距離（見回し半径）を球体の内部に収まる範囲に制限する。
  controls.minDistance = 0.01
  controls.maxDistance = 0.9

  return controls
}

// 描画結果（Canvas）を差し込むためのHTML要素を取得する。
// index.htmlに用意されている id="app" の要素がこれにあたる。
const app = document.getElementById('app')

if (!app) {
  // #app要素が見つからない場合は、これ以降の処理を続けられないためエラーにする。
  throw new Error('App element not found')
}

// 1. シーンを作成する（球体や光源を配置する3D空間そのもの）
const scene = createScene()
// 2. カメラを作成する（球体の内側、原点から-Z方向を見るカメラ）
const camera = createCamera()
// 3. WebGLレンダラーを作成する（シーンとカメラの情報を画面に描画する仕組み）
const renderer = createRenderer()

// レンダラーが内部で作成したCanvas要素を、画面上の#app要素の中に追加する。
// これにより、実際にブラウザ（Electronウィンドウ）上に描画結果が表示される。
app.appendChild(renderer.domElement)

// 5. 球体を作成し、シーンへ追加する。
const sphere = createSphere()
scene.add(sphere)

// 6. 光源をシーンへ追加する。
addLights(scene)

// 7. OrbitControlsを作成する。左ドラッグで視点回転、ホイールでズームができるようになる。
const controls = createOrbitControls(camera, renderer.domElement)
// target・minDistance・maxDistanceなどの設定を、最初のフレームより前に反映しておく。
controls.update()

// 8. Raycaster（マウスポインターが指す方向にレイを飛ばし、オブジェクトとの交差を調べる仕組み）を準備する。
// pointermoveのたびに生成すると負荷が増えるため、Raycasterとポインター座標用のVector2は一度だけ生成し使い回す。
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
// 球体とレイの交差判定結果を保持する変数。現時点では保持するだけで、描画やブラシ処理には使用しない。
let sphereIntersections: THREE.Intersection[] = []

window.addEventListener('pointermove', (event) => {
  // マウスのピクセル座標を、Three.jsが扱うNDC（画面中心を原点とした-1〜1の正規化デバイス座標）へ変換する。
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1

  // 現在のポインター位置とカメラから、球体との交差判定に使うレイを設定する。
  raycaster.setFromCamera(pointer, camera)
  sphereIntersections = raycaster.intersectObject(sphere)
  // 今回は結果を保持するだけで、描画やブラシ処理にはまだ使用しない。
  // tsconfigのnoUnusedLocalsにより未使用変数はエラーになるため、参照したことだけを示しておく。
  void sphereIntersections
})

/**
 * 毎フレーム呼び出される描画処理。
 * requestAnimationFrameによって、ブラウザの描画タイミングに合わせて繰り返し実行される。
 */
function animate(): void {
  // 次のフレームでも再びanimate関数が呼ばれるように予約する。
  requestAnimationFrame(animate)

  //sphere.rotation.y += 0.003

  // enableDamping = trueにしているため、毎フレームupdate()を呼んで
  // 視点操作（ドラッグ・ズーム）の状態をカメラへ反映する。
  controls.update()

  // シーンとカメラの現在の状態をもとに、画面へ描画する。
  renderer.render(scene, camera)
}

// 8. アニメーションループを開始する。
animate()

// 9. ウィンドウサイズが変わったときに、カメラとレンダラーのサイズを追従させる。
window.addEventListener('resize', () => {
  // カメラの縦横比をウィンドウの新しいサイズに合わせて更新する。
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()

  // レンダラーの描画サイズもウィンドウの新しいサイズに合わせる。
  renderer.setSize(window.innerWidth, window.innerHeight)
})
