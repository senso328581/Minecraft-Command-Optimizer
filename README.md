# Minecraft Command Optimizer

GitHub Pages にそのまま置ける、Minecraft Java Edition / Bedrock Edition 向けのコマンド最適化・構文チェック・TAB補完ツールです。

## 主な機能

- Java Edition / Bedrock Edition の切り替え
- player mode / command block mode の切り替え
- 不要な空白の圧縮
- `execute` / `scoreboard` / selector などの構文チェック強化
- エラー位置の `...<--[HERE]...` 表示
- TAB 補完
  - root command
  - `execute` サブコマンド
  - `scoreboard` の主要枝
  - selector / selector option

## 補足

- Bedrock は `if entity@e` や `]run` のような短縮を許容する方向で最適化しています。
- Java は Bedrock より厳密に空白を要求する前提でチェックしています。
- Java 側の root command 候補は、アップロードされた `Commands.class` を参考にしています。
- このツールはかなり厳密化していますが、ゲーム本体の完全な再実装ではありません。
