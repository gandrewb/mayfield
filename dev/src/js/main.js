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