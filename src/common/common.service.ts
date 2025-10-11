import { Institution, Resident, Room, User, UserToken } from '@prisma/client'
import { TokenType } from '~/constants/token_type'
import { prisma } from '~/utils/db'

class CommonService {

  checkEmailExist = (email: string): Promise<User | null> => {
    return prisma.user.findUnique({ where: { email } })
  }

  getUserById = (user_id: string): Promise<User | null> => {
    return prisma.user.findUnique({ where: { user_id } })
  }

  getUserToken = ({ user_id, token_type }: { user_id: string; token_type: TokenType }): Promise<UserToken> => {
    return prisma.userToken.findFirstOrThrow({
      where: { user_id, token_type }
    })
  }

  getUserTokenByTokenString = ({ token_string }: { token_string: string }): Promise<UserToken | null> => {
    return prisma.userToken.findUnique({
      where: { token_string }
    })
  }

  getInstitutionById = (institution_id: string): Promise<Institution | null> => {
    return prisma.institution.findUnique({ where: { institution_id } })
  }

  getResidentById = (resident_id: string): Promise<Resident | null> => {
    return prisma.resident.findUnique({ where: { resident_id } })
  }

  getRoomById = (room_id: string): Promise<Room | null> => {
    return prisma.room.findUnique({ where: { room_id } })
  }
}

const commonService = new CommonService()
export { commonService, CommonService }
