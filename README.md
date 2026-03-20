# 🚀 TestForge

**TestForge** is an SDET-focused tool that generates structured API test cases and edge scenarios from raw JSON payloads — enabling faster and more consistent test design.

## 🧠 Problem

Designing API test cases manually is:

* time-consuming
* inconsistent across engineers
* prone to missing critical edge and negative scenarios

SDETs often need to reason about:

* boundary conditions
* invalid inputs
* missing fields
* validation rules

## 💡 Solution

TestForge accelerates **test design thinking** by generating:

* Edge cases (boundary, invalid, null, negative)
* Validation-focused test cases
* Structured outputs grouped by category
* Optional automation-ready snippets

All from a simple JSON input — no setup required.

## ✨ Features

* 📥 Paste raw JSON payload into editor
* ⚙️ Generate:

  * Edge cases
  * Validation test cases
* 🎯 Priority-based filtering
* 📂 Categorized output (boundary, invalid, missing fields, etc.)
* 🔍 Expandable sections (accordion view)
* 📋 One-click copy for payloads and snippets
* 🔌 Optional:

  * Postman starter snippets
  * RestAssured starter snippets
* 🌐 Runs in browser (no installation required)
* 🚀 Deployable via Render (backend) + Vercel (frontend)

## ⚠️ Assumptions

In the absence of API specifications, TestForge currently assumes:

* fields are required unless inferred otherwise
* strict type validation
* no null values

> These assumptions are surfaced and can be refined in future iterations.

## 🛠 Tech Stack

* **Frontend:** (your tech, e.g. React / Vanilla JS)
* **Backend:** Node.js + Express
* **Deployment:**

  * Vercel (frontend)
  * Render (backend)

## 🚀 How to Use

1. Paste a JSON payload
2. Select generation options
3. Run generation
4. Browse categorized test cases
5. Copy payloads/snippets as needed

## 🎯 Current Focus (MVP)

* Rapid test design
* Exploratory API testing
* Edge and negative case generation

## 🔮 Future Improvements

* Swagger / OpenAPI support
* Smarter prioritization and deduplication
* Test case limit controls
* Field-level validation configuration
* Export options (JSON / CSV / test frameworks)

## 📌 Live Demo

Frontend: https://testforge-seven.vercel.app/
Backend: (your Render URL)

## 🤝 Contributions

Open to feedback and improvements. Feel free to raise issues or suggestions.
