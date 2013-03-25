const Lang = imports.lang;

const St = imports.gi.St;
const Shell = imports.gi.Shell;

const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const ExtensionUtils = imports.misc.extensionUtils;
const Gtk = imports.gi.Gtk;

function WindowsQuickListExtension() {
	this._init();
}

WindowsQuickListExtension.prototype = {

	_init: function() {
		this._indicator = null;
	},

	enable: function() {
		if (this._indicator === null) {
			Main.sessionMode.panel.right.push('windows-quick-list');

			this._indicator = new WindowsQuickListIndicator();
			Main.panel.addToStatusArea("windows-quick-list", this._indicator, 9999, "right");
		}
	},

	disable: function() {
		if (this._indicator !== null) {
			this._indicator.destroy();
			this._indicator = null;
		}
	}

}

const WindowsQuickListMenuItem = new Lang.Class({

	Name: 'WindowsQuickListMenuItem',
	Extends: PopupMenu.PopupBaseMenuItem,

	_init: function(icon, text, window) {
		this.parent();

		this._window = window;

		let box = new St.BoxLayout({ style_class: 'popup-combobox-item' });
		box.add(icon);
		box.add(new St.Label({ text: text }));
		this.addActor(box);

		this.connect('activate', Lang.bind(this, this._restoreWindow));
	},

	_restoreWindow: function() {
		let time = global.get_current_time();
		if (!this._window.is_on_all_workspaces()) {
			this._window.get_workspace().activate(time);
		}
		this._window.activate(time);
	}

});

const WindowsQuickListMenuTitle = new Lang.Class({

	Name: 'WindowsQuickListMenuTitle',
	Extends: PopupMenu.PopupBaseMenuItem,

	_init: function(text, workspace_index, active) {
		this.parent({ reactive: false });

		this._workspace_index = workspace_index;

		let box = new St.BoxLayout({ style_class: 'popup-subtitle-menu-item' });
		box.add(new St.Label({ text: text }));
		this.addActor(box);
		this.setShowDot(active);

		if (this._workspace_index > -1) {
			this.connect('activate', Lang.bind(this, this._restoreWindow));
		}
	},

	_restoreWindow: function() {
		let time = global.get_current_time();
		global.screen.get_workspace_by_index(this._workspace_index).activate(time);
	}

});

const WindowsQuickListIndicator = new Lang.Class({

	Name: 'WindowsQuickListIndicator',
	Extends: PanelMenu.SystemStatusButton,

	_init: function() {

		Gtk.IconTheme.get_default().append_search_path(
			ExtensionUtils.getCurrentExtension().dir.get_path());

		this.parent('windows-quick-list-symbolic', _("Windows Quick List"));

		this.actor.connect('button-press-event', Lang.bind(this, this._updateWindowList));
		this._updateWindowList();
	},

	onDestory: function() {
		global.screen.disconnect(this._restackedId);
	},

	_updateWindowList: function() {
		this.menu.removeAll();

		let workspace = global.screen.get_active_workspace();
		let windows = workspace.list_windows().filter( function(w){
			return !w.is_skip_taskbar() && w.is_on_all_workspaces();
		} );
		this._addWorkspaceWindows(windows, true, -1);

		for (let i = 0; i < global.screen.get_n_workspaces(); ++i) {
			let workspace = global.screen.get_workspace_by_index(i);
			let windows = workspace.list_windows().filter( function(w){
				return !w.is_skip_taskbar() && !w.is_on_all_workspaces();
			} );

			if(windows.length > 0 && this.menu.numMenuItems > 0) {
				this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
			}

			this._addWorkspaceWindows(windows, false, i);
		}

		if (this.menu.numMenuItems < 1) {
			let menuTitle = new WindowsQuickListMenuTitle('No open windows', -1, false);
			this.menu.addMenuItem(menuTitle);
		}
	},

	_addWorkspaceWindows: function(windows, show_sticky, workspace_index) {
		let tracker = Shell.WindowTracker.get_default();
		let active_workspace_index = global.screen.get_active_workspace().index();

		if (windows.length < 1) {
			return;
		}

		if (show_sticky) {
			let menuTitle = new WindowsQuickListMenuTitle('Sticky', workspace_index, false);
			this.menu.addMenuItem(menuTitle);
		} else {
			let active = active_workspace_index === workspace_index;
			let menuTitle = new WindowsQuickListMenuTitle('Workspace ' + (workspace_index + 1), workspace_index, active);
			this.menu.addMenuItem(menuTitle);
		}

		for (let i = 0; i < windows.length; ++i) {
			let appWin = tracker.get_window_app(windows[i]);
			let appIcon = appWin.create_icon_texture(24);
			let title = windows[i].get_title();

			if (title.length > 100) {
				title = title.substring(0, 97) + "...";
			}

			let menuItem = new WindowsQuickListMenuItem(appIcon, title, windows[i]);
			this.menu.addMenuItem(menuItem);
		}
	}

});

function init() {
	return new WindowsQuickListExtension();
}