import { RootData } from "@bookmark-manager/shared";

export interface StorageProvider {
  readData(): Promise<RootData>;
  writeData(data: RootData): Promise<void>;
}