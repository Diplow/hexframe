// Re-export factories from specialized files
export { createDataHandlerWithServerService } from "~/app/map/Cache/Handlers/DataHandler/_factories/server-factory";
export { createDataHandlerWithMockableService } from "~/app/map/Cache/Handlers/DataHandler/_factories/mockable-factory";
export { createDataHandlerWithTRPC } from "~/app/map/Cache/Handlers/DataHandler/_factories/trpc-factory";
