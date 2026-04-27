# storage-supabase

Supabase Storage adapter for Payload CMS 3.0.

This adapter integrates Supabase Storage with Payload's upload system. It is designed to be lightweight, using native `fetch` instead of the AWS SDK, and supports Supabase-specific features like direct redirects and image transformations.

## Installation

```sh
npm install storage-supabase
```

## Usage

```ts
import { storageSupabase } from 'storage-supabase'
import { buildConfig } from 'payload'

export default buildConfig({
  plugins: [
    storageSupabase({
      collections: {
        media: true,
      },
      bucket: process.env.SUPABASE_BUCKET,
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_SECRET_KEY,
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
| `supabaseUrl` | `string` | **Required**. Project URL (e.g. `https://xyz.supabase.co`). |
| `supabaseKey` | `string` | **Required**. Secret Key (service_role). |
| `collections` | `object` | **Required**. Collection slugs to enable the adapter for. |
| `enabled` | `boolean` | Enable/disable the plugin. Default: `true`. |
| `public` | `boolean` | Set to `true` for public buckets. Default: `true`. |
| `disableProxy` | `boolean` | Redirect directly to Supabase CDN instead of proxying through the server. Default: `true`. |
| `imageOptimization` | `object` | Options for Supabase image transformations (`quality`, `format`, `resize`). |

## License

MIT
