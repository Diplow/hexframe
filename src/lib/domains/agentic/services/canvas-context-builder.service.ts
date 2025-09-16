import type { 
  CanvasContext, 
  CanvasContextOptions, 
  CanvasContextStrategy 
} from '~/lib/domains/agentic/types'
import type { ICanvasStrategy } from '~/lib/domains/agentic/services/canvas-strategies/strategy.interface'

export class CanvasContextBuilder {
  constructor(
    private readonly strategies: Map<CanvasContextStrategy, ICanvasStrategy>
  ) {}

  async build(
    centerCoordId: string,
    strategy: CanvasContextStrategy,
    options?: CanvasContextOptions
  ): Promise<CanvasContext> {
    const strategyImpl = this.strategies.get(strategy) ?? this.strategies.get('standard')!
    return strategyImpl.build(centerCoordId, options ?? {})
  }
}