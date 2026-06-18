const dotenv = require('dotenv');
dotenv.config();

/**
 * Smart Regex Parser Fallback
 * Deterministically parses freeform client text into structured JSON fields.
 */
function regexParserFallback(text) {
  console.log("Using smart regex heuristic parsing fallback...");
  const lower = text.toLowerCase();

  // 1. Client Name & Company
  let clientName = "Dr. Parma";
  let businessType = "Clinic";
  if (lower.includes("parma")) {
    clientName = "Dr. Parma";
    businessType = "Family Physician Clinic";
  } else {
    // Try to guess first capitalized words
    const matches = text.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
    if (matches && matches[0]) {
      clientName = matches[0];
    }
  }

  // 2. Fees
  let setupFee = 0;
  let monthlyFee = 0;
  let currency = "₹";

  // Search setup fee (e.g. setup $800, setup fee 800, $800 setup)
  const setupMatch = text.match(/(?:setup|one-time|one\s+time)(?:\s+fee)?\s*(?:of\s*)?(?:[\$₹])\s*(\d+)|(?:[\$₹])\s*(\d+)\s*(?:setup)/i);
  if (setupMatch) {
    setupFee = parseInt(setupMatch[1] || setupMatch[2], 10) || 0;
  } else {
    const backupSetup = text.match(/setup\s*(?:of\s*)?(\d+)/i);
    if (backupSetup) setupFee = parseInt(backupSetup[1], 10) || 0;
  }

  // Search monthly fee (e.g. monthly $299, 299 monthly, 299/mo, $299/month)
  const monthlyMatch = text.match(/(?:monthly|recurring|maintenance|month)(?:\s+fee)?\s*(?:of\s*)?(?:[\$₹])\s*(\d+)|(?:[\$₹])\s*(\d+)\s*(?:\/mo|monthly|per\s+month)/i);
  if (monthlyMatch) {
    monthlyFee = parseInt(monthlyMatch[1] || monthlyMatch[2], 10) || 0;
  } else {
    const backupMonthly = text.match(/(?:monthly|recurring)\s*(\d+)/i);
    if (backupMonthly) monthlyFee = parseInt(backupMonthly[1], 10) || 0;
  }

  if (lower.includes("rs") || lower.includes("inr") || lower.includes("₹")) {
    currency = "₹";
  }

  // 3. Country
  let country = "India";
  if (lower.includes("usa") || lower.includes("united states") || lower.includes("us")) {
    country = "US";
  } else if (lower.includes("uk") || lower.includes("united kingdom") || lower.includes("london")) {
    country = "UK";
  }

  // 4. Products / Services
  const products = [];
  if (lower.includes("leadhunter")) products.push("LeadHunter");
  if (lower.includes("reputationguard")) products.push("ReputationGuard");
  if (lower.includes("voice") || lower.includes("agent")) products.push("AI Voice Agent");
  if (lower.includes("crm")) products.push("Patient CRM Integration");
  if (products.length === 0) products.push("AI Voice & Automation Services");

  // 5. Governing Law
  let governingLaw = "India";
  if (lower.includes("client's state") || lower.includes("client state")) {
    governingLaw = country === "US" ? "USA — Client's State" : "Client's Country";
  } else {
    const lawMatch = text.match(/governing\s+law\s+([A-Za-z\s]+)/i);
    if (lawMatch) governingLaw = lawMatch[1].trim();
  }

  // 6. Cancellation Terms
  let cancellationTerms = "30 days";
  const cancelMatch = text.match(/(\d+)[-\s]day\s+cancellation/i);
  if (cancelMatch) cancellationTerms = `${cancelMatch[1]}-day written notice`;

  // 7. IP Terms
  const ipTermsCode = "Dashboard and agent code owned by Client on full payment.";
  const ipTermsModel = "AI model weights remain Hyperwrike IP.";

  // 8. Deliverables
  const deliverables = [];
  products.forEach(p => {
    if (p === "LeadHunter") {
      deliverables.push("Automated B2B Lead Scraping & Verification Pipeline");
      deliverables.push("Lead Enrichment & Verification logic");
    } else if (p === "ReputationGuard") {
      deliverables.push("AI Review Monitoring & Auto-Response Drafting Board");
      deliverables.push("Notification trigger setup for low-star reviews");
    } else if (p === "AI Voice Agent") {
      deliverables.push("Inbound appointment booking routing & voice recognition");
      deliverables.push("English & regional language model setup");
    } else {
      deliverables.push("Custom AI integration and deployment");
    }
  });

  // 9. Phased Rollout
  const phasedRollout = [
    { phase: "Week 1–2", detail: "Telephony, API integration, and database schema setup." },
    { phase: "Week 3–4", detail: "AI model training, conversation logic, and UAT feedback." },
    { phase: "Week 5", detail: "Go-live deployment and staff training." }
  ];

  return {
    clientName,
    businessType,
    country,
    products,
    setupFee,
    monthlyFee,
    currency,
    governingLaw,
    cancellationTerms,
    ipTermsCode,
    ipTermsModel,
    complianceNotes: "Platform TOS compliance is Hyperwrike's responsibility; no TOS-violating outreach. No clinical advice generated.",
    deliverables,
    phasedRollout
  };
}

