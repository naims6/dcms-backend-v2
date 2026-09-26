import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import {
  BloodGroup,
  Gender,
  Religion,
} from '../../../generated/prisma/client.js';

export class CreateAdmissionDto {
  // Security / Credentials
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password!: string;

  // Personal Details
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsString()
  @IsNotEmpty()
  dateOfBirth!: string; // ISO date string e.g. "2008-05-15"

  @IsEnum(Gender)
  @IsNotEmpty()
  gender!: Gender;

  @IsEnum(BloodGroup)
  @IsOptional()
  bloodGroup?: BloodGroup;

  @IsEnum(Religion)
  @IsOptional()
  religion?: Religion;

  @IsString()
  @IsOptional()
  nationality?: string = 'Bangladeshi';

  @IsString()
  @IsOptional()
  nationalIdOrBirthReg?: string;

  // Parents Info
  @IsString()
  @IsNotEmpty()
  fatherName!: string;

  @IsString()
  @IsOptional()
  fatherPhone?: string;

  @IsString()
  @IsOptional()
  fatherOccupation?: string;

  @IsString()
  @IsOptional()
  fatherNid?: string;

  @IsString()
  @IsNotEmpty()
  motherName!: string;

  @IsString()
  @IsOptional()
  motherPhone?: string;

  @IsString()
  @IsOptional()
  motherOccupation?: string;

  @IsString()
  @IsOptional()
  motherNid?: string;

  // Local Guardian Info
  @IsString()
  @IsOptional()
  localGuardianName?: string;

  @IsString()
  @IsOptional()
  localGuardianPhone?: string;

  @IsString()
  @IsOptional()
  localGuardianRelation?: string;

  @IsString()
  @IsOptional()
  localGuardianAddress?: string;

  // Present Address
  @IsString()
  @IsNotEmpty()
  presentStreetAddress!: string;

  @IsString()
  @IsNotEmpty()
  presentUpazila!: string;

  @IsString()
  @IsNotEmpty()
  presentDistrict!: string;

  @IsString()
  @IsNotEmpty()
  presentDivision!: string;

  @IsString()
  @IsOptional()
  presentPostCode?: string;

  // Permanent Address
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  sameAsPresentAddress?: boolean = true;

  @IsString()
  @IsOptional()
  permanentStreetAddress?: string;

  @IsString()
  @IsOptional()
  permanentUpazila?: string;

  @IsString()
  @IsOptional()
  permanentDistrict?: string;

  @IsString()
  @IsOptional()
  permanentDivision?: string;

  @IsString()
  @IsOptional()
  permanentPostCode?: string;

  // Academic Info
  @IsString()
  @IsNotEmpty()
  targetClassId!: string;

  @IsString()
  @IsOptional()
  previousSchoolName?: string;

  @IsString()
  @IsOptional()
  previousClass?: string;

  @IsString()
  @IsOptional()
  previousGpa?: string;

  @IsString()
  @IsOptional()
  previousBoardRoll?: string;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  previousPassingYear?: number;
}
