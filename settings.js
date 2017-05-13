/* Copyright (C) 2017 Tom Hartill

settings.js - Helper file for the Workspace Switcher extension. Defines means
of retrieving a GTK.Settings object for the either the current extension's
settings schema, or a user defined schema.

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

const Gio = imports.gi.Gio;
const SchemaSource = imports.gi.Gio.SettingsSchemaSource;

const ExtensionUtils = imports.misc.extensionUtils;

function getSettings (schema) {
    let schemaSrc = null;

    if (schema == null) {
        let extension = ExtensionUtils.getCurrentExtension();
        schema = extension.metadata['settings-schema'];
        let schemaDir = extension.dir.get_child('schema');
        if (!schemaDir.query_exists(null))
            throw new Error ("Schema directory " + schemaDir + " for " + schema.toString() + " not found.");
        schemaSrc = SchemaSource.new_from_directory(schemaDir.get_path(),
                                                    SchemaSource.get_default(),
                                                    false);
    } else schemaSrc = SchemaSource.get_default()

    let schemaObj = schemaSrc.lookup(schema, true);
    if (!schemaObj)
        throw new Error ("Schema object for " + schema.toString() + " not found.");

    return new Gio.Settings({ settings_schema: schemaObj });
}
