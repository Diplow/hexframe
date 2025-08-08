export interface TokenizerService {
  count(text: string): number
  truncate(text: string, maxTokens: number): string
}

export class SimpleTokenizerService implements TokenizerService {
  // Simple approximation: ~4 characters per token
  private readonly CHARS_PER_TOKEN = 4

  count(text: string): number {
    if (!text) return 0
    return Math.ceil(text.length / this.CHARS_PER_TOKEN)
  }

  truncate(text: string, maxTokens: number): string {
    if (!text) return text
    if (maxTokens <= 0) return ''
    
    const maxChars = maxTokens * this.CHARS_PER_TOKEN
    if (text.length <= maxChars) return text
    
    // Truncate at word boundary
    const truncated = text.substring(0, maxChars)
    const lastSpace = truncated.lastIndexOf(' ')
    
    // Only use word boundary if it's not too far back (at least 80% of maxChars)
    return lastSpace > maxChars * 0.8 
      ? truncated.substring(0, lastSpace) + '...'
      : truncated + '...'
  }
}