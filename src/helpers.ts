import {
  GenericMessageEvent,
  MessageEvent,
  ReactionAddedEvent,
  ReactionMessageItem,
} from '@slack/bolt';
import { format, isSameDay } from 'date-fns';
import { DayPart } from './types';
import members from './member-list.json';

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
    timeText = `${niceStartDate} (${startWeekday})`;
    if (dayPart !== DayPart.ALL) {
      timeText += ` ${dayPart}`;
    }
  } else {
    timeText = `${niceStartDate} (${startWeekday}) to ${niceEndDate} (${endWeekday})`;
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

export function hasAdminRole(email: string | undefined) {
  if (!email) return false;
  const foundMember = members.find((member) => member.email === email);
  if (!foundMember) return false;
  return Boolean(foundMember.isAdmin);
}

export function findMemberByName(name: string) {
  for (const member of members) {
    for (const possibleName of member.possibleNames) {
      if (possibleName.toLowerCase() === name.toLowerCase()) {
        return member;
      }
    }
  }
  return null;
}

export function getMembersFromEventSummary(summary: string) {
  const memberNames = summary.split('(off')[0].split(',');
  const members = [];
  for (const memberName of memberNames) {
    const foundMember = findMemberByName(memberName);
    if (foundMember) members.push(foundMember);
  }
  return members;
}
