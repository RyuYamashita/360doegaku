/**
 * light.ts
 *
 * 3D空間を照らす光源をシーンへ追加するファイル。
 * 光源がないと、ワイヤーフレーム以外の面を持つオブジェクト（将来追加される予定のもの）が
 * 真っ暗になって見えなくなってしまうため必要な処理。
 *
 * このファイルでは光源の作成とシーンへの追加だけを担当する。
 */

import * as THREE from 'three'

/**
 * シーンに光源を追加する。
 *
 * DirectionalLight（平行光源）とAmbientLight（環境光）の2種類を組み合わせて、
 * 自然な明るさになるようにしている。
 *
 * @param scene 光源を追加する対象のシーン
 */
export function addLights(scene: THREE.Scene): void {
  // DirectionalLight（平行光源）を作成する。
  // 太陽光のように、決まった方向から一様に光が当たるイメージの光源。
  // 引数は順に「色」「明るさ（強度）」。
  const light = new THREE.DirectionalLight(0xffffff, 2)

  // 光源の位置を設定する。この位置から原点付近へ向かって光が当たる。
  light.position.set(3, 3, 3)
  scene.add(light)

  // AmbientLight（環境光）を作成する。
  // 特定の方向を持たず、シーン全体を均一にほんのり明るくする光源。
  // これがないと、光が当たらない面が真っ黒になりすぎてしまう。
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
  scene.add(ambientLight)
}
