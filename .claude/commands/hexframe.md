# Hexframe Tile Command

## Purpose
Read a Hexframe tile by coordinates and process its content with additional instructions.

## Syntax
```
/hexframe <coordinates> <instructions>
```

Coordinates use format `userId,groupId:path` (e.g., `1,0:5,4` or `1,0` for root).

## Examples
```
/hexframe 1,0 Summarize this tile
/hexframe 1,0:5,4 1,0:3
```
The second example reads tile at `1,0:5,4` and applies the content from tile `1,0:3` as instructions.

## Process

1. Parse coordinates from the first argument
2. Fetch the tile content using `mcp__hexframe__getItemByCoords`
3. Treat the tile content as the command/prompt
4. Apply remaining arguments as input to that command
