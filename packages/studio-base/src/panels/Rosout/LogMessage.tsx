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

import { makeStyles } from "@fluentui/react";
import cx from "classnames";
import { padStart } from "lodash";

import { Time } from "@foxglove/rostime";
import { colors, fonts } from "@foxglove/studio-base/util/sharedStyleConstants";

import LevelToString from "./LevelToString";
import { RosgraphMsgs$Log } from "./types";

// pad the start of `val` with 0's to make the total string length `count` size
function PadStart(val: unknown, count: number) {
  return padStart(`${val}`, count, "0");
}

function Stamp(props: { stamp: Time }) {
  const stamp = props.stamp;
  return (
    <span>
      {PadStart(stamp.sec, 10)}.{PadStart(stamp.nsec, 9)}
    </span>
  );
}

const useStyles = makeStyles({
  root: {
    textIndent: "-20px",
    paddingLeft: "20px",
    whiteSpace: "pre-wrap",
    lineHeight: "1.2",
    fontFamily: fonts.MONOSPACE,
  },
  fatal: {
    color: colors.RED2,
    fontWeight: "bold",
  },
  error: {
    color: colors.RED2,
  },
  warn: {
    color: colors.ORANGE2,
  },
  info: {
    color: colors.GRAY3,
  },
  debug: {
    color: colors.GRAY,
  },
});

export default React.memo(function LogMessage({ msg }: { msg: RosgraphMsgs$Log }) {
  const classes = useStyles();
  const altStr = `${msg.file}:${msg.line}`;
  const strLevel = LevelToString(msg.level);
  const stamp = msg.header?.stamp ?? msg.stamp ?? { sec: 0, nsec: 0 };

  // the first message line is rendered with the info/stamp/name
  // following newlines are rendered on their own line
  const lines = msg.msg.split("\n");

  return (
    <div
      title={altStr}
      className={cx(classes.root, {
        [classes.fatal]: strLevel.toLocaleLowerCase() === "fatal",
        [classes.error]: strLevel.toLocaleLowerCase() === "error",
        [classes.warn]: strLevel.toLocaleLowerCase() === "warn",
        [classes.info]: strLevel.toLocaleLowerCase() === "info",
        [classes.debug]: strLevel.toLocaleLowerCase() === "debug",
      })}
    >
      <div>
        <span>[{padStart(strLevel, 5, " ")}]</span>
        <span>
          [<Stamp stamp={stamp} />]
        </span>
        <span>
          [{msg.name}
          ]:
        </span>
        <span>&nbsp;</span>
        <span>{lines[0]}</span>
      </div>
      {/* extra lines */}
      <div>
        {/* using array index as key is desired here since the index does not change */}
        {lines.slice(1).map((line, idx) => {
          return (
            <div key={idx}>
              &nbsp;&nbsp;&nbsp;&nbsp;
              {line}
            </div>
          );
        })}
      </div>
    </div>
  );
});
