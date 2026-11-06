// Starter sprite library. All of it is original art written as text, so it is free to use.
// Multiple frames are stored side by side in one image, ready for sprite sheet lessons.

const P = {
  k: '#1b1b28', w: '#ffffff', r: '#d9483b', R: '#a42f25', o: '#ee8f35', y: '#f4cf49', Y: '#c99a1e', g: '#5cb85a', G: '#2f7d3a',
  b: '#3f7fe0', B: '#284f9c', c: '#66d9e8', p: '#8350c9', m: '#e4619f', s: '#ffdbb4', S: '#c68c5b', n: '#8a5a33', N: '#5c3a1f', e: '#9aa5b5', E: '#5e6878',
};

const SPRITES = [
  { name: 'hero', tag: 'Characters', frames: [
    ['....kkkkkkkk....', '...kbbbbbbbbk...', '...kbbbbbbbbk...', '...kssssssssk...', '...kskwssksk....', '...ksssssssk....', '....kssssssk....', '...kkrrrrrkk....', '..ksrrrrrrrrsk..', '..ksrrrrrrrrsk..', '...krrrrrrrrk...', '...kBBBBBBBBk...', '...kBBBkkBBBk...', '...kBBk..kBBk...', '...kNNk..kNNk...', '...kkkk..kkkk...'],
    ['....kkkkkkkk....', '...kbbbbbbbbk...', '...kbbbbbbbbk...', '...kssssssssk...', '...kskwssksk....', '...ksssssssk....', '....kssssssk....', '...kkrrrrrkk....', '..ksrrrrrrrrsk..', '..ksrrrrrrrrsk..', '...krrrrrrrrk...', '...kBBBBBBBBk...', '...kBBk.kBBBk...', '..kBBk...kBBk...', '..kNNk....kNNk..', '..kkkk....kkkk..'],
  ] },
  { name: 'robot', tag: 'Characters', frames: [
    ['.......kk.......', '.......yy.......', '...kkkkkkkkkk...', '...keeeeeeeek...', '...kecceecc.k...', '...keeeeeeeek...', '...keEEEEEEek...', '...kkkkkkkkkk...', '.kkkeeeeeeeekkk.', '.kekeeeeeeeekek.', '.kekeErrrrEeke..', '.kkkeeeeeeeekkk.', '...kkkkkkkkkk...', '....kek..kek....', '....kek..kek....', '...kkkk..kkkk...'],
    ['.......yy.......', '.......kk.......', '...kkkkkkkkkk...', '...keeeeeeeek...', '...kecceeccek...', '...keeeeeeeek...', '...keEEEEEEek...', '...kkkkkkkkkk...', '.kkkeeeeeeeekkk.', '.kekeeeeeeeekek.', '.kekeEyyyyEekek.', '.kkkeeeeeeeekkk.', '...kkkkkkkkkk...', '...kek....kek...', '...kek....kek...', '..kkkk....kkkk..'],
  ] },
  { name: 'slime', tag: 'Enemies', frames: [
    ['................', '................', '................', '................', '.....kkkkkk.....', '...kkggggggkk...', '..kggwwggggggk..', '..kggwgggggggk..', '.kgggkgggkgggGk.', '.kgggkgggkgggGk.', '.kggggggggggGGk.', '.kggggggggggGGk.', '.kGGGGGGGGGGGGk.', '..kkkkkkkkkkkk..', '................', '................'],
    ['................', '................', '................', '................', '................', '................', '....kkkkkkkk....', '..kkggwwgggggk..', '.kgggwggkgggkGk.', '.kgggggkgggkgGk.', 'kggggggggggggGGk', 'kggggggggggggGGk', 'kGGGGGGGGGGGGGGk', '.kkkkkkkkkkkkkk.', '................', '................'],
  ] },
  { name: 'bat', tag: 'Enemies', frames: [
    ['................', '................', '.k............k.', 'kpk...k..k...kpk', 'kppk..kkkk..kppk', 'kpppkkppppkkpppk', 'kppppkrpprkppppk', '.kpppkppppkpppk.', '..kkk.kppk.kkk..', '.......kk.......', '................', '................', '................', '................', '................', '................'],
    ['................', '................', '................', '................', '......k..k......', '......kkkk......', '.kkkkkppppkkkkk.', 'kppppkrpprkppppk', 'kpppppppppppppk.', '.kppk.kppk.kppk.', '..kk...kk...kk..', '................', '................', '................', '................', '................'],
  ] },
  { name: 'ghost', tag: 'Enemies', frames: [
    ['................', '.....kkkkkk.....', '...kkwwwwwwkk...', '..kwwwwwwwwwwk..', '..kwwkkwwkkwwk..', '.kwwwkkwwkkwwwk.', '.kwwwwwwwwwwwwk.', '.kwwwwwkkwwwwwk.', '.kwwwwwkkwwwwwk.', '.kwwwwwwwwwwwwk.', '.kwwwwwwwwwwwwk.', '.kwwwwwwwwwwwwk.', '.kwwkwwwkwwkwwk.', '.kwk.kwk.kwk.kk.', '..k...k...k.....', '................'],
  ] },
  { name: 'ship', tag: 'Space', frames: [
    ['.......kk.......', '......kcck......', '......kcck......', '.....kecceek....', '.....keeeeek....', '....keeeeeeek...', '....keebbeeek...', '...keeebbeeeek..', '..kreeeeeeeeerk.', '.krrkeeeeeekrrk.', '.krk.keeeek.krk.', '.kk..kEEEEk..kk.', '.....kkkkkk.....', '.....koyyok.....', '......kyyk......', '.......kk.......'],
    ['.......kk.......', '......kcck......', '......kcck......', '.....kecceek....', '.....keeeeek....', '....keeeeeeek...', '....keebbeeek...', '...keeebbeeeek..', '..kreeeeeeeeerk.', '.krrkeeeeeekrrk.', '.krk.keeeek.krk.', '.kk..kEEEEk..kk.', '.....kkkkkk.....', '.....kryyrk.....', '.....koyyok.....', '......kook......'],
  ] },
  { name: 'alien', tag: 'Space', frames: [
    ['................', '................', '...k........k...', '....k......k....', '...kkkkkkkkkk...', '..kggggggggggk..', '.kggkkggggkkggk.', 'kgggkkggggkkgggk', 'kggggggggggggggk', 'kgkggggggggggkgk', 'kgkgkkkkkkkkgkgk', 'k.k.kk....kk.k.k', '....kk....kk....', '................', '................', '................'],
    ['................', '................', '...k........k...', 'k...k......k...k', 'k..kkkkkkkkkk..k', 'k.kggggggggggk.k', 'kkggkkggggkkggkk', 'kgggkkggggkkgggk', 'kggggggggggggggk', '.kkggggggggggkk.', '...gkkkkkkkkg...', '...kk......kk...', '..kk........kk..', '................', '................', '................'],
  ] },
  { name: 'coin', tag: 'Items', frames: [
    ['................', '................', '.....kkkkkk.....', '....kyyyyyyk....', '...kyywwyyyyk...', '...kywyyYYyyk...', '...kywyyYYyyk...', '...kyyyyYYyyk...', '...kyyyyYYyyk...', '...kyyyyyyyyk...', '...kYyyyyyyYk...', '....kYYYYYYk....', '.....kkkkkk.....', '................', '................', '................'],
    ['................', '................', '.......kk.......', '......kyyk......', '......kwyk......', '......kwyk......', '......kyYk......', '......kyYk......', '......kyYk......', '......kyYk......', '......kyYk......', '......kyyk......', '.......kk.......', '................', '................', '................'],
  ] },
  { name: 'gem', tag: 'Items', frames: [
    ['................', '................', '................', '....kkkkkkkk....', '...kcwwccccck...', '..kcwwccccccck..', '.kkkkkkkkkkkkkk.', '.kbcccbccbcccbk.', '..kbcccbbcccbk..', '...kbccbbccbk...', '....kbccccbk....', '.....kbccbk.....', '......kbbk......', '.......kk.......', '................', '................'],
  ] },
  { name: 'key', tag: 'Items', frames: [
    ['................', '................', '....kkkk........', '...kyyyyk.......', '..kyykkyyk......', '..kyk..kyk......', '..kyk..kykkkkkkk', '..kyykkyyyyyyyyk', '...kyyyykYYYYYYk', '....kkkk.kkYkkYk', '..........kYkkYk', '...........k..k.', '................', '................', '................', '................'],
  ] },
  { name: 'heart', tag: 'Items', frames: [
    ['................', '................', '...kkk....kkk...', '..krrrk..krrrk..', '.krwwrrkkrrrrrk.', '.krwrrrrrrrrrrk.', '.krrrrrrrrrrrRk.', '.krrrrrrrrrrrRk.', '..krrrrrrrrrRk..', '...krrrrrrrRk...', '....krrrrrRk....', '.....krrrRk.....', '......krRk......', '.......kk.......', '................', '................'],
  ] },
  { name: 'star', tag: 'Items', frames: [
    ['................', '.......kk.......', '......kyyk......', '......kyyk......', '.....kyyyyk.....', 'kkkkkkyyyykkkkkk', 'kyyyyyyyyyyyyyyk', '.kyyyyyyyyyyyyk.', '..kyyyyyyyyyyk..', '...kyyyyyyyyk...', '...kyyyyyyyyk...', '..kyyyykkyyyyk..', '..kyyk....kyyk..', '.kyk........kyk.', '.kk..........kk.', '................'],
  ] },
  { name: 'flag', tag: 'Items', frames: [
    ['...kk...........', '...kekkkkkk.....', '...kermmmmmk....', '...kemmmmmmmk...', '...kemmmmmmmmk..', '...kemmmmmmmk...', '...kemmmmmmk....', '...kekkkkkk.....', '...kek..........', '...kek..........', '...kek..........', '...kek..........', '...kek..........', '...kek..........', '..kkEkk.........', '..kkkkk.........'],
  ] },
  { name: 'spike', tag: 'World', frames: [
    ['................', '................', '................', '.......kk.......', '.......kk.......', '......kwek......', '......kwek......', '.....kweeEk.....', '.....kweeEk.....', '....kweeeeEk....', '....kweeeeEk....', '...kweeeeeeEk...', '...kweeeeeeEk...', '..kweeeeeeeeEk..', '.kkkkkkkkkkkkkk.', '................'],
  ] },
  { name: 'brick', tag: 'World', frames: [
    ['kkkkkkkkkkkkkkkk', 'krrrrrrkrrrrrrrk', 'krrrrrrkrrrrrrrk', 'kRRRRRRkRRRRRRRk', 'kkkkkkkkkkkkkkkk', 'rrrkrrrrrrrkrrrr', 'rrrkrrrrrrrkrrrr', 'RRRkRRRRRRRkRRRR', 'kkkkkkkkkkkkkkkk', 'krrrrrrkrrrrrrrk', 'krrrrrrkrrrrrrrk', 'kRRRRRRkRRRRRRRk', 'kkkkkkkkkkkkkkkk', 'rrrkrrrrrrrkrrrr', 'rrrkrrrrrrrkrrrr', 'kkkkkkkkkkkkkkkk'],
  ] },
  { name: 'grass', tag: 'World', frames: [
    ['g.g.gg.g..gg.g.g', 'gggggggggggggggg', 'gGgggGggggGgggGg', 'GGGGGGGGGGGGGGGG', 'nnnNnnnnnnnNnnnn', 'nnnnnnNnnnnnnnnn', 'nNnnnnnnnNnnnnNn', 'nnnnNnnnnnnnNnnn', 'nnnnnnnNnnnnnnnn', 'nNnnnnnnnnnNnnnn', 'nnnnnNnnnnnnnnNn', 'nnnnnnnnNnnnnnnn', 'nnNnnnnnnnnNnnnn', 'nnnnnnNnnnnnnnNn', 'nnnNnnnnnNnnnnnn', 'NNNNNNNNNNNNNNNN'],
  ] },
  { name: 'tree', tag: 'World', frames: [
    ['.....kkkkkk.....', '...kkggggggkk...', '..kggggGggggGk..', '.kgggGggggggGGk.', '.kggggggGgggGGk.', 'kgGgggggggGggGGk', 'kgggggGggggggGGk', '.kgggggggGgGGGk.', '..kkgGggggGGkk..', '....kkkkkkkk....', '......kNnk......', '......kNnk......', '......kNnk......', '......kNnk......', '.....kNNnnk.....', '.....kkkkkk.....'],
  ] },
  { name: 'rock', tag: 'World', frames: [
    ['................', '................', '................', '................', '.....kkkkkk.....', '....keeeeeEk....', '...keweeeeeEk...', '..keeeeEeeeEEk..', '..keeeeeeEeeEk..', '.keeeeEeeeeeEEk.', '.keeeeeeeeeEEEk.', '.kEeeeeeeEeeEEk.', '.kEEEEEEEEEEEEk.', '..kkkkkkkkkkkk..', '................', '................'],
  ] },
];

function drawSprite(s) {
  const size = s.frames[0].length;
  const c = document.createElement('canvas');
  c.width = size * s.frames.length;
  c.height = size;
  const g = c.getContext('2d');
  s.frames.forEach((frame, f) => frame.forEach((row, y) => [...row].forEach((ch, x) => {
    if (P[ch]) { g.fillStyle = P[ch]; g.fillRect(f * size + x, y, 1, 1); }
  })));
  return c.toDataURL();
}

let built = null;

/** Starter sprites in the same shape as saved sprites. */
export function starterSprites() {
  if (!built) {
    built = SPRITES.map((s) => ({
      id: `starter:${s.name}`, name: s.name, tag: s.tag, frames: s.frames.length,
      w: s.frames[0].length, h: s.frames[0].length, data_url: drawSprite(s), starter: true,
    }));
  }
  return built;
}
