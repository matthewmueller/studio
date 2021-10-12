// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useCallback } from "react";
import { useLatest } from "react-use";

import Button from "@foxglove/studio-base/components/Button";
import { buildPlayerFromFiles } from "@foxglove/studio-base/players/buildPlayer";
import { Player } from "@foxglove/studio-base/players/types";

type Props = {
  onPlayer: (player: Player) => void;
};

function Ros1LocalBagUi(props: Props): JSX.Element {
  const onPlayer = useLatest(props.onPlayer);

  const onOpenFileClick = useCallback(async () => {
    try {
      const [fileHandle] = await showOpenFilePicker({
        types: [{ accept: { "application/octet-stream": [".bag"] } }],
      });
      const file = await fileHandle.getFile();

      const player = Ros1LocalBag.initialize({
        file,
      });

      if (!player) {
        return;
      }

      onPlayer.current(player);
    } catch (error) {
      if (error.name === "AbortError") {
        return;
      }
      throw error;
    }
  }, [onPlayer]);

  return (
    <div>
      <div style={{ padding: "4px" }}>Some text describing ROS1 bag stuff here</div>
      <div style={{ padding: "4px" }}>
        <Button onClick={onOpenFileClick}>Open File</Button>
      </div>
    </div>
  );
}

class Ros1LocalBag {
  static id = "ros1-local-bagfile";
  static displayName = "ROS 1 Bag (local)";
  static icon = "studio.ROS";

  static initialize(args?: Record<string, unknown>): Player | undefined {
    const file = args?.["file"] as File | undefined;
    if (!file) {
      return;
    }

    return buildPlayerFromFiles([file], {
      unlimitedMemoryCache: false,
      // metricsCollector: undefined,
    });
  }

  static ui(props: Props): JSX.Element {
    return Ros1LocalBagUi(props);
  }
}

export default Ros1LocalBag;
