import express from "express";
import cors from "cors";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT || 3001);
const defaultDelayMs = Number(process.env.MOCK_DEFAULT_DELAY_MS || 0);

app.use(cors());
app.use(express.json({ limit: "5mb" }));

function sleep(ms) {
  if (!ms) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toKey(req) {
  const cleanPath = req.path.replace(/\/+$/, "") || "/";
  return `${req.method.toUpperCase()} ${cleanPath}`;
}

function errorEnvelope({ code, message, details, requestId }) {
  return {
    error: {
      code,
      message,
      ...(details ? { details } : {}),
      ...(requestId ? { requestId } : {}),
    },
  };
}

async function loadMocks() {
  const filePath = path.join(__dirname, "../data/api-responses.json");
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw);
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// 记录 generate-image 调用次数，用于模拟 slide 2 失败
let generateImageCallCount = 0;

app.all("*", async (req, res) => {
  let mocks;
  try {
    mocks = await loadMocks();
  } catch (e) {
    res.status(500).json(
      errorEnvelope({
        code: "INTERNAL_ERROR",
        message: "Mock server failed to load fixtures",
        details: e instanceof Error ? { message: e.message } : undefined,
      })
    );
    return;
  }

  const key = toKey(req);
  const mock = mocks[key];

  if (!mock) {
    res.status(404).json(
      errorEnvelope({
        code: "VALIDATION_ERROR",
        message: `Mock not found for ${key}`,
      })
    );
    return;
  }

  const delayMs = Number(mock.delayMs ?? defaultDelayMs ?? 0);
  await sleep(delayMs);

  // 特殊处理：generate-image 第二次调用返回错误
  if (key === "POST /api/v1/presentations/generate-image") {
    generateImageCallCount++;
    if (generateImageCallCount % 2 === 0) {
      // 每第二次调用失败
      res.status(500).json(
        errorEnvelope({
          code: "GENERATION_FAILED",
          message: "Mocked generation failure for slide 2",
        })
      );
      return;
    }
  }

  // 重置计数器（当调用 plan 时）
  if (key === "POST /api/v1/presentations/plan") {
    generateImageCallCount = 0;
  }

  if (mock.status && Number(mock.status) >= 400) {
    res.status(Number(mock.status)).json(
      mock.response ??
        errorEnvelope({
          code: "INTERNAL_ERROR",
          message: "Mocked error",
        })
    );
    return;
  }

  res.json(mock.response ?? {});
});

app.listen(port, () => {
  console.log(`mock-server listening on http://localhost:${port}`);
});
