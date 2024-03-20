export enum DayPart {
  FULL = 'full',
  MORNING = 'morning',
  AFTERNOON = 'afternoon',
}

export type Member = {
  id: string;
  email: string;
  name: string;
  admin?: boolean;
};

export type CalendarEvent = {
  id: string;
  summary: string;
  start: {
    date: string;
  };
  end: {
    date: string;
  };
  extendedProperties: {
    private: Record<string, string>;
  };
};

export type CalendarListResponse = {
  items: CalendarEvent[];
  nextPageToken: string;
};

export type AbsencePayload = {
  targetUserId: string;
  startDateString: string;
  endDateString: string;
  dayPart: DayPart;
  reason: string;
};
