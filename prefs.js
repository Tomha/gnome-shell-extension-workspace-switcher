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

const Gtk = imports.gi.Gtk;

const Lang = imports.lang;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Settings = Me.imports.settings;

const MODES = ['modeCurrent', 'modeAll', 'modeIcon'];
const POSITIONS = ['positionLeft', 'positionCenter', 'positionRight'];

function WorkspaceSwitcherPrefs () {
	this.init();
}

WorkspaceSwitcherPrefs.prototype = {
	init: function () {
	    this._settings = Settings.getSettings();

	    this._builder = new Gtk.Builder();
        this._builder.add_from_file(Me.path + '/prefs.ui');

        this.widget = this._builder.get_object('container');
        this._debug = this._builder.get_object('debug'); // DEBUG
        this._populate();
        this._builder.connect_signals_full(Lang.bind(this, this._signalConnector));
	},

	_populate: function () {
	    let widget, value;

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

	    value = this._settings.get_boolean('show-icon-text');
	    widget = this._builder.get_object('showIconText');
	    widget.set_active(value);

	    value = this._settings.get_boolean('invert-scrolling');
	    widget = this._builder.get_object('invertScrolling');
	    widget.set_active(value);
	},

    _signalConnector: function (builder, object, signal, handler) {
        object.connect(signal, Lang.bind(this, this._signalHandler[handler]));
    },

    _signalHandler: {
        onModeChanged: function (radiobutton) {
            if(radiobutton.get_active()) {
                this._settings.set_enum('mode', MODES.indexOf(radiobutton.get_name()));
                this._settings.apply();
            }
        },

        onPositionChanged: function (radiobutton) {
            if(radiobutton.get_active()) {
                this._settings.set_enum('position', POSITIONS.indexOf(radiobutton.get_name()));
                this._settings.apply();
            }
        },

        onShowIconTextChanged: function (toggleswitch) {
            this._settings.set_boolean('show-icon-text', toggleswitch.get_active());
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

        onUseNamesChanged: function (toggleswitch) {
            this._settings.set_boolean('use-names', toggleswitch.get_active());
            this._settings.apply();
        }
    }
}

function buildPrefsWidget () {
    prefs = new WorkspaceSwitcherPrefs();
    prefs.widget.show_all();
    return prefs.widget;
}

function init () { }

