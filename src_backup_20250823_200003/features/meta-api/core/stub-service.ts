// Temporary stub for MetaApiService to avoid build errors during migration
export class MetaApiService {
  constructor(config: any) {
    // Stub implementation
  }
  
  async getInsights(options: any): Promise<any[]> {
    throw new Error('MetaApiService temporarily disabled during migration')
  }
  
  async getAdCreatives(adIds: string[]): Promise<any[]> {
    throw new Error('MetaApiService temporarily disabled during migration')
  }
  
  async getUser(): Promise<any> {
    throw new Error('MetaApiService temporarily disabled during migration')
  }
}