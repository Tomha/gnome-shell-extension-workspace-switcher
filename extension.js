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

function WorkspaceSwitcher () {
	this.init();
}

WorkspaceSwitcher.prototype = {
	init: function () {
		
	},
	
	enable: function () {
	
	},
	
	disable: function () {
	
	},
	
	// Private Functions

	_loadSettings: function () {
	
	},
	
	_onSettingsChanged: function () {
	
	}
}

function init() {
	return new WorkspaceSwitcher();
}

