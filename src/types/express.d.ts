import * as express from 'express';

declare namespace Express {
  export interface Request {
    user?: { id: string; role?: 'Admin' | 'Teacher' | 'Student' | 'TempAdmin' };
  }
}