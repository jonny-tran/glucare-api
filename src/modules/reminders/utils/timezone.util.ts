import { format, toDate } from 'date-fns-tz';

export function calculateUtcCron(
  time: string,
  daysOfWeek: number[],
  timezone: string,
): string {
  if (!daysOfWeek || daysOfWeek.length === 0) {
    return '';
  }

  // Parse HH:mm
  const [hoursStr, minutesStr] = time.split(':');
  let localHours = parseInt(hoursStr, 10);
  let localMinutes = parseInt(minutesStr, 10);

  // We need to figure out the UTC hour and day shift.
  // We can use a reference date in the specified timezone
  // For simplicity, let's pick a Sunday without DST boundary issues, or just today
  const now = new Date();

  // Format the current date in local time but replace time
  // Example: '2023-01-01T08:30:00.000'
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(localHours).padStart(2, '0')}:${String(localMinutes).padStart(2, '0')}:00`;

  // Convert this local datetime to UTC
  const zonedDate = toDate(dateStr, { timeZone: timezone });

  const utcHours = zonedDate.getUTCHours();
  const utcMinutes = zonedDate.getUTCMinutes();

  // Need to find if day shifted forward or backward
  // E.g. Vietnam (UTC+7): 05:00 local is 22:00 day before in UTC.
  const localDayRef = zonedDate.getDay(); // Since toDate treats it as local? No, toDate creates a Date object. wait, it's easier to format back to local to get day shift.

  // Let's do a reliable day shift calculation
  // Vietnam +7: local is ahead of UTC. So UTC is local - 7.
  // If local = 05:00, UTC = 22:00 (prev day). Shift = -1

  // Calculate timezone offset at the current time
  const offsetString = format(zonedDate, 'xxx', { timeZone: timezone }); // e.g., "+07:00" or "-04:00"
  const sign = offsetString[0] === '-' ? -1 : 1;
  const offHours = parseInt(offsetString.substring(1, 3), 10);
  // (Ignoring minute offsets for day shift logic unless it crosses midnight, assuming standard timezones)

  const totalOffsetMinutes =
    sign * (offHours * 60 + parseInt(offsetString.substring(4, 6), 10));

  // Local time in minutes from midnight
  const localTotalMinutes = localHours * 60 + localMinutes;
  const utcTotalMinutes = localTotalMinutes - totalOffsetMinutes;

  let dayShift = 0;
  if (utcTotalMinutes < 0) {
    dayShift = -1;
  } else if (utcTotalMinutes >= 24 * 60) {
    dayShift = 1;
  }

  const updatedDays = daysOfWeek.map((day) => {
    let utcDay = day + dayShift;
    if (utcDay < 0) utcDay += 7;
    if (utcDay > 6) utcDay -= 7;
    return utcDay;
  });

  // Sort and remove duplicates just in case
  const finalDays = Array.from(new Set(updatedDays)).sort((a, b) => a - b);

  return `${utcMinutes} ${utcHours} * * ${finalDays.join(',')}`;
}
