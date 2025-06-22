// server/routes/claude-routes.js
import express from "express";
import ClaudeService from "../services/claude-service.js";
import fs from "fs/promises";
import path from "path";

const router = express.Router();

// Code Review Endpoint
router.post("/code-review", async (req, res) => {
    try {
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

        const result = await ClaudeService.anthropic.messages.create({
            model: "claude-3-sonnet-20240229",
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
            error: "Code review failed",
        });
    }
});

// Full Codebase Analysis
router.post("/analyze-codebase", async (req, res) => {
    try {
        const { projectPath = "./server" } = req.body;

        // Read key files for analysis
        const keyFiles = [
            "index.js",
            "routes/auth.js",
            "storage-supabase.js",
            "package.json",
        ];

        let codebaseOverview = "";

        for (const file of keyFiles) {
            try {
                const filePath = path.join(projectPath, file);
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

        const result = await ClaudeService.anthropic.messages.create({
            model: "claude-3-sonnet-20240229",
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
            error: "Codebase analysis failed",
        });
    }
});

// Security Audit
router.post("/security-audit", async (req, res) => {
    try {
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

        const result = await ClaudeService.anthropic.messages.create({
            model: "claude-3-sonnet-20240229",
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
            error: "Security audit failed",
        });
    }
});

// Code Optimization Suggestions
router.post("/optimize", async (req, res) => {
    try {
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
            optimizationPrompts[optimizationType] ||
            optimizationPrompts.performance;

        const result = await ClaudeService.anthropic.messages.create({
            model: "claude-3-sonnet-20240229",
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
            error: "Code optimization failed",
        });
    }
});

export default router;
