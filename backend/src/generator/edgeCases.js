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

function longString(base) {
  const seed = typeof base === "string" && base.length > 0 ? base : "sample";
  return seed.repeat(20).slice(0, 256);
}

function formatPath(path) {
  return path.join(".");
}

function getAtPath(target, path) {
  return path.reduce((current, segment) => current?.[segment], target);
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

function createVariant(baseInput, path, nextValue, mode = "replace") {
  const variant = cloneInput(baseInput);

  if (mode === "delete") {
    deleteAtPath(variant, path);
    return variant;
  }

  setAtPath(variant, path, nextValue);
  return variant;
}

function pushCase(cases, baseInput, path, overrides) {
  cases.push({
    input: cloneInput(baseInput),
    ...overrides,
    fieldPath: formatPath(path)
  });
}

function buildPrimitiveCases(baseInput, path, value, type) {
  const field = formatPath(path);
  const cases = [];

  pushCase(cases, baseInput, path, {
    title: `Valid ${field}`,
    type: "positive",
    priority: type === "boolean" ? "low" : "medium",
    expected: { status: 200, message: `${field} accepted` },
    reason: `${field} uses a normal valid ${type} value.`
  });

  cases.push({
    title: `Missing required field: ${field}`,
    type: "negative",
    priority: "high",
    input: createVariant(baseInput, path, undefined, "delete"),
    expected: { status: 400, message: `${field} is required` },
    reason: `${field} should be rejected when the field is omitted.`
  });

  if (type === "string") {
    cases.push({
      title: `Empty ${field}`,
      type: "negative",
      priority: "high",
      input: createVariant(baseInput, path, ""),
      expected: { status: 400, message: `${field} cannot be empty` },
      reason: `${field} should reject empty string input.`
    });
    cases.push({
      title: `Long ${field}`,
      type: "edge",
      priority: "medium",
      input: createVariant(baseInput, path, longString(value)),
      expected: { status: 400, message: `${field} exceeds allowed length` },
      reason: `${field} should handle oversized string input safely.`
    });
    cases.push({
      title: `Wrong type for ${field}`,
      type: "negative",
      priority: "medium",
      input: createVariant(baseInput, path, 12345),
      expected: { status: 400, message: `${field} must be a string` },
      reason: `${field} should reject data with the wrong type.`
    });
  }

  if (type === "number") {
    cases.push({
      title: `Negative ${field}`,
      type: "edge",
      priority: "high",
      input: createVariant(baseInput, path, -1),
      expected: { status: 400, message: `${field} cannot be negative` },
      reason: `${field} should reject negative values when only valid positive input is expected.`
    });
    cases.push({
      title: `Zero ${field}`,
      type: "edge",
      priority: "medium",
      input: createVariant(baseInput, path, 0),
      expected: { status: 400, message: `${field} cannot be zero` },
      reason: `${field} should validate boundary handling around zero.`
    });
    cases.push({
      title: `Large ${field}`,
      type: "edge",
      priority: "medium",
      input: createVariant(baseInput, path, 999999999),
      expected: { status: 400, message: `${field} exceeds allowed range` },
      reason: `${field} should handle extreme numeric input safely.`
    });
    cases.push({
      title: `Wrong type for ${field}`,
      type: "negative",
      priority: "medium",
      input: createVariant(baseInput, path, "not-a-number"),
      expected: { status: 400, message: `${field} must be a number` },
      reason: `${field} should reject non-numeric input.`
    });
  }

  if (type === "boolean") {
    cases.push({
      title: `Wrong type for ${field}`,
      type: "negative",
      priority: "medium",
      input: createVariant(baseInput, path, "true"),
      expected: { status: 400, message: `${field} must be a boolean` },
      reason: `${field} should reject string values that imitate booleans.`
    });
  }

  return cases;
}

function buildObjectCases(baseInput, path, value) {
  const field = formatPath(path);
  const cases = [
    {
      title: `Null ${field}`,
      type: "negative",
      priority: "high",
      input: createVariant(baseInput, path, null),
      expected: { status: 400, message: `${field} cannot be null` },
      reason: `${field} should reject null instead of a valid object.`
    },
    {
      title: `Wrong type for ${field}`,
      type: "negative",
      priority: "medium",
      input: createVariant(baseInput, path, "invalid-object"),
      expected: { status: 400, message: `${field} must be an object` },
      reason: `${field} should reject primitive values when an object is expected.`
    }
  ];

  if (Object.keys(value).length === 0) {
    cases.push({
      title: `Empty ${field}`,
      type: "edge",
      priority: "low",
      input: createVariant(baseInput, path, {}),
      expected: { status: 400, message: `${field} cannot be empty` },
      reason: `${field} should validate empty object payloads if nested data is required.`
    });
  }

  return cases;
}

function buildArrayCases(baseInput, path, value) {
  const field = formatPath(path);
  const cases = [
    {
      title: `Valid ${field}`,
      type: "positive",
      priority: "low",
      input: cloneInput(baseInput),
      expected: { status: 200, message: `${field} accepted` },
      reason: `${field} uses a normal valid array payload.`
    },
    {
      title: `Empty ${field}`,
      type: "edge",
      priority: "medium",
      input: createVariant(baseInput, path, []),
      expected: { status: 400, message: `${field} cannot be empty` },
      reason: `${field} should validate empty collection handling.`
    },
    {
      title: `Wrong type for ${field}`,
      type: "negative",
      priority: "medium",
      input: createVariant(baseInput, path, "not-an-array"),
      expected: { status: 400, message: `${field} must be an array` },
      reason: `${field} should reject non-array values.`
    }
  ];

  if (value.length > 0) {
    const firstItem = value[0];
    const firstItemType = inferType(firstItem);

    if (firstItemType === "string") {
      cases.push({
        title: `Invalid item in ${field}`,
        type: "negative",
        priority: "medium",
        input: createVariant(baseInput, path, [12345]),
        expected: { status: 400, message: `${field} contains invalid item type` },
        reason: `${field} should reject array items with the wrong type.`
      });
    }

    if (firstItemType === "number") {
      cases.push({
        title: `Negative item in ${field}`,
        type: "edge",
        priority: "medium",
        input: createVariant(baseInput, path, [-1]),
        expected: { status: 400, message: `${field} contains invalid value` },
        reason: `${field} should validate numeric array item boundaries.`
      });
    }

    if (firstItemType === "object") {
      cases.push({
        title: `Null item in ${field}`,
        type: "negative",
        priority: "medium",
        input: createVariant(baseInput, path, [null]),
        expected: { status: 400, message: `${field} contains invalid object item` },
        reason: `${field} should reject null entries inside an object array.`
      });
    }
  }

  return cases;
}

function walkInput(baseInput, currentValue, path = []) {
  const type = inferType(currentValue);

  if (type === "object") {
    const cases = path.length > 0 ? buildObjectCases(baseInput, path, currentValue) : [];
    const nestedCases = Object.entries(currentValue).flatMap(([key, value]) =>
      walkInput(baseInput, value, [...path, key])
    );
    return [...cases, ...nestedCases];
  }

  if (type === "array") {
    return buildArrayCases(baseInput, path, currentValue);
  }

  return buildPrimitiveCases(baseInput, path, currentValue, type);
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

export function generateEdgeCases(input) {
  const cases = Object.entries(input).flatMap(([field, value]) =>
    walkInput(input, value, [field])
  );

  return dedupeCases(cases);
}