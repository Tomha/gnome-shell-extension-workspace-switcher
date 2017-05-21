/* Copyright (C) 2017 Tom Hartill

workspaceDisplay.js - Utility file for the Workspace Switcher extension. Defines
objects used for the different display modes.

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
const Lang = imports.lang;

const ACTIVE_STYLE = "background-color: #888888; border: 1px solid #cccccc; padding: 0px 8px 0px 8px; margin: 0px 1px 0px 1px;";
const INACTIVE_STYLE = "background-color: #444444; border: 1px solid #cccccc; padding: 0px 8px 0px 8px; margin: 0px 1px 0px 1px;";

function getWorkspaceName (index) {
    return Meta.prefs_get_workspace_name(index)
}

function getWorkspaceNum (index) {
    return (index + 1).toString();
}

const BaseWorkspaceDisplay = new Lang.Class({
    Name: 'BaseWorkspaceDisplay',

    _init: function (settingsStore) {
        this._settingsStore = settingsStore;
        this._label = new St.Label({y_align: Clutter.ActorAlign.CENTER});
        this._label.set_text(this._getWorkspaceName());
        this._label.set_style(ACTIVE_STYLE);
        this._button = new St.Button({style_class: 'panel-button',
                                      reactive: true,
                                      can_focus: true,
                                      x_fill: true,
                                      y_fill: false,
                                      track_hover: true,
                                      child: this._label});

        this._pressSignal = this._button.connect('clicked', Lang.bind(this, this._onClick));
        this._scrollSignal = this._button.connect('scroll-event', Lang.bind(this, this._onScroll));
    },

    destroy: function () {
        this._label.destroy();
        this._button.destroy();
        this._button.disconnect(this._pressSignal);
        this._button.disconnect(this._scrollSignal);
    },

    getMainWidget: function () {
        return this._button;
    },

    addWorkspace: function () {
        this._settingsStore.currentWorkspace = global.screen.get_active_workspace().index();
        this._label.set_text(this._getWorkspaceName());
    },

    removeWorkspace: function () {
        this._settingsStore.currentWorkspace = global.screen.get_active_workspace().index();
        this._label.set_text(this._getWorkspaceName());
    },

    switchWorkspace: function () {
        this._settingsStore.currentWorkspace = global.screen.get_active_workspace().index();
        this._label.set_text(this._getWorkspaceName());
    },

    updateWorkspaceNames: function () {
        this._label.set_text(this._getWorkspaceName());
    },

    _getWorkspaceName: function () {
        let index = this._settingsStore.currentWorkspace;
        if (this._settingsStore.useNames)
            return getWorkspaceName(index);
        else if (this._settingsStore.showTotalNum)
            return getWorkspaceNum(index) + '/' + global.screen.n_workspaces.toString();
        else return getWorkspaceNum(index);
    },

    _onClick: function (button, event) {
        Main.overview.toggle();
    },

    _onScroll: function (button, event) {
        let scrollDirection = event.get_scroll_direction();
        let indexChange = 0;
        if (scrollDirection == Clutter.ScrollDirection.DOWN) indexChange--;
        else if (scrollDirection == Clutter.ScrollDirection.UP) indexChange++;
        else return;
        if (this._settingsStore.invertScrolling) indexChange *= -1;
        let index = global.screen.get_active_workspace().index() + indexChange;
        if (this._settingsStore.cyclicScrolling) {
            if (index == global.screen.n_workspaces) index = 0;
            else if (index == -1) index = global.screen.n_workspaces - 1;
        } else {
            if (index == global.screen.n_workspaces) index = global.screen.n_workspaces - 1;
            else if (index == -1) index = 0;
        }
        this._setActiveWorkspace(index);
    },

    _setActiveWorkspace: function (index) {
        if (index >= 0 && index < global.screen.n_workspaces)
            global.screen.get_workspace_by_index(index).activate(global.get_current_time());
    }
});

const CurrentWorkspaceDisplay = new Lang.Class({
    Name: 'CurrentWorkspaceDisplay',
    Extends: BaseWorkspaceDisplay,

    _init: function (settingsStore) {
        this.parent(settingsStore);
        this._label.set_style(ACTIVE_STYLE);
    },
});

const AllWorkspacesDisplay = new Lang.Class({
    Name: 'AllWorkspacesDisplay',
    Extends: BaseWorkspaceDisplay,
    _init: function (settingsStore) {
        this._settingsStore = settingsStore;
        this._container = new St.BoxLayout();
        this._labels = [];
        this._buttons = [];
        this._buttonPressSignals = [];
        this._buttonScrollSignals = [];
        for (let i = 0; i < global.screen.n_workspaces; i++) {
            this.addWorkspace();
        }
    },

    destroy: function () {
        this._container.destroy();
        for (let i = 0; i < this._labels.length; i++)
            this._labels.pop().destroy();
        for (let i = 0; i < this._buttons.length; i++) {
            this._buttons[i].disconnect(this._buttonPressSignals[i])
            this._buttons[i].disconnect(this._buttonScrollSignals[i]);
            this._buttons[i].destroy();
        }
    },

    getMainWidget: function () {
        return this._container;
    },

    addWorkspace: function () {
        this._settingsStore.currentWorkspace = global.screen.get_active_workspace().index();
        let newIndex = this._labels.length;
        let label = new St.Label({y_align: Clutter.ActorAlign.CENTER});
        label.set_text(this._getWorkspaceName(newIndex));
        if (newIndex == this._settingsStore.currentWorkspace)
            label.set_style(ACTIVE_STYLE);
        else
            label.set_style(INACTIVE_STYLE);
        this._labels.push(label);
        let button = new St.Button({style_class: 'panel-button',
                                    reactive: true,
                                    can_focus: true,
                                    x_fill: true,
                                    y_fill: false,
                                    track_hover: true,
                                    child: label});
        button.workspaceIndex = newIndex;
        this._buttonPressSignals.push(button.connect('clicked', Lang.bind(this, this._onClick)));
        this._buttonScrollSignals.push(button.connect('scroll-event', Lang.bind(this, this._onScroll)));
        this._buttons.push(button);
        this._container.add_child(button);
        this.updateWorkspaceNames();
    },

    removeWorkspace: function () {
        this._settingsStore.currentWorkspace = global.screen.get_active_workspace().index();
        this._labels.pop().destroy();
        let lastButton = this._buttons.pop();
        lastButton.disconnect(this._buttonPressSignals.pop());
        lastButton.disconnect(this._buttonScrollSignals.pop());
        lastButton.destroy();
        for (let i = 0; i < this._buttons.length; i++) {
            this._buttons[i].workspaceIndex = i;
            if (i == this._settingsStore.currentWorkspace)
                this._labels[i].set_style(ACTIVE_STYLE)
            else
                this._labels[i].set_style(INACTIVE_STYLE)
        }
        this.updateWorkspaceNames();
    },

    switchWorkspace: function () {
        this._settingsStore.currentWorkspace = global.screen.get_active_workspace().index();
        for (let i = 0; i < global.screen.n_workspaces; i++) {
            if (i == this._settingsStore.currentWorkspace)
                this._labels[i].set_style(ACTIVE_STYLE);
            else this._labels[i].set_style(INACTIVE_STYLE);
        }
    },

    updateWorkspaceNames: function () {
        for (let i = 0; i < this._labels.length; i++)
            this._labels[i].set_text(this._getWorkspaceName(i));
    },

    _getWorkspaceName: function (index) {
        if (index == null)
            index = this._settingsStore.currentWorkspace;
        if (this._settingsStore.useNames)
            return getWorkspaceName(index);
        else return getWorkspaceNum(index);
    },

    _onClick: function (button, event) {
        this._setActiveWorkspace(button.workspaceIndex);
    }
});

const IconWorkspaceDisplay = new Lang.Class({
    Name: 'IconWorkspaceDisplay',
    Extends: BaseWorkspaceDisplay,

    _init: function (settingsStore) {
        this._settingsStore = settingsStore;
        this._container = new St.BoxLayout();
        this._icon = new St.Icon({icon_name: 'workspace-switcher',
                                  icon_size: 16,
                                  style_class: 'system-status-icon'});
        this._container.add_child(this._icon);
        this._label = new St.Label({y_align: Clutter.ActorAlign.CENTER});
        this._label.set_text(this._getWorkspaceName());
        if (!this._settingsStore.showIconText) this._label.hide();
        this._container.add_child(this._label);
        this._button = new St.Button({style_class: 'panel-button',
                                      reactive: true,
                                      can_focus: true,
                                      x_fill: true,
                                      y_fill: false,
                                      track_hover: true,
                                      child: this._container});

        this._pressSignal = this._button.connect('clicked', Lang.bind(this, this._onClick));
        this._scrollSignal = this._button.connect('scroll-event', Lang.bind(this, this._onScroll));
    },

    destroy: function () {
        this._icon.destroy();
        this._label.destroy();
        this._container.destroy();
        this._button.destroy();

        this._button.disconnect(this._pressSignal);
        this._button.disconnect(this._scrollSignal);
    },

    showLabel: function (doShow) {
        if (doShow) this._label.show();
        else this._label.hide();
    }
});
