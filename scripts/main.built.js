(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var PlayerUI = require('./modules/PlayerUI');
var MusicPlayer;

var main = {
	
	init: function(){
		this.init_analytics();
		this.init_stripe();
		
		this.alumni_section();
		this.load_playlists();
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
		var handler = StripeCheckout.configure({
			key: 'pk_test_HySA7ahGkleHdgfsB6AZTdxz',
			image: 'https://s3.amazonaws.com/stripe-uploads/acct_18cAXcFiyAeAkygfmerchant-icon-1469697187614-image.png',
			locale: 'auto',
			token: function(token) {
				// function to call when transaction completes
				// You can access the token ID with `token.id`.
				// Get the token ID to your server-side code for use.
			}
		});
	
		var donate_btn = document.getElementById('donate_button');
		var donation_amt = document.getElementById('donation_amount');
	
		donate_btn.addEventListener('click', function(e) {
			// Open Checkout with further options:
			handler.open({
				name: 'Mayfield Singers Donation',
				description: 'Charitable Contribution',
				amount: donation_amt.value * 100
			});
			e.preventDefault();
		});
			
		//Close Checkout on page navigation:
		window.addEventListener('popstate', function() {
			handler.close();
		});
	},



	load_playlists: function() {
		this.ajax('../audio/library.xml', function(playlists){
			
			var parser = new DOMParser();
			var xml = parser.parseFromString(playlists,"text/xml");
			
			var el = document.getElementById('audio_player');
			var json = main.xml_to_json(xml);
			
			MusicPlayer = new PlayerUI(el, json);
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

function PlayerUI(parent_el, playlists) {
	this.el = parent_el;
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
		var li = this._getSongLi(song, x);
		ul.appendChild(li);
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



proto._songEnded = function() {
	this._clearClasses('[data-song]', ['playing', 'paused']);
	
	if(this.cur_song[1] < this.playlists[this.cur_song[0]].songs.length-1) {
		this.cur_song[1]++;
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvanMvbWFpbi5qcyIsInNyYy9qcy9tb2R1bGVzL1BsYXllclVJLmpzIiwic3JjL2pzL21vZHVsZXMvU29uZy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCc7XG5cbnZhciBQbGF5ZXJVSSA9IHJlcXVpcmUoJy4vbW9kdWxlcy9QbGF5ZXJVSScpO1xudmFyIE11c2ljUGxheWVyO1xuXG52YXIgbWFpbiA9IHtcblx0XG5cdGluaXQ6IGZ1bmN0aW9uKCl7XG5cdFx0dGhpcy5pbml0X2FuYWx5dGljcygpO1xuXHRcdHRoaXMuaW5pdF9zdHJpcGUoKTtcblx0XHRcblx0XHR0aGlzLmFsdW1uaV9zZWN0aW9uKCk7XG5cdFx0dGhpcy5sb2FkX3BsYXlsaXN0cygpO1xuXHR9LFxuXHRcblx0XG5cdFxuXHRhamF4OiBmdW5jdGlvbih1cmwsIGNhbGxiYWNrKXtcblx0XHRpZih3aW5kb3cuWE1MSHR0cFJlcXVlc3Qpe1xuXHRcdFx0dmFyIGFqeCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXHRcdH1lbHNle1xuXHRcdFx0dmFyIGFqeCA9IG5ldyBBY3RpdmVYT2JqZWN0KFwiTWljcm9zb2Z0LlhNTEhUVFBcIik7XG5cdFx0fVxuXHRcdFxuXHRcdGFqeC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpIHtcblx0XHRcdGlmKGFqeC5yZWFkeVN0YXRlPT00ICYmIGFqeC5zdGF0dXM9PTIwMCl7XG5cdFx0XHRcdGNhbGxiYWNrKGFqeC5yZXNwb25zZVRleHQpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRcblx0XHRhangub3BlbihcIkdFVFwiLCB1cmwsIHRydWUpO1xuXHRcdGFqeC5zZW5kKCk7XG5cdH0sXG5cdFxuXHRcblx0XG5cdGFsdW1uaV9zZWN0aW9uOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgYWx1bW5pX2ZyYW1lID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmFsdW1uaScpO1xuXHRcdHZhciBhbHVtbmlfYnRuID0gYWx1bW5pX2ZyYW1lLnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLWFjdGlvbj1hbHVtbmktdG9nZ2xlXScpO1xuXHRcdFxuXHRcdGFsdW1uaV9idG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpe1xuXHRcdFx0YWx1bW5pX2ZyYW1lLmNsYXNzTGlzdC50b2dnbGUoJ2V4cGFuZCcpO1xuXHRcdH0pO1xuXHR9LFxuXG5cblxuXHRmb3JfZWFjaDogZnVuY3Rpb24obGlzdCwgY2FsbGJhY2spIHtcblx0XHRmb3IodmFyIHg9MCwgbD1saXN0Lmxlbmd0aDsgeDxsOyB4Kyspe1xuXHRcdFx0Y2FsbGJhY2sobGlzdFt4XSwgeCk7XG5cdFx0fVxuXHR9LFxuXG5cblxuXHRpbml0X2FuYWx5dGljczogZnVuY3Rpb24oKXtcblx0XHQoZnVuY3Rpb24oaSxzLG8sZyxyLGEsbSl7aVsnR29vZ2xlQW5hbHl0aWNzT2JqZWN0J109cjtpW3JdPWlbcl18fGZ1bmN0aW9uKCl7XG5cdFx0KGlbcl0ucT1pW3JdLnF8fFtdKS5wdXNoKGFyZ3VtZW50cyl9LGlbcl0ubD0xKm5ldyBEYXRlKCk7YT1zLmNyZWF0ZUVsZW1lbnQobyksXG5cdFx0bT1zLmdldEVsZW1lbnRzQnlUYWdOYW1lKG8pWzBdO2EuYXN5bmM9MTthLnNyYz1nO20ucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoYSxtKVxuXHRcdH0pKHdpbmRvdyxkb2N1bWVudCwnc2NyaXB0JywnaHR0cHM6Ly93d3cuZ29vZ2xlLWFuYWx5dGljcy5jb20vYW5hbHl0aWNzLmpzJywnZ2EnKTtcblx0XHRcblx0XHRnYSgnY3JlYXRlJywgJ1VBLTgyMDk3NTQzLTEnLCAnYXV0bycpO1xuXHRcdGdhKCdzZW5kJywgJ3BhZ2V2aWV3Jyk7XG5cdH0sXG5cblxuXG5cdGluaXRfc3RyaXBlOiBmdW5jdGlvbigpe1xuXHRcdHZhciBoYW5kbGVyID0gU3RyaXBlQ2hlY2tvdXQuY29uZmlndXJlKHtcblx0XHRcdGtleTogJ3BrX3Rlc3RfSHlTQTdhaEdrbGVIZGdmc0I2QVpUZHh6Jyxcblx0XHRcdGltYWdlOiAnaHR0cHM6Ly9zMy5hbWF6b25hd3MuY29tL3N0cmlwZS11cGxvYWRzL2FjY3RfMThjQVhjRml5QWVBa3lnZm1lcmNoYW50LWljb24tMTQ2OTY5NzE4NzYxNC1pbWFnZS5wbmcnLFxuXHRcdFx0bG9jYWxlOiAnYXV0bycsXG5cdFx0XHR0b2tlbjogZnVuY3Rpb24odG9rZW4pIHtcblx0XHRcdFx0Ly8gZnVuY3Rpb24gdG8gY2FsbCB3aGVuIHRyYW5zYWN0aW9uIGNvbXBsZXRlc1xuXHRcdFx0XHQvLyBZb3UgY2FuIGFjY2VzcyB0aGUgdG9rZW4gSUQgd2l0aCBgdG9rZW4uaWRgLlxuXHRcdFx0XHQvLyBHZXQgdGhlIHRva2VuIElEIHRvIHlvdXIgc2VydmVyLXNpZGUgY29kZSBmb3IgdXNlLlxuXHRcdFx0fVxuXHRcdH0pO1xuXHRcblx0XHR2YXIgZG9uYXRlX2J0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdkb25hdGVfYnV0dG9uJyk7XG5cdFx0dmFyIGRvbmF0aW9uX2FtdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdkb25hdGlvbl9hbW91bnQnKTtcblx0XG5cdFx0ZG9uYXRlX2J0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcblx0XHRcdC8vIE9wZW4gQ2hlY2tvdXQgd2l0aCBmdXJ0aGVyIG9wdGlvbnM6XG5cdFx0XHRoYW5kbGVyLm9wZW4oe1xuXHRcdFx0XHRuYW1lOiAnTWF5ZmllbGQgU2luZ2VycyBEb25hdGlvbicsXG5cdFx0XHRcdGRlc2NyaXB0aW9uOiAnQ2hhcml0YWJsZSBDb250cmlidXRpb24nLFxuXHRcdFx0XHRhbW91bnQ6IGRvbmF0aW9uX2FtdC52YWx1ZSAqIDEwMFxuXHRcdFx0fSk7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0fSk7XG5cdFx0XHRcblx0XHQvL0Nsb3NlIENoZWNrb3V0IG9uIHBhZ2UgbmF2aWdhdGlvbjpcblx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncG9wc3RhdGUnLCBmdW5jdGlvbigpIHtcblx0XHRcdGhhbmRsZXIuY2xvc2UoKTtcblx0XHR9KTtcblx0fSxcblxuXG5cblx0bG9hZF9wbGF5bGlzdHM6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuYWpheCgnLi4vYXVkaW8vbGlicmFyeS54bWwnLCBmdW5jdGlvbihwbGF5bGlzdHMpe1xuXHRcdFx0XG5cdFx0XHR2YXIgcGFyc2VyID0gbmV3IERPTVBhcnNlcigpO1xuXHRcdFx0dmFyIHhtbCA9IHBhcnNlci5wYXJzZUZyb21TdHJpbmcocGxheWxpc3RzLFwidGV4dC94bWxcIik7XG5cdFx0XHRcblx0XHRcdHZhciBlbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhdWRpb19wbGF5ZXInKTtcblx0XHRcdHZhciBqc29uID0gbWFpbi54bWxfdG9fanNvbih4bWwpO1xuXHRcdFx0XG5cdFx0XHRNdXNpY1BsYXllciA9IG5ldyBQbGF5ZXJVSShlbCwganNvbik7XG5cdFx0XHRNdXNpY1BsYXllci5wb3B1bGF0ZUxpc3RzKCk7XG5cdFx0fSk7XG5cdH0sXG5cblxuXG5cdHhtbF90b19qc29uOiBmdW5jdGlvbih4bWwpIHtcblx0XHRcblx0XHR2YXIgcmVzcG9uc2UgPSBbXTtcblx0XHRcblx0XHR2YXIgcGxheWxpc3RzID0geG1sLmdldEVsZW1lbnRzQnlUYWdOYW1lKCdwbGF5bGlzdCcpO1xuXHRcdFxuXHRcdGZvcih2YXIgeD0wLCBsPXBsYXlsaXN0cy5sZW5ndGg7IHg8bDsgeCsrKSB7XG5cdFx0XHRcblx0XHRcdHZhciBjcnQgPSBwbGF5bGlzdHNbeF07XG5cdFx0XHRcblx0XHRcdHZhciBwbGF5bGlzdCA9IHtcblx0XHRcdFx0bmFtZTogY3J0LmdldEF0dHJpYnV0ZSgnbmFtZScpLFxuXHRcdFx0XHRkYXRlOiBjcnQuZ2V0QXR0cmlidXRlKCdkYXRlJyksXG5cdFx0XHRcdHBhdGg6IGNydC5nZXRBdHRyaWJ1dGUoJ2ZvbGRlcicpLFxuXHRcdFx0XHRzb25nczogW11cblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0dmFyIHhtbF9zb25ncyA9IGNydC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnc29uZycpO1xuXHRcdFx0XG5cdFx0XHRmb3IodmFyIGk9MCwgbGVuPXhtbF9zb25ncy5sZW5ndGg7IGk8bGVuOyBpKyspIHtcblx0XHRcdFx0dmFyIGZpbGVuYW1lID0geG1sX3NvbmdzW2ldLnF1ZXJ5U2VsZWN0b3IoJ2ZpbGVuYW1lJykuY2hpbGROb2Rlc1swXS5ub2RlVmFsdWVcblx0XHRcdFx0XG5cdFx0XHRcdHBsYXlsaXN0LnNvbmdzLnB1c2goe1xuXHRcdFx0XHRcdHNob3c6IHhtbF9zb25nc1tpXS5nZXRBdHRyaWJ1dGUoJ3Nob3dfaW5fcGxheWVyJyksXG5cdFx0XHRcdFx0dGl0bGU6IHhtbF9zb25nc1tpXS5xdWVyeVNlbGVjdG9yKCd0aXRsZScpLmNoaWxkTm9kZXNbMF0ubm9kZVZhbHVlLFxuXHRcdFx0XHRcdGZpbGVuYW1lOiBmaWxlbmFtZSxcblx0XHRcdFx0XHRmdWxscGF0aDogJy4uL2F1ZGlvLycgKyBwbGF5bGlzdC5wYXRoICsgJy8nICsgZmlsZW5hbWVcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdHJlc3BvbnNlLnB1c2gocGxheWxpc3QpO1xuXHRcdH1cblx0XHRcblx0XHRyZXR1cm4gcmVzcG9uc2U7XHRcdFxuXHR9XG59O1xuXG5tYWluLmluaXQoKTsiLCIndXNlIHN0cmljdCc7XG5cblxudmFyIFNvbmcgPSByZXF1aXJlKCcuL1NvbmcnKTtcblxuZnVuY3Rpb24gUGxheWVyVUkocGFyZW50X2VsLCBwbGF5bGlzdHMpIHtcblx0dGhpcy5lbCA9IHBhcmVudF9lbDtcblx0dGhpcy5saXN0X3VsID0gdGhpcy5lbC5xdWVyeVNlbGVjdG9yKCdbZGF0YS1wbGF5bGlzdC1jb250YWluZXJdJyk7XG5cdHRoaXMuc29uZ3NfZGl2ID0gdGhpcy5lbC5xdWVyeVNlbGVjdG9yKCdbZGF0YS1zb25nLWNvbnRhaW5lcl0nKTtcblx0XG5cdHRoaXMucGxheWxpc3RzID0gcGxheWxpc3RzO1xuXG5cdHRoaXMuY3VyX2xpc3QgPSAwO1xuXHR0aGlzLmN1cl9zb25nID0gW107XG59XG5cbnZhciBwcm90byA9IFBsYXllclVJLnByb3RvdHlwZTtcblxuXG5cbi8vIOKAouKAouKAouKAouKAouKAouKAouKAouKAouKAolxuLy8gUFVCTElDIE1FVEhPRFNcbi8vIOKAouKAouKAouKAouKAouKAouKAouKAouKAouKAolxuXG5wcm90by5wb3B1bGF0ZUxpc3RzID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMubGlzdF91bC5pbm5lckhUTUwgPSAnJztcblx0XG5cdGZvcih2YXIgeD0wLCBsPXRoaXMucGxheWxpc3RzLmxlbmd0aDsgeDxsOyB4KyspIHtcblx0XHR2YXIgbGlzdCA9IHRoaXMucGxheWxpc3RzW3hdO1xuXHRcdHZhciBsaSA9IHRoaXMuX2dldExpc3RMaShsaXN0LCB4KTtcblx0XHR0aGlzLmxpc3RfdWwuYXBwZW5kQ2hpbGQobGkpO1xuXHRcdFxuXHRcdHRoaXMucG9wdWxhdGVTb25ncyh4KTtcblx0fVxufTtcblxuXG5cbnByb3RvLnBvcHVsYXRlU29uZ3MgPSBmdW5jdGlvbihsaXN0X2lkeCkge1xuXHR2YXIgdWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd1bCcpO1xuXHR1bC5jbGFzc0xpc3QuYWRkKCdwbGF5bGlzdCcpO1xuXHR1bC5zZXRBdHRyaWJ1dGUoJ2RhdGEtcGxheWxpc3QnLCBsaXN0X2lkeCk7XG5cdFxuXHRpZih0aGlzLmN1cl9saXN0PT09bGlzdF9pZHgpIHtcblx0XHR1bC5jbGFzc0xpc3QuYWRkKCdzZWxlY3RlZCcpO1xuXHR9XG5cdFxuXHR2YXIgc29uZ19saXN0ID0gdGhpcy5wbGF5bGlzdHNbbGlzdF9pZHhdLnNvbmdzO1xuXHRcblx0Zm9yKHZhciB4PTAsIGw9c29uZ19saXN0Lmxlbmd0aDsgeDxsOyB4KyspIHtcblx0XHR2YXIgc29uZyA9IHNvbmdfbGlzdFt4XTtcblx0XHR2YXIgbGkgPSB0aGlzLl9nZXRTb25nTGkoc29uZywgeCk7XG5cdFx0dWwuYXBwZW5kQ2hpbGQobGkpO1xuXHR9XG5cdFxuXHR0aGlzLnNvbmdzX2Rpdi5hcHBlbmRDaGlsZCh1bCk7XG59O1xuXG5cbi8vIOKAouKAouKAouKAouKAouKAouKAouKAouKAouKAolxuLy8gUFJJVkFURSBNRVRIT0RTXG4vLyDigKLigKLigKLigKLigKLigKLigKLigKLigKLigKJcblxucHJvdG8uX2NsZWFyQ2xhc3NlcyA9IGZ1bmN0aW9uKHNlbGVjdG9yLCBjbGFzc0FycmF5KSB7XG5cdHZhciBlbHMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcblx0Zm9yKHZhciB4PTAsIGw9ZWxzLmxlbmd0aDsgeDxsOyB4Kyspe1xuXHRcdGZvcih2YXIgaT0wLCBsZW49Y2xhc3NBcnJheS5sZW5ndGg7IGk8bGVuOyBpKyspIHtcblx0XHRcdGVsc1t4XS5jbGFzc0xpc3QucmVtb3ZlKGNsYXNzQXJyYXlbaV0pO1xuXHRcdH1cblx0fVxufTtcblxuXG5cbnByb3RvLl9nZXRMaXN0TGkgPSBmdW5jdGlvbihsaXN0LCBpZHgpIHtcblx0dmFyIGxpID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKTtcblx0bGkuc2V0QXR0cmlidXRlKCdkYXRhLXBsYXlsaXN0LXRyaWdnZXInLCBpZHgpO1xuXHRcblx0aWYoaWR4PT10aGlzLmN1cl9saXN0KXtcblx0XHRsaS5jbGFzc0xpc3QuYWRkKCdzZWxlY3RlZCcpO1xuXHR9XG5cdFxuXHR2YXIgc3BhbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcblx0dmFyIHR4dCA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGxpc3QubmFtZSk7XG5cdHNwYW4uYXBwZW5kQ2hpbGQodHh0KTtcblx0bGkuYXBwZW5kQ2hpbGQoc3Bhbik7XG5cdFxuXHR2YXIgcGFyZW50ID0gdGhpcztcblx0XG5cdGxpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuXHRcdHBhcmVudC5fbGlzdEJ0bkNsaWNrKHRoaXMsIHBhcmVudCk7XG5cdH0pO1xuXHRcblx0cmV0dXJuIGxpO1xufTtcblxuXG5cbnByb3RvLl9nZXRTb25nTGkgPSBmdW5jdGlvbihzb25nLCBpZHgpIHtcblx0dmFyIGxpID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKTtcblx0bGkuc2V0QXR0cmlidXRlKCdkYXRhLXNvbmcnLCBpZHgpO1xuXHRcblx0dmFyIHNwYW4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG5cdHZhciB0eHQgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShzb25nLnRpdGxlKTtcblx0dmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRkaXYuY2xhc3NMaXN0LmFkZCgncHJvZ3Jlc3NfYmFyJyk7XG5cdHNwYW4uYXBwZW5kQ2hpbGQodHh0KTtcblx0bGkuYXBwZW5kQ2hpbGQoc3Bhbik7XG5cdGxpLmFwcGVuZENoaWxkKGRpdik7XG5cdFxuXHR2YXIgcGFyZW50ID0gdGhpcztcblx0XG5cdGxpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oZSl7XG5cdFx0cGFyZW50Ll9zb25nQnRuQ2xpY2sodGhpcywgcGFyZW50KTtcblx0fSk7XG5cdFxuXHRyZXR1cm4gbGk7XG59O1xuXG5cblxucHJvdG8uX2xpc3RCdG5DbGljayA9IGZ1bmN0aW9uKGJ0biwgcGFyZW50KSB7XG5cdHBhcmVudC5fY2xlYXJDbGFzc2VzKCdbZGF0YS1wbGF5bGlzdC10cmlnZ2VyXScsIFsnc2VsZWN0ZWQnXSk7XG5cdHBhcmVudC5fY2xlYXJDbGFzc2VzKCcucGxheWxpc3QnLCBbJ3NlbGVjdGVkJ10pO1xuXHRcblx0cGFyZW50LmN1cl9saXN0ID0gYnRuLmdldEF0dHJpYnV0ZSgnZGF0YS1wbGF5bGlzdC10cmlnZ2VyJyk7XG5cblx0YnRuLmNsYXNzTGlzdC5hZGQoJ3NlbGVjdGVkJyk7XG5cdGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5wbGF5bGlzdFtkYXRhLXBsYXlsaXN0PVwiJysgcGFyZW50LmN1cl9saXN0ICsnXCJdJykuY2xhc3NMaXN0LmFkZCgnc2VsZWN0ZWQnKTtcbn07XG5cblxuXG5wcm90by5fc29uZ0J0bkNsaWNrID0gZnVuY3Rpb24oYnRuLCBwYXJlbnQpIHtcblx0dmFyIGlkeCA9IGJ0bi5nZXRBdHRyaWJ1dGUoJ2RhdGEtc29uZycpO1xuXHR2YXIgcHJvZ3Jlc3NfYmFyID0gYnRuLnF1ZXJ5U2VsZWN0b3IoJy5wcm9ncmVzc19iYXInKTtcblx0dmFyIHNvbmcgPSBwYXJlbnQucGxheWxpc3RzW3BhcmVudC5jdXJfbGlzdF0uc29uZ3NbaWR4XTtcblx0XG5cdGlmKHNvbmcuYXVkaW8gPT09IHVuZGVmaW5lZCl7XG5cdFx0c29uZy5hdWRpbyA9IG5ldyBTb25nKHNvbmcuZnVsbHBhdGgpO1xuXHR9XG5cdFxuXHRpZihidG4uY2xhc3NMaXN0LmNvbnRhaW5zKCdwYXVzZWQnKSl7IC8vIHVucGF1c2Ugc29uZ1xuXHRcdFxuXHRcdHNvbmcuYXVkaW8ucGxheSgpO1xuXHRcdGJ0bi5jbGFzc0xpc3QucmVtb3ZlKCdwYXVzZWQnKTtcblx0XHR0aGlzLl91cGRhdGVQbGF5aGVhZChwcm9ncmVzc19iYXIsIHNvbmcuYXVkaW8pO1xuXHRcdFxuXHR9IGVsc2Uge1xuXHRcdGlmKGJ0bi5jbGFzc0xpc3QuY29udGFpbnMoJ3BsYXlpbmcnKSl7IC8vIHBhdXNlIHNvbmdcblx0XHRcdFxuXHRcdFx0c29uZy5hdWRpby5wYXVzZSgpO1xuXHRcdFx0YnRuLmNsYXNzTGlzdC5hZGQoJ3BhdXNlZCcpO1xuXHRcdFx0Y2FuY2VsQW5pbWF0aW9uRnJhbWUodGhpcy5hbmltYXRvcik7XG5cdFx0XHRcblx0XHR9IGVsc2UgeyAvLyBwbGF5IG5ldyBzb25nXG5cdFx0XHRcblx0XHRcdGlmKHBhcmVudC5jdXJfc29uZy5sZW5ndGg+MSl7XG5cdFx0XHRcdHBhcmVudC5wbGF5bGlzdHNbdGhpcy5jdXJfc29uZ1swXV0uc29uZ3NbdGhpcy5jdXJfc29uZ1sxXV0uYXVkaW8uc3RvcCgpO1xuXHRcdFx0XHRjYW5jZWxBbmltYXRpb25GcmFtZSh0aGlzLmFuaW1hdG9yKTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0cGFyZW50Ll9jbGVhckNsYXNzZXMoJ1tkYXRhLXNvbmddJywgWydwbGF5aW5nJywgJ3BhdXNlZCddKTtcblx0XHRcdFxuXHRcdFx0cGFyZW50LmN1cl9zb25nID0gW3BhcmVudC5jdXJfbGlzdCwgaWR4XTtcblx0XHRcdFxuXHRcdFx0c29uZy5hdWRpby5wbGF5KCk7XG5cdFx0XHRcblx0XHRcdGJ0bi5jbGFzc0xpc3QuYWRkKCdwbGF5aW5nJyk7XG5cdFx0XHR0aGlzLl91cGRhdGVQbGF5aGVhZChwcm9ncmVzc19iYXIsIHNvbmcuYXVkaW8pO1xuXHRcdH1cblx0fVxufVxuXG5cblxucHJvdG8uX3NvbmdFbmRlZCA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLl9jbGVhckNsYXNzZXMoJ1tkYXRhLXNvbmddJywgWydwbGF5aW5nJywgJ3BhdXNlZCddKTtcblx0XG5cdGlmKHRoaXMuY3VyX3NvbmdbMV0gPCB0aGlzLnBsYXlsaXN0c1t0aGlzLmN1cl9zb25nWzBdXS5zb25ncy5sZW5ndGgtMSkge1xuXHRcdHRoaXMuY3VyX3NvbmdbMV0rKztcblx0XHR0aGlzLl9zb25nQnRuQ2xpY2sodGhpcy5zb25nc19kaXYucXVlcnlTZWxlY3RvcignW2RhdGEtcGxheWxpc3Q9XCInKyB0aGlzLmN1cl9zb25nWzBdICsnXCJdIFtkYXRhLXNvbmc9XCInKyB0aGlzLmN1cl9zb25nWzFdICsnXCJdJyksIHRoaXMpO1xuXHR9XG59O1xuXG5cblxucHJvdG8uX3VwZGF0ZVBsYXloZWFkID0gZnVuY3Rpb24oZWwsIHNvbmcpIHtcblx0aWYoc29uZy5lbmRlZCgpKSB7XG5cdFx0Y2FuY2VsQW5pbWF0aW9uRnJhbWUodGhpcy5hbmltYXRvcik7XG5cdFx0dGhpcy5fc29uZ0VuZGVkKCk7XG5cdH0gZWxzZSB7XG5cdFx0ZWwuc3R5bGUud2lkdGggPSBzb25nLmdldFBlcmNlbnRQbGF5ZWQoKSArICclJztcblx0XHRcblx0XHR0aGlzLmFuaW1hdG9yID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGZ1bmN0aW9uKCl7XG5cdFx0XHR0aGlzLl91cGRhdGVQbGF5aGVhZChlbCwgc29uZyk7XG5cdFx0fS5iaW5kKHRoaXMpKTtcblx0XG5cdH1cbn07XG5cblxuXG5tb2R1bGUuZXhwb3J0cyA9IFBsYXllclVJO1xuXG5cblxuXG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFNvbmcodXJsKSB7XG5cdHRoaXMuc29uZyA9IG5ldyBBdWRpbyh1cmwpO1xufVxuXG52YXIgcHJvdG8gPSBTb25nLnByb3RvdHlwZTtcblxuXG5cbi8vIOKAouKAouKAouKAouKAouKAouKAouKAouKAouKAolxuLy8gUFVCTElDIE1FVEhPRFNcbi8vIOKAouKAouKAouKAouKAouKAouKAouKAouKAouKAolxuXG5wcm90by5lbmRlZCA9IGZ1bmN0aW9uKCl7XG5cdHJldHVybiB0aGlzLnNvbmcuZW5kZWQ7XG59O1xuXG5cblxucHJvdG8uZ2V0UGVyY2VudFBsYXllZCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5zb25nLmN1cnJlbnRUaW1lIC8gdGhpcy5zb25nLmR1cmF0aW9uICogMTAwO1xufTtcblxuXG5cbnByb3RvLnBhdXNlID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMuc29uZy5wYXVzZSgpO1xufTtcblxuXG5cbnByb3RvLnBsYXkgPSBmdW5jdGlvbigpIHtcblx0dGhpcy5zb25nLnBsYXkoKTtcbn07XG5cblxuXG5wcm90by5zdG9wID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMuc29uZy5wYXVzZSgpO1xuXHR0aGlzLnNvbmcuY3VycmVudFRpbWUgPSAwO1xufTtcblxuXG5cbm1vZHVsZS5leHBvcnRzID0gU29uZzsiXX0=
