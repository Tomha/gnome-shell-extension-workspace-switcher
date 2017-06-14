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

const Main = imports.ui.main;
const Lang = imports.lang;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Settings = Me.imports.settings;
const StylesStorage = Me.imports.stylesStorage;
const WorkspaceDisplays = Me.imports.workspaceDisplays;

const PANEL_POSITIONS = [Main.panel._leftBox,
                         Main.panel._centerBox,
                         Main.panel._rightBox];
const MODES = { CURRENT: 0, ALL: 1, ICON: 2 };
const MODE_OBJECTS = [WorkspaceDisplays.CurrentWorkspaceDisplay,
                      WorkspaceDisplays.AllWorkspacesDisplay,
                      WorkspaceDisplays.IconWorkspaceDisplay];

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

    init: function () { },

    enable: function () {
        this._settings = Settings.getSettings();
        this._workspaceSettings = Settings.getSettings('org.gnome.desktop.wm.preferences');
        this._styles = new StylesStorage.StyleStore(this._settings);

        this._display = new MODE_OBJECTS[this._settings.get_enum('mode')](this._settings, this._styles);
        this._insertDisplay();

        this._settingsSignal = this._settings.connect('changed', Lang.bind(this, this._onSettingsChanged));
        this._workspaceSettingsSignal = this._workspaceSettings.connect('changed', Lang.bind(this, this._onWorkspaceSettingsChanged));

        this._workspaceSignals = [];
        this._workspaceSignals.push(global.screen.connect('workspace-added', Lang.bind(this, this._onWorkspaceAdded)));
        this._workspaceSignals.push(global.screen.connect('workspace-removed', Lang.bind(this, this._onWorkspaceRemoved)));
        this._workspaceSignals.push(global.screen.connect('workspace-switched', Lang.bind(this, this._onWorkspaceSwitched)));
    },

    disable: function () {
        this._removeDisplay();
        this._display.destroy();

        this._settings.disconnect(this._settingsSignal);
        this._workspaceSettings.disconnect(this._workspaceSettingsSignal);

        for (let i = 0; i < this._workspaceSignals.length; i++)
            global.screen.disconnect(this._workspaceSignals[i]);

        delete this._display;
        delete this._settings;
        delete this._settingsSignal;
        delete this._styles;
        delete this._workspaceSettings;
        delete this._workspaceSettingsSignal;
        delete this._workspaceSignals;
    },

    _insertDisplay: function () {
        this._currentPosition = this._settings.get_enum('position');
        insertAtPosition(this._display, this._currentPosition, this._settings.get_int('index'));
    },

    _removeDisplay: function () {
        removeFromPosition(this._display, this._currentPosition);
        this._currentPosition = null;
    },

    _onSettingsChanged: function (settings, key) {
        switch (key) {
            case 'margin-horizontal':
            case 'margin-vertical':
            case 'min-height':
            case 'padding-horizontal':
            case 'padding-vertical':
                this._styles.makeBaseStyle();
                this._display.updateStyle();
                break;
            case 'background-colour-active':
            case 'border-colour-active':
            case 'border-size-active':
                this._styles.makeActiveDecorationStyle();
                this._display.updateStyle();
                break;
            case 'background-colour-inactive':
            case 'border-colour-inactive':
            case 'border-size-inactive':
                this._styles.makeInactiveDecorationStyle();
                this._display.updateStyle();
                break;
            case 'border-locations':
            case 'border-radius':
                this._styles.makeActiveDecorationStyle();
                this._styles.makeInactiveDecorationStyle();
                this._display.updateStyle();
                break;
            case 'font-colour-active':
            case 'font-active':
            case 'font-colour-use-custom-active':
            case 'font-use-custom-active':
                this._styles.makeActiveFontStyle();
                this._display.updateStyle();
                break;
            case 'font-colour-inactive':
            case 'font-inactive':
            case 'font-colour-use-custom-inactive':
            case 'font-use-custom-inactive':
                this._styles.makeInactiveFontStyle();
                this._display.updateStyle();
                break;
            case 'index':
                this._removeDisplay();
                this._insertDisplay();
                break;
            case 'cyclic-scrolling':
                this._display.setCyclicScrolling(this._settings.get_boolean('cyclic-scrolling'));
                break;
            case 'invert-scrolling':
                this._display.setInvertedScrolling(this._settings.get_boolean('invert-scrolling'));
                break;
            case 'min-width':
                this._styles.makeBaseStyle();
                this._display.resetWorkspaceNames(); // Prevents alignment issues
                this._display.updateStyle();
                break;
            case 'mode':
                this._removeDisplay();
                this._display.destroy();
                this._display = new MODE_OBJECTS[this._settings.get_enum('mode')](this._settings, this._styles);
                this._insertDisplay();
                break;
            case 'position':
                this._removeDisplay();
                this._insertDisplay();
                break;
            case 'show-icon-text':
                if (this._settings.get_enum('mode') == MODES.ICON)
                    this._display.setLabelVisibility(this._settings.get_boolean('show-icon-text'));
                break;
            case 'show-names':
                this._display.updateWorkspaceNames();
                break;
            case 'show-total-num':
                if (!this._settings.get_boolean('show-names')) this._display.updateWorkspaceNames();
                break;
            case 'vertical-display':
                this._display.updateWorkspaceLabelOrientation();
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
        if (key == 'workspace-names' && this._settingsStore.showNames)
            this._display.updateWorkspaceNames();
    },

    _onWorkspaceSwitched: function () {
        this._display.switchWorkspace();
    }
});
