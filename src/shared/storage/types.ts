import { RootData } from "../types";

export interface StorageProvider {
  readData(): Promise<RootData>;
  writeData(data: RootData): Promise<void>;
}