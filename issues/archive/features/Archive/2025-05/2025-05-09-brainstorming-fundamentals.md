### Hexagonal Map

My application displays an Hexagonal Map (each Tile is an hexagon, a HexTile).

Each hexagon can be expanded, meaning that it "becomes" a central hexagon surrounded by 6 adjacent hexagons. These 7 hexagons together are called an HexRegion. In other words, expanding a HexTile creates a HexRegion instead of the HexTile, and the central HexTile of the HexRegion is the original HexTile.

The opposite operation of an expansion is a "collapse". Collapsing a HexRegion means removing the surrounding HexTiles to only keep the central HexTile.

Note: Expanding a HexTile and collapsing the central HexTile of the resulting HexRegion should be equivalent to do nothing.

Note: our hexagons have pointy top, which means that our HexRegion's HexTiles can be representer as a central one, one North-West Tile, one North-East Tile, one East Tile, one South-East Tile, one South-West Tile and one West Tile.

### Developping Ideas

This "expansion" process is meant to convey the development of an idea. If a HexTile is an idea, expanding this HexTile means "developping this idea". The structural constraint of our map, being a hexagonal map, means that you can not develop an idea in more than 6 directions.

Then what do you do if your reasonning is split into 7 parts? You think of a way to present your reasonning in less parts. For instance you could distinguish 2 main sequences and develop the first 3 parts in a first sequence and 4 last parts in the last sequence.

Therefore I don't think that this is a very hard constraint to respect. Quite the opposite in fact, because if your ideas are meant to be shared and discussed, giving this kind of structure could be seen as a way to order your ideas.

### Hierarchy and Depth

If an idea can be developped in X other directions, we call these directions "children" of the idea. And this idea is a parent of each of these children ideas. The depth of an idea is simply 1 plus the depth of its parent.

### Giving context

An other interesting property of this hierarchical structuring is that you can quickly get the context of an Idea just by looking at its parents. This is also an efficient way to look for a precise information, because starting from the central idea, you can probably choose which children is the most probable parent of the idea that contains the information you are looking for. Also in the world of AI development where context is key, this idea might deserve to be developped more.

### Perspective

Even more important, I pretend that this way to order your thinking is a key part of how you think, of what makes your thinking interesting but also what makes your thinking weak sometimes. Basically this structure captures your perspective on your idea with all the good things that come with it: the finesse, what it enables, what you can build on. But also your weaknesses: your blindspots, the things you don't really care about.

### Spatial representation

The hexagonal representation is also not just a linear way to develop your ideas. Inside a hexagonal representation (when all the 6 directions are developped) you have 3 natural oppositions.East/West, North-East/South-West and North-West/South-East. These can be seen as "tensions" that you think are worth examining an idea from. Each side HexTile has also 2 direct neighbors (for the East Tile, its neighbors are North-East and South-East). The direct neighbors could have some semantic similarities with the tile.

If we assume that all these structural conventions are respected, could it be an argument in favor of having thought through an idea? Those structural convention have no been respected, would it naturally point to a relevant weakness of our way to approach an idea?

### Discussing perspectives as frameworks

Discussing these perspectives as frameworks to think about ideas and simplify approaching them could hold a lot of value to find the most usefull frameworks. The one that allow for great ideas to be found and serve as foundation for other ideas.

### At the start of each perspective, there is a person or a group.

The root of all ideas should be a person or a group that "authored" this idea. Or saying things differently, the person or group wording and sharing an idea is always an important context to have about an idea, and everyone would benefice from every author sharing some context about how they came to this idea they are sharing.

### Including an other's idea into our own perspective

Most of the ideas have been thought and discussed by others, and you should have no shame building on them. Our platform allow to this explicitly by "importing" an other idea (an HexTile) in our own perspective (the one which we are the center of).

The new context for this idea, which is the one the user has built for himself, might be out of place considering the context of the original idea and this is OK as far as I know, because this is explicit and we have then more chance to decypher an incoherence.

### Impact of ideas

This import mechanism allow to derive different kind of impact for these ideas:

- Popularity: how many people "import" the idea
- Foundation: how many "great foundation ideas" use this idea
- Expertise: popularity among experts (= people creating foundational ideas in a given domain)
- Trending: how many people are importing/removing the idea in the last week

### Qualifying ideas

Each idea can have a maximum of 6 tags to classify them and what they are about. Additionaly there is always a tag for the author of the idea and for the date of publication and last update of this idea.

### Navigating ideas

The combinaison of tags and impact allow for different browsing experiences of the platform:

- trending ideas by tag(s) / timeframe
- most foundational ideas by tag(s) / date
- most discussed ideas by tags / date
