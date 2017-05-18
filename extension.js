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
        this._workspaceSettings = Settings.getSettings('org.gnome.desktop.wm.preferences');
        this._currentWorkspace = global.screen.get_active_workspace().index();

        this._panelButtons = [];
        this._workspaceLabels = [];
        this._miscWidgets = [];
        this._panelButtonSignals = [];
        this._workspaceSignals = [];

        this._container = new St.BoxLayout();

        this._enableMode(this._mode);
        insertAtPosition(this._container, this._position, this._index);

        this._settingsSignal = this._settings.connect('changed', Lang.bind(this, this._onSettingsChanged));
        this._workspaceSettingsSignal = this._workspaceSettings.connect('changed', Lang.bind(this, this._onWorkspaceSettingsChanged));
        this._workspaceSignals.push(global.screen.connect('workspace-added', Lang.bind(this, this._onWorkspaceAdded)));
        this._workspaceSignals.push(global.screen.connect('workspace-removed', Lang.bind(this, this._onWorkspaceRemoved)));
        this._workspaceSignals.push(global.screen.connect('workspace-switched', Lang.bind(this, this._onWorkspaceSwitched)));
    },

    disable: function () {
        this._disableCurrentMode();

        this._settings.disconnect(this._settingsSignal);
        this._settings = null;
        this._workspaceSettings.disconnect(this._workspaceSettingsSignal);

        for (let i = 0; i < this._panelButtons.length; i++)
            this._panelButtons[i].disconnect(this._panelButtonSignals[i]);

        for (let i = 0; i < this._workspaceSignals.length; i++)
            global.screen.disconnect(this._workspaceSignals[i]);

        this._container.destroy();
    },

    // Private Functions
    _createNewPanelButton: function (child) {
        let button = new St.Button({style_class: 'panel-button',
                                    reactive: true,
                                    can_focus: true,
                                    x_fill: true,
                                    y_fill: false,
                                    track_hover: true,
                                    child: child});
        this._panelButtons.push(button);
        this._container.add_child(button);
        return button;
    },

    _createNewWorkspaceLabel: function (workspaceIndex, applyStyle) {
        let label = new St.Label({y_align: Clutter.ActorAlign.CENTER});
        label.set_text(this._getWorkspaceName(workspaceIndex));
        if (applyStyle) {
            if (workspaceIndex == this._currentWorkspace)
                label.set_style(ACTIVE_STYLE);
            else
                label.set_style(INACTIVE_STYLE);
        }
        this._workspaceLabels.push(label);
        return label;
    },

    _disableCurrentMode: function () {
        for (let i = 0; i < this._workspaceLabels.length; i++)
            this._workspaceLabels[i].destroy();
        this._workspaceLabels = [];

        for (let i = 0; i < this._miscWidgets.length; i++)
            this._miscWidgets[i].destroy();
        this._miscWidgets = [];

        for (let i = 0; i < this._panelButtons.length; i++)
            this._panelButtons[i].destroy();
        this._panelButtons = [];
    },

    _enableMode: function (mode) {
        let button, label;
        switch (mode) {
            case MODES.CURRENT:
                label = this._createNewWorkspaceLabel(this._currentWorkspace, true);
                button = this._createNewPanelButton(label);
                this._panelButtonSignals.push(button.connect('clicked', Lang.bind(this, this._onButtonClicked)));
                this._panelButtonSignals.push(button.connect('scroll-event', Lang.bind(this, this._onButtonScrolled)));
                break;
            case MODES.ALL:
                for (let i = 0; i < global.screen.n_workspaces; i++) {
                    label = this._createNewWorkspaceLabel(i, true);
                    button = this._createNewPanelButton(label);
                    button.workspaceIndex = i;
                    this._panelButtonSignals.push(button.connect('clicked', Lang.bind(this, this._onWorkspaceClicked)));
                }
                break;
            case MODES.ICON:
                let container = new St.BoxLayout();
                this._miscWidgets.push(container);
                let icon = new St.Icon({icon_name: 'workspace-switcher',
                                        icon_size: 16,
                                        style_class: 'system-status-icon'});
                this._miscWidgets.push(icon);
                container.add_child(icon);
                label = this._createNewWorkspaceLabel(this._currentWorkspace, false);
                container.add_child(label);
                button = this._createNewPanelButton(container);
                this._panelButtonSignals.push(button.connect('clicked', Lang.bind(this, this._onButtonClicked)));
                this._panelButtonSignals.push(button.connect('scroll-event', Lang.bind(this, this._onButtonScrolled)));
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
    _onButtonClicked: function (button, event) {
        Main.overview.toggle();
    },

    _onButtonScrolled: function (button, event) {
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

    _onWorkspaceClicked: function (button, event) {
        this._setActiveWorkspace(button.workspaceIndex);
    },

    _onWorkspaceAdded: function () {
        this._currentWorkspace = global.screen.get_active_workspace().index();
        if (this._mode == MODES.ALL) {
            let index = this._workspaceLabels.length;
            let label = this._createNewWorkspaceLabel(index, true);
            let button = this._createNewPanelButton(label);
            button.workspaceIndex = index;
            this._panelButtonSignals.push(button.connect('clicked', Lang.bind(this, this._onWorkspaceClicked)));
        } else if (this._showTotalNum)
            this._workspaceLabels[0].set_text(this._getWorkspaceName());
    },

    _onWorkspaceRemoved: function () {
        this._currentWorkspace = global.screen.get_active_workspace().index();
        if (this._mode == MODES.ALL) {
            let buttonIndex = this._panelButtons.length - 1;
            this._panelButtons[buttonIndex].disconnect(this._panelButtonSignals[buttonIndex]);
            this._workspaceLabels.pop().destroy();
            this._panelButtons.pop().destroy();
            this._panelButtonSignals.pop();
            this._updateAllWorkspaceNames();
            for (let i = 0; i < this._panelButtons.length; i++) {
                this._panelButtons[i].workspaceIndex = i;
                if (i == this._currentWorkspace)
                    this._workspaceLabels[i].set_style(ACTIVE_STYLE)
                else
                    this._workspaceLabels[i].set_style(INACTIVE_STYLE)
            }

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
                removeFromPosition(this._container, this._position);
                insertAtPosition(this._container, this._position, this._index);
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
                removeFromPosition(this._container, this._position);
                this._position = settings.get_enum(key);
                insertAtPosition(this._container, this._position, this._index);
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

    _onWorkspaceSettingsChanged: function (settings, key) {
        if (key == 'workspace-names' && this._useNames)
            this._updateAllWorkspaceNames();
    },
}

function init() {
    return new WorkspaceSwitcher();
}

