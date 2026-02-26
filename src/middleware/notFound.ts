import { Request, Response } from "express";
import { fail } from "../utils/apiResponse";

export function notFound(_req: Request, res: Response) {
  res.status(404).json(fail("NOT_FOUND", "Route not found"));
}
