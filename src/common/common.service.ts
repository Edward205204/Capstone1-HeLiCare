import { Institution, Resident, Room, User, UserToken, Visit, FamilyResidentLink } from '@prisma/client'
import { TokenType } from '~/constants/token_type'
import { prisma } from '~/utils/db'

class CommonService {
  checkEmailExist = (email: string): Promise<User | null> => {
    return prisma.user.findUnique({ where: { email } })
  }

  // Check if username exists (for resident login - username is stored in email field)
  checkUsernameExist = async (username: string): Promise<User | null> => {
    // For residents, username is stored in email field (e.g., "johndoe@resident.local")
    // We need to find by email that matches the username pattern
    const emailPattern = `${username}@resident.local`
    return prisma.user.findUnique({ 
      where: { email: emailPattern },
      include: {
        resident: {
          select: {
            resident_id: true,
            institution_id: true
          }
        }
      }
    })
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

  getVisitById = (visit_id: string): Promise<Visit | null> => {
    return prisma.visit.findUnique({ where: { visit_id } })
  }

  getFamilyResidentLink = (family_user_id: string, resident_id: string): Promise<FamilyResidentLink | null> => {
    return prisma.familyResidentLink.findUnique({
      where: {
        family_user_id_resident_id: {
          family_user_id,
          resident_id
        }
      }
    })
  }

  // Get institution IDs from family resident links
  getFamilyInstitutionIds = async (family_user_id: string): Promise<string[]> => {
    const links = await prisma.familyResidentLink.findMany({
      where: {
        family_user_id,
        status: 'active'
      },
      include: {
        resident: {
          select: {
            institution_id: true
          }
        }
      },
      distinct: ['institution_id']
    })

    return links.map((link) => link.resident.institution_id).filter((id): id is string => id !== null)
  }

  // Get first institution ID from family links (for single institution operations)
  getFamilyInstitutionId = async (family_user_id: string): Promise<string | null> => {
    const institutionIds = await this.getFamilyInstitutionIds(family_user_id)
    return institutionIds.length > 0 ? institutionIds[0] : null
  }
}

const commonService = new CommonService()
export { commonService, CommonService }
