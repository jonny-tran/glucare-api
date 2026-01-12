export type JwtPayload = {
  sub: string;
  role: 'ADMIN' | 'DOCTOR' | 'PATIENT';
};

export type JwtPayloadWithRt = JwtPayload & { refreshToken: string };
