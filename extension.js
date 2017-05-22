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
const Main = imports.ui.main;
const Lang = imports.lang;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Settings = Me.imports.settings;
const WorkspaceDisplay = Me.imports.workspaceDisplay;

const PANEL_POSITIONS = [Main.panel._leftBox,
                         Main.panel._centerBox,
                         Main.panel._rightBox]
const MODES = { CURRENT: 0, ALL: 1, ICON: 2 }

function insertAtPosition (actor, position, index) {
    PANEL_POSITIONS[position].insert_child_at_index(actor, index);
}

function removeFromPosition (actor, position) {
    PANEL_POSITIONS[position].remove_child(actor);
}

function init() {
    return new WorkspaceSwitcher();
}

const WorkspaceSwitcher = new Lang.Class({
    Name: 'WorkspaceSwitcher',

    init: function () { }, // Called by GNOME Shell when extension first loaded

    enable: function () {
        this._settings = Settings.getSettings();
        this._settingsStore = this._loadSettings();
        this._workspaceSettings = Settings.getSettings('org.gnome.desktop.wm.preferences');

        this._display = this._createNewDisplay();
        this._insertWidget();

        this._settingsSignal = this._settings.connect('changed', Lang.bind(this, this._onSettingsChanged));
        this._workspaceSettingsSignal = this._workspaceSettings.connect('changed', Lang.bind(this, this._onWorkspaceSettingsChanged));

        this._workspaceSignals = [];
        this._workspaceSignals.push(global.screen.connect('workspace-added', Lang.bind(this, this._onWorkspaceAdded)));
        this._workspaceSignals.push(global.screen.connect('workspace-removed', Lang.bind(this, this._onWorkspaceRemoved)));
        this._workspaceSignals.push(global.screen.connect('workspace-switched', Lang.bind(this, this._onWorkspaceSwitched)));
    },

    disable: function () {
        this._removeWidget();

        this._display.destroy();

        this._settings.disconnect(this._settingsSignal);
        this._workspaceSettings.disconnect(this._workspaceSettingsSignal);
        for (let i = 0; i < this._workspaceSignals.length; i++)
            global.screen.disconnect(this._workspaceSignals[i]);
    },

    _createNewDisplay: function () {
        if (this._settingsStore.mode == MODES.CURRENT)
            return(new WorkspaceDisplay.CurrentWorkspaceDisplay(this._settingsStore));
        else if (this._settingsStore.mode == MODES.ALL)
            return(new WorkspaceDisplay.AllWorkspacesDisplay(this._settingsStore));
        else
            return(new WorkspaceDisplay.IconWorkspaceDisplay(this._settingsStore));
    },

    _insertWidget: function () {
        insertAtPosition(this._display,
                         this._settingsStore.position,
                         this._settingsStore.index);
    },

    _loadSettings: function () {
        let settingsStore = new SettingsStore();
        settingsStore.clickAction = this._settings.get_enum('click-action');
        settingsStore.currentWorkspace = global.screen.get_active_workspace().index();
        settingsStore.cyclicScrolling = this._settings.get_boolean('cyclic-scrolling');
        settingsStore.index = this._settings.get_int('index');
        settingsStore.invertScrolling = this._settings.get_boolean('invert-scrolling');
        settingsStore.mode = this._settings.get_enum('mode');
        settingsStore.position = this._settings.get_enum('position');
        settingsStore.showIconText = this._settings.get_boolean('show-icon-text');
        settingsStore.showTotalNum = this._settings.get_boolean('show-total-num');
        settingsStore.useNames = this._settings.get_boolean('use-names');
        return settingsStore;
    },

    _removeWidget: function () {
        removeFromPosition(this._display,
                           this._settingsStore.position);
    },

    _onSettingsChanged: function (settings, key) {
        switch (key) {
            case 'click-action':
                this._settingsStore.clickAction = settings.get_enum(key);
                break;
            case 'cyclic-scrolling':
                this._settingsStore.cyclicScrolling = settings.get_boolean(key);
                break;
            case 'index':
                this._settingsStore.index = settings.get_int(key);
                this._removeWidget();
                this._insertWidget();
                break;
            case 'invert-scrolling':
                this._settingsStore.invertScrolling = settings.get_boolean(key);
                break;
            case 'mode':
                this._removeWidget();
                this._display.destroy();
                this._settingsStore.mode = settings.get_enum(key);
                this._display = this._createNewDisplay();
                this._insertWidget();
                break;
            case 'position':
                this._removeWidget();
                this._settingsStore.position = settings.get_enum(key);
                this._insertWidget();
                break;
            case 'show-icon-text':
                this._settingsStore.showIconText = settings.get_boolean(key);
                if (this._settingsStore.mode == MODES.ICON) {
                    if (this._settingsStore.showIconText) this._display.showLabel(true);
                    else this._display.showLabel(false);
                }
                break;
            case 'show-total-num':
                this._settingsStore.showTotalNum = settings.get_boolean(key);
                if (!this._settingsStore.useNames) this._display.updateWorkspaceNames();
                break;
            case 'use-names':
                this._settingsStore.useNames = settings.get_boolean(key);
                this._display.updateWorkspaceNames();
                break;
        }
    },

    _onWorkspaceAdded: function () {
        this._display.addWorkspace();
    },

    _onWorkspaceRemoved: function () {
        this._display.removeWorkspace();
    },

    _onWorkspaceSettingsChanged: function (settings, key) {
        if (key == 'workspace-names' && this._settingsStore.useNames)
            this._display.updateWorkspaceNames();
    },

    _onWorkspaceSwitched: function () {
        this._display.switchWorkspace();
    }
});

const SettingsStore = new Lang.Class({
    Name: 'SettingsStore',

    _init: function () {
        this.clickAction = null;
        this.currentWorkspace = null;
        this.cyclicScrolling = null;
        this.index = null;
        this.invertScrolling = null;
        this.mode = null;
        this.position = null;
        this.showIconText = null;
        this.showTotalNum = null;
        this.useNames = null;
    }
});
