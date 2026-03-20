import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";

test("POST /generate accepts input and prints generated edge cases", async () => {
  const app = createApp();
  const server = app.listen(0);

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        input: {
          name: "Shoaib",
          age: 25
        },
        options: {
          includeEdgeCases: true,
          includeTestCases: true,
          snippetTargets: ['postman','restassured']
        }
      })
    });

    assert.equal(response.status, 200);

    const payload = await response.json();
    console.log(
      "Generated edge cases:\n",
      JSON.stringify(payload, null, 2)
    );
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
});