// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2018-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

import {
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useToasts } from "react-toast-notifications";
import { useLocalStorage, useMountedState } from "react-use";

import { useShallowMemo } from "@foxglove/hooks";
import Logger from "@foxglove/log";
import { AppSetting } from "@foxglove/studio-base/AppSetting";
import { MessagePipelineProvider } from "@foxglove/studio-base/components/MessagePipeline";
import { useAnalytics } from "@foxglove/studio-base/context/AnalyticsContext";
import ConsoleApiContext from "@foxglove/studio-base/context/ConsoleApiContext";
import { useCurrentLayoutSelector } from "@foxglove/studio-base/context/CurrentLayoutContext";
import PlayerSelectionContext, {
  DataSource,
  PlayerSelection,
} from "@foxglove/studio-base/context/PlayerSelectionContext";
import { useUserNodeState } from "@foxglove/studio-base/context/UserNodeStateContext";
import { useAppConfigurationValue } from "@foxglove/studio-base/hooks/useAppConfigurationValue";
import { GlobalVariables } from "@foxglove/studio-base/hooks/useGlobalVariables";
import { usePrompt } from "@foxglove/studio-base/hooks/usePrompt";
import useWarnImmediateReRender from "@foxglove/studio-base/hooks/useWarnImmediateReRender";
import AnalyticsMetricsCollector from "@foxglove/studio-base/players/AnalyticsMetricsCollector";
import OrderedStampPlayer from "@foxglove/studio-base/players/OrderedStampPlayer";
import UserNodePlayer from "@foxglove/studio-base/players/UserNodePlayer";
import { BuildPlayerOptions } from "@foxglove/studio-base/players/buildPlayer";
import { Player } from "@foxglove/studio-base/players/types";
import { UserNodes } from "@foxglove/studio-base/types/panels";
import Storage from "@foxglove/studio-base/util/Storage";

const log = Logger.getLogger(__filename);

const DEFAULT_MESSAGE_ORDER = "receiveTime";
const EMPTY_USER_NODES: UserNodes = Object.freeze({});
const EMPTY_GLOBAL_VARIABLES: GlobalVariables = Object.freeze({});

