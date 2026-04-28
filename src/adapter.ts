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

  const encodePath = (path: string): string => {
    return path
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/')
  }

  // Validate that we're using the new API key format
  if (!supabaseKey?.startsWith('sb_secret_') && !supabaseKey?.startsWith('sb_publishable_')) {
    throw new Error(
      'Invalid Supabase API key. Please use the new Supabase API key format (sb_secret_... or sb_publishable_...) from your Supabase project settings. ' +
        'See: https://supabase.com/docs/guides/api/api-keys',
    )
  }

  // Determine which header format to use based on key type
  const getAuthHeaders = () => {
    if (supabaseKey?.startsWith('sb_secret_')) {
      // New secret key format uses apikey header
      return { apikey: supabaseKey }
    }
    // Fallback to Bearer for other formats
    return { Authorization: `Bearer ${supabaseKey}` }
  }

  return ({ prefix }): GeneratedAdapter => {
    const adapter: GeneratedAdapter = {
      name: 'supabase',
      handleDelete: async ({ filename }) => {
        const path = prefix ? `${prefix}/${filename}` : filename
        const encodedPath = encodePath(path)
        const response = await fetch(`${storageUrl}/object/${bucket}/${encodedPath}`, {
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
        const encodedPath = encodePath(path)

        // For sb_publishable_ keys, uploads are not allowed
        if (supabaseKey?.startsWith('sb_publishable_')) {
          throw new Error(
            'Supabase upload failed: Cannot use publishable key for uploads. ' +
              'Please use a secret key (sb_secret_...) which has write permissions to storage.',
          )
        }

        const response = await fetch(`${storageUrl}/object/${bucket}/${encodedPath}`, {
          body: file.buffer,
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            'Content-Type': file.mimeType,
            'Content-Length': String(file.buffer.length),
            'x-upsert': 'true',
          },
          method: 'POST',
        })

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unable to read response body')
          let enhancedError = `Supabase upload failed: ${response.statusText}`

          // Provide helpful error messages based on status code
          if (response.status === 400) {
            enhancedError +=
              ' (Bad Request) - Check if the bucket name is correct and the API key is valid'
          } else if (response.status === 401 || response.status === 403) {
            enhancedError +=
              " (Unauthorized) - Make sure you're using a valid secret key (sb_secret_...) with storage permissions"
          }

          if (errorText) {
            enhancedError += ` - ${errorText}`
          }

          throw new Error(enhancedError)
        }

        return data
      },
      staticHandler: (async (_req: PayloadRequest, { params: { filename } }) => {
        const path = prefix ? `${prefix}/${filename}` : filename
        const encodedPath = encodePath(path)
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
            url = `${storageUrl}/render/image/public/${bucket}/${encodedPath}${
              params.toString() ? `?${params.toString()}` : ''
            }`
          } else {
            url = `${storageUrl}/object/public/${bucket}/${encodedPath}`
          }
        } else {
          const response = await fetch(`${storageUrl}/object/sign/${bucket}/${encodedPath}`, {
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
        const encodedPath = encodePath(path)
        return `${storageUrl}/object/public/${bucket}/${encodedPath}`
      }
    }

    return adapter
  }
}
