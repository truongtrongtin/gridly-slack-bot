export enum DayPart {
  ALL = 'all',
  MORNING = 'morning',
  AFTERNOON = 'afternoon',
}

export enum Role {
  MEMBER = 'member',
  ADMIN = 'admin',
}

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
    private: {
      [key: string]: string;
    };
  };
};

export type AbsencePayload = {
  targetUserId: string;
  startDateString: string;
  endDateString: string;
  dayPart: DayPart;
  messageText: string;
};
