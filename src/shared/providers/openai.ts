import { AIProvider } from "./types";
import { callOpenAICompatible } from "./openai-compatible";

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
        throw new Error('Summarization not implemented for OpenAI provider yet');
    }
}