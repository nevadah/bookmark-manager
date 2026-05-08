import { AIProvider } from "./types";
import { TAG_SUGGESTION_PROMPT } from "@bookmark-manager/shared";

export class AnthropicProvider implements AIProvider {
    readonly id = 'anthropic';
    readonly name = 'Anthropic (Claude)';

    constructor(private readonly apiKey: string) {
    }

    async suggestTags(
        url: string,
        title: string,
        description: string,
        existingTags: string[]
    ): Promise<string[]> {
        const promptString = `
            URL: ${url}
            Title: ${title}
            Description: ${description}
            Existing tags: ${existingTags.join(', ')}`;
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: "claude-haiku-4-5-20251001",
                max_tokens: 256,
                system: TAG_SUGGESTION_PROMPT,
                messages: [
                    { role: "user", content: promptString }
                ]
            })
        });

        if (!response.ok) {
            console.error('Error from Anthropic API:', response.status, await response.text());
            return [];
        }

        try {
            const data = await response.json();
            const text = data.content[0].text;
            return JSON.parse(text);
        } catch (error) {
            console.error('Error parsing response from Anthropic API:', error);
            return [];
        }
    }

    async summarizePage(
        _url: string,
        _title: string,
        _content: string
    ): Promise<string> {
        throw new Error('summarizePage is not implemented yet for AnthropicProvider');
    }
}
