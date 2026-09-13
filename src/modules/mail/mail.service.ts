import { Inject, Injectable, Logger } from '@nestjs/common';
import { EMAIL_PROVIDER_TOKEN } from './interfaces/email-provider.interface.js';
import type {
  EmailProvider,
  SendEmailOptions,
} from './interfaces/email-provider.interface.js';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    @Inject(EMAIL_PROVIDER_TOKEN)
    private readonly emailProvider: EmailProvider,
  ) {}

  /**
   * Generic method to send any email
   */
  async sendEmail(options: SendEmailOptions): Promise<void> {
    try {
      await this.emailProvider.sendEmail(options);
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${options.to}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Send notification when an Admin creates a new user account
   */
  async sendUserCreatedEmail(user: {
    email: string;
    firstName?: string;
    lastName?: string;
  }): Promise<void> {
    const name =
      [user.firstName, user.lastName].filter(Boolean).join(' ') || 'User';
    const subject = 'Welcome to DCMS — Your Account Has Been Created';
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #4F46E5;">Welcome to DCMS, ${name}!</h2>
        <p>Your user account has been successfully created by an administrator.</p>
        <p>You can now log in to your dashboard using your email: <strong>${user.email}</strong></p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #777;">If you have any questions, please contact your system administrator.</p>
      </div>
    `;

    await this.sendEmail({
      to: user.email,
      subject,
      html,
    });
  }

  /**
   * Send OTP Email for Admission Application Email Verification
   */
  async sendAdmissionOtpEmail(params: {
    email: string;
    name?: string;
    otp: string;
    applicationNo: string;
  }): Promise<void> {
    const applicantName = params.name || 'Applicant';
    const subject = `DCMS Admission Verification OTP - ${params.applicationNo}`;
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #4F46E5; margin-top: 0;">Admission Email Verification</h2>
        <p>Dear <strong>${applicantName}</strong>,</p>
        <p>Thank you for applying for admission (Application No: <strong>${params.applicationNo}</strong>).</p>
        <p>Please use the following 6-digit Verification OTP code to verify your email address:</p>
        <div style="background-color: #F3F4F6; padding: 15px; text-align: center; border-radius: 6px; margin: 20px 0;">
          <span style="font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #1F2937;">${params.otp}</span>
        </div>
        <p style="font-size: 13px; color: #6B7280;">This OTP code is valid for <strong>10 minutes</strong>. Please do not share this OTP with anyone.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #9CA3AF; text-align: center;">Digital Class Management System (DCMS)</p>
      </div>
    `;

    await this.sendEmail({
      to: params.email,
      subject,
      html,
    });
  }

  /**
   * Send notification when Admission is ACCEPTED / APPROVED by Admin
   */
  async sendAdmissionAcceptedEmail(params: {
    email: string;
    name: string;
    studentId: string;
    applicationNo: string;
  }): Promise<void> {
    const subject = `Congratulations! Admission Approved - ${params.applicationNo}`;
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #10B981; margin-top: 0;">Admission Application Approved! 🎉</h2>
        <p>Dear <strong>${params.name}</strong>,</p>
        <p>We are delighted to inform you that your admission application (<strong>${params.applicationNo}</strong>) has been officially approved by the administration!</p>
        <div style="background-color: #ECFDF5; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid #A7F3D0;">
          <p style="margin: 0 0 8px 0; color: #065F46;"><strong>Assigned Student ID:</strong> ${params.studentId}</p>
          <p style="margin: 0; color: #065F46;"><strong>Login Email:</strong> ${params.email}</p>
        </div>
        <p>Your student account has been created. You can now log into the Student Portal using your email address and the password you provided during application form fill-up.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #9CA3AF; text-align: center;">Digital Class Management System (DCMS)</p>
      </div>
    `;

    await this.sendEmail({
      to: params.email,
      subject,
      html,
    });
  }

  /**
   * Send notification when Admission is REJECTED by Admin
   */
  async sendAdmissionRejectedEmail(params: {
    email: string;
    name: string;
    applicationNo: string;
    reason: string;
  }): Promise<void> {
    const subject = `Admission Application Status Update - ${params.applicationNo}`;
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #EF4444; margin-top: 0;">Admission Application Status Update</h2>
        <p>Dear <strong>${params.name}</strong>,</p>
        <p>Thank you for your interest and for submitting your application (<strong>${params.applicationNo}</strong>).</p>
        <p>After reviewing your application, we regret to inform you that your admission application could not be approved at this time.</p>
        <div style="background-color: #FEF2F2; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid #FCA5A5;">
          <p style="margin: 0; color: #991B1B;"><strong>Reason:</strong> ${params.reason}</p>
        </div>
        <p>If you have any questions or require further clarification, please contact the institution office.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #9CA3AF; text-align: center;">Digital Class Management System (DCMS)</p>
      </div>
    `;

    await this.sendEmail({
      to: params.email,
      subject,
      html,
    });
  }
}
