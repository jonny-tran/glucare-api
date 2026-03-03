import * as argon2 from 'argon2';
import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// Load biến môi trường
dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing');
}
if (!process.env.EMAIL_ADMIN) {
  throw new Error('EMAIL_ADMIN is missing in .env');
}
if (!process.env.PASS_DEV) {
  throw new Error('PASS_DEV is missing in .env');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
});

const db = drizzle(pool, { schema });

async function main() {
  console.log('🌱 Starting seeding...');
  const emailAdmin = process.env.EMAIL_ADMIN;
  const hashedPassword = await argon2.hash(process.env.PASS_DEV!);
  try {
    // Clean up
    console.log('🧹 Cleaning existing data...');
    await db.delete(schema.aiUsageLogs);
    await db.delete(schema.systemConfigs);
    await db.delete(schema.knowledgeArticles);
    await db.delete(schema.categories);
    await db.delete(schema.patientDoctors);
    await db.delete(schema.doctors);
    await db.delete(schema.patients);
    await db.delete(schema.users);

    console.log('👤 Creating Admin...');
    await db.insert(schema.users).values({
      email: emailAdmin,
      password: hashedPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
    });

    console.log('Creating Doctors...');
    const docPhone1 = '0901111111';
    const docPhone2 = '0902222222';

    const [userDoc1] = await db
      .insert(schema.users)
      .values({
        phoneNumber: docPhone1,
        password: hashedPassword,
        role: 'DOCTOR',
        fullName: 'Dr. Strange',
        status: 'ACTIVE',
      })
      .returning({ id: schema.users.id });

    await db.insert(schema.doctors).values({
      userId: userDoc1.id,
      licenseNumber: 'DOC-001',
      specialization: 'Endocrinology (Nội tiết)',
      hospital: 'Bệnh viện Chợ Rẫy',
    });

    const [userDoc2] = await db
      .insert(schema.users)
      .values({
        phoneNumber: docPhone2,
        password: hashedPassword,
        role: 'DOCTOR',
        fullName: 'Dr. House',
        status: 'ACTIVE',
      })
      .returning({ id: schema.users.id });

    const [doc2Profile] = await db
      .insert(schema.doctors)
      .values({
        userId: userDoc2.id,
        licenseNumber: 'DOC-002',
        specialization: 'Nutrition (Dinh dưỡng)',
        hospital: 'Bệnh viện Đại học Y Dược',
      })
      .returning({ id: schema.doctors.id });

    console.log('Creating Patients...');
    const patPhone1 = '0983333333';
    const patPhone2 = '0984444444';
    const patPhone3 = '0985555555';

    const [userPat1] = await db
      .insert(schema.users)
      .values({
        phoneNumber: patPhone1,
        password: hashedPassword,
        role: 'PATIENT',
        fullName: 'Nguyen Van A',
        status: 'ACTIVE',
      })
      .returning({ id: schema.users.id });

    const [pat1Profile] = await db
      .insert(schema.patients)
      .values({
        userId: userPat1.id,
        gender: 'M',
        dateOfBirth: '1990-01-01',
        diabetesType: 'T2D',
      })
      .returning({ id: schema.patients.id });

    const [userPat2] = await db
      .insert(schema.users)
      .values({
        phoneNumber: patPhone2,
        password: hashedPassword,
        role: 'PATIENT',
        fullName: 'Tran Thi B',
        status: 'ACTIVE',
      })
      .returning({ id: schema.users.id });

    const [pat2Profile] = await db
      .insert(schema.patients)
      .values({
        userId: userPat2.id,
        gender: 'F',
        dateOfBirth: '1995-05-20',
        diabetesType: 'GDM',
      })
      .returning({ id: schema.patients.id });

    const [userPat3] = await db
      .insert(schema.users)
      .values({
        phoneNumber: patPhone3,
        password: hashedPassword,
        role: 'PATIENT',
        fullName: 'Le Van C',
        status: 'ACTIVE',
      })
      .returning({ id: schema.users.id });

    await db.insert(schema.patients).values({
      userId: userPat3.id,
      gender: 'M',
      dateOfBirth: '1985-12-12',
      diabetesType: 'T1D',
    });

    console.log('🔗 Linking Patients to Doctors...');

    await db.insert(schema.patientDoctors).values({
      doctorId: doc2Profile.id,
      patientId: pat1Profile.id,
      status: 'ACTIVE',
    });

    await db.insert(schema.patientDoctors).values({
      doctorId: doc2Profile.id,
      patientId: pat2Profile.id,
      status: 'PENDING',
    });

    // --- Seed System Configs (Medical Standards) ---
    console.log('⚙️ Seeding System Configs (ADA Standards)...');
    await db.insert(schema.systemConfigs).values([
      {
        key: 'GLUCOSE_SAFE_MIN',
        value: 70,
        description:
          'Ngưỡng đường huyết tối thiểu an toàn (mg/dL) theo tiêu chuẩn ADA',
      },
      {
        key: 'GLUCOSE_SAFE_MAX',
        value: 180,
        description:
          'Ngưỡng đường huyết tối đa an toàn (mg/dL) theo tiêu chuẩn ADA',
      },
    ]);

    // --- Seed Categories for Knowledge Base ---
    console.log('📚 Seeding Categories...');
    await db.insert(schema.categories).values([
      {
        name: 'Kiến thức cơ bản',
        description: 'Các bài viết cung cấp kiến thức nền tảng về tiểu đường',
      },
      {
        name: 'Dinh dưỡng',
        description: 'Chế độ ăn uống và dinh dưỡng cho bệnh nhân tiểu đường',
      },
      {
        name: 'Tập luyện',
        description: 'Hướng dẫn vận động và tập thể dục phù hợp',
      },
      {
        name: 'Thuốc & Insulin',
        description: 'Thông tin về thuốc và liệu pháp insulin',
      },
    ]);

    console.log('✅ Seeding completed successfully!');
    console.log(`🔑 Admin Email: ${emailAdmin}`);
    console.log(`🔑 Doctor Phones: ${docPhone1}, ${docPhone2}`);
    console.log(`🔑 Patient Phones: ${patPhone1}, ${patPhone2}, ${patPhone3}`);
    console.log(`🔑 Password: ${process.env.PASS_DEV}`);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await pool.end();
  }
}

void main();
