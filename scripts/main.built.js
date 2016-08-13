(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var PlayerUI = require('./modules/PlayerUI');
var MusicPlayer;

var main = {
	
	init: function(){
		this.alumni_section();
		this.load_playlists();
		
		this.init_analytics();
		this.init_stripe();
	},
	
	
	
	ajax: function(url, callback){
		if(window.XMLHttpRequest){
			var ajx = new XMLHttpRequest();
		}else{
			var ajx = new ActiveXObject("Microsoft.XMLHTTP");
		}
		
		ajx.onreadystatechange = function() {
			if(ajx.readyState==4 && ajx.status==200){
				callback(ajx.responseText);
			}
		}
		
		ajx.open("GET", url, true);
		ajx.send();
	},
	
	
	
	alumni_section: function() {
		var alumni_frame = document.querySelector('.alumni');
		var alumni_btn = alumni_frame.querySelector('[data-action=alumni-toggle]');
		
		alumni_btn.addEventListener('click', function(){
			alumni_frame.classList.toggle('expand');
		});
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



	init_stripe: function(){
		var donate_btn = document.getElementById('donate_button');
		var donation_amt = document.getElementById('donation_amount');
		var thank_you = document.getElementById('contribution_thank_you');
		var thank_you_close = document.getElementById('close_thank_you_button');
		
		if(window.StripeCheckout) {
			var handler = StripeCheckout.configure({
				key: 'pk_test_HySA7ahGkleHdgfsB6AZTdxz',
				image: 'https://mayfieldsingers.org/apple-touch-icon.png',
				locale: 'auto',
				token: function(token) {
					document.querySelector('[data-amount]').innerHTML = donation_amt.value;
					thank_you.classList.add('visible');
				}
			});
		
			donate_btn.addEventListener('click', function(e) {
				// Open Checkout with further options:
				handler.open({
					name: 'Mayfield Singers Donation',
					description: 'Charitable Contribution',
					amount: donation_amt.value * 100
				});
				e.preventDefault();
			});
			
			thank_you_close.addEventListener('click', function(e) { thank_you.classList.remove('visible'); })
				
			//Close Checkout on page navigation:
			window.addEventListener('popstate', function() {
				handler.close();
			});
		}
	},



	load_playlists: function() {
		this.ajax('../audio/library.xml', function(playlists){
			
			var parser = new DOMParser();
			var xml = parser.parseFromString(playlists,"text/xml");
			
			var el = document.getElementById('audio_player');
			var json = main.xml_to_json(xml);
			
			MusicPlayer = new PlayerUI(el, false, json);
			MusicPlayer.populateLists();
		});
	},



	xml_to_json: function(xml) {
		
		var response = [];
		
		var playlists = xml.getElementsByTagName('playlist');
		
		for(var x=0, l=playlists.length; x<l; x++) {
			
			var crt = playlists[x];
			
			var playlist = {
				name: crt.getAttribute('name'),
				date: crt.getAttribute('date'),
				path: crt.getAttribute('folder'),
				songs: []
			}
			
			var xml_songs = crt.getElementsByTagName('song');
			
			for(var i=0, len=xml_songs.length; i<len; i++) {
				var filename = xml_songs[i].querySelector('filename').childNodes[0].nodeValue
				
				playlist.songs.push({
					show: xml_songs[i].getAttribute('show_in_player'),
					title: xml_songs[i].querySelector('title').childNodes[0].nodeValue,
					filename: filename,
					fullpath: '../audio/' + playlist.path + '/' + filename
				});
			}
			
			response.push(playlist);
		}
		
		return response;		
	}
};

main.init();
},{"./modules/PlayerUI":2}],2:[function(require,module,exports){
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





},{"./Song":3}],3:[function(require,module,exports){
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
},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvanMvbWFpbi5qcyIsInNyYy9qcy9tb2R1bGVzL1BsYXllclVJLmpzIiwic3JjL2pzL21vZHVsZXMvU29uZy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCc7XG5cbnZhciBQbGF5ZXJVSSA9IHJlcXVpcmUoJy4vbW9kdWxlcy9QbGF5ZXJVSScpO1xudmFyIE11c2ljUGxheWVyO1xuXG52YXIgbWFpbiA9IHtcblx0XG5cdGluaXQ6IGZ1bmN0aW9uKCl7XG5cdFx0dGhpcy5hbHVtbmlfc2VjdGlvbigpO1xuXHRcdHRoaXMubG9hZF9wbGF5bGlzdHMoKTtcblx0XHRcblx0XHR0aGlzLmluaXRfYW5hbHl0aWNzKCk7XG5cdFx0dGhpcy5pbml0X3N0cmlwZSgpO1xuXHR9LFxuXHRcblx0XG5cdFxuXHRhamF4OiBmdW5jdGlvbih1cmwsIGNhbGxiYWNrKXtcblx0XHRpZih3aW5kb3cuWE1MSHR0cFJlcXVlc3Qpe1xuXHRcdFx0dmFyIGFqeCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXHRcdH1lbHNle1xuXHRcdFx0dmFyIGFqeCA9IG5ldyBBY3RpdmVYT2JqZWN0KFwiTWljcm9zb2Z0LlhNTEhUVFBcIik7XG5cdFx0fVxuXHRcdFxuXHRcdGFqeC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpIHtcblx0XHRcdGlmKGFqeC5yZWFkeVN0YXRlPT00ICYmIGFqeC5zdGF0dXM9PTIwMCl7XG5cdFx0XHRcdGNhbGxiYWNrKGFqeC5yZXNwb25zZVRleHQpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRcblx0XHRhangub3BlbihcIkdFVFwiLCB1cmwsIHRydWUpO1xuXHRcdGFqeC5zZW5kKCk7XG5cdH0sXG5cdFxuXHRcblx0XG5cdGFsdW1uaV9zZWN0aW9uOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgYWx1bW5pX2ZyYW1lID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmFsdW1uaScpO1xuXHRcdHZhciBhbHVtbmlfYnRuID0gYWx1bW5pX2ZyYW1lLnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLWFjdGlvbj1hbHVtbmktdG9nZ2xlXScpO1xuXHRcdFxuXHRcdGFsdW1uaV9idG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpe1xuXHRcdFx0YWx1bW5pX2ZyYW1lLmNsYXNzTGlzdC50b2dnbGUoJ2V4cGFuZCcpO1xuXHRcdH0pO1xuXHR9LFxuXG5cblxuXHRmb3JfZWFjaDogZnVuY3Rpb24obGlzdCwgY2FsbGJhY2spIHtcblx0XHRmb3IodmFyIHg9MCwgbD1saXN0Lmxlbmd0aDsgeDxsOyB4Kyspe1xuXHRcdFx0Y2FsbGJhY2sobGlzdFt4XSwgeCk7XG5cdFx0fVxuXHR9LFxuXG5cblxuXHRpbml0X2FuYWx5dGljczogZnVuY3Rpb24oKXtcblx0XHQoZnVuY3Rpb24oaSxzLG8sZyxyLGEsbSl7aVsnR29vZ2xlQW5hbHl0aWNzT2JqZWN0J109cjtpW3JdPWlbcl18fGZ1bmN0aW9uKCl7XG5cdFx0KGlbcl0ucT1pW3JdLnF8fFtdKS5wdXNoKGFyZ3VtZW50cyl9LGlbcl0ubD0xKm5ldyBEYXRlKCk7YT1zLmNyZWF0ZUVsZW1lbnQobyksXG5cdFx0bT1zLmdldEVsZW1lbnRzQnlUYWdOYW1lKG8pWzBdO2EuYXN5bmM9MTthLnNyYz1nO20ucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoYSxtKVxuXHRcdH0pKHdpbmRvdyxkb2N1bWVudCwnc2NyaXB0JywnaHR0cHM6Ly93d3cuZ29vZ2xlLWFuYWx5dGljcy5jb20vYW5hbHl0aWNzLmpzJywnZ2EnKTtcblx0XHRcblx0XHRnYSgnY3JlYXRlJywgJ1VBLTgyMDk3NTQzLTEnLCAnYXV0bycpO1xuXHRcdGdhKCdzZW5kJywgJ3BhZ2V2aWV3Jyk7XG5cdH0sXG5cblxuXG5cdGluaXRfc3RyaXBlOiBmdW5jdGlvbigpe1xuXHRcdHZhciBkb25hdGVfYnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2RvbmF0ZV9idXR0b24nKTtcblx0XHR2YXIgZG9uYXRpb25fYW10ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2RvbmF0aW9uX2Ftb3VudCcpO1xuXHRcdHZhciB0aGFua195b3UgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY29udHJpYnV0aW9uX3RoYW5rX3lvdScpO1xuXHRcdHZhciB0aGFua195b3VfY2xvc2UgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2xvc2VfdGhhbmtfeW91X2J1dHRvbicpO1xuXHRcdFxuXHRcdGlmKHdpbmRvdy5TdHJpcGVDaGVja291dCkge1xuXHRcdFx0dmFyIGhhbmRsZXIgPSBTdHJpcGVDaGVja291dC5jb25maWd1cmUoe1xuXHRcdFx0XHRrZXk6ICdwa190ZXN0X0h5U0E3YWhHa2xlSGRnZnNCNkFaVGR4eicsXG5cdFx0XHRcdGltYWdlOiAnaHR0cHM6Ly9tYXlmaWVsZHNpbmdlcnMub3JnL2FwcGxlLXRvdWNoLWljb24ucG5nJyxcblx0XHRcdFx0bG9jYWxlOiAnYXV0bycsXG5cdFx0XHRcdHRva2VuOiBmdW5jdGlvbih0b2tlbikge1xuXHRcdFx0XHRcdGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLWFtb3VudF0nKS5pbm5lckhUTUwgPSBkb25hdGlvbl9hbXQudmFsdWU7XG5cdFx0XHRcdFx0dGhhbmtfeW91LmNsYXNzTGlzdC5hZGQoJ3Zpc2libGUnKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XG5cdFx0XHRkb25hdGVfYnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuXHRcdFx0XHQvLyBPcGVuIENoZWNrb3V0IHdpdGggZnVydGhlciBvcHRpb25zOlxuXHRcdFx0XHRoYW5kbGVyLm9wZW4oe1xuXHRcdFx0XHRcdG5hbWU6ICdNYXlmaWVsZCBTaW5nZXJzIERvbmF0aW9uJyxcblx0XHRcdFx0XHRkZXNjcmlwdGlvbjogJ0NoYXJpdGFibGUgQ29udHJpYnV0aW9uJyxcblx0XHRcdFx0XHRhbW91bnQ6IGRvbmF0aW9uX2FtdC52YWx1ZSAqIDEwMFxuXHRcdFx0XHR9KTtcblx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0fSk7XG5cdFx0XHRcblx0XHRcdHRoYW5rX3lvdV9jbG9zZS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKGUpIHsgdGhhbmtfeW91LmNsYXNzTGlzdC5yZW1vdmUoJ3Zpc2libGUnKTsgfSlcblx0XHRcdFx0XG5cdFx0XHQvL0Nsb3NlIENoZWNrb3V0IG9uIHBhZ2UgbmF2aWdhdGlvbjpcblx0XHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdwb3BzdGF0ZScsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRoYW5kbGVyLmNsb3NlKCk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdH0sXG5cblxuXG5cdGxvYWRfcGxheWxpc3RzOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLmFqYXgoJy4uL2F1ZGlvL2xpYnJhcnkueG1sJywgZnVuY3Rpb24ocGxheWxpc3RzKXtcblx0XHRcdFxuXHRcdFx0dmFyIHBhcnNlciA9IG5ldyBET01QYXJzZXIoKTtcblx0XHRcdHZhciB4bWwgPSBwYXJzZXIucGFyc2VGcm9tU3RyaW5nKHBsYXlsaXN0cyxcInRleHQveG1sXCIpO1xuXHRcdFx0XG5cdFx0XHR2YXIgZWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYXVkaW9fcGxheWVyJyk7XG5cdFx0XHR2YXIganNvbiA9IG1haW4ueG1sX3RvX2pzb24oeG1sKTtcblx0XHRcdFxuXHRcdFx0TXVzaWNQbGF5ZXIgPSBuZXcgUGxheWVyVUkoZWwsIGZhbHNlLCBqc29uKTtcblx0XHRcdE11c2ljUGxheWVyLnBvcHVsYXRlTGlzdHMoKTtcblx0XHR9KTtcblx0fSxcblxuXG5cblx0eG1sX3RvX2pzb246IGZ1bmN0aW9uKHhtbCkge1xuXHRcdFxuXHRcdHZhciByZXNwb25zZSA9IFtdO1xuXHRcdFxuXHRcdHZhciBwbGF5bGlzdHMgPSB4bWwuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ3BsYXlsaXN0Jyk7XG5cdFx0XG5cdFx0Zm9yKHZhciB4PTAsIGw9cGxheWxpc3RzLmxlbmd0aDsgeDxsOyB4KyspIHtcblx0XHRcdFxuXHRcdFx0dmFyIGNydCA9IHBsYXlsaXN0c1t4XTtcblx0XHRcdFxuXHRcdFx0dmFyIHBsYXlsaXN0ID0ge1xuXHRcdFx0XHRuYW1lOiBjcnQuZ2V0QXR0cmlidXRlKCduYW1lJyksXG5cdFx0XHRcdGRhdGU6IGNydC5nZXRBdHRyaWJ1dGUoJ2RhdGUnKSxcblx0XHRcdFx0cGF0aDogY3J0LmdldEF0dHJpYnV0ZSgnZm9sZGVyJyksXG5cdFx0XHRcdHNvbmdzOiBbXVxuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHR2YXIgeG1sX3NvbmdzID0gY3J0LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdzb25nJyk7XG5cdFx0XHRcblx0XHRcdGZvcih2YXIgaT0wLCBsZW49eG1sX3NvbmdzLmxlbmd0aDsgaTxsZW47IGkrKykge1xuXHRcdFx0XHR2YXIgZmlsZW5hbWUgPSB4bWxfc29uZ3NbaV0ucXVlcnlTZWxlY3RvcignZmlsZW5hbWUnKS5jaGlsZE5vZGVzWzBdLm5vZGVWYWx1ZVxuXHRcdFx0XHRcblx0XHRcdFx0cGxheWxpc3Quc29uZ3MucHVzaCh7XG5cdFx0XHRcdFx0c2hvdzogeG1sX3NvbmdzW2ldLmdldEF0dHJpYnV0ZSgnc2hvd19pbl9wbGF5ZXInKSxcblx0XHRcdFx0XHR0aXRsZTogeG1sX3NvbmdzW2ldLnF1ZXJ5U2VsZWN0b3IoJ3RpdGxlJykuY2hpbGROb2Rlc1swXS5ub2RlVmFsdWUsXG5cdFx0XHRcdFx0ZmlsZW5hbWU6IGZpbGVuYW1lLFxuXHRcdFx0XHRcdGZ1bGxwYXRoOiAnLi4vYXVkaW8vJyArIHBsYXlsaXN0LnBhdGggKyAnLycgKyBmaWxlbmFtZVxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0cmVzcG9uc2UucHVzaChwbGF5bGlzdCk7XG5cdFx0fVxuXHRcdFxuXHRcdHJldHVybiByZXNwb25zZTtcdFx0XG5cdH1cbn07XG5cbm1haW4uaW5pdCgpOyIsIid1c2Ugc3RyaWN0JztcblxuXG52YXIgU29uZyA9IHJlcXVpcmUoJy4vU29uZycpO1xuXG5mdW5jdGlvbiBQbGF5ZXJVSShwYXJlbnRfZWwsIHNob3dfYWxsLCBwbGF5bGlzdHMpIHtcblx0dGhpcy5lbCA9IHBhcmVudF9lbDtcblx0dGhpcy5zaG93X2FsbCA9IHNob3dfYWxsO1xuXHR0aGlzLmxpc3RfdWwgPSB0aGlzLmVsLnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLXBsYXlsaXN0LWNvbnRhaW5lcl0nKTtcblx0dGhpcy5zb25nc19kaXYgPSB0aGlzLmVsLnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLXNvbmctY29udGFpbmVyXScpO1xuXHRcblx0dGhpcy5wbGF5bGlzdHMgPSBwbGF5bGlzdHM7XG5cblx0dGhpcy5jdXJfbGlzdCA9IDA7XG5cdHRoaXMuY3VyX3NvbmcgPSBbXTtcbn1cblxudmFyIHByb3RvID0gUGxheWVyVUkucHJvdG90eXBlO1xuXG5cblxuLy8g4oCi4oCi4oCi4oCi4oCi4oCi4oCi4oCi4oCi4oCiXG4vLyBQVUJMSUMgTUVUSE9EU1xuLy8g4oCi4oCi4oCi4oCi4oCi4oCi4oCi4oCi4oCi4oCiXG5cbnByb3RvLnBvcHVsYXRlTGlzdHMgPSBmdW5jdGlvbigpIHtcblx0dGhpcy5saXN0X3VsLmlubmVySFRNTCA9ICcnO1xuXHRcblx0Zm9yKHZhciB4PTAsIGw9dGhpcy5wbGF5bGlzdHMubGVuZ3RoOyB4PGw7IHgrKykge1xuXHRcdHZhciBsaXN0ID0gdGhpcy5wbGF5bGlzdHNbeF07XG5cdFx0dmFyIGxpID0gdGhpcy5fZ2V0TGlzdExpKGxpc3QsIHgpO1xuXHRcdHRoaXMubGlzdF91bC5hcHBlbmRDaGlsZChsaSk7XG5cdFx0XG5cdFx0dGhpcy5wb3B1bGF0ZVNvbmdzKHgpO1xuXHR9XG59O1xuXG5cblxucHJvdG8ucG9wdWxhdGVTb25ncyA9IGZ1bmN0aW9uKGxpc3RfaWR4KSB7XG5cdHZhciB1bCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3VsJyk7XG5cdHVsLmNsYXNzTGlzdC5hZGQoJ3BsYXlsaXN0Jyk7XG5cdHVsLnNldEF0dHJpYnV0ZSgnZGF0YS1wbGF5bGlzdCcsIGxpc3RfaWR4KTtcblx0XG5cdGlmKHRoaXMuY3VyX2xpc3Q9PT1saXN0X2lkeCkge1xuXHRcdHVsLmNsYXNzTGlzdC5hZGQoJ3NlbGVjdGVkJyk7XG5cdH1cblx0XG5cdHZhciBzb25nX2xpc3QgPSB0aGlzLnBsYXlsaXN0c1tsaXN0X2lkeF0uc29uZ3M7XG5cdFxuXHRmb3IodmFyIHg9MCwgbD1zb25nX2xpc3QubGVuZ3RoOyB4PGw7IHgrKykge1xuXHRcdHZhciBzb25nID0gc29uZ19saXN0W3hdO1xuXHRcdFxuXHRcdGlmKHRoaXMuc2hvd19hbGwgfHwgc29uZy5zaG93PT09J3RydWUnKXtcblx0XHRcdHZhciBsaSA9IHRoaXMuX2dldFNvbmdMaShzb25nLCB4KTtcblx0XHRcdHVsLmFwcGVuZENoaWxkKGxpKTtcblx0XHR9XG5cdH1cblx0XG5cdHRoaXMuc29uZ3NfZGl2LmFwcGVuZENoaWxkKHVsKTtcbn07XG5cblxuLy8g4oCi4oCi4oCi4oCi4oCi4oCi4oCi4oCi4oCi4oCiXG4vLyBQUklWQVRFIE1FVEhPRFNcbi8vIOKAouKAouKAouKAouKAouKAouKAouKAouKAouKAolxuXG5wcm90by5fY2xlYXJDbGFzc2VzID0gZnVuY3Rpb24oc2VsZWN0b3IsIGNsYXNzQXJyYXkpIHtcblx0dmFyIGVscyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpO1xuXHRmb3IodmFyIHg9MCwgbD1lbHMubGVuZ3RoOyB4PGw7IHgrKyl7XG5cdFx0Zm9yKHZhciBpPTAsIGxlbj1jbGFzc0FycmF5Lmxlbmd0aDsgaTxsZW47IGkrKykge1xuXHRcdFx0ZWxzW3hdLmNsYXNzTGlzdC5yZW1vdmUoY2xhc3NBcnJheVtpXSk7XG5cdFx0fVxuXHR9XG59O1xuXG5cblxucHJvdG8uX2dldExpc3RMaSA9IGZ1bmN0aW9uKGxpc3QsIGlkeCkge1xuXHR2YXIgbGkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpO1xuXHRsaS5zZXRBdHRyaWJ1dGUoJ2RhdGEtcGxheWxpc3QtdHJpZ2dlcicsIGlkeCk7XG5cdFxuXHRpZihpZHg9PXRoaXMuY3VyX2xpc3Qpe1xuXHRcdGxpLmNsYXNzTGlzdC5hZGQoJ3NlbGVjdGVkJyk7XG5cdH1cblx0XG5cdHZhciBzcGFuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuXHR2YXIgdHh0ID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUobGlzdC5uYW1lKTtcblx0c3Bhbi5hcHBlbmRDaGlsZCh0eHQpO1xuXHRsaS5hcHBlbmRDaGlsZChzcGFuKTtcblx0XG5cdHZhciBwYXJlbnQgPSB0aGlzO1xuXHRcblx0bGkuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbihlKSB7XG5cdFx0cGFyZW50Ll9saXN0QnRuQ2xpY2sodGhpcywgcGFyZW50KTtcblx0fSk7XG5cdFxuXHRyZXR1cm4gbGk7XG59O1xuXG5cblxucHJvdG8uX2dldFNvbmdMaSA9IGZ1bmN0aW9uKHNvbmcsIGlkeCkge1xuXHR2YXIgbGkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpO1xuXHRsaS5zZXRBdHRyaWJ1dGUoJ2RhdGEtc29uZycsIGlkeCk7XG5cdFxuXHR2YXIgc3BhbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcblx0dmFyIHR4dCA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHNvbmcudGl0bGUpO1xuXHR2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdGRpdi5jbGFzc0xpc3QuYWRkKCdwcm9ncmVzc19iYXInKTtcblx0c3Bhbi5hcHBlbmRDaGlsZCh0eHQpO1xuXHRsaS5hcHBlbmRDaGlsZChzcGFuKTtcblx0bGkuYXBwZW5kQ2hpbGQoZGl2KTtcblx0XG5cdHZhciBwYXJlbnQgPSB0aGlzO1xuXHRcblx0bGkuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbihlKXtcblx0XHRwYXJlbnQuX3NvbmdCdG5DbGljayh0aGlzLCBwYXJlbnQpO1xuXHR9KTtcblx0XG5cdHJldHVybiBsaTtcbn07XG5cblxuXG5wcm90by5fbGlzdEJ0bkNsaWNrID0gZnVuY3Rpb24oYnRuLCBwYXJlbnQpIHtcblx0cGFyZW50Ll9jbGVhckNsYXNzZXMoJ1tkYXRhLXBsYXlsaXN0LXRyaWdnZXJdJywgWydzZWxlY3RlZCddKTtcblx0cGFyZW50Ll9jbGVhckNsYXNzZXMoJy5wbGF5bGlzdCcsIFsnc2VsZWN0ZWQnXSk7XG5cdFxuXHRwYXJlbnQuY3VyX2xpc3QgPSBidG4uZ2V0QXR0cmlidXRlKCdkYXRhLXBsYXlsaXN0LXRyaWdnZXInKTtcblxuXHRidG4uY2xhc3NMaXN0LmFkZCgnc2VsZWN0ZWQnKTtcblx0ZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnBsYXlsaXN0W2RhdGEtcGxheWxpc3Q9XCInKyBwYXJlbnQuY3VyX2xpc3QgKydcIl0nKS5jbGFzc0xpc3QuYWRkKCdzZWxlY3RlZCcpO1xufTtcblxuXG5cbnByb3RvLl9zb25nQnRuQ2xpY2sgPSBmdW5jdGlvbihidG4sIHBhcmVudCkge1xuXHR2YXIgaWR4ID0gYnRuLmdldEF0dHJpYnV0ZSgnZGF0YS1zb25nJyk7XG5cdHZhciBwcm9ncmVzc19iYXIgPSBidG4ucXVlcnlTZWxlY3RvcignLnByb2dyZXNzX2JhcicpO1xuXHR2YXIgc29uZyA9IHBhcmVudC5wbGF5bGlzdHNbcGFyZW50LmN1cl9saXN0XS5zb25nc1tpZHhdO1xuXHRcblx0aWYoc29uZy5hdWRpbyA9PT0gdW5kZWZpbmVkKXtcblx0XHRzb25nLmF1ZGlvID0gbmV3IFNvbmcoc29uZy5mdWxscGF0aCk7XG5cdH1cblx0XG5cdGlmKGJ0bi5jbGFzc0xpc3QuY29udGFpbnMoJ3BhdXNlZCcpKXsgLy8gdW5wYXVzZSBzb25nXG5cdFx0XG5cdFx0c29uZy5hdWRpby5wbGF5KCk7XG5cdFx0YnRuLmNsYXNzTGlzdC5yZW1vdmUoJ3BhdXNlZCcpO1xuXHRcdHRoaXMuX3VwZGF0ZVBsYXloZWFkKHByb2dyZXNzX2Jhciwgc29uZy5hdWRpbyk7XG5cdFx0XG5cdH0gZWxzZSB7XG5cdFx0aWYoYnRuLmNsYXNzTGlzdC5jb250YWlucygncGxheWluZycpKXsgLy8gcGF1c2Ugc29uZ1xuXHRcdFx0XG5cdFx0XHRzb25nLmF1ZGlvLnBhdXNlKCk7XG5cdFx0XHRidG4uY2xhc3NMaXN0LmFkZCgncGF1c2VkJyk7XG5cdFx0XHRjYW5jZWxBbmltYXRpb25GcmFtZSh0aGlzLmFuaW1hdG9yKTtcblx0XHRcdFxuXHRcdH0gZWxzZSB7IC8vIHBsYXkgbmV3IHNvbmdcblx0XHRcdFxuXHRcdFx0aWYocGFyZW50LmN1cl9zb25nLmxlbmd0aD4xKXtcblx0XHRcdFx0cGFyZW50LnBsYXlsaXN0c1t0aGlzLmN1cl9zb25nWzBdXS5zb25nc1t0aGlzLmN1cl9zb25nWzFdXS5hdWRpby5zdG9wKCk7XG5cdFx0XHRcdGNhbmNlbEFuaW1hdGlvbkZyYW1lKHRoaXMuYW5pbWF0b3IpO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRwYXJlbnQuX2NsZWFyQ2xhc3NlcygnW2RhdGEtc29uZ10nLCBbJ3BsYXlpbmcnLCAncGF1c2VkJ10pO1xuXHRcdFx0XG5cdFx0XHRwYXJlbnQuY3VyX3NvbmcgPSBbcGFyZW50LmN1cl9saXN0LCBpZHhdO1xuXHRcdFx0XG5cdFx0XHRzb25nLmF1ZGlvLnBsYXkoKTtcblx0XHRcdFxuXHRcdFx0YnRuLmNsYXNzTGlzdC5hZGQoJ3BsYXlpbmcnKTtcblx0XHRcdHRoaXMuX3VwZGF0ZVBsYXloZWFkKHByb2dyZXNzX2Jhciwgc29uZy5hdWRpbyk7XG5cdFx0fVxuXHR9XG59XG5cblxuXG5wcm90by5fYWR2YW5jZVBsYXlsaXN0ID0gZnVuY3Rpb24oKXtcblx0aWYgKHRoaXMuY3VyX3NvbmdbMV0gPCB0aGlzLnBsYXlsaXN0c1t0aGlzLmN1cl9zb25nWzBdXS5zb25ncy5sZW5ndGgtMSkge1xuXHRcdHRoaXMuY3VyX3NvbmdbMV0rKztcblx0XHRcblx0XHR2YXIgc29uZyA9IHRoaXMucGxheWxpc3RzW3RoaXMuY3VyX3NvbmdbMF1dLnNvbmdzW3RoaXMuY3VyX3NvbmdbMV1dO1xuXHRcdFxuXHRcdGlmKHRoaXMuc2hvd19hbGwgfHwgc29uZy5zaG93PT09J3RydWUnKSB7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2FkdmFuY2VQbGF5bGlzdCgpO1xuXHRcdH1cblx0XHRcblx0fSBlbHNlIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cbn07XG5cblxuXG5wcm90by5fc29uZ0VuZGVkID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMuX2NsZWFyQ2xhc3NlcygnW2RhdGEtc29uZ10nLCBbJ3BsYXlpbmcnLCAncGF1c2VkJ10pO1xuXHRcblx0aWYgKHRoaXMuX2FkdmFuY2VQbGF5bGlzdCgpKSB7XG5cdFx0dGhpcy5fc29uZ0J0bkNsaWNrKHRoaXMuc29uZ3NfZGl2LnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLXBsYXlsaXN0PVwiJysgdGhpcy5jdXJfc29uZ1swXSArJ1wiXSBbZGF0YS1zb25nPVwiJysgdGhpcy5jdXJfc29uZ1sxXSArJ1wiXScpLCB0aGlzKTtcblx0fVxufTtcblxuXG5cbnByb3RvLl91cGRhdGVQbGF5aGVhZCA9IGZ1bmN0aW9uKGVsLCBzb25nKSB7XG5cdGlmKHNvbmcuZW5kZWQoKSkge1xuXHRcdGNhbmNlbEFuaW1hdGlvbkZyYW1lKHRoaXMuYW5pbWF0b3IpO1xuXHRcdHRoaXMuX3NvbmdFbmRlZCgpO1xuXHR9IGVsc2Uge1xuXHRcdGVsLnN0eWxlLndpZHRoID0gc29uZy5nZXRQZXJjZW50UGxheWVkKCkgKyAnJSc7XG5cdFx0XG5cdFx0dGhpcy5hbmltYXRvciA9IHJlcXVlc3RBbmltYXRpb25GcmFtZShmdW5jdGlvbigpe1xuXHRcdFx0dGhpcy5fdXBkYXRlUGxheWhlYWQoZWwsIHNvbmcpO1xuXHRcdH0uYmluZCh0aGlzKSk7XG5cdFxuXHR9XG59O1xuXG5cblxubW9kdWxlLmV4cG9ydHMgPSBQbGF5ZXJVSTtcblxuXG5cblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBTb25nKHVybCkge1xuXHR0aGlzLnNvbmcgPSBuZXcgQXVkaW8odXJsKTtcbn1cblxudmFyIHByb3RvID0gU29uZy5wcm90b3R5cGU7XG5cblxuXG4vLyDigKLigKLigKLigKLigKLigKLigKLigKLigKLigKJcbi8vIFBVQkxJQyBNRVRIT0RTXG4vLyDigKLigKLigKLigKLigKLigKLigKLigKLigKLigKJcblxucHJvdG8uZW5kZWQgPSBmdW5jdGlvbigpe1xuXHRyZXR1cm4gdGhpcy5zb25nLmVuZGVkO1xufTtcblxuXG5cbnByb3RvLmdldFBlcmNlbnRQbGF5ZWQgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuc29uZy5jdXJyZW50VGltZSAvIHRoaXMuc29uZy5kdXJhdGlvbiAqIDEwMDtcbn07XG5cblxuXG5wcm90by5wYXVzZSA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLnNvbmcucGF1c2UoKTtcbn07XG5cblxuXG5wcm90by5wbGF5ID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMuc29uZy5wbGF5KCk7XG59O1xuXG5cblxucHJvdG8uc3RvcCA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLnNvbmcucGF1c2UoKTtcblx0dGhpcy5zb25nLmN1cnJlbnRUaW1lID0gMDtcbn07XG5cblxuXG5tb2R1bGUuZXhwb3J0cyA9IFNvbmc7Il19
