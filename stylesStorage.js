/* Copyright (C) 2017 Tom Hartill

stylesStorage.js - Utility file for the Workspace Switcher extension. Defines
means of storing and creating CSS styles for workspace displays.

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

const Lang = imports.lang;
const Pango = imports.gi.Pango;

const PANGO_STYLES = {0: 'normal',
                      1: 'oblique',
                      2: 'italic'};
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
