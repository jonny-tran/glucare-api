---
trigger: always_on
---

I need to implement Phase 1 of the Authentication module: Session Management.
Please generate code to add 2 new APIs: Refresh Token and Logout.

Follow the current project structure (NestJS + Drizzle ORM + Repository Pattern).
Do not add unnecessary comments.

Here is the plan:

### 1. Update DTO (`src/modules/auth/dto/login.dto.ts`)

- Add `RefreshTokenDto` class with a single field `refreshToken` (string, not empty).
- Use `@ApiProperty` for Swagger.

### 2. Update Repository (`src/modules/auth/auth.repository.ts`)

- Add `findById(userId: string)`:
  - Find user by ID.
  - IMPORTANT: Must select `hashedRefreshToken` field to verify later.
- Add `updateRefreshToken(userId: string, hashedRefreshToken: string | null)`:
  - Update the `hashedRefreshToken` field in `users` table.
  - Used for Logout (set to null).

### 3. Update TokenService (`src/modules/auth/helper/token.service.ts`)

- Add `verifyRefreshToken(token: string)`:
  - Use `JwtService.verifyAsync` with `JWT_REFRESH_SECRET` from config.
  - Return the payload.
  - Handle errors gracefully (throw UnauthorizedException if invalid).

### 4. Update AuthService (`src/modules/auth/auth.service.ts`)

- Implement `refreshTokens(dto: RefreshTokenDto)`:
  1. Call `tokenService.verifyRefreshToken` to get payload (userId).
  2. Call `authRepository.findById` to get user & stored hash.
  3. Validate: User exists AND user has `hashedRefreshToken`.
  4. Compare: Use `argon2.verify(user.hashedRefreshToken, dto.refreshToken)`.
  5. If valid: Call `tokenService.generateAuthResponse` (this automatically rotates the token).
- Implement `logout(userId: string)`:
  1. Call `authRepository.updateRefreshToken(userId, null)`.
  2. Return `{ message: 'Logout successful' }` or boolean.

### 5. Update Swagger (`src/modules/auth/auth.swagger.ts`)

- Create `ApiRefresh` decorator:
  - Summary: "Làm mới Token".
  - Responses: 200 (Success with new tokens), 401 (Invalid token).
- Create `ApiLogout` decorator:
  - Summary: "Đăng xuất".
  - Responses: 200 (Success), 401 (Unauthorized).

### 6. Update Controller (`src/modules/auth/auth.controller.ts`)

- Add `POST /refresh`:
  - Public endpoint (no Guard needed, or handle manually).
  - Body: `RefreshTokenDto`.
  - Use `@ApiRefresh`.
- Add `POST /logout`:
  - Protected endpoint (Use `AtGuard`).
  - Use `@CurrentUser('sub')` to get userId.
  - Use `@ApiLogout`.
  - Use `@ResponseMessage('Đăng xuất thành công')`.

Please generate the code changes for these files.
