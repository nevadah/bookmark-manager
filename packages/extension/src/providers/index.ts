import { Settings } from "@bookmark-manager/shared";
import { AIProvider } from "./types";
import { AnthropicProvider } from "./anthropic";
import { OpenAIProvider } from "./openai";
import { AzureOpenAIProvider } from "./azure-openai";
import { OpenRouterProvider } from "./openrouter";

export function createProvider(settings: Settings, apiKey: string): AIProvider {
  switch (settings.aiProvider) {
    case 'anthropic':
      return new AnthropicProvider(apiKey);
    case 'openai':
      return new OpenAIProvider(apiKey);
    case 'azure-openai':
      if (!settings.azureEndpoint || !settings.azureDeployment) {
        throw new Error('Azure endpoint and deployment must be specified for Azure OpenAI provider');
      }
      return new AzureOpenAIProvider(apiKey, settings.azureEndpoint, settings.azureDeployment);
    case 'openrouter':
      if (!settings.openRouterModel) {
        throw new Error('OpenRouter model must be specified for OpenRouter provider');
      }
      return new OpenRouterProvider(apiKey, settings.openRouterModel);
    default: {
        const _exhaustive: never = settings.aiProvider;
        throw new Error(`Unknown provider: ${String(_exhaustive)}`);
    }
  }
}
