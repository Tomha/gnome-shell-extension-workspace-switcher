# About
Workspace Switcher is an extension for the Gnome Shell to allow you to view and
switch the current workspace. It aims to be highly customisable, allowing a
range of diffirent display types with further options for position, appearance,
and behaviour.

It is an interation over my previous Workspace Indicator Plus extension, which
aimed to rewrite and improve upon the stock Workspace Indicator extension. As I
worked on Workspace Indicator Plus my plans for the extension changed, and I
reached a point where I felt it was best to start fresh, since I had some
fundamental changes in mind.

# Goals
In short, I want a polished, one-stop solution for managing, viewing, and
switching workspaces.

### Immediate Goals
- Allow switching of the current workspace via a popup menu, or scrolling the
	panel widget ✔, or if all workspaces are displayed, by clicking the
	desired workspace. ✔
- Give customisation options for border, background, and text of panel widget.
- Provide multiple display options: ✔
	- Name/number of current workspace ✔
	- Name/number of all workspaces ✔
	- Symbolic icon without indication of current workspaces ✔
	- Symbolic icon with current workspace number ✔
- Allow customisation of widget position (left, center, right of panel). ✔
- Allow management of the number of workspaces and their names via the extension
	preferences dialog. ✔

### Long Term Goals
- Show window previews/locations in the panel widget.
	- Will probably require a larger widget than allowed by the stock panel size.
- Support for multiple monitors in workspace previews.
	- Need more in-depth understanding of how Gnome deals with multiple monitors.
- Allow icon customisation.
	- Likely to need custom GTK dialog for selection from current icon theme.
- Option to use wallpaper as a background for the panel widget.
	- Need to figure out means of appropriately sizing the background and/or
	panel widget for a polished appearance.
- Launch the stock Gnome workspace manager/switcher. ✔
	- ~~Need to figure out how to do this, shouldn't be hard.~~
- Provide a custom full-screen workspace switcher with previews?
	- Would need to provide greater/different functionality than stock Gnome option.

# Installation
At this point in time the extension is under heavy development. I aim for each
commit to master to leave the extension in a usable state, but I can't guarantee
there won't be bugs or undesired behaviour. If you still wish to try it out and
provide feedback, install it like so:

1. `git clone https://github.com/tomha/gnome-shell-extension-workspace-switcher workspace-switcher@tomha.github.com`(Make sure you use that destination folder name.)
2. `cp -r workspace-switcher@tomha.github.com ~/.local/share/gnome-shell/extensions/` (Or clone directly to this location.)
3. Restart the Gnome Shell:
	- On a X session, press `ALT + F2`, type `r`, and press `ENTER`
	- On a Wayland session, log out and back in again.
4. Activate the extension:
	- Enable it in the Extensions section of Gnome Tweak Tools
	- Run the command `gnome-shell-extension-tool -e workspace-switcher@tomha.github.com.`
