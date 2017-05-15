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

const ACTIVE_STYLE = "background-color: #888888; border: 1px solid #cccccc";
const INACTIVE_STYLE = "background-color: #444444; border: 1px solid #cccccc";

function getWorkspaceName (index) {
    return Meta.prefs_get_workspace_name(index)
}

function getWorkspaceNum (index) {
    return (index + 1).toString();
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

        this._childWidgets = [];
        this._widgetSignalOwners = [];
        this._widgetSignals = [];
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
        this._insertAtPosition(this._panelButton, this._position, this._index);

        this._widgetSignalOwners.push(this._panelButton);
        this._widgetSignals.push(this._panelButton.connect('scroll-event', Lang.bind(this, this._onScroll)));

        //this._workspaceSignals.push(global.screen.connect('workspace-added', TODO);
        //this._workspaceSignals.push(global.screen.connect('workspace-removed',TODO);
        this._workspaceSignals.push(global.screen.connect('workspace-switched', Lang.bind(this, this._onWorkspaceSwitched)));
    },

    disable: function () {
        this._settings = null;

        for (let i = 0; i < this._childWidgets.length; i++)
            this._childWidgets[i].destroy();

        for (let i = 0; i < this._widgetSignals.length; i++)
            this._widgetSignalOwners[i].disconnect(this._widgetSignals[i]);

        for (let i = 0; i < this._workspaceSignals.length; i++)
            global.screen.disconnect(this._workspaceSignals[i]);

        this._panelButton.destroy();
        this._container.destroy();
    },

    // Private Functions
    _enableMode: function (mode) {
        let label
        switch (mode) {
            case 0:
                label = new St.Label({y_align: Clutter.ActorAlign.CENTER});
                label.set_text(this._getWorkspaceName(this._currentWorkspace));
                this._container.add_child(label);
                this._childWidgets.push(label);
                break;
            case 1:
                for (let i = 0; i < global.screen.n_workspaces; i++) {
                    label = new St.Label({y_align: Clutter.ActorAlign.CENTER});
                    label.set_text(this._getWorkspaceName(i));
                    this._container.add_child(label);
                    this._childWidgets.push(label);
                }
                break;
            case 2:
                let icon = new St.Icon({icon_name: 'workspace-switcher',
                                        style_class: 'system-status-icon'});
                this._container.add_child(icon);
                this._childWidgets.push(icon);

                label = new St.Label({y_align: Clutter.ActorAlign.CENTER});
                label.set_text(this._getWorkspaceName(this._currentWorkspace));
                this._container.add_child(label);
                this._childWidgets.push(label);
                break;
        }
    },

    _getWorkspaceName(index) {
        if (this._useNames) return getWorkspaceName(index);
        else return getWorkspaceNum(index);
    },

    _insertAtPosition: function (actor, position, index) {
        [Main.panel._leftBox,
         Main.panel._centerBox,
         Main.panel._rightBox][position].insert_child_at_index(actor, index);
    },

    _setActiveWorkspace: function (index) {
        if(index >= 0 && index <  global.screen.n_workspaces) {
            let workspace = global.screen.get_workspace_by_index(index);
            workspace.activate(global.get_current_time());
        }
    },

    // Event Handlers
    _onScroll: function (button, event) {
        let scrollDirection = event.get_scroll_direction();
        let direction = 0;
        if (scrollDirection == Clutter.ScrollDirection.DOWN) direction = 1;
        else if (scrollDirection == Clutter.ScrollDirection.UP) direction = -1;
        else return;
        let index = global.screen.get_active_workspace().index() + direction;
        if (index == global.screen.n_workspaces) index = 0;
        else if (index == -1) index = global.screen.n_workspaces - 1;
        this._setActiveWorkspace(index);
    },

    _onWorkspaceSwitched: function () {
        this._currentWorkspace = global.screen.get_active_workspace().index();
        switch (this._mode) {
            case 0:
                this._childWidgets[0].set_text(this._getWorkspaceName(this._currentWorkspace));
                break;
            case 1:
                for (let i = 0; i < global.screen.n_workspaces; i++) {
                    if (i == this._currentWorkspace)
                        this._childWidgets[i].set_style(ACTIVE_STYLE);
                    else this._childWidgets[i].set_style(INACTIVE_STYLE);
                }
                break;
            case 2:
                this._childWidgets[1].set_text(this._getWorkspaceName(this._currentWorkspace));
                break;
        }
    },

    // Settings
    _loadSettings: function () {
        if (this._settings == null) this._settings = Settings.getSettings();

        this._index = this._settings.get_int('index');
        this._mode = this._settings.get_enum('mode');
        this._position = this._settings.get_enum('position');
        this._useNames = this._settings.get_boolean('use-names');
    },

    _onSettingsChanged: function (settings, key) {

    },
}

function init() {
    return new WorkspaceSwitcher();
}

