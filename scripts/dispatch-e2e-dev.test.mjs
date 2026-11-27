import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DEV_API_ORIGIN, DEV_APP_URL } from "./promote-admin.mjs";
import { TESTS_REPOSITORY, buildE2eDevPayload, dispatchE2eDev } from "./dispatch-e2e-dev.mjs";

const ADMIN = "a".repeat(40);
const API = "c".repeat(40);
const ENV = { ADMIN_SHA: ADMIN, E2E_DISPATCH_PAT: "t".repeat(30) };

function devMock({ liveSha = ADMIN, apiVersion = API, dispatchStatus = 204 } = {}) {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url, init });
    if (url === `${DEV_APP_URL}/sign-in`) {
      return {
        ok: true,
        status: 200,
        headers: new Headers({
          "x-fiziyo-release-schema": "1",
          "x-fiziyo-admin-sha": liveSha,
          "x-fiziyo-deployment-id": "dpl_previewmain1234",
          "x-fiziyo-api-origin": DEV_API_ORIGIN,
        }),
      };
    }
    if (url === `${DEV_API_ORIGIN}/health/live`) {
      return { ok: true, status: 200, json: async () => ({ status: "ok", version: apiVersion }) };
    }
    if (url === `https://api.github.com/repos/${TESTS_REPOSITORY}/dispatches`) {
      return { ok: dispatchStatus < 400, status: dispatchStatus };
    }
    throw new Error(`unexpected ${url}`);
  };
  return { calls, fetchImpl };
}

describe("dispatchE2eDev", () => {
  it("wysyła E2E Dev Full dla pary: przypięty panel i API, które DEV serwuje", async () => {
    const { calls, fetchImpl } = devMock();
    await dispatchE2eDev(ENV, { fetchImpl });
    const sent = calls.find((call) => call.url.endsWith("/dispatches"));
    assert.ok(sent, "brak dispatchu");
    assert.deepEqual(JSON.parse(sent.init.body), buildE2eDevPayload({ adminSha: ADMIN, apiSha: API }));
    assert.equal(JSON.parse(sent.init.body).client_payload.project, "all");
    assert.equal(sent.init.redirect, "error");
  });

  it("nie wysyła, gdy devportal serwuje już inny panel", async () => {
    const { calls, fetchImpl } = devMock({ liveSha: "b".repeat(40) });
    await assert.rejects(dispatchE2eDev(ENV, { fetchImpl }), /DEV serwuje SHA/);
    assert.equal(calls.some((call) => call.url.endsWith("/dispatches")), false);
  });

  it("nie wysyła bez pełnego SHA API z /health/live", async () => {
    const { calls, fetchImpl } = devMock({ apiVersion: "dev" });
    await assert.rejects(dispatchE2eDev(ENV, { fetchImpl }), /pełny SHA/);
    assert.equal(calls.some((call) => call.url.endsWith("/dispatches")), false);
  });

  it("czerwieni krok, gdy GitHub odrzuci dispatch", async () => {
    const { fetchImpl } = devMock({ dispatchStatus: 403 });
    await assert.rejects(dispatchE2eDev(ENV, { fetchImpl }), /403/);
  });

  it("wymaga tokenu", async () => {
    const { fetchImpl } = devMock();
    await assert.rejects(dispatchE2eDev({ ADMIN_SHA: ADMIN }, { fetchImpl }), /E2E_DISPATCH_PAT/);
  });
});
