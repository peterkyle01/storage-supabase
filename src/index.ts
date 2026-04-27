import type {
  PluginOptions as CloudStoragePluginOptions,
  CollectionOptions,
} from '@payloadcms/plugin-cloud-storage/types'
import type { Config, Plugin, UploadCollectionSlug } from 'payload'

import { cloudStoragePlugin } from '@payloadcms/plugin-cloud-storage'

import { supabaseAdapter } from './adapter.js'

export interface SupabaseStorageOptions {
  /** Supabase bucket name */
  bucket: string
  /** Map of collection slugs to adapter options */
  collections: Partial<Record<UploadCollectionSlug, Omit<CollectionOptions, 'adapter'> | true>>
  /**
   * Redirect to Supabase URL instead of proxying through server
   * @default true
   */
  disableProxy?: boolean
  /** @default true */
  enabled?: boolean
  /** Supabase image optimization parameters */
  imageOptimization?: {
    format?: 'avif' | 'origin' | 'webp'
    quality?: number
    resize?: 'contain' | 'cover' | 'fill'
  }
  /**
   * Set to false for private buckets to generate signed URLs
   * @default true
   */
  public?: boolean
  /** Supabase service_role key */
  supabaseKey: string
  /** Supabase project URL */
  supabaseUrl: string
}

export const storageSupabase =
  (options: SupabaseStorageOptions): Plugin =>
  (incomingConfig: Config): Config => {
    const {
      bucket,
      disableProxy = true,
      enabled = true,
      imageOptimization,
      public: isPublic = true,
      supabaseKey,
      supabaseUrl,
    } = options

    if (enabled === false) {
      return incomingConfig
    }

    const adapter = supabaseAdapter({
      bucket,
      disableProxy,
      imageOptimization,
      public: isPublic,
      supabaseKey,
      supabaseUrl,
    })

    const collectionsWithAdapter: CloudStoragePluginOptions['collections'] = Object.entries(
      options.collections,
    ).reduce(
      (acc, [slug, collOptions]) => ({
        ...acc,
        [slug]: {
          ...(collOptions === true ? {} : collOptions),
          adapter,
        },
      }),
      {} as Record<string, CollectionOptions>,
    )

    const config = {
      ...incomingConfig,
      collections: (incomingConfig.collections || []).map((collection) => {
        if (!collectionsWithAdapter[collection.slug]) {
          return collection
        }

        return {
          ...collection,
          upload: {
            ...(typeof collection.upload === 'object' ? collection.upload : {}),
            disableLocalStorage: true,
          },
        }
      }),
    }

    return cloudStoragePlugin({
      collections: collectionsWithAdapter,
    })(config)
  }
