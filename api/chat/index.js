const { app } = require('@azure/functions');
const https = require('https');

app.http('chat', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log('Chat function triggered');

        let body;
        try {
            body = await request.json();
        } catch (e) {
            return { status: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
        }

        if (!body || !body.message) {
            return { status: 400, body: JSON.stringify({ error: 'Message required' }) };
        }

        const { message, history } = body;
        const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

        if (!ANTHROPIC_API_KEY) {
            context.log.error('ANTHROPIC_API_KEY not set');
            return { status: 500, body: JSON.stringify({ error: 'API key not configured' }) };
        }

        const systemPrompt = `You are a professional assistant for CMBNetworks LLC, a cybersecurity advisory firm led by Corey Bobb. Answer questions about services, pricing, and credentials. Be concise and professional.

Services and pricing:
- Fractional CISO Retainer: from $5,000/month (10-20 hrs/month)
- HIPAA/HITRUST Readiness: from $15,000 fixed-scope
- SOC 2 Readiness: from $12,000 fixed-scope
- AI/LLM Governance: from $10,000 fixed-scope
- PCI-DSS Compliance: from $8,000 fixed-scope
- NIST 800-53/800-171: from $10,000 fixed-scope
- Security Advisory: $200-$350/hr

About Corey Bobb:
- 20+ years cybersecurity experience
- Former CISO at WMATA, 2nd largest transportation organization in the United States
- CISSP, C-CISO, HITRUST CCSFP, ISO 42001 AIMS Lead Auditor, CCNA
- Former PCI-DSS QSA and SOC Auditor
- Lead HITRUST assessor across 25+ healthcare organizations

Contact: corey@cmbnetworks.net or 407.551.9139
Private sector only. Remote-first.

When someone seems interested, ask for their name, company, and email so Corey can follow up. Keep responses under 120 words.`;

        const messages = [
            ...(history || []).slice(-6),
            { role: 'user', content: message }
        ];

        const requestBody = JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 300,
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
                    res.on('end', () => {
                        try { resolve(JSON.parse(data)); }
                        catch (e) { reject(new Error('Failed to parse response')); }
                    });
                });
                req.on('error', reject);
                req.write(requestBody);
                req.end();
            });

            if (response.error) {
                context.log.error('Anthropic error:', response.error);
                return { status: 500, body: JSON.stringify({ error: 'AI service error' }) };
            }

            const reply = response.content && response.content[0] ? response.content[0].text : 'I could not generate a response.';

            return {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reply })
            };
        } catch (error) {
            context.log.error('Function error:', error.message);
            return {
                status: 500,
                body: JSON.stringify({ error: 'Service temporarily unavailable' })
            };
        }
    }
});
