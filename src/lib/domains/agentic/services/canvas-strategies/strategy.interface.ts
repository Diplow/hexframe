import type { CanvasContext, CanvasContextOptions } from '../../types'

export interface ICanvasStrategy {
  build(
    centerCoordId: string,
    options: CanvasContextOptions
  ): Promise<CanvasContext>
}