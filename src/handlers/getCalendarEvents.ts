import { Request, Response } from 'express';
import { getEventsFromGoogleCalendar } from '../services/getEventsFromGoogleCalendar.js';

export async function getCalendarEvents(req: Request, res: Response) {
  try {
    const query = new URLSearchParams(req.query as Record<string, string>);
    const events = await getEventsFromGoogleCalendar(query);
    res.status(200).json(events);
  } catch (error) {
    res.status(400).json(error);
  }
}
