import { db } from '../db';
import { notifications, users, type InsertNotification, type Notification } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

export interface NotificationPayload {
  userId?: string;
  type: 'push' | 'email' | 'sms' | 'in_app';
  category: 'points' | 'rewards' | 'promotions' | 'system';
  title: string;
  message: string;
  data?: any;
  scheduledFor?: Date;
}

export class NotificationService {
  
  // Create a notification
  async createNotification(payload: NotificationPayload): Promise<string> {
    const [notification] = await db
      .insert(notifications)
      .values({
        ...payload,
        status: 'pending',
        scheduledFor: payload.scheduledFor || new Date(),
      })
      .returning({ id: notifications.id });
    
    // Queue for immediate sending if not scheduled
    if (!payload.scheduledFor) {
      await this.sendNotification(notification.id);
    }
    
    return notification.id;
  }

  // Send notification based on type
  async sendNotification(notificationId: string): Promise<boolean> {
    const [notification] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, notificationId));

    if (!notification || notification.status !== 'pending') {
      return false;
    }

    try {
      let success = false;
      
      switch (notification.type) {
        case 'email':
          success = await this.sendEmail(notification);
          break;
        case 'sms':
          success = await this.sendSMS(notification);
          break;
        case 'push':
          success = await this.sendPushNotification(notification);
          break;
        case 'in_app':
          success = true; // In-app notifications are just stored
          break;
      }

      // Update notification status
      await db
        .update(notifications)
        .set({
          status: success ? 'sent' : 'failed',
          sentAt: success ? new Date() : undefined,
          errorMessage: success ? undefined : 'Failed to send notification',
        })
        .where(eq(notifications.id, notificationId));

      return success;
    } catch (error) {
      console.error('Failed to send notification:', error);
      
      await db
        .update(notifications)
        .set({
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        })
        .where(eq(notifications.id, notificationId));
      
      return false;
    }
  }

  // Send email notification
  private async sendEmail(notification: any): Promise<boolean> {
    // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
    console.log('Sending email:', {
      to: notification.channel,
      subject: notification.title,
      message: notification.message,
    });
    
    // Simulate email sending
    return new Promise(resolve => {
      setTimeout(() => resolve(true), 100);
    });
  }

  // Send SMS notification
  private async sendSMS(notification: any): Promise<boolean> {
    // TODO: Integrate with SMS gateway (Twilio, AWS SNS, etc.)
    console.log('Sending SMS:', {
      to: notification.channel,
      message: `${notification.title}: ${notification.message}`,
    });
    
    // Simulate SMS sending
    return new Promise(resolve => {
      setTimeout(() => resolve(true), 100);
    });
  }

  // Send push notification
  private async sendPushNotification(notification: any): Promise<boolean> {
    // TODO: Integrate with push service (Firebase, AWS SNS, etc.)
    console.log('Sending push notification:', {
      token: notification.channel,
      title: notification.title,
      body: notification.message,
      data: notification.data,
    });
    
    // Simulate push notification sending
    return new Promise(resolve => {
      setTimeout(() => resolve(true), 100);
    });
  }

  // Send points earned notification
  async notifyPointsEarned(userId: string, points: number, description: string): Promise<void> {
    await this.createNotification({
      userId,
      type: 'in_app',
      category: 'points',
      title: 'Points Earned!',
      message: `You earned ${points} points from ${description}`,
      data: { points, description, type: 'points_earned' },
    });

    // Also send push notification if user has enabled it
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (user?.pushNotifications) {
      await this.createNotification({
        userId,
        type: 'push',
        category: 'points',
        title: 'Points Earned!',
        message: `You earned ${points} points from ${description}`,
        data: { points, description, type: 'points_earned' },
      });
    }
  }

  // Send reward redemption notification
  async notifyRewardRedeemed(userId: string, rewardName: string, pointsSpent: number): Promise<void> {
    await this.createNotification({
      userId,
      type: 'in_app',
      category: 'rewards',
      title: 'Reward Redeemed!',
      message: `You redeemed ${rewardName} for ${pointsSpent} points`,
      data: { rewardName, pointsSpent, type: 'reward_redeemed' },
    });
  }

  // Send promotional notification
  async sendPromotion(userId: string, title: string, message: string, campaignId?: string): Promise<void> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (user?.marketingMessages) {
      await this.createNotification({
        userId,
        type: 'in_app',
        category: 'promotions',
        title,
        message,
        data: { campaignId, type: 'promotion' },
      });

      // Also send email if user has email notifications enabled
      if (user.emailNotifications) {
        await this.createNotification({
          userId,
          type: 'email',
          category: 'promotions',
          title,
          message,
          data: { campaignId, type: 'promotion' },
        });
      }
    }
  }

  // Get user notifications
  async getUserNotifications(userId: string, limit = 20): Promise<any[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(notifications.createdAt)
      .limit(limit);
  }

  // Mark notification as read
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    const result = await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId)
        )
      );

    return (result.rowCount ?? 0) > 0;
  }

  // Process scheduled notifications
  async processScheduledNotifications(): Promise<void> {
    const pendingNotifications = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.status, 'pending'),
          eq(notifications.scheduledFor, new Date())
        )
      );

    for (const notification of pendingNotifications) {
      await this.sendNotification(notification.id);
    }
  }
}

export const notificationService = new NotificationService();