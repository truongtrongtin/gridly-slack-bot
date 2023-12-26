import { NextFunction, Request, Response } from 'express';
import { getUserInfo } from '../services/getUserInfo.js';

export async function checkAccessToken(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const query = new URLSearchParams(req.query as Record<string, string>);
    const clientAccessToken = query.get('access_token');
    if (!clientAccessToken) {
      res.status(400).json({
        error: 'required',
        message: 'Required parameter is missing',
      });
      return;
    }
    await getUserInfo(clientAccessToken);
    next();
  } catch (error) {
    res.send(401).json(error);
  }
}
