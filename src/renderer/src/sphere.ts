/**
 * sphere.ts
 *
 * 360度空間の中心となる球体を作成するファイル。
 * 球体の内側にTextureを貼り付け、白紙の描画面として表示している。
 * 将来的にはこの描画面へユーザーの描画結果を反映していく予定。
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
export function createSphere(): THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial> {
  // 球体の形（ジオメトリ）を作成する。
  // 引数は順に「半径」「横方向の分割数」「縦方向の分割数」。
  // 分割数を増やすほど球体が滑らかになるが、その分だけ処理が重くなる。
  const geometry = new THREE.SphereGeometry(1, 64, 64)

  // 球体の見た目（マテリアル）を作成する。
  const material = new THREE.MeshBasicMaterial({
    // 色を白にする。
    color: 0xffffff,
    // 描画面としてTextureを貼り付けるため、線だけのワイヤーフレームではなく面として表示する。
    wireframe: false,
    // 球体の内側から表面を見るため、描画する面をBackSide（裏面）に設定する。
    // 通常は球体の外側（表面）しか描画されないため、内側から見ると何も見えなくなってしまう。
    // BackSideを指定することで、内側から球体の内面を見られるようにしている。
    side: THREE.BackSide
  })

  // ジオメトリ（形）とマテリアル（見た目）を組み合わせて、実際に表示できるMeshを作成する。
  return new THREE.Mesh(geometry, material)
}
