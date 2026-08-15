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

  // 左ボタンはブラシ操作に使うため、OrbitControls側の操作を割り当てない。
  // pointerdownの伝播を止めて構造的に競合を防ぐが、念のための防御的な設定として残す。
  controls.mouseButtons.LEFT = null
  // 右ドラッグで視点回転できるようにする（左ボタンをブラシに使うための代替割り当て）。
  controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE

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
// 現在のUV座標をコピーして保持するためのVector2。pointermoveのたびに生成しないよう一度だけ確保し、使い回す。
const currentUvVector = new THREE.Vector2()
// 現在のUV座標。交差情報またはUVが取得できない場合はnull（未取得）にする。
let currentUv: THREE.Vector2 | null = null

// 描画Canvasの基準サイズ（将来変更可能）
const drawingCanvasSize = {
  width: 1920,
  height: 960
}
// 将来のTexture生成・描画処理の元になる描画用Canvas。画面には表示せず、アプリ初期化時に1回だけ生成して使い回す。
const drawingCanvas = document.createElement('canvas')
// 内部の描画サイズはdrawingCanvasSizeに合わせる（CSS表示サイズではなくCanvas自体のwidth/height属性）。
drawingCanvas.width = drawingCanvasSize.width
drawingCanvas.height = drawingCanvasSize.height
// 白色初期化のために2Dコンテキストを1回だけ取得する。
const maybeDrawingContext = drawingCanvas.getContext('2d')

if (!maybeDrawingContext) {
  // 2Dコンテキストが取得できない場合、以降のCanvas初期化・Texture化を継続できないためエラーにする。
  throw new Error('描画Canvasの2Dコンテキストを取得できませんでした')
}

// ここで新しい変数へ代入し直すことで、以降のネストした関数（drawBrushDot等）の中でも
// TypeScript上nullを含まない型として扱えるようにする（クロージャへは絞り込みが伝播しないため）。
const drawingContext = maybeDrawingContext

// 360度描画空間の初期状態を白紙にするため、ブラシ描画とは別に全面を白で塗りつぶしておく。
drawingContext.fillStyle = '#ffffff'
drawingContext.fillRect(0, 0, drawingCanvasSize.width, drawingCanvasSize.height)

// 最初のブラシの固定設定（色・線幅のみ。将来のブラシ設定構造は今回先取りしない）。
const brushColor = '#000000'
const brushWidth = 20
// 白色初期化の後、ブラシ用のスタイルを1回だけ設定する（描画のたびに設定し直さない）。
drawingContext.fillStyle = brushColor
drawingContext.strokeStyle = brushColor
drawingContext.lineWidth = brushWidth
drawingContext.lineCap = 'round'
drawingContext.lineJoin = 'round'

// drawingCanvasを描画Textureとして保持する（アプリ初期化時に1回だけ生成）。
const drawingTexture = new THREE.CanvasTexture(drawingCanvas)
// Canvasの色は色データ（sRGB）として扱う。デフォルトのNoColorSpaceのままだと
// SRGBColorSpaceで出力するWebGLRendererと色が整合しないため明示する。
drawingTexture.colorSpace = THREE.SRGBColorSpace
// Canvas上端(Y=0)と球体上側(UVのV=1)の対応を、フェーズ2-7の座標変換前提のまま維持するため明示する。
drawingTexture.flipY = true
// 将来ブラシ描画で頻繁に更新するため、更新のたびにミップマップを
// 再生成するコストを避ける。
drawingTexture.generateMipmaps = false
// generateMipmaps: falseと整合させるため、ミップマップに依存しないフィルターへ変更する。
drawingTexture.minFilter = THREE.LinearFilter
drawingTexture.magFilter = THREE.LinearFilter
// 白紙で初期化済みのdrawingTextureを球体の描画面として使用する。
sphere.material.map = drawingTexture
// 現在のCanvas座標をコピーして保持するためのVector2。currentUvVectorと同様、一度だけ確保し使い回す。
const currentCanvasPositionVector = new THREE.Vector2()
// 現在のCanvas座標（Canvas左上を原点とした整数ピクセル座標）。currentUvが取得できない場合はnull（未取得）にする。
let currentCanvasPosition: THREE.Vector2 | null = null

/**
 * ポインター座標から球体とのRaycastを行い、currentUv・currentCanvasPositionを更新する。
 * pointermove・ブラシのpointerdownの両方から呼び出せるよう、共通処理として独立させている。
 *
 * @param event NDC座標へ変換する対象のPointerEvent
 */
