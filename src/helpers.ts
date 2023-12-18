import { format, isSameDay } from 'date-fns';
import { DayPart, Member } from './types.js';

export function getDayPartFromEventSummary(summary: string) {
  if (summary.includes(DayPart.MORNING)) {
    return DayPart.MORNING;
  }
  if (summary.includes(DayPart.AFTERNOON)) {
    return DayPart.AFTERNOON;
  }
  return DayPart.FULL;
}

export function getMemberNameFromEventSummary(summary: string) {
  return summary.split(' (off')[0];
}

export function generateTimeText(
  startDate: Date,
  endDate: Date,
  dayPart: DayPart,
) {
  const niceStartDate = format(startDate, 'MMM d');
  const niceEndDate = format(endDate, 'MMM d');
  const startWeekday = format(startDate, 'EEEE');
  const endWeekday = format(endDate, 'EEEE');
  let timeText = '';

  if (isSameDay(startDate, endDate)) {
    timeText = `on ${niceStartDate} (${startWeekday})`;
    if (dayPart !== DayPart.FULL) {
      timeText += ` ${dayPart}`;
    }
  } else {
    timeText = `from ${niceStartDate} (${startWeekday}) to ${niceEndDate} (${endWeekday})`;
  }

  return timeText;
}

export function isWeekendInRange(startDate: Date, endDate: Date) {
  let isWeekend = false;
  const start = new Date(startDate);
  const end = new Date(endDate);

  while (start <= end) {
    const day = start.getDay();
    isWeekend = day === 6 || day === 0;
    if (isWeekend) {
      return true;
    }
    start.setDate(start.getDate() + 1);
  }
  return false;
}

const members: Member[] = JSON.parse(
  Buffer.from(process.env.MEMBER_LIST_BASE64, 'base64').toString(),
);
export function findMemberById(id: string) {
  return members.find((member) => member.id === id);
}
