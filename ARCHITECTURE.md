# ARCHITECTURE.md
# 360doegaku Architecture

Version: 0.1.0

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

---

# 設計方針

・責務を明確に分離する

・UIと描画処理を分離する

・描画エンジンを独立させる

・高速化はEngine層で行う

・保守性を最優先する

・将来の機能追加を容易にする

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
