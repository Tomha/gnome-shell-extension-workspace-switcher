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

    init: function () { }, // Called by GNOME Shell when extension first loaded

    enable: function () {
        this._settings = Settings.getSettings();
        this._settingsStore = new SettingsStore(this._settings);
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

    _removeWidget: function () {
        removeFromPosition(this._display,
                           this._settingsStore.position);
    },

    _onSettingsChanged: function (settings, key) {
        switch (key) {
            case 'background-colour-active':
                this._settingsStore.backgroundColourActive = settings.get_string(key);
                this._settingsStore.makeActiveDecorationStyleString();
                this._display.updateStyle();
                break;
            case 'background-colour-inactive':
                this._settingsStore.backgroundColourInactive = settings.get_string(key);
                this._settingsStore.makeInactiveDecorationStyleString();
                this._display.updateStyle();
                break;
            case 'border-colour-active':
                this._settingsStore.borderColourActive = settings.get_string(key);
                this._settingsStore.makeActiveDecorationStyleString();
                this._display.updateStyle();
                break;
            case 'border-colour-inactive':
                this._settingsStore.borderColourInactive = settings.get_string(key);
                this._settingsStore.makeInactiveDecorationStyleString();
                this._display.updateStyle();
                break;
            case 'border-locations':
                this._settingsStore.borderLocations = settings.get_strv(key);
                this._settingsStore.makeActiveDecorationStyleString();
                this._settingsStore.makeInactiveDecorationStyleString();
                this._display.updateStyle();
                break;
            case 'border-radius':
                this._settingsStore.borderRadius = settings.get_int(key);
                this._settingsStore.makeActiveDecorationStyleString();
                this._settingsStore.makeInactiveDecorationStyleString();
                this._display.updateStyle();
                break;
            case 'border-size-active':
                this._settingsStore.borderSizeActive = settings.get_int(key);
                this._settingsStore.makeActiveDecorationStyleString();
                this._display.updateStyle();
                break;
            case 'border-size-inactive':
                this._settingsStore.borderSizeInactive = settings.get_int(key);
                this._settingsStore.makeInactiveDecorationStyleString();
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
                this._settingsStore.makeActiveFontStyleString();
                this._display.updateStyle();
                break;
            case 'font-colour-inactive':
                this._settingsStore.fontColourInactive = settings.get_string(key);
                this._settingsStore.makeInactiveFontStyleString();
                this._display.updateStyle();
                break;
            case 'font-active':
                this._settingsStore.fontActive = settings.get_string(key);
                this._settingsStore.makeActiveFontStyleString();
                this._display.updateStyle();
                break;
            case 'font-inactive':
                this._settingsStore.fontInactive = settings.get_string(key);
                this._settingsStore.makeInactiveFontStyleString();
                this._display.updateStyle();
                break;
            case 'font-colour-use-theme-active':
                this._settingsStore.fontColourUseThemeActive = settings.get_boolean(key);
                this._settingsStore.makeActiveFontStyleString();
                this._display.updateStyle();
                break;
            case 'font-colour-use-theme-inactive':
                this._settingsStore.fontColourUseThemeInactive = settings.get_boolean(key);
                this._settingsStore.makeInactiveFontStyleString();
                this._display.updateStyle();
                break;
            case 'font-use-theme-active':
                this._settingsStore.fontUseThemeActive = settings.get_boolean(key);
                this._settingsStore.makeActiveFontStyleString();
                this._display.updateStyle();
                break;
            case 'font-use-theme-inactive':
                this._settingsStore.fontUseThemeInactive = settings.get_boolean(key);
                this._settingsStore.makeInactiveFontStyleString();
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
                this._settingsStore.makeBaseStyleString();
                this._display.updateStyle();
                break;
            case 'min-width':
                this._settingsStore.minWidth = settings.get_int(key);
                this._settingsStore.makeBaseStyleString();
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
                this._settingsStore.makeBaseStyleString();
                this._display.updateStyle();
                break;
            case 'padding-vertical':
                this._settingsStore.paddingVertical = settings.get_int(key);
                this._settingsStore.makeBaseStyleString();
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
            case 'vertical-display':
                this._settingsStore.verticalDisplay = settings.get_boolean(key);
                this._display.updateStyle();
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

    _init: function (settings) {
        this.backgroundColourActive = settings.get_string('background-colour-active');
        this.backgroundColourInactive = settings.get_string('background-colour-inactive');
        this.borderColourActive = settings.get_string('border-colour-active');
        this.borderColourInactive = settings.get_string('border-colour-inactive');
        this.borderLocations = settings.get_strv('border-locations');
        this.borderRadius = settings.get_int('border-radius');
        this.borderSizeActive = settings.get_int('border-size-active');
        this.borderSizeInactive = settings.get_int('border-size-inactive');
        this.clickAction = settings.get_enum('click-action');
        this.currentWorkspace = global.screen.get_active_workspace().index();
        this.cyclicScrolling = settings.get_boolean('cyclic-scrolling');
        this.fontColourActive = settings.get_string('font-colour-active');
        this.fontColourInactive = settings.get_string('font-colour-inactive');
        this.fontActive = settings.get_string('font-active');
        this.fontInactive = settings.get_string('font-inactive');
        this.fontColourUseThemeActive = settings.get_boolean('font-colour-use-theme-active');
        this.fontColourUseThemeInactive = settings.get_boolean('font-colour-use-theme-inactive');
        this.fontUseThemeActive = settings.get_boolean('font-use-theme-active');
        this.fontUseThemeInactive = settings.get_boolean('font-use-theme-inactive');
        this.index = settings.get_int('index');
        this.invertScrolling = settings.get_boolean('invert-scrolling');
        this.minHeight = settings.get_int('min-height');
        this.minWidth = settings.get_int('min-width');
        this.mode = settings.get_enum('mode');
        this.paddingHorizontal = settings.get_int('padding-horizontal');
        this.paddingVertical = settings.get_int('padding-vertical');
        this.position = settings.get_enum('position');
        this.showIconText = settings.get_boolean('show-icon-text');
        this.showNames = settings.get_boolean('show-names');
        this.showTotalNum = settings.get_boolean('show-total-num');
        this.verticalDisplay = settings.get_boolean('vertical-display');

        this.makeBaseStyleString();
        this.makeActiveDecorationStyleString();
        this.makeInactiveDecorationStyleString();
        this.makeActiveFontStyleString();
        this.makeInactiveFontStyleString();
    },

    makeBaseStyleString: function () {
        this.styleStringBase = 'margin: 0px 1px;' +
                               'min-height:' + this.minHeight + 'px;' +
                               'min-width:' + this.minWidth + 'px;' +
                               'padding:' + this.paddingVertical + 'px ' +
                                    this.paddingHorizontal + 'px;' +
                               'text-align:center;' +
                               'vertical-align: middle;';
    },

    makeActiveDecorationStyleString: function () {
        this.styleStringDecorationActive =
            'background-color: ' + hexToRgbaString(this.backgroundColourActive) + ';' +
            'border-color:' + hexToRgbaString(this.borderColourActive) + ';' +
            'border-radius:'+ this.borderRadius + 'px;';

        this.styleStringDecorationActive += 'border-top-width:' +
            (this.borderLocations.indexOf('TOP') > -1 ? this.borderSizeActive + 'px;' : '0px;');

         this.styleStringDecorationActive += 'border-right-width:' +
            (this.borderLocations.indexOf('RIGHT') > -1 ? this.borderSizeActive + 'px;' : '0px;');

        this.styleStringDecorationActive += 'border-bottom-width:' +
            (this.borderLocations.indexOf('BOTTOM') > -1 ? this.borderSizeActive + 'px;' : '0px;');

        this.styleStringDecorationActive += 'border-left-width:' +
            (this.borderLocations.indexOf('LEFT') > -1 ? this.borderSizeActive + 'px;' : '0px;');
    },

    makeInactiveDecorationStyleString: function () {
        this.styleStringDecorationInactive =
            'background-color: ' + hexToRgbaString(this.backgroundColourInactive) + ';' +
            'border-color:' + hexToRgbaString(this.borderColourInactive) + ';' +
            'border-radius:'+ this.borderRadius + 'px;';

        this.styleStringDecorationInactive += 'border-top-width:' +
            (this.borderLocations.indexOf('TOP') > -1 ? this.borderSizeInactive + 'px;' : '0px;');

         this.styleStringDecorationInactive += 'border-right-width:' +
            (this.borderLocations.indexOf('RIGHT') > -1 ? this.borderSizeInactive + 'px;' : '0px;');

        this.styleStringDecorationInactive += 'border-bottom-width:' +
            (this.borderLocations.indexOf('BOTTOM') > -1 ? this.borderSizeInactive + 'px;' : '0px;');

        this.styleStringDecorationInactive += 'border-left-width:' +
            (this.borderLocations.indexOf('LEFT') > -1 ? this.borderSizeInactive + 'px;' : '0px;');
    },

    makeActiveFontStyleString: function () {
        this.styleStringFontActive = '';
        if (!this.fontColourUseThemeActive)
            this.styleStringFontActive +=
                'color:' + hexToRgbaString(this.fontColourActive) + ';';
        if (!this.fontUseThemeActive) {
            let font = Pango.FontDescription.from_string(this.fontActive);
            this.styleStringFontActive +=
                'font-size:' + font.get_size()/PANGO_UNITS_PER_PT  + 'pt;' +
                'font-family:' + font.get_family() + ';' +
                'font-weight:' + PANGO_WEIGHTS[font.get_weight()] + ';' +
                'font-style:' + PANGO_STYLES[font.get_style()] + ';';
        }
    },

    makeInactiveFontStyleString: function () {
        this.styleStringFontInactive = '';
        if (!this.fontColourUseThemeInactive)
            this.styleStringFontInactive +=
                'color:' + hexToRgbaString(this.fontColourInactive) + ';';
        if (!this.fontUseThemeInactive) {
            let font = Pango.FontDescription.from_string(this.fontInactive);
            this.styleStringFontInactive +=
                'font-size:' + font.get_size()/PANGO_UNITS_PER_PT  + 'pt;' +
                'font-family:' + font.get_family() + ';' +
                'font-weight:' + PANGO_WEIGHTS[font.get_weight()] + ';' +
                'font-style:' + PANGO_STYLES[font.get_style()] + ';';
        }
    }
});
