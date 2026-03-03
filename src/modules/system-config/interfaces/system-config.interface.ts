export enum SystemConfigKey {
  GLUCOSE_SAFE_MIN = 'GLUCOSE_SAFE_MIN',
  GLUCOSE_SAFE_MAX = 'GLUCOSE_SAFE_MAX',
}

export interface ISystemConfig {
  key: SystemConfigKey;
  value: unknown;
  description: string | null;
  updatedBy: string | null;
  updatedAt: Date;
}
