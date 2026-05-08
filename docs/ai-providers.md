# AI Providers

## Provider interface

All AI providers implement a single interface defined in `packages/extension/src/providers/types.ts`:

```typescript
interface AIProvider {
  readonly name: string;
  suggestTags(
    url: string,
    title: string,
    description: string,
    existingTags: string[]
  ): Promise<string[]>;
  summarizePage(
    url: string,
    title: string,
    content: string
  ): Promise<string>;
}
```

### `suggestTags`

Returns an array of tag strings for a bookmark. The `existingTags` parameter passes the user's full current tag vocabulary so the model can suggest tags that fit the existing taxonomy rather than inventing new ones.

The implementation must:
- Return only tag strings (no explanations, metadata, or extra structure)
- Return tags in `segment` or `segment/segment` format (no leading/trailing `/`)
- Return an empty array if no tags are appropriate — not an error
- Not throw for API errors reachable in normal operation; return an empty array and log the error

### `summarizePage`

Returns a one-to-two sentence summary of the page content. Used for the optional description field. Post-MVP.

## Implemented providers

### Anthropic

- Model: `claude-haiku-4-5-20251001` (fast, cheap, sufficient for tag suggestion)
- Auth: `x-api-key` header
- Endpoint: `https://api.anthropic.com/v1/messages`

### OpenAI

- Model: `gpt-4o-mini`
- Auth: `Authorization: Bearer <key>` header
- Endpoint: `https://api.openai.com/v1/chat/completions`

### Azure OpenAI

- Same API shape as OpenAI
- Endpoint and deployment name are user-configured (set during setup)
- Auth: `api-key` header

### OpenRouter

- Same API shape as OpenAI
- Model: user-configured
- Auth: `Authorization: Bearer <key>` header
- Endpoint: `https://openrouter.ai/api/v1/chat/completions`

## Adding a new provider

1. Create `packages/extension/src/providers/<name>.ts` implementing `AIProvider`.
2. Add the provider ID to the `AIProviderID` union type in `packages/shared/src/shared/types/index.ts`.
3. Add a case to the factory function in `packages/extension/src/providers/index.ts` that instantiates the provider from settings.
4. Add the provider as an option in the settings UI.

No other changes are needed — the rest of the codebase depends only on the `AIProvider` interface.

## Prompt design

Tag suggestion prompt constants live in `packages/shared/src/shared/providers/prompts.ts` and are shared between the extension and the server. Prompt structure (all providers):

```
System: You are a bookmark tagging assistant. The user has an existing tag 
vocabulary. Suggest tags for the given bookmark using existing tags where 
appropriate, and introducing new tags only when nothing in the vocabulary fits.
Respond with a JSON array of tag strings only. No explanation.

User: URL: <url>
Title: <title>
Description: <description>
Existing tags: <comma-separated list>
```

Parsing: expect a JSON array in the response. If parsing fails, return an empty array rather than surfacing an error to the user.
