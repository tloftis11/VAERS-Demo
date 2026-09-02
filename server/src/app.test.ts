import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "./app.js";

describe("app smoke test", () => {
  it("responds to /api/health", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("can create and fetch a report against the isolated test database", async () => {
    const created = await request(app).post("/api/reports").expect(201);
    const id = created.body.id;
    expect(id).toBeTruthy();
    const fetched = await request(app).get(`/api/reports/${id}`).expect(200);
    expect(fetched.body.id).toBe(id);
    expect(fetched.body.status).toBe("draft");
  });
});
