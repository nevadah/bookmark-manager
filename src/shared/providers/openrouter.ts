import { AIProvider } from "./types";
import { callOpenAICompatible } from "./openai-compatible";

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
            `You are a bookmark tagging assistant. The user has an existing tag 
                vocabulary. Suggest tags for the given bookmark using existing tags where 
                appropriate, and introducing new tags only when nothing in the vocabulary fits.
                Respond with a JSON array of tag strings only. No explanation`,
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