function updatePointerRaycast(event: PointerEvent): void {
  // マウスのピクセル座標を、Three.jsが扱うNDC（画面中心を原点とした-1〜1の正規化デバイス座標）へ変換する。
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1

  // 現在のポインター位置とカメラから、球体との交差判定に使うレイを設定する。
  raycaster.setFromCamera(pointer, camera)
  sphereIntersections = raycaster.intersectObject(sphere)

  // 最も近い交差点（先頭要素）からUV座標を取得できる場合のみ、現在のUV座標として保持する。
  const nearestUv = sphereIntersections[0]?.uv
  if (nearestUv) {
    // Intersection.uvをそのまま保持すると、参照経由で意図しない変更の影響を受ける可能性があるため、
    // 使い回し用のVector2へ値だけをコピーする。
    currentUvVector.copy(nearestUv)
    currentUv = currentUvVector
  } else {
    // 交差情報がない、またはUVが取得できない場合は未取得状態に戻す。
    currentUv = null
  }

  if (currentUv) {
    // Three.jsのSphereGeometryは、球体の上側(UVのV=1)から下側(V=0)へ向かってVが小さくなる向きでUVを生成する
    // （three.jsのSphereGeometry実装で確認済み）。
    // 一方Canvas座標は左上(Y=0)を原点として下方向にYが増加するため、V値をそのまま使うと上下が逆になる。
    // そのため(1 - V)でY座標を算出し、球体の上＝Canvas上端、球体の下＝Canvas下端となるよう向きを合わせる。
    const canvasX = Math.floor(currentUv.x * drawingCanvasSize.width)
    const canvasY = Math.floor((1 - currentUv.y) * drawingCanvasSize.height)

    // UV値が境界の0または1になった場合でもCanvasの有効範囲(0～サイズ-1)を超えないよう制限する。
    currentCanvasPositionVector.set(
      THREE.MathUtils.clamp(canvasX, 0, drawingCanvasSize.width - 1),
      THREE.MathUtils.clamp(canvasY, 0, drawingCanvasSize.height - 1)
    )
    currentCanvasPosition = currentCanvasPositionVector
  } else {
    // currentUvが未取得の場合は、Canvas座標も未取得状態に戻す。
    currentCanvasPosition = null
  }
}

// 現在ブラシ描画中のpointerId。描画中でない場合はnull。この変数がnullでないことを描画中状態として扱う。
let activePointerId: number | null = null
// 前回描画したCanvas座標をコピーして保持するためのVector2。使い回し用に一度だけ確保する。
const lastDrawPositionVector = new THREE.Vector2()
// 前回描画したCanvas座標。ストローク開始直後や中断後は未取得としてnullにする。
let lastDrawPosition: THREE.Vector2 | null = null

/**
 * 指定したCanvas座標へ、ブラシ色で塗りつぶした円を描く。
 * 最初の点・前回座標がない場合の再開点・UV継ぎ目をまたいだ再開点の3箇所から共通で使う。
 *
 * @param x Canvas上のX座標
 * @param y Canvas上のY座標
 */
function drawBrushDot(x: number, y: number): void {
  drawingContext.beginPath()
  drawingContext.arc(x, y, brushWidth / 2, 0, Math.PI * 2)
  drawingContext.fill()
}

// ブラシの描画状態（アクティブなpointerId・前回座標）をリセットする。
function resetDrawingState(): void {
  activePointerId = null
  lastDrawPosition = null
}

/**
 * ブラシのストロークを終了する。状態を先にリセットしてから、
 * Pointer Captureを保持している場合だけ解放する（lostpointercaptureの再入時も安全なように）。
 *
 * @param pointerId 終了させるポインターのID
 */
function finishDrawing(pointerId: number): void {
  resetDrawingState()
  if (renderer.domElement.hasPointerCapture(pointerId)) {
    renderer.domElement.releasePointerCapture(pointerId)
  }
}

/**
 * 左ボタンのpointerdownでブラシストロークを開始する。
 * captureフェーズで登録し、左ボタンの場合だけOrbitControls側のpointerdownより先に
 * event.stopImmediatePropagation()することで、視点回転との競合を構造的に防ぐ。
 *
 * @param event pointerdownイベント
 */
function handleBrushPointerDown(event: PointerEvent): void {
  if (!event.isPrimary) return
  if (event.button !== 0) return

  // 左ボタンの場合のみ、OrbitControls側のpointerdownハンドラへ到達させない。
  event.stopImmediatePropagation()
  event.preventDefault()

  updatePointerRaycast(event)

  // 球体と交差していない位置でのpointerdownでは、描画を開始しない。
  if (!currentCanvasPosition) return

  activePointerId = event.pointerId
  renderer.domElement.setPointerCapture(event.pointerId)

  drawBrushDot(currentCanvasPosition.x, currentCanvasPosition.y)
  lastDrawPositionVector.copy(currentCanvasPosition)
  lastDrawPosition = lastDrawPositionVector
  drawingTexture.needsUpdate = true
}

