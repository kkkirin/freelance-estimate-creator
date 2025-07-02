# 見積もり作成アプリ v1.0.0

フリーランス映像制作者向けの見積もり作成・共有アプリです。

## 🎥 デモ・スクリーンショット

> **注意**: このアプリを実際に試す場合は、適切なSupabaseプロジェクトのセットアップが必要です。

## 機能

### 🎯 コア機能
- **見積もり作成**: 作業項目・時間・単価を入力してリアルタイムで金額計算
- **共有URL**: 見積もりを固有URLで簡単共有
- **Revision Policy**: 修正回数上限と追加費用を事前明示
- **修正回数管理**: 使用済み修正回数をワンクリックで追跡

### 🛠️ 管理機能
- **テンプレート管理**: MV・CM・企業VPなどの制作タイプ別テンプレート
- **認証システム**: Magic Link による安全でシンプルなログイン
- **ダッシュボード**: 全見積もりの一覧管理

### 📱 ユーザビリティ
- **レスポンシブデザイン**: PC・スマートフォン対応
- **PDF出力**: 共有ページから直接PDF保存可能
- **リアルタイム計算**: 入力と同時に金額更新

## 技術スタック

- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Deploy**: Vercel対応
- **認証**: Magic Link (Supabase Auth)

## セットアップ

### 前提条件
- Node.js 18以上
- npm または yarn
- Supabaseアカウント

### 1. 依存関係のインストール

```bash
npm install
```

### 2. Supabaseプロジェクトの設定

1. [Supabase](https://supabase.com)でプロジェクトを作成
2. SQL Editorで `supabase/migrations/001_initial_schema.sql` を実行
   - このスクリプトにより、システムテンプレート（MV、CM、企業VP）が自動的に作成されます
3. プロジェクトのURL・API keyを取得

### 3. 環境変数の設定

`.env.local` ファイルを更新:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3001 でアプリにアクセスできます。

## データベース構造

```
users
├── id (UUID, Primary Key)
├── email (Text, Unique)
├── created_at (Timestamp)
└── updated_at (Timestamp)

templates
├── id (UUID, Primary Key)
├── user_id (UUID, Foreign Key)
├── name (Text)
├── default_hourly_rate (Integer)
├── default_revision_limit (Integer)
├── default_extra_revision_rate (Integer)
├── created_at (Timestamp)
└── updated_at (Timestamp)

estimates
├── id (UUID, Primary Key)
├── user_id (UUID, Foreign Key)
├── template_id (UUID, Foreign Key, Nullable)
├── title (Text)
├── subtotal (Integer)
├── total (Integer)
├── revision_limit (Integer)
├── extra_revision_rate (Integer)
├── revisions_used (Integer)
├── share_token (Text, Unique)
├── created_at (Timestamp)
└── updated_at (Timestamp)

line_items
├── id (UUID, Primary Key)
├── estimate_id (UUID, Foreign Key)
├── name (Text)
├── hours (Decimal)
├── hourly_rate (Integer)
├── memo (Text, Nullable)
├── amount (Integer)
├── order_index (Integer)
├── created_at (Timestamp)
└── updated_at (Timestamp)

revision_logs
├── id (UUID, Primary Key)
├── estimate_id (UUID, Foreign Key)
├── used_number (Integer)
├── memo (Text, Nullable)
└── created_at (Timestamp)
```

## 使用方法

### 1. ログイン
1. メールアドレスを入力
2. 送信されたMagic Linkをクリック

### 2. テンプレート作成
1. ダッシュボードで「テンプレート管理」をクリック
2. 制作タイプ（MV・CM・企業VPなど）のデフォルト設定を登録

### 3. 見積もり作成
1. 「新しい見積もりを作成」をクリック
2. テンプレート選択（任意）
3. 作業項目・時間・単価を入力
4. Revision Policyを設定

### 4. 見積もり共有
1. 作成完了時に生成される共有URLをクライアントに送信
2. クライアントはログイン不要で閲覧・PDF保存可能

### 5. 修正回数管理
1. 見積もり編集画面で「修正回数を消化」ボタンをクリック
2. 残り回数が自動更新
3. 上限到達時は追加費用表示

## セキュリティ

- **Row Level Security**: Supabase RLSでユーザー別データアクセス制御
- **共有URL**: 推測困難な12文字以上のランダムトークン
- **認証**: Magic Linkによるパスワードレス認証

## デプロイ

### Vercel (推奨)

1. GitHubリポジトリにプッシュ
2. Vercelでプロジェクトをインポート
3. 環境変数を設定
4. デプロイ実行

### その他のプラットフォーム

このプロジェクトは標準的なNext.jsアプリケーションなので、Netlify、Railway、Dockerなど様々な環境にデプロイ可能です。

## 今後の拡張予定

- [ ] PDF出力機能の改善
- [ ] Notion API連携
- [ ] Google Drive API連携
- [ ] 請求書機能
- [ ] 多通貨対応
- [ ] チーム機能

## トラブルシューティング

### よくある問題

**外部キー制約エラー（foreign key constraint violates）**
```
ERROR: insert or update on table "templates" violates foreign key constraint
```

**解決方法**: 
最新の `supabase/migrations/001_initial_schema.sql` を使用してください。このファイルでは、システムテンプレートを別テーブル（system_templates）で管理し、外部キー制約の問題を回避しています。

**環境変数エラー**
```
TypeError: Invalid URL
```

**解決方法**: 
`.env.local` ファイルに正しいSupabase URLとAPIキーが設定されていることを確認してください。

**ビルドエラー**
プロダクションビルド時は `next.config.js` で型チェックとESLintを無効化しているため、開発時に型エラーがある場合は修正してください。

## ライセンス

MIT License

## サポート

質問やバグ報告は GitHub Issues でお願いします。
