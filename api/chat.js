// Azure Static Web Apps API function - /api/chat
// This runs serverless on Azure, keeping your API key secure

const https = require('https');

module.exports = async function (context, req) {
    const { message, history } = req.body;
    
    if (!message) {
        context.res = { status: 400, body: { error: 'Message required' } };
        return;
    }

    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    
    const systemPrompt = `You are a professional AI assistant for CMB Networks LLC, a cybersecurity advisory firm led by Corey Bobb. Your job is to answer questions about CMB Networks services, help qualify potential clients, and collect contact information from interested visitors.

CMB Networks Services and Pricing:
- Fractional CISO Retainer: Starting at $5,000/month (10-20 hrs/month). Ongoing security leadership, strategy, executive reporting, policy, vendor risk, incident response oversight.
- HIPAA/HITRUST Readiness: From $15,000 fixed-scope. Gap assessment, remediation roadmap, all 19 HITRUST control domains. Lead assessor credentials.
- SOC 2 Readiness: From $12,000 fixed-scope. Gap assessment, policy development, evidence framework, audit preparation.
- AI/LLM Governance: From $10,000 fixed-scope. ISO 42001 AIMS aligned, NIST AI RMF, prompt injection controls, usage policy design.
- PCI-DSS Compliance: From $8,000 fixed-scope. Scoping, gap assessment, remediation, audit prep. Former QSA credentials.
- Security Program Advisory: $200-$350/hr or fixed-scope. M&A due diligence, incident response planning, third-party risk, architecture review.

About Corey Bobb:
- 20+ years cybersecurity experience
- Former CISO at WMATA ($12.3M budget, 50+ person team)
- Currently Senior Manager at Cigna Fortune 15 healthcare enterprise
- HITRUST CCSFP Lead Assessor - 25+ healthcare organizations assessed
- ISO 42001 AIMS Lead Auditor
- Former PCI-DSS QSA and SOC Auditor
- Credentials: CISSP, C-CISO, HITRUST CCSFP, ISO 42001, CCNA, MBA

Key facts:
- Remote-first, private sector only
- Based in Key West, FL
- Contact: corey@cmbnetworks.net or 407.551.9139

Your behavior:
- Be professional, concise, and helpful
- Answer questions about services, pricing, credentials, and background
- When someone seems interested or asks about next steps, ask for their name, company, and email so Corey can follow up
- Do not make up information - only use what is provided above
- Keep responses under 150 words unless a detailed explanation is truly needed
- If asked something outside your knowledge, suggest they email corey@cmbnetworks.net directly`;

    const messages = [
        ...(history || []),
        { role: 'user', content: message }
    ];

    const requestBody = JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
        system: systemPrompt,
        messages: messages
    });

    const options = {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'Content-Length': Buffer.byteLength(requestBody)
        }
    };

    try {
        const response = await new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve(JSON.parse(data)));
            });
            req.on('error', reject);
            req.write(requestBody);
            req.end();
        });

        const reply = response.content[0].text;
        
        // Check if we should send a lead notification
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
        if (emailRegex.test(message) || emailRegex.test(reply)) {
            // Log lead for Azure Function to pick up
            context.log('LEAD_DETECTED:', { message, reply, timestamp: new Date().toISOString() });
        }

        context.res = {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            body: { reply, role: 'assistant' }
        };
    } catch (error) {
        context.log.error('API Error:', error);
        context.res = {
            status: 500,
            body: { error: 'Service temporarily unavailable. Please email corey@cmbnetworks.net directly.' }
        };
    }
};