/*
type FactoryOptions = {
  source: PlayerSourceDefinition;
  sourceOptions: Record<string, unknown>;
  playerOptions: BuildPlayerOptions;
  prompt: ReturnType<typeof usePrompt>;
  consoleApi?: ConsoleApi;
  storage: Storage;
};

type FoxgloveDataPlatformOptions = {
  start: string;
  end: string;
  seek?: string;
  deviceId: string;
};

async function localBagFileSource(options: FactoryOptions): Promise<Player | undefined> {
  let file: File;

  const restore = Boolean(options.sourceOptions.restore ?? false);

  // future enhancement would be to store the fileHandle in indexeddb and try to restore
  // fileHandles can be stored in indexeddb but not localstorage
  if (restore) {
    return undefined;
  }

  const { buildPlayerFromFiles } = await import("@foxglove/studio-base/players/buildPlayer");

  // maybe the caller has some files they want to open
  const files = options.sourceOptions.files;
  if (files instanceof Array) {
    return buildPlayerFromFiles(files, options.playerOptions);
  }

  try {
    const [fileHandle] = await showOpenFilePicker({
      types: [{ accept: { "application/octet-stream": [".bag"] } }],
    });
    file = await fileHandle.getFile();
  } catch (error) {
    if (error.name === "AbortError") {
      return undefined;
    }
    throw error;
  }

  return buildPlayerFromFiles([file], options.playerOptions);
}

async function localRosbag2FolderSource(options: FactoryOptions): Promise<Player | undefined> {
  let folder: FileSystemDirectoryHandle;

  const restore = Boolean(options.sourceOptions.restore ?? false);
  if (restore) {
    return undefined;
  }

  try {
    folder = await showDirectoryPicker();
  } catch (error) {
    if (error.name === "AbortError") {
      return undefined;
    }
    throw error;
  }

  const { buildRosbag2PlayerFromDescriptor } = await import(
    "@foxglove/studio-base/players/buildRosbag2Player"
  );
  return buildRosbag2PlayerFromDescriptor(getLocalRosbag2Descriptor(folder), options.playerOptions);
}

async function remoteBagFileSource(options: FactoryOptions): Promise<Player | undefined> {
  const storageCacheKey = `studio.source.${options.source.name}`;

  // undefined url indicates the user canceled the prompt
  let maybeUrl;

  const restore = Boolean(options.sourceOptions.restore ?? false);
  const urlOption = options.sourceOptions.url;

  if (restore) {
    maybeUrl = options.storage.getItem<string>(storageCacheKey);
  } else if (typeof urlOption === "string") {
    maybeUrl = urlOption;
  } else {
    maybeUrl = await options.prompt({
      title: "Remote bag file",
      placeholder: "https://example.com/file.bag",
      transformer: (str) => {
        const result = parseInputUrl(str, "https:", {
          "http:": { port: 80 },
          "https:": { port: 443 },
          "ftp:": { port: 21 },
        });
        if (result == undefined) {
          throw new AppError(
            "Invalid bag URL. Use a http:// or https:// URL of a web hosted bag file.",
          );
        }
        return result;
      },
    });
  }

  if (maybeUrl == undefined) {
    return undefined;
  }

  const url = maybeUrl;
  options.storage.setItem(storageCacheKey, url);

  const { buildPlayerFromBagURLs } = await import("@foxglove/studio-base/players/buildPlayer");
  return buildPlayerFromBagURLs([url], options.playerOptions);
}

async function foxgloveDataPlatformSource(options: FactoryOptions): Promise<Player | undefined> {
  const storageCacheKey = `studio.source.${options.source.name}`;

  // load the player on-demand
  const { default: FoxgloveDataPlatformPlayer } = await import(
    "@foxglove/studio-base/players/FoxgloveDataPlatformPlayer"
  );

  let params: FoxgloveDataPlatformOptions | undefined;

  const restore = Boolean(options.sourceOptions.restore ?? false);
  if (restore) {
    params = options.storage.getItem<FoxgloveDataPlatformOptions>(storageCacheKey);
  } else if (typeof options.sourceOptions.start === "string") {
    params = options.sourceOptions as FoxgloveDataPlatformOptions;
    if (!params.start || !params.end || !params.deviceId) {
      throw new Error(
        `Missing required FoxgloveDataPlatform parameters in ${JSON.stringify(
          options.sourceOptions,
        )}`,
      );
    }
  }

  if (!params) {
    return undefined;
  }
  if (!options.consoleApi) {
    throw new Error(`${options.source.name} data source is not available without ConsoleApi`);
  }

  options.storage.setItem(storageCacheKey, params);
  return new FoxgloveDataPlatformPlayer({
    params,
    consoleApi: options.consoleApi,
    metricsCollector: options.playerOptions.metricsCollector,
  });
}

async function rosbridgeSource(options: FactoryOptions): Promise<Player | undefined> {
  const storageCacheKey = `studio.source.${options.source.name}`;

  // load the player on-demand
  const { default: RosbridgePlayer } = await import(
    "@foxglove/studio-base/players/RosbridgePlayer"
  );

  // undefined url indicates the user canceled the prompt
  let maybeUrl;
  const restore = Boolean(options.sourceOptions.restore);

  if (restore) {
    maybeUrl = options.storage.getItem<string>(storageCacheKey);
  } else {
    const value = options.storage.getItem<string>(storageCacheKey) ?? "ws://localhost:9090";
    maybeUrl = await options.prompt({
      title: "WebSocket connection",
      placeholder: "ws://localhost:9090",
      initialValue: value,
      transformer: (str) => {
        const result = parseInputUrl(str, "http:", {
          "http:": { protocol: "ws:", port: 9090 },
          "https:": { protocol: "wss:", port: 9090 },
          "ws:": { port: 9090 },
          "wss:": { port: 9090 },
          "ros:": { protocol: "ws:", port: 9090 },
        });
        if (result == undefined) {
          throw new AppError("Invalid rosbridge WebSocket URL. Use the ws:// or wss:// protocol.");
        }
        return result;
      },
    });
  }

  if (maybeUrl == undefined) {
    return undefined;
  }

  const url = maybeUrl;
  options.storage.setItem(storageCacheKey, url);
  return new RosbridgePlayer({
    url,
    metricsCollector: options.playerOptions.metricsCollector,
  });
}

async function ros1Source(options: FactoryOptions): Promise<Player | undefined> {
  const storageCacheKey = `studio.source.${options.source.name}`;

  // load the player on-demand
  const { default: Ros1Player } = await import("@foxglove/studio-base/players/Ros1Player");

  // undefined url indicates the user canceled the prompt
  let maybeUrl;
  const restore = Boolean(options.sourceOptions.restore);

  if (restore) {
    maybeUrl = options.storage.getItem<string>(storageCacheKey);
  } else {
    const value = options.storage.getItem<string>(storageCacheKey);

    const os = OsContextSingleton; // workaround for https://github.com/webpack/webpack/issues/12960
    maybeUrl = await options.prompt({
      title: "ROS 1 TCP connection",
      placeholder: "localhost:11311",
      initialValue: value ?? os?.getEnvVar("ROS_MASTER_URI") ?? "localhost:11311",
      transformer: (str) => {
        const result = parseInputUrl(str, "ros:", {
          "http:": { port: 80 },
          "https:": { port: 443 },
          "ros:": { protocol: "http:", port: 11311 },
        });
        if (result == undefined) {
          throw new AppError(
            "Invalid ROS URL. See the ROS_MASTER_URI at http://wiki.ros.org/ROS/EnvironmentVariables for more info.",
          );
        }
        return result;
      },
    });
  }

  if (maybeUrl == undefined) {
    return undefined;
  }

  const url = maybeUrl;
  options.storage.setItem(storageCacheKey, url);

  const hostname = options.sourceOptions.rosHostname as string | undefined;

  return new Ros1Player({
    url,
    hostname,
    metricsCollector: options.playerOptions.metricsCollector,
  });
}

async function ros2Source(options: FactoryOptions): Promise<Player | undefined> {
  const storageCacheKey = `studio.source.${options.source.name}`;

  // undefined url indicates the user canceled the prompt
  let maybeDomainId: string | undefined;
  const restore = Boolean(options.sourceOptions.restore);

  if (restore) {
    maybeDomainId = options.storage.getItem<string>(storageCacheKey);
  } else {
    const value = options.storage.getItem<string>(storageCacheKey);

    maybeDomainId = await options.prompt({
      title: "ROS 2 DomainId",
      placeholder: "0",
      initialValue: value ?? "0",
      transformer: (str) => {
        const result = parseInt(str);
        if (isNaN(result) || result < 0) {
          throw new AppError("Invalid ROS 2 DomainId. Please use a non-negative integer");
        }
        return String(result);
      },
    });
  }

  if (maybeDomainId == undefined) {
    return undefined;
  }

  const domainIdStr = maybeDomainId;
  const domainId = parseInt(domainIdStr);
  options.storage.setItem(storageCacheKey, maybeDomainId);

  return new Ros2Player({ domainId, metricsCollector: options.playerOptions.metricsCollector });
}

async function velodyneSource(options: FactoryOptions): Promise<Player | undefined> {
  const storageCacheKey = `studio.source.${options.source.name}`;

  // load the player on-demand
  const { default: VelodynePlayer, DEFAULT_VELODYNE_PORT } = await import(
    "@foxglove/studio-base/players/VelodynePlayer"
  );

  // undefined port indicates the user canceled the prompt
  let maybePort;
  const restore = options.sourceOptions.restore;

  if (restore != undefined) {
    maybePort = options.storage.getItem<string>(storageCacheKey);
  } else {
    const value = options.storage.getItem<string>(storageCacheKey);

    maybePort = await options.prompt({
      title: "Velodyne LIDAR UDP port",
      placeholder: `${DEFAULT_VELODYNE_PORT}`,
      initialValue: value ?? `${DEFAULT_VELODYNE_PORT}`,
      transformer: (str) => {
        const parsed = parseInt(str);
        if (isNaN(parsed) || parsed <= 0 || parsed > 65535) {
          throw new AppError(
            "Invalid port number. Please enter a valid UDP port number to listen for Velodyne packets",
          );
        }
        return parsed.toString();
      },
    });
  }

  if (maybePort == undefined) {
    return undefined;
  }

  const portStr = maybePort;
  const port = parseInt(portStr);
  options.storage.setItem(storageCacheKey, portStr);

  return new VelodynePlayer({ port, metricsCollector: options.playerOptions.metricsCollector });
}
*/

