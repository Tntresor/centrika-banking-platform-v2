// server/routes/claude-routes.js - CommonJS version
const express = require("express");
const fs = require("fs").promises;
const path = require("path");

const router = express.Router();

// Initialize Anthropic client
let anthropic = null;

try {
  const Anthropic = require("@anthropic-ai/sdk");
  if (process.env.ANTHROPIC_API_KEY) {
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    console.log("✅ Claude AI client initialized");
  } else {
    console.log("⚠️  ANTHROPIC_API_KEY not found in environment");
  }
} catch (error) {
  console.log(
    "⚠️  Anthropic SDK not installed or error loading:",
    error.message,
  );
}

// Helper function to check if Claude is available
function checkClaude() {
  if (!anthropic) {
    throw new Error(
      "Claude AI not available. Check ANTHROPIC_API_KEY and SDK installation.",
    );
  }
}

// Code Review Endpoint
router.post("/code-review", async (req, res) => {
  try {
    checkClaude();

    const { filePath, codeContent, reviewType } = req.body;

    const reviewPrompt = `Please review this banking application code for:

${
  reviewType === "security"
    ? `
SECURITY REVIEW:
- Authentication vulnerabilities
- Data validation issues  
- SQL injection risks
- XSS vulnerabilities
- Sensitive data exposure
- Authorization flaws
`
    : ""
}

${
  reviewType === "performance"
    ? `
PERFORMANCE REVIEW:
- Database query optimization
- Memory usage issues
- API response times
- Caching opportunities
- Resource management
`
    : ""
}

${
  reviewType === "architecture"
    ? `
ARCHITECTURE REVIEW:
- Code organization
- Design patterns
- Scalability concerns
- Maintainability
- Best practices adherence
`
    : ""
}

Code to review:
\`\`\`javascript
${codeContent}
\`\`\`

Provide specific, actionable recommendations.`;

    const result = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2000,
      temperature: 0.3,
      messages: [{ role: "user", content: reviewPrompt }],
    });

    res.json({
      success: true,
      filePath,
      reviewType,
      review: result.content[0].text,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Code review error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Code review failed",
    });
  }
});

// Full Codebase Analysis
router.post("/analyze-codebase", async (req, res) => {
  try {
    checkClaude();

    const { projectPath = "./server" } = req.body;

    // Read key files for analysis
    const keyFiles = [
      "index.js",
      "routes/auth-simple.js",
      "storage-supabase.js",
      "package.json",
    ];

    let codebaseOverview = "";

    for (const file of keyFiles) {
      try {
        // Fix file path - we're already in the server directory
        const filePath = path.join("./", file);
        const content = await fs.readFile(filePath, "utf8");
        codebaseOverview += `\n\n=== ${file} ===\n${content.slice(0, 1000)}...`;
      } catch (err) {
        console.log(`Could not read ${file}:`, err.message);
      }
    }

    const analysisPrompt = `Analyze this banking platform codebase:

${codebaseOverview}

Provide:
1. **Architecture Assessment** - Overall design quality
2. **Security Analysis** - Critical security issues
3. **Performance Review** - Optimization opportunities  
4. **Code Quality** - Best practices adherence
5. **Recommendations** - Priority improvements
6. **Technical Debt** - Areas needing refactoring

Focus on banking-specific concerns: data security, transaction integrity, compliance.`;

    const result = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 3000,
      temperature: 0.2,
      messages: [{ role: "user", content: analysisPrompt }],
    });

    res.json({
      success: true,
      analysis: result.content[0].text,
      analyzedFiles: keyFiles,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Codebase analysis error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Codebase analysis failed",
    });
  }
});

// Security Audit
router.post("/security-audit", async (req, res) => {
  try {
    checkClaude();

    const securityPrompt = `Perform a security audit of this banking platform architecture:

Components:
- Node.js/Express API server
- Supabase PostgreSQL database  
- JWT authentication
- Mobile banking interface
- Admin dashboard
- Replit development environment
- Vercel production deployment

Key Security Areas to Audit:
1. **Authentication & Authorization**
2. **Data Protection & Encryption**
3. **API Security**
4. **Database Security**
5. **Frontend Security**
6. **Infrastructure Security**
7. **Compliance** (PCI DSS, banking regulations)

Provide:
- Critical vulnerabilities found
- Risk assessment (High/Medium/Low)
- Specific remediation steps
- Best practices recommendations`;

    const result = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2500,
      temperature: 0.1,
      messages: [{ role: "user", content: securityPrompt }],
    });

    res.json({
      success: true,
      securityAudit: result.content[0].text,
      auditType: "comprehensive",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Security audit error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Security audit failed",
    });
  }
});

// Code Optimization Suggestions
router.post("/optimize", async (req, res) => {
  try {
    checkClaude();

    const { codeContent, optimizationType } = req.body;

    const optimizationPrompts = {
      performance: `Optimize this banking code for performance:
${codeContent}

Focus on:
- Database query optimization
- Caching strategies  
- Memory usage reduction
- API response time improvement`,

      security: `Enhance security in this banking code:
${codeContent}

Focus on:
- Input validation
- Authentication strengthening
- Data sanitization
- Secure coding practices`,

      maintainability: `Improve code maintainability:
${codeContent}

Focus on:
- Code organization
- Documentation
- Error handling
- Testing strategies`,
    };

    const prompt =
      optimizationPrompts[optimizationType] || optimizationPrompts.performance;

    const result = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1800,
      temperature: 0.3,
      messages: [{ role: "user", content: prompt }],
    });

    res.json({
      success: true,
      optimizedCode: result.content[0].text,
      optimizationType,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Code optimization error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Code optimization failed",
    });
  }
});

// Health check for Claude AI
router.get("/health", (req, res) => {
  res.json({
    claude_available: !!anthropic,
    anthropic_key_set: !!process.env.ANTHROPIC_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
