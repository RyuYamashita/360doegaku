/**
 * sphere.ts
 *
 * 360度空間の中心となる球体を作成するファイル。
 * 現在はワイヤーフレーム（線だけの網目模様）で球体の形を表示しているだけだが、
 * 将来的にはこの球体の内側に360度画像やユーザーの描画結果を貼り付ける予定。
 *
 * このファイルでは球体（Mesh）の生成だけを担当し、
 * シーンへの追加は renderer.ts で行う。
 */

import * as THREE from 'three'

/**
 * 360度空間の土台となる球体を作成して返す。
 *
 * @returns 内側から見えるように設定した球体のTHREE.Mesh
 */
export function createSphere(): THREE.Mesh {
  // 球体の形（ジオメトリ）を作成する。
  // 引数は順に「半径」「横方向の分割数」「縦方向の分割数」。
  // 分割数を増やすほど球体が滑らかになるが、その分だけ処理が重くなる。
  const geometry = new THREE.SphereGeometry(1, 64, 64)

  // 球体の見た目（マテリアル）を作成する。
  const material = new THREE.MeshStandardMaterial({
    // 色を白にする。
    color: 0xffffff,
    // wireframe: true にすることで、面ではなく線だけの網目模様として表示する。
    wireframe: true,
    // 球体の内側から表面を見るため、描画する面をBackSide（裏面）に設定する。
    // 通常は球体の外側（表面）しか描画されないため、内側から見ると何も見えなくなってしまう。
    // BackSideを指定することで、内側から球体の内面を見られるようにしている。
    side: THREE.BackSide
  })

  // ジオメトリ（形）とマテリアル（見た目）を組み合わせて、実際に表示できるMeshを作成する。
  return new THREE.Mesh(geometry, material)
}
