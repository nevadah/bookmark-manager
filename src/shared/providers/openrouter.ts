import { AIProvider } from "./types";
import { callOpenAICompatible } from "./openai-compatible";
import { TAG_SUGGESTION_PROMPT } from "./prompts";

export class OpenRouterProvider implements AIProvider {
    readonly id = 'openrouter';
    readonly name = 'OpenRouter';

    constructor(private readonly apiKey: string, private readonly model: string) {
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
        return await callOpenAICompatible(
            'https://openrouter.ai/api/v1/chat/completions',
            { 'Authorization': `Bearer ${this.apiKey}` },
            this.model,
            TAG_SUGGESTION_PROMPT,
            promptString
        );
    }

    async summarizePage(
        _url: string,
        _title: string,
        _content: string
    ): Promise<string> {
        throw new Error('Summarization not implemented for OpenRouter provider yet');
    }
}