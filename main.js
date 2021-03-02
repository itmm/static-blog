'use strict';

const { app, ipcMain, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const ftp = require('ftp');

app.on('ready', () => {
	const win = new BrowserWindow({
		width: 800,
		height: 600,
		webPreferences: {
			nodeIntegration: true
		}
	});
	const full_path = path.join(app.getPath('documents'), 'static-blog');
	const server = JSON.parse(fs.readFileSync(path.join(full_path, "server.json")).toString('utf8'));
	const load_pages = evt => {
		const pages = JSON.parse(fs.readFileSync(path.join(full_path, "pages.json")).toString('utf8'));
		pages.forEach(pg => {
			try {
				pg.body = fs.readFileSync(path.join(full_path, pg.file + '.html')).toString('utf8');
			} catch (err) {
				console.log(`can't load ${pg.file}.html`);
			}
		});
		evt.reply('pages-loaded', pages);
	};
	ipcMain.on('load-pages', evt => {
		load_pages(evt);
	});
	ipcMain.on('save-page', (evt, pg) => {
		console.log('write ' + pg.file);
		fs.writeFileSync(path.join(full_path, pg.file + '.html'), pg.body);
	});

	const htmlify = src => {
		src = src.replace(/&/g, '&amp;');
		src = src.replace(/</g, '&lt;');
		src = src.replace(/>/g, '&gt;');
		return src;
	};
	const build_page = (pg, pgs) => {
		const build_path = path.join(full_path, 'build');
		if (! fs.existsSync(build_path)) {
			fs.mkdirSync(build_path);
		}
		const template = fs.readFileSync(path.join(full_path, 'PAGE.html')).toString('utf8');
		const yr = (new Date()).getFullYear();
		let nav = '';
		pgs.forEach(p2 => {
			if (p2.active) {
				nav += "<li" + (pg.file === p2.file ? " class=\"active\"" : '')  + "><a href=\"" + p2.file + ".html\"" +
					">" + htmlify(p2.short) + "</a></li>\n";
			}
		});
		let val = template.replace(/\$\{NAVIGATION\}/g, nav);
		val = val.replace(/\$\{CONTENT\}/g, pg.body);
		val = val.replace(/\$\{TITLE\}/g, pg.full);
		val = val.replace(/\$\{YEAR\}/g, yr);
		fs.writeFileSync(path.join(build_path, pg.file + '.html'), val);
		if (pg.index) {
			fs.writeFileSync(path.join(build_path, 'index.html'), val);
		}
		const de = fs.readdirSync(full_path);
		de.forEach(e => {
			const ext = path.extname(e)
			if (ext === '.css' ||
				ext === '.jpg' ||
				ext === '.png'
			) {
				fs.copyFileSync(path.join(full_path, e), path.join(build_path, e));
			}
		});
	};
	const build_pages = pgs => {
		console.log('BUILD pages');
		pgs.forEach(pg => {
			if (pg.active) {
				build_page(pg, pgs);
			}
		});
		build_page({
			file: 'datenschutz', body: fs.readFileSync(path.join(full_path, 'datenschutz.html')).toString('utf8'),
			index: false, full: 'Datenschutzerklärung'
		}, pgs);
		build_page({
			file: 'impressum', body: fs.readFileSync(path.join(full_path, 'impressum.html')).toString('utf8'),
			index: false, full: 'Impressum'
		}, pgs);
	};
	ipcMain.on('build-pages', (evt, pgs) => {
		build_pages(pgs);
	});
	const put_one = (lst, root, client, cont) => {
		if (! lst.length) { cont(client); return; }
		const name = lst.pop();
		if (name === 'build' || name === 'server.json' || name[0] === '.') {
			put_one(lst, root, client, cont);
			return;
		}
		win.webContents.send('log', `sende Datei ${name}`);
		client.put(
			path.join(root, name),
			name, false,
			err => {
				if (err) throw err;
				put_one(lst, root, client, cont);
		});

	};
	const finished_upload = client => {
		win.webContents.send('log', '');
		client.end();
	}
	const copy_dynamics = client => {
		win.webContents.send('log', 'wechsle Verzeichnis zurück');
		client.cwd('..', err => {
			if (err) throw err;
			let root = path.join(full_path, 'build');
			let entries = fs.readdirSync(root);
			put_one(entries, root, client, finished_upload);
		});
	};
	const copy_statics = client => {
		let entries = fs.readdirSync(full_path);
		put_one(entries, full_path, client, copy_dynamics);
	}
	const do_upload = client => {
		win.webContents.send('log', 'wechsle in Repo-Verzeichnis');
		client.cwd('static-blog', err => {
			if (err) {
				win.webContents.send('log', 'erzeuge Repo-Verzeichnis');
				client.mkdir('static-blog', err => {
					if (err) throw err;
					win.webContents.send('log', 'wechsle in Repo-Verzeichnis');
					client.cwd('static-blog', err => {
						if (err) throw err;
						copy_statics(client);
					});
				});
			} else {
				copy_statics(client);
			}
		});
	};
	ipcMain.on('upload-pages', (evt, pgs) => {
		build_pages(pgs);
		win.webContents.send('log', '');
		let client = new ftp();
		client.on('ready', () => {
			try {
				if (server.dir) {
					win.webContents.send('log', `wechsle in Verzeichnis ${server.dir}`);
					client.cwd(server.dir, err => {
						if (err) throw err;
						do_upload(client);
					});
				} else {
					do_upload(client);
				}
			} catch (err) {
				evt.reply('error', err);
				client.end();
			}
		});
		client.on('error', err => {
			evt.reply('error', err);
		});
		client.connect(server);
	});

	const get_one = (evt, lst, root, client, cont) => {
		if (! lst.length) { cont(evt, client); return; }
		const name = lst.pop().name;
		if (name === 'server.json' || name[0] === '.') {
			get_one(evt, lst, root, client, cont);
			return;
		}
		win.webContents.send('log', `hole Datei ${name}`);
		client.get(
			name,
			(err, stream) => {
				if (err) throw err;
				stream.once('close', () => {
					get_one(evt, lst, root, client, cont);
				});
				stream.pipe(fs.createWriteStream(path.join(root, name)));
		});

	};
	const finished_download = (evt, client) => {
		win.webContents.send('log', '');
		client.end();
		load_pages(evt);
	}
	const do_download = (evt, client) => {
		win.webContents.send('log', 'hole Liste der Dateien');
		client.list('.', (err, files) => {
			if (err) { throw err; }
			get_one(evt, files, full_path, client, finished_download);
		});
	};
	ipcMain.on('download-pages', evt => {
		win.webContents.send('log', 'lade Seiten vom Server');
		let client = new ftp();
		client.on('ready', () => {
			try {
				let dir = server.dir ? server.dir + '/' : '';
				dir += 'static-blog';
				win.webContents.send('log', `wechsle Verzeichnis nach ${dir}`);
				client.cwd(dir, err => {
					if (err) throw err;
					do_download(evt, client);
				});
			} catch (err) {
				evt.reply('error', err);
				client.end();
			}
		});
		client.on('error', err => {
			evt.reply('error', err);
		});
		client.connect(server);
	});

	ipcMain.on('update-page-meta', (evt, pg) => {
		const pt = path.join(full_path, "pages.json");
		const pages = JSON.parse(fs.readFileSync(pt).toString('utf8'));
		const file = pg.old_file ? pg.old_file : pg.file;
		if (file === '') {
			evt.reply('error', 'Name ist leer');
			return;
		}
		if (pg.old_file) {
			let found = false;
			pages.forEach(p => {
				if (p.file === pg.file) {
					found = true;
				}
			});
			if (found) {
				evt.reply('error', 'Name wird bereits verwendet');
				return;
			}
			const from_path = path.join(full_path, pg.old_file + '.html');
			const to_path = path.join(full_path, pg.file + '.html');
			fs.rename(from_path, to_path, err => {
				if (err) {
					console.log(`file ${from_path} was not renamed to ${to_path}`);
				}
			});
		}
		pages.forEach(p => {
			if (p.file === file) {
				p.full = pg.full;
				p.short = pg.short;
				p.file = pg.file;
				p.active = pg.active;
			}
			if (pg.index) {
				p.index = (p.file === pg.file);
			}
		});
		fs.writeFileSync(pt, JSON.stringify(pages));
		console.log('wrote pages.json');
	});

	ipcMain.on('update-pages-meta', (evt, pgs) => {
		let pages = [];
		pgs.forEach(p => {
			pages.push({
				'file': p.file,
				'full': p.full,
				'short': p.short,
				'active': p.active,
				'index': p.index
			});
		});
		const pt = path.join(full_path, "pages.json");
		fs.writeFileSync(pt, JSON.stringify(pages));
		console.log('wrote full pages.json');
	});
	win.loadFile('index.html');
});

