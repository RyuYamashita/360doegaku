# ROADMAP.md

# 360doegaku Development Roadmap

Version: 0.2.0

---

# 現在の状況

## 完了

- Phase 1-1
  - Node.js環境構築

- Phase 1-2
  - Electron + TypeScript

- Phase 1-3
  - Three.js導入

- Phase 1-4
  - Git / GitHub構築

- Phase 2-1
  - 最初の回転する球体を表示

- Phase 2-2
  - 球体の内側表示

- Phase 2-3
  - 360度カメラ

- Phase 2-4
  - ズーム

- Phase 2-5
  - FPS表示

- Phase 2-6
  - RaycasterによるUV座標取得

- Phase 2-7
  - UV座標をCanvas座標へ変換

- Phase 2-8
  - 描画Canvas生成

- Phase 2-9
  - CanvasTexture生成と基本設定

- Phase 2-10
  - 描画Textureを球体Materialへ接続

- Phase 2-11
  - 最初のブラシ描画

## 次の作業

- Phase 2-12
  - 360度JPEG保存基盤

---

# 開発ロードマップ

## Phase 2 描画基盤

### Phase 2-2

球体の内側表示

目標

・球体内部へカメラを配置
・球体内面を描画

成果物

360度空間の内側表示

---

### Phase 2-3

360度カメラ

目標

・マウスドラッグで視点変更

成果物

360度視点移動

---

### Phase 2-4

ズーム

目標

・ホイール操作
・FOV制御

成果物

ズーム可能

---

### Phase 2-5

FPS表示

目標

・描画速度表示

成果物

FPSモニター

---

### Phase 2-12

360度JPEG保存基盤

目標

・現在の1920×960描画CanvasをJPEGへ変換する
・正距円筒図法の360度画像として判定するためのGPano XMPメタデータをJPEGへ埋め込む
・Electronの保存ダイアログからJPEGファイルを保存する
・renderer、preload、mainの責務を分離し、安全なIPC経由で保存する
・Facebookへ投稿し、360度画像として表示できるか実機確認する

成果物

Facebookなどで360度表示を検証できるXMP付きJPEGファイル

位置づけ

・現在の描画結果が360度画像として利用できることを確認するための限定的な保存基盤とする
・Phase 7の保存機能全体を前倒しするものではない
・初期実装では現在の1920×960描画Canvasを保存対象とする
・JPEG生成、XMP埋め込み、ファイル保存の責務を分離し、将来の保存EngineまたはRust実装へ置き換え可能な構造を維持する

今回の対象外

・ユーザー指定解像度
・高解像度Canvasへの再描画
・解像度非依存のストローク履歴
・PNG、TIFF、WebPなどJPEG以外の保存
・独自プロジェクト形式
・初期視点設定UI
・Facebook API連携およびSNSへの自動投稿
・レイヤー統合
・Rustによる保存処理

---

# Phase 3

360度キャンバス

・UV確認
・球体キャンバス
・描画準備

---

# Phase 4

ブラシ

・ブラシ
・消しゴム
・ブラシサイズ
・筆圧対応

---

# Phase 5

レイヤー

・複数レイヤー
・表示ON/OFF
・透明度
・ブレンドモード

---

# Phase 6

Illustrator機能

・図形
・ベジェ曲線
・文字
・パス編集

---

# Phase 7

保存

・PNG
・JPEG
・SVG
・独自形式
・自動保存
・ユーザー指定解像度
・解像度非依存のストローク情報から保存用Canvasへ再描画
・Phase 2-12で構築した360度JPEG保存基盤の拡張

---

# Phase 8

Rust高速化

・ブラシ
・保存
・画像処理
・並列処理

---

# Phase 9

WebGPU

・GPUブラシ
・GPUフィルター

---

# Phase10

正式版リリース

## 将来の設計改善候補

以下は現時点では実装しないが、今後のフェーズで検討する設計改善項目。

- Pointer関連（pointer、Raycaster、Intersection、currentUvなど）を専用モジュールへ分離する。
- `currentUv`および`currentCanvasPosition`は再利用する共有`Vector2`を参照しているため、値を保持したい場合は利用側で`copy()`または`clone()`を行う。
- ブラシ描画などで pointermove の負荷が問題になった場合は、Raycast 処理を animate() 側へ移すことを検討する。
- アプリの配布前に、Electronのrendererへ制限的なContent Security Policy（CSP）を設定する。開発環境で確認された `Insecure Content-Security-Policy` 警告を非表示にするだけの対応は行わず、electron-viteの開発環境・ビルド環境・パッケージ版で既存機能への影響を確認する。具体的な変更対象とCSPの内容は実装時に調査して確定する。
- 高解像度保存では、低解像度の作業用Canvasを単純拡大せず、UV座標または解像度非依存のストローク情報を保存用Canvasへ再描画する設計を検討する。
- 高解像度JPEGの生成時に、renderer、IPC、mainで画像データが複製されることによるピークメモリを確認し、必要になった段階で転送方法または保存Engineの構成を見直す。

## 設計レビュー記録

### フェーズ2-6レビュー

- Pointer関連の専用モジュール化は、UV→Canvas変換やブラシ処理の導入時に検討する。
- currentUv は共有 Vector2 を参照するため、保持が必要な場合は利用側でコピーする。
- currentUv の利用開始後は `void currentUv` を削除する。
- pointermove と Raycast の処理分離は、描画負荷が問題になった段階で検討する。

### フェーズ2-11レビュー

- 作業中の描画Canvasは1920×960を使用する。
- 高速なpointermoveで残る軽い描画遅延と曲線のカクつきは、`getCoalescedEvents()`、中点補間、`quadraticCurveTo()`、距離補間を候補として別フェーズで調査する。
- Texture更新頻度制限、dirtyフラグ、ホイールズーム感度調整は、必要性を確認したうえで個別に扱う。
- 高品質保存は作業用Canvasの単純拡大ではなく、UV座標または解像度非依存のストローク情報を保存用Canvasへ再描画する設計を検討する。

### フェーズ2-12事前調査

- 現在の1920×960描画Canvasを対象とする限定的な360度JPEG保存基盤として扱う。
- JPEG生成はrenderer、保存専用APIの公開はpreload、入力検証・GPano XMP埋め込み・保存ダイアログ・非同期ファイル書き込みはmainが担当する方針とする。
- raw `ipcRenderer`は公開せず、保存用途に限定したAPIを使用する。
- 初期実装では外部ライブラリを追加せず、アプリ自身が生成したJPEGへ標準XMP APP1を埋め込む方法を候補とする。
- Facebook独自の360度判定条件、初期視点、左右・上下方向、継ぎ目位置は、実装後の手動投稿で確認する。
