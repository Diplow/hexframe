# Hexframe Research Documentation

This directory contains research reports and analyses that inform Hexframe's architectural decisions.

## Available Reports

### AI Agent Orchestration Research (2024-2025)

**Full Report**: [`ai-agent-orchestration-2024-2025.md`](./ai-agent-orchestration-2024-2025.md) (42KB)
- Comprehensive analysis of AI agent orchestration frameworks
- Deep dive into patterns, primitives, and best practices
- Academic research citations and framework comparisons
- Detailed recommendations for Hexframe

**Quick Reference**: [`orchestration-patterns-summary.md`](./orchestration-patterns-summary.md) (11KB)
- Condensed guide with key patterns and frameworks
- Quick decision guides and comparison tables
- Implementation snippets and metrics
- Strategic positioning and roadmap

### Research Methodology

The orchestration research involved:
- Analysis of 7+ major frameworks (LangGraph, CrewAI, AutoGen, Semantic Kernel, etc.)
- Review of 10+ academic papers from 2024-2025
- Examination of production best practices and deployment patterns
- Investigation of spatial/hexagonal knowledge representation systems
- Comparison with current Hexframe implementation

### Key Findings Summary

1. **Hexframe's architecture is well-aligned** with emerging best practices
2. **Post-order flattening** in 'plan' mode matches current research (AgentOrchestra)
3. **Hexagonal structure** has neuroscience backing (grid cell research)
4. **Context engineering** is more important than prompt engineering
5. **State management** (checkpointing) is the main enhancement opportunity

### How to Use These Documents

**For Quick Reference**:
- Start with `orchestration-patterns-summary.md`
- Use comparison tables to understand framework differences
- Check the "Hexframe Alignment" section for validation

**For Deep Understanding**:
- Read `ai-agent-orchestration-2024-2025.md` in full
- Focus on sections relevant to current work
- Review academic papers cited for deeper insights

**For Implementation**:
- See "Specific Technical Patterns" section in full report
- Check "Recommendations for Hexframe" for prioritized enhancements
- Review "Development Roadmap" for phased approach

### Next Steps

Based on this research, recommended actions:

1. **Immediate** (Phase 1):
   - Implement structured checkpointing in execution history
   - Add error handling and retry logic to hexecute
   - Track token usage and execution metrics

2. **Near-term** (Phase 2):
   - Add long-term memory with vector embeddings
   - Implement memory consolidation pattern
   - Enhance context optimization with token budgets

3. **Future** (Phase 3+):
   - Support parallel subtask execution
   - Add conditional routing via composed tiles
   - Build orchestrator template marketplace

### Related Documentation

- **System Philosophy**: `/src/app/SYSTEM.md`
- **Domain Model**: `/src/lib/domains/README.md`
- **Current hexecute Implementation**: `/src/server/api/routers/agentic/agentic.ts`
- **Prompt Executor**: `/src/lib/domains/agentic/services/prompt-executor.service.ts`

### Contributing

When adding new research:
1. Create dated report: `{topic}-{YYYY-MM-DD}.md`
2. Include methodology and sources
3. Provide actionable recommendations
4. Update this README with summary
5. Link to relevant code/documentation

### Questions or Feedback

If you have questions about this research or suggestions for future investigations, please open an issue or discuss in team channels.

---

**Last Updated**: 2025-11-10
**Researcher**: Claude (Anthropic)