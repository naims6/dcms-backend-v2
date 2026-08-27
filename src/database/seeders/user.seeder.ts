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
      className: '10-A',
      rollNumber: 1,
    },
  },
];

export async function seedUsers(prisma: PrismaClient) {
  console.log('Seeding users...');

  for (const userData of users) {
    const { role: roleName, teacher, student, ...data } = userData;

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
      await prisma.student.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          studentId: student.studentId,
          gender: student.gender,
          className: student.className,
          rollNumber: student.rollNumber,
        },
      });
    }
  }

  console.log(`Seeded ${users.length} users`);
}
