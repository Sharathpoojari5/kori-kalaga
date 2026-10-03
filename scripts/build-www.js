// Wraps src/game.html in a full HTML document and writes www/index.html.
// Three.js is bundled next to it so the 3D ground works with no internet.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
let body = fs.readFileSync(path.join(root, 'src', 'game.html'), 'utf8');
const head = '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n' +
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">\n' +
  '<meta name="theme-color" content="#17122a">\n';
fs.mkdirSync(path.join(root, 'www'), { recursive: true });
const three = [path.join(root, 'src', 'vendor', 'three.min.js'), path.join(root, 'node_modules', 'three', 'build', 'three.min.js')].find(p => fs.existsSync(p));
if (three){
  fs.copyFileSync(three, path.join(root, 'www', 'three.min.js'));
  body = body.replace(/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/three@[^"]+"><\/script>/, '<script src="three.min.js"></script>');
  console.log('three.js bundled from', path.relative(root, three));
} else console.warn('three.js not found: the 3D ground will need internet. Run npm install.');
fs.writeFileSync(path.join(root, 'www', 'index.html'), head + body + '\n</html>\n');
console.log('www/index.html written');
