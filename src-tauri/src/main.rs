// Su Windows in release non deve aprirsi una console dietro la finestra.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    deal_desk_lib::run()
}
