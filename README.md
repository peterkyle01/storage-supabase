# storage-supabase

Supabase Storage adapter for Payload CMS 3.0+.

This adapter integrates Supabase Storage with Payload's upload system. It is designed to be lightweight, using native `fetch` instead of the AWS SDK, and supports Supabase-specific features like direct redirects and image transformations.

## Installation

```sh
npm install storage-supabase
```

## Setup

### 1. Get Your Supabase Credentials

Go to your Supabase Dashboard → **Settings → API** and copy:

- **Project URL**: `https://your-project.supabase.co`
- **Secret Key**: `sb_secret_...` (from the API Keys section)

> ⚠️ Use the new **Secret Key** format (`sb_secret_...`), not the legacy `service_role` key.

### 2. Set Environment Variables

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_BUCKET=your-bucket-name
SUPABASE_SECRET_KEY=sb_secret_your_secret_key_here
```

### 3. Configure the Plugin

```ts
import { storageSupabase } from 'storage-supabase'
import { buildConfig } from 'payload'

export default buildConfig({
  plugins: [
    storageSupabase({
      bucket: process.env.SUPABASE_BUCKET,
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_SECRET_KEY,
      collections: {
        media: true,
      },
      // Optional configurations
      disableProxy: true,
      imageOptimization: {
        quality: 80,
        format: 'webp',
      }
    }),
  ],
})
```

## Configuration

| Option | Type | Description |
| :--- | :--- | :--- |
| `bucket` | `string` | **Required**. Supabase bucket name. |
| `supabaseUrl` | `string` | **Required**. Supabase project URL (e.g., `https://xyz.supabase.co`) or bucket endpoint (e.g., `https://xyz.storage.supabase.co/storage/v1/s3`). Both formats are supported. |
| `supabaseKey` | `string` | **Required**. Secret API Key in the format `sb_secret_...`. Get this from your Supabase Dashboard → Settings → API → Secret Key. |
| `collections` | `object` | **Required**. Collection slugs to enable the adapter for (e.g., `{ media: true }`). |
| `enabled` | `boolean` | Enable/disable the plugin. Default: `true`. |
| `public` | `boolean` | Set to `true` for public buckets, `false` for private buckets. Default: `true`. |
| `disableProxy` | `boolean` | Redirect directly to Supabase CDN instead of proxying through the server. Default: `true`. |
| `imageOptimization` | `object` | Options for Supabase image transformations: `quality` (number), `format` ('avif', 'webp', 'origin'), `resize` ('contain', 'cover', 'fill'). |

## API Key Format

This adapter requires the **new Supabase API key format**:

- ✅ **Use**: `sb_secret_...` keys (new format)
- ❌ **Don't use**: Legacy `service_role` JWT keys

If you only see JWT-format keys in your Supabase Dashboard, your project may need to be upgraded. Contact Supabase support or create a new project to access the new key system.

## Troubleshooting

### "Invalid Supabase API key"

Make sure you're using a key starting with `sb_secret_`, not `sb_publishable_` or legacy JWT format.

### "Unsupported authorization type"

Verify you're using the correct `sb_secret_...` key and that your bucket name is correct.

### Uploads not working with private buckets

For private buckets, ensure `public: false` is set in the configuration, and that your Supabase bucket has appropriate access policies.

## License

MIT