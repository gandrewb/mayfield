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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvanMvbWFpbi5qcyIsInNyYy9qcy9tb2R1bGVzL1BsYXllclVJLmpzIiwic3JjL2pzL21vZHVsZXMvU29uZy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeFBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIid1c2Ugc3RyaWN0JztcblxudmFyIFBsYXllclVJID0gcmVxdWlyZSgnLi9tb2R1bGVzL1BsYXllclVJJyk7XG52YXIgTXVzaWNQbGF5ZXI7XG5cbnZhciBtYWluID0ge1xuXHRcblx0aW5pdDogZnVuY3Rpb24oKXtcblx0XHR0aGlzLmFsdW1uaV9zZWN0aW9uKCk7XG5cdFx0dGhpcy5sb2FkX3BsYXlsaXN0cygpO1xuXHRcdFxuXHRcdHRoaXMuaW5pdF9hbmFseXRpY3MoKTtcblx0XHR0aGlzLmluaXRfc3RyaXBlKCk7XG5cdH0sXG5cdFxuXHRcblx0XG5cdGFqYXg6IGZ1bmN0aW9uKHVybCwgY2FsbGJhY2spe1xuXHRcdGlmKHdpbmRvdy5YTUxIdHRwUmVxdWVzdCl7XG5cdFx0XHR2YXIgYWp4ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cdFx0fWVsc2V7XG5cdFx0XHR2YXIgYWp4ID0gbmV3IEFjdGl2ZVhPYmplY3QoXCJNaWNyb3NvZnQuWE1MSFRUUFwiKTtcblx0XHR9XG5cdFx0XG5cdFx0YWp4Lm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0aWYoYWp4LnJlYWR5U3RhdGU9PTQgJiYgYWp4LnN0YXR1cz09MjAwKXtcblx0XHRcdFx0Y2FsbGJhY2soYWp4LnJlc3BvbnNlVGV4dCk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdFxuXHRcdGFqeC5vcGVuKFwiR0VUXCIsIHVybCwgdHJ1ZSk7XG5cdFx0YWp4LnNlbmQoKTtcblx0fSxcblx0XG5cdFxuXHRcblx0YWx1bW5pX3NlY3Rpb246IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBhbHVtbmlfZnJhbWUgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuYWx1bW5pJyk7XG5cdFx0dmFyIGFsdW1uaV9idG4gPSBhbHVtbmlfZnJhbWUucXVlcnlTZWxlY3RvcignW2RhdGEtYWN0aW9uPWFsdW1uaS10b2dnbGVdJyk7XG5cdFx0XG5cdFx0YWx1bW5pX2J0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCl7XG5cdFx0XHRhbHVtbmlfZnJhbWUuY2xhc3NMaXN0LnRvZ2dsZSgnZXhwYW5kJyk7XG5cdFx0fSk7XG5cdH0sXG5cblxuXG5cdGFuYWx5dGljc0V2ZW50OiBmdW5jdGlvbihvcHRpb25zKXtcblx0XHRvcHRpb25zLmhpdFR5cGUgPSAnZXZlbnQnO1xuXHRcdFxuXHRcdGlmKHdpbmRvdy5nYSkgeyBcblx0XHRcdGdhKCdzZW5kJywgb3B0aW9ucyk7XG5cdFx0fVxuXHR9LFxuXG5cblxuXHRkb25hdGlvbkFuYWx5dGljczogZnVuY3Rpb24oYWN0aW9uLCBhbW91bnQpe1xuXHRcdHRoaXMuYW5hbHl0aWNzRXZlbnQoe1xuXHRcdFx0ZXZlbnRDYXRlZ29yeTogJ0RvbmF0aW9uJyxcblx0XHRcdGV2ZW50QWN0aW9uOiBhY3Rpb24sXG5cdFx0XHRldmVudFZhbHVlOiBhbW91bnRcblx0XHR9KTtcblx0fSxcblxuXG5cblx0Zm9yX2VhY2g6IGZ1bmN0aW9uKGxpc3QsIGNhbGxiYWNrKSB7XG5cdFx0Zm9yKHZhciB4PTAsIGw9bGlzdC5sZW5ndGg7IHg8bDsgeCsrKXtcblx0XHRcdGNhbGxiYWNrKGxpc3RbeF0sIHgpO1xuXHRcdH1cblx0fSxcblxuXG5cblx0aW5pdF9hbmFseXRpY3M6IGZ1bmN0aW9uKCl7XG5cdFx0KGZ1bmN0aW9uKGkscyxvLGcscixhLG0pe2lbJ0dvb2dsZUFuYWx5dGljc09iamVjdCddPXI7aVtyXT1pW3JdfHxmdW5jdGlvbigpe1xuXHRcdChpW3JdLnE9aVtyXS5xfHxbXSkucHVzaChhcmd1bWVudHMpfSxpW3JdLmw9MSpuZXcgRGF0ZSgpO2E9cy5jcmVhdGVFbGVtZW50KG8pLFxuXHRcdG09cy5nZXRFbGVtZW50c0J5VGFnTmFtZShvKVswXTthLmFzeW5jPTE7YS5zcmM9ZzttLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKGEsbSlcblx0XHR9KSh3aW5kb3csZG9jdW1lbnQsJ3NjcmlwdCcsJ2h0dHBzOi8vd3d3Lmdvb2dsZS1hbmFseXRpY3MuY29tL2FuYWx5dGljcy5qcycsJ2dhJyk7XG5cdFx0XG5cdFx0Z2EoJ2NyZWF0ZScsICdVQS04MjA5NzU0My0xJywgJ2F1dG8nKTtcblx0XHRnYSgnc2VuZCcsICdwYWdldmlldycpO1xuXHR9LFxuXG5cblxuXHRpbml0X3N0cmlwZTogZnVuY3Rpb24oKXtcblx0XHR2YXIgZG9uYXRlX2J0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdkb25hdGVfYnV0dG9uJyk7XG5cdFx0dmFyIGRvbmF0aW9uX2FtdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdkb25hdGlvbl9hbW91bnQnKTtcblx0XHR2YXIgdGhhbmtfeW91ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NvbnRyaWJ1dGlvbl90aGFua195b3UnKTtcblx0XHR2YXIgdGhhbmtfeW91X2Nsb3NlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2Nsb3NlX3RoYW5rX3lvdV9idXR0b24nKTtcblx0XHRcblx0XHRpZih3aW5kb3cuU3RyaXBlQ2hlY2tvdXQpIHtcblx0XHRcdHZhciBoYW5kbGVyID0gU3RyaXBlQ2hlY2tvdXQuY29uZmlndXJlKHtcblx0XHRcdFx0a2V5OiAncGtfdGVzdF9IeVNBN2FoR2tsZUhkZ2ZzQjZBWlRkeHonLFxuXHRcdFx0XHRpbWFnZTogJ2h0dHBzOi8vbWF5ZmllbGRzaW5nZXJzLm9yZy9hcHBsZS10b3VjaC1pY29uLnBuZycsXG5cdFx0XHRcdGxvY2FsZTogJ2F1dG8nLFxuXHRcdFx0XHR0b2tlbjogZnVuY3Rpb24odG9rZW4pIHtcblx0XHRcdFx0XHRkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdbZGF0YS1hbW91bnRdJykuaW5uZXJIVE1MID0gZG9uYXRpb25fYW10LnZhbHVlO1xuXHRcdFx0XHRcdHRoYW5rX3lvdS5jbGFzc0xpc3QuYWRkKCd2aXNpYmxlJyk7XG5cdFx0XHRcdFx0bWFpbi5kb25hdGlvbkFuYWx5dGljcygncGFpZCcsIGRvbmF0aW9uX2FtdC52YWx1ZSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdFxuXHRcdFx0ZG9uYXRlX2J0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0Ly8gT3BlbiBDaGVja291dCB3aXRoIGZ1cnRoZXIgb3B0aW9uczpcblx0XHRcdFx0aGFuZGxlci5vcGVuKHtcblx0XHRcdFx0XHRuYW1lOiAnTWF5ZmllbGQgU2luZ2VycyBEb25hdGlvbicsXG5cdFx0XHRcdFx0ZGVzY3JpcHRpb246ICdDaGFyaXRhYmxlIENvbnRyaWJ1dGlvbicsXG5cdFx0XHRcdFx0YW1vdW50OiBkb25hdGlvbl9hbXQudmFsdWUgKiAxMDBcblx0XHRcdFx0fSk7XG5cdFx0XHRcdG1haW4uZG9uYXRpb25BbmFseXRpY3MoJ3RyaWdnZXJlZCcsIGRvbmF0aW9uX2FtdC52YWx1ZSk7XG5cdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdH0pO1xuXHRcdFx0XG5cdFx0XHR0aGFua195b3VfY2xvc2UuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbihlKSB7IHRoYW5rX3lvdS5jbGFzc0xpc3QucmVtb3ZlKCd2aXNpYmxlJyk7IH0pXG5cdFx0XHRcdFxuXHRcdFx0Ly9DbG9zZSBDaGVja291dCBvbiBwYWdlIG5hdmlnYXRpb246XG5cdFx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncG9wc3RhdGUnLCBmdW5jdGlvbigpIHtcblx0XHRcdFx0aGFuZGxlci5jbG9zZSgpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHR9LFxuXG5cblxuXHRsb2FkX3BsYXlsaXN0czogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5hamF4KCcuLi9hdWRpby9saWJyYXJ5LnhtbCcsIGZ1bmN0aW9uKHBsYXlsaXN0cyl7XG5cdFx0XHRcblx0XHRcdHZhciBwYXJzZXIgPSBuZXcgRE9NUGFyc2VyKCk7XG5cdFx0XHR2YXIgeG1sID0gcGFyc2VyLnBhcnNlRnJvbVN0cmluZyhwbGF5bGlzdHMsXCJ0ZXh0L3htbFwiKTtcblx0XHRcdFxuXHRcdFx0dmFyIGVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2F1ZGlvX3BsYXllcicpO1xuXHRcdFx0dmFyIGpzb24gPSBtYWluLnhtbF90b19qc29uKHhtbCk7XG5cdFx0XHRcblx0XHRcdE11c2ljUGxheWVyID0gbmV3IFBsYXllclVJKGVsLCBmYWxzZSwganNvbik7XG5cdFx0XHRNdXNpY1BsYXllci5wb3B1bGF0ZUxpc3RzKCk7XG5cdFx0fSk7XG5cdH0sXG5cblxuXG5cdHhtbF90b19qc29uOiBmdW5jdGlvbih4bWwpIHtcblx0XHRcblx0XHR2YXIgcmVzcG9uc2UgPSBbXTtcblx0XHRcblx0XHR2YXIgcGxheWxpc3RzID0geG1sLmdldEVsZW1lbnRzQnlUYWdOYW1lKCdwbGF5bGlzdCcpO1xuXHRcdFxuXHRcdGZvcih2YXIgeD0wLCBsPXBsYXlsaXN0cy5sZW5ndGg7IHg8bDsgeCsrKSB7XG5cdFx0XHRcblx0XHRcdHZhciBjcnQgPSBwbGF5bGlzdHNbeF07XG5cdFx0XHRcblx0XHRcdHZhciBwbGF5bGlzdCA9IHtcblx0XHRcdFx0bmFtZTogY3J0LmdldEF0dHJpYnV0ZSgnbmFtZScpLFxuXHRcdFx0XHRkYXRlOiBjcnQuZ2V0QXR0cmlidXRlKCdkYXRlJyksXG5cdFx0XHRcdHBhdGg6IGNydC5nZXRBdHRyaWJ1dGUoJ2ZvbGRlcicpLFxuXHRcdFx0XHRzb25nczogW11cblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0dmFyIHhtbF9zb25ncyA9IGNydC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnc29uZycpO1xuXHRcdFx0XG5cdFx0XHRmb3IodmFyIGk9MCwgbGVuPXhtbF9zb25ncy5sZW5ndGg7IGk8bGVuOyBpKyspIHtcblx0XHRcdFx0dmFyIGZpbGVuYW1lID0geG1sX3NvbmdzW2ldLnF1ZXJ5U2VsZWN0b3IoJ2ZpbGVuYW1lJykuY2hpbGROb2Rlc1swXS5ub2RlVmFsdWVcblx0XHRcdFx0XG5cdFx0XHRcdHBsYXlsaXN0LnNvbmdzLnB1c2goe1xuXHRcdFx0XHRcdHNob3c6IHhtbF9zb25nc1tpXS5nZXRBdHRyaWJ1dGUoJ3Nob3dfaW5fcGxheWVyJyksXG5cdFx0XHRcdFx0dGl0bGU6IHhtbF9zb25nc1tpXS5xdWVyeVNlbGVjdG9yKCd0aXRsZScpLmNoaWxkTm9kZXNbMF0ubm9kZVZhbHVlLFxuXHRcdFx0XHRcdGZpbGVuYW1lOiBmaWxlbmFtZSxcblx0XHRcdFx0XHRmdWxscGF0aDogJy4uL2F1ZGlvLycgKyBwbGF5bGlzdC5wYXRoICsgJy8nICsgZmlsZW5hbWVcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdHJlc3BvbnNlLnB1c2gocGxheWxpc3QpO1xuXHRcdH1cblx0XHRcblx0XHRyZXR1cm4gcmVzcG9uc2U7XHRcdFxuXHR9XG59O1xuXG5tYWluLmluaXQoKTsiLCIndXNlIHN0cmljdCc7XG5cblxudmFyIFNvbmcgPSByZXF1aXJlKCcuL1NvbmcnKTtcblxuZnVuY3Rpb24gUGxheWVyVUkocGFyZW50X2VsLCBzaG93X2FsbCwgcGxheWxpc3RzKSB7XG5cdHRoaXMuZWwgPSBwYXJlbnRfZWw7XG5cdHRoaXMuc2hvd19hbGwgPSBzaG93X2FsbDtcblx0dGhpcy5saXN0X3VsID0gdGhpcy5lbC5xdWVyeVNlbGVjdG9yKCdbZGF0YS1wbGF5bGlzdC1jb250YWluZXJdJyk7XG5cdHRoaXMuc29uZ3NfZGl2ID0gdGhpcy5lbC5xdWVyeVNlbGVjdG9yKCdbZGF0YS1zb25nLWNvbnRhaW5lcl0nKTtcblx0XG5cdHRoaXMucGxheWxpc3RzID0gcGxheWxpc3RzO1xuXG5cdHRoaXMuY3VyX2xpc3QgPSAwO1xuXHR0aGlzLmN1cl9zb25nID0gW107XG59XG5cbnZhciBwcm90byA9IFBsYXllclVJLnByb3RvdHlwZTtcblxuXG5cbi8vIOKAouKAouKAouKAouKAouKAouKAouKAouKAouKAolxuLy8gUFVCTElDIE1FVEhPRFNcbi8vIOKAouKAouKAouKAouKAouKAouKAouKAouKAouKAolxuXG5wcm90by5wb3B1bGF0ZUxpc3RzID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMubGlzdF91bC5pbm5lckhUTUwgPSAnJztcblx0XG5cdGZvcih2YXIgeD0wLCBsPXRoaXMucGxheWxpc3RzLmxlbmd0aDsgeDxsOyB4KyspIHtcblx0XHR2YXIgbGlzdCA9IHRoaXMucGxheWxpc3RzW3hdO1xuXHRcdHZhciBsaSA9IHRoaXMuX2dldExpc3RMaShsaXN0LCB4KTtcblx0XHR0aGlzLmxpc3RfdWwuYXBwZW5kQ2hpbGQobGkpO1xuXHRcdFxuXHRcdHRoaXMucG9wdWxhdGVTb25ncyh4KTtcblx0fVxufTtcblxuXG5cbnByb3RvLnBvcHVsYXRlU29uZ3MgPSBmdW5jdGlvbihsaXN0X2lkeCkge1xuXHR2YXIgdWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd1bCcpO1xuXHR1bC5jbGFzc0xpc3QuYWRkKCdwbGF5bGlzdCcpO1xuXHR1bC5zZXRBdHRyaWJ1dGUoJ2RhdGEtcGxheWxpc3QnLCBsaXN0X2lkeCk7XG5cdFxuXHRpZih0aGlzLmN1cl9saXN0PT09bGlzdF9pZHgpIHtcblx0XHR1bC5jbGFzc0xpc3QuYWRkKCdzZWxlY3RlZCcpO1xuXHR9XG5cdFxuXHR2YXIgc29uZ19saXN0ID0gdGhpcy5wbGF5bGlzdHNbbGlzdF9pZHhdLnNvbmdzO1xuXHRcblx0Zm9yKHZhciB4PTAsIGw9c29uZ19saXN0Lmxlbmd0aDsgeDxsOyB4KyspIHtcblx0XHR2YXIgc29uZyA9IHNvbmdfbGlzdFt4XTtcblx0XHRcblx0XHRpZih0aGlzLnNob3dfYWxsIHx8IHNvbmcuc2hvdz09PSd0cnVlJyl7XG5cdFx0XHR2YXIgbGkgPSB0aGlzLl9nZXRTb25nTGkoc29uZywgeCk7XG5cdFx0XHR1bC5hcHBlbmRDaGlsZChsaSk7XG5cdFx0fVxuXHR9XG5cdFxuXHR0aGlzLnNvbmdzX2Rpdi5hcHBlbmRDaGlsZCh1bCk7XG59O1xuXG5cbi8vIOKAouKAouKAouKAouKAouKAouKAouKAouKAouKAolxuLy8gUFJJVkFURSBNRVRIT0RTXG4vLyDigKLigKLigKLigKLigKLigKLigKLigKLigKLigKJcblxucHJvdG8uX2FkdmFuY2VQbGF5bGlzdCA9IGZ1bmN0aW9uKCl7XG5cdGlmICh0aGlzLmN1cl9zb25nWzFdIDwgdGhpcy5wbGF5bGlzdHNbdGhpcy5jdXJfc29uZ1swXV0uc29uZ3MubGVuZ3RoLTEpIHtcblx0XHR0aGlzLmN1cl9zb25nWzFdKys7XG5cdFx0XG5cdFx0dmFyIHNvbmcgPSB0aGlzLnBsYXlsaXN0c1t0aGlzLmN1cl9zb25nWzBdXS5zb25nc1t0aGlzLmN1cl9zb25nWzFdXTtcblx0XHRcblx0XHRpZih0aGlzLnNob3dfYWxsIHx8IHNvbmcuc2hvdz09PSd0cnVlJykge1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9hZHZhbmNlUGxheWxpc3QoKTtcblx0XHR9XG5cdFx0XG5cdH0gZWxzZSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG59O1xuXG5cblxucHJvdG8uX2NsZWFyQ2xhc3NlcyA9IGZ1bmN0aW9uKHNlbGVjdG9yLCBjbGFzc0FycmF5KSB7XG5cdHZhciBlbHMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcblx0Zm9yKHZhciB4PTAsIGw9ZWxzLmxlbmd0aDsgeDxsOyB4Kyspe1xuXHRcdGZvcih2YXIgaT0wLCBsZW49Y2xhc3NBcnJheS5sZW5ndGg7IGk8bGVuOyBpKyspIHtcblx0XHRcdGVsc1t4XS5jbGFzc0xpc3QucmVtb3ZlKGNsYXNzQXJyYXlbaV0pO1xuXHRcdH1cblx0fVxufTtcblxuXG5cbnByb3RvLl9nZXRMaXN0TGkgPSBmdW5jdGlvbihsaXN0LCBpZHgpIHtcblx0dmFyIGxpID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKTtcblx0bGkuc2V0QXR0cmlidXRlKCdkYXRhLXBsYXlsaXN0LXRyaWdnZXInLCBpZHgpO1xuXHRcblx0aWYoaWR4PT10aGlzLmN1cl9saXN0KXtcblx0XHRsaS5jbGFzc0xpc3QuYWRkKCdzZWxlY3RlZCcpO1xuXHR9XG5cdFxuXHR2YXIgc3BhbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcblx0dmFyIHR4dCA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGxpc3QubmFtZSk7XG5cdHNwYW4uYXBwZW5kQ2hpbGQodHh0KTtcblx0bGkuYXBwZW5kQ2hpbGQoc3Bhbik7XG5cdFxuXHR2YXIgcGFyZW50ID0gdGhpcztcblx0XG5cdGxpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuXHRcdHBhcmVudC5fbGlzdEJ0bkNsaWNrKHRoaXMsIHBhcmVudCk7XG5cdH0pO1xuXHRcblx0cmV0dXJuIGxpO1xufTtcblxuXG5cbnByb3RvLl9nZXRTb25nTGkgPSBmdW5jdGlvbihzb25nLCBpZHgpIHtcblx0dmFyIGxpID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKTtcblx0bGkuc2V0QXR0cmlidXRlKCdkYXRhLXNvbmcnLCBpZHgpO1xuXHRcblx0dmFyIHNwYW4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG5cdHZhciB0eHQgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShzb25nLnRpdGxlKTtcblx0dmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRkaXYuY2xhc3NMaXN0LmFkZCgncHJvZ3Jlc3NfYmFyJyk7XG5cdHNwYW4uYXBwZW5kQ2hpbGQodHh0KTtcblx0bGkuYXBwZW5kQ2hpbGQoc3Bhbik7XG5cdGxpLmFwcGVuZENoaWxkKGRpdik7XG5cdFxuXHR2YXIgcGFyZW50ID0gdGhpcztcblx0XG5cdGxpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oZSl7XG5cdFx0cGFyZW50Ll9zb25nQnRuQ2xpY2sodGhpcywgcGFyZW50KTtcblx0fSk7XG5cdFxuXHRyZXR1cm4gbGk7XG59O1xuXG5cblxucHJvdG8uX2xpc3RCdG5DbGljayA9IGZ1bmN0aW9uKGJ0biwgcGFyZW50KSB7XG5cdHBhcmVudC5fY2xlYXJDbGFzc2VzKCdbZGF0YS1wbGF5bGlzdC10cmlnZ2VyXScsIFsnc2VsZWN0ZWQnXSk7XG5cdHBhcmVudC5fY2xlYXJDbGFzc2VzKCcucGxheWxpc3QnLCBbJ3NlbGVjdGVkJ10pO1xuXHRcblx0cGFyZW50LmN1cl9saXN0ID0gYnRuLmdldEF0dHJpYnV0ZSgnZGF0YS1wbGF5bGlzdC10cmlnZ2VyJyk7XG5cblx0YnRuLmNsYXNzTGlzdC5hZGQoJ3NlbGVjdGVkJyk7XG5cdGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5wbGF5bGlzdFtkYXRhLXBsYXlsaXN0PVwiJysgcGFyZW50LmN1cl9saXN0ICsnXCJdJykuY2xhc3NMaXN0LmFkZCgnc2VsZWN0ZWQnKTtcbn07XG5cblxuXG5wcm90by5fc29uZ0FuYWx5dGljcyA9IGZ1bmN0aW9uKHNvbmdfY29vcmQsIGFjdGlvbil7XG5cdGlmKHdpbmRvdy5nYSkge1xuXHRcdGdhKCdzZW5kJywge1xuXHRcdFx0aGl0VHlwZTogJ2V2ZW50Jyxcblx0XHRcdGV2ZW50Q2F0ZWdvcnk6ICdNdXNpYyBQbGF5ZXInLFxuXHRcdFx0ZXZlbnRBY3Rpb246IGFjdGlvbixcblx0XHRcdGV2ZW50TGFiZWw6IHRoaXMucGxheWxpc3RzW3NvbmdfY29vcmRbMF1dLnNvbmdzW3NvbmdfY29vcmRbMV1dLnRpdGxlLFxuXHRcdFx0ZXZlbnRWYWx1ZTogc29uZ19jb29yZFswXVxuXHRcdH0pO1xuXHR9XG59O1xuXG5cblxucHJvdG8uX3NvbmdCdG5DbGljayA9IGZ1bmN0aW9uKGJ0biwgcGFyZW50KSB7XG5cdHZhciBpZHggPSBidG4uZ2V0QXR0cmlidXRlKCdkYXRhLXNvbmcnKTtcblx0dmFyIHByb2dyZXNzX2JhciA9IGJ0bi5xdWVyeVNlbGVjdG9yKCcucHJvZ3Jlc3NfYmFyJyk7XG5cdHZhciBzb25nID0gcGFyZW50LnBsYXlsaXN0c1twYXJlbnQuY3VyX2xpc3RdLnNvbmdzW2lkeF07XG5cdFxuXHRpZihzb25nLmF1ZGlvID09PSB1bmRlZmluZWQpe1xuXHRcdHNvbmcuYXVkaW8gPSBuZXcgU29uZyhzb25nLmZ1bGxwYXRoKTtcblx0fVxuXHRcblx0aWYoYnRuLmNsYXNzTGlzdC5jb250YWlucygncGF1c2VkJykpeyAvLyB1bnBhdXNlIHNvbmdcblx0XHRcblx0XHRzb25nLmF1ZGlvLnBsYXkoKTtcblx0XHRidG4uY2xhc3NMaXN0LnJlbW92ZSgncGF1c2VkJyk7XG5cdFx0dGhpcy5fdXBkYXRlUGxheWhlYWQocHJvZ3Jlc3NfYmFyLCBzb25nLmF1ZGlvKTtcblx0XHRcblx0fSBlbHNlIHtcblx0XHRpZihidG4uY2xhc3NMaXN0LmNvbnRhaW5zKCdwbGF5aW5nJykpeyAvLyBwYXVzZSBzb25nXG5cdFx0XHRcblx0XHRcdHNvbmcuYXVkaW8ucGF1c2UoKTtcblx0XHRcdGJ0bi5jbGFzc0xpc3QuYWRkKCdwYXVzZWQnKTtcblx0XHRcdGNhbmNlbEFuaW1hdGlvbkZyYW1lKHRoaXMuYW5pbWF0b3IpO1xuXHRcdFx0XG5cdFx0fSBlbHNlIHsgLy8gcGxheSBuZXcgc29uZ1xuXHRcdFx0XG5cdFx0XHRpZihwYXJlbnQuY3VyX3NvbmcubGVuZ3RoPjEpe1xuXHRcdFx0XHRwYXJlbnQucGxheWxpc3RzW3RoaXMuY3VyX3NvbmdbMF1dLnNvbmdzW3RoaXMuY3VyX3NvbmdbMV1dLmF1ZGlvLnN0b3AoKTtcblx0XHRcdFx0Y2FuY2VsQW5pbWF0aW9uRnJhbWUodGhpcy5hbmltYXRvcik7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdHBhcmVudC5fY2xlYXJDbGFzc2VzKCdbZGF0YS1zb25nXScsIFsncGxheWluZycsICdwYXVzZWQnXSk7XG5cdFx0XHRcblx0XHRcdHBhcmVudC5jdXJfc29uZyA9IFtwYXJlbnQuY3VyX2xpc3QsIGlkeF07XG5cdFx0XHRcblx0XHRcdHNvbmcuYXVkaW8ucGxheSgpO1xuXHRcdFx0XG5cdFx0XHR0aGlzLl9zb25nQW5hbHl0aWNzKHBhcmVudC5jdXJfc29uZywgJ3BsYXknKTtcblx0XHRcdFxuXHRcdFx0YnRuLmNsYXNzTGlzdC5hZGQoJ3BsYXlpbmcnKTtcblx0XHRcdHRoaXMuX3VwZGF0ZVBsYXloZWFkKHByb2dyZXNzX2Jhciwgc29uZy5hdWRpbyk7XG5cdFx0fVxuXHR9XG59XG5cblxuXG5wcm90by5fc29uZ0VuZGVkID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMuX3NvbmdBbmFseXRpY3ModGhpcy5jdXJfc29uZywgJ2NvbXBsZXRlJyk7XG5cdFxuXHR0aGlzLl9jbGVhckNsYXNzZXMoJ1tkYXRhLXNvbmddJywgWydwbGF5aW5nJywgJ3BhdXNlZCddKTtcblx0XG5cdGlmICh0aGlzLl9hZHZhbmNlUGxheWxpc3QoKSkge1xuXHRcdHRoaXMuX3NvbmdCdG5DbGljayh0aGlzLnNvbmdzX2Rpdi5xdWVyeVNlbGVjdG9yKCdbZGF0YS1wbGF5bGlzdD1cIicrIHRoaXMuY3VyX3NvbmdbMF0gKydcIl0gW2RhdGEtc29uZz1cIicrIHRoaXMuY3VyX3NvbmdbMV0gKydcIl0nKSwgdGhpcyk7XG5cdH1cbn07XG5cblxuXG5wcm90by5fdXBkYXRlUGxheWhlYWQgPSBmdW5jdGlvbihlbCwgc29uZykge1xuXHRpZihzb25nLmVuZGVkKCkpIHtcblx0XHRjYW5jZWxBbmltYXRpb25GcmFtZSh0aGlzLmFuaW1hdG9yKTtcblx0XHR0aGlzLl9zb25nRW5kZWQoKTtcblx0fSBlbHNlIHtcblx0XHRlbC5zdHlsZS53aWR0aCA9IHNvbmcuZ2V0UGVyY2VudFBsYXllZCgpICsgJyUnO1xuXHRcdFxuXHRcdHRoaXMuYW5pbWF0b3IgPSByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZnVuY3Rpb24oKXtcblx0XHRcdHRoaXMuX3VwZGF0ZVBsYXloZWFkKGVsLCBzb25nKTtcblx0XHR9LmJpbmQodGhpcykpO1xuXHRcblx0fVxufTtcblxuXG5cbm1vZHVsZS5leHBvcnRzID0gUGxheWVyVUk7XG5cblxuXG5cbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gU29uZyh1cmwpIHtcblx0dGhpcy5zb25nID0gbmV3IEF1ZGlvKHVybCk7XG59XG5cbnZhciBwcm90byA9IFNvbmcucHJvdG90eXBlO1xuXG5cblxuLy8g4oCi4oCi4oCi4oCi4oCi4oCi4oCi4oCi4oCi4oCiXG4vLyBQVUJMSUMgTUVUSE9EU1xuLy8g4oCi4oCi4oCi4oCi4oCi4oCi4oCi4oCi4oCi4oCiXG5cbnByb3RvLmVuZGVkID0gZnVuY3Rpb24oKXtcblx0cmV0dXJuIHRoaXMuc29uZy5lbmRlZDtcbn07XG5cblxuXG5wcm90by5nZXRQZXJjZW50UGxheWVkID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLnNvbmcuY3VycmVudFRpbWUgLyB0aGlzLnNvbmcuZHVyYXRpb24gKiAxMDA7XG59O1xuXG5cblxucHJvdG8ucGF1c2UgPSBmdW5jdGlvbigpIHtcblx0dGhpcy5zb25nLnBhdXNlKCk7XG59O1xuXG5cblxucHJvdG8ucGxheSA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLnNvbmcucGxheSgpO1xufTtcblxuXG5cbnByb3RvLnN0b3AgPSBmdW5jdGlvbigpIHtcblx0dGhpcy5zb25nLnBhdXNlKCk7XG5cdHRoaXMuc29uZy5jdXJyZW50VGltZSA9IDA7XG59O1xuXG5cblxubW9kdWxlLmV4cG9ydHMgPSBTb25nO1x0Il19
