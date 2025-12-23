import { NextFunction, Request, Response } from 'express'
import { getNameIgnoreExtension } from '~/utils/ultils'
import fs from 'fs'
import { prisma } from '~/utils/db'
import { VideoEncodeStatus } from './video.encode.schema'
import { encodeHLSWithMultipleVideoStreams } from '~/utils/video'
import { handleUploadImage } from '~/utils/file'
import path from 'path'
import { UPLOAD_IMAGES_DIR } from '~/constants/dir'
import sharp from 'sharp'
import { isDevelopment } from '~/utils/config'
import { MediaType } from '@prisma/client'

// -----------------------------
// Queue xử lý encode
// -----------------------------
class EncodeQueue {
  private items: string[] = []
  private isEncoding = false

  async enqueue(videoPath: string) {
    this.items.push(videoPath)
    const video_id = getNameIgnoreExtension(videoPath.split('/').pop()!)
    await prisma.videoEncode.create({ data: { video_id, status: VideoEncodeStatus.Pending } })
    this.processEncode()
  }

  private async processEncode() {
    if (this.isEncoding || this.items.length === 0) return
    this.isEncoding = true

    const videoItem = this.items.shift()!
    const video_id = getNameIgnoreExtension(videoItem.split('/').pop()!)

    try {
      await prisma.videoEncode.update({
        where: { video_id },
        data: { status: VideoEncodeStatus.Processing }
      })

      await encodeHLSWithMultipleVideoStreams(videoItem)
      fs.unlink(videoItem, () => {})
      await prisma.videoEncode.update({
        where: { video_id },
        data: { status: VideoEncodeStatus.Success }
      })
    } catch (err) {
      await prisma.videoEncode.update({
        where: { video_id },
        data: { status: VideoEncodeStatus.Failed, message: (err as Error).message }
      })
    }

    this.isEncoding = false
    this.processEncode()
  }
}

// -----------------------------
// MediaService chính
// -----------------------------
class MediaService {
  private queue = new EncodeQueue()

  async uploadImage(req: Request, res: Response, next: NextFunction) {
    const files = await handleUploadImage(req, res, next)
    const data = await Promise.all(
      files.map(async (file) => {
        const newName = getNameIgnoreExtension(file.newFilename)
        const newPath = path.resolve(UPLOAD_IMAGES_DIR, `${newName}.jpg`)
        await sharp(file.filepath).jpeg().toFile(newPath)
        fs.unlinkSync(file.filepath)

        // Lấy host từ request hoặc từ env
        const protocol = req.protocol || 'http'
        const host = req.get('host') || `localhost:${process.env.PORT || 3000}`
        const baseUrl = `${protocol}://${host}`
        const imageUrl = `${baseUrl}/api/media/static/images/${newName}.jpg`

        console.log('Uploaded image URL:', imageUrl, 'File saved to:', newPath)

        return {
          url: imageUrl,
          type: MediaType.image
        }
      })
    )
    return data
  }

  async uploadVideo(req: Request, res: Response, next: NextFunction) {
    const files = await handleUploadImage(req, res, next)
    return files.map((file) => ({
      url: isDevelopment()
        ? `http://localhost:${process.env.PORT}/static/videos/${file.newFilename}`
        : `${process.env.HOST}/static/videos/${file.newFilename}`,
      type: MediaType.video
    }))
  }

  async uploadVideoHLS(req: Request, res: Response, next: NextFunction) {
    const files = await handleUploadImage(req, res, next)
    return Promise.all(
      files.map(async (file) => {
        await this.queue.enqueue(file.filepath)
        const newFilename = getNameIgnoreExtension(file.newFilename)
        return {
          url: isDevelopment()
            ? `http://localhost:${process.env.PORT}/static/video-hls/${newFilename}/master.m3u8`
            : `${process.env.HOST}/static/video-hls/${newFilename}/master.m3u8`,
          type: MediaType.hls
        }
      })
    )
  }

  async getVideoEncodesStatus(id: string) {
    return prisma.videoEncode.findUnique({ where: { video_id: id } })
  }
}

const mediaService = new MediaService()
export { mediaService, MediaService }
