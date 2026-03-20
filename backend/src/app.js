import cors from "cors";
import express from "express";
import { generateEdgeCases } from "./generator/edgeCases.js";
import {
  buildTestCases,
  normalizeGenerationOptions
} from "./generator/buildTestCases.js";
import {
  generatePostmanSnippet,
  generateRestAssuredSnippet
} from "./generator/snippetGenerators.js";

function attachSnippetsToEdgeCases(edgeCases, options) {
  return edgeCases.map((edgeCase) => {
    const enrichedEdgeCase = {
      ...edgeCase,
      expected: {
        status: 400,
        message: "Validation error"
      }
    };

    if (options.snippetTargets.includes("postman")) {
      enrichedEdgeCase.postman = generatePostmanSnippet(enrichedEdgeCase);
    }

    if (options.snippetTargets.includes("restassured")) {
      enrichedEdgeCase.restassured = generateRestAssuredSnippet(enrichedEdgeCase);
    }

    return enrichedEdgeCase;
  });
}

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.post("/generate", (req, res) => {
    const { input, options } = req.body ?? {};

    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return res.status(400).json({
        error: "Request body must include an 'input' object."
      });
    }

    const normalizedOptions = normalizeGenerationOptions(options);
    const rawEdgeCases = normalizedOptions.includeEdgeCases ? generateEdgeCases(input) : [];
    const edgeCases = normalizedOptions.includeEdgeCases
      ? attachSnippetsToEdgeCases(rawEdgeCases, normalizedOptions)
      : [];
    const testCases = normalizedOptions.includeTestCases
      ? buildTestCases(input, normalizedOptions)
      : [];

    return res.json({
      summary: {
        edgeCases: edgeCases.length,
        testCases: testCases.length
      },
      ...(normalizedOptions.includeEdgeCases ? { edgeCases } : {}),
      ...(normalizedOptions.includeTestCases ? { testCases } : {})
    });
  });

  return app;
}