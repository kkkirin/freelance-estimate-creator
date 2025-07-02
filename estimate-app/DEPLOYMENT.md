# デプロイメントガイド

## Vercelでのデプロイ手順

### 1. Supabaseプロジェクトの準備

1. [Supabase](https://supabase.com)でプロジェクトを作成
2. SQL Editorで以下のマイグレーションを順番に実行：
   ```sql
   -- 1. 基本スキーマとシステムテンプレート
   -- supabase/migrations/001_initial_schema.sql の内容をコピー&実行
   
   -- 2. 共有トークンの修正
   -- supabase/migrations/002_fix_share_tokens.sql の内容をコピー&実行
   ```

3. Authentication設定：
   - Authentication > Providers > Email を有効化
   - Authentication > URL Configuration で以下を設定：
     - Site URL: `https://your-app-name.vercel.app`
     - Redirect URLs: `https://your-app-name.vercel.app/auth/callback`

### 2. Vercelプロジェクトの作成

1. [Vercel](https://vercel.com)でGitHubリポジトリをインポート
2. Framework Preset: **Next.js** を選択
3. Root Directory: デフォルト（空白）のまま

### 3. 環境変数の設定

Vercelのプロジェクト設定 > Environment Variables で以下を設定：

```
NEXT_PUBLIC_SUPABASE_URL = https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY = your-supabase-service-role-key
```

### 4. デプロイ実行

1. 「Deploy」ボタンをクリック
2. ビルドが完了するまで待機
3. デプロイされたURLにアクセスして動作確認

### 5. Supabase認証設定の更新

1. デプロイ完了後、実際のURLを確認
2. Supabase > Authentication > URL Configuration を更新：
   - Site URL: `https://your-actual-vercel-url.vercel.app`
   - Redirect URLs: `https://your-actual-vercel-url.vercel.app/auth/callback`

## トラブルシューティング

### ビルドエラー

**TypeScriptエラー**
- `next.config.js`で型チェックを無効化済み
- 開発時にエラーがある場合は事前に修正

**環境変数エラー**
- Vercelの環境変数設定を確認
- 本番・プレビュー・開発すべての環境で設定

### 認証エラー

**Magic Linkが届かない**
- Supabaseの認証設定を確認
- 迷惑メールフォルダも確認

**リダイレクトエラー**
- Site URLとRedirect URLsが正しく設定されているか確認
- HTTPSを使用しているか確認

### データベースエラー

**RLSエラー**
- マイグレーションが正しく実行されているか確認
- システムテンプレートが作成されているか確認

## その他のプラットフォーム

### Netlify
1. `netlify.toml`ファイルを作成
2. 環境変数を設定
3. ビルドコマンド: `npm run build`
4. パブリッシュディレクトリ: `.next`

### Railway
1. GitHubリポジトリを接続
2. 環境変数を設定
3. 自動デプロイが開始

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```