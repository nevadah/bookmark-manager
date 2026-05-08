import { AIProviderID } from '@bookmark-manager/shared';

export interface AIProvider {
  readonly name: string;
  readonly id: AIProviderID;
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
