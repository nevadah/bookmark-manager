import { AIProvider } from "./types";
import { callOpenAICompatible } from "./openai-compatible";
import { TAG_SUGGESTION_PROMPT } from "./prompts";

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
            TAG_SUGGESTION_PROMPT,
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
