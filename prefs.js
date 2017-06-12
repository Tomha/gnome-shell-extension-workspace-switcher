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

const BORDER_LOCATIONS = ['TOP', 'RIGHT', 'BOTTOM', 'LEFT'];
const BORDER_LOCATION_WIDGETS = {
    TOP: 'borderLocationTop',
    RIGHT: 'borderLocationRight',
    BOTTOM: 'borderLocationBottom',
    LEFT: 'borderLocationLeft'
}

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

        this._builder = Gtk.Builder.new_from_file(Me.path + '/prefs.ui');
        this.parentWidget = this._builder.get_object('container');

        this._populateGeneralTab();
        this._populateStyleTab();
        this._populateAboutTab();
        this._builder.connect_signals_full(Lang.bind(this, this._signalConnector));
    },

    _populateAboutTab: function () {
        let name = this._builder.get_object('nameLabel');
        name.set_text(Me.metadata['name'].toString());

        let about = this._builder.get_object('aboutLabel');
        about.set_text(Me.metadata['description'].toString());

        let version = this._builder.get_object('versionLabel');
        version.set_text(Me.metadata['version'].toString());

        let website = this._builder.get_object('websiteLabel');
        website.set_markup('<a href="' + Me.metadata['url'].toString() + '">' +
           Me.metadata['name'].toString() + '</a>');

        let licence = this._builder.get_object('licenceLabel');
        licence.set_markup('<span font="10">' +
            'This extension comes with absolutely no warranty.\n' +
            'See the <a href="' +
            Me.metadata['licence-url'].toString() + '">' +
            Me.metadata['licence'].toString() +
            ' or later</a> for details.</span>');
    },

    _populateGeneralTab: function () {
        let widget, value;

        value = this._settings.get_enum('click-action');
        widget = this._builder.get_object('clickAction');
        widget.set_active(value);

        value = this._settings.get_int('index');
        widget = this._builder.get_object('index');
        widget.set_value(value);

        value = this._settings.get_enum('mode');
        widget = this._builder.get_object('mode');
        widget.set_active(value);

        value = this._settings.get_enum('position');
        widget = this._builder.get_object('position');
        widget.set_active(value);

        value = this._settings.get_boolean('show-names');
        widget = this._builder.get_object('showNames');
        widget.set_active(value);

        value = this._settings.get_boolean('show-total-num');
        widget = this._builder.get_object('showTotalNum');
        widget.set_active(value);

        value = this._settings.get_boolean('show-icon-text');
        widget = this._builder.get_object('showIconText');
        widget.set_active(value);

        value = this._settings.get_boolean('vertical-display');
        widget = this._builder.get_object('verticalDisplay');
        widget.set_active(value);

        value = this._settings.get_boolean('invert-scrolling');
        widget = this._builder.get_object('invertScrolling');
        widget.set_active(value);

        value = this._settings.get_boolean('cyclic-scrolling');
        widget = this._builder.get_object('cyclicScrolling');
        widget.set_active(value);

        // Populate the workspace name treeview
        this._workspaceNameTreeView = this._builder.get_object('workspaceNameTreeView');
        let nameColumnRenderer = new Gtk.CellRendererText({ editable: true });
        nameColumnRenderer.connect('edited', Lang.bind(this, this._signalHandler['onWorkspaceRenamed']));
        let nameColumn = this._builder.get_object('workspaceNameColumn');
        nameColumn.pack_start(nameColumnRenderer, true);
        nameColumn.add_attribute(nameColumnRenderer, 'text', 0);
        this._workspaceNameListStore = this._builder.get_object('workspaceNameListStore');
        let workspaceNames = this._workspaceSettings.get_strv('workspace-names');
        let [treeNotEmpty, nextIter] = this._workspaceNameListStore.get_iter_first();
        for (let i = 0; i < workspaceNames.length; i++) {
            nextIter = this._workspaceNameListStore.append();
            this._workspaceNameListStore.set_value(nextIter, 0, workspaceNames[i]);
        }

        let toolbar = this._builder.get_object('workspaceToolbar');
        toolbar.get_style_context().add_class(Gtk.STYLE_CLASS_INLINE_TOOLBAR);
    },

    _populateStyleTab: function () {
        let widget, value;

        value = this._settings.get_string('font-active');
        widget = this._builder.get_object('fontActive');
        widget.set_font_name(value);

        value = this._settings.get_string('font-inactive');
        widget = this._builder.get_object('fontInactive');
        widget.set_font_name(value);

        value = this._settings.get_boolean('font-use-custom-active');
        widget = this._builder.get_object('fontUseCustomActive');
        widget.set_active(value);

        value = this._settings.get_boolean('font-use-custom-inactive');
        widget = this._builder.get_object('fontUseCustomInactive');
        widget.set_active(value);

        value = this._settings.get_string('font-colour-active');
        widget = this._builder.get_object('fontColourActive');
        widget.set_rgba(hexToRgba(value));

        value = this._settings.get_string('font-colour-inactive');
        widget = this._builder.get_object('fontColourInactive');
        widget.set_rgba(hexToRgba(value));

        value = this._settings.get_boolean('font-colour-use-custom-active');
        widget = this._builder.get_object('fontColourUseCustomActive');
        widget.set_active(value);

        value = this._settings.get_boolean('font-colour-use-custom-inactive');
        widget = this._builder.get_object('fontColourUseCustomInactive');
        widget.set_active(value);

        value = this._settings.get_int('border-size-active');
        widget = this._builder.get_object('borderSizeActive');
        widget.set_value(value);

        value = this._settings.get_int('border-size-inactive');
        widget = this._builder.get_object('borderSizeInactive');
        widget.set_value(value);

        value = this._settings.get_string('border-colour-active');
        widget = this._builder.get_object('borderColourActive');
        widget.set_rgba(hexToRgba(value));

        value = this._settings.get_string('border-colour-inactive');
        widget = this._builder.get_object('borderColourInactive');
        widget.set_rgba(hexToRgba(value));

        value = this._settings.get_int('border-radius');
        widget = this._builder.get_object('borderRadius');
        widget.set_value(value);

        value = this._settings.get_strv('border-locations');
        for (let i = 0; i < value.length; i++) {
            widget = this._builder.get_object(BORDER_LOCATION_WIDGETS[value[i]]);
            widget.set_active(true);
        }

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

        value = this._settings.get_int('margin-horizontal');
        widget = this._builder.get_object('marginHorizontal');
        widget.set_value(value);

        value = this._settings.get_int('margin-vertical');
        widget = this._builder.get_object('marginVertical');
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
        onBackgroundColourActiveSet: function (button) {
            this._settings.set_string('background-colour-active', rgbaToHex(button.get_rgba()));
            this._settings.apply();
        },

        onBackgroundColourInactiveSet: function (button) {
            this._settings.set_string('background-colour-inactive', rgbaToHex(button.get_rgba()));
            this._settings.apply();
        },

        onBorderColourActiveSet: function (button) {
            this._settings.set_string('border-colour-active', rgbaToHex(button.get_rgba()));
            this._settings.apply();
        },

        onBorderColourInactiveSet: function (button) {
            this._settings.set_string('border-colour-inactive', rgbaToHex(button.get_rgba()));
            this._settings.apply();
        },

        onBorderLocationChanged: function (checkbutton) {
            let borderLocations = [];
            for (let i = 0; i < BORDER_LOCATIONS.length; i++) {
                let location = BORDER_LOCATIONS[i];
                if (this._builder.get_object(BORDER_LOCATION_WIDGETS[location]).get_active())
                    borderLocations.push(location);
            }
            this._settings.set_strv('border-locations', borderLocations);
            this._settings.apply();
        },

        onBorderRadiusChanged: function (spinbutton) {
            this._settings.set_int('border-radius', spinbutton.get_value());
            this._settings.apply();
        },

        onBorderSizeActiveChanged: function (spinbutton) {
            this._settings.set_int('border-size-active', spinbutton.get_value());
            this._settings.apply();
        },

        onBorderSizeInactiveChanged: function (spinbutton) {
            this._settings.set_int('border-size-inactive', spinbutton.get_value());
            this._settings.apply();
        },

        onClickActionChanged: function (combobox) {
            this._settings.set_enum('click-action', combobox.get_active());
            this._settings.apply();
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

        onFontColourActiveSet: function (button) {
            this._settings.set_string('font-colour-active', rgbaToHex(button.get_rgba()));
            this._settings.apply();
        },

        onFontColourInactiveSet: function (button) {
            this._settings.set_string('font-colour-inactive', rgbaToHex(button.get_rgba()));
            this._settings.apply();
        },

        onFontColourUseCustomActiveToggled: function (toggleswitch) {
            this._settings.set_boolean('font-colour-use-custom-active', toggleswitch.get_active());
            this._settings.apply();
        },

        onFontColourUseCustomInactiveToggled: function (toggleswitch) {
            this._settings.set_boolean('font-colour-use-custom-inactive', toggleswitch.get_active());
            this._settings.apply();
        },

        onFontActiveSet: function (fontButton) {
            this._settings.set_string('font-active', fontButton.get_font_name());
            this._settings.apply();
        },

        onFontInactiveSet: function (fontButton) {
            this._settings.set_string('font-inactive', fontButton.get_font_name());
            this._settings.apply();
        },

        onFontUseCustomActiveToggled: function (toggleswitch) {
            this._settings.set_boolean('font-use-custom-active', toggleswitch.get_active());
            this._settings.apply();
        },

        onFontUseCustomInactiveToggled: function (toggleswitch) {
            this._settings.set_boolean('font-use-custom-inactive', toggleswitch.get_active());
            this._settings.apply();
        },

        onMarginHorizontalChanged: function (spinbutton) {
            this._settings.set_int('margin-horizontal', spinbutton.get_value());
            this._settings.apply();
        },


        onMarginVerticalChanged: function (spinbutton) {
            this._settings.set_int('margin-vertical', spinbutton.get_value());
            this._settings.apply();
        },


        onMinHeightChanged: function (spinbutton) {
            this._settings.set_int('min-height', spinbutton.get_value());
            this._settings.apply();
        },

        onMinWidthChanged: function (spinbutton) {
            this._settings.set_int('min-width', spinbutton.get_value());
            this._settings.apply();
        },

        onModeChanged: function (combobox) {
            this._settings.set_enum('mode', combobox.get_active());
            this._settings.apply();
        },

        onPaddingHorizontalChanged: function (spinbutton) {
            this._settings.set_int('padding-horizontal', spinbutton.get_value());
            this._settings.apply();
        },


        onPaddingVerticalChanged: function (spinbutton) {
            this._settings.set_int('padding-vertical', spinbutton.get_value());
            this._settings.apply();
        },


        onPositionChanged: function (combobox) {
            this._settings.set_enum('position', combobox.get_active());
            this._settings.apply();
        },

        onShowIconTextChanged: function (toggleswitch) {
            this._settings.set_boolean('show-icon-text', toggleswitch.get_active());
            this._settings.apply();
        },

        onShowNamesSet: function (toggleswitch) {
            this._settings.set_boolean('show-names', toggleswitch.get_active());
            this._settings.apply();
        },

        onShowTotalNumChanged: function (toggleswitch) {
            this._settings.set_boolean('show-total-num', toggleswitch.get_active());
            this._settings.apply();
        },

        onVerticalDisplaySet: function (toggleswitch) {
            this._settings.set_boolean('vertical-display', toggleswitch.get_active());
            this._settings.apply();
        },

        onWorkspaceAdded: function (button) {
            let newIter = this._workspaceNameListStore.append();
            let newPath = this._workspaceNameListStore.get_path(newIter);
            let newWorkspaceIndex = newPath.get_indices()[0];
            let newWorkspaceNumber = newWorkspaceIndex + 1;
            let newWorkspaceName = 'Workspace ' + newWorkspaceNumber;
            let workspaceNames = this._workspaceSettings.get_strv('workspace-names');
            workspaceNames.push(newWorkspaceName);
            this._workspaceSettings.set_strv('workspace-names', workspaceNames);
            this._workspaceSettings.apply();
            this._workspaceNameListStore.set_value(newIter, 0, newWorkspaceName);
        },

        onWorkspaceRemoved: function (button) {
            let currentSelection = this._workspaceNameTreeView.get_selection();
            let [selectionExists, treeModel, selectedIter] = currentSelection.get_selected();
            if (selectionExists) {
                let selectedPath = this._workspaceNameListStore.get_path(selectedIter);
                let selectedIndex = selectedPath.get_indices()[0];
                let workspaceNames = this._workspaceSettings.get_strv('workspace-names');
                workspaceNames.splice(selectedIndex, 1);
                this._workspaceSettings.set_strv('workspace-names', workspaceNames);
                this._workspaceSettings.apply();
                this._workspaceNameListStore.remove(selectedIter);
            }
        },

        onWorkspaceRenamed: function (renderer, editedPathString, newName) {
            let [iterExists, editedIter] = this._workspaceNameListStore.get_iter_from_string(editedPathString);
            if (iterExists) {
                let editedPath = this._workspaceNameListStore.get_path(editedIter);
                let editedIndex = editedPath.get_indices()[0];
                let workspaceNames = this._workspaceSettings.get_strv('workspace-names');
                workspaceNames[editedIndex] = newName;
                this._workspaceSettings.set_strv('workspace-names', workspaceNames);
                this._workspaceSettings.apply();
                this._workspaceNameListStore.set_value(editedIter, 0, newName);
            }
        },

        resetBackgroundColourActive: function (button) {
            this._settings.reset('background-colour-active');
            let widget = this._builder.get_object('backgroundColourActive');
            let value = this._settings.get_string('background-colour-active');
            widget.set_rgba(hexToRgba(value));
        },

        resetBackgroundColourInactive: function (button) {
            this._settings.reset('background-colour-inactive');
            let widget = this._builder.get_object('backgroundColourInactive');
            let value = this._settings.get_string('background-colour-inactive');
            widget.set_rgba(hexToRgba(value));
        },

        resetBorderColourActive: function (button) {
            this._settings.reset('border-colour-active');
            let widget = this._builder.get_object('borderColourActive');
            let value = this._settings.get_string('border-colour-active');
            widget.set_rgba(hexToRgba(value));
        },

        resetBorderColourInactive: function (button) {
            this._settings.reset('border-colour-inactive');
            let widget = this._builder.get_object('borderColourInactive');
            let value = this._settings.get_string('border-colour-inactive');
            widget.set_rgba(hexToRgba(value));
        },

        resetBorderRadius: function (button) {
            this._settings.reset('border-radius');
            let widget = this._builder.get_object('borderRadius');
            let value = this._settings.get_int('border-radius');
            widget.set_value(value);
        },

        resetBorderSizeActive: function (button) {
            this._settings.reset('border-size-active');
            let widget = this._builder.get_object('borderSizeActive');
            let value = this._settings.get_int('border-size-active');
            widget.set_value(value);
        },

        resetBorderSizeInactive: function (button) {
            this._settings.reset('border-size-inactive');
            let widget = this._builder.get_object('borderSizeInactive');
            let value = this._settings.get_int('border-size-inactive');
            widget.set_value(value);
        },

        resetFontColourActive: function (button) {
            this._settings.reset('font-colour-active');
            let widget = this._builder.get_object('fontColourActive');
            let value = this._settings.get_string('font-colour-active');
            widget.set_rgba(hexToRgba(value));
        },

        resetFontColourInactive: function (button) {
            this._settings.reset('font-colour-inactive');
            let widget = this._builder.get_object('fontColourInactive');
            let value = this._settings.get_string('font-colour-inactive');
            widget.set_rgba(hexToRgba(value));
        },

        resetMarginHorizontal: function (button) {
            this._settings.reset('margin-horizontal');
            let widget = this._builder.get_object('marginHorizontal');
            let value = this._settings.get_int('margin-horizontal');
            widget.set_value(value);
        },

        resetMarginVertical: function (button) {
            this._settings.reset('margin-vertical');
            let widget = this._builder.get_object('marginVertical');
            let value = this._settings.get_int('margin-vertical');
            widget.set_value(value);
        },

        resetMinHeight: function (button) {
            this._settings.reset('min-height');
            let widget = this._builder.get_object('minHeight');
            let value = this._settings.get_int('min-height');
            widget.set_value(value);
        },

        resetMinWidth: function (button) {
            this._settings.reset('min-width');
            let widget = this._builder.get_object('minWidth');
            let value = this._settings.get_int('min-width');
            widget.set_value(value);
        },

        resetPaddingHorizontal: function (button) {
            this._settings.reset('padding-horizontal');
            let widget = this._builder.get_object('paddingHorizontal');
            let value = this._settings.get_int('padding-horizontal');
            widget.set_value(value);
        },

        resetPaddingVertical: function (button) {
            this._settings.reset('padding-vertical');
            let widget = this._builder.get_object('paddingVertical');
            let value = this._settings.get_int('padding-vertical');
            widget.set_value(value);
        }
    }
}

function buildPrefsWidget () {
    prefs = new WorkspaceSwitcherPrefs();
    prefs.parentWidget.show_all();
    return prefs.parentWidget;
}

function init () { }

