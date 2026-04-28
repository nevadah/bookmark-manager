import { Settings } from "../types";
import { AIProvider } from "./types";

export function createProvider(settings: Settings): AIProvider {
  switch (settings.aiProvider) {
    case 'anthropic':
    case 'openai':
    case 'azure-openai':
    case 'openrouter':
        throw new Error(`AI provider ${settings.aiProvider} is not implemented yet.`);
    default: {
        const _exhaustive: never = settings.aiProvider;
        throw new Error(`Unknown provider: ${String(_exhaustive)}`);
    }
  }
}
