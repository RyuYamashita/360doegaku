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
 * 7. アニメーションループを開始し、毎フレーム描画する
 * 8. ウィンドウサイズが変わったときの処理を登録する
 */

import './style.css'
import { createScene } from './scene'
import { createCamera } from './camera'
import { createRenderer } from './renderer3d'
import { createSphere } from './sphere'
import { addLights } from './light'

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

/**
 * 毎フレーム呼び出される描画処理。
 * requestAnimationFrameによって、ブラウザの描画タイミングに合わせて繰り返し実行される。
 */
function animate(): void {
  // 次のフレームでも再びanimate関数が呼ばれるように予約する。
  requestAnimationFrame(animate)

  //sphere.rotation.y += 0.003

  // シーンとカメラの現在の状態をもとに、画面へ描画する。
  renderer.render(scene, camera)
}

// 7. アニメーションループを開始する。
animate()

// 8. ウィンドウサイズが変わったときに、カメラとレンダラーのサイズを追従させる。
window.addEventListener('resize', () => {
  // カメラの縦横比をウィンドウの新しいサイズに合わせて更新する。
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()

  // レンダラーの描画サイズもウィンドウの新しいサイズに合わせる。
  renderer.setSize(window.innerWidth, window.innerHeight)
})
