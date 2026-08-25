const https = require('https');

module.exports = async function (context, req) {
    context.log('Chat function triggered');
    
    if (req.method !== 'POST') {
        context.res = { status: 405, body: 'Method not allowed' };
        return;
    }

    const body = req.body;
    if (!body || !body.message) {
        context.res = { status: 400, body: { error: 'Message required' } };
        return;
    }

    const { message, history } = body;
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    
    if (!ANTHROPIC_API_KEY) {
        context.log.error('ANTHROPIC_API_KEY not set');
        context.res = { status: 500, body: { error: 'API key not configured' } };
        return;
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
- Former CISO at WMATA, second largest transportation org in America
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
            const request = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch(e) {
                        reject(new Error('Failed to parse response'));
                    }
                });
            });
            request.on('error', reject);
            request.write(requestBody);
            request.end();
        });

        if (response.error) {
            context.log.error('Anthropic error:', response.error);
            context.res = { status: 500, body: { error: 'AI service error' } };
            return;
        }

        const reply = response.content && response.content[0] ? response.content[0].text : 'I could not generate a response.';
        
        context.res = {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            body: { reply }
        };
    } catch (error) {
        context.log.error('Function error:', error.message);
        context.res = {
            status: 500,
            body: { error: 'Service temporarily unavailable' }
        };
    }
};
