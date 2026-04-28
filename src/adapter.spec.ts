import type { Mock } from 'vitest'

import { beforeEach, describe, expect, it, vi } from 'vitest'

// @ts-expect-error importation-type
import { supabaseAdapter } from './adapter'

describe('supabaseAdapter', () => {
  const config = {
    bucket: 'test-bucket',
    public: true,
    supabaseKey: 'sb_secret_test1234567890abcdefghijklmnop',
    supabaseUrl: 'https://xyz.supabase.co',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it('should generate public URLs', () => {
    const adapter = supabaseAdapter(config)({ prefix: 'uploads' })
    const url = adapter.generateURL!({ filename: 'test.jpg' })
    expect(url).toBe(
      'https://xyz.supabase.co/storage/v1/object/public/test-bucket/uploads/test.jpg',
    )
  })

  it('should handle file uploads', async () => {
    const adapter = supabaseAdapter(config)({ prefix: '' })
    const file = {
      buffer: Buffer.from('test'),
      filename: 'test.jpg',
      mimeType: 'image/jpeg',
    }

    ;(fetch as Mock).mockResolvedValue({ ok: true })

    await adapter.handleUpload({ data: {}, file })

    expect(fetch).toHaveBeenCalledWith(
      'https://xyz.supabase.co/storage/v1/object/test-bucket/test.jpg',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer sb_secret_test1234567890abcdefghijklmnop',
          'Content-Type': 'image/jpeg',
        }),
        method: 'POST',
      }),
    )
  })

  it('should redirect when disableProxy is true', async () => {
    const adapter = supabaseAdapter({ ...config, disableProxy: true })({ prefix: '' })

    const response = await adapter.staticHandler({}, { params: { filename: 'test.jpg' } })

    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toBe(
      'https://xyz.supabase.co/storage/v1/object/public/test-bucket/test.jpg',
    )
  })

  it('should apply image optimization', async () => {
    const adapter = supabaseAdapter({
      ...config,
      imageOptimization: { format: 'webp', quality: 80 },
    })({ prefix: '' })

    const response = await adapter.staticHandler({}, { params: { filename: 'test.jpg' } })

    const location = response.headers.get('Location')
    expect(location).toContain('render/image/public/test-bucket/test.jpg')
    expect(location).toContain('quality=80')
    expect(location).toContain('format=webp')
  })
})
