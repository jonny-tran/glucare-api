/* eslint-disable @typescript-eslint/unbound-method */
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSharingService } from '../data-sharing.service';
import { SharingGuard } from '../guards/sharing.guard';

describe('SharingGuard', () => {
  let guard: SharingGuard;
  let sharingService: DataSharingService;
  // Removed unused reflector variable

  beforeEach(async () => {
    const mockSharingService = {
      checkAccess: jest.fn(),
    };

    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SharingGuard,
        { provide: DataSharingService, useValue: mockSharingService },
        { provide: Reflector, useValue: mockReflector },
      ],
    }).compile();

    guard = module.get<SharingGuard>(SharingGuard);
    sharingService = module.get<DataSharingService>(DataSharingService);
  });

  const createMockContext = (
    user: unknown,
    params: unknown = {},
    handler = {},
  ): ExecutionContext => {
    return {
      getHandler: () => handler,
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          user,
          params,
          query: {},
        }),
      }),
    } as unknown as ExecutionContext;
  };

  it('should allow if user is PATIENT accessing (assumed own data implied check)', async () => {
    const context = createMockContext({ role: 'PATIENT', sub: 'p1' });
    expect(await guard.canActivate(context)).toBe(true);
  });

  it('should allow DOCTOR if checkAccess returns true', async () => {
    const context = createMockContext(
      { role: 'DOCTOR', sub: 'd1' },
      { patientId: 'p1' },
    );
    (sharingService.checkAccess as jest.Mock).mockResolvedValue(true);

    expect(await guard.canActivate(context)).toBe(true);
    expect(sharingService.checkAccess).toHaveBeenCalledWith(
      'd1',
      'p1',
      undefined,
    );
  });

  it('should throw Forbidden if checkAccess returns false', async () => {
    const context = createMockContext(
      { role: 'DOCTOR', sub: 'd1' },
      { patientId: 'p1' },
    );
    (sharingService.checkAccess as jest.Mock).mockResolvedValue(false);

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });
});
