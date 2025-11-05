import type { CanvasContext, CanvasContextOptions } from '~/lib/domains/agentic/types'
import type { MapContext } from '~/lib/domains/mapping/utils'

export interface ICanvasStrategy {
  build(
    mapContext: MapContext,
    options: CanvasContextOptions
  ): Promise<CanvasContext>
}