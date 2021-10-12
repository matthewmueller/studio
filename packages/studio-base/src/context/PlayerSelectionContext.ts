// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { createContext, useContext } from "react";

import { Player } from "@foxglove/studio-base/players/types";

type Props = {
  onPlayer: (player: Player) => void;
};

export type DataSource = {
  id: string;
  displayName: string;
  iconName?: string;
  disabledReason?: string | JSX.Element;
  badgeText?: string;

  // Return the UI element for the data source
  ui: (props: Props) => JSX.Element;

  // initialize a player given some arguments
  initialize: (args?: Record<string, unknown>) => Player | undefined;
};

export type SourceSelection = {
  id: string;
  args?: unknown;
};

/**
 * PlayerSelectionContext exposes the available data sources and a function to set the current data source
 */
export interface PlayerSelection {
  selectSource: (sourceId: string, args?: Record<string, unknown>) => void;

  /** Currently selected data source */
  selectedSource?: DataSource;

  /** List of available data sources */
  availableSources: DataSource[];

  /** Set the active player */
  setPlayer: (player: Player) => void;
}

const PlayerSelectionContext = createContext<PlayerSelection>({
  selectSource: () => {},
  availableSources: [],
  setPlayer: () => {},
});

export function usePlayerSelection(): PlayerSelection {
  return useContext(PlayerSelectionContext);
}

export default PlayerSelectionContext;
