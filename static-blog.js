'use strict';

window.addEventListener('load', evt => {
	const $ = path => {
		return document.getElementById(path.substr(1));
	};
	const $edit = $('#edit');
	const $preview = $('#preview');
	$('#do-preview').addEventListener('click', evt => {
		evt.preventDefault();
		$edit.classList.add('hidden');
		$preview.classList.remove('hidden');
	});
	$('#do-edit').addEventListener('click', evt => {
		evt.preventDefault();
		$preview.classList.add('hidden');
		$edit.classList.remove('hidden');
	});
});
