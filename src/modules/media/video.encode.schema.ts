export enum VideoEncodeStatus {
  Pending = 'pending',
  Processing = 'processing',
  Success = 'success',
  Failed = 'failed'
}

export interface VideoEncodeType {
  video_id: string
  status: VideoEncodeStatus
  message?: string
  createdAt?: Date
  updatedAt?: Date
}
export class VideoEncode {
  video_id: string
  status: VideoEncodeStatus
  message?: string
  createdAt?: Date
  updatedAt?: Date

  constructor({ message, createdAt, status, updatedAt, video_id }: VideoEncodeType) {
    const date = new Date()
    this.video_id = video_id
    this.status = status
    this.message = message || ''
    this.createdAt = createdAt || date
    this.updatedAt = updatedAt || date
  }
}

export default VideoEncode
