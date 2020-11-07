/* Copyright (C) 2017 Tom Hartill

workspaceDisplays.js - Utility file for the Workspace Switcher extension.
Defines objects used for the different display modes.

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
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const Meta = imports.gi.Meta;
const St = imports.gi.St;

const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;

const Lang = imports.lang;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Utils = Me.imports.utils;

const ACTIONS = {ACTIVITIES: 0, POPUP: 1, NONE: 2}

function getWorkspaceName (index) {
    return Meta.prefs_get_workspace_name(index)
}

function getWorkspaceNumber (index) {
    return (index + 1).toString();
}

function setActiveWorkspace (index) {
    if (index >= 0 && index < Utils.getWorkspaceManager().n_workspaces) {
        Utils.getWorkspaceManager().get_workspace_by_index(index).activate(global.get_current_time());
    }
}

const CurrentWorkspaceDisplay = new Lang.Class({
    Name: 'CurrentWorkspaceDisplay',
    Extends: St.Bin,

    _init: function (gsettings, styleStore) {
        this.parent();
        this._settings = gsettings;
        this._styles = styleStore;
        this._currentWorkspace = Utils.getWorkspaceManager().get_active_workspace().index();
        this._cyclicScrolling = this._settings.get_boolean('cyclic-scrolling');
        this._invertedScrolling = this._settings.get_boolean('invert-scrolling');
        this._createPopupMenu();
        this._createWidgets();
    },

    destroy: function () {
        this._popupMenu.destroy();
        this.parent();
    },

    getMainWidget: function () {
        return this._button;
    },

    addWorkspace: function () {
        this._currentWorkspace = Utils.getWorkspaceManager().get_active_workspace().index();
        this._updatePopupSection();
        this._label.set_text(this._getWorkspaceName());
    },

    removeWorkspace: function () {
        this._currentWorkspace = Utils.getWorkspaceManager().get_active_workspace().index();
        this._updatePopupSection();
        this._label.set_text(this._getWorkspaceName());
    },

    resetWorkspaceNames: function () {
        this._label.set_text('');
        this.updateWorkspaceNames();
    },

    setCyclicScrolling: function (enabled) {
        this._cyclicScrolling = enabled
    },

    setInvertedScrolling: function (enabled) {
        this._invertedScrolling = enabled
    },

    switchWorkspace: function () {
        this._popupItems[this._currentWorkspace].setOrnament(PopupMenu.Ornament.NONE);
        this._currentWorkspace = Utils.getWorkspaceManager().get_active_workspace().index();
        this._popupItems[this._currentWorkspace].setOrnament(PopupMenu.Ornament.DOT);
        this._label.set_text(this._getWorkspaceName());
    },

    updateStyle: function () {
        let styleString = this._styles.baseStyle +
                          this._styles.decorationActiveStyle +
                          this._styles.fontActiveStyle;
        this._label.set_style(styleString);
    },

    updateWorkspaceLabelOrientation: function () {
        return; // Implemented by AllWorkspacesDisplay child
    },

    updateWorkspaceNames: function () {
        this._label.set_text(this._getWorkspaceName());
    },

    _createPopupMenu: function () {
        this._popupMenu = new PopupMenu.PopupMenu(this, 0.0, St.Side.TOP, 0);
        this._popupMenu.actor.add_style_class_name('panel-menu');
        this._popupMenu.connect('open-state-changed', Lang.bind(this, this._onPopupStateChange));
        Main.uiGroup.add_actor(this._popupMenu.actor);
        this._popupMenu.actor.hide();

        this._popupMenuManager = Main.panel.menuManager;
        this._popupMenuManager.addMenu(this._popupMenu);

        this._popupSection = new PopupMenu.PopupMenuSection();
        this._popupMenu.addMenuItem(this._popupSection);
        this._popupItems = [];
        this._updatePopupSection();
    },

    _createWidgets: function () {
        this._label = new St.Label({y_align: Clutter.ActorAlign.CENTER});
        this._label.set_text(this._getWorkspaceName());
        this.updateStyle();
        this._button = new St.Button({style_class: 'panel-button',
                                      reactive: true,
                                      can_focus: true,
                                      track_hover: true,
                                      child: this._label});
        this._button.connect('clicked', Lang.bind(this, this._onButtonClick));
        this._button.connect('scroll-event', Lang.bind(this, this._onButtonScroll));
        this.set_child(this._button);
    },

    _getWorkspaceName: function () {
        let index = this._currentWorkspace;
        if (this._settings.get_boolean('show-names')) {
            return getWorkspaceName(index);
        } else if (this._settings.get_boolean('show-total-num')) {
            return getWorkspaceNumber(index) + '/' + Utils.getWorkspaceManager().n_workspaces.toString();
        } else {
            return getWorkspaceNumber(index);
        }
    },

    _onButtonClick: function (button, event) {
        let clickAction = this._settings.get_enum('click-action')
        if (clickAction == ACTIONS.ACTIVITIES) Main.overview.toggle();
        else if (clickAction == ACTIONS.POPUP) this._popupMenu.toggle();
    },

    _onPopupItemClick: function (actor, event) {
        setActiveWorkspace(actor.workspaceId);
    },

    _onPopupStateChange: function (menu, isOpen) {
        if (isOpen) this._button.add_style_pseudo_class('active');
        else this._button.remove_style_pseudo_class('active');
    },

    _onButtonScroll: function (button, event) {
        let scrollDirection = event.get_scroll_direction();
        let indexChange = 0;
        if (scrollDirection == Clutter.ScrollDirection.DOWN) indexChange--;
        else if (scrollDirection == Clutter.ScrollDirection.UP) indexChange++;
        else return;
        if (this._invertedScrolling) indexChange *= -1;
        let index = Utils.getWorkspaceManager().get_active_workspace().index() + indexChange;
        if (this._cyclicScrolling) {
            if (index == Utils.getWorkspaceManager().n_workspaces) index = 0;
            else if (index == -1) index = Utils.getWorkspaceManager().n_workspaces - 1;
        } else {
            if (index == Utils.getWorkspaceManager().n_workspaces) index = Utils.getWorkspaceManager().n_workspaces - 1;
            else if (index == -1) index = 0;
        }
        setActiveWorkspace(index);
    },

    _updatePopupSection: function () {
        this._popupSection.removeAll();
        this._popupItems = [];

        for(let i = 0; i < Utils.getWorkspaceManager().n_workspaces; i++) {
            let newMenuItem = new PopupMenu.PopupMenuItem(getWorkspaceName(i));
            newMenuItem.workspaceId = i;

            this._popupSection.addMenuItem(newMenuItem);
            this._popupItems.push(newMenuItem);
            newMenuItem.connect('activate', this._onPopupItemClick);
        }
        this._popupItems[this._currentWorkspace].setOrnament(PopupMenu.Ornament.DOT);
    }
});

const AllWorkspacesDisplay = new Lang.Class({
    Name: 'AllWorkspacesDisplay',
    Extends: CurrentWorkspaceDisplay,

    _createWidgets: function () {
        this._container = new St.BoxLayout();
        this._labels = [];
        this._buttons = [];
        for (let i = 0; i < Utils.getWorkspaceManager().n_workspaces; i++) this.addWorkspace();
        this.set_child(this._container);
    },

    addWorkspace: function () {
        this._currentWorkspace = Utils.getWorkspaceManager().get_active_workspace().index();
        let newIndex = this._labels.length;
        let label = new St.Label({y_align: Clutter.ActorAlign.CENTER});
        label.set_text(this._getWorkspaceName(newIndex));
        this._labels.push(label);
        this.updateWorkspaceLabelStyle(newIndex);
        let button = new St.Button({style_class: 'panel-button',
                                    reactive: true,
                                    can_focus: true,
                                    track_hover: true,
                                    child: label});
        button.workspaceIndex = newIndex;
        button.connect('clicked', Lang.bind(this, this._onButtonClick));
        button.connect('scroll-event', Lang.bind(this, this._onButtonScroll));
        this._buttons.push(button);
        this._container.add_child(button);
        this._updatePopupSection();
    },

    removeWorkspace: function () {
        this._currentWorkspace = Utils.getWorkspaceManager().get_active_workspace().index();
        this._labels.pop().destroy();
        this._buttons.pop().destroy();
        for (let i = 0; i < this._buttons.length; i++)
            this._buttons[i].workspaceIndex = i;
        this.updateStyle();
        this.updateWorkspaceNames();
        this._updatePopupSection();
    },

    resetWorkspaceNames: function () {
        for (let i = 0; i < this._labels.length; i++)
            this._labels[i].set_text('');
        this.updateWorkspaceNames();
    },

    switchWorkspace: function () {
        this._popupItems[this._currentWorkspace].setOrnament(PopupMenu.Ornament.NONE);
        this._currentWorkspace = Utils.getWorkspaceManager().get_active_workspace().index();
        for (let i = 0; i < Utils.getWorkspaceManager().n_workspaces; i++)
            this.updateStyle();
        this._popupItems[this._currentWorkspace].setOrnament(PopupMenu.Ornament.DOT);
    },

    updateStyle: function () {
        for (let i = 0; i < this._labels.length; i++)
            this.updateWorkspaceLabelStyle(i);
    },

    updateWorkspaceLabelOrientation: function () {
        this._container.set_vertical(this._settings.get_boolean('vertical-display'));
    },

    updateWorkspaceLabelStyle: function (workspaceIndex) {
        let styleString = this._styles.baseStyle;
        if (workspaceIndex == this._currentWorkspace) {
            styleString += this._styles.decorationActiveStyle +
                        this._styles.fontActiveStyle;
        } else {
            styleString += this._styles.decorationInactiveStyle +
                            this._styles.fontInactiveStyle;
        }
        this._labels[workspaceIndex].set_style(styleString);
    },

    updateWorkspaceNames: function () {
        for (let i = 0; i < this._labels.length; i++)
            this._labels[i].set_text(this._getWorkspaceName(i));
    },

    _getWorkspaceName: function (index) {
        if (index == null) index = this._currentWorkspace;
        if (this._settings.get_boolean('show-names')) return getWorkspaceName(index);
        else return getWorkspaceNumber(index);
    },

    _onButtonClick: function (button, event) {
        let clickAction = this._settings.get_enum('click-action');
        if (clickAction == ACTIONS.ACTIVITIES) setActiveWorkspace(button.workspaceIndex);
        else if (clickAction == ACTIONS.POPUP) this._popupMenu.toggle();
    },

    _onPopupStateChange: function (menu, isOpen) {
        if (isOpen) {
            for (let i = 0; i < this._buttons.length; i++)
                this._buttons[i].add_style_pseudo_class('active');
        } else {
            for (let i = 0; i < this._buttons.length; i++)
                this._buttons[i].remove_style_pseudo_class('active');
        }
    }
});

const IconWorkspaceDisplay = new Lang.Class({
    Name: 'IconWorkspaceDisplay',
    Extends: CurrentWorkspaceDisplay,

    _createWidgets: function () {
        this._container = new St.BoxLayout();
        let gicon = Gio.icon_new_for_string(Me.path + '/icons/workspace-switcher-tiles.svg');
        this._icon = new St.Icon({gicon: gicon, style_class: 'system-status-icon'});
        this._container.add_child(this._icon);
        this._label = new St.Label({y_align: Clutter.ActorAlign.CENTER});
        this._label.set_text(this._getWorkspaceName());
        this.updateStyle();
        this.setLabelVisibility(this._settings.get_boolean('show-icon-text'));
        this._container.add_child(this._label);
        this._button = new St.Button({style_class: 'panel-button',
                                      reactive: true,
                                      can_focus: true,
                                      track_hover: true,
                                      child: this._container});
        this._button.connect('clicked', Lang.bind(this, this._onButtonClick));
        this._button.connect('scroll-event', Lang.bind(this, this._onButtonScroll));
        this.set_child(this._button);
    },

    setLabelVisibility: function (isVisible) {
        if (isVisible) this._label.show();
        else this._label.hide();
    },

    updateStyle: function () {
        let styleString = this._styles.baseStyle +
                          this._styles.fontActiveStyle;
        this._label.set_style(styleString);
    },
});
