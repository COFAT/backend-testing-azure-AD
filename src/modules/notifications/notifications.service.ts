import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';

export interface SendNotificationParams {
  userId: string;
  type: string;
  title: string;
  message: string;
  channel?: 'email' | 'in_app' | 'sms';
  metadata?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async send(params: SendNotificationParams) {
    const {
      userId,
      type,
      title,
      message,
      channel = 'email',
      metadata,
    } = params;

    // Create notification record
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        channel,
        metadata,
        status: 'pending',
      },
    });

    // TODO: Implement actual email/sms sending logic
    // For now, just mark as sent
    await this.prisma.notification.update({
      where: { id: notification.id },
      data: {
        sentAt: new Date(),
        status: 'sent',
      },
    });

    this.logger.log(`Notification sent: ${type} to user ${userId}`);

    return notification;
  }

  async markAsRead(notificationId: string, userId: string) {
    return this.prisma.notification.update({
      where: { id: notificationId, userId },
      data: { readAt: new Date() },
    });
  }

  async getUserNotifications(
    userId: string,
    params: { page?: number; limit?: number },
  ) {
    const { page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    return {
      data: notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
