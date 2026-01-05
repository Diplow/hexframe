import type {
  CanvasContext,
  CanvasContextOptions,
  CanvasContextStrategy
} from '~/lib/domains/agentic/types'
import type { MapContext } from '~/lib/domains/mapping/utils'
import type { ICanvasStrategy } from '~/lib/domains/agentic/services/canvas-strategies/strategy.interface'

export class CanvasContextBuilder {
  constructor(
    private readonly strategies: Map<CanvasContextStrategy, ICanvasStrategy>
  ) {}

  async build(
    mapContext: MapContext,
    strategy: CanvasContextStrategy,
    options?: CanvasContextOptions
  ): Promise<CanvasContext> {
    const strategyImpl = this.strategies.get(strategy) ?? this.strategies.get('standard')!
    return strategyImpl.build(mapContext, options ?? {})
  }
}