# /design Command

## Purpose
Document the UX/UI design principles, visual decisions, and interaction patterns for implementing a solution. This optional but recommended follow-up to `/solution` or `/architecture` provides the design rationale and visual guidelines for the feature implementation.

## Command Syntax
```
/design #<issue-number>
```

## Prerequisites
- Issue must exist with `/issue` command
- Context must be gathered with `/context` command  
- Solution should be designed with `/solution` command
- Architecture may be documented with `/architecture` command
- Understanding of user needs and design goals

## Design Documentation Process

### 1. Review Foundation
- Load issue, context, and solution documentation
- Understand the user problem and selected solution
- Check for existing DESIGN.md files:
  - `/src/app/DESIGN.md` - Root design system (ALWAYS check)
  - `/src/app/COLORS.md` - Color philosophy and system
  - Component-specific DESIGN.md files in relevant directories
- Identify existing design patterns to follow
- Consider accessibility and usability requirements

### 2. Define Design Goals
- **User Experience Goals**: What should users feel/achieve
- **Design Principles**: Core values guiding decisions
- **Success Metrics**: How to measure design effectiveness
- **Constraints**: Technical or brand limitations

### 3. Document Visual Design
- **Color Palette**: Primary, secondary, and semantic colors
- **Typography**: Font choices and hierarchy
- **Spacing**: Padding, margins, and layout grid
- **Components**: Reusable UI elements
- **Icons & Assets**: Visual elements needed

### 4. Define Interactions
- **User Flows**: Path through the feature
- **Feedback Patterns**: How system responds to actions
- **Error Handling**: How problems are communicated
- **Loading States**: Progressive enhancement
- **Animations**: Transitions and micro-interactions

### 5. Consider Edge Cases
- **Empty States**: When there's no data
- **Error States**: When things go wrong
- **Loading States**: While processing
- **Success States**: Positive feedback
- **Responsive Behavior**: Different screen sizes

## Documentation Structure

### DESIGN.md File
Create or update `DESIGN.md` in the relevant feature folder:

```markdown
# Design: [Feature Name]

## Overview
Brief description of the design approach and its goals.

## Design Goals
- Primary objective 1
- Primary objective 2
- Secondary objectives...

## Design Principles
### [Principle Name]
Description of the principle and how it applies to this feature.

## Visual Design

### Color Palette
- Primary: #XXXXXX - Used for...
- Secondary: #XXXXXX - Used for...
- Success: #XXXXXX - Used for...
- Warning: #XXXXXX - Used for...
- Error: #XXXXXX - Used for...

### Typography
- Headings: Font family, size, weight
- Body: Font family, size, line-height
- Labels: Font family, size, weight

### Spacing System
- Base unit: Xpx
- Small: Xpx
- Medium: Xpx
- Large: Xpx

## Interaction Design

### User Flow
1. Entry point
2. Main interaction
3. Feedback/result
4. Next actions

### Feedback Patterns
- **Success**: How success is communicated
- **Error**: How errors are shown
- **Progress**: How progress is indicated
- **Confirmation**: When/how confirmations appear

### Animation Guidelines
- Transition duration: Xms
- Easing function: ease-in-out
- Key animations: Description

## Component Specifications

### [Component Name]
- Purpose: What it does
- States: Default, hover, active, disabled
- Variations: Different types/sizes
- Accessibility: ARIA labels, keyboard navigation

## Responsive Design
- **Mobile (< 768px)**: Key adaptations
- **Tablet (768px - 1024px)**: Layout changes
- **Desktop (> 1024px)**: Full experience

## Accessibility Considerations
- Color contrast ratios
- Keyboard navigation patterns
- Screen reader announcements
- Focus indicators
- Touch target sizes

## Design Decisions & Rationale
### [Decision 1]
**Choice**: What was decided
**Rationale**: Why this approach
**Alternatives Considered**: Other options

## Implementation Notes
- CSS architecture recommendations
- Component library usage
- Design token mapping
- Performance considerations
```

### Issue File Update
Add or update the `## Design` section in the issue file:

```markdown
## Design

### Design Goals
[Key objectives for the user experience]

### Visual Approach
[High-level description of visual design]

### Interaction Model
[How users will interact with the feature]

### Key Design Decisions
[Important choices and their rationale]

See [DESIGN.md](path/to/DESIGN.md) for detailed specifications.
```

### GitHub Comment
Post a summary as a comment on the GitHub issue:

```markdown
*I am an AI assistant acting on behalf of @<username>*

## Design Documentation Complete

### Design Goals
[List key design objectives]

### Visual Direction
[Brief description of visual approach]

### Interaction Patterns
[Summary of key interactions]

Full design specifications available in [DESIGN.md](link/to/file).
```

## Best Practices

1. **Check Existing Design System**: Always review `/src/app/DESIGN.md` and `/src/app/COLORS.md`
2. **Use Tailwind Classes**: Avoid custom CSS, use Tailwind utilities
3. **Follow Color System**: Use design system colors, not custom hex values
4. **User-Centered**: Always start with user needs and goals
5. **Consistency**: Follow existing design patterns when possible
6. **Accessibility First**: Design for all users from the start
7. **Progressive Enhancement**: Core functionality works everywhere
8. **Performance Conscious**: Consider loading and render performance
9. **Responsive by Default**: Design for all screen sizes
10. **Clear Hierarchy**: Guide user attention effectively

## Design Principles for Hexframe

### Spatial Meaning
- **Center Focus**: Most important element in the center
- **Hexagonal Relationships**: Six connected concepts
- **Visual Weight**: Size indicates importance
- **Color Coding**: Semantic meaning through color

### Interaction Patterns
- **Drag & Drop**: Primary interaction for composition
- **Hover States**: Preview and information
- **Click Actions**: Navigation and selection
- **Keyboard Navigation**: Full keyboard support

### Visual Consistency
- **Hexagonal Grid**: All layouts based on hex geometry
- **Consistent Spacing**: Based on hex dimensions
- **Color System**: Semantic and hierarchical
- **Typography Scale**: Clear information hierarchy

## Common Design Patterns

### Empty States
```
┌─────────────────┐
│   🔲 Icon       │
│                 │
│ "No items yet"  │
│                 │
│ [Add First]     │
└─────────────────┘
```

### Loading States
```
┌─────────────────┐
│ ○ ○ ○ Loading   │
│                 │
│ [Skeleton UI]   │
│                 │
└─────────────────┘
```

### Error States
```
┌─────────────────┐
│ ⚠️ Error        │
│                 │
│ "What went      │
│  wrong"         │
│                 │
│ [Try Again]     │
└─────────────────┘
```

## Integration with Workflow

The `/design` command should be run:
1. After `/solution` or `/architecture` when UI is involved
2. Before implementation of user-facing features
3. When existing UI patterns need documentation
4. To establish design guidelines for new components

## Next Steps
After `/design`, you can:
- Create UI components with clear specifications
- Implement with confidence in design decisions
- Ensure consistency across the feature
- Test against design goals

See `.claude/commands/README.md` for complete workflow.

ARGUMENTS: #<issue-number>