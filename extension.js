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

const Pango = imports.gi.Pango;
const Main = imports.ui.main;
const Lang = imports.lang;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Settings = Me.imports.settings;
const WorkspaceDisplay = Me.imports.workspaceDisplay;

const PANEL_POSITIONS = [Main.panel._leftBox,
                         Main.panel._centerBox,
                         Main.panel._rightBox];
const MODES = { CURRENT: 0, ALL: 1, ICON: 2 };
const MODE_OBJECTS = [WorkspaceDisplay.CurrentWorkspaceDisplay,
                      WorkspaceDisplay.AllWorkspacesDisplay,
                      WorkspaceDisplay.IconWorkspaceDisplay];
const PANGO_STYLES = {0: 'normal', 1: 'oblique', 2: 'italic'};
const PANGO_UNITS_PER_PT = 1024;
const PANGO_WEIGHTS = { 100: 'thin',
                        200: 'ultralight',
                        300: 'light',
                        380: 'book',
                        400: 'normal',
                        500: 'medium',
                        600: 'semibold',
                        700: 'bold',
                        800: 'ultrabold',
                        900: 'heavy',
                        1000: 'ultraheavy'};

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

    init: function () { },

    enable: function () {
        this._settings = Settings.getSettings();
        this._workspaceSettings = Settings.getSettings('org.gnome.desktop.wm.preferences');
        this._styles = new StyleStore(this._settings);

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

const StyleStore = new Lang.Class({
    Name: 'StyleStore',

    _init: function (gsettings) {
        this._settings = gsettings;
        this.makeBaseStyle();
        this.makeActiveDecorationStyle();
        this.makeInactiveDecorationStyle();
        this.makeActiveFontStyle();
        this.makeInactiveFontStyle();
    },

    makeBaseStyle: function () {
        this.baseStyle =
            'margin:' + this._settings.get_int('margin-vertical') + 'px ' +
                this._settings.get_int('margin-horizontal') + 'px;' +
            'min-height:' + this._settings.get_int('min-height') + 'px;' +
            'min-width:' + this._settings.get_int('min-width') + 'px;' +
            'padding:' + this._settings.get_int('padding-vertical') + 'px ' +
                this._settings.get_int('padding-horizontal') + 'px;' +
            'text-align:center;' +
            'vertical-align: middle;';
    },

    makeActiveDecorationStyle: function () {
        let borderLocations = this._settings.get_strv('border-locations');
        let borderSize = this._settings.get_int('border-size-active').toString() + 'px;';
        this.decorationActiveStyle =
            'background-color:' + hexToRgbaString(this._settings.get_string('background-colour-active')) + ';' +
            'border-color:' + hexToRgbaString(this._settings.get_string('border-colour-active')) + ';' +
            'border-radius:'+ this._settings.get_int('border-radius') + 'px;' +
            'border-top-width:' + (borderLocations.indexOf('TOP') > -1 ? borderSize : '0px;') +
            'border-right-width:' + (borderLocations.indexOf('RIGHT') > -1 ? borderSize : '0px;') +
            'border-bottom-width:' + (borderLocations.indexOf('BOTTOM') > -1 ? borderSize : '0px;') +
            'border-left-width:' + (borderLocations.indexOf('LEFT') > -1 ? borderSize : '0px;');
    },

    makeInactiveDecorationStyle: function () {
        let borderLocations = this._settings.get_strv('border-locations');
        let borderSize = this._settings.get_int('border-size-inactive').toString() + 'px;';
        this.decorationInactiveStyle =
            'background-color:' + hexToRgbaString(this._settings.get_string('background-colour-inactive')) + ';' +
            'border-color:' + hexToRgbaString(this._settings.get_string('border-colour-inactive')) + ';' +
            'border-radius:'+ this._settings.get_int('border-radius') + 'px;' +
            'border-top-width:' + (borderLocations.indexOf('TOP') > -1 ? borderSize : '0px;') +
            'border-right-width:' + (borderLocations.indexOf('RIGHT') > -1 ? borderSize : '0px;') +
            'border-bottom-width:' + (borderLocations.indexOf('BOTTOM') > -1 ? borderSize : '0px;') +
            'border-left-width:' + (borderLocations.indexOf('LEFT') > -1 ? borderSize : '0px;');
    },

    makeActiveFontStyle: function () {
        this.fontActiveStyle = '';
        if (this._settings.get_boolean('font-colour-use-custom-active'))
            this.fontActiveStyle +=
                'color:' + hexToRgbaString(this._settings.get_string('font-colour-active')) + ';';
        if (this._settings.get_boolean('font-use-custom-active')) {
            let font = Pango.FontDescription.from_string(this._settings.get_string('font-active'));
            this.fontActiveStyle +=
                'font-size:' + font.get_size()/PANGO_UNITS_PER_PT  + 'pt;' +
                'font-family:' + font.get_family() + ';' +
                'font-weight:' + PANGO_WEIGHTS[font.get_weight()] + ';' +
                'font-style:' + PANGO_STYLES[font.get_style()] + ';';
        }
    },

    makeInactiveFontStyle: function () {
        this.fontInactiveStyle = '';
        if (this._settings.get_boolean('font-colour-use-custom-inactive'))
            this.fontInactiveStyle +=
                'color:' + hexToRgbaString(this._settings.get_string('font-colour-inactive')) + ';';
        if (this._settings.get_boolean('font-use-custom-inactive')) {
            let font = Pango.FontDescription.from_string(this._settings.get_string('font-inactive'));
            this.fontInactiveStyle +=
                'font-size:' + font.get_size()/PANGO_UNITS_PER_PT  + 'pt;' +
                'font-family:' + font.get_family() + ';' +
                'font-weight:' + PANGO_WEIGHTS[font.get_weight()] + ';' +
                'font-style:' + PANGO_STYLES[font.get_style()] + ';';
        }
    }
});
