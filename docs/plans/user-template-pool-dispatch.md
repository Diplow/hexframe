# Plan: Update User Interlocutor Template to Use Pool-Based Dispatch

## Goal
Update the User Interlocutor Template at `D1i4gEqbi01JWS2F6I7GUN8ekRiU2mjK,0:1,2,2` to follow the same pool-based dispatch pattern as the System Task Template at `[1,2,1]`.

## Current State
The User Interlocutor Template currently uses:
- `{{{userIntro}}}` - hardcoded intro variable
- `{{{contextSection}}}` - pre-rendered composed children
- `{{{sectionsSection}}}` - pre-rendered structural children
- `{{{recentHistory}}}` - session history (like hexplan)
- `{{{discussion}}}` - conversation history
- `{{{userMessage}}}` - current user message

No sub-templates exist (empty children).

## Target State
Match the System Task Template pattern:
- Pool-based dispatch via `{{@RenderChildren}}`
- Template context via `{{{template[-1].content}}}`
- Direction-0 for recent-history (like hexplan)

## Tasks

| # | Task | Details |
|---|------|---------|
| 1 | **Add sub-templates (structural children 1-6)** | Create template pool for USER tiles |
| | `[1]` organizational | `<folder>` with recursive rendering |
| | `[2]` context | `<item>` with content |
| | `[3]` generic | Fallback `<tile>` |
| | `[4]` section | `<section>` for structural children |
| | `[5]` recent-history | For direction-0 (like hexplan) |
| 2 | **Add user-intro as composed child (-1)** | Move USER_INTRO content to template context |
| 3 | **Update template content** | Use RenderChildren + template context |
| 4 | **Update UserTemplateData interface** | Add fields similar to SystemTemplateData |
| 5 | **Update prompt builder** | Ensure USER template gets same data flow |
| 6 | **Run tests and verify** | Ensure backward compatibility |

## New Template Content
```mustache
{{{template[-1].content}}}

<context>
{{@RenderChildren range=[-6..-1] fallback='generic'}}
</context>

<sections>
{{@RenderChildren range=[1..6] fallback='section'}}
</sections>

{{@RenderChildren range=[0..0] fallback='recent-history'}}

{{#hasDiscussion}}
<discussion>
Previous messages in this conversation:
{{{discussion}}}
</discussion>
{{/hasDiscussion}}

{{#hasUserMessage}}
<user-message>
The user's current message that you need to respond to:
{{{userMessage}}}
</user-message>
{{/hasUserMessage}}
```

Note: `discussion` and `userMessage` remain as Mustache variables since they're conversation-level data, not tile children.

## Sub-Template Contents

### `[1]` organizational
```mustache
<folder title="{{title}}" coords="{{coords}}">
{{@RenderChildren range=[-6..-1] fallback='generic'}}
</folder>
```

### `[2]` context
```mustache
<item title="{{title}}" coords="{{coords}}">
{{content}}
</item>
```

### `[3]` generic
```mustache
<tile coords="{{coords}}">{{title}}</tile>
```

### `[4]` section
```mustache
<section title="{{title}}" coords="{{coords}}">
{{preview}}
</section>
```

### `[5]` recent-history
```mustache
<recent-history coords="{{coords}}">
This section tracks the user's recent goals and session state. Update it when the user expresses a goal, so future sessions can quickly resume context.

{{content}}
</recent-history>
```

## User-Intro Content (composed child -1)
```xml
<user-intro>
You are the default interlocutor for a Hexframe user. Your role is to help the user accomplish what they want to do with Hexframe.

Hexframe is a hexagonal knowledge mapping system where users organize their thoughts, plans, and reference materials as interconnected tiles. You can help users:
- Navigate and understand their tile map
- Create, update, or reorganize tiles
- Execute tasks defined in SYSTEM tiles
- Find information in their knowledge base

The sections below show the user's available tiles. ORGANIZATIONAL tiles (marked as folders) group related items. You can explore deeper into any section by using the hexecute tool with the tile's coordinates.

If the user has expressed a goal in a previous session, check the <recent-history> section to quickly catch up on context.
</user-intro>
```

## Reference
See System Task Template implementation at `[1,2,1]` for the pattern to follow.
