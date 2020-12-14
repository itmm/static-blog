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

	const $edit_container = $('#edit-container');
	const rethink_pages = () => {
		const pgs = pages;
		pages = [];
		while ($pages.firstChild) {
			$pages.removeChild($pages.firstChild);
		}
		pgs.forEach(p => {
			add_page(p);
		})
		if (! active_idx) {
			$full_name.value = '';
			$short_name.value = '';
			$file_name.value = '';
			$entry_active.checked = '';
			$entry_index.checked = '';
			while ($edit_container.firstChild) {
				$edit_container.removeChild($edit_container.firstChild);
			}
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
		return true;
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
		return true;
	});
	const $file_name = $('#file-name');
	const normalize_filename = name => {
		let result = "";
		for (let i = 0; i < name.length; ++i) {
			let c = name.charAt(i);
			if (c >= '0' && c <= '9') {
				//
			} else if (c >= 'a' && c <= 'z') {
				//
			} else if (c >= 'A' && c <= 'Z') {
				//
			} else if (c === '-' || c === '_' || c === '+' || c === '.' || c === ',') {
				//
			} else {
				continue;
			}
			result += c;
		}
		return result;
	};

	$file_name.addEventListener('change', () => {
		if (active_idx) {
			const pg = get_active();
			const value = normalize_filename($file_name.value);
			$file_name.value = value;
			if (value !== pg.file) {
				pg.old_file = pg.file;
				pg.file = value;
				update_page_meta();
			}
		}
		return true;
	});
	const $entry_active = $('#entry-active');
	$entry_active.addEventListener('change', () => {
		if (active_idx) {
			const pg = get_active();
			const value = $entry_active.checked;
			console.log("change", value, pg.active);
			if (value !== pg.active) {
				pg.active = value;
				rethink_pages();
				update_page_meta();
			}
		}
		return true;
	});
	const $entry_index = $('#entry-index');
	$entry_index.addEventListener('change', () => {
		if (active_idx) {
			const pg = get_active();
			if (! pg.index && pg.active) {
				const value = $entry_index.checked;
				if (value !== pg.index) {
					pages.forEach(p => {
						p.index = false;
					});
					pg.index = true;
					update_page_meta();
				}
			} else if (pg.active) {
				$entry_index.checked = true;
			}
		}
		return true;
	});

	const li_drag_start = evt => {
		evt.dataTransfer.effectAllowed = 'move';
		evt.dataTransfer.setData('src_id', evt.currentTarget.id);
		evt.dataTransfer.setDragImage(evt.currentTarget, 0, 0);
	};
	const li_drag_end = evt => {
		evt.dataTransfer.clearData('src_id');
	};
	const li_drag_over = evt => {
		evt.preventDefault();
	};
	const li_drop = evt => {
		const src_id = evt.dataTransfer.getData('src_id');
		const src_obj = $(`#${src_id}`);
		if (src_obj != evt.currentTarget) {
			$pages.insertBefore(src_obj, evt.currentTarget);
			let new_pages = [];
			for (let $c = $pages.firstChild; $c; $c = $c.nextSibling) {
				new_pages.push(pages[+$c.id.substr(5) - 1]);
			}
			pages = new_pages;
			rethink_pages();
			ipcRenderer.send('update-pages-meta', pages);
		}
	};
	const add_page = p => {
		pages.push(p);
		const idx = pages.length;
		const $elm = document.createElement('li');
		if (! p.active) { $elm.classList.add('inactive'); }
		if (idx == active_idx) { $elm.classList.add('item-active'); }
		$elm.id = 'page-' + idx;
		$elm.setAttribute('draggable', true);
		$elm.addEventListener('dragstart', li_drag_start);
		$elm.addEventListener('dragend', li_drag_end);
		$elm.addEventListener('dragover', li_drag_over);
		$elm.addEventListener('drop', li_drop);
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
			$entry_active.checked = pages[idx - 1].active;
			$entry_index.checked = !! pages[idx - 1].index;
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
			if (! p.body) {
				alert(`Seite ${p.full} konnte nicht geladen werden`);
			}
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
	$('#new').addEventListener('click', evt => {
		add_page({ file: '', short: 'Leer', full: '', enabled: false, index: false });
	});
	$('#delete').addEventListener('click', evt => {
		let index = -1;
		if (active_idx) {
			pages.splice(active_idx - 1, 1);
			active_idx = 0;
			rethink_pages();
			ipcRenderer.send('update-pages-meta', pages);
		}
	});
	const $working = $('#working');
	const $working_msg = $working.getElementsByTagName('span')[0];
	$working.addEventListener('click', evt => {
		evt.preventDefault();
		$working.classList.add('hidden');
	});
	ipcRenderer.on('log', (evt, msg) => {
		if (msg != '') {
			$working_msg.innerText = msg;
			$working.classList.remove('hidden');
		} else {
			$working.classList.add('hidden');
		}
	});
});
