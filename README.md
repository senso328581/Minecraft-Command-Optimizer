# Minecraft Command Optimizer

GitHub Pages にそのまま置ける、Minecraft Java Edition / Bedrock Edition 向けのコマンド最適化・構文チェック・Tab 補完ツールです。

## 主な変更点

- Java Edition / Bedrock Edition の切り替え
- player mode / command block mode の切り替え
- Bedrock の packed 構文に対応
  - `if entity@e`
  - `]run`
  - `positioned~~~`
  - `fill~~~~1~1~1`
  - `summon villager~~~`
- エラー位置の `...<--[HERE]...` 表示
- Tab 補完を Java の予測変換に寄せて改善
  - 候補は prefix 一致のみ
  - `summ` なら `summ...` で始まる候補だけを表示
  - 1 回目の Tab で灰色プレビュー
  - Tab を続けて押すと次候補へ循環
  - 文字入力やスペースで確定
  - Enter でも確定可能

## 補足

- これはゲーム本体の完全再実装ではありませんが、前の版より Bedrock の短縮構文と Java 風の補完挙動をかなり寄せています。
- Java 側の root command 候補は、アップロードされた `Commands.class` / `commands.zip` を参考にしています。
