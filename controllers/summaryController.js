// controllers/summaryController.js
const fs = require('fs-extra');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const fetch = global.fetch || require('node-fetch');

const OUTPUT_DIR = process.env.OUTPUT_DIR || path.join(__dirname, '..', 'generated');
fs.ensureDirSync(OUTPUT_DIR);

// 🧠 Helper: Call Groq LLaMA 3.1 API
async function callLLM(prompt) {
  const url = process.env.LLAMA_API_URL;
  const apiKey = process.env.LLAMA_API_KEY;
  if (!url || !apiKey) throw new Error("Groq API URL or API key missing");

  const body = {
    model: "llama-3.1-8b-instant",
    messages: [
      { role: "system", content: "You are an expert academic report writer." },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
    max_tokens: 800,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Groq LLaMA request failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "No response from LLaMA.";
}

// 🧾 Build prompt
function buildPrompt(payload) {
  return `
You are an expert academic report writer. Given the structured JSON data below, produce short, clear, professional paragraphs for the following sections:
- Executive summary (2-4 sentences)
- Academic Progress
- Research Progress
- Administration & Governance Progress
- Quality Enhancement Progress
- Major Challenges
- Next Year Plan

JSON:
${JSON.stringify(payload, null, 2)}

For each section output a title like "Executive summary:" followed by the paragraph. Avoid adding any extra sections. Keep language formal but concise.
  `;
}

// 🧱 Build simple text version of program table
function buildProgramTableText(programs = []) {
  if (!programs.length) return "No program data available.\n";

  const headers = [
    "Program Name", "Total", "Male", "Female",
    "Scholarship", "New Admissions", "Graduated", "Pass %"
  ];

  const rows = programs.map(p => [
    p.programName || '-',
    p.totalStudents || 0,
    p.maleStudents || 0,
    p.femaleStudents || 0,
    p.scholarshipStudents || 0,
    p.newAdmissions || 0,
    p.graduatedStudents || 0,
    p.passPercentage || 0,
  ]);

  const lines = [headers.join(" | ")];
  lines.push("-".repeat(100));
  rows.forEach(r => lines.push(r.join(" | ")));
  return lines.join("\n") + "\n";
}

// 🧩 MAIN FUNCTION (name preserved)
exports.generateSummaryDocx = async (req, res) => {
  try {
    const payload = req.body;
    if (!payload || !payload.id) {
      return res.status(400).json({ error: 'Invalid payload: expected JSON with id' });
    }

    // 1️⃣ Generate text via LLaMA
    const prompt = buildPrompt(payload);
    let llmOutput = '';
    try {
      llmOutput = await callLLM(prompt);
    } catch (err) {
      console.error('LLM call failed:', err.message);
      llmOutput = `Executive summary:\n${payload.academicProgress || ''}\n\nAcademic Progress:\n${payload.academicProgress || ''}`;
    }

    // 2️⃣ Extract sections
    const sections = {};
    const titles = [
      'Executive summary',
      'Academic Progress',
      'Research Progress',
      'Administration & Governance Progress',
      'Quality Enhancement Progress',
      'Major Challenges',
      'Next Year Plan',
    ];

    for (const t of titles) {
      const regex = new RegExp(
        `${t}:\\s*([\\s\\S]*?)(?=\\n\\s*${titles
          .filter((x) => x !== t)
          .map((x) => x.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'))
          .join('|')}\\:|$)`,
        'i'
      );
      const m = llmOutput.match(regex);
      sections[t] = m ? m[1].trim() : '';
    }

    // 3️⃣ Create styled PDF
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([595, 842]); // A4
    const { height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let y = height - 60;
    const margin = 50;
    const lineHeight = 16;

    // Helper for line + auto-page
    const drawLine = (color = rgb(0.8, 0.8, 0.8)) => {
      page.drawLine({
        start: { x: margin, y: y },
        end: { x: 595 - margin, y },
        color,
        thickness: 0.8,
      });
      y -= 10;
    };

    function drawText(text, options = {}) {
      const { size = 12, color = rgb(0, 0, 0), fontType = font } = options;
      const lines = text.split('\n');
      for (const line of lines) {
        if (y < 80) {
          page = pdfDoc.addPage([595, 842]);
          y = height - 60;
        }
        page.drawText(line, { x: margin, y, size, font: fontType, color });
        y -= lineHeight;
      }
      y -= 6;
    }

    // Header
    page.drawText(`${payload.collegeName || ''} - Annual Summary`, {
      x: margin,
      y,
      size: 18,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.4),
    });
    y -= 25;
    drawText(`Academic Year: ${payload.academicYear || ''}`);
    drawText(`Submission Date: ${payload.submissionDate || ''}`);
    y -= 10;
    drawText(
      `Total Students: ${payload.totalStudents || 0}   |   Approved Budget: ${payload.approvedBudget || 0}   |   Revenue: ${payload.revenueGenerated || 0}`,
      { size: 11, color: rgb(0.2, 0.2, 0.2) }
    );
    y -= 15;
    drawLine();

    // Program Table
    drawText("📘 Program Details", { size: 14, fontType: boldFont });
    drawText(buildProgramTableText(payload.programs || []), { size: 10 });
    y -= 10;
    drawLine();

    // Main Sections
    for (const title of Object.keys(sections)) {
      drawText(title, { size: 14, fontType: boldFont, color: rgb(0.1, 0.1, 0.4) });
      drawText(sections[title] || '', { size: 11, color: rgb(0, 0, 0) });
      y -= 10;
      drawLine();
    }

    // Footer
    y -= 20;
    drawText(`Head: ${payload.headName || ''}`);
    drawText(`Principal: ${payload.principalName || ''}`);
    drawText(`Submitted by: ${payload.submittedBy || ''}`);

    // Footer note (page bottom)
    page.drawText("Generated automatically via ICT Forum System", {
      x: margin,
      y: 30,
      size: 9,
      color: rgb(0.5, 0.5, 0.5),
    });

    // 4️⃣ Save PDF
    const pdfBytes = await pdfDoc.save();
    const fileName = `summary_${payload.id}.pdf`;
    const outPath = path.join(OUTPUT_DIR, fileName);
    await fs.writeFile(outPath, pdfBytes);

    // 5️⃣ Send PDF
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    res.setHeader('Content-Type', 'application/pdf');
    res.send(Buffer.from(pdfBytes));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