/**
 * Extracts structured client fields from raw text
 */
async function extractClientInfo(rawText) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

  if (!rawText || rawText.trim().length === 0) {
    return regexParserFallback("");
  }

  // If Anthropic Claude API key is configured
  if (anthropicKey) {
    try {
      console.log("Attempting Claude API extraction...");
      const { Anthropic } = require('@anthropic-ai/sdk');
      const anthropic = new Anthropic({ apiKey: anthropicKey });

      const prompt = `You are a legal and commercial operations analyst. Extract commercial and project variables from the following freeform text and format them strictly as a JSON object.
      
      Raw text:
      "${rawText}"

      Required JSON Schema:
      {
        "clientName": "Clean client primary name",
        "businessType": "Company description/niche",
        "country": "US, India, UK, or Other",
        "products": ["Array of services requested e.g. LeadHunter, ReputationGuard, AI Voice Agent"],
        "setupFee": 800, (parsed number, default 0)
        "monthlyFee": 299, (parsed number, default 0)
        "currency": "$" or "₹" or "£" (default "₹"),
        "governingLaw": "Governing state or country",
        "cancellationTerms": "cancellation notice details e.g. 30-day cancellation",
        "ipTermsCode": "Terms regarding software dashboard code",
        "ipTermsModel": "Terms regarding AI model weights",
        "complianceNotes": "Compliance and safety exclusions",
        "deliverables": ["List of core deliverables based on the products requested"],
        "phasedRollout": [
          {"phase": "Week 1-2", "detail": "Activity detail"}
        ]
      }

      Return ONLY the JSON block. Do not include any conversation, markdown tags, or headers.`;

      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 1500,
        temperature: 0,
        messages: [{ role: "user", content: prompt }]
      });

      const resText = response.content[0].text;
      const jsonStart = resText.indexOf('{');
      const jsonEnd = resText.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        return JSON.parse(resText.substring(jsonStart, jsonEnd + 1));
      }
    } catch (error) {
      console.error("Claude API call failed, falling back...", error);
    }
  }

  // Secondary Fallback: Google Gemini API (since the system is powered by Google)
  if (geminiKey) {
    try {
      console.log("Attempting Gemini API extraction...");
      const { GoogleGenAI } = require('@google/generative-ai');
      // Import the correct package. We'll support the standard '@google/generative-ai' module.
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `Parse the following client description into structured JSON based on this schema:
      {
        "clientName": "Primary client name",
        "businessType": "Primary niche or business type",
        "country": "US, India, UK, or Other",
        "products": ["Services requested"],
        "setupFee": 800,
        "monthlyFee": 299,
        "currency": "₹",
        "governingLaw": "Governing state or country",
        "cancellationTerms": "cancellation notice terms",
        "ipTermsCode": "Dashboard code ownership terms",
        "ipTermsModel": "AI model weights ownership terms",
        "complianceNotes": "Compliance and clinical/operational guidelines",
        "deliverables": ["List of specific deliverables"],
        "phasedRollout": [{"phase": "Week 1", "detail": "setup"}]
      }
      
      Description:
      "${rawText}"
      
      Respond with ONLY the JSON object. No Markdown wrappers.`;

      const result = await model.generateContent(prompt);
      const resText = result.response.text();
      const jsonStart = resText.indexOf('{');
      const jsonEnd = resText.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        return JSON.parse(resText.substring(jsonStart, jsonEnd + 1));
      }
    } catch (error) {
      console.error("Gemini API call failed, falling back...", error);
    }
  }

  // Final deterministic fallback
  return regexParserFallback(rawText);
}

module.exports = {
  extractClientInfo
};
