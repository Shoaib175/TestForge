window.APP_CONFIG = window.APP_CONFIG || {
  apiBaseUrl: "http://localhost:4000"
};

const sampleInput = {
  age: 25,
  email: "user@example.com",
  isActive: true,
  profile: {
    city: "Bangalore"
  },
  tags: ["api", "qa"]
};

const jsonInput = document.getElementById("json-input");
const generateButton = document.getElementById("generate-button");
const loadSampleButton = document.getElementById("load-sample");
const results = document.getElementById("results");
const statusText = document.getElementById("status");
const summary = document.getElementById("summary");

function setStatus(message, isError = false) {
  statusText.textContent = message;
  statusText.className = isError ? "status error" : "status";
}

function formatJson(data) {
  return JSON.stringify(data, null, 2);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function cardTemplate(testCase) {
  const copyValue = encodeURIComponent(JSON.stringify(testCase.input));

  return `
    <article class="card">
      <div class="card-head">
        <div>
          <span class="case-id">${escapeHtml(testCase.id)}</span>
          <h3>${escapeHtml(testCase.title)}</h3>
          <div class="meta">
            <span class="pill">${escapeHtml(testCase.type)}</span>
            <span class="pill">${escapeHtml(testCase.priority)}</span>
          </div>
        </div>
        <button class="copy-button" data-copy="${copyValue}" type="button">Copy input</button>
      </div>
      <div class="content-grid">
        <section class="content-block">
          <h4>Reason</h4>
          <p>${escapeHtml(testCase.reason)}</p>
        </section>
        <section class="content-block">
          <h4>Input</h4>
          <pre>${escapeHtml(formatJson(testCase.input))}</pre>
        </section>
        <section class="content-block">
          <h4>Expected</h4>
          <pre>${escapeHtml(formatJson(testCase.expected))}</pre>
        </section>
        <section class="content-block">
          <h4>Postman</h4>
          <pre>${escapeHtml(testCase.postman)}</pre>
        </section>
        <section class="content-block">
          <h4>RestAssured</h4>
          <pre>${escapeHtml(testCase.restassured)}</pre>
        </section>
      </div>
    </article>
  `;
}

function renderResults(payload) {
  const { summary: counts, testCases } = payload;
  summary.textContent = `${counts.total} cases | ${counts.positive} positive | ${counts.negative} negative | ${counts.edge} edge`;
  results.className = "results";
  results.innerHTML = testCases.map(cardTemplate).join("");

  results.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      const value = button.getAttribute("data-copy");
      await navigator.clipboard.writeText(
        JSON.stringify(JSON.parse(decodeURIComponent(value)), null, 2)
      );
      button.textContent = "Copied";
      setTimeout(() => {
        button.textContent = "Copy input";
      }, 1200);
    });
  });
}

async function generateCases() {
  setStatus("Generating test cases...");
  summary.textContent = "";

  let parsed;

  try {
    parsed = JSON.parse(jsonInput.value);
  } catch {
    setStatus("Input must be valid JSON.", true);
    return;
  }

  try {
    const response = await fetch(`${window.APP_CONFIG.apiBaseUrl}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ input: parsed })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to generate test cases.");
    }

    renderResults(data);
    setStatus("Generated successfully.");
  } catch (error) {
    setStatus(error.message || "Request failed.", true);
  }
}

jsonInput.value = formatJson(sampleInput);

loadSampleButton.addEventListener("click", () => {
  jsonInput.value = formatJson(sampleInput);
  setStatus("Sample loaded.");
});

generateButton.addEventListener("click", generateCases);