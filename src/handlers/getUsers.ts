import { Request, Response } from 'express';
import { getUsersFromSheet } from '../services/getUsersFromSheet.js';

export async function getUsers(req: Request, res: Response) {
  try {
    const users = await getUsersFromSheet();
    res.status(200).json(users);
  } catch (error) {
    res.status(400).json(error);
  }
}
