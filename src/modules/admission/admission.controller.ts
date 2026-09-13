import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { AdmissionService } from './admission.service.js';
import { CreateAdmissionDto } from './dto/create-admission.dto.js';
import { VerifyEmailDto, ResendOtpDto } from './dto/verify-email.dto.js';
import {
  InitiateAdmissionPaymentDto,
  RejectAdmissionDto,
} from './dto/initiate-admission-payment.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { PERMISSIONS } from '../../common/constants/permissions.constant.js';
import { ApplicationStatus } from '../../generated/prisma/client.js';
import { UserPayload } from '../auth/dto/auth-response.dto.js';

@Controller('admission')
export class AdmissionController {
  constructor(private readonly admissionService: AdmissionService) {}

  /**
   * STEP 1: Public Form Fill-Up & Photo File Upload
   */
  @Public()
  @Post('apply')
  @UseInterceptors(FileInterceptor('photo'))
  @ResponseMessage('Admission application submitted successfully')
  async apply(
    @Body() dto: CreateAdmissionDto,
    @UploadedFile() photo?: { buffer: Buffer; mimetype?: string },
  ) {
    return this.admissionService.apply(dto, photo);
  }

  /**
   * STEP 2: Email Verification via 6-digit OTP
   */
  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Email verified successfully')
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.admissionService.verifyEmail(dto);
  }

  /**
   * STEP 2 (Optional): Resend Verification OTP
   */
  @Public()
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('OTP resent successfully')
  async resendOtp(@Body() dto: ResendOtpDto) {
    return this.admissionService.resendOtp(dto);
  }

  /**
   * STEP 3: Payment Initiation (SSLCommerz / bKash)
   */
  @Public()
  @Post('payment/initiate')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Payment session initiated successfully')
  async initiatePayment(@Body() dto: InitiateAdmissionPaymentDto) {
    return this.admissionService.initiatePayment(dto);
  }

  /**
   * STEP 4: Download Admission & Fee Receipt (by email or applicationNo)
   */
  @Public()
  @Get('receipt/:identifier')
  @ResponseMessage('Admission receipt retrieved successfully')
  async getReceipt(@Param('identifier') identifier: string) {
    return this.admissionService.getReceipt(identifier);
  }

  /**
   * Public Check Application Status (by email or applicationNo)
   */
  @Public()
  @Get('status/:identifier')
  @ResponseMessage('Application status retrieved successfully')
  async getStatus(@Param('identifier') identifier: string) {
    return this.admissionService.getApplicationByIdentifier(identifier);
  }

  // =========================================================================
  // ADMIN WORKFLOW (MANAGEMENT, VIEW, ACCEPT, REJECT)
  // =========================================================================

  /**
   * Admin: List All Applications
   */
  @RequirePermissions(PERMISSIONS.ADMISSIONS_READ)
  @Get('admin/applications')
  @ResponseMessage('Admission applications retrieved successfully')
  async adminFindAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: ApplicationStatus,
  ) {
    return this.admissionService.adminFindAllApplications(
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
      search,
      status,
    );
  }

  /**
   * Admin: View Single Application Details & Payment Record
   */
  @RequirePermissions(PERMISSIONS.ADMISSIONS_READ)
  @Get('admin/applications/:id')
  @ResponseMessage('Admission application details retrieved successfully')
  async adminFindOne(@Param('id') id: string) {
    return this.admissionService.adminFindOneApplication(id);
  }

  /**
   * Admin: Accept & Admit Candidate
   * Automatically provisions User account (with applicant password), Student record, Guardians, and Address
   */
  @RequirePermissions(PERMISSIONS.ADMISSIONS_UPDATE)
  @Patch('admin/applications/:id/accept')
  @ResponseMessage('Student application accepted and enrolled successfully')
  async adminAccept(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as UserPayload | undefined;
    const adminUserId = user?.id || 'admin';
    return this.admissionService.adminAcceptApplication(id, adminUserId);
  }

  /**
   * Admin: Reject Application
   */
  @RequirePermissions(PERMISSIONS.ADMISSIONS_UPDATE)
  @Patch('admin/applications/:id/reject')
  @ResponseMessage('Student application rejected successfully')
  async adminReject(
    @Param('id') id: string,
    @Body() dto: RejectAdmissionDto,
    @Req() req: Request,
  ) {
    const user = req.user as UserPayload | undefined;
    const adminUserId = user?.id || 'admin';
    return this.admissionService.adminRejectApplication(id, dto, adminUserId);
  }
}
