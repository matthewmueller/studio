// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { IStyleFunctionOrObject, IIconStyleProps, IIconStyles } from "@fluentui/react";

// Restrict TS types for icons to allow only the icon names we've registered.
declare global {
  type CustomIconNames = "studio.ROS";
  type RegisteredIconNames =
    | CustomIconNames
    | "Add"
    | "AddIn"
    | "Braces"
    | "BracesFilled"
    | "Blockhead"
    | "BlockheadFilled"
    | "Cancel"
    | "CheckMark"
    | "ChevronDown"
    | "ChevronDownSmall"
    | "ChevronLeft"
    | "ChevronRight"
    | "ChevronUpSmall"
    | "CirclePlus"
    | "Clear"
    | "ClearSelection"
    | "ClipboardList"
    | "CodeEdit"
    | "Cog"
    | "Contact"
    | "Copy"
    | "Database"
    | "DataManagementSettings"
    | "Delete"
    | "DependencyAdd"
    | "Download"
    | "DownloadDocument"
    | "Drag"
    | "Edit"
    | "Error"
    | "ErrorBadge"
    | "FileASPX"
    | "FiveTileGrid"
    | "Flow"
    | "GenericScan"
    | "HelpCircle"
    | "Info"
    | "LocationDot"
    | "Loop"
    | "LoopFilled"
    | "MenuDown"
    | "More"
    | "MoreVertical"
    | "Next"
    | "NextFilled"
    | "OpenFile"
    | "OpenFolder"
    | "Pause"
    | "PauseFilled"
    | "Play"
    | "PlayFilled"
    | "PlusCircleOutline"
    | "Previous"
    | "PreviousFilled"
    | "RectangularClipping"
    | "Refresh"
    | "RemoveFromTrash"
    | "Rename"
    | "Settings"
    | "SettingsFilled"
    | "Share"
    | "SingleColumnEdit"
    | "StatusCircleInner"
    | "TestBeakerSolid"
    | "Undo"
    | "Upload"
    | "Variable2"
    | "Warning"
    | never; // never has no effect here other than keeping the semicolon on a separate line for easier conflict resolution
}

declare module "@fluentui/react/lib/components/Icon" {
  export interface IIconProps {
    iconName?: RegisteredIconNames;
    styles?: IStyleFunctionOrObject<IIconStyleProps, IIconStyles>;
  }
}
declare module "@fluentui/react/lib/Icon" {
  export interface IIconProps {
    iconName?: RegisteredIconNames;
    styles?: IStyleFunctionOrObject<IIconStyleProps, IIconStyles>;
  }
}
declare module "@fluentui/react" {
  export interface IIconProps {
    iconName?: RegisteredIconNames;
    styles?: IStyleFunctionOrObject<IIconStyleProps, IIconStyles>;
  }
}
