/* Copyright (C) 2017 Tom Hartill

prefs.js - Preferences file for the Workspace Switcher extension. Defines a set
of GTK widgets to populate a preferences dialog, allowing modification of
extension preferences and settings.

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

const Gdk = imports.gi.Gdk;
const Gtk = imports.gi.Gtk;

const Lang = imports.lang;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Settings = Me.imports.settings;

const ACTIONS = ['actionActivities', 'actionPopup', 'actionNone'];
const BORDER_STYLES = ['dashed', 'dotted', 'double', 'groove', 'inset',
                       'outset', 'ridge', 'solid'];
const MODES = ['modeCurrent', 'modeAll', 'modeIcon'];
const POSITIONS = ['positionLeft', 'positionCenter', 'positionRight'];

function hexToRgba (hex) {
    let colour = new Gdk.RGBA();
    colour.red = parseInt(hex.slice(1,3), 16) / 255;
    colour.green = parseInt(hex.slice(3,5), 16) / 255;
    colour.blue = parseInt(hex.slice(5,7), 16) / 255;
    colour.alpha = parseInt(hex.slice(7,9), 16) / 255;
    return colour;
}

function rgbaToHex (rgba) {
    let red = (parseInt(rgba.red * 255)).toString(16);
    if (red.length == 1) red = "0" + red;
    let green = (parseInt(rgba.green * 255)).toString(16);
    if (green.length == 1) green = "0" + green;
    let blue = (parseInt(rgba.blue * 255)).toString(16);
    if (blue.length == 1) blue = "0" + blue;
    let alpha = (parseInt(rgba.alpha * 255)).toString(16);
    if (alpha.length == 1) alpha = "0" + alpha;
    return "#" + red + green + blue + alpha;
}

function WorkspaceSwitcherPrefs () {
    this.init();
}

WorkspaceSwitcherPrefs.prototype = {
    init: function () {
        this._settings = Settings.getSettings();
        this._workspaceSettings = Settings.getSettings('org.gnome.desktop.wm.preferences');

        this._builder = new Gtk.Builder();
        this._builder.add_from_file(Me.path + '/prefs.ui');

        this.widget = this._builder.get_object('container');
        this._debug = this._builder.get_object('debug'); // DEBUG
        this._populate();
        this._populateStyle();
        this._builder.connect_signals_full(Lang.bind(this, this._signalConnector));
    },

    _populate: function () {
        let widget, value;

        value = this._settings.get_enum('click-action');
        widget = this._builder.get_object(ACTIONS[value]);
        widget.set_active(true);

        value = this._settings.get_int('index');
        widget = this._builder.get_object('index');
        widget.set_value(value);

        value = this._settings.get_enum('mode');
        widget = this._builder.get_object(MODES[value]);
        widget.set_active(true);

        value = this._settings.get_enum('position');
        widget = this._builder.get_object(POSITIONS[value]);
        widget.set_active(true);

        value = this._settings.get_boolean('use-names');
        widget = this._builder.get_object('useNames');
        widget.set_active(value);

        value = this._settings.get_boolean('show-total-num');
        widget = this._builder.get_object('showTotalNum');
        widget.set_active(value);

        value = this._settings.get_boolean('show-icon-text');
        widget = this._builder.get_object('showIconText');
        widget.set_active(value);

        value = this._settings.get_boolean('invert-scrolling');
        widget = this._builder.get_object('invertScrolling');
        widget.set_active(value);

        value = this._settings.get_boolean('cyclic-scrolling');
        widget = this._builder.get_object('cyclicScrolling');
        widget.set_active(value);

        this._workspaceNameTreeView = this._builder.get_object('workspaceNameTreeView');
        let column = new Gtk.TreeViewColumn({ title:"Name" });
        let renderer = new Gtk.CellRendererText({ editable: true });
        renderer.connect('edited', Lang.bind(this, this._signalHandler['onWorkspaceRenamed']));
        column.pack_start(renderer, true);
        column.add_attribute(renderer, 'text', 0);
        this._workspaceNameTreeView.append_column(column);
        this._workspaceNameListStore = this._builder.get_object('workspaceNameListStore');
        let names = this._workspaceSettings.get_strv('workspace-names');
        let [notEmpty, iter] = this._workspaceNameListStore.get_iter_first();
        for (let i = 0; i < names.length; i++) {
            iter = this._workspaceNameListStore.append();
            this._workspaceNameListStore.set_value(iter, 0, names[i]);
        }

        let toolbar = this._builder.get_object('workspaceToolbar');
        toolbar.get_style_context().add_class(Gtk.STYLE_CLASS_INLINE_TOOLBAR);
        let addButton = new Gtk.ToolButton({icon_name: 'list-add-symbolic'});
        addButton.connect('clicked', Lang.bind(this, this._signalHandler['onWorkspaceAdded']));
        toolbar.add(addButton);
        let delButton = new Gtk.ToolButton({icon_name: 'list-remove-symbolic'});
        delButton.connect('clicked', Lang.bind(this, this._signalHandler['onWorkspaceRemoved']));
        toolbar.add(delButton);

    },

    _populateStyle: function () {
        let widget, value;

        value = this._settings.get_int('font-size');
        widget = this._builder.get_object('fontSize');
        widget.set_value(value);

        // TODO: Font style

        value = this._settings.get_string('font-colour');
        widget = this._builder.get_object('fontColour');
        widget.set_rgba(hexToRgba(value));

        value = this._settings.get_boolean('font-use-theme');
        widget = this._builder.get_object('fontUseTheme');
        widget.set_active(value);

        value = this._settings.get_int('border-size');
        widget = this._builder.get_object('borderSize');
        widget.set_value(value);

        // TODO: Border style

        value = this._settings.get_string('border-colour');
        widget = this._builder.get_object('borderColour');
        widget.set_rgba(hexToRgba(value));

        value = this._settings.get_int('border-size');
        widget = this._builder.get_object('borderSize');
        widget.set_value(value);

        value = this._settings.get_string('background-colour-inactive');
        widget = this._builder.get_object('backgroundColourInactive');
        widget.set_rgba(hexToRgba(value));

        value = this._settings.get_string('background-colour-active');
        widget = this._builder.get_object('backgroundColourActive');
        widget.set_rgba(hexToRgba(value));

        value = this._settings.get_int('padding-horizontal');
        widget = this._builder.get_object('paddingHorizontal');
        widget.set_value(value);

        value = this._settings.get_int('padding-vertical');
        widget = this._builder.get_object('paddingVertical');
        widget.set_value(value);

        value = this._settings.get_int('min-width');
        widget = this._builder.get_object('minWidth');
        widget.set_value(value);

        value = this._settings.get_int('min-height');
        widget = this._builder.get_object('minHeight');
        widget.set_value(value);
    },

    _signalConnector: function (builder, object, signal, handler) {
        object.connect(signal, Lang.bind(this, this._signalHandler[handler]));
    },

    _signalHandler: {
        onBackgroundColourActiveChanged: function (button) {
            this._settings.set_string('background-colour-active', rgbaToHex(button.get_rgba()));
            this._settings.apply();
        },

        onBackgroundColourInactiveChanged: function (button) {
            this._settings.set_string('background-colour-inactive', rgbaToHex(button.get_rgba()));
            this._settings.apply();
        },

        onBorderColourChanged: function (button) {
            this._settings.set_string('border-colour', rgbaToHex(button.get_rgba()));
            this._settings.apply();
        },

        onBorderFamilyChanged: function (combobox) {
            // TODO:
        },

        onBorderRadiusChanged: function (scale) {
            this._settings.set_int('border-radius', scale.get_value());
            this._settings.apply();
        },

        onBorderSizeChanged: function (spinbutton) {
            this._settings.set_int('border-size', spinbutton.get_value_as_int());
            this._settings.apply();
        },

        onClickActionChanged: function (radiobutton) {
            if(radiobutton.get_active()) {
                this._settings.set_enum('click-action', ACTIONS.indexOf(radiobutton.get_name()));
                this._settings.apply();
            }
        },

        onCyclicScrollingChanged: function (toggleswitch) {
            this._settings.set_boolean('cyclic-scrolling', toggleswitch.get_active());
            this._settings.apply();
        },

        onIndexChanged: function (spinbutton) {
            this._settings.set_int('index', spinbutton.get_value_as_int());
            this._settings.apply();
        },

        onInvertScrollingChanged: function (toggleswitch) {
            this._settings.set_boolean('invert-scrolling', toggleswitch.get_active());
            this._settings.apply();
        },

        onFontColourChanged: function (button) {
            this._settings.set_string('font-colour', rgbaToHex(button.get_rgba()));
            this._settings.apply();
        },

        onFontFamilyChanged: function (combobox) {
            // TODO:
        },

        onFontSizeChanged: function (spinbutton) {
            this._settings.set_int('font-size', spinbutton.get_value_as_int());
            this._settings.apply();
        },

        onFontUseThemeChanged: function (toggleswitch) {
            this._settings.set_boolean('font-use-theme', toggleswitch.get_active());
            this._settings.apply();
        },

        onMinHeightChanged: function (scale) {
            this._settings.set_int('min-height', scale.get_value());
            this._settings.apply();
        },

        onMinWidthChanged: function (scale) {
            this._settings.set_int('min-width', scale.get_value());
            this._settings.apply();
        },

        onModeChanged: function (radiobutton) {
            if(radiobutton.get_active()) {
                this._settings.set_enum('mode', MODES.indexOf(radiobutton.get_name()));
                this._settings.apply();
            }
        },

        onPaddingHorizontalChanged: function (scale) {
            this._settings.set_int('padding-horizontal', scale.get_value());
            this._settings.apply();
        },

        onPaddingVerticalChanged: function (scale) {
            this._settings.set_int('padding-vertical', scale.get_value());
            this._settings.apply();
        },

        onPositionChanged: function (radiobutton) {
            if(radiobutton.get_active()) {
                this._settings.set_enum('position', POSITIONS.indexOf(radiobutton.get_name()));
                this._settings.apply();
            }
        },

        onResetBackgroundColourActive: function (button) {
            this._settings.reset('background-colour-active');
            let widget = this._builder.get_object('backgroundColourActive');
            let value = this._settings.get_string('background-colour-active');
            widget.set_rgba(hexToRgba(value));
        },

        onResetBackgroundColourInactive: function (button) {
            this._settings.reset('background-colour-inactive');
            let widget = this._builder.get_object('backgroundColourInactive');
            let value = this._settings.get_string('background-colour-inactive');
            widget.set_rgba(hexToRgba(value));
        },

        onResetBorderColour: function (button) {
            this._settings.reset('border-colour');
            let widget = this._builder.get_object('borderColour');
            let value = this._settings.get_string('border-colour');
            widget.set_rgba(hexToRgba(value));
        },

        onResetBorderRadius: function (button) {
            this._settings.reset('border-radius');
            let widget = this._builder.get_object('borderRadius');
            let value = this._settings.get_int('border-radius');
            widget.set_value(value);
        },

        onResetBorderSize: function (button) {
            this._settings.reset('border-size');
            let widget = this._builder.get_object('borderSize');
            let value = this._settings.get_int('border-size');
            widget.set_value(value);
        },

        onResetBorderStyle: function (button) {
            // TODO:
            //this._settings.reset('border-style');
            //let widget = this._builder.get_object('borderStyle');
            //let value = this._settings.get_enum('border-style');
            //widget.set_(value);
        },

        onResetFontColour: function (button) {
            this._settings.reset('font-colour');
            let widget = this._builder.get_object('fontColour');
            let value = this._settings.get_string('font-colour');
            widget.set_rgba(hexToRgba(value));
        },

        onResetFontFamily: function (button) {
            this._settings.reset('font-family');
            let widget = this._builder.get_object('fontFamily');
            let value = this._settings.get_string('font-family');
            // TODO: widget.set_active(value);
        },

        onResetFontSize: function (button) {
            this._settings.reset('font-size');
            let widget = this._builder.get_object('fontSize');
            let value = this._settings.get_int('font-size');
            widget.set_value(value);
        },

        onResetFontUseTheme: function (button) {
            this._settings.reset('font-use-theme');
            let widget = this._builder.get_object('fontUseTheme');
            let value = this._settings.get_boolean('font-use-theme');
            widget.set_active(value);
        },

        onResetMinHeight: function (button) {
            this._settings.reset('min-height');
            let widget = this._builder.get_object('minHeight');
            let value = this._settings.get_int('min-height');
            widget.set_value(value);
        },

        onResetMinWidth: function (button) {
            this._settings.reset('min-width');
            let widget = this._builder.get_object('minWidth');
            let value = this._settings.get_int('min-width');
            widget.set_value(value);
        },

        onResetPaddingHorizontal: function (button) {
            this._settings.reset('padding-horizontal');
            let widget = this._builder.get_object('paddingHorizontal');
            let value = this._settings.get_int('padding-horizontal');
            widget.set_value(value);
        },

        onResetPaddingVertical: function (button) {
            this._settings.reset('padding-vertical');
            let widget = this._builder.get_object('paddingVertical');
            let value = this._settings.get_int('padding-vertical');
            widget.set_value(value);
        },

        onShowIconTextChanged: function (toggleswitch) {
            this._settings.set_boolean('show-icon-text', toggleswitch.get_active());
            this._settings.apply();
        },

        onShowTotalNumChanged: function (toggleswitch) {
            this._settings.set_boolean('show-total-num', toggleswitch.get_active());
            this._settings.apply();
        },

        onUseNamesChanged: function (toggleswitch) {
            this._settings.set_boolean('use-names', toggleswitch.get_active());
            this._settings.apply();
        },

        onWorkspaceAdded: function (button) {
            let iter = this._workspaceNameListStore.append();
            let workspaceNum = this._workspaceNameListStore.get_path(iter).get_indices()[0] + 1;
            let workspaceName = 'Workspace ' + workspaceNum;
            let names = this._workspaceSettings.get_strv('workspace-names');
            names.push(workspaceName);
            this._workspaceSettings.set_strv('workspace-names', names);
            this._workspaceSettings.apply();
            this._workspaceNameListStore.set_value(iter, 0, 'Workspace ' + workspaceNum);
        },

        onWorkspaceRemoved: function (button) {
            let [notEmpty, model, iter] = this._workspaceNameTreeView.get_selection().get_selected();
            if (notEmpty) {
                let index = this._workspaceNameListStore.get_path(iter).get_indices()[0];
                let names = this._workspaceSettings.get_strv('workspace-names');
                names.splice(index, 1);
                this._workspaceSettings.set_strv('workspace-names', names);
                this._workspaceSettings.apply();
                this._workspaceNameListStore.remove(iter);
            }
        },

        onWorkspaceRenamed: function (renderer, path, text) {
            let [iterSet, iter] = this._workspaceNameListStore.get_iter_from_string(path);
            if (iterSet) {
                let index = this._workspaceNameListStore.get_path(iter).get_indices()[0];
                let names = this._workspaceSettings.get_strv('workspace-names');
                names[index] = text;
                this._workspaceSettings.set_strv('workspace-names', names);
                this._workspaceSettings.apply();
                this._workspaceNameListStore.set_value(iter, 0, text);
            }
        },
    }
}

function buildPrefsWidget () {
    prefs = new WorkspaceSwitcherPrefs();
    prefs.widget.show_all();
    return prefs.widget;
}

function init () { }

