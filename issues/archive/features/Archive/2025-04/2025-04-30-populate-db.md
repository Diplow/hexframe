# Feature plan: populate the db with a Map for OsonsComprendre

## Problem

I need data to showcase what an interesting map could be.

## Context

I have transcripts of videos from the youtube channel OsonsComprendre in src/lib/youtube/transcripts/OsonsComprendre.
I have an api implemented in src/server/api/routers/map.ts that enable map creation.

## High Level goal

Implement a nodejs script that will be executed with the command pnpm db:populate

1. Read the 6 first transcripts for OsonsComprendre and analyze them (if the analyse does not exist yet) with the command pnpm run youtube:analyze and stores them in src/lib/youtube/analysis/OsonsComprendre. The transcript files are named {videoId}.txt and the analyse file should be named {videoId}.poc.json
2. Create a Map with title "OsonsComprendre"
3. For each analyse, add an item to this map with title analyse[title] and description analyse[abstract], and url "https://www.youtube.com/watch?v={videoId}" where videoId can be found in the analyse file name. The Item should be a direct child of the center "OsonsComprendre"
4. Then for each idea of analyse[ideas], create a mapItem that has for title analyse[ideas][ideaNumber][title], for description analyse[ideas][ideaNumber][abstract] and be a direct child of the analyse created on step3
5. Then for each sequence of analyse[ideas][ideaNumber][sequences], create a mapItem that has title analyse[ideas][ideaNumber][sequences][title], description analyse[ideas][ideaNumber][sequences][descr] and url "https://www.youtube.com/watch?v={videoId}&t={timecode}" where timecode is the time code defined in analyse[ideas][ideaNumber][sequences][timecode] but in seconds
