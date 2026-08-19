# ARCHITECTURE.md

# 360doegaku Architecture

Version: 0.2.0

---

# システム構成

```

360doegaku

│

├── UI Layer

│

├── Rendering Layer

│

├── Engine Layer

│

└── Data Layer

```

---

# UI Layer

担当

Electron

TypeScript

役割

・メニュー

・ツールバー

・ウィンドウ

・設定画面

・ショートカット

・保存操作

・保存結果の通知

---

# Rendering Layer

担当

Three.js

WebGPU

役割

・球体表示

・カメラ

・GPU描画

・レンダリング

・ライティング

・作業用Canvas

・CanvasTexture

・作業用Canvasからの画像生成

---

# Engine Layer

担当

Rust

役割

・ブラシ

・画像処理

・保存

・高速演算

・並列処理

---

# Data Layer

担当

Project Engine

役割

・レイヤー

・ブラシ設定

・Undo

・Redo

・履歴管理

・保存形式

・解像度非依存のストローク情報

---

# 現在のElectron構成

現在の初期実装では、Electronの各プロセスへ次の責務を割り当てる。

## Renderer

担当

TypeScript

Three.js

Canvas 2D

役割

・ユーザー入力の受付

・RaycasterによるUV座標取得

・UV座標からCanvas座標への変換

・作業用Canvasへのブラシ描画

・CanvasTextureを通した球体内面への表示

・作業用CanvasからJPEG Blobを非同期生成

・preloadが公開する保存専用APIの呼び出し

・保存成功、キャンセル、失敗の結果表示

RendererはNode.jsのファイルAPIを直接使用しない。

Rendererは保存先パスを直接扱わない。

## Preload

担当

Electron contextBridge

TypeScript

役割

・Rendererへ保存用途に限定したAPIを公開する

・RendererとMainの間で受け渡すデータ型を定義する

・保存結果を成功、キャンセル、失敗として返す

raw `ipcRenderer`はRendererへ公開しない。

ファイルシステムなど、不要なNode.js機能は公開しない。

## Main

担当

Electron

Node.js

役割

・保存専用IPCの受付

・IPC senderと入力データの検証

・JPEGデータと画像寸法の検証

・GPano XMPメタデータの生成

・JPEG APP1セグメントへのXMP埋め込み

・保存ダイアログの表示

・JPEGファイルの非同期書き込み

・保存結果の返却

MainはRendererから受け取った値を無条件に信用しない。

保存先パスはMain内部で扱い、Rendererへ必要以上に公開しない。

---

# フェーズ2-12 360度JPEG保存基盤

## 目的

現在の1920×960作業用Canvasを、Facebookなどで360度表示を検証できるGPano XMP付きJPEGとして保存する。

この処理は現在の描画結果を検証するための限定的な保存基盤であり、Phase 7の保存機能全体を前倒しするものではない。

## 保存処理の責務

### Renderer

・現在の作業用Canvasを保存元とする

・`HTMLCanvasElement.toBlob()`を使用してJPEGを非同期生成する

・JPEG BlobをIPCで扱えるバイナリへ変換する

・保存専用APIを呼び出す

### Preload

・保存用途に限定したAPIのみをRendererへ公開する

・JPEGバイナリと保存結果の型を管理する

・MainとのIPCを仲介する

### Main

・JPEGのSOI、入力サイズ、画像寸法などを検証する

・正距円筒図法の360度画像として判定するためのGPano XMPを生成する

・既存のJPEGセグメントを破壊せず、標準XMP APP1セグメントを埋め込む

・既存XMPの有無を確認し、標準XMPを重複して追加しない

・保存ダイアログと非同期ファイル書き込みを担当する

## GPano XMP

初期実装では、アプリ自身が生成したJPEGへ必要最小限のGPano XMPを埋め込む。

主な項目

・ProjectionType

・UsePanoramaViewer

・CroppedAreaImageWidthPixels

