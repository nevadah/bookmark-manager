import { AIProvider } from "./types";
import { callOpenAICompatible } from "./openai-compatible";

export class AzureOpenAIProvider implements AIProvider {
    readonly id = 'azure-openai';
    readonly name = 'Azure OpenAI';

    constructor(private readonly apiKey: string, private readonly endpoint: string, private readonly deployment: string) {
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
            `${this.endpoint}/openai/deployments/${this.deployment}/chat/completions?api-version=2024-02-01`,
            { 'api-key': this.apiKey },
            this.deployment,
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
        throw new Error('Summarization not implemented for Azure OpenAI provider yet');
    }
}
