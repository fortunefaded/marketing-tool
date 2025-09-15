// Temporary stub for MetaApiService to avoid build errors during migration
export class MetaApiService {
  constructor(_config: any) {
    // Stub implementation
  }
  
  async getInsights(_options: any): Promise<any[]> {
    throw new Error('MetaApiService temporarily disabled during migration')
  }
  
  async getAdCreatives(_adIds: string[]): Promise<any[]> {
    throw new Error('MetaApiService temporarily disabled during migration')
  }
  
  async getUser(): Promise<any> {
    throw new Error('MetaApiService temporarily disabled during migration')
  }
}