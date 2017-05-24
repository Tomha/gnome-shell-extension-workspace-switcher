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
const MODE_OBJECTS = [WorkspaceDisplay.CurrentWorkspaceDisplay,
                      WorkspaceDisplay.AllWorkspacesDisplay,
                      WorkspaceDisplay.IconWorkspaceDisplay]

function hexToRgbaString (hex) {
    let string = 'rgba(';
    string += parseInt(hex.slice(1,3), 16).toString() + ','
    string += parseInt(hex.slice(3,5), 16).toString() + ','
    string += parseInt(hex.slice(5,7), 16).toString() + ','
    string += (parseInt(hex.slice(7,9), 16) / 255).toString() + ')'
    return string;
}

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

        this._display = new MODE_OBJECTS[this._settingsStore.mode](this._settingsStore);
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

    _insertWidget: function () {
        insertAtPosition(this._display,
                         this._settingsStore.position,
                         this._settingsStore.index);
    },

    _loadSettings: function () {
        let settingsStore = new SettingsStore();

        settingsStore.backgroundColourActive = this._settings.get_string('background-colour-active');
        settingsStore.backgroundColourInactive = this._settings.get_string('background-colour-inactive');
        settingsStore.borderColour = this._settings.get_string('border-colour');
        settingsStore.borderSize = this._settings.get_int('border-size');
        settingsStore.borderStyle = this._settings.get_string('border-style');
        settingsStore.clickAction = this._settings.get_enum('click-action');
        settingsStore.currentWorkspace = global.screen.get_active_workspace().index();
        settingsStore.cyclicScrolling = this._settings.get_boolean('cyclic-scrolling');
        settingsStore.fontColour = this._settings.get_string('font-colour');
        settingsStore.fontFamily = this._settings.get_string('font-family');
        settingsStore.fontSize = this._settings.get_int('font-size');
        settingsStore.fontUseTheme = this._settings.get_boolean('font-use-theme');
        settingsStore.index = this._settings.get_int('index');
        settingsStore.invertScrolling = this._settings.get_boolean('invert-scrolling');
        settingsStore.minHeight = this._settings.get_int('min-height');
        settingsStore.minWidth = this._settings.get_int('min-width');
        settingsStore.mode = this._settings.get_enum('mode');
        settingsStore.paddingHorizontal = this._settings.get_int('padding-horizontal');
        settingsStore.paddingVertical = this._settings.get_int('padding-vertical');
        settingsStore.position = this._settings.get_enum('position');
        settingsStore.showIconText = this._settings.get_boolean('show-icon-text');
        settingsStore.showTotalNum = this._settings.get_boolean('show-total-num');
        settingsStore.useNames = this._settings.get_boolean('use-names');

        settingsStore.makeActiveBackgroundString();
        settingsStore.makeBorderString();
        settingsStore.makeFontString();
        settingsStore.makeInactiveBackgroundString();
        settingsStore.makeSizeString();

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
                this._display = new MODE_OBJECTS[this._settingsStore.mode](this._settingsStore);
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
        this.backgroundColourActive = null;
        this.backgroundColourInactive = null;
        this.borderColour = null
        this.borderSize = null;
        this.borderStyle = null;
        this.clickAction = null;
        this.currentWorkspace = null;
        this.cyclicScrolling = null;
        this.fontColour = null;
        this.fontFamily = null;
        this.fontSize = null;
        this.fontUseTheme = null;
        this.index = null;
        this.invertScrolling = null;
        this.minHeight = null;
        this.minWidth = null;
        this.mode = null;
        this.paddingHorizontal = null;
        this.paddingVertical = null;
        this.position = null;
        this.showIconText = null;
        this.showTotalNum = null;
        this.styleStringBackgroundActive = null;
        this.styleStringBackgroundInactive = null;
        this.styleStringBorder = null;
        this.styleStringFont = null;
        this.styleStringSize = null;
        this.useNames = null;
    },

    makeActiveBackgroundString: function () {
        this.styleStringBackgroundActive = 'background-color:' +
            hexToRgbaString(this.backgroundColourActive) + ';';
    },

    makeBorderString: function () {
        this.styleStringBorder = 'border: ' +
                                 this.borderSize + 'px ' +
                                 this.borderStyle + ' ' +
                                 hexToRgbaString(this.borderColour) + ';';
    },

    makeFontString: function () {
        this.styleStringFont = 'font-size: ' +
                               this.fontSize + 'pt; ' +
                               'font-family: ' +
                               this.fontFamily + '; ' +
                               'color: ' +
                               hexToRgbaString(this.fontColour) + ';';
    },

    makeInactiveBackgroundString: function () {
        this.styleStringBackgroundInactive = 'background-color: ' +
            hexToRgbaString(this.backgroundColourInactive) + ';';
    },

    makeSizeString: function () {
        this.styleStringSize = 'padding: ' +
                               this.paddingVertical + 'px ' +
                               this.paddingHorizontal + 'px; ' +
                               'min-height: ' +
                               this.minHeight + 'px; ' +
                               'min-width: ' +
                               this.minWidth + 'px; ' +
                               'margin: 0px 1px;'
    }
});
