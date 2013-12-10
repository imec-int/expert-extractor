/**
 * Stelt de Twitter user voor die de searches uitvoert
 */
var OAuth = require('oauth').OAuth;
var querystring = require('querystring');
var _ = require('underscore');
var config = require('./config')

var twitterOAuth = new OAuth(
	'https://api.twitter.com/oauth/request_token',
	'https://api.twitter.com/oauth/access_token',
	config.twitter.consumerKey,
	config.twitter.consumerSecret,
	'1.0',
	null,
	'HMAC-SHA1'
);

function TwitterUser(options){
	this.token = options.token;
	this.tokenSecret = options.tokenSecret;
}

TwitterUser.prototype.getMostTweetetUrl = function(tweets){
	var urlObjects = _.pluck(tweets, 'urls');
	var expandedUrls = _.pluck(urlObjects, 'expanded_url');

	return urlObjects;
}

TwitterUser.prototype.searchTopicFromUser = function(topic, username, callback){
	var parameters = querystring.stringify({
		q: 'from:' + username + ' ' + topic,
		result_type: 'mixed',
		count: 20,
		include_entities: true
	});

	twitterOAuth.getProtectedResource('https://api.twitter.com/1.1/search/tweets.json?' + parameters, "GET", this.token, this.tokenSecret, function (err, data, res){
		if(err) return callback(err);

		data = JSON.parse(data);
		var tweets = data.statuses;
		var filteredTweets = [];

		for (var i = 0; i < tweets.length; i++) {
			var tweet = tweets[i];

			var filteredTweet = _.pick(tweet, 'id', 'text', 'created_at', 'urls');
			filteredTweet.created_at = (parseTwitterDate(filteredTweet.created_at)).getTime(); // in epoch tijd smijten

			if(tweet.retweeted_status && tweet.retweeted_status.retweet_count)
				filteredTweet.retweeted = tweet.retweeted_status.retweet_count;
			else
				filteredTweet.retweeted = 0;

			filteredTweets.push(filteredTweet);
		};

		callback(null, filteredTweets);
	});
};

TwitterUser.prototype.getUsersWhosTweetsAreRetweetedUsingTopic = function(topic, callback){
	var parameters = querystring.stringify({
		q: topic,
		result_type: 'mixed',
		count: 200,
		include_entities: true
	});

	twitterOAuth.getProtectedResource('https://api.twitter.com/1.1/search/tweets.json?' + parameters, "GET", this.token, this.tokenSecret, function (err, data, res){
		if(err) return callback(err);
		data = JSON.parse(data);
		var tweets = data.statuses;

		var users = [];

		for (var i = 0; i < tweets.length; i++) {
			var tweet = tweets[i];

			if(tweet.retweeted_status){
				var user = _.find(users, function (user){
					return user.id == tweet.retweeted_status.user.id;
				});

				if(!user){
					user = _.pick(tweet.retweeted_status.user, 'id', 'screen_name', 'location', 'description', 'profile_image_url');
					user.retweetedtweets = [];
					users.push(user);
				}

				var existingTweet = _.find(user.retweetedtweets, function (retweetedtweet){
					return retweetedtweet.id == tweet.retweeted_status.id;
				});

				if(!existingTweet){
					var tweet = _.pick(tweet.retweeted_status, 'id', 'text', 'created_at', 'retweet_count');
					tweet.created_at = (parseTwitterDate(tweet.created_at)).getTime(); // in epoch tijd smijten
					user.retweetedtweets.push( tweet );
				}
			}
		};

		users = _.sortBy(users, function (user){
			return -user.retweetedtweets.length; // user met meeste retweetedtweets (van ons topic)
		});

		callback(null, users);
	});
};

TwitterUser.prototype.getTimelineText = function(screen_name, callback){
	var parameters = querystring.stringify({
		screen_name: screen_name,
		count: 200,
		trim_user: true,
		nclude_rts: false
	});

	twitterOAuth.getProtectedResource('https://api.twitter.com/1.1/statuses/user_timeline.json?' + parameters, "GET", this.token, this.tokenSecret, function (err, data, res){
		if(err) return callback(err);

		data = JSON.parse(data);
		var tweets = data;

		var allTexts = _.pluck(tweets, 'text');
		var concatenatedText = allTexts.join (' ');
		concatenatedText = concatenatedText.replace(/(\s+|^)@\S+/g, ''); // remove mentions
		concatenatedText = concatenatedText.replace(/(https?:\/\/.+?\S+)/g, ''); // remove urls

		callback(null, concatenatedText);
	});
};

function parseTwitterDate(text) {
	return new Date(Date.parse(text.replace(/( +)/, ' UTC$1')));
}

module.exports = TwitterUser;



