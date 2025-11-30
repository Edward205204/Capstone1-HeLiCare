import { prisma } from '~/utils/db'
import { ErrorWithStatus } from '~/models/error'
import { HTTP_STATUS } from '~/constants/http_status'
import { transporter } from '~/utils/transporter'
import { CreateNotificationReqBody } from './feedback.dto'

class NotificationService {
  // Send notification to resident/family/staff regarding feedback
  sendNotification = async (institution_id: string, notificationData: CreateNotificationReqBody): Promise<void> => {
    const { feedback_id, recipient_type, recipient_id, message, title } = notificationData

    // Verify feedback exists and belongs to institution
    const feedback = await prisma.feedback.findFirst({
      where: {
        feedback_id,
        institution_id
      },
      include: {
        family_user: {
          select: {
            email: true,
            familyProfile: {
              select: {
                full_name: true
              }
            }
          }
        },
        resident: {
          include: {
            familyResidentLinks: {
              where: {
                status: 'active'
              },
              include: {
                family_user: {
                  select: {
                    email: true,
                    familyProfile: {
                      select: {
                        full_name: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!feedback) {
      throw new ErrorWithStatus({
        message: 'Feedback not found',
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    let recipientEmails: string[] = []

    switch (recipient_type) {
      case 'family':
        // Send to family user who created the feedback
        if (feedback.family_user?.email) {
          recipientEmails.push(feedback.family_user.email)
        }
        break

      case 'resident':
        // Send to all family members linked to the resident
        if (feedback.resident?.familyResidentLinks) {
          recipientEmails = feedback.resident.familyResidentLinks
            .map((link) => link.family_user?.email)
            .filter((email): email is string => !!email)
        }
        break

      case 'staff':
        // If recipient_id is provided, send to that staff member
        if (recipient_id) {
          const staff = await prisma.user.findFirst({
            where: {
              user_id: recipient_id,
              institution_id,
              role: {
                in: ['Staff', 'Admin', 'RootAdmin']
              }
            },
            select: {
              email: true
            }
          })

          if (staff?.email) {
            recipientEmails.push(staff.email)
          }
        } else {
          // Send to all staff in the institution
          const staffMembers = await prisma.user.findMany({
            where: {
              institution_id,
              role: {
                in: ['Staff', 'Admin', 'RootAdmin']
              }
            },
            select: {
              email: true
            }
          })

          recipientEmails = staffMembers.map((s) => s.email).filter((email): email is string => !!email)
        }
        break
    }

    // Send email notifications
    if (recipientEmails.length > 0) {
      const emailPromises = recipientEmails.map((email) =>
        transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject: title,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #5985D8;">${title}</h2>
              <p>${message}</p>
              <p style="color: #666; font-size: 12px; margin-top: 20px;">
                This is an automated notification from HeLiCare system.
              </p>
            </div>
          `
        })
      )

      await Promise.allSettled(emailPromises)
    }

    // TODO: In the future, create Notification records in database when Notification model is available
    // For now, we just send emails
  }

  // Auto-send notification when feedback status is updated
  notifyFeedbackUpdate = async (feedback_id: string, institution_id: string, status: string): Promise<void> => {
    const feedback = await prisma.feedback.findFirst({
      where: {
        feedback_id,
        institution_id
      },
      include: {
        category: true,
        family_user: {
          select: {
            email: true,
            familyProfile: {
              select: {
                full_name: true
              }
            }
          }
        }
      }
    })

    if (!feedback || !feedback.family_user?.email) {
      return
    }

    const statusMessages: Record<string, { title: string; message: string }> = {
      in_progress: {
        title: 'Feedback đang được xử lý',
        message: `Feedback của bạn về "${feedback.category?.name || 'N/A'}" đang được nhân viên xử lý.`
      },
      resolved: {
        title: 'Feedback đã được giải quyết',
        message: `Feedback của bạn về "${feedback.category?.name || 'N/A'}" đã được giải quyết.`
      }
    }

    const notification = statusMessages[status]

    if (notification) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: feedback.family_user.email,
          subject: notification.title,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #5985D8;">${notification.title}</h2>
              <p>${notification.message}</p>
              <p style="color: #666; font-size: 12px; margin-top: 20px;">
                Đây là thông báo tự động từ hệ thống HeLiCare.
              </p>
            </div>
          `
        })
      } catch (error) {
        console.error('Failed to send notification email:', error)
        // Don't throw - notification failure shouldn't break the update
      }
    }
  }
}

export const notificationService = new NotificationService()
