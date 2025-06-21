# Brainstorming tile layouts: Next15, server components, static tiles vs dynamic tiles

## Context

I'm thinking whether it would be a good idea to leverage server components for the hexagonal map implementation. Basically I have 3 ways to handle state:

- through my backend for the map data (tiles titles, tiles descriptions, etc...)
- through javascript and in my case react hooks to handle dynamic modification of the maps (e.g drag and drop to move content from one location to an other)
- through the URL so that It can still "fill" dynamic from the client perspective but in reality just leveraging next15 caching.

More specifically I'm thinking about handling what tile is collapsed and what tile is expanded through the URL and I'm wondering if it is a good idea. I know that I don't want to persist this information of what is expanded or collapsed in the backend because it is just a presentation concern.

But I have two ways to handle it, with the URL (basically having a field that tells me which tiles are expanded) or with a react hook.

What do you think fit best my project?
