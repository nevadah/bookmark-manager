import { AIProvider } from "./types";
import { callOpenAICompatible } from "./openai-compatible";
import { TAG_SUGGESTION_PROMPT } from "./prompts";

export class OpenAIProvider implements AIProvider {
    readonly id = 'openai';
    readonly name = 'OpenAI';

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
        return await callOpenAICompatible(
            'https://api.openai.com/v1/chat/completions',
            { 'Authorization': `Bearer ${this.apiKey}` },
            'gpt-4o-mini',
            TAG_SUGGESTION_PROMPT,
            promptString
        );
    }

    async summarizePage(
        _url: string,
        _title: string,
        _content: string
    ): Promise<string> {
        throw new Error('Summarization not implemented for OpenAI provider yet');
    }
}