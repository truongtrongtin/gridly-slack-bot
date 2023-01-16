import {
  GenericMessageEvent,
  MessageEvent,
  ReactionAddedEvent,
  ReactionMessageItem,
} from '@slack/bolt';
import { format, isSameDay } from 'date-fns';
import { DayPart } from './types';
import members from './members';

export const isGenericMessageEvent = (
  msg: MessageEvent,
): msg is GenericMessageEvent =>
  (msg as GenericMessageEvent).subtype === undefined;

export const isMessageItem = (
  item: ReactionAddedEvent['item'],
): item is ReactionMessageItem =>
  (item as ReactionMessageItem).type === 'message';

export function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function getDayPartFromEventSummary(summary: string) {
  if (summary.includes(DayPart.MORNING)) {
    return DayPart.MORNING;
  }
  if (summary.includes(DayPart.AFTERNOON)) {
    return DayPart.AFTERNOON;
  }
  return DayPart.ALL;
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
    if (dayPart !== DayPart.ALL) {
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

export function findMemberById(id: string) {
  return members.find((member) => member.id === id);
}

export function findMemberByEmail(email: string) {
  return members.find((member) => member.email === email);
}

export function findMemberByName(name: string) {
  return members.find((member) => {
    return member.name.toLowerCase() === name.toLowerCase();
  });
}

export function getMembersFromEventSummary(summary: string) {
  const memberNames = summary.split('(off')[0].split(',');
  const members = [];
  for (const memberName of memberNames) {
    const foundMember = findMemberByName(memberName.trim());
    if (foundMember) members.push(foundMember);
  }
  return members;
}

export type DateRange = {
  start: Date;
  end: Date;
};

export function splitRangeIntoWeekdayChunks({ start, end }: DateRange) {
  const ranges: DateRange[] = [];
  let startResult = null;
  let endResult = null;
  const startDate = new Date(start);
  const endDate = new Date(end);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  while (startDate.getTime() <= end.getTime()) {
    if (startDate.getDay() !== 0 && startDate.getDay() !== 6) {
      if (!startResult) startResult = new Date(startDate);
      endResult = new Date(startDate);
    }

    if (
      startResult &&
      endResult &&
      (startDate.getDay() === 5 || startDate.getTime() === endDate.getTime())
    ) {
      ranges.push({ start: startResult, end: endResult });
      startResult = null;
      endResult = null;
    }
    startDate.setDate(startDate.getDate() + 1);
  }
  return ranges;
}
