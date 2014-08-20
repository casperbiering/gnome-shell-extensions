const Main = imports.ui.main;
const Lang = imports.lang;
const Gio = imports.gi.Gio;

let _slider_original = {};

const Clutter = imports.gi.Clutter;
let _slider_override = {
    scroll: function (event) {
        let direction = event.get_scroll_direction();
        let delta;

        if (event.is_pointer_emulated())
            return;

        if (direction == Clutter.ScrollDirection.DOWN) {
            delta = -SLIDER_SCROLL_STEP;
        } else if (direction == Clutter.ScrollDirection.UP) {
            delta = +SLIDER_SCROLL_STEP;
        } else if (direction == Clutter.ScrollDirection.SMOOTH) {
            let [dx, dy] = event.get_scroll_delta();
            // Even though the slider is horizontal, use dy to match
            // the UP/DOWN above.
            delta = -dy / 10;
        }

        delta = delta * this._delta_multiplier; // THIS IS THE ONLY LINE ADDED COMPARED TO THE ORIGINAL FUNCTION

        this._value = Math.min(Math.max(0, this._value + delta), 1);

        this.actor.queue_repaint();
        this.emit('value-changed', this._value);
    },
    onKeyPressEvent: function(actor, event) {
        let key = event.get_key_symbol();
        if (key == Clutter.KEY_Right || key == Clutter.KEY_Left) {
            let delta = key == Clutter.KEY_Right ? 0.1 : -0.1;
            delta = delta * this._delta_multiplier; // THIS IS THE ONLY LINE ADDED COMPARED TO THE ORIGINAL FUNCTION
            this._value = Math.max(0, Math.min(this._value + delta, 1));
            this.actor.queue_repaint();
            this.emit('value-changed', this._value);
            this.emit('drag-end');
            return true;
        }
        return false;
    },
    _getMinimumIncrement: function (actor) {
        return 0.1 * this._delta_multiplier; // THIS IS THE ONLY LINE CHANGED COMPARED TO THE ORIGINAL FUNCTION
    }
};

function enable() {
    let slider = Main.panel.statusArea.aggregateMenu._volume._volumeMenu._output._slider;

    for (let k in _slider_override) {
        _slider_original[k] = slider[k];
        slider[k] = Lang.bind(slider, _slider_override[k]);
    }
}

function disable() {
    let slider = Main.panel.statusArea.aggregateMenu._volume._volumeMenu._output._slider;

    for (let k in _slider_original) {
        slider[k] = _slider_original[k];
    }
}

function init() {
    let slider = Main.panel.statusArea.aggregateMenu._volume._volumeMenu._output._slider;
    //let settings = new Gio.Settings({ schema: 'org.gnome.shell.extensions.change-volume-step' });
    //global.log(settings.get_double( 'delta-multiplier' ));

    slider._delta_multiplier = 0.5;
}
