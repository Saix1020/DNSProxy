const fs = require('fs');
const { parseServer } = require('./utils');

const defaultConfig = {
	settings: {
		tcp: false,
		udp: false,
		host: '::',
		port: 53,
		timeout: 5000
	},
	servers: {},
	rules: []
};

const loadConfig = (path) => {
	// require() cannot be reloaded until restart
	// const config = require(path);

	// JSON.parse() cannot handle unstandard JSON comments
	// const config = JSON.parse(fs.readFileSync(path, 'utf8'));

	// use eval-like to work with comments! but that's too dangerous!
	// const config = new Function(`return (${fs.readFileSync(path, 'utf8')});`)();

	let file = fs.readFileSync(path, 'utf8');
	let config;
	try {
		// try to parse directly, as the regexp maybe slow
		config = JSON.parse(file);
	}
	catch(err) {
		// clean comments and try again
		//
		// the first group of regexp is matching the JSON tokens (no stynax check),
		// and the second group is matching the comments blocks
		//
		// (                         # JSON token parts
		//   (?:
		//     [:,{}[\]\s]*          # valid symbols
		//     (?:                   # keys or values string
		//       "                   # - string start
		//       (?:                 # - string content
		//         (?:
		//           [^"]*           #   + character without quote in string
		//           (?:\\[^"])*?    #   + all escape symbols except quote in string
		//         )*
		//         (?:\\")?          #   + case quote in string
		//       )*?
		//       "                   # - string end
		//       |
		//       [\d.Ee+-]+              # numbers
		//       |
		//       true|false          # boolean
		//       |
		//       null                # null
		//     )?
		//   )*
		// )
		// (?                        # case comments or EOF
		//   (                       # comment parts
		//     (?:                   # single line
		//       \/\/                # - comment start
		//       .*?                 # - comment content
		//       (?=\r|\n|$)         # - EOL or EOF
		//     )
		//     |
		//     (?:                   # multi line
		//       \/\*                # - comment start
		//       [\s\S]*?            # - comment content
		//       (?:\*\/|$)          # - comment end or EOF
		//     )+
		//   )
		//   |
		//   $                       # case EOF, or it'll in endless loop!!!
		// )
		file = file.replace(
			/((?:[:,{}[\]\s]*(?:"(?:(?:[^"]*(?:\\[^"])*?)*(?:\\")?)*?"|[\d.Ee+-]+|true|false|null)?)*)(?:((?:\/\/.*?(?=\r|\n|$))|(?:\/\*[\s\S]*?(?:\*\/|$))+)|$)/g,
			'$1'
		);
		config = JSON.parse(file);
	}
	file = null;

	// only merge the first level and second level config
	const result = Object.assign({}, defaultConfig, config);
	Object.keys(defaultConfig).forEach(key => {
		if (typeof defaultConfig[key] !== 'object' || defaultConfig[key] instanceof Array) {
			return;
		}
		result[key] = Object.assign({}, defaultConfig[key], result[key]);
	});
	// format config
	const { settings } = result;
	settings.tcp = !!settings.tcp;
	settings.udp = !!settings.udp;
	settings.port = +settings.port;
	settings.timeout = +settings.timeout;

	// parse servers
	const { servers } = result;
	Object.keys(servers).forEach(key => {
		servers[key] = parseServer(servers[key]);
	});

	return result;
};

module.exports = loadConfig;