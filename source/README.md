# Game source

`src/game.html` is generated. Edit the files here, then run `npm run game` (or `npm run build`).

- `base.html`: the game itself (rules, menus, 2D fallback renderer, sound).
- `g3/*.js`: the 3D renderer, concatenated in the order listed in `patch_3d.py`.
- `patch_3d.py`: copies the 3D code into the game and applies the fight-screen fixes.

Emulator checks live in `tools/` (`node tools/kori-end.mjs` plays a full fight and reports fps and errors).
