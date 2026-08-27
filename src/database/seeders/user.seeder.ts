import * as bcrypt from 'bcrypt';
import { PrismaClient } from '../../generated/prisma/client.js';

const SALT_ROUNDS = 10;

const users = [
  {
    firstName: 'Super',
    lastName: 'Admin',
    email: 'admin@gmail.com',
    password: 'admin123',
    phone: '+1000000000',
    role: 'ADMIN',
    addresses: [
      {
        type: 'PERMANENT' as const,
        street: '123 Admin St',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
      },
    ],
  },
  {
    firstName: 'John',
    lastName: 'Doe',
    email: 'teacher@gmail.com',
    password: 'teacher123',
    phone: '+1000000001',
    role: 'TEACHER',
    teacher: {
      employeeId: 'EMP001',
      gender: 'MALE' as const,
    },
    addresses: [
      {
        type: 'PERMANENT' as const,
        street: '456 Teacher Ave',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400002',
        country: 'India',
      },
      {
        type: 'PREVIOUS' as const,
        street: '101 Old Teacher Ln',
        city: 'Pune',
        state: 'Maharashtra',
        postalCode: '411001',
        country: 'India',
      },
    ],
  },
  {
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'student@gmail.com',
    password: 'student123',
    phone: '+1000000002',
    role: 'STUDENT',
    student: {
      studentId: 'STU001',
      gender: 'FEMALE' as const,
      className: '10',
      rollNumber: 1,
    },
    addresses: [
      {
        type: 'PERMANENT' as const,
        street: '789 Student Rd',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400003',
        country: 'India',
      },
      {
        type: 'PREVIOUS' as const,
        street: '202 Old Student Blvd',
        city: 'Nashik',
        state: 'Maharashtra',
        postalCode: '422001',
        country: 'India',
      },
    ],
  },
];

export async function seedUsers(prisma: PrismaClient) {
  console.log('Seeding users...');

  for (const userData of users) {
    const { role: roleName, teacher, student, addresses, ...data } = userData;

    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

    const user = await prisma.user.upsert({
      where: { email: data.email },
      update: {},
      create: {
        ...data,
        password: hashedPassword,
      },
    });

    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (role) {
      await prisma.userRole.upsert({
        where: {
          userId_roleId: { userId: user.id, roleId: role.id },
        },
        update: {},
        create: { userId: user.id, roleId: role.id },
      });
    }

    if (teacher) {
      await prisma.teacher.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          employeeId: teacher.employeeId,
          gender: teacher.gender,
        },
      });
    }

    if (student) {
      const classRecord = await prisma.class.findFirst({
        where: { name: student.className },
      });

      if (!classRecord) {
        throw new Error(
          `Class "${student.className}" not found. Run class seeder first.`,
        );
      }

      await prisma.student.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          studentId: student.studentId,
          gender: student.gender,
          classId: classRecord.id,
          rollNumber: student.rollNumber,
        },
      });
    }

    if (addresses) {
      for (const addr of addresses) {
        await prisma.address.upsert({
          where: { userId_type: { userId: user.id, type: addr.type } },
          update: {},
          create: {
            userId: user.id,
            type: addr.type,
            street: addr.street,
            city: addr.city,
            state: addr.state,
            postalCode: addr.postalCode,
            country: addr.country,
          },
        });
      }
    }
  }

  console.log(`Seeded ${users.length} users`);
}
