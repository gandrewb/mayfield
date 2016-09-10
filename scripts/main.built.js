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
				key: 'pk_live_hYroZcHHNXiRs1XMq1dITtaA',
				image: 'https://mayfieldsingers.org/apple-touch-icon.png',
				locale: 'auto',
				token: function(token) {
					
					var amt = donation_amt.value;
					
					main.ajax({
						url: './scripts/stripe.php',
						type: 'GET',
						data: {
							amount: amt * 100,
							token: token.id,
							email: token.email
						},
						done: function(response){
							if(response==='success'){							
								document.querySelector('[data-amount]').innerHTML = amt;
								thank_you.classList.add('visible');
								main.donationAnalytics('paid', donation_amt.value);
							}
							else {
								thank_you.classList.add('visible', 'error');
							}
						}
					});
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
			
			thank_you_close.addEventListener('click', function(e) { thank_you.classList.remove('visible', 'error'); })
				
			//Close Checkout on page navigation:
			window.addEventListener('popstate', function() {
				handler.close();
			});
		}
	},



	load_playlists: function() {
		this.ajax({
			url: './audio/library.xml',
			type: 'GET',
			done: function(playlists){
				var parser = new DOMParser();
				var xml = parser.parseFromString(playlists,"text/xml");
				
				var el = document.getElementById('audio_player');
				var json = main.xml_to_json(xml);
				
				MusicPlayer = new PlayerUI(el, false, json);
				MusicPlayer.populateLists();
			}
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvanMvbWFpbi5qcyIsInNyYy9qcy9tb2R1bGVzL1BsYXllclVJLmpzIiwic3JjL2pzL21vZHVsZXMvU29uZy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCc7XG5cbnZhciBQbGF5ZXJVSSA9IHJlcXVpcmUoJy4vbW9kdWxlcy9QbGF5ZXJVSScpO1xudmFyIE11c2ljUGxheWVyO1xuXG52YXIgbWFpbiA9IHtcblx0XG5cdGluaXQ6IGZ1bmN0aW9uKCl7XG5cdFx0dGhpcy5hbHVtbmlfc2VjdGlvbigpO1xuXHRcdHRoaXMubG9hZF9wbGF5bGlzdHMoKTtcblx0XHRcblx0XHR0aGlzLmluaXRfYW5hbHl0aWNzKCk7XG5cdFx0dGhpcy5pbml0X3N0cmlwZSgpO1xuXHR9LFxuXHRcblx0XG5cdFxuXHRhamF4OiBmdW5jdGlvbihvcHRpb25zKXtcblx0XHR2YXIgYWp4LCByZXNwb25zZSwgcGFyYW1zPScnO1xuXHRcblx0XHRpZihvcHRpb25zLmRhdGEhPT11bmRlZmluZWQpe1xuXHRcdFx0dmFyIGN0PTA7XG5cdFx0XHRmb3IodmFyIGlkeCBpbiBvcHRpb25zLmRhdGEpe1xuXHRcdFx0XHRjdCsrO1xuXHRcdFx0XHR2YXIgY2hhID0gKGN0PT0xKSA/ICc/JzogJyYnO1xuXHRcdFx0XHRwYXJhbXMrPSBjaGEraWR4Kyc9JytvcHRpb25zLmRhdGFbaWR4XTtcblx0XHRcdH1cblx0XHR9XG5cdFx0XG5cdFx0aWYod2luZG93LlhNTEh0dHBSZXF1ZXN0KXtcblx0XHRcdGFqeCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXHRcdH1lbHNle1xuXHRcdFx0YWp4ID0gbmV3IEFjdGl2ZVhPYmplY3QoXCJNaWNyb3NvZnQuWE1MSFRUUFwiKTtcblx0XHR9XG5cdFx0YWp4Lm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0aWYoYWp4LnJlYWR5U3RhdGU9PTQgJiYgYWp4LnN0YXR1cz09MjAwKXtcblx0XHRcdFx0b3B0aW9ucy5kb25lKGFqeC5yZXNwb25zZVRleHQpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRcblx0XHRhangub3BlbihvcHRpb25zLnR5cGUsIG9wdGlvbnMudXJsK3BhcmFtcywgdHJ1ZSk7XG5cdFx0YWp4LnNlbmQoKTtcblx0fSxcblx0XG5cdFxuXHRcblx0YWx1bW5pX3NlY3Rpb246IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBhbHVtbmlfZnJhbWUgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuYWx1bW5pJyk7XG5cdFx0dmFyIGFsdW1uaV9idG4gPSBhbHVtbmlfZnJhbWUucXVlcnlTZWxlY3RvcignW2RhdGEtYWN0aW9uPWFsdW1uaS10b2dnbGVdJyk7XG5cdFx0XG5cdFx0YWx1bW5pX2J0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCl7XG5cdFx0XHRhbHVtbmlfZnJhbWUuY2xhc3NMaXN0LnRvZ2dsZSgnZXhwYW5kJyk7XG5cdFx0fSk7XG5cdH0sXG5cblxuXG5cdGFuYWx5dGljc0V2ZW50OiBmdW5jdGlvbihvcHRpb25zKXtcblx0XHRvcHRpb25zLmhpdFR5cGUgPSAnZXZlbnQnO1xuXHRcdFxuXHRcdGlmKHdpbmRvdy5nYSkgeyBcblx0XHRcdGdhKCdzZW5kJywgb3B0aW9ucyk7XG5cdFx0fVxuXHR9LFxuXG5cblxuXHRkb25hdGlvbkFuYWx5dGljczogZnVuY3Rpb24oYWN0aW9uLCBhbW91bnQpe1xuXHRcdHRoaXMuYW5hbHl0aWNzRXZlbnQoe1xuXHRcdFx0ZXZlbnRDYXRlZ29yeTogJ0RvbmF0aW9uJyxcblx0XHRcdGV2ZW50QWN0aW9uOiBhY3Rpb24sXG5cdFx0XHRldmVudFZhbHVlOiBhbW91bnRcblx0XHR9KTtcblx0fSxcblxuXG5cblx0Zm9yX2VhY2g6IGZ1bmN0aW9uKGxpc3QsIGNhbGxiYWNrKSB7XG5cdFx0Zm9yKHZhciB4PTAsIGw9bGlzdC5sZW5ndGg7IHg8bDsgeCsrKXtcblx0XHRcdGNhbGxiYWNrKGxpc3RbeF0sIHgpO1xuXHRcdH1cblx0fSxcblxuXG5cblx0aW5pdF9hbmFseXRpY3M6IGZ1bmN0aW9uKCl7XG5cdFx0KGZ1bmN0aW9uKGkscyxvLGcscixhLG0pe2lbJ0dvb2dsZUFuYWx5dGljc09iamVjdCddPXI7aVtyXT1pW3JdfHxmdW5jdGlvbigpe1xuXHRcdChpW3JdLnE9aVtyXS5xfHxbXSkucHVzaChhcmd1bWVudHMpfSxpW3JdLmw9MSpuZXcgRGF0ZSgpO2E9cy5jcmVhdGVFbGVtZW50KG8pLFxuXHRcdG09cy5nZXRFbGVtZW50c0J5VGFnTmFtZShvKVswXTthLmFzeW5jPTE7YS5zcmM9ZzttLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKGEsbSlcblx0XHR9KSh3aW5kb3csZG9jdW1lbnQsJ3NjcmlwdCcsJ2h0dHBzOi8vd3d3Lmdvb2dsZS1hbmFseXRpY3MuY29tL2FuYWx5dGljcy5qcycsJ2dhJyk7XG5cdFx0XG5cdFx0Z2EoJ2NyZWF0ZScsICdVQS04MjA5NzU0My0xJywgJ2F1dG8nKTtcblx0XHRnYSgnc2VuZCcsICdwYWdldmlldycpO1xuXHR9LFxuXG5cblxuXHRpbml0X3N0cmlwZTogZnVuY3Rpb24oKXtcblx0XHR2YXIgZG9uYXRlX2J0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdkb25hdGVfYnV0dG9uJyk7XG5cdFx0dmFyIGRvbmF0aW9uX2FtdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdkb25hdGlvbl9hbW91bnQnKTtcblx0XHR2YXIgdGhhbmtfeW91ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NvbnRyaWJ1dGlvbl90aGFua195b3UnKTtcblx0XHR2YXIgdGhhbmtfeW91X2Nsb3NlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2Nsb3NlX3RoYW5rX3lvdV9idXR0b24nKTtcblx0XHRcblx0XHRpZih3aW5kb3cuU3RyaXBlQ2hlY2tvdXQpIHtcblx0XHRcdHZhciBoYW5kbGVyID0gU3RyaXBlQ2hlY2tvdXQuY29uZmlndXJlKHtcblx0XHRcdFx0a2V5OiAncGtfbGl2ZV9oWXJvWmNISE5YaVJzMVhNcTFkSVR0YUEnLFxuXHRcdFx0XHRpbWFnZTogJ2h0dHBzOi8vbWF5ZmllbGRzaW5nZXJzLm9yZy9hcHBsZS10b3VjaC1pY29uLnBuZycsXG5cdFx0XHRcdGxvY2FsZTogJ2F1dG8nLFxuXHRcdFx0XHR0b2tlbjogZnVuY3Rpb24odG9rZW4pIHtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHR2YXIgYW10ID0gZG9uYXRpb25fYW10LnZhbHVlO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdG1haW4uYWpheCh7XG5cdFx0XHRcdFx0XHR1cmw6ICcuL3NjcmlwdHMvc3RyaXBlLnBocCcsXG5cdFx0XHRcdFx0XHR0eXBlOiAnR0VUJyxcblx0XHRcdFx0XHRcdGRhdGE6IHtcblx0XHRcdFx0XHRcdFx0YW1vdW50OiBhbXQgKiAxMDAsXG5cdFx0XHRcdFx0XHRcdHRva2VuOiB0b2tlbi5pZCxcblx0XHRcdFx0XHRcdFx0ZW1haWw6IHRva2VuLmVtYWlsXG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0ZG9uZTogZnVuY3Rpb24ocmVzcG9uc2Upe1xuXHRcdFx0XHRcdFx0XHRpZihyZXNwb25zZT09PSdzdWNjZXNzJyl7XHRcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdFx0XHRkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdbZGF0YS1hbW91bnRdJykuaW5uZXJIVE1MID0gYW10O1xuXHRcdFx0XHRcdFx0XHRcdHRoYW5rX3lvdS5jbGFzc0xpc3QuYWRkKCd2aXNpYmxlJyk7XG5cdFx0XHRcdFx0XHRcdFx0bWFpbi5kb25hdGlvbkFuYWx5dGljcygncGFpZCcsIGRvbmF0aW9uX2FtdC52YWx1ZSk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0dGhhbmtfeW91LmNsYXNzTGlzdC5hZGQoJ3Zpc2libGUnLCAnZXJyb3InKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHRcblx0XHRcdGRvbmF0ZV9idG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbihlKSB7XG5cdFx0XHRcdC8vIE9wZW4gQ2hlY2tvdXQgd2l0aCBmdXJ0aGVyIG9wdGlvbnM6XG5cdFx0XHRcdGhhbmRsZXIub3Blbih7XG5cdFx0XHRcdFx0bmFtZTogJ01heWZpZWxkIFNpbmdlcnMgRG9uYXRpb24nLFxuXHRcdFx0XHRcdGRlc2NyaXB0aW9uOiAnQ2hhcml0YWJsZSBDb250cmlidXRpb24nLFxuXHRcdFx0XHRcdGFtb3VudDogZG9uYXRpb25fYW10LnZhbHVlICogMTAwXG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRtYWluLmRvbmF0aW9uQW5hbHl0aWNzKCd0cmlnZ2VyZWQnLCBkb25hdGlvbl9hbXQudmFsdWUpO1xuXHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHR9KTtcblx0XHRcdFxuXHRcdFx0dGhhbmtfeW91X2Nsb3NlLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oZSkgeyB0aGFua195b3UuY2xhc3NMaXN0LnJlbW92ZSgndmlzaWJsZScsICdlcnJvcicpOyB9KVxuXHRcdFx0XHRcblx0XHRcdC8vQ2xvc2UgQ2hlY2tvdXQgb24gcGFnZSBuYXZpZ2F0aW9uOlxuXHRcdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3BvcHN0YXRlJywgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGhhbmRsZXIuY2xvc2UoKTtcblx0XHRcdH0pO1xuXHRcdH1cblx0fSxcblxuXG5cblx0bG9hZF9wbGF5bGlzdHM6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuYWpheCh7XG5cdFx0XHR1cmw6ICcuL2F1ZGlvL2xpYnJhcnkueG1sJyxcblx0XHRcdHR5cGU6ICdHRVQnLFxuXHRcdFx0ZG9uZTogZnVuY3Rpb24ocGxheWxpc3RzKXtcblx0XHRcdFx0dmFyIHBhcnNlciA9IG5ldyBET01QYXJzZXIoKTtcblx0XHRcdFx0dmFyIHhtbCA9IHBhcnNlci5wYXJzZUZyb21TdHJpbmcocGxheWxpc3RzLFwidGV4dC94bWxcIik7XG5cdFx0XHRcdFxuXHRcdFx0XHR2YXIgZWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYXVkaW9fcGxheWVyJyk7XG5cdFx0XHRcdHZhciBqc29uID0gbWFpbi54bWxfdG9fanNvbih4bWwpO1xuXHRcdFx0XHRcblx0XHRcdFx0TXVzaWNQbGF5ZXIgPSBuZXcgUGxheWVyVUkoZWwsIGZhbHNlLCBqc29uKTtcblx0XHRcdFx0TXVzaWNQbGF5ZXIucG9wdWxhdGVMaXN0cygpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuXG5cblxuXHR4bWxfdG9fanNvbjogZnVuY3Rpb24oeG1sKSB7XG5cdFx0XG5cdFx0dmFyIHJlc3BvbnNlID0gW107XG5cdFx0XG5cdFx0dmFyIHBsYXlsaXN0cyA9IHhtbC5nZXRFbGVtZW50c0J5VGFnTmFtZSgncGxheWxpc3QnKTtcblx0XHRcblx0XHRmb3IodmFyIHg9MCwgbD1wbGF5bGlzdHMubGVuZ3RoOyB4PGw7IHgrKykge1xuXHRcdFx0XG5cdFx0XHR2YXIgY3J0ID0gcGxheWxpc3RzW3hdO1xuXHRcdFx0XG5cdFx0XHR2YXIgcGxheWxpc3QgPSB7XG5cdFx0XHRcdG5hbWU6IGNydC5nZXRBdHRyaWJ1dGUoJ25hbWUnKSxcblx0XHRcdFx0ZGF0ZTogY3J0LmdldEF0dHJpYnV0ZSgnZGF0ZScpLFxuXHRcdFx0XHRwYXRoOiBjcnQuZ2V0QXR0cmlidXRlKCdmb2xkZXInKSxcblx0XHRcdFx0c29uZ3M6IFtdXG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdHZhciB4bWxfc29uZ3MgPSBjcnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ3NvbmcnKTtcblx0XHRcdFxuXHRcdFx0Zm9yKHZhciBpPTAsIGxlbj14bWxfc29uZ3MubGVuZ3RoOyBpPGxlbjsgaSsrKSB7XG5cdFx0XHRcdHZhciBmaWxlbmFtZSA9IHhtbF9zb25nc1tpXS5xdWVyeVNlbGVjdG9yKCdmaWxlbmFtZScpLmNoaWxkTm9kZXNbMF0ubm9kZVZhbHVlXG5cdFx0XHRcdFxuXHRcdFx0XHRwbGF5bGlzdC5zb25ncy5wdXNoKHtcblx0XHRcdFx0XHRzaG93OiB4bWxfc29uZ3NbaV0uZ2V0QXR0cmlidXRlKCdzaG93X2luX3BsYXllcicpLFxuXHRcdFx0XHRcdHRpdGxlOiB4bWxfc29uZ3NbaV0ucXVlcnlTZWxlY3RvcigndGl0bGUnKS5jaGlsZE5vZGVzWzBdLm5vZGVWYWx1ZSxcblx0XHRcdFx0XHRmaWxlbmFtZTogZmlsZW5hbWUsXG5cdFx0XHRcdFx0ZnVsbHBhdGg6ICcuLi9hdWRpby8nICsgcGxheWxpc3QucGF0aCArICcvJyArIGZpbGVuYW1lXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRyZXNwb25zZS5wdXNoKHBsYXlsaXN0KTtcblx0XHR9XG5cdFx0XG5cdFx0cmV0dXJuIHJlc3BvbnNlO1x0XHRcblx0fVxufTtcblxubWFpbi5pbml0KCk7IiwiJ3VzZSBzdHJpY3QnO1xuXG5cbnZhciBTb25nID0gcmVxdWlyZSgnLi9Tb25nJyk7XG5cbmZ1bmN0aW9uIFBsYXllclVJKHBhcmVudF9lbCwgc2hvd19hbGwsIHBsYXlsaXN0cykge1xuXHR0aGlzLmVsID0gcGFyZW50X2VsO1xuXHR0aGlzLnNob3dfYWxsID0gc2hvd19hbGw7XG5cdHRoaXMubGlzdF91bCA9IHRoaXMuZWwucXVlcnlTZWxlY3RvcignW2RhdGEtcGxheWxpc3QtY29udGFpbmVyXScpO1xuXHR0aGlzLnNvbmdzX2RpdiA9IHRoaXMuZWwucXVlcnlTZWxlY3RvcignW2RhdGEtc29uZy1jb250YWluZXJdJyk7XG5cdFxuXHR0aGlzLnBsYXlsaXN0cyA9IHBsYXlsaXN0cztcblxuXHR0aGlzLmN1cl9saXN0ID0gMDtcblx0dGhpcy5jdXJfc29uZyA9IFtdO1xufVxuXG52YXIgcHJvdG8gPSBQbGF5ZXJVSS5wcm90b3R5cGU7XG5cblxuXG4vLyDigKLigKLigKLigKLigKLigKLigKLigKLigKLigKJcbi8vIFBVQkxJQyBNRVRIT0RTXG4vLyDigKLigKLigKLigKLigKLigKLigKLigKLigKLigKJcblxucHJvdG8ucG9wdWxhdGVMaXN0cyA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLmxpc3RfdWwuaW5uZXJIVE1MID0gJyc7XG5cdFxuXHRmb3IodmFyIHg9MCwgbD10aGlzLnBsYXlsaXN0cy5sZW5ndGg7IHg8bDsgeCsrKSB7XG5cdFx0dmFyIGxpc3QgPSB0aGlzLnBsYXlsaXN0c1t4XTtcblx0XHR2YXIgbGkgPSB0aGlzLl9nZXRMaXN0TGkobGlzdCwgeCk7XG5cdFx0dGhpcy5saXN0X3VsLmFwcGVuZENoaWxkKGxpKTtcblx0XHRcblx0XHR0aGlzLnBvcHVsYXRlU29uZ3MoeCk7XG5cdH1cbn07XG5cblxuXG5wcm90by5wb3B1bGF0ZVNvbmdzID0gZnVuY3Rpb24obGlzdF9pZHgpIHtcblx0dmFyIHVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndWwnKTtcblx0dWwuY2xhc3NMaXN0LmFkZCgncGxheWxpc3QnKTtcblx0dWwuc2V0QXR0cmlidXRlKCdkYXRhLXBsYXlsaXN0JywgbGlzdF9pZHgpO1xuXHRcblx0aWYodGhpcy5jdXJfbGlzdD09PWxpc3RfaWR4KSB7XG5cdFx0dWwuY2xhc3NMaXN0LmFkZCgnc2VsZWN0ZWQnKTtcblx0fVxuXHRcblx0dmFyIHNvbmdfbGlzdCA9IHRoaXMucGxheWxpc3RzW2xpc3RfaWR4XS5zb25ncztcblx0XG5cdGZvcih2YXIgeD0wLCBsPXNvbmdfbGlzdC5sZW5ndGg7IHg8bDsgeCsrKSB7XG5cdFx0dmFyIHNvbmcgPSBzb25nX2xpc3RbeF07XG5cdFx0XG5cdFx0aWYodGhpcy5zaG93X2FsbCB8fCBzb25nLnNob3c9PT0ndHJ1ZScpe1xuXHRcdFx0dmFyIGxpID0gdGhpcy5fZ2V0U29uZ0xpKHNvbmcsIHgpO1xuXHRcdFx0dWwuYXBwZW5kQ2hpbGQobGkpO1xuXHRcdH1cblx0fVxuXHRcblx0dGhpcy5zb25nc19kaXYuYXBwZW5kQ2hpbGQodWwpO1xufTtcblxuXG4vLyDigKLigKLigKLigKLigKLigKLigKLigKLigKLigKJcbi8vIFBSSVZBVEUgTUVUSE9EU1xuLy8g4oCi4oCi4oCi4oCi4oCi4oCi4oCi4oCi4oCi4oCiXG5cbnByb3RvLl9hZHZhbmNlUGxheWxpc3QgPSBmdW5jdGlvbigpe1xuXHRpZiAodGhpcy5jdXJfc29uZ1sxXSA8IHRoaXMucGxheWxpc3RzW3RoaXMuY3VyX3NvbmdbMF1dLnNvbmdzLmxlbmd0aC0xKSB7XG5cdFx0dGhpcy5jdXJfc29uZ1sxXSsrO1xuXHRcdFxuXHRcdHZhciBzb25nID0gdGhpcy5wbGF5bGlzdHNbdGhpcy5jdXJfc29uZ1swXV0uc29uZ3NbdGhpcy5jdXJfc29uZ1sxXV07XG5cdFx0XG5cdFx0aWYodGhpcy5zaG93X2FsbCB8fCBzb25nLnNob3c9PT0ndHJ1ZScpIHtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fYWR2YW5jZVBsYXlsaXN0KCk7XG5cdFx0fVxuXHRcdFxuXHR9IGVsc2Uge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxufTtcblxuXG5cbnByb3RvLl9jbGVhckNsYXNzZXMgPSBmdW5jdGlvbihzZWxlY3RvciwgY2xhc3NBcnJheSkge1xuXHR2YXIgZWxzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XG5cdGZvcih2YXIgeD0wLCBsPWVscy5sZW5ndGg7IHg8bDsgeCsrKXtcblx0XHRmb3IodmFyIGk9MCwgbGVuPWNsYXNzQXJyYXkubGVuZ3RoOyBpPGxlbjsgaSsrKSB7XG5cdFx0XHRlbHNbeF0uY2xhc3NMaXN0LnJlbW92ZShjbGFzc0FycmF5W2ldKTtcblx0XHR9XG5cdH1cbn07XG5cblxuXG5wcm90by5fZ2V0TGlzdExpID0gZnVuY3Rpb24obGlzdCwgaWR4KSB7XG5cdHZhciBsaSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XG5cdGxpLnNldEF0dHJpYnV0ZSgnZGF0YS1wbGF5bGlzdC10cmlnZ2VyJywgaWR4KTtcblx0XG5cdGlmKGlkeD09dGhpcy5jdXJfbGlzdCl7XG5cdFx0bGkuY2xhc3NMaXN0LmFkZCgnc2VsZWN0ZWQnKTtcblx0fVxuXHRcblx0dmFyIHNwYW4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG5cdHZhciB0eHQgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShsaXN0Lm5hbWUpO1xuXHRzcGFuLmFwcGVuZENoaWxkKHR4dCk7XG5cdGxpLmFwcGVuZENoaWxkKHNwYW4pO1xuXHRcblx0dmFyIHBhcmVudCA9IHRoaXM7XG5cdFxuXHRsaS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcblx0XHRwYXJlbnQuX2xpc3RCdG5DbGljayh0aGlzLCBwYXJlbnQpO1xuXHR9KTtcblx0XG5cdHJldHVybiBsaTtcbn07XG5cblxuXG5wcm90by5fZ2V0U29uZ0xpID0gZnVuY3Rpb24oc29uZywgaWR4KSB7XG5cdHZhciBsaSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XG5cdGxpLnNldEF0dHJpYnV0ZSgnZGF0YS1zb25nJywgaWR4KTtcblx0XG5cdHZhciBzcGFuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuXHR2YXIgdHh0ID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoc29uZy50aXRsZSk7XG5cdHZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0ZGl2LmNsYXNzTGlzdC5hZGQoJ3Byb2dyZXNzX2JhcicpO1xuXHRzcGFuLmFwcGVuZENoaWxkKHR4dCk7XG5cdGxpLmFwcGVuZENoaWxkKHNwYW4pO1xuXHRsaS5hcHBlbmRDaGlsZChkaXYpO1xuXHRcblx0dmFyIHBhcmVudCA9IHRoaXM7XG5cdFxuXHRsaS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKGUpe1xuXHRcdHBhcmVudC5fc29uZ0J0bkNsaWNrKHRoaXMsIHBhcmVudCk7XG5cdH0pO1xuXHRcblx0cmV0dXJuIGxpO1xufTtcblxuXG5cbnByb3RvLl9saXN0QnRuQ2xpY2sgPSBmdW5jdGlvbihidG4sIHBhcmVudCkge1xuXHRwYXJlbnQuX2NsZWFyQ2xhc3NlcygnW2RhdGEtcGxheWxpc3QtdHJpZ2dlcl0nLCBbJ3NlbGVjdGVkJ10pO1xuXHRwYXJlbnQuX2NsZWFyQ2xhc3NlcygnLnBsYXlsaXN0JywgWydzZWxlY3RlZCddKTtcblx0XG5cdHBhcmVudC5jdXJfbGlzdCA9IGJ0bi5nZXRBdHRyaWJ1dGUoJ2RhdGEtcGxheWxpc3QtdHJpZ2dlcicpO1xuXG5cdGJ0bi5jbGFzc0xpc3QuYWRkKCdzZWxlY3RlZCcpO1xuXHRkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcucGxheWxpc3RbZGF0YS1wbGF5bGlzdD1cIicrIHBhcmVudC5jdXJfbGlzdCArJ1wiXScpLmNsYXNzTGlzdC5hZGQoJ3NlbGVjdGVkJyk7XG59O1xuXG5cblxucHJvdG8uX3NvbmdBbmFseXRpY3MgPSBmdW5jdGlvbihzb25nX2Nvb3JkLCBhY3Rpb24pe1xuXHRpZih3aW5kb3cuZ2EpIHtcblx0XHRnYSgnc2VuZCcsIHtcblx0XHRcdGhpdFR5cGU6ICdldmVudCcsXG5cdFx0XHRldmVudENhdGVnb3J5OiAnTXVzaWMgUGxheWVyJyxcblx0XHRcdGV2ZW50QWN0aW9uOiBhY3Rpb24sXG5cdFx0XHRldmVudExhYmVsOiB0aGlzLnBsYXlsaXN0c1tzb25nX2Nvb3JkWzBdXS5zb25nc1tzb25nX2Nvb3JkWzFdXS50aXRsZSxcblx0XHRcdGV2ZW50VmFsdWU6IHNvbmdfY29vcmRbMF1cblx0XHR9KTtcblx0fVxufTtcblxuXG5cbnByb3RvLl9zb25nQnRuQ2xpY2sgPSBmdW5jdGlvbihidG4sIHBhcmVudCkge1xuXHR2YXIgaWR4ID0gYnRuLmdldEF0dHJpYnV0ZSgnZGF0YS1zb25nJyk7XG5cdHZhciBwcm9ncmVzc19iYXIgPSBidG4ucXVlcnlTZWxlY3RvcignLnByb2dyZXNzX2JhcicpO1xuXHR2YXIgc29uZyA9IHBhcmVudC5wbGF5bGlzdHNbcGFyZW50LmN1cl9saXN0XS5zb25nc1tpZHhdO1xuXHRcblx0aWYoc29uZy5hdWRpbyA9PT0gdW5kZWZpbmVkKXtcblx0XHRzb25nLmF1ZGlvID0gbmV3IFNvbmcoc29uZy5mdWxscGF0aCk7XG5cdH1cblx0XG5cdGlmKGJ0bi5jbGFzc0xpc3QuY29udGFpbnMoJ3BhdXNlZCcpKXsgLy8gdW5wYXVzZSBzb25nXG5cdFx0XG5cdFx0c29uZy5hdWRpby5wbGF5KCk7XG5cdFx0YnRuLmNsYXNzTGlzdC5yZW1vdmUoJ3BhdXNlZCcpO1xuXHRcdHRoaXMuX3VwZGF0ZVBsYXloZWFkKHByb2dyZXNzX2Jhciwgc29uZy5hdWRpbyk7XG5cdFx0XG5cdH0gZWxzZSB7XG5cdFx0aWYoYnRuLmNsYXNzTGlzdC5jb250YWlucygncGxheWluZycpKXsgLy8gcGF1c2Ugc29uZ1xuXHRcdFx0XG5cdFx0XHRzb25nLmF1ZGlvLnBhdXNlKCk7XG5cdFx0XHRidG4uY2xhc3NMaXN0LmFkZCgncGF1c2VkJyk7XG5cdFx0XHRjYW5jZWxBbmltYXRpb25GcmFtZSh0aGlzLmFuaW1hdG9yKTtcblx0XHRcdFxuXHRcdH0gZWxzZSB7IC8vIHBsYXkgbmV3IHNvbmdcblx0XHRcdFxuXHRcdFx0aWYocGFyZW50LmN1cl9zb25nLmxlbmd0aD4xKXtcblx0XHRcdFx0cGFyZW50LnBsYXlsaXN0c1t0aGlzLmN1cl9zb25nWzBdXS5zb25nc1t0aGlzLmN1cl9zb25nWzFdXS5hdWRpby5zdG9wKCk7XG5cdFx0XHRcdGNhbmNlbEFuaW1hdGlvbkZyYW1lKHRoaXMuYW5pbWF0b3IpO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRwYXJlbnQuX2NsZWFyQ2xhc3NlcygnW2RhdGEtc29uZ10nLCBbJ3BsYXlpbmcnLCAncGF1c2VkJ10pO1xuXHRcdFx0XG5cdFx0XHRwYXJlbnQuY3VyX3NvbmcgPSBbcGFyZW50LmN1cl9saXN0LCBpZHhdO1xuXHRcdFx0XG5cdFx0XHRzb25nLmF1ZGlvLnBsYXkoKTtcblx0XHRcdFxuXHRcdFx0dGhpcy5fc29uZ0FuYWx5dGljcyhwYXJlbnQuY3VyX3NvbmcsICdwbGF5Jyk7XG5cdFx0XHRcblx0XHRcdGJ0bi5jbGFzc0xpc3QuYWRkKCdwbGF5aW5nJyk7XG5cdFx0XHR0aGlzLl91cGRhdGVQbGF5aGVhZChwcm9ncmVzc19iYXIsIHNvbmcuYXVkaW8pO1xuXHRcdH1cblx0fVxufVxuXG5cblxucHJvdG8uX3NvbmdFbmRlZCA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLl9zb25nQW5hbHl0aWNzKHRoaXMuY3VyX3NvbmcsICdjb21wbGV0ZScpO1xuXHRcblx0dGhpcy5fY2xlYXJDbGFzc2VzKCdbZGF0YS1zb25nXScsIFsncGxheWluZycsICdwYXVzZWQnXSk7XG5cdFxuXHRpZiAodGhpcy5fYWR2YW5jZVBsYXlsaXN0KCkpIHtcblx0XHR0aGlzLl9zb25nQnRuQ2xpY2sodGhpcy5zb25nc19kaXYucXVlcnlTZWxlY3RvcignW2RhdGEtcGxheWxpc3Q9XCInKyB0aGlzLmN1cl9zb25nWzBdICsnXCJdIFtkYXRhLXNvbmc9XCInKyB0aGlzLmN1cl9zb25nWzFdICsnXCJdJyksIHRoaXMpO1xuXHR9XG59O1xuXG5cblxucHJvdG8uX3VwZGF0ZVBsYXloZWFkID0gZnVuY3Rpb24oZWwsIHNvbmcpIHtcblx0aWYoc29uZy5lbmRlZCgpKSB7XG5cdFx0Y2FuY2VsQW5pbWF0aW9uRnJhbWUodGhpcy5hbmltYXRvcik7XG5cdFx0dGhpcy5fc29uZ0VuZGVkKCk7XG5cdH0gZWxzZSB7XG5cdFx0ZWwuc3R5bGUud2lkdGggPSBzb25nLmdldFBlcmNlbnRQbGF5ZWQoKSArICclJztcblx0XHRcblx0XHR0aGlzLmFuaW1hdG9yID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGZ1bmN0aW9uKCl7XG5cdFx0XHR0aGlzLl91cGRhdGVQbGF5aGVhZChlbCwgc29uZyk7XG5cdFx0fS5iaW5kKHRoaXMpKTtcblx0XG5cdH1cbn07XG5cblxuXG5tb2R1bGUuZXhwb3J0cyA9IFBsYXllclVJO1xuXG5cblxuXG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFNvbmcodXJsKSB7XG5cdHRoaXMuc29uZyA9IG5ldyBBdWRpbyh1cmwpO1xufVxuXG52YXIgcHJvdG8gPSBTb25nLnByb3RvdHlwZTtcblxuXG5cbi8vIOKAouKAouKAouKAouKAouKAouKAouKAouKAouKAolxuLy8gUFVCTElDIE1FVEhPRFNcbi8vIOKAouKAouKAouKAouKAouKAouKAouKAouKAouKAolxuXG5wcm90by5lbmRlZCA9IGZ1bmN0aW9uKCl7XG5cdHJldHVybiB0aGlzLnNvbmcuZW5kZWQ7XG59O1xuXG5cblxucHJvdG8uZ2V0UGVyY2VudFBsYXllZCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5zb25nLmN1cnJlbnRUaW1lIC8gdGhpcy5zb25nLmR1cmF0aW9uICogMTAwO1xufTtcblxuXG5cbnByb3RvLnBhdXNlID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMuc29uZy5wYXVzZSgpO1xufTtcblxuXG5cbnByb3RvLnBsYXkgPSBmdW5jdGlvbigpIHtcblx0dGhpcy5zb25nLnBsYXkoKTtcbn07XG5cblxuXG5wcm90by5zdG9wID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMuc29uZy5wYXVzZSgpO1xuXHR0aGlzLnNvbmcuY3VycmVudFRpbWUgPSAwO1xufTtcblxuXG5cbm1vZHVsZS5leHBvcnRzID0gU29uZztcdCJdfQ==
