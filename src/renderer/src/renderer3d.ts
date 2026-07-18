/**
 * renderer3d.ts
 *
 * Three.jsの「WebGLレンダラー」を作成するファイル。
 * レンダラーとは、シーン・カメラの情報をもとに、実際の画面（Canvas）へ描画する仕組みのこと。
 *
 * ファイル名がエントリーポイントの renderer.ts と紛らわしくないように、
 * こちらは renderer3d.ts という名前にしている。
 *
 * このファイルではレンダラーの生成だけを担当し、
 * 作成したCanvasを画面へ追加する処理は renderer.ts で行う。
 */

import * as THREE from 'three'

/**
 * Three.jsのWebGLレンダラーを作成して返す。
 *
 * @returns ウィンドウ全体のサイズに合わせたTHREE.WebGLRenderer
 */
export function createRenderer(): THREE.WebGLRenderer {
  // WebGLRendererを作成する。
  // antialias: true にすることで、球体の輪郭（ワイヤーフレームの線）のギザギザを滑らかにする。
  const renderer = new THREE.WebGLRenderer({
    antialias: true
  })

  // 描画サイズをウィンドウの幅・高さいっぱいに合わせる。
  renderer.setSize(window.innerWidth, window.innerHeight)

  // ピクセル比（画面の解像度）をディスプレイに合わせる。
  // これにより、高解像度ディスプレイでも表示がぼやけにくくなる。
  renderer.setPixelRatio(window.devicePixelRatio)

  return renderer
}
