import { Request, Response, NextFunction } from "express";
import { fail } from "../utils/apiResponse";

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  const requestId = (req as any).requestId;
  const status = err?.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500;

  const code = err?.code ?? (status === 500 ? "INTERNAL" : "ERROR");
  const message = err?.message ?? "Something went wrong";

  if (status >= 500) {
    console.error({ requestId, err });
  }

  res.status(status).json(fail(code, message, { requestId }));
}
