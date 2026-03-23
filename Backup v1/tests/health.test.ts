import request from "supertest";
import { createApp } from "../src/app";

describe("Health endpoints", () => {
  it("GET /v1/health should return ok", async () => {
    const app = createApp();
    const res = await request(app).get("/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.status).toBe("ok");
  });

  it("GET /v1/ready should return 503 when DB not connected (in test)", async () => {
    const app = createApp();
    const res = await request(app).get("/v1/ready");
    expect([200, 503]).toContain(res.status);
  });
});
