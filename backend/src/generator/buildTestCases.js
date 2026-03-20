import {
  generatePostmanSnippet,
  generateRestAssuredSnippet
} from "./snippetGenerators.js";

function inferType(value) {
  if (value === null) {
    return "null";
  }

  if (Array.isArray(value)) {
    return "array";
  }

  return typeof value;
}

function cloneInput(input) {
  return JSON.parse(JSON.stringify(input));
}

function formatPath(path) {
  return path.join(".");
}

function deleteAtPath(target, path) {
  let cursor = target;

  for (let index = 0; index < path.length - 1; index += 1) {
    cursor = cursor?.[path[index]];
    if (!cursor || typeof cursor !== "object") {
      return;
    }
  }

  delete cursor[path[path.length - 1]];
}

function setAtPath(target, path, value) {
  let cursor = target;

  for (let index = 0; index < path.length - 1; index += 1) {
    const segment = path[index];
    if (typeof cursor[segment] !== "object" || cursor[segment] === null) {
      cursor[segment] = {};
    }
    cursor = cursor[segment];
  }

  cursor[path[path.length - 1]] = value;
}

function createVariant(baseInput, path, nextValue, mode = "replace") {
  const variant = cloneInput(baseInput);

  if (mode === "delete") {
    deleteAtPath(variant, path);
    return variant;
  }

  setAtPath(variant, path, nextValue);
  return variant;
}

function toId(index) {
  return `TC_${String(index + 1).padStart(3, "0")}`;
}

export function normalizeGenerationOptions(rawOptions = {}) {
  const requestedTargets = Array.isArray(rawOptions.snippetTargets)
    ? rawOptions.snippetTargets
    : ["postman", "restassured"];

  return {
    includeEdgeCases: rawOptions.includeEdgeCases === true,
    includeTestCases: rawOptions.includeTestCases !== false,
    snippetTargets: requestedTargets.filter((target) =>
      ["postman", "restassured"].includes(target)
    )
  };
}

function buildCase(title, type, priority, input, expected) {
  return {
    title,
    type,
    priority,
    input,
    expected
  };
}

function buildValidationCasesForField(baseInput, path, value) {
  const field = formatPath(path);
  const type = inferType(value);
  const cases = [];

  cases.push(
    buildCase(
      `Validate ${field} with valid value`,
      "positive",
      "medium",
      cloneInput(baseInput),
      { status: 200, message: `${field} accepted` }
    )
  );

  cases.push(
    buildCase(
      `Validate ${field} is required`,
      "required",
      "high",
      createVariant(baseInput, path, undefined, "delete"),
      { status: 400, message: `${field} is required` }
    )
  );

  cases.push(
    buildCase(
      `Validate ${field} is not null`,
      "validation",
      "high",
      createVariant(baseInput, path, null),
      { status: 400, message: `${field} cannot be null` }
    )
  );

  if (type === "string") {
    cases.push(
      buildCase(
        `Validate ${field} is not empty`,
        "validation",
        "high",
        createVariant(baseInput, path, ""),
        { status: 400, message: `${field} cannot be empty` }
      )
    );
  }

  if (type === "array") {
    cases.push(
      buildCase(
        `Validate ${field} is not empty`,
        "validation",
        "medium",
        createVariant(baseInput, path, []),
        { status: 400, message: `${field} cannot be empty` }
      )
    );
  }

  return cases;
}

function walkInput(baseInput, currentValue, path = []) {
  const type = inferType(currentValue);

  if (type === "object") {
    return Object.entries(currentValue).flatMap(([key, value]) =>
      walkInput(baseInput, value, [...path, key])
    );
  }

  return buildValidationCasesForField(baseInput, path, currentValue);
}

function dedupeCases(cases) {
  const seen = new Set();

  return cases.filter((testCase) => {
    const signature = `${testCase.title}|${JSON.stringify(testCase.input)}`;
    if (seen.has(signature)) {
      return false;
    }
    seen.add(signature);
    return true;
  });
}

export function buildTestCases(input, options = {}) {
  const normalizedOptions = normalizeGenerationOptions(options);
  const validationCases = dedupeCases(
    Object.entries(input).flatMap(([field, value]) => walkInput(input, value, [field]))
  );

  return validationCases.map((testCase, index) => {
    const structuredCase = {
      id: toId(index),
      title: testCase.title,
      type: testCase.type,
      priority: testCase.priority,
      input: testCase.input,
      expected: testCase.expected
    };

    if (normalizedOptions.snippetTargets.includes("postman")) {
      structuredCase.postman = generatePostmanSnippet(testCase);
    }

    if (normalizedOptions.snippetTargets.includes("restassured")) {
      structuredCase.restassured = generateRestAssuredSnippet(testCase);
    }

    return structuredCase;
  });
}