import { generateEdgeCases } from "./edgeCases.js";
import {
  generatePostmanSnippet,
  generateRestAssuredSnippet
} from "./snippetGenerators.js";

function toId(index) {
  return `TC_${String(index + 1).padStart(3, "0")}`;
}

export function buildTestCases(input) {
  return generateEdgeCases(input).map((testCase, index) => ({
    id: toId(index),
    title: testCase.title,
    type: testCase.type,
    priority: testCase.priority,
    input: testCase.input,
    expected: testCase.expected,
    reason: testCase.reason,
    postman: generatePostmanSnippet(testCase),
    restassured: generateRestAssuredSnippet(testCase)
  }));
}

