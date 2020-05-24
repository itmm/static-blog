'use strict';

const { ipcRenderer } = require('electron');

window.addEventListener('load', evt => {
	const $ = path => {
		return document.getElementById(path.substr(1));
	};

	let active_idx = 0;
	let pages = [];

	const get_active = () => {
		return active_idx ? pages[active_idx - 1] : undefined;
	};

	const update_page_meta = () => {
		if (active_idx) {
			const pg = get_active();
			ipcRenderer.send('update-page-meta', pg);
			delete pg.old_file;
		}
	};

	const $content = $('#content');
	const $pages = $('#pages');
	const $full_name = $('#full-name');
	$full_name.addEventListener('change', () => {
		if (active_idx) {
			const pg = get_active();
			const value = $full_name.value;
			if (value !== pg.full) {
				pg.full = value;
				update_page_meta();
			}
		}
	});
	const $short_name = $('#short-name');
	$short_name.addEventListener('change', () => {
		if (active_idx) {
			const pg = get_active();
			const value = $short_name.value;
			if (value !== pg.short) {
				pg.short = value;
				update_page_meta();
			}
		}
	});
	const $file_name = $('#file-name');
	$file_name.addEventListener('change', () => {
		if (active_idx) {
			const pg = get_active();
			const value = $file_name.value;
			if (value !== pg.file) {
				pg.old_file = pg.file;
				pg.file = value;
				update_page_meta();
			}
		}
	});
	const $entry_active = $('#entry-active');
	$entry_active.addEventListener('change', () => {
		if (active_idx) {
			const pg = get_active();
			const value = $entry_active.hasAttribute('checked');
			if (value !== pg.active) {
				pg.active = value;
				update_page_meta();
			}
		}
	});
	const $entry_index = $('#entry-index');
	$entry_index.addEventListener('change', () => {
		if (active_idx) {
			const pg = get_active();
			if (! pg.index && pg.active) {
				const value = $entry_index.hasAttribute('checked');
				if (value !== pg.index) {
					pages.forEach(p => {
						p.active = (p.idx === pg.idx);
					});
					update_page_meta();
				}
			}
		}
	});

	const $edit_container = $('#edit-container');
	const add_page = p => {
		pages.push(p);
		const idx = pages.length;
		const $elm = document.createElement('li');
		if (! p.active) { $elm.classList.add('inactive'); }
		$elm.id = 'page-' + idx;
		$pages.appendChild($elm);
		const $a = document.createElement('a');
		$a.innerText = p.short;
		$a.addEventListener('click', evt => {
			while ($edit_container.firstChild) {
				$edit_container.removeChild($edit_container.firstChild);
			}
			const $edit_area = document.createElement('textarea');
			$edit_container.appendChild($edit_area);
			const editor = SUNEDITOR.create($edit_area, {
				buttonList: [
					['undo', 'redo'],
					['font', 'fontSize', 'formatBlock'],
					['paragraphStyle', 'blockquote'],
					['bold', 'underline', 'italic', 'strike', 'subscript', 'superscript'],
					['fontColor', 'hiliteColor', 'textStyle'],
					['removeFormat'],
					['outdent', 'indent'],
					['align', 'horizontalRule', 'list'],
					['table', 'image'],
					['showBlocks', 'codeView']
				],
				width: '100%', height: 'auto',
				mode: 'classic',
				lang: SUNEDITOR_LANG['de']
			});
			editor.onBlur = function(evt, core) {
				if (active_idx) {
					const val = editor.getContents();
					const pg = get_active();
					if (val !== pg.body) {
						if (! pg.undos) { pg.undos = []; }
						pg.undos.push(pg.body);
						pg.body = val;
						ipcRenderer.send('save-page', pg);
					}
				}
			};
			$full_name.value = pages[idx - 1].full;
			$short_name.value = pages[idx - 1].short;
			$file_name.value = pages[idx - 1].file;
			if (pages[idx - 1].active) {
				$entry_active.setAttribute('checked', 'checked');
			} else {
				$entry_active.removeAttribute('checked');
			}
			if (pages[idx - 1].index) {
				$entry_index.setAttribute('checked', 'checked');
			} else {
				$entry_index.removeAttribute('checked');
			}
			if (active_idx) {
				$('#page-' + active_idx).classList.remove('item-active');
			}
			$('#page-' + idx).classList.add('item-active');
			active_idx = idx;
			editor.setContents(pages[idx - 1].body);
		});
		$elm.appendChild($a);
	};

	ipcRenderer.send('load-pages');
	ipcRenderer.on('pages-loaded', (evt, pgs) => {
		pages = [];
		while ($pages.firstChild) {
			$pages.removeChild($pages.firstChild);
		}
		pgs.forEach(p => {
			add_page(p);
		});
	});
	ipcRenderer.on('error', (evt, err) => {
		alert("Server-Fehler: " + err);
	});

	$('#build').addEventListener('click', evt => {
		evt.preventDefault();
		ipcRenderer.send('upload-pages', pages);
	});
	$('#download').addEventListener('click', evt => {
		evt.preventDefault();
		ipcRenderer.send('download-pages');
	});
});
