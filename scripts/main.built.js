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



	analyticsEvent: function(options){
		options.hitType = 'event';
		
		if(window.ga) { 
			ga('send', options);
		}
	},



	donationAnalytics: function(action, amount){
		this.analyticsEvent({
			eventCategory: 'Donation',
			eventAction: action,
			eventValue: amount
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
					main.donationAnalytics('paid', donation_amt.value);
				}
			});
		
			donate_btn.addEventListener('click', function(e) {
				// Open Checkout with further options:
				handler.open({
					name: 'Mayfield Singers Donation',
					description: 'Charitable Contribution',
					amount: donation_amt.value * 100
				});
				main.donationAnalytics('triggered', donation_amt.value);
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



proto._songAnalytics = function(song_coord, action){
	if(window.ga) {
		ga('send', {
			hitType: 'event',
			eventCategory: this.playlists[song_coord[0]].songs[song_coord[1]].title,
			eventAction: action,
			eventLabel: this.playlists[song_coord[0]].name
		});
	}
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvanMvbWFpbi5qcyIsInNyYy9qcy9tb2R1bGVzL1BsYXllclVJLmpzIiwic3JjL2pzL21vZHVsZXMvU29uZy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCc7XG5cbnZhciBQbGF5ZXJVSSA9IHJlcXVpcmUoJy4vbW9kdWxlcy9QbGF5ZXJVSScpO1xudmFyIE11c2ljUGxheWVyO1xuXG52YXIgbWFpbiA9IHtcblx0XG5cdGluaXQ6IGZ1bmN0aW9uKCl7XG5cdFx0dGhpcy5hbHVtbmlfc2VjdGlvbigpO1xuXHRcdHRoaXMubG9hZF9wbGF5bGlzdHMoKTtcblx0XHRcblx0XHR0aGlzLmluaXRfYW5hbHl0aWNzKCk7XG5cdFx0dGhpcy5pbml0X3N0cmlwZSgpO1xuXHR9LFxuXHRcblx0XG5cdFxuXHRhamF4OiBmdW5jdGlvbih1cmwsIGNhbGxiYWNrKXtcblx0XHRpZih3aW5kb3cuWE1MSHR0cFJlcXVlc3Qpe1xuXHRcdFx0dmFyIGFqeCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXHRcdH1lbHNle1xuXHRcdFx0dmFyIGFqeCA9IG5ldyBBY3RpdmVYT2JqZWN0KFwiTWljcm9zb2Z0LlhNTEhUVFBcIik7XG5cdFx0fVxuXHRcdFxuXHRcdGFqeC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpIHtcblx0XHRcdGlmKGFqeC5yZWFkeVN0YXRlPT00ICYmIGFqeC5zdGF0dXM9PTIwMCl7XG5cdFx0XHRcdGNhbGxiYWNrKGFqeC5yZXNwb25zZVRleHQpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRcblx0XHRhangub3BlbihcIkdFVFwiLCB1cmwsIHRydWUpO1xuXHRcdGFqeC5zZW5kKCk7XG5cdH0sXG5cdFxuXHRcblx0XG5cdGFsdW1uaV9zZWN0aW9uOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgYWx1bW5pX2ZyYW1lID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmFsdW1uaScpO1xuXHRcdHZhciBhbHVtbmlfYnRuID0gYWx1bW5pX2ZyYW1lLnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLWFjdGlvbj1hbHVtbmktdG9nZ2xlXScpO1xuXHRcdFxuXHRcdGFsdW1uaV9idG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpe1xuXHRcdFx0YWx1bW5pX2ZyYW1lLmNsYXNzTGlzdC50b2dnbGUoJ2V4cGFuZCcpO1xuXHRcdH0pO1xuXHR9LFxuXG5cblxuXHRhbmFseXRpY3NFdmVudDogZnVuY3Rpb24ob3B0aW9ucyl7XG5cdFx0b3B0aW9ucy5oaXRUeXBlID0gJ2V2ZW50Jztcblx0XHRcblx0XHRpZih3aW5kb3cuZ2EpIHsgXG5cdFx0XHRnYSgnc2VuZCcsIG9wdGlvbnMpO1xuXHRcdH1cblx0fSxcblxuXG5cblx0ZG9uYXRpb25BbmFseXRpY3M6IGZ1bmN0aW9uKGFjdGlvbiwgYW1vdW50KXtcblx0XHR0aGlzLmFuYWx5dGljc0V2ZW50KHtcblx0XHRcdGV2ZW50Q2F0ZWdvcnk6ICdEb25hdGlvbicsXG5cdFx0XHRldmVudEFjdGlvbjogYWN0aW9uLFxuXHRcdFx0ZXZlbnRWYWx1ZTogYW1vdW50XG5cdFx0fSk7XG5cdH0sXG5cblxuXG5cdGZvcl9lYWNoOiBmdW5jdGlvbihsaXN0LCBjYWxsYmFjaykge1xuXHRcdGZvcih2YXIgeD0wLCBsPWxpc3QubGVuZ3RoOyB4PGw7IHgrKyl7XG5cdFx0XHRjYWxsYmFjayhsaXN0W3hdLCB4KTtcblx0XHR9XG5cdH0sXG5cblxuXG5cdGluaXRfYW5hbHl0aWNzOiBmdW5jdGlvbigpe1xuXHRcdChmdW5jdGlvbihpLHMsbyxnLHIsYSxtKXtpWydHb29nbGVBbmFseXRpY3NPYmplY3QnXT1yO2lbcl09aVtyXXx8ZnVuY3Rpb24oKXtcblx0XHQoaVtyXS5xPWlbcl0ucXx8W10pLnB1c2goYXJndW1lbnRzKX0saVtyXS5sPTEqbmV3IERhdGUoKTthPXMuY3JlYXRlRWxlbWVudChvKSxcblx0XHRtPXMuZ2V0RWxlbWVudHNCeVRhZ05hbWUobylbMF07YS5hc3luYz0xO2Euc3JjPWc7bS5wYXJlbnROb2RlLmluc2VydEJlZm9yZShhLG0pXG5cdFx0fSkod2luZG93LGRvY3VtZW50LCdzY3JpcHQnLCdodHRwczovL3d3dy5nb29nbGUtYW5hbHl0aWNzLmNvbS9hbmFseXRpY3MuanMnLCdnYScpO1xuXHRcdFxuXHRcdGdhKCdjcmVhdGUnLCAnVUEtODIwOTc1NDMtMScsICdhdXRvJyk7XG5cdFx0Z2EoJ3NlbmQnLCAncGFnZXZpZXcnKTtcblx0fSxcblxuXG5cblx0aW5pdF9zdHJpcGU6IGZ1bmN0aW9uKCl7XG5cdFx0dmFyIGRvbmF0ZV9idG4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZG9uYXRlX2J1dHRvbicpO1xuXHRcdHZhciBkb25hdGlvbl9hbXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZG9uYXRpb25fYW1vdW50Jyk7XG5cdFx0dmFyIHRoYW5rX3lvdSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjb250cmlidXRpb25fdGhhbmtfeW91Jyk7XG5cdFx0dmFyIHRoYW5rX3lvdV9jbG9zZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjbG9zZV90aGFua195b3VfYnV0dG9uJyk7XG5cdFx0XG5cdFx0aWYod2luZG93LlN0cmlwZUNoZWNrb3V0KSB7XG5cdFx0XHR2YXIgaGFuZGxlciA9IFN0cmlwZUNoZWNrb3V0LmNvbmZpZ3VyZSh7XG5cdFx0XHRcdGtleTogJ3BrX3Rlc3RfSHlTQTdhaEdrbGVIZGdmc0I2QVpUZHh6Jyxcblx0XHRcdFx0aW1hZ2U6ICdodHRwczovL21heWZpZWxkc2luZ2Vycy5vcmcvYXBwbGUtdG91Y2gtaWNvbi5wbmcnLFxuXHRcdFx0XHRsb2NhbGU6ICdhdXRvJyxcblx0XHRcdFx0dG9rZW46IGZ1bmN0aW9uKHRva2VuKSB7XG5cdFx0XHRcdFx0ZG9jdW1lbnQucXVlcnlTZWxlY3RvcignW2RhdGEtYW1vdW50XScpLmlubmVySFRNTCA9IGRvbmF0aW9uX2FtdC52YWx1ZTtcblx0XHRcdFx0XHR0aGFua195b3UuY2xhc3NMaXN0LmFkZCgndmlzaWJsZScpO1xuXHRcdFx0XHRcdG1haW4uZG9uYXRpb25BbmFseXRpY3MoJ3BhaWQnLCBkb25hdGlvbl9hbXQudmFsdWUpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHRcblx0XHRcdGRvbmF0ZV9idG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbihlKSB7XG5cdFx0XHRcdC8vIE9wZW4gQ2hlY2tvdXQgd2l0aCBmdXJ0aGVyIG9wdGlvbnM6XG5cdFx0XHRcdGhhbmRsZXIub3Blbih7XG5cdFx0XHRcdFx0bmFtZTogJ01heWZpZWxkIFNpbmdlcnMgRG9uYXRpb24nLFxuXHRcdFx0XHRcdGRlc2NyaXB0aW9uOiAnQ2hhcml0YWJsZSBDb250cmlidXRpb24nLFxuXHRcdFx0XHRcdGFtb3VudDogZG9uYXRpb25fYW10LnZhbHVlICogMTAwXG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRtYWluLmRvbmF0aW9uQW5hbHl0aWNzKCd0cmlnZ2VyZWQnLCBkb25hdGlvbl9hbXQudmFsdWUpO1xuXHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHR9KTtcblx0XHRcdFxuXHRcdFx0dGhhbmtfeW91X2Nsb3NlLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oZSkgeyB0aGFua195b3UuY2xhc3NMaXN0LnJlbW92ZSgndmlzaWJsZScpOyB9KVxuXHRcdFx0XHRcblx0XHRcdC8vQ2xvc2UgQ2hlY2tvdXQgb24gcGFnZSBuYXZpZ2F0aW9uOlxuXHRcdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3BvcHN0YXRlJywgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGhhbmRsZXIuY2xvc2UoKTtcblx0XHRcdH0pO1xuXHRcdH1cblx0fSxcblxuXG5cblx0bG9hZF9wbGF5bGlzdHM6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuYWpheCgnLi4vYXVkaW8vbGlicmFyeS54bWwnLCBmdW5jdGlvbihwbGF5bGlzdHMpe1xuXHRcdFx0XG5cdFx0XHR2YXIgcGFyc2VyID0gbmV3IERPTVBhcnNlcigpO1xuXHRcdFx0dmFyIHhtbCA9IHBhcnNlci5wYXJzZUZyb21TdHJpbmcocGxheWxpc3RzLFwidGV4dC94bWxcIik7XG5cdFx0XHRcblx0XHRcdHZhciBlbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhdWRpb19wbGF5ZXInKTtcblx0XHRcdHZhciBqc29uID0gbWFpbi54bWxfdG9fanNvbih4bWwpO1xuXHRcdFx0XG5cdFx0XHRNdXNpY1BsYXllciA9IG5ldyBQbGF5ZXJVSShlbCwgZmFsc2UsIGpzb24pO1xuXHRcdFx0TXVzaWNQbGF5ZXIucG9wdWxhdGVMaXN0cygpO1xuXHRcdH0pO1xuXHR9LFxuXG5cblxuXHR4bWxfdG9fanNvbjogZnVuY3Rpb24oeG1sKSB7XG5cdFx0XG5cdFx0dmFyIHJlc3BvbnNlID0gW107XG5cdFx0XG5cdFx0dmFyIHBsYXlsaXN0cyA9IHhtbC5nZXRFbGVtZW50c0J5VGFnTmFtZSgncGxheWxpc3QnKTtcblx0XHRcblx0XHRmb3IodmFyIHg9MCwgbD1wbGF5bGlzdHMubGVuZ3RoOyB4PGw7IHgrKykge1xuXHRcdFx0XG5cdFx0XHR2YXIgY3J0ID0gcGxheWxpc3RzW3hdO1xuXHRcdFx0XG5cdFx0XHR2YXIgcGxheWxpc3QgPSB7XG5cdFx0XHRcdG5hbWU6IGNydC5nZXRBdHRyaWJ1dGUoJ25hbWUnKSxcblx0XHRcdFx0ZGF0ZTogY3J0LmdldEF0dHJpYnV0ZSgnZGF0ZScpLFxuXHRcdFx0XHRwYXRoOiBjcnQuZ2V0QXR0cmlidXRlKCdmb2xkZXInKSxcblx0XHRcdFx0c29uZ3M6IFtdXG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdHZhciB4bWxfc29uZ3MgPSBjcnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ3NvbmcnKTtcblx0XHRcdFxuXHRcdFx0Zm9yKHZhciBpPTAsIGxlbj14bWxfc29uZ3MubGVuZ3RoOyBpPGxlbjsgaSsrKSB7XG5cdFx0XHRcdHZhciBmaWxlbmFtZSA9IHhtbF9zb25nc1tpXS5xdWVyeVNlbGVjdG9yKCdmaWxlbmFtZScpLmNoaWxkTm9kZXNbMF0ubm9kZVZhbHVlXG5cdFx0XHRcdFxuXHRcdFx0XHRwbGF5bGlzdC5zb25ncy5wdXNoKHtcblx0XHRcdFx0XHRzaG93OiB4bWxfc29uZ3NbaV0uZ2V0QXR0cmlidXRlKCdzaG93X2luX3BsYXllcicpLFxuXHRcdFx0XHRcdHRpdGxlOiB4bWxfc29uZ3NbaV0ucXVlcnlTZWxlY3RvcigndGl0bGUnKS5jaGlsZE5vZGVzWzBdLm5vZGVWYWx1ZSxcblx0XHRcdFx0XHRmaWxlbmFtZTogZmlsZW5hbWUsXG5cdFx0XHRcdFx0ZnVsbHBhdGg6ICcuLi9hdWRpby8nICsgcGxheWxpc3QucGF0aCArICcvJyArIGZpbGVuYW1lXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRyZXNwb25zZS5wdXNoKHBsYXlsaXN0KTtcblx0XHR9XG5cdFx0XG5cdFx0cmV0dXJuIHJlc3BvbnNlO1x0XHRcblx0fVxufTtcblxubWFpbi5pbml0KCk7IiwiJ3VzZSBzdHJpY3QnO1xuXG5cbnZhciBTb25nID0gcmVxdWlyZSgnLi9Tb25nJyk7XG5cbmZ1bmN0aW9uIFBsYXllclVJKHBhcmVudF9lbCwgc2hvd19hbGwsIHBsYXlsaXN0cykge1xuXHR0aGlzLmVsID0gcGFyZW50X2VsO1xuXHR0aGlzLnNob3dfYWxsID0gc2hvd19hbGw7XG5cdHRoaXMubGlzdF91bCA9IHRoaXMuZWwucXVlcnlTZWxlY3RvcignW2RhdGEtcGxheWxpc3QtY29udGFpbmVyXScpO1xuXHR0aGlzLnNvbmdzX2RpdiA9IHRoaXMuZWwucXVlcnlTZWxlY3RvcignW2RhdGEtc29uZy1jb250YWluZXJdJyk7XG5cdFxuXHR0aGlzLnBsYXlsaXN0cyA9IHBsYXlsaXN0cztcblxuXHR0aGlzLmN1cl9saXN0ID0gMDtcblx0dGhpcy5jdXJfc29uZyA9IFtdO1xufVxuXG52YXIgcHJvdG8gPSBQbGF5ZXJVSS5wcm90b3R5cGU7XG5cblxuXG4vLyDigKLigKLigKLigKLigKLigKLigKLigKLigKLigKJcbi8vIFBVQkxJQyBNRVRIT0RTXG4vLyDigKLigKLigKLigKLigKLigKLigKLigKLigKLigKJcblxucHJvdG8ucG9wdWxhdGVMaXN0cyA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLmxpc3RfdWwuaW5uZXJIVE1MID0gJyc7XG5cdFxuXHRmb3IodmFyIHg9MCwgbD10aGlzLnBsYXlsaXN0cy5sZW5ndGg7IHg8bDsgeCsrKSB7XG5cdFx0dmFyIGxpc3QgPSB0aGlzLnBsYXlsaXN0c1t4XTtcblx0XHR2YXIgbGkgPSB0aGlzLl9nZXRMaXN0TGkobGlzdCwgeCk7XG5cdFx0dGhpcy5saXN0X3VsLmFwcGVuZENoaWxkKGxpKTtcblx0XHRcblx0XHR0aGlzLnBvcHVsYXRlU29uZ3MoeCk7XG5cdH1cbn07XG5cblxuXG5wcm90by5wb3B1bGF0ZVNvbmdzID0gZnVuY3Rpb24obGlzdF9pZHgpIHtcblx0dmFyIHVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndWwnKTtcblx0dWwuY2xhc3NMaXN0LmFkZCgncGxheWxpc3QnKTtcblx0dWwuc2V0QXR0cmlidXRlKCdkYXRhLXBsYXlsaXN0JywgbGlzdF9pZHgpO1xuXHRcblx0aWYodGhpcy5jdXJfbGlzdD09PWxpc3RfaWR4KSB7XG5cdFx0dWwuY2xhc3NMaXN0LmFkZCgnc2VsZWN0ZWQnKTtcblx0fVxuXHRcblx0dmFyIHNvbmdfbGlzdCA9IHRoaXMucGxheWxpc3RzW2xpc3RfaWR4XS5zb25ncztcblx0XG5cdGZvcih2YXIgeD0wLCBsPXNvbmdfbGlzdC5sZW5ndGg7IHg8bDsgeCsrKSB7XG5cdFx0dmFyIHNvbmcgPSBzb25nX2xpc3RbeF07XG5cdFx0XG5cdFx0aWYodGhpcy5zaG93X2FsbCB8fCBzb25nLnNob3c9PT0ndHJ1ZScpe1xuXHRcdFx0dmFyIGxpID0gdGhpcy5fZ2V0U29uZ0xpKHNvbmcsIHgpO1xuXHRcdFx0dWwuYXBwZW5kQ2hpbGQobGkpO1xuXHRcdH1cblx0fVxuXHRcblx0dGhpcy5zb25nc19kaXYuYXBwZW5kQ2hpbGQodWwpO1xufTtcblxuXG4vLyDigKLigKLigKLigKLigKLigKLigKLigKLigKLigKJcbi8vIFBSSVZBVEUgTUVUSE9EU1xuLy8g4oCi4oCi4oCi4oCi4oCi4oCi4oCi4oCi4oCi4oCiXG5cbnByb3RvLl9hZHZhbmNlUGxheWxpc3QgPSBmdW5jdGlvbigpe1xuXHRpZiAodGhpcy5jdXJfc29uZ1sxXSA8IHRoaXMucGxheWxpc3RzW3RoaXMuY3VyX3NvbmdbMF1dLnNvbmdzLmxlbmd0aC0xKSB7XG5cdFx0dGhpcy5jdXJfc29uZ1sxXSsrO1xuXHRcdFxuXHRcdHZhciBzb25nID0gdGhpcy5wbGF5bGlzdHNbdGhpcy5jdXJfc29uZ1swXV0uc29uZ3NbdGhpcy5jdXJfc29uZ1sxXV07XG5cdFx0XG5cdFx0aWYodGhpcy5zaG93X2FsbCB8fCBzb25nLnNob3c9PT0ndHJ1ZScpIHtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fYWR2YW5jZVBsYXlsaXN0KCk7XG5cdFx0fVxuXHRcdFxuXHR9IGVsc2Uge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxufTtcblxuXG5cbnByb3RvLl9jbGVhckNsYXNzZXMgPSBmdW5jdGlvbihzZWxlY3RvciwgY2xhc3NBcnJheSkge1xuXHR2YXIgZWxzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XG5cdGZvcih2YXIgeD0wLCBsPWVscy5sZW5ndGg7IHg8bDsgeCsrKXtcblx0XHRmb3IodmFyIGk9MCwgbGVuPWNsYXNzQXJyYXkubGVuZ3RoOyBpPGxlbjsgaSsrKSB7XG5cdFx0XHRlbHNbeF0uY2xhc3NMaXN0LnJlbW92ZShjbGFzc0FycmF5W2ldKTtcblx0XHR9XG5cdH1cbn07XG5cblxuXG5wcm90by5fZ2V0TGlzdExpID0gZnVuY3Rpb24obGlzdCwgaWR4KSB7XG5cdHZhciBsaSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XG5cdGxpLnNldEF0dHJpYnV0ZSgnZGF0YS1wbGF5bGlzdC10cmlnZ2VyJywgaWR4KTtcblx0XG5cdGlmKGlkeD09dGhpcy5jdXJfbGlzdCl7XG5cdFx0bGkuY2xhc3NMaXN0LmFkZCgnc2VsZWN0ZWQnKTtcblx0fVxuXHRcblx0dmFyIHNwYW4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG5cdHZhciB0eHQgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShsaXN0Lm5hbWUpO1xuXHRzcGFuLmFwcGVuZENoaWxkKHR4dCk7XG5cdGxpLmFwcGVuZENoaWxkKHNwYW4pO1xuXHRcblx0dmFyIHBhcmVudCA9IHRoaXM7XG5cdFxuXHRsaS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcblx0XHRwYXJlbnQuX2xpc3RCdG5DbGljayh0aGlzLCBwYXJlbnQpO1xuXHR9KTtcblx0XG5cdHJldHVybiBsaTtcbn07XG5cblxuXG5wcm90by5fZ2V0U29uZ0xpID0gZnVuY3Rpb24oc29uZywgaWR4KSB7XG5cdHZhciBsaSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XG5cdGxpLnNldEF0dHJpYnV0ZSgnZGF0YS1zb25nJywgaWR4KTtcblx0XG5cdHZhciBzcGFuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuXHR2YXIgdHh0ID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoc29uZy50aXRsZSk7XG5cdHZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0ZGl2LmNsYXNzTGlzdC5hZGQoJ3Byb2dyZXNzX2JhcicpO1xuXHRzcGFuLmFwcGVuZENoaWxkKHR4dCk7XG5cdGxpLmFwcGVuZENoaWxkKHNwYW4pO1xuXHRsaS5hcHBlbmRDaGlsZChkaXYpO1xuXHRcblx0dmFyIHBhcmVudCA9IHRoaXM7XG5cdFxuXHRsaS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKGUpe1xuXHRcdHBhcmVudC5fc29uZ0J0bkNsaWNrKHRoaXMsIHBhcmVudCk7XG5cdH0pO1xuXHRcblx0cmV0dXJuIGxpO1xufTtcblxuXG5cbnByb3RvLl9saXN0QnRuQ2xpY2sgPSBmdW5jdGlvbihidG4sIHBhcmVudCkge1xuXHRwYXJlbnQuX2NsZWFyQ2xhc3NlcygnW2RhdGEtcGxheWxpc3QtdHJpZ2dlcl0nLCBbJ3NlbGVjdGVkJ10pO1xuXHRwYXJlbnQuX2NsZWFyQ2xhc3NlcygnLnBsYXlsaXN0JywgWydzZWxlY3RlZCddKTtcblx0XG5cdHBhcmVudC5jdXJfbGlzdCA9IGJ0bi5nZXRBdHRyaWJ1dGUoJ2RhdGEtcGxheWxpc3QtdHJpZ2dlcicpO1xuXG5cdGJ0bi5jbGFzc0xpc3QuYWRkKCdzZWxlY3RlZCcpO1xuXHRkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcucGxheWxpc3RbZGF0YS1wbGF5bGlzdD1cIicrIHBhcmVudC5jdXJfbGlzdCArJ1wiXScpLmNsYXNzTGlzdC5hZGQoJ3NlbGVjdGVkJyk7XG59O1xuXG5cblxucHJvdG8uX3NvbmdBbmFseXRpY3MgPSBmdW5jdGlvbihzb25nX2Nvb3JkLCBhY3Rpb24pe1xuXHRpZih3aW5kb3cuZ2EpIHtcblx0XHRnYSgnc2VuZCcsIHtcblx0XHRcdGhpdFR5cGU6ICdldmVudCcsXG5cdFx0XHRldmVudENhdGVnb3J5OiB0aGlzLnBsYXlsaXN0c1tzb25nX2Nvb3JkWzBdXS5zb25nc1tzb25nX2Nvb3JkWzFdXS50aXRsZSxcblx0XHRcdGV2ZW50QWN0aW9uOiBhY3Rpb24sXG5cdFx0XHRldmVudExhYmVsOiB0aGlzLnBsYXlsaXN0c1tzb25nX2Nvb3JkWzBdXS5uYW1lXG5cdFx0fSk7XG5cdH1cbn07XG5cblxuXG5wcm90by5fc29uZ0J0bkNsaWNrID0gZnVuY3Rpb24oYnRuLCBwYXJlbnQpIHtcblx0dmFyIGlkeCA9IGJ0bi5nZXRBdHRyaWJ1dGUoJ2RhdGEtc29uZycpO1xuXHR2YXIgcHJvZ3Jlc3NfYmFyID0gYnRuLnF1ZXJ5U2VsZWN0b3IoJy5wcm9ncmVzc19iYXInKTtcblx0dmFyIHNvbmcgPSBwYXJlbnQucGxheWxpc3RzW3BhcmVudC5jdXJfbGlzdF0uc29uZ3NbaWR4XTtcblx0XG5cdGlmKHNvbmcuYXVkaW8gPT09IHVuZGVmaW5lZCl7XG5cdFx0c29uZy5hdWRpbyA9IG5ldyBTb25nKHNvbmcuZnVsbHBhdGgpO1xuXHR9XG5cdFxuXHRpZihidG4uY2xhc3NMaXN0LmNvbnRhaW5zKCdwYXVzZWQnKSl7IC8vIHVucGF1c2Ugc29uZ1xuXHRcdFxuXHRcdHNvbmcuYXVkaW8ucGxheSgpO1xuXHRcdGJ0bi5jbGFzc0xpc3QucmVtb3ZlKCdwYXVzZWQnKTtcblx0XHR0aGlzLl91cGRhdGVQbGF5aGVhZChwcm9ncmVzc19iYXIsIHNvbmcuYXVkaW8pO1xuXHRcdFxuXHR9IGVsc2Uge1xuXHRcdGlmKGJ0bi5jbGFzc0xpc3QuY29udGFpbnMoJ3BsYXlpbmcnKSl7IC8vIHBhdXNlIHNvbmdcblx0XHRcdFxuXHRcdFx0c29uZy5hdWRpby5wYXVzZSgpO1xuXHRcdFx0YnRuLmNsYXNzTGlzdC5hZGQoJ3BhdXNlZCcpO1xuXHRcdFx0Y2FuY2VsQW5pbWF0aW9uRnJhbWUodGhpcy5hbmltYXRvcik7XG5cdFx0XHRcblx0XHR9IGVsc2UgeyAvLyBwbGF5IG5ldyBzb25nXG5cdFx0XHRcblx0XHRcdGlmKHBhcmVudC5jdXJfc29uZy5sZW5ndGg+MSl7XG5cdFx0XHRcdHBhcmVudC5wbGF5bGlzdHNbdGhpcy5jdXJfc29uZ1swXV0uc29uZ3NbdGhpcy5jdXJfc29uZ1sxXV0uYXVkaW8uc3RvcCgpO1xuXHRcdFx0XHRjYW5jZWxBbmltYXRpb25GcmFtZSh0aGlzLmFuaW1hdG9yKTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0cGFyZW50Ll9jbGVhckNsYXNzZXMoJ1tkYXRhLXNvbmddJywgWydwbGF5aW5nJywgJ3BhdXNlZCddKTtcblx0XHRcdFxuXHRcdFx0cGFyZW50LmN1cl9zb25nID0gW3BhcmVudC5jdXJfbGlzdCwgaWR4XTtcblx0XHRcdFxuXHRcdFx0c29uZy5hdWRpby5wbGF5KCk7XG5cdFx0XHRcblx0XHRcdHRoaXMuX3NvbmdBbmFseXRpY3MocGFyZW50LmN1cl9zb25nLCAncGxheScpO1xuXHRcdFx0XG5cdFx0XHRidG4uY2xhc3NMaXN0LmFkZCgncGxheWluZycpO1xuXHRcdFx0dGhpcy5fdXBkYXRlUGxheWhlYWQocHJvZ3Jlc3NfYmFyLCBzb25nLmF1ZGlvKTtcblx0XHR9XG5cdH1cbn1cblxuXG5cbnByb3RvLl9zb25nRW5kZWQgPSBmdW5jdGlvbigpIHtcblx0dGhpcy5fc29uZ0FuYWx5dGljcyh0aGlzLmN1cl9zb25nLCAnY29tcGxldGUnKTtcblx0XG5cdHRoaXMuX2NsZWFyQ2xhc3NlcygnW2RhdGEtc29uZ10nLCBbJ3BsYXlpbmcnLCAncGF1c2VkJ10pO1xuXHRcblx0aWYgKHRoaXMuX2FkdmFuY2VQbGF5bGlzdCgpKSB7XG5cdFx0dGhpcy5fc29uZ0J0bkNsaWNrKHRoaXMuc29uZ3NfZGl2LnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLXBsYXlsaXN0PVwiJysgdGhpcy5jdXJfc29uZ1swXSArJ1wiXSBbZGF0YS1zb25nPVwiJysgdGhpcy5jdXJfc29uZ1sxXSArJ1wiXScpLCB0aGlzKTtcblx0fVxufTtcblxuXG5cbnByb3RvLl91cGRhdGVQbGF5aGVhZCA9IGZ1bmN0aW9uKGVsLCBzb25nKSB7XG5cdGlmKHNvbmcuZW5kZWQoKSkge1xuXHRcdGNhbmNlbEFuaW1hdGlvbkZyYW1lKHRoaXMuYW5pbWF0b3IpO1xuXHRcdHRoaXMuX3NvbmdFbmRlZCgpO1xuXHR9IGVsc2Uge1xuXHRcdGVsLnN0eWxlLndpZHRoID0gc29uZy5nZXRQZXJjZW50UGxheWVkKCkgKyAnJSc7XG5cdFx0XG5cdFx0dGhpcy5hbmltYXRvciA9IHJlcXVlc3RBbmltYXRpb25GcmFtZShmdW5jdGlvbigpe1xuXHRcdFx0dGhpcy5fdXBkYXRlUGxheWhlYWQoZWwsIHNvbmcpO1xuXHRcdH0uYmluZCh0aGlzKSk7XG5cdFxuXHR9XG59O1xuXG5cblxubW9kdWxlLmV4cG9ydHMgPSBQbGF5ZXJVSTtcblxuXG5cblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBTb25nKHVybCkge1xuXHR0aGlzLnNvbmcgPSBuZXcgQXVkaW8odXJsKTtcbn1cblxudmFyIHByb3RvID0gU29uZy5wcm90b3R5cGU7XG5cblxuXG4vLyDigKLigKLigKLigKLigKLigKLigKLigKLigKLigKJcbi8vIFBVQkxJQyBNRVRIT0RTXG4vLyDigKLigKLigKLigKLigKLigKLigKLigKLigKLigKJcblxucHJvdG8uZW5kZWQgPSBmdW5jdGlvbigpe1xuXHRyZXR1cm4gdGhpcy5zb25nLmVuZGVkO1xufTtcblxuXG5cbnByb3RvLmdldFBlcmNlbnRQbGF5ZWQgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuc29uZy5jdXJyZW50VGltZSAvIHRoaXMuc29uZy5kdXJhdGlvbiAqIDEwMDtcbn07XG5cblxuXG5wcm90by5wYXVzZSA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLnNvbmcucGF1c2UoKTtcbn07XG5cblxuXG5wcm90by5wbGF5ID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMuc29uZy5wbGF5KCk7XG59O1xuXG5cblxucHJvdG8uc3RvcCA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLnNvbmcucGF1c2UoKTtcblx0dGhpcy5zb25nLmN1cnJlbnRUaW1lID0gMDtcbn07XG5cblxuXG5tb2R1bGUuZXhwb3J0cyA9IFNvbmc7XHQiXX0=
