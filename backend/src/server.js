import cors from "cors";
import express from "express";
import { buildTestCases } from "./generator/buildTestCases.js";

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/generate", (req, res) => {
  const { input } = req.body ?? {};

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return res.status(400).json({
      error: "Request body must include an 'input' object."
    });
  }

  const testCases = buildTestCases(input);

  return res.json({
    summary: {
      total: testCases.length,
      positive: testCases.filter((item) => item.type === "positive").length,
      negative: testCases.filter((item) => item.type === "negative").length,
      edge: testCases.filter((item) => item.type === "edge").length
    },
    testCases
  });
});

app.listen(port, () => {
  console.log(`API test generator backend running on port ${port}`);
});

