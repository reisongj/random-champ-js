import { Lane } from '../data/champions';

export interface Team {
  [lane: string]: string | null;
}

export interface SavedTeam {
  timestamp: string;
  team: Team;
}

export interface IncompleteTeam {
  id: string;
  timestamp: string;
  team: Team;
  rerolledLanes: Record<Lane, { original: string; rerolled: string }>;
  pendingSelections: Record<Lane, string | null>; // Which champion to keep for each rerolled lane
  hasUsedReroll: boolean; // Track if reroll has been used for this team
}

export interface AppState {
  selectedChampions: Record<Lane, string | null>;
  randomizedLanes: Set<Lane>;
  playedChampions: Set<string>;
  teamLocked: boolean;
  displayingSavedTeam: boolean;
  rerolledLanes: Record<Lane, { original: string; rerolled: string }>;
  pendingSelections: Record<Lane, string | null>;
}

