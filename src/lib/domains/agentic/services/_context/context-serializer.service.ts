import type { 
  ComposedContext,
  SerializationFormat 
} from '~/lib/domains/agentic/types'
import { StructuredContextSerializer } from '~/lib/domains/agentic/services/serializers/structured-serializer'
import { XMLContextSerializer } from '~/lib/domains/agentic/services/serializers/xml-serializer'
import { MinimalContextSerializer } from '~/lib/domains/agentic/services/serializers/minimal-serializer'
import { NarrativeContextSerializer } from '~/lib/domains/agentic/services/serializers/narrative-serializer'

/**
 * Main serializer service that delegates to format-specific serializers.
 * Follows Rule of 6 by keeping only essential coordination logic.
 */
export class ContextSerializerService {
  private readonly structuredSerializer = new StructuredContextSerializer()
  private readonly xmlSerializer = new XMLContextSerializer()
  private readonly minimalSerializer = new MinimalContextSerializer()
  private readonly narrativeSerializer = new NarrativeContextSerializer()

  serialize(context: ComposedContext, format: SerializationFormat): string {
    switch (format.type) {
      case 'structured':
        return this.structuredSerializer.serialize(context, format.includeMetadata)
      case 'narrative':
        return this.narrativeSerializer.serialize(context)
      case 'minimal':
        return this.minimalSerializer.serialize(context)
      case 'xml':
        return this.xmlSerializer.serialize(context)
      default: {
        // Exhaustiveness check - if new format types are added, TypeScript will error
        const _exhaustiveCheck: never = format.type
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        void _exhaustiveCheck
        return this.structuredSerializer.serialize(context, false)
      }
    }
  }
}