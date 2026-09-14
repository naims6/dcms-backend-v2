import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../redis/redis.service.js';
import { MailService } from '../mail/mail.service.js';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service.js';
import { PaymentService } from '../payment/payment.service.js';
import { CreateAdmissionDto } from './dto/create-admission.dto.js';
import { VerifyEmailDto, ResendOtpDto } from './dto/verify-email.dto.js';
import {
  InitiateAdmissionPaymentDto,
  RejectAdmissionDto,
} from './dto/initiate-admission-payment.dto.js';
import {
  ApplicationStatus,
  PaymentPurpose,
  PaymentStatus,
  AddressType,
  GuardianRelationship,
  UserStatus,
  StudentStatus,
  Prisma,
} from '../../generated/prisma/client.js';

@Injectable()
export class AdmissionService {
  private readonly logger = new Logger(AdmissionService.name);
  private readonly ADMISSION_FEE_AMOUNT = 100.0;
  private readonly OTP_TTL_SECONDS = 600; // 10 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly mailService: MailService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly paymentService: PaymentService,
  ) {}

  /**
   * Generates formatted unique application number: ADM-YEAR-XXXX
   */
  private async generateApplicationNo(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.admissionApplication.count();
    const sequence = (count + 1).toString().padStart(4, '0');
    return `ADM-${year}-${sequence}`;
  }

  /**
   * Generates studentId for auto-enrollment: STU-YEAR-XXXX
   */
  private async generateStudentId(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.student.count();
    const sequence = (count + 1).toString().padStart(4, '0');
    return `STU-${year}-${sequence}`;
  }

  /**
   * Step 1: Submit Application Form & Upload Photo File
   */
  async apply(
    dto: CreateAdmissionDto,
    file?: { buffer: Buffer; mimetype?: string },
  ) {
    const emailLower = dto.email.toLowerCase();

    // 1. Check existing email in admission applications or users
    const existingApp = await this.prisma.admissionApplication.findUnique({
      where: { email: emailLower },
    });

    if (existingApp) {
      throw new ConflictException(
        'An admission application with this email address already exists.',
      );
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: emailLower },
    });
    if (existingUser) {
      throw new ConflictException(
        'A registered user account with this email address already exists.',
      );
    }

    // 2. Upload Photo if file provided
    let photoUrl =
      'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg';
    let photoKey: string | undefined = undefined;

    if (file && file.buffer) {
      const uploadResult = await this.cloudinaryService.uploadImage(
        file.buffer,
        'dcms/admission/photos',
      );
      photoUrl = uploadResult.url;
      photoKey = uploadResult.key;
    }

    // 3. Hash applicant password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // 4. Generate Application Number
    const applicationNo = await this.generateApplicationNo();

    // 5. Create DB Record
    const application = await this.prisma.admissionApplication.create({
      data: {
        applicationNo,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: emailLower,
        phone: dto.phone,
        dateOfBirth: new Date(dto.dateOfBirth),
        gender: dto.gender,
        bloodGroup: dto.bloodGroup,
        religion: dto.religion,
        nationality: dto.nationality || 'Bangladeshi',
        nationalIdOrBirthReg: dto.nationalIdOrBirthReg,
        photoUrl,
        photoKey,
        fatherName: dto.fatherName,
        fatherPhone: dto.fatherPhone,
        fatherOccupation: dto.fatherOccupation,
        fatherNid: dto.fatherNid,
        motherName: dto.motherName,
        motherPhone: dto.motherPhone,
        motherOccupation: dto.motherOccupation,
        motherNid: dto.motherNid,
        localGuardianName: dto.localGuardianName,
        localGuardianPhone: dto.localGuardianPhone,
        localGuardianRelation: dto.localGuardianRelation,
        localGuardianAddress: dto.localGuardianAddress,
        presentStreetAddress: dto.presentStreetAddress,
        presentUpazila: dto.presentUpazila,
        presentDistrict: dto.presentDistrict,
        presentDivision: dto.presentDivision,
        presentPostCode: dto.presentPostCode,
        sameAsPresentAddress: dto.sameAsPresentAddress ?? true,
        permanentStreetAddress: dto.sameAsPresentAddress
          ? dto.presentStreetAddress
          : dto.permanentStreetAddress,
        permanentUpazila: dto.sameAsPresentAddress
          ? dto.presentUpazila
          : dto.permanentUpazila,
        permanentDistrict: dto.sameAsPresentAddress
          ? dto.presentDistrict
          : dto.permanentDistrict,
        permanentDivision: dto.sameAsPresentAddress
          ? dto.presentDivision
          : dto.permanentDivision,
        permanentPostCode: dto.sameAsPresentAddress
          ? dto.presentPostCode
          : dto.permanentPostCode,
        targetClassId: dto.targetClassId,
        previousSchoolName: dto.previousSchoolName,
        previousClass: dto.previousClass,
        previousGpa: dto.previousGpa,
        previousBoardRoll: dto.previousBoardRoll,
        previousPassingYear: dto.previousPassingYear
          ? Number(dto.previousPassingYear)
          : undefined,
        status: ApplicationStatus.PENDING_EMAIL_VERIFICATION,
      },
    });

    // 6. Generate 6-digit OTP & store in Redis by email
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const redisKey = `otp:admission:${application.email.toLowerCase()}`;
    await this.redisService.set(redisKey, otp, this.OTP_TTL_SECONDS);

    // 7. Send Verification Email
    void this.mailService.sendAdmissionOtpEmail({
      email: application.email,
      name: `${application.firstName} ${application.lastName}`,
      otp,
      applicationNo,
    });

    return {
      applicationNo: application.applicationNo,
      email: application.email,
      status: application.status,
      message:
        'Application form submitted successfully. Verification OTP sent to your email.',
    };
  }

  /**
   * Step 2: Email OTP Verification (using email & otp)
   */
  async verifyEmail(dto: VerifyEmailDto) {
    const emailLower = dto.email.toLowerCase();
    const application = await this.prisma.admissionApplication.findUnique({
      where: { email: emailLower },
    });

    if (!application) {
      throw new NotFoundException(
        `Admission application with email ${dto.email} not found`,
      );
    }

    if (application.isEmailVerified) {
      return {
        applicationNo: application.applicationNo,
        email: application.email,
        status: application.status,
        admissionFee: this.ADMISSION_FEE_AMOUNT,
        message: 'Email already verified.',
      };
    }

    const redisKey = `otp:admission:${emailLower}`;
    const cachedOtp = await this.redisService.get(redisKey);

    if (!cachedOtp || cachedOtp !== dto.otp) {
      throw new BadRequestException('Invalid or expired verification OTP code');
    }

    // Mark verified
    await this.prisma.admissionApplication.update({
      where: { id: application.id },
      data: {
        isEmailVerified: true,
        status: ApplicationStatus.EMAIL_VERIFIED,
      },
    });

    // Clear Redis OTP
    await this.redisService.del(redisKey);

    return {
      applicationNo: application.applicationNo,
      email: application.email,
      status: ApplicationStatus.EMAIL_VERIFIED,
      admissionFee: this.ADMISSION_FEE_AMOUNT,
      currency: 'BDT',
      message: 'Email verified successfully. Please proceed to payment step.',
    };
  }

  /**
   * Resend Verification OTP (using email)
   */
  async resendOtp(dto: ResendOtpDto) {
    const emailLower = dto.email.toLowerCase();
    const application = await this.prisma.admissionApplication.findUnique({
      where: { email: emailLower },
    });

    if (!application) {
      throw new NotFoundException(
        `Admission application with email ${dto.email} not found`,
      );
    }

    if (application.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const redisKey = `otp:admission:${emailLower}`;
    await this.redisService.set(redisKey, otp, this.OTP_TTL_SECONDS);

    void this.mailService.sendAdmissionOtpEmail({
      email: application.email,
      name: `${application.firstName} ${application.lastName}`,
      otp,
      applicationNo: application.applicationNo,
    });

    this.logger.log(`Resent OTP ${otp} for email ${emailLower}`);

    return {
      message: 'A new verification OTP has been sent to your email.',
    };
  }

  /**
   * Step 3: Initiate Payment via Decoupled Payment Module
   */
  /**
   * Step 3: Initiate Payment via Decoupled Payment Module (using email)
   */
  async initiatePayment(dto: InitiateAdmissionPaymentDto) {
    const emailLower = dto.email.toLowerCase();
    const application = await this.prisma.admissionApplication.findUnique({
      where: { email: emailLower },
    });

    if (!application) {
      throw new NotFoundException(
        `Admission application with email ${dto.email} not found`,
      );
    }

    if (!application.isEmailVerified) {
      throw new BadRequestException(
        'Please verify your email address before initiating payment.',
      );
    }

    if (
      application.status === ApplicationStatus.SUBMITTED_FOR_REVIEW ||
      application.status === ApplicationStatus.ADMITTED
    ) {
      throw new BadRequestException(
        'Payment has already been completed and application is submitted for review.',
      );
    }

    // Call Payment Module
    const paymentResult = await this.paymentService.createAndInitiate({
      purpose: PaymentPurpose.ADMISSION_FEE,
      referenceId: application.id,
      amount: this.ADMISSION_FEE_AMOUNT,
      provider: dto.provider,
      customerName: `${application.firstName} ${application.lastName}`,
      customerEmail: application.email,
      customerPhone: application.phone,
    });

    // Update application status & transaction ID
    const txn = await this.paymentService.getByTranId(paymentResult.tranId);
    await this.prisma.admissionApplication.update({
      where: { id: application.id },
      data: {
        status: ApplicationStatus.PAYMENT_PENDING,
        paymentTransactionId: txn?.id,
      },
    });

    return {
      applicationNo: application.applicationNo,
      email: application.email,
      tranId: paymentResult.tranId,
      gatewayUrl: paymentResult.gatewayUrl,
    };
  }

  /**
   * Step 4: Get Admission Fee Receipt (by email or applicationNo)
   */
  async getReceipt(identifier: string) {
    const application = await this.prisma.admissionApplication.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { applicationNo: identifier },
        ],
      },
    });

    if (!application) {
      throw new NotFoundException(
        `Admission application matching ${identifier} not found`,
      );
    }

    const paymentTxn = await this.paymentService.getByReferenceId(
      PaymentPurpose.ADMISSION_FEE,
      application.id,
    );

    if (!paymentTxn || paymentTxn.status !== PaymentStatus.VALIDATED) {
      throw new BadRequestException(
        'Payment for this admission application has not been completed. Payment is required before application review and receipt generation.',
      );
    }

    // Ensure status is marked SUBMITTED_FOR_REVIEW if payment is validated
    if (
      application.status === ApplicationStatus.PAYMENT_PENDING ||
      application.status === ApplicationStatus.EMAIL_VERIFIED
    ) {
      await this.prisma.admissionApplication.update({
        where: { id: application.id },
        data: { status: ApplicationStatus.SUBMITTED_FOR_REVIEW },
      });
    }

    return {
      receiptNo: `REC-${application.applicationNo}`,
      applicationNo: application.applicationNo,
      email: application.email,
      applicationStatus:
        application.status === ApplicationStatus.ADMITTED
          ? 'ADMITTED'
          : 'SUBMITTED_FOR_REVIEW',
      reviewStatus:
        application.status === ApplicationStatus.ADMITTED
          ? 'ADMISSION APPROVED & ENROLLED'
          : 'PAYMENT RECEIVED - UNDER REVIEW BY ADMINISTRATION',
      applicant: {
        fullName: `${application.firstName} ${application.lastName}`,
        email: application.email,
        phone: application.phone,
        fatherName: application.fatherName,
        motherName: application.motherName,
        photoUrl: application.photoUrl,
        targetClassId: application.targetClassId,
      },
      payment: {
        tranId: paymentTxn.tranId,
        bankTranId: paymentTxn.bankTranId,
        cardType: paymentTxn.cardType,
        provider: paymentTxn.provider,
        amount: Number(paymentTxn.amount),
        currency: paymentTxn.currency,
        paidAt: paymentTxn.paidAt,
        status: 'PAID & VALIDATED',
      },
      issuedAt: new Date(),
      verificationCode: `VER-${paymentTxn.tranId.slice(-8)}`,
    };
  }

  async getApplicationByIdentifier(identifier: string) {
    const application = await this.prisma.admissionApplication.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { applicationNo: identifier },
        ],
      },
      select: {
        id: true,
        applicationNo: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        photoUrl: true,
        status: true,
        isEmailVerified: true,
        createdAt: true,
      },
    });

    if (!application) {
      throw new NotFoundException(
        `Admission application matching ${identifier} not found`,
      );
    }

    return application;
  }

  // ==========================================
  // ADMIN WORKFLOW (LIST, VIEW, ACCEPT, REJECT)
  // ==========================================

  async adminFindAllApplications(
    page = 1,
    limit = 10,
    search?: string,
    status?: ApplicationStatus,
  ) {
    const skip = (page - 1) * limit;
    const where: Prisma.AdmissionApplicationWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { applicationNo: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.admissionApplication.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.admissionApplication.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async adminFindOneApplication(id: string) {
    const application = await this.prisma.admissionApplication.findUnique({
      where: { id },
    });

    if (!application) {
      throw new NotFoundException(
        `Admission Application with ID ${id} not found`,
      );
    }

    const payment = await this.paymentService.getByReferenceId(
      PaymentPurpose.ADMISSION_FEE,
      application.id,
    );

    return { application, payment };
  }

  /**
   * Admin ACCEPT / APPROVE Candidate
   * Creates User, Student, Guardian, and Address records using student password
   */
  async adminAcceptApplication(id: string, adminUserId: string) {
    const application = await this.prisma.admissionApplication.findUnique({
      where: { id },
    });

    if (!application) {
      throw new NotFoundException(`Application ID ${id} not found`);
    }

    if (application.status === ApplicationStatus.ADMITTED) {
      throw new BadRequestException(
        'This application has already been accepted & admitted.',
      );
    }

    const studentId = await this.generateStudentId();

    // Check if user role STUDENT exists
    const studentRole = await this.prisma.role.findFirst({
      where: { name: { equals: 'STUDENT', mode: 'insensitive' } },
    });

    // Execute Prisma Transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Create User Account (using student's hashed password)
      const user = await tx.user.create({
        data: {
          firstName: application.firstName,
          lastName: application.lastName,
          email: application.email,
          password: application.password,
          phone: application.phone,
          imageUrl: application.photoUrl,
          imageKey: application.photoKey,
          status: UserStatus.ACTIVE,
          userRoles: studentRole
            ? {
                create: [{ roleId: studentRole.id }],
              }
            : undefined,
        },
      });

      // 2. Create Student Record
      const student = await tx.student.create({
        data: {
          userId: user.id,
          studentId,
          dateOfBirth: application.dateOfBirth,
          gender: application.gender,
          bloodGroup: application.bloodGroup,
          religion: application.religion,
          admissionDate: new Date(),
          classId: application.targetClassId,
          status: StudentStatus.ACTIVE,
        },
      });

      // 3. Create Guardians
      if (application.fatherName) {
        await tx.guardian.create({
          data: {
            studentId: student.id,
            name: application.fatherName,
            relationship: GuardianRelationship.FATHER,
            phone: application.fatherPhone,
            occupation: application.fatherOccupation,
          },
        });
      }

      if (application.motherName) {
        await tx.guardian.create({
          data: {
            studentId: student.id,
            name: application.motherName,
            relationship: GuardianRelationship.MOTHER,
            phone: application.motherPhone,
            occupation: application.motherOccupation,
          },
        });
      }

      if (application.localGuardianName) {
        await tx.guardian.create({
          data: {
            studentId: student.id,
            name: application.localGuardianName,
            relationship: GuardianRelationship.OTHER,
            phone: application.localGuardianPhone,
            address: application.localGuardianAddress,
          },
        });
      }

      // 4. Create Addresses
      if (application.presentStreetAddress) {
        await tx.address.create({
          data: {
            userId: user.id,
            type: AddressType.PRESENT,
            street: application.presentStreetAddress,
            city: application.presentDistrict,
            state: application.presentDivision,
            postalCode: application.presentPostCode,
            country: application.nationality || 'Bangladesh',
          },
        });
      }

      if (
        application.permanentStreetAddress &&
        !application.sameAsPresentAddress
      ) {
        await tx.address.create({
          data: {
            userId: user.id,
            type: AddressType.PERMANENT,
            street: application.permanentStreetAddress,
            city: application.permanentDistrict || application.presentDistrict,
            state: application.permanentDivision || application.presentDivision,
            postalCode:
              application.permanentPostCode || application.presentPostCode,
            country: application.nationality || 'Bangladesh',
          },
        });
      }

      // 5. Update Application Status
      const updatedApp = await tx.admissionApplication.update({
        where: { id: application.id },
        data: {
          status: ApplicationStatus.ADMITTED,
          reviewedBy: adminUserId,
          reviewedAt: new Date(),
          createdStudentId: student.id,
        },
      });

      return { user, student, application: updatedApp };
    });

    this.logger.log(
      `Admission Application ${application.applicationNo} ACCEPTED. Student ID ${studentId} created.`,
    );

    void this.mailService.sendAdmissionAcceptedEmail({
      email: application.email,
      name: `${application.firstName} ${application.lastName}`,
      studentId,
      applicationNo: application.applicationNo,
    });

    return {
      message:
        'Student application accepted and student account created successfully.',
      studentId,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: `${result.user.firstName} ${result.user.lastName}`,
      },
    };
  }

  /**
   * Admin REJECT Candidate
   */
  async adminRejectApplication(
    id: string,
    dto: RejectAdmissionDto,
    adminUserId: string,
  ) {
    const application = await this.prisma.admissionApplication.findUnique({
      where: { id },
    });

    if (!application) {
      throw new NotFoundException(`Application ID ${id} not found`);
    }

    if (application.status === ApplicationStatus.ADMITTED) {
      throw new BadRequestException(
        'Cannot reject an application that has already been admitted.',
      );
    }

    const updatedApp = await this.prisma.admissionApplication.update({
      where: { id: application.id },
      data: {
        status: ApplicationStatus.REJECTED,
        rejectionReason: dto.reason,
        reviewedBy: adminUserId,
        reviewedAt: new Date(),
      },
    });

    this.logger.log(
      `Admission Application ${application.applicationNo} REJECTED. Reason: ${dto.reason}`,
    );

    void this.mailService.sendAdmissionRejectedEmail({
      email: application.email,
      name: `${application.firstName} ${application.lastName}`,
      applicationNo: application.applicationNo,
      reason: dto.reason,
    });

    return {
      message: 'Application rejected successfully.',
      applicationNo: updatedApp.applicationNo,
      status: updatedApp.status,
      rejectionReason: updatedApp.rejectionReason,
    };
  }
}
