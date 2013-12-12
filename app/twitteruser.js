/**
 * Stelt de Twitter user voor die de searches uitvoert
 */
var OAuth = require('oauth').OAuth;
var querystring = require('querystring');
var _ = require('underscore');
var config = require('./config')
var async = require('async');
var diffbot = require('./diffbot');

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


TwitterUser.prototype.getRetweetedArticlesAboutTopic = function(topic, callback){
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

		var urlObjects = [];
		var articles = [];

		for (var i = 0; i < tweets.length; i++) {
			var tweet = tweets[i];

			if(tweet.retweeted_status){
				if(tweet.entities && tweet.entities.urls && tweet.entities.urls.length){
					var urls = tweet.entities.urls;
					for (var j = urls.length - 1; j >= 0; j--) {
						if(urls[j].expanded_url) urlObjects.push({url: urls[j].expanded_url, retweet_count: tweet.retweet_count});
					};
				}

			}
		};
		urlObjects = _.sortBy(urlObjects, function(urlObject){return - parseInt(urlObject.retweet_count, 10)});
		// console.log(urlObjects);
		async.eachSeries(urlObjects, function(urlObject, asyncDone){
			diffbot.parseUrl(urlObject.url, function(err, item){
				if(err) return asyncDone(err);
				if(item.author && item.tags) articles.push(item);
				return asyncDone();
			});
		}, function(err){
			console.log(err);
			console.log(articles);
			return callback(err, articles);
		});
	});
}

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

		callback(null, users);
	});
};

TwitterUser.prototype.getTimelineText = function(screen_name, callback){
	var parameters = querystring.stringify({
		screen_name: screen_name,
		count: 50,
		trim_user: true,
		include_rts: false
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



