import { HTTP_STATUS } from '~/constants/http_status'
import { ERROR_CODE } from '~/constants/message'

type ErrorWithStatusInterface = Record<
  string,
  {
    msg: string
    [key: string]: any
  }
>

export class ErrorWithStatus {
  public status: number
  public message: string
  constructor({ status, message }: { status: number; message: string }) {
    this.status = status
    this.message = message
  }
}

export class EntityError extends ErrorWithStatus {
  errors: ErrorWithStatusInterface
  constructor({
    message = ERROR_CODE.VALIDATION_ERROR,
    errors
  }: {
    message?: string
    errors: ErrorWithStatusInterface
  }) {
    // status luôn luôn là unprocessable entity - 422. Vì đây là class throw ra lỗi 422
    super({ status: HTTP_STATUS.UNPROCESSABLE_ENTITY, message })
    this.errors = errors
  }
}
