import type {
  Adapter,
  GeneratedAdapter,
  StaticHandler,
} from '@payloadcms/plugin-cloud-storage/types'
import type { PayloadRequest } from 'payload'

interface Args {
  bucket: string
  disableProxy?: boolean
  imageOptimization?: {
    format?: 'avif' | 'origin' | 'webp'
    quality?: number
    resize?: 'contain' | 'cover' | 'fill'
  }
  public?: boolean
  supabaseKey: string
  supabaseUrl: string
}

export const supabaseAdapter = ({
  bucket,
  disableProxy = true,
  imageOptimization,
  public: isPublic,
  supabaseKey,
  supabaseUrl,
}: Args): Adapter => {
  const storageUrl = `${supabaseUrl}/storage/v1`

  return ({ prefix }): GeneratedAdapter => {
    const adapter: GeneratedAdapter = {
      name: 'supabase',
      handleDelete: async ({ filename }) => {
        const path = prefix ? `${prefix}/${filename}` : filename
        const response = await fetch(`${storageUrl}/object/${bucket}/${path}`, {
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
          },
          method: 'DELETE',
        })

        if (!response.ok && response.status !== 404) {
          throw new Error(`Supabase delete failed: ${response.statusText}`)
        }
      },
      handleUpload: async ({ data, file }) => {
        const path = prefix ? `${prefix}/${file.filename}` : file.filename
        const response = await fetch(`${storageUrl}/object/${bucket}/${path}`, {
          body: file.buffer,
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            'Content-Type': file.mimeType,
            'x-upsert': 'true',
          },
          method: 'POST',
        })

        if (!response.ok) {
          throw new Error(`Supabase upload failed: ${response.statusText}`)
        }

        return data
      },
      staticHandler: (async (_req: PayloadRequest, { params: { filename } }) => {
        const path = prefix ? `${prefix}/${filename}` : filename
        let url: string

        if (isPublic) {
          if (imageOptimization) {
            const params = new URLSearchParams()
            if (imageOptimization.quality) {
              params.append('quality', String(imageOptimization.quality))
            }
            if (imageOptimization.format) {
              params.append('format', imageOptimization.format)
            }
            if (imageOptimization.resize) {
              params.append('resize', imageOptimization.resize)
            }
            url = `${storageUrl}/render/image/public/${bucket}/${path}${
              params.toString() ? `?${params.toString()}` : ''
            }`
          } else {
            url = `${storageUrl}/object/public/${bucket}/${path}`
          }
        } else {
          const response = await fetch(`${storageUrl}/object/sign/${bucket}/${path}`, {
            body: JSON.stringify({ expiresIn: 3600 }),
            headers: {
              Authorization: `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            method: 'POST',
          })

          if (!response.ok) {
            return new Response('Not Found', { status: 404 })
          }

          const { signedURL } = await response.json()
          url = `${supabaseUrl}${signedURL}`
        }

        if (disableProxy) {
          return Response.redirect(url, 302)
        }

        const response = await fetch(url)
        const headers = new Headers(response.headers)

        if (response.ok) {
          headers.set('Cache-Control', 'public, max-age=31536000, immutable')
        }

        return new Response(response.body, {
          headers,
          status: response.status,
        })
      }) as StaticHandler,
    }

    if (isPublic) {
      adapter.generateURL = ({ filename }) => {
        const path = prefix ? `${prefix}/${filename}` : filename
        return `${storageUrl}/object/public/${bucket}/${path}`
      }
    }

    return adapter
  }
}
