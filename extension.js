/* Copyright (C) 2017 Tom Hartill

extension.js - Main file for the Workspace Switcher extension. Defines the main
extension object for the Gnome Shell to load.

Workspace Switcher is free software; you can redistribute it and/or modify it
under the terms of the GNU General Public License as published by the Free
Software Foundation; either version 3 of the License, or (at your option) any
later version.

Workspace Switcher is distributed in the hope that it will be useful, but
WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more
details.

You should have received a copy of the GNU General Public License along with
Workspace Switcher; if not, see http://www.gnu.org/licenses/.

An up to date version can also be found at:
https://github.com/Tomha/gnome-shell-extension-workspace-switcher */

const Clutter = imports.gi.Clutter;
const Meta = imports.gi.Meta;
const St = imports.gi.St;

const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const Panel = imports.ui.panel;

const Lang = imports.lang;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Settings = Me.imports.settings;

const ACTIVE_STYLE = "background-color: #888888; border: 1px solid #cccccc; padding: 0px 8px 0px 8px; margin: 0px 1px 0px 1px;";
const INACTIVE_STYLE = "background-color: #444444; border: 1px solid #cccccc; padding: 0px 8px 0px 8px; margin: 0px 1px 0px 1px;";
const PANEL_POSITIONS = [Main.panel._leftBox,
                         Main.panel._centerBox,
                         Main.panel._rightBox]

const MODES = { CURRENT: 0, ALL: 1, ICON: 2 }

function getWorkspaceName (index) {
    return Meta.prefs_get_workspace_name(index)
}

function getWorkspaceNum (index) {
    return (index + 1).toString();
}

function insertAtPosition (actor, position, index) {
    PANEL_POSITIONS[position].insert_child_at_index(actor, index);
}

function removeFromPosition (actor, position) {
    PANEL_POSITIONS[position].remove_child(actor);
}

function WorkspaceSwitcher () {
    this.init();
}

