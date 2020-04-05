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
	ipcMain.on('load-pages', evt => {
		const pages = JSON.parse(fs.readFileSync(path.join(full_path, "pages.json")).toString('utf8'));
		let result = [];
		pages.forEach(pg => {
			pg.body = fs.readFileSync(path.join(full_path, pg.file + '.html')).toString('utf8');
			result.push(pg);
		});
		evt.reply('pages-loaded', result);
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
			nav += "<li" + (pg.file === p2.file ? " class=\"active\"" : '')  + "><a href=\"" + p2.file + ".html\"" +
				">" + htmlify(p2.short) + "</a></li>\n";
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
			build_page(pg, pgs);
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
	const copy_one = (lst, root, client, cont) => {
		if (! lst.length) { cont(client); return; }
		const name = lst.pop();
		if (name === 'build' || name === 'server.json' || name[0] === '.') {
			copy_one(lst, root, client, cont);
			return;
		}
		console.log('PUT ', path.join(root, name));
		client.put(
			path.join(root, name),
			name, false,
			err => {
				if (err) throw err;
				copy_one(lst, root, client, cont);
		});

	};
	const finished_upload = client => {
		console.log('END');
		client.end();
	}
	const copy_dynamics = client => {
		console.log('CWD ..');
		client.cwd('..', err => {
			if (err) throw err;
			let root = path.join(full_path, 'build');
			let entries = fs.readdirSync(root);
			copy_one(entries, root, client, finished_upload);
		});
	};
	const copy_statics = client => {
		let entries = fs.readdirSync(full_path);
		copy_one(entries, full_path, client, copy_dynamics);
	}
	const do_upload = client => {
		console.log('CWD static-blog');
		client.cwd('static-blog', err => {
			if (err) {
				console.log('MKDIR static-blog');
				client.mkdir('static-blog', err => {
					if (err) throw err;
					console.log('CWD static-blog');
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
		console.log('UPLOAD pages');
		let client = new ftp();
		client.on('ready', () => {
			try {
				if (server.dir) {
					client.cwd(server.dir, err => {
						if (err) throw err;
						do_upload(client);
					});
				} else {
					do_upload(client);
				}
			} catch (err) {
				client.end();
			}
		});
		client.on('error', err => {
			console.log('ERROR', err);
		});
		client.connect(server);
	});

	win.loadFile('index.html');
});

