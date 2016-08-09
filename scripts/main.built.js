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
		
		var donate_btn = document.getElementById('donate_button');
		var donation_amt = document.getElementById('donation_amount');
		var thank_you = document.getElementById('contribution_thank_you');
		var thank_you_close = document.getElementById('close_thank_you_button');
		
		var handler = StripeCheckout.configure({
			key: 'pk_test_HySA7ahGkleHdgfsB6AZTdxz',
			image: 'https://s3.amazonaws.com/stripe-uploads/acct_18cAXcFiyAeAkygfmerchant-icon-1469697187614-image.png',
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvanMvbWFpbi5qcyIsInNyYy9qcy9tb2R1bGVzL1BsYXllclVJLmpzIiwic3JjL2pzL21vZHVsZXMvU29uZy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaE5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIid1c2Ugc3RyaWN0JztcblxudmFyIFBsYXllclVJID0gcmVxdWlyZSgnLi9tb2R1bGVzL1BsYXllclVJJyk7XG52YXIgTXVzaWNQbGF5ZXI7XG5cbnZhciBtYWluID0ge1xuXHRcblx0aW5pdDogZnVuY3Rpb24oKXtcblx0XHR0aGlzLmluaXRfYW5hbHl0aWNzKCk7XG5cdFx0dGhpcy5pbml0X3N0cmlwZSgpO1xuXHRcdFxuXHRcdHRoaXMuYWx1bW5pX3NlY3Rpb24oKTtcblx0XHR0aGlzLmxvYWRfcGxheWxpc3RzKCk7XG5cdH0sXG5cdFxuXHRcblx0XG5cdGFqYXg6IGZ1bmN0aW9uKHVybCwgY2FsbGJhY2spe1xuXHRcdGlmKHdpbmRvdy5YTUxIdHRwUmVxdWVzdCl7XG5cdFx0XHR2YXIgYWp4ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cdFx0fWVsc2V7XG5cdFx0XHR2YXIgYWp4ID0gbmV3IEFjdGl2ZVhPYmplY3QoXCJNaWNyb3NvZnQuWE1MSFRUUFwiKTtcblx0XHR9XG5cdFx0XG5cdFx0YWp4Lm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0aWYoYWp4LnJlYWR5U3RhdGU9PTQgJiYgYWp4LnN0YXR1cz09MjAwKXtcblx0XHRcdFx0Y2FsbGJhY2soYWp4LnJlc3BvbnNlVGV4dCk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdFxuXHRcdGFqeC5vcGVuKFwiR0VUXCIsIHVybCwgdHJ1ZSk7XG5cdFx0YWp4LnNlbmQoKTtcblx0fSxcblx0XG5cdFxuXHRcblx0YWx1bW5pX3NlY3Rpb246IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBhbHVtbmlfZnJhbWUgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuYWx1bW5pJyk7XG5cdFx0dmFyIGFsdW1uaV9idG4gPSBhbHVtbmlfZnJhbWUucXVlcnlTZWxlY3RvcignW2RhdGEtYWN0aW9uPWFsdW1uaS10b2dnbGVdJyk7XG5cdFx0XG5cdFx0YWx1bW5pX2J0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCl7XG5cdFx0XHRhbHVtbmlfZnJhbWUuY2xhc3NMaXN0LnRvZ2dsZSgnZXhwYW5kJyk7XG5cdFx0fSk7XG5cdH0sXG5cblxuXG5cdGZvcl9lYWNoOiBmdW5jdGlvbihsaXN0LCBjYWxsYmFjaykge1xuXHRcdGZvcih2YXIgeD0wLCBsPWxpc3QubGVuZ3RoOyB4PGw7IHgrKyl7XG5cdFx0XHRjYWxsYmFjayhsaXN0W3hdLCB4KTtcblx0XHR9XG5cdH0sXG5cblxuXG5cdGluaXRfYW5hbHl0aWNzOiBmdW5jdGlvbigpe1xuXHRcdChmdW5jdGlvbihpLHMsbyxnLHIsYSxtKXtpWydHb29nbGVBbmFseXRpY3NPYmplY3QnXT1yO2lbcl09aVtyXXx8ZnVuY3Rpb24oKXtcblx0XHQoaVtyXS5xPWlbcl0ucXx8W10pLnB1c2goYXJndW1lbnRzKX0saVtyXS5sPTEqbmV3IERhdGUoKTthPXMuY3JlYXRlRWxlbWVudChvKSxcblx0XHRtPXMuZ2V0RWxlbWVudHNCeVRhZ05hbWUobylbMF07YS5hc3luYz0xO2Euc3JjPWc7bS5wYXJlbnROb2RlLmluc2VydEJlZm9yZShhLG0pXG5cdFx0fSkod2luZG93LGRvY3VtZW50LCdzY3JpcHQnLCdodHRwczovL3d3dy5nb29nbGUtYW5hbHl0aWNzLmNvbS9hbmFseXRpY3MuanMnLCdnYScpO1xuXHRcdFxuXHRcdGdhKCdjcmVhdGUnLCAnVUEtODIwOTc1NDMtMScsICdhdXRvJyk7XG5cdFx0Z2EoJ3NlbmQnLCAncGFnZXZpZXcnKTtcblx0fSxcblxuXG5cblx0aW5pdF9zdHJpcGU6IGZ1bmN0aW9uKCl7XG5cdFx0XG5cdFx0dmFyIGRvbmF0ZV9idG4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZG9uYXRlX2J1dHRvbicpO1xuXHRcdHZhciBkb25hdGlvbl9hbXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZG9uYXRpb25fYW1vdW50Jyk7XG5cdFx0dmFyIHRoYW5rX3lvdSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjb250cmlidXRpb25fdGhhbmtfeW91Jyk7XG5cdFx0dmFyIHRoYW5rX3lvdV9jbG9zZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjbG9zZV90aGFua195b3VfYnV0dG9uJyk7XG5cdFx0XG5cdFx0dmFyIGhhbmRsZXIgPSBTdHJpcGVDaGVja291dC5jb25maWd1cmUoe1xuXHRcdFx0a2V5OiAncGtfdGVzdF9IeVNBN2FoR2tsZUhkZ2ZzQjZBWlRkeHonLFxuXHRcdFx0aW1hZ2U6ICdodHRwczovL3MzLmFtYXpvbmF3cy5jb20vc3RyaXBlLXVwbG9hZHMvYWNjdF8xOGNBWGNGaXlBZUFreWdmbWVyY2hhbnQtaWNvbi0xNDY5Njk3MTg3NjE0LWltYWdlLnBuZycsXG5cdFx0XHRsb2NhbGU6ICdhdXRvJyxcblx0XHRcdHRva2VuOiBmdW5jdGlvbih0b2tlbikge1xuXHRcdFx0XHRkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdbZGF0YS1hbW91bnRdJykuaW5uZXJIVE1MID0gZG9uYXRpb25fYW10LnZhbHVlO1xuXHRcdFx0XHR0aGFua195b3UuY2xhc3NMaXN0LmFkZCgndmlzaWJsZScpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcblx0XHRkb25hdGVfYnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuXHRcdFx0Ly8gT3BlbiBDaGVja291dCB3aXRoIGZ1cnRoZXIgb3B0aW9uczpcblx0XHRcdGhhbmRsZXIub3Blbih7XG5cdFx0XHRcdG5hbWU6ICdNYXlmaWVsZCBTaW5nZXJzIERvbmF0aW9uJyxcblx0XHRcdFx0ZGVzY3JpcHRpb246ICdDaGFyaXRhYmxlIENvbnRyaWJ1dGlvbicsXG5cdFx0XHRcdGFtb3VudDogZG9uYXRpb25fYW10LnZhbHVlICogMTAwXG5cdFx0XHR9KTtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHR9KTtcblx0XHRcblx0XHR0aGFua195b3VfY2xvc2UuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbihlKSB7IHRoYW5rX3lvdS5jbGFzc0xpc3QucmVtb3ZlKCd2aXNpYmxlJyk7IH0pXG5cdFx0XHRcblx0XHQvL0Nsb3NlIENoZWNrb3V0IG9uIHBhZ2UgbmF2aWdhdGlvbjpcblx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncG9wc3RhdGUnLCBmdW5jdGlvbigpIHtcblx0XHRcdGhhbmRsZXIuY2xvc2UoKTtcblx0XHR9KTtcblx0fSxcblxuXG5cblx0bG9hZF9wbGF5bGlzdHM6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuYWpheCgnLi4vYXVkaW8vbGlicmFyeS54bWwnLCBmdW5jdGlvbihwbGF5bGlzdHMpe1xuXHRcdFx0XG5cdFx0XHR2YXIgcGFyc2VyID0gbmV3IERPTVBhcnNlcigpO1xuXHRcdFx0dmFyIHhtbCA9IHBhcnNlci5wYXJzZUZyb21TdHJpbmcocGxheWxpc3RzLFwidGV4dC94bWxcIik7XG5cdFx0XHRcblx0XHRcdHZhciBlbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhdWRpb19wbGF5ZXInKTtcblx0XHRcdHZhciBqc29uID0gbWFpbi54bWxfdG9fanNvbih4bWwpO1xuXHRcdFx0XG5cdFx0XHRNdXNpY1BsYXllciA9IG5ldyBQbGF5ZXJVSShlbCwganNvbik7XG5cdFx0XHRNdXNpY1BsYXllci5wb3B1bGF0ZUxpc3RzKCk7XG5cdFx0fSk7XG5cdH0sXG5cblxuXG5cdHhtbF90b19qc29uOiBmdW5jdGlvbih4bWwpIHtcblx0XHRcblx0XHR2YXIgcmVzcG9uc2UgPSBbXTtcblx0XHRcblx0XHR2YXIgcGxheWxpc3RzID0geG1sLmdldEVsZW1lbnRzQnlUYWdOYW1lKCdwbGF5bGlzdCcpO1xuXHRcdFxuXHRcdGZvcih2YXIgeD0wLCBsPXBsYXlsaXN0cy5sZW5ndGg7IHg8bDsgeCsrKSB7XG5cdFx0XHRcblx0XHRcdHZhciBjcnQgPSBwbGF5bGlzdHNbeF07XG5cdFx0XHRcblx0XHRcdHZhciBwbGF5bGlzdCA9IHtcblx0XHRcdFx0bmFtZTogY3J0LmdldEF0dHJpYnV0ZSgnbmFtZScpLFxuXHRcdFx0XHRkYXRlOiBjcnQuZ2V0QXR0cmlidXRlKCdkYXRlJyksXG5cdFx0XHRcdHBhdGg6IGNydC5nZXRBdHRyaWJ1dGUoJ2ZvbGRlcicpLFxuXHRcdFx0XHRzb25nczogW11cblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0dmFyIHhtbF9zb25ncyA9IGNydC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnc29uZycpO1xuXHRcdFx0XG5cdFx0XHRmb3IodmFyIGk9MCwgbGVuPXhtbF9zb25ncy5sZW5ndGg7IGk8bGVuOyBpKyspIHtcblx0XHRcdFx0dmFyIGZpbGVuYW1lID0geG1sX3NvbmdzW2ldLnF1ZXJ5U2VsZWN0b3IoJ2ZpbGVuYW1lJykuY2hpbGROb2Rlc1swXS5ub2RlVmFsdWVcblx0XHRcdFx0XG5cdFx0XHRcdHBsYXlsaXN0LnNvbmdzLnB1c2goe1xuXHRcdFx0XHRcdHNob3c6IHhtbF9zb25nc1tpXS5nZXRBdHRyaWJ1dGUoJ3Nob3dfaW5fcGxheWVyJyksXG5cdFx0XHRcdFx0dGl0bGU6IHhtbF9zb25nc1tpXS5xdWVyeVNlbGVjdG9yKCd0aXRsZScpLmNoaWxkTm9kZXNbMF0ubm9kZVZhbHVlLFxuXHRcdFx0XHRcdGZpbGVuYW1lOiBmaWxlbmFtZSxcblx0XHRcdFx0XHRmdWxscGF0aDogJy4uL2F1ZGlvLycgKyBwbGF5bGlzdC5wYXRoICsgJy8nICsgZmlsZW5hbWVcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdHJlc3BvbnNlLnB1c2gocGxheWxpc3QpO1xuXHRcdH1cblx0XHRcblx0XHRyZXR1cm4gcmVzcG9uc2U7XHRcdFxuXHR9XG59O1xuXG5tYWluLmluaXQoKTsiLCIndXNlIHN0cmljdCc7XG5cblxudmFyIFNvbmcgPSByZXF1aXJlKCcuL1NvbmcnKTtcblxuZnVuY3Rpb24gUGxheWVyVUkocGFyZW50X2VsLCBwbGF5bGlzdHMpIHtcblx0dGhpcy5lbCA9IHBhcmVudF9lbDtcblx0dGhpcy5saXN0X3VsID0gdGhpcy5lbC5xdWVyeVNlbGVjdG9yKCdbZGF0YS1wbGF5bGlzdC1jb250YWluZXJdJyk7XG5cdHRoaXMuc29uZ3NfZGl2ID0gdGhpcy5lbC5xdWVyeVNlbGVjdG9yKCdbZGF0YS1zb25nLWNvbnRhaW5lcl0nKTtcblx0XG5cdHRoaXMucGxheWxpc3RzID0gcGxheWxpc3RzO1xuXG5cdHRoaXMuY3VyX2xpc3QgPSAwO1xuXHR0aGlzLmN1cl9zb25nID0gW107XG59XG5cbnZhciBwcm90byA9IFBsYXllclVJLnByb3RvdHlwZTtcblxuXG5cbi8vIOKAouKAouKAouKAouKAouKAouKAouKAouKAouKAolxuLy8gUFVCTElDIE1FVEhPRFNcbi8vIOKAouKAouKAouKAouKAouKAouKAouKAouKAouKAolxuXG5wcm90by5wb3B1bGF0ZUxpc3RzID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMubGlzdF91bC5pbm5lckhUTUwgPSAnJztcblx0XG5cdGZvcih2YXIgeD0wLCBsPXRoaXMucGxheWxpc3RzLmxlbmd0aDsgeDxsOyB4KyspIHtcblx0XHR2YXIgbGlzdCA9IHRoaXMucGxheWxpc3RzW3hdO1xuXHRcdHZhciBsaSA9IHRoaXMuX2dldExpc3RMaShsaXN0LCB4KTtcblx0XHR0aGlzLmxpc3RfdWwuYXBwZW5kQ2hpbGQobGkpO1xuXHRcdFxuXHRcdHRoaXMucG9wdWxhdGVTb25ncyh4KTtcblx0fVxufTtcblxuXG5cbnByb3RvLnBvcHVsYXRlU29uZ3MgPSBmdW5jdGlvbihsaXN0X2lkeCkge1xuXHR2YXIgdWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd1bCcpO1xuXHR1bC5jbGFzc0xpc3QuYWRkKCdwbGF5bGlzdCcpO1xuXHR1bC5zZXRBdHRyaWJ1dGUoJ2RhdGEtcGxheWxpc3QnLCBsaXN0X2lkeCk7XG5cdFxuXHRpZih0aGlzLmN1cl9saXN0PT09bGlzdF9pZHgpIHtcblx0XHR1bC5jbGFzc0xpc3QuYWRkKCdzZWxlY3RlZCcpO1xuXHR9XG5cdFxuXHR2YXIgc29uZ19saXN0ID0gdGhpcy5wbGF5bGlzdHNbbGlzdF9pZHhdLnNvbmdzO1xuXHRcblx0Zm9yKHZhciB4PTAsIGw9c29uZ19saXN0Lmxlbmd0aDsgeDxsOyB4KyspIHtcblx0XHR2YXIgc29uZyA9IHNvbmdfbGlzdFt4XTtcblx0XHR2YXIgbGkgPSB0aGlzLl9nZXRTb25nTGkoc29uZywgeCk7XG5cdFx0dWwuYXBwZW5kQ2hpbGQobGkpO1xuXHR9XG5cdFxuXHR0aGlzLnNvbmdzX2Rpdi5hcHBlbmRDaGlsZCh1bCk7XG59O1xuXG5cbi8vIOKAouKAouKAouKAouKAouKAouKAouKAouKAouKAolxuLy8gUFJJVkFURSBNRVRIT0RTXG4vLyDigKLigKLigKLigKLigKLigKLigKLigKLigKLigKJcblxucHJvdG8uX2NsZWFyQ2xhc3NlcyA9IGZ1bmN0aW9uKHNlbGVjdG9yLCBjbGFzc0FycmF5KSB7XG5cdHZhciBlbHMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcblx0Zm9yKHZhciB4PTAsIGw9ZWxzLmxlbmd0aDsgeDxsOyB4Kyspe1xuXHRcdGZvcih2YXIgaT0wLCBsZW49Y2xhc3NBcnJheS5sZW5ndGg7IGk8bGVuOyBpKyspIHtcblx0XHRcdGVsc1t4XS5jbGFzc0xpc3QucmVtb3ZlKGNsYXNzQXJyYXlbaV0pO1xuXHRcdH1cblx0fVxufTtcblxuXG5cbnByb3RvLl9nZXRMaXN0TGkgPSBmdW5jdGlvbihsaXN0LCBpZHgpIHtcblx0dmFyIGxpID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKTtcblx0bGkuc2V0QXR0cmlidXRlKCdkYXRhLXBsYXlsaXN0LXRyaWdnZXInLCBpZHgpO1xuXHRcblx0aWYoaWR4PT10aGlzLmN1cl9saXN0KXtcblx0XHRsaS5jbGFzc0xpc3QuYWRkKCdzZWxlY3RlZCcpO1xuXHR9XG5cdFxuXHR2YXIgc3BhbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcblx0dmFyIHR4dCA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGxpc3QubmFtZSk7XG5cdHNwYW4uYXBwZW5kQ2hpbGQodHh0KTtcblx0bGkuYXBwZW5kQ2hpbGQoc3Bhbik7XG5cdFxuXHR2YXIgcGFyZW50ID0gdGhpcztcblx0XG5cdGxpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuXHRcdHBhcmVudC5fbGlzdEJ0bkNsaWNrKHRoaXMsIHBhcmVudCk7XG5cdH0pO1xuXHRcblx0cmV0dXJuIGxpO1xufTtcblxuXG5cbnByb3RvLl9nZXRTb25nTGkgPSBmdW5jdGlvbihzb25nLCBpZHgpIHtcblx0dmFyIGxpID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKTtcblx0bGkuc2V0QXR0cmlidXRlKCdkYXRhLXNvbmcnLCBpZHgpO1xuXHRcblx0dmFyIHNwYW4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG5cdHZhciB0eHQgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShzb25nLnRpdGxlKTtcblx0dmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRkaXYuY2xhc3NMaXN0LmFkZCgncHJvZ3Jlc3NfYmFyJyk7XG5cdHNwYW4uYXBwZW5kQ2hpbGQodHh0KTtcblx0bGkuYXBwZW5kQ2hpbGQoc3Bhbik7XG5cdGxpLmFwcGVuZENoaWxkKGRpdik7XG5cdFxuXHR2YXIgcGFyZW50ID0gdGhpcztcblx0XG5cdGxpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oZSl7XG5cdFx0cGFyZW50Ll9zb25nQnRuQ2xpY2sodGhpcywgcGFyZW50KTtcblx0fSk7XG5cdFxuXHRyZXR1cm4gbGk7XG59O1xuXG5cblxucHJvdG8uX2xpc3RCdG5DbGljayA9IGZ1bmN0aW9uKGJ0biwgcGFyZW50KSB7XG5cdHBhcmVudC5fY2xlYXJDbGFzc2VzKCdbZGF0YS1wbGF5bGlzdC10cmlnZ2VyXScsIFsnc2VsZWN0ZWQnXSk7XG5cdHBhcmVudC5fY2xlYXJDbGFzc2VzKCcucGxheWxpc3QnLCBbJ3NlbGVjdGVkJ10pO1xuXHRcblx0cGFyZW50LmN1cl9saXN0ID0gYnRuLmdldEF0dHJpYnV0ZSgnZGF0YS1wbGF5bGlzdC10cmlnZ2VyJyk7XG5cblx0YnRuLmNsYXNzTGlzdC5hZGQoJ3NlbGVjdGVkJyk7XG5cdGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5wbGF5bGlzdFtkYXRhLXBsYXlsaXN0PVwiJysgcGFyZW50LmN1cl9saXN0ICsnXCJdJykuY2xhc3NMaXN0LmFkZCgnc2VsZWN0ZWQnKTtcbn07XG5cblxuXG5wcm90by5fc29uZ0J0bkNsaWNrID0gZnVuY3Rpb24oYnRuLCBwYXJlbnQpIHtcblx0dmFyIGlkeCA9IGJ0bi5nZXRBdHRyaWJ1dGUoJ2RhdGEtc29uZycpO1xuXHR2YXIgcHJvZ3Jlc3NfYmFyID0gYnRuLnF1ZXJ5U2VsZWN0b3IoJy5wcm9ncmVzc19iYXInKTtcblx0dmFyIHNvbmcgPSBwYXJlbnQucGxheWxpc3RzW3BhcmVudC5jdXJfbGlzdF0uc29uZ3NbaWR4XTtcblx0XG5cdGlmKHNvbmcuYXVkaW8gPT09IHVuZGVmaW5lZCl7XG5cdFx0c29uZy5hdWRpbyA9IG5ldyBTb25nKHNvbmcuZnVsbHBhdGgpO1xuXHR9XG5cdFxuXHRpZihidG4uY2xhc3NMaXN0LmNvbnRhaW5zKCdwYXVzZWQnKSl7IC8vIHVucGF1c2Ugc29uZ1xuXHRcdFxuXHRcdHNvbmcuYXVkaW8ucGxheSgpO1xuXHRcdGJ0bi5jbGFzc0xpc3QucmVtb3ZlKCdwYXVzZWQnKTtcblx0XHR0aGlzLl91cGRhdGVQbGF5aGVhZChwcm9ncmVzc19iYXIsIHNvbmcuYXVkaW8pO1xuXHRcdFxuXHR9IGVsc2Uge1xuXHRcdGlmKGJ0bi5jbGFzc0xpc3QuY29udGFpbnMoJ3BsYXlpbmcnKSl7IC8vIHBhdXNlIHNvbmdcblx0XHRcdFxuXHRcdFx0c29uZy5hdWRpby5wYXVzZSgpO1xuXHRcdFx0YnRuLmNsYXNzTGlzdC5hZGQoJ3BhdXNlZCcpO1xuXHRcdFx0Y2FuY2VsQW5pbWF0aW9uRnJhbWUodGhpcy5hbmltYXRvcik7XG5cdFx0XHRcblx0XHR9IGVsc2UgeyAvLyBwbGF5IG5ldyBzb25nXG5cdFx0XHRcblx0XHRcdGlmKHBhcmVudC5jdXJfc29uZy5sZW5ndGg+MSl7XG5cdFx0XHRcdHBhcmVudC5wbGF5bGlzdHNbdGhpcy5jdXJfc29uZ1swXV0uc29uZ3NbdGhpcy5jdXJfc29uZ1sxXV0uYXVkaW8uc3RvcCgpO1xuXHRcdFx0XHRjYW5jZWxBbmltYXRpb25GcmFtZSh0aGlzLmFuaW1hdG9yKTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0cGFyZW50Ll9jbGVhckNsYXNzZXMoJ1tkYXRhLXNvbmddJywgWydwbGF5aW5nJywgJ3BhdXNlZCddKTtcblx0XHRcdFxuXHRcdFx0cGFyZW50LmN1cl9zb25nID0gW3BhcmVudC5jdXJfbGlzdCwgaWR4XTtcblx0XHRcdFxuXHRcdFx0c29uZy5hdWRpby5wbGF5KCk7XG5cdFx0XHRcblx0XHRcdGJ0bi5jbGFzc0xpc3QuYWRkKCdwbGF5aW5nJyk7XG5cdFx0XHR0aGlzLl91cGRhdGVQbGF5aGVhZChwcm9ncmVzc19iYXIsIHNvbmcuYXVkaW8pO1xuXHRcdH1cblx0fVxufVxuXG5cblxucHJvdG8uX3NvbmdFbmRlZCA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLl9jbGVhckNsYXNzZXMoJ1tkYXRhLXNvbmddJywgWydwbGF5aW5nJywgJ3BhdXNlZCddKTtcblx0XG5cdGlmKHRoaXMuY3VyX3NvbmdbMV0gPCB0aGlzLnBsYXlsaXN0c1t0aGlzLmN1cl9zb25nWzBdXS5zb25ncy5sZW5ndGgtMSkge1xuXHRcdHRoaXMuY3VyX3NvbmdbMV0rKztcblx0XHR0aGlzLl9zb25nQnRuQ2xpY2sodGhpcy5zb25nc19kaXYucXVlcnlTZWxlY3RvcignW2RhdGEtcGxheWxpc3Q9XCInKyB0aGlzLmN1cl9zb25nWzBdICsnXCJdIFtkYXRhLXNvbmc9XCInKyB0aGlzLmN1cl9zb25nWzFdICsnXCJdJyksIHRoaXMpO1xuXHR9XG59O1xuXG5cblxucHJvdG8uX3VwZGF0ZVBsYXloZWFkID0gZnVuY3Rpb24oZWwsIHNvbmcpIHtcblx0aWYoc29uZy5lbmRlZCgpKSB7XG5cdFx0Y2FuY2VsQW5pbWF0aW9uRnJhbWUodGhpcy5hbmltYXRvcik7XG5cdFx0dGhpcy5fc29uZ0VuZGVkKCk7XG5cdH0gZWxzZSB7XG5cdFx0ZWwuc3R5bGUud2lkdGggPSBzb25nLmdldFBlcmNlbnRQbGF5ZWQoKSArICclJztcblx0XHRcblx0XHR0aGlzLmFuaW1hdG9yID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGZ1bmN0aW9uKCl7XG5cdFx0XHR0aGlzLl91cGRhdGVQbGF5aGVhZChlbCwgc29uZyk7XG5cdFx0fS5iaW5kKHRoaXMpKTtcblx0XG5cdH1cbn07XG5cblxuXG5tb2R1bGUuZXhwb3J0cyA9IFBsYXllclVJO1xuXG5cblxuXG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFNvbmcodXJsKSB7XG5cdHRoaXMuc29uZyA9IG5ldyBBdWRpbyh1cmwpO1xufVxuXG52YXIgcHJvdG8gPSBTb25nLnByb3RvdHlwZTtcblxuXG5cbi8vIOKAouKAouKAouKAouKAouKAouKAouKAouKAouKAolxuLy8gUFVCTElDIE1FVEhPRFNcbi8vIOKAouKAouKAouKAouKAouKAouKAouKAouKAouKAolxuXG5wcm90by5lbmRlZCA9IGZ1bmN0aW9uKCl7XG5cdHJldHVybiB0aGlzLnNvbmcuZW5kZWQ7XG59O1xuXG5cblxucHJvdG8uZ2V0UGVyY2VudFBsYXllZCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5zb25nLmN1cnJlbnRUaW1lIC8gdGhpcy5zb25nLmR1cmF0aW9uICogMTAwO1xufTtcblxuXG5cbnByb3RvLnBhdXNlID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMuc29uZy5wYXVzZSgpO1xufTtcblxuXG5cbnByb3RvLnBsYXkgPSBmdW5jdGlvbigpIHtcblx0dGhpcy5zb25nLnBsYXkoKTtcbn07XG5cblxuXG5wcm90by5zdG9wID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMuc29uZy5wYXVzZSgpO1xuXHR0aGlzLnNvbmcuY3VycmVudFRpbWUgPSAwO1xufTtcblxuXG5cbm1vZHVsZS5leHBvcnRzID0gU29uZzsiXX0=
