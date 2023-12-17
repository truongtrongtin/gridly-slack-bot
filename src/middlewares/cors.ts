import { NextFunction, Request, Response } from 'express';

export async function cors(req: Request, res: Response, next: NextFunction) {
  res.set('Access-Control-Allow-Origin', '*');
  next();
}
