// ─── Raw ingestion ───────────────────────────────────────────────────────────

export interface RawDocument {
  source: 'slack' | 'github';
  sourceId: string;
  sourceUrl: string | null;
  docType: 'message' | 'thread' | 'pr' | 'issue' | 'commit';
  content: string;
  author: string | null;
  channel?: string; // Slack only
  createdAt: Date;
}

// ─── Graph nodes / edges ──────────────────────────────────────────────────────

export type NodeType = 'Person' | 'Topic' | 'Decision' | 'Document' | 'Codebase' | 'Conversation';

export interface GraphNode {
  id: string;
  type: NodeType;
  name: string;
  description: string;
  source_url?: string;
  raw_content?: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ─── Extraction ───────────────────────────────────────────────────────────────

export interface ExtractedEntity {
  type: string;
  id: string;
  name: string;
  description: string;
  [key: string]: unknown; // type-specific extra fields
}

export interface ExtractedRelationship {
  source_id: string;
  target_id: string;
  type: string;
}

export interface ExtractionResult {
  entities: ExtractedEntity[];
  relationships: ExtractedRelationship[];
}

export interface PipelineResult {
  nodesCreated: number;
  edgesCreated: number;
  nodeIds: string[];
}

// ─── Retrieval / chat ─────────────────────────────────────────────────────────

export interface RetrievedNode {
  id: string;
  name: string;
  type: string;
  description: string;
  raw_content?: string;
  source_url?: string;
  score: number;
}

export interface QueryResponse {
  answer: string;
  sources: {
    nodeId: string;
    name: string;
    type: string;
    description: string;
    sourceUrl?: string;
  }[];
  highlightNodes: string[];
}

// ─── SSE events ───────────────────────────────────────────────────────────────

export interface GraphUpdateEvent {
  nodesCreated: number;
  edgesCreated: number;
  nodeIds: string[];
}
