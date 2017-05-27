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
                         Main.panel._rightBox];

const MODES = { CURRENT: 0, ALL: 1, ICON: 2 }
const MODE_OBJECTS = [WorkspaceDisplay.CurrentWorkspaceDisplay,
                      WorkspaceDisplay.AllWorkspacesDisplay,
                      WorkspaceDisplay.IconWorkspaceDisplay];

function hexToRgbaString (hex) {
    let string = 'rgba(';
    string += parseInt(hex.slice(1,3), 16).toString() + ',';
    string += parseInt(hex.slice(3,5), 16).toString() + ',';
    string += parseInt(hex.slice(5,7), 16).toString() + ',';
    string += (parseInt(hex.slice(7,9), 16) / 255).toString() + ')';
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
        settingsStore.borderColourActive = this._settings.get_string('border-colour-active');
        settingsStore.borderColourInactive = this._settings.get_string('border-colour-inactive');
        settingsStore.borderRadius = this._settings.get_int('border-radius');
        settingsStore.borderSizeActive = this._settings.get_int('border-size-active');
        settingsStore.borderSizeInactive = this._settings.get_int('border-size-inactive');
        settingsStore.borderStyleActive = this._settings.get_string('border-style-active');
        settingsStore.borderStyleInactive = this._settings.get_string('border-style-inactive');
        settingsStore.clickAction = this._settings.get_enum('click-action');
        settingsStore.currentWorkspace = global.screen.get_active_workspace().index();
        settingsStore.cyclicScrolling = this._settings.get_boolean('cyclic-scrolling');
        settingsStore.fontColourActive = this._settings.get_string('font-colour-active');
        settingsStore.fontColourInactive = this._settings.get_string('font-colour-inactive');
        settingsStore.fontFamilyActive = this._settings.get_string('font-family-active');
        settingsStore.fontFamilyInactive = this._settings.get_string('font-family-inactive');
        settingsStore.fontSizeActive = this._settings.get_int('font-size-active');
        settingsStore.fontSizeInactive = this._settings.get_int('font-size-inactive');
        settingsStore.fontUseThemeActive = this._settings.get_boolean('font-use-theme-active');
        settingsStore.fontUseThemeInactive = this._settings.get_boolean('font-use-theme-inactive');
        settingsStore.index = this._settings.get_int('index');
        settingsStore.invertScrolling = this._settings.get_boolean('invert-scrolling');
        settingsStore.minHeight = this._settings.get_int('min-height');
        settingsStore.minWidth = this._settings.get_int('min-width');
        settingsStore.mode = this._settings.get_enum('mode');
        settingsStore.paddingHorizontal = this._settings.get_int('padding-horizontal');
        settingsStore.paddingVertical = this._settings.get_int('padding-vertical');
        settingsStore.position = this._settings.get_enum('position');
        settingsStore.showIconText = this._settings.get_boolean('show-icon-text');
        settingsStore.showNames = this._settings.get_boolean('show-names');
        settingsStore.showTotalNum = this._settings.get_boolean('show-total-num');

        settingsStore.makeActiveBackgroundString();
        settingsStore.makeInactiveBackgroundString();
        settingsStore.makeActiveBorderString();
        settingsStore.makeInactiveBorderString();
        settingsStore.makeActiveFontString();
        settingsStore.makeInactiveFontString();
        settingsStore.makeSizeString();

        return settingsStore;
    },

    _removeWidget: function () {
        removeFromPosition(this._display,
                           this._settingsStore.position);
    },

    _onSettingsChanged: function (settings, key) {
        switch (key) {
            case 'background-colour-active':
                this._settingsStore.backgroundColourActive = settings.get_string(key);
                this._settingsStore.makeActiveBackgroundString();
                this._display.updateStyle();
                break;
            case 'background-colour-inactive':
                this._settingsStore.backgroundColourInactive = settings.get_string(key);
                this._settingsStore.makeInactiveBackgroundString();
                this._display.updateStyle();
                break;
            case 'border-colour-active':
                this._settingsStore.borderColourActive = settings.get_string(key);
                this._settingsStore.makeActiveBorderString();
                this._display.updateStyle();
                break;
            case 'border-colour-inactive':
                this._settingsStore.borderColourInactive = settings.get_string(key);
                this._settingsStore.makeInactiveBorderString();
                this._display.updateStyle();
                break;
            case 'border-radius':
                this._settingsStore.borderRadius = settings.get_int(key);
                this._settingsStore.makeActiveBorderString();
                this._settingsStore.makeInactiveBorderString();
                this._display.updateStyle();
                break;
            case 'border-size-active':
                this._settingsStore.borderSizeActive = settings.get_int(key);
                this._settingsStore.makeActiveBorderString();
                this._display.updateStyle();
                break;
            case 'border-size-inactive':
                this._settingsStore.borderSizeInactive = settings.get_int(key);
                this._settingsStore.makeInactiveBorderString();
                this._display.updateStyle();
                break;
            case 'border-style-active':
                this._settingsStore.borderStyleActive = settings.get_string(key);
                this._settingsStore.makeActiveBorderString();
                this._display.updateStyle();
                break;
            case 'border-style-inactive':
                this._settingsStore.borderStyleInactive = settings.get_string(key);
                this._settingsStore.makeInactiveBorderString();
                this._display.updateStyle();
                break;
            case 'click-action':
                this._settingsStore.clickAction = settings.get_enum(key);
                break;
            case 'cyclic-scrolling':
                this._settingsStore.cyclicScrolling = settings.get_boolean(key);
                break;
            case 'font-colour-active':
                this._settingsStore.fontColourActive = settings.get_string(key);
                this._settingsStore.makeActiveFontString();
                this._display.updateStyle();
                break;
            case 'font-colour-inactive':
                this._settingsStore.fontColourInactive = settings.get_string(key);
                this._settingsStore.makeInactiveFontString();
                this._display.updateStyle();
                break;
            case 'font-family-active':
                this._settingsStore.fontFamilyActive = settings.get_string(key);
                this._settingsStore.makeActiveFontString();
                this._display.updateStyle();
                break;
            case 'font-family-inactive':
                this._settingsStore.fontFamilyInactive = settings.get_string(key);
                this._settingsStore.makeInactiveFontString();
                this._display.updateStyle();
                break;
            case 'font-size-active':
                this._settingsStore.fontSizeActive = settings.get_int(key);
                this._settingsStore.makeActiveFontString();
                this._display.updateStyle();
                break;
            case 'font-size-inactive':
                this._settingsStore.fontSizeInactive = settings.get_int(key);
                this._settingsStore.makeInactiveFontString();
                this._display.updateStyle();
                break;
            case 'font-use-theme-active':
                this._settingsStore.fontUseThemeActive = settings.get_boolean(key);
                this._display.updateStyle();
                break;
            case 'font-use-theme-inactive':
                this._settingsStore.fontUseThemeInactive = settings.get_boolean(key);
                this._display.updateStyle();
                break;
            case 'index':
                this._settingsStore.index = settings.get_int(key);
                this._removeWidget();
                this._insertWidget();
                break;
            case 'invert-scrolling':
                this._settingsStore.invertScrolling = settings.get_boolean(key);
                break;
            case 'min-height':
                this._settingsStore.minHeight = settings.get_int(key);
                this._settingsStore.makeSizeString();
                this._display.updateStyle();
                break;
            case 'min-width':
                this._settingsStore.minWidth = settings.get_int(key);
                this._settingsStore.makeSizeString();
                this._display.resetWorkspaceNames(); // Prevents alignment issues
                this._display.updateStyle();
                break;
            case 'mode':
                this._removeWidget();
                this._display.destroy();
                this._settingsStore.mode = settings.get_enum(key);
                this._display = new MODE_OBJECTS[this._settingsStore.mode](this._settingsStore);
                this._insertWidget();
                break;
            case 'padding-horizontal':
                this._settingsStore.paddingHorizontal = settings.get_int(key);
                this._settingsStore.makeSizeString();
                this._display.updateStyle();
                break;
            case 'padding-vertical':
                this._settingsStore.paddingVertical = settings.get_int(key);
                this._settingsStore.makeSizeString();
                this._display.updateStyle();
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
            case 'show-names':
                this._settingsStore.showNames = settings.get_boolean(key);
                this._display.updateWorkspaceNames();
                break;
            case 'show-total-num':
                this._settingsStore.showTotalNum = settings.get_boolean(key);
                if (!this._settingsStore.showNames) this._display.updateWorkspaceNames();
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

const SettingsStore = new Lang.Class({
    Name: 'SettingsStore',

    _init: function () {
        this.backgroundColourActive = null;
        this.backgroundColourInactive = null;
        this.borderColourActive = null;
        this.borderColourInactive = null;
        this.borderRadius = null;
        this.borderSizeActive = null;
        this.borderSizeInactive = null;
        this.borderStyleActive = null;
        this.borderStyleInactive = null;
        this.clickAction = null;
        this.currentWorkspace = null;
        this.cyclicScrolling = null;
        this.fontColourActive = null;
        this.fontColourInactive = null;
        this.fontFamilyActive = null;
        this.fontFamilyInactive = null;
        this.fontSizeActive = null;
        this.fontSizeInactive = null;
        this.fontUseThemeActive = null;
        this.fontUseThemeInactive = null;
        this.index = null;
        this.invertScrolling = null;
        this.minHeight = null;
        this.minWidth = null;
        this.mode = null;
        this.paddingHorizontal = null;
        this.paddingVertical = null;
        this.position = null;
        this.showIconText = null;
        this.showNames = null;
        this.showTotalNum = null;
        this.styleStringBackgroundActive = null;
        this.styleStringBackgroundInactive = null;
        this.styleStringBorderActive = null;
        this.styleStringBorderInactive = null;
        this.styleStringFontActive = null;
        this.styleStringFontInactive = null;
        this.styleStringSize = null;
    },

    makeActiveBackgroundString: function () {
        this.styleStringBackgroundActive = 'background-color:' +
            hexToRgbaString(this.backgroundColourActive) + ';';
    },

    makeInactiveBackgroundString: function () {
        this.styleStringBackgroundInactive = 'background-color: ' +
            hexToRgbaString(this.backgroundColourInactive) + ';';
    },

    makeActiveBorderString: function () {
        this.styleStringBorderActive = 'border: ' +
                                       this.borderSizeActive + 'px ' +
                                       this.borderStyleActive + ' ' +
                                       hexToRgbaString(this.borderColourActive) + ';' +
                                       'border-radius: ' +
                                       this.borderRadius + 'px; ';
    },

    makeInactiveBorderString: function () {
        this.styleStringBorderInactive = 'border: ' +
                                         this.borderSizeInactive + 'px ' +
                                         this.borderStyleInactive + ' ' +
                                         hexToRgbaString(this.borderColourInactive) + ';' +
                                         'border-radius: ' +
                                         this.borderRadius + 'px; ';
    },

    makeActiveFontString: function () {
        this.styleStringFontActive = 'font-size: ' +
                                     this.fontSizeActive + 'pt; ' +
                                     'font-family: ' +
                                     this.fontFamilyActive + '; ' +
                                     'color: ' +
                                     hexToRgbaString(this.fontColourActive) + ';';
    },

    makeInactiveFontString: function () {
        this.styleStringFontInactive = 'font-size: ' +
                                       this.fontSizeInactive + 'pt; ' +
                                       'font-family: ' +
                                       this.fontFamilyInactive + '; ' +
                                       'color: ' +
                                       hexToRgbaString(this.fontColourInactive) + ';';
    },

    makeSizeString: function () {
        this.styleStringSize = 'padding: ' +
                               this.paddingVertical + 'px ' +
                               this.paddingHorizontal + 'px; ' +
                               'min-height: ' +
                               this.minHeight + 'px; ' +
                               'min-width: ' +
                               this.minWidth + 'px; ' +
                               'margin: 0px 1px;';
    }
});
