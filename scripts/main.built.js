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
			url: '/audio/library.json',
			type: 'GET',
			done: function(data){			
				var el = document.getElementById('audio_player');
				
				MusicPlayer = new PlayerUI(el, false, JSON.parse(data));
				MusicPlayer.populateLists();
			}
		});
	}
};

main.init();
},{"./modules/PlayerUI":2}],2:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvanMvbWFpbi5qcyIsInNyYy9qcy9tb2R1bGVzL1BsYXllclVJLmpzIiwic3JjL2pzL21vZHVsZXMvU29uZy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4UkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgUGxheWVyVUkgPSByZXF1aXJlKCcuL21vZHVsZXMvUGxheWVyVUknKTtcbnZhciBNdXNpY1BsYXllcjtcblxudmFyIG1haW4gPSB7XG5cdFxuXHRpbml0OiBmdW5jdGlvbigpe1xuXHRcdHRoaXMuYWx1bW5pX3NlY3Rpb24oKTtcblx0XHR0aGlzLmxvYWRfcGxheWxpc3RzKCk7XG5cdFx0XG5cdFx0dGhpcy5pbml0X2FuYWx5dGljcygpO1xuXHRcdHRoaXMuaW5pdF9zdHJpcGUoKTtcblx0fSxcblx0XG5cdFxuXHRcblx0YWpheDogZnVuY3Rpb24ob3B0aW9ucyl7XG5cdFx0dmFyIGFqeCwgcmVzcG9uc2UsIHBhcmFtcz0nJztcblx0XG5cdFx0aWYob3B0aW9ucy5kYXRhIT09dW5kZWZpbmVkKXtcblx0XHRcdHZhciBjdD0wO1xuXHRcdFx0Zm9yKHZhciBpZHggaW4gb3B0aW9ucy5kYXRhKXtcblx0XHRcdFx0Y3QrKztcblx0XHRcdFx0dmFyIGNoYSA9IChjdD09MSkgPyAnPyc6ICcmJztcblx0XHRcdFx0cGFyYW1zKz0gY2hhK2lkeCsnPScrb3B0aW9ucy5kYXRhW2lkeF07XG5cdFx0XHR9XG5cdFx0fVxuXHRcdFxuXHRcdGlmKHdpbmRvdy5YTUxIdHRwUmVxdWVzdCl7XG5cdFx0XHRhanggPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblx0XHR9ZWxzZXtcblx0XHRcdGFqeCA9IG5ldyBBY3RpdmVYT2JqZWN0KFwiTWljcm9zb2Z0LlhNTEhUVFBcIik7XG5cdFx0fVxuXHRcdGFqeC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpIHtcblx0XHRcdGlmKGFqeC5yZWFkeVN0YXRlPT00ICYmIGFqeC5zdGF0dXM9PTIwMCl7XG5cdFx0XHRcdG9wdGlvbnMuZG9uZShhangucmVzcG9uc2VUZXh0KTtcblx0XHRcdH1cblx0XHR9XG5cdFx0XG5cdFx0YWp4Lm9wZW4ob3B0aW9ucy50eXBlLCBvcHRpb25zLnVybCtwYXJhbXMsIHRydWUpO1xuXHRcdGFqeC5zZW5kKCk7XG5cdH0sXG5cdFxuXHRcblx0XG5cdGFsdW1uaV9zZWN0aW9uOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgYWx1bW5pX2ZyYW1lID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmFsdW1uaScpO1xuXHRcdHZhciBhbHVtbmlfYnRuID0gYWx1bW5pX2ZyYW1lLnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLWFjdGlvbj1hbHVtbmktdG9nZ2xlXScpO1xuXHRcdFxuXHRcdGFsdW1uaV9idG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpe1xuXHRcdFx0YWx1bW5pX2ZyYW1lLmNsYXNzTGlzdC50b2dnbGUoJ2V4cGFuZCcpO1xuXHRcdH0pO1xuXHR9LFxuXG5cblxuXHRhbmFseXRpY3NFdmVudDogZnVuY3Rpb24ob3B0aW9ucyl7XG5cdFx0b3B0aW9ucy5oaXRUeXBlID0gJ2V2ZW50Jztcblx0XHRcblx0XHRpZih3aW5kb3cuZ2EpIHsgXG5cdFx0XHRnYSgnc2VuZCcsIG9wdGlvbnMpO1xuXHRcdH1cblx0fSxcblxuXG5cblx0ZG9uYXRpb25BbmFseXRpY3M6IGZ1bmN0aW9uKGFjdGlvbiwgYW1vdW50KXtcblx0XHR0aGlzLmFuYWx5dGljc0V2ZW50KHtcblx0XHRcdGV2ZW50Q2F0ZWdvcnk6ICdEb25hdGlvbicsXG5cdFx0XHRldmVudEFjdGlvbjogYWN0aW9uLFxuXHRcdFx0ZXZlbnRWYWx1ZTogYW1vdW50XG5cdFx0fSk7XG5cdH0sXG5cblxuXG5cdGZvcl9lYWNoOiBmdW5jdGlvbihsaXN0LCBjYWxsYmFjaykge1xuXHRcdGZvcih2YXIgeD0wLCBsPWxpc3QubGVuZ3RoOyB4PGw7IHgrKyl7XG5cdFx0XHRjYWxsYmFjayhsaXN0W3hdLCB4KTtcblx0XHR9XG5cdH0sXG5cblxuXG5cdGluaXRfYW5hbHl0aWNzOiBmdW5jdGlvbigpe1xuXHRcdChmdW5jdGlvbihpLHMsbyxnLHIsYSxtKXtpWydHb29nbGVBbmFseXRpY3NPYmplY3QnXT1yO2lbcl09aVtyXXx8ZnVuY3Rpb24oKXtcblx0XHQoaVtyXS5xPWlbcl0ucXx8W10pLnB1c2goYXJndW1lbnRzKX0saVtyXS5sPTEqbmV3IERhdGUoKTthPXMuY3JlYXRlRWxlbWVudChvKSxcblx0XHRtPXMuZ2V0RWxlbWVudHNCeVRhZ05hbWUobylbMF07YS5hc3luYz0xO2Euc3JjPWc7bS5wYXJlbnROb2RlLmluc2VydEJlZm9yZShhLG0pXG5cdFx0fSkod2luZG93LGRvY3VtZW50LCdzY3JpcHQnLCdodHRwczovL3d3dy5nb29nbGUtYW5hbHl0aWNzLmNvbS9hbmFseXRpY3MuanMnLCdnYScpO1xuXHRcdFxuXHRcdGdhKCdjcmVhdGUnLCAnVUEtODIwOTc1NDMtMScsICdhdXRvJyk7XG5cdFx0Z2EoJ3NlbmQnLCAncGFnZXZpZXcnKTtcblx0fSxcblxuXG5cblx0aW5pdF9zdHJpcGU6IGZ1bmN0aW9uKCl7XG5cdFx0dmFyIGRvbmF0ZV9idG4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZG9uYXRlX2J1dHRvbicpO1xuXHRcdHZhciBkb25hdGlvbl9hbXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZG9uYXRpb25fYW1vdW50Jyk7XG5cdFx0dmFyIHRoYW5rX3lvdSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjb250cmlidXRpb25fdGhhbmtfeW91Jyk7XG5cdFx0dmFyIHRoYW5rX3lvdV9jbG9zZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjbG9zZV90aGFua195b3VfYnV0dG9uJyk7XG5cdFx0XG5cdFx0aWYod2luZG93LlN0cmlwZUNoZWNrb3V0KSB7XG5cdFx0XHR2YXIgaGFuZGxlciA9IFN0cmlwZUNoZWNrb3V0LmNvbmZpZ3VyZSh7XG5cdFx0XHRcdGtleTogJ3BrX2xpdmVfaFlyb1pjSEhOWGlSczFYTXExZElUdGFBJyxcblx0XHRcdFx0aW1hZ2U6ICdodHRwczovL21heWZpZWxkc2luZ2Vycy5vcmcvYXBwbGUtdG91Y2gtaWNvbi5wbmcnLFxuXHRcdFx0XHRsb2NhbGU6ICdhdXRvJyxcblx0XHRcdFx0dG9rZW46IGZ1bmN0aW9uKHRva2VuKSB7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0dmFyIGFtdCA9IGRvbmF0aW9uX2FtdC52YWx1ZTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRtYWluLmFqYXgoe1xuXHRcdFx0XHRcdFx0dXJsOiAnLi9zY3JpcHRzL3N0cmlwZS5waHAnLFxuXHRcdFx0XHRcdFx0dHlwZTogJ0dFVCcsXG5cdFx0XHRcdFx0XHRkYXRhOiB7XG5cdFx0XHRcdFx0XHRcdGFtb3VudDogYW10ICogMTAwLFxuXHRcdFx0XHRcdFx0XHR0b2tlbjogdG9rZW4uaWQsXG5cdFx0XHRcdFx0XHRcdGVtYWlsOiB0b2tlbi5lbWFpbFxuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdGRvbmU6IGZ1bmN0aW9uKHJlc3BvbnNlKXtcblx0XHRcdFx0XHRcdFx0aWYocmVzcG9uc2U9PT0nc3VjY2Vzcycpe1x0XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRcdFx0ZG9jdW1lbnQucXVlcnlTZWxlY3RvcignW2RhdGEtYW1vdW50XScpLmlubmVySFRNTCA9IGFtdDtcblx0XHRcdFx0XHRcdFx0XHR0aGFua195b3UuY2xhc3NMaXN0LmFkZCgndmlzaWJsZScpO1xuXHRcdFx0XHRcdFx0XHRcdG1haW4uZG9uYXRpb25BbmFseXRpY3MoJ3BhaWQnLCBkb25hdGlvbl9hbXQudmFsdWUpO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdHRoYW5rX3lvdS5jbGFzc0xpc3QuYWRkKCd2aXNpYmxlJywgJ2Vycm9yJyk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XG5cdFx0XHRkb25hdGVfYnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuXHRcdFx0XHQvLyBPcGVuIENoZWNrb3V0IHdpdGggZnVydGhlciBvcHRpb25zOlxuXHRcdFx0XHRoYW5kbGVyLm9wZW4oe1xuXHRcdFx0XHRcdG5hbWU6ICdNYXlmaWVsZCBTaW5nZXJzIERvbmF0aW9uJyxcblx0XHRcdFx0XHRkZXNjcmlwdGlvbjogJ0NoYXJpdGFibGUgQ29udHJpYnV0aW9uJyxcblx0XHRcdFx0XHRhbW91bnQ6IGRvbmF0aW9uX2FtdC52YWx1ZSAqIDEwMFxuXHRcdFx0XHR9KTtcblx0XHRcdFx0bWFpbi5kb25hdGlvbkFuYWx5dGljcygndHJpZ2dlcmVkJywgZG9uYXRpb25fYW10LnZhbHVlKTtcblx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0fSk7XG5cdFx0XHRcblx0XHRcdHRoYW5rX3lvdV9jbG9zZS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKGUpIHsgdGhhbmtfeW91LmNsYXNzTGlzdC5yZW1vdmUoJ3Zpc2libGUnLCAnZXJyb3InKTsgfSlcblx0XHRcdFx0XG5cdFx0XHQvL0Nsb3NlIENoZWNrb3V0IG9uIHBhZ2UgbmF2aWdhdGlvbjpcblx0XHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdwb3BzdGF0ZScsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRoYW5kbGVyLmNsb3NlKCk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdH0sXG5cblxuXG5cdGxvYWRfcGxheWxpc3RzOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLmFqYXgoe1xuXHRcdFx0dXJsOiAnL2F1ZGlvL2xpYnJhcnkuanNvbicsXG5cdFx0XHR0eXBlOiAnR0VUJyxcblx0XHRcdGRvbmU6IGZ1bmN0aW9uKGRhdGEpe1x0XHRcdFxuXHRcdFx0XHR2YXIgZWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYXVkaW9fcGxheWVyJyk7XG5cdFx0XHRcdFxuXHRcdFx0XHRNdXNpY1BsYXllciA9IG5ldyBQbGF5ZXJVSShlbCwgZmFsc2UsIEpTT04ucGFyc2UoZGF0YSkpO1xuXHRcdFx0XHRNdXNpY1BsYXllci5wb3B1bGF0ZUxpc3RzKCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cbn07XG5cbm1haW4uaW5pdCgpOyIsIid1c2Ugc3RyaWN0JztcblxuXG52YXIgU29uZyA9IHJlcXVpcmUoJy4vU29uZycpO1xuXG5mdW5jdGlvbiBQbGF5ZXJVSShwYXJlbnRfZWwsIHNob3dfYWxsLCBkYXRhKSB7XG5cdHRoaXMuZWwgPSBwYXJlbnRfZWw7XG5cdHRoaXMuc2hvd19hbGwgPSBzaG93X2FsbDtcblx0dGhpcy5saXN0X3VsID0gdGhpcy5lbC5xdWVyeVNlbGVjdG9yKCdbZGF0YS1wbGF5bGlzdC1jb250YWluZXJdJyk7XG5cdHRoaXMuc29uZ3NfZGl2ID0gdGhpcy5lbC5xdWVyeVNlbGVjdG9yKCdbZGF0YS1zb25nLWNvbnRhaW5lcl0nKTtcblx0XG5cdHRoaXMuYXVkaW9fZm9sZGVyID0gZGF0YS5hdWRpb19mb2xkZXI7XG5cdHRoaXMucGxheWxpc3RzID0gZGF0YS5wbGF5bGlzdHM7XG5cblx0dGhpcy5jdXJfbGlzdCA9IDA7XG5cdHRoaXMuY3VyX3NvbmcgPSBbXTtcbn1cblxudmFyIHByb3RvID0gUGxheWVyVUkucHJvdG90eXBlO1xuXG5cblxuLy8g4oCi4oCi4oCi4oCi4oCi4oCi4oCi4oCi4oCi4oCiXG4vLyBQVUJMSUMgTUVUSE9EU1xuLy8g4oCi4oCi4oCi4oCi4oCi4oCi4oCi4oCi4oCi4oCiXG5cbnByb3RvLnBvcHVsYXRlTGlzdHMgPSBmdW5jdGlvbigpIHtcblx0dGhpcy5saXN0X3VsLmlubmVySFRNTCA9ICcnO1xuXHRcblx0Zm9yKHZhciB4PTAsIGw9dGhpcy5wbGF5bGlzdHMubGVuZ3RoOyB4PGw7IHgrKykge1xuXHRcdHZhciBsaXN0ID0gdGhpcy5wbGF5bGlzdHNbeF07XG5cdFx0dmFyIGxpID0gdGhpcy5fZ2V0TGlzdExpKGxpc3QsIHgpO1xuXHRcdHRoaXMubGlzdF91bC5hcHBlbmRDaGlsZChsaSk7XG5cdFx0XG5cdFx0dGhpcy5wb3B1bGF0ZVNvbmdzKHgpO1xuXHR9XG59O1xuXG5cblxucHJvdG8ucG9wdWxhdGVTb25ncyA9IGZ1bmN0aW9uKGxpc3RfaWR4KSB7XG5cdHZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0ZGl2LmNsYXNzTGlzdC5hZGQoJ3BsYXlsaXN0Jyk7XG5cdGRpdi5zZXRBdHRyaWJ1dGUoJ2RhdGEtcGxheWxpc3QnLCBsaXN0X2lkeCk7XG5cdFxuXHRpZih0aGlzLmN1cl9saXN0PT09bGlzdF9pZHgpIHtcblx0XHRkaXYuY2xhc3NMaXN0LmFkZCgnc2VsZWN0ZWQnKTtcblx0fVxuXHRcblx0dmFyIHVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndWwnKTtcblx0ZGl2LmFwcGVuZENoaWxkKHVsKTtcblx0XG5cdHZhciBwbGF5bGlzdCA9IHRoaXMucGxheWxpc3RzW2xpc3RfaWR4XTtcblx0dmFyIHNvbmdfbGlzdCA9IHBsYXlsaXN0LnNvbmdzO1xuXHRcblx0Zm9yKHZhciB4PTAsIGw9c29uZ19saXN0Lmxlbmd0aDsgeDxsOyB4KyspIHtcblx0XHR2YXIgc29uZyA9IHNvbmdfbGlzdFt4XTtcblx0XHRcblx0XHRpZih0aGlzLnNob3dfYWxsIHx8IHNvbmcubWFrZV9wdWJsaWMpe1xuXHRcdFx0dmFyIGxpID0gdGhpcy5fZ2V0U29uZ0xpKHNvbmcsIHgpO1xuXHRcdFx0dWwuYXBwZW5kQ2hpbGQobGkpO1xuXHRcdH1cblx0fVxuXHRcblx0dmFyIGV4dHJhc19kaXYgPSB0aGlzLl9nZXRMaXN0RXh0cmFzKHBsYXlsaXN0KTtcblx0aWYoZXh0cmFzX2RpdikgeyBkaXYuYXBwZW5kQ2hpbGQoZXh0cmFzX2Rpdik7IH07XG5cdFxuXHR0aGlzLnNvbmdzX2Rpdi5hcHBlbmRDaGlsZChkaXYpO1xufTtcblxuXG4vLyDigKLigKLigKLigKLigKLigKLigKLigKLigKLigKJcbi8vIFBSSVZBVEUgTUVUSE9EU1xuLy8g4oCi4oCi4oCi4oCi4oCi4oCi4oCi4oCi4oCi4oCiXG5cbnByb3RvLl9hZHZhbmNlUGxheWxpc3QgPSBmdW5jdGlvbigpe1xuXHRpZiAodGhpcy5jdXJfc29uZ1sxXSA8IHRoaXMucGxheWxpc3RzW3RoaXMuY3VyX3NvbmdbMF1dLnNvbmdzLmxlbmd0aC0xKSB7XG5cdFx0dGhpcy5jdXJfc29uZ1sxXSsrO1xuXHRcdFxuXHRcdHZhciBzb25nID0gdGhpcy5wbGF5bGlzdHNbdGhpcy5jdXJfc29uZ1swXV0uc29uZ3NbdGhpcy5jdXJfc29uZ1sxXV07XG5cdFx0XG5cdFx0aWYodGhpcy5zaG93X2FsbCB8fCBzb25nLm1ha2VfcHVibGljKSB7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2FkdmFuY2VQbGF5bGlzdCgpO1xuXHRcdH1cblx0XHRcblx0fSBlbHNlIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cbn07XG5cblxuXG5wcm90by5fY2xlYXJDbGFzc2VzID0gZnVuY3Rpb24oc2VsZWN0b3IsIGNsYXNzQXJyYXkpIHtcblx0dmFyIGVscyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpO1xuXHRmb3IodmFyIHg9MCwgbD1lbHMubGVuZ3RoOyB4PGw7IHgrKyl7XG5cdFx0Zm9yKHZhciBpPTAsIGxlbj1jbGFzc0FycmF5Lmxlbmd0aDsgaTxsZW47IGkrKykge1xuXHRcdFx0ZWxzW3hdLmNsYXNzTGlzdC5yZW1vdmUoY2xhc3NBcnJheVtpXSk7XG5cdFx0fVxuXHR9XG59O1xuXG5cblxucHJvdG8uX2dldExpc3RFeHRyYXMgPSBmdW5jdGlvbihsaXN0KSB7XG5cdHZhciBkaXYgPSBudWxsO1xuXHRcblx0aWYobGlzdC5wcm9ncmFtKSB7XG5cdFx0Y29uc29sZS5sb2coJ3Byb2dyYW0nKTtcblx0XHRkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0XHRkaXYuc2V0QXR0cmlidXRlKCdjbGFzcycsICdwbGF5bGlzdF9leHRyYXMnKTtcblx0XHRcblx0XHR2YXIgYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcblx0XHRhLnNldEF0dHJpYnV0ZSgnaHJlZicsICcvcHJvZ3JhbXMvJytsaXN0LnByb2dyYW0pO1xuXHRcdGEuc2V0QXR0cmlidXRlKCdjbGFzcycsICdpY29uLWRvY3VtZW50LWJsYW5rJyk7XG5cdFx0XG5cdFx0dmFyIGxhYmVsID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJ1Byb2dyYW0nKTtcblx0XHRhLmFwcGVuZENoaWxkKGxhYmVsKTtcblx0XHRcblx0XHRkaXYuYXBwZW5kQ2hpbGQoYSk7XG5cdH1cblx0cmV0dXJuIGRpdjtcbn1cblxuXG5cbnByb3RvLl9nZXRMaXN0TGkgPSBmdW5jdGlvbihsaXN0LCBpZHgpIHtcblx0dmFyIGxpID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKTtcblx0bGkuc2V0QXR0cmlidXRlKCdkYXRhLXBsYXlsaXN0LXRyaWdnZXInLCBpZHgpO1xuXHRcblx0aWYoaWR4PT10aGlzLmN1cl9saXN0KXtcblx0XHRsaS5jbGFzc0xpc3QuYWRkKCdzZWxlY3RlZCcpO1xuXHR9XG5cdFxuXHR2YXIgc3BhbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcblx0dmFyIHR4dCA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGxpc3QucGxheWxpc3RfbmFtZSk7XG5cdHNwYW4uYXBwZW5kQ2hpbGQodHh0KTtcblx0bGkuYXBwZW5kQ2hpbGQoc3Bhbik7XG5cdFxuXHR2YXIgcGFyZW50ID0gdGhpcztcblx0XG5cdGxpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuXHRcdHBhcmVudC5fbGlzdEJ0bkNsaWNrKHRoaXMsIHBhcmVudCk7XG5cdH0pO1xuXHRcblx0cmV0dXJuIGxpO1xufTtcblxuXG5cbnByb3RvLl9nZXRTb25nTGkgPSBmdW5jdGlvbihzb25nLCBpZHgpIHtcblx0dmFyIGxpID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKTtcblx0bGkuc2V0QXR0cmlidXRlKCdkYXRhLXNvbmcnLCBpZHgpO1xuXHRcblx0dmFyIHNwYW4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG5cdHZhciB0eHQgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShzb25nLnRpdGxlKTtcblx0dmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRkaXYuY2xhc3NMaXN0LmFkZCgncHJvZ3Jlc3NfYmFyJyk7XG5cdHNwYW4uYXBwZW5kQ2hpbGQodHh0KTtcblx0bGkuYXBwZW5kQ2hpbGQoc3Bhbik7XG5cdGxpLmFwcGVuZENoaWxkKGRpdik7XG5cdFxuXHR2YXIgcGFyZW50ID0gdGhpcztcblx0XG5cdGxpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oZSl7XG5cdFx0cGFyZW50Ll9zb25nQnRuQ2xpY2sodGhpcywgcGFyZW50KTtcblx0fSk7XG5cdFxuXHRyZXR1cm4gbGk7XG59O1xuXG5cblxucHJvdG8uX2xpc3RCdG5DbGljayA9IGZ1bmN0aW9uKGJ0biwgcGFyZW50KSB7XG5cdHBhcmVudC5fY2xlYXJDbGFzc2VzKCdbZGF0YS1wbGF5bGlzdC10cmlnZ2VyXScsIFsnc2VsZWN0ZWQnXSk7XG5cdHBhcmVudC5fY2xlYXJDbGFzc2VzKCcucGxheWxpc3QnLCBbJ3NlbGVjdGVkJ10pO1xuXHRcblx0cGFyZW50LmN1cl9saXN0ID0gYnRuLmdldEF0dHJpYnV0ZSgnZGF0YS1wbGF5bGlzdC10cmlnZ2VyJyk7XG5cblx0YnRuLmNsYXNzTGlzdC5hZGQoJ3NlbGVjdGVkJyk7XG5cdGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5wbGF5bGlzdFtkYXRhLXBsYXlsaXN0PVwiJysgcGFyZW50LmN1cl9saXN0ICsnXCJdJykuY2xhc3NMaXN0LmFkZCgnc2VsZWN0ZWQnKTtcbn07XG5cblxuXG5wcm90by5fc29uZ0FuYWx5dGljcyA9IGZ1bmN0aW9uKHNvbmdfY29vcmQsIGFjdGlvbil7XG5cdGlmKHdpbmRvdy5nYSkge1xuXHRcdGdhKCdzZW5kJywge1xuXHRcdFx0aGl0VHlwZTogJ2V2ZW50Jyxcblx0XHRcdGV2ZW50Q2F0ZWdvcnk6ICdNdXNpYyBQbGF5ZXInLFxuXHRcdFx0ZXZlbnRBY3Rpb246IGFjdGlvbixcblx0XHRcdGV2ZW50TGFiZWw6IHRoaXMucGxheWxpc3RzW3NvbmdfY29vcmRbMF1dLnNvbmdzW3NvbmdfY29vcmRbMV1dLnRpdGxlLFxuXHRcdFx0ZXZlbnRWYWx1ZTogc29uZ19jb29yZFswXVxuXHRcdH0pO1xuXHR9XG59O1xuXG5cblxucHJvdG8uX3NvbmdCdG5DbGljayA9IGZ1bmN0aW9uKGJ0biwgcGFyZW50KSB7XG5cdHZhciBpZHggPSBidG4uZ2V0QXR0cmlidXRlKCdkYXRhLXNvbmcnKTtcblx0dmFyIHByb2dyZXNzX2JhciA9IGJ0bi5xdWVyeVNlbGVjdG9yKCcucHJvZ3Jlc3NfYmFyJyk7XG5cdHZhciBwbGF5bGlzdCA9IHBhcmVudC5wbGF5bGlzdHNbcGFyZW50LmN1cl9saXN0XTtcblx0dmFyIHNvbmcgPSBwbGF5bGlzdC5zb25nc1tpZHhdO1xuXHRcblx0aWYoc29uZy5hdWRpbyA9PT0gdW5kZWZpbmVkKXtcblx0XHR2YXIgcGF0aCA9IHRoaXMuYXVkaW9fZm9sZGVyICsnLycrIHBsYXlsaXN0LmZvbGRlciArJy8nKyBzb25nLmZpbGVuYW1lO1xuXHRcdHNvbmcuYXVkaW8gPSBuZXcgU29uZyhwYXRoKTtcblx0fVxuXHRcblx0aWYoYnRuLmNsYXNzTGlzdC5jb250YWlucygncGF1c2VkJykpeyAvLyB1bnBhdXNlIHNvbmdcblx0XHRcblx0XHRzb25nLmF1ZGlvLnBsYXkoKTtcblx0XHRidG4uY2xhc3NMaXN0LnJlbW92ZSgncGF1c2VkJyk7XG5cdFx0dGhpcy5fdXBkYXRlUGxheWhlYWQocHJvZ3Jlc3NfYmFyLCBzb25nLmF1ZGlvKTtcblx0XHRcblx0fSBlbHNlIHtcblx0XHRpZihidG4uY2xhc3NMaXN0LmNvbnRhaW5zKCdwbGF5aW5nJykpeyAvLyBwYXVzZSBzb25nXG5cdFx0XHRcblx0XHRcdHNvbmcuYXVkaW8ucGF1c2UoKTtcblx0XHRcdGJ0bi5jbGFzc0xpc3QuYWRkKCdwYXVzZWQnKTtcblx0XHRcdGNhbmNlbEFuaW1hdGlvbkZyYW1lKHRoaXMuYW5pbWF0b3IpO1xuXHRcdFx0XG5cdFx0fSBlbHNlIHsgLy8gcGxheSBuZXcgc29uZ1xuXHRcdFx0XG5cdFx0XHRpZihwYXJlbnQuY3VyX3NvbmcubGVuZ3RoPjEpe1xuXHRcdFx0XHRwYXJlbnQucGxheWxpc3RzW3RoaXMuY3VyX3NvbmdbMF1dLnNvbmdzW3RoaXMuY3VyX3NvbmdbMV1dLmF1ZGlvLnN0b3AoKTtcblx0XHRcdFx0Y2FuY2VsQW5pbWF0aW9uRnJhbWUodGhpcy5hbmltYXRvcik7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdHBhcmVudC5fY2xlYXJDbGFzc2VzKCdbZGF0YS1zb25nXScsIFsncGxheWluZycsICdwYXVzZWQnXSk7XG5cdFx0XHRcblx0XHRcdHBhcmVudC5jdXJfc29uZyA9IFtwYXJlbnQuY3VyX2xpc3QsIGlkeF07XG5cdFx0XHRcblx0XHRcdHNvbmcuYXVkaW8ucGxheSgpO1xuXHRcdFx0XG5cdFx0XHR0aGlzLl9zb25nQW5hbHl0aWNzKHBhcmVudC5jdXJfc29uZywgJ3BsYXknKTtcblx0XHRcdFxuXHRcdFx0YnRuLmNsYXNzTGlzdC5hZGQoJ3BsYXlpbmcnKTtcblx0XHRcdHRoaXMuX3VwZGF0ZVBsYXloZWFkKHByb2dyZXNzX2Jhciwgc29uZy5hdWRpbyk7XG5cdFx0fVxuXHR9XG59XG5cblxuXG5wcm90by5fc29uZ0VuZGVkID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMuX3NvbmdBbmFseXRpY3ModGhpcy5jdXJfc29uZywgJ2NvbXBsZXRlJyk7XG5cdFxuXHR0aGlzLl9jbGVhckNsYXNzZXMoJ1tkYXRhLXNvbmddJywgWydwbGF5aW5nJywgJ3BhdXNlZCddKTtcblx0XG5cdGlmICh0aGlzLl9hZHZhbmNlUGxheWxpc3QoKSkge1xuXHRcdHRoaXMuX3NvbmdCdG5DbGljayh0aGlzLnNvbmdzX2Rpdi5xdWVyeVNlbGVjdG9yKCdbZGF0YS1wbGF5bGlzdD1cIicrIHRoaXMuY3VyX3NvbmdbMF0gKydcIl0gW2RhdGEtc29uZz1cIicrIHRoaXMuY3VyX3NvbmdbMV0gKydcIl0nKSwgdGhpcyk7XG5cdH1cbn07XG5cblxuXG5wcm90by5fdXBkYXRlUGxheWhlYWQgPSBmdW5jdGlvbihlbCwgc29uZykge1xuXHRpZihzb25nLmVuZGVkKCkpIHtcblx0XHRjYW5jZWxBbmltYXRpb25GcmFtZSh0aGlzLmFuaW1hdG9yKTtcblx0XHR0aGlzLl9zb25nRW5kZWQoKTtcblx0fSBlbHNlIHtcblx0XHRlbC5zdHlsZS53aWR0aCA9IHNvbmcuZ2V0UGVyY2VudFBsYXllZCgpICsgJyUnO1xuXHRcdFxuXHRcdHRoaXMuYW5pbWF0b3IgPSByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZnVuY3Rpb24oKXtcblx0XHRcdHRoaXMuX3VwZGF0ZVBsYXloZWFkKGVsLCBzb25nKTtcblx0XHR9LmJpbmQodGhpcykpO1xuXHRcblx0fVxufTtcblxuXG5cbm1vZHVsZS5leHBvcnRzID0gUGxheWVyVUk7XG5cblxuXG5cbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gU29uZyh1cmwpIHtcblx0dGhpcy5zb25nID0gbmV3IEF1ZGlvKHVybCk7XG59XG5cbnZhciBwcm90byA9IFNvbmcucHJvdG90eXBlO1xuXG5cblxuLy8g4oCi4oCi4oCi4oCi4oCi4oCi4oCi4oCi4oCi4oCiXG4vLyBQVUJMSUMgTUVUSE9EU1xuLy8g4oCi4oCi4oCi4oCi4oCi4oCi4oCi4oCi4oCi4oCiXG5cbnByb3RvLmVuZGVkID0gZnVuY3Rpb24oKXtcblx0cmV0dXJuIHRoaXMuc29uZy5lbmRlZDtcbn07XG5cblxuXG5wcm90by5nZXRQZXJjZW50UGxheWVkID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLnNvbmcuY3VycmVudFRpbWUgLyB0aGlzLnNvbmcuZHVyYXRpb24gKiAxMDA7XG59O1xuXG5cblxucHJvdG8ucGF1c2UgPSBmdW5jdGlvbigpIHtcblx0dGhpcy5zb25nLnBhdXNlKCk7XG59O1xuXG5cblxucHJvdG8ucGxheSA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLnNvbmcucGxheSgpO1xufTtcblxuXG5cbnByb3RvLnN0b3AgPSBmdW5jdGlvbigpIHtcblx0dGhpcy5zb25nLnBhdXNlKCk7XG5cdHRoaXMuc29uZy5jdXJyZW50VGltZSA9IDA7XG59O1xuXG5cblxubW9kdWxlLmV4cG9ydHMgPSBTb25nO1x0Il19
