function toPrettyJson(input) {
  return JSON.stringify(input, null, 2);
}

function escapeJavaTextBlock(value) {
  return value.replace(/"""/g, '\"\"\"');
}

export function generatePostmanSnippet(testCase) {
  return [
    `pm.test("${testCase.title}", function () {`,
    `  pm.response.to.have.status(${testCase.expected.status});`,
    "});"
  ].join("\n");
}

export function generateRestAssuredSnippet(testCase) {
  const requestBody = escapeJavaTextBlock(toPrettyJson(testCase.input));

  return [
    'String requestBody = """',
    requestBody,
    '""";',
    '',
    'given()',
    '    .contentType("application/json")',
    '    .body(requestBody)',
    '.when()',
    '    .post("/api")',
    '.then()',
    `    .statusCode(${testCase.expected.status});`
  ].join("\n");
}