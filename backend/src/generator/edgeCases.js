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

function createVariant(baseInput, path, nextValue) {
  const variant = cloneInput(baseInput);
  setAtPath(variant, path, nextValue);
  return variant;
}

function buildPrimitiveEdgeCases(baseInput, path, value, type) {
  const field = formatPath(path);
  const cases = [];

  cases.push({
    title: `${field} should reject null`,
    type: "null-value",
    priority: "high",
    input: createVariant(baseInput, path, null)
  });

  if (type === "string") {
    cases.push({
      title: `${field} boundary length`,
      type: "boundary",
      priority: "medium",
      input: createVariant(baseInput, path, longString(value))
    });
    cases.push({
      title: `${field} invalid type`,
      type: "invalid-type",
      priority: "medium",
      input: createVariant(baseInput, path, 12345)
    });
  }

  if (type === "number") {
    cases.push({
      title: `${field} negative boundary`,
      type: "negative",
      priority: "high",
      input: createVariant(baseInput, path, -1)
    });
    cases.push({
      title: `${field} zero boundary`,
      type: "boundary",
      priority: "medium",
      input: createVariant(baseInput, path, 0)
    });
    cases.push({
      title: `${field} large boundary`,
      type: "boundary",
      priority: "medium",
      input: createVariant(baseInput, path, 999999999)
    });
    cases.push({
      title: `${field} invalid type`,
      type: "invalid-type",
      priority: "medium",
      input: createVariant(baseInput, path, "not-a-number")
    });
  }

  if (type === "boolean") {
    cases.push({
      title: `${field} invalid type`,
      type: "invalid-type",
      priority: "medium",
      input: createVariant(baseInput, path, "true")
    });
  }

  return cases;
}

function buildObjectEdgeCases(baseInput, path) {
  const field = formatPath(path);

  return [
    {
      title: `${field} should reject null`,
      type: "null-value",
      priority: "high",
      input: createVariant(baseInput, path, null)
    },
    {
      title: `${field} invalid type`,
      type: "invalid-type",
      priority: "medium",
      input: createVariant(baseInput, path, "invalid-object")
    }
  ];
}

function buildArrayEdgeCases(baseInput, path, value) {
  const field = formatPath(path);
  const cases = [
    {
      title: `${field} should reject null`,
      type: "null-value",
      priority: "high",
      input: createVariant(baseInput, path, null)
    },
    {
      title: `${field} empty boundary`,
      type: "boundary",
      priority: "medium",
      input: createVariant(baseInput, path, [])
    },
    {
      title: `${field} invalid type`,
      type: "invalid-type",
      priority: "medium",
      input: createVariant(baseInput, path, "not-an-array")
    }
  ];

  if (value.length > 0) {
    const firstItemType = inferType(value[0]);

    if (firstItemType === "string") {
      cases.push({
        title: `${field} invalid item type`,
        type: "invalid-type",
        priority: "medium",
        input: createVariant(baseInput, path, [12345])
      });
    }

    if (firstItemType === "number") {
      cases.push({
        title: `${field} negative item boundary`,
        type: "negative",
        priority: "medium",
        input: createVariant(baseInput, path, [-1])
      });
    }

    if (firstItemType === "object") {
      cases.push({
        title: `${field} null item`,
        type: "null-value",
        priority: "medium",
        input: createVariant(baseInput, path, [null])
      });
    }
  }

  return cases;
}

function walkInput(baseInput, currentValue, path = []) {
  const type = inferType(currentValue);

  if (type === "object") {
    const objectCases = path.length > 0 ? buildObjectEdgeCases(baseInput, path) : [];
    const nestedCases = Object.entries(currentValue).flatMap(([key, value]) =>
      walkInput(baseInput, value, [...path, key])
    );
    return [...objectCases, ...nestedCases];
  }

  if (type === "array") {
    return buildArrayEdgeCases(baseInput, path, currentValue);
  }

  return buildPrimitiveEdgeCases(baseInput, path, currentValue, type);
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