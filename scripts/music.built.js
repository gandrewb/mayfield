(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';


var Song = require('./Song');

function PlayerUI(parent_el, show_all, data) {
	this.el = parent_el;
	this.show_all = show_all;
	this.list_ul = this.el.querySelector('[data-playlist-container]');
	this.songs_div = this.el.querySelector('[data-song-container]');
	
	this.audio_folder = data.audio_folder;
	this.playlists = data.playlists;

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
	var div = document.createElement('div');
	div.classList.add('playlist');
	div.setAttribute('data-playlist', list_idx);
	
	if(this.cur_list===list_idx) {
		div.classList.add('selected');
	}
	
	var ul = document.createElement('ul');
	div.appendChild(ul);
	
	var playlist = this.playlists[list_idx];
	var song_list = playlist.songs;
	
	for(var x=0, l=song_list.length; x<l; x++) {
		var song = song_list[x];
		
		if(this.show_all || song.make_public){
			var li = this._getSongLi(song, x);
			ul.appendChild(li);
		}
	}
	
	var extras_div = this._getListExtras(playlist);
	if(extras_div) { div.appendChild(extras_div); };
	
	this.songs_div.appendChild(div);
};


// ••••••••••
// PRIVATE METHODS
// ••••••••••

proto._advancePlaylist = function(){
	if (this.cur_song[1] < this.playlists[this.cur_song[0]].songs.length-1) {
		this.cur_song[1]++;
		
		var song = this.playlists[this.cur_song[0]].songs[this.cur_song[1]];
		
		if(this.show_all || song.make_public) {
			return true;
		} else {
			return this._advancePlaylist();
		}
		
	} else {
		return false;
	}
};



proto._clearClasses = function(selector, classArray) {
	var els = document.querySelectorAll(selector);
	for(var x=0, l=els.length; x<l; x++){
		for(var i=0, len=classArray.length; i<len; i++) {
			els[x].classList.remove(classArray[i]);
		}
	}
};



proto._getListExtras = function(list) {
	var div = null;
	
	if(list.program) {
		console.log('program');
		div = document.createElement('div');
		div.setAttribute('class', 'playlist_extras');
		
		var a = document.createElement('a');
		a.setAttribute('href', '/programs/'+list.program);
		a.setAttribute('class', 'icon-document-blank');
		
		var label = document.createTextNode('Program');
		a.appendChild(label);
		
		div.appendChild(a);
	}
	return div;
}



proto._getListLi = function(list, idx) {
	var li = document.createElement('li');
	li.setAttribute('data-playlist-trigger', idx);
	
	if(idx==this.cur_list){
		li.classList.add('selected');
	}
	
	var span = document.createElement('span');
	var txt = document.createTextNode(list.playlist_name);
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



proto._songAnalytics = function(song_coord, action){
	if(window.ga) {
		ga('send', {
			hitType: 'event',
			eventCategory: 'Music Player',
			eventAction: action,
			eventLabel: this.playlists[song_coord[0]].songs[song_coord[1]].title,
			eventValue: song_coord[0]
		});
	}
};



proto._songBtnClick = function(btn, parent) {
	var idx = btn.getAttribute('data-song');
	var progress_bar = btn.querySelector('.progress_bar');
	var playlist = parent.playlists[parent.cur_list];
	var song = playlist.songs[idx];
	
	if(song.audio === undefined){
		var path = this.audio_folder +'/'+ playlist.folder +'/'+ song.filename;
		song.audio = new Song(path);
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
			
			this._songAnalytics(parent.cur_song, 'play');
			
			btn.classList.add('playing');
			this._updatePlayhead(progress_bar, song.audio);
		}
	}
}



proto._songEnded = function() {
	this._songAnalytics(this.cur_song, 'complete');
	
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





},{"./Song":2}],2:[function(require,module,exports){
'use strict';

function Song(url) {
	this.song = new Audio(url);
}

var proto = Song.prototype;



// ••••••••••
// PUBLIC METHODS
// ••••••••••

proto.ended = function(){
	return this.song.ended;
};



proto.getPercentPlayed = function() {
	return this.song.currentTime / this.song.duration * 100;
};



proto.pause = function() {
	this.song.pause();
};



proto.play = function() {
	this.song.play();
};



proto.stop = function() {
	this.song.pause();
	this.song.currentTime = 0;
};



module.exports = Song;	
},{}],3:[function(require,module,exports){
'use strict';

var PlayerUI = require('./modules/PlayerUI');
var MusicPlayer;

var main = {
	
	init: function(){
		this.load_playlists();
		
		this.init_analytics();
	},
	
	
	
	ajax: function(options){
		var ajx, response, params='';
	
		if(options.data!==undefined){
			var ct=0;
			for(var idx in options.data){
				ct++;
				var cha = (ct==1) ? '?': '&';
				params+= cha+idx+'='+options.data[idx];
			}
		}
		
		if(window.XMLHttpRequest){
			ajx = new XMLHttpRequest();
		}else{
			ajx = new ActiveXObject("Microsoft.XMLHTTP");
		}
		ajx.onreadystatechange = function() {
			if(ajx.readyState==4 && ajx.status==200){
				options.done(ajx.responseText);
			}
		}
		
		ajx.open(options.type, options.url+params, true);
		ajx.send();
	},



	analyticsEvent: function(options){
		options.hitType = 'event';
		
		if(window.ga) { 
			ga('send', options);
		}
	},



	for_each: function(list, callback) {
		for(var x=0, l=list.length; x<l; x++){
			callback(list[x], x);
		}
	},



	init_analytics: function(){
		(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
		(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
		m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
		})(window,document,'script','https://www.google-analytics.com/analytics.js','ga');
		
		ga('create', 'UA-82097543-1', 'auto');
		ga('send', 'pageview');
	},



	load_playlists: function() {
		this.ajax({
			url: '/audio/library.json',
			type: 'GET',
			done: function(data){
				var el = document.getElementById('audio_player');
				
				MusicPlayer = new PlayerUI(el, true, JSON.parse(data));
				MusicPlayer.populateLists();
			}
		});
	}
};

main.init();
},{"./modules/PlayerUI":1}]},{},[3])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvanMvbW9kdWxlcy9QbGF5ZXJVSS5qcyIsInNyYy9qcy9tb2R1bGVzL1NvbmcuanMiLCJzcmMvanMvbXVzaWMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCc7XG5cblxudmFyIFNvbmcgPSByZXF1aXJlKCcuL1NvbmcnKTtcblxuZnVuY3Rpb24gUGxheWVyVUkocGFyZW50X2VsLCBzaG93X2FsbCwgZGF0YSkge1xuXHR0aGlzLmVsID0gcGFyZW50X2VsO1xuXHR0aGlzLnNob3dfYWxsID0gc2hvd19hbGw7XG5cdHRoaXMubGlzdF91bCA9IHRoaXMuZWwucXVlcnlTZWxlY3RvcignW2RhdGEtcGxheWxpc3QtY29udGFpbmVyXScpO1xuXHR0aGlzLnNvbmdzX2RpdiA9IHRoaXMuZWwucXVlcnlTZWxlY3RvcignW2RhdGEtc29uZy1jb250YWluZXJdJyk7XG5cdFxuXHR0aGlzLmF1ZGlvX2ZvbGRlciA9IGRhdGEuYXVkaW9fZm9sZGVyO1xuXHR0aGlzLnBsYXlsaXN0cyA9IGRhdGEucGxheWxpc3RzO1xuXG5cdHRoaXMuY3VyX2xpc3QgPSAwO1xuXHR0aGlzLmN1cl9zb25nID0gW107XG59XG5cbnZhciBwcm90byA9IFBsYXllclVJLnByb3RvdHlwZTtcblxuXG5cbi8vIOKAouKAouKAouKAouKAouKAouKAouKAouKAouKAolxuLy8gUFVCTElDIE1FVEhPRFNcbi8vIOKAouKAouKAouKAouKAouKAouKAouKAouKAouKAolxuXG5wcm90by5wb3B1bGF0ZUxpc3RzID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMubGlzdF91bC5pbm5lckhUTUwgPSAnJztcblx0XG5cdGZvcih2YXIgeD0wLCBsPXRoaXMucGxheWxpc3RzLmxlbmd0aDsgeDxsOyB4KyspIHtcblx0XHR2YXIgbGlzdCA9IHRoaXMucGxheWxpc3RzW3hdO1xuXHRcdHZhciBsaSA9IHRoaXMuX2dldExpc3RMaShsaXN0LCB4KTtcblx0XHR0aGlzLmxpc3RfdWwuYXBwZW5kQ2hpbGQobGkpO1xuXHRcdFxuXHRcdHRoaXMucG9wdWxhdGVTb25ncyh4KTtcblx0fVxufTtcblxuXG5cbnByb3RvLnBvcHVsYXRlU29uZ3MgPSBmdW5jdGlvbihsaXN0X2lkeCkge1xuXHR2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdGRpdi5jbGFzc0xpc3QuYWRkKCdwbGF5bGlzdCcpO1xuXHRkaXYuc2V0QXR0cmlidXRlKCdkYXRhLXBsYXlsaXN0JywgbGlzdF9pZHgpO1xuXHRcblx0aWYodGhpcy5jdXJfbGlzdD09PWxpc3RfaWR4KSB7XG5cdFx0ZGl2LmNsYXNzTGlzdC5hZGQoJ3NlbGVjdGVkJyk7XG5cdH1cblx0XG5cdHZhciB1bCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3VsJyk7XG5cdGRpdi5hcHBlbmRDaGlsZCh1bCk7XG5cdFxuXHR2YXIgcGxheWxpc3QgPSB0aGlzLnBsYXlsaXN0c1tsaXN0X2lkeF07XG5cdHZhciBzb25nX2xpc3QgPSBwbGF5bGlzdC5zb25ncztcblx0XG5cdGZvcih2YXIgeD0wLCBsPXNvbmdfbGlzdC5sZW5ndGg7IHg8bDsgeCsrKSB7XG5cdFx0dmFyIHNvbmcgPSBzb25nX2xpc3RbeF07XG5cdFx0XG5cdFx0aWYodGhpcy5zaG93X2FsbCB8fCBzb25nLm1ha2VfcHVibGljKXtcblx0XHRcdHZhciBsaSA9IHRoaXMuX2dldFNvbmdMaShzb25nLCB4KTtcblx0XHRcdHVsLmFwcGVuZENoaWxkKGxpKTtcblx0XHR9XG5cdH1cblx0XG5cdHZhciBleHRyYXNfZGl2ID0gdGhpcy5fZ2V0TGlzdEV4dHJhcyhwbGF5bGlzdCk7XG5cdGlmKGV4dHJhc19kaXYpIHsgZGl2LmFwcGVuZENoaWxkKGV4dHJhc19kaXYpOyB9O1xuXHRcblx0dGhpcy5zb25nc19kaXYuYXBwZW5kQ2hpbGQoZGl2KTtcbn07XG5cblxuLy8g4oCi4oCi4oCi4oCi4oCi4oCi4oCi4oCi4oCi4oCiXG4vLyBQUklWQVRFIE1FVEhPRFNcbi8vIOKAouKAouKAouKAouKAouKAouKAouKAouKAouKAolxuXG5wcm90by5fYWR2YW5jZVBsYXlsaXN0ID0gZnVuY3Rpb24oKXtcblx0aWYgKHRoaXMuY3VyX3NvbmdbMV0gPCB0aGlzLnBsYXlsaXN0c1t0aGlzLmN1cl9zb25nWzBdXS5zb25ncy5sZW5ndGgtMSkge1xuXHRcdHRoaXMuY3VyX3NvbmdbMV0rKztcblx0XHRcblx0XHR2YXIgc29uZyA9IHRoaXMucGxheWxpc3RzW3RoaXMuY3VyX3NvbmdbMF1dLnNvbmdzW3RoaXMuY3VyX3NvbmdbMV1dO1xuXHRcdFxuXHRcdGlmKHRoaXMuc2hvd19hbGwgfHwgc29uZy5tYWtlX3B1YmxpYykge1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9hZHZhbmNlUGxheWxpc3QoKTtcblx0XHR9XG5cdFx0XG5cdH0gZWxzZSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG59O1xuXG5cblxucHJvdG8uX2NsZWFyQ2xhc3NlcyA9IGZ1bmN0aW9uKHNlbGVjdG9yLCBjbGFzc0FycmF5KSB7XG5cdHZhciBlbHMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcblx0Zm9yKHZhciB4PTAsIGw9ZWxzLmxlbmd0aDsgeDxsOyB4Kyspe1xuXHRcdGZvcih2YXIgaT0wLCBsZW49Y2xhc3NBcnJheS5sZW5ndGg7IGk8bGVuOyBpKyspIHtcblx0XHRcdGVsc1t4XS5jbGFzc0xpc3QucmVtb3ZlKGNsYXNzQXJyYXlbaV0pO1xuXHRcdH1cblx0fVxufTtcblxuXG5cbnByb3RvLl9nZXRMaXN0RXh0cmFzID0gZnVuY3Rpb24obGlzdCkge1xuXHR2YXIgZGl2ID0gbnVsbDtcblx0XG5cdGlmKGxpc3QucHJvZ3JhbSkge1xuXHRcdGNvbnNvbGUubG9nKCdwcm9ncmFtJyk7XG5cdFx0ZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdFx0ZGl2LnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAncGxheWxpc3RfZXh0cmFzJyk7XG5cdFx0XG5cdFx0dmFyIGEgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG5cdFx0YS5zZXRBdHRyaWJ1dGUoJ2hyZWYnLCAnL3Byb2dyYW1zLycrbGlzdC5wcm9ncmFtKTtcblx0XHRhLnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAnaWNvbi1kb2N1bWVudC1ibGFuaycpO1xuXHRcdFxuXHRcdHZhciBsYWJlbCA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCdQcm9ncmFtJyk7XG5cdFx0YS5hcHBlbmRDaGlsZChsYWJlbCk7XG5cdFx0XG5cdFx0ZGl2LmFwcGVuZENoaWxkKGEpO1xuXHR9XG5cdHJldHVybiBkaXY7XG59XG5cblxuXG5wcm90by5fZ2V0TGlzdExpID0gZnVuY3Rpb24obGlzdCwgaWR4KSB7XG5cdHZhciBsaSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XG5cdGxpLnNldEF0dHJpYnV0ZSgnZGF0YS1wbGF5bGlzdC10cmlnZ2VyJywgaWR4KTtcblx0XG5cdGlmKGlkeD09dGhpcy5jdXJfbGlzdCl7XG5cdFx0bGkuY2xhc3NMaXN0LmFkZCgnc2VsZWN0ZWQnKTtcblx0fVxuXHRcblx0dmFyIHNwYW4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG5cdHZhciB0eHQgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShsaXN0LnBsYXlsaXN0X25hbWUpO1xuXHRzcGFuLmFwcGVuZENoaWxkKHR4dCk7XG5cdGxpLmFwcGVuZENoaWxkKHNwYW4pO1xuXHRcblx0dmFyIHBhcmVudCA9IHRoaXM7XG5cdFxuXHRsaS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcblx0XHRwYXJlbnQuX2xpc3RCdG5DbGljayh0aGlzLCBwYXJlbnQpO1xuXHR9KTtcblx0XG5cdHJldHVybiBsaTtcbn07XG5cblxuXG5wcm90by5fZ2V0U29uZ0xpID0gZnVuY3Rpb24oc29uZywgaWR4KSB7XG5cdHZhciBsaSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XG5cdGxpLnNldEF0dHJpYnV0ZSgnZGF0YS1zb25nJywgaWR4KTtcblx0XG5cdHZhciBzcGFuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuXHR2YXIgdHh0ID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoc29uZy50aXRsZSk7XG5cdHZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0ZGl2LmNsYXNzTGlzdC5hZGQoJ3Byb2dyZXNzX2JhcicpO1xuXHRzcGFuLmFwcGVuZENoaWxkKHR4dCk7XG5cdGxpLmFwcGVuZENoaWxkKHNwYW4pO1xuXHRsaS5hcHBlbmRDaGlsZChkaXYpO1xuXHRcblx0dmFyIHBhcmVudCA9IHRoaXM7XG5cdFxuXHRsaS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKGUpe1xuXHRcdHBhcmVudC5fc29uZ0J0bkNsaWNrKHRoaXMsIHBhcmVudCk7XG5cdH0pO1xuXHRcblx0cmV0dXJuIGxpO1xufTtcblxuXG5cbnByb3RvLl9saXN0QnRuQ2xpY2sgPSBmdW5jdGlvbihidG4sIHBhcmVudCkge1xuXHRwYXJlbnQuX2NsZWFyQ2xhc3NlcygnW2RhdGEtcGxheWxpc3QtdHJpZ2dlcl0nLCBbJ3NlbGVjdGVkJ10pO1xuXHRwYXJlbnQuX2NsZWFyQ2xhc3NlcygnLnBsYXlsaXN0JywgWydzZWxlY3RlZCddKTtcblx0XG5cdHBhcmVudC5jdXJfbGlzdCA9IGJ0bi5nZXRBdHRyaWJ1dGUoJ2RhdGEtcGxheWxpc3QtdHJpZ2dlcicpO1xuXG5cdGJ0bi5jbGFzc0xpc3QuYWRkKCdzZWxlY3RlZCcpO1xuXHRkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcucGxheWxpc3RbZGF0YS1wbGF5bGlzdD1cIicrIHBhcmVudC5jdXJfbGlzdCArJ1wiXScpLmNsYXNzTGlzdC5hZGQoJ3NlbGVjdGVkJyk7XG59O1xuXG5cblxucHJvdG8uX3NvbmdBbmFseXRpY3MgPSBmdW5jdGlvbihzb25nX2Nvb3JkLCBhY3Rpb24pe1xuXHRpZih3aW5kb3cuZ2EpIHtcblx0XHRnYSgnc2VuZCcsIHtcblx0XHRcdGhpdFR5cGU6ICdldmVudCcsXG5cdFx0XHRldmVudENhdGVnb3J5OiAnTXVzaWMgUGxheWVyJyxcblx0XHRcdGV2ZW50QWN0aW9uOiBhY3Rpb24sXG5cdFx0XHRldmVudExhYmVsOiB0aGlzLnBsYXlsaXN0c1tzb25nX2Nvb3JkWzBdXS5zb25nc1tzb25nX2Nvb3JkWzFdXS50aXRsZSxcblx0XHRcdGV2ZW50VmFsdWU6IHNvbmdfY29vcmRbMF1cblx0XHR9KTtcblx0fVxufTtcblxuXG5cbnByb3RvLl9zb25nQnRuQ2xpY2sgPSBmdW5jdGlvbihidG4sIHBhcmVudCkge1xuXHR2YXIgaWR4ID0gYnRuLmdldEF0dHJpYnV0ZSgnZGF0YS1zb25nJyk7XG5cdHZhciBwcm9ncmVzc19iYXIgPSBidG4ucXVlcnlTZWxlY3RvcignLnByb2dyZXNzX2JhcicpO1xuXHR2YXIgcGxheWxpc3QgPSBwYXJlbnQucGxheWxpc3RzW3BhcmVudC5jdXJfbGlzdF07XG5cdHZhciBzb25nID0gcGxheWxpc3Quc29uZ3NbaWR4XTtcblx0XG5cdGlmKHNvbmcuYXVkaW8gPT09IHVuZGVmaW5lZCl7XG5cdFx0dmFyIHBhdGggPSB0aGlzLmF1ZGlvX2ZvbGRlciArJy8nKyBwbGF5bGlzdC5mb2xkZXIgKycvJysgc29uZy5maWxlbmFtZTtcblx0XHRzb25nLmF1ZGlvID0gbmV3IFNvbmcocGF0aCk7XG5cdH1cblx0XG5cdGlmKGJ0bi5jbGFzc0xpc3QuY29udGFpbnMoJ3BhdXNlZCcpKXsgLy8gdW5wYXVzZSBzb25nXG5cdFx0XG5cdFx0c29uZy5hdWRpby5wbGF5KCk7XG5cdFx0YnRuLmNsYXNzTGlzdC5yZW1vdmUoJ3BhdXNlZCcpO1xuXHRcdHRoaXMuX3VwZGF0ZVBsYXloZWFkKHByb2dyZXNzX2Jhciwgc29uZy5hdWRpbyk7XG5cdFx0XG5cdH0gZWxzZSB7XG5cdFx0aWYoYnRuLmNsYXNzTGlzdC5jb250YWlucygncGxheWluZycpKXsgLy8gcGF1c2Ugc29uZ1xuXHRcdFx0XG5cdFx0XHRzb25nLmF1ZGlvLnBhdXNlKCk7XG5cdFx0XHRidG4uY2xhc3NMaXN0LmFkZCgncGF1c2VkJyk7XG5cdFx0XHRjYW5jZWxBbmltYXRpb25GcmFtZSh0aGlzLmFuaW1hdG9yKTtcblx0XHRcdFxuXHRcdH0gZWxzZSB7IC8vIHBsYXkgbmV3IHNvbmdcblx0XHRcdFxuXHRcdFx0aWYocGFyZW50LmN1cl9zb25nLmxlbmd0aD4xKXtcblx0XHRcdFx0cGFyZW50LnBsYXlsaXN0c1t0aGlzLmN1cl9zb25nWzBdXS5zb25nc1t0aGlzLmN1cl9zb25nWzFdXS5hdWRpby5zdG9wKCk7XG5cdFx0XHRcdGNhbmNlbEFuaW1hdGlvbkZyYW1lKHRoaXMuYW5pbWF0b3IpO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRwYXJlbnQuX2NsZWFyQ2xhc3NlcygnW2RhdGEtc29uZ10nLCBbJ3BsYXlpbmcnLCAncGF1c2VkJ10pO1xuXHRcdFx0XG5cdFx0XHRwYXJlbnQuY3VyX3NvbmcgPSBbcGFyZW50LmN1cl9saXN0LCBpZHhdO1xuXHRcdFx0XG5cdFx0XHRzb25nLmF1ZGlvLnBsYXkoKTtcblx0XHRcdFxuXHRcdFx0dGhpcy5fc29uZ0FuYWx5dGljcyhwYXJlbnQuY3VyX3NvbmcsICdwbGF5Jyk7XG5cdFx0XHRcblx0XHRcdGJ0bi5jbGFzc0xpc3QuYWRkKCdwbGF5aW5nJyk7XG5cdFx0XHR0aGlzLl91cGRhdGVQbGF5aGVhZChwcm9ncmVzc19iYXIsIHNvbmcuYXVkaW8pO1xuXHRcdH1cblx0fVxufVxuXG5cblxucHJvdG8uX3NvbmdFbmRlZCA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLl9zb25nQW5hbHl0aWNzKHRoaXMuY3VyX3NvbmcsICdjb21wbGV0ZScpO1xuXHRcblx0dGhpcy5fY2xlYXJDbGFzc2VzKCdbZGF0YS1zb25nXScsIFsncGxheWluZycsICdwYXVzZWQnXSk7XG5cdFxuXHRpZiAodGhpcy5fYWR2YW5jZVBsYXlsaXN0KCkpIHtcblx0XHR0aGlzLl9zb25nQnRuQ2xpY2sodGhpcy5zb25nc19kaXYucXVlcnlTZWxlY3RvcignW2RhdGEtcGxheWxpc3Q9XCInKyB0aGlzLmN1cl9zb25nWzBdICsnXCJdIFtkYXRhLXNvbmc9XCInKyB0aGlzLmN1cl9zb25nWzFdICsnXCJdJyksIHRoaXMpO1xuXHR9XG59O1xuXG5cblxucHJvdG8uX3VwZGF0ZVBsYXloZWFkID0gZnVuY3Rpb24oZWwsIHNvbmcpIHtcblx0aWYoc29uZy5lbmRlZCgpKSB7XG5cdFx0Y2FuY2VsQW5pbWF0aW9uRnJhbWUodGhpcy5hbmltYXRvcik7XG5cdFx0dGhpcy5fc29uZ0VuZGVkKCk7XG5cdH0gZWxzZSB7XG5cdFx0ZWwuc3R5bGUud2lkdGggPSBzb25nLmdldFBlcmNlbnRQbGF5ZWQoKSArICclJztcblx0XHRcblx0XHR0aGlzLmFuaW1hdG9yID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGZ1bmN0aW9uKCl7XG5cdFx0XHR0aGlzLl91cGRhdGVQbGF5aGVhZChlbCwgc29uZyk7XG5cdFx0fS5iaW5kKHRoaXMpKTtcblx0XG5cdH1cbn07XG5cblxuXG5tb2R1bGUuZXhwb3J0cyA9IFBsYXllclVJO1xuXG5cblxuXG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFNvbmcodXJsKSB7XG5cdHRoaXMuc29uZyA9IG5ldyBBdWRpbyh1cmwpO1xufVxuXG52YXIgcHJvdG8gPSBTb25nLnByb3RvdHlwZTtcblxuXG5cbi8vIOKAouKAouKAouKAouKAouKAouKAouKAouKAouKAolxuLy8gUFVCTElDIE1FVEhPRFNcbi8vIOKAouKAouKAouKAouKAouKAouKAouKAouKAouKAolxuXG5wcm90by5lbmRlZCA9IGZ1bmN0aW9uKCl7XG5cdHJldHVybiB0aGlzLnNvbmcuZW5kZWQ7XG59O1xuXG5cblxucHJvdG8uZ2V0UGVyY2VudFBsYXllZCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5zb25nLmN1cnJlbnRUaW1lIC8gdGhpcy5zb25nLmR1cmF0aW9uICogMTAwO1xufTtcblxuXG5cbnByb3RvLnBhdXNlID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMuc29uZy5wYXVzZSgpO1xufTtcblxuXG5cbnByb3RvLnBsYXkgPSBmdW5jdGlvbigpIHtcblx0dGhpcy5zb25nLnBsYXkoKTtcbn07XG5cblxuXG5wcm90by5zdG9wID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMuc29uZy5wYXVzZSgpO1xuXHR0aGlzLnNvbmcuY3VycmVudFRpbWUgPSAwO1xufTtcblxuXG5cbm1vZHVsZS5leHBvcnRzID0gU29uZztcdCIsIid1c2Ugc3RyaWN0JztcblxudmFyIFBsYXllclVJID0gcmVxdWlyZSgnLi9tb2R1bGVzL1BsYXllclVJJyk7XG52YXIgTXVzaWNQbGF5ZXI7XG5cbnZhciBtYWluID0ge1xuXHRcblx0aW5pdDogZnVuY3Rpb24oKXtcblx0XHR0aGlzLmxvYWRfcGxheWxpc3RzKCk7XG5cdFx0XG5cdFx0dGhpcy5pbml0X2FuYWx5dGljcygpO1xuXHR9LFxuXHRcblx0XG5cdFxuXHRhamF4OiBmdW5jdGlvbihvcHRpb25zKXtcblx0XHR2YXIgYWp4LCByZXNwb25zZSwgcGFyYW1zPScnO1xuXHRcblx0XHRpZihvcHRpb25zLmRhdGEhPT11bmRlZmluZWQpe1xuXHRcdFx0dmFyIGN0PTA7XG5cdFx0XHRmb3IodmFyIGlkeCBpbiBvcHRpb25zLmRhdGEpe1xuXHRcdFx0XHRjdCsrO1xuXHRcdFx0XHR2YXIgY2hhID0gKGN0PT0xKSA/ICc/JzogJyYnO1xuXHRcdFx0XHRwYXJhbXMrPSBjaGEraWR4Kyc9JytvcHRpb25zLmRhdGFbaWR4XTtcblx0XHRcdH1cblx0XHR9XG5cdFx0XG5cdFx0aWYod2luZG93LlhNTEh0dHBSZXF1ZXN0KXtcblx0XHRcdGFqeCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXHRcdH1lbHNle1xuXHRcdFx0YWp4ID0gbmV3IEFjdGl2ZVhPYmplY3QoXCJNaWNyb3NvZnQuWE1MSFRUUFwiKTtcblx0XHR9XG5cdFx0YWp4Lm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0aWYoYWp4LnJlYWR5U3RhdGU9PTQgJiYgYWp4LnN0YXR1cz09MjAwKXtcblx0XHRcdFx0b3B0aW9ucy5kb25lKGFqeC5yZXNwb25zZVRleHQpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRcblx0XHRhangub3BlbihvcHRpb25zLnR5cGUsIG9wdGlvbnMudXJsK3BhcmFtcywgdHJ1ZSk7XG5cdFx0YWp4LnNlbmQoKTtcblx0fSxcblxuXG5cblx0YW5hbHl0aWNzRXZlbnQ6IGZ1bmN0aW9uKG9wdGlvbnMpe1xuXHRcdG9wdGlvbnMuaGl0VHlwZSA9ICdldmVudCc7XG5cdFx0XG5cdFx0aWYod2luZG93LmdhKSB7IFxuXHRcdFx0Z2EoJ3NlbmQnLCBvcHRpb25zKTtcblx0XHR9XG5cdH0sXG5cblxuXG5cdGZvcl9lYWNoOiBmdW5jdGlvbihsaXN0LCBjYWxsYmFjaykge1xuXHRcdGZvcih2YXIgeD0wLCBsPWxpc3QubGVuZ3RoOyB4PGw7IHgrKyl7XG5cdFx0XHRjYWxsYmFjayhsaXN0W3hdLCB4KTtcblx0XHR9XG5cdH0sXG5cblxuXG5cdGluaXRfYW5hbHl0aWNzOiBmdW5jdGlvbigpe1xuXHRcdChmdW5jdGlvbihpLHMsbyxnLHIsYSxtKXtpWydHb29nbGVBbmFseXRpY3NPYmplY3QnXT1yO2lbcl09aVtyXXx8ZnVuY3Rpb24oKXtcblx0XHQoaVtyXS5xPWlbcl0ucXx8W10pLnB1c2goYXJndW1lbnRzKX0saVtyXS5sPTEqbmV3IERhdGUoKTthPXMuY3JlYXRlRWxlbWVudChvKSxcblx0XHRtPXMuZ2V0RWxlbWVudHNCeVRhZ05hbWUobylbMF07YS5hc3luYz0xO2Euc3JjPWc7bS5wYXJlbnROb2RlLmluc2VydEJlZm9yZShhLG0pXG5cdFx0fSkod2luZG93LGRvY3VtZW50LCdzY3JpcHQnLCdodHRwczovL3d3dy5nb29nbGUtYW5hbHl0aWNzLmNvbS9hbmFseXRpY3MuanMnLCdnYScpO1xuXHRcdFxuXHRcdGdhKCdjcmVhdGUnLCAnVUEtODIwOTc1NDMtMScsICdhdXRvJyk7XG5cdFx0Z2EoJ3NlbmQnLCAncGFnZXZpZXcnKTtcblx0fSxcblxuXG5cblx0bG9hZF9wbGF5bGlzdHM6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuYWpheCh7XG5cdFx0XHR1cmw6ICcvYXVkaW8vbGlicmFyeS5qc29uJyxcblx0XHRcdHR5cGU6ICdHRVQnLFxuXHRcdFx0ZG9uZTogZnVuY3Rpb24oZGF0YSl7XG5cdFx0XHRcdHZhciBlbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhdWRpb19wbGF5ZXInKTtcblx0XHRcdFx0XG5cdFx0XHRcdE11c2ljUGxheWVyID0gbmV3IFBsYXllclVJKGVsLCB0cnVlLCBKU09OLnBhcnNlKGRhdGEpKTtcblx0XHRcdFx0TXVzaWNQbGF5ZXIucG9wdWxhdGVMaXN0cygpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG59O1xuXG5tYWluLmluaXQoKTsiXX0=
