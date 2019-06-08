const { Clutter, Gio, GObject, Shell, St } = imports.gi;

const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const Me = imports.misc.extensionUtils.getCurrentExtension();

function l() {
  let args = Array.from(arguments);
  args.unshift('windows-quick-list');
  log.apply(this, args);
}

var WindowsQuickListMenuItem = class extends PopupMenu.PopupBaseMenuItem {

	constructor(icon, text, window) {
		super();

		this._window = window;
		this.icon = icon;

		this.icon.add_style_class_name('popup-menu-icon');
		this.actor.add_child(this.icon);

		this.label = new St.Label({ text: text,
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER });
		this.actor.add_child(this.label);
		this.actor.label_actor = this.label;

		this.connect('activate', this._restoreWindow.bind(this));
	}

	_restoreWindow() {
		let time = global.get_current_time();
		if (!this._window.is_on_all_workspaces()) {
			this._window.get_workspace().activate(time);
		}
		this._window.activate(time);
	}

};

var WindowsQuickListMenuTitle = class extends PopupMenu.PopupBaseMenuItem {

	constructor(text, workspace_index, active) {
		super();

		this._workspace_index = workspace_index;

		this.label = new St.Label({ text: text,
			style_class: 'windows-quick-list-title' });
		this.actor.add(this.label);
		this.actor.label_actor = this.label;

		if (active) {
			this.setOrnament(PopupMenu.Ornament.DOT);
		}

		if (this._workspace_index > -1) {
			this.connect('activate', this._restoreWindow.bind(this));
		}
	}

	_restoreWindow() {
		let time = global.get_current_time();
		global.workspace_manager.get_workspace_by_index(this._workspace_index).activate(time);
	}

};

const WindowsQuickListIndicator = GObject.registerClass(
class WindowsQuickListIndicator extends PanelMenu.Button {

	_init() {

		super._init(null, _("Windows Quick List"));

		this._icon = new St.Icon({
			style_class: 'system-status-icon'
		});
		this._icon.gicon = Gio.icon_new_for_string(`${Me.path}/windows-quick-list-symbolic.svg`);

		this.actor.add_actor(this._icon);
		this.actor.add_style_class_name('panel-status-button');

		this.actor.connect('button-press-event', this._updateWindowList.bind(this));
		this._updateWindowList();
	}

	_updateWindowList() {
		this.menu.removeAll();

		let workspace = global.workspace_manager.get_active_workspace();
		let windows = workspace.list_windows().filter( function(w){
			return !w.is_skip_taskbar() && w.is_on_all_workspaces();
		} );
		this._addWorkspaceWindows(windows, true, -1);

		for (let i = 0; i < global.workspace_manager.get_n_workspaces(); ++i) {
			let workspace = global.workspace_manager.get_workspace_by_index(i);
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
	}

	_addWorkspaceWindows(windows, show_sticky, workspace_index) {
		let tracker = Shell.WindowTracker.get_default();
		let active_workspace_index = global.workspace_manager.get_active_workspace().index();

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

let indicator = null;

function init(extensionMeta) {
}

function enable() {
	indicator = new WindowsQuickListIndicator();
	Main.panel.addToStatusArea("windows-quick-list", indicator);
}

function disable() {
	indicator.destroy();
	indicator = null;
}
