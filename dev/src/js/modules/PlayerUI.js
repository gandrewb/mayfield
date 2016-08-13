'use strict';


var Song = require('./Song');

function PlayerUI(parent_el, show_all, playlists) {
	this.el = parent_el;
	this.show_all = show_all;
	this.list_ul = this.el.querySelector('[data-playlist-container]');
	this.songs_div = this.el.querySelector('[data-song-container]');
	
	this.playlists = playlists;

	this.cur_list = 0;
	this.cur_song = [];
}

var proto = PlayerUI.prototype;



// ••••••••••
// PUBLIC METHODS
// ••••••••••

proto.populateLists = function() {
	this.list_ul.innerHTML = '';
	
	for(var x=0, l=this.playlists.length; x<l; x++) {
		var list = this.playlists[x];
		var li = this._getListLi(list, x);
		this.list_ul.appendChild(li);
		
		this.populateSongs(x);
	}
};



proto.populateSongs = function(list_idx) {
	var ul = document.createElement('ul');
	ul.classList.add('playlist');
	ul.setAttribute('data-playlist', list_idx);
	
	if(this.cur_list===list_idx) {
		ul.classList.add('selected');
	}
	
	var song_list = this.playlists[list_idx].songs;
	
	for(var x=0, l=song_list.length; x<l; x++) {
		var song = song_list[x];
		
		if(this.show_all || song.show==='true'){
			var li = this._getSongLi(song, x);
			ul.appendChild(li);
		}
	}
	
	this.songs_div.appendChild(ul);
};


// ••••••••••
// PRIVATE METHODS
// ••••••••••

proto._clearClasses = function(selector, classArray) {
	var els = document.querySelectorAll(selector);
	for(var x=0, l=els.length; x<l; x++){
		for(var i=0, len=classArray.length; i<len; i++) {
			els[x].classList.remove(classArray[i]);
		}
	}
};



proto._getListLi = function(list, idx) {
	var li = document.createElement('li');
	li.setAttribute('data-playlist-trigger', idx);
	
	if(idx==this.cur_list){
		li.classList.add('selected');
	}
	
	var span = document.createElement('span');
	var txt = document.createTextNode(list.name);
	span.appendChild(txt);
	li.appendChild(span);
	
	var parent = this;
	
	li.addEventListener('click', function(e) {
		parent._listBtnClick(this, parent);
	});
	
	return li;
};



proto._getSongLi = function(song, idx) {
	var li = document.createElement('li');
	li.setAttribute('data-song', idx);
	
	var span = document.createElement('span');
	var txt = document.createTextNode(song.title);
	var div = document.createElement('div');
	div.classList.add('progress_bar');
	span.appendChild(txt);
	li.appendChild(span);
	li.appendChild(div);
	
	var parent = this;
	
	li.addEventListener('click', function(e){
		parent._songBtnClick(this, parent);
	});
	
	return li;
};



proto._listBtnClick = function(btn, parent) {
	parent._clearClasses('[data-playlist-trigger]', ['selected']);
	parent._clearClasses('.playlist', ['selected']);
	
	parent.cur_list = btn.getAttribute('data-playlist-trigger');

	btn.classList.add('selected');
	document.querySelector('.playlist[data-playlist="'+ parent.cur_list +'"]').classList.add('selected');
};



proto._songBtnClick = function(btn, parent) {
	var idx = btn.getAttribute('data-song');
	var progress_bar = btn.querySelector('.progress_bar');
	var song = parent.playlists[parent.cur_list].songs[idx];
	
	if(song.audio === undefined){
		song.audio = new Song(song.fullpath);
	}
	
	if(btn.classList.contains('paused')){ // unpause song
		
		song.audio.play();
		btn.classList.remove('paused');
		this._updatePlayhead(progress_bar, song.audio);
		
	} else {
		if(btn.classList.contains('playing')){ // pause song
			
			song.audio.pause();
			btn.classList.add('paused');
			cancelAnimationFrame(this.animator);
			
		} else { // play new song
			
			if(parent.cur_song.length>1){
				parent.playlists[this.cur_song[0]].songs[this.cur_song[1]].audio.stop();
				cancelAnimationFrame(this.animator);
			}
			
			parent._clearClasses('[data-song]', ['playing', 'paused']);
			
			parent.cur_song = [parent.cur_list, idx];
			
			song.audio.play();
			
			btn.classList.add('playing');
			this._updatePlayhead(progress_bar, song.audio);
		}
	}
}



proto._advancePlaylist = function(){
	if (this.cur_song[1] < this.playlists[this.cur_song[0]].songs.length-1) {
		this.cur_song[1]++;
		
		var song = this.playlists[this.cur_song[0]].songs[this.cur_song[1]];
		
		if(this.show_all || song.show==='true') {
			return true;
		} else {
			return this._advancePlaylist();
		}
		
	} else {
		return false;
	}
};



proto._songEnded = function() {
	this._clearClasses('[data-song]', ['playing', 'paused']);
	
	if (this._advancePlaylist()) {
		this._songBtnClick(this.songs_div.querySelector('[data-playlist="'+ this.cur_song[0] +'"] [data-song="'+ this.cur_song[1] +'"]'), this);
	}
};



proto._updatePlayhead = function(el, song) {
	if(song.ended()) {
		cancelAnimationFrame(this.animator);
		this._songEnded();
	} else {
		el.style.width = song.getPercentPlayed() + '%';
		
		this.animator = requestAnimationFrame(function(){
			this._updatePlayhead(el, song);
		}.bind(this));
	
	}
};



module.exports = PlayerUI;