WorkspaceSwitcher.prototype = {
    // Required GNOME Functions
    init: function () { },

    enable: function () {
        this._loadSettings();
        this._currentWorkspace = global.screen.get_active_workspace().index();

        this._workspaceLabels = [];
        this._miscWidgets = [];
        this._miscSignalOwners = [];
        this._miscSignals = [];
        this._workspaceSignals = [];

        this._container = new St.BoxLayout();
        this._panelButton = new St.Bin({style_class: 'panel-button',
                                   reactive: true,
                                   can_focus: true,
                                   x_fill: true,
                                   y_fill: false,
                                   track_hover: true,
                                   child: this._container});
        this._enableMode(this._mode);
        insertAtPosition(this._panelButton, this._position, this._index);

        this._scrollSignal = this._panelButton.connect('scroll-event', Lang.bind(this, this._onScroll));
        this._settingsSignal = this._settings.connect('changed', Lang.bind(this, this._onSettingsChanged));
        this._workspaceSignals.push(global.screen.connect('workspace-added', Lang.bind(this, this._onWorkspaceAdded)));
        this._workspaceSignals.push(global.screen.connect('workspace-removed', Lang.bind(this, this._onWorkspaceRemoved)));
        this._workspaceSignals.push(global.screen.connect('workspace-switched', Lang.bind(this, this._onWorkspaceSwitched)));
    },

    disable: function () {
        this._disableCurrentMode();

        this._panelButton.disconnect(this._scrollSignal);
        this._settings.disconnect(this._settingsSignal);
        for (let i = 0; i < this._workspaceSignals.length; i++)
            global.screen.disconnect(this._workspaceSignals[i]);

        this._settings = null;

        this._panelButton.destroy();
        this._container.destroy();
    },

    // Private Functions
    _createNewWorkspaceLabel: function (index, applyStyle) {
        let label = new St.Label({y_align: Clutter.ActorAlign.CENTER});
        label.set_text(this._getWorkspaceName(index));
        if (applyStyle) {
            if (index == this._currentWorkspace)
                label.set_style(ACTIVE_STYLE);
            else
                label.set_style(INACTIVE_STYLE);
        }
        this._container.add_child(label);
        this._workspaceLabels.push(label);
    },

    _disableCurrentMode: function () {
        for (let i = 0; i < this._workspaceLabels.length; i++)
            this._workspaceLabels[i].destroy();
        this._workspaceLabels = [];

        for (let i = 0; i < this._miscWidgets.length; i++)
            this._miscWidgets[i].destroy();
        this._miscWidgets = [];

        for (let i = 0; i < this._miscSignals.length; i++)
            this._miscSignalOwners[i].disconnect(this._miscSignals[i]);
        this._miscSignalOwners = [];
        this._miscSignals = [];
    },

    _enableMode: function (mode) {
        switch (mode) {
            case MODES.CURRENT:
                this._createNewWorkspaceLabel(this._currentWorkspace, true);
                break;
            case MODES.ALL:
                for (let i = 0; i < global.screen.n_workspaces; i++)
                    this._createNewWorkspaceLabel(i, true)
                break;
            case MODES.ICON:
                let icon = new St.Icon({icon_name: 'workspace-switcher',
                                        style_class: 'system-status-icon'});
                this._container.add_child(icon);
                this._miscWidgets.push(icon);
                this._createNewWorkspaceLabel(this._currentWorkspace, false);
                break;
        }
    },

    _getWorkspaceName: function (index) {
        if (index == null) index = this._currentWorkspace;
        if (this._useNames) return getWorkspaceName(index);
        else if (this._showTotalNum && this._mode != 1)
            return getWorkspaceNum(index) + '/' + global.screen.n_workspaces.toString();
        else return getWorkspaceNum(index);
    },

    _setActiveWorkspace: function (index) {
        if (index >= 0 && index <  global.screen.n_workspaces) {
            let workspace = global.screen.get_workspace_by_index(index);
            workspace.activate(global.get_current_time());
        }
    },

    _updateAllWorkspaceNames: function () {
        for (let i = 0; i < this._workspaceLabels.length; i++)
            this._workspaceLabels[i].set_text(this._getWorkspaceName(i));
    },

    // Event Handlers
    _onScroll: function (button, event) {
        let scrollDirection = event.get_scroll_direction();
        let indexChange = 0;
        if (scrollDirection == Clutter.ScrollDirection.DOWN) indexChange--;
        else if (scrollDirection == Clutter.ScrollDirection.UP) indexChange++;
        else return;
        if (this._invertScrolling) indexChange *= -1;
        let index = global.screen.get_active_workspace().index() + indexChange;
        if (this._cyclicScrolling) {
            if (index == global.screen.n_workspaces) index = 0;
            else if (index == -1) index = global.screen.n_workspaces - 1;
        } else {
            if (index == global.screen.n_workspaces) index = global.screen.n_workspaces - 1;
            else if (index == -1) index = 0;
        }
        this._setActiveWorkspace(index);
    },

    _onWorkspaceAdded: function () {
        this._currentWorkspace = global.screen.get_active_workspace().index();
        if (this._mode == MODES.ALL) {
            index = this._workspaceLabels.length;
            this._createNewWorkspaceLabel(index, true);
        } else if (this._showTotalNum)
            this._workspaceLabels[0].set_text(this._getWorkspaceName());
    },

    _onWorkspaceRemoved: function () {
        this._currentWorkspace = global.screen.get_active_workspace().index();
        if (this._mode == MODES.ALL) {
            this._workspaceLabels.pop();
            this._updateAllWorkspaceNames();
        } else this._workspaceLabels[0].set_text(this._getWorkspaceName());
    },

    _onWorkspaceSwitched: function () {
        this._currentWorkspace = global.screen.get_active_workspace().index();
        if (this._mode == MODES.ALL) {
            for (let i = 0; i < global.screen.n_workspaces; i++) {
                if (i == this._currentWorkspace)
                    this._workspaceLabels[i].set_style(ACTIVE_STYLE);
                else this._workspaceLabels[i].set_style(INACTIVE_STYLE);
            }
        } else this._workspaceLabels[0].set_text(this._getWorkspaceName());
    },

    // Settings
    _loadSettings: function () {
        if (this._settings == null) this._settings = Settings.getSettings();

        this._cyclicScrolling = this._settings.get_boolean('cyclic-scrolling');
        this._index = this._settings.get_int('index');
        this._invertScrolling = this._settings.get_boolean('invert-scrolling');
        this._mode = this._settings.get_enum('mode');
        this._position = this._settings.get_enum('position');
        this._showIconText = this._settings.get_boolean('show-icon-text');
        this._showTotalNum = this._settings.get_boolean('show-total-num');
        this._useNames = this._settings.get_boolean('use-names');
    },

    _onSettingsChanged: function (settings, key) {
        switch (key) {
            case 'cyclic-scrolling':
                this._cyclicScrolling = settings.get_boolean(key);
                break;
            case 'index':
                this._index = settings.get_int(key);
                removeFromPosition(this._panelButton, this._position);
                insertAtPosition(this._panelButton, this._position, this._index);
                break;
            case 'invert-scrolling':
                this._invertScrolling = settings.get_boolean(key);
                break;
            case 'mode':
                this._disableCurrentMode();
                this._mode = settings.get_enum(key);
                this._enableMode(this._mode);
                break;
            case 'position':
                removeFromPosition(this._panelButton, this._position);
                this._position = settings.get_enum(key);
                insertAtPosition(this._panelButton, this._position, this._index);
                break;
            case 'show-icon-text':
                this._showIconText = settings.get_boolean(key);
                if (this._mode == MODES.ICON) {
                    if (this._showIconText) this._workspaceLabels[0].show();
                    else this._workspaceLabels[0].hide();
                }
                break;
            case 'show-total-num':
                this._showTotalNum = settings.get_boolean(key);
                if (!this._useNames) this._updateAllWorkspaceNames();
                break;
            case 'use-names':
                this._useNames = settings.get_boolean(key);
                this._updateAllWorkspaceNames();
                break;
        }
    },
}

function init() {
    return new WorkspaceSwitcher();
}