・CroppedAreaImageHeightPixels

・FullPanoWidthPixels

・FullPanoHeightPixels

・CroppedAreaLeftPixels

・CroppedAreaTopPixels

・PoseHeadingDegrees

・InitialViewHeadingDegrees

・InitialViewPitchDegrees

・InitialViewRollDegrees

・StitchingSoftware

画像寸法に関するXMP値は固定値として埋め込まず、実際の出力寸法から生成する。

`StitchingSoftware`には`360doegaku`を設定する。

撮影ソフトウェアではないため、初期実装では`CaptureSoftware`を省略する。

Facebook独自の判定条件、初期視点、左右・上下方向、継ぎ目位置は実装後の手動投稿で確認する。

## 保存データの流れ

```

保存操作

↓

Renderer

作業用CanvasからJPEG Blobを生成

↓

Preload

保存専用APIでバイナリを受け渡す

↓

Main

JPEGと入力値を検証

↓

Main

GPano XMPを生成してAPP1へ埋め込む

↓

Main

保存ダイアログを表示

↓

Main

JPEGファイルを非同期書き込み

↓

Renderer

成功・キャンセル・失敗を表示

```

## 初期実装の対象外

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

# 将来構成

360doegaku

│

├── UI

│ ├── Toolbar

│ ├── Sidebar

│ ├── LayerPanel

│ ├── Inspector

│ └── Settings

│

├── Rendering

│ ├── Camera

│ ├── Sphere

│ ├── Canvas

│ ├── GPU

│ └── Lighting

│

├── Engine

│ ├── Brush

│ ├── Layer

│ ├── Vector

│ ├── History

│ ├── Save

│ └── Image

│

└── Data

├── Project

├── Layer

├── Brush

├── Texture

└── Preferences

---

# データの流れ

```

入力

↓

UI

↓

Brush Engine

↓

GPU

↓

Sphere Texture

↓

Renderer

↓

画面表示

```

---

# レンダリング

描画はGPUを使用する。

巨大画像を毎フレーム描画しない。

更新領域のみ描画する。

作業中の描画Canvasは1920×960を使用する。

高品質保存では、作業用Canvasを単純拡大しない。

UV座標または解像度非依存のストローク情報を、ユーザー指定解像度の保存用Canvasへ再描画する設計を検討する。

---

# 保存

初期の360度JPEG保存基盤はElectronのMainでXMP埋め込みとファイル書き込みを担当する。

JPEG生成、XMP埋め込み、ファイル書き込みの責務を分離する。

JPEG固有のXMP処理を汎用保存処理全体へ混在させない。

初期実装のMain側保存処理は、将来Engine LayerまたはRustへ置き換え可能な境界を維持する。

高解像度保存では、Renderer、IPC、Main間で画像データが複製されることによるピークメモリを確認する。

実際に問題が確認された段階で、転送方法、保存Engine、Rust処理の導入を検討する。

---

# 並列処理

GPU

リアルタイム描画

CPU

UI

保存

ファイル操作

Rust

画像処理

並列演算

保存ダイアログとファイル書き込みには非同期APIを使用する。

Mainプロセスで同期的なファイル書き込みを行わない。

---

# 設計方針

・責務を明確に分離する

・UIと描画処理を分離する

・描画エンジンを独立させる

・高速化はEngine層で行う

・保守性を最優先する

・将来の機能追加を容易にする

・必要になるまでは過度なモジュール分割を行わない

・実際にボトルネックが確認されてから最適化する

・IPCでは用途に限定したAPIだけを公開する

・RendererへNode.jsの権限やraw `ipcRenderer`を公開しない

---

# コーディング方針

TypeScript

UI

Three.js

描画

Rust

高速処理

WebGPU

GPU描画

Electron

アプリケーション

---

# 将来追加予定

・プラグインシステム

・ブラシSDK

・Python連携

・AIブラシ

・クラウド保存

・マルチユーザー編集
