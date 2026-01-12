import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { LoginAdminDto, LoginUserDto, RefreshTokenDto } from './dto/login.dto';
import { RegisterPatientDto } from './dto/register.dto';

const createErrorSchema = (
  status: number,
  exampleMessage: string | string[],
) => ({
  status,
  description: Array.isArray(exampleMessage)
    ? exampleMessage[0]
    : exampleMessage,
  schema: {
    example: {
      statusCode: status,
      message: exampleMessage,
      data: null,
    },
  },
});

const CommonAuthErrors = () =>
  applyDecorators(
    ApiResponse(
      createErrorSchema(
        HttpStatus.TOO_MANY_REQUESTS,
        'Bạn gửi quá nhiều yêu cầu liên tục, vui lòng thử lại sau ít phút',
      ),
    ),
    ApiResponse(
      createErrorSchema(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Chúng tôi hiện đang bảo trì, vui lòng thử lại sau',
      ),
    ),
  );

// 1. Docs cho API Login Admin
export const ApiLoginAdmin = () =>
  applyDecorators(
    ApiOperation({ summary: 'Đăng nhập Admin (Email & Password)' }),
    ApiBody({ type: LoginAdminDto }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Đăng nhập thành công',
      schema: {
        example: {
          statusCode: 200,
          message: 'Đăng nhập Admin thành công',
          data: {
            accessToken: 'eyJhbGciOiJIUz...',
            refreshToken: 'eyJhbGciOiJIUz...',
            userId: 'uuid-string',
            role: 'ADMIN',
          },
        },
      },
    }),
    ApiResponse(
      createErrorSchema(HttpStatus.BAD_REQUEST, 'Email không đúng định dạng'),
    ),
    ApiResponse(
      createErrorSchema(HttpStatus.UNAUTHORIZED, 'Mật khẩu không đúng'),
    ),
    ApiResponse(
      createErrorSchema(HttpStatus.NOT_FOUND, 'Tài khoản Admin không tồn tại'),
    ),
    CommonAuthErrors(),
  );

// 2. Docs cho API Login User
export const ApiLoginUser = () =>
  applyDecorators(
    ApiOperation({ summary: 'Đăng nhập User (Phone & Password)' }),
    ApiBody({ type: LoginUserDto }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Đăng nhập thành công',
      schema: {
        example: {
          statusCode: 200,
          message: 'Đăng nhập User thành công',
          data: {
            accessToken: 'eyJhbGciOiJIUz...',
            refreshToken: 'eyJhbGciOiJIUz...',
            userId: 'uuid-string',
            role: 'PATIENT', // hoặc DOCTOR
          },
        },
      },
    }),
    ApiResponse(
      createErrorSchema(HttpStatus.BAD_REQUEST, 'Số điện thoại không hợp lệ'),
    ),
    ApiResponse(
      createErrorSchema(HttpStatus.UNAUTHORIZED, 'Mật khẩu không đúng'),
    ),
    ApiResponse(
      createErrorSchema(
        HttpStatus.FORBIDDEN,
        'Vui lòng đăng nhập tại trang Admin',
      ),
    ),
    CommonAuthErrors(),
  );

// 3. Docs cho API Get Profile
export const ApiGetProfile = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Lấy thông tin Profile hiện tại' }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Lấy thông tin thành công',
      schema: {
        example: {
          statusCode: 200,
          message: 'Lấy thông tin profile thành công',
          data: {
            id: 'uuid...',
            role: 'DOCTOR',
            phoneNumber: '090...',
            profile: {
              fullName: 'Dr. Strange',
              hospital: 'Cho Ray Hospital',
            },
          },
        },
      },
    }),
    ApiResponse(
      createErrorSchema(
        HttpStatus.UNAUTHORIZED,
        'Token không hợp lệ hoặc đã hết hạn',
      ),
    ),
    CommonAuthErrors(),
  );

export const ApiRefresh = () =>
  applyDecorators(
    ApiOperation({ summary: 'Làm mới Token' }),
    ApiBody({ type: RefreshTokenDto }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Làm mới token thành công',
      schema: {
        example: {
          statusCode: 200,
          message: 'Làm mới token thành công',
          data: {
            accessToken: 'eyJhbGciOiJIUz...',
            refreshToken: 'eyJhbGciOiJIUz...',
            userId: 'uuid-string',
            role: 'PATIENT',
          },
        },
      },
    }),
    ApiResponse(
      createErrorSchema(
        HttpStatus.UNAUTHORIZED,
        'Refresh Token không hợp lệ hoặc đã hết hạn',
      ),
    ),
    CommonAuthErrors(),
  );

export const ApiLogout = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Đăng xuất' }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Đăng xuất thành công',
      schema: {
        example: {
          statusCode: 200,
          message: 'Đăng xuất thành công',
          data: null,
        },
      },
    }),
    ApiResponse(
      createErrorSchema(
        HttpStatus.UNAUTHORIZED,
        'Token không hợp lệ hoặc đã hết hạn',
      ),
    ),
    CommonAuthErrors(),
  );

export const ApiRegisterPatient = () =>
  applyDecorators(
    ApiOperation({ summary: 'Đăng ký tài khoản Bệnh nhân' }),
    ApiBody({ type: RegisterPatientDto }),
    ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Đăng ký thành công',
      schema: {
        example: {
          statusCode: 201,
          message: 'Đăng ký thành công',
          data: {
            id: 'uuid-string',
            phoneNumber: '0123456789',
            role: 'PATIENT',
            fullName: 'Nguyễn Văn A',
          },
        },
      },
    }),
    ApiResponse(
      createErrorSchema(
        HttpStatus.BAD_REQUEST,
        'Số điện thoại đã được đăng ký',
      ),
    ),
    CommonAuthErrors(),
  );

export const ApiCreateDoctor = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Tạo tài khoản Bác sĩ (Chỉ Admin)' }),
    ApiBody({ type: CreateDoctorDto }),
    ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Tạo tài khoản thành công',
      schema: {
        example: {
          statusCode: 201,
          message: 'Tạo tài khoản bác sĩ thành công',
          data: {
            id: 'uuid-string',
            phoneNumber: '0987654321',
            role: 'DOCTOR',
            fullName: 'BS. Nguyễn Văn B',
            licenseNumber: 'DOC-123456',
          },
        },
      },
    }),
    ApiResponse(
      createErrorSchema(HttpStatus.BAD_REQUEST, [
        'Số điện thoại đã được đăng ký',
        'Số giấy phép hành nghề đã tồn tại',
      ]),
    ),
    ApiResponse(
      createErrorSchema(HttpStatus.FORBIDDEN, 'Bạn không có quyền truy cập'),
    ),
    ApiResponse(
      createErrorSchema(
        HttpStatus.UNAUTHORIZED,
        'Token không hợp lệ hoặc đã hết hạn',
      ),
    ),
    CommonAuthErrors(),
  );
