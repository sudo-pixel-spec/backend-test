import { Request, Response } from "express";
import mongoose from "mongoose";
import { ok, fail } from "../utils/apiResponse";
import { writeAdminAudit } from "../services/adminAudit";
import { env } from "../config/env";
import { agendaManager } from "../jobs/agendaManager";
import { JOBS } from "../jobs/definitions";

export async function listJobs(req: Request, res: Response) {
  try {
    const agenda = await agendaManager.getAgenda();
    const skip = Math.max(0, Number(req.query.skip || 0));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));

    const jobs = await (agenda as any).jobs({}, { nextRunAt: 1, lastRunAt: -1 }, limit, skip);
    const total = await (agenda as any)._collection.countDocuments({});

    return res.json(ok({
      items: jobs.map((j: any) => j.attrs),
      total,
      skip,
      limit,
      schedulerStatus: await agendaManager.getStatus()
    }));
  } catch (err: any) {
    return res.status(500).json(fail("JOB_LIST_ERROR", err.message));
  }
}

export async function retryJob(req: Request, res: Response) {
  const { id } = req.params;
  try {
    const agenda = await agendaManager.getAgenda();
    const jobs = await (agenda as any).jobs({ _id: new mongoose.Types.ObjectId(id as string) });
    
    if (jobs.length === 0) return res.status(404).json(fail("NOT_FOUND", "Job not found"));
    
    const job = jobs[0];
    job.attrs.nextRunAt = new Date();
    job.attrs.failedAt = undefined;
    job.attrs.failReason = undefined;
    job.attrs.failCount = 0;
    await job.save();

    await writeAdminAudit(req as any, {
      action: "RETRY",
      entity: "Job",
      entityId: id
    });

    return res.json(ok({ retried: true }));
  } catch (err: any) {
    return res.status(500).json(fail("JOB_RETRY_ERROR", err.message));
  }
}

export async function triggerJob(req: Request, res: Response) {
  const { name, payload } = req.body;
  
  if (!Object.values(JOBS).includes(name)) {
    return res.status(400).json(fail("INVALID_JOB", `Unknown job name: ${name}`));
  }

  try {
    const agenda = await agendaManager.getAgenda();
    await agenda.now(name, payload || {});

    await writeAdminAudit(req as any, {
      action: "TRIGGER",
      entity: "Job",
      entityId: name,
      payload
    });

    return res.json(ok({ triggered: true }));
  } catch (err: any) {
    return res.status(500).json(fail("JOB_TRIGGER_ERROR", err.message));
  }
}

export async function deleteJob(req: Request, res: Response) {
  const { id } = req.params;
  try {
    const agenda = await agendaManager.getAgenda();
    const result = await (agenda as any)._collection.deleteOne({ _id: new mongoose.Types.ObjectId(id as string) });
    
    if (result.deletedCount === 0) return res.status(404).json(fail("NOT_FOUND", "Job not found"));

    await writeAdminAudit(req as any, {
      action: "DELETE",
      entity: "Job",
      entityId: id
    });

    return res.json(ok({ deleted: true }));
  } catch (err: any) {
    return res.status(500).json(fail("JOB_DELETE_ERROR", err.message));
  }
}
