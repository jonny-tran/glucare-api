import { calculateUtcCron } from './timezone.util';

describe('calculateUtcCron', () => {
  it('should return empty string if daysOfWeek is empty', () => {
    expect(calculateUtcCron('08:00', [], 'Asia/Ho_Chi_Minh')).toBe('');
  });

  it('should calculate correct UTC cron for Asia/Ho_Chi_Minh (+07:00)', () => {
    // 15:30 in +07:00 is 08:30 UTC same day
    const result = calculateUtcCron('15:30', [1, 3, 5], 'Asia/Ho_Chi_Minh');

    // Minute: 30, Hour: 8, Day: 1,3,5
    // Note: due to internal dayShift logic, it might shift correctly
    expect(result).toBe('30 8 * * 1,3,5');
  });

  it('should shift backward by 1 day when local time is early morning and UTC wraps around midnight', () => {
    // 05:00 Monday (1) local +07:00 -> 22:00 Sunday (0) UTC
    const result = calculateUtcCron('05:00', [1], 'Asia/Ho_Chi_Minh');
    expect(result).toBe('0 22 * * 0');
  });

  it('should shift forward by 1 day when local time is late evening and UTC wraps around midnight forward', () => {
    // 22:00 Monday (1) local in -05:00 (America/New_York est)
    // 22:00 - (-05:00) = 27:00 UTC = 03:00 next day (Tuesday, 2)
    const result = calculateUtcCron('22:00', [1], 'America/New_York');
    expect(result).toBe('0 3 * * 2');
  });

  it('should correctly handle days wrap around a week', () => {
    // 02:00 Sunday (0) local +07:00 -> 19:00 Saturday (6) UTC
    const result = calculateUtcCron('02:00', [0], 'Asia/Ho_Chi_Minh');
    expect(result).toBe('0 19 * * 6');

    // 23:00 Saturday (6) local -05:00 -> 04:00 Sunday (0) UTC next day
    const resultForward = calculateUtcCron('23:00', [6], 'America/New_York');
    expect(resultForward).toBe('0 4 * * 0');
  });
});
