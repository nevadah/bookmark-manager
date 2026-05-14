import { TAG_SUGGESTION_PROMPT } from '@bookmark-manager/shared';

type AIProvider = 'anthropic' | 'openai' | 'azure-openai' | 'openrouter';

function getConfig(): { provider: AIProvider; apiKey: string; azureEndpoint?: string; azureDeployment?: string; openRouterModel?: string } | null {
  const provider = process.env.AI_PROVIDER as AIProvider | undefined;
  const apiKey = process.env.AI_API_KEY;
  if (!provider || !apiKey) return null;
  return {
    provider,
    apiKey,
    azureEndpoint: process.env.AI_AZURE_ENDPOINT,
    azureDeployment: process.env.AI_AZURE_DEPLOYMENT,
    openRouterModel: process.env.AI_OPENROUTER_MODEL,
  };
}

function buildPromptString(url: string, title: string, description: string, existingTags: string[]): string {
  return `URL: ${url}\nTitle: ${title}\nDescription: ${description}\nExisting tags: ${existingTags.join(', ')}`;
}

async function callOpenAICompatible(
  endpoint: string,
  headers: Record<string, string>,
  model: string,
  promptString: string
): Promise<string[]> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({
      model,
      max_tokens: 256,
      messages: [
        { role: 'system', content: TAG_SUGGESTION_PROMPT },
        { role: 'user', content: promptString },
      ],
    }),
  });
  if (!response.ok) return [];
  const data = await response.json() as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content;
  if (!text) return [];
  return JSON.parse(text) as string[];
}

export async function suggestTags(
  url: string,
  title: string,
  description: string,
  existingTags: string[]
): Promise<string[]> {
  const config = getConfig();
  if (!config) return [];

  const promptString = buildPromptString(url, title, description, existingTags);

  try {
    switch (config.provider) {
      case 'anthropic': {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': config.apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 256,
            system: TAG_SUGGESTION_PROMPT,
            messages: [{ role: 'user', content: promptString }],
          }),
        });
        if (!response.ok) return [];
        const data = await response.json() as { content?: { text?: string }[] };
        const text = data.content?.[0]?.text;
        if (!text) return [];
        return JSON.parse(text) as string[];
      }
      case 'openai':
        return await callOpenAICompatible(
          'https://api.openai.com/v1/chat/completions',
          { Authorization: `Bearer ${config.apiKey}` },
          'gpt-4o-mini',
          promptString
        );
      case 'azure-openai': {
        if (!config.azureEndpoint || !config.azureDeployment) return [];
        const endpoint = `${config.azureEndpoint}/openai/deployments/${config.azureDeployment}/chat/completions?api-version=2024-02-01`;
        return await callOpenAICompatible(
          endpoint,
          { 'api-key': config.apiKey },
          config.azureDeployment,
          promptString
        );
      }
      case 'openrouter': {
        if (!config.openRouterModel) return [];
        return await callOpenAICompatible(
          'https://openrouter.ai/api/v1/chat/completions',
          { Authorization: `Bearer ${config.apiKey}` },
          config.openRouterModel,
          promptString
        );
      }
      default:
        return [];
    }
  } catch {
    return [];
  }
}
