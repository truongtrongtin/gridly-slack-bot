import {
  GenericMessageEvent,
  MessageEvent,
  ReactionAddedEvent,
  ReactionMessageItem,
} from '@slack/bolt';
import { format, isSameDay } from 'date-fns';
import { DayPart } from './types';

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
