// server/services/claude-service.js
import Anthropic from "@anthropic-ai/sdk";

class ClaudeService {
    constructor() {
        this.anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });
    }

    // Customer Support Chatbot
    async customerSupport(userMessage, userContext = {}) {
        try {
            const systemPrompt = `You are Centrika Bank's AI assistant. You help customers with banking questions, account inquiries, and financial guidance. Be helpful, professional, and secure. Never ask for sensitive information like passwords or PINs.

Customer Context:
- Account Type: ${userContext.accountType || "Standard"}
- KYC Level: ${userContext.kycLevel || "Basic"}
- Account Balance: ${userContext.balance ? "$" + userContext.balance : "Available"}

Guidelines:
- Be friendly and professional
- Provide clear, accurate banking information
- For complex issues, suggest contacting human support
- Never process transactions via chat
- Always prioritize security`;

            const message = await this.anthropic.messages.create({
                model: "claude-3-sonnet-20240229",
                max_tokens: 1000,
                temperature: 0.7,
                system: systemPrompt,
                messages: [
                    {
                        role: "user",
                        content: userMessage,
                    },
                ],
            });

            return {
                success: true,
                response: message.content[0].text,
                usage: message.usage,
            };
        } catch (error) {
            console.error("Claude API Error:", error);
            return {
                success: false,
                response:
                    "I'm sorry, I'm temporarily unavailable. Please contact our support team for assistance.",
                error: error.message,
            };
        }
    }

    // Transaction Analysis
    async analyzeTransactions(
        transactions,
        analysisType = "spending_insights",
    ) {
        try {
            const transactionData = JSON.stringify(transactions.slice(0, 20)); // Limit for API

            const prompts = {
                spending_insights: `Analyze these banking transactions and provide spending insights:
${transactionData}

Please provide:
1. Spending patterns and categories
2. Unusual transactions or potential concerns
3. Money-saving suggestions
4. Budget recommendations

Keep it concise and actionable.`,

                fraud_detection: `Analyze these transactions for potential fraud indicators:
${transactionData}

Look for:
1. Unusual spending patterns
2. Suspicious transaction amounts or timing
3. Potential security concerns
4. Risk assessment

Provide a risk score (1-10) and explanation.`,

                financial_advice: `Based on these transactions, provide personalized financial advice:
${transactionData}

Include:
1. Budgeting recommendations
2. Savings opportunities
3. Investment suggestions
4. Financial health assessment`,
            };

            const message = await this.anthropic.messages.create({
                model: "claude-3-sonnet-20240229",
                max_tokens: 1500,
                temperature: 0.3,
                messages: [
                    {
                        role: "user",
                        content:
                            prompts[analysisType] || prompts.spending_insights,
                    },
                ],
            });

            return {
                success: true,
                analysis: message.content[0].text,
                type: analysisType,
                usage: message.usage,
            };
        } catch (error) {
            console.error("Transaction Analysis Error:", error);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    // Admin Insights
    async generateAdminInsights(bankData) {
        try {
            const systemPrompt = `You are an AI analyst for Centrika Bank's management dashboard. Analyze banking data and provide executive insights.

Focus on:
- User growth and engagement trends
- Transaction volume and patterns  
- Risk assessment and recommendations
- Business optimization opportunities
- Regulatory compliance insights

Be concise, data-driven, and actionable.`;

            const dataPrompt = `Analyze this banking platform data:

Users: ${bankData.totalUsers || 0}
Active Users: ${bankData.activeUsers || 0}
Total Transactions: ${bankData.totalTransactions || 0}
Transaction Volume: $${bankData.transactionVolume || 0}
KYC Completion Rate: ${bankData.kycRate || 0}%
Average Account Balance: $${bankData.avgBalance || 0}

Recent Trends:
${JSON.stringify(bankData.trends || {})}

Provide executive summary with key insights and recommendations.`;

            const message = await this.anthropic.messages.create({
                model: "claude-3-sonnet-20240229",
                max_tokens: 1200,
                temperature: 0.4,
                system: systemPrompt,
                messages: [
                    {
                        role: "user",
                        content: dataPrompt,
                    },
                ],
            });

            return {
                success: true,
                insights: message.content[0].text,
                usage: message.usage,
            };
        } catch (error) {
            console.error("Admin Insights Error:", error);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    // Natural Language Query Processing
    async processNaturalQuery(query, userContext) {
        try {
            const systemPrompt = `You are Centrika Bank's AI that converts natural language banking queries into structured responses or actions.

User Context:
- User ID: ${userContext.userId}
- Account Type: ${userContext.accountType || "Standard"}
- Available Balance: $${userContext.balance || 0}

For queries like:
- "Show my recent transactions" → Suggest API call or data retrieval
- "How much did I spend on food?" → Category analysis
- "Can I afford this purchase?" → Budget check
- "When is my next payment due?" → Payment schedule

Respond with helpful information or suggest specific actions the user can take.`;

            const message = await this.anthropic.messages.create({
                model: "claude-3-sonnet-20240229",
                max_tokens: 800,
                temperature: 0.5,
                system: systemPrompt,
                messages: [
                    {
                        role: "user",
                        content: query,
                    },
                ],
            });

            return {
                success: true,
                response: message.content[0].text,
                usage: message.usage,
            };
        } catch (error) {
            console.error("Natural Query Error:", error);
            return {
                success: false,
                error: error.message,
            };
        }
    }
}

export default new ClaudeService();