/**
 * ブラシストローク中のpointercancelを処理する。
 * OrbitControlsはpointercancelをdomElementへ常設登録しているため、
 * captureフェーズでアクティブなポインターの場合だけ先に遮断し、終了処理を行う。
 *
 * @param event pointercancelイベント
 */
function handleBrushPointerCancel(event: PointerEvent): void {
  if (activePointerId === null || event.pointerId !== activePointerId) return
  event.stopImmediatePropagation()
  finishDrawing(event.pointerId)
}

renderer.domElement.addEventListener('pointerdown', handleBrushPointerDown, { capture: true })
renderer.domElement.addEventListener('pointercancel', handleBrushPointerCancel, { capture: true })

renderer.domElement.addEventListener('pointerup', (event) => {
  // OrbitControlsは左ボタンのpointerIdを追跡していないため、伝播を遮断する必要はない。
  if (activePointerId === null || event.pointerId !== activePointerId) return
  finishDrawing(event.pointerId)
})

renderer.domElement.addEventListener('lostpointercapture', (event) => {
  if (activePointerId === null || event.pointerId !== activePointerId) return
  // Pointer Captureは既に失われているため、releasePointerCapture()は呼ばない。
  resetDrawingState()
})

window.addEventListener('blur', () => {
  if (activePointerId !== null) {
    finishDrawing(activePointerId)
  }
})

window.addEventListener('pointermove', (event) => {
  updatePointerRaycast(event)

  if (activePointerId === null || event.pointerId !== activePointerId) return

  // Rendererがウィンドウ全体を使用しているため、画面内かどうかをウィンドウサイズで判定する。
  const inBounds =
    event.clientX >= 0 &&
    event.clientX <= window.innerWidth &&
    event.clientY >= 0 &&
    event.clientY <= window.innerHeight

  if (!currentCanvasPosition || !inBounds) {
    // 交差なし、または描画領域外では線をつながず、次に有効な位置から新しく描き始める。
    lastDrawPosition = null
    return
  }

  if (lastDrawPosition) {
    // そのままlineTo()で接続すると、UVの左右端をまたぐ際にCanvas全体を横断する不正な線になる。
    // そのため、X座標差の符号から継ぎ目をまたいだ方向を判定し、Canvas幅だけずらした2本の線分として
    // 左右端へ描画する。Canvas範囲外への描画は暗黙的にクリッピングされるため、それぞれの線分は
    // 実際にCanvas内に収まる側だけが結果的に表示される。
    const deltaX = currentCanvasPosition.x - lastDrawPosition.x
    if (Math.abs(deltaX) > drawingCanvasSize.width / 2) {
      drawingContext.beginPath()
      if (deltaX < 0) {
        // 右端から左端へまたいだ場合。
        drawingContext.moveTo(lastDrawPosition.x, lastDrawPosition.y)
        drawingContext.lineTo(
          currentCanvasPosition.x + drawingCanvasSize.width,
          currentCanvasPosition.y
        )
        drawingContext.moveTo(lastDrawPosition.x - drawingCanvasSize.width, lastDrawPosition.y)
        drawingContext.lineTo(currentCanvasPosition.x, currentCanvasPosition.y)
      } else {
        // 左端から右端へまたいだ場合。
        drawingContext.moveTo(lastDrawPosition.x, lastDrawPosition.y)
        drawingContext.lineTo(
          currentCanvasPosition.x - drawingCanvasSize.width,
          currentCanvasPosition.y
        )
        drawingContext.moveTo(lastDrawPosition.x + drawingCanvasSize.width, lastDrawPosition.y)
        drawingContext.lineTo(currentCanvasPosition.x, currentCanvasPosition.y)
      }
      drawingContext.stroke()
    } else {
      drawingContext.beginPath()
      drawingContext.moveTo(lastDrawPosition.x, lastDrawPosition.y)
      drawingContext.lineTo(currentCanvasPosition.x, currentCanvasPosition.y)
      drawingContext.stroke()
    }
  } else {
    // 前回座標がない（ストローク再開直後）場合は、まず点を描いてつなぎ先を作る。
    drawBrushDot(currentCanvasPosition.x, currentCanvasPosition.y)
  }

  lastDrawPositionVector.copy(currentCanvasPosition)
  lastDrawPosition = lastDrawPositionVector
  drawingTexture.needsUpdate = true
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
