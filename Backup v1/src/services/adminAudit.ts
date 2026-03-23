import { AdminAuditLog } from "../models/AdminAuditLog";

export async function writeAdminAudit(req: any, params: {
  action: string;
  entity: string;
  entityId: any;
  payload?: any;
}) {
  const adminId = req.user?.id;
  if (!adminId) return;

  await AdminAuditLog.create({
    adminId,
    action: params.action,
    entity: params.entity,
    entityId: params.entityId,
    payload: params.payload,
    requestId: req.requestId,
    ip: req.ip,
    userAgent: req.get?.("user-agent")
  });
}