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