type PlayerManagerProps = {
  playerSources: DataSource[];
};

export default function PlayerManager(props: PropsWithChildren<PlayerManagerProps>): JSX.Element {
  const { children, playerSources } = props;

  useWarnImmediateReRender();

  const { setUserNodeDiagnostics, addUserNodeLogs, setUserNodeRosLib } = useUserNodeState();
  const userNodeActions = useShallowMemo({
    setUserNodeDiagnostics,
    addUserNodeLogs,
    setUserNodeRosLib,
  });

  const messageOrder = useCurrentLayoutSelector(
    (state) => state.selectedLayout?.data?.playbackConfig.messageOrder,
  );
  const userNodes = useCurrentLayoutSelector((state) => state.selectedLayout?.data?.userNodes);
  const globalVariables = useCurrentLayoutSelector(
    (state) => state.selectedLayout?.data?.globalVariables ?? EMPTY_GLOBAL_VARIABLES,
  );

  const globalVariablesRef = useRef<GlobalVariables>(globalVariables);
  const [basePlayer, setBasePlayer] = useState<Player | undefined>();
  const isMounted = useMountedState();

  // We don't want to recreate the player when the message order changes, but we do want to
  // initialize it with the right order, so make a variable for its initial value we can use in the
  // dependency array below to defeat the linter.
  const [initialMessageOrder] = useState(messageOrder);

  const analytics = useAnalytics();
  const metricsCollector = useMemo(() => new AnalyticsMetricsCollector(analytics), [analytics]);

  const [unlimitedMemoryCache = false] = useAppConfigurationValue<boolean>(
    AppSetting.UNLIMITED_MEMORY_CACHE,
  );
  const buildPlayerOptions: BuildPlayerOptions = useShallowMemo({
    unlimitedMemoryCache,
    metricsCollector,
  });

  const player = useMemo<OrderedStampPlayer | undefined>(() => {
    if (!basePlayer) {
      return undefined;
    }

    const userNodePlayer = new UserNodePlayer(basePlayer, userNodeActions);
    const headerStampPlayer = new OrderedStampPlayer(
      userNodePlayer,
      initialMessageOrder ?? DEFAULT_MESSAGE_ORDER,
    );
    headerStampPlayer.setGlobalVariables(globalVariablesRef.current);
    return headerStampPlayer;
  }, [basePlayer, initialMessageOrder, userNodeActions]);

  useEffect(() => {
    player?.setMessageOrder(messageOrder ?? DEFAULT_MESSAGE_ORDER);
  }, [player, messageOrder]);
  useEffect(() => {
    player?.setUserNodes(userNodes ?? EMPTY_USER_NODES);
  }, [player, userNodes]);

  /*
  // Based on a source type, prompt the user for additional input and return a function to build the
  // requested player.
  const lookupPlayerBuilderFactory = useCallback((definition: PlayerSourceDefinition) => {
    switch (definition.type) {
      case "foxglove-data-platform":
        return foxgloveDataPlatformSource;
      case "ros1-local-bagfile":
        return localBagFileSource;
      case "ros2-local-bagfile":
        return localRosbag2FolderSource;
      case "ros1-socket":
        return ros1Source;
      case "ros2-socket":
        return ros2Source;
      case "rosbridge-websocket":
        return rosbridgeSource;
      case "ros1-remote-bagfile":
        return remoteBagFileSource;
      case "velodyne-device":
        return velodyneSource;
      default:
        return;
    }
  }, []);
  */

  //const prompt = usePrompt();
  const { addToast } = useToasts();
  //const storage = useMemo(() => new Storage(), []);

  //const [rosHostname] = useAppConfigurationValue<string>(AppSetting.ROS1_ROS_HOSTNAME);

  const [savedSource, setSavedSource] = useLocalStorage<{
    id: string;
    args?: Record<string, unknown>;
  }>("studio.playermanager.selected-source.v2");

  const [selectedSource, setSelectedSource] = useState<DataSource | undefined>();

  const selectSource = useCallback(
    async (sourceId: string, args?: Record<string, unknown>) => {
      log.debug(`Select Source: ${sourceId}`);

      const foundSource = playerSources.find((source) => source.id === sourceId);
      if (!foundSource) {
        addToast(`Unknown data source: ${sourceId}`, {
          appearance: "warning",
        });
        return;
      }

      // set the selected source
      setSavedSource({
        id: sourceId,
        args,
      });

      /*
      try {
        metricsCollector.setProperty("player", selectedSource.type);

        const buildPlayer = lookupPlayerBuilderFactory(selectedSource);
        if (!buildPlayer) {
          // This can happen when upgrading from an older version of Studio that used different
          // player names
          addToast(`Could not create a player for ${selectedSource.name}.`, {
            appearance: "error",
          });
          return;
        }

        const newBasePlayer = await buildPlayer({
          source: selectedSource,
          sourceOptions: { ...params, rosHostname },
          playerOptions: buildPlayerOptions,
          prompt,
          consoleApi,
          storage,
        });
        if (newBasePlayer && isMounted()) {
          setBasePlayer(newBasePlayer);
        }
      } catch (error) {
        setBasePlayer(undefined);
        addToast(error.message, {
          appearance: "error",
        });
      }
      */
    },
    [addToast, playerSources, setSavedSource],
  );

  // restore the saved source on first mount
  useLayoutEffect(() => {
    if (savedSource) {
      void selectSource(savedSource, { restore: true });
    }
    // we only run the layout effect on first mount - never again even if the saved source changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: PlayerSelection = {
    selectSource,
    selectedSource,
    availableSources: playerSources,
  };

  return (
    <>
      <PlayerSelectionContext.Provider value={value}>
        <MessagePipelineProvider player={player} globalVariables={globalVariables}>
          {children}
        </MessagePipelineProvider>
      </PlayerSelectionContext.Provider>
    </>
  );
}
