import { MediaService, mediaService as mediaServiceInstance } from './media.service'
import { NextFunction, Request, Response } from 'express'
import path from 'path'
import { UPLOAD_IMAGES_DIR, UPLOAD_VIDEOS_DIR } from '~/constants/dir'
import fs from 'fs'
import { HTTP_STATUS } from '~/constants/http_status'

class MediaController {
  constructor(private readonly mediaService: MediaService = mediaServiceInstance) {}

  uploadImageController = async (req: Request, res: Response, next: NextFunction) => {
    const data = await this.mediaService.uploadImage(req, res, next)
    res.json({ message: 'Upload image success', data: data })
  }

  uploadVideoController = async (req: Request, res: Response, next: NextFunction) => {
    const data = await this.mediaService.uploadVideo(req, res, next)
    res.json({ message: 'Upload video success', data: data })
  }

  uploadVideoHLSController = async (req: Request, res: Response, next: NextFunction) => {
    const data = await this.mediaService.uploadVideoHLS(req, res, next)
    res.json({ message: 'Upload video HLS success', data: data })
  }
  // hiển thị ảnh
  serveStaticImageController = (req: Request, res: Response, next: NextFunction) => {
    const { name } = req.params
    const filePath = path.resolve(UPLOAD_IMAGES_DIR, name)
    res.sendFile(filePath, (err) => {
      if (err) {
        res.status((err as any).status).json({ message: err.message })
        return
      }
    })
  }

  getVideoEncodesStatusController = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params
    if (!id) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'File not found' })
      return
    }

    if (!fs.existsSync(path.resolve(UPLOAD_VIDEOS_DIR, id))) {
      res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'File not found' })
      return
    }

    const data = await this.mediaService.getVideoEncodesStatus(id)

    res.json({ message: 'Get video encodes status success', data: data })
  }

  serveStatic_m3u8Controller = (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params

    const filePath = path.resolve(UPLOAD_VIDEOS_DIR, id, 'master.m3u8')
    res.sendFile(filePath, (err) => {
      if (err) {
        res.status((err as any).status).json({ message: err.message })
        return
      }
    })
  }

  serveStaticSegmentController = (req: Request, res: Response, next: NextFunction) => {
    const { id, v, segment } = req.params
    const filePath = path.resolve(UPLOAD_VIDEOS_DIR, id, v, segment)
    res.sendFile(filePath, (err) => {
      if (err) {
        res.status((err as any).status).json({ message: err.message })
        return
      }
    })
  }

  // hiển thị video
  serveStaticVideoController = async (req: Request, res: Response, next: NextFunction) => {
    const mime = await import('mime')

    const { range } = req.headers
    if (!range) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'Range not found' })
    }
    const { name } = req.params

    if (!name) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'File not found' })
    }

    const videoPath = path.resolve(UPLOAD_VIDEOS_DIR, name)

    if (!fs.existsSync(videoPath)) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'File not found' })
    }

    const videoSize = fs.statSync(videoPath).size
    const chunkSize = 10 ** 6 // 1MB
    const start = Number(range.replace(/\D/g, ''))
    const end = Math.min(start + chunkSize, videoSize - 1)
    const contentLength = end - start + 1
    const contentType = mime.lookup(videoPath) || 'video/*'
    // const contentType = mime.default.getType(videoPath) || 'video/*'

    const headers = {
      'Content-Range': `bytes ${start}-${end}/${videoSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Type': contentType,
      'Content-Length': contentLength
    }
    res.writeHead(HTTP_STATUS.PARTIAL_CONTENT, headers)
    const videoStream = fs.createReadStream(videoPath, { start, end })
    videoStream.pipe(res)
  }
}
const mediaController = new MediaController()
export { mediaController, MediaController }
