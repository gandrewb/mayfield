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