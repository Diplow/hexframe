export interface TokenizerService {
  count(text: string): number
  truncate(text: string, maxTokens: number): string
}

export class SimpleTokenizerService implements TokenizerService {
  // Simple approximation: ~4 characters per token
  private readonly CHARS_PER_TOKEN = 4

  count(text: string): number {
    return Math.ceil(text.length / this.CHARS_PER_TOKEN)
  }

  truncate(text: string, maxTokens: number): string {
    const maxChars = maxTokens * this.CHARS_PER_TOKEN
    if (text.length <= maxChars) return text
    
    // Truncate at word boundary
    const truncated = text.substring(0, maxChars)
    const lastSpace = truncated.lastIndexOf(' ')
    
    return lastSpace > 0 
      ? truncated.substring(0, lastSpace) + '...'
      : truncated + '...'
  }
}