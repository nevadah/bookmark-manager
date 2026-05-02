export async function callOpenAICompatible(
    endpoint: string,
    authHeaders: Record<string, string>,
    model: string,
    systemPrompt: string,
    userMessage: string
): Promise<string[]> {
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...authHeaders
        },
        body: JSON.stringify({
            model: model,
            max_tokens: 256,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage }
            ]
        })
    });

    if (!response.ok) {
        console.error('Error from OpenAI-compatible API:', response.status, await response.text());
        return [];
    }

    try {
        const data = await response.json();
        const text = data.choices[0].message.content;
        return JSON.parse(text);
    } catch (error) {
        console.error('Error parsing response from OpenAI-compatible API:', error);
        return [];
    }
}