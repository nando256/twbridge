# TurboAgent (TurboWarp Bridge Plugin)

TurboAgentはTurboWarp（Scratch）プロジェクト向けのWebSocketブリッジを提供するPaperプラグインです。TurboWarpから接続し、Minecraftコマンド実行やエージェント（アーマースタンド）の召喚・テレポート・破棄などをコードブロックで扱えます。

## 特徴
- マジックリンク: `/tw`でプレイヤー専用リンクを生成し、ローカルHTTP配信のTurboWarp (`editor.html` / `turboagent.js`) とローカルWSへ自動接続
- 拡張スクリプト: `turboagent.js`と`locale/*.json`で多言語対応。起動時にブロック/スポーンエッグの候補をサーバ側で埋め込み、静的ファイルとして配信
- ブロック群: 接続/切断/状態確認/コマンド実行/エージェント召喚・移動・回転・プレイヤー方向/スロット切替・ブロックセット・スポーンエッグセット/設置 など
- ログイン時プロンプト: 権限を持つプレイヤーにマジックリンクを自動案内（クライアントロケールで英語/日本語を切替、クリック手順とAdBlock無効化ヒント付き）
- エージェント: アーマースタンドで表示され、無敵・ブロック中央に浮遊・発光、鉄/革装備と`MHF_Golem`ヘッド

## 使い方
1. Minecraftで`/tw`を実行すると、プレイヤー専用のTurboWarpリンク（WSホスト/ポート、トークン、言語が埋め込まれたもの）が表示されます。権限があればログイン時にも自動案内されます。
2. リンクをクリックするとローカルHTTPサーバー（デフォルト `http://<bind>:8788`）からTurboWarpが開き、トークンでWS（デフォルト `ws://<bind>:8787`）に接続します。
3. `turboagent`ブロックを利用してください。トークンはプレイヤーに紐づくため、他プレイヤーがなりすますことはできません。

## Dockerでの運用
付属の `docker-compose.yml` を使用して、簡単にサーバーを立ち上げることができます。
コンテナ環境では、ホストのIPアドレスを環境変数から渡すことで、マジックリンクのURLを動的に設定できます。

```yaml
    environment:
      # ホスト側のIPアドレス（またはドメイン）を指定してください
      TURBOAGENT_ADVERTISED_ADDRESS: "192.168.1.100"
```
詳細な構成については、リポジトリ内の `docker-compose.yml` を参照してください。

## ビルド
```bash
./gradlew clean build
```
生成されたJarは`build/libs/turboagent-<version>.jar`に出力されます。

## 設定
初回起動時に`src/main/resources/config.yml`が`plugins/TurboAgent/config.yml`として展開されます。主なキー:
- `ws.bindAddress`, `ws.port`: WSのバインド先。リンクにもこのホスト/ポートが埋め込まれます
- `ws.requireSession`, `ws.requirePairing`, `ws.maxMsg*`, `ws.originWhitelist`: 認証やレート制限
- `http.*`: TurboWarp静的ファイルの配信設定（デフォルト 0.0.0.0:8788）
- `magicLink.*`: トークンTTLやデフォルト言語
- `debug`: 詳細ログを有効化

## クレジット / ライセンス

本プロジェクトは **TurboWarp**（Scratchの改変版）を利用しています。
- **TurboWarp**: Copyright (c) 2020-2023 Thomas Weber (GarboMuffin). BSD-3-Clause License.
- **Scratch**: Copyright (c) 2019 Massachusetts Institute of Technology. BSD-3-Clause License.

ライセンス全文はインストール後のweb-clientディレクトリに含まれています。
