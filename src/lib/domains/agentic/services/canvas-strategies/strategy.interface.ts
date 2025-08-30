import type { CanvasContext, CanvasContextOptions } from '~/lib/domains/agentic/types'

export interface ICanvasStrategy {
  build(
    centerCoordId: string,
    options: CanvasContextOptions
  ): Promise<CanvasContext>
}