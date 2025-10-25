# Yohaku Mobile

現在のデザインを安全にバックアップ・復元するための運用ガイドです。

## 1. GitHub バックアップ
- 初回設定は完了済み。`origin` は `https://github.com/Itakura551/yohaku4423.git`。
- 非対話プッシュ:
  ```sh
  export GITHUB_TOKEN=<repo権限のPersonal Access Token>
  REPO_URL=https://github.com/Itakura551/yohaku4423.git ./scripts/github_backup.sh
  ```
- 通常の更新:
  ```sh
  git add -A && git commit -m "update" && git push
  ```

## 2. デザインのセーブポイント（タグ）
- 作成とプッシュ（ワンコマンド）:
  ```sh
  ./scripts/create_design_tag.sh
  ```
- 手動で作成:
  ```sh
  git tag -a "design-save-$(date +%Y%m%d-%H%M%S)" -m "Design savepoint"
  git push --tags
  ```
- 戻す（閲覧用）:
  ```sh
  git checkout tags/<タグ名>
  ```
- 戻す（完全復元）:
  ```sh
  git reset --hard <タグ名>
  git push -f
  ```
  注意: 走行中のExpoは止めてから実施してください。

## 3. 自動リリース（タグ連動）
- タグをプッシュすると、GitHub Actions が自動でリリースを作成します（有効化が必要、下記参照）。
- リリースには以下のZIPが添付されます:
  - `yohaku-mobile.zip`（`mobile` ディレクトリ、`node_modules/.expo/.cache` を除外）
  - `yohaku-root.zip`（ルート一式、`.git` や `snapshots/*.tar.gz` を除外）

## 4. 大容量ファイルの扱い
- `mobile/assets/videos/kesiki.mp4` は約70MB（100MB未満なので現状OK）。
- 長期的には Git LFS を検討可能です（希望があれば設定対応します）。

## 5. スナップショット（ローカル）
- ローカルの圧縮スナップショット作成例:
  ```sh
  mkdir -p snapshots && SNAP_NAME="design-$(date +%Y%m%d-%H%M%S)" && tar -czf "snapshots/$SNAP_NAME.tar.gz" mobile
  ```
- 復元:
  ```sh
  mv mobile "mobile_backup_$(date +%Y%m%d-%H%M%S)"
  LATEST=$(ls -t snapshots/design-*.tar.gz | head -n 1)
  tar -xzf "$LATEST" -C .
  ```

## 6. Actions の有効化（ワークフロー）
- セキュリティ仕様により、Actions ワークフロー（`.github/workflows/*.yml`）を追加・更新するには、以下のいずれかが必要です:
  - クラシックPAT: `repo` に加えて `workflow` スコープを付与
  - ファイングレインPAT: 該当リポジトリに対し「Actions: Read and write」を許可
- 有効化手順:
  1) 上記スコープ/許可を満たすトークンを用意
  2) ファイルを本番配置:
     ```sh
     mv .github/release-on-tag.yml.example .github/workflows/release-on-tag.yml
     git add -A && git commit -m "ci: enable release-on-tag workflow" && git push
     ```
  3) 以降はタグをプッシュすると自動でリリースが作成されます

備考: 現状は `.github/release-on-tag.yml.example` として同梱しています。トークンの権限が整い次第、上記手順で `.github/workflows/` に移動してください。